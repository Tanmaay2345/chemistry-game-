import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';
import type { GameEvent } from './events.ts';
import { projectScene } from '../../screens/gameplay/live/projectScene.ts';

/**
 * The three feedback rules: a miss that ends promptly, one clock warning per
 * round, and a round that only advances when it is being watched.
 */

const step = DEFAULT_RULES.physics.stepMs;

function tick(engine: GameEngine, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (until?.()) return;
    engine.tick(step);
  }
}

/** Ethane with one blue hydrogen collected and loaded, ready to throw. */
function loaded() {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  const fam = (id: string) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!;
  const blue = engine.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue')!;
  engine.fireWeb(blue);
  tick(engine, 5, () => engine.snapshot().heldIds.includes(blue));
  tick(engine, 2, () => engine.snapshot().paper.loadedAtomId !== null);
  return engine;
}

/** Throws and counts the frames until the player may act again. */
function throwAndTime(engine: GameEngine, aim: { x: number; y: number }) {
  const before = engine.snapshot().molecule.bonds.length;
  assert.ok(engine.throwAt(aim), 'the throw was accepted');
  let frames = 0;
  while (frames < 1200 && engine.snapshot().flyingId !== null) {
    engine.tick(step);
    frames++;
  }
  return { seconds: frames / 60, bonded: engine.snapshot().molecule.bonds.length > before };
}

// ------------------------------------------------------------- 1: the miss

test('a throw that is going nowhere gives the table back inside the ceiling', () => {
  // Aimed just past the paper and below the chain: the two slowest throws
  // there are, which used to creep for 2.7s and 3.7s.
  for (const aim of [{ x: 330, y: 700 }, { x: 600, y: 700 }, { x: 225, y: 445 }]) {
    const engine = loaded();
    const { seconds, bonded } = throwAndTime(engine, aim);
    assert.equal(bonded, false, `(${aim.x},${aim.y}) missed`);
    assert.ok(seconds <= DEFAULT_RULES.physics.maxFlightMs / 1000 + 0.05, `(${aim.x},${aim.y}) took ${seconds.toFixed(2)}s`);
  }
});

test('the ceiling never cuts a throw that was still going somewhere', () => {
  // Every free bond, thrown at directly: all bond, and all well inside it.
  const engine = loaded();
  for (const target of engine.bondTargets()) {
    const probe = loaded();
    const { seconds, bonded } = throwAndTime(probe, { ...target.point });
    assert.equal(bonded, true, `the ${target.angle}deg marker still bonds`);
    assert.ok(seconds < DEFAULT_RULES.physics.maxFlightMs / 1000, `and in ${seconds.toFixed(2)}s`);
  }
});

test('a miss says what happened and hands the atom back', () => {
  const engine = loaded();
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  throwAndTime(engine, { x: 600, y: 700 });
  assert.ok(log.some((e) => e.type === 'THROW_MISSED'), 'recorded as a miss');
  assert.ok(log.some((e) => e.type === 'MISTAKE_EXPLAINED'), 'and explained');
  assert.ok(projectScene(engine.snapshot()).panel.note, 'the card carries the explanation');
  assert.equal(engine.canThrow(), true, 'and the player can throw again');
});

test('a throw in the air says so, so a slow one does not read as a freeze', () => {
  const engine = loaded();
  engine.throwAt({ x: 600, y: 700 });
  engine.tick(step);
  assert.match(projectScene(engine.snapshot()).panel.body, /in the air/);
  tick(engine, 4, () => engine.snapshot().flyingId === null);
  assert.equal(/in the air/.test(projectScene(engine.snapshot()).panel.body), false, 'and stops saying so once it lands');
});

test('misses in a row each resolve on their own, with no build-up', () => {
  const engine = loaded();
  const times: number[] = [];
  for (let i = 0; i < 4; i++) {
    tick(engine, 2, () => engine.snapshot().paper.loadedAtomId !== null);
    if (!engine.snapshot().paper.loadedAtomId) break;
    times.push(throwAndTime(engine, { x: 600, y: 700 }).seconds);
  }
  assert.ok(times.length >= 1);
  for (const t of times) assert.ok(t <= 2.05, `each miss took ${t.toFixed(2)}s`);
});

// ---------------------------------------------------------- 2: the warning

test('the clock warns once, at the mark, and never again', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 25 });
  const warnings: number[] = [];
  engine.bus.on((e) => {
    if (e.type === 'TIME_WARNING') warnings.push(engine.snapshot().timeRemaining);
  });
  engine.start();
  tick(engine, 40, () => engine.getPhase() === 'SUMMARY');
  assert.equal(warnings.length, 1, 'exactly one warning');
  assert.ok(Math.abs(warnings[0] - DEFAULT_RULES.timer.warnAtSeconds) < 0.05, `at ${warnings[0].toFixed(2)}s left`);
});

test('the warning is on the card, then gets out of the way', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 25 });
  engine.start();
  tick(engine, 10, () => engine.snapshot().timeWarning !== null);
  assert.equal(projectScene(engine.snapshot()).panel.note, '20 seconds left.');
  tick(engine, DEFAULT_RULES.timer.noticeMs / 1000 + 0.5);
  assert.equal(engine.snapshot().timeWarning, null);
  assert.notEqual(projectScene(engine.snapshot()).panel.note, '20 seconds left.');
});

test('the warning does not stop the clock, the round or the player', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 25 });
  engine.start();
  tick(engine, 10, () => engine.snapshot().timeWarning !== null);
  const at = engine.snapshot().timeRemaining;
  assert.equal(engine.getPhase(), 'CARBON_SELECTION', 'play carries on');
  assert.equal(engine.selectCarbonGroup(2), true, 'and input is taken');
  tick(engine, 1);
  assert.ok(engine.snapshot().timeRemaining < at, 'the clock kept running');
});

test('time still runs out after the warning', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 22 });
  const seen: string[] = [];
  engine.bus.on((e) => {
    if (e.type === 'TIME_WARNING' || e.type === 'TIMEOUT') seen.push(e.type);
  });
  engine.start();
  tick(engine, 40, () => engine.getPhase() === 'SUMMARY');
  assert.deepEqual(seen, ['TIME_WARNING', 'TIMEOUT']);
});

test('a round finished before the mark is never warned', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const warnings: GameEvent[] = [];
  engine.bus.on((e) => {
    if (e.type === 'TIME_WARNING') warnings.push(e);
  });
  engine.start();
  engine.selectCarbonGroup(2);
  tick(engine, 15, () => engine.getPhase() === 'HYDROGEN_SELECTION');
  const fam = (id: string) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!;
  for (let i = 0; i < 6; i++) {
    const blue = engine.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue' && fam(id).state === 'free')!;
    engine.fireWeb(blue);
    tick(engine, 5, () => engine.snapshot().heldIds.includes(blue));
    tick(engine, 2, () => engine.snapshot().paper.loadedAtomId !== null);
    engine.throwAt({ ...engine.bondTargets()[0].point });
    tick(engine, 10, () => engine.snapshot().flyingId === null);
  }
  tick(engine, 5, () => engine.getPhase() === 'SUMMARY');
  assert.equal(engine.snapshot().session.completionStatus, 'completed');
  assert.ok(engine.snapshot().timeRemaining > DEFAULT_RULES.timer.warnAtSeconds, 'finished with time to spare');

  // And the clock does not keep counting once the round is over.
  tick(engine, 120);
  assert.equal(warnings.length, 0, 'a finished round is never warned');
});

test('restarting clears the warning with everything else', () => {
  const warmed = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 25 });
  warmed.start();
  tick(warmed, 10, () => warmed.snapshot().timeWarning !== null);
  assert.notEqual(warmed.snapshot().timeWarning, null);

  // Restarting builds a new engine; this is what the player then gets.
  const fresh = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 25 });
  assert.equal(fresh.snapshot().timeWarning, null);
  const warnings: GameEvent[] = [];
  fresh.bus.on((e) => {
    if (e.type === 'TIME_WARNING') warnings.push(e);
  });
  fresh.start();
  tick(fresh, 10, () => fresh.snapshot().timeWarning !== null);
  assert.equal(warnings.length, 1, 'the new round gets its own single warning');
});

// ------------------------------------------------------------- 3: pausing

test('an engine that is not ticked loses no time and no state', () => {
  // What a hidden tab does: the loop stops calling tick. Nothing may drift.
  const engine = loaded();
  engine.throwAt({ x: 600, y: 700 });
  tick(engine, 0.3);
  const before = JSON.stringify(engine.snapshot());
  // ... the tab is away ...
  const after = JSON.stringify(engine.snapshot());
  assert.equal(after, before, 'nothing moved, nothing expired');
  // ... and it comes back mid-flight, still in a valid state.
  assert.equal(engine.snapshot().flyingId !== null, true);
  tick(engine, 4, () => engine.snapshot().flyingId === null);
  assert.equal(engine.getPhase() === 'SUMMARY', false, 'the round survived being paused mid-throw');
  assert.equal(engine.canThrow(), true);
});

test('a frame carrying the whole time a tab was away is refused', () => {
  // The loop resets its clock on the way back; this is the belt and braces.
  const engine = loaded();
  const before = engine.snapshot().timeRemaining;
  engine.tick(Number.NaN);
  engine.tick(-90_000);
  assert.equal(engine.snapshot().timeRemaining, before, 'no time passed');
  engine.tick(step);
  assert.ok(engine.snapshot().timeRemaining < before, 'and the next real frame still counts');
});
