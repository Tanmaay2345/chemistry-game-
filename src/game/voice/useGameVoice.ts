import { useEffect } from 'react';
import type { GameEngine } from '../engine/engine.ts';
import type { GameEvent, GameEventType } from '../engine/events.ts';
import { voiceChannel } from './voiceChannel.ts';
import { isRoundIntroduction, ROUND_INTRO_SEQUENCE, voiceForEvent, type VoiceContext } from './voiceForEvent.ts';
import { voiceSession } from './voiceSession.ts';

/**
 * Connects the engine's events to the narration.
 *
 * Deliberately the same shape as `useGameAudio`: one subscription to the event
 * bus the engine already emits on, and nothing the engine can see. It reads
 * events and the snapshot; it never calls anything that changes the game.
 * Removing this hook removes the narration and leaves gameplay, physics,
 * chemistry, the timer and the sound effects exactly as they were.
 */

/**
 * The events that can carry narration.
 *
 * Checked before the snapshot is read, because the rest - every collision,
 * every atom collected, every frame's phase check - fire dozens of times a
 * round and would each copy the molecule for nothing.
 */
const SPEAKING_EVENTS = new Set<GameEventType>([
  'GAME_STARTED',
  'PHASE_CHANGED',
  'MISTAKE_EXPLAINED',
  'BOND_CREATED',
  'TIME_WARNING',
  'TIMEOUT',
  'MOLECULE_COMPLETED',
]);

/**
 * The engine the voice layer is currently following.
 *
 * Module scope rather than a ref so that React re-invoking this effect in
 * development does not look like a new round. A new engine really is a new
 * round - `LiveGameplay` builds one per molecule and per restart - and that is
 * when narration from the round before has to be cancelled.
 */
let following: GameEngine | null = null;

export function useGameVoice(engine: GameEngine, enabled = true, nextMolecule: string | null = null): void {
  useEffect(() => {
    voiceChannel().setMuted(!enabled);
  }, [enabled]);

  useEffect(() => {
    const voice = voiceChannel();

    if (following !== engine) {
      following = engine;
      // Leftover narration from the round before would be describing the wrong
      // molecule. Scoped to this layer: the walkthrough's closing line is not
      // the round's to cancel, and cutting it off was what left the learner
      // hearing "that's the whole-" as the game began.
      voice.cancelAll('gameplay');
      voiceSession.startRound();
    }

    const speak = (event: GameEvent) => {
      if (!SPEAKING_EVENTS.has(event.type)) return;
      const snapshot = engine.snapshot();
      const now = Date.now();

      const context: VoiceContext = {
        now,
        // The engine's own name for what is being built, not the UI's.
        molecule: snapshot.spec.name,
        round: voiceSession.spokenThisRound(),
        session: voiceSession.spokenThisSession(),
        // `BOND_CREATED` carries atom ids, not elements, so which kind of bond
        // was made is read from the molecule rather than guessed from the
        // event. This is what keeps a carbon-to-carbon bond from being
        // announced as the first hydrogen.
        hydrogenBond:
          event.type === 'BOND_CREATED'
            ? snapshot.molecule.atoms.some((atom) => (atom.id === event.a || atom.id === event.b) && atom.element === 'H')
            : undefined,
        completion: snapshot.summary?.completion,
        nextMolecule,
      };

      // The round's opening lines are one ordered introduction, so they keep
      // their turn however long the walkthrough's closing line takes to
      // finish. Everything later is an independent line under the normal rule,
      // and ages out if its moment has passed.
      const request = isRoundIntroduction(event) ? { sequence: ROUND_INTRO_SEQUENCE } : {};

      for (const id of voiceForEvent(event, context)) {
        voiceSession.record(id, now);
        // Never awaited: nothing in the round waits for a clip, so a refused
        // or failed one costs the player nothing.
        void voice.play(id, 'gameplay', request);
      }
    };

    const off = engine.bus.on(speak);

    // The game already pauses when the tab goes away. Speech goes quiet with
    // it rather than carrying on describing a round nobody is watching, and
    // without leaving the channel held by a clip that will never finish.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') voice.cancelAll('gameplay');
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      off();
      document.removeEventListener('visibilitychange', onVisibility);
      // The channel is shared and outlives this component, so it is not
      // disposed here. Cancelling here instead would cut off the line this
      // effect had just started, every time React re-invoked it.
    };
  }, [engine, nextMolecule]);
}
