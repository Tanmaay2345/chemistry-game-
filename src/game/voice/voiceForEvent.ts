import { DEFAULT_RULES } from '../engine/config.ts';
import type { GameEvent } from '../engine/events.ts';
import type { VoiceId } from './voiceClips.ts';

/**
 * Which narration an engine event calls for.
 *
 * The peer of `eventSounds.ts`, and pure for the same reason: the whole mapping
 * can be asserted under `node --test` without a browser, an engine or a clock.
 * It reads state, it never changes it - the caller records what was said.
 *
 * Nothing here can move the game on. The engine emits, this translates, and the
 * manager speaks; the game state machine is untouched by all three.
 *
 * Triggers are the ones verified in `docs/voice/sarvam-integration-map.md`.
 */

/** Per-molecule clip sets, so no line names the wrong molecule. */
const BY_MOLECULE: Record<string, { start: VoiceId; carbon: VoiceId; structure: VoiceId; calculation: VoiceId; complete: VoiceId }> = {
  methane: { start: 'M01', carbon: 'M02', structure: 'M03', calculation: 'M04', complete: 'M05' },
  ethane: { start: 'E01', carbon: 'E02', structure: 'E03', calculation: 'E04', complete: 'E05' },
  propane: { start: 'P01', carbon: 'P02', structure: 'P03', calculation: 'P04', complete: 'P05' },
};

const BY_MISTAKE: Record<string, VoiceId> = {
  WRONG_CARBON_FAMILY: 'S02',
  WRONG_CARBON_COUNT: 'S03',
  WRONG_HYDROGEN_FAMILY: 'S05',
  TRAY_FULL: 'S06',
  NO_FREE_BOND: 'S07',
  THROW_MISSED: 'S08',
};

/**
 * How long a mistake stays explained before it is worth explaining again.
 *
 * Taken from the card rather than chosen: `feedbackMs` is how long the written
 * explanation stays up, so it is also how long saying it again would be saying
 * something the player can still read. This is what keeps one wrong hydrogen
 * from being explained twice - the engine reports it at the pick and again at
 * the failed throw, which is real and correct, but it is one mistake.
 */
export const MISTAKE_COOLDOWN_MS = DEFAULT_RULES.teaching.feedbackMs;

export type VoiceContext = {
  now: number;
  /** The molecule being built, from `GAME_STARTED` or `snapshot.spec.name`. */
  molecule: string;
  /** Clips said in this round, and when. */
  round: ReadonlyMap<VoiceId, number>;
  /** Clips said since the page loaded. */
  session: ReadonlySet<VoiceId>;
  /**
   * For S09 only: does the bond just created have a hydrogen at one end?
   *
   * `BOND_CREATED` carries atom ids, not elements, so the caller looks them up
   * in `snapshot.molecule.atoms`. Kept out of here so this stays pure.
   */
  hydrogenBond?: boolean;
  /** `snapshot.summary.completion`, for the summary clips. */
  completion?: 'in-progress' | 'completed' | 'timeout';
  /** The next molecule in the teaching order, or null after propane. */
  nextMolecule?: string | null;
};

/**
 * Zero, one or two clips, in the order they should be spoken.
 *
 * Two happens once: the first carbon phase of a session wants the molecule's
 * requirement and then the colour rule, which are separate clips because one is
 * said every round and the other only the first time.
 */
export function voiceForEvent(event: GameEvent, context: VoiceContext): VoiceId[] {
  const molecule = BY_MOLECULE[context.molecule] ?? null;
  const saidThisRound = (id: VoiceId) => context.round.has(id);

  switch (event.type) {
    case 'GAME_STARTED': {
      const set = BY_MOLECULE[event.molecule];
      if (!set || saidThisRound(set.start)) return [];
      return [set.start];
    }

    case 'PHASE_CHANGED': {
      if (!molecule) return [];

      // The round's opening instruction. Gated on where it came from: a wrong
      // throw returns to this phase from PAPER_FLIGHT, and the requirement does
      // not need repeating - the mistake gets its own explanation.
      if (event.to === 'CARBON_SELECTION') {
        if (event.from !== 'INTRO_OBJECTIVE') return [];
        const lines: VoiceId[] = [];
        if (!saidThisRound(molecule.carbon)) lines.push(molecule.carbon);
        if (!context.session.has('S01')) lines.push('S01');
        return lines;
      }

      // Both of these are held teaching beats. The clip is longer than the beat
      // for several molecules; it plays on over the resumed game rather than
      // the beat being stretched, which would change gameplay timing.
      if (event.to === 'CARBON_STRUCTURE_READY') return saidThisRound(molecule.structure) ? [] : [molecule.structure];
      if (event.to === 'HYDROGEN_CALCULATION') return saidThisRound(molecule.calculation) ? [] : [molecule.calculation];

      // Only the entry that follows the calculation beat: this phase is also
      // re-entered after a throw that missed with nothing left in hand.
      if (event.to === 'HYDROGEN_SELECTION') {
        if (event.from !== 'HYDROGEN_CALCULATION' || saidThisRound('S04')) return [];
        return ['S04'];
      }

      if (event.to === 'SUMMARY') {
        if (context.completion === 'timeout') return saidThisRound('G02') ? [] : ['G02'];
        if (context.completion !== 'completed') return [];
        // The end of the teaching order gets its own line, once ever.
        if (!context.nextMolecule) return context.session.has('G03') ? [] : ['G03'];
        return saidThisRound('G01') ? [] : ['G01'];
      }

      return [];
    }

    case 'MISTAKE_EXPLAINED': {
      const id = BY_MISTAKE[event.reason.kind];
      if (!id) return [];
      const lastSaid = context.round.get(id);
      if (lastSaid !== undefined && context.now - lastSaid < MISTAKE_COOLDOWN_MS) return [];
      return [id];
    }

    // Four to ten bonds are made in a round and each one has a sound already.
    // The first hydrogen to land is the one worth a word.
    case 'BOND_CREATED': {
      if (!context.hydrogenBond || saidThisRound('S09')) return [];
      return ['S09'];
    }

    case 'TIME_WARNING':
      return saidThisRound('T01') ? [] : ['T01'];

    // Emitted from two places - the clock reaching zero, and a round ended
    // while it was still being played - so the round guard is what makes it one
    // announcement rather than two.
    case 'TIMEOUT':
      return saidThisRound('T02') ? [] : ['T02'];

    case 'MOLECULE_COMPLETED': {
      const set = BY_MOLECULE[event.molecule];
      if (!set || saidThisRound(set.complete)) return [];
      return [set.complete];
    }

    // Everything else is per-atom or per-frame: dozens per round, already
    // carrying sound effects and on-screen counters. Narrating them would talk
    // over the game.
    default:
      return [];
  }
}

/**
 * Whether this event is part of a round's opening introduction.
 *
 * Not a new ordering: these are exactly the two events `GameEngine.start()`
 * emits, in the order it emits them, and the clips they map to above are the
 * round's introduction, its first instruction and - once a session - the colour
 * rule. Naming them lets the manager treat them as one ordered statement
 * instead of three independent lines that can age out separately while the
 * walkthrough's closing line finishes.
 *
 * Everything after this is ordinary narration under the ordinary rules.
 */
export function isRoundIntroduction(event: GameEvent): boolean {
  if (event.type === 'GAME_STARTED') return true;
  return event.type === 'PHASE_CHANGED' && event.from === 'INTRO_OBJECTIVE' && event.to === 'CARBON_SELECTION';
}

/** The name the opening lines are queued under. */
export const ROUND_INTRO_SEQUENCE = 'round-intro';
