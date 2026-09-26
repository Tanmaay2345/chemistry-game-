// PLAYTEST 2: throw the paper at things that are not a carbon group.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';
import { PAPER_HOME } from '../src/game/engine/layout.ts';

const step = DEFAULT_RULES.physics.stepMs;

const targets: [string, { x: number; y: number }][] = [
  ['empty space, top-right of table', { x: 1100, y: 250 }],
  ['the instruction card itself (y=830)', { x: 592, y: 830 }],
  ['the prefix rail on the left (x=60)', { x: 60, y: 180 }],
  ['far off the left edge', { x: -400, y: 774 }],
  ['exactly on the paper (no movement)', { ...PAPER_HOME }],
  ['1px away from the paper', { x: PAPER_HOME.x + 1, y: PAPER_HOME.y }],
  ['the clock/score readout', { x: 995, y: 315 }],
];

for (const [label, point] of targets) {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: string[] = [];
  e.bus.on((ev) => log.push(ev.type + (ev.type === 'THROW_MISSED' ? `:${ev.reason}` : '')));
  e.start();
  const t0 = e.snapshot().timeRemaining;
  const accepted = e.throwPaperAt(point);
  for (let i = 0; i < 600 && e.getPhase() === 'PAPER_FLIGHT'; i++) e.tick(step);
  for (let i = 0; i < 60; i++) e.tick(step);
  const s = e.snapshot();
  const p = projectScene(s).panel!;
  console.log(`\n-- aim at ${label} -> accepted=${accepted}`);
  console.log('   events:', log.slice(2).join(' > ') || '(none)');
  console.log(`   phase=${e.getPhase()} score=${s.score} clockSpent=${(t0 - s.timeRemaining).toFixed(2)}s`);
  console.log('   card  :', p.title, '|', p.body);
}
