// v2 LEARNER 2: exact note text + exact on-screen duration, measured from the frame it appears.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const note = (e: GameEngine) => projectScene(e.snapshot()).panel?.note;
const card = (e: GameEngine) => { const p = projectScene(e.snapshot()).panel as any; return `${p.title} | ${p.body}`; };

/** tick up to n frames, recording the first note seen and how many frames it stayed. */
function watch(e: GameEngine, n: number) {
  let first: string | undefined; let frames = 0; let started = false; let ended = false;
  for (let i = 0; i < n; i++) {
    e.tick(step);
    const nt = note(e);
    if (nt && !started) { first = nt; started = true; }
    if (started && !ended) { if (nt) frames++; else ended = true; }
  }
  return { first, seconds: (frames * step) / 1000, stillUp: !ended && started };
}

function toHydrogenPhase(e: GameEngine) {
  e.start();
  const s0 = e.snapshot();
  const ok = s0.carbonGroups.findIndex((g: any) => {
    const atoms = g.atomIds.map((id: string) => s0.molecule.atoms.find((a) => a.id === id)!);
    return atoms.length === s0.spec.carbonCount && atoms.every((a: any) => a.family === 'blue');
  });
  e.selectCarbonGroup(ok);
  for (let i = 0; i < 1200 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
}

// ---- M1: wrong carbon set, measured from the mistake frame ----
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const s0 = e.snapshot();
  const bad = s0.carbonGroups.findIndex((g: any) =>
    g.atomIds.some((id: string) => s0.molecule.atoms.find((a) => a.id === id)!.family !== 'blue'));
  e.selectCarbonGroup(bad);
  const w = watch(e, 1200);
  console.log('M1 wrong carbon set');
  console.log('  NOTE:', JSON.stringify(w.first));
  console.log('  on screen for:', w.seconds.toFixed(2), 's  | score now', e.snapshot().score, '| phase', e.getPhase());
  console.log('  card:', card(e));
}

// ---- M2a: WEB a red hydrogen (collection) ----
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  toHydrogenPhase(e);
  const s = e.snapshot();
  const red = s.hydrogenRowIds.find((id: string) => s.molecule.atoms.find((a) => a.id === id)!.family === 'red')!;
  const before = e.snapshot().score;
  const acc = e.fireWeb(red);
  const w = watch(e, 600);
  console.log('\nM2a web a RED hydrogen: accepted', acc, '| score', before, '->', e.snapshot().score);
  console.log('  NOTE:', JSON.stringify(w.first), ' (on screen', w.seconds.toFixed(2), 's)');
  console.log('  card:', card(e), '| held', JSON.stringify(e.snapshot().heldIds));

  // ---- M2b: now THROW that red hydrogen at a carbon with a free bond ----
  for (let i = 0; i < 400 && e.getPhase() !== 'THROWING'; i++) e.tick(step);
  const tgt = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state === 'bonded' && a.remainingValency > 0)!;
  const b2 = e.snapshot().score;
  e.throwAt({ ...tgt.position });
  const w2 = watch(e, 900);
  console.log('\nM2b throw the RED hydrogen at a free bond: score', b2, '->', e.snapshot().score);
  console.log('  NOTE:', JSON.stringify(w2.first), ' (on screen', w2.seconds.toFixed(2), 's)');
  console.log('  card:', card(e));
  console.log('  bonded H now:', e.snapshot().molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length);
  const s3 = e.snapshot();
  const blue = s3.hydrogenRowIds.find((id: string) => {
    const a = s3.molecule.atoms.find((x) => x.id === id)!; return a.family === 'blue' && a.state === 'free';
  })!;
  console.log('  RECOVERY after the red: fireWeb(blue) ->', e.fireWeb(blue), '| phase', e.getPhase());
}

// ---- M3: throw a correct hydrogen at genuinely empty table ----
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  toHydrogenPhase(e);
  const s = e.snapshot();
  const blue = s.hydrogenRowIds.find((id: string) => s.molecule.atoms.find((a) => a.id === id)!.family === 'blue')!;
  e.fireWeb(blue);
  for (let i = 0; i < 400 && e.getPhase() !== 'THROWING'; i++) e.tick(step);
  const before = e.snapshot().score;
  const p = e.snapshot().paper.position;
  console.log('\nM3 throw at empty table. paper at', JSON.stringify(p), 'phase', e.getPhase());
  e.throwAt({ x: p.x + 30, y: p.y - 10 }); // a nudge into nothing
  const w = watch(e, 900);
  console.log('  score', before, '->', e.snapshot().score, '| phase', e.getPhase());
  console.log('  NOTE:', JSON.stringify(w.first), ' (on screen', w.seconds.toFixed(2), 's)');
  console.log('  card:', card(e));
  console.log('  held', JSON.stringify(e.snapshot().heldIds), 'loaded', e.snapshot().paper.loadedAtomId);
}

// ---- TIMEOUT phase frames, from a real timeout ----
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const counts: Record<string, number> = {};
  const cards = new Set<string>();
  for (let i = 0; i < 9000 && e.getPhase() !== 'SUMMARY'; i++) {
    const ph = e.getPhase();
    counts[ph] = (counts[ph] ?? 0) + 1;
    if (ph === 'TIMEOUT') cards.add(card(e));
    e.tick(step);
  }
  console.log('\nTIMEOUT-path phase frame counts:', JSON.stringify(counts));
  console.log('  TIMEOUT frames:', counts['TIMEOUT'] ?? 0, '| cards seen during TIMEOUT:', [...cards]);
  console.log('  SUMMARY card:', card(e));
}
