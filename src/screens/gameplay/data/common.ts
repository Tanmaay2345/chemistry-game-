import { SERIES_COPY } from '../../../content/chemistry.ts';
import type { FrameSpec, RailSpec } from '../scene/types';

/** Values shared by many gameplay frames; each scene still states its own. */

const r = (hash: string) => `/figma/${hash}.png`;

/** The usual 22 rules: eleven of one bitmap, then Figma's mixed pair. */
export const standardRules = (a = 'ca516', b = 'c9d4e', c = '5ee0c'): string[] => [
  ...Array.from({ length: 11 }, () => r(a)),
  r(b), r(c), r(b), r(c), r(c), r(c), r(b), r(c), r(c), r(c), r(c),
];

export const FRAME_1177: FrameSpec = {
  left: 'calc(50% + 1.5px)',
  width: 1177,
  explicitHeight: true,
  rules: standardRules(),
};

/** Rail with "Meth" enlarged, as the methane frames draw it. */
export const METH_RAIL: RailSpec = {
  left: 1,
  top: 119,
  containerHeight: 132,
  activeIndex: 0,
  activeScale: 141.658 / 106,
  activeOutline: '/figma/130d9.svg',
  activeHatch: '/figma/36a38.svg',
  timeline: '/figma/fda65.png',
};

/** The in-chip highlight used by most methane frames. */
export const METH_CHIP_HIGHLIGHT = { left: -8, top: -8, width: 158, height: 136 };

/**
 * Figma's methane cards read "when the two carbon chain are formed by a
 * single covalent bond" - on a molecule with one carbon and no carbon-carbon
 * bond at all. The alkane definition itself is what the card is for.
 */
export const METHANE_BODY = SERIES_COPY.alkane.body;

/** The 13-hydrogen selection row: mostly blue, with red and green decoys. */
export const SELECTION_ROW = [
  'blue', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue', 'blue', 'green', 'blue', 'blue', 'blue',
] as const;

