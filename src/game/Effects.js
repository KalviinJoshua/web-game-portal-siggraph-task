import * as THREE from 'three';
import { getSoftCircleTexture } from './Textures.js';
import { randRange } from '../utils/MathUtils.js';

const CAPACITY = 22; // particles per burst

/** A single reusable particle burst (a small THREE.Points cloud). */
class Burst {
  constructor(scene) {
    this.active = false;
    this.life = 0;
    this.maxLife = 1;
    this.velocities = new Float32Array(CAPACITY * 3);
    const positions = new Float32Array(CAPACITY * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry = geo;
    this.material = new THREE.PointsMaterial({
      size: 0.5,
      map: getSoftCircleTexture(),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.visible = false;
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(position, color, speed, life, size) {
    this.active = true;
    this.life = 0;
    this.maxLife = life;
    this.material.color.set(color);
    this.material.size = size;
    this.material.opacity = 1;
    this.points.position.copy(position);
    this.points.visible = true;
    const arr = this.geometry.attributes.position.array;
    for (let i = 0; i < CAPACITY; i++) {
      arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = 0;
      // random direction on a sphere, varied magnitude
      const dir = new THREE.Vector3(randRange(-1, 1), randRange(-1, 1), randRange(-1, 1))
        .normalize()
        .multiplyScalar(speed * randRange(0.4, 1));
      this.velocities[i * 3] = dir.x;
      this.velocities[i * 3 + 1] = dir.y;
      this.velocities[i * 3 + 2] = dir.z;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    this.life += dt;
    const t = this.life / this.maxLife;
    if (t >= 1) {
      this.active = false;
      this.points.visible = false;
      return;
    }
    const arr = this.geometry.attributes.position.array;
    const drag = Math.exp(-3 * dt); // frame-rate independent slowdown
    for (let i = 0; i < CAPACITY; i++) {
      this.velocities[i * 3] *= drag;
      this.velocities[i * 3 + 1] *= drag;
      this.velocities[i * 3 + 2] *= drag;
      arr[i * 3] += this.velocities[i * 3] * dt;
      arr[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      arr[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = 1 - t;
  }

  dispose() {
    this.points.parent?.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Manages a fixed pool of particle bursts for collection, collision and
 * power-up activation effects. Reusing a small set of Points clouds keeps the
 * allocation cost flat no matter how many effects fire.
 */
export class Effects {
  constructor(scene, poolSize = 14) {
    this.scene = scene;
    this.bursts = Array.from({ length: poolSize }, () => new Burst(scene));
  }

  _acquire() {
    return this.bursts.find((b) => !b.active) || null;
  }

  /** Small teal sparkle when a crystal is collected. */
  collect(position) {
    this._acquire()?.emit(position, 0x8ff5da, 6, 0.5, 0.4);
  }

  /** Red-hot debris burst on an asteroid hit. */
  explosion(position) {
    this._acquire()?.emit(position, 0xff7a5c, 11, 0.7, 0.6);
  }

  /** Colored flourish when a power-up is activated. */
  powerBurst(position, color) {
    this._acquire()?.emit(position, color, 8, 0.6, 0.55);
  }

  update(dt) {
    for (const b of this.bursts) if (b.active) b.update(dt);
  }

  dispose() {
    for (const b of this.bursts) b.dispose();
    this.bursts.length = 0;
  }
}
