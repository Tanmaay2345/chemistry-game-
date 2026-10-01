import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES, nextAlkane } from '../engine/config.ts';
import { GameEngine } from '../engine/engine.ts';
import type { GameEvent } from '../engine/events.ts';
import { VOICE_CLIPS, VOICE_IDS, type VoiceId } from './voiceClips.ts';
import { MISTAKE_COOLDOWN_MS, voiceForEvent, type VoiceContext } from './voiceForEvent.ts';
import { VoiceSession } from './voiceSession.ts';

/**
 * The voice layer driven by a real engine.
 *
 * The mapping already has its own unit tests; what these check is the wiring -
 * that a round actually played through the engine produces the right clips, in
 * the right order, once each, for all three molecules. Nothing here is a
 * synthetic event: every one comes from the engine playing.
 *
 * It also stands as the assertion that narration cannot touch the game. The
 * listener only reads, and each test compares the engine's state against a
 * second engine driven identically with no listener attached.
 */
function listen(engine: GameEngine, options: { nextMolecule?: string | null } = {}) {
  const session = new VoiceSession();
  const spoken: VoiceId[] = [];
  let clock = 0;
  engine.bus.on((event: GameEvent) => {
    const snapshot = engine.snapshot();
    const now = (clock += 1);
    const context: VoiceContext = {
      now,
      molecule: snapshot.spec.name,
      round: session.spokenThisRound(),
      session: session.spokenThisSession(),
      hydrogenBond:
        event.type === 'BOND_CREATED'
          ? snapshot.molecule.atoms.some((atom) => (atom.id === event.a || atom.id === event.b) && atom.element === 'H')
          : undefined,
      completion: snapshot.summary?.completion,
      nextMolecule: options.nextMolecule ?? nextAlkane(snapshot.spec.name),
    };
    for (const id of voiceForEvent(event, context)) {
      session.record(id, now);
      spoken.push(id);
    }
  });
  return { spoken, session, advance: () => (clock += MISTAKE_COOLDOWN_MS) };
}

function engineFor(molecule: string): GameEngine {
  return new GameEngine(ALKANE_CHALLENGES[molecule]);
}

/** Runs the engine forward in 60 Hz steps, as the frame loop does. */
function run(engine: GameEngine, ms: number): void {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) engine.tick(16);
}

/** The groups whose colour and size the molecule calls for. */
function correctGroups(engine: GameEngine): number[] {
  const snapshot = engine.snapshot();
  return snapshot.carbonGroups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => group.family === snapshot.spec.family && group.atomIds.length === snapshot.spec.carbonCount)
    .map(({ index }) => index);
}

/**
 * Throws at the right sets until one of them is actually struck.
 *
 * The engine judges the group the paper *reaches*, not the one aimed at, so a
 * correct set standing behind another cannot be hit from the dock. That is the
 * game's design - aiming is a real skill - and it means a test that aims at one
 * set and assumes it landed is testing its own luck. This tries each correct
 * set in turn and stops at the one that lands.
 */
function chooseCarbons(engine: GameEngine): boolean {
  for (const index of correctGroups(engine)) {
    if (engine.snapshot().phase !== 'CARBON_SELECTION') break;
    engine.selectCarbonGroup(index);
    run(engine, 4000);
    if (engine.snapshot().phase !== 'CARBON_SELECTION') return true;
  }
  return engine.snapshot().phase !== 'CARBON_SELECTION';
}

/** Plays a whole molecule: pick the carbons, then collect and throw hydrogens. */
function playThrough(engine: GameEngine): void {
  engine.start();
  chooseCarbons(engine);
  engine.skipTeachingBeat();
  run(engine, 200);
  engine.skipTeachingBeat();
  run(engine, 200);

  for (let attempt = 0; attempt < 40; attempt++) {
    const snapshot = engine.snapshot();
    if (snapshot.phase === 'SUMMARY' || snapshot.phase === 'COMPLETION') break;
    const target = engine.bondTargets()[0];
    if (snapshot.paper.loadedAtomId && target) {
      engine.throwAt(target.point);
      run(engine, 1200);
      continue;
    }
    const free = snapshot.hydrogenRowIds
      .map((id) => snapshot.molecule.atoms.find((atom) => atom.id === id)!)
      .find((atom) => atom.state === 'free' && atom.family === snapshot.spec.family);
    if (!free) break;
    engine.fireWeb(free.id);
    run(engine, 1500);
  }
  run(engine, 2000);
  engine.skipTeachingBeat();
  run(engine, 200);
}

// ------------------------------------------------------- 1-2. every clip, a trigger

test('every gameplay clip is reachable from a real engine event', () => {
  // The lesson, rail and walkthrough clips are screen-driven, not engine-driven.
  const screenDriven = new Set<VoiceId>([
    'V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08', 'V09',
    'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17',
  ]);
  const gameplayClips = VOICE_IDS.filter((id) => !screenDriven.has(id));
  assert.equal(gameplayClips.length, 29);

  const reached = new Set<VoiceId>();
  for (const molecule of ['methane', 'ethane', 'propane']) {
    const engine = engineFor(molecule);
    const heard = listen(engine);
    playThrough(engine);
    for (const id of heard.spoken) reached.add(id);
  }
  // Played cleanly, a round makes no mistakes and never runs out of time, so
  // those clips are covered by their own tests below.
  const onlyOnFailure = new Set<VoiceId>(['S02', 'S03', 'S05', 'S06', 'S07', 'S08', 'T01', 'T02', 'G02']);
  const missing = gameplayClips.filter((id) => !reached.has(id) && !onlyOnFailure.has(id));
  assert.deepEqual(missing, [], 'every clip a clean round should produce was produced');
});

// ------------------------------------------------- 3-5. molecule-specific narration

test('methane narrates itself, start to finish', () => {
  const engine = engineFor('methane');
  const heard = listen(engine);
  playThrough(engine);
  assert.deepEqual(heard.spoken.filter((id) => id.startsWith('M')), ['M01', 'M02', 'M03', 'M04', 'M05']);
  assert.equal(heard.spoken.some((id) => id.startsWith('E') || id.startsWith('P')), false, 'no other molecule is mentioned');
});

test('ethane narrates itself, start to finish', () => {
  const engine = engineFor('ethane');
  const heard = listen(engine);
  playThrough(engine);
  assert.deepEqual(heard.spoken.filter((id) => id.startsWith('E')), ['E01', 'E02', 'E03', 'E04', 'E05']);
  assert.equal(heard.spoken.some((id) => id.startsWith('M') || id.startsWith('P')), false);
});

test('propane narrates itself, start to finish', () => {
  const engine = engineFor('propane');
  const heard = listen(engine);
  playThrough(engine);
  assert.deepEqual(heard.spoken.filter((id) => id.startsWith('P')), ['P01', 'P02', 'P03', 'P04', 'P05']);
  assert.equal(heard.spoken.some((id) => id.startsWith('M') || id.startsWith('E')), false);
});

test('the shared lines are said once each, in the order the round reaches them', () => {
  const engine = engineFor('methane');
  const heard = listen(engine, { nextMolecule: 'ethane' });
  playThrough(engine);
  for (const id of ['S01', 'S04', 'S09', 'G01'] as VoiceId[]) {
    assert.deepEqual(heard.spoken.filter((said) => said === id), [id], `${id} is said once`);
  }
  const order = heard.spoken.filter((id) => (['S01', 'S04', 'S09', 'G01'] as string[]).includes(id));
  assert.deepEqual(order, ['S01', 'S04', 'S09', 'G01'], 'and in the order the round reaches them');
});

// ------------------------------------------------------------ 6-7. which bond it was

test('the carbon chain bonding is not mistaken for the first hydrogen', () => {
  // Ethane's two carbons bond during the impact, before any hydrogen exists on
  // the molecule. That bond must not trigger the hydrogen line.
  const engine = engineFor('ethane');
  const bonds: Array<{ hydrogen: boolean; spoken: VoiceId[] }> = [];
  const session = new VoiceSession();
  let clock = 0;
  engine.bus.on((event) => {
    if (event.type !== 'BOND_CREATED') return;
    const snapshot = engine.snapshot();
    const hydrogen = snapshot.molecule.atoms.some((atom) => (atom.id === event.a || atom.id === event.b) && atom.element === 'H');
    const now = (clock += 1);
    const said = voiceForEvent(event, {
      now, molecule: snapshot.spec.name, round: session.spokenThisRound(),
      session: session.spokenThisSession(), hydrogenBond: hydrogen,
    });
    for (const id of said) session.record(id, now);
    bonds.push({ hydrogen, spoken: said });
  });
  playThrough(engine);

  const carbonBonds = bonds.filter((bond) => !bond.hydrogen);
  const hydrogenBonds = bonds.filter((bond) => bond.hydrogen);
  assert.equal(carbonBonds.length, 1, 'ethane has one carbon-to-carbon bond');
  assert.deepEqual(carbonBonds[0].spoken, [], 'and it says nothing');
  assert.ok(hydrogenBonds.length >= 6, 'and six hydrogens');
  assert.deepEqual(hydrogenBonds[0].spoken, ['S09'], 'the first of those is the one announced');
  for (const bond of hydrogenBonds.slice(1)) assert.deepEqual(bond.spoken, [], 'and only the first');
});

test('methane has no carbon-to-carbon bond to confuse', () => {
  const engine = engineFor('methane');
  const kinds: boolean[] = [];
  engine.bus.on((event) => {
    if (event.type !== 'BOND_CREATED') return;
    const atoms = engine.snapshot().molecule.atoms;
    kinds.push(atoms.some((atom) => (atom.id === event.a || atom.id === event.b) && atom.element === 'H'));
  });
  playThrough(engine);
  assert.equal(kinds.includes(false), false, 'every bond in methane has a hydrogen end');
  assert.equal(kinds.length, 4);
});

// ------------------------------------------------------------- 8-9. wrong answers

test('one wrong hydrogen is explained once, although the engine reports it twice', () => {
  const engine = engineFor('methane');
  const heard = listen(engine);
  engine.start();
  chooseCarbons(engine);
  engine.skipTeachingBeat();
  run(engine, 200);
  engine.skipTeachingBeat();
  run(engine, 200);

  const snapshot = engine.snapshot();
  const wrong = snapshot.hydrogenRowIds
    .map((id) => snapshot.molecule.atoms.find((atom) => atom.id === id)!)
    .find((atom) => atom.state === 'free' && atom.family !== snapshot.spec.family);
  assert.ok(wrong, 'the row holds hydrogens of other families');

  // The pick raises it once...
  engine.fireWeb(wrong.id);
  run(engine, 1500);
  // ...and the throw that cannot bond raises it again.
  const target = engine.bondTargets()[0];
  if (target) engine.throwAt(target.point);
  run(engine, 2500);

  const wrongHydrogen = heard.spoken.filter((id) => id === 'S05');
  assert.deepEqual(wrongHydrogen, ['S05'], 'one mistake, one explanation');
});

test('a missed throw is explained, and not confused with the wrong-hydrogen line', () => {
  const engine = engineFor('methane');
  const heard = listen(engine);
  engine.start();
  chooseCarbons(engine);
  engine.skipTeachingBeat();
  run(engine, 200);
  engine.skipTeachingBeat();
  run(engine, 200);

  const snapshot = engine.snapshot();
  const right = snapshot.hydrogenRowIds
    .map((id) => snapshot.molecule.atoms.find((atom) => atom.id === id)!)
    .find((atom) => atom.state === 'free' && atom.family === snapshot.spec.family)!;
  engine.fireWeb(right.id);
  run(engine, 1500);
  // Thrown at nothing at all.
  engine.throwAt({ x: -400, y: -400 });
  run(engine, 3000);

  assert.equal(heard.spoken.includes('S05'), false, 'the hydrogen was the right colour');
  assert.ok(heard.spoken.includes('S08') || heard.spoken.includes('S07'), 'the miss was explained');
});

test('the wrong carbon set is explained by which thing was wrong', () => {
  // Which set the paper reaches is decided by where it lands, so rather than
  // assume an aim lands, this throws at every set in turn on a fresh engine and
  // checks that whatever mistake the engine reported got the matching line.
  const pairs: Array<[string, VoiceId[]]> = [];
  const groupCount = engineFor('methane').snapshot().carbonGroups.length;

  for (let index = 0; index < groupCount; index++) {
    const engine = engineFor('methane');
    const session = new VoiceSession();
    let clock = 0;
    engine.bus.on((event) => {
      if (event.type !== 'MISTAKE_EXPLAINED') return;
      const snapshot = engine.snapshot();
      const now = (clock += 1);
      const said = voiceForEvent(event, {
        now, molecule: snapshot.spec.name, round: session.spokenThisRound(), session: session.spokenThisSession(),
      });
      for (const id of said) session.record(id, now);
      pairs.push([event.reason.kind, said]);
    });
    engine.start();
    engine.selectCarbonGroup(index);
    run(engine, 3000);
  }

  const family = pairs.filter(([kind]) => kind === 'WRONG_CARBON_FAMILY');
  const count = pairs.filter(([kind]) => kind === 'WRONG_CARBON_COUNT');
  assert.ok(family.length > 0, 'a set of the wrong colour was struck');
  assert.ok(count.length > 0, 'and a set of the right colour but the wrong size');
  for (const [, said] of family) assert.deepEqual(said, ['S02'], 'the colour was the lesson');
  for (const [, said] of count) assert.deepEqual(said, ['S03'], 'the count was the lesson');
});

test('a wrong throw does not make the round repeat its opening instruction', () => {
  const engine = engineFor('methane');
  const heard = listen(engine);
  engine.start();
  const snapshot = engine.snapshot();
  const wrong = snapshot.carbonGroups.findIndex((group) => group.family !== snapshot.spec.family);
  engine.selectCarbonGroup(wrong);
  run(engine, 3000);
  assert.deepEqual(heard.spoken.filter((id) => id === 'M02'), ['M02'], 'said once, on entering the phase');
});

// ------------------------------------------------------------ 10-12. clock and end

test('the clock warning is said once, however long the round runs', () => {
  const engine = engineFor('propane');
  const heard = listen(engine);
  engine.start();
  run(engine, 105_000); // past the 20s mark and on towards zero
  assert.deepEqual(heard.spoken.filter((id) => id === 'T01'), ['T01']);
  assert.equal(VOICE_CLIPS.T01.policy, 'INTERRUPT', 'the clock cuts in');
});

test('running out of time is announced once and interrupts', () => {
  const engine = engineFor('methane');
  const heard = listen(engine);
  engine.start();
  run(engine, 125_000);
  engine.skipTeachingBeat();
  run(engine, 200);
  assert.deepEqual(heard.spoken.filter((id) => id === 'T02'), ['T02']);
  assert.equal(VOICE_CLIPS.T02.policy, 'INTERRUPT');
  assert.equal(engine.snapshot().summary?.completion, 'timeout');
  assert.ok(heard.spoken.includes('G02'), 'and the summary says so');
  assert.equal(heard.spoken.includes('G01'), false);
});

test('completion interrupts, and the summary line depends on what comes next', () => {
  const finished = engineFor('methane');
  const heardFirst = listen(finished, { nextMolecule: 'ethane' });
  playThrough(finished);
  assert.equal(VOICE_CLIPS.M05.policy, 'INTERRUPT');
  assert.ok(heardFirst.spoken.includes('M05'));
  assert.ok(heardFirst.spoken.includes('G01'), 'there is another molecule to come');
  assert.equal(heardFirst.spoken.includes('G03'), false);

  const last = engineFor('propane');
  const heardLast = listen(last, { nextMolecule: null });
  playThrough(last);
  assert.ok(heardLast.spoken.includes('G03'), 'the end of the progression');
  assert.equal(heardLast.spoken.includes('G01'), false);
});

// ------------------------------------------------ 13-15. duplication and revisiting

test('a doubled subscription does not double the narration', () => {
  // React invokes an effect, cleans it up and invokes it again in development.
  // The session is what remembers, and it is shared.
  const engine = engineFor('methane');
  const session = new VoiceSession();
  const spoken: VoiceId[] = [];
  let clock = 0;
  const speak = (event: GameEvent) => {
    const snapshot = engine.snapshot();
    const now = (clock += 1);
    for (const id of voiceForEvent(event, {
      now, molecule: snapshot.spec.name, round: session.spokenThisRound(),
      session: session.spokenThisSession(), completion: snapshot.summary?.completion, nextMolecule: 'ethane',
    })) {
      session.record(id, now);
      spoken.push(id);
    }
  };
  engine.bus.on(speak);
  engine.bus.on(speak); // the second invocation
  playThrough(engine);
  assert.deepEqual(spoken.filter((id) => id === 'M01'), ['M01']);
  assert.deepEqual(spoken.filter((id) => id === 'M03'), ['M03']);
  assert.deepEqual(spoken.filter((id) => id === 'M05'), ['M05']);
});

test('a replayed round introduces itself again but does not repeat the once-a-session lines', () => {
  const session = new VoiceSession();
  const spokenPerRound: VoiceId[][] = [];
  for (const molecule of ['methane', 'methane']) {
    const engine = engineFor(molecule);
    const spoken: VoiceId[] = [];
    let clock = 0;
    session.startRound(); // what `useGameVoice` does when the engine changes
    engine.bus.on((event) => {
      const snapshot = engine.snapshot();
      const now = (clock += 1);
      for (const id of voiceForEvent(event, {
        now, molecule: snapshot.spec.name, round: session.spokenThisRound(),
        session: session.spokenThisSession(), completion: snapshot.summary?.completion, nextMolecule: 'ethane',
      })) {
        session.record(id, now);
        spoken.push(id);
      }
    });
    playThrough(engine);
    spokenPerRound.push(spoken);
  }
  assert.ok(spokenPerRound[1].includes('M01'), 'the molecule introduces itself again');
  assert.ok(spokenPerRound[0].includes('S01'), 'the colour rule is said in the first round');
  assert.equal(spokenPerRound[1].includes('S01'), false, 'and not again in the second');
});

// ---------------------------------------------------- 20. the voice changes nothing

test('listening to a round changes nothing about how it plays', () => {
  // The same round, played identically, with and without a listener attached.
  const watched = engineFor('propane');
  listen(watched);
  playThrough(watched);

  const silent = engineFor('propane');
  playThrough(silent);

  const a = watched.snapshot();
  const b = silent.snapshot();
  assert.equal(a.phase, b.phase);
  assert.equal(a.score, b.score);
  assert.equal(a.summary?.completion, b.summary?.completion);
  assert.equal(a.molecule.bonds.length, b.molecule.bonds.length);
  assert.equal(a.hydrogenCollected, b.hydrogenCollected);
  assert.equal(Math.round(a.timeRemaining), Math.round(b.timeRemaining));
  assert.deepEqual(
    a.molecule.atoms.map((atom) => [atom.id, atom.state, Math.round(atom.position.x), Math.round(atom.position.y)]),
    b.molecule.atoms.map((atom) => [atom.id, atom.state, Math.round(atom.position.x), Math.round(atom.position.y)]),
    'every atom is in the same place',
  );
});

test('the mistake cooldown comes from the card, not from a number typed here', () => {
  assert.equal(MISTAKE_COOLDOWN_MS, DEFAULT_RULES.teaching.feedbackMs);
  assert.equal(MISTAKE_COOLDOWN_MS, 5000);
});
