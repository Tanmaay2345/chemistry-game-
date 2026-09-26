import type { Vec } from '../chemistry/molecule.ts';
import type { CarbonImpactRules } from './config.ts';
import { add, scale, sub } from './physics.ts';

/**
 * What happens when the thrown paper hits the carbon pair.
 *
 * The physical event is paper -> pair; the chemical consequence is pair -> C-C
 * bond. They are separate beats on purpose, so the player reads one as the
 * cause of the other: the pair is struck and pushed the way the throw was
 * aimed, it reacts, and only then does the bond appear.
 *
 * Everything here is a pure function of the milliseconds since contact, so the
 * whole reaction is deterministic and can be asserted on in tests without a
 * browser.
 */

export type ImpactStage =
  /** The paper is on the pair; the atoms are compressed. */
  | 'contact'
  /** The pair is being pushed along the throw direction. */
  | 'response'
  /** The atoms draw together and the bond grows. */
  | 'bonding'
  /** Bonded; the molecule travels to its place as one body. */
  | 'settling'
  | 'done';

export type ImpactMember = {
  id: string;
  /** Where the atom stood when the paper landed. */
  start: Vec;
  /**
   * How far this atom is pushed, in gameplay px. The atom the paper reached
   * first is pushed hardest, so the group also opens up along the throw.
   */
  push: number;
};

export type CarbonImpact = {
  /** Milliseconds since the paper touched the group. */
  t: number;
  /** Unit vector of the throw at the moment of contact. */
  direction: Vec;
  contactPoint: Vec;
  /** The struck atoms, nearest to the contact point first. */
  members: ImpactMember[];
  /** Where the finished chain belongs, left to right. */
  targets: Vec[];
  /** Set once the bonds have been added to the molecule. */
  bonded: boolean;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Matches the `settle` curve in the spec: cubic-bezier(0.22, 1, 0.36, 1). */
const easeOutQuint = (p: number) => 1 - Math.pow(1 - p, 5);
/** `anticipate`: slow to start, used while the atoms are being compressed. */
const easeInQuad = (p: number) => p * p;
/** `recoil`: overshoots slightly before coming back. */
const easeOutBack = (p: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

export function bondStartMs(r: CarbonImpactRules): number {
  return r.contactMs + r.responseMs;
}

export function bondCompleteMs(r: CarbonImpactRules): number {
  return bondStartMs(r) + r.bondMs;
}

export function totalMs(r: CarbonImpactRules): number {
  return bondCompleteMs(r) + r.settleMs;
}

export function stageAt(t: number, r: CarbonImpactRules): ImpactStage {
  if (t < r.contactMs) return 'contact';
  if (t < bondStartMs(r)) return 'response';
  if (t < bondCompleteMs(r)) return 'bonding';
  if (t < totalMs(r)) return 'settling';
  return 'done';
}

/**
 * How squashed the atoms are, 0 to 1. Peaks the instant the paper lands and is
 * released again as the pair starts moving.
 */
export function compressionAt(t: number, r: CarbonImpactRules): number {
  if (t <= 0) return 0;
  if (t < r.contactMs) return easeInQuad(clamp01(t / r.contactMs));
  const released = clamp01((t - r.contactMs) / r.responseMs);
  return 1 - easeOutQuint(released);
}

/** How far along the throw direction the pair has been pushed, 0 to 1. */
export function displacementAt(t: number, r: CarbonImpactRules): number {
  if (t < r.contactMs) return 0;
  return easeOutBack(clamp01((t - r.contactMs) / r.responseMs));
}

/** How much of the bond is drawn, 0 to 1. Nothing before the response ends. */
export function bondProgressAt(t: number, r: CarbonImpactRules): number {
  if (t < bondStartMs(r)) return 0;
  return clamp01((t - bondStartMs(r)) / r.bondMs);
}

/** How far the finished molecule has travelled to its place, 0 to 1. */
export function settleProgressAt(t: number, r: CarbonImpactRules): number {
  if (t < bondCompleteMs(r)) return 0;
  return easeOutQuint(clamp01((t - bondCompleteMs(r)) / r.settleMs));
}

/**
 * The pair grows from the small pill it was in the group to the play-area
 * pill, finishing as the bond does.
 */
export function growthAt(t: number, r: CarbonImpactRules): number {
  return easeOutQuint(clamp01(t / bondCompleteMs(r)));
}

/** The burst: snaps in on contact, holds, then fades as the bond completes. */
export function burstAt(t: number, r: CarbonImpactRules): { scale: number; opacity: number } {
  if (t < 0) return { scale: 0, opacity: 0 };
  const grow = clamp01(t / r.burstInMs);
  const fadeStart = bondStartMs(r);
  const fade = t <= fadeStart ? 0 : clamp01((t - fadeStart) / (bondCompleteMs(r) - fadeStart));
  return { scale: 0.4 + 0.6 * easeOutQuint(grow), opacity: (1 - fade) * easeOutQuint(grow) };
}

/**
 * Where the struck atoms are right now.
 *
 * contact/response - pushed along the throw, the nearest atom furthest, so
 *                    the group also opens up slightly.
 * bonding          - drawn together into the bonded chain geometry.
 * settling         - the bonded chain moves to its place as one rigid body,
 *                    so the distances between the atoms no longer change.
 */
export function positionsAt(impact: CarbonImpact, r: CarbonImpactRules, spacing: number): Map<string, Vec> {
  const push = displacementAt(impact.t, r);
  const displaced = impact.members.map((m) => ({ id: m.id, at: add(m.start, scale(impact.direction, m.push * push)) }));

  const bond = bondProgressAt(impact.t, r);
  if (bond === 0) return new Map(displaced.map((d) => [d.id, d.at]));

  // The bonded pose: the same centre of mass, but evenly spaced along one
  // line, which is how every frame draws a carbon chain.
  const ordered = [...displaced].sort((a, b) => a.at.x - b.at.x);
  const centre = {
    x: displaced.reduce((sum, d) => sum + d.at.x, 0) / displaced.length,
    y: displaced.reduce((sum, d) => sum + d.at.y, 0) / displaced.length,
  };
  const posed = new Map<string, Vec>();
  ordered.forEach((d, i) => {
    posed.set(d.id, { x: centre.x + (i - (ordered.length - 1) / 2) * spacing, y: centre.y });
  });

  const drawn = easeOutQuint(bond);
  const bonding = new Map<string, Vec>(
    displaced.map((d) => {
      const to = posed.get(d.id)!;
      return [d.id, add(d.at, scale(sub(to, d.at), drawn))];
    }),
  );

  const settle = settleProgressAt(impact.t, r);
  if (settle === 0) return bonding;

  // One offset for every atom: the molecule travels rigidly from here on.
  const anchorId = ordered[0].id;
  const travel = sub(impact.targets[0], bonding.get(anchorId)!);
  return new Map([...bonding].map(([id, at]) => [id, add(at, scale(travel, settle))]));
}

/** The atoms in chain order (left to right), for bonding them up. */
export function chainOrder(impact: CarbonImpact, positions: Map<string, Vec>): string[] {
  return [...impact.members]
    .map((m) => m.id)
    .sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);
}
