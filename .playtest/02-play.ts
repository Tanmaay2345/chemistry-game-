// Q2/Q3: play a whole round for each alkane and inspect what the game accepts.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom } from '../src/game/chemistry/molecule.ts';
import { checkMolecule } from '../src/game/chemistry/molecule.ts';

const step = DEFAULT_RULES.physics.stepMs;

function run(engine: GameEngine, done: () => boolean, seconds = 20) {
  for (let i = 0; i < (seconds * 1000) / step && !done(); i++) engine.tick(step);
}

function describe(engine: GameEngine) {
  const s = engine.snapshot();
  const m = s.molecule;
  const bonded = m.atoms.filter((a) => a.state === 'bonded');
  const C = bonded.filter((a) => a.element === 'C');
  const H = bonded.filter((a) => a.element === 'H');
  const placedC = m.atoms.filter((a) => a.element === 'C' && a.state === 'placed');
  const bondStr = m.bonds
    .map((b) => `${b.a}${'-='.charAt(Math.min(b.order - 1, 1)) || '#'}${b.b}(${b.order})`)
    .join(' ');
  return {
    phase: s.phase,
    formula: `C${C.length + placedC.length}H${H.length}`,
    bonds: m.bonds.length,
    bondStr,
    perCarbon: [...C, ...placedC].map((c) => `${c.id}:used${c.valency - c.remainingValency}/4`).join(' '),
    score: s.score,
    check: checkMolecule(m, s.spec),
  };
}

function playRound(name: string, opts: { groupIndex?: number; hIndexes?: number[] } = {}) {
  console.log(`\n================ ${name} ================`);
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  const log: string[] = [];
  engine.bus.on((e) => {
    if (e.type === 'PHASE_CHANGED') log.push(`  phase ${e.from} -> ${e.to}`);
    else log.push(`  ${e.type} ${JSON.stringify(e).replace(/"type":"[^"]+",?/, '').slice(0, 110)}`);
  });
  engine.start();

  // pick the carbon group whose size and colour match the spec
  const spec = engine.spec;
  const groups = engine.snapshot().carbonGroups;
  const idx =
    opts.groupIndex ??
    groups.findIndex(
      (g) => g.atomIds.length === spec.carbonCount && g.atomIds.every((id) => findAtom(engine.snapshot().molecule, id)!.family === spec.family),
    );
  console.log(`target ${spec.name} C${spec.carbonCount}H${spec.hydrogenCount}; picking group ${idx} (sizes ${groups.map((g) => g.atomIds.length)})`);
  engine.selectCarbonGroup(idx);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION' || engine.getPhase() === 'SUMMARY');
  console.log('after carbon phase:', JSON.stringify(describe(engine), null, 0));

  // collect + throw hydrogens of the right family, one at a time
  let guard = 0;
  while (engine.getPhase() !== 'SUMMARY' && guard++ < 60) {
    const s = engine.snapshot();
    const free = s.hydrogenRowIds
      .map((id) => findAtom(s.molecule, id)!)
      .filter((a) => a.state === 'free' && a.family === spec.family);
    if (s.heldIds.length === 0) {
      if (!free.length) { console.log('  !! no right-family hydrogens left'); break; }
      engine.fireWeb(free[0].id);
      run(engine, () => engine.snapshot().heldIds.length > 0, 5);
      continue;
    }
    // aim at the first carbon with a free slot
    const target = s.molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && (a.state === 'placed' || a.state === 'bonded'));
    if (!target) break;
    const dir = { x: target.position.x, y: target.position.y };
    const before = s.molecule.bonds.length;
    if (!engine.throwAt(dir)) { engine.tick(step); continue; }
    run(engine, () => engine.snapshot().molecule.bonds.length > before || engine.getPhase() === 'SUMMARY', 6);
  }

  const d = describe(engine);
  console.log('FINAL:', JSON.stringify(d, null, 0));
  const sum = engine.snapshot().summary;
  console.log('SUMMARY:', JSON.stringify(sum, null, 0));
  return engine;
}

playRound('methane');
playRound('ethane');
playRound('propane');
