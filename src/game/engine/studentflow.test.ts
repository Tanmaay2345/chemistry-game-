import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';
import { HYDROGEN_ROW, hydrogenRowBox } from './layout.ts';
import { CARBON_VALENCY_LESSON, explainMistake } from '../../content/chemistry.ts';
import { GAMEPLAY_STEPS } from '../../screens/gameplay/flow/steps.ts';

/**
 * The three blockers the first-time-student playtest found, kept fixed.
 */

const step = DEFAULT_RULES.physics.stepMs;

function tick(engine: GameEngine, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (until?.()) return;
    engine.tick(step);
  }
}

// ------------------------------------------- 1: the walkthrough dead end

test('the walkthrough ends on a step that hands over to the game', () => {
  const last = GAMEPLAY_STEPS[GAMEPLAY_STEPS.length - 1];
  // The final frame waits for a click rather than a timer, so the handover
  // into the game happens when the learner is ready, not under them.
  assert.equal(last.advance.kind, 'click');
  assert.equal(last.scene, 'ethane-15');
});

test('every walkthrough step is one the learner can be moved off', () => {
  // Each step either names the card or names an element. The card advances
  // every step regardless (GameplayScene's onCardAdvance), which is what
  // removed the dead end - a step whose element hotspot was covered by a
  // sibling had nothing left to press.
  for (const s of GAMEPLAY_STEPS) {
    assert.ok(s.advance.kind === 'click' || s.advance.kind === 'auto', `${s.scene} advances`);
    if (s.advance.kind === 'auto') assert.ok(s.advance.afterMs > 0, `${s.scene} has a duration`);
  }
  assert.ok(GAMEPLAY_STEPS.length > 20, 'the whole Figma flow is present');
});

// --------------------------------------- 2: collect versus throw

/** Ethane with the carbons built and the hydrogen row on the table. */
function readyForHydrogens() {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  return engine;
}

const famOf = (engine: GameEngine, id: string) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!;

test('the hydrogen row is a collection area, and the molecule is not', () => {
  const engine = readyForHydrogens();
  const box = hydrogenRowBox(engine.snapshot().hydrogenRowIds.length);

  // Every atom drawn in the row is inside it.
  for (const id of engine.snapshot().hydrogenRowIds) {
    assert.equal(engine.isCollectionArea(famOf(engine, id).position), true, `${id} is in the row`);
  }
  // The carbons and their free bonds are not.
  for (const carbon of engine.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free')) {
    assert.equal(engine.isCollectionArea(carbon.position), false, 'a carbon is not the row');
  }
  assert.ok(box.top > 500 && box.height > 0);
});

test('a click on the row while one is already loaded does not throw it', () => {
  const engine = readyForHydrogens();
  const blue = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).family === 'blue')!;
  engine.fireWeb(blue);
  tick(engine, 5, () => engine.snapshot().paper.loadedAtomId !== null);
  assert.ok(engine.snapshot().paper.loadedAtomId, 'one is on the paper');

  // The player clicks another hydrogen in the row, meaning to collect it.
  const another = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).state === 'free')!;
  const point = { ...famOf(engine, another).position };
  assert.equal(engine.isCollectionArea(point), true, 'that point is in the row');

  const before = engine.snapshot();
  engine.fireWeb(another);
  tick(engine, 1);
  // Whatever the engine decides about the pick, nothing was thrown.
  assert.equal(engine.snapshot().flyingId, null, 'nothing is in the air');
  assert.equal(engine.snapshot().session.throws, before.session.throws, 'no throw was recorded');
});

test('a pick refused because the tray is full says why, instead of doing nothing', () => {
  // The tray filled with atoms that cannot bond is the case where a learner
  // clicks the row, nothing happens, and there is no reason on screen.
  const engine = readyForHydrogens();
  const wrong = engine.snapshot().hydrogenRowIds.filter((id) => famOf(engine, id).family !== 'blue');
  for (const id of wrong) {
    if (engine.snapshot().heldIds.length >= engine.spec.hydrogenCount) break;
    engine.fireWeb(id);
    tick(engine, 5, () => engine.snapshot().heldIds.includes(id));
  }
  if (engine.snapshot().heldIds.length < engine.spec.hydrogenCount) {
    // Not enough decoys in the row to fill it; top up with blues.
    for (const id of engine.snapshot().hydrogenRowIds) {
      if (engine.snapshot().heldIds.length >= engine.spec.hydrogenCount) break;
      if (famOf(engine, id).state !== 'free') continue;
      engine.fireWeb(id);
      tick(engine, 5, () => engine.snapshot().heldIds.includes(id));
    }
  }
  assert.equal(engine.snapshot().heldIds.length, engine.spec.hydrogenCount, 'the tray is at its cap');

  const spare = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).state === 'free')!;
  assert.equal(engine.fireWeb(spare), false, 'the pick is refused');
  const reason = engine.snapshot().feedback;
  assert.ok(reason, 'and a reason was recorded');
  assert.match(explainMistake(reason), /already holding a hydrogen|Throw that one/);
});

test('rapid clicking the row never throws and never corrupts the round', () => {
  const engine = readyForHydrogens();
  const row = engine.snapshot().hydrogenRowIds;
  for (let i = 0; i < 60; i++) {
    for (const id of row) engine.fireWeb(id);
    tick(engine, 0.1);
  }
  tick(engine, 6);
  const s = engine.snapshot();
  assert.ok(s.heldIds.length <= s.spec.hydrogenCount, 'the tray never overfills');
  assert.equal(s.molecule.atoms.filter((a) => a.state === 'held').length, s.heldIds.length, 'held atoms and the tray agree');
  assert.notEqual(s.phase, 'SUMMARY', 'the round is still going');
});

test('a wrong-family pick is still allowed, and still explains itself', () => {
  const engine = readyForHydrogens();
  const red = engine.snapshot().hydrogenRowIds.find((id) => famOf(engine, id).family === 'red')!;
  assert.equal(engine.fireWeb(red), true, 'the mistake is not blocked');
  tick(engine, 5, () => engine.snapshot().heldIds.includes(red));
  const reason = engine.snapshot().feedback;
  assert.ok(reason && reason.kind === 'WRONG_HYDROGEN_FAMILY');
});

test('the row sits clear of the carbons it must not be confused with', () => {
  const engine = readyForHydrogens();
  const box = hydrogenRowBox(engine.snapshot().hydrogenRowIds.length);
  const carbons = engine.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free');
  // The carbon bodies clear the row entirely; only their lower bond markers
  // reach into it, and a click there is now read as a pick from the row.
  for (const c of carbons) assert.ok(c.position.y + 41 < box.top, 'no carbon body reaches the row');
  assert.equal(HYDROGEN_ROW.centreY, 604.5, 'the row is where Figma drew it');
});

// ------------------------------------------------- 3: carbon valency

test('the valency lesson answers the question its heading asks', () => {
  assert.match(CARBON_VALENCY_LESSON, /six electrons/);
  assert.match(CARBON_VALENCY_LESSON, /outer shell/);
  assert.match(CARBON_VALENCY_LESSON, /four places to bond/);
  assert.match(CARBON_VALENCY_LESSON, /valency 4/);
  assert.match(CARBON_VALENCY_LESSON, /hydrogens/);
});

test('the lesson agrees with the rule the engine actually applies', () => {
  // Methane 1C/4H, ethane 2C/6H, propane 3C/8H all follow from valency 4.
  for (const [name, c, h] of [['methane', 1, 4], ['ethane', 2, 6], ['propane', 3, 8]] as const) {
    const engine = new GameEngine(ALKANE_CHALLENGES[name]);
    assert.equal(engine.spec.carbonCount, c);
    assert.equal(engine.spec.hydrogenCount, h);
    // 4n - 2 * (chain bonds) is the sentence the card states in words.
    const shared = engine.spec.chainBonds.reduce((sum, o) => sum + o, 0);
    assert.equal(4 * c - 2 * shared, h);
  }
});
