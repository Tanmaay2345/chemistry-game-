// Better aim: throw at the free slot itself, not the carbon centre.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom, checkMolecule, type Atom } from '../src/game/chemistry/molecule.ts';

const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 20) => {
  for (let i = 0; i < (s * 1000) / step && !done(); i++) e.tick(step);
};

export function play(name: string, verbose = false) {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  const spec = engine.spec;
  engine.start();
  const groups = engine.snapshot().carbonGroups;
  const idx = groups.findIndex(
    (g) => g.atomIds.length === spec.carbonCount && g.atomIds.every((id) => findAtom(engine.snapshot().molecule, id)!.family === spec.family),
  );
  engine.selectCarbonGroup(idx);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION' || engine.getPhase() === 'SUMMARY');

  let guard = 0;
  while (engine.getPhase() !== 'SUMMARY' && guard++ < 400) {
    const s = engine.snapshot();
    if (s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free' && a.family === spec.family);
      if (!free.length) break;
      if (!engine.fireWeb(free[0].id)) { engine.tick(step); continue; }
      run(engine, () => engine.snapshot().heldIds.length > 0, 5);
      continue;
    }
    const carbons = s.molecule.atoms.filter(
      (a) => a.element === 'C' && a.remainingValency > 0 && (a.state === 'placed' || a.state === 'bonded'),
    );
    if (!carbons.length) break;
    // fill the emptiest carbon first
    const target = carbons.sort((a, b) => b.remainingValency - a.remainingValency)[0];
    // pick the free right-angle slot and aim at its tip
    const taken = s.molecule.bonds
      .filter((b) => b.a === target.id || b.b === target.id)
      .map((b) => findAtom(s.molecule, b.a === target.id ? b.b : b.a)!)
      .map((o) => (Math.atan2(o.position.y - target.position.y, o.position.x - target.position.x) * 180) / Math.PI);
    const freeAngles = [0, -90, 180, 90].filter((ang) => taken.every((u) => Math.abs((((u - ang) % 360) + 540) % 360 - 180) > 30));
    const paper = s.paper.position;
    // aim at the slot that faces the paper, so nothing else is in the way
    const ang = freeAngles.sort((a, b) => {
      const d = (x: number) => {
        const p = { x: target.position.x + Math.cos((x * Math.PI) / 180) * 104, y: target.position.y + Math.sin((x * Math.PI) / 180) * 104 };
        return Math.hypot(p.x - paper.x, p.y - paper.y);
      };
      return d(a) - d(b);
    })[0] ?? 0;
    const aimPoint = {
      x: target.position.x + Math.cos((ang * Math.PI) / 180) * 60,
      y: target.position.y + Math.sin((ang * Math.PI) / 180) * 60,
    };
    const before = s.molecule.bonds.length;
    if (!engine.throwAt(aimPoint)) { engine.tick(step); continue; }
    run(engine, () => engine.snapshot().molecule.bonds.length > before || engine.getPhase() === 'SUMMARY' || engine.snapshot().flyingId === null, 6);
    if (verbose) {
      const t = engine.snapshot();
      console.log(`  throw at ${target.id} slot ${ang}: bonds ${t.molecule.bonds.length} phase ${t.getPhase ? '' : t.phase}`);
    }
  }
  if (engine.getPhase() !== 'SUMMARY') engine.finish();
  const s = engine.snapshot();
  const bondedH = s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded');
  const cs = s.molecule.atoms.filter((a) => a.element === 'C' && (a.state === 'bonded' || a.state === 'placed'));
  return { engine, s, report: {
    target: `${spec.name} C${spec.carbonCount}H${spec.hydrogenCount}`,
    built: `C${cs.length}H${bondedH.length}`,
    bonds: s.molecule.bonds.map((b) => `${b.a}${b.order === 1 ? '-' : b.order === 2 ? '=' : '#'}${b.b}`).join(' '),
    perCarbon: cs.map((c) => `${c.id}=${c.valency - c.remainingValency}/4`).join(' '),
    check: checkMolecule(s.molecule, spec),
    completion: s.summary?.completion,
    score: s.score,
    notes: s.summary?.notes,
  } };
}

if (process.argv[1].endsWith('03-play2.ts')) {
  for (const n of ['methane', 'ethane', 'propane']) {
    const { report } = play(n);
    console.log(`\n=== ${n} ===`);
    console.log(JSON.stringify(report, null, 2));
  }
}
