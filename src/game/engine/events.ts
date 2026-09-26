import type { Family } from '../chemistry/elements.ts';
import type { Vec } from '../chemistry/molecule.ts';

/**
 * What the game announces as it is played.
 *
 * The engine emits; nothing in the engine listens. Scoring, the session record
 * and - later - the sound layer subscribe from outside, so adding audio will
 * not mean touching chemistry or physics.
 */

/**
 * Why the engine judged an action wrong.
 *
 * The engine names the rule that was broken; it does not word the sentence.
 * `src/content/chemistry.ts` turns one of these into what the player reads,
 * so the explanation can be rewritten without touching gameplay.
 */
export type MistakeReason =
  | { kind: 'WRONG_CARBON_FAMILY'; picked: Family; expected: Family }
  | { kind: 'WRONG_CARBON_COUNT'; picked: number; expected: number; molecule: string }
  | { kind: 'WRONG_HYDROGEN_FAMILY'; picked: Family; expected: Family }
  | { kind: 'NO_FREE_BOND' }
  | { kind: 'TRAY_FULL' }
  | { kind: 'THROW_MISSED' };

export type GameEvent =
  | { type: 'GAME_STARTED'; molecule: string; carbonTarget: number }
  | { type: 'ATOM_SELECTED'; family: Family; element: 'C' | 'H'; expected: Family }
  | { type: 'WRONG_ATOM_SELECTED'; family: Family; element: 'C' | 'H'; expected: Family }
  | { type: 'WEB_STARTED'; atomId: string; from: Vec; to: Vec }
  | { type: 'ATOM_COLLECTED'; atomId: string; element: 'C' | 'H'; family: Family; collected: number; target: number }
  | { type: 'PAPER_THROWN'; atomId: string; direction: Vec; speed: number }
  | { type: 'ATOM_COLLISION'; movingId: string; struckId: string; chainDepth: number; bonded: boolean }
  | { type: 'BOND_CREATED'; a: string; b: string; order: number }
  | { type: 'THROW_MISSED'; atomId: string; reason: 'out-of-bounds' | 'came-to-rest' | 'no-bond' }
  | { type: 'HYDROGEN_TARGET_CALCULATED'; carbonCount: number; hydrogenCount: number }
  | { type: 'PHASE_CHANGED'; from: string; to: string }
  | { type: 'MOLECULE_COMPLETED'; molecule: string; score: number }
  | { type: 'TIMEOUT'; molecule: string }
  /** Fired once per round, as the clock crosses the warning mark. */
  | { type: 'TIME_WARNING'; secondsLeft: number }
  /** A mistake, with the reason attached so the UI can explain rather than scold. */
  | { type: 'MISTAKE_EXPLAINED'; reason: MistakeReason };

export type GameEventType = GameEvent['type'];

export type Listener = (event: GameEvent) => void;

/** A minimal emitter: no dependencies, no async, easy to assert on in tests. */
export class EventBus {
  private listeners = new Set<Listener>();

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}
