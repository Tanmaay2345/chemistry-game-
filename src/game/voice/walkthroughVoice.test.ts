import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LessonVoice, type VoiceChannel } from './lessonVoice.ts';
import { VOICE_CLIPS, type VoiceId } from './voiceClips.ts';
import { voiceForWalkthroughStep } from './voiceForScreen.ts';
import { VoiceSession } from './voiceSession.ts';
import type { VoiceOutcome, VoiceOwner } from './VoiceManager.ts';

/** The real walkthrough: 31 frames, the last of which is `ethane-15`. */
const STEPS = 31;

class RecordingChannel implements VoiceChannel {
  played: VoiceId[] = [];
  stops = 0;
  cancels: string[] = [];
  private resolvers: Array<(outcome: VoiceOutcome) => void> = [];

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

  async settle(outcome: VoiceOutcome = 'ended'): Promise<void> {
    const pending = this.resolvers;
    this.resolvers = [];
    for (const resolve of pending) resolve(outcome);
    await Promise.resolve();
    await Promise.resolve();
  }
}

function harness() {
  const channel = new RecordingChannel();
  const session = new VoiceSession();
  let clock = 0;
  return { channel, session, lessons: new LessonVoice(channel, session, () => (clock += 1)) };
}

/** Arriving at the walkthrough the way the flow does: screen first, then frame. */
async function openWalkthrough(h: ReturnType<typeof harness>) {
  h.lessons.enter('screen69');
  await h.channel.settle();
  h.lessons.enter('gameplay');
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle();
}

// ------------------------------------------------------------------ the mapping

test('only the first and last frames are narrated', () => {
  assert.equal(voiceForWalkthroughStep(0, STEPS), 'V11');
  assert.equal(voiceForWalkthroughStep(STEPS - 1, STEPS), 'V12');
  for (let index = 1; index < STEPS - 1; index++) {
    assert.equal(voiceForWalkthroughStep(index, STEPS), null, `frame ${index} is silent`);
  }
});

test('the two walkthrough clips are lesson clips that queue', () => {
  for (const id of ['V11', 'V12'] as VoiceId[]) {
    assert.equal(VOICE_CLIPS[id].category, 'lesson');
    assert.equal(VOICE_CLIPS[id].policy, 'QUEUE');
  }
});

test('a one-frame walkthrough does not say both lines on the same frame', () => {
  assert.equal(voiceForWalkthroughStep(0, 1), 'V11');
});

// ------------------------------------------------------------ once, and only once

test('V11 plays exactly once on the first frame', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle();
  assert.deepEqual(h.channel.played, ['V11']);
});

test('V12 plays exactly once on the last frame', async () => {
  const h = harness();
  h.lessons.enterStep(STEPS - 1, STEPS);
  await h.channel.settle();
  assert.deepEqual(h.channel.played, ['V12']);
});

test('a rerender on the same frame does not replay the line', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle();
  h.lessons.enterStep(0, STEPS);
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle();
  assert.deepEqual(h.channel.played, ['V11']);
});

test('React development double-invoke does not duplicate the line', async () => {
  const h = harness();
  // Two synchronous calls before anything resolves.
  h.lessons.enterStep(0, STEPS);
  h.lessons.enterStep(0, STEPS);
  assert.deepEqual(h.channel.played, ['V11'], 'asked for once although entered twice');
  await h.channel.settle();
  assert.deepEqual(h.channel.played, ['V11']);
});

test('a rebuilt controller over the same session does not repeat a line', async () => {
  const channel = new RecordingChannel();
  const session = new VoiceSession();
  new LessonVoice(channel, session, () => 1).enterStep(0, STEPS);
  await channel.settle();
  new LessonVoice(channel, session, () => 2).enterStep(0, STEPS);
  await channel.settle();
  assert.deepEqual(channel.played, ['V11']);
});

// ------------------------------------------------------------- walking the frames

test('walking all 31 frames says V11 then V12 and nothing else', async () => {
  const h = harness();
  for (let index = 0; index < STEPS; index++) {
    h.lessons.enterStep(index, STEPS);
    await h.channel.settle();
  }
  assert.deepEqual(h.channel.played, ['V11', 'V12']);
});

test('the frames in between do not stop the line that is playing', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  const stopsAfterStart = h.channel.stops;
  // The flow advances several of these on its own 450-800 ms timers.
  for (let index = 1; index < 6; index++) h.lessons.enterStep(index, STEPS);
  assert.equal(h.channel.stops, stopsAfterStart, 'V11 is left to finish');
});

test('reaching the last frame stops V11 if it is somehow still speaking', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  const before = h.channel.stops;
  h.lessons.enterStep(STEPS - 1, STEPS);
  assert.equal(h.channel.stops, before + 1);
  assert.deepEqual(h.channel.played, ['V11', 'V12']);
});

// ------------------------------------------------- the screen and its own frames

test('entering the walkthrough silences the lesson line but not its own line', async () => {
  const h = harness();
  await openWalkthrough(h);
  assert.deepEqual(h.channel.played, ['V10', 'V11']);
});

test('the order React runs the two effects in does not matter', async () => {
  // React runs a child's effects before its parent's, so the frame is usually
  // announced before the screen. Both orders must leave V11 speaking.
  const childFirst = harness();
  childFirst.lessons.enter('screen69');
  await childFirst.channel.settle();
  childFirst.lessons.enterStep(0, STEPS);
  childFirst.lessons.enter('gameplay');
  await childFirst.channel.settle();
  assert.deepEqual(childFirst.channel.played, ['V10', 'V11']);

  const parentFirst = harness();
  parentFirst.lessons.enter('screen69');
  await parentFirst.channel.settle();
  parentFirst.lessons.enter('gameplay');
  parentFirst.lessons.enterStep(0, STEPS);
  await parentFirst.channel.settle();
  assert.deepEqual(parentFirst.channel.played, ['V10', 'V11']);
});

test('leaving the walkthrough for the live game lets V12 finish', async () => {
  // The line is about this very step - "that's the whole loop, now it's your
  // turn" - so the round starting underneath it must not cut it off. Verified
  // in a real session to have been truncated at 0.7s of 3.07s before this.
  const h = harness();
  h.lessons.enterStep(STEPS - 1, STEPS);
  const before = h.channel.stops;
  h.lessons.enter('play');
  assert.equal(h.channel.stops, before, 'V12 is left to finish');
  assert.deepEqual(h.channel.cancels, [], 'and entering the game ends no round either');
  assert.deepEqual(h.channel.played, ['V12'], 'the game itself still has no lesson line');
});

test('arriving at a screen that is not the game ends the round narration', async () => {
  // A summary line must not carry on talking over a lesson.
  const h = harness();
  h.lessons.enter('play');
  assert.deepEqual(h.channel.cancels, [], 'nothing is ended on the way in');
  h.lessons.enter('gameplay');
  assert.deepEqual(h.channel.cancels, ['gameplay'], 'the round is over');
  h.lessons.enter('carbonIntro');
  assert.deepEqual(h.channel.cancels, ['gameplay', 'gameplay'], 'and again on a lesson');
});

test('walking the walkthrough frames never ends the round narration', async () => {
  // The frames sit inside the gameplay screen, whose arrival already said so.
  const h = harness();
  h.lessons.enter('gameplay');
  h.channel.cancels.length = 0;
  for (let index = 0; index < 5; index++) h.lessons.enterStep(index, STEPS);
  assert.deepEqual(h.channel.cancels, []);
});

test('the live game has no narration of its own yet', async () => {
  const h = harness();
  h.lessons.enter('play');
  await h.channel.settle();
  assert.deepEqual(h.channel.played, [], 'Phase 6 wires the gameplay clips, not this one');
});

test('a walkthrough frame can never reach a gameplay clip', () => {
  const reachable = new Set<VoiceId>();
  for (let index = 0; index < STEPS; index++) {
    const id = voiceForWalkthroughStep(index, STEPS);
    if (id) reachable.add(id);
  }
  assert.deepEqual([...reachable].sort(), ['V11', 'V12']);
  for (const id of reachable) {
    assert.ok(!/^[MEPSTG]/.test(id), `${id} is not a molecule, feedback, timer or summary clip`);
  }
});

// ----------------------------------------------------------------- moving about

test('going Back to the first frame does not replay V11', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle();
  h.lessons.enterStep(1, STEPS);
  await h.channel.settle();
  h.lessons.enterStep(0, STEPS); // Back
  await h.channel.settle();
  assert.deepEqual(h.channel.played, ['V11'], 'said once, as the script marks it');
});

test('leaving the walkthrough and returning does not replay its lines', async () => {
  const h = harness();
  await openWalkthrough(h);
  h.lessons.enter('play');
  await h.channel.settle();
  h.lessons.enter('gameplay');
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle();
  assert.deepEqual(h.channel.played, ['V10', 'V11']);
});

// ------------------------------------------------------------------- failing open

test('a refused autoplay leaves the walkthrough fully usable', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle('failed');
  assert.equal(h.session.spokenThisSession().has('V11'), false, 'never heard, so still owed');
  // The frames keep advancing regardless: nothing here waits on narration.
  for (let index = 1; index < STEPS; index++) h.lessons.enterStep(index, STEPS);
  await h.channel.settle('ended');
  assert.deepEqual(h.channel.played, ['V11', 'V12']);
});

test('a playback error does not stop the walkthrough either', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle('failed');
  h.lessons.enterStep(STEPS - 1, STEPS);
  await h.channel.settle('ended');
  assert.deepEqual(h.channel.played, ['V11', 'V12']);
});

test('a muted channel drops both lines and the walkthrough is unaffected', async () => {
  const h = harness();
  h.lessons.enterStep(0, STEPS);
  await h.channel.settle('dropped');
  h.lessons.enterStep(STEPS - 1, STEPS);
  await h.channel.settle('dropped');
  assert.deepEqual(h.channel.played, ['V11', 'V12'], 'asked for');
  assert.equal(h.session.spokenThisSession().size, 0, 'never spoken, so still owed if unmuted');
});
