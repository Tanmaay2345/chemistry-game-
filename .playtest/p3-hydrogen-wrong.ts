// PLAYTEST 3: the hydrogen phase, played badly.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const card = (e: GameEngine) => {
  const p = projectScene(e.snapshot()).panel!;
  return `${p.title} | ${p.body}`;
};
const settle = (e: GameEngine, n = 300) => { for (let i = 0; i < n; i++) e.tick(step); };

function toHydrogenPhase(name = 'ethane') {
  const e = new GameEngine(ALKANE_CHALLENGES[name]);
  e.start();
  const right = ALKANE_CHALLENGES[name].carbonGroups.findIndex(
    (g) => g.length === e.snapshot().spec.carbonCount && g.every((f) => f === 'blue'),
  );
  e.selectCarbonGroup(right);
  for (let i = 0; i < 300 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  return e;
}

const rowFamilies = (e: GameEngine) =>
  e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);

// ---------------------------------------------------------------- A: web a RED hydrogen first
console.log('=== A. student webs a RED hydrogen first (ethane) ===');
{
  const e = toHydrogenPhase();
  const fams = rowFamilies(e);
  const redId = e.snapshot().hydrogenRowIds[fams.indexOf('red')];
  const log: string[] = [];
  e.bus.on((ev) => log.push(ev.type + ('family' in ev ? `(${ev.family})` : '')));
  console.log('card before:', card(e));
  console.log('fireWeb(red) accepted?', e.fireWeb(redId));
  settle(e);
  const s = e.snapshot();
  console.log('events:', log.join(' > '));
  console.log('card after :', card(e));
  console.log('phase', e.getPhase(), 'held', s.heldIds, 'score', s.score, 'hydrogenCollected', s.hydrogenCollected);
  console.log('loaded on paper:', s.paper.loadedAtomId, '(= the red one?)', s.paper.loadedAtomId === redId);

  // Now throw it at a perfectly good free slot on carbon 1.
  const c1 = s.molecule.atoms.find((a) => a.element === 'C' && a.state === 'bonded')!;
  const slot = { x: c1.position.x, y: c1.position.y + 104 };
  console.log('\n  throwing the red H at a free slot', slot);
  const before = e.snapshot().score;
  e.throwAt(slot);
  settle(e, 600);
  const s2 = e.snapshot();
  console.log('  events:', log.slice(-5).join(' > '));
  console.log('  card:', card(e));
  console.log('  phase', e.getPhase(), 'bonds', s2.molecule.bonds.length, 'score', s2.score, `(${s2.score - before})`);
  console.log('  held again:', s2.heldIds, '| can I collect another hydrogen now? fireWeb ->',
    e.fireWeb(e.snapshot().hydrogenRowIds[rowFamilies(e).indexOf('blue')]));
  console.log('  >>> SOFT LOCK CHECK: phase', e.getPhase(), 'held', s2.heldIds.length, 'bondedH', s2.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length);

  // keep trying forever, like a real player would
  for (let attempt = 0; attempt < 8; attempt++) {
    e.throwAt(slot);
    settle(e, 400);
  }
  const s3 = e.snapshot();
  console.log('  after 8 more throws: phase', e.getPhase(), 'bonds', s3.molecule.bonds.length, 'score', s3.score,
    'time left', s3.timeRemaining.toFixed(1), 'card:', card(e));
  console.log('  fireWeb still blocked?', !e.fireWeb(e.snapshot().hydrogenRowIds[rowFamilies(e).indexOf('blue')]));
}

// ---------------------------------------------------------------- B: collect 5 blue + 1 red, then bond the blues
console.log('\n=== B. ethane: collect 5 blue + 1 red, bond the 5 blues, then stuck with the red ===');
{
  const e = toHydrogenPhase();
  const ids = e.snapshot().hydrogenRowIds;
  const fams = rowFamilies(e);
  const blues = ids.filter((_, i) => fams[i] === 'blue');
  const reds = ids.filter((_, i) => fams[i] === 'red');
  for (const id of [...blues.slice(0, 5), reds[0]]) {
    e.fireWeb(id);
    for (let i = 0; i < 200 && e.snapshot().web.active; i++) e.tick(step);
  }
  console.log('held:', e.snapshot().heldIds.length, 'phase', e.getPhase(), 'card:', card(e));
  const carbons = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state === 'bonded');
  const slots = [
    { x: carbons[0].position.x, y: carbons[0].position.y + 104 },
    { x: carbons[0].position.x, y: carbons[0].position.y - 104 },
    { x: carbons[0].position.x - 104, y: carbons[0].position.y },
    { x: carbons[1].position.x, y: carbons[1].position.y + 104 },
    { x: carbons[1].position.x, y: carbons[1].position.y - 104 },
    { x: carbons[1].position.x + 104, y: carbons[1].position.y },
  ];
  for (let round = 0; round < 12; round++) {
    const loaded = e.snapshot().paper.loadedAtomId;
    if (!loaded) { settle(e, 30); continue; }
    e.throwAt(slots[round % slots.length]);
    settle(e, 400);
  }
  const s = e.snapshot();
  console.log('after 12 throws: phase', e.getPhase(), '| bondedH',
    s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length, '/', s.spec.hydrogenCount);
  console.log('held:', s.heldIds.length, '| loaded:', s.paper.loadedAtomId, '| score', s.score, '| time', s.timeRemaining.toFixed(1));
  console.log('card:', card(e));
  const nextBlue = e.snapshot().hydrogenRowIds.find((id, i) => rowFamilies(e)[i] === 'blue' && e.snapshot().molecule.atoms.find((a) => a.id === id)!.state === 'free');
  console.log('can the player collect the 6th blue hydrogen? fireWeb ->', e.fireWeb(nextBlue!));
  console.log('collectableAt the row position?', !!e.collectableAt(e.snapshot().molecule.atoms.find((a) => a.id === nextBlue)!.position));
  console.log('>>> DEAD END:', e.getPhase() === 'THROWING' && s.heldIds.length > 0 && s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length < s.spec.hydrogenCount);
}
