// PLAYTEST 8: propane played PERFECTLY (aiming at carbon centres, the undocumented winning move).
// How much of the 120s does a flawless run cost? That is the budget a confused player has.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;

for (const name of ['methane', 'ethane', 'propane']) {
  const e = new GameEngine(ALKANE_CHALLENGES[name]);
  e.start();
  const spec = e.snapshot().spec;
  const idx = ALKANE_CHALLENGES[name].carbonGroups.findIndex((g) => g.length === spec.carbonCount && g.every((f) => f === 'blue'));
  e.selectCarbonGroup(idx);
  for (let i = 0; i < 600 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const tCarbon = 120 - e.snapshot().timeRemaining;

  const fams = e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
  const blues = e.snapshot().hydrogenRowIds.filter((_, i) => fams[i] === 'blue');
  for (const id of blues.slice(0, spec.hydrogenCount)) {
    e.fireWeb(id);
    for (let i = 0; i < 300 && e.snapshot().web.active; i++) e.tick(step);
  }
  const tCollect = 120 - e.snapshot().timeRemaining - tCarbon;

  let throws = 0, misses = 0;
  for (let round = 0; round < 60 && e.getPhase() !== 'SUMMARY'; round++) {
    const loaded = e.snapshot().paper.loadedAtomId;
    if (!loaded) { for (let i = 0; i < 20; i++) e.tick(step); continue; }
    // pick any carbon that still has room
    const cs = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free' && a.remainingValency > 0);
    if (!cs.length) break;
    const before = e.snapshot().molecule.bonds.length;
    e.throwAt({ ...cs[0].position });
    throws++;
    for (let i = 0; i < 400 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
    if (e.snapshot().molecule.bonds.length === before) misses++;
  }
  const s = e.snapshot();
  console.log(`${name.padEnd(8)} complete=${s.summary?.completion ?? e.getPhase()} throws=${throws} noBond=${misses}` +
    ` | carbonPhase ${tCarbon.toFixed(1)}s, webbing ${tCollect.toFixed(1)}s, total ${(120 - s.timeRemaining).toFixed(1)}s` +
    ` | ${s.timeRemaining.toFixed(1)}s spare | score ${s.score}`);
  console.log(`          H bonded ${s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length}/${spec.hydrogenCount}` +
    ` | blues offered ${fams.filter((f) => f === 'blue').length} for ${spec.hydrogenCount} needed (spare: ${fams.filter((f) => f === 'blue').length - spec.hydrogenCount})`);
}
