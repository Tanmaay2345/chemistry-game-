import type { FrameSpec, Scene, SceneElement } from '../scene/types';
import { METHANE_BODY, METH_RAIL, standardRules } from './common';

/**
 * Methane - Figma frames E11 to E16 on the "Game play for alkane" row.
 *
 * The end of the methane flow: the remaining hydrogens are thrown onto
 * carbon's free slots until all four are bonded (E16, the finished methane).
 * Every value below is copied from the frame's Figma export.
 *
 * Note: bonded hydrogens that Figma draws with ellipse `c7177.svg` (the blue
 * disc without the grey #BEBABA outline) are mapped to 'blue'.
 */

const CARBON_HIGHLIGHT = 0.5;

const FRAME_E: FrameSpec = {
  left: 'calc(50% + 1.5px)',
  width: 1177,
  explicitHeight: false,
  rules: standardRules('a7e85', 'f61aa', '4bb46'),
};

/** The paper plane, tilted, as E11-E13 draw it: a 173 x 54.5 image centred in a 180.244 x 119.929 box. */
const PAPER: SceneElement = {
  kind: 'group',
  key: 'paper',
  left: 134.38,
  top: 714.29,
  width: 180.244,
  height: 119.929,
  children: [
    // Figma centres the 173 x 54.5 box in this flex box and rotates it -23.91deg.
    { kind: 'image', src: '/figma/7bd52.svg', left: 3.622, top: 32.7145, width: 173, height: 54.5, rotate: -23.91, inset: '-1.83% -0.25% -1.87% -1.14%' },
  ],
};

/** Four speed lines behind the paper, placed on the page (after Frame). */
const SWOOSH: SceneElement[] = [
  { kind: 'line', key: 'swoosh-1', src: '/figma/4e89b.svg', left: 264, top: 734.97, width: 151.777, height: 40.03, rotate: -14.77, length: 156.967, inset: 1 },
  { kind: 'line', key: 'swoosh-2', src: '/figma/b5dac.svg', left: 264, top: 730, width: 159, height: 39, rotate: -13.78, length: 163.713, inset: 1 },
  { kind: 'line', key: 'swoosh-3', src: '/figma/702fb.svg', left: 357, top: 737, width: 76, height: 70, rotate: -42.65, length: 103.325, inset: 1 },
  { kind: 'line', key: 'swoosh-4', src: '/figma/702fb.svg', left: 364, top: 737, width: 76, height: 70, rotate: -42.65, length: 103.325, inset: 1 },
];

export const METHANE_SCENES_C: Scene[] = [
  // E11: south and east H bonded; a blue H (with motion-blur twin) leaves the paper, trajectories to the north and west slots.
  {
    id: 'methane-11',
    figmaNode: '4589:28183',
    figmaName: 'E11',
    frame: FRAME_E,
    rail: { ...METH_RAIL, highlightInChip: { left: -11, top: -8, width: 158, height: 134 } },
    panel: { layout: 'card', left: 138, top: 801.5, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'carbon', key: 'carbon', afterRule: 19, left: 'calc(50% - 0.22px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'rail' },
      PAPER,
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 567, top: 547, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue', art: '/figma/c7177.svg' },
      { kind: 'hydrogen', key: 'h-flying-trail', left: 267, top: 681, color: 'blue' },
      {
        kind: 'group',
        key: 'h-flying',
        left: 278,
        top: 670,
        width: 47,
        height: 47,
        children: [
          { kind: 'hydrogen', left: 0, top: 0, color: 'blue' },
          { kind: 'line', key: 'path', src: '/figma/052c0.svg', left: 32, top: -340, width: 276, height: 346, rotate: 128.58, length: 442.597, inset: '-8.66px 0' },
        ],
      },
      { kind: 'line', key: 'slot-e', src: '/figma/3e14b.png', left: 633, top: 472, width: 55, height: 2, rotate: -2.08, length: 55.036, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/954d1.png', left: 591, top: 338, width: 2, height: 87.994, rotate: -91.3, length: 88.017, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/5ce02.png', left: 474, top: 467, width: 73, height: 0, rotate: 180, length: 73, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/80b05.png', left: 588, top: 508, width: 0, height: 45.955, rotate: 90, length: 45.955, inset: 4 },
      { kind: 'line', key: 'path-2', src: '/figma/69b3e.svg', left: 302, top: 459, width: 179, height: 217, rotate: 129.52, length: 281.301, inset: '-8.66px 0' },
    ],
    rootElements: SWOOSH,
  },
  // E12: same throw a moment later - trajectories re-aimed at the north and west slots; south and east H bonded.
  {
    id: 'methane-12',
    figmaNode: '4589:28445',
    figmaName: 'E12',
    frame: FRAME_E,
    rail: { ...METH_RAIL, highlightInChip: { left: -11, top: -7, width: 162, height: 134 } },
    panel: { layout: 'card', left: 138, top: 801.5, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      PAPER,
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 566, top: 544, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue', art: '/figma/c7177.svg' },
      { kind: 'hydrogen', key: 'h-flying-trail', left: 267, top: 681, color: 'blue' },
      {
        kind: 'group',
        key: 'h-flying',
        left: 278,
        top: 670,
        width: 47,
        height: 47,
        children: [
          { kind: 'hydrogen', left: 0, top: 0, color: 'blue' },
          { kind: 'line', key: 'path', src: '/figma/ae1df.svg', left: 32, top: -321, width: 280, height: 327, rotate: 130.57, length: 430.499, inset: '-8.66px 0' },
        ],
      },
      { kind: 'line', key: 'slot-e', src: '/figma/711f4.png', left: 629, top: 471, width: 59, height: 1, rotate: 0.97, length: 59.008, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/96919.png', left: 592, top: 347, width: 1, height: 82, rotate: -89.3, length: 82.006, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/36562.png', left: 474, top: 466, width: 78, height: 1, rotate: 179.27, length: 78.006, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 588, top: 479, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
      { kind: 'line', key: 'path-2', src: '/figma/04426.svg', left: 302, top: 467, width: 185, height: 209, rotate: 131.51, length: 279.116, inset: '-8.66px 0' },
      { kind: 'carbon', key: 'carbon', left: 'calc(50% - 0.22px)', top: 425, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
    ],
    rootElements: SWOOSH,
  },
  // E13: the thrown H arrives at the west slot (its trajectory trailing back to the paper); south and east H bonded.
  {
    id: 'methane-13',
    figmaNode: '4589:28707',
    figmaName: 'E13',
    frame: FRAME_E,
    rail: { ...METH_RAIL, highlightInChip: { left: -11, top: -9, width: 162, height: 135 } },
    panel: { layout: 'card', left: 138, top: 801.5, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'carbon', key: 'carbon', afterRule: 12, left: 'calc(50% - 0.22px)', top: 425, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'rail' },
      PAPER,
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 566, top: 547, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue', art: '/figma/c7177.svg' },
      { kind: 'hydrogen', key: 'h-flying-trail', left: 267, top: 681, color: 'blue' },
      {
        kind: 'group',
        key: 'h-flying',
        left: 453,
        top: 446,
        width: 47,
        height: 47,
        children: [
          { kind: 'hydrogen', left: 0, top: 0, color: 'blue' },
          { kind: 'line', key: 'path', src: '/figma/8c6de.svg', left: -148, top: -88, width: 284, height: 332, rotate: 130.54, length: 436.898, inset: '-8.66px 0' },
        ],
      },
      { kind: 'line', key: 'slot-e', src: '/figma/f0252.png', left: 614, top: 472, width: 74, height: 0, length: 74, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/29806.png', left: 590, top: 358, width: 0, height: 67, rotate: -90, length: 67, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/e5141.png', left: 494, top: 467, width: 54, height: 0, rotate: 180, length: 54, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/2a561.png', left: 'calc(50% - 0.5px)', top: 506, centerX: true, width: 0, height: 53.955, rotate: 90, length: 53.955, inset: 4 },
    ],
    rootElements: SWOOSH,
  },
  // E14: the thrown H (with its motion-blur twin) lands on the west slot; south and east H bonded.
  {
    id: 'methane-14',
    figmaNode: '4589:28968',
    figmaName: 'E14',
    frame: FRAME_E,
    rail: { ...METH_RAIL, highlightInChip: { left: -12, top: -9, width: 164, height: 137 } },
    panel: { layout: 'card', left: 138, top: 801.5, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'carbon', key: 'carbon', afterRule: 12, left: 'calc(50% - 0.22px)', top: 429, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'rail' },
      PAPER,
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 565, top: 552, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue', art: '/figma/c7177.svg' },
      { kind: 'hydrogen', key: 'h-flying-trail', left: 422, top: 505, color: 'blue' },
      {
        kind: 'group',
        key: 'h-flying',
        left: 450,
        top: 448,
        width: 47,
        height: 47,
        children: [
          { kind: 'hydrogen', left: 0, top: 0, color: 'blue' },
          { kind: 'line', key: 'path', src: '/figma/483d2.svg', left: -162, top: -88, width: 303, height: 361, rotate: 130.01, length: 471.307, inset: '-8.66px 0' },
        ],
      },
      { kind: 'line', key: 'slot-e', src: '/figma/e07f9.png', left: 633, top: 472, width: 55, height: 0, length: 55, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8da82.png', left: 593, top: 358, width: 0, height: 71, rotate: -90, length: 71, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/cb4d4.png', left: 495, top: 467, width: 52, height: 0, rotate: 180, length: 52, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/0ed56.png', left: 587, top: 511, width: 1, height: 47.955, rotate: 91.19, length: 47.965, inset: 4 },
    ],
    rootElements: SWOOSH,
  },
  // E15: the thrown H hits the west slot with a blue splash; the carbon (now drawn on the page) and its slots shift left.
  {
    id: 'methane-15',
    figmaNode: '4589:29229',
    figmaName: 'E15',
    frame: FRAME_E,
    rail: { ...METH_RAIL, highlightInChip: { left: -9, top: 0, width: 159, height: 126 } },
    panel: { layout: 'card', left: 138, top: 801.5, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      PAPER,
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 542, top: 548, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue', art: '/figma/c7177.svg' },
      { kind: 'hydrogen', key: 'h-flying-trail', left: 413, top: 495, color: 'blue', art: '/figma/9e759.svg' },
      // The landing H: Figma swaps its ellipse for splash art (c7ef2.svg, disc + splash) bleeding far outside the 47px box.
      {
        kind: 'group',
        key: 'h-bonded-w',
        left: 450,
        top: 448,
        width: 47,
        height: 47,
        children: [
          { kind: 'image', key: 'burst', src: '/figma/c7ef2.svg', left: 0, top: 0, width: 47, height: 47, inset: '-129.49% -245.69% -121.34% -111.81%' },
          // TODO(figma): the H label also has tracking-[0.2px] and text-center, which TextElement cannot express:
          // <p className="-translate-x-1/2 absolute font-['Lexend:Medium'] font-medium leading-[normal] left-[24px] text-[20px] text-center text-white top-[11px] tracking-[0.2px] whitespace-nowrap">H</p>
          { kind: 'text', text: 'H', fontSize: 20, fontWeight: 500, color: '#ffffff', left: 24, top: 11, centerX: true },
        ],
      },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 599, top: 472, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/09d13.png', left: 571, top: 351, width: 3, height: 84.994, rotate: -87.98, length: 85.047, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/92e18.png', left: 474, top: 466, width: 59.948, height: 1, rotate: 179.04, length: 59.957, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 565, top: 486, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
    ],
    rootElements: [
      // Figma places the carbon on the page here, not inside Frame.
      { kind: 'carbon', key: 'carbon', left: 659, top: 426, color: 'blue', highlight: CARBON_HIGHLIGHT },
      ...SWOOSH,
    ],
  },
  // E16: finished methane - all four H bonded, a large blue splash behind the carbon, the Meth chip filled, and a small "Methane" card.
  {
    id: 'methane-16',
    figmaNode: '4589:29489',
    figmaName: 'E16',
    frame: FRAME_E,
    rail: {
      ...METH_RAIL,
      activeOutline: '/figma/2877b.svg',
      activeFill: { background: '#0795ff', textColor: '#fffdfd', outlineInset: '-2.61% -1.11% -1% -0.64%' },
    },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 719, centerX: true, width: 240, title: 'Methane', body: '' },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 542, top: 548, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue', art: '/figma/c7177.svg' },
      { kind: 'hydrogen', key: 'h-bonded-w', left: 413, top: 439, color: 'blue' },
      { kind: 'hydrogen', key: 'h-bonded-n', left: 548, top: 308, color: 'blue', art: '/figma/9675a.svg' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 599, top: 472, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/09d13.png', left: 571, top: 351, width: 3, height: 84.994, rotate: -87.98, length: 85.047, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/85539.png', left: 460, top: 466, width: 73.948, height: 1, rotate: 179.23, length: 73.955, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 565, top: 486, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
      // Carbon and its splash, as Figma renders node 4589:29740 (the carbon's own brush stroke,
      // which the export cannot express). The render places the carbon at (166, 281).
      { kind: 'image', key: 'carbon', src: '/figma/renders/methane-final-burst.png', left: 522 - 166, top: 426 - 281, width: 395, height: 531 },
    ],
  },
];
