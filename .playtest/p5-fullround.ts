// PLAYTESTER 5 — full round of ethane, timing every gap and counting actions.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { soundForEvent } from '../src/game/audio/eventSounds.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const target = process.argv[2] ?? 'ethane';
const engine = new GameEngine(ALKANE_CHALLENGES[target]);

let simMs = 0;
const log: string[] = [];
const counts: Record<string, number> = {};
const phaseEnter: Record<string, number> = {};
const phaseTime: Record<string, number> = {};
let lastPhase = engine.getPhase();
let lastPhaseAt = 0;

engine.bus.on((e) => {
  counts[e.type] = (counts[e.type] ?? 0) + 1;
  const snd = soundForEvent(e);
  log.push(`${(simMs / 1000).toFixed(2)}s  ${e.type}${snd ? ` [SOUND ${snd}]` : ''}`);
});

// player actions the round demands
let actions = 0;
const act = (label: string, fn: () => void) => {
  actions += 1;
  log.push(`${(simMs / 1000).toFixed(2)}s  >>> PLAYER ACTION ${actions}: ${label}`);
  fn();
};

const tick = () => {
  engine.tick(step);
  simMs += step;
  const p = engine.getPhase();
  if (p !== lastPhase) {
    phaseTime[lastPhase] = (phaseTime[lastPhase] ?? 0) + (simMs - lastPhaseAt);
    log.push(`${(simMs / 1000).toFixed(2)}s  PHASE ${lastPhase} -> ${p}  (${(simMs - lastPhaseAt).toFixed(0)}ms in ${lastPhase})`);
    lastPhase = p;
    lastPhaseAt = simMs;
    phaseEnter[p] = (phaseEnter[p] ?? 0) + 1;
  }
};

const runUntil = (done: () => boolean, maxSec = 20) => {
  const start = simMs;
  for (let i = 0; i < (maxSec * 1000) / step && !done(); i++) tick();
  return simMs - start;
};

engine.start();
lastPhase = engine.getPhase();

// --- CARBON PHASE ---
const correctGroup = ALKANE_CHALLENGES[target].carbonGroups.findIndex(
  (g) => g.length === (target === 'methane' ? 1 : target === 'ethane' ? 2 : 3) && g.every((f) => f === 'blue'),
);
const tCarbonStart = simMs;
act(`throw paper at carbon group ${correctGroup}`, () => engine.selectCarbonGroup(correctGroup));
const flightMs = runUntil(() => engine.getPhase() !== 'PAPER_FLIGHT');
const impactMs = runUntil(() => engine.getPhase() !== 'CARBON_IMPACT');
runUntil(() => engine.getPhase() === 'HYDROGEN_SELECTION' || engine.getPhase() === 'SUMMARY');
const carbonTotal = simMs - tCarbonStart;

console.log(`\n=== DEAD AIR (${target}) ===`);
console.log(`paper flight (player can do NOTHING): ${flightMs.toFixed(0)}ms`);
console.log(`carbon impact/reaction (player can do NOTHING): ${impactMs.toFixed(0)}ms`);
console.log(`total carbon phase from throw to hydrogen selection: ${carbonTotal.toFixed(0)}ms`);

// --- HYDROGEN PHASE: web + throw, one at a time ---
const snap0 = engine.snapshot();
const needed = snap0.spec.hydrogenCount;
const webTimes: number[] = [];
const throwTimes: number[] = [];
let guard = 0;

while (engine.getPhase() !== 'SUMMARY' && guard++ < 200) {
  // wait for the engine to settle back into a phase that accepts input
  runUntil(() => ['HYDROGEN_SELECTION', 'HYDROGEN_COLLECTION', 'THROWING', 'SUMMARY'].includes(engine.getPhase()), 5);
  if (engine.getPhase() === 'SUMMARY') break;
  const s = engine.snapshot();
  if (s.heldIds.length === 0) {
    // pick a correct-family free hydrogen from the row
    const pick = s.hydrogenRowIds
      .map((id) => s.molecule.atoms.find((a) => a.id === id)!)
      .find((a) => a.state === 'free' && a.family === s.spec.family);
    if (!pick) break;
    const t0 = simMs;
    act(`fire web at hydrogen ${pick.id}`, () => engine.fireWeb(pick.id));
    runUntil(() => engine.snapshot().heldIds.length > 0 || !engine.snapshot().web.active);
    webTimes.push(simMs - t0);
    continue;
  }
  // aim at the first free bond slot on a carbon
  const carbons = s.molecule.atoms.filter((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free');
  if (carbons.length === 0) break;
  const c = carbons[0];
  const taken = s.molecule.bonds
    .filter((b) => b.a === c.id || b.b === c.id)
    .map((b) => s.molecule.atoms.find((a) => a.id === (b.a === c.id ? b.b : b.a))!)
    .map((o) => (Math.atan2(o.position.y - c.position.y, o.position.x - c.position.x) * 180) / Math.PI);
  const free = [0, -90, 180, 90].filter((ang) => taken.every((u) => Math.abs(((u - ang + 540) % 360) - 180) > 30));
  const ang = ((free[0] ?? 0) * Math.PI) / 180;
  const aimAt = { x: c.position.x + Math.cos(ang) * DEFAULT_RULES.physics.bondLength, y: c.position.y + Math.sin(ang) * DEFAULT_RULES.physics.bondLength };
  const before = s.molecule.bonds.length;
  const t0 = simMs;
  act(`throw hydrogen at bond slot (${aimAt.x.toFixed(0)},${aimAt.y.toFixed(0)})`, () => engine.throwAt(aimAt));
  runUntil(() => engine.snapshot().flyingId === null, 6);
  throwTimes.push(simMs - t0);
  const after = engine.snapshot().molecule.bonds.length;
  log.push(`${(simMs / 1000).toFixed(2)}s  (bonds ${before} -> ${after})`);
}

phaseTime[lastPhase] = (phaseTime[lastPhase] ?? 0) + (simMs - lastPhaseAt);

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
console.log(`\nweb reel-in waits: n=${webTimes.length} avg ${avg(webTimes).toFixed(0)}ms  min ${Math.min(...webTimes)} max ${Math.max(...webTimes)}`);
console.log(`hydrogen throw flights: n=${throwTimes.length} avg ${avg(throwTimes).toFixed(0)}ms  min ${Math.min(...throwTimes)} max ${Math.max(...throwTimes)}`);
console.log(`total waiting on web+throw: ${(webTimes.concat(throwTimes).reduce((a, b) => a + b, 0) / 1000).toFixed(1)}s`);

console.log(`\n=== ROUND RESULT ===`);
const final = engine.snapshot();
console.log('phase:', engine.getPhase());
console.log('hydrogens needed:', needed);
console.log('PLAYER ACTIONS REQUIRED:', actions);
console.log('sim time used:', (simMs / 1000).toFixed(1), 's of', ALKANE_CHALLENGES[target].timeLimitSeconds, 's');
console.log('time remaining:', final.timeRemaining.toFixed(1));
console.log('score:', final.score);
console.log('summary:', JSON.stringify(final.summary, null, 2));
console.log('\nINSTRUCTION CARD AT END:', JSON.stringify(projectScene(final).panel));

console.log('\n=== EVENT COUNTS (whole round) ===');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`${k.padEnd(30)} ${String(v).padStart(3)}   sound: ${['WEB_STARTED', 'PAPER_THROWN'].includes(k) ? 'YES' : k === 'ATOM_COLLISION' ? 'only if paper+bonded' : 'NO'}`);
}

console.log('\n=== PHASE TIME TOTALS (ms) / times entered ===');
for (const [k, v] of Object.entries(phaseTime).sort((a, b) => b[1] - a[1])) {
  console.log(`${k.padEnd(24)} ${v.toFixed(0).padStart(7)}ms   entered ${phaseEnter[k] ?? 1}x`);
}

if (process.argv.includes('--log')) {
  console.log('\n=== TIMELINE ===');
  console.log(log.join('\n'));
}
