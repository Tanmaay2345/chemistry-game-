// Attack 5: real playthroughs to completion + timer-boundary interrupts + exhaustion.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;

function blueGroup(e: GameEngine): number {
  const s = e.snapshot();
  return s.carbonGroups.findIndex(
    (g) => g.atomIds.length === e.spec.carbonCount && g.atomIds.every((id) => s.molecule.atoms.find((a) => a.id === id)!.family === 'blue'),
  );
}

function bot(molecule: string, seconds = 118) {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  e.selectCarbonGroup(blueGroup(e));
  const bad: string[] = [];
  let i = 0;
  const limit = (seconds * 1000) / step;
  while (i++ < limit && e.getPhase() !== 'SUMMARY') {
    e.tick(step);
    const v = invariants(e, `t=${(i * step / 1000).toFixed(2)}s`);
    if (v.length && bad.length < 5) for (const x of v) bad.push(`[${x.rule}] ${x.detail}`);
    const s = e.snapshot();
    if ((s.phase === 'HYDROGEN_SELECTION' || s.phase === 'HYDROGEN_COLLECTION') && !s.web.active && !s.paper.loadedAtomId && s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.find((id) => {
        const a = s.molecule.atoms.find((x) => x.id === id)!;
        return a.state === 'free' && a.family === 'blue';
      });
      if (free) { e.fireWeb(free); continue; }
    }
    if (e.canThrow() && s.paper.loadedAtomId) {
      const target = s.molecule.atoms
        .filter((a) => a.element === 'C' && (a.state === 'placed' || a.state === 'bonded') && a.remainingValency > 0)
        .sort((a, b) => b.remainingValency - a.remainingValency)[0];
      if (target) e.throwAt({ x: target.position.x, y: target.position.y });
    }
  }
  return { e, log, bad, frames: i };
}

for (const m of ['methane', 'ethane', 'propane']) {
  const { e, log, bad, frames } = bot(m);
  const s = e.snapshot();
  const phases = (log.filter((x) => x.type === 'PHASE_CHANGED') as any[]);
  console.log(`=== ${m}: phase=${e.getPhase()} completion=${s.session.completionStatus} bonds=${s.molecule.bonds.length}/${e.spec.chainBonds.length + e.spec.hydrogenCount} score=${s.score} time=${s.timeRemaining.toFixed(1)} frames=${frames}`);
  console.log(`    invariant violations: ${bad.length ? bad.join(' | ') : 'none'}`);
  console.log(`    last announced phase "${phases.at(-1)?.to}" vs actual "${e.getPhase()}"`);
  console.log(`    events: throws=${s.session.throws} misses=${s.session.missedThrows} collisions=${s.session.successfulCollisions}/${s.session.unsuccessfulCollisions} bestChain=${s.session.bestCollisionChain}`);
  console.log(`    summary: ${s.summary ? JSON.stringify({ completion: s.summary.completion, notes: s.summary.notes.length }) : 'null'}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
}

console.log('\n=== A5.x TIMER EXPIRY AT EXACT MOMENTS ===');
function runTo(e: GameEngine, secs: number) { for (let i = 0; i < (secs * 1000) / step; i++) e.tick(step); }

// expire during PAPER_FLIGHT
{
  const e = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 2 });
  e.start();
  runTo(e, 1.9);
  e.selectCarbonGroup(2);
  runTo(e, 1);
  const s = e.snapshot();
  console.log(`  expire during PAPER_FLIGHT -> phase=${e.getPhase()} completion=${s.session.completionStatus} paper.mode=${s.paper.mode} paper.vel=${JSON.stringify(s.paper.velocity)} impact=${s.carbonImpact ? s.carbonImpact.stage : 'null'}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
}
// expire during CARBON_IMPACT
{
  const e = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 2 });
  e.start();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'CARBON_IMPACT') e.tick(step);
  runTo(e, 3);
  const s = e.snapshot();
  console.log(`  expire during CARBON_IMPACT -> phase=${e.getPhase()} impactView=${s.carbonImpact ? s.carbonImpact.stage : 'null'} bonds=${s.molecule.bonds.length}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
}
// expire during a web reel-in
{
  const e = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 4 });
  e.start();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  runTo(e, 3.4);
  e.fireWeb(e.snapshot().hydrogenRowIds[0]);
  e.tick(step); e.tick(step);
  const mid = e.snapshot();
  runTo(e, 2);
  const s = e.snapshot();
  console.log(`  expire during web reel-in -> phase=${e.getPhase()} web.active=${s.web.active} target=${s.web.targetAtomId} progress=${s.web.progress.toFixed(2)} (was ${mid.web.progress.toFixed(2)})`);
  const stranded = s.molecule.atoms.find((a) => a.id === s.web.targetAtomId);
  console.log(`  webbed atom state=${stranded?.state} pos=${JSON.stringify(stranded?.position)}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
}
// expire during a throw in flight
{
  const e = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 6 });
  e.start();
  e.selectCarbonGroup(0);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  e.fireWeb(e.snapshot().hydrogenRowIds[0]);
  for (let i = 0; i < 120; i++) e.tick(step);
  runTo(e, 5.4);
  e.throwAt({ x: 1200, y: 200 });
  console.log(`  thrown, flying=${e.snapshot().flyingId}`);
  runTo(e, 2);
  const s = e.snapshot();
  console.log(`  expire mid-flight -> phase=${e.getPhase()} flyingId=${s.flyingId} atom state=${s.molecule.atoms.find((a) => a.id === 'h11')?.state}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
}

console.log('\n=== A5.y EXHAUSTION: collect every hydrogen, throw them all, throw with nothing held ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.methane);
  e.start();
  e.selectCarbonGroup(0);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  let collected = 0;
  for (const id of e.snapshot().hydrogenRowIds) {
    if (e.fireWeb(id)) { collected++; for (let i = 0; i < 200; i++) e.tick(step); }
  }
  const s = e.snapshot();
  console.log(`  collected ${collected}/13 hydrogens. heldIds=${s.heldIds.length} phase=${e.getPhase()} loaded=${s.paper.loadedAtomId}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
  // throw them all at nothing
  let thrown = 0;
  for (let k = 0; k < 40; k++) {
    if (e.canThrow() && e.snapshot().paper.loadedAtomId) { e.throwAt({ x: 1280, y: 890 }); thrown++; }
    for (let i = 0; i < 90; i++) e.tick(step);
  }
  const s2 = e.snapshot();
  console.log(`  after ${thrown} throws: phase=${e.getPhase()} held=${s2.heldIds.length} bonds=${s2.molecule.bonds.length} misses=${s2.session.missedThrows} time=${s2.timeRemaining.toFixed(1)}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
  // throw with nothing held
  let junk = 0;
  for (let k = 0; k < 100; k++) if (e.throwAt({ x: 600, y: 400 })) junk++;
  console.log(`  throwAt with nothing loaded accepted ${junk} times (expected 0)`);
}

console.log('\n=== A5.z 120s of ticks with no input at all ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  for (let i = 0; i < 60 * 130; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`  phase=${e.getPhase()} completion=${s.session.completionStatus} time=${s.timeRemaining} events=${log.map((x) => x.type).join(',')}`);
  for (const x of invariants(e)) console.log(`    !! [${x.rule}] ${x.detail}`);
}
