// Attack 7: timeout mid-flight, tray/paper duplication, rigid-body under bounce, deeper fuzz.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { invariants } from './invariants.ts';

const step = DEFAULT_RULES.physics.stepMs;

console.log('=== A7.1 timer expires while an atom is genuinely in the air ===');
{
  // Find the frame at which the timer will expire, then throw just before it.
  for (const lead of [0.05, 0.1, 0.2, 0.3, 0.5]) {
    const e = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 20 });
    e.start();
    e.selectCarbonGroup(0);
    while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
    e.fireWeb(e.snapshot().hydrogenRowIds[0]);
    for (let i = 0; i < 120; i++) e.tick(step);
    while (e.snapshot().timeRemaining > lead) e.tick(step);
    const thrown = e.throwAt({ x: 592, y: 467 }); // aim at the carbon: a slow, in-bounds flight
    const flyingBefore = e.snapshot().flyingId;
    for (let i = 0; i < 300; i++) e.tick(step);
    const s = e.snapshot();
    const atom = s.molecule.atoms.find((a) => a.id === flyingBefore);
    console.log(`  lead=${lead}s thrown=${thrown} -> phase=${e.getPhase()} flyingId=${s.flyingId} atomState=${atom?.state} atomVel=${JSON.stringify(atom?.velocity)}`);
    const v = invariants(e);
    for (const x of v) console.log(`     !! [${x.rule}] ${x.detail}`);
  }
}

console.log('\n=== A7.2 the loaded atom is ALSO still listed in heldIds (tray) ===');
{
  const e = new GameEngine(ALKANE_CHALLENGES.methane);
  e.start();
  e.selectCarbonGroup(0);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  for (const id of e.snapshot().hydrogenRowIds.slice(0, 3)) { e.fireWeb(id); for (let i = 0; i < 150; i++) e.tick(step); }
  const s = e.snapshot();
  const loaded = s.paper.loadedAtomId!;
  const atom = s.molecule.atoms.find((a) => a.id === loaded)!;
  console.log(`  heldIds = ${JSON.stringify(s.heldIds)}`);
  console.log(`  paper.loadedAtomId = ${loaded}`);
  console.log(`  loaded atom is also in heldIds: ${s.heldIds.includes(loaded)}  <- drawn in the tray AND on the paper`);
  console.log(`  loaded atom state = ${atom.state}  position = ${JSON.stringify(atom.position)}  paper = ${JSON.stringify(s.paper.position)}`);
  console.log(`  tray slot it would be drawn in = index ${s.heldIds.indexOf(loaded)}`);
}

console.log('\n=== A7.3 rigid body: does a bonded atom ever get bounced out of its molecule? ===');
{
  // Throw repeatedly at a built molecule and watch C-C / C-H distances.
  const e = new GameEngine(ALKANE_CHALLENGES.propane);
  e.start();
  e.selectCarbonGroup(2);
  while (e.getPhase() !== 'HYDROGEN_SELECTION') e.tick(step);
  let worstCC = 0, worstCH = 0, at = '';
  const spacing = e.rules.physics.chainSpacing;
  for (let round = 0; round < 60; round++) {
    const s = e.snapshot();
    if (!s.paper.loadedAtomId && !s.web.active && s.heldIds.length === 0) {
      const free = s.hydrogenRowIds.find((id) => s.molecule.atoms.find((a) => a.id === id)!.state === 'free');
      if (free) e.fireWeb(free);
    }
    if (e.canThrow() && s.paper.loadedAtomId) {
      const cs = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free');
      const t = cs[round % Math.max(1, cs.length)];
      if (t) e.throwAt({ x: t.position.x, y: t.position.y });
    }
    for (let i = 0; i < 40; i++) {
      e.tick(step);
      const m = e.snapshot();
      if (m.carbonImpact) continue;
      for (const b of m.molecule.bonds) {
        const a1 = m.molecule.atoms.find((x) => x.id === b.a)!;
        const a2 = m.molecule.atoms.find((x) => x.id === b.b)!;
        const d = Math.hypot(a1.position.x - a2.position.x, a1.position.y - a2.position.y);
        if (a1.element === 'C' && a2.element === 'C') {
          if (Math.abs(d - spacing) > worstCC) { worstCC = Math.abs(d - spacing); at = `${b.id} d=${d.toFixed(1)}`; }
        } else if (Math.abs(d - e.rules.physics.bondLength) > worstCH) {
          worstCH = Math.abs(d - e.rules.physics.bondLength);
        }
      }
    }
  }
  const s = e.snapshot();
  console.log(`  worst C-C deviation from chainSpacing(${spacing}): ${worstCC.toFixed(3)} px  ${at}`);
  console.log(`  worst C-H deviation from bondLength(${e.rules.physics.bondLength}): ${worstCH.toFixed(3)} px`);
  console.log(`  final: phase=${e.getPhase()} bonds=${s.molecule.bonds.length} misses=${s.session.missedThrows} collisions=${s.session.successfulCollisions}/${s.session.unsuccessfulCollisions}`);
  for (const x of invariants(e)) console.log(`     !! [${x.rule}] ${x.detail}`);
}

console.log('\n=== A7.4 deep fuzz (SUMMARY_WITH_FLYER filtered out) ===');
{
  function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const MOL = ['methane', 'ethane', 'propane'];
  const fails: string[] = [];
  const stuck = new Map<string, number>();
  let steps = 0;
  for (let seed = 1; seed <= 1200; seed++) {
    const r = rng(seed * 7919);
    const m = MOL[Math.floor(r() * 3)];
    const e = new GameEngine(ALKANE_CHALLENGES[m]);
    const trace: string[] = [];
    const act = (x: string) => { trace.push(x); if (trace.length > 16) trace.shift(); };
    e.start();
    for (let i = 0; i < 7500; i++) {
      steps++;
      const roll = r();
      const s = e.snapshot();
      const pt = () => ({ x: 120 + r() * 1180, y: 120 + r() * 800 });
      if (roll < 0.07) { const p = pt(); act('throwPaperAt'); e.throwPaperAt(p); }
      else if (roll < 0.12) { const g = Math.floor(r() * 4); act(`sel(${g})`); e.selectCarbonGroup(g); }
      else if (roll < 0.20) { const id = s.hydrogenRowIds[Math.floor(r() * s.hydrogenRowIds.length)]; act(`web(${id})`); e.fireWeb(id); }
      else if (roll < 0.30) {
        // sometimes aim at a real target so molecules actually get built
        const cs = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free');
        const p = cs.length && r() < 0.6 ? { ...cs[Math.floor(r() * cs.length)].position } : pt();
        act('throwAt'); e.throwAt(p);
      } else if (roll < 0.33) { act('aim'); e.aim(pt()); }
      e.tick(step);
      const v = invariants(e).filter((x) => x.rule !== 'SUMMARY_WITH_FLYER');
      if (v.length) { fails.push(`seed=${seed} ${m} step=${i} phase=${e.getPhase()}\n     ${v.map((x) => `[${x.rule}] ${x.detail}`).join('\n     ')}\n     trace: ${trace.join(' ')}`); break; }
      if (e.getPhase() === 'SUMMARY') break;
    }
    if (e.getPhase() !== 'SUMMARY') stuck.set(e.getPhase(), (stuck.get(e.getPhase()) ?? 0) + 1);
  }
  console.log(`  1200 runs, ${steps} steps. failures=${fails.length}`);
  console.log(`  runs not reaching SUMMARY inside 125s: ${JSON.stringify(Object.fromEntries(stuck))}`);
  for (const f of fails.slice(0, 8)) console.log('   ' + f);
}
