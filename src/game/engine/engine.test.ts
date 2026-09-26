import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkMolecule } from '../chemistry/molecule.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES, type Challenge } from './config.ts';
import { GameEngine } from './engine.ts';
import type { GameEvent, GameEventType } from './events.ts';

/**
 * Gameplay rules, tested without a browser. Every run here is deterministic:
 * the same throws give the same collisions, which is the reason the physics is
 * hand-written and fixed-step.
 */

function started(name: keyof typeof ALKANE_CHALLENGES = 'methane') {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  engine.start();
  return { engine, log, types: () => log.map((e) => e.type) };
}

/** Runs the clock until `done` is true, or the time limit is reached. */
function run(engine: GameEngine, done: () => boolean, maxSeconds = 20): boolean {
  const step = DEFAULT_RULES.physics.stepMs;
  for (let t = 0; t < (maxSeconds * 1000) / step; t++) {
    if (done()) return true;
    engine.tick(step);
  }
  return done();
}

/**
 * The carbon phase: aim the paper at a group, throw it, and let the collision
 * and the reaction play out. The carbons are never thrown.
 */
function throwPaperAtGroup(engine: GameEngine, group: number): boolean {
  if (!engine.selectCarbonGroup(group)) return false;
  // Past the flight, the reaction, and the two teaching beats that are now
  // held on screen after it, back to a phase that accepts input again.
  const playable = ['CARBON_SELECTION', 'HYDROGEN_SELECTION', 'THROWING'];
  return run(engine, () => !engine.isHolding() && playable.includes(engine.getPhase()), 14);
}

/** Webs an atom in and waits for it to arrive. */
function collect(engine: GameEngine, atomId: string): boolean {
  if (!engine.fireWeb(atomId)) return false;
  return run(engine, () => engine.snapshot().heldIds.includes(atomId), 5);
}

function has(log: GameEvent[], type: GameEventType): boolean {
  return log.some((e) => e.type === type);
}

function atomOf(engine: GameEngine, id: string) {
  return engine.snapshot().molecule.atoms.find((a) => a.id === id)!;
}

test('the round starts with an objective the player must read', () => {
  const { engine, types } = started('ethane');
  assert.equal(engine.snapshot().objective, 'Make Ethane');
  assert.equal(engine.getPhase(), 'CARBON_SELECTION');
  assert.ok(types().includes('GAME_STARTED'));
  // The engine knows what ethane needs without being told.
  assert.equal(engine.snapshot().carbonTarget, 2);
  assert.equal(engine.spec.hydrogenCount, 6);
});

test('throwing the paper at the right group is recorded and starts the reaction', () => {
  const { engine, log } = started('ethane');
  // Group 2 is the pair of blues: eth = 2, ane = single = blue.
  assert.ok(engine.selectCarbonGroup(2), 'the paper is thrown');
  assert.equal(engine.getPhase(), 'PAPER_FLIGHT');
  assert.ok(has(log, 'PAPER_THROWN'));
  assert.equal(engine.snapshot().paper.mode, 'THROW');

  run(engine, () => engine.getPhase() === 'CARBON_IMPACT', 6);
  assert.ok(has(log, 'ATOM_SELECTED'));
  assert.equal(engine.snapshot().session.wrongSelections, 0);
});

test('the paper is the projectile: no carbon ever leaves the group by itself', () => {
  const { engine } = started('ethane');
  const ids = engine.snapshot().carbonGroups[2].atomIds;
  engine.selectCarbonGroup(2);
  // While the paper is crossing the table the carbons have not moved.
  const before = ids.map((id) => ({ ...atomOf(engine, id).position }));
  run(engine, () => engine.getPhase() === 'CARBON_IMPACT', 6);
  const atContact = ids.map((id) => ({ ...atomOf(engine, id).position }));
  assert.deepEqual(atContact, before, 'the carbons stay put until they are hit');
  // And no carbon is ever a flying atom.
  assert.equal(engine.snapshot().flyingId, null);
});

test('the paper travels; it does not teleport onto the group', () => {
  const { engine } = started('ethane');
  const start = { ...engine.snapshot().paper.position };
  engine.selectCarbonGroup(2);

  const samples: number[] = [];
  for (let i = 0; i < 40 && engine.getPhase() === 'PAPER_FLIGHT'; i++) {
    engine.tick(DEFAULT_RULES.physics.stepMs);
    const p = engine.snapshot().paper.position;
    samples.push(Math.hypot(p.x - start.x, p.y - start.y));
  }
  assert.ok(samples.length > 6, `the flight lasted ${samples.length} frames`);
  assert.ok(samples[0] < 30, 'it starts near the dock');
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i] >= samples[i - 1] - 0.01, 'the paper only moves forward');
  }
});

test('the paper slows on the final approach', () => {
  const { engine } = started('ethane');
  engine.selectCarbonGroup(2);
  const step = DEFAULT_RULES.physics.stepMs;
  let previous = { ...engine.snapshot().paper.position };
  const speeds: number[] = [];
  while (engine.getPhase() === 'PAPER_FLIGHT') {
    engine.tick(step);
    const now = engine.snapshot().paper.position;
    speeds.push(Math.hypot(now.x - previous.x, now.y - previous.y));
    previous = { ...now };
  }
  const cruise = speeds[Math.floor(speeds.length / 3)];
  const approach = speeds[speeds.length - 2];
  assert.ok(approach < cruise, `approach ${approach.toFixed(2)} should be slower than cruise ${cruise.toFixed(2)}`);
});

test('a wrong group is struck, recorded, and does not bond', () => {
  const { engine, log } = started('ethane');
  throwPaperAtGroup(engine, 1); // blue + two greens: wrong colour and wrong count
  assert.ok(has(log, 'WRONG_ATOM_SELECTED'));
  const collision = log.find((e) => e.type === 'ATOM_COLLISION');
  assert.ok(collision, 'the paper still physically hits it');
  assert.equal(collision.type === 'ATOM_COLLISION' && collision.bonded, false);
  assert.equal(has(log, 'BOND_CREATED'), false);
  assert.equal(engine.snapshot().session.wrongSelections, 1);
  assert.equal(engine.getPhase(), 'CARBON_SELECTION', 'the player can throw again');
});

test('a throw that hits nothing is a miss and the paper comes back', () => {
  const { engine, log } = started('ethane');
  assert.ok(engine.throwPaperAt({ x: 1150, y: 870 }), 'thrown low and wide, under the groups');
  run(engine, () => engine.getPhase() === 'CARBON_SELECTION' && engine.snapshot().paper.mode === 'IDLE', 8);
  assert.ok(has(log, 'THROW_MISSED'));
  assert.equal(has(log, 'ATOM_SELECTED'), false, 'nothing was chosen');
  assert.deepEqual(engine.snapshot().paper.position, { x: 228.5, y: 774 }, 'back on its dock');
});

/** Builds methane's carbon, then returns the engine ready for hydrogens. */
function methaneWithCarbon() {
  const { engine, log } = started('methane');
  const carbon = engine.snapshot().carbonGroups[0].atomIds[0];
  throwPaperAtGroup(engine, 0);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 10);
  return { engine, log, carbon };
}

test('once the carbon is placed the engine works out the hydrogen target', () => {
  const { engine, log } = methaneWithCarbon();
  assert.equal(engine.getPhase(), 'HYDROGEN_SELECTION');
  const calculated = log.find((e) => e.type === 'HYDROGEN_TARGET_CALCULATED');
  assert.ok(calculated);
  assert.equal(calculated.hydrogenCount, 4, 'valency, not a lookup table');
  assert.equal(engine.snapshot().hydrogenTarget, 4, 'the target is known as soon as it is calculated');
});

test('choosing a hydrogen family is recorded, right or wrong', () => {
  const { engine, log } = methaneWithCarbon();
  const row = engine.snapshot().hydrogenRowIds;
  const red = row.find((id) => atomOf(engine, id).family === 'red')!;
  collect(engine, red);
  assert.ok(has(log, 'WRONG_ATOM_SELECTED'));
  assert.equal(engine.getPhase(), 'HYDROGEN_COLLECTION', 'the mistake does not stop play');
  assert.equal(engine.snapshot().hydrogenCollected, 0, 'a red hydrogen does not count towards the target');
});

/** Collects `count` blue hydrogens and returns their ids. */
function collectBlueHydrogens(engine: GameEngine, count: number): string[] {
  const row = engine.snapshot().hydrogenRowIds.filter((id) => atomOf(engine, id).family === 'blue');
  const taken: string[] = [];
  for (const id of row.slice(0, count)) {
    assert.ok(collect(engine, id), `collect ${id}`);
    taken.push(id);
  }
  return taken;
}

test('collecting four blue hydrogens satisfies methane and opens throwing', () => {
  const { engine } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  assert.equal(engine.snapshot().hydrogenCollected, 4);
  assert.equal(engine.getPhase(), 'THROWING');
});

/** Throws the loaded atom at the carbon and lets the collision resolve. */
function throwAtCarbon(engine: GameEngine, carbonPos = { x: 592, y: 467 }) {
  run(engine, () => engine.snapshot().paper.loadedAtomId !== null, 3);
  const thrown = engine.snapshot().paper.loadedAtomId;
  if (!thrown) return null;
  engine.throwAt(carbonPos);
  run(engine, () => engine.snapshot().flyingId === null && engine.snapshot().molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0), 10);
  return thrown;
}

test('a hydrogen thrown at the carbon collides and bonds', () => {
  const { engine, log } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  const before = engine.snapshot().session;
  const collisionsBefore = before.successfulCollisions;
  const bondsBefore = before.bondsCreated;
  const thrown = throwAtCarbon(engine);
  assert.ok(thrown);
  assert.ok(has(log, 'ATOM_COLLISION'));
  assert.ok(has(log, 'BOND_CREATED'));
  assert.equal(atomOf(engine, thrown).state, 'bonded');
  assert.equal(engine.snapshot().session.successfulCollisions, collisionsBefore + 1);
  assert.equal(engine.snapshot().session.bondsCreated, bondsBefore + 1);
});

test('a bonded hydrogen settles at a bond length from the carbon', () => {
  const { engine } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  const thrown = throwAtCarbon(engine)!;
  const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state === 'bonded')!;
  const h = atomOf(engine, thrown);
  const gap = Math.hypot(h.position.x - carbon.position.x, h.position.y - carbon.position.y);
  assert.ok(Math.abs(gap - DEFAULT_RULES.physics.bondLength) < 1, `settled at ${gap}`);
});

test('the collision pushes what it hits, the way the throw was aimed', () => {
  const { engine } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  run(engine, () => engine.snapshot().paper.loadedAtomId !== null, 3);
  const carbonBefore = { ...engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state === 'placed')!.position };

  engine.throwAt({ x: carbonBefore.x, y: carbonBefore.y });
  // One step after contact the struck carbon is carrying the throw's motion.
  let pushed = false;
  for (let i = 0; i < 400 && !pushed; i++) {
    engine.tick(DEFAULT_RULES.physics.stepMs);
    const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C')!;
    if (Math.hypot(carbon.velocity.x, carbon.velocity.y) > 0) pushed = true;
  }
  assert.ok(pushed, 'the carbon was pushed by the impact');

  run(engine, () => engine.snapshot().molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0), 10);
  const carbonAfter = engine.snapshot().molecule.atoms.find((a) => a.element === 'C')!.position;
  const travelled = Math.hypot(carbonAfter.x - carbonBefore.x, carbonAfter.y - carbonBefore.y);
  assert.ok(travelled > 0, `the carbon moved ${travelled.toFixed(1)}px along the throw`);
});

test('a throw that leaves the table is a miss, and the atom comes back', () => {
  const { engine, log } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  run(engine, () => engine.snapshot().paper.loadedAtomId !== null, 3);
  const thrown = engine.snapshot().paper.loadedAtomId!;

  engine.throwAt({ x: DEFAULT_RULES.physics.bounds.right + 400, y: 200 });
  run(engine, () => engine.snapshot().session.missedThrows > 0, 10);

  assert.ok(has(log, 'THROW_MISSED'));
  assert.equal(engine.snapshot().session.missedThrows, 1);
  assert.equal(atomOf(engine, thrown).state, 'held', 'it is back in the tray');
  assert.ok(engine.snapshot().heldIds.includes(thrown), 'and can be thrown again');
  assert.notEqual(engine.getPhase(), 'SUMMARY', 'a miss never ends the round');
});

test('a wrong-family hydrogen bounces off instead of bonding', () => {
  const { engine, log } = methaneWithCarbon();
  const row = engine.snapshot().hydrogenRowIds;
  const red = row.find((id) => atomOf(engine, id).family === 'red')!;
  collect(engine, red);
  const thrown = throwAtCarbon(engine);
  assert.equal(thrown, red);
  assert.ok(has(log, 'ATOM_COLLISION'));
  assert.equal(has(log, 'BOND_CREATED'), false, 'the red hydrogen does not bond to a blue carbon');
  assert.equal(engine.snapshot().session.unsuccessfulCollisions >= 1, true);
});

test('methane can be finished, and completion is scored', () => {
  const { engine, log } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  for (let i = 0; i < 4; i++) {
    const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C')!;
    throwAtCarbon(engine, { ...carbon.position });
  }
  // "Complete" is held on screen for a beat before the summary replaces it.
  run(engine, () => engine.getPhase() === 'SUMMARY', 5);
  const snapshot = engine.snapshot();
  assert.equal(checkMolecule(snapshot.molecule, engine.spec).complete, true);
  assert.ok(has(log, 'MOLECULE_COMPLETED'));
  assert.equal(snapshot.session.completionStatus, 'completed');
  assert.ok(snapshot.score > 0);
  assert.equal(snapshot.phase, 'SUMMARY');
});

test('an unfinished molecule is not reported as complete', () => {
  const { engine } = methaneWithCarbon();
  collectBlueHydrogens(engine, 4);
  const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C')!;
  throwAtCarbon(engine, { ...carbon.position });
  const check = checkMolecule(engine.snapshot().molecule, engine.spec);
  assert.equal(check.complete, false);
  assert.equal(check.missingHydrogens, 3);
});

test('time runs out after the configured limit and the round is closed', () => {
  const challenge: Challenge = { ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 2 };
  const engine = new GameEngine(challenge);
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  engine.start();
  engine.selectCarbonGroup(0);

  // The clock stops while a teaching beat is held, so the two-second limit
  // takes longer than two seconds of frames to reach. That is the point of it.
  run(engine, () => engine.getPhase() === 'SUMMARY', 14);
  assert.ok(has(log, 'TIMEOUT'));
  assert.equal(engine.getPhase(), 'SUMMARY');
  assert.equal(engine.snapshot().paper.mode, 'DISABLED');
  assert.equal(engine.snapshot().session.completionStatus, 'timeout');
  // What the player did is kept.
  assert.equal(engine.snapshot().session.carbonSelections.length, 1);
});

test('the timer is configuration, not a number in the engine', () => {
  assert.equal(ALKANE_CHALLENGES.methane.timeLimitSeconds, 120);
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 45 });
  assert.equal(engine.snapshot().timeRemaining, 45);
});

test('no new actions are accepted once time is up', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 1 });
  engine.start();
  engine.selectCarbonGroup(0);
  run(engine, () => engine.getPhase() === 'SUMMARY', 4);
  const carbon = engine.snapshot().carbonGroups[0].atomIds[0];
  assert.equal(engine.fireWeb(carbon), false);
  assert.equal(engine.canThrow(), false);
});

test('the summary explains the mistakes that were made', () => {
  const { engine } = started('ethane');
  throwPaperAtGroup(engine, 0); // wrong group
  engine.finish();
  const summary = engine.snapshot().summary!;
  assert.ok(summary);
  assert.equal(summary.molecule, 'ethane');
  assert.equal(summary.wrongCarbonFamilySelections, 1);
  assert.ok(summary.notes.some((n) => n.toLowerCase().includes('carbon')));
});

test('score events come from config, not from the components', () => {
  const generous = { ...DEFAULT_RULES, scoring: { ...DEFAULT_RULES.scoring, CORRECT_ATOM_SELECTION: 999 } };
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane, generous);
  engine.start();
  throwPaperAtGroup(engine, 2);
  // 999 for the right group, plus the collision and the bond it causes.
  assert.equal(engine.snapshot().score >= 999, true);
  assert.equal(engine.snapshot().session.carbonSelections[0].correct, true);
});

test('ethane: one paper throw makes the carbon-carbon bond', () => {
  const { engine, log } = started('ethane');
  const ids = engine.snapshot().carbonGroups[2].atomIds;
  throwPaperAtGroup(engine, 2);

  const bonds = engine.snapshot().molecule.bonds;
  assert.equal(bonds.length, 1, 'one carbon-carbon bond');
  assert.equal(bonds[0].order, 1, 'single, because ethane is an alkane');
  assert.deepEqual([bonds[0].a, bonds[0].b].sort(), [...ids].sort());
  assert.ok(has(log, 'BOND_CREATED'));
  assert.equal(engine.getPhase(), 'HYDROGEN_SELECTION', 'the hydrogen phase follows');
  assert.equal(engine.spec.hydrogenCount, 6);
});

test('the bond is a consequence of the collision, never before it', () => {
  const { engine } = started('ethane');
  const order: string[] = [];
  engine.bus.on((e) => {
    if (e.type === 'ATOM_COLLISION' || e.type === 'BOND_CREATED') order.push(e.type);
  });
  throwPaperAtGroup(engine, 2);
  assert.deepEqual(order, ['ATOM_COLLISION', 'BOND_CREATED'], 'collision first, then the bond');
});

test('the carbons settle at the spacing the frames draw, as one rigid body', () => {
  const { engine } = started('ethane');
  const ids = engine.snapshot().carbonGroups[2].atomIds;
  throwPaperAtGroup(engine, 2);
  const carbons = ids.map((id) => atomOf(engine, id));
  const gap = Math.abs(carbons[0].position.x - carbons[1].position.x);
  assert.equal(Math.round(gap), DEFAULT_RULES.physics.chainSpacing);
  assert.equal(Math.round(carbons[0].position.y), Math.round(carbons[1].position.y), 'level');
});

test('propane asks for three carbons and eight hydrogens, from the same engine', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.propane);
  engine.start();
  assert.equal(engine.snapshot().objective, 'Make Propane');
  assert.equal(engine.snapshot().carbonTarget, 3);
  assert.equal(engine.spec.hydrogenCount, 8);
  // The propane answer is the three-blue group.
  engine.selectCarbonGroup(2);
  assert.equal(engine.snapshot().session.wrongSelections, 0);
});
