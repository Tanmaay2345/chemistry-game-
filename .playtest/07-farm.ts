// Q7: is COLLISION_CHAIN_STEP farmable by throwing atoms that can never bond?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom } from '../src/game/chemistry/molecule.ts';

const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => {
  for (let i = 0; i < (s * 1000) / step && !done(); i++) e.tick(step);
};

const engine = new GameEngine(ALKANE_CHALLENGES.propane);
let chainAwards = 0, missed = 0, bonded = 0, unbonded = 0;
engine.bus.on((e) => {
  if (e.type === 'ATOM_COLLISION') { if (e.chainDepth > 1) chainAwards++; e.bonded ? bonded++ : unbonded++; }
  if (e.type === 'THROW_MISSED') missed++;
});
engine.start();
const g = engine.snapshot().carbonGroups;
const idx = g.findIndex((x) => x.atomIds.length === 3 && x.atomIds.every((id) => findAtom(engine.snapshot().molecule, id)!.family === 'blue'));
engine.selectCarbonGroup(idx);
run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 10);

// Fill the chain with hydrogens first so the table is crowded, then farm bounces
// using only WRONG-FAMILY hydrogens, which can never bond.
let rng = 7;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let guard = 0;
const scoreAt: number[] = [];
while (engine.getPhase() !== 'SUMMARY' && guard++ < 3000) {
  const s = engine.snapshot();
  if (s.heldIds.length === 0) {
    // deliberately pick the WRONG family every time
    const wrong = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free' && a.family !== 'blue');
    const any = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free');
    const pick = wrong[0] ?? any[0];
    if (!pick) { engine.tick(step); continue; }
    engine.fireWeb(pick.id);
    run(engine, () => engine.snapshot().heldIds.length > 0, 5);
    continue;
  }
  const cs = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free' && a.state !== 'held');
  if (!cs.length) break;
  const c = cs[Math.floor(rand() * cs.length)];
  engine.throwAt({ x: c.position.x + (rand() - 0.5) * 20, y: c.position.y + (rand() - 0.5) * 20 });
  run(engine, () => engine.snapshot().flyingId === null || engine.getPhase() === 'SUMMARY', 6);
  scoreAt.push(engine.snapshot().score);
}
if (engine.getPhase() !== 'SUMMARY') engine.finish();
const sum = engine.snapshot().summary!;
console.log('throws farmed with wrong-family hydrogens that can never bond:');
console.log(`  chain-step awards (+${DEFAULT_RULES.scoring.COLLISION_CHAIN_STEP} each): ${chainAwards}  = +${chainAwards * DEFAULT_RULES.scoring.COLLISION_CHAIN_STEP}`);
console.log(`  missed throws (${DEFAULT_RULES.scoring.MISSED_THROW} each): ${missed} = ${missed * DEFAULT_RULES.scoring.MISSED_THROW}`);
console.log(`  collisions bonded=${bonded} not-bonded=${unbonded}`);
console.log(`  wrong hydrogen family picks REPORTED: ${sum.wrongHydrogenFamilySelections}`);
console.log(`  final: ${sum.completion} score=${sum.score} bonds=${sum.bondsCreated}`);
console.log('  notes:', JSON.stringify(sum.notes));
