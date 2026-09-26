// v2 adversary: new hostile pass on the fixed engine. Read-only w.r.t. src/.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';
import type { Phase } from '../src/game/engine/machine.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;
const names = ['methane', 'ethane', 'propane'] as const;

// ---------------------------------------------------------------- P1
console.log('=== P1 re-run of A8.3 / A8.4 (the paper-return retry race) ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(0); // wrong group
  while (e.getPhase() !== 'CARBON_SELECTION') e.tick(step);
  console.log('  after wrong strike: paper.mode =', e.snapshot().paper.mode, 'phase =', e.getPhase());
  const ok = e.selectCarbonGroup(2); // correct group, immediately
  console.log('  immediate retry accepted =', ok, ' paper.mode =', e.snapshot().paper.mode);
  let jumped = '';
  let prev = { ...e.snapshot().paper.position };
  for (let i = 0; i < 120; i++) {
    e.tick(step);
    const p = e.snapshot().paper.position;
    const d = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (d > 60 && !jumped) jumped = `frame ${i}: paper TELEPORTED ${d.toFixed(0)}px (phase ${e.getPhase()})`;
    prev = { ...p };
  }
  console.log('  ' + (jumped || 'no teleport'));
  for (let i = 0; i < 900; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`  outcome: phase=${e.getPhase()} bonds=${s.molecule.bonds.length} carbonSelections=${JSON.stringify(s.session.carbonSelections.map((x) => x.correct))} wrongSelections=${s.session.wrongSelections} score=${s.score}`);
}
{
  let stolen = 0;
  const rows: string[] = [];
  for (let delay = 0; delay < 30; delay++) {
    const e = new GameEngine(ALKANE_CHALLENGES.ethane);
    e.start();
    e.selectCarbonGroup(0);
    while (e.getPhase() !== 'CARBON_SELECTION') e.tick(step);
    for (let i = 0; i < delay; i++) e.tick(step);
    e.selectCarbonGroup(2);
    const modeOk = e.snapshot().paper.mode === 'THROW';
    for (let i = 0; i < 900; i++) e.tick(step);
    const s = e.snapshot();
    const correct = s.session.carbonSelections.slice(1).some((x) => x.correct);
    if (!modeOk || !correct) stolen++;
    if (delay % 6 === 0) rows.push(`  retry after ${(delay * step).toFixed(0)}ms: mode=${modeOk ? 'THROW' : 'WRONG'} secondPickCorrect=${correct} wrongSelections=${s.session.wrongSelections} score=${s.score}`);
  }
  rows.forEach((r) => console.log(r));
  console.log(`  retries broken: ${stolen}/30`);
}

// ---------------------------------------------------------------- P2
// Dead-state hunter: an active phase where nothing is moving, no hold is up,
// and every single action the player has is refused.
type Deadness = { dead: boolean; why: string };
function deadState(e: GameEngine): Deadness {
  const s = e.snapshot();
  if (s.phase === 'SUMMARY') return { dead: false, why: 'summary' };
  if (s.holding) return { dead: false, why: 'holding' };
  if (s.flyingId) return { dead: false, why: 'flying' };
  if (s.web.active) return { dead: false, why: 'web' };
  if (s.carbonImpact) return { dead: false, why: 'impact' };
  if (s.molecule.atoms.some((a) => a.velocity.x !== 0 || a.velocity.y !== 0)) return { dead: false, why: 'moving' };
  if (s.paper.velocity.x !== 0 || s.paper.velocity.y !== 0) return { dead: false, why: 'paper moving' };
  // Can the player do anything at all? Probe on a clone-free basis: the probes
  // that would mutate are checked via the engine's own guards.
  const canPaper = s.phase === 'CARBON_SELECTION';
  const canWeb = s.hydrogenRowIds.some((id) => {
    const a = s.molecule.atoms.find((x) => x.id === id)!;
    return a.state === 'free';
  }) && (s.phase === 'HYDROGEN_SELECTION' || s.phase === 'HYDROGEN_COLLECTION' || s.phase === 'THROWING' || s.phase === 'COLLISION' || s.phase === 'MOLECULE_VALIDATION')
    && s.hydrogenCollected < s.spec.hydrogenCount && s.heldIds.length < s.spec.hydrogenCount;
  const canThrowAtom = e.canThrow() && !!s.paper.loadedAtomId;
  if (canPaper || canWeb || canThrowAtom) return { dead: false, why: 'action available' };
  return { dead: true, why: `phase=${s.phase} held=${s.heldIds.length} loaded=${s.paper.loadedAtomId} hCollected=${s.hydrogenCollected}/${s.spec.hydrogenCount} bonds=${s.molecule.bonds.length} paperMode=${s.paper.mode}` };
}

console.log('\n=== P2 dead-state hunter (400 hostile fuzz rounds) ===');
{
  let rng = 0x2f6e2b1;
  const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296);
  const deads = new Map<string, number>();
  let failures = 0;
  const failSamples: string[] = [];
  let totalSteps = 0;
  const finalPhases = new Map<string, number>();
  let maxHeld = 0;
  let maxHoldFrames = 0;
  let twoPlaces = 0;
  const twoPlaceSamples: string[] = [];
  let scoreNoProgress = 0;
  const scoreSamples: string[] = [];

  for (let run = 0; run < 400; run++) {
    const name = names[run % 3];
    const e = new GameEngine(ALKANE_CHALLENGES[name]);
    e.start();
    let holdFrames = 0;
    let deadFrames = 0;
    let prevScore = 0;
    let prevProgress = 0;
    for (let i = 0; i < 60 * 130 && e.getPhase() !== 'SUMMARY'; i++) {
      // hostile input soup
      const r = rand();
      const pt = () => ({ x: rand() * 1600 - 150, y: rand() * 1100 - 100 });
      if (r < 0.05) e.throwPaperAt({ x: NaN, y: rand() * 900 });
      else if (r < 0.1) e.throwPaperAt({ x: Infinity, y: Infinity });
      else if (r < 0.2) e.selectCarbonGroup(Math.floor(rand() * 6) - 1);
      else if (r < 0.3) e.throwPaperAt(pt());
      else if (r < 0.45) {
        const s = e.snapshot();
        const free = s.hydrogenRowIds.filter((id) => s.molecule.atoms.find((a) => a.id === id)!.state === 'free');
        if (free.length) e.fireWeb(free[Math.floor(rand() * free.length)]);
      } else if (r < 0.6) {
        const s = e.snapshot();
        const t = s.bondTargets[Math.floor(rand() * Math.max(1, s.bondTargets.length))];
        e.throwAt(t ? { ...t.point } : pt());
      } else if (r < 0.65) e.throwAt({ x: NaN, y: NaN });
      else if (r < 0.68) e.aim({ x: NaN, y: 0 });
      else if (r < 0.70) e.skipTeachingBeat();
      else if (r < 0.72) e.fireWeb('nope-' + Math.floor(rand() * 5));

      // hostile deltas mixed with good ones
      const d = rand();
      if (d < 0.03) e.tick(NaN);
      else if (d < 0.06) e.tick(-1000);
      else if (d < 0.08) e.tick(0);
      else if (d < 0.1) e.tick(1e9);
      else e.tick(step);
      totalSteps++;

      const s = e.snapshot();
      const v = invariants(e, `${name} run${run} step${i}`);
      if (v.length) {
        failures += v.length;
        if (failSamples.length < 6) failSamples.push(v.map((x) => `[${x.rule}] ${x.detail}`).join(' | '));
      }
      maxHeld = Math.max(maxHeld, s.heldIds.length);
      holdFrames = s.holding ? holdFrames + 1 : 0;
      maxHoldFrames = Math.max(maxHoldFrames, holdFrames);

      // two-places checks
      for (const id of s.heldIds) {
        const a = s.molecule.atoms.find((x) => x.id === id)!;
        if (a.state !== 'held') {
          twoPlaces++;
          if (twoPlaceSamples.length < 6) twoPlaceSamples.push(`${id} in heldIds but state=${a.state} (phase ${s.phase})`);
        }
      }
      for (const a of s.molecule.atoms) {
        if (a.state === 'held' && !s.heldIds.includes(a.id) && s.paper.loadedAtomId !== a.id) {
          twoPlaces++;
          if (twoPlaceSamples.length < 6) twoPlaceSamples.push(`${a.id} state=held but not in heldIds (phase ${s.phase})`);
        }
      }

      // score without progress
      const progress = s.molecule.bonds.length * 1000 + s.session.throws + s.session.carbonSelections.length + s.session.hydrogenSelections.length + s.session.successfulCollisions * 7;
      if (s.score > prevScore && progress === prevProgress) {
        scoreNoProgress++;
        if (scoreSamples.length < 6) scoreSamples.push(`score ${prevScore}->${s.score} with no bond/throw/selection/collision change (phase ${s.phase})`);
      }
      prevScore = s.score;
      prevProgress = progress;

      const dd = deadState(e);
      if (dd.dead) {
        deadFrames++;
        if (deadFrames === 30) {
          deads.set(dd.why, (deads.get(dd.why) ?? 0) + 1);
        }
      } else deadFrames = 0;
    }
    finalPhases.set(e.getPhase(), (finalPhases.get(e.getPhase()) ?? 0) + 1);
  }
  console.log(`  400 hostile runs, ${totalSteps} ticks`);
  console.log(`  invariant failures: ${failures}`);
  failSamples.forEach((f) => console.log('    ' + f));
  console.log(`  final phases: ${JSON.stringify(Object.fromEntries(finalPhases))}`);
  console.log(`  dead states held >=0.5s: ${deads.size === 0 ? 'none' : ''}`);
  for (const [why, n] of deads) console.log(`    x${n}  ${why}`);
  console.log(`  max heldIds (tray) ever: ${maxHeld}  (hydrogen targets: methane 4, ethane 6, propane 8)`);
  console.log(`  longest unbroken hold: ${maxHoldFrames} frames = ${(maxHoldFrames * step).toFixed(0)}ms  (longest configured beat: ${Math.max(...Object.values(DEFAULT_RULES.teaching))}ms)`);
  console.log(`  atom-in-two-places violations: ${twoPlaces}`);
  twoPlaceSamples.forEach((t) => console.log('    ' + t));
  console.log(`  score-up-with-no-progress frames: ${scoreNoProgress}`);
  scoreSamples.forEach((t) => console.log('    ' + t));
}

// ---------------------------------------------------------------- P3
console.log('\n=== P3 finish() from every reachable phase ===');
{
  const want: Phase[] = ['INTRO_OBJECTIVE', 'CARBON_SELECTION', 'PAPER_FLIGHT', 'CARBON_IMPACT', 'CARBON_STRUCTURE_READY', 'HYDROGEN_CALCULATION', 'HYDROGEN_SELECTION', 'HYDROGEN_COLLECTION', 'THROWING', 'COLLISION', 'MOLECULE_VALIDATION', 'COMPLETION', 'TIMEOUT'];
  for (const target of want) {
    const e = new GameEngine(ALKANE_CHALLENGES.methane);
    const log: GameEvent[] = [];
    e.bus.on((x) => log.push(x));
    if (target !== 'INTRO_OBJECTIVE') e.start();
    let reached = e.getPhase() === target;
    for (let i = 0; i < 60 * 130 && !reached; i++) {
      const s = e.snapshot();
      if (s.phase === 'CARBON_SELECTION') e.selectCarbonGroup(0);
      if ((s.phase === 'HYDROGEN_SELECTION' || s.phase === 'HYDROGEN_COLLECTION') && !s.web.active && s.heldIds.length === 0 && !s.paper.loadedAtomId) {
        const free = s.hydrogenRowIds.find((id) => { const a = s.molecule.atoms.find((x) => x.id === id)!; return a.state === 'free' && a.family === 'blue'; });
        if (free) e.fireWeb(free);
      }
      if (e.canThrow() && s.paper.loadedAtomId && s.bondTargets.length) e.throwAt({ ...s.bondTargets[0].point });
      e.tick(step);
      if (e.getPhase() === target) reached = true;
    }
    if (!reached) { console.log(`  ${target}: NOT REACHED`); continue; }
    const before = log.length;
    e.finish();
    const after = log.slice(before);
    const announced = after.filter((x) => x.type === 'PHASE_CHANGED').map((x: any) => `${x.from}->${x.to}`).join(',');
    const v = invariants(e, target);
    const s = e.snapshot();
    // Can anything still happen?
    e.tick(step); e.tick(step);
    console.log(`  ${target.padEnd(24)} -> ${e.getPhase().padEnd(8)} announced=[${announced}] summary=${s.summary ? s.summary.completion : 'NULL'} flying=${s.flyingId} web=${s.web.active} impact=${!!s.carbonImpact} invariants=${v.length ? v.map((x) => x.rule).join(',') : 'OK'}`);
  }
}

// ---------------------------------------------------------------- P4
console.log('\n=== P4 farm attempts: can score rise without building? ===');
{
  // (a) bounce an atom off the molecule over and over
  const e = new GameEngine(ALKANE_CHALLENGES.propane);
  e.start();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  let scoreAt = 0;
  for (let k = 0; k < 200; k++) {
    const s = e.snapshot();
    if (!s.web.active && s.heldIds.length === 0 && !s.paper.loadedAtomId) {
      const red = s.hydrogenRowIds.find((id) => { const a = s.molecule.atoms.find((x) => x.id === id)!; return a.state === 'free' && a.family !== 'blue'; });
      if (red) e.fireWeb(red);
    }
    if (e.canThrow() && e.snapshot().paper.loadedAtomId) {
      const c = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!;
      e.throwAt({ x: c.position.x, y: c.position.y });
    }
    for (let i = 0; i < 40; i++) e.tick(step);
    scoreAt = e.snapshot().score;
    if (e.getPhase() === 'SUMMARY') break;
  }
  const s = e.snapshot();
  console.log(`  wrong-family bounce farm: score=${scoreAt} bonds=${s.molecule.bonds.length} misses=${s.session.missedThrows} collisions=${s.session.successfulCollisions}/${s.session.unsuccessfulCollisions} phase=${e.getPhase()}`);

  // (b) idle: no input, just ticks
  const idle = new GameEngine(ALKANE_CHALLENGES.methane);
  idle.start();
  for (let i = 0; i < 60 * 130 && idle.getPhase() !== 'SUMMARY'; i++) idle.tick(step);
  console.log(`  pure idle: score=${idle.snapshot().score} completion=${idle.snapshot().session.completionStatus}`);

  // (c) hammer the correct carbon group after it is already taken
  const h = new GameEngine(ALKANE_CHALLENGES.ethane);
  h.start();
  h.selectCarbonGroup(2);
  while (h.getPhase() !== 'HYDROGEN_SELECTION') h.tick(step);
  const base = h.snapshot().score;
  for (let k = 0; k < 300; k++) { h.selectCarbonGroup(2); h.throwPaperAt({ x: 616, y: 582 }); h.tick(step); }
  console.log(`  re-striking a taken group 300x: score ${base} -> ${h.snapshot().score} (bonds ${h.snapshot().molecule.bonds.length})`);
}

// ---------------------------------------------------------------- P5
console.log('\n=== P5 hold abuse: can a teaching beat be made to outlive its budget? ===');
{
  for (const name of names) {
    const e = new GameEngine(ALKANE_CHALLENGES[name]);
    e.start();
    let worst = 0;
    let cur = 0;
    let holdPhases = new Set<string>();
    for (let i = 0; i < 60 * 130 && e.getPhase() !== 'SUMMARY'; i++) {
      const s = e.snapshot();
      if (s.phase === 'CARBON_SELECTION') e.selectCarbonGroup(name === 'methane' ? 0 : name === 'ethane' ? 2 : 2);
      if ((s.phase === 'HYDROGEN_SELECTION' || s.phase === 'HYDROGEN_COLLECTION') && !s.web.active && s.heldIds.length === 0 && !s.paper.loadedAtomId) {
        const free = s.hydrogenRowIds.find((id) => { const a = s.molecule.atoms.find((x) => x.id === id)!; return a.state === 'free' && a.family === 'blue'; });
        if (free) e.fireWeb(free);
      }
      // tick with a zero/NaN delta while holding: does the hold ever drain?
      if (s.holding) { e.tick(0); e.tick(NaN); e.tick(-5); }
      e.tick(step);
      const s2 = e.snapshot();
      if (s2.holding) { cur++; holdPhases.add(s2.phase); } else cur = 0;
      worst = Math.max(worst, cur);
    }
    console.log(`  ${name}: longest hold ${worst} frames (${(worst * step).toFixed(0)}ms) in ${[...holdPhases].join('/')}, final phase ${e.getPhase()}`);
  }
  // a hold with a zero-delta tick storm: the clock must not advance and the
  // hold must not expire on nothing
  const z = new GameEngine(ALKANE_CHALLENGES.methane);
  z.start();
  z.selectCarbonGroup(0);
  while (!z.snapshot().holding) z.tick(step);
  const t0 = z.snapshot().timeRemaining;
  for (let i = 0; i < 200000; i++) z.tick(0);
  console.log(`  200k zero-deltas during a hold: still holding=${z.snapshot().holding} timeRemaining ${t0} -> ${z.snapshot().timeRemaining}`);
  for (let i = 0; i < 400; i++) z.tick(step);
  console.log(`  then 400 real frames: holding=${z.snapshot().holding} phase=${z.getPhase()}`);
}

// ---------------------------------------------------------------- P6
console.log('\n=== P6 snapshot aliasing (A5) ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.methane);
  e.start();
  const a = e.snapshot();
  const b = e.snapshot();
  const aliases = ['molecule', 'paper', 'web', 'session', 'carbonGroups', 'spec', 'hydrogenRowIds'] as const;
  for (const k of aliases) console.log(`  snapshot().${k} identical across calls: ${(a as any)[k] === (b as any)[k]}`);
  console.log(`  snapshot().heldIds identical: ${a.heldIds === b.heldIds}`);
  console.log(`  snapshot().bondTargets identical: ${a.bondTargets === b.bondTargets}`);
  a.molecule.atoms[0].remainingValency = -99;
  a.session.score = 999999;
  a.paper.position.x = NaN;
  const c = e.snapshot();
  console.log(`  after mutating the returned object: engine valency=${c.molecule.atoms[0].remainingValency} score=${c.score} paper.x=${c.paper.position.x}`);
  console.log(`  invariants now: ${invariants(e).map((x) => x.rule).join(',') || 'OK'}`);
}
