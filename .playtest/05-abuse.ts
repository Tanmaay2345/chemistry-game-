// Q2 / Q3: can the student build something impossible and be told it is right,
// or build the right thing and be told it is wrong?
import { addBond, canBond, checkMolecule, createAtom, emptyMolecule } from '../src/game/chemistry/molecule.ts';
import { specFor } from '../src/game/chemistry/formula.ts';

const at = (x: number) => ({ x, y: 0 });
const line = (s: string) => console.log(s);

line('--- A: five bonds on one carbon ---');
{
  const m = emptyMolecule();
  m.atoms.push(createAtom('c1', 'C', 'blue', at(0), 10));
  for (let i = 1; i <= 5; i++) m.atoms.push(createAtom(`h${i}`, 'H', 'blue', at(i * 20), 5));
  for (let i = 1; i <= 5; i++) {
    const b = addBond(m, 'c1', `h${i}`, 1);
    line(`  addBond c1-h${i} => ${b ? 'BONDED' : 'refused'}`);
  }
  line(`  bonds=${m.bonds.length} remainingValency=${m.atoms[0].remainingValency}  -> valency enforced: ${m.bonds.length === 4}`);
}

line('\n--- B: hydrogen to hydrogen ---');
{
  const m = emptyMolecule();
  m.atoms.push(createAtom('h1', 'H', 'blue', at(0), 5), createAtom('h2', 'H', 'blue', at(20), 5));
  line(`  canBond(h1,h2,1) = ${canBond(m, 'h1', 'h2', 1)}  addBond => ${addBond(m, 'h1', 'h2', 1) ? 'BONDED' : 'refused'}`);
}

line('\n--- C: extra hydrogens beyond the spec (checkMolecule uses max(0, ...)) ---');
{
  const spec = specFor(2, 'alkene')!; // ethene C2H4, chainBonds [2]
  const m = emptyMolecule();
  m.atoms.push(createAtom('c1', 'C', 'red', at(0), 10), createAtom('c2', 'C', 'red', at(100), 10));
  // The player makes a SINGLE C-C bond where ethene needs a DOUBLE one.
  addBond(m, 'c1', 'c2', 1);
  for (let i = 1; i <= 6; i++) {
    m.atoms.push(createAtom(`h${i}`, 'H', 'red', at(i * 20), 5));
    addBond(m, i <= 3 ? 'c1' : 'c2', `h${i}`, 1);
  }
  const check = checkMolecule(m, spec);
  line(`  target ${spec.name} C2H4 with one C=C`);
  line(`  built: C2H6 with a C-C SINGLE bond (that is ethane, not ethene)`);
  line(`  bond orders built: ${m.bonds.filter((b) => b.id.startsWith('c')).map((b) => b.order)}`);
  line(`  checkMolecule => ${JSON.stringify(check)}`);
  line(`  *** GAME SAYS COMPLETE: ${check.complete} ***`);
}

line('\n--- D: right molecule, wrong bond order the other way (ethane built with a double bond) ---');
{
  const spec = specFor(2, 'alkane')!; // ethane, chainBonds [1]
  const m = emptyMolecule();
  m.atoms.push(createAtom('c1', 'C', 'blue', at(0), 10), createAtom('c2', 'C', 'blue', at(100), 10));
  addBond(m, 'c1', 'c2', 2); // a DOUBLE bond where ethane needs single
  for (let i = 1; i <= 4; i++) {
    m.atoms.push(createAtom(`h${i}`, 'H', 'blue', at(i * 20), 5));
    addBond(m, i <= 2 ? 'c1' : 'c2', `h${i}`, 1);
  }
  const check = checkMolecule(m, spec);
  line(`  built C2H4 with a C=C; target is ethane C2H6`);
  line(`  checkMolecule => ${JSON.stringify(check)}`);
  line(`  complete=${check.complete} (correctly rejected: still 2 H short)`);
}

line('\n--- E: disconnected fragments counted as one molecule ---');
{
  const spec = specFor(4, 'alkane')!; // butane C4H10, 3 chain bonds
  const m = emptyMolecule();
  for (let i = 1; i <= 4; i++) m.atoms.push(createAtom(`c${i}`, 'C', 'blue', at(i * 100), 10));
  // BRANCHED: c1 bonded to c2, c3 and c4 -> that is 2-methylpropane (isobutane), NOT butane
  addBond(m, 'c1', 'c2', 1);
  addBond(m, 'c1', 'c3', 1);
  addBond(m, 'c1', 'c4', 1);
  let h = 0;
  for (const c of ['c2', 'c3', 'c4']) {
    for (let i = 0; i < 3; i++) {
      const id = `h${++h}`;
      m.atoms.push(createAtom(id, 'H', 'blue', at(h * 10), 5));
      addBond(m, c, id, 1);
    }
  }
  const id = `h${++h}`;
  m.atoms.push(createAtom(id, 'H', 'blue', at(999), 5));
  addBond(m, 'c1', id, 1);
  const check = checkMolecule(m, spec);
  line(`  built 2-methylpropane (isobutane), C4H10 branched; target is n-butane`);
  line(`  checkMolecule => ${JSON.stringify(check)}`);
  line(`  *** GAME SAYS COMPLETE: ${check.complete} *** (a different compound)`);
}

line('\n--- F: unbonded carbon sitting on the table counts toward carbonCount ---');
{
  const spec = specFor(1, 'alkane')!; // methane
  const m = emptyMolecule();
  const c = createAtom('c1', 'C', 'blue', at(0), 10);
  c.state = 'placed'; // on the table, bonded to nothing
  m.atoms.push(c);
  for (let i = 1; i <= 4; i++) {
    m.atoms.push(createAtom(`h${i}`, 'H', 'blue', at(i * 20), 5));
    addBond(m, 'c1', `h${i}`, 1);
  }
  line(`  methane built normally => ${JSON.stringify(checkMolecule(m, spec))}`);
}

line('\n--- G: checkMolecule never asks whether every valency is filled ---');
{
  const spec = specFor(3, 'alkyne')!; // propyne C3H4, chainBonds [3,1]
  const m = emptyMolecule();
  for (let i = 1; i <= 3; i++) m.atoms.push(createAtom(`c${i}`, 'C', 'green', at(i * 100), 10));
  addBond(m, 'c1', 'c2', 1); // single where a TRIPLE is required
  addBond(m, 'c2', 'c3', 1);
  for (let i = 1; i <= 4; i++) {
    m.atoms.push(createAtom(`h${i}`, 'H', 'green', at(i * 20), 5));
    addBond(m, i <= 2 ? 'c1' : 'c3', `h${i}`, 1);
  }
  const check = checkMolecule(m, spec);
  const open = m.atoms.filter((a) => a.remainingValency > 0 && a.element === 'C').map((a) => `${a.id}:${a.remainingValency} free`);
  line(`  target propyne C3H4 (C#C-C). Built: C-C-C with 4 H, all bonds single.`);
  line(`  open valencies: ${open.join(', ')}`);
  line(`  checkMolecule => ${JSON.stringify(check)}`);
  line(`  *** GAME SAYS COMPLETE: ${check.complete} *** for a species with ${open.length} carbons carrying free valencies`);
}
