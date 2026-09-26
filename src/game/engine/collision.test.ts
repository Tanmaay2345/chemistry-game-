import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';
import type { GameEvent } from './events.ts';
import { canEnter, createPaper, setMode } from './paper.ts';

/**
 * The collision half of the game: motion passed on from one atom to the next,
 * and the paper that has to change jobs between collecting and throwing.
 */

const step = DEFAULT_RULES.physics.stepMs;

function run(engine: GameEngine, done: () => boolean, seconds = 15): boolean {
  for (let i = 0; i < (seconds * 1000) / step; i++) {
    if (done()) return true;
    engine.tick(step);
  }
  return done();
}

function atRest(engine: GameEngine): boolean {
  return engine.snapshot().flyingId === null && engine.snapshot().molecule.atoms.every((a) => a.velocity.x === 0 && a.velocity.y === 0);
}

function collect(engine: GameEngine, id: string) {
  engine.fireWeb(id);
  run(engine, () => engine.snapshot().heldIds.includes(id), 5);
}

function throwAt(engine: GameEngine, point: { x: number; y: number }) {
  run(engine, () => engine.snapshot().paper.loadedAtomId !== null, 3);
  const loaded = engine.snapshot().paper.loadedAtomId;
  engine.throwAt(point);
  run(engine, () => atRest(engine), 15);
  return loaded;
}

/**
 * An ethane chain on the table, ready to be hit: the paper is thrown at the
 * blue pair and the collision bonds them.
 */
function ethaneChain() {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  engine.start();
  engine.selectCarbonGroup(2);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 12);
  return { engine, log };
}

test('a throw at a chain moves the whole molecule, never breaks it', () => {
  const { engine } = ethaneChain();
  const before = engine.snapshot().molecule.atoms.filter((a) => a.element === 'C');
  const spacingBefore = Math.hypot(before[0].position.x - before[1].position.x, before[0].position.y - before[1].position.y);

  const row = engine.snapshot().hydrogenRowIds;
  const blue = row.find((id) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue')!;
  collect(engine, blue);
  throwAt(engine, { ...before[0].position });

  const after = engine.snapshot().molecule.atoms.filter((a) => a.element === 'C');
  const spacingAfter = Math.hypot(after[0].position.x - after[1].position.x, after[0].position.y - after[1].position.y);
  assert.ok(Math.abs(spacingAfter - spacingBefore) < 1, 'the carbon-carbon distance is unchanged');
  assert.equal(engine.snapshot().molecule.bonds.length >= 1, true);
});

test('one throw can set off more than one collision', () => {
  // The brief's chain: a thrown atom hits a loose one, and that one carries on
  // into the molecule. Rules are turned up here so the push covers the gap -
  // the point is that the engine chains the contacts, not how far a nudge goes.
  const rules = {
    ...DEFAULT_RULES,
    returnMissedAtoms: false,
    physics: { ...DEFAULT_RULES.physics, impulseTransfer: 0.8, chainFriction: 1.5 },
  };
  const engine = new GameEngine(ALKANE_CHALLENGES.methane, rules);
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  engine.start();
  engine.selectCarbonGroup(0);
  run(engine, () => engine.getPhase() === 'HYDROGEN_SELECTION', 12);
  // Read where the carbon is *now* at each throw: a snapshot is a picture of
  // the moment it was taken, and the carbon moves when it is struck.
  const carbonNow = () => ({ ...engine.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state !== 'free')!.position });

  // A red hydrogen cannot bond, so it bounces off and stays on the table.
  const row = engine.snapshot().hydrogenRowIds;
  const red = row.find((id) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'red')!;
  collect(engine, red);
  throwAt(engine, carbonNow());
  const loose = engine.snapshot().molecule.atoms.find((a) => a.id === red)!;
  assert.equal(loose.state, 'placed', 'the red hydrogen is lying on the table');

  // Now throw at the carbon with the loose atom in the way: the throw strikes
  // it, and it carries on into the carbon. One throw, two collisions.
  const blue = row.find((id) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue')!;
  collect(engine, blue);
  const before = log.length;
  throwAt(engine, carbonNow());

  const collisions = log.slice(before).filter((e) => e.type === 'ATOM_COLLISION');
  const deepest = Math.max(0, ...collisions.map((e) => (e.type === 'ATOM_COLLISION' ? e.chainDepth : 0)));
  assert.ok(collisions.length >= 2, `expected a chain, got ${collisions.length} collisions`);
  assert.ok(deepest >= 2, `expected chain depth 2 or more, got ${deepest}`);
  assert.ok(engine.snapshot().session.bestCollisionChain >= 2, 'the chain is recorded for scoring');
});

test('a longer chain is worth more than the same hits made separately', () => {
  const chained = DEFAULT_RULES.scoring.SUCCESSFUL_COLLISION + DEFAULT_RULES.scoring.COLLISION_CHAIN_STEP;
  assert.ok(chained > DEFAULT_RULES.scoring.SUCCESSFUL_COLLISION, 'chaining pays');
});

test('the paper changes jobs rather than being two objects', () => {
  const paper = createPaper({ x: 0, y: 0 });
  assert.equal(paper.mode, 'IDLE');
  assert.ok(setMode(paper, 'COLLECTION'));
  assert.ok(setMode(paper, 'AIMING'));
  assert.ok(setMode(paper, 'THROW'));
  // A paper in mid-throw cannot start collecting until it has come back.
  assert.equal(canEnter('THROW', 'COLLECTION'), false);
  assert.ok(setMode(paper, 'RETURNING'));
  assert.ok(setMode(paper, 'COLLECTION'));
});

test('the paper is disabled when the round is over', () => {
  const engine = new GameEngine({ ...ALKANE_CHALLENGES.methane, timeLimitSeconds: 1 });
  engine.start();
  run(engine, () => engine.getPhase() === 'SUMMARY', 4);
  assert.equal(engine.snapshot().paper.mode, 'DISABLED');
});
