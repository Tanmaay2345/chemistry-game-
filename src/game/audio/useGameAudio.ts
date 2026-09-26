import { useEffect } from 'react';
import type { GameEngine } from '../engine/engine.ts';
import { AudioManager } from './AudioManager.ts';
import { soundForEvent } from './eventSounds.ts';

/**
 * Connects the engine's events to the sound library.
 *
 * The whole audio layer attaches here: one subscription to the event bus the
 * engine already emits on. Gameplay has no idea it exists, and removing this
 * hook removes the sound without touching anything else.
 */
export function useGameAudio(engine: GameEngine, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const audio = new AudioManager();

    // Browsers will not start audio until the player has interacted, so the
    // first pointer press opens the context and preloads the sounds.
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });

    const off = engine.bus.on((event) => {
      const sound = soundForEvent(event);
      if (sound) audio.play(sound);
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __audio?: AudioManager }).__audio = audio;
    }

    return () => {
      off();
      window.removeEventListener('pointerdown', unlock, { capture: true });
      audio.dispose();
    };
  }, [engine, enabled]);
}
