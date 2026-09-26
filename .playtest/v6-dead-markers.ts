// Which drawn bond markers fall inside the hydrogen row's click area, and are
// therefore ignored when clicked?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { hydrogenRowBox } from '../src/game/engine/layout.ts';

const step = DEFAULT_RULES.physics.stepMs;
const A = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

for (const [molecule, group] of [['methane', 0], ['ethane', 2], ['propane', 2]] as const) {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  e.start();
  e.selectCarbonGroup(group);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const box = hydrogenRowBox(e.snapshot().hydrogenRowIds.length);
  const targets = e.bondTargets();
  const dead = targets.filter((t) => e.isCollectionArea(t.point));
  console.log(`\n=== ${molecule} — row box y ${box.top.toFixed(0)}..${(box.top + box.height).toFixed(0)}, x ${box.left.toFixed(0)}..${(box.left + box.width).toFixed(0)}`);
  for (const t of targets) {
    const inBox = e.isCollectionArea(t.point);
    console.log(`  ${t.carbonId}@${A(t.angle).padEnd(6)} (${t.point.x.toFixed(0)}, ${t.point.y.toFixed(0)})  ${inBox ? '** CLICK IGNORED (inside the hydrogen row box) **' : 'clickable'}`);
  }
  console.log(`  -> ${dead.length} of ${targets.length} markers ignore a click on their centre`);
  // how far above the marker do you have to click for it to work?
  if (dead.length) {
    const t = dead[0];
    let dy = 0;
    while (dy > -40 && e.isCollectionArea({ x: t.point.x, y: t.point.y + dy })) dy -= 1;
    console.log(`  -> clicking ${Math.abs(dy)}px above ${t.carbonId}@${A(t.angle)} works instead`);
  }
}
console.log('\nThe row box and the markers are both in design coordinates, so this is the same at every viewport.');
