import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ALKANE_CHALLENGES } from '../engine/config.ts';
import { GameEngine } from '../engine/engine.ts';
import { LessonVoice } from './lessonVoice.ts';
import { VoiceManager, type VoiceAudio, type VoiceState } from './VoiceManager.ts';
import { VOICE_CLIPS, type VoiceId } from './voiceClips.ts';
import { voiceForEvent } from './voiceForEvent.ts';
import { VoiceSession } from './voiceSession.ts';

/**
 * The walkthrough-to-first-round handover.
 *
 * A student reaching the last walkthrough frame and pressing on used to hear
 * "That's the whole-" and then silence, and never heard methane introduce
 * itself at all. Two layers were cancelling each other on the one channel: the
 * round's start cancelled the walkthrough's closing line, and the screen change
 * to the live game cancelled the round's opening line.
 *
 * These tests drive both layers against a real `VoiceManager` and a real
 * engine, in the order React commits them, so the sequence itself is the thing
 * under test rather than either layer alone.
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

/**
 * The two layers over one channel, wired the way the app wires them.
 *
 * `commit` runs a React commit: the child's effects (the live game) and then
 * the parent's (the screen), which is the order that produced the bug.
 */
const built: VoiceManager[] = [];
afterEach(() => {
  // A clip that never ends leaves a watchdog timer behind; disposing releases
  // it so the test process is not held open waiting.
  for (const voice of built.splice(0)) voice.dispose();
});

function app() {
  const made: FakeAudio[] = [];
  let clock = 0;
  const voice = new VoiceManager({
    createAudio: (src) => { const a = new FakeAudio(src); made.push(a); return a; },
    now: () => clock,
    watchdogGraceMs: 60_000,
  });
  built.push(voice);
  const states: string[] = [];
  voice.onState((id, state: VoiceState) => states.push(`${id}:${state}`));
  const session = new VoiceSession();
  const lessons = new LessonVoice(voice, session, () => clock);

  /** What `useGameVoice` does when it sees a new engine, then start(). */
  const startRound = (molecule: string) => {
    const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
    voice.cancelAll('gameplay');
    session.startRound();
    engine.bus.on((event) => {
      const snapshot = engine.snapshot();
      for (const id of voiceForEvent(event, {
        now: clock, molecule: snapshot.spec.name,
        round: session.spokenThisRound(), session: session.spokenThisSession(),
        completion: snapshot.summary?.completion, nextMolecule: 'ethane',
      })) {
        session.record(id, clock);
        void voice.play(id, 'gameplay');
      }
    });
    engine.start();
    return engine;
  };

  return {
    voice, session, lessons, made, states,
    tick: (ms: number) => { clock += ms; },
    /** Lets the clip now speaking run to its end. */
    finishSpeaking: async () => {
      const playing = made[made.length - 1];
      playing?.finish();
      await Promise.resolve();
      await Promise.resolve();
    },
    startRound,
    played: () => states.filter((s) => s.endsWith(':started')).map((s) => s.split(':')[0] as VoiceId),
  };
}

/** Reaching the last walkthrough frame, then pressing on into the game. */
async function handover(a: ReturnType<typeof app>) {
  a.lessons.enterStep(30, 31);            // V12 begins
  await Promise.resolve();
  // The press: React commits the live game. The child's effects run first.
  const engine = a.startRound('methane');
  a.lessons.enter('play');                // then the parent's
  await Promise.resolve();
  return engine;
}

// ------------------------------------------------------------------ 1, 2, 5

test('V12 is not cancelled when the round begins, and M01 waits its turn', async () => {
  const a = app();
  await handover(a);
  assert.equal(a.voice.current(), 'V12', 'still speaking');
  assert.equal(a.voice.currentOwner(), 'lesson');
  // The round asks for all three of its opening lines in the one tick, and all
  // three wait rather than cutting in.
  assert.deepEqual(a.voice.queued(), ['M01', 'M02', 'S01']);
  assert.equal(a.states.includes('V12:cancelled'), false, 'V12 was never cut off');
  assert.equal(a.states.includes('M01:cancelled'), false, 'and M01 was never cut off either');
});

test('V12 runs to its end and M01 then plays, with no overlap', async () => {
  const a = app();
  await handover(a);
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finishSpeaking();
  assert.equal(a.voice.current(), 'M01', 'M01 takes the channel once V12 is done');
  assert.equal(a.voice.currentOwner(), 'gameplay');
  const order = a.states.filter((s) => s.startsWith('V12') || s.startsWith('M01'));
  assert.deepEqual(order, ['V12:started', 'V12:playing', 'V12:ended', 'M01:started', 'M01:playing']);
});

test('M01 is not cancelled by the screen becoming the live game', async () => {
  // The exact failure: the screen change used to stop whatever was speaking,
  // and by then that was M01.
  const a = app();
  a.startRound('methane');
  await Promise.resolve();
  assert.equal(a.voice.current(), 'M01');
  a.lessons.enter('play');
  await Promise.resolve();
  assert.equal(a.voice.current(), 'M01', 'still speaking after the screen settled');
  assert.equal(a.states.includes('M01:cancelled'), false);
});

// ------------------------------------------------------------------ 3, 4

test('each of V12 and M01 plays exactly once through the handover', async () => {
  const a = app();
  await handover(a);
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finishSpeaking();
  a.tick(VOICE_CLIPS.M01.durationMs);
  await a.finishSpeaking();
  const played = a.played();
  assert.equal(played.filter((id) => id === 'V12').length, 1);
  assert.equal(played.filter((id) => id === 'M01').length, 1);
});

test('a repeated commit does not add a second V12 or M01', async () => {
  // React invokes effects, cleans up and invokes again in development.
  const a = app();
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  a.lessons.enterStep(30, 31);
  a.lessons.enter('play');
  a.lessons.enter('play');
  await Promise.resolve();
  const played = a.played();
  assert.equal(played.filter((id) => id === 'V12').length, 1);
});

// ------------------------------------------------------------------ 6

test('Back and forward across the seam adds no narration', async () => {
  const a = app();
  await handover(a);
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finishSpeaking();
  const before = a.played().length;

  // Back to the walkthrough: the round is over, so its line stops there.
  a.lessons.enter('gameplay');
  a.lessons.enterStep(30, 31);
  await Promise.resolve();
  assert.equal(a.played().filter((id) => id === 'V12').length, 1, 'V12 does not replay');

  // Forward into the game again: a new round, which introduces itself once.
  a.startRound('methane');
  a.lessons.enter('play');
  await Promise.resolve();
  const m01s = a.played().filter((id) => id === 'M01').length;
  assert.equal(m01s, 2, 'the second round is a real new round');
  assert.ok(a.played().length > before);
});

test('going back to a lesson ends the round narration rather than talking over it', async () => {
  const a = app();
  a.startRound('methane');
  await Promise.resolve();
  assert.equal(a.voice.currentOwner(), 'gameplay');
  a.lessons.enter('carbonIntro');
  await Promise.resolve();
  assert.equal(a.states.includes('M01:cancelled'), true, 'the round stops when a lesson is reached');
});

// ------------------------------------------------------------------ 7

test('arriving straight at the game, with no walkthrough, still narrates it', async () => {
  // A refresh onto the live game: there is no lesson line to protect.
  const a = app();
  a.lessons.enter('play');
  a.startRound('methane');
  await Promise.resolve();
  assert.equal(a.voice.current(), 'M01');
  assert.equal(a.voice.currentOwner(), 'gameplay');
  a.tick(VOICE_CLIPS.M01.durationMs);
  await a.finishSpeaking();
  assert.equal(a.voice.current(), 'M02', 'and the round carries on narrating itself');
});

// ------------------------------------------------------------------ 8

test('a muted channel loads nothing at the handover', async () => {
  const a = app();
  a.voice.setMuted(true);
  await handover(a);
  assert.equal(a.made.length, 0, 'no audio was created at all');
  assert.equal(a.voice.current(), null);
});

// ------------------------------------------------- ownership, stated directly

test('neither layer can cancel the other', async () => {
  const a = app();
  a.lessons.enterStep(30, 31);                 // a lesson line
  await Promise.resolve();
  a.voice.cancelAll('gameplay');               // the round tries to clear up
  assert.equal(a.voice.current(), 'V12', 'the lesson line survives');

  a.voice.stop('lesson');                      // and now the lesson layer ends it
  assert.equal(a.voice.current(), null);

  // Not awaited: `play` resolves when the clip ends, and this one is meant to
  // still be speaking.
  void a.voice.play('M03', 'gameplay');
  a.voice.stop('lesson');                      // a lesson change cannot end a round line
  assert.equal(a.voice.current(), 'M03');
  a.voice.cancelAll('gameplay');
  assert.equal(a.voice.current(), null);
});

// ------------------------------------------------- what the handover costs

test('the handover is paid for by the third and fourth lines, not the first', async () => {
  /**
   * A record of the trade, measured rather than assumed.
   *
   * The round asks for M01, M02 and S01 in one tick, behind a V12 that is now
   * allowed to finish. One channel and a 6s staleness rule cannot deliver all
   * four: V12 (3.07s) then M01 (5.06s) already puts M02's wait past 6s. So
   * restoring M01 costs M02 and S01 on this one transition.
   *
   * Every later round is unaffected - nothing is speaking when it starts - and
   * a round reached by refreshing straight into the game keeps all three, which
   * the test above shows.
   */
  const a = app();
  await handover(a);
  a.tick(VOICE_CLIPS.V12.durationMs);
  await a.finishSpeaking();
  assert.equal(a.voice.current(), 'M01');
  a.tick(VOICE_CLIPS.M01.durationMs);
  await a.finishSpeaking();

  const played = a.played();
  assert.deepEqual(played, ['V12', 'M01'], 'the walkthrough line and the introduction both survive');
  assert.equal(played.includes('M02'), false, 'the requirement line went stale waiting');
  assert.equal(played.includes('S01'), false, 'and so did the colour rule');
  assert.equal(a.voice.queued().length, 0, 'nothing is left hanging');
});
