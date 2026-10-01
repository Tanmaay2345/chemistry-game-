import { useCallback, useEffect } from 'react';
import { LessonVoice } from './lessonVoice.ts';
import { voiceChannel } from './voiceChannel.ts';
import { voiceSession } from './voiceSession.ts';

/**
 * Speaks the lesson line for whichever screen the learner is on.
 *
 * The whole lesson voice layer attaches here, in one call. It reads the screen
 * and nothing else: it does not know what a screen contains, it cannot move to
 * the next one, and removing this hook removes lesson narration without
 * touching the flow.
 *
 * The controller is built once per page rather than per render, because the
 * screen it last spoke for is what makes a rerender silent.
 */
let lessons: LessonVoice | null = null;

function lessonVoice(): LessonVoice {
  // Built on first use rather than at import, so importing this file has no
  // side effect and nothing touches the browser until a screen is entered.
  if (!lessons) lessons = new LessonVoice(voiceChannel(), voiceSession);
  return lessons;
}

export function useLessonVoice(screen: string, enabled = true): void {
  useEffect(() => {
    voiceChannel().setMuted(!enabled);
  }, [enabled]);

  useEffect(() => {
    lessonVoice().enter(screen);
    // No cleanup: stopping here would cut the line off the moment React
    // re-invokes the effect in development. Leaving a screen is handled by the
    // next `enter`, which stops the previous line before starting its own.
  }, [screen]);
}

/**
 * The walkthrough's two lines, as a handler for `GameplayFlow.onStepChange`.
 *
 * Wrapped in `useCallback` so its identity is stable: the flow announces each
 * frame from an effect that depends on the handler, so a new function every
 * render would re-announce the same frame.
 *
 * It reports where the walkthrough is and nothing else. It cannot advance a
 * frame, click anything, or touch the engine - the walkthrough's own
 * interaction stays exactly as it was.
 */
export function useWalkthroughVoice(stepCount: number): (step: unknown, index: number) => void {
  return useCallback((_step: unknown, index: number) => {
    lessonVoice().enterStep(index, stepCount);
  }, [stepCount]);
}

/**
 * The prefix rail's lines, as a handler for `PrefixIntroScreen.onEvent`.
 *
 * Stable identity for the same reason the walkthrough's is: the screen reports
 * from an effect that depends on the handler, so a new function each render
 * would re-announce the chip already showing.
 *
 * It listens and nothing else. It cannot move the rail, pause it or change its
 * timing - the animation is exactly as it was with no narration attached.
 */
export function usePrefixVoice(): (index: number, completed: boolean) => void {
  return useCallback((index: number, completed: boolean) => {
    lessonVoice().enterPrefix(index, completed);
  }, []);
}
