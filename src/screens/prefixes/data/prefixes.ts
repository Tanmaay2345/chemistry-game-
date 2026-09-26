import { prefixBody } from '../../../content/chemistry.ts';
/**
 * Carbon-chain prefixes for the rail screens: frame "915" (4589:15506, Meth),
 * "Non" (4589:17435) and "Dec" (4589:17678).
 *
 * All ten prefixes exist, but the rail only ever shows eight chips. The first
 * seven are fixed (Meth - Hept) and the eighth is a rolling slot: it reads
 * "oct" until the count passes eight, then "Non", then "Dec". All three Figma
 * frames agree on that - Meth to Hept never move, only the last chip changes.
 *
 * `title` and `body` fill the instruction card. Figma provides the copy for
 * METH, NON and DEC; the rest follow METH's sentence with the carbon count
 * changed and are marked below so they can be replaced.
 */

export type Prefix = {
  /** Chip label, exactly as drawn in Figma. */
  label: string;
  carbonCount: number;
  /** Instruction card heading. */
  title: string;
  /** Instruction card body. */
  body: string;
  /** False where the copy was derived rather than taken from a Figma frame. */
  copyFromFigma: boolean;
};

/** Figma's sentence, with the right number in it. See content/chemistry.ts. */
const derivedBody = prefixBody;

export const PREFIXES: Prefix[] = [
  {
    label: 'Meth',
    carbonCount: 1,
    title: 'METH',
    // Verbatim from Figma 4589:15744; the module reproduces it exactly.
    body: prefixBody(1),
    copyFromFigma: true,
  },
  { label: 'Eth', carbonCount: 2, title: 'ETH', body: derivedBody(2), copyFromFigma: false },
  { label: 'Prop', carbonCount: 3, title: 'PROP', body: derivedBody(3), copyFromFigma: false },
  { label: 'But', carbonCount: 4, title: 'BUT', body: derivedBody(4), copyFromFigma: false },
  { label: 'Pent', carbonCount: 5, title: 'PENT', body: derivedBody(5), copyFromFigma: false },
  { label: 'Hex', carbonCount: 6, title: 'HEX', body: derivedBody(6), copyFromFigma: false },
  { label: 'Hept', carbonCount: 7, title: 'HEPT', body: derivedBody(7), copyFromFigma: false },
  { label: 'oct', carbonCount: 8, title: 'OCT', body: derivedBody(8), copyFromFigma: false },
  {
    label: 'Non',
    carbonCount: 9,
    title: 'NON',
    // Figma 4589:17675 reads "three carbon" on the *nine* card - the Meth
    // card's sentence pasted without changing the number.
    body: prefixBody(9),
    copyFromFigma: true,
  },
  {
    label: 'Dec',
    carbonCount: 10,
    title: 'DEC',
    // The Dec frame (4589:17678) carries the same pasted line.
    body: prefixBody(10),
    copyFromFigma: true,
  },
];

/** The rail shows this many chips; the last one rolls through oct / Non / Dec. */
export const VISIBLE_CHIPS = 8;

/**
 * Motion timings. The Figma frame carries no authored keyframes - Figma
 * reports the node as animated but returns an empty track - so the sequence
 * below is the project's own, chosen to read at teaching pace.
 */
export const MOTION = {
  /** Pause before the first prefix is announced. */
  startDelay: 500,
  /** How long each prefix rests before the next one. */
  hold: 2600,
  /** Chip growth, halo slide and badge travel. */
  transition: 480,
  /** Instruction card crossfade. */
  copyFade: 240,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/** The active chip is the inactive chip scaled by exactly this factor. */
export const ACTIVE_SCALE = 130.651 / 106;
