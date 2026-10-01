import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LessonVoice, type VoiceChannel } from './lessonVoice.ts';
import { VOICE_CLIPS, type VoiceId } from './voiceClips.ts';
import { voiceForPrefix } from './voiceForScreen.ts';
import { VoiceSession } from './voiceSession.ts';
import type { VoiceOutcome, VoiceOwner } from './VoiceManager.ts';

/** The rail's own timing, from `screens/prefixes/data/prefixes.ts`. */
const HOLD_MS = 2600;
const CHIPS = 10;

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
    if (owner && owner !== 'lesson') return;
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
  let clock = 0;
  const lessons = new LessonVoice(channel, new VoiceSession(), () => (clock += 1));
  return { channel, lessons };
}

/** Walks the rail exactly as the screen does: every chip, then the rest. */
function walkRail(lessons: LessonVoice): void {
  for (let i = 0; i < CHIPS; i += 1) lessons.enterPrefix(i, false);
  lessons.enterPrefix(-1, true);
}

// ------------------------------------------------------------------ the mapping

test('the rail speaks on the chips the script names, and nowhere else', () => {
  assert.equal(voiceForPrefix(0, false), 'V13', 'Meth');
  assert.equal(voiceForPrefix(1, false), 'V14', 'Eth');
  assert.equal(voiceForPrefix(2, false), 'V15', 'Prop');
  assert.equal(voiceForPrefix(3, false), 'V16', 'But, and the rest as they appear');
  for (let i = 4; i < CHIPS; i += 1) {
    assert.equal(voiceForPrefix(i, false), null, `chip ${i} is silent while the rail moves`);
  }
  assert.equal(voiceForPrefix(-1, true), 'V17', 'the closing line');
});

test('the rail lines are lesson clips that queue', () => {
  for (const id of ['V13', 'V14', 'V15', 'V16', 'V17'] as VoiceId[]) {
    assert.equal(VOICE_CLIPS[id].category, 'lesson');
    // The crux: a line longer than its chip must not be cut off by the next.
    assert.equal(VOICE_CLIPS[id].policy, 'QUEUE');
  }
});

// ------------------------------------------------------------------- the sequence

test('walking the rail says the five lines in order, once each', async () => {
  const { channel, lessons } = harness();
  walkRail(lessons);
  await channel.settle();
  assert.deepEqual(channel.played, ['V13', 'V14', 'V15', 'V16', 'V17']);
});

test('a line is never cut off by the chip that follows it', async () => {
  const { channel, lessons } = harness();
  walkRail(lessons);
  // Every line belongs to one animation; stopping the layer mid-sequence would
  // clip "One carbon? Meth" the moment the rail reached Eth.
  assert.equal(channel.stops, 0, 'nothing in the sequence interrupts');
});

test('the rail does not end the round narration', async () => {
  const { channel, lessons } = harness();
  walkRail(lessons);
  assert.deepEqual(channel.cancels, [], 'arriving at the screen already did that');
});

test('a rerender, or a learner jumping back, does not repeat a line', async () => {
  const { channel, lessons } = harness();
  lessons.enterPrefix(0, false);
  lessons.enterPrefix(0, false);
  lessons.enterPrefix(0, false);
  await channel.settle();
  assert.deepEqual(channel.played, ['V13']);

  // Taking over the rail and going back to Meth: the line is already spent.
  lessons.enterPrefix(1, false);
  await channel.settle();
  lessons.enterPrefix(0, false);
  await channel.settle();
  assert.deepEqual(channel.played, ['V13', 'V14'], 'Meth is not said twice');
});

test('a learner who jumps straight to a later chip hears that chip, not the ones skipped', async () => {
  const { channel, lessons } = harness();
  lessons.enterPrefix(3, false);
  await channel.settle();
  assert.deepEqual(channel.played, ['V16']);
});

// --------------------------------------------------------------------- the timing

test('each named chip is still showing while its own line is spoken', () => {
  // The lines queue from the moment the rail opens, so a line is only heard on
  // its own chip if everything before it has finished speaking by the time that
  // chip appears. This is the arithmetic the wording was cut to satisfy; it is
  // what stops "Two carbons? Eth." playing over Prop.
  const named: VoiceId[] = ['V13', 'V14', 'V15'];
  let speakingUntil = 0;
  named.forEach((id, chip) => {
    const appears = chip * HOLD_MS;
    const starts = Math.max(appears, speakingUntil);
    speakingUntil = starts + VOICE_CLIPS[id].durationMs;
    assert.equal(starts, appears, `${id} waits for the channel instead of opening on its chip`);
    assert.ok(
      speakingUntil <= appears + HOLD_MS,
      `${id} is still speaking when the rail has moved past its chip`,
    );
  });
});

test('the line about the remaining chips may run across them', () => {
  // V16 names seven chips that appear over the next 18 seconds, so unlike the
  // three above it is meant to outlast the chip that triggers it.
  assert.ok(VOICE_CLIPS.V16.durationMs > HOLD_MS);
});

test('the closing line begins only once the rail has come to rest', () => {
  const railRests = (CHIPS - 1) * HOLD_MS;
  const beforeIt = (['V13', 'V14', 'V15', 'V16'] as VoiceId[])
    .reduce((total, id) => total + VOICE_CLIPS[id].durationMs, 0);
  assert.ok(beforeIt < railRests, 'the sequence is finished before Dec arrives');
  assert.ok(VOICE_CLIPS.V17.durationMs > 0);
});
