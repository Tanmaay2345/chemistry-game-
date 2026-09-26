import { VoiceManager } from './VoiceManager.ts';

/**
 * The one voice.
 *
 * A module singleton rather than something a component owns, for two reasons.
 *
 * The design asks for a single channel, and the lessons and the live game are
 * different components: sharing one manager is what stops a lesson line and a
 * gameplay line being spoken over each other.
 *
 * And React invokes an effect, cleans it up, and invokes it again in
 * development. A manager created inside that effect would be disposed while
 * speaking the line it had just started, and the second attempt would be
 * refused as already said - so the narration would be silent in development and
 * audible in production, which is the worst way for this to be wrong.
 */
/**
 * Whether narration is silenced for this page.
 *
 * Read from the URL rather than passed in, because the channel has to know
 * before anything can ask it to speak. `?mute=1` already silences the sound
 * effects; it silences narration the same way. A React effect is too late: the
 * walkthrough's first frame asks for its line during the same commit, and the
 * clip would be fetched before the effect could take hold.
 */
export function narrationMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mute') === '1';
}

let channel: VoiceManager | null = null;

export function voiceChannel(): VoiceManager {
  if (!channel) {
    channel = new VoiceManager({ muted: narrationMuted() });
    // The same development handle the sound layer already exposes
    // (`window.__audio`), for checking what was said without guessing.
    if (import.meta.env.DEV) {
      (window as unknown as { __voice?: VoiceManager }).__voice = channel;
    }
  }
  return channel;
}

/** Tests only: forgets the channel so the next call builds a fresh one. */
export function resetVoiceChannel(): void {
  channel?.dispose();
  channel = null;
}
