import type { VoiceId } from './voiceClips.ts';

/**
 * Which lesson screen says which line.
 *
 * The screen names are the ones in `SCREENS` in `src/App.tsx`; the clips are
 * the ones in section A of `docs/voice/sarvam-voice-script.md`. Kept as data so
 * the mapping can be asserted without React.
 *
 * `prefixIntro` is absent because its screen no longer has one line: the rail
 * is narrated chip by chip, which `voiceForPrefix` below decides.
 *
 * The carbon onboarding frames (Figma H2, H3) and the three bond-suffix
 * frames (Desktop 67-69) were taken out of the flow, so their lines - V02,
 * V03, V04, and V08 to V10 - have no screen to play on. The clips stay in
 * `voiceClips.ts`; nothing asks for them.
 *
 * The two gameplay routes are absent on purpose. `gameplay` (the walkthrough)
 * is V11/V12 and `play` is the live game - neither is wired yet, and a screen
 * with no entry here is simply silent.
 */
export const LESSON_VOICE: Record<string, VoiceId> = {
  signIn: 'V01',
  alkane: 'V05',
  alkene: 'V06',
  alkyne: 'V07',
};

/** The clip for a screen, or null where there is nothing to say. */
export function voiceForScreen(screen: string): VoiceId | null {
  return LESSON_VOICE[screen] ?? null;
}

/**
 * The walkthrough's two lines.
 *
 * The 31 frames of `GAMEPLAY_STEPS` are a scripted demonstration, not the
 * engine, and several of them advance themselves on 450-800 ms timers. Only the
 * first and last are narrated - a line on each of the frames in between would
 * be a second script written against drawings that can drift from the game.
 */
export function voiceForWalkthroughStep(index: number, stepCount: number): VoiceId | null {
  if (index === 0) return 'V11';
  if (stepCount > 1 && index === stepCount - 1) return 'V12';
  return null;
}

/**
 * The rail's narration, chip by chip.
 *
 * The prefix screen walks ten chips on its own timer, so one line at the start
 * would be talking about Meth while the rail is showing Hex. These follow the
 * animation instead: a line as it opens on Meth, one each for Eth and Prop, one
 * covering the rest as they appear, and a closing line when it rests on Dec.
 *
 * The chips from Pent onwards are deliberately silent. The rail is still
 * moving, and naming each one is the lecture this screen is trying not to be.
 */
export function voiceForPrefix(index: number, completed: boolean): VoiceId | null {
  if (completed) return 'V17';
  if (index === 0) return 'V13';
  if (index === 1) return 'V14';
  if (index === 2) return 'V15';
  if (index === 3) return 'V16';
  return null;
}
