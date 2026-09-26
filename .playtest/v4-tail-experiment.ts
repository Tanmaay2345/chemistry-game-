// Does the long tail of a throw carry any outcome, or is it just a crawl?
// Sweep aim points; for each, record when the atom bonded (if it did) and how
// long it kept moving afterwards.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;

function ready() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
  const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue')!;
  e.fireWeb(blue);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 60 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
  return e;
}

/** Frame at which the throw bonded, and the frame it finally came to rest. */
function run(aim: { x: number; y: number }) {
  const e = ready();
  const id = e.snapshot().paper.loadedAtomId!;
  const before = e.snapshot().molecule.bonds.length;
  if (!e.throwAt(aim)) return null;
  let bondedAt = -1;
  let restAt = -1;
  let speedAtBond = 0;
  for (let f = 1; f <= 1200; f++) {
    e.tick(step);
    const s = e.snapshot();
    if (bondedAt < 0 && s.molecule.bonds.length > before) {
      bondedAt = f;
      const a = s.molecule.atoms.find((x) => x.id === id)!;
      speedAtBond = Math.hypot(a.velocity.x, a.velocity.y);
    }
    if (s.flyingId === null && s.molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0)) {
      restAt = f;
      break;
    }
  }
  return { bonded: bondedAt >= 0, bondedAt, restAt, speedAtBond };
}

let bonded = 0;
let missed = 0;
let latestBond = 0;
let worstMiss = 0;
const lateBonds: string[] = [];
const slowMisses: string[] = [];

for (let x = 170; x <= 1280; x += 55) {
  for (let y = 170; y <= 880; y += 55) {
    const r = run({ x, y });
    if (!r) continue;
    if (r.bonded) {
      bonded++;
      latestBond = Math.max(latestBond, r.bondedAt);
      if (r.bondedAt > 90) lateBonds.push(`${x},${y} bonded at frame ${r.bondedAt} (${(r.bondedAt / 60).toFixed(2)}s, speed ${r.speedAtBond.toFixed(0)})`);
    } else {
      missed++;
      worstMiss = Math.max(worstMiss, r.restAt);
      if (r.restAt > 120) slowMisses.push(`${x},${y} rested at frame ${r.restAt} (${(r.restAt / 60).toFixed(2)}s)`);
    }
  }
}

console.log(`throws: ${bonded + missed}   bonded: ${bonded}   missed: ${missed}`);
console.log(`\nLATEST a throw ever bonded: frame ${latestBond} (${(latestBond / 60).toFixed(2)}s)`);
console.log(`bonds later than 1.5s: ${lateBonds.length}`);
for (const l of lateBonds.slice(0, 12)) console.log('   ' + l);
console.log(`\nWORST miss: frame ${worstMiss} (${(worstMiss / 60).toFixed(2)}s)`);
console.log(`misses that took longer than 2s to come to rest: ${slowMisses.length}`);
for (const l of slowMisses.slice(0, 8)) console.log('   ' + l);
