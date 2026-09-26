// Shared invariant checker + event recorder for the adversarial playtest.
import { GameEngine } from '../src/game/engine/engine.ts';
import type { GameEvent } from '../src/game/engine/events.ts';

const finite = (n: number) => Number.isFinite(n);

export type Violation = { rule: string; detail: string };

export function invariants(engine: GameEngine, label = ''): Violation[] {
  const v: Violation[] = [];
  const s = engine.snapshot();
  const m = s.molecule;
  const push = (rule: string, detail: string) => v.push({ rule, detail: `${label ? label + ': ' : ''}${detail}` });

  for (const a of m.atoms) {
    if (!finite(a.position.x) || !finite(a.position.y)) push('NAN_POSITION', `${a.id} position ${JSON.stringify(a.position)}`);
    if (!finite(a.velocity.x) || !finite(a.velocity.y)) push('NAN_VELOCITY', `${a.id} velocity ${JSON.stringify(a.velocity)}`);
    if (a.remainingValency < 0) push('NEGATIVE_VALENCY', `${a.id} remainingValency=${a.remainingValency}`);
    if (a.remainingValency > a.valency) push('VALENCY_OVERFLOW', `${a.id} remaining=${a.remainingValency} > valency=${a.valency}`);
  }
  // valency must equal valency - sum(bond orders)
  for (const a of m.atoms) {
    const used = m.bonds.filter((b) => b.a === a.id || b.b === a.id).reduce((n, b) => n + b.order, 0);
    if (a.remainingValency !== a.valency - used) push('VALENCY_MISMATCH', `${a.id} remaining=${a.remainingValency} expected=${a.valency - used}`);
    if (used > 0 && a.state !== 'bonded') push('BONDED_STATE_MISMATCH', `${a.id} has ${used} bond order but state=${a.state}`);
  }

  const seen = new Set<string>();
  for (const b of m.bonds) {
    if (b.a === b.b) push('SELF_BOND', `bond ${b.id}`);
    const key = [b.a, b.b].sort().join('|');
    if (seen.has(key)) push('DUPLICATE_BOND', `${key}`);
    seen.add(key);
    if (!m.atoms.some((a) => a.id === b.a) || !m.atoms.some((a) => a.id === b.b)) push('DANGLING_BOND', b.id);
  }

  // heldIds sanity
  const heldSet = new Set(s.heldIds);
  if (heldSet.size !== s.heldIds.length) push('DUPLICATE_HELD', JSON.stringify(s.heldIds));
  for (const id of s.heldIds) {
    const a = m.atoms.find((x) => x.id === id);
    if (!a) { push('HELD_UNKNOWN_ATOM', id); continue; }
    if (a.state === 'bonded') push('HELD_AND_BONDED', `${id} is in heldIds but state=bonded`);
    if (m.bonds.some((b) => b.a === id || b.b === id)) push('HELD_HAS_BOND', id);
  }
  if (s.flyingId && heldSet.has(s.flyingId)) push('FLYING_AND_HELD', s.flyingId);
  if (s.paper.loadedAtomId && s.flyingId) push('LOADED_AND_FLYING', `${s.paper.loadedAtomId} / ${s.flyingId}`);

  // paper / web numeric health
  if (!finite(s.paper.position.x) || !finite(s.paper.position.y)) push('NAN_PAPER_POS', JSON.stringify(s.paper.position));
  if (!finite(s.paper.velocity.x) || !finite(s.paper.velocity.y)) push('NAN_PAPER_VEL', JSON.stringify(s.paper.velocity));
  if (!finite(s.paper.angle)) push('NAN_PAPER_ANGLE', String(s.paper.angle));
  if (!finite(s.web.tip.x) || !finite(s.web.tip.y)) push('NAN_WEB_TIP', JSON.stringify(s.web.tip));
  if (!finite(s.timeRemaining)) push('NAN_TIME', String(s.timeRemaining));
  if (s.timeRemaining < 0) push('NEGATIVE_TIME', String(s.timeRemaining));
  if (!finite(s.score)) push('NAN_SCORE', String(s.score));

  // terminal phase hygiene
  if (s.phase === 'SUMMARY') {
    if (s.flyingId) push('SUMMARY_WITH_FLYER', s.flyingId);
    if (s.carbonImpact) push('SUMMARY_WITH_IMPACT', JSON.stringify(s.carbonImpact.stage));
    if (s.web.active) push('SUMMARY_WITH_ACTIVE_WEB', String(s.web.targetAtomId));
  }

  // rigid body: bonded carbon-carbon distance should be chainSpacing (+/- during impact anim)
  if (!s.carbonImpact) {
    const spacing = engine.rules.physics.chainSpacing;
    for (const b of m.bonds) {
      const a1 = m.atoms.find((x) => x.id === b.a)!;
      const a2 = m.atoms.find((x) => x.id === b.b)!;
      if (!a1 || !a2) continue;
      const d = Math.hypot(a1.position.x - a2.position.x, a1.position.y - a2.position.y);
      if (a1.element === 'C' && a2.element === 'C' && Math.abs(d - spacing) > 1) {
        push('CC_DISTANCE', `${b.id} distance ${d.toFixed(2)} expected ${spacing}`);
      }
      if ((a1.element === 'H') !== (a2.element === 'H')) {
        const bl = engine.rules.physics.bondLength;
        if (d > bl * 2.5) push('CH_STRETCHED', `${b.id} distance ${d.toFixed(2)} expected ~${bl}`);
      }
    }
  }
  return v;
}

export function assertInvariants(engine: GameEngine, label = ''): void {
  const v = invariants(engine, label);
  if (v.length) throw new Error(`INVARIANT VIOLATION (${v.length}):\n` + v.map((x) => `  [${x.rule}] ${x.detail}`).join('\n'));
}

export function record(engine: GameEngine): GameEvent[] {
  const log: GameEvent[] = [];
  engine.bus.on((e) => log.push(e));
  return log;
}

/** Tick n steps, checking invariants after each one. Returns first violation set. */
export function tickChecked(engine: GameEngine, steps: number, label = ''): Violation[] {
  const step = engine.rules.physics.stepMs;
  for (let i = 0; i < steps; i++) {
    engine.tick(step);
    const v = invariants(engine, `${label} step ${i}`);
    if (v.length) return v;
  }
  return [];
}

export function phaseOf(e: GameEngine) { return e.getPhase(); }
