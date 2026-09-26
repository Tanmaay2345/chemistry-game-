import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../engine/config.ts';
import { GameEngine } from '../engine/engine.ts';
import type { GameEvent } from '../engine/events.ts';
import { soundForEvent } from './eventSounds.ts';
import { SOUNDS } from './sounds.ts';

/**
 * The audio trigger rule, asserted against a real played round.
 *
 * What matters here is not that a sound exists but that it fires once, on the
 * player's actual action, and never on a phase change or an animation.
 */

const step = DEFAULT_RULES.physics.stepMs;

/** Plays a round and returns the sounds in the order they would have fired. */
function soundsFrom(play: (engine: GameEngine, run: (done: () => boolean, seconds?: number) => void) => void) {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const fired: { sound: string; event: GameEvent }[] = [];
  engine.bus.on((event) => {
    const sound = soundForEvent(event);
    if (sound) fired.push({ sound, event });
  });
  const run = (done: () => boolean, seconds = 12) => {
    for (let i = 0; i < (seconds * 1000) / step && !done(); i++) engine.tick(step);
  };
  engine.start();
  play(engine, run);
  return { engine, fired };
}

test('every sound in the map has a file, a gain and a licence on record', () => {
  for (const [name, def] of Object.entries(SOUNDS)) {
    assert.match(def.src, /^\/audio\/.+\.(mp3|ogg|wav)$/, `${name} has a file`);
    assert.ok(def.gain > 0 && def.gain <= 1, `${name} gain is sane`);
    assert.ok(def.maxVoices >= 1, `${name} allows at least one voice`);
    assert.ok(def.credit.url.startsWith('https://'), `${name} records where it came from`);
    assert.ok(def.credit.licenseUrl.startsWith('https://'), `${name} records its licence`);
    assert.equal(def.credit.attributionRequired, false, `${name} needs no credit line`);
  }
});

test('firing the web plays the web throw, once', () => {
  const { fired } = soundsFrom((engine, run) => {
    engine.selectCarbonGroup(2);
    run(() => engine.getPhase() === 'HYDROGEN_SELECTION');
    const row = engine.snapshot().hydrogenRowIds;
    const blue = row.find((id) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue')!;
    engine.fireWeb(blue);
    run(() => engine.snapshot().heldIds.includes(blue), 5);
  });

  const web = fired.filter((f) => f.sound === 'WEB_THROW');
  assert.equal(web.length, 1, 'exactly one web sound for one web');
  assert.equal(web[0].event.type, 'WEB_STARTED');
});

test('one web per collect: five webs, five sounds, no repeats in between', () => {
  const { fired } = soundsFrom((engine, run) => {
    engine.selectCarbonGroup(2);
    run(() => engine.getPhase() === 'HYDROGEN_SELECTION');
    const blues = engine
      .snapshot()
      .hydrogenRowIds.filter((id) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue')
      .slice(0, 5);
    for (const id of blues) {
      engine.fireWeb(id);
      run(() => engine.snapshot().heldIds.includes(id), 5);
    }
  });
  assert.equal(fired.filter((f) => f.sound === 'WEB_THROW').length, 5);
});

test('a web that the engine refuses makes no sound', () => {
  const { engine, fired } = soundsFrom((e, run) => {
    e.selectCarbonGroup(2);
    run(() => e.getPhase() === 'HYDROGEN_SELECTION');
  });
  // An atom that is not in the collectable pool: fireWeb returns false.
  const notInPool = engine.snapshot().carbonGroups[0].atomIds[0];
  const before = fired.length;
  assert.equal(engine.fireWeb(notInPool), false);
  assert.equal(fired.length, before, 'a refused action is silent');
});

test('throwing a hydrogen plays the paper throw, once, at release', () => {
  const { engine, fired } = soundsFrom((e, run) => {
    e.selectCarbonGroup(2);
    run(() => e.getPhase() === 'HYDROGEN_SELECTION');
    const blues = e
      .snapshot()
      .hydrogenRowIds.filter((id) => e.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue')
      .slice(0, 6);
    for (const id of blues) {
      e.fireWeb(id);
      run(() => e.snapshot().heldIds.includes(id), 5);
    }
    run(() => e.snapshot().paper.loadedAtomId !== null, 3);
    const carbon = e.snapshot().molecule.atoms.find((a) => a.element === 'C' && a.state === 'bonded')!;
    e.throwAt({ ...carbon.position });
  });

  // The carbon phase in the setup fires its own paper throw, so count only
  // the throws where an atom left the paper.
  const throws = fired.filter(
    (f) => f.sound === 'PAPER_THROW' && f.event.type === 'PAPER_THROWN' && f.event.atomId !== 'paper',
  );
  assert.equal(throws.length, 1, 'one hydrogen throw, one sound');
  assert.equal(fired.filter((f) => f.sound === 'PAPER_THROW').length, 2, 'the carbon throw earlier makes the other');
  void engine;
});

test('the carbon-phase paper throw plays the same paper sound, once', () => {
  const { fired } = soundsFrom((engine, run) => {
    engine.selectCarbonGroup(2); // throws the paper itself at the carbon group
    run(() => engine.getPhase() === 'HYDROGEN_SELECTION');
  });
  const throws = fired.filter((f) => f.sound === 'PAPER_THROW');
  assert.equal(throws.length, 1, 'one throw, one sound');
  assert.ok(
    throws[0].event.type === 'PAPER_THROWN' && throws[0].event.atomId === 'paper',
    'it was the paper itself that was thrown',
  );
  // The contact that follows now clinks; the bond and the settle stay silent.
  assert.deepEqual(fired.map((f) => f.sound), ['PAPER_THROW', 'ATOM_COLLISION']);
});

test('both throws share one sound, so the gesture sounds the same either way', () => {
  const carbonThrow = soundForEvent({ type: 'PAPER_THROWN', atomId: 'paper', direction: { x: 1, y: 0 }, speed: 760 });
  const hydrogenThrow = soundForEvent({ type: 'PAPER_THROWN', atomId: 'h7', direction: { x: 1, y: 0 }, speed: 900 });
  assert.equal(carbonThrow, 'PAPER_THROW');
  assert.equal(hydrogenThrow, 'PAPER_THROW');
  assert.equal(carbonThrow, hydrogenThrow);
});

test('the carbon collision plays once, at contact', () => {
  const { fired } = soundsFrom((engine, run) => {
    engine.selectCarbonGroup(2); // the blue pair: this strike bonds
    run(() => engine.getPhase() === 'HYDROGEN_SELECTION');
  });
  const collisions = fired.filter((f) => f.sound === 'ATOM_COLLISION');
  assert.equal(collisions.length, 1, 'one contact, one clink');
  assert.ok(
    collisions[0].event.type === 'ATOM_COLLISION' && collisions[0].event.bonded,
    'it was the successful contact',
  );
});

test('the collision sounds before the bond, not with it', () => {
  // The clink is contact. The bond forms 260ms later and has no sound, so the
  // collision must be the last thing heard in the carbon phase.
  const { fired } = soundsFrom((engine, run) => {
    engine.selectCarbonGroup(2);
    run(() => engine.getPhase() === 'HYDROGEN_SELECTION');
  });
  assert.deepEqual(
    fired.map((f) => f.sound),
    ['PAPER_THROW', 'ATOM_COLLISION'],
    'throw, then contact - and nothing for the bond, the settle or the phase changes',
  );
});

test('a paper that strikes the wrong group is silent', () => {
  const { fired } = soundsFrom((engine, run) => {
    engine.selectCarbonGroup(1); // blue + two greens: a real hit, but no bond
    run(() => engine.getPhase() === 'CARBON_SELECTION', 8);
  });
  assert.equal(fired.filter((f) => f.sound === 'ATOM_COLLISION').length, 0, 'no clink for a failed contact');
  assert.equal(fired.filter((f) => f.sound === 'PAPER_THROW').length, 1, 'the throw itself still sounds');
});

test('a paper thrown wide makes no collision sound at all', () => {
  const { fired } = soundsFrom((engine, run) => {
    engine.throwPaperAt({ x: 1150, y: 870 }); // under the groups, hits nothing
    run(() => engine.snapshot().paper.mode === 'IDLE', 8);
  });
  assert.equal(fired.filter((f) => f.sound === 'ATOM_COLLISION').length, 0);
});

test('a hydrogen landing does not borrow the carbon collision sound', () => {
  // Hydrogen contacts are a different, quieter moment and have no sound yet.
  const hydrogenHit = soundForEvent({ type: 'ATOM_COLLISION', movingId: 'h7', struckId: 'c1', chainDepth: 1, bonded: true });
  const hydrogenBounce = soundForEvent({ type: 'ATOM_COLLISION', movingId: 'h7', struckId: 'c1', chainDepth: 1, bonded: false });
  const paperMiss = soundForEvent({ type: 'ATOM_COLLISION', movingId: 'paper', struckId: 'c1', chainDepth: 1, bonded: false });
  const paperHit = soundForEvent({ type: 'ATOM_COLLISION', movingId: 'paper', struckId: 'c1', chainDepth: 1, bonded: true });
  assert.equal(hydrogenHit, null);
  assert.equal(hydrogenBounce, null);
  assert.equal(paperMiss, null);
  assert.equal(paperHit, 'ATOM_COLLISION');
});

test('nothing else in a full round makes a sound', () => {
  const quiet: GameEvent[] = [
    { type: 'GAME_STARTED', molecule: 'ethane', carbonTarget: 2 },
    { type: 'PHASE_CHANGED', from: 'CARBON_SELECTION', to: 'PAPER_FLIGHT' },
    { type: 'ATOM_SELECTED', family: 'blue', element: 'C', expected: 'blue' },
    { type: 'WRONG_ATOM_SELECTED', family: 'red', element: 'H', expected: 'blue' },
    { type: 'ATOM_COLLECTED', atomId: 'h1', element: 'H', family: 'blue', collected: 1, target: 6 },
    { type: 'BOND_CREATED', a: 'c1', b: 'h1', order: 1 },
    { type: 'THROW_MISSED', atomId: 'h1', reason: 'out-of-bounds' },
    { type: 'HYDROGEN_TARGET_CALCULATED', carbonCount: 2, hydrogenCount: 6 },
    { type: 'MOLECULE_COMPLETED', molecule: 'ethane', score: 100 },
    { type: 'TIMEOUT', molecule: 'ethane' },
  ];
  for (const event of quiet) {
    assert.equal(soundForEvent(event), null, `${event.type} is silent`);
  }
});

test('a phase change alone never triggers audio', () => {
  // The guard against "plays on screen transition": phase changes are the only
  // events a scene swap produces, and they map to nothing.
  const phases: GameEvent[] = [
    { type: 'PHASE_CHANGED', from: 'INTRO_OBJECTIVE', to: 'CARBON_SELECTION' },
    { type: 'PHASE_CHANGED', from: 'CARBON_IMPACT', to: 'CARBON_STRUCTURE_READY' },
    { type: 'PHASE_CHANGED', from: 'HYDROGEN_COLLECTION', to: 'THROWING' },
  ];
  assert.deepEqual(phases.map(soundForEvent), [null, null, null]);
});
