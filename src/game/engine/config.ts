import type { Family } from '../chemistry/elements.ts';

/**
 * Everything tunable about a round, in one place.
 *
 * The brief leaves several rules deliberately open (scoring values, impulse
 * strength, what a wrong colour costs). They are all defaults here rather than
 * numbers buried in the engine or the components, so changing the feel of the
 * game is a data edit. Each default says why it is what it is.
 */

/** What the player is asked to build, and what is on the table. */
export type Challenge = {
  /** Molecule name, read by the chemistry layer - not a switch in the engine. */
  molecule: string;
  timeLimitSeconds: number;
  /** The carbon groups offered. The player must pick the right size and colour. */
  carbonGroups: Family[][];
  /** The mixed hydrogen row the player picks a family from. */
  hydrogenRow: Family[];
};

export type ScoreEvent =
  | 'CORRECT_ATOM_SELECTION'
  | 'WRONG_ATOM_SELECTION'
  | 'SUCCESSFUL_COLLISION'
  | 'COLLISION_CHAIN_STEP'
  | 'MISSED_THROW'
  | 'BOND_CREATED'
  | 'MOLECULE_COMPLETED'
  | 'TIME_REMAINING_PER_SECOND';

/**
 * The paper-to-carbon-pair collision, beat by beat (see
 * docs/ethane-e1-e16-interaction.md). Times are milliseconds from the moment
 * the paper touches the pair.
 */
export type CarbonImpactRules = {
  /** Flight speed of the thrown paper, in gameplay px per second. */
  paperSpeed: number;
  /** Within this distance of the target the paper slows, for anticipation. */
  approachDistance: number;
  /** Speed multiplier during that final approach. */
  approachSlowdown: number;
  /** The paper is on the pair and the atoms are compressed. */
  contactMs: number;
  /** The pair is pushed along the throw direction. */
  responseMs: number;
  /** The bond grows from nothing to its full length. */
  bondMs: number;
  /** The bonded molecule travels to its place. */
  settleMs: number;
  /** How quickly the burst reaches full size. */
  burstInMs: number;
  /** How far the struck atoms are pushed, in gameplay px. */
  nearPush: number;
  farPush: number;
  /** How much the atoms squash on contact, as a fraction. */
  compression: number;
  /** The burst artwork's size at full scale. */
  burstSize: { width: number; height: number };
};

export type Rules = {
  physics: {
    /** Fixed step, so a replay of the same inputs gives the same result. */
    stepMs: number;
    /**
     * How far a throw carries, as a multiple of the distance to the point the
     * player aimed at. Above 1 so a throw reaches what it is aimed at and
     * carries on a little - which is what gives a collision something to pass
     * on. Aim is the skill; the engine does not decide whether it hits.
     */
    throwRangeFactor: number;
    /** Ceiling on throw speed (gameplay px/second). */
    maxThrowSpeed: number;
    /** Drag on a thrown atom, as a fraction of speed lost per second. */
    friction: number;
    /**
     * Drag on a molecule that has been knocked across the table. Higher than a
     * throw's: a struck molecule should shift and settle, not sail away.
     */
    chainFriction: number;
    /** Below this speed an atom is at rest (gameplay px/second). */
    restSpeed: number;
    /**
     * Share of the thrown atom's speed handed to what it hits. The receiving
     * molecule divides it by how many atoms it has, so a growing chain is
     * harder to shift - mass, in the only form this game needs.
     */
    impulseTransfer: number;
    /** How much a non-bonding hit bounces the thrown atom back. */
    restitution: number;
    /** Distance from a carbon centre at which a bonded atom settles. */
    bondLength: number;
    /**
     * How close a thrown atom must come to a free bond marker to be caught by
     * it. The marker is drawn a whole bond length out from the carbon, so
     * without this an atom aimed exactly at the marker sailed straight
     * through the slot without ever touching the carbon - the one aim the
     * game asks for was the one aim that could not work.
     */
    slotCapture: number;
    /**
     * How near a free bond marker the player has to point for that marker to
     * be the one they are aiming at.
     *
     * The renderer rings the marker inside this radius and the throw lands in
     * that same marker - it is one rule, asked once, so the marker that lights
     * up and the marker that catches the atom cannot disagree. Wider than
     * `slotCapture` because pointing is coarser than landing.
     */
    slotAimRadius: number;
    /** Spacing of carbons along the chain, matching the Figma pair. */
    chainSpacing: number;
    /** The rectangle a throw may travel in; leaving it is a miss. */
    bounds: { left: number; top: number; right: number; bottom: number };
    /**
     * How long a thrown atom may stay in the air before the throw is called a
     * miss.
     *
     * Drag is exponential, so an atom that is going to stop spends most of its
     * flight crawling: measured over 273 throws across the table, 41% of
     * misses took more than two seconds to fall under the rest threshold and
     * the worst took 4.1 seconds - all of it below walking pace, with the
     * player locked out and nothing on the card.
     *
     * The same sweep showed the latest a throw ever *bonded* was 1.83s, so
     * this ceiling ends the crawl without ending a single throw that was
     * still going somewhere. The trajectory itself is untouched.
     */
    maxFlightMs: number;
  };
  web: {
    /** How fast the web reels an atom in (gameplay px/second). */
    reelSpeed: number;
    /** How far the web can reach. */
    maxLength: number;
  };
  /**
   * Mistakes are allowed and recorded, never blocked. These two say what a
   * mistake costs in play: a wrong-family atom can be collected, but it will
   * not bond - so the molecule stays incomplete until the right one is used,
   * and nothing soft-locks.
   */
  allowWrongFamilyCollection: boolean;
  wrongFamilyBlocksBonding: boolean;
  /** A missed throw puts the atom back in the tray to try again. */
  returnMissedAtoms: boolean;
  /**
   * The one warning the round gives before the clock runs out. The frame
   * already turns the clock red here; this is the same moment said in words,
   * on the card that says everything else.
   */
  timer: {
    warnAtSeconds: number;
    /** How long the warning stays on the card. */
    noticeMs: number;
  };
  /**
   * How long the game holds still on a beat that exists to be read rather
   * than played. Without these the teaching phases were entered and left in
   * the same tick and never drew a single frame - the player was told the
   * hydrogen count by a number appearing, not by the sum being shown.
   *
   * The round clock stops while a teaching hold is up, so reading is never
   * paid for out of the player's time.
   */
  teaching: {
    structureReadyMs: number;
    calculationMs: number;
    completionMs: number;
    timeoutMs: number;
    /** How long an explanation of a mistake stays on the card. */
    feedbackMs: number;
  };
  carbonImpact: CarbonImpactRules;
  scoring: Record<ScoreEvent, number>;
};

export const DEFAULT_RULES: Rules = {
  physics: {
    stepMs: 1000 / 60,
    throwRangeFactor: 1.8,
    maxThrowSpeed: 1600,
    friction: 1.1,
    chainFriction: 6,
    restSpeed: 12,
    // A firm nudge: enough to see the struck atom move on and strike the next,
    // not so much that the chain scatters.
    impulseTransfer: 0.3,
    restitution: 0.45,
    bondLength: 104,
    slotCapture: 12,
    slotAimRadius: 59,
    chainSpacing: 200,
    bounds: { left: 150, top: 150, right: 1290, bottom: 900 },
    maxFlightMs: 2000,
  },
  web: { reelSpeed: 1500, maxLength: 900 },
  allowWrongFamilyCollection: true,
  wrongFamilyBlocksBonding: true,
  returnMissedAtoms: true,
  timer: { warnAtSeconds: 20, noticeMs: 3500 },
  teaching: {
    structureReadyMs: 1100,
    calculationMs: 2600,
    completionMs: 1400,
    timeoutMs: 1400,
    feedbackMs: 5000,
  },
  // Every number here is from the interaction spec; changing the feel of the
  // collision is a change to this block and nothing else.
  carbonImpact: {
    paperSpeed: 760,
    approachDistance: 40,
    approachSlowdown: 0.5,
    contactMs: 120,
    responseMs: 140,
    bondMs: 200,
    settleMs: 380,
    burstInMs: 140,
    nearPush: 14,
    farPush: 9,
    compression: 0.06,
    burstSize: { width: 190, height: 230 },
  },
  // Placeholder values. The brief asks for no final formula yet; what matters
  // is that building by collision scores better than anything else.
  scoring: {
    CORRECT_ATOM_SELECTION: 50,
    WRONG_ATOM_SELECTION: -25,
    SUCCESSFUL_COLLISION: 100,
    COLLISION_CHAIN_STEP: 75,
    MISSED_THROW: -10,
    BOND_CREATED: 150,
    MOLECULE_COMPLETED: 500,
    TIME_REMAINING_PER_SECOND: 5,
  },
};

/** The starting difficulty the brief specifies: two minutes. */
export const EASY_TIME_LIMIT_SECONDS = 120;

/**
 * The challenges the alkane round can pose. The engine reads the molecule name
 * through the chemistry layer, so adding butane here needs no engine change.
 */
/**
 * The order the alkane round teaches its molecules in: one carbon, then two,
 * then three. It is the order the prefix rail already draws (Meth, Eth,
 * Prop...) and the order the walkthrough demonstrates, written down so the
 * game can follow it rather than each screen guessing.
 */
export const ALKANE_PROGRESSION = ['methane', 'ethane', 'propane'] as const;

/** The molecule after this one, or null at the end of the progression. */
export function nextAlkane(molecule: string): string | null {
  const at = ALKANE_PROGRESSION.indexOf(molecule as (typeof ALKANE_PROGRESSION)[number]);
  if (at < 0) return null;
  return ALKANE_PROGRESSION[at + 1] ?? null;
}

export const ALKANE_CHALLENGES: Record<string, Challenge> = {
  methane: {
    molecule: 'methane',
    timeLimitSeconds: EASY_TIME_LIMIT_SECONDS,
    carbonGroups: [['blue'], ['red'], ['green'], ['blue', 'blue']],
    hydrogenRow: ['blue', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue', 'blue', 'green', 'blue', 'blue', 'blue'],
  },
  ethane: {
    molecule: 'ethane',
    timeLimitSeconds: EASY_TIME_LIMIT_SECONDS,
    // The Figma row: the two-blue group is the ethane answer.
    carbonGroups: [['blue', 'red'], ['blue', 'green', 'green'], ['blue', 'blue'], ['blue', 'blue', 'blue']],
    hydrogenRow: ['blue', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue', 'blue', 'green', 'blue', 'blue', 'blue'],
  },
  propane: {
    molecule: 'propane',
    timeLimitSeconds: EASY_TIME_LIMIT_SECONDS,
    carbonGroups: [['blue', 'red'], ['blue', 'blue'], ['blue', 'blue', 'blue'], ['red', 'red', 'red']],
    hydrogenRow: ['blue', 'red', 'blue', 'blue', 'green', 'blue', 'blue', 'red', 'blue', 'blue', 'green', 'blue', 'blue'],
  },
};
