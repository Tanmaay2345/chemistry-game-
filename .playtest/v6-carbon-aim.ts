import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
const step = DEFAULT_RULES.physics.stepMs;
for (const molecule of ['ethane', 'propane', 'methane']) {
  console.log(`\n=== ${molecule}: aim at each carbon set's centre ===`);
  const probe = new GameEngine(ALKANE_CHALLENGES[molecule]);
  probe.start();
  const n = probe.snapshot().carbonGroups.length;
  for (let g = 0; g < n; g++) {
    const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
    e.start();
    const fams = (i: number) => e.snapshot().carbonGroups[i].atomIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family).join('+');
    const want = fams(g);
    const events: string[] = [];
    e.bus.on((ev) => { if (ev.type === 'ATOM_COLLISION') events.push(ev.struckId); });
    e.throwAt; // no-op
    e.selectCarbonGroup(g);
    for (let i = 0; i < 900 && e.getPhase() === 'PAPER_FLIGHT'; i++) e.tick(step);
    const struckId = events[0];
    const hit = struckId ? e.snapshot().carbonGroups.findIndex((gr) => gr.atomIds.includes(struckId)) : -1;
    console.log(`  aim set #${g} (${want.padEnd(15)}) -> struck set #${hit}${hit >= 0 ? ` (${fams(hit)})` : ' none'}  ${hit === g ? 'OK' : '** WRONG SET **'}`);
  }
}
