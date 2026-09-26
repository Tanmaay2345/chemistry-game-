// The live case: c6 has H on top and left; aim at its remaining bottom marker.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
const step = DEFAULT_RULES.physics.stepMs;
const CAP = 23.5 + DEFAULT_RULES.physics.slotCapture;
const A = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

function ready() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start(); e.selectCarbonGroup(2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  return e;
}
const fam = (e: GameEngine, id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
function load(e: GameEngine) {
  const b = e.snapshot().hydrogenRowIds.find((id) => fam(e, id).family === 'blue' && fam(e, id).state === 'free')!;
  e.fireWeb(b);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 120 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
}
function shoot(e: GameEngine, p: { x: number; y: number }) {
  const before = e.snapshot().molecule.bonds.length;
  e.throwAt(p);
  for (let i = 0; i < 800 && e.snapshot().flyingId !== null; i++) e.tick(step);
  return e.snapshot().molecule.bonds.length > before;
}

const e = ready();
// left carbon: fill top, then left
for (const ang of [-90, 180]) {
  load(e);
  const left = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
  const t = e.bondTargets().find((x) => x.carbonId === left.id && x.angle === ang)!;
  console.log(`fill ${t.carbonId} ${A(ang)} -> ${shoot(e, { ...t.point }) ? 'bonded' : 'MISS'}`);
}
console.log('markers now:', e.bondTargets().map((t) => `${t.carbonId}@${A(t.angle)} (${t.point.x.toFixed(0)},${t.point.y.toFixed(0)})`).join('  '));

// now the bottom marker on that carbon, five times
const leftC = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
for (let n = 0; n < 5; n++) {
  load(e);
  const t = e.bondTargets().find((x) => x.carbonId === leftC.id && x.angle === 90);
  if (!t) { console.log('bottom marker gone'); break; }
  const id = e.snapshot().paper.loadedAtomId!;
  const before = e.snapshot().molecule.bonds.length;
  e.throwAt({ ...t.point });
  let closest = Infinity; let struck = '';
  for (let i = 0; i < 800 && e.snapshot().flyingId !== null; i++) {
    e.tick(step);
    const a = e.snapshot().molecule.atoms.find((x) => x.id === id)!;
    closest = Math.min(closest, Math.hypot(a.position.x - t.point.x, a.position.y - t.point.y));
  }
  const ok = e.snapshot().molecule.bonds.length > before;
  console.log(`  throw ${n + 1} at ${t.carbonId} bottom -> ${ok ? 'BONDED' : 'MISS'}   closest approach ${closest.toFixed(1)}px (capture ${CAP})${struck}`);
}
