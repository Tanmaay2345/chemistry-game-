// Attack 4: event integrity + full playthroughs + timer-boundary interrupts.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;
const CHAIN_Y = 467;

function play(molecule: string, opts: { seconds?: number } = {}) {
  const e = new GameEngine(ALKANE_CHALLENGES[molecule]);
  const log: GameEvent[] = [];
  const perStep: { i: number; v: string[] }[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  const spec = e.spec;
  // pick the all-blue group of the right size
  const idx = e.snapshot().carbonGroups.findIndex((g) => g.atomIds.length === spec.carbonCount);
  e.selectCarbonGroup(idx);
  let i = 0;
  const limit = ((opts.seconds ?? 115) * 1000) / step;
  while (i++ < limit && e.getPhase() !== 'SUMMARY') {
    e.tick(step);
    const v = invariants(e);
    if (v.length && perStep.length < 3) perStep.push({ i, v: v.map((x) => `[${x.rule}] ${x.detail}`) });
    const s = e.snapshot();
    if ((s.phase === 'HYDROGEN_SELECTION' || s.phase === 'HYDROGEN_COLLECTION') && !s.web.active && !s.paper.loadedAtomId) {
      const free = s.hydrogenRowIds.find((id) => {
        const a = s.molecule.atoms.find((x) => x.id === id)!;
        return a.state === 'free' && a.family === 'blue';
      });
      if (free) e.fireWeb(free);
    }
    if (e.canThrow() && s.paper.loadedAtomId) {
      // aim at the nearest carbon that still has a free slot
      const target = s.molecule.atoms
        .filter((a) => a.element === 'C' && (a.state === 'placed' || a.state === 'bonded') && a.remainingValency > 0)
        .sort((a, b) => a.position.x - b.position.x)[0];
      if (target) e.throwAt({ x: target.position.x, y: target.position.y });
    }
  }
  return { e, log, perStep };
}

for (const m of ['methane', 'ethane', 'propane']) {
  const { e, log, perStep } = play(m);
  const s = e.snapshot();
  console.log(`=== ${m} ===`);
  console.log(`  phase=${e.getPhase()} completion=${s.session.completionStatus} score=${s.score} bonds=${s.molecule.bonds.length} time=${s.timeRemaining.toFixed(1)}`);
  console.log(`  invariant violations during play: ${perStep.length ? JSON.stringify(perStep[0]) : 'none'}`);

  // Event integrity: BOND_CREATED must follow an ATOM_COLLISION
  let lastCollisionAt = -1;
  const orphanBonds: number[] = [];
  log.forEach((ev, i) => {
    if (ev.type === 'ATOM_COLLISION') lastCollisionAt = i;
    if (ev.type === 'BOND_CREATED' && lastCollisionAt < 0) orphanBonds.push(i);
  });
  console.log(`  BOND_CREATED with no preceding ATOM_COLLISION: ${orphanBonds.length}`);

  // duplicate bond events for the same pair
  const bondKeys = log.filter((x) => x.type === 'BOND_CREATED').map((x: any) => [x.a, x.b].sort().join('|'));
  const dupes = bondKeys.filter((k, i) => bondKeys.indexOf(k) !== i);
  console.log(`  duplicate BOND_CREATED: ${dupes.length ? JSON.stringify(dupes) : 'none'}  (bonds in molecule: ${s.molecule.bonds.length}, BOND_CREATED events: ${bondKeys.length})`);

  // PHASE_CHANGED trail vs. actual final phase
  const phaseEvents = log.filter((x) => x.type === 'PHASE_CHANGED') as any[];
  const lastAnnounced = phaseEvents.length ? phaseEvents[phaseEvents.length - 1].to : '(none)';
  console.log(`  last PHASE_CHANGED announced "${lastAnnounced}" but engine phase is "${e.getPhase()}"  -> silent transition: ${lastAnnounced !== e.getPhase()}`);

  // adjacency check: every PHASE_CHANGED must chain from the previous one
  let broken = 0;
  for (let i = 1; i < phaseEvents.length; i++) if (phaseEvents[i].from !== phaseEvents[i - 1].to) broken++;
  console.log(`  PHASE_CHANGED chain breaks: ${broken}`);
  const v = invariants(e);
  for (const x of v) console.log(`    !! [${x.rule}] ${x.detail}`);
}
