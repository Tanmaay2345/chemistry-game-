// Attack 3: out-of-phase actions, rapid input, paper-mode races.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;
const fresh = (m = 'ethane') => { const e = new GameEngine(ALKANE_CHALLENGES[m]); e.start(); return e; };
const log = (e: GameEngine) => { const l: GameEvent[] = []; e.bus.on((x) => l.push(x)); return l; };
const show = (name: string, e: GameEngine, extra = '') => {
  const v = invariants(e);
  console.log(`  ${name}: phase=${e.getPhase()} ${extra}`);
  for (const x of v) console.log(`    !! [${x.rule}] ${x.detail}`);
};

console.log('=== A3.1 start() twice, and start() after play began ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const l = log(e);
  e.start(); e.start(); e.start();
  console.log('  GAME_STARTED emitted', l.filter((x) => x.type === 'GAME_STARTED').length, 'times (expected 1)');
  e.selectCarbonGroup(2);
  e.start();
  console.log('  after mid-game start(): phase =', e.getPhase(), 'GAME_STARTED count =', l.filter((x) => x.type === 'GAME_STARTED').length);
}

console.log('=== A3.2 selectCarbonGroup spam: 100 calls in one tick ===');
{
  const e = fresh();
  const l = log(e);
  let accepted = 0;
  for (let i = 0; i < 100; i++) if (e.selectCarbonGroup(i % 4)) accepted++;
  console.log('  accepted', accepted, 'of 100 (expected 1)');
  console.log('  PAPER_THROWN events:', l.filter((x) => x.type === 'PAPER_THROWN').length, ' session.throws:', e.snapshot().session.throws);
  for (let i = 0; i < 600; i++) e.tick(step);
  show('after settle', e, `bonds=${e.snapshot().molecule.bonds.length}`);
}

console.log('=== A3.3 selectCarbonGroup DURING carbon impact ===');
{
  const e = fresh();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'CARBON_IMPACT') e.tick(step);
  const ok = e.selectCarbonGroup(3);
  console.log('  selectCarbonGroup during CARBON_IMPACT ->', ok, '(expected false)');
  for (let i = 0; i < 600; i++) e.tick(step);
  show('after settle', e, `bonds=${e.snapshot().molecule.bonds.length} groupsChosen=${e.snapshot().carbonGroups.filter((g) => g.chosen).length}`);
}

console.log('=== A3.4 RE-THROW during the 300ms paper return after a WRONG group ===');
{
  const e = fresh();
  const l = log(e);
  e.selectCarbonGroup(0); // blue+red: wrong
  while (e.getPhase() !== 'CARBON_SELECTION') e.tick(step);
  const s0 = e.snapshot();
  console.log('  after wrong strike: paper.mode =', s0.paper.mode, 'paper.position =', JSON.stringify(s0.paper.position), 'phase =', e.getPhase());
  // A real player clicks again immediately. The paper is still RETURNING.
  const ok = e.selectCarbonGroup(2);
  const s1 = e.snapshot();
  console.log('  immediate re-throw accepted =', ok, ' -> phase =', e.getPhase(), ' paper.mode =', s1.paper.mode, '(expected THROW)');
  const positions: string[] = [];
  for (let i = 0; i < 40; i++) {
    e.tick(step);
    positions.push(`${e.getPhase()}/${e.snapshot().paper.mode}@${e.snapshot().paper.position.x.toFixed(0)},${e.snapshot().paper.position.y.toFixed(0)}`);
  }
  console.log('  first 40 frames:', positions.filter((_, i) => i % 5 === 0).join('  '));
  for (let i = 0; i < 900; i++) e.tick(step);
  show('after 15s', e, `bonds=${e.snapshot().molecule.bonds.length} mode=${e.snapshot().paper.mode}`);
  console.log('  events:', l.map((x) => x.type).join(','));
}

console.log('=== A3.5 fireWeb spam on the same atom ===');
{
  const e = fresh();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  const h = e.snapshot().hydrogenRowIds[0];
  const l = log(e);
  let ok = 0;
  for (let i = 0; i < 50; i++) if (e.fireWeb(h)) ok++;
  console.log('  fireWeb x50 on the same atom accepted', ok, '(expected 1)');
  console.log('  WEB_STARTED events:', l.filter((x) => x.type === 'WEB_STARTED').length);
  for (let i = 0; i < 120; i++) { e.tick(step); for (let j = 0; j < 5; j++) e.fireWeb(h); }
  console.log('  ATOM_COLLECTED events:', l.filter((x) => x.type === 'ATOM_COLLECTED').length, '(expected 1)');
  show('after collect', e, `held=${JSON.stringify(e.snapshot().heldIds)}`);
}

console.log('=== A3.6 throwAt 50x in a row, and while already flying ===');
{
  const e = fresh();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  const ids = e.snapshot().hydrogenRowIds;
  // collect two blues
  for (const id of [ids[0], ids[1]]) { e.fireWeb(id); for (let i = 0; i < 120; i++) e.tick(step); }
  console.log('  held =', JSON.stringify(e.snapshot().heldIds), 'loaded =', e.snapshot().paper.loadedAtomId);
  const l = log(e);
  let ok = 0;
  for (let i = 0; i < 50; i++) if (e.throwAt({ x: 592, y: 467 })) ok++;
  console.log('  throwAt x50 accepted', ok, '(expected 1)  PAPER_THROWN =', l.filter((x) => x.type === 'PAPER_THROWN').length);
  show('immediately after', e, `flying=${e.snapshot().flyingId} held=${JSON.stringify(e.snapshot().heldIds)}`);
  for (let i = 0; i < 600; i++) { e.tick(step); e.throwAt({ x: 700, y: 400 }); }
  show('after 10s of throwAt spam', e, `bonds=${e.snapshot().molecule.bonds.length} held=${JSON.stringify(e.snapshot().heldIds)}`);
}

console.log('=== A3.7 finish() then keep playing ===');
{
  const e = fresh();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 60; i++) e.tick(step);
  const l = log(e);
  e.finish();
  const after = e.getPhase();
  const r = {
    start: e.start(),
    throwPaper: e.throwPaperAt({ x: 500, y: 500 }),
    select: e.selectCarbonGroup(1),
    web: e.fireWeb(e.snapshot().hydrogenRowIds[0]),
    throwAt: e.throwAt({ x: 500, y: 500 }),
    canThrow: e.canThrow(),
  };
  for (let i = 0; i < 600; i++) e.tick(step);
  console.log('  phase after finish() =', after, '-> after 10s =', e.getPhase());
  console.log('  post-finish action results:', JSON.stringify(r));
  console.log('  events after finish:', l.map((x) => x.type).join(',') || '(none)');
  show('post-finish', e, `summary=${e.snapshot().summary ? 'set' : 'null'}`);
  e.finish(); e.finish();
  console.log('  finish() x3 total, phase =', e.getPhase(), 'completion =', e.snapshot().session.completionStatus);
}

console.log('=== A3.8 finish() before start() ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const l = log(e);
  e.finish();
  console.log('  phase =', e.getPhase(), '(jumped INTRO_OBJECTIVE -> SUMMARY)');
  console.log('  PHASE_CHANGED events emitted:', l.filter((x) => x.type === 'PHASE_CHANGED').length, '(expected >=1 for a phase change)');
  console.log('  all events:', l.map((x) => x.type).join(',') || '(none)');
  console.log('  start() after finish ->', e.start(), 'phase', e.getPhase());
}
