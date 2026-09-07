/**
 * Runtime capability checks and a tiny FPS meter.
 *
 * These helpers let the rest of the app adapt to the device: skip camera shake
 * when the user prefers reduced motion, show touch controls on touch devices,
 * and fail gracefully when WebGL is missing.
 */

/** Cheap, cached WebGL availability probe. */
let webglSupport = null;
export function supportsWebGL() {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** Respect the OS "reduce motion" accessibility setting. */
export function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** True on devices whose primary input is touch (used to show touch controls). */
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  );
}

/**
 * Clamp the frame delta so the simulation never takes a huge step after the
 * tab was backgrounded (which would otherwise teleport objects through walls).
 */
export function clampDelta(deltaSeconds) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return 0;
  return Math.min(deltaSeconds, 1 / 20); // never simulate more than a 50ms step
}

/** Lightweight exponential-average FPS meter for the optional debug readout. */
export class FpsMeter {
  constructor() {
    this.fps = 60;
    this._accum = 0;
    this._frames = 0;
  }

  sample(deltaSeconds) {
    if (deltaSeconds <= 0) return this.fps;
    this._accum += deltaSeconds;
    this._frames += 1;
    if (this._accum >= 0.5) {
      this.fps = Math.round(this._frames / this._accum);
      this._accum = 0;
      this._frames = 0;
    }
    return this.fps;
  }
}
