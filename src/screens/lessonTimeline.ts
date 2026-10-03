import { VOICE_CLIPS, type VoiceId } from '../game/voice/voiceClips.ts';
import { railWalkMs } from './prefixes/data/prefixes.ts';

/**
 * How long the lesson holds each of its frames before moving itself on.
 *
 * The nickname rail and the three bond screens play as one stretch: the
 * student watches, and nothing asks them to press anything until it is over.
 * So the flow needs to know how long each frame is worth, and the honest
 * answer is "as long as what it is saying" - these are derived from the rail's
 * own timing and the narration's measured length rather than written down as
 * numbers that can drift away from either.
 *
 * Nothing here advances anything. It states durations; `App` owns the clock.
 */

/** Reading time left after a line finishes, before the frame changes. */
const SETTLE_MS = 1200;

/** How long a clip takes to say, or nothing at all if there is no clip. */
function spoken(id: VoiceId): number {
  return VOICE_CLIPS[id]?.durationMs ?? 0;
}

/**
 * The rail walks every prefix - slowly while it is being spoken about, briskly
 * after - and then its closing line plays over the last chip. The frame is
 * worth the whole of that.
 */
export const RAIL_MS = railWalkMs() + spoken('V17') + SETTLE_MS;

/**
 * The frames that play themselves, and for how long.
 *
 * A screen absent from here is one the student still drives - the sign-in
 * card, and the game at the end.
 */
export const LESSON_HOLD_MS: Readonly<Record<string, number>> = {
  prefixIntro: RAIL_MS,
  alkane: spoken('V05') + SETTLE_MS,
  alkene: spoken('V06') + SETTLE_MS,
  alkyne: spoken('V07') + SETTLE_MS,
};

/** True where the lesson moves itself on rather than waiting to be pressed. */
export function playsItself(screen: string): boolean {
  return screen in LESSON_HOLD_MS;
}

/** How long to hold `screen`, or null where the student is in charge. */
export function holdFor(screen: string): number | null {
  return LESSON_HOLD_MS[screen] ?? null;
}

/** The whole automatic stretch, end to end. Reported, not used as a timer. */
export function lessonRunMs(): number {
  return Object.values(LESSON_HOLD_MS).reduce((total, ms) => total + ms, 0);
}
