// Where does a FAILING propane's score come from, vs a PERFECT methane's?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom } from '../src/game/chemistry/molecule.ts';

const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => {
  for (let i = 0; i < (s * 1000) / step && !done(); i++) e.tick(step);
};
const S = DEFAULT_RULES.scoring;

function play(name: string, greedy: boolean) {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  const tally: Record<string, number> = {};
  const add = (k: string, n = 1) => (tally[k] = (tally[k] ?? 0) + n);
  engine.bus.on((e) => {
    if (e.type === 'ATOM_SELECTED') add('CORRECT_ATOM_SELECTION');
    if (e.type === 'WRONG_ATOM_SELECTED') add('WRONG_ATOM_SELECTION');
    if (e.type === 'ATOM_COLLISION') { if (e.bonded) add('SUCCESSFUL_COLLISION'); if (e.chainDepth > 1) add('COLLISION_CHAIN_STEP'); }
    if (e.type === 'BOND_CREATED') add('BOND_CREATED');
    if (e.type === 'THROW_MISSED') add('MISSED_THROW');
    if (e.type === 'MOLECULE_COMPLETED') add('MOLECULE_COMPLETED');
  });
  const spec = engine.spec;
  engine.start();
  const g = engine.snapshot().carbonGroups;
  const idx = g.findIndex((x) => x.atomIds.length === spec.carbonCount && x.atomIds.every((id) => findAtom(engine.snapshot().molecule, id)!.family === 'blue'));
  engine.selectCarbonGroup(idx);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 10);

  let rng = 3, guard = 0;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  while (engine.getPhase() !== 'SUMMARY' && guard++ < 4000) {
    const s = engine.snapshot();
    if (s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free' && a.family === 'blue');
      if (!free.length) { engine.tick(step); continue; }
      engine.fireWeb(free[0].id);
      run(engine, () => engine.snapshot().heldIds.length > 0, 5);
      continue;
    }
    const cs = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free' && a.state !== 'held');
    const c = greedy ? cs[Math.floor(rand() * cs.length)] : cs.filter((a) => a.remainingValency > 0).sort((a, b) => b.remainingValency - a.remainingValency)[0] ?? cs[0];
    engine.throwAt({ x: c.position.x + (rand() - 0.5) * 60, y: c.position.y + (rand() - 0.5) * 60 });
    run(engine, () => engine.snapshot().flyingId === null || engine.getPhase() === 'SUMMARY', 6);
  }
  if (engine.getPhase() !== 'SUMMARY') engine.finish();
  const sum = engine.snapshot().summary!;
  const parts = Object.entries(tally).map(([k, n]) => `${k} x${n} = ${n * (S as never)[k]}`);
  const time = sum.completion === 'completed' ? Math.floor(sum.remainingTime) * S.TIME_REMAINING_PER_SECOND : 0;
  return { name, completion: sum.completion, score: sum.score, parts, timeBonus: time, bonds: sum.bondsCreated };
}

const a = play('methane', false);
const b = play('propane', true);
for (const r of [a, b]) {
  console.log(`\n${r.name}: ${r.completion}  score ${r.score}  bonds ${r.bonds}`);
  r.parts.forEach((p) => console.log('   ', p));
  console.log('    TIME_REMAINING bonus =', r.timeBonus);
}
console.log(`\n>> a FAILED ${b.name} scores ${b.score}; a COMPLETED ${a.name} scores ${a.score}`);
