// Attack 1: hostile coordinates and hostile time.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;

function fresh(which: keyof typeof ALKANE_CHALLENGES = 'ethane') {
  const e = new GameEngine(ALKANE_CHALLENGES[which]);
  e.start();
  return e;
}

function report(name: string, e: GameEngine, extra = '') {
  const v = invariants(e);
  console.log(`--- ${name} -> phase=${e.getPhase()} ${extra}`);
  if (v.length) for (const x of v) console.log(`    VIOLATION [${x.rule}] ${x.detail}`);
  else console.log('    invariants OK');
}

// ---- A1.1 throwPaperAt with NaN
{
  const e = fresh();
  const ok = e.throwPaperAt({ x: NaN, y: NaN });
  console.log('throwPaperAt NaN returned', ok);
  for (let i = 0; i < 600; i++) e.tick(step);
  const s = e.snapshot();
  report('NaN paper throw after 10s', e, `paper=${JSON.stringify(s.paper.position)} vel=${JSON.stringify(s.paper.velocity)} mode=${s.paper.mode}`);
}

// ---- A1.2 throwPaperAt Infinity
{
  const e = fresh();
  const ok = e.throwPaperAt({ x: Infinity, y: -Infinity });
  console.log('throwPaperAt Infinity returned', ok);
  for (let i = 0; i < 600; i++) e.tick(step);
  const s = e.snapshot();
  report('Infinity paper throw after 10s', e, `paper=${JSON.stringify(s.paper.position)} vel=${JSON.stringify(s.paper.velocity)}`);
}

// ---- A1.3 throwPaperAt exactly on the paper (zero vector)
{
  const e = fresh();
  const home = e.snapshot().paper.position;
  const ok = e.throwPaperAt({ ...home });
  console.log('throwPaperAt own position returned', ok, '(expected false)');
  report('zero-length paper throw', e);
}

// ---- A1.4 huge coordinates
{
  const e = fresh();
  e.throwPaperAt({ x: 1e9, y: 1e9 });
  for (let i = 0; i < 600; i++) e.tick(step);
  report('1e9 paper throw', e, `throws=${e.snapshot().session.throws}`);
}

// ---- A1.5 hostile tick values
{
  const e = fresh();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 60; i++) e.tick(step);
  const before = e.getPhase();
  e.tick(NaN);
  const afterNaN = e.getPhase();
  // now try to carry on normally
  for (let i = 0; i < 600; i++) e.tick(step);
  console.log(`tick(NaN): phase before=${before} immediately after=${afterNaN} after 10s of good ticks=${e.getPhase()}`);
  console.log(`  timeRemaining=${e.snapshot().timeRemaining}`);
  report('tick(NaN) then 10s of normal ticks', e);
}

// ---- A1.6 negative ticks
{
  const e = fresh();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 10; i++) e.tick(-1000);
  const phaseAfterNeg = e.getPhase();
  for (let i = 0; i < 600; i++) e.tick(step);
  console.log(`tick(-1000) x10: phase=${phaseAfterNeg}; after 10s normal ticks phase=${e.getPhase()} time=${e.snapshot().timeRemaining.toFixed(2)}`);
  report('negative ticks', e);
}

// ---- A1.7 tick(0) and tick(0.0001) storms
{
  const e = fresh();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 100000; i++) e.tick(0);
  console.log('after 100k tick(0):', e.getPhase(), 'time', e.snapshot().timeRemaining);
  for (let i = 0; i < 200000; i++) e.tick(0.0001);
  console.log('after 200k tick(0.0001):', e.getPhase(), 'time', e.snapshot().timeRemaining.toFixed(3));
  report('zero/tiny tick storm', e);
}

// ---- A1.8 huge tick
{
  const e = fresh();
  e.selectCarbonGroup(2);
  e.tick(100000);
  console.log('tick(100000) once:', e.getPhase(), 'time', e.snapshot().timeRemaining.toFixed(3), '(clamped to 250ms)');
  report('tick(100000)', e);
}
