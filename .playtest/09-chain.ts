import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom } from '../src/game/chemistry/molecule.ts';
const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => { for (let i = 0; i < (s*1000)/step && !done(); i++) e.tick(step); };
const engine = new GameEngine(ALKANE_CHALLENGES.propane);
let chainAwardsBonded = 0, chainAwardsUnbonded = 0;
engine.bus.on((e) => { if (e.type === 'ATOM_COLLISION' && e.chainDepth > 1) { e.bonded ? chainAwardsBonded++ : chainAwardsUnbonded++; } });
engine.start();
const g = engine.snapshot().carbonGroups;
const idx = g.findIndex((x) => x.atomIds.length === 3 && x.atomIds.every((id) => findAtom(engine.snapshot().molecule, id)!.family === 'blue'));
engine.selectCarbonGroup(idx);
run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 10);
let guard = 0;
while (engine.getPhase() !== 'SUMMARY' && guard++ < 400) {
  const s = engine.snapshot();
  if (s.heldIds.length === 0) {
    const free = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free' && a.family === 'blue');
    if (!free.length) break;
    engine.fireWeb(free[0].id); run(engine, () => engine.snapshot().heldIds.length > 0, 5); continue;
  }
  const carbons = s.molecule.atoms.filter((a) => a.element === 'C' && a.remainingValency > 0 && (a.state === 'placed' || a.state === 'bonded'));
  if (!carbons.length) break;
  const target = carbons.sort((a, b) => b.remainingValency - a.remainingValency)[0];
  const taken = s.molecule.bonds.filter((b) => b.a === target.id || b.b === target.id)
    .map((b) => findAtom(s.molecule, b.a === target.id ? b.b : b.a)!)
    .map((o) => (Math.atan2(o.position.y - target.position.y, o.position.x - target.position.x) * 180) / Math.PI);
  const freeAngles = [0,-90,180,90].filter((ang) => taken.every((u) => Math.abs((((u-ang)%360)+540)%360-180) > 30));
  const paper = s.paper.position;
  const d = (x: number) => { const p = { x: target.position.x + Math.cos(x*Math.PI/180)*104, y: target.position.y + Math.sin(x*Math.PI/180)*104 }; return Math.hypot(p.x-paper.x, p.y-paper.y); };
  const ang = freeAngles.sort((a,b) => d(a)-d(b))[0] ?? 0;
  const aim = { x: target.position.x + Math.cos(ang*Math.PI/180)*60, y: target.position.y + Math.sin(ang*Math.PI/180)*60 };
  const before = s.molecule.bonds.length;
  if (!engine.throwAt(aim)) { engine.tick(step); continue; }
  run(engine, () => engine.snapshot().molecule.bonds.length > before || engine.getPhase() === 'SUMMARY' || engine.snapshot().flyingId === null, 6);
}
if (engine.getPhase() !== 'SUMMARY') engine.finish();
const sum = engine.snapshot().summary!;
console.log('completion', sum.completion, 'score', sum.score, 'bonds', sum.bondsCreated, 'missed', sum.missedThrows, 'bestChain', sum.bestCollisionChain);
console.log('chain-step awards from BONDING collisions  :', chainAwardsBonded, '=', chainAwardsBonded*75);
console.log('chain-step awards from NON-bonding bounces :', chainAwardsUnbonded, '=', chainAwardsUnbonded*75);
console.log('successfulCollisions', sum.successfulCollisions, 'notes', JSON.stringify(sum.notes));
