/**
 * How the simulated flow moves from one scene to the next.
 *
 * This is the seam the real game engine will replace: today each step names
 * the element the learner must click (or a timer, for the in-flight frames
 * Figma draws as a sequence); later the engine will decide when a throw lands
 * or a bond forms and emit the next scene itself.
 */

export type Advance =
  /** Wait for the learner to click the element with this scene key ('panel' for the card). */
  | { kind: 'click'; target: string }
  /** Move on by itself - used for the frames Figma draws mid-motion. */
  | { kind: 'auto'; afterMs: number };

export type FlowStep = {
  /** Scene id, e.g. 'methane-05'. */
  scene: string;
  advance: Advance;
  /**
   * 'tween' animates keyed elements from their previous position (the paper,
   * the flying hydrogen); 'cut' swaps the scene instantly, as Figma does
   * between unrelated frames.
   */
  transition: 'tween' | 'cut';
};

/** Tween timing for in-flight frames. Figma carries no motion data for these. */
export const FLOW_MOTION = {
  tweenMs: 420,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;
