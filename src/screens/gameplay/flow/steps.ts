import type { FlowStep } from './types';

/**
 * The gameplay flow, in Figma order ("Game play for alkane": the methane row,
 * then the ethane row).
 *
 * Clicks go on the element the frame is asking about - the hydrogen row, the
 * loaded paper, the carbon groups. Frames Figma draws mid-motion (the paper
 * in flight, the splash) play by themselves, which is how the prototype reads
 * as an animation. These are simulated beats: nothing here checks chemistry.
 */

const FLIGHT_MS = 450;
const SPLASH_MS = 800;

export const GAMEPLAY_STEPS: FlowStep[] = [
  // Methane: meet the carbon and its four empty slots.
  { scene: 'methane-01', advance: { kind: 'click', target: 'panel' }, transition: 'cut' },
  // A mixed row of hydrogens appears; pick the right family.
  { scene: 'methane-02', advance: { kind: 'click', target: 'selection' }, transition: 'cut' },
  // The paper arrows point at the blue ones.
  { scene: 'methane-03', advance: { kind: 'click', target: 'selection' }, transition: 'cut' },
  // The four blue hydrogens are collected.
  { scene: 'methane-04', advance: { kind: 'click', target: 'collected' }, transition: 'cut' },
  // One is loaded on the paper, aimed at a slot. Throw it.
  { scene: 'methane-05', advance: { kind: 'click', target: 'h-flying' }, transition: 'cut' },
  { scene: 'methane-06', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'methane-07', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'methane-08', advance: { kind: 'auto', afterMs: SPLASH_MS }, transition: 'tween' },
  // Bonded. Reload from the remaining hydrogens.
  { scene: 'methane-09', advance: { kind: 'click', target: 'collected' }, transition: 'cut' },
  { scene: 'methane-10', advance: { kind: 'click', target: 'paper' }, transition: 'cut' },
  { scene: 'methane-11', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'methane-12', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'methane-13', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'methane-14', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'methane-15', advance: { kind: 'auto', afterMs: SPLASH_MS }, transition: 'tween' },
  // Methane complete.
  { scene: 'methane-16', advance: { kind: 'click', target: 'panel' }, transition: 'cut' },

  // Ethane: pick the pair of same-family carbons.
  { scene: 'ethane-01', advance: { kind: 'click', target: 'groups' }, transition: 'cut' },
  { scene: 'ethane-02', advance: { kind: 'click', target: 'paper' }, transition: 'cut' },
  { scene: 'ethane-03', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'ethane-04', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'ethane-05', advance: { kind: 'auto', afterMs: SPLASH_MS }, transition: 'tween' },
  // The two carbons join. Now the hydrogens.
  { scene: 'ethane-06', advance: { kind: 'click', target: 'panel' }, transition: 'cut' },
  { scene: 'ethane-07', advance: { kind: 'click', target: 'selection' }, transition: 'cut' },
  { scene: 'ethane-08', advance: { kind: 'click', target: 'selection' }, transition: 'cut' },
  { scene: 'ethane-09', advance: { kind: 'click', target: 'selection' }, transition: 'cut' },
  { scene: 'ethane-10', advance: { kind: 'click', target: 'paper' }, transition: 'cut' },
  // Both carbons show their free slots; the hydrogens wait in the tray.
  { scene: 'ethane-11', advance: { kind: 'click', target: 'collected' }, transition: 'cut' },
  { scene: 'ethane-12', advance: { kind: 'click', target: 'h-flying' }, transition: 'cut' },
  { scene: 'ethane-13', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  { scene: 'ethane-14', advance: { kind: 'auto', afterMs: FLIGHT_MS }, transition: 'tween' },
  // The first hydrogen is bonded - where the Figma flow ends.
  { scene: 'ethane-15', advance: { kind: 'click', target: 'none' }, transition: 'tween' },
];
