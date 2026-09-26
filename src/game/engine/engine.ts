import type { Family } from '../chemistry/elements.ts';
import { parseName, type MoleculeSpec } from '../chemistry/formula.ts';
import {
  addBond,
  canBond,
  neighbours,
  checkMolecule,
  connectedGroup,
  createAtom,
  emptyMolecule,
  findAtom,
  placedAtomsOf,
  type Atom,
  type Molecule,
  type Vec,
} from '../chemistry/molecule.ts';
import {
  bondProgressAt,
  burstAt,
  chainOrder,
  compressionAt,
  positionsAt,
  stageAt,
  type CarbonImpact,
  type ImpactStage,
} from './carbonImpact.ts';
import { DEFAULT_RULES, type Challenge, type Rules } from './config.ts';
import { EventBus, type GameEvent, type MistakeReason } from './events.ts';
import {
  CARBON_RADIUS,
  HYDROGEN_RADIUS,
  PAPER_HOME,
  PAPER_SIZE,
  SMALL_CARBON,
  carbonGroupPosition,
  chainPosition,
  collectedPosition,
  hydrogenRowPosition,
  hydrogenRowBox,
} from './layout.ts';
import { isActive, canTransition, type Phase } from './machine.ts';
import { createPaper, createWeb, setMode, type Paper, type Web } from './paper.ts';
import {
  add,
  angleOf,
  bounce,
  distance,
  firstContact,
  fromAngle,
  integrate,
  length,
  normalise,
  outOfBounds,
  scale,
  sub,
  transferImpulse,
} from './physics.ts';
import { createSession, recordEvent, summarise, type LearningSummary, type SessionRecord } from './session.ts';

/**
 * The game.
 *
 * It owns the molecule being built, the pools to pick from, the paper, and the
 * clock. It has no idea what any of it looks like: the renderer asks for a
 * snapshot and draws it. Every rule it applies comes from the chemistry layer
 * or from the rules config - there is nothing here that knows "ethane" by name.
 */

export type PoolGroup = {
  index: number;
  family: Family;
  atomIds: string[];
  /** Set once the player has picked this group. */
  chosen: boolean;
};

export type Snapshot = {
  phase: Phase;
  objective: string;
  spec: MoleculeSpec;
  molecule: Molecule;
  carbonGroups: PoolGroup[];
  hydrogenRowIds: string[];
  /** Atoms collected and waiting to be thrown, in order. */
  heldIds: string[];
  carbonTarget: number;
  carbonCollected: number;
  hydrogenTarget: number | null;
  hydrogenCollected: number;
  paper: Paper;
  web: Web;
  flyingId: string | null;
  /** The paper-to-pair collision while it is playing; null otherwise. */
  carbonImpact: CarbonImpactView | null;
  timeRemaining: number;
  /** Seconds named by the clock warning, while the notice is up. */
  timeWarning: number | null;
  score: number;
  session: SessionRecord;
  summary: LearningSummary | null;
  /** Why the last mistake was a mistake, while it is still worth saying. */
  feedback: MistakeReason | null;
  /** Free bond slots, in gameplay coordinates: where a throw can land. */
  bondTargets: BondTarget[];
  /** The one the player is pointing at, which a throw will land in. */
  aimedTarget: BondTarget | null;
  /** True while a teaching beat is being held and input is ignored. */
  holding: boolean;
};

/** One place a thrown atom can bond, as both the renderer and the engine see it. */
export type BondTarget = {
  carbonId: string;
  /** Degrees, in the frame's coordinates. */
  angle: number;
  /** Where the atom would settle. */
  point: Vec;
};

/** What the renderer needs to draw the collision. */
export type CarbonImpactView = {
  stage: ImpactStage;
  /** Milliseconds since contact. */
  t: number;
  contactPoint: Vec;
  direction: Vec;
  /** The struck atoms, nearest to the contact point first. */
  members: string[];
  /** 0 to 1: how squashed the atoms are right now. */
  compression: number;
  /** 0 to 1: how much of the bond is drawn. */
  bondProgress: number;
  burst: { scale: number; opacity: number };
};

export class GameEngine {
  readonly bus = new EventBus();
  readonly rules: Rules;
  readonly challenge: Challenge;
  readonly spec: MoleculeSpec;

  private phase: Phase = 'INTRO_OBJECTIVE';
  private molecule: Molecule = emptyMolecule();
  private carbonGroups: PoolGroup[] = [];
  private hydrogenRowIds: string[] = [];
  private heldIds: string[] = [];
  private paper: Paper = createPaper(PAPER_HOME);
  private web: Web = createWeb(PAPER_HOME);
  private flyingId: string | null = null;
  private session: SessionRecord;
  private summary: LearningSummary | null = null;

  private accumulatorMs = 0;
  private elapsed = 0;
  private nextId = 0;
  /** Collisions caused by the throw currently in play. */
  private throwChain = 0;
  /** True from the moment an atom is thrown until everything has stopped. */
  private throwInProgress = false;
  private hydrogenFamilyChosen: Family | null = null;
  /** The paper-to-pair collision, from contact until the molecule settles. */
  private impact: CarbonImpact | null = null;
  /** Milliseconds left before the spent paper is back on its dock. */
  private paperReturnMs = 0;
  /** Where the player aimed the throw that is in the air. */
  private throwAim: Vec | null = null;
  /** How long the atom now in the air has been flying. */
  private flightMs = 0;
  /** The clock warning: given once per round, then left alone. */
  private warned = false;
  private warningMsLeft = 0;
  /** The explanation currently on the card, and how long it has left. */
  private feedback: { reason: MistakeReason; msLeft: number } | null = null;
  /** A teaching beat being held: the clock stops and input is ignored. */
  private holdMs = 0;
  private afterHold: (() => void) | null = null;

  constructor(challenge: Challenge, rules: Rules = DEFAULT_RULES) {
    const spec = parseName(challenge.molecule);
    if (!spec) throw new Error(`Unknown molecule "${challenge.molecule}"`);
    this.challenge = challenge;
    this.rules = rules;
    this.spec = spec;
    this.session = createSession(spec.name, challenge.timeLimitSeconds, 0);
    this.setupPools();
  }

  // ---------------------------------------------------------------- pools

  private id(prefix: string): string {
    this.nextId += 1;
    return `${prefix}${this.nextId}`;
  }

  private setupPools(): void {
    const sizes = this.challenge.carbonGroups.map((g) => g.length);
    this.carbonGroups = this.challenge.carbonGroups.map((group, groupIndex) => {
      const atomIds = group.map((family, i) => {
        const atom = createAtom(this.id('c'), 'C', family, carbonGroupPosition(sizes, groupIndex, i), CARBON_RADIUS);
        this.molecule.atoms.push(atom);
        return atom.id;
      });
      // A group's family is the colour it presents; mixed groups take the first.
      return { index: groupIndex, family: group[0], atomIds, chosen: false };
    });

    this.hydrogenRowIds = this.challenge.hydrogenRow.map((family, i) => {
      const atom = createAtom(this.id('h'), 'H', family, hydrogenRowPosition(i, this.challenge.hydrogenRow.length), HYDROGEN_RADIUS);
      this.molecule.atoms.push(atom);
      return atom.id;
    });
  }

  // --------------------------------------------------------------- basics

  private emit(event: GameEvent): void {
    recordEvent(this.session, event, this.rules, this.elapsed);
    this.bus.emit(event);
  }

  private go(to: Phase): void {
    if (this.phase === to) return;
    if (!canTransition(this.phase, to)) return;
    const from = this.phase;
    this.phase = to;
    this.emit({ type: 'PHASE_CHANGED', from, to });
  }

  /**
   * Holds the game still on a beat that is there to be read. Player input is
   * refused and the round clock stops until it runs out.
   */
  private holdThen(ms: number, then: () => void): void {
    this.holdMs = Math.max(0, ms);
    this.afterHold = then;
    if (this.holdMs === 0) this.runHold();
  }

  private runHold(): void {
    const then = this.afterHold;
    this.holdMs = 0;
    this.afterHold = null;
    if (then) then();
  }

  /** True while a teaching beat is up: nothing the player does is accepted. */
  isHolding(): boolean {
    return this.holdMs > 0;
  }

  /**
   * Ends a teaching beat early.
   *
   * A beat that cannot be skipped is a beat that ignores the player for a
   * couple of seconds without saying so, which reads as the game having
   * frozen. Any action taken during one ends it instead of being dropped, so
   * the first click always does something; the second does what it was for.
   */
  skipTeachingBeat(): boolean {
    if (this.holdMs <= 0) return false;
    this.runHold();
    return true;
  }

  /** Records why something was wrong, for the card to explain. */
  private note(reason: MistakeReason): void {
    this.feedback = { reason, msLeft: this.rules.teaching.feedbackMs };
    this.emit({ type: 'MISTAKE_EXPLAINED', reason });
  }

  private atom(id: string): Atom {
    const found = findAtom(this.molecule, id);
    if (!found) throw new Error(`No atom ${id}`);
    return found;
  }

  /** Atoms out on the table that a throw can hit. */
  private playfield(): Atom[] {
    return this.molecule.atoms.filter((a) => a.state === 'bonded' || a.state === 'placed');
  }

  // -------------------------------------------------------------- actions

  start(): void {
    if (this.phase !== 'INTRO_OBJECTIVE') return;
    this.emit({ type: 'GAME_STARTED', molecule: this.spec.name, carbonTarget: this.spec.carbonCount });
    this.go('CARBON_SELECTION');
  }

  /**
   * The first real decision, made by throwing rather than by picking: the
   * player aims the paper at the group whose size and colour the molecule's
   * name calls for, and throws. Which group was chosen is judged where the
   * paper lands, so a wrong aim is a real miss and a wrong group is a real
   * mistake - both allowed, both recorded.
   */
  selectCarbonGroup(index: number): boolean {
    const group = this.carbonGroups[index];
    if (!group) return false;
    return this.throwPaperAt(this.groupCentre(index));
  }

  /** Centre of an offered group, in gameplay coordinates. */
  groupCentre(index: number): Vec {
    const bounds = this.groupBounds(index);
    return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
  }

  private groupBounds(index: number): { left: number; top: number; right: number; bottom: number } {
    const group = this.carbonGroups[index];
    const atoms = group.atomIds.map((id) => this.atom(id));
    return {
      left: Math.min(...atoms.map((a) => a.position.x - a.radius)),
      right: Math.max(...atoms.map((a) => a.position.x + a.radius)),
      top: Math.min(...atoms.map((a) => a.position.y - SMALL_CARBON.height / 2)),
      bottom: Math.max(...atoms.map((a) => a.position.y + SMALL_CARBON.height / 2)),
    };
  }

  /**
   * Throws the paper itself across the table. This is the carbon phase's only
   * action: the paper is the projectile and the carbon group is the target.
   * The carbons are never thrown.
   */
  throwPaperAt(point: Vec): boolean {
    if (this.skipTeachingBeat()) return false;
    if (this.phase !== 'CARBON_SELECTION') return false;
    if (!finite(point)) return false;

    // A retry while the spent paper is still gliding home used to be thrown
    // from wherever the paper happened to be, and was then teleported back
    // mid-flight when the return timer expired - the throw the player made
    // was not the throw that happened. Cancel the return first, so every
    // throw leaves from the dock and a second click is a second throw.
    if (this.paperReturnMs > 0 || this.paper.mode === 'RETURNING') {
      this.paperReturnMs = 0;
      this.paper.position = { ...PAPER_HOME };
      this.paper.angle = 0;
      this.paper.opacity = 1;
      setMode(this.paper, 'IDLE');
    }

    const toTarget = sub(point, this.paper.position);
    if (length(toTarget) === 0) return false;

    const direction = normalise(toTarget);
    this.paper.velocity = scale(direction, this.rules.carbonImpact.paperSpeed);
    this.paper.angle = angleOf(direction);
    this.paper.opacity = 1;
    this.throwAim = { ...point };
    if (!setMode(this.paper, 'THROW')) return false;
    this.go('PAPER_FLIGHT');
    this.emit({ type: 'PAPER_THROWN', atomId: 'paper', direction, speed: this.rules.carbonImpact.paperSpeed });
    return true;
  }

  /** In the hydrogen phase the first atom picked also picks the family. */
  private noteHydrogenFamily(family: Family): void {
    if (this.hydrogenFamilyChosen) return;
    this.hydrogenFamilyChosen = family;
    if (family === this.spec.family) {
      this.emit({ type: 'ATOM_SELECTED', family, element: 'H', expected: this.spec.family });
      return;
    }
    this.emit({ type: 'WRONG_ATOM_SELECTED', family, element: 'H', expected: this.spec.family });
    // Said at the moment it costs something. It used to be said only when the
    // throw failed, so the penalty for picking arrived with no explanation and
    // the player had to spend a throw to find out what they had done.
    this.note({ kind: 'WRONG_HYDROGEN_FAMILY', picked: family, expected: this.spec.family });
  }

  /** Points the paper (and so the web, or the throw) at a place on the table. */
  aim(point: Vec): void {
    if (!finite(point)) return;
    this.paper.aim = { ...point };
    if (this.paper.mode === 'COLLECTION' && !this.web.active) this.web.tip = { ...point };
  }

  /**
   * Whether this point is inside the hydrogen row.
   *
   * A click in the row is a pick from the row - it is never a throw, even
   * when the pick cannot be made. Reading a refused pick as "throw at that
   * point instead" is what let a click meant to collect fling the hydrogen
   * already on the paper across the table.
   */
  isCollectionArea(point: Vec): boolean {
    if (this.hydrogenRowIds.length === 0) return false;
    if (this.hydrogenFamilyChosen === null && this.phase !== 'HYDROGEN_SELECTION' && this.spec.hydrogenCount === 0) return false;
    const box = hydrogenRowBox(this.hydrogenRowIds.length);
    return (
      point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height
    );
  }

  /** Which atom, if any, the player can web from this point. */
  collectableAt(point: Vec): Atom | null {
    const pool = this.collectablePool();
    for (const id of pool) {
      const atom = this.atom(id);
      if (atom.state !== 'free') continue;
      if (distance(atom.position, point) <= atom.radius + 6) return atom;
    }
    return null;
  }

  /**
   * The web is the hydrogen half of the paper's job. Carbon is never
   * collected: the pair is made by throwing the paper at it.
   */
  private collectablePool(): string[] {
    return this.hydrogenCollectionOpen() ? this.hydrogenRowIds : [];
  }

  /**
   * Whether the row can still be picked from.
   *
   * This used to be true only in the two collection phases, which meant a
   * player holding an atom that could never bond - a red hydrogen, say - had
   * no way back to the row and no way to finish: the round was lost with the
   * clock still running and nothing on screen saying so. Collection is open
   * for as long as the molecule is still short of hydrogen, whatever is in
   * hand, so a wrong pick costs a throw and never the round.
   */
  private hydrogenCollectionOpen(): boolean {
    if (this.holdMs > 0) return false;
    if (this.hydrogenCollected() >= this.spec.hydrogenCount) return false;
    // The tray holds at most what the molecule needs; a full tray is emptied
    // by throwing, and a throw always resolves, so this cannot deadlock.
    if (this.heldIds.length >= this.spec.hydrogenCount) return false;
    switch (this.phase) {
      case 'HYDROGEN_SELECTION':
      case 'HYDROGEN_COLLECTION':
      case 'THROWING':
      case 'COLLISION':
      case 'MOLECULE_VALIDATION':
        return true;
      default:
        return false;
    }
  }

  /**
   * Fires the web at an atom. The web is the collecting half of the paper: it
   * reaches out over several frames, latches on, and reels the atom back.
   */
  fireWeb(atomId: string): boolean {
    if (this.skipTeachingBeat()) return false;
    if (this.web.active) return false;
    if (!this.hydrogenCollectionOpen()) {
      // The usual reason a pick is refused mid-round: there is already one on
      // the paper waiting to be thrown. Say so rather than doing nothing.
      if (this.heldIds.length > 0 && this.hydrogenCollected() < this.spec.hydrogenCount) this.note({ kind: 'TRAY_FULL' });
      return false;
    }
    if (!this.collectablePool().includes(atomId)) return false;

    const atom = this.atom(atomId);
    if (atom.state !== 'free') return false;
    if (distance(atom.position, this.paper.position) > this.rules.web.maxLength) return false;

    if (atom.element === 'H') {
      this.noteHydrogenFamily(atom.family);
      // Only a move forward; collecting again mid-throw leaves the phase be.
      if (this.phase === 'HYDROGEN_SELECTION') this.go('HYDROGEN_COLLECTION');
    }
    if (!this.rules.allowWrongFamilyCollection && atom.family !== this.spec.family) return false;

    setMode(this.paper, 'COLLECTION');
    this.web = { active: true, targetAtomId: atomId, tip: { ...this.paper.position }, progress: 0, direction: 'out' };
    this.emit({ type: 'WEB_STARTED', atomId, from: { ...this.paper.position }, to: { ...atom.position } });
    return true;
  }

  /** Throws whatever is loaded, at a point on the table. */
  throwAt(point: Vec): boolean {
    if (this.skipTeachingBeat()) return false;
    if (!this.canThrow()) return false;
    if (!finite(point)) return false;
    const atomId = this.paper.loadedAtomId;
    if (!atomId) return false;

    const toTarget = sub(point, this.paper.position);
    const direction = normalise(toTarget);
    const reach = length(toTarget);
    if (reach === 0) return false;
    // Drag slows a thrown atom, so the speed that carries it `rangeFactor`
    // times the aimed distance is range * friction.
    const physics = this.rules.physics;
    const speed = Math.min(reach * physics.throwRangeFactor * physics.friction, physics.maxThrowSpeed);

    const atom = this.atom(atomId);
    atom.position = { ...this.paper.position };
    atom.velocity = scale(direction, speed);
    atom.state = 'flying';
    this.flyingId = atomId;
    this.throwAim = { ...point };
    this.flightMs = 0;
    this.throwInProgress = true;
    this.throwChain = 0;
    this.paper.loadedAtomId = null;
    this.heldIds = this.heldIds.filter((id) => id !== atomId);
    setMode(this.paper, 'AIMING');
    setMode(this.paper, 'THROW');
    this.go('THROWING');
    this.emit({ type: 'PAPER_THROWN', atomId, direction, speed });
    return true;
  }

  canThrow(): boolean {
    if (this.flyingId) return false;
    if (this.holdMs > 0) return false;
    if (!isActive(this.phase)) return false;
    // Collecting everything first is what the card asks for, but a player who
    // wants to throw what they already hold is not stopped. The carbon phase
    // is not an atom throw at all - there the paper itself is the projectile.
    return this.phase !== 'CARBON_SELECTION' && this.phase !== 'PAPER_FLIGHT' && this.phase !== 'CARBON_IMPACT';
  }

  /** Ends the round early; the summary is built from whatever happened. */
  finish(): void {
    if (this.phase === 'SUMMARY') return;
    if (this.phase !== 'COMPLETION' && this.phase !== 'TIMEOUT') {
      // A round ended while it was still being played is a round that ran out
      // of time, and has to be recorded as one. Without the event the summary
      // reported a finished round as "in-progress", which is neither of the
      // two things the summary screen knows how to say.
      if (isActive(this.phase)) this.emit({ type: 'TIMEOUT', molecule: this.spec.name });
      this.go(isActive(this.phase) ? 'TIMEOUT' : 'SUMMARY');
    }
    this.summary = summarise(this.session, this.challenge.timeLimitSeconds);
    this.session.endTime = this.elapsed;
    this.holdMs = 0;
    this.afterHold = null;

    // Nothing is left mid-gesture on the summary: an atom still in the air
    // when the clock stopped comes to rest, and a web still out lets go.
    if (this.flyingId) {
      const flying = this.atom(this.flyingId);
      flying.velocity = { x: 0, y: 0 };
      flying.state = 'placed';
      this.flyingId = null;
    }
    if (this.web.active) {
      const carried = this.web.targetAtomId ? findAtom(this.molecule, this.web.targetAtomId) : null;
      if (carried && carried.state === 'free') carried.position = hydrogenRowPosition(
        Math.max(0, this.hydrogenRowIds.indexOf(carried.id)),
        this.hydrogenRowIds.length,
      );
      this.web = createWeb(this.paper.position);
    }
    // A collision still playing is finished where it would have ended.
    if (this.impact) {
      const placed = positionsAt(this.impact, this.rules.carbonImpact, this.rules.physics.chainSpacing);
      chainOrder(this.impact, placed).forEach((id, i) => {
        this.atom(id).position = this.impact!.targets[i];
      });
      this.impact = null;
    }
    this.throwInProgress = false;
    for (const atom of this.molecule.atoms) atom.velocity = { x: 0, y: 0 };
    // Announced, not assigned: a listener that only follows PHASE_CHANGED
    // used to never hear the round end.
    const from = this.getPhase();
    if (from !== 'SUMMARY') {
      this.phase = 'SUMMARY';
      this.emit({ type: 'PHASE_CHANGED', from, to: 'SUMMARY' });
    }
    setMode(this.paper, 'DISABLED');
  }

  // ----------------------------------------------------------------- loop

  /**
   * Advances the game by real time, in fixed steps so that the same throw
   * always resolves the same way.
   */
  tick(deltaMs: number): void {
    if (this.phase === 'SUMMARY' || this.phase === 'INTRO_OBJECTIVE') return;
    // A frame whose delta is NaN, negative or infinite used to poison the
    // accumulator and stop the game for good; it is simply not a frame.
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.accumulatorMs += Math.min(deltaMs, 250);
    const step = this.rules.physics.stepMs;
    while (this.accumulatorMs >= step) {
      this.accumulatorMs -= step;
      this.stepOnce(step / 1000);
    }
  }

  private stepOnce(dt: number): void {
    this.elapsed += dt;

    if (this.feedback) {
      this.feedback.msLeft -= dt * 1000;
      if (this.feedback.msLeft <= 0) this.feedback = null;
    }

    // A teaching beat: the screen is being read, so the clock waits and the
    // rest of the step is skipped. Nothing is moving during one of these.
    if (this.holdMs > 0) {
      this.holdMs -= dt * 1000;
      if (this.holdMs <= 0) this.runHold();
      return;
    }

    if (this.warningMsLeft > 0) this.warningMsLeft = Math.max(0, this.warningMsLeft - dt * 1000);

    if (isActive(this.phase)) {
      this.session.remainingTime = Math.max(0, this.session.remainingTime - dt);

      // One warning, at one moment, for the whole round. `warned` is set
      // before the event is emitted, so a listener that ticks the engine
      // cannot get a second one, and a re-render cannot produce one at all -
      // this is engine state, not a render effect.
      const warnAt = this.rules.timer.warnAtSeconds;
      if (!this.warned && this.session.remainingTime > 0 && this.session.remainingTime <= warnAt) {
        this.warned = true;
        this.warningMsLeft = this.rules.timer.noticeMs;
        this.emit({ type: 'TIME_WARNING', secondsLeft: warnAt });
      }

      if (this.session.remainingTime === 0) {
        this.emit({ type: 'TIMEOUT', molecule: this.spec.name });
        this.go('TIMEOUT');
        // Held, so "Time up" is a frame the player sees rather than a state
        // the game passed through on its way to the summary.
        this.holdThen(this.rules.teaching.timeoutMs, () => this.finish());
        return;
      }
    }

    if (this.flyingId) this.flightMs += dt * 1000;

    this.stepPaper(dt);
    this.stepImpact(dt);
    this.stepWeb(dt);
    this.stepBodies(dt);
    // Again after settling: a bond can snap an atom past the edge.
    this.keepMoleculesOnTable();
    this.loadPaper();
  }

  /**
   * The thrown paper crossing the table. It slows on the final approach so
   * the hit has anticipation, and stops the moment it touches a group.
   */
  private stepPaper(dt: number): void {
    if (this.paperReturnMs > 0) {
      this.paperReturnMs = Math.max(0, this.paperReturnMs - dt * 1000);
      if (this.paperReturnMs === 0) {
        this.paper.position = { ...PAPER_HOME };
        this.paper.angle = 0;
        this.paper.opacity = 1;
        setMode(this.paper, 'IDLE');
      }
    }
    if (this.phase !== 'PAPER_FLIGHT') return;

    const rules = this.rules.carbonImpact;
    const target = this.nearestGroupAhead();
    // Anticipation: ease off over the last stretch before contact.
    const slow = target && target.gap <= rules.approachDistance ? rules.approachSlowdown : 1;
    this.paper.position = add(this.paper.position, scale(this.paper.velocity, dt * slow));

    if (target && target.gap <= 0) {
      this.strikeGroup(target.index);
      return;
    }
    if (outOfBounds(this.paper.position, this.rules.physics.bounds)) {
      // Thrown wide: nothing was hit, so nothing was chosen. Try again.
      this.emit({ type: 'THROW_MISSED', atomId: 'paper', reason: 'out-of-bounds' });
      this.returnPaper();
      this.go('CARBON_SELECTION');
    }
  }

  /** The group the paper's nose is closest to, and the gap left to cover. */
  private nearestGroupAhead(): { index: number; gap: number } | null {
    const nose = add(this.paper.position, scale(normalise(this.paper.velocity), PAPER_SIZE.width / 2));
    let best: { index: number; gap: number } | null = null;
    this.carbonGroups.forEach((group, index) => {
      if (group.atomIds.every((id) => this.atom(id).state !== 'free')) return;
      const b = this.groupBounds(index);
      const dx = Math.max(b.left - nose.x, 0, nose.x - b.right);
      const dy = Math.max(b.top - nose.y, 0, nose.y - b.bottom);
      const gap = Math.hypot(dx, dy);
      if (!best || gap < best.gap) best = { index, gap };
    });
    return best;
  }

  /** The paper lands on a group. Right group or wrong, the hit is physical. */
  private strikeGroup(index: number): void {
    const group = this.carbonGroups[index];
    const direction = normalise(this.paper.velocity);
    const nose = add(this.paper.position, scale(direction, PAPER_SIZE.width / 2));
    this.paper.velocity = { x: 0, y: 0 };
    group.chosen = true;

    const rightFamily = group.atomIds.every((id) => this.atom(id).family === this.spec.family);
    const rightCount = group.atomIds.length === this.spec.carbonCount;
    const correct = rightFamily && rightCount;
    this.emit(
      correct
        ? { type: 'ATOM_SELECTED', family: group.family, element: 'C', expected: this.spec.family }
        : { type: 'WRONG_ATOM_SELECTED', family: group.family, element: 'C', expected: this.spec.family },
    );

    if (!correct) {
      // The wrong group is struck and shrugs it off: no bond, paper comes back.
      // Which of the two things was wrong is recorded, because "wrong" on its
      // own teaches nothing - the colour is the bond type, the count is the
      // prefix, and they are different lessons.
      // A mixed set is wrong because of the odd one out, so name that one
      // rather than the colour the set presents.
      const offender = group.atomIds.map((id) => this.atom(id)).find((atom) => atom.family !== this.spec.family);
      this.note(
        offender
          ? { kind: 'WRONG_CARBON_FAMILY', picked: offender.family, expected: this.spec.family }
          : { kind: 'WRONG_CARBON_COUNT', picked: group.atomIds.length, expected: this.spec.carbonCount, molecule: this.spec.name },
      );
      this.emit({ type: 'ATOM_COLLISION', movingId: 'paper', struckId: group.atomIds[0], chainDepth: 1, bonded: false });
      group.chosen = false;
      this.returnPaper();
      this.go('CARBON_SELECTION');
      return;
    }

    // The atom the paper reached first is pushed hardest; the rest fall away
    // to the lighter push, so the whole group moves the way the throw went.
    const atoms = group.atomIds.map((id) => this.atom(id));
    const sorted = [...atoms].sort((a, b) => distance(a.position, nose) - distance(b.position, nose));
    const rules = this.rules.carbonImpact;
    const last = Math.max(1, sorted.length - 1);

    this.impact = {
      t: 0,
      direction,
      contactPoint: nose,
      members: sorted.map((atom, i) => ({
        id: atom.id,
        start: { ...atom.position },
        push: rules.nearPush + ((rules.farPush - rules.nearPush) * i) / last,
      })),
      targets: sorted.map((_, i) => chainPosition(i, sorted.length, this.rules.physics.chainSpacing)),
      bonded: false,
    };
    for (const atom of atoms) atom.state = 'placed';
    this.go('CARBON_IMPACT');
    this.emit({ type: 'ATOM_COLLISION', movingId: 'paper', struckId: sorted[0].id, chainDepth: 1, bonded: true });
  }

  private returnPaper(): void {
    this.paper.velocity = { x: 0, y: 0 };
    setMode(this.paper, 'RETURNING');
    this.paperReturnMs = 300;
  }

  /**
   * The reaction: the pair is pushed the way the throw was aimed, draws
   * together, bonds, and travels to its place as one body. Every position
   * comes from `carbonImpact`, so the beat order is fixed and testable.
   */
  private stepImpact(dt: number): void {
    const impact = this.impact;
    if (!impact) return;
    const rules = this.rules.carbonImpact;
    impact.t += dt * 1000;

    const placed = positionsAt(impact, rules, this.rules.physics.chainSpacing);
    for (const [id, at] of placed) this.atom(id).position = at;

    // The bonds appear only once the group has finished reacting to the hit.
    if (!impact.bonded && bondProgressAt(impact.t, rules) > 0) {
      impact.bonded = true;
      const order = chainOrder(impact, placed);
      order.forEach((id, i) => {
        if (i === 0) return;
        const bond = addBond(this.molecule, order[i - 1], id, this.spec.chainBonds[i - 1] ?? 1);
        if (bond) this.emit({ type: 'BOND_CREATED', a: bond.a, b: bond.b, order: bond.order });
      });
    }
    // The paper is spent: it fades out under the burst rather than flying on.
    if (impact.t >= rules.contactMs && this.paper.mode === 'THROW') this.returnPaper();
    if (this.paper.mode === 'RETURNING') this.paper.opacity = Math.max(0, this.paperReturnMs / 300);

    if (stageAt(impact.t, rules) === 'done') {
      chainOrder(impact, placed).forEach((id, i) => {
        this.atom(id).position = impact.targets[i];
      });
      this.impact = null;
      this.go('CARBON_STRUCTURE_READY');
      this.holdThen(this.rules.teaching.structureReadyMs, () => this.validate());
    }
  }

  /** The web reaching out, latching, and reeling the atom home. */
  private stepWeb(dt: number): void {
    if (!this.web.active || !this.web.targetAtomId) return;
    const atom = this.atom(this.web.targetAtomId);
    const span = Math.max(1, distance(this.paper.position, atom.position));
    const delta = (this.rules.web.reelSpeed * dt) / span;

    if (this.web.direction === 'out') {
      this.web.progress = Math.min(1, this.web.progress + delta);
      this.web.tip = add(this.paper.position, scale(sub(atom.position, this.paper.position), this.web.progress));
      if (this.web.progress >= 1) this.web.direction = 'in';
      return;
    }

    // Coming back: the atom rides the web to the paper.
    this.web.progress = Math.max(0, this.web.progress - delta);
    const home = collectedPosition(this.heldIds.length);
    atom.position = add(home, scale(sub(this.web.tip, home), this.web.progress));
    if (this.web.progress > 0) return;

    atom.state = 'held';
    atom.position = home;
    this.heldIds.push(atom.id);
    this.web = createWeb(this.paper.position);
    this.emit({
      type: 'ATOM_COLLECTED',
      atomId: atom.id,
      element: atom.element,
      family: atom.family,
      collected: atom.element === 'C' ? this.carbonCollected() : this.hydrogenCollected(),
      target: atom.element === 'C' ? this.spec.carbonCount : this.spec.hydrogenCount,
    });
    this.afterCollection();
  }

  /** Only atoms of the right family count towards a target. */
  private heldOf(element: 'C' | 'H', rightFamilyOnly = true): Atom[] {
    return this.molecule.atoms.filter(
      (a) => a.element === element && (a.state === 'held' || a.state === 'flying') && (!rightFamilyOnly || a.family === this.spec.family),
    );
  }

  private carbonCollected(): number {
    return this.heldOf('C').length + placedAtomsOf(this.molecule, 'C').filter((a) => a.family === this.spec.family).length;
  }

  private hydrogenCollected(): number {
    return this.heldOf('H').length + this.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length;
  }

  private afterCollection(): void {
    if (this.phase === 'HYDROGEN_COLLECTION' && this.hydrogenCollected() >= this.spec.hydrogenCount) {
      this.go('THROWING');
      setMode(this.paper, 'IDLE');
    }
  }

  /** Puts the next collected atom on the paper when it is empty. */
  private loadPaper(): void {
    if (this.paper.loadedAtomId || this.flyingId) return;
    if (!isActive(this.phase) || this.phase === 'CARBON_SELECTION' || this.phase === 'PAPER_FLIGHT' || this.phase === 'CARBON_IMPACT') return;
    const next = this.heldIds[0];
    if (!next) return;
    this.paper.loadedAtomId = next;
    this.atom(next).position = { ...this.paper.position };
    if (this.paper.mode === 'THROW') setMode(this.paper, 'RETURNING');
    setMode(this.paper, 'AIMING');
  }

  /** Moves everything that is moving, and resolves what it runs into. */
  private stepBodies(dt: number): void {
    const physics = this.rules.physics;
    const movers = this.molecule.atoms.filter(
      (a) => (a.state === 'flying' || a.state === 'placed' || a.state === 'bonded') && length(a.velocity) > 0,
    );
    if (movers.length === 0) {
      this.settleThrow();
      return;
    }

    for (const atom of movers) {
      const drag = atom.state === 'flying' ? physics.friction : physics.chainFriction;
      integrate(atom, dt, drag, physics.restSpeed);
    }
    // Before contacts are resolved, so nothing is resolved off the table.
    this.keepMoleculesOnTable();

    // Fastest first, so a chain resolves in the order the player would see it.
    for (const mover of [...movers].sort((a, b) => length(b.velocity) - length(a.velocity))) {
      if (length(mover.velocity) === 0) continue;
      // A free bond catches the atom before the carbon's own edge would.
      const slot = this.slotContact(mover);
      if (slot) {
        this.throwChain += 1;
        this.bondMover(mover, slot.carbon, slot.order, slot.target.carbonId, slot.target.point);
        continue;
      }
      const group = new Set(connectedGroup(this.molecule, mover.id).map((a) => a.id));
      // A hydrogen already bonded on is a cap, not a wall. It used to block
      // the straight line from the dock to the free bonds behind it, so
      // filling one carbon first could leave the last slot on the next carbon
      // permanently out of reach - the round lost to the order the player
      // happened to choose. Everything else still collides, so a throw still
      // shoves the molecule and a loose atom still passes motion on.
      const targets = this.playfield().filter(
        (atom) => !(mover.state === 'flying' && atom.element === 'H' && atom.state === 'bonded'),
      );
      const struck = firstContact(mover, targets, group);
      if (struck) this.resolveContact(mover, struck);
    }

    if (this.flyingId) {
      const flying = this.atom(this.flyingId);
      if (outOfBounds(flying.position, physics.bounds)) this.missThrow(flying, 'out-of-bounds');
      // Still in the air well past the point where a throw can reach
      // anything: it has missed, and the player gets the table back now
      // rather than after another two seconds of it creeping to a halt.
      else if (this.flightMs >= physics.maxFlightMs) this.missThrow(flying, 'came-to-rest');
    }
    this.settleThrow();
  }

  /**
   * A molecule knocked across the table stops at the edge of it. Whole groups
   * are moved together, so being nudged never pulls a molecule apart.
   */
  private keepMoleculesOnTable(): void {
    const bounds = this.rules.physics.bounds;
    const seen = new Set<string>();
    for (const atom of this.playfield()) {
      if (seen.has(atom.id)) continue;
      const group = connectedGroup(this.molecule, atom.id);
      group.forEach((a) => seen.add(a.id));

      // How far the group must move to bring every atom back inside.
      const pushRight = Math.max(0, ...group.map((m) => bounds.left + m.radius - m.position.x));
      const pushLeft = Math.min(0, ...group.map((m) => bounds.right - m.radius - m.position.x));
      const pushDown = Math.max(0, ...group.map((m) => bounds.top + m.radius - m.position.y));
      const pushUp = Math.min(0, ...group.map((m) => bounds.bottom - m.radius - m.position.y));
      const dx = pushRight + pushLeft;
      const dy = pushDown + pushUp;
      if (dx === 0 && dy === 0) continue;
      for (const member of group) {
        member.position = { x: member.position.x + dx, y: member.position.y + dy };
        member.velocity = { x: dx === 0 ? member.velocity.x : 0, y: dy === 0 ? member.velocity.y : 0 };
      }
    }
  }

  /**
   * One atom has run into another. Either they bond - the point of the game -
   * or the moving one bounces off; either way the motion carries on into what
   * was struck, which is what lets a throw set off a chain.
   */
  private resolveContact(mover: Atom, struck: Atom): void {
    const physics = this.rules.physics;
    this.throwChain += 1;

    // What it hit, or - if it grazed a hydrogen already bonded on - the carbon
    // behind it, provided that carbon still has a slot free. Without this a
    // bonded atom would shield the free slots from a paper that cannot move.
    const partner = this.bondPartnerFor(mover, struck);

    if (partner) {
      this.bondMover(mover, partner.atom, partner.order, struck.id);
      return;
    }

    const struckGroup = connectedGroup(this.molecule, struck.id);
    transferImpulse(mover, struckGroup, physics.impulseTransfer);
    bounce(mover, struck, physics.restitution);
    this.emit({ type: 'ATOM_COLLISION', movingId: mover.id, struckId: struck.id, chainDepth: this.throwChain, bonded: false });
    this.go('COLLISION');
  }

  /**
   * The moving atom joins the molecule. `struckId` is what the collision is
   * reported against - the atom actually touched, or the carbon whose free
   * bond caught it - and `at` is where it settles, if the slot is already
   * known.
   */
  private bondMover(mover: Atom, partner: Atom, order: 1 | 2 | 3, struckId: string, at?: Vec): void {
    const physics = this.rules.physics;
    const carriedVelocity = { ...mover.velocity };
    if (at) mover.position = { ...at };
    else this.snapIntoPlace(mover, partner);
    const bond = addBond(this.molecule, mover.id, partner.id, order);
    if (this.flyingId === mover.id) this.flyingId = null;

    // The chain is nudged the way the throw was aimed - and the atom that
    // just joined it travels with it, so the molecule stays rigid.
    const merged = connectedGroup(this.molecule, partner.id);
    mover.velocity = { x: 0, y: 0 };
    transferImpulse({ ...mover, velocity: carriedVelocity }, merged, physics.impulseTransfer);
    if (mover.element === 'C' && partner.element === 'C') this.relayoutChain();
    this.emit({ type: 'ATOM_COLLISION', movingId: mover.id, struckId, chainDepth: this.throwChain, bonded: true });
    if (bond) this.emit({ type: 'BOND_CREATED', a: bond.a, b: bond.b, order: bond.order });
    this.go('COLLISION');
  }

  /**
   * The free bond marker this atom has reached, if any.
   *
   * The markers the renderer draws come from `bondTargets()`, and this is what
   * makes them targets: an atom that arrives at one bonds into it. Only a bond
   * it is actually allowed to make counts, so a wrong-family hydrogen still
   * flies straight through and the rule still has to be learnt.
   */
  private slotContact(mover: Atom): { target: BondTarget; carbon: Atom; order: 1 | 2 | 3 } | null {
    if (mover.state !== 'flying') return null;
    const capture = mover.radius + this.rules.physics.slotCapture;
    const own = new Set(connectedGroup(this.molecule, mover.id).map((a) => a.id));
    const targets = this.bondTargets();

    // The marker the player pointed at. While there is one, it is the only
    // marker allowed to catch this throw: the flight path passes within
    // catching distance of other free bonds on its way - the top marker on a
    // carbon is reached by flying past that carbon's left one - and whichever
    // it grazed first used to take the atom, so the ring on screen and the
    // slot that received it were different slots.
    const aimed = this.throwAim ? this.aimedTarget(this.throwAim, targets) : null;

    let best: { target: BondTarget; carbon: Atom; order: 1 | 2 | 3 } | null = null;
    let bestGap = Infinity;
    for (const target of targets) {
      if (own.has(target.carbonId)) continue;
      if (aimed && (target.carbonId !== aimed.carbonId || target.angle !== aimed.angle)) continue;
      const gap = distance(mover.position, target.point);
      if (gap > capture || gap >= bestGap) continue;
      const carbon = this.atom(target.carbonId);
      // No marker was aimed at - the player pointed at a carbon body or at
      // open table. A slot may still catch the atom, but only on a carbon the
      // throw was headed for, so a throw across the table does not bond to
      // whatever it happened to graze.
      if (!aimed && this.throwAim && distance(this.throwAim, carbon.position) > this.rules.physics.bondLength * 1.5) continue;
      const order = this.bondOrderBetween(mover, carbon);
      if (order === null) continue;
      const familyOk =
        !this.rules.wrongFamilyBlocksBonding || (mover.family === this.spec.family && carbon.family === this.spec.family);
      if (!familyOk || !canBond(this.molecule, mover.id, carbon.id, order)) continue;
      best = { target, carbon, order };
      bestGap = gap;
    }
    return best;
  }

  /**
   * Who the moving atom can actually bond with on this contact: the atom it
   * touched, or the carbon that atom is bonded to.
   */
  private bondPartnerFor(mover: Atom, struck: Atom): { atom: Atom; order: 1 | 2 | 3 } | null {
    const reach = this.rules.physics.bondLength * 2.2;
    const candidates: Atom[] = [struck];
    for (const atom of connectedGroup(this.molecule, struck.id)) {
      if (atom.id === struck.id || atom.element !== 'C') continue;
      if (distance(atom.position, mover.position) > reach) continue;
      candidates.push(atom);
    }

    // Which carbon this contact was *for* is decided by where the player
    // threw, not by which atom happens to be nearest the projectile. Grazing
    // a hydrogen on the way to the carbon behind it used to hand the throw to
    // whichever carbon the physics found first, which on a two-carbon chain
    // was almost always the full one - so aiming at the free carbon bonded to
    // the other, and the visible markers meant nothing.
    const aim = this.throwAim;
    if (aim) candidates.sort((a, b) => distance(a.position, aim) - distance(b.position, aim));

    // A throw aimed at a particular marker belongs to that marker's carbon.
    // Running into a different carbon on the way is a blocked throw, not a
    // reason to bond somewhere the player did not point: aiming at the far
    // carbon's top bond used to put the atom on the middle carbon instead,
    // because the middle carbon's body was in the flight path.
    const aimed = aim ? this.aimedTarget(aim) : null;

    for (const candidate of candidates) {
      if (aimed && candidate.id !== aimed.carbonId) continue;
      const order = this.bondOrderBetween(mover, candidate);
      const familyOk = !this.rules.wrongFamilyBlocksBonding || (mover.family === this.spec.family && candidate.family === this.spec.family);
      if (order !== null && familyOk && canBond(this.molecule, mover.id, candidate.id, order)) return { atom: candidate, order };
    }
    return null;
  }

  /**
   * Which bond, if any, these two could form. Carbon to carbon takes the bond
   * the series is named after; carbon to hydrogen is always single.
   */
  private bondOrderBetween(a: Atom, b: Atom): 1 | 2 | 3 | null {
    if (a.element === 'H' && b.element === 'H') return null;
    if (a.element === 'C' && b.element === 'C') {
      const made = this.molecule.bonds.filter((bond) => {
        const first = findAtom(this.molecule, bond.a);
        const second = findAtom(this.molecule, bond.b);
        return first?.element === 'C' && second?.element === 'C';
      }).length;
      return this.spec.chainBonds[made] ?? null;
    }
    return 1;
  }

  /** Puts a newly bonded atom where the bond would hold it. */
  private snapIntoPlace(mover: Atom, struck: Atom): void {
    const physics = this.rules.physics;
    if (mover.element === 'C' && struck.element === 'C') {
      // Park it beside the carbon it hit; the chain is then laid out properly
      // once the bond exists (see relayoutChain).
      const side = struck.position.x >= mover.position.x ? -1 : 1;
      mover.position = { x: struck.position.x + side * physics.chainSpacing, y: struck.position.y };
      return;
    }
    // The slot the player pointed at, falling back to the one they came from.
    const reference = this.throwAim
      ? angleOf(sub(this.throwAim, struck.position))
      : angleOf(sub(mover.position, struck.position));
    const slot = this.freeSlotAngle(struck, reference);
    mover.position = add(struck.position, fromAngle(slot, physics.bondLength));
  }

  /**
   * Lays the carbon chain out in a centred row, the way every frame draws it:
   * evenly spaced along one line. Anything already bonded to a carbon travels
   * with it, so the molecule is never pulled apart.
   */
  private relayoutChain(): void {
    const carbons = placedAtomsOf(this.molecule, 'C');
    if (carbons.length < 2) return;

    // Walk the carbon-carbon bonds from one end to put the chain in order.
    const carbonNeighbours = (atom: Atom) => neighbours(this.molecule, atom.id).filter((n) => n.element === 'C');
    const end = carbons.find((c) => carbonNeighbours(c).length <= 1) ?? carbons[0];
    const ordered: Atom[] = [end];
    const seen = new Set([end.id]);
    for (;;) {
      const next = carbonNeighbours(ordered[ordered.length - 1]).find((n) => !seen.has(n.id));
      if (!next) break;
      seen.add(next.id);
      ordered.push(next);
    }
    // Carbons not yet joined to the chain keep their own place.
    for (const [index, carbon] of ordered.entries()) {
      const target = chainPosition(index, ordered.length, this.rules.physics.chainSpacing);
      const dx = target.x - carbon.position.x;
      const dy = target.y - carbon.position.y;
      if (dx === 0 && dy === 0) continue;
      carbon.position = target;
      for (const attached of neighbours(this.molecule, carbon.id)) {
        if (attached.element === 'C') continue;
        attached.position = { x: attached.position.x + dx, y: attached.position.y + dy };
      }
    }
  }

  /**
   * Carbon holds its bonds at four right angles, as every frame draws them.
   * The incoming atom takes the free slot nearest to where it arrived from.
   */
  private freeSlotAngle(carbon: Atom, approach: number): number {
    const free = this.freeSlotAngles(carbon);
    const pool = free.length ? free : SLOT_ANGLES;
    return pool.reduce(
      (best, angle) => (Math.abs(this.angleGap(angle, approach)) < Math.abs(this.angleGap(best, approach)) ? angle : best),
      pool[0],
    );
  }

  /**
   * The slots on this carbon that nothing is bonded into.
   *
   * Only direct bonds count. It used to ask for the whole connected group,
   * so on a chain the far carbon's hydrogens blocked slots on this one at
   * whatever angle they happened to sit - the engine and the markers drawn on
   * screen disagreed about which bonds were free.
   */
  private freeSlotAngles(carbon: Atom): number[] {
    const taken = neighbours(this.molecule, carbon.id).map((a) => angleOf(sub(a.position, carbon.position)));
    return SLOT_ANGLES.filter((angle) => taken.every((used) => Math.abs(this.angleGap(used, angle)) > 30));
  }

  /**
   * The free bond the player is pointing at, if any.
   *
   * This is the single answer to "which marker is the player aiming at". The
   * renderer draws its ring on it and `slotContact` lets only this one catch
   * the atom, so what is highlighted is what receives the throw.
   *
   * Aiming at a carbon body, or at empty table, returns null - and then a
   * throw behaves as it always did, landing in whichever free slot it reaches.
   */
  aimedTarget(aim: Vec, targets: BondTarget[] = this.bondTargets()): BondTarget | null {
    if (!finite(aim)) return null;
    const reach = this.rules.physics.slotAimRadius;
    let best: BondTarget | null = null;
    let bestGap = Infinity;
    for (const target of targets) {
      const gap = distance(aim, target.point);
      if (gap <= reach && gap < bestGap) {
        best = target;
        bestGap = gap;
      }
    }
    return best;
  }

  /**
   * Every free bond on the table, in the order they are drawn.
   *
   * The renderer draws these and the physics lands atoms on them, so a marker
   * is a target rather than decoration. Keyboard play walks this list.
   */
  bondTargets(): BondTarget[] {
    const targets: BondTarget[] = [];
    for (const atom of this.molecule.atoms) {
      if (atom.element !== 'C') continue;
      if (atom.state !== 'bonded' && atom.state !== 'placed') continue;
      if (atom.remainingValency <= 0) continue;
      for (const angle of this.freeSlotAngles(atom).slice(0, atom.remainingValency)) {
        targets.push({ carbonId: atom.id, angle, point: add(atom.position, fromAngle(angle, this.rules.physics.bondLength)) });
      }
    }
    return targets;
  }

  private angleGap(a: number, b: number): number {
    return ((((a - b) % 360) + 540) % 360) - 180;
  }

  /** A throw that hit nothing: the atom comes back and the player tries again. */
  private missThrow(atom: Atom, reason: 'out-of-bounds' | 'came-to-rest' | 'no-bond'): void {
    this.flyingId = null;
    this.throwAim = null;
    this.flightMs = 0;
    atom.velocity = { x: 0, y: 0 };

    // An atom of the wrong family can never bond, so putting it back in the
    // tray put the player in a loop they could not leave. It goes back to the
    // row it came from instead, with the reason said out loud: the mistake
    // still costs the throw, and the rule is still what taught it.
    const wrongFamily = this.rules.wrongFamilyBlocksBonding && atom.family !== this.spec.family;
    if (!this.rules.returnMissedAtoms) {
      atom.state = 'placed';
    } else if (wrongFamily && this.hydrogenRowIds.includes(atom.id)) {
      this.note({ kind: 'WRONG_HYDROGEN_FAMILY', picked: atom.family, expected: this.spec.family });
      this.returnToRow(atom);
    } else {
      this.note(this.throwChain > 0 ? { kind: 'NO_FREE_BOND' } : { kind: 'THROW_MISSED' });
      atom.state = 'held';
      atom.position = collectedPosition(this.heldIds.length);
      this.heldIds.push(atom.id);
    }
    this.emit({ type: 'THROW_MISSED', atomId: atom.id, reason });
    this.validate();
  }

  /** Puts an atom back in the row it was picked from, free to be picked again. */
  private returnToRow(atom: Atom): void {
    const index = this.hydrogenRowIds.indexOf(atom.id);
    atom.state = 'free';
    atom.velocity = { x: 0, y: 0 };
    atom.position = hydrogenRowPosition(index < 0 ? 0 : index, this.hydrogenRowIds.length);
    this.heldIds = this.heldIds.filter((id) => id !== atom.id);
    // The tray closes up behind it.
    this.heldIds.forEach((id, i) => {
      this.atom(id).position = collectedPosition(i);
    });
  }

  /** Once everything has stopped, decide what the throw achieved. */
  private settleThrow(): void {
    if (!this.throwInProgress) return;
    const stillMoving = this.molecule.atoms.some((a) => length(a.velocity) > 0);
    if (stillMoving) return;
    this.throwInProgress = false;
    if (!this.flyingId) this.throwAim = null;

    if (this.flyingId) {
      const flying = this.atom(this.flyingId);
      const firstCarbon = flying.element === 'C' && placedAtomsOf(this.molecule, 'C').length === 0;
      if (firstCarbon) {
        // The first carbon has nothing to collide with; wherever it lands, the
        // chain starts on the line every frame draws it on.
        this.flyingId = null;
        flying.state = 'placed';
        flying.position = chainPosition(0, this.spec.carbonCount, this.rules.physics.chainSpacing);
        this.validate();
        return;
      }
      this.missThrow(flying, 'came-to-rest');
      return;
    }

    if (this.phase === 'COLLISION' || this.phase === 'THROWING') this.validate();
  }

  /** The only place that asks "is it finished?". */
  private validate(): void {
    if (this.phase === 'COMPLETION' || this.phase === 'TIMEOUT' || this.phase === 'SUMMARY') return;
    this.go('MOLECULE_VALIDATION');
    const check = checkMolecule(this.molecule, this.spec);

    if (check.complete) {
      this.go('COMPLETION');
      this.emit({ type: 'MOLECULE_COMPLETED', molecule: this.spec.name, score: this.session.score });
      this.holdThen(this.rules.teaching.completionMs, () => this.finish());
      return;
    }

    // Carbons done and no hydrogen target yet: work out how many are needed.
    const carbonsReady = check.carbonCount >= this.spec.carbonCount && check.missingCarbonBonds === 0;
    if (carbonsReady && this.hydrogenFamilyChosen === null && this.heldOf('H').length === 0) {
      this.go('HYDROGEN_CALCULATION');
      this.emit({ type: 'HYDROGEN_TARGET_CALCULATED', carbonCount: this.spec.carbonCount, hydrogenCount: this.spec.hydrogenCount });
      // Held: the sum is the lesson, and it used to be entered and left in
      // the same tick, so no frame of it was ever drawn.
      this.holdThen(this.rules.teaching.calculationMs, () => {
        this.go('HYDROGEN_SELECTION');
        setMode(this.paper, 'COLLECTION');
      });
      return;
    }

    if (this.heldIds.length > 0) {
      this.go('THROWING');
      return;
    }
    // Nothing in hand: back to the pool that still owes atoms.
    if (carbonsReady) this.go(this.hydrogenFamilyChosen === null ? 'HYDROGEN_SELECTION' : 'HYDROGEN_COLLECTION');
  }

  // -------------------------------------------------------------- reading

  /**
   * What the game looks like right now.
   *
   * Everything mutable is copied. It used to hand out the engine's own
   * molecule, paper, web and session, so anything that wrote to a "snapshot"
   * wrote straight into the running game - nothing in this app does, but the
   * type promised a picture and delivered the thing itself. A round has a few
   * dozen atoms; copying them once a frame costs nothing worth keeping.
   */
  snapshot(): Snapshot {
    const targets = this.bondTargets();
    return {
      phase: this.phase,
      objective: `Make ${this.spec.name[0].toUpperCase()}${this.spec.name.slice(1)}`,
      spec: { ...this.spec, chainBonds: [...this.spec.chainBonds] },
      molecule: {
        atoms: this.molecule.atoms.map((atom) => ({ ...atom, position: { ...atom.position }, velocity: { ...atom.velocity } })),
        bonds: this.molecule.bonds.map((bond) => ({ ...bond })),
      },
      carbonGroups: this.carbonGroups.map((group) => ({ ...group, atomIds: [...group.atomIds] })),
      hydrogenRowIds: [...this.hydrogenRowIds],
      heldIds: [...this.heldIds],
      carbonTarget: this.spec.carbonCount,
      carbonCollected: this.carbonCollected(),
      hydrogenTarget: this.hydrogenFamilyChosen !== null || this.phase === 'HYDROGEN_SELECTION' ? this.spec.hydrogenCount : null,
      hydrogenCollected: this.hydrogenCollected(),
      paper: { ...this.paper, position: { ...this.paper.position }, velocity: { ...this.paper.velocity }, aim: { ...this.paper.aim } },
      web: { ...this.web, tip: { ...this.web.tip } },
      flyingId: this.flyingId,
      carbonImpact: this.impactView(),
      timeRemaining: this.session.remainingTime,
      timeWarning: this.warningMsLeft > 0 ? this.rules.timer.warnAtSeconds : null,
      score: this.session.score,
      session: {
        ...this.session,
        carbonSelections: this.session.carbonSelections.map((s) => ({ ...s })),
        hydrogenSelections: this.session.hydrogenSelections.map((s) => ({ ...s })),
        mistakes: { ...this.session.mistakes },
      },
      summary: this.summary,
      feedback: this.feedback?.reason ?? null,
      bondTargets: targets,
      aimedTarget: this.aimedTarget(this.paper.aim, targets),
      holding: this.holdMs > 0,
    };
  }

  private impactView(): CarbonImpactView | null {
    const impact = this.impact;
    if (!impact) return null;
    const rules = this.rules.carbonImpact;
    return {
      stage: stageAt(impact.t, rules),
      t: impact.t,
      contactPoint: impact.contactPoint,
      direction: impact.direction,
      members: impact.members.map((m) => m.id),
      compression: compressionAt(impact.t, rules) * rules.compression,
      bondProgress: bondProgressAt(impact.t, rules),
      burst: burstAt(impact.t, rules),
    };
  }

  getPhase(): Phase {
    return this.phase;
  }
}

/** The four right angles a carbon holds its bonds at, as every frame draws them. */
const SLOT_ANGLES = [0, -90, 180, 90];

/** A point the game can act on: not NaN, not Infinity. */
function finite(point: Vec): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
