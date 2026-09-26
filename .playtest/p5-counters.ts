// PLAYTESTER 5 — what the card tells you about progress, beat by beat, through a clean round.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const e = new GameEngine(ALKANE_CHALLENGES.ethane);
const seen = new Set<string>();
const order: string[] = [];
const note = () => {
  const s = e.snapshot();
  const p = projectScene(s).panel as any;
  const key = `${s.phase}|${p.title}|${p.body}`;
  if (!seen.has(key)) { seen.add(key); order.push(`[${s.phase}]  "${p.title}"  —  "${p.body}"   (score ${s.score})`); }
};
const run = (sec: number) => { for (let i = 0; i < (sec * 1000) / step; i++) { e.tick(step); note(); } };

note();
e.start(); note();
e.selectCarbonGroup(2); run(3);

let guard = 0;
while (e.getPhase() !== 'SUMMARY' && guard++ < 120) {
  const s = e.snapshot();
  if (s.heldIds.length === 0) {
    const h = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.state === 'free' && a.family === s.spec.family);
    if (!h) break;
    e.fireWeb(h.id); note(); run(1.5);
  } else {
    const c = s.molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free');
    if (!c) break;
    const taken = s.molecule.bonds.filter((b) => b.a === c.id || b.b === c.id)
      .map((b) => s.molecule.atoms.find((a) => a.id === (b.a === c.id ? b.b : b.a))!)
      .map((o) => (Math.atan2(o.position.y - c.position.y, o.position.x - c.position.x) * 180) / Math.PI);
    const free = [0, -90, 180, 90].filter((ang) => taken.every((u) => Math.abs(((u - ang + 540) % 360) - 180) > 30));
    const ang = ((free[0] ?? 0) * Math.PI) / 180;
    e.throwAt({ x: c.position.x + Math.cos(ang) * 104, y: c.position.y + Math.sin(ang) * 104 }); note(); run(4);
  }
}

console.log('EVERY DISTINCT THING THE INSTRUCTION CARD SAYS IN A CLEAN ETHANE ROUND:\n');
order.forEach((o, i) => console.log(`${String(i + 1).padStart(2)}. ${o}`));

console.log('\n--- Does the card ever state how many hydrogens are LEFT to bond? ---');
console.log('THROWING/COLLISION card reads: "Bonds made: N. Aim at a free bond." — N counts C-C bonds too.');
console.log('ethane complete = 1 C-C + 6 C-H =', e.snapshot().molecule.bonds.length, 'bonds. The card never states the total.');
console.log('\n--- score values a player would have to infer ---');
console.log(JSON.stringify(DEFAULT_RULES.scoring, null, 1));
console.log('\nFinal score breakdown for this round:');
const sess = e.snapshot().session;
console.log(JSON.stringify({
  correctSelections: sess.carbonSelections.filter(s => s.correct).length + sess.hydrogenSelections.filter(s => s.correct).length,
  wrongSelections: sess.wrongSelections,
  successfulCollisions: sess.successfulCollisions,
  bondsCreated: sess.bondsCreated,
  missedThrows: sess.missedThrows,
  bestChain: sess.bestCollisionChain,
  remainingTime: sess.remainingTime,
  score: sess.score,
}, null, 1));
const timeBonus = Math.floor(sess.remainingTime) * DEFAULT_RULES.scoring.TIME_REMAINING_PER_SECOND;
console.log(`\nof which the end-of-round time bonus alone = ${timeBonus} (${((timeBonus / sess.score) * 100).toFixed(0)}% of the total),`);
console.log('and it lands in one silent jump at the very last frame, with nothing on screen naming it.');
