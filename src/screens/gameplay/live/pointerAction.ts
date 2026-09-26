import type { Vec } from '../../../game/chemistry/molecule.ts';
import type { GameEngine, Snapshot } from '../../../game/engine/engine.ts';

/** What a press on the play surface means, once the engine has been asked. */
export type PointerAction =
  | { kind: 'collect'; atomId: string }
  | { kind: 'throw' }
  | { kind: 'ignore' };

/**
 * Which of the paper's two jobs a press is asking for.
 *
 * The order is the whole rule, and it is written out here rather than left
 * implicit in the handler so it can be tested:
 *
 *   1. A hydrogen under the pointer is a pick. Collection always wins where
 *      there is actually something to collect.
 *   2. Otherwise, the highlighted bond marker is a throw - **even where it sits
 *      inside the hydrogen row's picking area**. Every carbon's lower bond
 *      marker does: it is drawn at design y 571 and the row's box starts at
 *      y 561, so the row used to swallow a press on a marker the game had just
 *      ringed as the target.
 *   3. Otherwise, a press inside the row is a pick attempt and is spent there.
 *      That is what stops a refused pick being re-read as "throw at the row".
 *   4. Otherwise it is a throw at open table.
 */
export function pointerAction(engine: GameEngine, snapshot: Snapshot, point: Vec): PointerAction {
  const collectable = engine.collectableAt(point);
  if (collectable) return { kind: 'collect', atomId: collectable.id };

  const throwing = engine.canThrow() && snapshot.paper.loadedAtomId !== null;
  if (throwing && engine.aimedTarget(point)) return { kind: 'throw' };

  if (engine.isCollectionArea(point)) return { kind: 'ignore' };
  return engine.canThrow() ? { kind: 'throw' } : { kind: 'ignore' };
}
