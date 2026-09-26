import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LessonVoice, type VoiceChannel } from './lessonVoice.ts';
import { VOICE_CLIPS, type VoiceId } from './voiceClips.ts';
import { LESSON_VOICE, voiceForScreen } from './voiceForScreen.ts';
import { VoiceSession } from './voiceSession.ts';
import type { VoiceOutcome, VoiceOwner } from './VoiceManager.ts';

/**
 * A channel that records what it was asked to say.
 *
 * `outcome` decides what playing a clip resolves to, which is how the autoplay
 * refusal and the playback error are tested: both must leave the lesson exactly
 * as it was, because nothing in the flow waits for narration.
 */
class RecordingChannel implements VoiceChannel {
  played: VoiceId[] = [];
  stops = 0;
  cancels: string[] = [];
  private outcome: VoiceOutcome;
  private resolvers: Array<(outcome: VoiceOutcome) => void> = [];

  constructor(outcome: VoiceOutcome = 'ended') {
    this.outcome = outcome;
  }

  play(id: string, _owner?: VoiceOwner): Promise<VoiceOutcome> {
    this.played.push(id as VoiceId);
    return new Promise((resolve) => this.resolvers.push(resolve));
  }

  stop(owner?: VoiceOwner): void {
    if (owner && owner !== 'lesson') return;   // only the lesson layer's line
    this.stops += 1;
  }

  cancelAll(owner?: VoiceOwner): void {
    this.cancels.push(owner ?? 'all');
  }

  /** Lets the pending clips settle, as the element's events would. */
  async settle(outcome: VoiceOutcome = this.outcome): Promise<void> {
    const pending = this.resolvers;
    this.resolvers = [];
    for (const resolve of pending) resolve(outcome);
    await Promise.resolve();
    await Promise.resolve();
  }
}

function harness(outcome: VoiceOutcome = 'ended') {
  const channel = new RecordingChannel(outcome);
  const session = new VoiceSession();
  let clock = 0;
  const lessons = new LessonVoice(channel, session, () => (clock += 1));
  return { channel, session, lessons };
}

/** The lesson flow in order, as `SCREENS` has it. */
const FLOW = ['signIn', 'carbonIntro', 'carbonValency', 'prefixIntro', 'alkane', 'alkene', 'alkyne', 'screen67', 'screen68', 'screen69'];

// ------------------------------------------------------------------ the mapping

test('each lesson screen maps to its own clip, V01 to V10 in flow order', () => {
  assert.deepEqual(
    FLOW.map((screen) => voiceForScreen(screen)),
    ['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08', 'V09', 'V10'],
  );
  assert.equal(Object.keys(LESSON_VOICE).length, 10, 'ten lessons, no more');
  for (const id of Object.values(LESSON_VOICE)) {
    assert.equal(VOICE_CLIPS[id].category, 'lesson');
    // Lesson lines queue: they never cut each other off.
    assert.equal(VOICE_CLIPS[id].policy, 'QUEUE');
  }
});

test('the screens with no lesson line are silent', () => {
  // The walkthrough and the live game are Phase 5 and beyond.
  assert.equal(voiceForScreen('gameplay'), null);
  assert.equal(voiceForScreen('play'), null);
  assert.equal(voiceForScreen('nonsense'), null);
});

// ------------------------------------------------------------ once, and only once

test('V01 plays exactly once on entering the first screen', async () => {
  const { channel, lessons } = harness();
  lessons.enter('signIn');
  await channel.settle();
  assert.deepEqual(channel.played, ['V01']);
});

test('a rerender does not replay the line', async () => {
  const { channel, lessons } = harness();
  lessons.enter('carbonIntro');
  await channel.settle();
  // React re-runs an effect whenever it likes; the screen has not changed.
  lessons.enter('carbonIntro');
  lessons.enter('carbonIntro');
  lessons.enter('carbonIntro');
  await channel.settle();
  assert.deepEqual(channel.played, ['V02']);
});

test('React development double-invoke does not duplicate the line', async () => {
  const { channel, lessons } = harness();
  // Two synchronous calls, before anything has resolved: this is the effect
  // being invoked, cleaned up and invoked again.
  lessons.enter('carbonValency');
  lessons.enter('carbonValency');
  assert.deepEqual(channel.played, ['V03'], 'asked for once, although entered twice');
  await channel.settle();
  assert.deepEqual(channel.played, ['V03']);
});

test('a fresh controller over the same session does not repeat a line', async () => {
  // The controller is rebuilt (a remount); the session is not, because it is
  // what remembers. This is the other half of the development double-invoke.
  const channel = new RecordingChannel();
  const session = new VoiceSession();
  const first = new LessonVoice(channel, session, () => 1);
  first.enter('alkane');
  await channel.settle();
  const second = new LessonVoice(channel, session, () => 2);
  second.enter('alkane');
  await channel.settle();
  assert.deepEqual(channel.played, ['V05']);
});

// --------------------------------------------------------------- moving about

test('walking the whole lesson flow says all ten lines, in order, once each', async () => {
  const { channel, lessons } = harness();
  for (const screen of FLOW) {
    lessons.enter(screen);
    await channel.settle();
  }
  assert.deepEqual(channel.played, ['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08', 'V09', 'V10']);
});

test('V02 to V03 changes the line, and stops the one before it', async () => {
  const { channel, lessons } = harness();
  lessons.enter('carbonIntro');
  await channel.settle();
  const stopsBefore = channel.stops;
  lessons.enter('carbonValency');
  assert.deepEqual(channel.played, ['V02', 'V03']);
  assert.equal(channel.stops, stopsBefore + 1, 'the previous line was stopped, not left talking');
});

test('Back and forward do not repeat a line the student has heard', async () => {
  const { channel, lessons } = harness();
  lessons.enter('carbonIntro');
  await channel.settle();
  lessons.enter('carbonValency');
  await channel.settle();
  lessons.enter('carbonIntro'); // Back
  await channel.settle();
  lessons.enter('carbonValency'); // Forward
  await channel.settle();
  assert.deepEqual(channel.played, ['V02', 'V03'], 'each line was said once, on first arrival');
});

test('a refresh straight onto a lesson says that lesson line', async () => {
  // A reload is a new page: a new session, entering mid-flow from the URL.
  const { channel, lessons } = harness();
  lessons.enter('carbonValency');
  await channel.settle();
  assert.deepEqual(channel.played, ['V03'], 'not V01 - the screen the URL asked for');
});

test('leaving the lessons for the walkthrough lets the lesson line run until the walkthrough speaks', async () => {
  const { channel, lessons } = harness();
  lessons.enter('screen69');
  const stopsBefore = channel.stops;
  // The walkthrough screen itself has no line, so nothing is cut off here.
  lessons.enter('gameplay');
  assert.equal(channel.stops, stopsBefore, 'V10 is not cut off by the screen change alone');
  // Its first frame does have one, and that is what replaces V10.
  lessons.enterStep(0, 31);
  assert.equal(channel.stops, stopsBefore + 1);
  assert.deepEqual(channel.played, ['V10', 'V11']);
});

// ------------------------------------------------------------------- failing open

test('a refused autoplay leaves the lesson exactly as it was', async () => {
  const { channel, session, lessons } = harness('failed');
  lessons.enter('signIn');
  await channel.settle('failed');
  assert.deepEqual(channel.played, ['V01']);
  // Nothing was recorded as heard, because nothing was heard. The flow is
  // untouched either way: no state here can stop the card being pressed.
  assert.equal(session.spokenThisSession().has('V01'), false);
  // And the student moves on normally.
  lessons.enter('carbonIntro');
  await channel.settle('ended');
  assert.deepEqual(channel.played, ['V01', 'V02']);
});

test('a line the browser refused is still owed, so coming back plays it', async () => {
  const { channel, lessons } = harness();
  lessons.enter('signIn');
  await channel.settle('failed');
  lessons.enter('carbonIntro');
  await channel.settle('ended');
  // By now the student has clicked, so the page has the gesture the browser
  // was waiting for.
  lessons.enter('signIn');
  await channel.settle('ended');
  assert.deepEqual(channel.played, ['V01', 'V02', 'V01']);
});

test('a playback error does not stop the flow either', async () => {
  const { channel, lessons } = harness();
  lessons.enter('alkene');
  await channel.settle('failed');
  lessons.enter('alkyne');
  await channel.settle('ended');
  assert.deepEqual(channel.played, ['V06', 'V07']);
});

test('a line that was cut off counts as heard', async () => {
  const { channel, session, lessons } = harness();
  lessons.enter('alkane');
  await channel.settle('cancelled');
  assert.equal(session.spokenThisSession().has('V05'), true, 'it spoke, then was interrupted');
});

test('a muted channel drops the line and the flow is unaffected', async () => {
  const { channel, session, lessons } = harness('dropped');
  lessons.enter('carbonIntro');
  await channel.settle('dropped');
  assert.deepEqual(channel.played, ['V02'], 'asked for');
  assert.equal(session.spokenThisSession().has('V02'), false, 'never spoken, so still owed if unmuted');
  lessons.enter('carbonValency');
  await channel.settle('dropped');
  assert.deepEqual(channel.played, ['V02', 'V03']);
});
