// Is ethane completable at all? Give unlimited time + many hydrogens and brute force the aim.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { findAtom, checkMolecule } from '../src/game/chemistry/molecule.ts';
import { PAPER_HOME } from '../src/game/engine/layout.ts';

const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => {
  for (let i = 0; i < (s * 1000) / step && !done(); i++) e.tick(step);
};

function attempt(name: string, seed: number) {
  const base = ALKANE_CHALLENGES[name];
  const ch = { ...base, timeLimitSeconds: 100000, hydrogenRow: Array(26).fill('blue' as const) };
  const engine = new GameEngine(ch as never);
  const spec = engine.spec;
  engine.start();
  const groups = engine.snapshot().carbonGroups;
  const idx = groups.findIndex(
    (g) => g.atomIds.length === spec.carbonCount && g.atomIds.every((id) => findAtom(engine.snapshot().molecule, id)!.family === spec.family),
  );
  engine.selectCarbonGroup(idx);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION' || engine.getPhase() === 'SUMMARY', 20);

  let rng = seed;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  let guard = 0;
  while (engine.getPhase() !== 'SUMMARY' && guard++ < 3000) {
    const s = engine.snapshot();
    if (s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.map((id) => findAtom(s.molecule, id)!).filter((a) => a.state === 'free');
      if (!free.length) return { done: false, reason: 'ran out of hydrogens', check: checkMolecule(s.molecule, spec), guard };
      if (!engine.fireWeb(free[0].id)) { engine.tick(step); continue; }
      run(engine, () => engine.snapshot().heldIds.length > 0, 5);
      continue;
    }
    const carbons = s.molecule.atoms.filter((a) => a.element === 'C' && a.remainingValency > 0 && (a.state === 'placed' || a.state === 'bonded'));
    if (!carbons.length) break;
    const target = carbons[Math.floor(rand() * carbons.length)];
    const ang = rand() * Math.PI * 2;
    const r = 40 + rand() * 80;
    const aim = { x: target.position.x + Math.cos(ang) * r, y: target.position.y + Math.sin(ang) * r };
    const before = s.molecule.bonds.length;
    if (!engine.throwAt(aim)) { engine.tick(step); continue; }
    run(engine, () => engine.snapshot().molecule.bonds.length > before || engine.getPhase() === 'SUMMARY' || engine.snapshot().flyingId === null, 6);
  }
  const s = engine.snapshot();
  return { done: engine.getPhase() === 'SUMMARY', check: checkMolecule(s.molecule, spec), guard, positions: {
    paper: PAPER_HOME,
    carbons: s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').map((a) => `${a.id}@(${a.position.x|0},${a.position.y|0}) left ${a.remainingValency}`),
  } };
}

for (const name of ['methane', 'ethane', 'propane']) {
  let wins = 0;
  let last: unknown = null;
  for (let s = 1; s <= 8; s++) {
    const r = attempt(name, s * 7919);
    if (r.check.complete) wins++;
    last = r;
  }
  console.log(`${name}: completed ${wins}/8 random-aim runs with unlimited time`);
  console.log('  last run:', JSON.stringify(last));
}
