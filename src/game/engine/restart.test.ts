import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';

/**
 * Playing again starts from nothing.
 *
 * The UI restarts by building a new engine rather than resetting the old one,
 * so what these assert is that a fresh engine really is fresh - every field
 * the checklist names, after a round that touched all of them.
 */

const step = DEFAULT_RULES.physics.stepMs;

function tick(engine: GameEngine, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (until?.()) return;
    engine.tick(step);
  }
}

/** Everything the restart checklist lists, read off a snapshot. */
function stateOf(engine: GameEngine) {
  const s = engine.snapshot();
  return {
    phase: s.phase,
    atomsFree: s.molecule.atoms.filter((a) => a.state === 'free').length,
    atomsPlaced: s.molecule.atoms.filter((a) => a.state !== 'free').length,
    bonds: s.molecule.bonds.length,
    carbonBonds: s.molecule.bonds.filter((b) => {
      const a = s.molecule.atoms.find((x) => x.id === b.a);
      const c = s.molecule.atoms.find((x) => x.id === b.b);
      return a?.element === 'C' && c?.element === 'C';
    }).length,
    chosenGroups: s.carbonGroups.filter((g) => g.chosen).length,
    held: s.heldIds.length,
    loaded: s.paper.loadedAtomId,
    paperMode: s.paper.mode,
    paperPosition: s.paper.position,
    webActive: s.web.active,
    flyingId: s.flyingId,
    impact: s.carbonImpact,
    holding: s.holding,
    feedback: s.feedback,
    time: s.timeRemaining,
    score: s.score,
    completion: s.session.completionStatus,
    wrongSelections: s.session.wrongSelections,
    mistakes: s.session.mistakes,
    throws: s.session.throws,
    bondsCreated: s.session.bondsCreated,
    missedThrows: s.session.missedThrows,
    summary: s.summary,
    hydrogenTarget: s.hydrogenTarget,
    hydrogenCollected: s.hydrogenCollected,
  };
}

const fresh = () => stateOf(new GameEngine(ALKANE_CHALLENGES.ethane));

/** Plays a round to the summary, one way or the other. */
function playOut(finishIt: boolean) {
  const engine = new GameEngine(ALKANE_CHALLENGES[finishIt ? 'ethane' : 'ethane']);
  engine.start();
  engine.selectCarbonGroup(0); // a wrong set first, so mistakes are recorded
  tick(engine, 8, () => engine.getPhase() === 'CARBON_SELECTION');
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  const fam = (id: string) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!;
  if (finishIt) {
    for (let i = 0; i < 6; i++) {
      const blue = engine.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue' && fam(id).state === 'free')!;
      engine.fireWeb(blue);
      tick(engine, 5, () => engine.snapshot().heldIds.includes(blue));
      tick(engine, 1, () => engine.snapshot().paper.loadedAtomId !== null);
      engine.throwAt({ ...engine.bondTargets()[0].point });
      tick(engine, 10, () => engine.snapshot().flyingId === null && engine.snapshot().molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0));
    }
    tick(engine, 5, () => engine.getPhase() === 'SUMMARY');
  } else {
    tick(engine, 200, () => engine.getPhase() === 'SUMMARY');
  }
  return engine;
}

test('a finished round leaves the engine at the summary with everything recorded', () => {
  const engine = playOut(true);
  const after = stateOf(engine);
  assert.equal(after.phase, 'SUMMARY');
  assert.equal(after.completion, 'completed');
  assert.equal(after.bonds, 7);
  assert.ok(after.score > 0);
  assert.ok(after.summary);
});

test('play again after completing starts from nothing', () => {
  playOut(true);
  // The UI rebuilds the engine; this is what the player then gets.
  assert.deepEqual(fresh(), {
    phase: 'INTRO_OBJECTIVE',
    atomsFree: 23,
    atomsPlaced: 0,
    bonds: 0,
    carbonBonds: 0,
    chosenGroups: 0,
    held: 0,
    loaded: null,
    paperMode: 'IDLE',
    paperPosition: { x: 228.5, y: 774 },
    webActive: false,
    flyingId: null,
    impact: null,
    holding: false,
    feedback: null,
    time: 120,
    score: 0,
    completion: 'in-progress',
    wrongSelections: 0,
    mistakes: { WRONG_CARBON_FAMILY: 0, WRONG_CARBON_COUNT: 0, WRONG_HYDROGEN_FAMILY: 0, NO_FREE_BOND: 0, TRAY_FULL: 0, THROW_MISSED: 0 },
    throws: 0,
    bondsCreated: 0,
    missedThrows: 0,
    summary: null,
    hydrogenTarget: null,
    hydrogenCollected: 0,
  });
});

test('play again after a timeout starts from the same nothing', () => {
  const timedOut = playOut(false);
  assert.equal(stateOf(timedOut).completion, 'timeout');
  assert.deepEqual(fresh(), stateOf(new GameEngine(ALKANE_CHALLENGES.ethane)));
});

test('a restarted round is playable, and scores on its own merits', () => {
  playOut(false); // a round that ran out of time
  const again = playOut(true); // then a clean one
  const s = again.snapshot();
  assert.equal(s.session.completionStatus, 'completed');
  assert.equal(s.molecule.bonds.length, 7);
  assert.ok(s.timeRemaining > 60, 'the clock was its own, not the last round’s');
  assert.equal(s.session.mistakes.WRONG_CARBON_FAMILY, 1, 'only this round’s mistake');
});

test('two engines never share anything', () => {
  const a = new GameEngine(ALKANE_CHALLENGES.ethane);
  const b = new GameEngine(ALKANE_CHALLENGES.ethane);
  a.start();
  a.selectCarbonGroup(2);
  tick(a, 15, () => a.getPhase() === 'HYDROGEN_SELECTION');
  assert.equal(b.getPhase(), 'INTRO_OBJECTIVE');
  assert.equal(b.snapshot().molecule.bonds.length, 0);
  assert.equal(b.snapshot().score, 0);
  assert.notEqual(a.snapshot().molecule, b.snapshot().molecule);
});

test('a round ended while it was still being played is recorded as out of time', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  engine.finish();
  assert.equal(engine.getPhase(), 'SUMMARY');
  assert.equal(engine.snapshot().session.completionStatus, 'timeout', 'not left as "in-progress"');
  assert.equal(engine.snapshot().summary!.completion, 'timeout');
});

test('a round that really ran out of time still records it once', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 2 });
  const timeouts: string[] = [];
  engine.bus.on((e) => {
    if (e.type === 'TIMEOUT') timeouts.push(e.molecule);
  });
  engine.start();
  tick(engine, 30, () => engine.getPhase() === 'SUMMARY');
  assert.equal(timeouts.length, 1, 'one timeout, not two');
  assert.equal(engine.snapshot().session.completionStatus, 'timeout');
});
