import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
const step = DEFAULT_RULES.physics.stepMs;
const e = new GameEngine(ALKANE_CHALLENGES.ethane);
e.start();
e.selectCarbonGroup(2);

// Take a "snapshot", then advance time, then read the snapshot again.
const snapA = e.snapshot();
const paperBefore = JSON.stringify(snapA.paper.position);
const atomBefore = JSON.stringify(snapA.molecule.atoms[0].position);
const timeBefore = snapA.session.remainingTime;
for (let i = 0; i < 120; i++) e.tick(step);
console.log('paper.position in the OLD snapshot: before =', paperBefore, ' after 2s =', JSON.stringify(snapA.paper.position));
console.log('atom position in the OLD snapshot : before =', atomBefore, ' after 2s =', JSON.stringify(snapA.molecule.atoms[0].position));
console.log('session.remainingTime in OLD snap : before =', timeBefore, ' after 2s =', snapA.session.remainingTime);

const snapB = e.snapshot();
console.log('identity: snapA.paper === snapB.paper      ->', snapA.paper === snapB.paper);
console.log('identity: snapA.molecule === snapB.molecule ->', snapA.molecule === snapB.molecule);
console.log('identity: snapA.session === snapB.session   ->', snapA.session === snapB.session);
console.log('identity: snapA.carbonGroups === snapB.carbonGroups ->', snapA.carbonGroups === snapB.carbonGroups);
console.log('identity: snapA.web === snapB.web           ->', snapA.web === snapB.web);
console.log('identity: snapA.heldIds === snapB.heldIds   ->', snapA.heldIds === snapB.heldIds, '(this one IS copied)');

// And the caller can write into the engine through it.
snapA.molecule.atoms[0].remainingValency = -99;
snapA.molecule.bonds.push({ id: 'forged', a: 'c6', b: 'c6', order: 1 });
console.log('after mutating the "snapshot": engine sees remainingValency =', e.snapshot().molecule.atoms[0].remainingValency, ' bonds =', e.snapshot().molecule.bonds.length);
