import type { Scene } from '../scene/types';
import { METHANE_BODY, METH_RAIL, standardRules } from './common';

/**
 * Methane, continued - Figma frames E5 to E10 on the "Game play for alkane" row.
 *
 * Follows E4 (data/methane.ts): a blue hydrogen is loaded on the paper,
 * thrown along a trajectory to the carbon, and bonds with a splash. Every
 * value below is copied from the frame's Figma export.
 */

const CARBON_HIGHLIGHT = 0.5;

export const METHANE_SCENES_B: Scene[] = [
  // Paper loaded with a blue H (a second copy stacked under it stays on the paper in E6), two blue H waiting, dotted trajectory to the east slot.
  {
    id: 'methane-05',
    figmaNode: '4589:26622',
    figmaName: 'E5',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: { left: -13, top: -8, width: 161, height: 136 } },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-paper', left: 276, top: 715, color: 'blue' },
      { kind: 'hydrogen', key: 'h-flying', left: 277, top: 710, color: 'blue' },
      { kind: 'hydrogen', key: 'h-rest-1', left: 474, top: 746, color: 'blue' },
      { kind: 'hydrogen', key: 'h-rest-2', left: 530, top: 746, color: 'blue' },
      { kind: 'line', key: 'slot-e', src: '/figma/de2ae.png', left: 599, top: 472, width: 96, height: 1, rotate: -0.6, length: 96.005, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 590, top: 371, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/fcc3b.png', left: 478, top: 465, width: 73.948, height: 1, rotate: 179.23, length: 73.955, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/7e8e8.png', left: 584.01, top: 485, width: 0.18, height: 65, rotate: 90.16, length: 65, inset: 4 },
    ],
    rootElements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% + 0.28px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'line', key: 'path-arrow', src: '/figma/e8682.svg', left: 453.74, top: 561, width: 244.261, height: 160.985, rotate: 146.61, length: 292.54, inset: '-3.68px -0.17%' },
      { kind: 'line', key: 'path', src: '/figma/86353.svg', left: 454, top: 478, width: 372, height: 246, rotate: 146.52, length: 445.982, inset: '-3.68px -0.11%' },
    ],
  },
  // The loaded H mid-flight along the trajectory towards the east slot; a copy stays on the paper.
  {
    id: 'methane-06',
    figmaNode: '4589:26881',
    figmaName: 'E6',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: { left: -9, top: -6, width: 157, height: 132 } },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-paper', left: 276, top: 715, color: 'blue' },
      { kind: 'hydrogen', key: 'h-flying', left: 552, top: 537, color: 'blue' },
      { kind: 'hydrogen', key: 'h-rest-1', left: 474, top: 746, color: 'blue' },
      { kind: 'hydrogen', key: 'h-rest-2', left: 530, top: 746, color: 'blue' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 606, top: 467, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 593, top: 373, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/fcc3b.png', left: 485, top: 463, width: 73.948, height: 1, rotate: 179.23, length: 73.955, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 588, top: 484, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
    ],
    rootElements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% + 0.28px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'line', key: 'path', src: '/figma/86353.svg', left: 454, top: 478, width: 372, height: 246, rotate: 146.52, length: 445.982, inset: '-3.68px -0.11%' },
    ],
  },
  // The thrown H nearing the carbon with a trailing copy; a dotted trajectory to the east slot and throw lines at the paper.
  {
    id: 'methane-07',
    figmaNode: '4589:27139',
    figmaName: 'E7',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: { left: -8, top: -10, width: 155, height: 138 } },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-paper', left: 526, top: 548, color: 'blue' },
      { kind: 'hydrogen', key: 'h-flying', left: 552, top: 531, color: 'blue' },
      { kind: 'hydrogen', key: 'h-rest-1', left: 474, top: 746, color: 'blue' },
      { kind: 'hydrogen', key: 'h-rest-2', left: 530, top: 746, color: 'blue' },
      { kind: 'line', key: 'slot-e', src: '/figma/c1b98.png', left: 599, top: 472, width: 97, height: 1, rotate: -0.59, length: 97.005, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 593, top: 372, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/fcc3b.png', left: 474, top: 465, width: 73.948, height: 1, rotate: 179.23, length: 73.955, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 588, top: 480, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
    ],
    rootElements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% + 0.28px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'line', key: 'path', src: '/figma/b378b.svg', left: 440, top: 478, width: 386, height: 269, rotate: 145.13, length: 470.486, inset: '-7.36px -0.21%' },
      { kind: 'line', key: 'throw-1', src: '/figma/93daa.svg', left: 269, top: 748, width: 149, height: 12, rotate: -4.6, length: 149.482, inset: 1 },
      { kind: 'line', key: 'throw-2', src: '/figma/a622a.svg', left: 270, top: 748, width: 143, height: 8, rotate: -3.2, length: 143.224, inset: 1 },
      { kind: 'line', key: 'throw-3', src: '/figma/21329.svg', left: 341, top: 760, width: 84, height: 47, rotate: -29.23, length: 96.255, inset: 1 },
    ],
  },
  // The thrown H reaches the carbon's south-west with a splash; the two waiting H now sit in a tray under the carbon.
  {
    id: 'methane-08',
    figmaNode: '4589:27400',
    figmaName: 'E8',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: { left: -11, top: -8, width: 159, height: 135 } },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-paper', left: 513, top: 560, color: 'blue' },
      // Figma draws this H with ellipse c7ef2.svg: the blue H circle plus a splash, bleeding
      // inset-[-129.49%_-245.69%_-121.34%_-111.81%] around the 47px box. Transcribed as the splash
      // image with a plain blue H over it (the circle in c7ef2 sits exactly under the H).
      { kind: 'image', key: 'burst', src: '/figma/c7ef2.svg', left: 539, top: 543, width: 47, height: 47, inset: '-129.49% -245.69% -121.34% -111.81%' },
      { kind: 'hydrogen', key: 'h-flying', left: 539, top: 543, color: 'blue' },
      { kind: 'line', key: 'slot-e', src: '/figma/1e05e.png', left: 599, top: 473, width: 96, height: 0, length: 96, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 'calc(50% + 0.04px)', top: 375, centerX: true, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/fcc3b.png', left: 480, top: 465, width: 73.948, height: 1, rotate: 179.23, length: 73.955, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 565, top: 486, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
      // Figma draws this tray with a #e8dede border and no fill.
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        borderColor: '#e8dede',
        filled: false,
        left: '50%',
        top: 723,
        centerX: true,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 9,
        innerShadow: 'inset 0px 4px 4px 0px rgba(233,222,222,0.25)',
        atoms: ['blue', 'blue'],
      },
    ],
    rootElements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% + 0.28px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'line', key: 'path', src: '/figma/ba782.svg', left: 440, top: 478, width: 386, height: 269, rotate: 145.13, length: 470.486, inset: '-3.68px -0.11%' },
      { kind: 'line', key: 'throw-1', src: '/figma/93daa.svg', left: 269, top: 748, width: 149, height: 12, rotate: -4.6, length: 149.482, inset: 1 },
      { kind: 'line', key: 'throw-2', src: '/figma/a622a.svg', left: 270, top: 748, width: 143, height: 8, rotate: -3.2, length: 143.224, inset: 1 },
      { kind: 'line', key: 'throw-3', src: '/figma/21329.svg', left: 341, top: 760, width: 84, height: 47, rotate: -29.23, length: 96.255, inset: 1 },
    ],
  },
  // Two blue H bonded to the carbon (east and south slots); two blue H left in the tray, paper empty.
  {
    id: 'methane-09',
    figmaNode: '4589:27662',
    figmaName: 'E9',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: { left: -7, top: -5, width: 155, height: 131 } },
    panel: { layout: 'column', left: 'calc(50% + 15.5px)', top: 747, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 562, top: 541, color: 'blue' },
      // Figma's ellipse here is c7177.svg: the blue H fill without a1098's grey #BEBABA stroke.
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 599, top: 472, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/b8508.png', left: 589, top: 374, width: 0, height: 58, rotate: -90, length: 58, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/4f545.png', left: 460, top: 467, width: 87, height: 0, rotate: 180, length: 87, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 584, top: 485, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
      // Figma draws this tray with a #e8dede border and no fill.
      {
        kind: 'tray',
        key: 'collected',
        variant: 'plain',
        borderColor: '#e8dede',
        filled: false,
        left: '50%',
        top: 721,
        centerX: true,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 9,
        innerShadow: 'inset 0px 4px 4px 0px rgba(233,222,222,0.25)',
        atoms: ['blue', 'blue'],
      },
    ],
    rootElements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% + 0.28px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'line', key: 'throw-1', src: '/figma/93daa.svg', left: 269, top: 748, width: 149, height: 12, rotate: -4.6, length: 149.482, inset: 1 },
      { kind: 'line', key: 'throw-2', src: '/figma/a622a.svg', left: 270, top: 748, width: 143, height: 8, rotate: -3.2, length: 143.224, inset: 1 },
      { kind: 'line', key: 'throw-3', src: '/figma/21329.svg', left: 341, top: 760, width: 84, height: 47, rotate: -29.23, length: 96.255, inset: 1 },
    ],
  },
  // Paper tilted up, re-loaded with the last two blue H; east and south slots bonded; card stands alone.
  {
    id: 'methane-10',
    figmaNode: '4589:27923',
    figmaName: 'E10',
    frame: { left: 'calc(50% + 1.5px)', width: 1177, explicitHeight: false, rules: standardRules('a7e85', 'f61aa', '4bb46') },
    rail: { ...METH_RAIL, highlightInChip: { left: -13, top: -8, width: 166, height: 135 } },
    panel: { layout: 'card', left: 138, top: 801.5, title: 'Alkanes ', body: METHANE_BODY },
    elements: [
      { kind: 'rail' },
      {
        kind: 'group',
        key: 'paper',
        left: 134.01,
        top: 727.34,
        width: 180.978,
        height: 93.828,
        children: [
          // Figma centres the 173 x 54.5 box in this flex box and rotates it -13.67deg.
          { kind: 'image', src: '/figma/debb6.svg', left: 3.989, top: 19.664, width: 173, height: 54.5, rotate: -13.67, inset: '-1.83% -0.25% -1.87% -1.14%' },
        ],
      },
      { kind: 'panel' },
      { kind: 'hydrogen', key: 'h-bonded-s', left: 558, top: 549, color: 'blue' },
      // Figma's ellipse here is c7177.svg: the blue H fill without a1098's grey #BEBABA stroke.
      { kind: 'hydrogen', key: 'h-bonded-e', left: 677, top: 443, color: 'blue' },
      { kind: 'hydrogen', key: 'h-paper', left: 287, top: 691, color: 'blue' },
      { kind: 'hydrogen', key: 'h-flying', left: 298, top: 680, color: 'blue' },
      { kind: 'line', key: 'slot-e', src: '/figma/736e5.png', left: 599, top: 472, width: 89, height: 1, rotate: -0.64, length: 89.006, inset: 4 },
      { kind: 'line', key: 'slot-n', src: '/figma/8e85f.png', left: 592, top: 372, width: 1.089, height: 60.994, rotate: -88.98, length: 61.003, inset: 4 },
      { kind: 'line', key: 'slot-w', src: '/figma/a1088.png', left: 460, top: 467, width: 94, height: 0, rotate: 180, length: 94, inset: 4 },
      { kind: 'line', key: 'slot-s', src: '/figma/9b73d.png', left: 582, top: 485, width: 0.186, height: 73.955, rotate: 90.14, length: 73.955, inset: 4 },
    ],
    rootElements: [
      { kind: 'carbon', key: 'carbon', left: 'calc(50% + 0.28px)', top: 426, centerX: true, color: 'blue', highlight: CARBON_HIGHLIGHT },
      { kind: 'line', key: 'throw-1', src: '/figma/4e89b.svg', left: 264, top: 734.97, width: 151.777, height: 40.03, rotate: -14.77, length: 156.967, inset: 1 },
      { kind: 'line', key: 'throw-2', src: '/figma/b5dac.svg', left: 264, top: 730, width: 159, height: 39, rotate: -13.78, length: 163.713, inset: 1 },
      { kind: 'line', key: 'throw-3', src: '/figma/702fb.svg', left: 357, top: 737, width: 76, height: 70, rotate: -42.65, length: 103.325, inset: 1 },
      { kind: 'line', key: 'throw-4', src: '/figma/702fb.svg', left: 364, top: 737, width: 76, height: 70, rotate: -42.65, length: 103.325, inset: 1 },
    ],
  },
];
