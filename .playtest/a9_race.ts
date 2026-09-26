// Attack 9: pin down the paper-return race exactly.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';

const step = DEFAULT_RULES.physics.stepMs;

console.log('=== A9.1 which group does the stolen retry actually hit? ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  const centres = [0, 1, 2, 3].map((i) => e.groupCentre(i));
  console.log('  group centres:', centres.map((c, i) => `#${i}(${c.x.toFixed(0)},${c.y.toFixed(0)})`).join(' '));
  e.selectCarbonGroup(0);
  for (let _g = 0; _g < 3000 && e.getPhase() !== "CARBON_SELECTION"; _g++) e.tick(step);
  console.log('  paper parked at', JSON.stringify(e.snapshot().paper.position), 'mode', e.snapshot().paper.mode);
  log.length = 0;
  e.selectCarbonGroup(2); // the CORRECT ethane group
  for (let i = 0; i < 900; i++) e.tick(step);
  console.log('  events from the retry:', log.map((x: any) => x.type === 'ATOM_COLLISION' ? `ATOM_COLLISION(struck ${x.struckId})` : x.type === 'WRONG_ATOM_SELECTED' ? `WRONG_ATOM_SELECTED(${x.family})` : x.type === 'ATOM_SELECTED' ? `ATOM_SELECTED(${x.family})` : x.type).join(' '));
  const s = e.snapshot();
  console.log('  session.wrongSelections =', s.session.wrongSelections, ' score =', s.score);
  const g0 = e.snapshot().carbonGroups[0];
  console.log('  struck atom belongs to group 0 (blue+red, the WRONG one):', g0.atomIds.includes((log.find((x: any) => x.type === 'ATOM_COLLISION') as any)?.struckId));
}

console.log('\n=== A9.2 same race after a MISSED (out-of-bounds) paper throw ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  e.throwPaperAt({ x: 1280, y: 160 }); // wide, into the corner -> out of bounds
  for (let _g = 0; _g < 3000 && e.getPhase() !== "CARBON_SELECTION"; _g++) e.tick(step);
  const p = e.snapshot().paper;
  console.log('  after the miss: phase=CARBON_SELECTION paper.mode =', p.mode, 'paper at', JSON.stringify(p.position), '(off the table)');
  log.length = 0;
  const ok = e.selectCarbonGroup(2);
  console.log('  immediate retry accepted =', ok, ' paper.mode =', e.snapshot().paper.mode, '(THROW was rejected)');
  let teleport = '';
  let prev = { ...e.snapshot().paper.position };
  for (let i = 0; i < 900; i++) {
    e.tick(step);
    const q = e.snapshot().paper.position;
    if (!teleport && Math.hypot(q.x - prev.x, q.y - prev.y) > 60) teleport = `frame ${i}: ${Math.hypot(q.x - prev.x, q.y - prev.y).toFixed(0)}px jump to ${JSON.stringify(q)} during ${e.getPhase()}`;
    prev = { ...q };
  }
  console.log('  ' + (teleport || 'no teleport'));
  console.log('  events:', log.map((x: any) => x.type).join(' '));
  console.log('  final phase', e.getPhase(), 'bonds', e.snapshot().molecule.bonds.length, 'score', e.snapshot().score);
}

console.log('\n=== A9.3 double-click: two selectCarbonGroup calls 150ms apart, repeated ===');
{
  for (const gap of [0, 3, 6, 9, 12, 15, 18, 21, 24]) {
    const e = new GameEngine(ALKANE_CHALLENGES.ethane);
    e.start();
    e.selectCarbonGroup(0);
    for (let _g = 0; _g < 3000 && e.getPhase() !== "CARBON_SELECTION"; _g++) e.tick(step);
    for (let i = 0; i < gap; i++) e.tick(step);
    e.selectCarbonGroup(2);
    for (let i = 0; i < 900; i++) e.tick(step);
    const s = e.snapshot();
    console.log(`  retry ${(gap * step).toFixed(0).padStart(3)}ms after the miss -> mode at throw was RETURNING? ${gap * step < 300}  result: bonds=${s.molecule.bonds.length} wrongPicks=${s.session.wrongSelections} score=${s.score}`);
  }
}
