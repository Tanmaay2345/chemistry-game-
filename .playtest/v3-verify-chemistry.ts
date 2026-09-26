// Fix pass: the chemistry the report asked to be verified, checked directly.
import { SERIES, VALENCY, carbonCountFor } from '../src/game/chemistry/elements.ts';
import { hydrogenCountFor, parseName } from '../src/game/chemistry/formula.ts';
import { addBond, checkMolecule, createAtom, emptyMolecule } from '../src/game/chemistry/molecule.ts';
import { SERIES_BY_FAMILY, SERIES_COPY, describeFamily, hydrogenWorking, prefixBody } from '../src/content/chemistry.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(want)})`}`);
};

console.log('=== formulas ===');
for (const [name, c, h] of [['methane', 1, 4], ['ethane', 2, 6], ['propane', 3, 8]] as const) {
  const spec = parseName(name)!;
  check(`${name} carbons`, spec.carbonCount, c);
  check(`${name} hydrogens`, spec.hydrogenCount, h);
  check(`${name} chain bonds`, spec.chainBonds, Array(c - 1).fill(1));
}
check('ethene C2H4', [parseName('ethene')!.carbonCount, parseName('ethene')!.hydrogenCount], [2, 4]);
check('propyne C3H4', [parseName('propyne')!.carbonCount, parseName('propyne')!.hydrogenCount], [3, 4]);
check('carbon valency', VALENCY.C, 4);
check('hydrogen valency', VALENCY.H, 1);
check('H = 4n - 2*sum for butane', hydrogenCountFor(4, [1, 1, 1]), 10);

console.log('\n=== series ===');
check('alkane bond order', SERIES.alkane.bondOrder, 1);
check('alkene bond order', SERIES.alkene.bondOrder, 2);
check('alkyne bond order', SERIES.alkyne.bondOrder, 3);
check('blue family', SERIES_BY_FAMILY.blue, 'alkane');
check('red family', SERIES_BY_FAMILY.red, 'alkene');
check('green family', SERIES_BY_FAMILY.green, 'alkyne');
check('alkane formula', SERIES_COPY.alkane.generalFormula, 'CnH2n+2');
check('alkene formula', SERIES_COPY.alkene.generalFormula, 'CnH2n');
check('alkyne formula', SERIES_COPY.alkyne.generalFormula, 'CnH2n-2');
for (const key of ['alkane', 'alkene', 'alkyne'] as const) {
  console.log(`     ${key} body: ${SERIES_COPY[key].body}`);
  console.log(`     ${key} suffix card: ${SERIES_COPY[key].suffixTitle} / ${SERIES_COPY[key].suffixLesson}`);
}
console.log(`     describeFamily(red) = ${describeFamily('red')}`);

console.log('\n=== prefixes ===');
for (let n = 1; n <= 10; n++) {
  const word = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n - 1];
  check(`prefix ${n}`, prefixBody(n).includes(`see ${word} carbon`), true);
}
check('carbonCountFor("prop")', carbonCountFor('prop'), 3);

console.log('\n=== the sum the calculation beat shows ===');
for (const [n, bonds, h] of [[1, [], 4], [2, [1], 6], [3, [1, 1], 8], [2, [2], 4], [2, [3], 2]] as const) {
  const steps = hydrogenWorking(n, [...bonds], h);
  console.log(`     n=${n} bonds=${JSON.stringify(bonds)} -> ${steps.map((s) => s.value).join(' | ')}`);
  check(`  last line of n=${n}`, steps[2].value.endsWith(`= ${h}`), true);
}

console.log('\n=== the completion gate ===');
function build(carbons: number, order: 1 | 2 | 3, hydrogens: number, family: 'blue' | 'red' | 'green') {
  const m = emptyMolecule();
  const cs = Array.from({ length: carbons }, (_, i) => createAtom(`c${i}`, 'C', family, { x: i * 200, y: 0 }, 44));
  m.atoms.push(...cs);
  for (let i = 1; i < carbons; i++) addBond(m, `c${i - 1}`, `c${i}`, order);
  for (let i = 0; i < hydrogens; i++) {
    const h = createAtom(`h${i}`, 'H', family, { x: i * 10, y: 100 }, 23.5);
    m.atoms.push(h);
    addBond(m, `c${i % carbons}`, h.id, 1);
  }
  return m;
}
check('ethane built as ethane is complete', checkMolecule(build(2, 1, 6, 'blue'), parseName('ethane')!).complete, true);
check('ethene built with a SINGLE C-C is refused', checkMolecule(build(2, 1, 4, 'red'), parseName('ethene')!).complete, false);
check('ethene built with a DOUBLE C-C is complete', checkMolecule(build(2, 2, 4, 'red'), parseName('ethene')!).complete, true);
check('methane with only 3 H is refused', checkMolecule(build(1, 1, 3, 'blue'), parseName('methane')!).complete, false);
check('propane with a red carbon is refused', checkMolecule(build(3, 1, 8, 'red'), parseName('propane')!).complete, false);

console.log(`\n${bad === 0 ? 'ALL CHECKS PASSED' : `${bad} CHECKS FAILED`}`);
