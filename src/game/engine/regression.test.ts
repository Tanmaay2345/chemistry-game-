import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseName } from '../chemistry/formula.ts';
import { addBond, checkMolecule, createAtom, emptyMolecule } from '../chemistry/molecule.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';
import type { GameEvent } from './events.ts';

/**
 * The playtest failures, kept failing.
 *
 * Every test here reproduces something five agents found by playing the game
 * (docs/playtest-findings.md) and asserts the behaviour that replaced it. They
 * are written from the player's side - clicks and time - not from the shape of
 * the code, so a refactor cannot quietly make them pass again.
 */

const step = DEFAULT_RULES.physics.stepMs;

function tick(engine: GameEngine, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (until?.()) return;
    engine.tick(step);
  }
}

function familyOf(engine: GameEngine, id: string) {
  return engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family;
}

function stateOf(engine: GameEngine, id: string) {
  return engine.snapshot().molecule.atoms.find((a) => a.id === id)!.state;
}

/** Ethane with its carbon pair built, ready for hydrogens. */
function ethaneWithCarbons() {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  return { engine, log };
}

function collect(engine: GameEngine, id: string) {
  assert.ok(engine.fireWeb(id), `the row offered ${id}`);
  tick(engine, 5, () => engine.snapshot().heldIds.includes(id));
  tick(engine, 1, () => engine.snapshot().paper.loadedAtomId !== null);
}

function throwAndSettle(engine: GameEngine, point: { x: number; y: number }) {
  engine.throwAt(point);
  tick(engine, 10, () => engine.snapshot().flyingId === null && engine.snapshot().molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0));
}

// ------------------------------------------------- 1: the wrong-colour lock

test('a wrong-family hydrogen costs a throw, not the round', () => {
  const { engine } = ethaneWithCarbons();
  const red = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'red')!;
  collect(engine, red);
  const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
  throwAndSettle(engine, { ...carbon.position });

  assert.equal(stateOf(engine, red), 'free', 'the red hydrogen went back to the row');
  assert.equal(engine.snapshot().heldIds.length, 0, 'and not into a tray it can never leave');
  const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue')!;
  assert.ok(engine.fireWeb(blue), 'the row can be picked from again');
});

test('the wrong colour is explained, not just refused', () => {
  const { engine, log } = ethaneWithCarbons();
  const red = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'red')!;
  collect(engine, red);
  const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
  throwAndSettle(engine, { ...carbon.position });

  const explained = log.filter((e) => e.type === 'MISTAKE_EXPLAINED');
  assert.ok(explained.length > 0, 'the engine said why');
  assert.deepEqual(explained[explained.length - 1], {
    type: 'MISTAKE_EXPLAINED',
    reason: { kind: 'WRONG_HYDROGEN_FAMILY', picked: 'red', expected: 'blue' },
  });
});

test('a round spent on wrong-family hydrogens can still be finished', () => {
  const { engine } = ethaneWithCarbons();
  // Three wrong picks first - the sequence that used to make the round
  // unwinnable with nearly two minutes left on the clock.
  for (const wrong of engine.snapshot().hydrogenRowIds.filter((id) => familyOf(engine, id) !== 'blue').slice(0, 3)) {
    collect(engine, wrong);
    const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
    throwAndSettle(engine, { ...carbon.position });
  }
  for (let i = 0; i < 6; i++) {
    const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue' && stateOf(engine, id) === 'free')!;
    collect(engine, blue);
    const target = engine.bondTargets()[0];
    assert.ok(target, 'a free bond is still offered');
    throwAndSettle(engine, { ...target.point });
  }
  tick(engine, 5, () => engine.getPhase() === 'SUMMARY');
  assert.equal(engine.snapshot().session.completionStatus, 'completed');
});

// ------------------------------------------------------------- 2: aiming

test('every free bond marker the game draws can be thrown into', () => {
  const { engine } = ethaneWithCarbons();
  // Fill the left carbon first: the order that used to leave the right one
  // unreachable, because the markers were drawn a bond length out from a
  // carbon whose own edge was the only thing a throw could touch.
  for (let i = 0; i < 3; i++) {
    const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue' && stateOf(engine, id) === 'free')!;
    collect(engine, blue);
    const left = engine.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
    throwAndSettle(engine, { ...left.position });
  }

  const targets = engine.bondTargets();
  assert.equal(targets.length, 3, 'three free bonds left, all on the right carbon');
  for (const target of targets) {
    const probe = new GameEngine(ALKANE_CHALLENGES.ethane);
    // Replay the same board, then throw at this one marker.
    probe.start();
    probe.selectCarbonGroup(2);
    tick(probe, 15, () => probe.getPhase() === 'HYDROGEN_SELECTION');
    for (let i = 0; i < 4; i++) {
      const blue = probe.snapshot().hydrogenRowIds.find((id) => familyOf(probe, id) === 'blue' && stateOf(probe, id) === 'free')!;
      collect(probe, blue);
      if (i < 3) {
        const left = probe.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
        throwAndSettle(probe, { ...left.position });
      }
    }
    const before = probe.snapshot().molecule.bonds.length;
    const aim = probe.bondTargets().find((t) => t.carbonId === target.carbonId && t.angle === target.angle)!;
    throwAndSettle(probe, { ...aim.point });
    const after = probe.snapshot().molecule.bonds;
    assert.equal(after.length, before + 1, `aiming at the ${aim.angle}deg marker bonded`);
    const bond = after[after.length - 1];
    assert.ok(bond.a === aim.carbonId || bond.b === aim.carbonId, 'and bonded to the carbon it belongs to');
    const placed = probe.snapshot().molecule.atoms.find((a) => a.id === (bond.a === aim.carbonId ? bond.b : bond.a))!;
    const off = Math.hypot(placed.position.x - aim.point.x, placed.position.y - aim.point.y);
    assert.ok(off < 12, `and landed in that slot, not another (${off.toFixed(1)}px away)`);
  }
});

test('a hydrogen already bonded on does not shield the bonds behind it', () => {
  const { engine } = ethaneWithCarbons();
  for (let i = 0; i < 3; i++) {
    const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue' && stateOf(engine, id) === 'free')!;
    collect(engine, blue);
    const left = engine.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
    throwAndSettle(engine, { ...left.position });
  }
  const blocked = engine.bondTargets().find((t) => t.angle === -90)!;
  const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue' && stateOf(engine, id) === 'free')!;
  collect(engine, blue);
  const before = engine.snapshot().molecule.bonds.length;
  throwAndSettle(engine, { ...blocked.point });
  assert.equal(engine.snapshot().molecule.bonds.length, before + 1, 'the throw got through');
});

// ------------------------------------------------------ 3: the retry race

/** A wrong throw, then a retry `delayMs` later - the double-click window. */
function retryAfter(delayMs: number) {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  engine.start();
  engine.selectCarbonGroup(0); // blue + red: the wrong pair for ethane
  tick(engine, 6, () => engine.getPhase() === 'CARBON_SELECTION');
  tick(engine, delayMs / 1000);
  const accepted = engine.selectCarbonGroup(2); // the right pair
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  return { engine, log, accepted };
}

test('a retry during the paper’s return is accepted', () => {
  const { accepted } = retryAfter(0);
  assert.equal(accepted, true);
});

test('a retry during the return hits the group it was aimed at', () => {
  const { engine } = retryAfter(0);
  assert.equal(engine.snapshot().molecule.bonds.length, 1, 'the carbon pair bonded');
  const bonded = engine.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free');
  assert.deepEqual(bonded.map((a) => a.family).sort(), ['blue', 'blue'], 'the blue pair, not the group it missed');
});

test('a retry during the return is not recorded as a second wrong answer', () => {
  const { engine } = retryAfter(0);
  assert.equal(engine.snapshot().session.wrongSelections, 1, 'one wrong throw, not two');
});

test('the outcome of a retry does not depend on how fast the player clicked', () => {
  const results = [0, 50, 100, 150, 200, 250, 300, 400].map((ms) => {
    const { engine, accepted } = retryAfter(ms);
    const s = engine.snapshot();
    return `${accepted} ${s.molecule.bonds.length} ${s.session.wrongSelections} ${s.score}`;
  });
  assert.equal(new Set(results).size, 1, `every delay gave the same result, got ${JSON.stringify(results)}`);
});

test('the paper never teleports out from under a throw in flight', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(0);
  tick(engine, 6, () => engine.getPhase() === 'CARBON_SELECTION');
  engine.selectCarbonGroup(2);
  let previous = { ...engine.snapshot().paper.position };
  let jump = 0;
  for (let i = 0; i < 900; i++) {
    engine.tick(step);
    const now = engine.snapshot().paper.position;
    if (engine.getPhase() === 'PAPER_FLIGHT') jump = Math.max(jump, Math.hypot(now.x - previous.x, now.y - previous.y));
    previous = { ...now };
  }
  assert.ok(jump < 40, `the paper moved at most ${jump.toFixed(1)}px in a frame while in flight`);
});

// --------------------------------------------------------------- 4: scoring

test('a round that runs out of time cannot out-score one that finishes', () => {
  // The worst finish: every hydrogen thrown at the molecule until it sticks.
  const finished = new GameEngine(ALKANE_CHALLENGES.ethane);
  finished.start();
  finished.selectCarbonGroup(2);
  tick(finished, 15, () => finished.getPhase() === 'HYDROGEN_SELECTION');
  for (let i = 0; i < 6; i++) {
    const blue = finished.snapshot().hydrogenRowIds.find((id) => familyOf(finished, id) === 'blue' && stateOf(finished, id) === 'free')!;
    collect(finished, blue);
    throwAndSettle(finished, { ...finished.bondTargets()[0].point });
  }
  tick(finished, 5, () => finished.getPhase() === 'SUMMARY');
  assert.equal(finished.snapshot().session.completionStatus, 'completed');

  // The best failure: bounce atoms off the molecule for the whole round.
  const failed = new GameEngine(ALKANE_CHALLENGES.ethane);
  failed.start();
  failed.selectCarbonGroup(2);
  tick(failed, 15, () => failed.getPhase() === 'HYDROGEN_SELECTION');
  for (let i = 0; i < 200 && failed.getPhase() !== 'SUMMARY'; i++) {
    const red = failed.snapshot().hydrogenRowIds.find((id) => familyOf(failed, id) !== 'blue' && stateOf(failed, id) === 'free');
    if (red) collect(failed, red);
    const carbon = failed.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
    throwAndSettle(failed, { ...carbon.position });
  }
  tick(failed, 200, () => failed.getPhase() === 'SUMMARY');
  assert.equal(failed.snapshot().session.completionStatus, 'timeout');
  assert.ok(
    failed.snapshot().score < finished.snapshot().score,
    `a timeout scored ${failed.snapshot().score}, a completion ${finished.snapshot().score}`,
  );
});

test('a contact that forms no bond pays nothing', () => {
  const { engine } = ethaneWithCarbons();
  const red = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'red')!;
  collect(engine, red);
  const before = engine.snapshot().score;
  const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
  throwAndSettle(engine, { ...carbon.position });
  assert.ok(engine.snapshot().score <= before, 'bouncing off the molecule never pays');
});

// ------------------------------------------------- 5: the teaching beats

test('the beats that teach are on screen long enough to read', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  const frames = new Map<string, number>();
  for (let i = 0; i < 1800 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) {
    engine.tick(step);
    frames.set(engine.getPhase(), (frames.get(engine.getPhase()) ?? 0) + 1);
  }
  assert.ok((frames.get('CARBON_STRUCTURE_READY') ?? 0) > 30, 'the built chain is shown');
  assert.ok((frames.get('HYDROGEN_CALCULATION') ?? 0) > 60, 'the hydrogen sum is shown');
});

test('reading a teaching beat is not paid for out of the round clock', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 6, () => engine.getPhase() === 'HYDROGEN_CALCULATION');
  const before = engine.snapshot().timeRemaining;
  tick(engine, 1);
  assert.equal(engine.snapshot().timeRemaining, before, 'the clock stopped while the sum was up');
});

test('a frame with no time in it cannot freeze the game', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.tick(Number.NaN);
  engine.tick(-5000);
  engine.tick(Number.POSITIVE_INFINITY);
  assert.equal(engine.throwPaperAt({ x: 616, y: 582 }), true, 'the game still takes a throw');
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  assert.equal(engine.getPhase(), 'HYDROGEN_SELECTION');
});

test('a throw aimed at nowhere is refused rather than breaking the round', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  assert.equal(engine.throwPaperAt({ x: Number.NaN, y: 400 }), false);
  assert.equal(engine.getPhase(), 'CARBON_SELECTION', 'still playable');
  assert.equal(engine.throwPaperAt({ x: 616, y: 582 }), true);
});

test('the round announces its own end', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 2 });
  const phases: string[] = [];
  engine.bus.on((e) => {
    if (e.type === 'PHASE_CHANGED') phases.push(e.to);
  });
  engine.start();
  tick(engine, 30, () => engine.getPhase() === 'SUMMARY');
  assert.ok(phases.includes('TIMEOUT'), 'time up was announced');
  assert.ok(phases.includes('SUMMARY'), 'and so was the summary');
});

test('a teaching beat can be clicked past rather than waited out', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 6, () => engine.getPhase() === 'HYDROGEN_CALCULATION');
  assert.equal(engine.isHolding(), true, 'the sum is up');
  assert.equal(engine.skipTeachingBeat(), true, 'and the first click ends it');
  assert.equal(engine.isHolding(), false);
  assert.equal(engine.getPhase(), 'HYDROGEN_SELECTION', 'straight on to the row');
  const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue')!;
  assert.equal(engine.fireWeb(blue), true, 'and the next click plays');
});

// ------------------------------------------- 6: what the chemistry gate accepts

test('a molecule with the wrong bond order is not the molecule that was asked for', () => {
  // An ethene built with a single C-C is ethane: same atoms, different
  // compound. The gate used to count bonds and ignore their order.
  const molecule = emptyMolecule();
  const c1 = createAtom('c1', 'C', 'red', { x: 0, y: 0 }, 44);
  const c2 = createAtom('c2', 'C', 'red', { x: 200, y: 0 }, 44);
  molecule.atoms.push(c1, c2);
  addBond(molecule, 'c1', 'c2', 1);
  for (let i = 0; i < 4; i++) {
    const h = createAtom(`h${i}`, 'H', 'red', { x: i * 10, y: 100 }, 23.5);
    molecule.atoms.push(h);
    addBond(molecule, i < 2 ? 'c1' : 'c2', h.id, 1);
  }
  const spec = parseName('ethene')!;
  const check = checkMolecule(molecule, spec);
  assert.equal(check.complete, false, 'a single bond is not a double bond');
  assert.ok(check.wrongOrderBonds.length > 0);
});

test('a chain with bonds still to give is not finished', () => {
  const molecule = emptyMolecule();
  molecule.atoms.push(createAtom('c1', 'C', 'blue', { x: 0, y: 0 }, 44));
  for (let i = 0; i < 3; i++) {
    const h = createAtom(`h${i}`, 'H', 'blue', { x: i * 10, y: 100 }, 23.5);
    molecule.atoms.push(h);
    addBond(molecule, 'c1', h.id, 1);
  }
  const check = checkMolecule(molecule, parseName('methane')!);
  assert.equal(check.complete, false, 'one valency still open');
  assert.equal(check.openValencies, 1);
});

test('the summary names the mistake that was actually made', () => {
  // Right colour, wrong number of carbons: being told about colours would
  // send the player to correct the one thing they got right.
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(3); // three blue carbons: right family, wrong count
  tick(engine, 8, () => engine.getPhase() === 'CARBON_SELECTION');
  engine.finish();
  const notes = engine.snapshot().summary!.notes;
  assert.ok(notes.some((n) => /prefix of the name is the number of carbons/.test(n)), JSON.stringify(notes));
  assert.equal(notes.some((n) => /colour of a carbon set/.test(n)), false, 'and says nothing about colour');
});

test('a throw aimed nowhere near a carbon does not bond to it in passing', () => {
  const { engine } = ethaneWithCarbons();
  const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue')!;
  collect(engine, blue);
  const before = engine.snapshot().molecule.bonds.length;
  // Along the row, well below and past the chain at y 467.
  throwAndSettle(engine, { x: 1200, y: 860 });
  assert.equal(engine.snapshot().molecule.bonds.length, before, 'no free bond caught it on the way');
});

// ------------------------------------- 7: the marker aimed at is the one hit

/** Ethane with the pair built and one blue hydrogen loaded. */
function loadedOnEthane() {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue' && stateOf(engine, id) === 'free')!;
  collect(engine, blue);
  return engine;
}

test('a throw lands in the marker it was aimed at, not one it flew past', () => {
  // Aiming at a carbon's top marker means flying past its left one, which is
  // inside catching distance of the path - it used to take the atom.
  const targets = loadedOnEthane().bondTargets();
  for (const target of targets) {
    const engine = loadedOnEthane();
    const aim = engine.bondTargets().find((t) => t.carbonId === target.carbonId && t.angle === target.angle)!;
    const before = engine.snapshot().molecule.bonds.length;
    throwAndSettle(engine, { ...aim.point });
    const after = engine.snapshot().molecule.bonds;
    assert.equal(after.length, before + 1, `the ${aim.angle}deg marker on ${aim.carbonId} received the throw`);
    const bond = after[after.length - 1];
    const placed = engine.snapshot().molecule.atoms.find((a) => a.id === (bond.a === aim.carbonId ? bond.b : bond.a))!;
    const off = Math.hypot(placed.position.x - aim.point.x, placed.position.y - aim.point.y);
    assert.ok(bond.a === aim.carbonId || bond.b === aim.carbonId, 'and to that carbon');
    assert.ok(off < 12, `and in that slot, ${off.toFixed(1)}px from it`);
  }
});

test('the marker the game rings is the marker the engine will use', () => {
  const engine = loadedOnEthane();
  for (const target of engine.bondTargets()) {
    engine.aim({ ...target.point });
    const ringed = engine.snapshot().aimedTarget;
    assert.ok(ringed, 'a marker is ringed');
    assert.equal(ringed.carbonId, target.carbonId);
    assert.equal(ringed.angle, target.angle);
  }
});

test('aiming away from every marker rings nothing and still lets a throw fly', () => {
  // Skill is still required: pointing at a carbon body or open table does not
  // pick a marker, and the throw lands wherever it physically gets to.
  const engine = loadedOnEthane();
  const carbon = engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
  engine.aim({ ...carbon.position });
  assert.equal(engine.snapshot().aimedTarget, null, 'a carbon body is not a marker');
  engine.aim({ x: 1200, y: 850 });
  assert.equal(engine.snapshot().aimedTarget, null, 'open table is not a marker');
});

test('a throw is not magnetised to the marker from anywhere on the table', () => {
  // The atom still has to reach the slot. Aimed far from it, it misses.
  const engine = loadedOnEthane();
  const before = engine.snapshot().molecule.bonds.length;
  throwAndSettle(engine, { x: 1240, y: 860 });
  assert.equal(engine.snapshot().molecule.bonds.length, before, 'nothing was pulled into a slot');
});

test('every molecule can still be finished with the stricter targeting', () => {
  for (const [molecule, group, bonds] of [['methane', 0, 4], ['ethane', 2, 7], ['propane', 2, 10]] as const) {
    const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
    engine.start();
    engine.selectCarbonGroup(group);
    tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
    for (let n = 0; n < 40 && engine.getPhase() !== 'SUMMARY'; n++) {
      if (!engine.snapshot().paper.loadedAtomId) {
        // Stop asking for more once the molecule has all the hydrogen it needs;
        // the last one is still settling while COMPLETION is held on screen.
        if (engine.snapshot().hydrogenCollected >= engine.spec.hydrogenCount) {
          tick(engine, 5, () => engine.getPhase() === 'SUMMARY');
          break;
        }
        const blue = engine.snapshot().hydrogenRowIds.find((id) => familyOf(engine, id) === 'blue' && stateOf(engine, id) === 'free');
        if (!blue) break;
        collect(engine, blue);
        continue;
      }
      const targets = engine.bondTargets();
      if (!targets.length) break;
      throwAndSettle(engine, { ...targets[0].point });
    }
    tick(engine, 5, () => engine.getPhase() === 'SUMMARY');
    assert.equal(engine.snapshot().session.completionStatus, 'completed', `${molecule} still finishes`);
    assert.equal(engine.snapshot().molecule.bonds.length, bonds);
  }
});
