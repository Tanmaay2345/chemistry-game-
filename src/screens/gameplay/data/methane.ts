import type { Scene } from '../scene/types';
import { FRAME_1177, METHANE_BODY, METH_CHIP_HIGHLIGHT, METH_RAIL, SELECTION_ROW, standardRules } from './common';

/**
 * Methane - Figma frames E1 to E16 on the "Game play for alkane" row.
 *
 * The learner fills carbon's four bond slots one hydrogen at a time: pick the
 * blue hydrogens out of a mixed row, load one onto the paper, throw it at a
 * free slot, and watch it bond. Every value below is copied from the frame's
 * Figma export.
 */

const CARBON_HIGHLIGHT = 0.5;

export const METHANE_SCENES: Scene[] = [
  {
    id: 'methane-01',
    figmaNode: '4589:21512',
    figmaName: 'E1',
    frame: { left: 'calc(50% - 0.5px)', width: 1185, explicitHeight: true, rules: standardRules() },
    rail: { ...METH_RAIL, containerHeight: 153, innerHeight: 139 },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkane - Methane', body: METHANE_BODY },
    elements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% - 0.22px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 626, top: 467, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 598, top: 365, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/fcc3b.png', left: 483, top: 467, width: 73.948, height: 1, rotate: 179.23, length: 73.955, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 593, top: 495, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
      { kind: 'highlight', left: 51, top: 137, width: 158, height: 134 },
    ],
  },
  {
    id: 'methane-02',
    figmaNode: '4589:25789',
    figmaName: 'E2',
    frame: FRAME_1177,
    rail: { ...METH_RAIL, highlightInChip: METH_CHIP_HIGHLIGHT },
    panel: { layout: 'column', left: 'calc(50% - 0.5px)', top: 747, title: 'Select the hydrogen of same family and throw the paper', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 622, top: 467, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 593, top: 371, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/0c3f5.png', left: 460, top: 466, width: 91.948, height: 1, rotate: 179.38, length: 91.954, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 589, top: 493, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
      { kind: 'carbon', key: 'carbon', left: 'calc(50% - 0.22px)', top: 425, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      {
        kind: 'tray',
        key: 'selection',
        variant: 'dashed',
        left: '50%',
        top: 608,
        centerX: true,
        padding: { top: 20, right: 16, bottom: 20, left: 16 },
        gap: 24,
        innerShadow: 'inset 0px 4px 4px 0px rgba(231,227,227,0.25)',
        atoms: [...SELECTION_ROW],
      },
    ],
  },
  {
    id: 'methane-03',
    figmaNode: '4589:26074',
    figmaName: 'E3',
    frame: FRAME_1177,
    rail: { ...METH_RAIL, left: -2, top: 122 },
    panel: {
      layout: 'column',
      left: 'calc(50% + 15.5px)',
      top: 747,
      title: 'Select the hydrogen of same colour by using the paper arrow .',
      body: METHANE_BODY,
      extras: [{ kind: 'image', src: '/figma/c10f5.svg', left: 70, top: -67, width: 255, height: 67.434, inset: '-6.12% -0.39% -1.28% -0.39%' }],
    },
    elements: [
      {
        kind: 'tray',
        key: 'selection',
        variant: 'dashed',
        afterRule: 6,
        left: '50%',
        top: 610,
        centerX: true,
        padding: { top: 20, right: 25, bottom: 20, left: 25 },
        gap: 24,
        innerShadow: 'inset 0px 4px 4px 0px rgba(228,221,221,0.25)',
        atoms: [...SELECTION_ROW],
      },
      { kind: 'carbon', key: 'carbon', afterRule: 12, left: 'calc(50% - 0.22px)', top: 429, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 623, top: 470, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/39b94.png', left: 'calc(50% - 1.01px)', top: 369, centerX: true, width: 1.015, height: 60, rotate: -90.97, length: 60.008, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/11810.png', left: 468, top: 466, width: 79, height: 1, rotate: 179.27, length: 79.006, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/b297e.png', left: 587, top: 511, width: 0.186, height: 57, rotate: 90.19, length: 57, inset: 4 },
      { kind: 'highlight', left: 46, top: 142, width: 162, height: 138 },
    ],
  },
  {
    id: 'methane-04',
    figmaNode: '4589:26364',
    figmaName: 'E4',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: METH_CHIP_HIGHLIGHT },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'carbon', key: 'carbon', afterRule: 12, left: 'calc(50% - 0.22px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'rail' },
      { kind: 'panel' },
      {
        kind: 'tray',
        key: 'collected',
        variant: 'solid',
        left: 352,
        top: 725,
        padding: { top: 12, right: 12, bottom: 16, left: 12 },
        gap: 9,
        atoms: ['blue', 'blue', 'blue', 'blue'],
      },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 633, top: 471, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/ea215.png', left: 'calc(50% - 0.5px)', top: 357, centerX: true, width: 0, height: 69, rotate: -90, length: 69, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/71ff6.png', left: 460, top: 467, width: 89, height: 0, rotate: 180, length: 89, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 588, top: 508, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
    ],
  },
];
