import type { Vec } from '../chemistry/molecule.ts';

/**
 * The paper: one object, two jobs.
 *
 * In COLLECTION it shoots the web that gathers atoms; in AIMING/THROWING it is
 * what an atom is launched from. Which one it is doing is a mode on this single
 * object rather than two separate systems, because the player experiences it as
 * one thing they are holding.
 */

export type PaperMode =
  /** On the table, nothing to do. */
  | 'IDLE'
  /** Web mode: the player is reeling atoms in. */
  | 'COLLECTION'
  /** Loaded and being pulled back to aim. */
  | 'AIMING'
  /** An atom is in the air. */
  | 'THROW'
  /** Coming back to rest after a throw. */
  | 'RETURNING'
  /** Out of play: time is up, or the round is over. */
  | 'DISABLED';

export type Paper = {
  mode: PaperMode;
  position: Vec;
  /** Set while the paper itself is the projectile (the carbon throw). */
  velocity: Vec;
  /** Which way the paper is pointing, in degrees. */
  angle: number;
  /** Where the player is pointing, in gameplay coordinates. */
  aim: Vec;
  /** The atom sitting on the paper, ready to throw. */
  loadedAtomId: string | null;
  /** Fades the paper out after it has spent itself on the pair. */
  opacity: number;
};

/** The web while it is out: from the paper to the atom it has latched onto. */
export type Web = {
  active: boolean;
  targetAtomId: string | null;
  tip: Vec;
  /** 0 when the web is at the paper, 1 when it has reached the atom. */
  progress: number;
  /** Out to the atom, then back with it. */
  direction: 'out' | 'in';
};

export function createPaper(position: Vec): Paper {
  return {
    mode: 'IDLE',
    position: { ...position },
    velocity: { x: 0, y: 0 },
    angle: 0,
    aim: { ...position },
    loadedAtomId: null,
    opacity: 1,
  };
}

export function createWeb(tip: Vec): Web {
  return { active: false, targetAtomId: null, tip: { ...tip }, progress: 0, direction: 'out' };
}

/** Mode changes go through here so an illegal one is a loud failure in tests. */
const ALLOWED: Record<PaperMode, PaperMode[]> = {
  IDLE: ['COLLECTION', 'AIMING', 'THROW', 'DISABLED'],
  COLLECTION: ['IDLE', 'AIMING', 'DISABLED'],
  AIMING: ['THROW', 'IDLE', 'COLLECTION', 'DISABLED'],
  THROW: ['RETURNING', 'DISABLED'],
  RETURNING: ['IDLE', 'COLLECTION', 'AIMING', 'DISABLED'],
  DISABLED: ['IDLE'],
};

export function canEnter(from: PaperMode, to: PaperMode): boolean {
  return from === to || ALLOWED[from].includes(to);
}

export function setMode(paper: Paper, mode: PaperMode): boolean {
  if (!canEnter(paper.mode, mode)) return false;
  paper.mode = mode;
  return true;
}
