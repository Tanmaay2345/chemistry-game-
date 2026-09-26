import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ALKANE_CHALLENGES } from '../engine/config.ts';
import { GameEngine } from '../engine/engine.ts';
import type { GameEvent } from '../engine/events.ts';
import { LessonVoice } from './lessonVoice.ts';
import { DEFAULT_QUEUE_STALE_MS, VoiceManager, type VoiceAudio, type VoiceState } from './VoiceManager.ts';
import { VOICE_CLIPS, type VoiceId } from './voiceClips.ts';
import { isRoundIntroduction, ROUND_INTRO_SEQUENCE, voiceForEvent } from './voiceForEvent.ts';
import { VoiceSession } from './voiceSession.ts';

/**
 * The round's opening introduction.
 *
 * With V12 now allowed to finish, the three lines a round opens with were
 * queueing behind it and behind each other: V12 (3.07s) plus M01 (5.06s) put
 * M02's wait past the 6s staleness rule, so the line that tells the student
 * what to do was dropped. These tests hold the introduction together as one
 * ordered statement while leaving every later line under the ordinary rule.
 */

class FakeAudio implements VoiceAudio {
  src: string;
  muted = false;
  currentTime = 0;
  private handlers = new Map<string, Set<() => void>>();

  constructor(src: string) {
    this.src = src;
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  addEventListener(type: string, handler: () => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: () => void): void {
    this.handlers.get(type)?.delete(handler);
  }

  finish(): void {
    for (const handler of [...(this.handlers.get('ended') ?? [])]) handler();
  }
}

const built: VoiceManager[] = [];
afterEach(() => {
  for (const voice of built.splice(0)) voice.dispose();
});

function app(options: { muted?: boolean } = {}) {
  const made: FakeAudio[] = [];
  let clock = 0;
  const voice = new VoiceManager({
    createAudio: (src) => { const a = new FakeAudio(src); made.push(a); return a; },
    now: () => clock,
    watchdogGraceMs: 60_000,
    muted: options.muted,
  });
  built.push(voice);
  const states: string[] = [];
  voice.onState((id, state: VoiceState) => states.push(`${id}:${state}`));
  const session = new VoiceSession();
  const lessons = new LessonVoice(voice, session, () => clock);

  /** Exactly what `useGameVoice` does, including the sequence tag. */
  const startRound = (molecule: string) => {
    const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
    voice.cancelAll('gameplay');
    session.startRound();
    engine.bus.on((event: GameEvent) => {
      const snapshot = engine.snapshot();
      const request = isRoundIntroduction(event) ? { sequence: ROUND_INTRO_SEQUENCE } : {};
      for (const id of voiceForEvent(event, {
        now: clock, molecule: snapshot.spec.name,
        round: session.spokenThisRound(), session: session.spokenThisSession(),
        completion: snapshot.summary?.completion, nextMolecule: 'ethane',
      })) {
        session.record(id, clock);
        void voice.play(id, 'gameplay', request);
      }
    });
    engine.start();
    return engine;
  };

  return {
    voice, session, lessons, made, states, startRound,
    tick: (ms: number) => { clock += ms; },
    /** Plays the current clip out, as its element's `ended` event would. */
    finish: async () => {
      made[made.length - 1]?.finish();
      await Promise.resolve();
      await Promise.resolve();
    },
    started: () => states.filter((s) => s.endsWith(':started')).map((s) => s.split(':')[0] as VoiceId),
  };
}

/** Reaching the last walkthrough frame and pressing on while V12 still speaks. */
async function handover(a: ReturnType<typeof app>) {
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  a.startRound('methane');     // the child's effects
  a.lessons.enter('play');     // then the parent's
  await Promise.resolve();
}

// ------------------------------------------------------------------ 1, 2, 3

test('V12 hands over to M01 without either being cancelled', async () => {
  const a = app();
  await handover(a);
  assert.equal(a.voice.current(), 'V12');
  assert.equal(a.voice.currentOwner(), 'lesson');
  assert.deepEqual(a.voice.queuedSequence(), ['M01', 'M02', 'S01'], 'the opening lines wait as a group');
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finish();
  assert.equal(a.voice.current(), 'M01');
  assert.equal(a.states.includes('V12:cancelled'), false);
  assert.equal(a.states.includes('M01:cancelled'), false);
});

test('the whole introduction is heard: V12, M01, M02, then the colour rule', async () => {
  const a = app();
  await handover(a);
  for (const clip of [VOICE_CLIPS.V12, VOICE_CLIPS.M01, VOICE_CLIPS.M02, VOICE_CLIPS.S01]) {
    a.tick(clip.durationMs);
    await a.finish();
  }
  assert.deepEqual(a.started(), ['V12', 'M01', 'M02', 'S01']);
  assert.equal(a.states.filter((s) => s.endsWith(':cancelled')).length, 0, 'nothing was cut off');
  assert.equal(a.states.filter((s) => s.endsWith(':dropped')).length, 0, 'and nothing was dropped');
});

test('M02 survives a wait that far exceeds the stale threshold', async () => {
  const a = app();
  await handover(a);
  // V12 then M01 is 8.13s of speech - well past the 6s a lone queued line gets.
  const waited = VOICE_CLIPS.V12.durationMs + VOICE_CLIPS.M01.durationMs;
  assert.ok(waited > DEFAULT_QUEUE_STALE_MS, `${waited}ms is past the ${DEFAULT_QUEUE_STALE_MS}ms rule`);
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finish();
  a.tick(VOICE_CLIPS.M01.durationMs);
  await a.finish();
  assert.equal(a.voice.current(), 'M02', 'the instruction still gets said');
});

// ------------------------------------------------------------------ 4, 5

test('an ordinary gameplay line still ages out at six seconds', async () => {
  const a = app();
  // Nothing to do with the introduction: a line queued behind a long one.
  void a.voice.play('E04', 'gameplay');
  const queued = a.voice.play('S04', 'gameplay');
  a.tick(DEFAULT_QUEUE_STALE_MS + 1);
  await a.finish();
  assert.equal(await queued, 'dropped', 'stale protection is untouched for normal lines');
  assert.equal(a.voice.current(), null);
});

test('an ordinary line just inside the threshold is still played', async () => {
  const a = app();
  void a.voice.play('E04', 'gameplay');
  const queued = a.voice.play('S04', 'gameplay');
  a.tick(DEFAULT_QUEUE_STALE_MS - 1);
  await a.finish();
  assert.equal(a.voice.current(), 'S04');
  a.tick(VOICE_CLIPS.S04.durationMs);
  await a.finish();
  assert.equal(await queued, 'ended');
});

test('only the round-opening events are treated as the introduction', () => {
  const started: GameEvent = { type: 'GAME_STARTED', molecule: 'methane', carbonTarget: 1 };
  assert.equal(isRoundIntroduction(started), true);
  assert.equal(isRoundIntroduction({ type: 'PHASE_CHANGED', from: 'INTRO_OBJECTIVE', to: 'CARBON_SELECTION' }), true);
  // A wrong throw returns to the same phase; that is not the introduction.
  assert.equal(isRoundIntroduction({ type: 'PHASE_CHANGED', from: 'PAPER_FLIGHT', to: 'CARBON_SELECTION' }), false);
  assert.equal(isRoundIntroduction({ type: 'PHASE_CHANGED', from: 'MOLECULE_VALIDATION', to: 'HYDROGEN_CALCULATION' }), false);
  assert.equal(isRoundIntroduction({ type: 'TIME_WARNING', secondsLeft: 20 }), false);
  assert.equal(isRoundIntroduction({ type: 'MISTAKE_EXPLAINED', reason: { kind: 'TRAY_FULL' } }), false);
});

test('the lines after the introduction are ordinary queued lines', async () => {
  const a = app();
  await handover(a);
  for (const clip of [VOICE_CLIPS.V12, VOICE_CLIPS.M01, VOICE_CLIPS.M02, VOICE_CLIPS.S01]) {
    a.tick(clip.durationMs);
    await a.finish();
  }
  // The introduction is over; a later line queued behind a long one ages out.
  void a.voice.play('M03', 'gameplay');
  const later = a.voice.play('S04', 'gameplay');
  a.tick(DEFAULT_QUEUE_STALE_MS + 1);
  await a.finish();
  assert.equal(await later, 'dropped');
});

// ------------------------------------------------------------------ 6, 7

test('the lesson layer cannot cancel M01', async () => {
  const a = app();
  a.startRound('methane');
  await Promise.resolve();
  assert.equal(a.voice.current(), 'M01');
  a.lessons.enter('play');
  a.voice.stop('lesson');
  await Promise.resolve();
  assert.equal(a.voice.current(), 'M01');
  assert.equal(a.states.includes('M01:cancelled'), false);
});

test('gameplay cannot cancel V12', async () => {
  const a = app();
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  a.voice.cancelAll('gameplay');
  assert.equal(a.voice.current(), 'V12');
  assert.equal(a.states.includes('V12:cancelled'), false);
});

test('a round change discards the previous round introduction', async () => {
  // The exemption from ageing must not let an introduction outlive its round.
  const a = app();
  await handover(a);
  assert.deepEqual(a.voice.queuedSequence(), ['M01', 'M02', 'S01']);
  a.startRound('ethane');
  await Promise.resolve();
  assert.equal(a.voice.queued().includes('M01'), false, 'methane lines are gone');
  assert.equal(a.voice.queued().includes('M02'), false);
});

// ------------------------------------------------------------------ 8, 9, 10

test('a repeated commit does not duplicate the introduction', async () => {
  const a = app();
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  // React invokes effects, cleans up and invokes again in development.
  a.startRound('methane');
  a.lessons.enter('play');
  a.lessons.enter('play');
  await Promise.resolve();
  const opening = a.voice.queuedSequence().concat(a.voice.current() ? [a.voice.current()!] : []);
  assert.equal(opening.filter((id) => id === 'M01').length, 1);
  assert.equal(opening.filter((id) => id === 'M02').length, 1);
});

test('Back does not replay the introduction', async () => {
  const a = app();
  await handover(a);
  for (const clip of [VOICE_CLIPS.V12, VOICE_CLIPS.M01, VOICE_CLIPS.M02, VOICE_CLIPS.S01]) {
    a.tick(clip.durationMs);
    await a.finish();
  }
  const heard = a.started().length;
  a.lessons.enter('gameplay');            // Back out of the game
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  assert.equal(a.started().length, heard, 'V12 is not said again');
});

test('Forward into the game starts one new round, not two introductions', async () => {
  const a = app();
  await handover(a);
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finish();
  a.lessons.enter('gameplay');
  await Promise.resolve();
  a.startRound('methane');                 // Forward: a genuinely new round
  a.lessons.enter('play');
  await Promise.resolve();
  const opening = a.voice.queuedSequence().concat(a.voice.current() ? [a.voice.current()!] : []);
  assert.equal(opening.filter((id) => id === 'M01').length, 1, 'one introduction, not two');
  // The colour rule is once a session, so the new round does not repeat it.
  assert.equal(opening.includes('S01'), false);
});

// ------------------------------------------------------------------------ 11

test('a channel built muted fetches nothing, at the handover or in the round', async () => {
  const a = app({ muted: true });
  assert.equal(a.voice.isMuted(), true, 'silent from construction, not from a later effect');
  await handover(a);
  for (const clip of [VOICE_CLIPS.V12, VOICE_CLIPS.M01]) {
    a.tick(clip.durationMs);
    await a.finish();
  }
  assert.equal(a.made.length, 0, 'no audio element was ever created, so nothing was fetched');
  assert.equal(a.voice.current(), null);
  assert.deepEqual(a.started(), []);
});

test('the first thing asked of a muted channel is already refused', async () => {
  // The walkthrough asks for its line during the same commit that mounts it,
  // which is why the decision cannot wait for an effect.
  const a = app({ muted: true });
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  assert.equal(a.made.length, 0);
});
