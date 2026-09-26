// What actually happens during a missed throw, frame by frame.
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;

function ethaneReady() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  const fam = (id: string) => e.snapshot().molecule.atoms.find((a) => a.id === id)!;
  const blue = e.snapshot().hydrogenRowIds.find((id) => fam(id).family === 'blue')!;
  e.fireWeb(blue);
  for (let i = 0; i < 400 && e.snapshot().web.active; i++) e.tick(step);
  for (let i = 0; i < 60 && !e.snapshot().paper.loadedAtomId; i++) e.tick(step);
  return e;
}

/** Throws at `aim` and reports what the player sees, frame by frame. */
function trace(label: string, aim: { x: number; y: number }) {
  const e = ethaneReady();
  const events: string[] = [];
  e.bus.on((ev) => events.push(`${ev.type}@`));
  const id = e.snapshot().paper.loadedAtomId!;
  const start = e.snapshot();
  const bondsBefore = start.molecule.bonds.length;
  e.throwAt(aim);

  let frames = 0;
  let flightFrames = 0;
  let rollFrames = 0;
  let lastSpeed = 0;
  let inputBlocked = 0;
  const cards = new Set<string>();
  const speeds: number[] = [];
  while (frames < 1200) {
    e.tick(step);
    frames++;
    const s = e.snapshot();
    const atom = s.molecule.atoms.find((a) => a.id === id)!;
    const speed = Math.hypot(atom.velocity.x, atom.velocity.y);
    if (speed > 0) {
      speeds.push(speed);
      if (s.flyingId === id) flightFrames++;
      else rollFrames++;
    }
    if (!e.canThrow()) inputBlocked++;
    const card = projectScene(s).panel;
    cards.add(`${card.title} | ${card.body}${card.note ? ` | NOTE: ${card.note}` : ''}`);
    lastSpeed = speed;
    if (s.flyingId === null && s.molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0)) break;
  }
  const s = e.snapshot();
  console.log(`\n--- ${label}  aim (${aim.x}, ${aim.y})`);
  console.log(`   total ${frames} frames = ${(frames / 60).toFixed(2)}s   bonded: ${s.molecule.bonds.length > bondsBefore}`);
  console.log(`   as a flying atom: ${flightFrames} frames (${(flightFrames / 60).toFixed(2)}s)`);
  console.log(`   after it stopped flying: ${rollFrames} frames (${(rollFrames / 60).toFixed(2)}s)`);
  console.log(`   speed at the end: ${lastSpeed.toFixed(1)} px/s   rest threshold: ${DEFAULT_RULES.physics.restSpeed}`);
  console.log(`   peak speed: ${Math.max(0, ...speeds).toFixed(0)} px/s`);
  console.log(`   frames where canThrow() was false: ${inputBlocked} (${((inputBlocked / frames) * 100).toFixed(0)}%)`);
  console.log(`   distinct cards seen: ${cards.size}`);
  for (const c of cards) console.log(`      "${c}"`);
  console.log(`   events: ${[...new Set(events)].join(' ')}`);
  return frames / 60;
}

console.log('rules: friction', DEFAULT_RULES.physics.friction, '| chainFriction', DEFAULT_RULES.physics.chainFriction,
  '| restSpeed', DEFAULT_RULES.physics.restSpeed, '| restitution', DEFAULT_RULES.physics.restitution,
  '| rangeFactor', DEFAULT_RULES.physics.throwRangeFactor);

trace('short miss (just past the paper)', { x: 330, y: 700 });
trace('normal miss (below the chain)', { x: 600, y: 700 });
trace('long miss (far corner)', { x: 1270, y: 200 });
trace('miss into the left edge', { x: 160, y: 300 });
trace('bounce off a full carbon', { x: 492, y: 467 });
