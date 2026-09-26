// PLAYTEST 1: a lost student picks carbon groups at random.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;

function card(e: GameEngine) {
  const s = projectScene(e.snapshot());
  return `${s.panel!.title} | ${s.panel!.body}`;
}

for (const pick of [0, 1, 3]) {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: string[] = [];
  engine.bus.on((ev) => log.push(ev.type + (('family' in ev) ? `(${ev.family})` : '')));
  engine.start();
  console.log(`\n=== ETHANE, student throws paper at group ${pick} (${ALKANE_CHALLENGES.ethane.carbonGroups[pick].join('+')}) ===`);
  console.log('card BEFORE :', card(engine));
  console.log('score BEFORE:', engine.snapshot().score, 'time', engine.snapshot().timeRemaining.toFixed(1));
  engine.selectCarbonGroup(pick);
  for (let i = 0; i < 180; i++) engine.tick(step);
  const s = engine.snapshot();
  console.log('events      :', log.join(' > '));
  console.log('card AFTER  :', card(engine));
  console.log('phase       :', engine.getPhase(), '| score', s.score, '| time', s.timeRemaining.toFixed(1));
  console.log('group boxes highlighted (chosen=true):', s.carbonGroups.filter((g) => g.chosen).map((g) => g.index));
  console.log('bonds       :', s.molecule.bonds.length);
}

// Now: does the scene DIFFER at all between "never thrown" and "just hit the wrong group"?
const a = new GameEngine(ALKANE_CHALLENGES.ethane);
a.start();
const before = JSON.stringify(projectScene(a.snapshot()).elements);
a.selectCarbonGroup(3); // all-blue but THREE carbons: right colour, wrong count
for (let i = 0; i < 120; i++) a.tick(step);
const after = JSON.stringify(projectScene(a.snapshot()).elements);
console.log('\nscene elements identical before-throw vs after-wrong-hit?', before === after);
console.log('card identical?', card(a) === 'Make Ethane | Throw the paper at the carbon set of the same family of colour.');
