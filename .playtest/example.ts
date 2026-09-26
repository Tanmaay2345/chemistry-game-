// Example harness: drives the engine headlessly, no browser needed.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
engine.bus.on((e) => console.log('EVENT', e.type, JSON.stringify(e).slice(0, 120)));
const run = (done: () => boolean, seconds = 12) => {
  for (let i = 0; i < (seconds * 1000) / step && !done(); i++) engine.tick(step);
};
engine.start();
engine.selectCarbonGroup(2);
run(() => engine.getPhase() === 'HYDROGEN_SELECTION');
console.log('phase', engine.getPhase(), 'bonds', engine.snapshot().molecule.bonds.length);
