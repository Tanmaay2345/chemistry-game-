import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GameEvent } from '../engine/events.ts';
import { VOICE_CLIPS, VOICE_IDS, type VoiceId } from './voiceClips.ts';
import { MISTAKE_COOLDOWN_MS, voiceForEvent, type VoiceContext } from './voiceForEvent.ts';
import { VoiceSession } from './voiceSession.ts';

function context(over: Partial<VoiceContext> = {}): VoiceContext {
  return { now: 1000, molecule: 'methane', round: new Map(), session: new Set(), ...over };
}

const started = (molecule: string): GameEvent => ({ type: 'GAME_STARTED', molecule, carbonTarget: 1 });
const phase = (from: string, to: string): GameEvent => ({ type: 'PHASE_CHANGED', from, to });

// ------------------------------------------------------------------- the library

test('there are 41 clips, and the policies are the ones the design document sets', () => {
  assert.equal(VOICE_IDS.length, 41);
  const byPolicy = { INTERRUPT: [] as VoiceId[], QUEUE: [] as VoiceId[], DROP: [] as VoiceId[] };
  for (const id of VOICE_IDS) byPolicy[VOICE_CLIPS[id].policy].push(id);
  assert.deepEqual(byPolicy.INTERRUPT.sort(), ['E05', 'M05', 'P05', 'T01', 'T02']);
  assert.deepEqual(byPolicy.DROP.sort(), ['S02', 'S03', 'S05', 'S06', 'S07', 'S08', 'S09']);
  assert.equal(byPolicy.QUEUE.length, 29);
});

// --------------------------------------------------------------- the right molecule

test('each molecule introduces itself with its own clip', () => {
  assert.deepEqual(voiceForEvent(started('methane'), context({ molecule: 'methane' })), ['M01']);
  assert.deepEqual(voiceForEvent(started('ethane'), context({ molecule: 'ethane' })), ['E01']);
  assert.deepEqual(voiceForEvent(started('propane'), context({ molecule: 'propane' })), ['P01']);
});

test('a molecule with no narration says nothing rather than guessing', () => {
  assert.deepEqual(voiceForEvent(started('butane'), context({ molecule: 'butane' })), []);
  assert.deepEqual(voiceForEvent(phase('INTRO_OBJECTIVE', 'CARBON_SELECTION'), context({ molecule: 'butane' })), []);
});

test('the teaching beats are narrated per molecule', () => {
  for (const [molecule, structure, calculation] of [
    ['methane', 'M03', 'M04'],
    ['ethane', 'E03', 'E04'],
    ['propane', 'P03', 'P04'],
  ] as const) {
    const where = context({ molecule });
    assert.deepEqual(voiceForEvent(phase('CARBON_IMPACT', 'CARBON_STRUCTURE_READY'), where), [structure]);
    assert.deepEqual(voiceForEvent(phase('MOLECULE_VALIDATION', 'HYDROGEN_CALCULATION'), where), [calculation]);
  }
});

// ------------------------------------------------------------- duplicate protection

test('the opening instruction is not repeated after a wrong throw', () => {
  // A wrong set returns the game to CARBON_SELECTION from PAPER_FLIGHT. The
  // mistake has its own explanation; the requirement does not need saying again.
  assert.deepEqual(voiceForEvent(phase('INTRO_OBJECTIVE', 'CARBON_SELECTION'), context()), ['M02', 'S01']);
  assert.deepEqual(voiceForEvent(phase('PAPER_FLIGHT', 'CARBON_SELECTION'), context()), []);
});

test('the colour rule is said once a session, the requirement once a round', () => {
  const session = new Set<VoiceId>(['S01']);
  assert.deepEqual(voiceForEvent(phase('INTRO_OBJECTIVE', 'CARBON_SELECTION'), context({ session })), ['M02']);
  const round = new Map<VoiceId, number>([['M02', 10]]);
  assert.deepEqual(voiceForEvent(phase('INTRO_OBJECTIVE', 'CARBON_SELECTION'), context({ round, session })), []);
});

test('collect-the-hydrogens is said after the calculation beat and not on the way back', () => {
  assert.deepEqual(voiceForEvent(phase('HYDROGEN_CALCULATION', 'HYDROGEN_SELECTION'), context()), ['S04']);
  // Re-entered after a throw that missed with nothing in hand.
  assert.deepEqual(voiceForEvent(phase('MOLECULE_VALIDATION', 'HYDROGEN_SELECTION'), context()), []);
});

test('one wrong hydrogen is explained once, although the engine reports it twice', () => {
  // The engine raises this at the pick and again when the throw fails: one
  // mistake, two events. The cooldown is the card's own feedback window.
  const mistake: GameEvent = { type: 'MISTAKE_EXPLAINED', reason: { kind: 'WRONG_HYDROGEN_FAMILY', picked: 'red', expected: 'blue' } };
  assert.deepEqual(voiceForEvent(mistake, context({ now: 1000 })), ['S05']);
  const round = new Map<VoiceId, number>([['S05', 1000]]);
  assert.deepEqual(voiceForEvent(mistake, context({ now: 1000 + MISTAKE_COOLDOWN_MS - 1, round })), []);
  // Long enough later that the explanation has left the card.
  assert.deepEqual(voiceForEvent(mistake, context({ now: 1000 + MISTAKE_COOLDOWN_MS, round })), ['S05']);
});

test('the clock is announced once and the timeout once, from either emit site', () => {
  assert.deepEqual(voiceForEvent({ type: 'TIME_WARNING', secondsLeft: 20 }, context()), ['T01']);
  assert.deepEqual(voiceForEvent({ type: 'TIME_WARNING', secondsLeft: 20 }, context({ round: new Map([['T01', 5]]) })), []);
  assert.deepEqual(voiceForEvent({ type: 'TIMEOUT', molecule: 'methane' }, context()), ['T02']);
  assert.deepEqual(voiceForEvent({ type: 'TIMEOUT', molecule: 'methane' }, context({ round: new Map([['T02', 5]]) })), []);
});

test('only the first hydrogen bond of a round is acknowledged', () => {
  const bond: GameEvent = { type: 'BOND_CREATED', a: 'c1', b: 'h1', order: 1 };
  assert.deepEqual(voiceForEvent(bond, context({ hydrogenBond: true })), ['S09']);
  assert.deepEqual(voiceForEvent(bond, context({ hydrogenBond: true, round: new Map([['S09', 5]]) })), []);
  // The carbon chain's own bonds are not it.
  assert.deepEqual(voiceForEvent(bond, context({ hydrogenBond: false })), []);
  assert.deepEqual(voiceForEvent(bond, context()), []);
});

// ------------------------------------------------------------------ every mistake

test('every reason the engine can give has narration', () => {
  const reasons: GameEvent[] = [
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'WRONG_CARBON_FAMILY', picked: 'red', expected: 'blue' } },
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'WRONG_CARBON_COUNT', picked: 3, expected: 1, molecule: 'methane' } },
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'WRONG_HYDROGEN_FAMILY', picked: 'green', expected: 'blue' } },
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'NO_FREE_BOND' } },
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'TRAY_FULL' } },
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'THROW_MISSED' } },
  ];
  const said = reasons.flatMap((event) => voiceForEvent(event, context()));
  assert.deepEqual(said, ['S02', 'S03', 'S05', 'S07', 'S06', 'S08']);
  for (const id of said) assert.equal(VOICE_CLIPS[id].policy, 'DROP', `${id} must not stack up`);
});

// ----------------------------------------------------------------- the summary

test('the summary says which of the three things happened', () => {
  const summary = phase('COMPLETION', 'SUMMARY');
  assert.deepEqual(voiceForEvent(summary, context({ completion: 'completed', nextMolecule: 'ethane' })), ['G01']);
  assert.deepEqual(voiceForEvent(summary, context({ completion: 'timeout' })), ['G02']);
  assert.deepEqual(voiceForEvent(summary, context({ completion: 'completed', nextMolecule: null })), ['G03']);
  // Still being played: nothing to say yet.
  assert.deepEqual(voiceForEvent(summary, context({ completion: 'in-progress' })), []);
});

test('the end of the progression is said once ever, even on a replay', () => {
  const summary = phase('COMPLETION', 'SUMMARY');
  const where = context({ completion: 'completed', nextMolecule: null, session: new Set<VoiceId>(['G03']) });
  assert.deepEqual(voiceForEvent(summary, where), []);
});

// ------------------------------------------------------- what must stay silent

test('the events that fire dozens of times a round are never narrated', () => {
  const noisy: GameEvent[] = [
    { type: 'ATOM_SELECTED', family: 'blue', element: 'C', expected: 'blue' },
    { type: 'WRONG_ATOM_SELECTED', family: 'red', element: 'H', expected: 'blue' },
    { type: 'WEB_STARTED', atomId: 'h1', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
    { type: 'ATOM_COLLECTED', atomId: 'h1', element: 'H', family: 'blue', collected: 1, target: 4 },
    { type: 'PAPER_THROWN', atomId: 'paper', direction: { x: 1, y: 0 }, speed: 10 },
    { type: 'ATOM_COLLISION', movingId: 'h1', struckId: 'c1', chainDepth: 1, bonded: true },
    { type: 'THROW_MISSED', atomId: 'h1', reason: 'out-of-bounds' },
    { type: 'HYDROGEN_TARGET_CALCULATED', carbonCount: 1, hydrogenCount: 4 },
  ];
  for (const event of noisy) assert.deepEqual(voiceForEvent(event, context()), [], `${event.type} stays silent`);
});

test('a phase with no narration is silent', () => {
  for (const to of ['PAPER_FLIGHT', 'CARBON_IMPACT', 'THROWING', 'COLLISION', 'MOLECULE_VALIDATION', 'HYDROGEN_COLLECTION', 'COMPLETION', 'TIMEOUT']) {
    assert.deepEqual(voiceForEvent(phase('THROWING', to), context()), [], `${to} stays silent`);
  }
});

test('completion is narrated per molecule, once', () => {
  assert.deepEqual(voiceForEvent({ type: 'MOLECULE_COMPLETED', molecule: 'ethane', score: 10 }, context({ molecule: 'ethane' })), ['E05']);
  assert.deepEqual(
    voiceForEvent({ type: 'MOLECULE_COMPLETED', molecule: 'ethane', score: 10 }, context({ molecule: 'ethane', round: new Map([['E05', 1]]) })),
    [],
  );
});

test('every clip the mapping can return is one of the 41', () => {
  const events: GameEvent[] = [
    started('methane'), started('ethane'), started('propane'),
    phase('INTRO_OBJECTIVE', 'CARBON_SELECTION'),
    phase('CARBON_IMPACT', 'CARBON_STRUCTURE_READY'),
    phase('MOLECULE_VALIDATION', 'HYDROGEN_CALCULATION'),
    phase('HYDROGEN_CALCULATION', 'HYDROGEN_SELECTION'),
    phase('COMPLETION', 'SUMMARY'),
    { type: 'TIME_WARNING', secondsLeft: 20 },
    { type: 'TIMEOUT', molecule: 'methane' },
    { type: 'MOLECULE_COMPLETED', molecule: 'methane', score: 1 },
    { type: 'BOND_CREATED', a: 'c1', b: 'h1', order: 1 },
    { type: 'MISTAKE_EXPLAINED', reason: { kind: 'TRAY_FULL' } },
  ];
  for (const molecule of ['methane', 'ethane', 'propane']) {
    for (const event of events) {
      for (const id of voiceForEvent(event, context({ molecule, hydrogenBond: true, completion: 'completed', nextMolecule: 'ethane' }))) {
        assert.ok(VOICE_IDS.includes(id), `${id} is a real clip`);
      }
    }
  }
});

// ------------------------------------------------------------------ the session

test('a new round forgets the round but remembers the session', () => {
  const session = new VoiceSession();
  session.record('M01', 100);
  session.record('S01', 100);
  assert.equal(session.spokenThisRound().has('M01'), true);
  session.startRound();
  assert.equal(session.spokenThisRound().has('M01'), false, 'methane introduces itself again on a replay');
  assert.equal(session.spokenThisSession().has('S01'), true, 'the colour rule is not repeated');
  session.reset();
  assert.equal(session.spokenThisSession().size, 0);
});
