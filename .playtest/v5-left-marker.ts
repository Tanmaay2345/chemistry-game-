// The browser case: c6 top already filled, then aim at c6 left. Miss or bond?
// Traces the flight to show what the atom came near.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const CAPTURE = 23.5 + DEFAULT_RULES.physics.slotCapture;

function ready() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  return e;
}
const fam = (e: GameEngine, id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
function load(e: GameEngine) {
  const blue = e.snapshot().hydrogenRowIds.find((id) => fam(e, id).family === 'blue' && fam(e, id).state === 'free')!;
  e.fireWeb(blue);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 120 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
}
const ANGLE = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

const e = ready();
// 1. fill c6 top, as the browser run did
load(e);
const top = e.bondTargets().find((t) => t.angle === -90)!;
e.throwAt({ ...top.point });
for (let i = 0; i < 700 && e.snapshot().flyingId !== null; i++) e.tick(step);
console.log(`filled ${top.carbonId} ${ANGLE(top.angle)} -> bonds ${e.snapshot().molecule.bonds.length}`);

// 2. now aim at that carbon's left marker
load(e);
const left = e.bondTargets().find((t) => t.carbonId === top.carbonId && t.angle === 180);
console.log('markers now:', e.bondTargets().map((t) => `${t.carbonId}@${ANGLE(t.angle)}`).join(' '));
if (!left) { console.log('no left marker'); process.exit(0); }

const id = e.snapshot().paper.loadedAtomId!;
const before = e.snapshot().molecule.bonds.length;
e.throwAt({ ...left.point });
let closestToAimed = Infinity;
const nearOthers: string[] = [];
for (let i = 0; i < 700 && e.snapshot().flyingId !== null; i++) {
  e.tick(step);
  const a = e.snapshot().molecule.atoms.find((x) => x.id === id)!;
  closestToAimed = Math.min(closestToAimed, Math.hypot(a.position.x - left.point.x, a.position.y - left.point.y));
  for (const t of e.bondTargets()) {
    if (t.carbonId === left.carbonId && t.angle === left.angle) continue;
    const d = Math.hypot(a.position.x - t.point.x, a.position.y - t.point.y);
    if (d <= CAPTURE) nearOthers.push(`${t.carbonId}@${ANGLE(t.angle)} (${d.toFixed(1)}px)`);
  }
}
const after = e.snapshot().molecule.bonds.length;
console.log(`\naimed ${left.carbonId} left -> ${after > before ? 'BONDED' : 'MISS'}`);
console.log(`closest the atom got to the aimed marker: ${closestToAimed.toFixed(1)}px  (needs <= ${CAPTURE})`);
console.log(`other markers it came within catching distance of: ${[...new Set(nearOthers)].join(', ') || 'none'}`);
console.log(`\n=> ${nearOthers.length ? 'the old code would have bonded it to one of those' : 'nothing else could have caught it either - an honest miss'}`);
