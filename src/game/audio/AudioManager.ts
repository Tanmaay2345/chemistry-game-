import { SOUNDS, type SoundDef, type SoundName } from './sounds.ts';

/**
 * Plays the game's sounds.
 *
 * Web Audio rather than <audio> elements, for three reasons that matter here:
 * a sound can be fired again before the previous one has finished, playback
 * starts on the frame it is asked for rather than whenever the element gets
 * round to it, and a later beat can be *scheduled* ahead of time - which the
 * collision sound will need, since its bond half lands 260ms after contact.
 *
 * Nothing in the game calls this directly. The engine emits events, and
 * `useGameAudio` turns the ones that have a sound into a play call, so the
 * audio layer can be removed entirely without touching gameplay.
 */

type Voice = { source: AudioBufferSourceNode; startedAt: number };

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading = new Map<SoundName, Promise<AudioBuffer | null>>();
  private voices = new Map<SoundName, Voice[]>();
  private muted = false;
  private readonly library: Record<SoundName, SoundDef>;

  constructor(library: Record<SoundName, SoundDef> = SOUNDS) {
    this.library = library;
  }

  /**
   * Browsers refuse to start audio until the player has interacted, so this is
   * called from the first pointer event. Safe to call repeatedly.
   */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
    // Fetch and decode now, so the first throw is not the thing that waits.
    for (const name of Object.keys(this.library) as SoundName[]) void this.load(name);
  }

  private async load(name: SoundName): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(name);
    if (cached) return cached;
    const inFlight = this.loading.get(name);
    if (inFlight) return inFlight;

    const context = this.context;
    if (!context) return null;

    const attempt = (async () => {
      try {
        const response = await fetch(this.library[name].src);
        if (!response.ok) throw new Error(`${response.status} for ${this.library[name].src}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(name, buffer);
        return buffer;
      } catch (error) {
        // A missing or unplayable sound must never break the game.
        if (import.meta.env.DEV) console.warn(`[audio] could not load ${name}:`, error);
        return null;
      } finally {
        this.loading.delete(name);
      }
    })();

    this.loading.set(name, attempt);
    return attempt;
  }

  /**
   * Plays one sound now. Returns false when nothing was played - not yet
   * unlocked, still decoding, or the sound failed to load - so callers can
   * tell silence apart from a dropped call.
   */
  play(name: SoundName): boolean {
    if (this.muted) return false;
    const context = this.context;
    const master = this.master;
    if (!context || !master) return false;

    const buffer = this.buffers.get(name);
    if (!buffer) {
      // Decode on demand; this firing stays silent rather than arriving late.
      void this.load(name);
      return false;
    }

    const def = this.library[name];
    const live = this.reap(name);
    if (live.length >= def.maxVoices) {
      // Drop the oldest so a burst of throws cannot stack into noise.
      const oldest = live.shift();
      oldest?.source.stop();
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = def.gain;
    source.connect(gain).connect(master);
    source.start();

    const voice: Voice = { source, startedAt: context.currentTime };
    live.push(voice);
    this.voices.set(name, live);
    // One-shot: a buffer source cannot loop unless asked to, and it is dropped
    // as soon as it ends, so nothing can carry on indefinitely.
    source.onended = () => {
      this.voices.set(name, (this.voices.get(name) ?? []).filter((v) => v !== voice));
    };
    return true;
  }

  /** Voices that are still sounding. */
  private reap(name: SoundName): Voice[] {
    const context = this.context;
    const live = this.voices.get(name) ?? [];
    if (!context) return live;
    const buffer = this.buffers.get(name);
    if (!buffer) return live;
    return live.filter((v) => context.currentTime - v.startedAt < buffer.duration + 0.05);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Stops everything and releases the context. */
  dispose(): void {
    for (const voices of this.voices.values()) {
      for (const voice of voices) {
        try {
          voice.source.stop();
        } catch {
          // Already finished; nothing to stop.
        }
      }
    }
    this.voices.clear();
    this.buffers.clear();
    void this.context?.close();
    this.context = null;
    this.master = null;
  }
}
