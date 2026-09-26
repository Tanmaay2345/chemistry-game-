// PLAYTEST 10: after filling the LEFT carbon first, is the right carbon reachable at all?
// Sweep every aim point on the table and see which (if any) still make a bond.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;

function stuckEthane() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 600 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fams = e.snapshot().hydrogenRowIds.map((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family);
  const blues = e.snapshot().hydrogenRowIds.filter((_, i) => fams[i] === 'blue');
  for (const id of blues.slice(0, 6)) { e.fireWeb(id); for (let i = 0; i < 300 && e.snapshot().web.active; i++) e.tick(step); }
  // fill the LEFT carbon completely - the natural "do one, then the other" plan
  for (let n = 0; n < 3; n++) {
    const left = e.snapshot().molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[0];
    e.throwAt({ ...left.position });
    for (let i = 0; i < 400; i++) e.tick(step);
  }
  return e;
}

const probe = stuckEthane();
const ps = probe.snapshot();
const right = ps.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').sort((a, b) => a.position.x - b.position.x)[1];
console.log('state: left carbon full, right carbon has', right.remainingValency, 'free slots at', right.position);
console.log('bonded hydrogens sit at:', ps.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').map((a) => `${a.id}(${a.position.x.toFixed(0)},${a.position.y.toFixed(0)})`).join(' '));
console.log('held hydrogens still to place:', ps.heldIds.length, '| time left', ps.timeRemaining.toFixed(1));

const hits: string[] = [];
let tried = 0;
for (let x = 160; x <= 1280; x += 40) {
  for (let y = 160; y <= 890; y += 40) {
    const e = stuckEthane();
    const b0 = e.snapshot().molecule.bonds.length;
    if (!e.throwAt({ x, y })) continue;
    tried++;
    for (let i = 0; i < 500; i++) e.tick(step);
    if (e.snapshot().molecule.bonds.length > b0) hits.push(`${x},${y}`);
  }
}
console.log(`\nswept ${tried} aim points across the whole table.`);
console.log(`aim points that produce a bond: ${hits.length} (${((hits.length / tried) * 100).toFixed(1)}% of the table)`);
console.log('they are:', hits.join('  ') || 'NONE - the round is unwinnable');
