import { SERIES_COPY, describeFamily, hydrogenWorking, explainMistake, prefixBody, FAMILY_GLYPH, SERIES_BY_FAMILY } from '../src/content/chemistry.ts';
import { SERIES } from '../src/game/chemistry/elements.ts';
import { chainBondsFor, hydrogenCountFor } from '../src/game/chemistry/formula.ts';

console.log('--- SERIES_COPY ---');
for (const k of ['alkane','alkene','alkyne'] as const) {
  const c = SERIES_COPY[k];
  console.log(k, JSON.stringify({plural:c.plural,singular:c.singular,suffix:c.suffix,bondWord:c.bondWord,formula:c.generalFormula}));
  console.log('   body:', c.body);
  console.log('   card:', c.cardLine);
}
console.log('\n--- describeFamily ---');
for (const f of ['blue','red','green'] as const) console.log(f, '->', describeFamily(f), ' glyph', FAMILY_GLYPH[f], ' elements.ts family for series:', SERIES[SERIES_BY_FAMILY[f]].family, 'order', SERIES[SERIES_BY_FAMILY[f]].bondOrder);

console.log('\n--- prefixBody 1..11 ---');
for (let n=1;n<=11;n++) console.log(n, prefixBody(n));

console.log('\n--- hydrogenWorking ---');
const cases: [number, number[]][] = [[1,[]],[2,[1]],[3,[1,1]],[2,[2]],[2,[3]],[4,[2,1,1]],[5,[3,1,1,1]]];
for (const [n, bonds] of cases) {
  const h = hydrogenCountFor(n, bonds);
  console.log(`n=${n} bonds=[${bonds}] H=${h}`);
  for (const s of hydrogenWorking(n, bonds, h)) console.log('    ', s.label, '|', s.value);
}

console.log('\n--- explainMistake ---');
const rs: any[] = [
  {kind:'WRONG_CARBON_FAMILY', picked:'red', expected:'blue'},
  {kind:'WRONG_CARBON_FAMILY', picked:'green', expected:'blue'},
  {kind:'WRONG_CARBON_FAMILY', picked:'blue', expected:'red'},
  {kind:'WRONG_CARBON_COUNT', picked:1, expected:3, molecule:'propane'},
  {kind:'WRONG_CARBON_COUNT', picked:3, expected:1, molecule:'methane'},
  {kind:'WRONG_HYDROGEN_FAMILY', picked:'red', expected:'blue'},
  {kind:'WRONG_HYDROGEN_FAMILY', picked:'blue', expected:'green'},
  {kind:'NO_FREE_BOND'},
  {kind:'THROW_MISSED'},
];
for (const r of rs) console.log(r.kind, r.picked ?? '', '->', explainMistake(r));
console.log('\nchainBondsFor(2,2)=',chainBondsFor(2,2),' (4,3)=',chainBondsFor(4,3));
