/**
 * The order the student moves through.
 *
 * Kept apart from `App.tsx` so the journey can be asserted without React - the
 * test runner loads `.ts` but not `.tsx`, and "which screen does Continue lead
 * to" is exactly the kind of thing that should be checked by a test rather than
 * by clicking through the whole lesson by hand.
 */

export const SCREENS = ['signIn', 'prefixIntro', 'alkane', 'alkene', 'alkyne', 'gameplay', 'play'] as const;

export type Screen = (typeof SCREENS)[number];

/**
 * Screens the lesson path does not visit.
 *
 * The 31 transcribed frames on the `gameplay` route are a reference flow - a
 * drawing of the game that checks no chemistry and advances itself on timers.
 * The lesson ends in the game itself, so the walkthrough is skipped on the way
 * forward. It stays in `SCREENS` because `?step=gameplay` is still how the
 * frames are opened to look at.
 */
export const NOT_IN_LESSON_PATH: ReadonlySet<string> = new Set(['gameplay']);

/** The screen a Continue press leads to, skipping anything off the path. */
export function nextScreen(current: Screen): Screen | undefined {
  let i = SCREENS.indexOf(current) + 1;
  while (i < SCREENS.length && NOT_IN_LESSON_PATH.has(SCREENS[i])) i += 1;
  return SCREENS[i];
}

/** The screen `?step=` asks for, or the opening screen when it asks for nothing real. */
export function screenFromScrap(requested: string | null): Screen {
  return SCREENS.find((screen) => screen === requested) ?? 'signIn';
}

/**
 * Where the game's own images start being fetched.
 *
 * They are the largest batch in the game and the one a student would otherwise
 * wait on at the worst moment - the frame the lesson has been building to. The
 * last bond lesson is far enough ahead to have them ready and late enough that
 * a student who never gets there never pays for them.
 */
export const WARM_GAMEPLAY_ASSETS_FROM: ReadonlySet<string> = new Set(['alkyne', 'gameplay']);
