// V2 CHECK: does aiming at a visible free-bond marker place the atom there?
// The markers the renderer draws are engine.bondTargets(); if they are real
// targets, aiming at one must bond, and must bond into that slot.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const settle = (e: GameEngine, n = 500) => { for (let i = 0; i < n; i++) e.tick(step); };

function stuckEthane() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 900 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family;
  const blues = e.snapshot().hydrogenRowIds.filter((id) => fam(id) === 'blue');
  for (const id of blues.slice(0, 6)) { e.fireWeb(id); for (let i = 0; i < 300 && e.snapshot().web.active; i++) e.tick(step); }
  // fill the LEFT carbon first - the fill order that used to brick the board
  for (let n = 0; n < 3; n++) {
    const left = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
    e.throwAt({ ...left.position });
    settle(e, 400);
  }
  return e;
}

const probe = stuckEthane();
const targets = probe.bondTargets();
console.log('after filling the left carbon, the game offers', targets.length, 'free bond markers:');
for (const t of targets) console.log(`   ${t.carbonId} at ${t.angle}deg -> (${t.point.x.toFixed(0)}, ${t.point.y.toFixed(0)})`);

let hit = 0;
let inSlot = 0;
for (const target of targets) {
  const e = stuckEthane();
  const before = e.snapshot().molecule.bonds.length;
  e.throwAt({ ...target.point });
  settle(e);
  const after = e.snapshot().molecule.bonds;
  if (after.length <= before) { console.log(`MISS  ${target.carbonId} ${target.angle}deg`); continue; }
  hit++;
  const bond = after[after.length - 1];
  const placed = e.snapshot().molecule.atoms.find((a) => a.id === (bond.a === target.carbonId ? bond.b : bond.a))!;
  const dx = placed.position.x - target.point.x;
  const dy = placed.position.y - target.point.y;
  const off = Math.hypot(dx, dy);
  const right = (bond.a === target.carbonId || bond.b === target.carbonId) && off < 12;
  if (right) inSlot++;
  console.log(`${right ? 'HIT  ' : 'WRONG'} ${target.carbonId} ${target.angle}deg -> landed ${off.toFixed(1)}px from the marker`);
}
console.log(`\nbonded: ${hit}/${targets.length}   landed in the slot aimed at: ${inSlot}/${targets.length}`);
