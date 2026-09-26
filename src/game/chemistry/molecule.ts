import { VALENCY, type BondOrder, type ElementSymbol, type Family } from './elements.ts';
import type { MoleculeSpec } from './formula.ts';

/**
 * The molecule as data.
 *
 * Positions live here too, because the game is played in space - but they are
 * plain numbers in gameplay coordinates, not DOM measurements. The renderer
 * reads this model; it never writes back into it.
 */

export type Vec = { x: number; y: number };

export type AtomState =
  /** Waiting in a pool or tray, not part of the molecule yet. */
  | 'free'
  /** Collected by the web and held ready to throw. */
  | 'held'
  /** In the air after a throw. */
  | 'flying'
  /** At rest in the play area but not bonded to anything yet. */
  | 'placed'
  /** Bonded into the molecule. */
  | 'bonded';

export type Atom = {
  id: string;
  element: ElementSymbol;
  family: Family;
  position: Vec;
  velocity: Vec;
  /** Collision radius in gameplay pixels. */
  radius: number;
  valency: number;
  remainingValency: number;
  state: AtomState;
};

export type Bond = {
  id: string;
  a: string;
  b: string;
  order: BondOrder;
};

export type Molecule = {
  atoms: Atom[];
  bonds: Bond[];
};

export function emptyMolecule(): Molecule {
  return { atoms: [], bonds: [] };
}

export function createAtom(id: string, element: ElementSymbol, family: Family, position: Vec, radius: number): Atom {
  return {
    id,
    element,
    family,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    radius,
    valency: VALENCY[element],
    remainingValency: VALENCY[element],
    state: 'free',
  };
}

export function findAtom(molecule: Molecule, id: string): Atom | undefined {
  return molecule.atoms.find((a) => a.id === id);
}

/** Whether these two atoms could still take a bond of this order between them. */
export function canBond(molecule: Molecule, aId: string, bId: string, order: BondOrder): boolean {
  if (aId === bId) return false;
  const a = findAtom(molecule, aId);
  const b = findAtom(molecule, bId);
  if (!a || !b) return false;
  if (a.remainingValency < order || b.remainingValency < order) return false;
  // Hydrogen takes one bond and only to carbon: H-H is not chemistry the game teaches.
  if (a.element === 'H' && b.element === 'H') return false;
  return !bondBetween(molecule, aId, bId);
}

export function bondBetween(molecule: Molecule, aId: string, bId: string): Bond | undefined {
  return molecule.bonds.find((x) => (x.a === aId && x.b === bId) || (x.a === bId && x.b === aId));
}

/**
 * Adds a bond and spends the valency on both atoms. Returns the bond, or null
 * when the atoms cannot take it - the caller decides what that means for the
 * player (a miss, a bounce, a recorded mistake).
 */
export function addBond(molecule: Molecule, aId: string, bId: string, order: BondOrder): Bond | null {
  if (!canBond(molecule, aId, bId, order)) return null;
  const a = findAtom(molecule, aId)!;
  const b = findAtom(molecule, bId)!;
  a.remainingValency -= order;
  b.remainingValency -= order;
  a.state = 'bonded';
  b.state = 'bonded';
  const bond: Bond = { id: `${aId}~${bId}`, a: aId, b: bId, order };
  molecule.bonds.push(bond);
  return bond;
}

/** Atoms bonded directly to this one. */
export function neighbours(molecule: Molecule, id: string): Atom[] {
  return molecule.bonds
    .filter((b) => b.a === id || b.b === id)
    .map((b) => findAtom(molecule, b.a === id ? b.b : b.a))
    .filter((a): a is Atom => Boolean(a));
}

/**
 * Every atom connected to this one, directly or through other bonds. A throw
 * pushes the whole connected group, which is what lets one collision travel
 * along a chain.
 */
export function connectedGroup(molecule: Molecule, id: string): Atom[] {
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of neighbours(molecule, current)) {
      if (!seen.has(next.id)) {
        seen.add(next.id);
        queue.push(next.id);
      }
    }
  }
  return molecule.atoms.filter((a) => seen.has(a.id));
}

export function atomsOf(molecule: Molecule, element: ElementSymbol): Atom[] {
  return molecule.atoms.filter((a) => a.element === element);
}

export function bondedAtomsOf(molecule: Molecule, element: ElementSymbol): Atom[] {
  return atomsOf(molecule, element).filter((a) => a.state === 'bonded');
}

/** Atoms that are out on the table: bonded, or resting there unbonded. */
export function placedAtomsOf(molecule: Molecule, element: ElementSymbol): Atom[] {
  return atomsOf(molecule, element).filter((a) => a.state === 'bonded' || a.state === 'placed');
}

export type MoleculeCheck = {
  complete: boolean;
  carbonCount: number;
  hydrogenCount: number;
  /** Hydrogens still needed to satisfy the target. */
  missingHydrogens: number;
  /** Carbon-carbon bonds still needed. */
  missingCarbonBonds: number;
  /** Bonded atoms whose family is not the one the target asks for. */
  wrongFamilyAtoms: string[];
  /**
   * Carbon-carbon bonds whose order is not the one the name asks for: a
   * single bond where the name says double is a different compound, not a
   * finished one.
   */
  wrongOrderBonds: string[];
  /** Atoms still holding an unfilled valency. */
  openValencies: number;
};

/**
 * Compares what has been built against what was asked for. This is the only
 * place that decides whether a molecule is finished.
 */
export function checkMolecule(molecule: Molecule, spec: MoleculeSpec): MoleculeCheck {
  const hydrogens = bondedAtomsOf(molecule, 'H');
  const carbonBonds = molecule.bonds.filter((b) => {
    const a = findAtom(molecule, b.a);
    const other = findAtom(molecule, b.b);
    return a?.element === 'C' && other?.element === 'C';
  });
  const wrongFamilyAtoms = [...placedAtomsOf(molecule, 'C'), ...hydrogens].filter((a) => a.family !== spec.family).map((a) => a.id);

  // Methane's one carbon never gets a carbon-carbon bond, so what counts is
  // the carbons on the table, and separately whether the chain bonds are made.
  const carbonsPlaced = placedAtomsOf(molecule, 'C').length;
  const missingHydrogens = Math.max(0, spec.hydrogenCount - hydrogens.length);
  const missingCarbonBonds = Math.max(0, spec.chainBonds.length - carbonBonds.length);

  // The chain the name asks for, as a multiset of bond orders. Counting
  // bonds alone let a single-bonded C-C pass for an ethene: the same atoms,
  // a different compound.
  const wanted = [...spec.chainBonds].sort();
  const built = carbonBonds.map((b) => b.order).sort();
  const wrongOrderBonds = wanted.every((order, i) => built[i] === order) ? [] : carbonBonds.map((b) => b.id);

  // Nothing is finished while an atom still has a bond to give. Without this
  // a chain with three loose valencies counted as a closed-shell molecule.
  const openValencies = [...placedAtomsOf(molecule, 'C'), ...hydrogens].reduce((sum, a) => sum + Math.max(0, a.remainingValency), 0);

  return {
    complete:
      carbonsPlaced >= spec.carbonCount &&
      missingCarbonBonds === 0 &&
      missingHydrogens === 0 &&
      wrongFamilyAtoms.length === 0 &&
      wrongOrderBonds.length === 0 &&
      openValencies === 0,
    carbonCount: carbonsPlaced,
    hydrogenCount: hydrogens.length,
    missingHydrogens,
    missingCarbonBonds,
    wrongFamilyAtoms,
    wrongOrderBonds,
    openValencies,
  };
}
