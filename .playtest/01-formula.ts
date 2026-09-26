// Q1: is the name -> formula rule real chemistry?
import { specFor, parseName, hydrogenCountFor, chainBondsFor } from '../src/game/chemistry/formula.ts';
import { PREFIXES } from '../src/game/chemistry/elements.ts';

const REAL: Record<string, [number, number]> = {
  // name -> [C, H] from a textbook
  methane: [1, 4], ethane: [2, 6], propane: [3, 8], butane: [4, 10], pentane: [5, 12],
  hexane: [6, 14], heptane: [7, 16], octane: [8, 18], nonane: [9, 20], decane: [10, 22],
  ethene: [2, 4], propene: [3, 6], butene: [4, 8], pentene: [5, 10], hexene: [6, 12],
  ethyne: [2, 2], propyne: [3, 4], butyne: [4, 6], pentyne: [5, 8], hexyne: [6, 10],
};

let bad = 0;
for (const series of ['alkane', 'alkene', 'alkyne'] as const) {
  for (let n = 1; n <= 10; n++) {
    const spec = specFor(n, series);
    if (!spec) { console.log(`specFor(${n}, ${series}) = null`); continue; }
    const expect = REAL[spec.name];
    const sum = spec.chainBonds.reduce((s, b) => s + b, 0);
    const formulaH = 4 * n - 2 * sum;
    const flag = expect && (expect[0] !== spec.carbonCount || expect[1] !== spec.hydrogenCount) ? '  <-- MISMATCH' : '';
    if (flag) bad++;
    console.log(
      `${series.padEnd(6)} n=${String(n).padEnd(2)} ${spec.name.padEnd(8)} C${spec.carbonCount}H${spec.hydrogenCount}` +
      ` chainBonds=[${spec.chainBonds}] 4n-2*sum=${formulaH}` +
      (expect ? ` textbook C${expect[0]}H${expect[1]}` : ' (no textbook entry)') + flag,
    );
  }
}
console.log('\nmismatches vs textbook:', bad);

// parseName round trip
console.log('\nparseName round trip:');
for (const p of PREFIXES) {
  for (const suf of ['ane', 'ene', 'yne']) {
    const s = parseName(p + suf);
    console.log(` ${(p + suf).padEnd(9)} -> ${s ? `${s.name} C${s.carbonCount}H${s.hydrogenCount} order=${s.bondOrder}` : 'null'}`);
  }
}

// Things a student might type
console.log('\nodd inputs:');
for (const name of ['methene', 'methyne', 'ethane ', 'ETHANE', 'benzene', 'cane', 'propanone', 'butanane', 'nonane', 'octane']) {
  const s = parseName(name);
  console.log(` ${JSON.stringify(name).padEnd(12)} -> ${s ? `${s.name} C${s.carbonCount}H${s.hydrogenCount}` : 'null'}`);
}

// Direct rule check
console.log('\nhydrogenCountFor sanity:');
console.log(' n=2 chain [1]  ->', hydrogenCountFor(2, [1]), '(ethane 6)');
console.log(' n=2 chain [2]  ->', hydrogenCountFor(2, [2]), '(ethene 4)');
console.log(' n=2 chain [3]  ->', hydrogenCountFor(2, [3]), '(ethyne 2)');
console.log(' n=1 chain []   ->', hydrogenCountFor(1, []), '(methane 4)');
console.log(' chainBondsFor(4, 2) =', chainBondsFor(4, 2), '(but-1-ene: one C=C, rest single)');
console.log(' chainBondsFor(1, 2) =', chainBondsFor(1, 2));
