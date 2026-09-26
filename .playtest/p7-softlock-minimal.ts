// PLAYTEST 7: the minimal soft-lock. Two clicks a confused player would make.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const e = new GameEngine(ALKANE_CHALLENGES.ethane);
e.start();

// 1. correct carbon group
e.selectCarbonGroup(2);
for (let i = 0; i < 400 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);

// 2. click ONE red hydrogen in the row (a 15-year-old who has not read "same family")
const fams = e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
const red = e.snapshot().hydrogenRowIds[fams.indexOf('red')];
e.fireWeb(red);
for (let i = 0; i < 200 && e.snapshot().web.active; i++) e.tick(step);

// 3. throw it at the carbon (the one action the card asks for)
const c = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state === 'bonded')!;
e.throwAt({ ...c.position });
for (let i = 0; i < 600; i++) e.tick(step);

const s = e.snapshot();
console.log('=== after: correct carbons, ONE red hydrogen webbed, ONE throw ===');
console.log('phase              :', e.getPhase());
console.log('time remaining     :', s.timeRemaining.toFixed(1), 's of 120');
console.log('hydrogens bonded   :', s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length, '/', s.spec.hydrogenCount);
console.log('held (cannot bond) :', s.heldIds, '| loaded on paper:', s.paper.loadedAtomId);
console.log('instruction card   :', (() => { const p = projectScene(s).panel!; return `${p.title} | ${p.body}`; })());

const freeBlue = s.hydrogenRowIds.find((id) => {
  const a = s.molecule.atoms.find((x) => x.id === id)!;
  return a.family === 'blue' && a.state === 'free';
})!;
const blueAtom = s.molecule.atoms.find((a) => a.id === freeBlue)!;
console.log('\n--- the player now tries to click a blue hydrogen in the row ---');
console.log('is it still DRAWN on screen?   ', projectScene(s).elements.some((el: any) => el.key === freeBlue));
console.log('engine.collectableAt(it)       ', e.collectableAt(blueAtom.position));
console.log('engine.fireWeb(it)             ', e.fireWeb(freeBlue));
console.log('=> a click there does NOTHING, silently.');

console.log('\n--- the player keeps throwing the red one, as the card tells them to ---');
for (let round = 0; round < 40 && e.getPhase() !== 'SUMMARY'; round++) {
  const loaded = e.snapshot().paper.loadedAtomId;
  if (loaded) e.throwAt({ ...c.position });
  for (let i = 0; i < 200 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
}
const f = e.snapshot();
console.log('phase', e.getPhase(), '| bonded H', f.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length,
  '| score', f.score, '| time', f.timeRemaining.toFixed(1));
console.log('final card:', (() => { const p = projectScene(f).panel!; return `${p.title} | ${p.body}`; })());
console.log('summary notes:', JSON.stringify(f.summary?.notes));
