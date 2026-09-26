// Press each drawn marker at each supported viewport, through the app's own
// screen->design transform, and check what the pointer rule decides.
import { fitDesign } from '../src/layout/designFit.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { pointerAction } from '../src/screens/gameplay/live/pointerAction.ts';

const step = DEFAULT_RULES.physics.stepMs;
const DESIGN = { width: 1440, height: 1024, content: { top: 116, bottom: 921 } };
const ORIGIN = { x: 127, y: 1 };
const A = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

function loaded(molecule: string, group: number) {
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

let bad = 0;
for (const [w, h] of [[1366, 768], [1440, 900], [1920, 1080]] as const) {
  const fit = fitDesign(w, h, DESIGN);
  console.log(`\n=== ${w} x ${h}  unit ${fit.unit.toFixed(4)} ===`);
  for (const [molecule, group] of [['methane', 0], ['ethane', 2], ['propane', 2]] as const) {
    const e = loaded(molecule, group);
    // draw each marker to the screen, then read that pixel back, as a click does
    const toScreen = (p: { x: number; y: number }) => ({ x: fit.offsetX + (p.x + ORIGIN.x) * fit.unit, y: fit.offsetY + (p.y + ORIGIN.y) * fit.unit });
    const toGameplay = (s: { x: number; y: number }) => ({ x: (s.x - fit.offsetX) / fit.unit - ORIGIN.x, y: (s.y - fit.offsetY) / fit.unit - ORIGIN.y });
    const results: string[] = [];
    for (const t of e.bondTargets()) {
      const pressed = toGameplay(toScreen(t.point));
      e.aim(pressed);
      const ring = e.snapshot().aimedTarget;
      const ringed = !!ring && ring.carbonId === t.carbonId && ring.angle === t.angle;
      const action = pointerAction(e, e.snapshot(), pressed);
      const ok = ringed && action.kind === 'throw';
      if (!ok) bad++;
      results.push(`${A(t.angle)}${ok ? '' : `=${action.kind}!`}`);
    }
    console.log(`  ${molecule.padEnd(8)} ${e.bondTargets().length} markers: ${results.join(' ')}  ${results.every((r) => !r.includes('!')) ? 'all throw' : '** SOME DO NOT THROW **'}`);
  }
}

// And the other half of the rule: the row still collects.
console.log('\n=== hydrogen row, during collection ===');
for (const [molecule, group] of [['methane', 0], ['ethane', 2], ['propane', 2]] as const) {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  e.start();
  e.selectCarbonGroup(group);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const ids = e.snapshot().hydrogenRowIds;
  const collects = ids.filter((id) => {
    const pos = e.snapshot().molecule.atoms.find((a) => a.id === id)!.position;
    return pointerAction(e, e.snapshot(), pos).kind === 'collect';
  }).length;
  if (collects !== ids.length) bad++;
  console.log(`  ${molecule.padEnd(8)} ${collects}/${ids.length} row atoms collect on a press  ${collects === ids.length ? 'ok' : '** CHANGED **'}`);
}

console.log(bad === 0 ? '\nEVERY HIGHLIGHTED MARKER THROWS, AND THE ROW STILL COLLECTS' : `\n*** ${bad} problems ***`);
