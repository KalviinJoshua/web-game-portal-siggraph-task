import * as THREE from 'three';
import { getGlowTexture } from './Textures.js';
import { randRange, TAU } from '../utils/MathUtils.js';

/**
 * A glowing energy crystal. Spins, floats and pulses, and emits a soft additive
 * halo so it reads clearly against the dark corridor. Collecting one awards
 * score + energy (handled by the game) and triggers a particle burst.
 *
 * The crystal mesh material is shared across all instances for efficiency; the
 * halo uses one shared texture.
 */
export class Collectible {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Material} material  Shared crystal material.
   */
  constructor(scene, material) {
    this.scene = scene;
    this.type = 'crystal';
    this.active = false;
    this._t = randRange(0, TAU);

    this.group = new THREE.Group();
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), material);
    this.crystal.scale.set(1, 1.5, 1);
    this.group.add(this.crystal);

    const haloMat = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: 0x6ef2d0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Sprite(haloMat);
    this.halo.scale.set(1.8, 1.8, 1);
    this.group.add(this.halo);
    this._haloMat = haloMat;

    this.group.visible = false;
    scene.add(this.group);
  }

  spawn(x, y, z) {
    this.active = true;
    this.group.visible = true;
    this.group.position.set(x, y, z);
    this._t = randRange(0, TAU);
  }

  update(dt, worldSpeed, elapsed) {
    this.group.position.z += worldSpeed * dt;
    this.crystal.rotation.y += dt * 2.4;
    this.crystal.rotation.x += dt * 0.6;
    const pulse = 1.6 + Math.sin((elapsed + this._t) * 4) * 0.25;
    this.halo.scale.set(pulse, pulse, 1);
  }

  getCollider() {
    return { position: this.group.position, radius: 0.7 };
  }

  deactivate() {
    this.active = false;
    this.group.visible = false;
  }

  dispose() {
    this.scene.remove(this.group);
    this.crystal.geometry.dispose();
    this._haloMat.dispose();
  }
}
