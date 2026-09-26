// Q5 / Q6 / Q7: does the game diagnose the mistake it actually saw?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom } from '../src/game/chemistry/molecule.ts';

const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => {
  for (let i = 0; i < (s * 1000) / step && !done(); i++) e.tick(step);
};

console.log('=== 1. RIGHT colour, WRONG number of carbons (methane, group 3 = two blue carbons) ===');
{
  const engine = new GameEngine(ALKANE_CHALLENGES.methane);
  const seen: string[] = [];
  engine.bus.on((e) => { if (e.type === 'WRONG_ATOM_SELECTED' || e.type === 'ATOM_SELECTED') seen.push(`${e.type} ${e.element} family=${e.family} expected=${e.expected}`); });
  engine.start();
  const g = engine.snapshot().carbonGroups;
  console.log('  card says (CARBON_SELECTION): "Throw the paper at the carbon set of the same family of colour."');
  console.log('  groups on offer:', g.map((x, i) => `#${i} ${x.atomIds.map((id) => findAtom(engine.snapshot().molecule, id)!.family).join('+')}`).join('  '));
  console.log('  student throws at #3 = blue + blue. Same family of colour, as the card asked.');
  engine.selectCarbonGroup(3);
  run(engine, () => engine.getPhase() === 'CARBON_SELECTION' || engine.getPhase() === 'HYDROGEN_SELECTION', 10);
  console.log('  events:', seen);
  engine.finish();
  console.log('  SUMMARY NOTES:', JSON.stringify(engine.snapshot().summary!.notes));
  console.log('  ^ the family WAS blue. The note blames the colour; the real mistake was the carbon count.');
}

console.log('\n=== 2. Repeated wrong-family hydrogen picks ===');
{
  const engine = new GameEngine(ALKANE_CHALLENGES.methane);
  const wrong: string[] = [];
  engine.bus.on((e) => { if (e.type === 'WRONG_ATOM_SELECTED') wrong.push(e.element + ':' + e.family); });
  engine.start();
  engine.selectCarbonGroup(0);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 10);
  const s = engine.snapshot();
  const reds = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.family !== 'blue');
  console.log(`  ${reds.length} wrong-family hydrogens in the row; student webs every one of them`);
  for (const r of reds) {
    engine.fireWeb(r.id);
    run(engine, () => engine.snapshot().heldIds.some((h) => h === r.id), 6);
  }
  console.log('  WRONG_ATOM_SELECTED events fired:', wrong.length, wrong);
  console.log('  held tray now:', engine.snapshot().heldIds.length, 'atoms, all wrong family');
  engine.finish();
  const sum = engine.snapshot().summary!;
  console.log('  summary.wrongHydrogenFamilySelections =', sum.wrongHydrogenFamilySelections);
  console.log('  SUMMARY NOTES:', JSON.stringify(sum.notes));
  console.log(`  ^ the student made ${reds.length} wrong picks; the report says ${sum.wrongHydrogenFamilySelections}.`);
}

console.log('\n=== 3. Scoring: does spamming beat understanding? ===');
{
  // a) a clean, correct methane
  const clean = new GameEngine(ALKANE_CHALLENGES.methane);
  clean.start();
  clean.selectCarbonGroup(0);
  run(clean, () => clean.getPhase() === 'HYDROGEN_SELECTION', 10);
  let g1 = 0;
  while (clean.getPhase() !== 'SUMMARY' && g1++ < 300) {
    const s = clean.snapshot();
    if (s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free' && a.family === 'blue');
      if (!free.length) break;
      clean.fireWeb(free[0].id);
      run(clean, () => clean.snapshot().heldIds.length > 0, 5);
      continue;
    }
    const c = s.molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free')!;
    const before = s.molecule.bonds.length;
    clean.throwAt({ x: c.position.x, y: c.position.y + 60 });
    run(clean, () => clean.snapshot().molecule.bonds.length > before || clean.snapshot().flyingId === null || clean.getPhase() === 'SUMMARY', 6);
  }
  if (clean.getPhase() !== 'SUMMARY') clean.finish();
  const cs = clean.snapshot().summary!;
  console.log(`  clean methane: ${cs.completion}, score ${cs.score}, bonds ${cs.bondsCreated}, missed ${cs.missedThrows}`);

  // b) a spammer: right carbon group, then throw wildly at the pile for the whole round
  const spam = new GameEngine(ALKANE_CHALLENGES.propane);
  spam.start();
  const gp = spam.snapshot().carbonGroups;
  const idx = gp.findIndex((x) => x.atomIds.length === 3 && x.atomIds.every((id) => findAtom(spam.snapshot().molecule, id)!.family === 'blue'));
  spam.selectCarbonGroup(idx);
  run(spam, () => spam.getPhase() === 'HYDROGEN_SELECTION', 10);
  let rng = 1;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let g2 = 0;
  while (spam.getPhase() !== 'SUMMARY' && g2++ < 4000) {
    const s = spam.snapshot();
    if (s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free');
      if (!free.length) { spam.tick(step); continue; }
      spam.fireWeb(free[Math.floor(rand() * free.length)].id);
      run(spam, () => spam.snapshot().heldIds.length > 0, 5);
      continue;
    }
    const cs2 = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free');
    const c = cs2[Math.floor(rand() * cs2.length)];
    spam.throwAt({ x: c.position.x + (rand() - 0.5) * 30, y: c.position.y + (rand() - 0.5) * 30 });
    run(spam, () => spam.snapshot().flyingId === null || spam.getPhase() === 'SUMMARY', 6);
  }
  if (spam.getPhase() !== 'SUMMARY') spam.finish();
  const ss = spam.snapshot().summary!;
  console.log(`  spammer propane: ${ss.completion}, score ${ss.score}, bonds ${ss.bondsCreated}, missed ${ss.missedThrows}, bestChain ${ss.bestCollisionChain}`);
  console.log('  spammer notes:', JSON.stringify(ss.notes));
  console.log(`  -> spammer/failing score ${ss.score} vs clean/completing score ${cs.score}`);
}

console.log('\n=== 4. Scoring table ===');
console.log(JSON.stringify(DEFAULT_RULES.scoring, null, 2));
