import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SERIES, carbonCountFor, seriesForFamily } from './elements.ts';
import { chainBondsFor, hydrogenCountFor, parseName, specFor } from './formula.ts';
import { addBond, canBond, checkMolecule, connectedGroup, createAtom, emptyMolecule } from './molecule.ts';

/** The rule the game teaches: the name says how many carbons and which bond. */

test('prefixes give the carbon count', () => {
  assert.equal(carbonCountFor('meth'), 1);
  assert.equal(carbonCountFor('eth'), 2);
  assert.equal(carbonCountFor('prop'), 3);
  assert.equal(carbonCountFor('dec'), 10);
  assert.equal(carbonCountFor('zzz'), null);
});

test('alkane names parse into carbons, bond and family', () => {
  const propane = parseName('propane');
  assert.ok(propane);
  assert.equal(propane.carbonCount, 3);
  assert.equal(propane.series, 'alkane');
  assert.equal(propane.bondOrder, 1);
  assert.equal(propane.family, 'blue');
});

test('the alkanes need 2n+2 hydrogens, worked out from valency', () => {
  assert.equal(parseName('methane')?.hydrogenCount, 4);
  assert.equal(parseName('ethane')?.hydrogenCount, 6);
  assert.equal(parseName('propane')?.hydrogenCount, 8);
  assert.equal(parseName('butane')?.hydrogenCount, 10);
  assert.equal(parseName('decane')?.hydrogenCount, 22);
});

test('the same rule already gives the alkene and alkyne counts', () => {
  // Not playable yet - this is the check that the engine will not need a
  // rewrite when they are added.
  assert.equal(parseName('ethene')?.hydrogenCount, 4);
  assert.equal(parseName('propene')?.hydrogenCount, 6);
  assert.equal(parseName('ethyne')?.hydrogenCount, 2);
  assert.equal(parseName('propyne')?.hydrogenCount, 4);
});

test('colour families map to bond types', () => {
  assert.equal(seriesForFamily('blue')?.bondOrder, 1);
  assert.equal(seriesForFamily('red')?.bondOrder, 2);
  assert.equal(seriesForFamily('green')?.bondOrder, 3);
  assert.equal(SERIES.alkene.playable, false);
});

test('a chain of n carbons has n-1 bonds, one of them the series bond', () => {
  assert.deepEqual(chainBondsFor(3, 1), [1, 1]);
  assert.deepEqual(chainBondsFor(3, 2), [2, 1]);
  assert.deepEqual(chainBondsFor(1, 1), []);
  assert.equal(hydrogenCountFor(1, []), 4);
});

test('a molecule with no carbon prefix or bad name is rejected', () => {
  assert.equal(parseName('water'), null);
  assert.equal(parseName('methene'), null); // a double bond needs two carbons
  assert.equal(specFor(0, 'alkane'), null);
});

const H_RADIUS = 23.5;
const C_RADIUS = 41;

function methaneUnderConstruction() {
  const molecule = emptyMolecule();
  molecule.atoms.push(createAtom('c1', 'C', 'blue', { x: 720, y: 467 }, C_RADIUS));
  return molecule;
}

test('carbon takes four bonds and no more', () => {
  const molecule = methaneUnderConstruction();
  for (let i = 0; i < 4; i++) {
    molecule.atoms.push(createAtom(`h${i}`, 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
    assert.ok(addBond(molecule, 'c1', `h${i}`, 1), `bond ${i} should form`);
  }
  molecule.atoms.push(createAtom('h4', 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
  assert.equal(canBond(molecule, 'c1', 'h4', 1), false);
  assert.equal(addBond(molecule, 'c1', 'h4', 1), null);
  assert.equal(findRemaining(molecule, 'c1'), 0);
});

function findRemaining(molecule: ReturnType<typeof emptyMolecule>, id: string) {
  return molecule.atoms.find((a) => a.id === id)!.remainingValency;
}

test('methane is complete at four hydrogens, not before', () => {
  const spec = parseName('methane')!;
  const molecule = methaneUnderConstruction();
  for (let i = 0; i < 3; i++) {
    molecule.atoms.push(createAtom(`h${i}`, 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
    addBond(molecule, 'c1', `h${i}`, 1);
  }
  let check = checkMolecule(molecule, spec);
  assert.equal(check.complete, false);
  assert.equal(check.missingHydrogens, 1);

  molecule.atoms.push(createAtom('h3', 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
  addBond(molecule, 'c1', 'h3', 1);
  check = checkMolecule(molecule, spec);
  assert.equal(check.complete, true);
  assert.equal(check.hydrogenCount, 4);
});

test('ethane needs the carbon-carbon bond as well as six hydrogens', () => {
  const spec = parseName('ethane')!;
  const molecule = emptyMolecule();
  molecule.atoms.push(createAtom('c1', 'C', 'blue', { x: 660, y: 467 }, C_RADIUS));
  molecule.atoms.push(createAtom('c2', 'C', 'blue', { x: 860, y: 467 }, C_RADIUS));
  for (let i = 0; i < 6; i++) {
    molecule.atoms.push(createAtom(`h${i}`, 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
  }
  for (let i = 0; i < 3; i++) addBond(molecule, 'c1', `h${i}`, 1);
  for (let i = 3; i < 6; i++) addBond(molecule, 'c2', `h${i}`, 1);

  let check = checkMolecule(molecule, spec);
  assert.equal(check.missingCarbonBonds, 1, 'the two carbons are not joined yet');
  assert.equal(check.complete, false);

  assert.ok(addBond(molecule, 'c1', 'c2', 1));
  check = checkMolecule(molecule, spec);
  assert.equal(check.complete, true);
});

test('propane: three carbons, two carbon bonds, eight hydrogens', () => {
  const spec = parseName('propane')!;
  assert.equal(spec.carbonCount, 3);
  assert.equal(spec.hydrogenCount, 8);
  const molecule = emptyMolecule();
  for (let i = 0; i < 3; i++) {
    molecule.atoms.push(createAtom(`c${i}`, 'C', 'blue', { x: 600 + i * 200, y: 467 }, C_RADIUS));
  }
  addBond(molecule, 'c0', 'c1', 1);
  addBond(molecule, 'c1', 'c2', 1);
  // The middle carbon has two bonds left, the ends three each: eight in all.
  const free = molecule.atoms.reduce((sum, a) => sum + a.remainingValency, 0);
  assert.equal(free, spec.hydrogenCount);

  for (let i = 0; i < 8; i++) {
    molecule.atoms.push(createAtom(`h${i}`, 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
  }
  const order = ['c0', 'c0', 'c0', 'c1', 'c1', 'c2', 'c2', 'c2'];
  order.forEach((carbon, i) => assert.ok(addBond(molecule, carbon, `h${i}`, 1), `h${i} should bond`));
  assert.equal(checkMolecule(molecule, spec).complete, true);
});

test('a wrong-family atom keeps the molecule incomplete and is named', () => {
  const spec = parseName('methane')!;
  const molecule = methaneUnderConstruction();
  for (let i = 0; i < 4; i++) {
    molecule.atoms.push(createAtom(`h${i}`, 'H', i === 2 ? 'red' : 'blue', { x: 0, y: 0 }, H_RADIUS));
    addBond(molecule, 'c1', `h${i}`, 1);
  }
  const check = checkMolecule(molecule, spec);
  assert.equal(check.complete, false);
  assert.deepEqual(check.wrongFamilyAtoms, ['h2']);
});

test('hydrogen bonds once, and never to another hydrogen', () => {
  const molecule = emptyMolecule();
  molecule.atoms.push(createAtom('c1', 'C', 'blue', { x: 0, y: 0 }, C_RADIUS));
  molecule.atoms.push(createAtom('h1', 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
  molecule.atoms.push(createAtom('h2', 'H', 'blue', { x: 0, y: 0 }, H_RADIUS));
  assert.equal(canBond(molecule, 'h1', 'h2', 1), false);
  addBond(molecule, 'c1', 'h1', 1);
  assert.equal(canBond(molecule, 'c1', 'h1', 1), false, 'no second bond between the same pair');
});

test('the connected group is what a collision pushes', () => {
  const molecule = emptyMolecule();
  molecule.atoms.push(createAtom('c1', 'C', 'blue', { x: 0, y: 0 }, C_RADIUS));
  molecule.atoms.push(createAtom('c2', 'C', 'blue', { x: 200, y: 0 }, C_RADIUS));
  molecule.atoms.push(createAtom('h1', 'H', 'blue', { x: 0, y: 60 }, H_RADIUS));
  molecule.atoms.push(createAtom('loose', 'H', 'blue', { x: 900, y: 0 }, H_RADIUS));
  addBond(molecule, 'c1', 'c2', 1);
  addBond(molecule, 'c1', 'h1', 1);
  assert.deepEqual(connectedGroup(molecule, 'c2').map((a) => a.id).sort(), ['c1', 'c2', 'h1']);
  assert.deepEqual(connectedGroup(molecule, 'loose').map((a) => a.id), ['loose']);
});
