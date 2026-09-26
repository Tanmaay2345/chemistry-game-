import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bondCompleteMs, bondStartMs } from '../../../game/engine/carbonImpact.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../../../game/engine/config.ts';
import { GameEngine } from '../../../game/engine/engine.ts';
import type { CarbonElement, ImageElement, LineElement, SceneElement } from '../scene/types';
import { projectScene } from './projectScene.ts';

/**
 * What the player actually sees at each beat of the paper-to-pair collision.
 *
 * The engine is exercised through the same projection the browser uses, so
 * these assert the drawing, not just the state: the paper in the air, the
 * burst at the contact point, the squash on the struck atoms, and a bond that
 * grows rather than appearing whole.
 */

const impactRules = DEFAULT_RULES.carbonImpact;
const step = DEFAULT_RULES.physics.stepMs;

function find(elements: SceneElement[], key: string): SceneElement | undefined {
  return elements.find((el) => 'key' in el && el.key === key);
}

/** The engine-driven scene always places elements at numeric coordinates. */
function at(value: unknown): number {
  assert.equal(typeof value, 'number');
  return value as number;
}

/** Throws the paper at the blue pair and stops when `done` is true. */
function play(done: (engine: GameEngine) => boolean, maxSeconds = 8) {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  const pair = engine
    .snapshot()
    .carbonGroups.findIndex((g) => g.atomIds.length === 2 && g.atomIds.every((id) => engine.snapshot().molecule.atoms.find((a) => a.id === id)!.family === 'blue'));
  engine.selectCarbonGroup(pair);
  for (let i = 0; i < (maxSeconds * 1000) / step && !done(engine); i++) engine.tick(step);
  return engine;
}

const impactT = (engine: GameEngine) => engine.snapshot().carbonImpact?.t ?? -1;

test('the paper is drawn in the air, pointing the way it was thrown', () => {
  const engine = play((e) => e.getPhase() === 'PAPER_FLIGHT' && e.snapshot().paper.position.x > 350);
  const scene = projectScene(engine.snapshot());
  const paper = find(scene.elements, 'paper') as ImageElement;
  assert.ok(paper, 'the paper is on the scene');
  assert.ok(at(paper.left) > 250, `the paper has left its dock (left ${paper.left})`);
  // Thrown up and to the right, so it points up and to the right.
  assert.ok(paper.rotate !== undefined && paper.rotate < 0 && paper.rotate > -90, `nose angle ${paper.rotate}`);
  assert.equal(find(scene.elements, 'burst'), undefined, 'no burst before contact');
  assert.equal(scene.elements.some((el) => 'key' in el && el.key?.includes('~')), false, 'no bond before contact');
});

test('the carbon groups are still on the table while the paper flies', () => {
  const engine = play((e) => e.getPhase() === 'PAPER_FLIGHT' && e.snapshot().paper.position.x > 300);
  const scene = projectScene(engine.snapshot());
  assert.ok(find(scene.elements, 'group-0'), 'the offered groups are still drawn');
  assert.ok(find(scene.elements, 'group-2'));
});

test('on contact the burst is drawn where the paper landed, not at the group centre', () => {
  const engine = play((e) => impactT(e) > 0 && impactT(e) < impactRules.contactMs);
  const snapshot = engine.snapshot();
  const view = snapshot.carbonImpact!;
  const scene = projectScene(snapshot);
  const burst = find(scene.elements, 'burst') as ImageElement;

  assert.ok(burst, 'the burst is drawn');
  const centre = { x: at(burst.left) + burst.width / 2, y: at(burst.top) + burst.height / 2 };
  assert.ok(Math.abs(centre.x - view.contactPoint.x) < 1, 'centred on the contact point');
  assert.ok(Math.abs(centre.y - view.contactPoint.y) < 1);

  // The contact point is the paper's nose, left of the struck atom's centre.
  const struck = snapshot.molecule.atoms.find((a) => a.id === view.members[0])!;
  assert.ok(view.contactPoint.x < struck.position.x, 'the paper came in from the left');
});

test('the struck atoms are squashed along the axis the paper came in on', () => {
  const engine = play((e) => impactT(e) > impactRules.contactMs * 0.8 && impactT(e) < impactRules.contactMs);
  const snapshot = engine.snapshot();
  const view = snapshot.carbonImpact!;
  const scene = projectScene(snapshot);
  const struck = find(scene.elements, view.members[0]) as CarbonElement;

  assert.ok(struck.transform, 'the struck atom carries a transform');
  assert.match(struck.transform!, /scale\(0\.9\d+, 1\.0\d+\)/, `squashed: ${struck.transform}`);
  const angle = (Math.atan2(view.direction.y, view.direction.x) * 180) / Math.PI;
  assert.ok(struck.transform!.includes(`rotate(${angle.toFixed(2)}deg)`), 'squashed along the impact axis');

  // An atom that was not hit has no transform.
  const untouched = find(scene.elements, snapshot.carbonGroups[0].atomIds[0]) as CarbonElement | undefined;
  assert.equal(untouched?.transform, undefined);
});

test('the struck atoms grow from the small pill to the play-area pill', () => {
  const early = play((e) => impactT(e) > 0 && impactT(e) < 40);
  const earlyScene = projectScene(early.snapshot());
  const earlyCarbon = find(earlyScene.elements, early.snapshot().carbonImpact!.members[0]) as CarbonElement;
  const earlyScale = Number(/^scale\(([\d.]+)\)/.exec(earlyCarbon.transform!)![1]);
  assert.ok(earlyScale < 0.75, `starts near the small pill (${earlyScale})`);

  const late = play((e) => impactT(e) >= bondCompleteMs(impactRules));
  const lateScene = projectScene(late.snapshot());
  const lateCarbon = find(lateScene.elements, late.snapshot().carbonImpact!.members[0]) as CarbonElement;
  const lateScale = Number(/^scale\(([\d.]+)\)/.exec(lateCarbon.transform!)![1]);
  assert.ok(lateScale > 0.99, `full size by the time the bond is done (${lateScale})`);
});

test('the bond is drawn growing, not appearing whole', () => {
  const engine = play((e) => impactT(e) > bondStartMs(impactRules) + 20 && impactT(e) < bondStartMs(impactRules) + 60);
  const snapshot = engine.snapshot();
  const view = snapshot.carbonImpact!;
  assert.ok(view.bondProgress > 0 && view.bondProgress < 1, `mid-growth (${view.bondProgress.toFixed(2)})`);

  const scene = projectScene(snapshot);
  const bond = scene.elements.find((el) => 'key' in el && el.key?.includes('~')) as LineElement;
  assert.ok(bond, 'a bond line is drawn');

  const atoms = view.members.map((id) => snapshot.molecule.atoms.find((a) => a.id === id)!);
  const gap = Math.hypot(atoms[0].position.x - atoms[1].position.x, atoms[0].position.y - atoms[1].position.y);
  assert.ok(bond.length < gap, `the line is shorter than the gap it will fill (${bond.length.toFixed(1)} < ${gap.toFixed(1)})`);
  assert.ok(bond.length > 0);
});

test('by the end the bond spans the pair and the burst is gone', () => {
  const engine = play((e) => e.getPhase() === 'HYDROGEN_SELECTION');
  const snapshot = engine.snapshot();
  const scene = projectScene(snapshot);

  assert.equal(find(scene.elements, 'burst'), undefined, 'the burst has cleared');
  const bond = scene.elements.find((el) => 'key' in el && el.key?.includes('~')) as LineElement;
  const carbons = snapshot.molecule.atoms.filter((a) => a.element === 'C' && a.state === 'bonded');
  const gap = Math.abs(carbons[0].position.x - carbons[1].position.x);
  assert.ok(Math.abs(bond.length - gap) < 1, 'the bond spans the pair');
  assert.equal(Math.round(gap), DEFAULT_RULES.physics.chainSpacing);

  // The groups have left the table and the paper is back on its dock.
  assert.equal(find(scene.elements, 'group-0'), undefined);
  const paper = find(scene.elements, 'paper') as ImageElement;
  assert.ok(Math.abs(at(paper.left) - (228.5 - 173 / 2)) < 1, 'paper re-docked');
});

test('the instruction card follows the beats without the player reading state', () => {
  const flying = play((e) => e.getPhase() === 'PAPER_FLIGHT');
  assert.match(projectScene(flying.snapshot()).panel.body, /Throw the paper/);

  const reacting = play((e) => e.getPhase() === 'CARBON_IMPACT');
  assert.match(projectScene(reacting.snapshot()).panel.body, /bond/i);
});
