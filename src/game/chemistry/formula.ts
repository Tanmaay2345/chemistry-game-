import { SERIES, VALENCY, carbonCountFor, prefixFor, type BondOrder, type Family, type SeriesName } from './elements.ts';

/**
 * Reading a molecule name, and working out what it is made of.
 *
 * This is the rule the player is meant to learn: the prefix gives the number of
 * carbons, the suffix gives the bond, and the bonds decide how many hydrogens
 * are left to add. It is written once, generically - there is no table of
 * molecules and no special case for ethane.
 */

export type MoleculeSpec = {
  name: string;
  carbonCount: number;
  series: SeriesName;
  /** The bond that names the series (single for an alkane). */
  bondOrder: BondOrder;
  family: Family;
  hydrogenCount: number;
  /** The carbon-carbon bonds of the straight chain, in order. */
  chainBonds: BondOrder[];
};

/** "propane" -> prefix "prop" + suffix "ane". Returns null if it is neither. */
export function parseName(name: string): MoleculeSpec | null {
  const lower = name.trim().toLowerCase();
  const series = Object.values(SERIES).find((s) => lower.endsWith(s.suffix));
  if (!series) return null;
  const carbonCount = carbonCountFor(lower.slice(0, -series.suffix.length));
  if (carbonCount === null) return null;
  return specFor(carbonCount, series.name);
}

/** The other direction: 3 carbons in the alkane series is propane. */
export function specFor(carbonCount: number, seriesName: SeriesName): MoleculeSpec | null {
  const series = SERIES[seriesName];
  const prefix = prefixFor(carbonCount);
  if (!prefix || carbonCount < 1) return null;
  // A double or triple bond needs two carbons to sit between.
  if (series.bondOrder > 1 && carbonCount < 2) return null;

  const chainBonds = chainBondsFor(carbonCount, series.bondOrder);
  return {
    name: prefix + series.suffix,
    carbonCount,
    series: series.name,
    bondOrder: series.bondOrder,
    family: series.family,
    hydrogenCount: hydrogenCountFor(carbonCount, chainBonds),
    chainBonds,
  };
}

/**
 * The carbon-carbon bonds of a straight chain: all single, except that an
 * alkene or alkyne carries one bond of its own order (the simplest isomer,
 * which is the one the game teaches).
 */
export function chainBondsFor(carbonCount: number, seriesBond: BondOrder): BondOrder[] {
  const bonds: BondOrder[] = Array.from({ length: Math.max(0, carbonCount - 1) }, () => 1 as BondOrder);
  if (seriesBond > 1 && bonds.length > 0) bonds[0] = seriesBond;
  return bonds;
}

/**
 * How many hydrogens finish the chain: every carbon offers four bonds, each
 * carbon-carbon bond uses one on both carbons, and hydrogen fills what is left.
 *
 *   H = 4n - 2 * (sum of the carbon-carbon bond orders)
 *
 * which gives 2n+2 for alkanes, 2n for alkenes and 2n-2 for alkynes without
 * any of those numbers being written down anywhere.
 */
export function hydrogenCountFor(carbonCount: number, chainBonds: BondOrder[]): number {
  const used = chainBonds.reduce((sum, order) => sum + order, 0);
  return VALENCY.C * carbonCount - 2 * used;
}
