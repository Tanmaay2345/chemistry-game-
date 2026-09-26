import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';
const step = DEFAULT_RULES.physics.stepMs;
for (const gap of [0, 6, 12, 18, 24]) {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  e.throwPaperAt({ x: 228.5, y: 1100 }); // straight down, off the bottom: a genuine miss
  for (let i = 0; i < 3000 && e.getPhase() !== 'CARBON_SELECTION'; i++) e.tick(step);
  const missed = log.some((x) => x.type === 'THROW_MISSED');
  const p = e.snapshot().paper;
  log.length = 0;
  e.selectCarbonGroup(2);
  const modeAtThrow = e.snapshot().paper.mode;
  let tele = '';
  let prev = { ...e.snapshot().paper.position };
  for (let i = 0; i < 900; i++) { e.tick(step); const q = e.snapshot().paper.position; if (!tele && Math.hypot(q.x-prev.x,q.y-prev.y) > 60) tele = `jump ${Math.hypot(q.x-prev.x,q.y-prev.y).toFixed(0)}px at frame ${i} (phase ${e.getPhase()})`; prev = {...q}; }
  const s = e.snapshot();
  console.log(`oob-miss recorded=${missed} paper parked at (${p.position.x.toFixed(0)},${p.position.y.toFixed(0)}) mode=${p.mode} | retry after ${(gap*step).toFixed(0)}ms: modeAtThrow=${modeAtThrow} ${tele||'no teleport'} -> bonds=${s.molecule.bonds.length} wrongPicks=${s.session.wrongSelections} score=${s.score} phase=${e.getPhase()}`);
}
