// v2 adversary, part 2: hunt for refused transitions and unendable rounds.
import { checkMolecule } from '../src/game/chemistry/molecule.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;
const names = ['methane', 'ethane', 'propane'] as const;

console.log('=== S1 600 mixed rounds: extra invariants on top of the checker ===');
{
  let rng = 0x9e3779b1;
  const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296);
  let fails = 0;
  const samples: string[] = [];
  const hit = (tag: string, d: string) => { fails++; if (samples.length < 10) samples.push(`[${tag}] ${d}`); };
  let completeButUnended = 0;
  let maxCompleteLag = 0;
  let trayInSelection = 0;
  let paperStuckThrow = 0;
  let steps = 0;
  const finals = new Map<string, number>();

  for (let run = 0; run < 600; run++) {
    const name = names[run % 3];
    const e = new GameEngine(ALKANE_CHALLENGES[name]);
    e.start();
    let completeFor = 0;
    let idleThrowMode = 0;
    for (let i = 0; i < 60 * 135 && e.getPhase() !== 'SUMMARY'; i++) {
      const s = e.snapshot();
      const mode = rand();
      // mix of a competent player, a flailing one, and garbage
      if (s.phase === 'CARBON_SELECTION') {
        if (mode < 0.55) e.selectCarbonGroup(2);
        else if (mode < 0.8) e.selectCarbonGroup(Math.floor(rand() * 4));
        else e.throwPaperAt({ x: rand() * 1500, y: rand() * 1000 });
      }
      if (!s.web.active && s.heldIds.length < s.spec.hydrogenCount) {
        const free = s.hydrogenRowIds.filter((id) => s.molecule.atoms.find((a) => a.id === id)!.state === 'free');
        const good = free.filter((id) => s.molecule.atoms.find((a) => a.id === id)!.family === s.spec.family);
        const pick = mode < 0.7 ? good[0] : free[Math.floor(rand() * free.length)];
        if (pick) e.fireWeb(pick);
      }
      if (e.canThrow() && s.paper.loadedAtomId) {
        const t = s.bondTargets[Math.floor(rand() * Math.max(1, s.bondTargets.length))];
        if (t && mode < 0.75) e.throwAt({ ...t.point });
        else e.throwAt({ x: rand() * 1500, y: rand() * 1000 });
      }
      e.tick(step);
      steps++;

      const v = invariants(e, `${name}#${run}`);
      if (v.length) v.forEach((x) => hit(x.rule, x.detail));

      const s2 = e.snapshot();
      // INV-A: molecule complete -> the round must end promptly
      const done = checkMolecule(s2.molecule, s2.spec).complete;
      if (done && s2.phase !== 'SUMMARY') {
        completeFor++;
        maxCompleteLag = Math.max(maxCompleteLag, completeFor);
        if (completeFor === 200) { completeButUnended++; hit('COMPLETE_BUT_UNENDED', `${name} phase=${s2.phase} held=${s2.heldIds.length} loaded=${s2.paper.loadedAtomId} holding=${s2.holding} paperMode=${s2.paper.mode}`); }
      } else completeFor = 0;

      // INV-B: the tray must never hold atoms in a phase that cannot reach THROWING
      if (s2.heldIds.length > 0 && (s2.phase === 'HYDROGEN_SELECTION' || s2.phase === 'HYDROGEN_CALCULATION' || s2.phase === 'CARBON_SELECTION' || s2.phase === 'PAPER_FLIGHT' || s2.phase === 'CARBON_IMPACT')) {
        trayInSelection++;
        hit('TRAY_IN_DEAD_PHASE', `${name} phase=${s2.phase} held=${JSON.stringify(s2.heldIds)}`);
      }

      // INV-C: paper stuck in THROW with nothing in the air
      if (s2.paper.mode === 'THROW' && !s2.flyingId && s2.phase !== 'PAPER_FLIGHT' && s2.phase !== 'CARBON_IMPACT' && !s2.carbonImpact) {
        idleThrowMode++;
        if (idleThrowMode === 120) { paperStuckThrow++; hit('PAPER_STUCK_THROW', `${name} phase=${s2.phase} held=${s2.heldIds.length} for 2s`); }
      } else idleThrowMode = 0;

      // INV-D: an atom may not be both in the hydrogen row position and held
      for (const id of s2.heldIds) {
        const a = s2.molecule.atoms.find((x) => x.id === id)!;
        if (a.state === 'free') hit('HELD_BUT_FREE', `${a.id} phase=${s2.phase}`);
      }
    }
    finals.set(e.getPhase(), (finals.get(e.getPhase()) ?? 0) + 1);
  }
  console.log(`  600 rounds, ${steps} ticks. failures=${fails}`);
  samples.forEach((s) => console.log('    ' + s));
  console.log(`  final phases: ${JSON.stringify(Object.fromEntries(finals))}`);
  console.log(`  longest "complete but not yet SUMMARY" stretch: ${maxCompleteLag} frames (${(maxCompleteLag * step).toFixed(0)}ms)`);
  console.log(`  complete-but-unended: ${completeButUnended}  tray-in-dead-phase: ${trayInSelection}  paper-stuck-in-THROW: ${paperStuckThrow}`);
}

console.log('\n=== S2 can HYDROGEN_SELECTION ever hold a loaded atom? (refused THROWING transition) ===');
{
  let seen = 0;
  let rng = 12345;
  const rand = () => ((rng = (rng * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let run = 0; run < 300; run++) {
    const e = new GameEngine(ALKANE_CHALLENGES[names[run % 3]]);
    e.start();
    for (let i = 0; i < 60 * 135 && e.getPhase() !== 'SUMMARY'; i++) {
      const s = e.snapshot();
      if (s.phase === 'CARBON_SELECTION') e.selectCarbonGroup(2);
      if (!s.web.active && s.heldIds.length < s.spec.hydrogenCount) {
        const free = s.hydrogenRowIds.filter((id) => s.molecule.atoms.find((a) => a.id === id)!.state === 'free');
        const pick = free[Math.floor(rand() * free.length)];
        if (pick) e.fireWeb(pick);
      }
      if (rand() < 0.5 && e.canThrow() && s.paper.loadedAtomId) {
        const t = s.bondTargets[0];
        e.throwAt(t ? { ...t.point } : { x: 700, y: 400 });
      }
      e.tick(step);
      const s2 = e.snapshot();
      if (s2.phase === 'HYDROGEN_SELECTION' && (s2.heldIds.length > 0 || s2.paper.loadedAtomId)) {
        seen++;
        if (seen < 4) console.log(`    HYDROGEN_SELECTION with tray: held=${JSON.stringify(s2.heldIds)} loaded=${s2.paper.loadedAtomId} canThrow=${e.canThrow()}`);
      }
    }
  }
  console.log(`  occurrences over 300 rounds: ${seen} (0 means throwAt's refused HYDROGEN_SELECTION->THROWING is unreachable)`);
}

console.log('\n=== S3 wrong-family loop: can a red hydrogen strand the round? ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.methane);
  e.start();
  e.selectCarbonGroup(0);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  // pick only wrong-family hydrogens, forever
  let cycles = 0;
  for (let i = 0; i < 60 * 130 && e.getPhase() !== 'SUMMARY'; i++) {
    const s = e.snapshot();
    if (!s.web.active && s.heldIds.length < s.spec.hydrogenCount && !s.paper.loadedAtomId) {
      const bad = s.hydrogenRowIds.find((id) => { const a = s.molecule.atoms.find((x) => x.id === id)!; return a.state === 'free' && a.family !== s.spec.family; });
      if (bad && e.fireWeb(bad)) cycles++;
    }
    if (e.canThrow() && s.paper.loadedAtomId && s.bondTargets.length) e.throwAt({ ...s.bondTargets[0].point });
    e.tick(step);
  }
  const s = e.snapshot();
  console.log(`  ${cycles} wrong-family pick/throw cycles -> phase=${e.getPhase()} completion=${s.session.completionStatus} score=${s.score} tray=${s.heldIds.length} rowFree=${s.hydrogenRowIds.filter((id) => s.molecule.atoms.find((a) => a.id === id)!.state === 'free').length}`);
  console.log(`  invariants: ${invariants(e).map((x) => x.rule).join(',') || 'OK'}`);
}

console.log('\n=== S4 a losing-order test: fill one carbon completely, then the far slots ===');
{
  // propane: bond every hydrogen onto carbon 0 first, then try the rest.
  const e = new GameEngine(ALKANE_CHALLENGES.propane);
  e.start();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  let stuckAt = '';
  for (let i = 0; i < 60 * 130 && e.getPhase() !== 'SUMMARY'; i++) {
    const s = e.snapshot();
    if (!s.web.active && s.heldIds.length < s.spec.hydrogenCount && !s.paper.loadedAtomId) {
      const good = s.hydrogenRowIds.find((id) => { const a = s.molecule.atoms.find((x) => x.id === id)!; return a.state === 'free' && a.family === s.spec.family; });
      if (good) e.fireWeb(good);
    }
    if (e.canThrow() && s.paper.loadedAtomId) {
      // always the left-most carbon's first free slot: the worst order
      const sorted = [...s.bondTargets].sort((a, b) => {
        const ca = s.molecule.atoms.find((x) => x.id === a.carbonId)!;
        const cb = s.molecule.atoms.find((x) => x.id === b.carbonId)!;
        return ca.position.x - cb.position.x;
      });
      if (sorted[0]) e.throwAt({ ...sorted[0].point });
    }
    e.tick(step);
    if (i === 60 * 120) stuckAt = `${e.getPhase()} bonds=${e.snapshot().molecule.bonds.length}`;
  }
  const s = e.snapshot();
  console.log(`  worst-order propane -> phase=${e.getPhase()} bonds=${s.molecule.bonds.length}/10 completion=${s.session.completionStatus} misses=${s.session.missedThrows} at120s=${stuckAt}`);
  console.log(`  free bond markers left: ${s.bondTargets.length}  hydrogens bonded: ${s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length}/${s.spec.hydrogenCount}`);
}
