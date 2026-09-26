import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_QUEUE_STALE_MS, VoiceManager, type VoiceAudio, type VoiceState } from './VoiceManager.ts';
import { VOICE_CLIPS, type VoiceId } from './voiceClips.ts';

/**
 * A stand-in for the `<audio>` element.
 *
 * The tests run under `node --test`, where there is no DOM, so the manager is
 * given one of these. It records what was asked of it and lets a test say when
 * the clip ended or failed - which is the point: nothing here guesses at
 * timings, the events are fired deliberately.
 */
class FakeAudio implements VoiceAudio {
  src: string;
  muted = false;
  currentTime = 0;
  paused = false;
  playCalls = 0;
  private handlers = new Map<string, Set<() => void>>();
  private resolvePlay: (() => void) | null = null;
  private rejectPlay: (() => void) | null = null;

  // Written out rather than declared as a constructor parameter property:
  // Node strips types without transforming, and that syntax needs a transform.
  private readonly mode: 'resolve' | 'reject' | 'pending';

  constructor(src: string, mode: 'resolve' | 'reject' | 'pending' = 'resolve') {
    this.src = src;
    this.mode = mode;
  }

  play(): Promise<void> {
    this.playCalls += 1;
    if (this.mode === 'reject') return Promise.reject(new Error('NotAllowedError'));
    if (this.mode === 'pending') return new Promise((resolve, reject) => { this.resolvePlay = resolve as () => void; this.rejectPlay = reject as () => void; });
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(type: string, handler: () => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: () => void): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** How many listeners are still attached - for the cleanup test. */
  listenerCount(): number {
    let total = 0;
    for (const set of this.handlers.values()) total += set.size;
    return total;
  }

  fire(type: 'ended' | 'error'): void {
    for (const handler of [...(this.handlers.get(type) ?? [])]) handler();
  }

  allowPlay(): void {
    this.resolvePlay?.();
  }

  refusePlay(): void {
    this.rejectPlay?.();
  }
}

/** A manager whose elements the test keeps hold of, and whose clock it owns. */
function harness(options: { mode?: 'resolve' | 'reject' | 'pending'; now?: () => number } = {}) {
  const made: FakeAudio[] = [];
  const voice = new VoiceManager({
    createAudio: (src) => {
      const audio = new FakeAudio(src, options.mode ?? 'resolve');
      made.push(audio);
      return audio;
    },
    now: options.now,
    // Long enough never to fire by accident in a test that is not about it.
    watchdogGraceMs: 60_000,
  });
  const states: Array<[VoiceId, VoiceState]> = [];
  voice.onState((id, state) => states.push([id, state]));
  return { voice, made, states, last: () => made[made.length - 1] };
}

// ------------------------------------------------------------------ clip lookup

test('every clip resolves to a file under the voice directory', () => {
  for (const clip of Object.values(VOICE_CLIPS)) {
    assert.equal(clip.src, `/audio/voice/${clip.id}.mp3`);
    assert.ok(clip.durationMs > 400, `${clip.id} has a real duration`);
  }
});

test('an id that is not one of the 41 fails instead of throwing', async () => {
  const { voice, made } = harness();
  assert.equal(await voice.play('NOPE'), 'failed');
  assert.equal(await voice.play(''), 'failed');
  assert.equal(made.length, 0, 'nothing was loaded');
  assert.equal(voice.isSpeaking(), false);
});

// ------------------------------------------------------------------ play / stop

test('playing a clip loads its file and reports started then playing', async () => {
  const { voice, made, states, last } = harness();
  const playing = voice.play('V02');
  assert.equal(voice.current(), 'V02', 'recorded before any await, so a doubled call can see it');
  assert.equal(made.length, 1);
  assert.equal(made[0].src, '/audio/voice/V02.mp3');
  assert.equal(made[0].playCalls, 1);
  await Promise.resolve();
  last().fire('ended');
  assert.equal(await playing, 'ended');
  assert.deepEqual(states, [['V02', 'started'], ['V02', 'playing'], ['V02', 'ended']]);
  assert.equal(voice.isSpeaking(), false, 'the channel is free again');
});

test('stop cancels what is speaking and pauses the element', async () => {
  const { voice, last } = harness();
  const playing = voice.play('V03');
  voice.stop();
  assert.equal(await playing, 'cancelled');
  assert.equal(last().paused, true);
  assert.equal(voice.current(), null);
});

test('cancelAll clears the queue as well as the clip', async () => {
  const { voice } = harness();
  const first = voice.play('V02');
  const queued = voice.play('V03');
  assert.deepEqual(voice.queued(), ['V03']);
  voice.cancelAll();
  assert.equal(await first, 'cancelled');
  assert.equal(await queued, 'dropped');
  assert.deepEqual(voice.queued(), []);
});

// ------------------------------------------------------------------ failure paths

test('a playback error frees the channel', async () => {
  const { voice, last } = harness();
  const playing = voice.play('V02');
  await Promise.resolve();
  last().fire('error');
  assert.equal(await playing, 'failed');
  assert.equal(voice.isSpeaking(), false);
});

test('a rejected play() resolves as failed and never hangs', async () => {
  const { voice, states } = harness({ mode: 'reject' });
  // This is the autoplay case: the browser refuses before a gesture. It must
  // resolve, so nothing waiting on narration can be left waiting.
  assert.equal(await voice.play('V01'), 'failed');
  assert.equal(voice.isSpeaking(), false);
  assert.deepEqual(states, [['V01', 'started'], ['V01', 'failed']]);
});

test('a refused play() part-way through also frees the channel', async () => {
  const { voice, last } = harness({ mode: 'pending' });
  const playing = voice.play('V02');
  last().refusePlay();
  assert.equal(await playing, 'failed');
  assert.equal(voice.isSpeaking(), false);
});

test('a clip whose element goes quiet is given up on rather than holding the channel', async () => {
  const made: FakeAudio[] = [];
  const voice = new VoiceManager({
    createAudio: (src) => { const a = new FakeAudio(src); made.push(a); return a; },
    watchdogGraceMs: 5,
  });
  // Neither `ended` nor `error` is ever fired.
  const outcome = await voice.play('T01');
  assert.equal(outcome, 'failed');
  assert.equal(voice.isSpeaking(), false);
});

// ------------------------------------------------------------------ policies

test('DROP skips a clip while anything is speaking', async () => {
  const { voice } = harness();
  const first = voice.play('V02');
  // S02 is a repeatable mistake explanation: three quick mistakes must not
  // stack three explanations.
  assert.equal(VOICE_CLIPS.S02.policy, 'DROP');
  assert.equal(await voice.play('S02'), 'dropped');
  assert.deepEqual(voice.queued(), []);
  voice.stop();
  await first;
});

test('QUEUE waits its turn and then plays', async () => {
  const { voice, made, last } = harness();
  assert.equal(VOICE_CLIPS.S04.policy, 'QUEUE');
  const first = voice.play('M02');
  const second = voice.play('S04');
  assert.deepEqual(voice.queued(), ['S04']);
  await Promise.resolve();
  last().fire('ended');
  assert.equal(await first, 'ended');
  assert.equal(made.length, 2, 'the queued clip started once the channel freed');
  assert.equal(made[1].src, '/audio/voice/S04.mp3');
  await Promise.resolve();
  made[1].fire('ended');
  assert.equal(await second, 'ended');
});

test('a queued teaching clip still waiting inside the threshold is played', async () => {
  // The case a real round produces: E02 asked for in the same tick as E01,
  // which speaks for 5.45s. Anything shorter than the threshold is still owed.
  let clock = 0;
  const { voice, made, last } = harness({ now: () => clock });
  const first = voice.play('E01');
  const queued = voice.play('E02');
  clock = DEFAULT_QUEUE_STALE_MS - 1;
  await Promise.resolve();
  last().fire('ended');
  assert.equal(await first, 'ended');
  assert.equal(made.length, 2, 'the queued line started');
  assert.equal(made[1].src, '/audio/voice/E02.mp3');
  await Promise.resolve();
  made[1].fire('ended');
  assert.equal(await queued, 'ended');
});

test('a queued teaching clip whose moment has genuinely passed is dropped', async () => {
  let clock = 0;
  const { voice, made, last } = harness({ now: () => clock });
  const first = voice.play('M02');
  const stale = voice.play('S04');
  clock = DEFAULT_QUEUE_STALE_MS + 1;
  await Promise.resolve();
  last().fire('ended');
  assert.equal(await first, 'ended');
  assert.equal(await stale, 'dropped');
  assert.equal(made.length, 1, 'it was never loaded');
});

test('the threshold is six seconds, and it is the queue that uses it', () => {
  // Only QUEUE clips ever wait: DROP skips and INTERRUPT cuts in. So this is
  // the teaching narration's threshold and nothing else's.
  assert.equal(DEFAULT_QUEUE_STALE_MS, 6000);
  for (const id of ['M04', 'E02', 'E04', 'G01', 'S01', 'S04'] as const) {
    assert.equal(VOICE_CLIPS[id].policy, 'QUEUE');
  }
});

test('the clips that were dropped in a measured round now fit inside the threshold', async () => {
  // The waits observed in the real-time playthrough, longest first.
  const observed: Array<[string, string, number]> = [
    ['E02', 'behind E01', VOICE_CLIPS.E01.durationMs],
    ['M04', 'behind M03', VOICE_CLIPS.M03.durationMs - 1100],
    ['G01', 'behind M05', VOICE_CLIPS.M05.durationMs],
    ['E04', 'behind E03', VOICE_CLIPS.E03.durationMs - 2600],
    ['G03', 'behind P05', VOICE_CLIPS.P05.durationMs],
  ];
  for (const [id, behind, wait] of observed) {
    assert.ok(wait < DEFAULT_QUEUE_STALE_MS, `${id} ${behind} waits ${wait}ms, inside the threshold`);
  }
});

test('INTERRUPT cuts the current clip and clears the queue', async () => {
  const { voice, made } = harness();
  assert.equal(VOICE_CLIPS.T01.policy, 'INTERRUPT');
  const speaking = voice.play('E04');
  const waiting = voice.play('S04');
  const warning = voice.play('T01');
  assert.equal(await speaking, 'cancelled');
  assert.equal(await waiting, 'dropped', 'nothing behind the warning is worth saying now');
  assert.equal(voice.current(), 'T01');
  assert.equal(made[made.length - 1].src, '/audio/voice/T01.mp3');
  voice.stop();
  await warning;
});

// ------------------------------------------- duplicates, mute, cleanup, disposal

test('the same clip cannot be started twice while it is speaking', async () => {
  const { voice, made } = harness();
  const first = voice.play('V02');
  // React invokes effects twice in development; this is that, synchronously.
  assert.equal(await voice.play('V02'), 'dropped');
  assert.equal(made.length, 1, 'only one element was ever created');
  voice.stop();
  await first;
});

test('a clip already waiting in the queue is not queued a second time', async () => {
  const { voice } = harness();
  const first = voice.play('V02');
  const queued = voice.play('S04');
  assert.equal(await voice.play('S04'), 'dropped');
  assert.deepEqual(voice.queued(), ['S04']);
  voice.cancelAll();
  await Promise.all([first, queued]);
});

test('muting silences narration and stops what is speaking', async () => {
  const { voice, made } = harness();
  const speaking = voice.play('V02');
  voice.setMuted(true);
  assert.equal(await speaking, 'cancelled');
  assert.equal(await voice.play('V03'), 'dropped');
  assert.equal(made.length, 1, 'nothing was loaded while muted');
  assert.equal(voice.isMuted(), true);
  voice.setMuted(false);
  const again = voice.play('V03');
  assert.equal(voice.current(), 'V03');
  voice.stop();
  await again;
});

test('listeners are removed when a clip finishes, is cancelled, or fails', async () => {
  const { voice, made, last } = harness();
  const ended = voice.play('V02');
  assert.ok(last().listenerCount() > 0, 'attached while playing');
  await Promise.resolve();
  last().fire('ended');
  await ended;
  assert.equal(made[0].listenerCount(), 0, 'removed after ending');

  const cancelled = voice.play('V03');
  voice.stop();
  await cancelled;
  assert.equal(made[1].listenerCount(), 0, 'removed after cancelling');

  const failed = voice.play('V04');
  await Promise.resolve();
  made[2].fire('error');
  await failed;
  assert.equal(made[2].listenerCount(), 0, 'removed after failing');
});

test('an ended event arriving after cancellation changes nothing', async () => {
  const { voice, last } = harness();
  const playing = voice.play('V02');
  voice.stop();
  assert.equal(await playing, 'cancelled');
  last().fire('ended'); // a late event from a discarded element
  assert.equal(voice.isSpeaking(), false);
});

test('a disposed manager plays nothing and keeps no listeners', async () => {
  const { voice, made } = harness();
  const playing = voice.play('V02');
  voice.dispose();
  assert.equal(await playing, 'cancelled');
  assert.equal(await voice.play('V03'), 'failed');
  assert.equal(made.length, 1);
});

test('state can be followed and unsubscribed from', async () => {
  const { voice, last } = harness();
  const seen: string[] = [];
  const off = voice.onState((id, state) => seen.push(`${id}:${state}`));
  const first = voice.play('V02');
  await Promise.resolve();
  last().fire('ended');
  await first;
  off();
  const second = voice.play('V03');
  voice.stop();
  await second;
  assert.deepEqual(seen, ['V02:started', 'V02:playing', 'V02:ended']);
});
