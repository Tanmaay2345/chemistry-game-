// PLAYTEST 4: throwing hydrogens at non-slots, over-collecting, and idling to timeout.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';
import { COLLECTED_TRAY, HYDROGEN_ROW } from '../src/game/engine/layout.ts';

const step = DEFAULT_RULES.physics.stepMs;
const card = (e: GameEngine) => { const p = projectScene(e.snapshot()).panel!; return `${p.title} | ${p.body}`; };
const settle = (e: GameEngine, n = 400) => { for (let i = 0; i < n; i++) e.tick(step); };

function toHydrogen(name = 'ethane') {
  const e = new GameEngine(ALKANE_CHALLENGES[name]);
  e.start();
  const spec = e.snapshot().spec;
  const idx = ALKANE_CHALLENGES[name].carbonGroups.findIndex((g) => g.length === spec.carbonCount && g.every((f) => f === 'blue'));
  e.selectCarbonGroup(idx);
  for (let i = 0; i < 400 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  return e;
}
const fams = (e: GameEngine) => e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
function collectBlues(e: GameEngine, n: number) {
  const ids = e.snapshot().hydrogenRowIds.filter((_, i) => fams(e)[i] === 'blue');
  for (const id of ids.slice(0, n)) { e.fireWeb(id); for (let i = 0; i < 200 && e.snapshot().web.active; i++) e.tick(step); }
}

// ------------------------------------------------- 1. over-collect / can you?
console.log('=== 1. can a confused student collect MORE than 6 blue hydrogens? ===');
{
  const e = toHydrogen();
  const blues = e.snapshot().hydrogenRowIds.filter((_, i) => fams(e)[i] === 'blue');
  console.log('blue hydrogens available in the row:', blues.length, '| ethane needs 6');
  let accepted = 0;
  for (const id of blues) {
    if (e.fireWeb(id)) accepted++;
    for (let i = 0; i < 200 && e.snapshot().web.active; i++) e.tick(step);
  }
  console.log('webs accepted:', accepted, '| held:', e.snapshot().heldIds.length, '| phase', e.getPhase());
  console.log('card:', card(e));
  console.log('7th blue hydrogen still drawn on the table?',
    projectScene(e.snapshot()).elements.some((el: any) => el.key === blues[6]));
  console.log('but clickable? collectableAt ->', !!e.collectableAt(e.snapshot().molecule.atoms.find((a) => a.id === blues[6])!.position));
}

// ------------------------------------------------- 2. throw a good H at bad places
console.log('\n=== 2. throw a correct blue hydrogen at places that are not free slots ===');
{
  const base = toHydrogen();
  collectBlues(base, 6);
  const carbons = base.snapshot().molecule.atoms.filter((a) => a.element === 'C' && (a.state === 'bonded' || a.state === 'placed'));
  // bond one hydrogen first so there is an "already bonded hydrogen" to aim at
  base.throwAt({ x: carbons[0].position.x, y: carbons[0].position.y + 104 });
  settle(base);
  const bondedH = base.snapshot().molecule.atoms.find((a) => a.element === 'H' && a.state === 'bonded')!;
  const places: [string, { x: number; y: number }][] = [
    ['the hydrogen already bonded on carbon 1', { ...bondedH.position }],
    ['dead centre of carbon 2 (not a slot)', { ...carbons[1].position }],
    ['empty space mid-table', { x: 900, y: 300 }],
    ['the collected tray itself', { x: COLLECTED_TRAY.left + 30, y: COLLECTED_TRAY.top + 30 }],
    ['the hydrogen row below', { x: HYDROGEN_ROW.centreX, y: HYDROGEN_ROW.centreY }],
  ];
  for (const [label, point] of places) {
    const e = toHydrogen();
    collectBlues(e, 6);
    const cs = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && (a.state === 'bonded' || a.state === 'placed'));
    e.throwAt({ x: cs[0].position.x, y: cs[0].position.y + 104 });
    settle(e);
    const b0 = e.snapshot().molecule.bonds.length;
    const sc0 = e.snapshot().score;
    const t0 = e.snapshot().timeRemaining;
    const log: string[] = [];
    e.bus.on((ev) => log.push(ev.type + (ev.type === 'THROW_MISSED' ? `:${ev.reason}` : '')));
    e.throwAt(point);
    settle(e, 600);
    const s = e.snapshot();
    console.log(`-- at ${label}: bonds ${b0}->${s.molecule.bonds.length}, score ${sc0}->${s.score}, ${(t0 - s.timeRemaining).toFixed(2)}s spent`);
    console.log('     events:', log.join(' > ') || '(none)', '| card:', card(e));
  }
}

// ------------------------------------------------- 3. idle to timeout from each phase
console.log('\n=== 3. do nothing and let the 120s run out ===');
for (const where of ['CARBON_SELECTION', 'HYDROGEN_SELECTION', 'THROWING'] as const) {
  const e = where === 'CARBON_SELECTION' ? (() => { const g = new GameEngine(ALKANE_CHALLENGES.ethane); g.start(); return g; })() : toHydrogen();
  if (where === 'THROWING') { collectBlues(e, 6); }
  const cardAtIdle = card(e);
  const log: string[] = [];
  e.bus.on((ev) => log.push(ev.type));
  for (let i = 0; i < 130 * 60 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`-- idling in ${where}: card while idle = "${cardAtIdle}"`);
  console.log(`   ended in ${e.getPhase()} after ${(120 - s.timeRemaining).toFixed(0)}s, score ${s.score}, events ${log.join(',')}`);
  console.log('   SUMMARY card:', card(e));
  console.log('   notes:', JSON.stringify(s.summary?.notes));
}
