import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, done: () => boolean, s = 10) => { for (let i = 0; i < (s*1000)/step && !done(); i++) e.tick(step); };
for (const name of ['methane','ethane','propane']) {
  const engine = new GameEngine(ALKANE_CHALLENGES[name]);
  engine.start();
  const n = engine.snapshot().carbonGroups.length;
  let tries = 0;
  for (let i = 0; i < n && engine.getPhase() === 'CARBON_SELECTION'; i++) {
    tries++;
    engine.selectCarbonGroup(i);
    run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 15);
    // let the paper dock fully before trying the next group
    for (let k = 0; k < 60; k++) engine.tick(step);
  }
  const s = engine.snapshot();
  console.log(`${name}: ${tries} guesses -> phase ${s.phase}, score ${s.score} (wrong picks cost ${DEFAULT_RULES.scoring.WRONG_ATOM_SELECTION} each, retries unlimited)`);
}
