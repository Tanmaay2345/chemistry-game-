// PLAYTESTER 5 — what does the screen actually say/show at each beat?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;

function sceneSummary(e: GameEngine) {
  const s = e.snapshot();
  const sc = projectScene(s);
  const kinds: Record<string, number> = {};
  for (const el of sc.elements) kinds[el.kind] = (kinds[el.kind] ?? 0) + 1;
  const texts = sc.elements.filter((el: any) => el.kind === 'text').map((el: any) => `${el.key}="${el.text}" color=${el.color}`);
  return { phase: s.phase, card: sc.panel, texts, kinds, elements: sc.elements.length };
}

// ---------------------------------------------------------------- 1. FIRST FRAME
console.log('========== 1. FIRST 10 SECONDS ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  console.log('before start():', JSON.stringify(sceneSummary(e), null, 1));
  e.start();
  console.log('\nimmediately after start():', JSON.stringify(sceneSummary(e), null, 1));
  // does INTRO_OBJECTIVE ever tick away on its own?
  for (let i = 0; i < (10 * 1000) / step; i++) e.tick(step);
  console.log('\nafter 10s of ticking with NO input:', JSON.stringify(sceneSummary(e), null, 1));
  console.log('time remaining after 10s idle:', e.snapshot().timeRemaining);
}

// ---------------------------------------------------------------- 2. WRONG FAMILY
console.log('\n========== 2. WRONG-FAMILY CARBON THROW ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const seen: string[] = [];
  e.bus.on((ev) => seen.push(ev.type));
  e.start();
  // group 0 is ['blue','red'] — wrong family AND wrong size
  e.selectCarbonGroup(0);
  for (let i = 0; i < (4 * 1000) / step; i++) e.tick(step);
  console.log('events:', seen.join(', '));
  const s = sceneSummary(e);
  console.log('scene after wrong pick:', JSON.stringify({ phase: s.phase, card: s.card, texts: s.texts }, null, 1));
  console.log('score:', e.snapshot().score, '(started at 0)');
  console.log('molecule bonds:', e.snapshot().molecule.bonds.length, 'atoms placed:', e.snapshot().molecule.atoms.filter((a) => a.state !== 'free').length);
}

// ---------------------------------------------------------------- 3. MISSED THROW
console.log('\n========== 3. MISSED THROW ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < (3 * 1000) / step; i++) e.tick(step);
  const s = e.snapshot();
  const h = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.family === 'blue')!;
  e.fireWeb(h.id);
  for (let i = 0; i < (2 * 1000) / step; i++) e.tick(step);
  const before = { score: e.snapshot().score, held: e.snapshot().heldIds.length };
  const seen: string[] = [];
  e.bus.on((ev) => seen.push(`${ev.type}${'reason' in ev ? `(${(ev as any).reason})` : ''}`));
  // deliberately aim at empty table, far from any bond slot
  e.throwAt({ x: 1000, y: 250 });
  const t0 = performance.now();
  let ms = 0;
  for (let i = 0; i < (8 * 1000) / step && e.snapshot().flyingId !== null; i++) { e.tick(step); ms += step; }
  console.log('time from release to THROW_MISSED:', ms.toFixed(0), 'ms');
  console.log('events:', seen.join(', '));
  console.log('score before/after:', before.score, '->', e.snapshot().score);
  const s2 = sceneSummary(e);
  console.log('card at that moment:', JSON.stringify(s2.card));
  console.log('texts:', s2.texts);
}

// ---------------------------------------------------------------- 4. TIMEOUT
console.log('\n========== 4. TIMEOUT: the last 25 seconds, frame by frame ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < (3 * 1000) / step; i++) e.tick(step);
  // burn the clock
  const marks = [30, 25, 21, 20.5, 20, 19.9, 10, 5, 1, 0.5, 0.1];
  let mi = 0;
  const changes: string[] = [];
  let lastClockColor = '';
  let lastPhase = e.getPhase();
  while (e.getPhase() !== 'SUMMARY') {
    e.tick(step);
    const s = e.snapshot();
    const sc = projectScene(s);
    const clock = sc.elements.find((el: any) => el.key === 'clock') as any;
    if (clock.color !== lastClockColor) {
      changes.push(`t=${s.timeRemaining.toFixed(2)}s  clock text "${clock.text}"  color ${lastClockColor || '(none)'} -> ${clock.color}`);
      lastClockColor = clock.color;
    }
    if (mi < marks.length && s.timeRemaining <= marks[mi]) {
      console.log(`  @${marks[mi]}s left: clock="${clock.text}" color=${clock.color} card="${sc.panel?.title}" / "${sc.panel?.body}"`);
      mi++;
    }
    if (e.getPhase() !== lastPhase) { changes.push(`t=${s.timeRemaining.toFixed(2)}s  PHASE ${lastPhase} -> ${e.getPhase()}`); lastPhase = e.getPhase(); }
  }
  console.log('\nclock/phase changes over the whole round:');
  changes.forEach((c) => console.log('  ' + c));
  const fin = sceneSummary(e);
  console.log('\nSUMMARY scene:', JSON.stringify(fin, null, 1));
}

// ---------------------------------------------------------------- 5. COMPLETION/TIMEOUT phase visibility
console.log('\n========== 5. ARE COMPLETION / TIMEOUT PHASES EVER DRAWN? ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const phases: string[] = [e.getPhase()];
  e.bus.on((ev) => { if (ev.type === 'PHASE_CHANGED') phases.push(ev.to); });
  // force an end
  e.finish();
  console.log('phases emitted when finish() called mid-play:', phases.join(' -> '));
  console.log('final getPhase():', e.getPhase());
}
{
  // A real completion: how many rendered frames sit on COMPLETION?
  const e = new GameEngine(ALKANE_CHALLENGES.methane);
  e.start();
  e.selectCarbonGroup(0);
  const observed: string[] = [];
  const tickAndObserve = (n: number) => { for (let i = 0; i < n; i++) { e.tick(step); observed.push(e.getPhase()); } };
  tickAndObserve(180);
  let guard = 0;
  while (e.getPhase() !== 'SUMMARY' && guard++ < 300) {
    const s = e.snapshot();
    if (s.heldIds.length === 0) {
      const h = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.state === 'free' && a.family === s.spec.family);
      if (h) e.fireWeb(h.id);
    } else {
      const c = s.molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free');
      if (c) {
        const taken = s.molecule.bonds.filter((b) => b.a === c.id || b.b === c.id)
          .map((b) => s.molecule.atoms.find((a) => a.id === (b.a === c.id ? b.b : b.a))!)
          .map((o) => (Math.atan2(o.position.y - c.position.y, o.position.x - c.position.x) * 180) / Math.PI);
        const free = [0, -90, 180, 90].filter((ang) => taken.every((u) => Math.abs(((u - ang + 540) % 360) - 180) > 30));
        const ang = ((free[0] ?? 0) * Math.PI) / 180;
        e.throwAt({ x: c.position.x + Math.cos(ang) * 104, y: c.position.y + Math.sin(ang) * 104 });
      }
    }
    tickAndObserve(60);
  }
  const counts: Record<string, number> = {};
  for (const p of observed) counts[p] = (counts[p] ?? 0) + 1;
  console.log('rendered frames per phase over a completed methane round:', JSON.stringify(counts));
  console.log('-> COMPLETION frames:', counts.COMPLETION ?? 0, ' TIMEOUT frames:', counts.TIMEOUT ?? 0);
  console.log('-> the card text written for COMPLETION ("The molecule is complete.") and TIMEOUT ("Time up .") is reachable:', (counts.COMPLETION ?? 0) > 0 || (counts.TIMEOUT ?? 0) > 0);
}

// ---------------------------------------------------------------- 6. inputs after SUMMARY
console.log('\n========== 6. WHAT CAN THE PLAYER DO ON THE SUMMARY SCREEN? ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.finish();
  console.log('phase:', e.getPhase());
  console.log('tick() while on SUMMARY changes anything?', (() => { const a = JSON.stringify(e.snapshot()); e.tick(1000); return JSON.stringify(e.snapshot()) !== a; })());
  console.log('throwPaperAt() accepted?', e.throwPaperAt({ x: 500, y: 500 }));
  console.log('fireWeb() accepted?', e.fireWeb(e.snapshot().hydrogenRowIds[0] ?? 'x'));
  console.log('throwAt() accepted?', e.throwAt({ x: 500, y: 500 }));
  console.log('selectCarbonGroup() accepted?', e.selectCarbonGroup(2));
  console.log('any restart/reset method on the engine?', ['restart', 'reset', 'replay', 'again'].filter((m) => typeof (e as any)[m] === 'function'));
  const sc = projectScene(e.snapshot());
  console.log('scene element kinds on SUMMARY:', JSON.stringify(sc.elements.reduce((acc: any, el: any) => { acc[el.kind] = (acc[el.kind] ?? 0) + 1; return acc; }, {})));
  console.log('clock still drawn on SUMMARY?', JSON.stringify(sc.elements.find((el: any) => el.key === 'clock')));
}
