import type { Atom, Vec } from '../chemistry/molecule.ts';

/**
 * The collision layer.
 *
 * Deliberately small and hand-written: the game is a handful of circles thrown
 * at each other in one plane. A general physics engine would add weight, a
 * second coordinate system and a solver whose results drift between runs -
 * and this game has to be reproducible, because the lesson depends on a throw
 * behaving the same way twice. Everything here is a fixed-step integration of
 * circles in gameplay coordinates, the same coordinates the renderer draws in.
 */

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const length = (a: Vec): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export function normalise(a: Vec): Vec {
  const len = length(a);
  return len === 0 ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
}

/** The angle of a direction in degrees, measured as the screen does (y down). */
export function angleOf(a: Vec): number {
  return (Math.atan2(a.y, a.x) * 180) / Math.PI;
}

export function fromAngle(degrees: number, len = 1): Vec {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians) * len, y: Math.sin(radians) * len };
}

/** Do these two circles overlap? */
export function overlaps(a: Atom, b: Atom): boolean {
  return distance(a.position, b.position) <= a.radius + b.radius;
}

/**
 * Moves one atom for a step and applies drag. Positions are integrated
 * explicitly, which is stable at this speed and step and keeps a throw
 * repeatable.
 */
export function integrate(atom: Atom, stepSeconds: number, friction: number, restSpeed: number): void {
  atom.position = add(atom.position, scale(atom.velocity, stepSeconds));
  const damped = Math.max(0, 1 - friction * stepSeconds);
  atom.velocity = scale(atom.velocity, damped);
  if (length(atom.velocity) < restSpeed) atom.velocity = { x: 0, y: 0 };
}

/** Whether a point has left the play area. */
export function outOfBounds(position: Vec, bounds: { left: number; top: number; right: number; bottom: number }): boolean {
  return position.x < bounds.left || position.x > bounds.right || position.y < bounds.top || position.y > bounds.bottom;
}

/**
 * The first atom a moving atom is touching, if any. The moving atom itself and
 * anything excluded (what it is already bonded to) is skipped.
 */
export function firstContact(moving: Atom, candidates: Atom[], exclude: Set<string>): Atom | null {
  let closest: Atom | null = null;
  let closestDistance = Infinity;
  for (const other of candidates) {
    if (other.id === moving.id || exclude.has(other.id)) continue;
    const gap = distance(moving.position, other.position) - (moving.radius + other.radius);
    if (gap <= 0 && gap < closestDistance) {
      closest = other;
      closestDistance = gap;
    }
  }
  return closest;
}

/**
 * Hands part of the moving atom's motion to what it struck, along the throw
 * direction. This is the mechanic the player learns from: a struck atom carries
 * on the way the throw was aimed, and can strike the next one.
 */
export function transferImpulse(moving: Atom, struckGroup: Atom[], transfer: number): Vec {
  const impulse = scale(moving.velocity, transfer / Math.max(1, struckGroup.length));
  for (const atom of struckGroup) atom.velocity = add(atom.velocity, impulse);
  return impulse;
}

/** A non-bonding hit: the thrown atom comes off the surface it hit. */
export function bounce(moving: Atom, struck: Atom, restitution: number): void {
  const normal = normalise(sub(moving.position, struck.position));
  const speed = length(moving.velocity) * restitution;
  moving.velocity = scale(normal, speed);
  // Lift it clear so the same contact is not resolved twice.
  moving.position = add(struck.position, scale(normal, moving.radius + struck.radius + 1));
}
