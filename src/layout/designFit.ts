import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * How every screen in the game is fitted to the window.
 *
 * The whole app is drawn on Figma's artboard in Figma's coordinates, and that
 * artboard is scaled as one piece. Nothing reflows, stacks or moves relative to
 * anything else: the composition the designer drew is the composition the
 * learner sees, only larger or smaller. This is the rule the gameplay already
 * used; it now applies from the first onboarding screen to the last.
 *
 * The scale comes from the content rather than the artboard. Most frames leave
 * a wide empty margin above and below the drawing, so on a short laptop that
 * margin is given up before the design is allowed to shrink. Each screen says
 * which band of its artboard actually holds content; a screen whose art runs to
 * the edges (the onboarding frames) simply names its whole height and is then
 * fitted exactly as before.
 */

export type ContentBand = {
  /** First and last row of the artboard that must stay on screen. */
  top: number;
  bottom: number;
};

export type DesignSpec = {
  /** The Figma artboard, in design pixels. */
  width: number;
  height: number;
  content: ContentBand;
  /**
   * Breathing room kept above and below the content when height is tight. It
   * is capped by the margin the design already has, so a full-bleed frame is
   * never shrunk to make room for space it does not want.
   */
  minMargin?: number;
  /** Upper bound on large displays, so art and type do not balloon. */
  maxUnit?: number;
  /**
   * Lower bound, so magnifying the page magnifies it.
   *
   * Fitting the artboard to the window means browser zoom shrinks the window
   * and the design shrinks with it: zooming to 200% used to change nothing on
   * screen at all, which makes the page unusable for anyone who needs it
   * larger. Below this size the design stops shrinking and the page scrolls
   * instead, which is what zoom is for.
   */
  minUnit?: number;
};

export type DesignFit = {
  /** Host size in CSS pixels. */
  width: number;
  height: number;
  /** Size of one design pixel, in CSS pixels. */
  unit: number;
  /** Where the artboard's (0, 0) lands in the host. */
  offsetX: number;
  offsetY: number;
  /** True when the design is larger than the host and the host must scroll. */
  clamped: boolean;
  /** Size of the scaled artboard, for the host's scrollable area. */
  scrollWidth: number;
  scrollHeight: number;
};

export const DEFAULT_MIN_MARGIN = 24;

/**
 * The cap the gameplay has always used. Screens share it so the design does not
 * change size as the learner moves from a lesson into the game.
 */
export const DEFAULT_MAX_UNIT = 1.25;

/**
 * The smallest the design is allowed to get: 18px body copy lands at about
 * 11px, which is the floor at which the cards are still readable. Past it the
 * page scrolls rather than shrinking, so zoom does what zoom is meant to do.
 */
export const DEFAULT_MIN_UNIT = 0.6;

export function fitDesign(width: number, height: number, spec: DesignSpec): DesignFit {
  const maxUnit = spec.maxUnit ?? DEFAULT_MAX_UNIT;
  const contentHeight = Math.max(1, spec.content.bottom - spec.content.top);

  // Never hold back more room than the design itself leaves: a frame drawn to
  // its own edges (the onboarding doodles) is fitted whole, exactly as before.
  const designMargin = Math.min(spec.content.top, spec.height - spec.content.bottom);
  const minMargin = Math.min(spec.minMargin ?? DEFAULT_MIN_MARGIN, designMargin);

  const fitted = Math.min(width / spec.width, (height - 2 * minMargin) / contentHeight, maxUnit);
  const minUnit = spec.minUnit ?? DEFAULT_MIN_UNIT;
  const unit = Math.max(0.1, minUnit, fitted);
  const scrollWidth = spec.width * unit;
  const scrollHeight = spec.height * unit;

  // Scrolling is for when the design was *stopped* from shrinking, not for
  // when the artboard is simply taller than the window. Most frames leave a
  // wide empty margin above and below the drawing, and letting that margin
  // run off the screen is the whole point of the content band - comparing the
  // artboard against the window made a 1440x900 laptop scroll a design that
  // fits it exactly.
  const clamped = unit > fitted + 1e-6;
  if (clamped) return { width, height, unit, offsetX: 0, offsetY: 0, clamped, scrollWidth, scrollHeight };

  const offsetX = (width - spec.width * unit) / 2;

  // Prefer Figma's own placement (the artboard centred); where the window is
  // too short for that, slide within the artboard's margins so the content
  // stays in view.
  const preferred = (height - spec.height * unit) / 2;
  const minOffset = minMargin - spec.content.top * unit;
  const maxOffset = height - minMargin - spec.content.bottom * unit;
  const offsetY = maxOffset < minOffset ? (minOffset + maxOffset) / 2 : Math.min(Math.max(preferred, minOffset), maxOffset);

  return { width, height, unit, offsetX, offsetY, clamped, scrollWidth, scrollHeight };
}

/** Tracks the host element's size and returns the fit for it. */
export function useDesignFit(host: RefObject<HTMLElement | null>, spec: DesignSpec): DesignFit {
  const [fit, setFit] = useState(() => fitDesign(window.innerWidth, window.innerHeight, spec));
  const { width, height, minMargin, maxUnit, minUnit } = spec;
  const { top, bottom } = spec.content;

  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      setFit(fitDesign(box.width, box.height, { width, height, content: { top, bottom }, minMargin, maxUnit, minUnit }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // Window resizes also arrive here directly: ResizeObserver only reports on
    // rendered frames, which a hidden or throttled tab may not produce.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [host, width, height, top, bottom, minMargin, maxUnit, minUnit]);

  return fit;
}
