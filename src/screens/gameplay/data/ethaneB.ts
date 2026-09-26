import type { RailSpec, Scene, SceneElement } from '../scene/types';
import { SELECTION_ROW, standardRules } from './common';

/**
 * Ethane, continued - Figma frames 4589:23895 to 4589:25523 on the
 * "Game play for alkane" row.
 *
 * With the carbon pair made, the learner picks the blue hydrogens out of the
 * mixed row with the paper arrows, loads them on the paper, and throws them
 * at the free bond slots of the two carbons. Every value below is copied from
 * the frame's Figma export.
 */

/** Rail with "Eth" enlarged, as these frames draw it. */
const ETH_RAIL: RailSpec = {
  left: 0,
  top: 136,
  width: 1182,
  containerHeight: 139,
  activeIndex: 1,
  activeScale: 135.581 / 106,
  activeOutline: '/figma/e9195.svg',
  activeHatch: '/figma/31da5.svg',
  highlightInChip: { left: -9, top: -9, width: 153, height: 133 },
  timeline: '/figma/fda65.png',
  // As on the first ethane frames: chip row box at 5 / 13, 1177 wide; timeline at 2.
  innerLeft: 5,
  innerTop: 13,
  innerWidth: 1177,
  timelineLeft: 2,
};

const PANEL_TITLE = 'Make the spiderweb .';
const PANEL_BODY = 'Create the carbon of th same family of colour.';

/** The paper plane as a separate image (card layout). */
const paper = (left: number, top: number): SceneElement => ({
  kind: 'image', key: 'paper', src: '/figma/ef0e6.svg', left, top, width: 173, height: 54.5, inset: '-1.83% -0.25% -1.87% -1.14%',
});

/** The two blue carbons with their bond, placed on the page (Figma root group). */
const carbonPair = (left: string, top: number): SceneElement => ({
  kind: 'group',
  key: 'carbons',
  left,
  top,
  centerX: true,
  width: 288.56,
  height: 82,
  children: [
    { kind: 'carbon', key: 'carbon', left: 0, top: 0, color: 'blue', highlight: 0.5 },
    { kind: 'carbon', key: 'carbon-2', left: 200, top: 0, color: 'blue', highlight: 0.5 },
    { kind: 'line', key: 'bond', src: '/figma/fb730.png', left: 92, top: 44, width: 114, height: 1, rotate: 0.5, length: 114.004, inset: 4 },
  ],
});

/**
 * The six free bond slots, interleaved with the rules exactly as Figma
 * layers them: west, north, south of the first carbon; south, north, east of
 * the second.
 */
const SLOTS: SceneElement[] = [
  { kind: 'line', key: 'slot-w', afterRule: 8, src: '/figma/a1088.png', left: 369, top: 456, width: 94, height: 0, rotate: 180, length: 94, inset: 4 },
  { kind: 'line', key: 'slot-n', afterRule: 9, src: '/figma/5c047.png', left: 499, top: 357, width: 0, height: 66, rotate: -90, length: 66, inset: 4 },
  { kind: 'line', key: 'slot-s', afterRule: 10, src: '/figma/853fe.png', left: 489, top: 498, width: 0, height: 67, rotate: 90, length: 67, inset: 4 },
  { kind: 'line', key: 'slot2-s', afterRule: 13, src: '/figma/fbed1.png', left: 694, top: 495, width: 1, height: 70, rotate: 89.18, length: 70.007, inset: 4 },
  { kind: 'line', key: 'slot2-n', afterRule: 13, src: '/figma/797bb.png', left: 695, top: 357, width: 0, height: 74, rotate: 90, length: 74, inset: 4 },
  { kind: 'line', key: 'slot2-e', afterRule: 14, src: '/figma/a1088.png', left: 732, top: 462, width: 94, height: 0, rotate: 180, length: 94, inset: 4 },
];

export const ETHANE_SCENES_B: Scene[] = [
  // Two bonded carbons above the mixed selection row; two paper arrows point from the paper into the row.
  {
    id: 'ethane-09',
    figmaNode: '4589:23895',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: ETH_RAIL,
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      { kind: 'panel' },
      { kind: 'rail' },
      {
        kind: 'tray',
        key: 'selection',
        variant: 'dashed',
        left: 'calc(50% + 16px)',
        top: 561,
        centerX: true,
        padding: { top: 20, right: 25, bottom: 20, left: 25 },
        gap: 24,
        innerShadow: 'inset 0px 4px 4px 0px rgba(228,221,221,0.25)',
        atoms: [...SELECTION_ROW],
      },
    ],
    rootElements: [
      carbonPair('calc(50% + 2.28px)', 353),
      paper(231, 754),
      { kind: 'line', key: 'arrow-1', src: '/figma/e9cbf.svg', left: 404.04, top: 628, width: 240.86, height: 125.152, rotate: 152.54, length: 271.434, inset: '-2.89px -0.18% -2.89px 0' },
      { kind: 'line', key: 'arrow-2', src: '/figma/fbee8.svg', left: 404, top: 628, width: 384.896, height: 125.886, rotate: 161.89, length: 404.96, inset: '-2.89px -0.12% -2.89px 0' },
    ],
  },
  // Two blue H loaded on the paper; ten H left in the selection row, two paper arrows into the row.
  {
    id: 'ethane-10',
    figmaNode: '4589:24181',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, highlightInChip: { left: -8, top: -11, width: 158, height: 134 } },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      { kind: 'hydrogen', key: 'h-paper', afterRule: 6, left: 269, top: 715, color: 'blue' },
      { kind: 'panel' },
      { kind: 'rail' },
      {
        kind: 'tray',
        key: 'selection',
        variant: 'dashed',
        left: 'calc(50% + 16px)',
        top: 561,
        centerX: true,
        padding: { top: 20, right: 25, bottom: 20, left: 25 },
        gap: 24,
        innerShadow: 'inset 0px 4px 4px 0px rgba(228,221,221,0.25)',
        atoms: ['blue', 'blue', 'red', 'blue', 'red', 'red', 'blue', 'green', 'blue', 'blue'],
      },
      { kind: 'hydrogen', key: 'h-paper-2', left: 237, top: 727, color: 'blue' },
    ],
    rootElements: [
      carbonPair('calc(50% + 2.28px)', 353),
      paper(231, 754),
      { kind: 'line', key: 'arrow-1', src: '/figma/8dfab.svg', left: 404.04, top: 634, width: 209.963, height: 119.152, rotate: 150.43, length: 241.416, inset: '-2.89px -0.21% -2.89px 0' },
      { kind: 'line', key: 'arrow-2', src: '/figma/3a48d.svg', left: 410, top: 634, width: 556, height: 120, rotate: 167.82, length: 568.802, inset: '-2.89px 0' },
    ],
  },
  // Carbon pair moved down with three free bond slots each; the four collected blue H wait in a plain tray.
  {
    id: 'ethane-11',
    figmaNode: '4589:24464',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, highlightInChip: { left: -11, top: -11, width: 158, height: 134 } },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      ...SLOTS,
      { kind: 'panel' },
      { kind: 'rail' },
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        left: 'calc(50% + 2px)',
        top: 719,
        centerX: true,
        width: 283,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 16,
        atoms: ['blue', 'blue', 'blue', 'blue'],
      },
    ],
    rootElements: [
      carbonPair('calc(50% + 3.28px)', 423),
      paper(231, 754),
    ],
  },
  // One blue H loaded on the paper with a trajectory up to the first carbon's south slot; three H left in the tray.
  {
    id: 'ethane-12',
    figmaNode: '4589:24727',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, highlightInChip: { left: -11, top: -9, width: 158, height: 134 } },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      ...SLOTS,
      { kind: 'panel' },
      { kind: 'rail' },
      // TODO(figma): the third H is absolutely placed inside the tray, at the spot the flow would put it:
      // <div className="absolute left-[142px] size-[47px] top-[16px]" data-node-id="4589:24977" data-name="\Mocule"> (a1098 ellipse, "H")
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        left: 'calc(50% + 2px)',
        top: 719,
        centerX: true,
        width: 283,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 16,
        atoms: ['blue', 'blue', 'blue'],
      },
      { kind: 'hydrogen', key: 'h-flying', left: 247, top: 713, color: 'blue' },
      // TODO(figma): Figma nests the trajectory inside the H above (left-[32.08px] top-[-150px]); placed here in frame coordinates (247 + 32.08, 713 - 150).
      { kind: 'line', key: 'path', src: '/figma/63bca.png', left: 279.08, top: 563, width: 210.923, height: 188.698, rotate: 138.18, length: 283.012, inset: '-8.66px 0' },
    ],
    rootElements: [
      carbonPair('calc(50% + 3.28px)', 423),
      paper(231, 754),
    ],
  },
  // Same as the previous frame, with the paper drawn back: two dotted aim lines run from the paper's edges.
  {
    id: 'ethane-13',
    figmaNode: '4589:24991',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, highlightInChip: { left: -11, top: -11, width: 158, height: 134 } },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      ...SLOTS,
      { kind: 'panel' },
      { kind: 'rail' },
      // TODO(figma): the third H is absolutely placed inside the tray, at the spot the flow would put it:
      // <div className="absolute left-[142px] size-[47px] top-[16px]" data-node-id="4589:25241" data-name="\Mocule"> (a1098 ellipse, "H")
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        left: 'calc(50% + 2px)',
        top: 719,
        centerX: true,
        width: 283,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 16,
        atoms: ['blue', 'blue', 'blue'],
      },
      { kind: 'hydrogen', key: 'h-flying', left: 247, top: 713, color: 'blue' },
      // TODO(figma): Figma nests the trajectory inside the H above (left-[32.08px] top-[-150px]); placed here in frame coordinates (247 + 32.08, 713 - 150).
      { kind: 'line', key: 'path', src: '/figma/63bca.png', left: 279.08, top: 563, width: 210.923, height: 188.698, rotate: 138.18, length: 283.012, inset: '-8.66px 0' },
    ],
    rootElements: [
      carbonPair('calc(50% + 3.28px)', 423),
      paper(231, 754),
      { kind: 'line', key: 'aim-1', src: '/figma/f5dea.svg', left: 225, top: 753, width: 173, height: 1, rotate: -0.33, length: 173.003, inset: 4 },
      { kind: 'line', key: 'aim-2', src: '/figma/5c6af.svg', left: 249, top: 757, width: 155, height: 82.175, rotate: 152.07, length: 175.436, inset: 4 },
    ],
  },
  // The blue H in flight along the trajectory, halfway to the first carbon's south slot; aim lines still on the paper.
  {
    id: 'ethane-14',
    figmaNode: '4589:25257',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, highlightInChip: { left: -11, top: -8, width: 158, height: 134 } },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      ...SLOTS,
      { kind: 'panel' },
      { kind: 'rail' },
      // TODO(figma): the third H is absolutely placed inside the tray, at the spot the flow would put it:
      // <div className="absolute left-[142px] size-[47px] top-[16px]" data-node-id="4589:25507" data-name="\Mocule"> (a1098 ellipse, "H")
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        left: 'calc(50% + 2px)',
        top: 719,
        centerX: true,
        width: 283,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 16,
        atoms: ['blue', 'blue', 'blue'],
      },
      { kind: 'line', key: 'path', src: '/figma/d9b75.png', left: 264, top: 565, width: 225, height: 195, rotate: 139.09, length: 297.742, inset: '-8.66px 0' },
      { kind: 'hydrogen', key: 'h-flying', left: 423, top: 580, color: 'blue' },
    ],
    rootElements: [
      carbonPair('calc(50% + 3.28px)', 423),
      paper(231, 754),
      { kind: 'line', key: 'aim-1', src: '/figma/f5dea.svg', left: 225, top: 753, width: 173, height: 1, rotate: -0.33, length: 173.003, inset: 4 },
      { kind: 'line', key: 'aim-2', src: '/figma/5c6af.svg', left: 249, top: 757, width: 155, height: 82.175, rotate: 152.07, length: 175.436, inset: 4 },
    ],
  },
  // The blue H has reached the first carbon's south slot and sits at its end; the tray narrows to 208px.
  {
    id: 'ethane-15',
    figmaNode: '4589:25523',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, highlightInChip: { left: -14, top: -11, width: 158, height: 134 } },
    panel: { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: PANEL_TITLE, body: PANEL_BODY },
    elements: [
      ...SLOTS,
      { kind: 'panel' },
      { kind: 'rail' },
      // TODO(figma): the third H is absolutely placed inside the tray, at the spot the flow would put it:
      // <div className="absolute left-[142px] size-[47px] top-[16px]" data-node-id="4589:25773" data-name="\Mocule"> (a1098 ellipse, "H")
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        left: 'calc(50% + 0.5px)',
        top: 719,
        centerX: true,
        width: 208,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 16,
        atoms: ['blue', 'blue', 'blue'],
      },
      { kind: 'line', key: 'path', src: '/figma/d9b75.png', left: 264, top: 565, width: 225, height: 195, rotate: 139.09, length: 297.742, inset: '-8.66px 0' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 468, top: 541, color: 'blue' },
    ],
    rootElements: [
      carbonPair('calc(50% + 3.28px)', 423),
      paper(231, 754),
      { kind: 'line', key: 'aim-1', src: '/figma/f5dea.svg', left: 225, top: 753, width: 173, height: 1, rotate: -0.33, length: 173.003, inset: 4 },
      { kind: 'line', key: 'aim-2', src: '/figma/5c6af.svg', left: 249, top: 757, width: 155, height: 82.175, rotate: 152.07, length: 175.436, inset: 4 },
    ],
  },
];
