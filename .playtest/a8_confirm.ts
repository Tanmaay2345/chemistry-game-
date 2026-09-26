// Attack 8: confirm the consequences of the findings.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';

const step = DEFAULT_RULES.physics.stepMs;

console.log('=== A8.1 COMPLETION -> SUMMARY is a SILENT phase change on every finished game ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.methane);
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  e.selectCarbonGroup(0);
  for (let i = 0; i < 7000 && e.getPhase() !== 'SUMMARY'; i++) {
    e.tick(step);
    const s = e.snapshot();
    if ((s.phase === 'HYDROGEN_SELECTION' || s.phase === 'HYDROGEN_COLLECTION') && !s.web.active && !s.paper.loadedAtomId && s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.find((id) => { const a = s.molecule.atoms.find((x) => x.id === id)!; return a.state === 'free' && a.family === 'blue'; });
      if (free) e.fireWeb(free);
    }
    if (e.canThrow() && s.paper.loadedAtomId) {
      const t = s.molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free' && a.remainingValency > 0);
      if (t) e.throwAt({ x: t.position.x, y: t.position.y });
    }
  }
  const tail = log.filter((x) => x.type === 'PHASE_CHANGED' || x.type === 'MOLECULE_COMPLETED').slice(-4);
  console.log('  last events:', tail.map((x: any) => x.type === 'PHASE_CHANGED' ? `PHASE_CHANGED ${x.from}->${x.to}` : x.type).join(' | '));
  console.log('  engine.getPhase() =', e.getPhase());
  console.log('  => nothing ever announces the move to SUMMARY. A UI driven by PHASE_CHANGED never shows the summary screen.');
}

console.log('\n=== A8.2 TIMEOUT -> SUMMARY: same silence, plus the flying atom leak ===');
{
  const e = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 20 });
  const log: GameEvent[] = [];
  e.bus.on((x) => log.push(x));
  e.start();
  e.selectCarbonGroup(0);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  e.fireWeb(e.snapshot().hydrogenRowIds[0]);
  for (let i = 0; i < 120; i++) e.tick(step);
  while (e.snapshot().timeRemaining > 0.1) e.tick(step);
  e.throwAt({ x: 592, y: 467 });
  for (let i = 0; i < 300; i++) e.tick(step);
  const s = e.snapshot();
  console.log('  tail:', log.filter((x) => x.type === 'PHASE_CHANGED' || x.type === 'TIMEOUT').slice(-3).map((x: any) => x.type === 'PHASE_CHANGED' ? `PHASE_CHANGED ${x.from}->${x.to}` : x.type).join(' | '));
  console.log('  phase =', e.getPhase(), ' flyingId =', s.flyingId);
  // Guarded after the fix: finish() now drains the flyer, so flyingId is null
  // here and this line used to throw. The absence of an atom IS the result.
  const a = s.molecule.atoms.find((x) => x.id === s.flyingId);
  if (a) {
    console.log(`  atom ${a.id}: state=${a.state} velocity=${JSON.stringify(a.velocity)} position=${JSON.stringify(a.position)}`);
    console.log('  => an atom frozen mid-air on the summary screen, counted as "collected".');
  } else {
    console.log('  => nothing left in flight on the summary screen.');
  }
  console.log(`  summary screen reports hydrogenCollected = ${s.hydrogenCollected}  (bonded hydrogens = ${s.molecule.atoms.filter((x) => x.element === 'H' && x.state === 'bonded').length})`);
}

console.log('\n=== A8.3 the paper-return race: re-throw within 300ms of a wrong-group hit ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(0); // blue+red -> wrong
  while (e.getPhase() !== 'CARBON_SELECTION') e.tick(step);
  console.log('  wrong strike done. paper.mode =', e.snapshot().paper.mode, '(RETURNING for 300ms) but phase is', e.getPhase(), 'so input is accepted');
  e.selectCarbonGroup(2); // the correct group
  console.log('  re-thrown at the CORRECT group (index 2). paper.mode =', e.snapshot().paper.mode, '<- setMode(THROW) was silently REJECTED (RETURNING cannot enter THROW)');
  let jumped = '';
  let prev = { ...e.snapshot().paper.position };
  for (let i = 0; i < 120; i++) {
    e.tick(step);
    const p = e.snapshot().paper.position;
    const d = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (d > 60 && !jumped) jumped = `frame ${i}: paper TELEPORTED ${d.toFixed(0)}px from (${prev.x.toFixed(0)},${prev.y.toFixed(0)}) to (${p.x.toFixed(0)},${p.y.toFixed(0)}) while phase=${e.getPhase()}`;
    prev = { ...p };
  }
  console.log('  ' + (jumped || 'no teleport'));
  for (let i = 0; i < 900; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`  outcome: phase=${e.getPhase()} bonds=${s.molecule.bonds.length} carbonSelections=${JSON.stringify(s.session.carbonSelections.map((x) => x.correct))}`);
  console.log('  => the player aimed at the right group, the paper was yanked home mid-flight, and the throw was scored as another WRONG pick.');
}

console.log('\n=== A8.4 the same race, measured: how often does a fast retry get stolen? ===');
{
  let stolen = 0, fine = 0;
  for (let delay = 0; delay < 30; delay++) {
    const e = new GameEngine(ALKANE_CHALLENGES.ethane);
    e.start();
    e.selectCarbonGroup(0);
    while (e.getPhase() !== 'CARBON_SELECTION') e.tick(step);
    for (let i = 0; i < delay; i++) e.tick(step);
    e.selectCarbonGroup(2);
    const modeOk = e.snapshot().paper.mode === 'THROW';
    for (let i = 0; i < 900; i++) e.tick(step);
    const correct = e.snapshot().session.carbonSelections.slice(1).some((x) => x.correct);
    if (!modeOk || !correct) stolen++; else fine++;
    if (delay % 6 === 0) console.log(`  retry after ${(delay * step).toFixed(0)}ms: paper.mode=${modeOk ? 'THROW' : 'WRONG'} second pick correct=${correct}`);
  }
  console.log(`  retries broken: ${stolen}/30 (every retry inside the 300ms return window)`);
}
