// Attack 6: randomised fuzzer with continuous invariant checking + targeted state probes.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;

// deterministic PRNG so a failure is reproducible
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const MOLECULES = ['methane', 'ethane', 'propane'];
const failures: string[] = [];
let runs = 0, totalSteps = 0;
const phasesSeen = new Set<string>();
const stuckCounts = new Map<string, number>();

for (let seed = 1; seed <= 400; seed++) {
  const r = rng(seed);
  const m = MOLECULES[Math.floor(r() * 3)];
  const e = new GameEngine(ALKANE_CHALLENGES[m]);
  runs++;
  const trace: string[] = [];
  const act = (s: string) => { trace.push(s); if (trace.length > 14) trace.shift(); };
  e.start();
  let lastPhase = e.getPhase();
  let sameFor = 0;
  for (let i = 0; i < 6000; i++) {
    totalSteps++;
    const roll = r();
    const s = e.snapshot();
    const pt = () => ({ x: 100 + r() * 1200, y: 100 + r() * 850 });
    if (roll < 0.06) { const p = pt(); act(`throwPaperAt(${p.x.toFixed(0)},${p.y.toFixed(0)})`); e.throwPaperAt(p); }
    else if (roll < 0.10) { const g = Math.floor(r() * 4); act(`selectCarbonGroup(${g})`); e.selectCarbonGroup(g); }
    else if (roll < 0.16) { const id = s.hydrogenRowIds[Math.floor(r() * s.hydrogenRowIds.length)]; act(`fireWeb(${id})`); e.fireWeb(id); }
    else if (roll < 0.24) { const p = pt(); act(`throwAt(${p.x.toFixed(0)},${p.y.toFixed(0)})`); e.throwAt(p); }
    else if (roll < 0.27) { act('aim'); e.aim(pt()); }
    else if (roll < 0.271) { act('finish()'); e.finish(); }
    e.tick(step);
    phasesSeen.add(e.getPhase());
    const v = invariants(e);
    if (v.length) {
      failures.push(`seed=${seed} mol=${m} step=${i} phase=${e.getPhase()}\n   ${v.map((x) => `[${x.rule}] ${x.detail}`).join('\n   ')}\n   trace: ${trace.join(' ')}`);
      break;
    }
    if (e.getPhase() === lastPhase) sameFor++; else { sameFor = 0; lastPhase = e.getPhase(); }
    if (e.getPhase() === 'SUMMARY') break;
  }
  if (e.getPhase() !== 'SUMMARY') stuckCounts.set(e.getPhase(), (stuckCounts.get(e.getPhase()) ?? 0) + 1);
}

console.log(`fuzz: ${runs} runs, ${totalSteps} steps`);
console.log(`phases reached: ${[...phasesSeen].sort().join(', ')}`);
console.log(`runs not ending in SUMMARY within 100s, by final phase: ${JSON.stringify(Object.fromEntries(stuckCounts))}`);
console.log(`invariant failures: ${failures.length}`);
for (const f of failures.slice(0, 6)) console.log('  ' + f);
