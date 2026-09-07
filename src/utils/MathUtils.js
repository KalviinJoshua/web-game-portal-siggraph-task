/**
 * Small, dependency-free math helpers shared across game systems.
 * Everything here is pure so it is trivial to reason about and reuse.
 */

export const TAU = Math.PI * 2;

/** Constrain `value` to the inclusive [min, max] range. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Standard linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent smoothing (a.k.a. exponential damp).
 * `lambda` is roughly "how fast" we approach the target; larger = snappier.
 * Because it uses dt, the feel is identical at 30fps or 144fps.
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Re-map `value` from one range to another. */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * t;
}

/** Random float in [min, max). */
export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] (inclusive). */
export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Pick a random element from a non-empty array. */
export function pick(array) {
  return array[(Math.random() * array.length) | 0];
}

/** True with probability `p` (0..1). */
export function chance(p) {
  return Math.random() < p;
}

/**
 * Guard against NaN / Infinity leaking into the UI or game state.
 * Returns `fallback` when `value` is not a finite number.
 */
export function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
