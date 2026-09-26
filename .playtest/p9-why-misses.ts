// PLAYTEST 9: why do so many throws fail once hydrogens start piling on?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const e = new GameEngine(ALKANE_CHALLENGES.ethane);
e.start();
e.selectCarbonGroup(2);
for (let i = 0; i < 600 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
const fams = e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
const blues = e.snapshot().hydrogenRowIds.filter((_, i) => fams[i] === 'blue');
for (const id of blues.slice(0, 6)) { e.fireWeb(id); for (let i = 0; i < 300 && e.snapshot().web.active; i++) e.tick(step); }

const log: string[] = [];
e.bus.on((ev) => {
  if (ev.type === 'ATOM_COLLISION') log.push(`  collision ${ev.movingId} -> ${ev.struckId} bonded=${ev.bonded}`);
  if (ev.type === 'THROW_MISSED') log.push(`  MISSED ${ev.atomId} (${ev.reason})`);
  if (ev.type === 'BOND_CREATED') log.push(`  BOND ${ev.a}-${ev.b}`);
});

for (let n = 1; n <= 14 && e.getPhase() !== 'SUMMARY'; n++) {
  const s = e.snapshot();
  const loaded = s.paper.loadedAtomId;
  if (!loaded) { for (let i = 0; i < 20; i++) e.tick(step); continue; }
  const cs = s.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free' && a.remainingValency > 0);
  const target = cs[0];
  log.length = 0;
  console.log(`throw ${n}: ${loaded} at ${target.id} centre (${target.position.x.toFixed(0)},${target.position.y.toFixed(0)}) remainingValency=${target.remainingValency}`);
  console.log('   carbon slot occupancy:', cs.map((c) => `${c.id}:${c.remainingValency}`).join(' '),
    '| bonded H at:', s.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').map((a) => `${a.id}(${(Math.atan2(a.position.y - target.position.y, a.position.x - target.position.x) * 180 / Math.PI).toFixed(0)}deg,d=${Math.hypot(a.position.x - target.position.x, a.position.y - target.position.y).toFixed(0)})`).join(' '));
  e.throwAt({ ...target.position });
  for (let i = 0; i < 400 && e.getPhase() !== 'SUMMARY'; i++) e.tick(step);
  console.log(log.join('\n') || '   (nothing happened)');
  console.log(`   -> bondedH ${e.snapshot().molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length}/6, time ${e.snapshot().timeRemaining.toFixed(1)}`);
}
