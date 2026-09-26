// Does restricting capture to the aimed marker leave any molecule unfinishable?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const settle = (e: GameEngine, n = 600) => { for (let i = 0; i < n; i++) e.tick(step); };

/** Plays a whole round, choosing a marker by `pick`. */
function play(molecule: string, pick: (targets: ReturnType<GameEngine['bondTargets']>) => number, label: string) {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  e.start();
  // methane's answer is the single blue carbon (group 0); the others are group 2.
  e.selectCarbonGroup(molecule === 'methane' ? 0 : 2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;

  let throws = 0;
  for (let n = 0; n < 60 && e.getPhase() !== 'SUMMARY'; n++) {
    if (!e.snapshot().paper.loadedAtomId) {
      const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue' && fam(id).state === 'free');
      if (!blue) break;
      e.fireWeb(blue);
      for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
      for (let i = 0; i < 90 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
      continue;
    }
    const targets = e.bondTargets();
    if (!targets.length) break;
    e.throwAt({ ...targets[pick(targets)].point });
    throws++;
    settle(e);
  }
  for (let i = 0; i < 400 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  const s = e.snapshot();
  const need = s.spec.carbonCount - 1 + s.spec.hydrogenCount;
  console.log(
    `${molecule.padEnd(8)} ${label.padEnd(22)} bonds ${s.molecule.bonds.length}/${need}  ${s.session.completionStatus.padEnd(11)}` +
      `  throws ${throws}  misses ${s.session.missedThrows}  ${s.timeRemaining.toFixed(0)}s left`,
  );
  return s.session.completionStatus === 'completed';
}

let allOk = true;
for (const molecule of ['methane', 'ethane', 'propane']) {
  allOk = play(molecule, () => 0, 'first marker') && allOk;
  allOk = play(molecule, (t) => t.length - 1, 'last marker') && allOk;
  allOk = play(molecule, (t) => Math.floor(t.length / 2), 'middle marker') && allOk;
  // The order a learner would naturally use: leftmost slot on screen first.
  allOk = play(molecule, (t) => t.reduce((bi, x, i, a) => (x.point.x < a[bi].point.x ? i : bi), 0), 'leftmost on screen') && allOk;
}
console.log(allOk ? '\nEVERY MOLECULE STILL COMPLETABLE' : '\n*** SOME MOLECULE COULD NOT BE FINISHED ***');
