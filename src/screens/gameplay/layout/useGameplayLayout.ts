import type { RefObject } from 'react';
import { fitDesign, useDesignFit, type DesignFit } from '../../../layout/designFit';

/**
 * The gameplay's own fit.
 *
 * The rule itself lives in `designFit` and is shared with every other screen
 * (see there for why the app scales as one composition). This module only
 * states the gameplay's numbers: Figma's 1440 x 1024 frame, and the band of it
 * that holds content across all 31 states - y 116 to 921, measured from the
 * frame exports. The rest of the height is margin, given up first on a short
 * window.
 *
 * At the reference viewport (1440 x 1024) this yields unit 1 and no offset, so
 * the result is the Figma frame exactly.
 */

export const DESIGN = { width: 1440, height: 1024 } as const;

/** Vertical extent of the content across every gameplay state (Figma y). */
export const CONTENT = { top: 116, bottom: 921 } as const;

export type GameplayLayout = DesignFit;

const GAMEPLAY_SPEC = { width: DESIGN.width, height: DESIGN.height, content: CONTENT };

export function computeLayout(width: number, height: number): GameplayLayout {
  return fitDesign(width, height, GAMEPLAY_SPEC);
}

export function useGameplayLayout(host: RefObject<HTMLElement | null>): GameplayLayout {
  return useDesignFit(host, GAMEPLAY_SPEC);
}
