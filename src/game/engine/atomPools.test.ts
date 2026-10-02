import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseName } from '../chemistry/formula.ts';
import {
  CARBON_GROUP_COUNT,
  HYDROGEN_ROW_SIZE,
  carbonGroupsFor,
  generateCarbonGroups,
  generateHydrogenRow,
  hydrogenRowFor,
} from './atomPools.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';
import { projectScene } from '../../screens/gameplay/live/projectScene.ts';

/**
 * The atoms a challenge puts on the table.
 *
 * Two halves: that a pool built from chemistry holds what the molecule needs,
 * and that the molecules Figma drew still get the rows it drew.
 */

const step = DEFAULT_RULES.physics.stepMs;

function spec(name: string) {
  const parsed = parseName(name);
  assert.ok(parsed, `${name} is a molecule`);
  return parsed;
}

/** The group that is actually the answer, read back rather than assumed. */
function answerGroup(engine: GameEngine): number {
  const snapshot = engine.snapshot();
  const byId = new Map(snapshot.molecule.atoms.map((a) => [a.id, a]));
  const index = snapshot.carbonGroups.findIndex(
    (group) =>
      group.atomIds.length === snapshot.spec.carbonCount &&
      group.atomIds.every((id) => byId.get(id)?.family === snapshot.spec.family),
  );
  assert.ok(index >= 0, 'the pool offers the right group');
  return index;
}

/** Plays the carbon phase and stops where the hydrogens are chosen. */
function atHydrogenSelection(molecule: string): GameEngine {
  const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
  engine.start();
  engine.selectCarbonGroup(answerGroup(engine));
  for (let i = 0; i < 3000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i += 1) engine.tick(step);
  return engine;
}

// ------------------------------------------------------------- the generator

test('the carbon groups come from the molecule, not from its name', () => {
  for (const [name, carbons] of [['methane', 1], ['ethane', 2], ['propane', 3]] as const) {
    const groups = generateCarbonGroups(spec(name));
    assert.equal(groups.length, CARBON_GROUP_COUNT, `${name} offers four groups`);
    const answers = groups.filter((g) => g.length === carbons && g.every((f) => f === 'blue'));
    assert.equal(answers.length, 1, `${name} offers exactly one right answer`);
  }
});

test('the wrong groups are wrong in both of the ways the game teaches', () => {
  const groups = generateCarbonGroups(spec('propane'));
  const wrong = groups.filter((g) => !(g.length === 3 && g.every((f) => f === 'blue')));
  assert.ok(wrong.some((g) => g.length === 3), 'one is the right size in the wrong colours');
  assert.ok(wrong.some((g) => g.length !== 3 && g.every((f) => f === 'blue')), 'one is the right colour in the wrong size');
});

test('the hydrogen row holds what the molecule needs, and more than it needs', () => {
  for (const name of ['methane', 'ethane', 'propane']) {
    const s = spec(name);
    const row = generateHydrogenRow(s);
    assert.equal(row.length, HYDROGEN_ROW_SIZE, `${name} keeps the row's geometry`);
    const correct = row.filter((f) => f === s.family).length;
    assert.ok(correct >= s.hydrogenCount, `${name} can be finished: ${correct} of ${s.hydrogenCount}`);
    assert.ok(correct > s.hydrogenCount, `${name} survives a wrong pick`);
    assert.ok(row.some((f) => f !== s.family), `${name} still asks the player to choose`);
  }
});

test('changing the molecule changes the pool, with nothing molecule-specific in between', () => {
  const methane = generateHydrogenRow(spec('methane')).filter((f) => f === 'blue').length;
  const propane = generateHydrogenRow(spec('propane')).filter((f) => f === 'blue').length;
  assert.ok(propane > methane, 'a longer chain needs more hydrogens and is offered more');

  // Butane was never authored and has no entry anywhere; it still works.
  const butane = spec('butane');
  assert.equal(butane.carbonCount, 4);
  assert.equal(butane.hydrogenCount, 10);
  assert.equal(generateCarbonGroups(butane).filter((g) => g.length === 4 && g.every((f) => f === 'blue')).length, 1);
  assert.ok(generateHydrogenRow(butane).filter((f) => f === 'blue').length >= 10);
});

// ------------------------------------------------------------- Figma parity

test('a molecule Figma drew keeps the row it was drawn with', () => {
  for (const name of ['methane', 'ethane']) {
    const challenge = ALKANE_CHALLENGES[name];
    assert.ok(challenge.carbonGroups, `${name} is still authored`);
    assert.deepEqual(carbonGroupsFor(challenge, spec(name)), challenge.carbonGroups);
    assert.deepEqual(hydrogenRowFor(challenge, spec(name)), challenge.hydrogenRow);
  }
});

test('a molecule Figma did not draw is built from its chemistry', () => {
  const challenge = ALKANE_CHALLENGES.propane;
  assert.equal(challenge.carbonGroups, undefined, 'propane authors no pool');
  assert.deepEqual(carbonGroupsFor(challenge, spec('propane')), generateCarbonGroups(spec('propane')));
});

// --------------------------------------------------- what the player is shown

test('every molecule reaches the hydrogen phase with its pool on screen', () => {
  for (const [name, carbons, hydrogens] of [
    ['methane', 1, 4],
    ['ethane', 2, 6],
    ['propane', 3, 8],
  ] as const) {
    const engine = atHydrogenSelection(name);
    assert.equal(engine.getPhase(), 'HYDROGEN_SELECTION', `${name} reaches the hydrogen phase`);

    const snapshot = engine.snapshot();
    assert.equal(snapshot.spec.carbonCount, carbons);
    assert.equal(snapshot.spec.hydrogenCount, hydrogens, `${name} needs ${hydrogens} hydrogens`);

    // The carbons are bonded and waiting: one free slot per hydrogen owed.
    const scene = projectScene(snapshot);
    const slots = scene.elements.filter((el) => /-slot-\d+$/.test(el.key ?? ''));
    assert.equal(slots.length, hydrogens, `${name} shows ${hydrogens} free bonds`);

    // And the pool is drawn, inside the box the player reaches into.
    const drawn = scene.elements.filter((el) => el.kind === 'hydrogen');
    assert.equal(drawn.length, HYDROGEN_ROW_SIZE, `${name} draws its hydrogen row`);
    assert.ok(scene.elements.some((el) => el.key === 'selection'), `${name} draws the selection box`);

    const pool = snapshot.molecule.atoms.filter((a) => a.element === 'H');
    const correct = pool.filter((a) => a.family === snapshot.spec.family).length;
    assert.ok(correct >= hydrogens, `${name} offers enough of the right family`);
    assert.ok(pool.some((a) => a.family !== snapshot.spec.family), `${name} still offers a wrong choice`);
  }
});

test('a wrong-family hydrogen is still offered, and is not used up by picking it', () => {
  const engine = atHydrogenSelection('propane');
  const before = engine.snapshot();
  const wrong = before.molecule.atoms.find(
    (a) => a.element === 'H' && a.family !== before.spec.family && before.hydrogenRowIds.includes(a.id),
  );
  assert.ok(wrong, 'propane offers a hydrogen of the wrong family');

  // Selectable: the row is what the player may reach into.
  assert.ok(before.hydrogenRowIds.includes(wrong.id), 'it is in the row the player can pick from');
  const correctBefore = before.molecule.atoms.filter(
    (a) => a.element === 'H' && a.family === before.spec.family,
  ).length;
  assert.ok(correctBefore > before.spec.hydrogenCount, 'and picking it cannot strand the round');
});
