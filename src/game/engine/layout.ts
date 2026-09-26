import type { Vec } from '../chemistry/molecule.ts';

/**
 * Where things sit on the table, in gameplay coordinates.
 *
 * Gameplay coordinates ARE the coordinates of the ruled frame in the Figma
 * scenes - the same numbers the transcribed frames use, so every position here
 * is lifted from a frame rather than invented, and the responsive layer scales
 * physics and drawing together. There is one set of numbers: the engine aims
 * throws with them and the renderer draws with them.
 */

/** Half the frame: the carbon sits on the centre line, as every frame draws it. */
export const FRAME_WIDTH = 1185;
export const CENTRE_X = FRAME_WIDTH / 2;

/** Atom sizes from the Figma art: the 47px hydrogen disc, the 88.56 x 82 pill. */
export const HYDROGEN_RADIUS = 23.5;
export const CARBON_RADIUS = 41;
export const SMALL_CARBON = { width: 54, height: 50 };

/** Where the carbon chain is built (methane's carbon centre, frame E1). */
export const CHAIN_CENTRE: Vec = { x: CENTRE_X - 0.22, y: 467 };

/** The mixed hydrogen row, from the ethane selection tray. */
export const HYDROGEN_ROW = {
  centreX: CENTRE_X + 16,
  /** Tray top 561 + 20 padding + half a disc. */
  centreY: 604.5,
  gap: 24,
  itemWidth: 47,
};

/** The carbon groups on offer, from the ethane "make the spiderweb" frame. */
export const CARBON_GROUPS = {
  centreX: CENTRE_X - 68,
  /** Group box top 549 + 8 padding + half a small pill. */
  centreY: 582,
  groupGap: 41,
  itemGap: 9,
  padding: { x: 12, y: 8 },
};

/** The paper at rest, above the instruction card. */
export const PAPER_HOME: Vec = { x: 228.5, y: 774 };
export const PAPER_SIZE = { width: 173, height: 54.5 };

/** The tray holding what the web has collected (methane frame E4). */
export const COLLECTED_TRAY = { left: 352, top: 725, gap: 9, padding: 12 };

/**
 * The box the hydrogen row is drawn in, and the box a click on the row lands
 * in. One function so the two can never disagree: a click inside what the
 * player sees as the row has to be read as a pick from the row.
 */
export function hydrogenRowBox(count: number): { left: number; top: number; width: number; height: number } {
  const inner = count * HYDROGEN_ROW.itemWidth + (count - 1) * HYDROGEN_ROW.gap;
  return { left: HYDROGEN_ROW.centreX - inner / 2 - 25, top: HYDROGEN_ROW.centreY - 43.5, width: inner + 50, height: 87 };
}

/** Centre of the nth hydrogen in a row of `count`. */
export function hydrogenRowPosition(index: number, count: number): Vec {
  const pitch = HYDROGEN_ROW.itemWidth + HYDROGEN_ROW.gap;
  const width = count * HYDROGEN_ROW.itemWidth + (count - 1) * HYDROGEN_ROW.gap;
  const startX = HYDROGEN_ROW.centreX - width / 2 + HYDROGEN_ROW.itemWidth / 2;
  return { x: startX + index * pitch, y: HYDROGEN_ROW.centreY };
}

/** Width of a group box holding `size` small carbons. */
export function carbonGroupWidth(size: number): number {
  return size * SMALL_CARBON.width + (size - 1) * CARBON_GROUPS.itemGap + CARBON_GROUPS.padding.x * 2;
}

/** Centre of carbon `index` inside group `group` of the offered row. */
export function carbonGroupPosition(groups: number[], group: number, index: number): Vec {
  const widths = groups.map(carbonGroupWidth);
  const total = widths.reduce((sum, w) => sum + w, 0) + CARBON_GROUPS.groupGap * (groups.length - 1);
  let x = CARBON_GROUPS.centreX - total / 2;
  for (let i = 0; i < group; i++) x += widths[i] + CARBON_GROUPS.groupGap;
  x += CARBON_GROUPS.padding.x + index * (SMALL_CARBON.width + CARBON_GROUPS.itemGap) + SMALL_CARBON.width / 2;
  return { x, y: CARBON_GROUPS.centreY };
}

/** Where the nth collected atom waits, next to the paper. */
export function collectedPosition(index: number): Vec {
  const pitch = HYDROGEN_ROW.itemWidth + COLLECTED_TRAY.gap;
  return {
    x: COLLECTED_TRAY.left + COLLECTED_TRAY.padding + index * pitch + HYDROGEN_ROW.itemWidth / 2,
    y: COLLECTED_TRAY.top + COLLECTED_TRAY.padding + HYDROGEN_ROW.itemWidth / 2,
  };
}

/**
 * Where carbon `index` of a chain of `count` belongs. The chain is centred, so
 * methane's single carbon lands exactly where frame E1 draws it.
 */
export function chainPosition(index: number, count: number, spacing: number): Vec {
  const startX = CHAIN_CENTRE.x - ((count - 1) * spacing) / 2;
  return { x: startX + index * spacing, y: CHAIN_CENTRE.y };
}
