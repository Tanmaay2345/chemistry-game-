import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, ALKANE_PROGRESSION, DEFAULT_RULES, nextAlkane } from './config.ts';
import { GameEngine } from './engine.ts';
import { projectScene } from '../../screens/gameplay/live/projectScene.ts';

/**
 * The teaching order: one carbon, then two, then three.
 *
 * All three challenges existed and only ethane was ever played - nothing
 * moved the round on, so the Meth and Prop chips on the prefix rail never
 * lit and those molecules could only be reached by editing the URL.
 */

const step = DEFAULT_RULES.physics.stepMs;

function tick(engine: GameEngine, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (until?.()) return;
    engine.tick(step);
  }
}

const famOf = (e: GameEngine, id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;

test('the progression is one carbon, then two, then three', () => {
  assert.deepEqual([...ALKANE_PROGRESSION], ['methane', 'ethane', 'propane']);
  for (const name of ALKANE_PROGRESSION) assert.ok(ALKANE_CHALLENGES[name], `${name} has a challenge`);
});

test('each molecule leads to the next, and the last leads nowhere', () => {
  assert.equal(nextAlkane('methane'), 'ethane');
  assert.equal(nextAlkane('ethane'), 'propane');
  assert.equal(nextAlkane('propane'), null);
  assert.equal(nextAlkane('butane'), null, 'an unknown name does not fall off the end');
});

test('each challenge asks for the right number of carbons and hydrogens', () => {
  for (const [name, carbons, hydrogens] of [['methane', 1, 4], ['ethane', 2, 6], ['propane', 3, 8]] as const) {
    const engine = new GameEngine(ALKANE_CHALLENGES[name]);
    assert.equal(engine.spec.name, name);
    assert.equal(engine.spec.carbonCount, carbons, `${name} carbons`);
    assert.equal(engine.spec.hydrogenCount, hydrogens, `${name} hydrogens`);
    assert.deepEqual(engine.spec.chainBonds, Array(carbons - 1).fill(1), `${name} is all single bonds`);
  }
});

test('each challenge offers a carbon set that is the right answer', () => {
  // A molecule the student cannot pick the carbons for is not reachable in
  // any useful sense.
  for (const name of ALKANE_PROGRESSION) {
    const engine = new GameEngine(ALKANE_CHALLENGES[name]);
    engine.start();
    const right = engine.snapshot().carbonGroups.filter((g) => {
      const atoms = g.atomIds.map((id) => famOf(engine, id));
      return atoms.length === engine.spec.carbonCount && atoms.every((a) => a.family === engine.spec.family);
    });
    assert.equal(right.length, 1, `${name} offers exactly one correct set`);
  }
});

test('the prefix rail lights the chip for the molecule being built', () => {
  for (const [name, chip] of [['methane', 0], ['ethane', 1], ['propane', 2]] as const) {
    const engine = new GameEngine(ALKANE_CHALLENGES[name]);
    engine.start();
    assert.equal(projectScene(engine.snapshot()).rail.activeIndex, chip, `${name} lights chip ${chip}`);
  }
});

test('the summary says which molecule comes next, and plays on at the end', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.methane);
  engine.start();
  engine.finish();
  const onward = projectScene(engine.snapshot(), 'ethane').panel.body;
  assert.match(onward, /Click this card to build ethane\./);
  const last = projectScene(engine.snapshot(), null).panel.body;
  assert.match(last, /Click this card to play again\./);
});

/** Plays a molecule to completion the way the game is played. */
function solve(name: string, group: number) {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  engine.start();
  engine.selectCarbonGroup(group);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  for (let n = 0; n < 30 && engine.getPhase() !== 'SUMMARY'; n++) {
    if (!engine.snapshot().paper.loadedAtomId) {
      if (engine.snapshot().hydrogenCollected >= engine.spec.hydrogenCount) break;
      const blue = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).family === 'blue' && famOf(engine, id).state === 'free');
      if (!blue) break;
      engine.fireWeb(blue);
      tick(engine, 5, () => engine.snapshot().heldIds.includes(blue));
      tick(engine, 2, () => engine.snapshot().paper.loadedAtomId !== null);
      continue;
    }
    const target = engine.bondTargets()[0];
    if (!target) break;
    engine.throwAt({ ...target.point });
    tick(engine, 10, () => engine.snapshot().flyingId === null);
  }
  tick(engine, 6, () => engine.getPhase() === 'SUMMARY');
  return engine;
}

test('every molecule in the progression can be played to completion', () => {
  for (const [name, group, bonds, hydrogens] of [['methane', 0, 4, 4], ['ethane', 2, 7, 6], ['propane', 2, 10, 8]] as const) {
    const engine = solve(name, group);
    const s = engine.snapshot();
    assert.equal(s.session.completionStatus, 'completed', `${name} finishes`);
    assert.equal(s.molecule.bonds.length, bonds, `${name} bond count`);
    assert.equal(s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length, hydrogens, `${name} hydrogens bonded`);
    assert.equal(s.summary?.completion, 'completed');
  }
});

test('finishing one molecule hands the round to the next, with a clean board', () => {
  // The screen advances by building a new engine for the next challenge; this
  // is what the player then gets.
  const done = solve('methane', 0);
  assert.equal(done.snapshot().session.completionStatus, 'completed');

  const onward = nextAlkane('methane')!;
  const fresh = new GameEngine(ALKANE_CHALLENGES[onward]);
  const s = fresh.snapshot();
  assert.equal(fresh.spec.name, 'ethane');
  assert.equal(s.molecule.bonds.length, 0);
  assert.equal(s.score, 0);
  assert.equal(s.summary, null);
  assert.equal(s.heldIds.length, 0);
  assert.equal(s.timeRemaining, ALKANE_CHALLENGES.ethane.timeLimitSeconds);
  assert.equal(projectScene(s).rail.activeIndex, 1, 'and the rail has moved to Eth');
});
