// PLAYTESTER 5 — the clock: tab-away behaviour and the last second.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;

console.log('=== tab-away / stalled rAF: engine.tick clamps deltaMs at 250ms (engine.ts:386) ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const before = e.snapshot().timeRemaining;
  // one rAF frame after 30 seconds of a hidden tab
  e.tick(30_000);
  console.log(`30s of wall clock in a backgrounded tab costs the game clock: ${(before - e.snapshot().timeRemaining).toFixed(2)}s`);
  const b2 = e.snapshot().timeRemaining;
  for (let i = 0; i < 10; i++) e.tick(30_000);
  console.log(`5 more minutes of wall clock costs: ${(b2 - e.snapshot().timeRemaining).toFixed(2)}s`);
  console.log('=> switching tabs is a free, undocumented pause (and a free timing exploit on the time bonus).');
}

console.log('\n=== how long the clock reads "0:00" before the round actually ends ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  let firstZero = -1, ms = 0;
  while (e.getPhase() !== 'SUMMARY') {
    e.tick(step); ms += step;
    const txt = (projectScene(e.snapshot()).elements.find((el: any) => el.key === 'clock') as any).text;
    if (txt === '0:00' && firstZero < 0) firstZero = ms;
  }
  console.log(`clock first reads "0:00" at ${(firstZero / 1000).toFixed(2)}s; round ends at ${(ms / 1000).toFixed(2)}s`);
  console.log(`=> it sits on "0:00" for ${((ms - firstZero) / 1000).toFixed(2)}s before anything happens.`);
}

console.log('\n=== the warning ladder ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const events: string[] = [];
  e.bus.on((x) => events.push(x.type));
  let lastColor = '';
  const marks: string[] = [];
  while (e.getPhase() !== 'SUMMARY') {
    e.tick(step);
    const el = projectScene(e.snapshot()).elements.find((x: any) => x.key === 'clock') as any;
    if (el.color !== lastColor) { marks.push(`${e.snapshot().timeRemaining.toFixed(1)}s left: clock colour -> ${el.color}`); lastColor = el.color; }
  }
  console.log('every visual state change of the clock across a whole 120s round:');
  marks.forEach((m) => console.log('  ' + m));
  console.log('engine events emitted across a whole idle 120s round:', events.join(', ') || '(none)');
  console.log('=> one colour change at 20s. No sound, no tick, no pulse, no 60s/30s/10s mark, no countdown audio.');
}
