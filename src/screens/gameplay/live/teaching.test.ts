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
 * and left them inside one tick. These assert that each beat is actually on
 * screen for long enough to read, and that the card on it says the right
 * thing about the molecule being built.
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

test('the hydrogen beat is held on screen, and holds no arithmetic', () => {
  const scenes = scenesIn('ethane', 'HYDROGEN_CALCULATION');
  // The beat still has to last: the phase entering and leaving inside one tick
  // is the regression this file was written for.
  assert.ok(scenes.length > 60, `the beat is on screen for ${(scenes.length / 60).toFixed(1)}s`);

  // The working the player used to be shown was taken out on purpose. The
  // engine still does the sum; the screen no longer spells it out.
  const text = scenes[0].elements.filter((el) => el.kind === 'text').map((el) => el.text);
  const sums = text.filter((line) => /\d\s*[×−-]\s*\d/.test(line ?? ''));
  assert.deepEqual(sums, [], `no arithmetic on screen: ${JSON.stringify(text)}`);
});

test('no molecule puts its working on screen', () => {
  for (const molecule of ['methane', 'ethane', 'propane']) {
    const scenes = scenesIn(molecule, 'HYDROGEN_CALCULATION', molecule === 'methane' ? 0 : 2);
    for (const scene of scenes) {
      const text = scene.elements.filter((el) => el.kind === 'text').map((el) => el.text ?? '');
      const sums = text.filter((line) => /\d\s*[×−-]\s*\d/.test(line));
      assert.deepEqual(sums, [], `${molecule} drew ${JSON.stringify(sums)}`);
    }
  }
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
  assert.equal(FAMILY_SET_LABEL.red, 'ene', 'where the set is named, it names the set and not the bond');

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

test('the carbon badges are the bonds, and the hydrogen row has no badges', () => {
  // The strokes stay on the carbons: they are the one cue that does not depend
  // on telling #0795ff and #69a13b apart. The hydrogens lost theirs, because
  // naming a hydrogen's set answered the question its phase asks.
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  const pool = projectScene(engine.snapshot()).elements.filter((el) => el.key?.endsWith('-glyph'));
  assert.ok(pool.length > 0);
  assert.deepEqual([...new Set(pool.map((el) => (el.kind === 'text' ? el.text : '')))].sort(), ['=', '–', '≡']);

  engine.selectCarbonGroup(2);
  for (let i = 0; i < 2000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) engine.tick(step);
  const row = projectScene(engine.snapshot()).elements.filter((el) => el.key?.endsWith('-glyph'));
  assert.deepEqual(row, [], 'no glyph is drawn over a hydrogen');
});

test('the hydrogen row names no sets - the player reads the colours', () => {
  // Writing "ane" over a blue hydrogen answered the question the phase asks.
  // The colours stay; the captions do not.
  const labels = Object.values(FAMILY_SET_LABEL);
  for (const [molecule, group] of [['methane', 0], ['ethane', 2], ['propane', 2]] as const) {
    const engine = new GameEngine(ALKANE_CHALLENGES[molecule]);
    engine.start();
    engine.selectCarbonGroup(group);
    for (let i = 0; i < 3000 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) engine.tick(step);
    assert.equal(engine.getPhase(), 'HYDROGEN_SELECTION', `${molecule} reaches the hydrogen phase`);

    const scene = projectScene(engine.snapshot());
    const drawn = scene.elements.filter((el) => el.kind === 'text').map((el) => el.text ?? '');
    const named = drawn.filter((t) => labels.includes(t as (typeof labels)[number]));
    assert.deepEqual(named, [], `${molecule} still captions its hydrogens: ${JSON.stringify(drawn)}`);

    // The atoms themselves are untouched: same pool, same colours.
    const pool = engine.snapshot().molecule.atoms.filter((a) => a.element === 'H' && a.state === 'free');
    assert.ok(pool.length > 0, `${molecule} still draws a pool`);
    assert.ok(new Set(pool.map((a) => a.family)).size > 1, `${molecule} still offers more than one family`);
  }
});
