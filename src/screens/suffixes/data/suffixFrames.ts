import { SERIES_COPY } from '../../../content/chemistry.ts';
/**
 * The three suffix frames - Figma "Desktop - 67" (4589:29745, Ane),
 * "Desktop - 68" (4589:29934, Ene) and "Desktop - 69" (4589:30093, Yne).
 *
 * They are one layout drawn three times, each with its own colours, exported
 * assets and small position differences. Everything that differs lives here;
 * every number is taken from the Figma export of that frame.
 */

export type ChipId = 'ane' | 'ene' | 'yne';

export type ChipArt = {
  /** Sketched outline drawn behind the chip. */
  outline: string;
  /** Hatched strip along the chip's top edge. */
  hatch: string;
};

export type Pin = { src: string; left: number; top: number };

export type SuffixFrame = {
  id: 's67' | 's68' | 's69';
  figmaNode: string;
  /** Pencil band bitmap at both edges. */
  band: string;
  /** Whether the left band group carries Figma's explicit 1025px height. */
  leftBandHeight?: number;
  timeline: { src: string; left: number; top: number };
  rail: { left: number; top: number };
  active: ChipId;
  /** The active chip is the inactive chip scaled by exactly this factor. */
  activeScale: number;
  chips: Record<ChipId, ChipArt>;
  pins: Pin[];
  tag: {
    label: string;
    color: string;
    left: number;
    top: number;
    width?: number;
    height?: number;
    paddingX: number;
    paddingY: number;
    radius: number;
    topBorder: number;
    sideBorder: number;
    fontSize: number;
  };
  panel: {
    /** Figma places the panel inside the ruled frame on 67 and on the page root on 68/69. */
    inFrame: boolean;
    left: string;
    color: string;
    plane: string;
    cog: { ellipse: string; spikes: string[] };
    tick: string;
    title: string;
    body: string;
  };
  molecule: 'single' | 'double' | 'triple';
  atomColor: string;
  /** Opacity of the white top stroke, measured from the Figma export. */
  atomHighlight: number;
};

/** Chip label colours, the same on every frame. */
export const CHIP_COLORS: Record<ChipId, string> = {
  ane: '#0795ff',
  ene: '#fd2121',
  yne: '#689c3f',
};

export const CHIP_LABELS: Record<ChipId, string> = { ane: 'Ane', ene: 'Ene', yne: 'Yne' };

// Default cog on 67 - the same nine triangles as the onboarding cog badge.
const BLUE_COG = {
  ellipse: '/figma/3b9df.svg',
  spikes: [
    '/figma/597b7.svg', '/figma/a284a.svg', '/figma/6e9db.svg', '/figma/5a2bf.svg', '/figma/023f1.svg',
    '/figma/73bd4.svg', '/figma/a284a.svg', '/figma/16ac4.svg', '/figma/5a2bf.svg',
  ],
};

// 68 and 69 draw eight identical triangles plus one variant at (13, 1).
const themedCog = (ellipse: string, spike: string, odd: string) => ({
  ellipse,
  spikes: [spike, spike, spike, spike, spike, odd, spike, spike, spike],
});

export const SUFFIX_FRAMES: SuffixFrame[] = [
  {
    id: 's67',
    figmaNode: '4589:29745',
    band: '/figma/bef1f.svg',
    timeline: { src: '/figma/38efe.png', left: -1, top: 211 },
    rail: { left: 275, top: 244 },
    active: 'ane',
    activeScale: 142 / 106,
    chips: {
      ane: { outline: '/figma/2a121.svg', hatch: '/figma/36ef1.svg' },
      ene: { outline: '/figma/c772a.svg', hatch: '/figma/8ef97.svg' },
      yne: { outline: '/figma/8f323.svg', hatch: '/figma/8ef97.svg' },
    },
    pins: [
      { src: '/figma/1ee0e.svg', left: 42, top: -35 },
      { src: '/figma/dd389.svg', left: 230, top: -33 },
      { src: '/figma/65f28.svg', left: 400, top: -33 },
    ],
    tag: {
      label: 'Single bond', color: '#0795ff', left: 265, top: 135, height: 66,
      paddingX: 13.463, paddingY: 8.976, radius: 23.561, topBorder: 4.488, sideBorder: 1.122, fontSize: 20,
    },
    panel: {
      inFrame: true,
      left: 'calc(50% - 0.5px)',
      color: '#5bb9ff',
      plane: '/figma/0b2dc.svg',
      cog: BLUE_COG,
      tick: '/figma/ddfd1.svg',
      title: SERIES_COPY.alkane.suffixTitle,
      body: SERIES_COPY.alkane.suffixLesson,
    },
    molecule: 'single',
    atomColor: '#0795ff',
    atomHighlight: 0.47,
  },
  {
    id: 's68',
    figmaNode: '4589:29934',
    band: '/figma/37866.svg',
    leftBandHeight: 1025,
    timeline: { src: '/figma/55af6.png', left: -2, top: 201 },
    rail: { left: 274, top: 234 },
    active: 'ene',
    activeScale: 128.186 / 106,
    chips: {
      ane: { outline: '/figma/b0796.svg', hatch: '/figma/8ef97.svg' },
      ene: { outline: '/figma/00d88.svg', hatch: '/figma/eed23.svg' },
      yne: { outline: '/figma/8f323.svg', hatch: '/figma/8ef97.svg' },
    },
    pins: [
      { src: '/figma/1ee0e.svg', left: 42, top: -35 },
      { src: '/figma/dd389.svg', left: 196, top: -35 },
      { src: '/figma/65f28.svg', left: 348, top: -33 },
    ],
    tag: {
      label: 'Double Bond', color: '#fd2121', left: 388, top: 124, width: 217, height: 67.461,
      paddingX: 15.138, paddingY: 10.092, radius: 26.491, topBorder: 5.046, sideBorder: 1.261, fontSize: 22.487,
    },
    panel: {
      inFrame: false,
      left: '50%',
      color: '#fd2121',
      plane: '/figma/93b6d.svg',
      cog: themedCog('/figma/4b539.svg', '/figma/55acd.svg', '/figma/1f182.svg'),
      tick: '/figma/8cc44.svg',
      // Figma 4589:30442 / 4589:30443 reads "Alkanes ... Triple covalent
      // bond" on the *ene* card: wrong series and wrong bond on one line. It
      // is also the wrong card - this screen teaches the ending, and the ANE
      // frame does it properly. All three now say the same kind of thing.
      title: SERIES_COPY.alkene.suffixTitle,
      body: SERIES_COPY.alkene.suffixLesson,
    },
    molecule: 'double',
    atomColor: '#fd2121',
    atomHighlight: 0.49,
  },
  {
    id: 's69',
    figmaNode: '4589:30093',
    band: '/figma/37866.svg',
    leftBandHeight: 1025,
    timeline: { src: '/figma/55af6.png', left: 1, top: 198 },
    rail: { left: 267, top: 232 },
    active: 'yne',
    activeScale: 138 / 106,
    chips: {
      ane: { outline: '/figma/b0796.svg', hatch: '/figma/8ef97.svg' },
      ene: { outline: '/figma/c772a.svg', hatch: '/figma/8ef97.svg' },
      yne: { outline: '/figma/eb450.svg', hatch: '/figma/f36d3.svg' },
    },
    pins: [
      { src: '/figma/65f28.svg', left: 42, top: -35 },
      { src: '/figma/65f28.svg', left: 196, top: -35 },
      { src: '/figma/65f28.svg', left: 348, top: -33 },
    ],
    tag: {
      label: 'Triple bond', color: '#689c3f', left: 563, top: 121, width: 215,
      paddingX: 19.044, paddingY: 12.696, radius: 33.326, topBorder: 6.348, sideBorder: 1.587, fontSize: 25.392,
    },
    panel: {
      inFrame: false,
      left: '50%',
      color: '#69a13b',
      plane: '/figma/a9f02.svg',
      cog: themedCog('/figma/4bdba.svg', '/figma/c719a.svg', '/figma/5b355.svg'),
      tick: '/figma/fb475.svg',
      // Figma 4589:30400 / 4589:30401 heads the *yne* card "Alkanes".
      title: SERIES_COPY.alkyne.suffixTitle,
      body: SERIES_COPY.alkyne.suffixLesson,
    },
    molecule: 'triple',
    atomColor: '#69a13b',
    atomHighlight: 0.59,
  },
];
