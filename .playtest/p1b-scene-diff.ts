// What, visually, actually changes after a wrong-group hit?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const e = new GameEngine(ALKANE_CHALLENGES.ethane);
e.start();
const key = (el: any) => el.key ?? el.kind;
const map = (s: any) => new Map(s.elements.map((el: any) => [key(el), JSON.stringify(el)]));

const before = map(projectScene(e.snapshot()));
e.selectCarbonGroup(3);
for (let i = 0; i < 180; i++) e.tick(step);
const after = map(projectScene(e.snapshot()));

console.log('keys only before:', [...before.keys()].filter((k) => !after.has(k)));
console.log('keys only after :', [...after.keys()].filter((k) => !before.has(k)));
for (const [k, v] of after) if (before.has(k) && before.get(k) !== v) console.log('CHANGED', k, '\n  was', before.get(k), '\n  now', v);
