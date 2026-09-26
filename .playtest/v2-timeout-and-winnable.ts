// V2 CHECK: (a) "Time up" is a frame the player sees, (b) the fill order that
// used to brick the board can still be played to completion.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;

// (a) ------------------------------------------------------------------
{
  const e = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 2 });
  e.start();
  const seen = new Map<string, number>();
  for (let i = 0; i < 2000 && e.getPhase() !== 'SUMMARY'; i++) {
    e.tick(step);
    seen.set(e.getPhase(), (seen.get(e.getPhase()) ?? 0) + 1);
  }
  const timeout = seen.get('TIMEOUT') ?? 0;
  console.log(`(a) TIMEOUT drew ${timeout} frames (${(timeout / 60).toFixed(2)}s) before the summary`);
}

// (b) ------------------------------------------------------------------
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 900 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family;

  let thrown = 0;
  for (let round = 0; round < 40 && e.snapshot().molecule.bonds.length < 7; round++) {
    if (!e.snapshot().paper.loadedAtomId) {
      const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id) === 'blue' && e.snapshot().molecule.atoms.find((a) => a.id === id)!.state === 'free');
      if (!blue || !e.fireWeb(blue)) { for (let i = 0; i < 60; i++) e.tick(step); continue; }
      for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
      for (let i = 0; i < 60 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
      continue;
    }
    // The order that used to brick it: always the leftmost free slot.
    const targets = [...e.bondTargets()].sort((a, b) => a.point.x - b.point.x);
    if (!targets.length) break;
    e.throwAt({ ...targets[0].point });
    thrown++;
    for (let i = 0; i < 500; i++) e.tick(step);
  }
  for (let i = 0; i < 400 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`(b) leftmost-slot-first ethane: ${s.molecule.bonds.length}/7 bonds after ${thrown} throws, phase ${s.phase}, ${s.timeRemaining.toFixed(0)}s left, score ${s.score}`);
  console.log(`    completion: ${s.session.completionStatus}`);
}

// (c) a red hydrogen is a recoverable mistake, not the end of the round -----
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 900 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family;
  const red = e.snapshot().hydrogenRowIds.find((id) => fam(id) === 'red')!;
  e.fireWeb(red);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 60 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
  const carbon = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
  e.throwAt({ ...carbon.position });
  for (let i = 0; i < 500; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`(c) after throwing a red hydrogen: held=${s.heldIds.length}, the red is '${s.molecule.atoms.find((a) => a.id === red)!.state}'`);
  console.log(`    feedback: ${JSON.stringify(s.feedback)}`);
  const blue = s.hydrogenRowIds.find((id) => fam(id) === 'blue')!;
  console.log(`    can the player pick a blue one now? ${e.fireWeb(blue)}`);
}
