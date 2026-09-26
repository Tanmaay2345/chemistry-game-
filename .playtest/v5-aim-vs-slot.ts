// REPRO: does the throw land in the marker the ring is on?
// Aims at each free bond marker in turn and reports which slot received the atom.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const PAPER = { x: 228.5, y: 774 };

function ready(molecule = 'ethane') {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  e.start();
  e.selectCarbonGroup(molecule === 'propane' ? 2 : 2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
  const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue' && fam(id).state === 'free')!;
  e.fireWeb(blue);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 90 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
  return e;
}

/** Perpendicular distance from the straight flight path to a point. */
function distanceToPath(from: { x: number; y: number }, to: { x: number; y: number }, p: { x: number; y: number }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.max(0, ((p.x - from.x) * dx + (p.y - from.y) * dy) / (len * len));
  const cx = from.x + dx * t, cy = from.y + dy * t;
  return Math.hypot(p.x - cx, p.y - cy);
}

const ANGLE = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

console.log(`capture radius = hydrogen radius 23.5 + slotCapture ${DEFAULT_RULES.physics.slotCapture} = ${23.5 + DEFAULT_RULES.physics.slotCapture}px\n`);

for (const molecule of ['ethane', 'propane']) {
  const probe = ready(molecule);
  const targets = probe.bondTargets();
  console.log(`=== ${molecule}: ${targets.length} free bond markers ===`);
  let right = 0;
  for (const target of targets) {
    const e = ready(molecule);
    const aim = { ...target.point };
    const before = e.snapshot().molecule.bonds.length;
    // Which other markers lie on the flight path, and how near?
    const rivals = e
      .bondTargets()
      .filter((t) => t.carbonId !== target.carbonId || t.angle !== target.angle)
      .map((t) => ({ t, d: distanceToPath(PAPER, aim, t.point) }))
      .filter((r) => r.d < 60)
      .sort((a, b) => a.d - b.d);

    e.throwAt(aim);
    for (let i = 0; i < 700 && e.snapshot().flyingId !== null; i++) e.tick(step);
    const after = e.snapshot().molecule.bonds;
    if (after.length === before) {
      console.log(`  aim ${target.carbonId} ${ANGLE(target.angle)}  -> MISS`);
      continue;
    }
    const bond = after[after.length - 1];
    const placed = e.snapshot().molecule.atoms.find((a) => a.id === (bond.a.startsWith('h') ? bond.a : bond.b))!;
    // Which marker did it actually land in?
    const landed = targets.reduce((best, t) =>
      Math.hypot(placed.position.x - t.point.x, placed.position.y - t.point.y) <
      Math.hypot(placed.position.x - best.point.x, placed.position.y - best.point.y) ? t : best, targets[0]);
    const ok = landed.carbonId === target.carbonId && landed.angle === target.angle;
    if (ok) right++;
    console.log(
      `  aim ${target.carbonId} ${ANGLE(target.angle).padEnd(6)} -> landed ${landed.carbonId} ${ANGLE(landed.angle).padEnd(6)} ${ok ? 'OK' : '** WRONG SLOT **'}` +
        (rivals.length ? `   (path passes ${rivals[0].t.carbonId} ${ANGLE(rivals[0].t.angle)} at ${rivals[0].d.toFixed(1)}px)` : ''),
    );
  }
  console.log(`  -> ${right}/${targets.length} landed in the marker aimed at\n`);
}
