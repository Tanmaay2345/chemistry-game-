import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../../../game/engine/config.ts';
import { GameEngine } from '../../../game/engine/engine.ts';
import { hydrogenRowBox } from '../../../game/engine/layout.ts';
import { pointerAction } from './pointerAction.ts';

/**
 * What a press on the play surface means.
 *
 * Every carbon's lower bond marker sits inside the hydrogen row's picking
 * area - the marker is drawn at design y 571 and the row's box starts at
 * y 561 - so the row used to swallow a press on a marker the game had just
 * ringed as the target. These fix the order the two claims are settled in.
 */

const step = DEFAULT_RULES.physics.stepMs;

function tick(engine: GameEngine, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (until?.()) return;
    engine.tick(step);
  }
}

const famOf = (e: GameEngine, id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;

/** A molecule with its carbons built and one blue hydrogen on the paper. */
function loaded(molecule: string, group: number) {
  const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
  engine.start();
  engine.selectCarbonGroup(group);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  const blue = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).family === 'blue' && famOf(engine, id).state === 'free')!;
  engine.fireWeb(blue);
  tick(engine, 5, () => engine.snapshot().heldIds.includes(blue));
  tick(engine, 2, () => engine.snapshot().paper.loadedAtomId !== null);
  return engine;
}

/** Same, but with nothing on the paper: collection mode. */
function collecting(molecule: string, group: number) {
  const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
  engine.start();
  engine.selectCarbonGroup(group);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  return engine;
}

const MOLECULES = [
  ['methane', 0],
  ['ethane', 2],
  ['propane', 2],
] as const;

test('every highlighted bond marker throws when it is pressed', () => {
  for (const [molecule, group] of MOLECULES) {
    const engine = loaded(molecule, group);
    const targets = engine.bondTargets();
    assert.ok(targets.length > 0, `${molecule} offers markers`);
    for (const target of targets) {
      engine.aim(target.point);
      const ringed = engine.snapshot().aimedTarget;
      assert.ok(ringed && ringed.carbonId === target.carbonId && ringed.angle === target.angle, `${molecule} rings ${target.angle}`);
      const action = pointerAction(engine, engine.snapshot(), target.point);
      assert.equal(action.kind, 'throw', `${molecule} ${target.carbonId}@${target.angle} throws`);
    }
  }
});

test('the lower markers are the ones that sit inside the row, and they still throw', () => {
  // Names the actual overlap, so the test fails loudly if either moves.
  for (const [molecule, group] of MOLECULES) {
    const engine = loaded(molecule, group);
    const box = hydrogenRowBox(engine.snapshot().hydrogenRowIds.length);
    const inside = engine.bondTargets().filter((t) => engine.isCollectionArea(t.point));
    assert.ok(inside.length > 0, `${molecule} has a marker inside the row box`);
    for (const t of inside) {
      assert.equal(t.angle, 90, 'it is the lower marker');
      assert.ok(t.point.y >= box.top, 'and it really is inside the box');
      assert.equal(pointerAction(engine, engine.snapshot(), t.point).kind, 'throw', `${molecule} lower marker throws`);
    }
  }
});

test('a hydrogen under the pointer is still a pick, even in throw mode', () => {
  const engine = loaded('ethane', 2);
  const free = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).state === 'free')!;
  const action = pointerAction(engine, engine.snapshot(), famOf(engine, free).position);
  assert.deepEqual(action, { kind: 'collect', atomId: free });
});

test('pressing empty row space in throw mode neither collects nor throws', () => {
  const engine = loaded('ethane', 2);
  const box = hydrogenRowBox(engine.snapshot().hydrogenRowIds.length);
  // The left inside edge of the box, clear of any hydrogen and of any marker.
  const gap = { x: box.left + 6, y: box.top + box.height - 6 };
  assert.equal(engine.collectableAt(gap), null, 'no hydrogen there');
  assert.equal(engine.aimedTarget(gap), null, 'no marker there');
  assert.equal(pointerAction(engine, engine.snapshot(), gap).kind, 'ignore');
});

test('during collection the row still collects', () => {
  for (const [molecule, group] of MOLECULES) {
    const engine = collecting(molecule, group);
    for (const id of engine.snapshot().hydrogenRowIds) {
      const action = pointerAction(engine, engine.snapshot(), famOf(engine, id).position);
      assert.deepEqual(action, { kind: 'collect', atomId: id }, `${molecule} collects ${id}`);
    }
  }
});

test('with nothing on the paper a marker is not a throw', () => {
  // Throw mode is "something is loaded". Without that the marker is inert and
  // a press inside the row is still a pick attempt.
  const engine = collecting('ethane', 2);
  assert.equal(engine.snapshot().paper.loadedAtomId, null);
  const lower = engine.bondTargets().find((t) => t.angle === 90)!;
  assert.equal(pointerAction(engine, engine.snapshot(), lower.point).kind, 'ignore');
});

test('pressing open table away from everything is still a throw', () => {
  const engine = loaded('ethane', 2);
  const far = { x: 1240, y: 200 };
  assert.equal(engine.isCollectionArea(far), false);
  assert.equal(pointerAction(engine, engine.snapshot(), far).kind, 'throw');
});

test('a press on the lower marker really does put the atom in that slot', () => {
  // End to end: the fix must not have changed where the throw lands.
  for (const [molecule, group] of MOLECULES) {
    const engine = loaded(molecule, group);
    const lower = engine.bondTargets().find((t) => t.angle === 90)!;
    const before = engine.snapshot().molecule.bonds.length;
    assert.equal(pointerAction(engine, engine.snapshot(), lower.point).kind, 'throw');
    engine.throwAt({ ...lower.point });
    tick(engine, 10, () => engine.snapshot().flyingId === null);
    const after = engine.snapshot().molecule.bonds;
    assert.equal(after.length, before + 1, `${molecule} bonded`);
    const bond = after[after.length - 1];
    const placed = engine.snapshot().molecule.atoms.find((a) => a.id === (bond.a === lower.carbonId ? bond.b : bond.a))!;
    const off = Math.hypot(placed.position.x - lower.point.x, placed.position.y - lower.point.y);
    assert.ok(bond.a === lower.carbonId || bond.b === lower.carbonId, `${molecule} bonded to the aimed carbon`);
    assert.ok(off < 12, `${molecule} landed in the aimed slot, ${off.toFixed(1)}px away`);
  }
});
