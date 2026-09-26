import type { Family } from '../chemistry/elements.ts';
import type { Rules, ScoreEvent } from './config.ts';
import type { GameEvent, MistakeReason } from './events.ts';

/**
 * The record of what the player did, and the summary built from it.
 *
 * This is the educational half of the game: mistakes are not blocked while
 * playing, they are collected here and explained at the end. The engine only
 * records; how the summary is worded is the UI's business.
 */

export type Selection = {
  element: 'C' | 'H';
  family: Family;
  expected: Family;
  correct: boolean;
  /** Seconds into the round. */
  at: number;
};

export type SessionRecord = {
  targetMolecule: string;
  startTime: number;
  endTime: number | null;
  remainingTime: number;
  carbonSelections: Selection[];
  hydrogenSelections: Selection[];
  wrongSelections: number;
  collectedCarbons: number;
  collectedHydrogens: number;
  successfulCollisions: number;
  /** Hits that moved something but formed no bond. */
  unsuccessfulCollisions: number;
  missedThrows: number;
  throws: number;
  bondsCreated: number;
  /** The longest run of collisions caused by a single throw. */
  bestCollisionChain: number;
  /** How many times each kind of mistake was made, for the summary. */
  mistakes: Record<MistakeReason['kind'], number>;
  score: number;
  completionStatus: 'in-progress' | 'completed' | 'timeout';
};

export function createSession(molecule: string, timeLimitSeconds: number, now: number): SessionRecord {
  return {
    targetMolecule: molecule,
    startTime: now,
    endTime: null,
    remainingTime: timeLimitSeconds,
    carbonSelections: [],
    hydrogenSelections: [],
    wrongSelections: 0,
    collectedCarbons: 0,
    collectedHydrogens: 0,
    successfulCollisions: 0,
    unsuccessfulCollisions: 0,
    missedThrows: 0,
    throws: 0,
    bondsCreated: 0,
    bestCollisionChain: 0,
    mistakes: {
      WRONG_CARBON_FAMILY: 0,
      WRONG_CARBON_COUNT: 0,
      WRONG_HYDROGEN_FAMILY: 0,
      NO_FREE_BOND: 0,
      TRAY_FULL: 0,
      THROW_MISSED: 0,
    },
    score: 0,
    completionStatus: 'in-progress',
  };
}

/** Folds one event into the record and the score. */
export function recordEvent(session: SessionRecord, event: GameEvent, rules: Rules, elapsed: number): void {
  const award = (key: ScoreEvent, times = 1) => {
    session.score += rules.scoring[key] * times;
  };

  switch (event.type) {
    case 'ATOM_SELECTED': {
      const selection: Selection = { element: event.element, family: event.family, expected: event.expected, correct: true, at: elapsed };
      (event.element === 'C' ? session.carbonSelections : session.hydrogenSelections).push(selection);
      award('CORRECT_ATOM_SELECTION');
      break;
    }
    case 'WRONG_ATOM_SELECTED': {
      const selection: Selection = { element: event.element, family: event.family, expected: event.expected, correct: false, at: elapsed };
      (event.element === 'C' ? session.carbonSelections : session.hydrogenSelections).push(selection);
      session.wrongSelections += 1;
      award('WRONG_ATOM_SELECTION');
      break;
    }
    case 'ATOM_COLLECTED':
      if (event.element === 'C') session.collectedCarbons += 1;
      else session.collectedHydrogens += 1;
      break;
    case 'PAPER_THROWN':
      session.throws += 1;
      break;
    case 'ATOM_COLLISION':
      if (event.bonded) {
        session.successfulCollisions += 1;
        award('SUCCESSFUL_COLLISION');
        // A chain is worth more than the same number of separate hits: this
        // is the mechanic the game wants the player to discover. It pays only
        // when the chain ends in a bond. Paying for the contact alone meant
        // bouncing an atom off the molecule scored as well as building with
        // it, and a round that ran out of time could out-score a finished
        // one - the game rewarding exactly what it was trying to teach out.
        if (event.chainDepth > 1) award('COLLISION_CHAIN_STEP');
      } else {
        session.unsuccessfulCollisions += 1;
      }
      session.bestCollisionChain = Math.max(session.bestCollisionChain, event.chainDepth);
      break;
    case 'BOND_CREATED':
      session.bondsCreated += 1;
      award('BOND_CREATED');
      break;
    case 'THROW_MISSED':
      session.missedThrows += 1;
      award('MISSED_THROW');
      break;
    case 'MOLECULE_COMPLETED':
      session.completionStatus = 'completed';
      award('MOLECULE_COMPLETED');
      award('TIME_REMAINING_PER_SECOND', Math.floor(session.remainingTime));
      break;
    case 'MISTAKE_EXPLAINED':
      session.mistakes[event.reason.kind] += 1;
      break;
    case 'TIMEOUT':
      session.completionStatus = 'timeout';
      break;
    default:
      break;
  }
}

export type LearningSummary = {
  molecule: string;
  completion: SessionRecord['completionStatus'];
  score: number;
  timeTaken: number;
  remainingTime: number;
  wrongCarbonFamilySelections: number;
  wrongHydrogenFamilySelections: number;
  missedThrows: number;
  successfulCollisions: number;
  bestCollisionChain: number;
  bondsCreated: number;
  /** What to talk to the player about, most useful first. */
  notes: string[];
};

/**
 * Turns the record into the data the summary screen shows. The wording here is
 * a first pass; the UI can rephrase it without the engine changing.
 */
export function summarise(session: SessionRecord, timeLimitSeconds: number): LearningSummary {
  const wrongCarbon = session.carbonSelections.filter((s) => !s.correct).length;
  const wrongHydrogen = session.hydrogenSelections.filter((s) => !s.correct).length;
  const notes: string[] = [];

  // Which mistake it was decides what to say. Telling a player who picked the
  // right colour and the wrong number of carbons about colours sends them to
  // correct the one thing they got right.
  if (session.mistakes.WRONG_CARBON_FAMILY > 0)
    notes.push(
      `The colour of a carbon set is the bond it makes, not decoration: blue is single, red double, green triple. ` +
        `An alkane is single bonds, so it is built from the blue set. Wrong colours picked: ${session.mistakes.WRONG_CARBON_FAMILY}.`,
    );
  if (session.mistakes.WRONG_CARBON_COUNT > 0)
    notes.push(
      `The prefix of the name is the number of carbons - meth 1, eth 2, prop 3, and so on. ` +
        `Sets of the wrong size picked: ${session.mistakes.WRONG_CARBON_COUNT}.`,
    );
  if (wrongCarbon > 0 && session.mistakes.WRONG_CARBON_FAMILY + session.mistakes.WRONG_CARBON_COUNT === 0)
    notes.push(`Carbon sets picked that were not the one the name asks for: ${wrongCarbon}.`);
  if (wrongHydrogen > 0)
    notes.push(
      `Hydrogen always makes a single bond, whatever colour it is - the colour says which set the atom ` +
        `belongs to, and an alkane is built from its own blue set. A red or green one came back to the ` +
        `row instead of bonding. Wrong picks: ${wrongHydrogen}.`,
    );
  if (session.missedThrows > 0)
    notes.push(`Throws that did not land: ${session.missedThrows}. Aim at one of the free bond markers on a carbon.`);
  if (session.bestCollisionChain > 1) notes.push(`Best collision chain: ${session.bestCollisionChain}. One throw moved several atoms.`);
  if (session.completionStatus === 'timeout') notes.push('Time ran out before the molecule was finished.');
  if (session.completionStatus === 'completed' && wrongCarbon + wrongHydrogen === 0) notes.push('Built with the right families throughout.');

  return {
    molecule: session.targetMolecule,
    completion: session.completionStatus,
    score: session.score,
    timeTaken: timeLimitSeconds - session.remainingTime,
    remainingTime: session.remainingTime,
    wrongCarbonFamilySelections: wrongCarbon,
    wrongHydrogenFamilySelections: wrongHydrogen,
    missedThrows: session.missedThrows,
    successfulCollisions: session.successfulCollisions,
    bestCollisionChain: session.bestCollisionChain,
    bondsCreated: session.bondsCreated,
    notes,
  };
}
