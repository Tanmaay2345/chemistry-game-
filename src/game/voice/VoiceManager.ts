import { clipFor, type VoiceClip, type VoiceId } from './voiceClips.ts';

/**
 * Plays the narration: one voice, one clip at a time.
 *
 * A peer of `AudioManager`, deliberately not a user of it. The effects are
 * short, overlapping and scheduled, which is why they are Web Audio; narration
 * is long, spoken and never overlaps itself, so it is an `<audio>` element -
 * it streams instead of decoding four minutes of speech up front, and it gives
 * a real `ended` event to wait on. The two layers share no state, so muting or
 * removing one leaves the other alone.
 *
 * Nothing here knows chemistry, and nothing here can move the game on. It is
 * told which clip to play and reports what happened; the engine remains the
 * only authority over game state.
 */

/** How a request ended. `play()` resolves with one of these and never rejects. */
export type VoiceOutcome =
  /** Played to the end. */
  | 'ended'
  /** Stopped part-way: an INTERRUPT, a round change, a tab going away. */
  | 'cancelled'
  /** Never started: policy said skip, the channel was muted, the queue went stale. */
  | 'dropped'
  /** Tried and could not: autoplay refused, file missing, decode failed. */
  | 'failed';

/** What the channel is doing, for anything that wants to follow along. */
export type VoiceState = 'started' | 'playing' | 'ended' | 'cancelled' | 'failed';

/**
 * The part of `HTMLAudioElement` this uses.
 *
 * Narrow on purpose: the tests run under `node --test`, where there is no DOM,
 * so the element is injected. A real `Audio` satisfies this as it is.
 */
export type VoiceAudio = {
  src: string;
  muted: boolean;
  currentTime: number;
  /** Set where the element supports it; the fake in the tests does not. */
  preload?: string;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, handler: () => void): void;
  removeEventListener(type: string, handler: () => void): void;
};

export type VoiceStateListener = (id: VoiceId, state: VoiceState) => void;

/**
 * Which layer asked for a clip.
 *
 * The channel is shared - there is one voice - but the two layers that speak on
 * it have separate lifecycles. The lessons and the walkthrough own their lines
 * until the learner leaves them; a round owns its lines until the round ends.
 * Naming the owner is what lets one layer end its own narration without
 * reaching into the other's: a round starting must not cut off the line the
 * walkthrough is still speaking, and a screen change must not cut off the line
 * the round has just begun.
 */
export type VoiceOwner = 'lesson' | 'gameplay';

/**
 * How a clip was asked for.
 *
 * `sequence` names an ordered group that belongs together - the lines a round
 * opens with, for instance. A queued clip normally ages out, because narration
 * said long after the thing it describes is worse than silence. A clip in a
 * sequence does not: the group is one statement, and dropping its middle would
 * leave the student with an introduction that stops halfway. The group is still
 * discarded wholesale when the round it belongs to ends, which is what keeps it
 * from ever describing the wrong molecule.
 */
export type VoiceRequest = { sequence?: string };

/**
 * How long a queued teaching line may wait before its moment has passed.
 *
 * Raised from the design document's 2s after a real-time playthrough showed
 * that threshold silently dropping most of the teaching narration. See
 * `queueStaleMs`.
 */
export const DEFAULT_QUEUE_STALE_MS = 6000;

export type VoiceManagerOptions = {
  /** Injected in tests; in the browser this is `new Audio(src)`. */
  createAudio?: (src: string) => VoiceAudio;
  now?: () => number;
  /**
   * A queued clip whose moment has passed is dropped rather than played late.
   *
   * Only QUEUE clips ever wait here - DROP never queues and INTERRUPT never
   * waits - so this is the teaching narration's threshold and nothing else's.
   *
   * The design document's original 2s turned out to drop most of the teaching
   * lines in real play, because the engine raises two of them in the same tick
   * (`GAME_STARTED` then `CARBON_SELECTION`) and because several clips outrun
   * the beat they play on. A measured round lost M04 behind M03, G01 behind
   * M05 and E02 behind E01 - the longest of those waits being E01's 5.45s. 6s
   * covers them while still dropping a line whose moment has genuinely gone.
   */
  queueStaleMs?: number;
  /** Starts silent, before anything can be asked for. */
  muted?: boolean;
  /**
   * How long past a clip's own length to wait before giving up on it.
   *
   * The channel must never be held by an element that stopped reporting -
   * a stalled network, a tab that was away, a file that decodes short. This is
   * a safety net for the channel, never a substitute for `ended`.
   */
  watchdogGraceMs?: number;
};

type Pending = {
  clip: VoiceClip;
  owner: VoiceOwner;
  sequence?: string;
  enqueuedAt: number;
  resolve: (outcome: VoiceOutcome) => void;
};

type Playing = {
  clip: VoiceClip;
  owner: VoiceOwner;
  audio: VoiceAudio;
  resolve: (outcome: VoiceOutcome) => void;
  /** Removes the element's listeners and the watchdog. Idempotent. */
  teardown: () => void;
  settled: boolean;
};

/**
 * The only line in this file that touches the browser.
 *
 * Reached through `globalThis` rather than naming `Audio` directly: the tests
 * are typechecked without the DOM library (`tsconfig.test.json`), and this file
 * is imported by them. A real `HTMLAudioElement` satisfies `VoiceAudio` as it
 * stands, so nothing is cast away here beyond the constructor itself.
 */
function browserAudio(src: string): VoiceAudio {
  const Ctor = (globalThis as { Audio?: new (src?: string) => VoiceAudio }).Audio;
  if (!Ctor) throw new Error('no Audio in this environment');
  const audio = new Ctor(src);
  audio.preload = 'auto';
  return audio;
}

export class VoiceManager {
  private readonly createAudio: (src: string) => VoiceAudio;
  private readonly now: () => number;
  private readonly queueStaleMs: number;
  private readonly watchdogGraceMs: number;

  private playing: Playing | null = null;
  private queue: Pending[] = [];
  private listeners = new Set<VoiceStateListener>();
  private muted = false;
  private disposed = false;

  constructor(options: VoiceManagerOptions = {}) {
    this.createAudio = options.createAudio ?? browserAudio;
    this.now = options.now ?? (() => Date.now());
    this.queueStaleMs = options.queueStaleMs ?? DEFAULT_QUEUE_STALE_MS;
    // Set here rather than by a later effect: an effect runs after the first
    // render, and a clip asked for during that render would already have been
    // fetched before it could take hold.
    this.muted = options.muted ?? false;
    this.watchdogGraceMs = options.watchdogGraceMs ?? 3000;
  }

  // ------------------------------------------------------------------ reading

  /** The clip being spoken, or null. */
  current(): VoiceId | null {
    return this.playing?.clip.id ?? null;
  }

  isSpeaking(): boolean {
    return this.playing !== null;
  }

  /** Which layer the line now speaking belongs to. */
  currentOwner(): VoiceOwner | null {
    return this.playing?.owner ?? null;
  }

  queued(): VoiceId[] {
    return this.queue.map((pending) => pending.clip.id);
  }

  /** The queued clips that belong to an ordered sequence. */
  queuedSequence(): VoiceId[] {
    return this.queue.filter((pending) => pending.sequence).map((pending) => pending.clip.id);
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Follows the channel: started, playing, ended, cancelled, failed.
   *
   * Provided so a later phase can know when a clip has finished. It is a
   * report, not a control: nothing in the game advances on it yet.
   */
  onState(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private announce(id: VoiceId, state: VoiceState): void {
    for (const listener of [...this.listeners]) listener(id, state);
  }

  // ------------------------------------------------------------------ writing

  /**
   * Silence, and keep it silent.
   *
   * `?mute=1` already silences the effects; it silences narration the same way.
   * Muting stops what is speaking rather than playing it to an empty room, so
   * un-muting does not drop the listener into the middle of a sentence.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancelAll();
  }

  /**
   * Asks for a clip. Resolves with what happened; never rejects, never hangs.
   *
   * The policy decides what happens when the channel is busy, and the state is
   * recorded before anything asynchronous runs - which is what makes a second
   * synchronous call (React's development double-invoke, a doubled event) see a
   * clip already in flight and drop it instead of starting it twice.
   */
  play(id: string, owner: VoiceOwner = 'gameplay', request: VoiceRequest = {}): Promise<VoiceOutcome> {
    const clip = clipFor(id);
    // An id that is not one of the 41 is a programming mistake, not a reason to
    // throw at the player: report it and carry on in silence.
    if (!clip || this.disposed) return Promise.resolve<VoiceOutcome>('failed');
    if (this.muted) return Promise.resolve<VoiceOutcome>('dropped');

    // The same clip, again, while it is still being spoken.
    if (this.playing?.clip.id === clip.id) return Promise.resolve<VoiceOutcome>('dropped');
    if (this.queue.some((pending) => pending.clip.id === clip.id)) return Promise.resolve<VoiceOutcome>('dropped');

    if (!this.playing) return this.start(clip, owner);

    if (clip.policy === 'DROP') return Promise.resolve<VoiceOutcome>('dropped');

    if (clip.policy === 'INTERRUPT') {
      // Time is up, or the round has ended: nothing waiting behind it is worth
      // saying any more, so the queue goes with the clip being cut off.
      this.dropQueue();
      this.settle('cancelled');
      return this.start(clip, owner);
    }

    return new Promise<VoiceOutcome>((resolve) => {
      this.queue.push({ clip, owner, sequence: request.sequence, enqueuedAt: this.now(), resolve });
    });
  }

  /**
   * Stops what is speaking. Whatever is queued moves up.
   *
   * With an owner, only that layer's line is stopped: a lesson changing screens
   * cannot silence a round that has just started, and vice versa.
   */
  stop(owner?: VoiceOwner): void {
    if (!this.playing) return;
    if (owner && this.playing.owner !== owner) return;
    this.settle('cancelled');
    this.drain();
  }

  /**
   * Stops everything and forgets the queue.
   *
   * Used where the thing the narration was describing has gone: a new molecule,
   * a restart, a tab going into the background. Leftover narration would be
   * describing the round before.
   */
  cancelAll(owner?: VoiceOwner): void {
    this.dropQueue(owner);
    if (this.playing && (!owner || this.playing.owner === owner)) this.settle('cancelled');
    // A line belonging to the other layer may now be free to start.
    this.drain();
  }

  /** Releases the element and the listeners. */
  dispose(): void {
    this.disposed = true;
    this.cancelAll();
    this.listeners.clear();
  }

  // ------------------------------------------------------------------ internal

  private start(clip: VoiceClip, owner: VoiceOwner): Promise<VoiceOutcome> {
    let audio: VoiceAudio;
    try {
      audio = this.createAudio(clip.src);
    } catch {
      this.announce(clip.id, 'failed');
      return Promise.resolve<VoiceOutcome>('failed');
    }

    return new Promise<VoiceOutcome>((resolve) => {
      const onEnded = () => this.finish('ended');
      const onError = () => this.finish('failed');
      // The channel is never held open by an element that has gone quiet
      // without saying so.
      const watchdog = setTimeout(() => this.finish('failed'), clip.durationMs + this.watchdogGraceMs);

      const teardown = () => {
        clearTimeout(watchdog);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      // Recorded before `play()` is awaited, so a doubled call sees it.
      this.playing = { clip, owner, audio, resolve, teardown, settled: false };
      this.announce(clip.id, 'started');

      void audio
        .play()
        .then(() => {
          if (this.playing?.clip.id === clip.id) this.announce(clip.id, 'playing');
        })
        .catch(() => {
          // Autoplay refused, or the element could not start. This is the one
          // that must never matter: the clip is abandoned, the channel frees,
          // and whatever asked for it hears 'failed' rather than waiting.
          if (this.playing?.clip === clip) this.finish('failed');
        });
    });
  }

  /** Ends the current clip with an outcome, then starts whatever is next. */
  private finish(outcome: Extract<VoiceOutcome, 'ended' | 'failed'>): void {
    if (!this.playing) return;
    this.settle(outcome);
    this.drain();
  }

  /** Resolves the current clip without touching the queue. */
  private settle(outcome: VoiceOutcome): void {
    const playing = this.playing;
    if (!playing || playing.settled) return;
    playing.settled = true;
    this.playing = null;
    playing.teardown();
    if (outcome === 'cancelled') {
      try {
        playing.audio.pause();
      } catch {
        // An element that will not pause is being thrown away anyway.
      }
    }
    this.announce(playing.clip.id, outcome === 'ended' ? 'ended' : outcome === 'failed' ? 'failed' : 'cancelled');
    playing.resolve(outcome);
  }

  /** Plays the next queued clip whose moment has not passed. */
  private drain(): void {
    while (this.queue.length > 0 && !this.playing) {
      const next = this.queue.shift()!;
      // A line in an ordered sequence waits as long as it takes; anything else
      // said this late would describe something the player has moved on from.
      if (!next.sequence && this.now() - next.enqueuedAt > this.queueStaleMs) {
        next.resolve('dropped');
        continue;
      }
      void this.start(next.clip, next.owner).then(next.resolve);
    }
  }

  private dropQueue(owner?: VoiceOwner): void {
    const dropped = owner ? this.queue.filter((pending) => pending.owner === owner) : this.queue;
    this.queue = owner ? this.queue.filter((pending) => pending.owner !== owner) : [];
    for (const pending of dropped) pending.resolve('dropped');
  }
}
