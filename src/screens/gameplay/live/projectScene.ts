import type { Atom, Vec } from '../../../game/chemistry/molecule.ts';
import type { Snapshot } from '../../../game/engine/engine.ts';
import { growthAt } from '../../../game/engine/carbonImpact.ts';
import { DEFAULT_RULES } from '../../../game/engine/config.ts';
import {
  CARBON_GROUPS,
  COLLECTED_TRAY,
  hydrogenRowBox,
  PAPER_SIZE,
  SMALL_CARBON,
  carbonGroupWidth,
} from '../../../game/engine/layout.ts';
import { METH_RAIL, standardRules } from '../data/common.ts';
import {
  FAMILY_GLYPH,
  HYDROGEN_COLOUR_NOTE,
  SERIES_COPY,
  explainMistake,
  timeWarningCopy,
} from '../../../content/chemistry.ts';
import type { CarbonColor, HydrogenColor, Scene, SceneElement } from '../scene/types';

/**
 * Turns a snapshot of the game into a scene the existing renderer can draw.
 *
 * This is the whole join between the engine and the Figma work: the same
 * components, the same assets, the same coordinates - only the positions now
 * come from the game rather than from a transcribed frame. The 31 frames are
 * untouched and still play on their own route.
 */

const BOND_ART = '/figma/fb730.png';
const BURST_ART = '/figma/renders/ethane-05-splash.png';
const SLOT_ART = '/figma/736e5.png';
const PAPER_ART = '/figma/a9c72.svg';
const PAPER_LOADED_ART = '/figma/ef0e6.svg';
const BONDED_HYDROGEN_ART = '/figma/c7177.svg';
const CARBON_HIGHLIGHT = 0.5;

/** What the card says at each point of the round. */
function instruction(snapshot: Snapshot, nextMolecule: string | null): { title: string; body: string } {
  const { phase, spec } = snapshot;
  switch (phase) {
    case 'INTRO_OBJECTIVE':
      return { title: snapshot.objective, body: 'Read the name: the prefix gives the carbons, the ending gives the bond.' };
    case 'CARBON_SELECTION':
      return { title: snapshot.objective, body: 'Throw the paper at the carbon set of the same family of colour.' };
    case 'PAPER_FLIGHT':
      return { title: snapshot.objective, body: 'Throw the paper at the carbon set of the same family of colour.' };
    case 'CARBON_IMPACT':
      return { title: snapshot.objective, body: 'The carbons take the hit and bond.' };
    case 'CARBON_STRUCTURE_READY':
      return {
        title: `${SERIES_COPY.alkane.singular} - ${spec.name}`,
        body:
          spec.carbonCount === 1
            ? 'One carbon, with four bonds to fill. Now the hydrogens.'
            : `${spec.carbonCount} carbons, joined by ${SERIES_COPY.alkane.bondWord} covalent bonds - that is what the "${SERIES_COPY.alkane.suffix}" ending means. Now the hydrogens.`,
      };
    case 'HYDROGEN_CALCULATION':
      return { title: 'Count the bonds .', body: 'Each carbon holds four bonds. What the chain does not use is for hydrogen.' };
    case 'HYDROGEN_SELECTION':
      return {
        title: 'Select the hydrogen of same family',
        body: `${spec.name} needs ${spec.hydrogenCount} hydrogen atoms, from the same set as its carbons. ${HYDROGEN_COLOUR_NOTE}`,
      };
    case 'HYDROGEN_COLLECTION':
      // Which of the paper's two jobs is live right now. The card used to say
      // "Collect" while a hydrogen was already sitting on the paper armed to
      // throw, so the screen was describing the previous step.
      return snapshot.paper.loadedAtomId
        ? {
            title: 'Throw the hydrogen .',
            body: `Collected ${snapshot.hydrogenCollected} of ${spec.hydrogenCount}. One is on the paper - click a free bond marker to throw it.`,
          }
        : {
            title: 'Make the spiderweb .',
            body: `Click a hydrogen in the row to collect it. ${snapshot.hydrogenCollected} / ${spec.hydrogenCount}`,
          };
    case 'THROWING':
    case 'COLLISION':
    case 'MOLECULE_VALIDATION': {
      // While an atom is in the air the table is busy: saying so is what
      // stops a throw that is still travelling reading as a frozen game.
      if (snapshot.flyingId) {
        return { title: 'Throw the hydrogen .', body: 'The hydrogen is in the air \u2026' };
      }
      // Out of how many: the chain's own bonds plus one per hydrogen. The
      // card used to give a count with no total, so "1" meant nothing.
      const total = spec.carbonCount - 1 + spec.hydrogenCount;
      return {
        title: 'Throw the hydrogen .',
        body: `Bonds made: ${snapshot.molecule.bonds.length} of ${total}. Aim at a free bond marker.`,
      };
    }
    case 'COMPLETION': {
      // The time bonus is about a sixth of a good score and used to arrive as
      // a silent jump on the last frame. It is named here, while the finished
      // molecule is still on screen.
      const left = Math.floor(snapshot.timeRemaining);
      const bonus = left * DEFAULT_RULES.scoring.TIME_REMAINING_PER_SECOND;
      return {
        title: `${SERIES_COPY.alkane.singular} - ${spec.name}`,
        body:
          `${spec.carbonCount} carbon${spec.carbonCount === 1 ? '' : 's'} and ${spec.hydrogenCount} hydrogens, every bond ${SERIES_COPY.alkane.bondWord}. ` +
          `Complete, with ${left}s to spare - that is ${bonus} bonus points.`,
      };
    }
    case 'TIMEOUT':
      return { title: 'Time up .', body: 'The round is over. The summary is next.' };
    case 'SUMMARY': {
      const summary = snapshot.summary;
      if (!summary) return { title: 'Summary', body: '' };
      return {
        title: summary.completion === 'completed' ? `${spec.name} complete - ${summary.score} points` : `Time up - ${summary.score} points`,
        // Where the card leads next: on to the molecule after this one, or
        // back to this one again.
        body: `${summary.notes.join('  ')}  ${nextMolecule ? `Click this card to build ${nextMolecule}.` : 'Click this card to play again.'}`,
      };
    }
    default:
      return { title: snapshot.objective, body: '' };
  }
}

/** Element placement takes a top-left corner; the engine works in centres. */
function topLeft(position: Vec, width: number, height: number): { left: number; top: number } {
  return { left: position.x - width / 2, top: position.y - height / 2 };
}

function hydrogenAt(atom: Atom, key: string, art?: string): SceneElement {
  return {
    kind: 'hydrogen',
    key,
    color: atom.family as HydrogenColor,
    art,
    ...topLeft(atom.position, 47, 47),
  };
}

function carbonAt(atom: Atom, key: string, size: 'large' | 'small'): SceneElement {
  const width = size === 'large' ? 88.56 : SMALL_CARBON.width;
  const height = size === 'large' ? 82 : SMALL_CARBON.height;
  return {
    kind: 'carbon',
    key,
    color: atom.family as CarbonColor,
    size,
    highlight: CARBON_HIGHLIGHT,
    ...topLeft(atom.position, width, height),
  };
}

/** A straight line between two points, drawn with Figma's bond bitmap. */
function lineBetween(from: Vec, to: Vec, key: string, src = BOND_ART): SceneElement {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    kind: 'line',
    key,
    src,
    left: (from.x + to.x) / 2 - len / 2,
    top: (from.y + to.y) / 2,
    width: len,
    height: 0,
    rotate: angle,
    length: len,
    inset: 4,
  };
}

/**
 * The free bond the player is currently pointing at, if any.
 *
 * "Near enough" is the same capture radius the engine uses, so what is
 * highlighted is exactly what a throw would land in.
 */
function nearestTarget(snapshot: Snapshot) {
  // Which marker is being aimed at is the engine's answer, not a second
  // calculation here: the ring and the slot that catches the throw have to be
  // the same marker, so they come from the same place.
  //
  // The guard is presentation only - do not ring a marker when there is
  // nothing to throw at it, or while a teaching beat is up.
  if (!snapshot.paper.loadedAtomId || snapshot.holding) return null;
  return snapshot.aimedTarget;
}

/**
 * The second channel on a coloured atom.
 *
 * The three families are drawn in three colours and nothing else, and two of
 * them - #0795ff and #69a13b - have the same relative luminance, so to anyone
 * who cannot separate those hues the carbon sets would otherwise be identical.
 * The bond the family stands for is written above each carbon as one, two or
 * three strokes, which is the notation the bond itself is drawn in.
 *
 * The hydrogen row has no such badge: naming its set told the player the
 * answer. The set is still said in each hydrogen's accessible name, which is
 * read rather than seen.
 */
function familyGlyph(atom: Atom, key: string): SceneElement {
  return {
    kind: 'text',
    key,
    left: atom.position.x,
    centerX: true,
    top: atom.position.y - 48,
    // The bond the colour stands for, in the notation the bond itself is drawn
    // in. Carbons only: the hydrogen row carries no badge, so which set a
    // hydrogen belongs to is something the player has to read from its colour.
    text: FAMILY_GLYPH[atom.family as 'blue' | 'red' | 'green'],
    fontSize: 17,
    fontWeight: 700,
    color: '#4a4a4a',
  };
}

export function projectScene(snapshot: Snapshot, nextMolecule: string | null = null): Scene {
  const { molecule } = snapshot;
  const elements: SceneElement[] = [];
  const atomsById = new Map(molecule.atoms.map((a) => [a.id, a]));
  const text = instruction(snapshot, nextMolecule);

  // The carbon groups stay on the table while the paper is in the air and
  // while the struck pair is reacting, exactly as the reference frames show.
  const poolVisible =
    snapshot.phase === 'CARBON_SELECTION' || snapshot.phase === 'PAPER_FLIGHT' || snapshot.phase === 'CARBON_IMPACT';
  if (poolVisible) {
    const sizes = snapshot.carbonGroups.map((g) => g.atomIds.length);
    const widths = sizes.map(carbonGroupWidth);
    const total = widths.reduce((sum, w) => sum + w, 0) + CARBON_GROUPS.groupGap * (sizes.length - 1);
    let boxLeft = CARBON_GROUPS.centreX - total / 2;
    snapshot.carbonGroups.forEach((group, i) => {
      elements.push({
        kind: 'box',
        key: `group-${i}`,
        left: boxLeft,
        top: CARBON_GROUPS.centreY - (SMALL_CARBON.height / 2 + CARBON_GROUPS.padding.y),
        width: widths[i],
        height: SMALL_CARBON.height + CARBON_GROUPS.padding.y * 2,
        border: 'solid',
        borderColor: group.chosen ? '#0795ff' : '#e6e6e6',
        radius: 0,
      });
      boxLeft += widths[i] + CARBON_GROUPS.groupGap;
      for (const id of group.atomIds) {
        const atom = atomsById.get(id)!;
        if (atom.state !== 'free') continue;
        elements.push(carbonAt(atom, id, 'small'));
        elements.push(familyGlyph(atom, `${id}-glyph`));
      }
    });
  }

  // The mixed hydrogen row, once the carbons are dealt with.
  const rowVisible = snapshot.phase === 'HYDROGEN_SELECTION' || snapshot.phase === 'HYDROGEN_COLLECTION' || snapshot.hydrogenTarget !== null;
  if (rowVisible) {
    const box = hydrogenRowBox(snapshot.hydrogenRowIds.length);
    elements.push({
      kind: 'box',
      key: 'selection',
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      border: 'dashed',
      borderColor: '#d4cdcd',
      radius: 8,
      innerShadow: 'inset 0px 4px 4px 0px rgba(228,221,221,0.25)',
    });
    for (const id of snapshot.hydrogenRowIds) {
      const atom = atomsById.get(id)!;
      if (atom.state !== 'free') continue;
      elements.push(hydrogenAt(atom, id));
    }
  }

  // What the web has brought back, waiting by the paper. The one already on
  // the paper is drawn there, not here: counting it left a permanent empty
  // slot at the left of the tray.
  const waiting = snapshot.heldIds.filter((id) => id !== snapshot.paper.loadedAtomId);
  if (waiting.length > 0) {
    const width = waiting.length * 47 + (waiting.length - 1) * COLLECTED_TRAY.gap + COLLECTED_TRAY.padding * 2;
    elements.push({
      kind: 'box',
      key: 'collected',
      left: COLLECTED_TRAY.left,
      top: COLLECTED_TRAY.top,
      width,
      height: 47 + COLLECTED_TRAY.padding * 2,
      border: 'solid',
      borderColor: '#d8d8d8',
      radius: 5,
    });
  }
  for (const id of waiting) {
    const atom = atomsById.get(id)!;
    elements.push(atom.element === 'H' ? hydrogenAt(atom, id) : carbonAt(atom, id, 'small'));
  }

  // The molecule: bonds first, so the atoms sit on top of them. A bond made
  // by the collision grows outward from the midpoint as it forms.
  const forming = snapshot.carbonImpact;
  for (const bond of molecule.bonds) {
    const a = atomsById.get(bond.a)!;
    const b = atomsById.get(bond.b)!;
    const growing = forming && forming.bondProgress < 1 && forming.members.includes(bond.a) && forming.members.includes(bond.b);
    if (!growing) {
      elements.push(lineBetween(a.position, b.position, bond.id));
      continue;
    }
    const mid = { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
    const half = forming.bondProgress / 2;
    elements.push(
      lineBetween(
        { x: mid.x + (a.position.x - mid.x) * half * 2, y: mid.y + (a.position.y - mid.y) * half * 2 },
        { x: mid.x + (b.position.x - mid.x) * half * 2, y: mid.y + (b.position.y - mid.y) * half * 2 },
        bond.id,
      ),
    );
  }

  // Free bonds, straight from the engine's own list - the same points a
  // thrown atom is caught by, so a marker is a target and not a decoration.
  // The one nearest where the player is pointing is marked, so aiming has an
  // answer before the throw rather than after it.
  const aimedAt = nearestTarget(snapshot);
  // Nothing can be thrown while the sum is being read, and the markers run
  // straight through where it is written.
  const markers = snapshot.phase === 'HYDROGEN_CALCULATION' ? [] : snapshot.bondTargets;
  markers.forEach((target, i) => {
    const carbon = atomsById.get(target.carbonId)!;
    const radians = (target.angle * Math.PI) / 180;
    const from = { x: carbon.position.x + Math.cos(radians) * 46, y: carbon.position.y + Math.sin(radians) * 46 };
    const to = { x: carbon.position.x + Math.cos(radians) * 110, y: carbon.position.y + Math.sin(radians) * 110 };
    elements.push(lineBetween(from, to, `${target.carbonId}-slot-${i}`, SLOT_ART));
    if (aimedAt === target) {
      elements.push({
        kind: 'box',
        key: `${target.carbonId}-slot-${i}-aim`,
        left: target.point.x - 27,
        top: target.point.y - 27,
        width: 54,
        height: 54,
        border: 'solid',
        borderColor: '#0795ff',
        radius: 27,
      });
    }
  });

  // A struck carbon grows from the small pill it was in the group to the
  // play-area pill, and squashes along the axis the paper came in on.
  const impact = snapshot.carbonImpact;
  const impactRules = DEFAULT_RULES.carbonImpact;
  const struck = new Set(impact?.members ?? []);
  const impactAngle = impact ? (Math.atan2(impact.direction.y, impact.direction.x) * 180) / Math.PI : 0;
  const growth = impact ? SMALL_CARBON.width / 88.56 + (1 - SMALL_CARBON.width / 88.56) * growthAt(impact.t, impactRules) : 1;

  for (const atom of molecule.atoms) {
    if (atom.state !== 'bonded' && atom.state !== 'placed' && atom.state !== 'flying') continue;
    if (atom.element !== 'C') {
      elements.push(hydrogenAt(atom, atom.id, atom.state === 'bonded' ? BONDED_HYDROGEN_ART : undefined));
      continue;
    }
    const carbon = carbonAt(atom, atom.id, 'large');
    if (impact && struck.has(atom.id) && carbon.kind === 'carbon') {
      const squash = impact.compression;
      carbon.transform = `scale(${growth.toFixed(4)}) rotate(${impactAngle.toFixed(2)}deg) scale(${(1 - squash).toFixed(4)}, ${(1 + squash * 0.6).toFixed(4)}) rotate(${(-impactAngle).toFixed(2)}deg)`;
    }
    elements.push(carbon);
  }

  // The burst, anchored where the paper's nose landed - not at the group's
  // centre, so the contact point is readable.
  if (impact && impact.burst.opacity > 0) {
    const width = impactRules.burstSize.width * impact.burst.scale;
    const height = impactRules.burstSize.height * impact.burst.scale;
    elements.push({
      kind: 'image',
      key: 'burst',
      src: BURST_ART,
      left: impact.contactPoint.x - width / 2,
      top: impact.contactPoint.y - height / 2,
      width,
      height,
      opacity: impact.burst.opacity,
    });
  }

  // The web, while it is out.
  if (snapshot.web.active) {
    elements.push(lineBetween(snapshot.paper.position, snapshot.web.tip, 'web', SLOT_ART));
  }

  // The paper, pointed where the player is pointing.
  const paper = snapshot.paper;
  const aimAngle = (Math.atan2(paper.aim.y - paper.position.y, paper.aim.x - paper.position.x) * 180) / Math.PI;
  // Aiming: with an atom loaded (the hydrogen throws), or empty in the carbon
  // phase, where the paper itself is what gets thrown.
  const aiming =
    (paper.mode === 'AIMING' && paper.loadedAtomId !== null) || (snapshot.phase === 'CARBON_SELECTION' && paper.mode !== 'DISABLED');
  const flying = snapshot.phase === 'PAPER_FLIGHT' || paper.mode === 'THROW';

  if (paper.mode !== 'DISABLED' && paper.opacity > 0) {
    if (aiming) elements.push(lineBetween(paper.position, paper.aim, 'aim', SLOT_ART));
    elements.push({
      kind: 'image',
      key: 'paper',
      src: paper.loadedAtomId ? PAPER_LOADED_ART : PAPER_ART,
      ...topLeft(paper.position, PAPER_SIZE.width, PAPER_SIZE.height),
      width: PAPER_SIZE.width,
      height: PAPER_SIZE.height,
      rotate: flying ? paper.angle : aiming ? aimAngle : 0,
      opacity: paper.opacity < 1 ? paper.opacity : undefined,
      inset: '-1.83% -0.25% -1.87% -1.14%',
    });
  }

  // Clock and score, in the frame's own type.
  elements.push({
    kind: 'text',
    key: 'clock',
    left: 980,
    top: 300,
    text: `${Math.floor(snapshot.timeRemaining / 60)}:${String(Math.floor(snapshot.timeRemaining % 60)).padStart(2, '0')}`,
    fontSize: 32,
    fontWeight: 600,
    color: snapshot.timeRemaining < 20 ? '#fd2121' : '#0795ff',
  });
  elements.push({
    kind: 'text',
    key: 'score',
    left: 980,
    top: 345,
    text: `${snapshot.score} points`,
    fontSize: 20,
    fontWeight: 500,
    color: '#8a8a8a',
  });

  elements.push({ kind: 'rail' });
  elements.push({ kind: 'panel' });

  return {
    id: `live-${snapshot.phase}`,
    figmaNode: 'engine',
    figmaName: 'live',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, explicitHeight: true, rules: standardRules() },
    rail: { ...METH_RAIL, activeIndex: Math.max(0, snapshot.spec.carbonCount - 1) },
    panel: {
      layout: 'card',
      left: 'calc(50% - 0.5px)',
      top: 801.5,
      centerX: true,
      title: text.title,
      body: text.body,
      // The clock takes the line while it is warning: it is the only thing on
      // the card with a deadline attached.
      note: snapshot.timeWarning
        ? timeWarningCopy(snapshot.timeWarning)
        : snapshot.feedback
          ? explainMistake(snapshot.feedback)
          : undefined,
    },
    elements,
  };
}
