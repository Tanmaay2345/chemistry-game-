// V2: what the card actually says while throwing, and how much of a round is interactive.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const e = new GameEngine(ALKANE_CHALLENGES.ethane);
e.start();
e.selectCarbonGroup(2);
const seen = new Set<string>();
let frames = 0;
let interactive = 0;
const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
const run = (n: number) => {
  for (let i = 0; i < n; i++) {
    e.tick(step);
    frames++;
    const s = e.snapshot();
    // Interactive = the player could act on this frame.
    if (!s.holding && (e.canThrow() || s.phase === 'CARBON_SELECTION' || s.hydrogenTarget !== null)) interactive++;
    const p = projectScene(s).panel;
    seen.add(`${s.phase} | ${p.title} | ${p.body}`);
  }
};
run(400);
for (let n = 0; n < 6 && e.getPhase() !== 'SUMMARY'; n++) {
  const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue' && fam(id).state === 'free')!;
  e.fireWeb(blue);
  run(300);
  const t = e.bondTargets()[0];
  if (t) e.throwAt({ ...t.point });
  run(400);
}
run(300);
for (const line of [...seen].sort()) console.log(line);
console.log(`\nframes ${frames}, interactive ${interactive} (${((interactive / frames) * 100).toFixed(0)}%)`);
console.log('final', e.getPhase(), e.snapshot().session.completionStatus, 'score', e.snapshot().score);
