// Q8: can a student who does not know the prefix rule just try every group?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => { for (let i = 0; i < (s*1000)/step && !done(); i++) e.tick(step); };
for (const name of ['methane','ethane','propane']) {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  engine.start();
  const n = engine.snapshot().carbonGroups.length;
  let tries = 0;
  for (let i = 0; i < n; i++) {
    if (engine.getPhase() !== 'CARBON_SELECTION') break;
    tries++;
    engine.selectCarbonGroup(i);
    run(engine, () => engine.getPhase() === 'CARBON_SELECTION' || engine.getPhase() === 'HYDROGEN_SELECTION', 12);
  }
  const s = engine.snapshot();
  console.log(`${name}: brute-forced the carbon group in ${tries} throws, phase=${s.phase}, score=${s.score}`);
  console.log(`   card then says: "${name} needs ${s.spec.hydrogenCount} hydrogen atoms." -- the H count is printed for the player`);
  console.log(`   snapshot.hydrogenTarget = ${s.hydrogenTarget} (the engine computes it and hands it over)`);
}
