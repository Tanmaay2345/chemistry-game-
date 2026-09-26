import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bondCompleteMs,
  bondProgressAt,
  bondStartMs,
  burstAt,
  compressionAt,
  displacementAt,
  positionsAt,
  settleProgressAt,
  stageAt,
  totalMs,
  type CarbonImpact,
} from './carbonImpact.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from './config.ts';
import { GameEngine } from './engine.ts';
import type { GameEvent } from './events.ts';

/**
 * The paper-to-pair collision, beat by beat. These assert the causal order the
 * interaction depends on: hit, react, then bond - never the other way round.
 */

const r = DEFAULT_RULES.carbonImpact;

/** A pair struck from the lower left, as the reference frames show it. */
function impact(): CarbonImpact {
  const direction = { x: 0.76, y: -0.64 };
  return {
    t: 0,
    direction,
    contactPoint: { x: 700, y: 560 },
    members: [
      { id: 'c1', start: { x: 720, y: 582 }, push: r.nearPush },
      { id: 'c2', start: { x: 790, y: 582 }, push: r.farPush },
    ],
    targets: [
      { x: 492, y: 467 },
      { x: 692, y: 467 },
    ],
    bonded: false,
  };
}

test('the beats run in the order the interaction depends on', () => {
  assert.equal(stageAt(0, r), 'contact');
  assert.equal(stageAt(r.contactMs + 10, r), 'response');
  assert.equal(stageAt(bondStartMs(r) + 10, r), 'bonding');
  assert.equal(stageAt(bondCompleteMs(r) + 10, r), 'settling');
  assert.equal(stageAt(totalMs(r) + 1, r), 'done');
});

test('nothing about the bond exists before the pair has reacted', () => {
  assert.equal(bondProgressAt(0, r), 0);
  assert.equal(bondProgressAt(r.contactMs, r), 0, 'not during contact');
  assert.equal(bondProgressAt(bondStartMs(r) - 1, r), 0, 'not during the response');
  assert.ok(bondProgressAt(bondStartMs(r) + 1, r) > 0, 'only once the response is over');
});

test('the bond starts at 260ms and completes at 460ms after contact', () => {
  assert.equal(bondStartMs(r), 260);
  assert.equal(bondCompleteMs(r), 460);
  assert.equal(bondProgressAt(bondCompleteMs(r), r), 1);
});

test('the atoms compress on contact and are released as they move', () => {
  assert.equal(compressionAt(0, r), 0);
  assert.ok(compressionAt(r.contactMs * 0.99, r) > 0.9, 'squashed when the paper lands');
  assert.ok(compressionAt(bondStartMs(r), r) < 0.01, 'released by the end of the response');
});

test('the pair is pushed along the throw direction, nearest atom hardest', () => {
  const i = impact();
  i.t = bondStartMs(r); // end of the response, before the bond redraws them
  const at = positionsAt(i, r, DEFAULT_RULES.physics.chainSpacing);

  for (const member of i.members) {
    const moved = { x: at.get(member.id)!.x - member.start.x, y: at.get(member.id)!.y - member.start.y };
    // Movement is along the throw: same sign on both axes, and the ratio of
    // the components matches the direction vector.
    assert.ok(moved.x > 0 && moved.y < 0, `${member.id} moved with the throw`);
    const alignment = (moved.x * i.direction.x + moved.y * i.direction.y) / Math.hypot(moved.x, moved.y);
    assert.ok(alignment > 0.99, `${member.id} moved along the throw axis (${alignment.toFixed(3)})`);
  }

  const nearMoved = Math.hypot(at.get('c1')!.x - 720, at.get('c1')!.y - 582);
  const farMoved = Math.hypot(at.get('c2')!.x - 790, at.get('c2')!.y - 582);
  assert.ok(nearMoved > farMoved, 'the struck atom moves further than the far one');
});

test('displacement peaks and settles rather than running away', () => {
  assert.equal(displacementAt(0, r), 0);
  const peak = Math.max(...Array.from({ length: 40 }, (_, i) => displacementAt(r.contactMs + i * 5, r)));
  assert.ok(peak > 1, 'it overshoots slightly');
  assert.ok(peak < 1.2, 'but not wildly');
  assert.equal(Math.round(displacementAt(bondStartMs(r), r) * 1000) / 1000, 1);
});

test('once bonded the pair moves as one rigid body', () => {
  const i = impact();
  const spacing = DEFAULT_RULES.physics.chainSpacing;
  const gaps: number[] = [];
  for (let t = bondCompleteMs(r); t <= totalMs(r); t += 20) {
    i.t = t;
    const at = positionsAt(i, r, spacing);
    gaps.push(Math.hypot(at.get('c1')!.x - at.get('c2')!.x, at.get('c1')!.y - at.get('c2')!.y));
  }
  for (const gap of gaps) assert.ok(Math.abs(gap - spacing) < 0.001, `gap held at ${gap}`);
});

test('the molecule ends up where the frames put it', () => {
  const i = impact();
  i.t = totalMs(r);
  const at = positionsAt(i, r, DEFAULT_RULES.physics.chainSpacing);
  const left = at.get('c1')!.x < at.get('c2')!.x ? at.get('c1')! : at.get('c2')!;
  assert.ok(Math.abs(left.x - i.targets[0].x) < 0.5, `left carbon at ${left.x}`);
  assert.ok(Math.abs(left.y - i.targets[0].y) < 0.5, `left carbon at ${left.y}`);
});

test('the burst appears on contact and is gone by the time the bond is done', () => {
  assert.equal(burstAt(0, r).opacity, 0);
  assert.ok(burstAt(r.burstInMs, r).opacity > 0.9, 'full by the end of its entry');
  assert.ok(burstAt(r.burstInMs, r).scale > 0.95);
  assert.ok(burstAt(bondCompleteMs(r), r).opacity < 0.01, 'faded out as the bond completes');
});

test('settling starts only after the bond is complete', () => {
  assert.equal(settleProgressAt(bondCompleteMs(r) - 1, r), 0);
  assert.ok(settleProgressAt(bondCompleteMs(r) + 50, r) > 0);
  assert.equal(settleProgressAt(totalMs(r), r), 1);
});

/** The same beats, observed through the running engine. */
test('the engine plays contact, reaction, bond and settle in that order', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  const log: { type: string; t: number }[] = [];
  let elapsed = 0;
  engine.bus.on((e: GameEvent) => {
    if (e.type === 'ATOM_COLLISION' || e.type === 'BOND_CREATED') log.push({ type: e.type, t: elapsed });
  });
  engine.start();
  engine.selectCarbonGroup(2);

  const step = DEFAULT_RULES.physics.stepMs;
  const stages: string[] = [];
  for (let i = 0; i < 1200 && engine.getPhase() !== 'HYDROGEN_SELECTION'; i++) {
    engine.tick(step);
    elapsed += step;
    const view = engine.snapshot().carbonImpact;
    if (view && stages[stages.length - 1] !== view.stage) stages.push(view.stage);
  }

  assert.deepEqual(stages, ['contact', 'response', 'bonding', 'settling'], 'every beat was played');
  assert.equal(log[0]?.type, 'ATOM_COLLISION');
  assert.equal(log[1]?.type, 'BOND_CREATED');
  // The bond lands roughly a response-length after the hit, not instantly.
  const gap = log[1].t - log[0].t;
  assert.ok(gap >= bondStartMs(r) - step && gap <= bondStartMs(r) + 3 * step, `bond came ${gap}ms after contact`);
});

test('the carbons do not move until the paper reaches them', () => {
  const engine = new GameEngine(ALKANE_CHALLENGES.ethane);
  engine.start();
  const ids = engine.snapshot().carbonGroups[2].atomIds;
  const before = ids.map((id) => ({ ...engine.snapshot().molecule.atoms.find((a) => a.id === id)!.position }));
  engine.selectCarbonGroup(2);

  const step = DEFAULT_RULES.physics.stepMs;
  while (engine.getPhase() === 'PAPER_FLIGHT') {
    engine.tick(step);
    const now = ids.map((id) => ({ ...engine.snapshot().molecule.atoms.find((a) => a.id === id)!.position }));
    if (engine.getPhase() === 'PAPER_FLIGHT') assert.deepEqual(now, before, 'still untouched');
  }
  assert.equal(engine.getPhase(), 'CARBON_IMPACT');
});
