// v2 LEARNER: capture projectScene(snapshot).panel.note for three deliberate mistakes.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const note = (e: GameEngine) => projectScene(e.snapshot()).panel?.note;
const card = (e: GameEngine) => {
  const p = projectScene(e.snapshot()).panel as any;
  return `${p.title} | ${p.body}`;
};
const run = (e: GameEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(step); };

// ---------- MISTAKE 1: wrong carbon set ----------
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const groups = e.snapshot().carbonGroups;
  const badIdx = groups.findIndex((g: any) =>
    g.atomIds.some((id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family !== 'blue'));
  e.selectCarbonGroup(badIdx);
  run(e, 300);
  console.log('=== MISTAKE 1: wrong carbon set (group ' + badIdx + ') ===');
  console.log('phase:', e.getPhase(), 'score:', e.snapshot().score);
  console.log('card :', card(e));
  console.log('NOTE :', JSON.stringify(note(e)));
  // how long does the note stay up?
  let frames = 0;
  while (note(e) !== undefined && frames < 2000) { e.tick(step); frames++; }
  console.log('note visible for:', ((frames * step) / 1000).toFixed(2), 's then gone');
  console.log('card after note expires:', card(e), '| note:', JSON.stringify(note(e)));
}

// ---------- MISTAKE 2: wrong-colour hydrogen ----------
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const ok = e.snapshot().carbonGroups.findIndex((g: any) =>
    g.atomIds.length === 2 && g.atomIds.every((id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue'));
  e.selectCarbonGroup(ok);
  for (let i = 0; i < 800 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const s = e.snapshot();
  const redId = s.hydrogenRowIds.find((id: string) => s.molecule.atoms.find((a) => a.id === id)!.family === 'red')!;
  const accepted = e.fireWeb(redId);
  run(e, 120);
  console.log('\n=== MISTAKE 2: wrong-colour (red) hydrogen ===');
  console.log('fireWeb(red) accepted?', accepted, '| phase:', e.getPhase(), 'score:', e.snapshot().score);
  console.log('card :', card(e));
  console.log('NOTE :', JSON.stringify(note(e)));
  console.log('held after:', JSON.stringify(e.snapshot().heldIds));
  // can the player recover: collect a blue one now?
  const s2 = e.snapshot();
  const blueId = s2.hydrogenRowIds.find((id: string) => {
    const a = s2.molecule.atoms.find((x) => x.id === id)!;
    return a.family === 'blue' && a.state === 'free';
  })!;
  console.log('RECOVERY: fireWeb(blue) ->', e.fireWeb(blueId));
}

// ---------- MISTAKE 3: throw at an empty part of the table ----------
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const ok = e.snapshot().carbonGroups.findIndex((g: any) =>
    g.atomIds.length === 2 && g.atomIds.every((id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue'));
  e.selectCarbonGroup(ok);
  for (let i = 0; i < 800 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const s = e.snapshot();
  const blueId = s.hydrogenRowIds.find((id: string) => s.molecule.atoms.find((a) => a.id === id)!.family === 'blue')!;
  e.fireWeb(blueId);
  for (let i = 0; i < 400 && e.getPhase() !== 'THROWING'; i++) e.tick(step);
  console.log('\n=== MISTAKE 3: throw at empty table ===');
  console.log('before: phase', e.getPhase(), 'score', e.snapshot().score, '| card:', card(e));
  e.throwAt({ x: 1500, y: 200 });
  let seenNote: string | undefined;
  for (let i = 0; i < 600; i++) { e.tick(step); if (!seenNote && note(e)) seenNote = note(e); }
  console.log('after : phase', e.getPhase(), 'score', e.snapshot().score);
  console.log('card :', card(e));
  console.log('NOTE :', JSON.stringify(seenNote ?? note(e)));
  console.log('atom back in tray/held?', JSON.stringify(e.snapshot().heldIds), 'loaded:', e.snapshot().paper.loadedAtomId);
}

// ---------- CLEAN ROUNDS, wall of record ----------
for (const name of ['ethane', 'propane'] as const) {
  const e = new GameEngine((ALKANE_CHALLENGES as any)[name]);
  e.start();
  const t0 = e.snapshot().timeRemaining;
  const ok = e.snapshot().carbonGroups.findIndex((g: any) => {
    const atoms = g.atomIds.map((id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!);
    return atoms.length === e.snapshot().spec.carbonCount && atoms.every((a: any) => a.family === 'blue');
  });
  e.selectCarbonGroup(ok);
  for (let i = 0; i < 1200 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  let guard = 0;
  while (e.getPhase() !== 'SUMMARY' && guard++ < 400) {
    const s = e.snapshot();
    if (s.heldIds.length === 0 && !s.paper.loadedAtomId) {
      const id = s.hydrogenRowIds.find((h: string) => {
        const a = s.molecule.atoms.find((x) => x.id === h)!;
        return a.family === 'blue' && a.state === 'free';
      });
      if (!id) break;
      e.fireWeb(id);
      for (let i = 0; i < 300 && !e.snapshot().paper.loadedAtomId && e.getPhase() !== 'THROWING'; i++) e.tick(step);
    }
    const tgt = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state === 'bonded' && a.remainingValency > 0);
    if (!tgt) break;
    e.throwAt({ ...tgt.position });
    for (let i = 0; i < 400 && e.getPhase() !== 'HYDROGEN_COLLECTION' && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  }
  for (let i = 0; i < 600 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  const f = e.snapshot();
  console.log(`\n=== CLEAN ${name.toUpperCase()} ===`);
  console.log('phase', e.getPhase(), '| completion', f.summary?.completion, '| score', f.score,
    '| clock used', (t0 - f.timeRemaining).toFixed(1) + 's', '| left', f.timeRemaining.toFixed(1) + 's');
  console.log('H bonded', f.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length, '/', f.spec.hydrogenCount);
  console.log('summary card:', card(e));
}
