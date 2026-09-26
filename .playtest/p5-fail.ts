// PLAYTESTER 5 — failure paths: does the player ever learn WHY?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const run = (e: GameEngine, sec: number) => { for (let i = 0; i < (sec * 1000) / step; i++) e.tick(step); };
const card = (e: GameEngine) => { const p = projectScene(e.snapshot()).panel as any; return `"${p.title}" / "${p.body}"`; };
const boxes = (e: GameEngine) => projectScene(e.snapshot()).elements.filter((el: any) => el.kind === 'box').map((el: any) => `${el.key}:${el.borderColor}`);

console.log('========== A. WRONG-FAMILY CARBON GROUP: the whole experience ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const ev: string[] = [];
  e.bus.on((x) => ev.push(x.type));
  e.start();
  console.log('BEFORE  card:', card(e), ' score:', e.snapshot().score, ' boxes:', boxes(e).join(' '));
  e.selectCarbonGroup(0); // ['blue','red'] - wrong
  run(e, 3);
  console.log('AFTER   card:', card(e), ' score:', e.snapshot().score, ' boxes:', boxes(e).join(' '));
  console.log('events:', ev.join(' '));
  console.log('=> difference visible to player: score number changed by', e.snapshot().score, '; card text identical; group box border:',
    boxes(e).join(' '));
  console.log('=> any on-screen text naming the mistake? ', JSON.stringify(projectScene(e.snapshot()).elements.filter((el: any) => el.kind === 'text').map((el: any) => el.text)));
}

console.log('\n========== B. WRONG-FAMILY HYDROGEN: collected but will not bond ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start(); e.selectCarbonGroup(2); run(e, 3);
  const s = e.snapshot();
  const wrong = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.family !== s.spec.family)!;
  console.log('picking a', wrong.family, 'hydrogen; correct family is', s.spec.family);
  const ev: string[] = [];
  e.bus.on((x) => ev.push(x.type));
  e.fireWeb(wrong.id);
  run(e, 2);
  console.log('after web: card:', card(e), ' score:', e.snapshot().score, ' held:', e.snapshot().heldIds.length);
  console.log('events so far:', ev.join(' '));
  // now throw it at a bond slot
  const c = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free')!;
  e.throwAt({ x: c.position.x, y: c.position.y - 104 });
  run(e, 5);
  console.log('after throwing it at a valid bond slot:');
  console.log('  events:', ev.join(' '));
  console.log('  bonds:', e.snapshot().molecule.bonds.length, ' card:', card(e), ' score:', e.snapshot().score);
  console.log('  => the atom did NOT bond. Is there any text or signal saying why?',
    JSON.stringify(projectScene(e.snapshot()).elements.filter((el: any) => el.kind === 'text').map((el: any) => el.text)));
  console.log('  => where did the wrong atom go?', e.snapshot().molecule.atoms.find((a) => a.id === wrong.id)?.state,
    'held:', e.snapshot().heldIds.length);
}

console.log('\n========== C. A GENUINELY MISSED HYDROGEN THROW ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start(); e.selectCarbonGroup(2); run(e, 3);
  const s = e.snapshot();
  const h = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.family === s.spec.family)!;
  e.fireWeb(h.id); run(e, 2);
  const ev: string[] = [];
  e.bus.on((x) => ev.push(`${x.type}${(x as any).reason ? '(' + (x as any).reason + ')' : ''}`));
  const scoreBefore = e.snapshot().score;
  const cardBefore = card(e);
  // aim hard down-left, away from everything
  e.throwAt({ x: 200, y: 890 });
  let ms = 0;
  while (e.snapshot().flyingId !== null && ms < 10000) { e.tick(step); ms += step; }
  console.log('flight time before the miss resolved:', ms.toFixed(0), 'ms');
  console.log('events:', ev.join(' '));
  console.log('card before:', cardBefore);
  console.log('card after: ', card(e));
  console.log('score', scoreBefore, '->', e.snapshot().score, `(MISSED_THROW = ${DEFAULT_RULES.scoring.MISSED_THROW})`);
  console.log('atom returned to tray? held =', e.snapshot().heldIds.length, 'state =', e.snapshot().molecule.atoms.find((a) => a.id === h.id)?.state);
}

console.log('\n========== D. HOW LONG IS THE COLLISION PHASE (watching an atom roll)? ==========');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start(); e.selectCarbonGroup(2); run(e, 3);
  const times: number[] = [];
  for (let n = 0; n < 4; n++) {
    const s = e.snapshot();
    const h = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.state === 'free' && a.family === s.spec.family);
    if (!h) break;
    e.fireWeb(h.id);
    let g = 0; while (e.snapshot().heldIds.length === 0 && g++ < 600) e.tick(step);
    // throw badly on purpose: short of the slot
    const c = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free')!;
    e.throwAt({ x: c.position.x + 300, y: c.position.y + 200 });
    let ms = 0;
    while (e.snapshot().flyingId !== null && ms < 12000) { e.tick(step); ms += step; }
    times.push(ms);
    let g2 = 0; while (!['HYDROGEN_SELECTION', 'HYDROGEN_COLLECTION'].includes(e.getPhase()) && g2++ < 600) e.tick(step);
  }
  console.log('time the player spends watching a BAD throw play out, per attempt (ms):', times.map((t) => t.toFixed(0)).join(', '));
  console.log('and there is no sound and no card change during any of it.');
}
