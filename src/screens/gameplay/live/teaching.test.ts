import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../../../game/engine/config.ts';
import { GameEngine } from '../../../game/engine/engine.ts';
import { FAMILY_SET_LABEL, describeFamily, explainMistake } from '../../../content/chemistry.ts';
import { progressMessage } from './announce.ts';
import { projectScene } from './projectScene.ts';

/**
 * What the player actually sees at each teaching beat.
 *
 * The playtest found four phases that never drew a frame: the game entered
 * and left them inside one tick, so the hydrogen count arrived as a number
 * with no working behind it. These assert both halves - that the beat is on
 * screen, and that the screen has the lesson on it.
 */

const step = DEFAULT_RULES.physics.stepMs;

/** Every scene drawn in `phase` during one round. */
function scenesIn(molecule: string, phase: string, group = 2) {
  const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
  engine.start();
  engine.selectCarbonGroup(group);
  const scenes = [];
  for (let i = 0; i < 2000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) {
    engine.tick(step);
    if (engine.getPhase() === phase) scenes.push(projectScene(engine.snapshot()));
  }
  return scenes;
}

test('the hydrogen count is shown as a sum, not as an answer', () => {
  const scenes = scenesIn('ethane', 'HYDROGEN_CALCULATION');
  assert.ok(scenes.length > 60, `the beat is on screen for ${(scenes.length / 60).toFixed(1)}s`);
  const text = scenes[0].elements.filter((el) => el.kind === 'text').map((el) => el.text);
  assert.ok(text.includes('4 × 2 = 8'), `four bonds per carbon: ${JSON.stringify(text)}`);
  assert.ok(text.includes('2 × 1 = 2'), 'the carbon-carbon bond uses two of them');
  assert.ok(text.includes('8 − 2 = 6'), 'and six are left for hydrogen');
});

test('propane shows its own working, from the same rule', () => {
  const scenes = scenesIn('propane', 'HYDROGEN_CALCULATION');
  const text = scenes[0].elements.filter((el) => el.kind === 'text').map((el) => el.text);
  assert.ok(text.includes('4 × 3 = 12'));
  assert.ok(text.includes('2 × 2 = 4'));
  assert.ok(text.includes('12 − 4 = 8'));
});

test('the built chain is shown and named before the hydrogens start', () => {
  const scenes = scenesIn('ethane', 'CARBON_STRUCTURE_READY');
  assert.ok(scenes.length > 30);
  assert.equal(scenes[0].panel.title, 'Alkane - ethane');
  assert.match(scenes[0].panel.body, /2 carbons, joined by single covalent bonds/);
});

test('a card never says a molecule has more carbons than it has', () => {
  // The Figma cards claimed "two carbon chain" on methane. Whatever the card
  // says, the number in it has to be the molecule's own.
  const scenes = scenesIn('methane', 'CARBON_STRUCTURE_READY', 0);
  assert.match(scenes[0].panel.body, /One carbon/);
  assert.equal(/two carbon/i.test(scenes[0].panel.body), false);
});

test('a mistake is explained on the card, in the same place as the instruction', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(0); // blue + red: wrong for ethane
  let note: string | undefined;
  for (let i = 0; i < 600 && !note; i++) {
    engine.tick(step);
    note = projectScene(engine.snapshot()).panel.note;
  }
  assert.ok(note, 'the card carried an explanation');
  assert.match(note, /red carbon in it/);
  assert.match(note, /alkene/);
  assert.equal(/^wrong/i.test(note), false, 'and it is not the word "Wrong."');
});

test('every reason the engine can give has something to say', () => {
  const reasons = [
    { kind: 'WRONG_CARBON_FAMILY', picked: 'green', expected: 'blue' },
    { kind: 'WRONG_CARBON_COUNT', picked: 3, expected: 2, molecule: 'ethane' },
    { kind: 'WRONG_HYDROGEN_FAMILY', picked: 'red', expected: 'blue' },
    { kind: 'NO_FREE_BOND' },
    { kind: 'THROW_MISSED' },
  ] as const;
  for (const reason of reasons) {
    const text = explainMistake(reason);
    assert.ok(text.length > 30, `${reason.kind} says something`);
    assert.ok(/\. /.test(text) || text.endsWith('.'), `${reason.kind} is a sentence`);
  }
});

test('the free bonds drawn are the free bonds the engine will accept', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  for (let i = 0; i < 2000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) engine.tick(step);
  const scene = projectScene(engine.snapshot());
  const drawn = scene.elements.filter((el) => el.key?.includes('-slot-') && !el.key.endsWith('-aim')).length;
  assert.equal(drawn, engine.bondTargets().length, 'one marker per target, no decoration');
  assert.equal(drawn, 6, 'three free bonds on each carbon of the pair');
});

test('the round reads itself out loud as it goes', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  assert.match(progressMessage(engine.snapshot()), /0 of 2 carbons placed/);
  engine.selectCarbonGroup(2);
  for (let i = 0; i < 2000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) engine.tick(step);
  assert.match(progressMessage(engine.snapshot()), /0 of 6 hydrogens bonded/);
});

test('nothing claims a hydrogen makes a double or triple bond', () => {
  // The colour families are kept - they are the mechanic - but a hydrogen has
  // one valency, so nothing may say a red hydrogen forms a double bond.
  assert.equal(describeFamily('red', 'H'), 'red - from the alkene set');
  assert.equal(describeFamily('red'), 'red (alkene, double bond)', 'a carbon still says the bond');
  assert.equal(FAMILY_SET_LABEL.red, 'ene', 'the badge on a hydrogen names the set, not the bond');

  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  engine.selectCarbonGroup(2);
  for (let i = 0; i < 2000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) engine.tick(step);
  const card = projectScene(engine.snapshot()).panel;
  assert.match(card.body, /Hydrogen always makes a single bond/);

  const note = explainMistake({ kind: 'WRONG_HYDROGEN_FAMILY', picked: 'red', expected: 'blue' });
  assert.match(note, /Hydrogen always makes a single bond/);
  assert.equal(/red hydrogen.*double bond/.test(note), false);
});

test('the hydrogen badges are the set names, the carbon badges are the bonds', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  const pool = projectScene(engine.snapshot()).elements.filter((el) => el.key?.endsWith('-glyph'));
  assert.ok(pool.length > 0);
  assert.deepEqual([...new Set(pool.map((el) => (el.kind === 'text' ? el.text : '')))].sort(), ['=', '–', '≡']);

  engine.selectCarbonGroup(2);
  for (let i = 0; i < 2000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) engine.tick(step);
  const row = projectScene(engine.snapshot()).elements.filter((el) => el.key?.endsWith('-glyph'));
  assert.deepEqual([...new Set(row.map((el) => (el.kind === 'text' ? el.text : '')))].sort(), ['ane', 'ene', 'yne']);
});
