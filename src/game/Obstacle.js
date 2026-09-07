import * as THREE from 'three';
import { randRange, TAU } from '../utils/MathUtils.js';

/**
 * A single asteroid obstacle.
 *
 * The shape is a low-poly icosahedron whose vertices are randomly displaced at
 * construction, so every pooled asteroid has a distinct silhouette. Per-spawn
 * we then vary scale, position and tumbling rotation for further variety while
 * keeping the (relatively expensive) geometry allocation one-time.
 *
 * Collision uses a single bounding sphere — cheap and more than accurate enough
 * for chunky rocks.
 */
export class Asteroid {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Material} material  Shared rock material (disposed by owner).
   */
  constructor(scene, material) {
    this.scene = scene;
    this.type = 'asteroid';
    this.active = false;
    this.scale = 1;
    this.rot = new THREE.Vector3();

    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const f = randRange(0.78, 1.28);
      pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
    }
    geo.computeVertexNormals();
    this.geometry = geo;

    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Activate this asteroid at a lane position, far ahead of the player. */
  spawn(x, y, z, scale) {
    this.active = true;
    this.scale = scale;
    this.driftVx = 0; // no lateral drift unless setDrift() is called
    this.driftMin = x;
    this.driftMax = x;
    this.mesh.visible = true;
    this.mesh.position.set(x, y, z);
    this.mesh.scale.setScalar(scale);
    this.mesh.rotation.set(randRange(0, TAU), randRange(0, TAU), randRange(0, TAU));
    this.rot.set(randRange(-1, 1), randRange(-1, 1), randRange(-1, 1));
  }

  /** Give the asteroid a lateral drift, clamped between two x bounds. */
  setDrift(vx, minX, maxX) {
    this.driftVx = vx;
    this.driftMin = minX;
    this.driftMax = maxX;
  }

  update(dt, worldSpeed) {
    this.mesh.position.z += worldSpeed * dt;
    if (this.driftVx !== 0) {
      const x = this.mesh.position.x + this.driftVx * dt;
      this.mesh.position.x = Math.max(this.driftMin, Math.min(this.driftMax, x));
    }
    this.mesh.rotation.x += this.rot.x * dt;
    this.mesh.rotation.y += this.rot.y * dt;
    this.mesh.rotation.z += this.rot.z * dt;
  }

  getCollider() {
    // 0.82 keeps the hit sphere slightly inside the jagged silhouette so near
    // misses feel fair rather than punishing.
    return { position: this.mesh.position, radius: this.scale * 0.82 };
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
  }
}
