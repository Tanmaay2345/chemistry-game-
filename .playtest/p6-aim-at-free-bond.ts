// PLAYTEST 6: the card says "Aim at a free bond." Does aiming at a free bond work?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;

function ready(name: string) {
  const e = new GameEngine(ALKANE_CHALLENGES[name]);
  e.start();
  const spec = e.snapshot().spec;
  const idx = ALKANE_CHALLENGES[name].carbonGroups.findIndex((g) => g.length === spec.carbonCount && g.every((f) => f === 'blue'));
  e.selectCarbonGroup(idx);
  for (let i = 0; i < 400 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fams = e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
  const blues = e.snapshot().hydrogenRowIds.filter((_, i) => fams[i] === 'blue');
  for (const id of blues.slice(0, spec.hydrogenCount)) {
    e.fireWeb(id);
    for (let i = 0; i < 200 && e.snapshot().web.active; i++) e.tick(step);
  }
  return e;
}

/** Exactly the slot markers projectScene draws: a stub from r=46 to r=110. */
function drawnSlots(e: GameEngine) {
  const m = e.snapshot().molecule;
  const out: { carbon: string; angle: number; near: { x: number; y: number }; far: { x: number; y: number } }[] = [];
  for (const atom of m.atoms) {
    if (atom.element !== 'C' || atom.state === 'free' || atom.state === 'held') continue;
    const taken = m.bonds.filter((b) => b.a === atom.id || b.b === atom.id)
      .map((b) => m.atoms.find((x) => x.id === (b.a === atom.id ? b.b : b.a))!)
      .map((o) => (Math.atan2(o.position.y - atom.position.y, o.position.x - atom.position.x) * 180) / Math.PI);
    const free = [0, -90, 180, 90].filter((a) => taken.every((u) => Math.abs(((u - a + 540) % 360) - 180) > 30));
    free.slice(0, atom.remainingValency).forEach((angle) => {
      const r = (angle * Math.PI) / 180;
      out.push({
        carbon: atom.id, angle,
        near: { x: atom.position.x + Math.cos(r) * 46, y: atom.position.y + Math.sin(r) * 46 },
        far: { x: atom.position.x + Math.cos(r) * 110, y: atom.position.y + Math.sin(r) * 110 },
      });
    });
  }
  return out;
}

for (const name of ['ethane', 'propane']) {
  console.log(`\n================ ${name.toUpperCase()}: one throw per drawn free-bond marker ================`);
  const probe = ready(name);
  const slots = drawnSlots(probe);
  console.log('markers the renderer draws:', slots.map((s) => `${s.carbon}@${s.angle}`).join(' '));
  for (const where of ['far', 'near'] as const) {
    const results: string[] = [];
    for (const slot of slots) {
      // fresh game each time: aim ONE hydrogen at exactly this marker
      const e = ready(name);
      const target = e.snapshot().molecule.atoms.find((a) => a.id === slot.carbon)!;
      const r = (slot.angle * Math.PI) / 180;
      const point = where === 'far'
        ? { x: target.position.x + Math.cos(r) * 110, y: target.position.y + Math.sin(r) * 110 }
        : { x: target.position.x + Math.cos(r) * 46, y: target.position.y + Math.sin(r) * 46 };
      const before = e.snapshot().molecule.bonds.length;
      let reason = '';
      e.bus.on((ev) => { if (ev.type === 'THROW_MISSED') reason = ev.reason; });
      e.throwAt(point);
      for (let i = 0; i < 600; i++) e.tick(step);
      const s = e.snapshot();
      const bonded = s.molecule.bonds.length > before;
      const landedOn = bonded ? s.molecule.bonds[s.molecule.bonds.length - 1] : null;
      results.push(`${slot.carbon}@${String(slot.angle).padStart(4)} -> ${bonded ? `BOND (onto ${landedOn!.a === s.paper.loadedAtomId ? landedOn!.b : [landedOn!.a, landedOn!.b].find((x) => x.startsWith('c'))})` : `NO BOND (${reason})`}`);
    }
    console.log(`  aiming at the ${where.toUpperCase()} end of the marker (r=${where === 'far' ? 110 : 46}):`);
    for (const r of results) console.log('    ', r);
  }
}

// And: does aiming at the carbon's own centre (which draws NO marker) work?
console.log('\n=== aiming at the carbon centre, where no marker is drawn ===');
for (const name of ['ethane', 'propane']) {
  const e = ready(name);
  const cs = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x);
  for (const c of cs) {
    const g = ready(name);
    const t = g.snapshot().molecule.atoms.find((a) => a.id === c.id)!;
    const b0 = g.snapshot().molecule.bonds.length;
    g.throwAt({ ...t.position });
    for (let i = 0; i < 600; i++) g.tick(step);
    console.log(`  ${name} ${c.id} centre -> ${g.snapshot().molecule.bonds.length > b0 ? 'BOND' : 'no bond'}`);
  }
}
