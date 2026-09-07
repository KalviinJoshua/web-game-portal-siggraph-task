import * as THREE from 'three';

/**
 * Procedurally generated, cached canvas textures.
 *
 * Generating these once and sharing them everywhere (stars, particles, engine
 * trail, crystal sparkle) keeps GPU memory low and avoids loading any external
 * image assets — the whole look is created in code.
 */

let softCircle = null;
let glow = null;

/** Soft round particle — a white radial fade, ideal for additive points. */
export function getSoftCircleTexture() {
  if (softCircle) return softCircle;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  softCircle = new THREE.CanvasTexture(canvas);
  softCircle.colorSpace = THREE.SRGBColorSpace;
  return softCircle;
}

/** Large diffuse glow used for nebula clouds. Tinted per-use via material color. */
export function getGlowTexture() {
  if (glow) return glow;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glow = new THREE.CanvasTexture(canvas);
  glow.colorSpace = THREE.SRGBColorSpace;
  return glow;
}

/** Dispose shared textures on full teardown. */
export function disposeTextures() {
  softCircle?.dispose();
  glow?.dispose();
  softCircle = null;
  glow = null;
}
