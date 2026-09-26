// PLAYTEST 5: propane, and how long each instruction card is actually on screen.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const card = (e: GameEngine) => { const p = projectScene(e.snapshot()).panel!; return `${p.title} | ${p.body}`; };

// ---- how many rendered frames does each instruction card get?
console.log('=== A. how many frames (at 60fps) is each instruction card visible for? ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  const seen = new Map<string, number>();
  const bump = () => { const c = card(e); seen.set(c, (seen.get(c) ?? 0) + 1); };
  bump(); // the frame before start(), as LiveGameplay renders once then starts
  e.start();
  bump();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 300; i++) { e.tick(step); bump(); }
  const fams = e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
  const blues = e.snapshot().hydrogenRowIds.filter((_, i) => fams[i] === 'blue');
  for (const id of blues.slice(0, 6)) { e.fireWeb(id); for (let i = 0; i < 200 && e.snapshot().web.active; i++) { e.tick(step); bump(); } }
  const cs = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free');
  const slots = [
    { x: cs[0].position.x, y: cs[0].position.y + 104 }, { x: cs[0].position.x, y: cs[0].position.y - 104 },
    { x: cs[0].position.x - 104, y: cs[0].position.y }, { x: cs[1].position.x, y: cs[1].position.y + 104 },
    { x: cs[1].position.x, y: cs[1].position.y - 104 }, { x: cs[1].position.x + 104, y: cs[1].position.y },
  ];
  for (const slot of slots) { e.throwAt(slot); for (let i = 0; i < 200 && e.getPhase() !== 'SUMMARY'; i++) { e.tick(step); bump(); } }
  for (const [text, frames] of seen) console.log(`  ${String(frames).padStart(5)} frames (${(frames / 60).toFixed(2)}s)  "${text}"`);
  console.log('  final phase', e.getPhase(), 'score', e.snapshot().score);
}

// ---- which card texts in projectScene.ts can a player NEVER read?
console.log('\n=== B. the three "teaching" cards ===');
console.log('  CARBON_STRUCTURE_READY -> "Make the spiderweb . / The carbon chain is built. Now the hydrogens."');
console.log('  HYDROGEN_CALCULATION   -> "Count the bonds . / Each carbon holds four bonds; what is left is for hydrogen."');
console.log('  INTRO_OBJECTIVE        -> "Make Ethane / Read the name: the prefix gives the carbons, the ending gives the bond."');

// ---- PROPANE played by a lost student
console.log('\n=== C. PROPANE: student throws at the red-red-red group, then the 2-carbon group, then gives up on aim ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.propane);
  const log: string[] = [];
  e.bus.on((ev) => log.push(ev.type + ('family' in ev ? `(${ev.family})` : '') + (ev.type === 'THROW_MISSED' ? `:${ev.reason}` : '')));
  e.start();
  console.log('groups on offer:', ALKANE_CHALLENGES.propane.carbonGroups.map((g, i) => `${i}:${g.join('+')}`).join('  '));
  for (const pick of [3, 1, 0]) {
    const t0 = e.snapshot().timeRemaining, s0 = e.snapshot().score;
    e.selectCarbonGroup(pick);
    for (let i = 0; i < 400 && e.getPhase() === 'PAPER_FLIGHT'; i++) e.tick(step);
    for (let i = 0; i < 60; i++) e.tick(step);
    console.log(`  pick ${pick} (${ALKANE_CHALLENGES.propane.carbonGroups[pick].join('+')}): phase ${e.getPhase()}, score ${s0}->${e.snapshot().score}, ${(t0 - e.snapshot().timeRemaining).toFixed(2)}s gone, card "${card(e)}"`);
  }
  e.selectCarbonGroup(2);
  for (let i = 0; i < 400 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const s = e.snapshot();
  console.log('  correct pick -> phase', e.getPhase(), 'card:', card(e), '| time left', s.timeRemaining.toFixed(1));

  const fams = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!.family);
  console.log('  hydrogen row:', fams.join(','), '| blues available:', fams.filter((f) => f === 'blue').length, '| propane needs', s.spec.hydrogenCount);

  const cs = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x);
  console.log('  carbon positions:', cs.map((c) => `${c.id}@${c.position.x.toFixed(0)},${c.position.y.toFixed(0)} freeSlots=${c.remainingValency}`).join(' '));

  // collect all 8 blues then throw them all at the MIDDLE carbon, like a player who found one spot that works
  const blues = s.hydrogenRowIds.filter((_, i) => fams[i] === 'blue');
  for (const id of blues.slice(0, 8)) { e.fireWeb(id); for (let i = 0; i < 200 && e.snapshot().web.active; i++) e.tick(step); }
  console.log('  collected:', e.snapshot().heldIds.length, 'phase', e.getPhase(), 'card:', card(e));
  let throws = 0;
  for (let round = 0; round < 40 && e.getPhase() !== 'SUMMARY'; round++) {
    if (!e.snapshot().paper.loadedAtomId) { for (let i = 0; i < 30; i++) e.tick(step); continue; }
    const mid = e.snapshot().molecule.atoms.find((a) => a.id === cs[1].id)!;
    if (e.throwAt({ x: mid.position.x, y: mid.position.y - 104 })) throws++;
    for (let i = 0; i < 200 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  }
  const f = e.snapshot();
  console.log(`  after ${throws} throws all at the middle carbon's top slot:`);
  console.log('   phase', e.getPhase(), 'bondedH', f.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length, '/', f.spec.hydrogenCount,
    '| held', f.heldIds.length, '| time', f.timeRemaining.toFixed(1), '| score', f.score);
  console.log('   card:', card(e));
  console.log('   can still collect?', e.fireWeb(e.snapshot().hydrogenRowIds.find((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.state === 'free' && e.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue')!));
  console.log('   summary notes:', JSON.stringify(f.summary?.notes));
}
