// Q3: can a student aim at the RIGHT carbon group and be told they are wrong?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom } from '../src/game/chemistry/molecule.ts';
import { PAPER_HOME } from '../src/game/engine/layout.ts';
const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => { for (let i = 0; i < (s*1000)/step && !done(); i++) e.tick(step); };

for (const name of ['ethane','propane','methane']) {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  const spec = engine.spec;
  engine.start();
  const snap = engine.snapshot();
  const right = snap.carbonGroups.findIndex((g) => g.atomIds.length === spec.carbonCount && g.atomIds.every((id) => findAtom(snap.molecule, id)!.family === spec.family));
  const centres = snap.carbonGroups.map((_, i) => engine.groupCentre(i));
  console.log(`\n${name}: paper home (${PAPER_HOME.x},${PAPER_HOME.y}); correct group is #${right}`);
  centres.forEach((c, i) => console.log(`   group #${i} centre (${c.x|0},${c.y|0}) size ${snap.carbonGroups[i].atomIds.length} colours ${snap.carbonGroups[i].atomIds.map((id)=>findAtom(snap.molecule,id)!.family).join('+')}`));
  const events: string[] = [];
  engine.bus.on((e) => { if (e.type === 'ATOM_SELECTED' || e.type === 'WRONG_ATOM_SELECTED') events.push(`${e.type}`); if (e.type === 'ATOM_COLLISION') events.push(`hit ${e.struckId}`); });
  console.log(`   student throws straight at the CORRECT group #${right} ...`);
  engine.selectCarbonGroup(right);
  run(engine, () => engine.getPhase() === 'CARBON_SELECTION' || engine.getPhase() === 'HYDROGEN_SELECTION' || engine.getPhase() === 'CARBON_STRUCTURE_READY', 15);
  console.log(`   -> ${events.join(' | ')}   phase=${engine.getPhase()} score=${engine.snapshot().score}`);
}
