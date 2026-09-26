/**
 * The chemistry vocabulary the game is built on.
 *
 * Nothing here knows about pixels, React or the Figma frames. The game engine
 * asks these functions what a molecule needs; the renderer never does.
 */

export type ElementSymbol = 'C' | 'H';

/** Colour families. In this game the colour IS the bond type, not decoration. */
export type Family = 'blue' | 'red' | 'green';

export type BondOrder = 1 | 2 | 3;

/** How many bonds an atom of each element can form. */
export const VALENCY: Record<ElementSymbol, number> = {
  C: 4,
  H: 1,
};

/**
 * The three homologous series. Only the alkanes are playable today; the other
 * two are declared so the engine, the parser and the hydrogen rule already
 * handle them - adding their gameplay later needs no change here.
 */
export type SeriesName = 'alkane' | 'alkene' | 'alkyne';

export type Series = {
  name: SeriesName;
  /** Name ending: meth + ane. */
  suffix: string;
  /** The bond that gives the series its name. */
  bondOrder: BondOrder;
  family: Family;
  /** False while the series has no gameplay of its own yet. */
  playable: boolean;
};

export const SERIES: Record<SeriesName, Series> = {
  alkane: { name: 'alkane', suffix: 'ane', bondOrder: 1, family: 'blue', playable: true },
  alkene: { name: 'alkene', suffix: 'ene', bondOrder: 2, family: 'red', playable: false },
  alkyne: { name: 'alkyne', suffix: 'yne', bondOrder: 3, family: 'green', playable: false },
};

/** Carbon-count prefixes, in order, as the prefix rail teaches them. */
export const PREFIXES = [
  'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
] as const;

export type Prefix = (typeof PREFIXES)[number];

/** "prop" -> 3. */
export function carbonCountFor(prefix: string): number | null {
  const index = PREFIXES.indexOf(prefix.toLowerCase() as Prefix);
  return index < 0 ? null : index + 1;
}

/** 3 -> "prop". */
export function prefixFor(carbonCount: number): Prefix | null {
  return PREFIXES[carbonCount - 1] ?? null;
}

/** The series a colour family stands for, or null for an unused colour. */
export function seriesForFamily(family: Family): Series | null {
  return Object.values(SERIES).find((s) => s.family === family) ?? null;
}
