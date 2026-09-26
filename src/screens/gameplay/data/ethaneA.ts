import type { RailSpec, Scene, SceneElement } from '../scene/types';
import { SELECTION_ROW, standardRules } from './common';

/**
 * Ethane - the start of the ethane flow on the "Game play for alkane" row
 * (Figma 4589:22021 to 4589:23609).
 *
 * The learner picks the group of two blue carbons, joins them, then starts
 * choosing hydrogens for the pair. The rail enlarges "Eth". Every value
 * below is copied from the frame's Figma export.
 */

/** Rail with "Eth" enlarged, as the ethane frames draw it. */
const ETH_RAIL: RailSpec = {
  left: 0,
  top: 151,
  width: 1182,
  containerHeight: 150,
  activeIndex: 1,
  activeScale: 135.581 / 106,
  activeOutline: '/figma/e9195.svg',
  activeHatch: '/figma/31da5.svg',
  highlightInChip: { left: -8, top: -9, width: 151, height: 130 },
  timeline: '/figma/fda65.png',
  // On these frames the chip row box sits at 5 / 13 and is 1177 wide; the timeline at 2.
  innerLeft: 5,
  innerTop: 13,
  innerWidth: 1177,
  timelineLeft: 2,
};

const CARBON_HIGHLIGHT = 0.5;

const PAPER_INSET = '-1.83% -0.25% -1.87% -1.14%';

/** The four groups of small carbons; the third (two blues) is the right one. */
const GROUPS: SceneElement = {
  kind: 'carbonGroups',
  key: 'groups',
  afterRule: 17,
  left: 'calc(50% - 68px)',
  top: 549,
  centerX: true,
  gap: 41,
  groups: [['blue', 'red'], ['blue', 'green', 'green'], ['blue', 'blue'], ['blue', 'blue', 'blue']],
};

/** The same groups placed on the page (after Frame), as later frames draw them. */
const GROUPS_ON_PAGE: SceneElement = {
  kind: 'carbonGroups',
  key: 'groups',
  left: 'calc(50% - 41.5px)',
  top: 551,
  centerX: true,
  gap: 41,
  groups: [['blue', 'red'], ['blue', 'green', 'green'], ['blue', 'blue'], ['blue', 'blue', 'blue']],
};

/** The throw trajectory from the paper up to the pair of blue carbons (page coordinates). */
const PATH_TO_PAIR: SceneElement = { kind: 'line', key: 'path', src: '/figma/d417c.svg', left: 441.48, top: 627, width: 264.515, height: 121.071, rotate: 155.41, length: 290.906, inset: '-8.66px 0' };

/** The paper plane at rest above the card. */
const PAPER: SceneElement = { kind: 'image', key: 'paper', src: '/figma/a9c72.svg', left: 142, top: 747, width: 173, height: 54.5, inset: PAPER_INSET };

/** The bonded pair above the selection row, grouped with its bond (page coordinates). */
const MOLECULE: SceneElement = {
  kind: 'group',
  key: 'molecule',
  left: 'calc(50% + 2.28px)',
  top: 353,
  centerX: true,
  width: 288.56,
  height: 82,
  children: [
    { kind: 'carbon', key: 'carbon', left: 0, top: 0, color: 'blue', highlight: CARBON_HIGHLIGHT },
    { kind: 'carbon', key: 'carbon-2', left: 200, top: 0, color: 'blue', highlight: CARBON_HIGHLIGHT },
    { kind: 'line', key: 'bond', src: '/figma/fb730.png', left: 92, top: 44, width: 114, height: 1, rotate: 0.5, length: 114.004, inset: 4 },
  ],
};

/** The mixed hydrogen selection row. */
const SELECTION: SceneElement = {
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
};

/** The reloaded paper plane (page coordinates). */
const PAPER_RELOADED: SceneElement = { kind: 'image', key: 'paper', src: '/figma/ef0e6.svg', left: 231, top: 754, width: 173, height: 54.5, inset: PAPER_INSET };

const SPIDERWEB_PANEL = { layout: 'card', left: 'calc(50% - 0.5px)', top: 801.5, centerX: true, title: 'Make the spiderweb .', body: 'Create the carbon of th same family of colour.' } as const;

export const ETHANE_SCENES_A: Scene[] = [
  // Four groups of small carbons to choose from; "Make Ethane".
  {
    id: 'ethane-01',
    figmaNode: '4589:22021',
    figmaName: 'E2',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'gap', explicitHeight: true, rules: standardRules() },
    rail: ETH_RAIL,
    panel: { layout: 'card', left: 142, top: 801.5, title: 'Make Ethane', body: 'Create the carbon of th same family of colour.' },
    elements: [
      GROUPS,
      PAPER,
      { kind: 'panel' },
      { kind: 'rail' },
    ],
  },
  // Same groups; a trajectory from the paper arcs up towards the pair of blue carbons.
  {
    id: 'ethane-02',
    figmaNode: '4589:21757',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'gap', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, containerHeight: 139, highlightInChip: { left: -11, top: -7, width: 154, height: 130 } },
    panel: { layout: 'card', left: 142, top: 801.5, title: 'Make Ethane', body: 'Create the carbon of th same family of colour.' },
    elements: [
      GROUPS,
      PAPER,
      { kind: 'panel' },
      { kind: 'rail' },
    ],
    rootElements: [PATH_TO_PAIR],
  },
  // The groups move onto the page; trajectory to the blue pair plus two speed lines off the paper.
  {
    id: 'ethane-03',
    figmaNode: '4589:22284',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'gap', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, containerHeight: 139, highlightInChip: { left: -9, top: -9, width: 152, height: 129 } },
    panel: { layout: 'card', left: 142, top: 801.5, title: 'Make Ethane', body: 'Create the carbon of th same family of colour.' },
    elements: [
      PAPER,
      { kind: 'panel' },
      { kind: 'rail' },
    ],
    rootElements: [
      GROUPS_ON_PAGE,
      PATH_TO_PAIR,
      { kind: 'line', key: 'swoosh-1', src: '/figma/459e7.svg', left: 293, top: 753, width: 149, height: 84, rotate: -29.41, length: 171.047, inset: 3 },
      { kind: 'line', key: 'swoosh-2', src: '/figma/ff4c5.svg', left: 239, top: 745, width: 202, height: 15, rotate: -4.25, length: 202.556, inset: 3 },
    ],
  },
  // Paper in flight along the trajectory; "Select the carbon" label above the groups.
  {
    id: 'ethane-04',
    figmaNode: '4589:22550',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'gap', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, containerHeight: 139, highlightInChip: { left: -9, top: -10, width: 153, height: 131 } },
    panel: { layout: 'card', left: 142, top: 801.5, title: 'Make Ethane', body: 'Create the carbon of th same family of colour.' },
    elements: [
      { kind: 'image', key: 'paper', src: '/figma/a9c72.svg', left: 325, top: 667, width: 173, height: 54.5, inset: PAPER_INSET },
      { kind: 'panel' },
      { kind: 'rail' },
      { kind: 'text', key: 'prompt', text: 'Select the carbon', fontSize: 24, fontWeight: 500, color: '#000000', left: 141, top: 475 },
    ],
    rootElements: [
      GROUPS_ON_PAGE,
      PATH_TO_PAIR,
      { kind: 'line', key: 'swoosh-1', src: '/figma/459e7.svg', left: 293, top: 753, width: 149, height: 84, rotate: -29.41, length: 171.047, inset: 3 },
      { kind: 'line', key: 'swoosh-2', src: '/figma/18eee.svg', left: 239, top: 745, width: 202, height: 15, rotate: -4.25, length: 202.556, inset: 3 },
    ],
  },
  // The paper reaches the blue pair: that group's border turns blue and a splash bursts over its two carbons.
  {
    id: 'ethane-05',
    figmaNode: '4589:22817',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'gap', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, containerHeight: 139, highlightInChip: { left: -10, top: -9, width: 156, height: 133 } },
    panel: { layout: 'card', left: 142, top: 801.5, title: 'Make Ethane', body: 'Create the carbon of th same family of colour.' },
    elements: [
      { kind: 'image', key: 'paper', src: '/figma/a9c72.svg', left: 427, top: 620, width: 173, height: 54.5, inset: PAPER_INSET },
      { kind: 'panel' },
      { kind: 'rail' },
    ],
    rootElements: [
      GROUPS_ON_PAGE,
      // The chosen pair's splash is a brush stroke the export cannot express (no asset is emitted);
      // this is Figma's own render of that area of frame 4589:22817, placed at the same page position.
      { kind: 'image', key: 'burst', src: '/figma/renders/ethane-05-splash.png', left: 690, top: 438, width: 190, height: 230 },
      PATH_TO_PAIR,
      { kind: 'line', key: 'swoosh-1', src: '/figma/0bdce.svg', left: 293, top: 753, width: 149, height: 84, rotate: -29.41, length: 171.047, inset: 35 },
      { kind: 'line', key: 'swoosh-2', src: '/figma/ccd92.svg', left: 242, top: 745, width: 199, height: 50, rotate: -14.1, length: 205.185, inset: 24 },
    ],
  },
  // The two blue carbons, now large, joined by a C-C bond line; "Make the spiderweb .".
  {
    id: 'ethane-06',
    figmaNode: '4589:23083',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, containerHeight: 139, highlightInChip: { left: -9, top: -7, width: 153, height: 128 } },
    panel: { layout: 'card', left: 142, top: 801.5, title: 'Make the spiderweb .', body: 'Create the carbon of th same family of colour.' },
    elements: [
      { kind: 'panel' },
      { kind: 'rail' },
      { kind: 'carbon', key: 'carbon', left: 320, top: 490, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'carbon', key: 'carbon-2', left: 550, top: 490, color: 'blue', highlight: CARBON_HIGHLIGHT },
    ],
    rootElements: [
      { kind: 'line', key: 'bond', src: '/figma/1faa0.png', left: 539, top: 535, width: 138, height: 0, length: 138, inset: 4 },
    ],
  },
  // The bonded pair moves up (grouped with its bond); the mixed hydrogen selection row appears; paper reloaded.
  {
    id: 'ethane-07',
    figmaNode: '4589:23325',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, top: 136, containerHeight: 139, highlightInChip: { left: -11, top: -11, width: 154, height: 133 } },
    panel: SPIDERWEB_PANEL,
    elements: [{ kind: 'panel' }, { kind: 'rail' }, SELECTION],
    rootElements: [MOLECULE, PAPER_RELOADED],
  },
  // Same layout; two paper arrows point from the paper into the selection row.
  {
    id: 'ethane-08',
    figmaNode: '4589:23609',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, layout: 'between', explicitHeight: true, rules: standardRules() },
    rail: { ...ETH_RAIL, top: 136, containerHeight: 139, highlightInChip: { left: -14, top: -11, width: 158, height: 134 } },
    panel: SPIDERWEB_PANEL,
    elements: [{ kind: 'panel' }, { kind: 'rail' }, SELECTION],
    rootElements: [
      MOLECULE,
      PAPER_RELOADED,
      { kind: 'line', key: 'path', src: '/figma/e9cbf.svg', left: 404.04, top: 628, width: 240.86, height: 125.152, rotate: 152.54, length: 271.434, inset: '-2.89px -0.18% -2.89px 0' },
      { kind: 'line', key: 'path-2', src: '/figma/fbee8.svg', left: 404, top: 628, width: 384.896, height: 125.886, rotate: 161.89, length: 404.96, inset: '-2.89px -0.12% -2.89px 0' },
    ],
  },
];
