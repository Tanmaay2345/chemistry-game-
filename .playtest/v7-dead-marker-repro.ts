// REPRO: a click exactly on a highlighted bottom bond marker is swallowed by
// the hydrogen-row picker, so no throw happens.
//
// Replays the pointer handler's decision sequence (LiveGameplay.handleDown)
// against the real engine, for every drawn marker.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { pointerAction } from '../src/screens/gameplay/live/pointerAction.ts';

const step = DEFAULT_RULES.physics.stepMs;
const A = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

/** The real rule the pointer handler uses. */
function decide(e: GameEngine, point: { x: number; y: number }) {
  const a = pointerAction(e, e.snapshot(), point);
  return a.kind === 'ignore' ? 'swallowed by the row' : a.kind;
}

function ready(molecule: string, group: number) {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  e.start();
  e.selectCarbonGroup(group);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
  const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue' && fam(id).state === 'free')!;
  e.fireWeb(blue);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 120 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
  return e;
}

let dead = 0;
for (const [molecule, group] of [['methane', 0], ['ethane', 2], ['propane', 2]] as const) {
  const e = ready(molecule, group);
  console.log(`\n=== ${molecule} (paper loaded: ${e.snapshot().paper.loadedAtomId}) ===`);
  for (const t of e.bondTargets()) {
    e.aim(t.point);
    const ringed = e.snapshot().aimedTarget;
    const highlighted = !!ringed && ringed.carbonId === t.carbonId && ringed.angle === t.angle;
    const action = decide(e, t.point);
    const bad = highlighted && action !== 'throw';
    if (bad) dead++;
    console.log(
      `  ${t.carbonId}@${A(t.angle).padEnd(6)} (${t.point.x.toFixed(0)}, ${t.point.y.toFixed(0)})  highlighted=${highlighted}  click -> ${action.padEnd(20)} ${bad ? '** DEAD **' : 'ok'}`,
    );
  }
}
console.log(`\n${dead === 0 ? 'every highlighted marker throws when clicked' : `*** ${dead} highlighted markers do not throw when clicked ***`}`);
