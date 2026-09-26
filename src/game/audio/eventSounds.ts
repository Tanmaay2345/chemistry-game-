import type { GameEvent } from '../engine/events.ts';
import type { SoundName } from './sounds.ts';

/**
 * Which gameplay events have a sound.
 *
 * This is the whole audio trigger rule, in one pure function, so it can be
 * asserted on without a browser. Sounds are tied to what the player *did* -
 * the engine only emits these when a real action resolves - never to a scene
 * change, a phase change or an animation starting.
 */
export function soundForEvent(event: GameEvent): SoundName | null {
  switch (event.type) {
    /**
     * The player has fired the web at an atom. Emitted once per web, from
     * `fireWeb`, at the moment of release.
     */
    case 'WEB_STARTED':
      return 'WEB_THROW';

    /**
     * A throw has left the paper. The event covers both of the game's throws -
     * the paper flung at a carbon group (`atomId === 'paper'`) and a hydrogen
     * flung from the paper - and both get the same sound, because the player
     * performs the same gesture either way.
     *
     * To give them different sounds later, branch on `event.atomId` here and
     * add a second entry to the library; nothing else needs to change.
     */
    case 'PAPER_THROWN':
      return 'PAPER_THROW';

    /**
     * Contact. Emitted the instant the thrown paper's nose reaches the carbon
     * pair - before the pair is pushed, well before the bond starts forming
     * 260ms later, and long before the molecule settles.
     *
     * Two guards, because one event type covers four different contacts:
     *   - `movingId === 'paper'` - the paper striking a carbon group. A
     *     hydrogen landing on a slot is a different, quieter moment and has no
     *     sound of its own yet.
     *   - `bonded` - the strike actually formed the molecule. A paper that
     *     hits the wrong group is a real physical contact but a failed one,
     *     and it stays silent: the absence of the sound is the feedback.
     */
    case 'ATOM_COLLISION':
      return event.movingId === 'paper' && event.bonded ? 'ATOM_COLLISION' : null;

    default:
      return null;
  }
}
