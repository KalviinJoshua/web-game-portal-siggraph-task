import * as THREE from 'three';
import { getGlowTexture } from './Textures.js';
import { POWERUPS } from './Constants.js';
import { randRange, TAU } from '../utils/MathUtils.js';

/**
 * A collectible power-up. One pooled instance can represent any of the three
 * power-up types (Shield / Energy Boost / Time Dilation); on spawn it swaps its
 * core geometry and re-tints its materials so each type is visually distinct:
 *
 *   SHIELD -> faceted orb   (teal)
 *   BOOST  -> energy cube   (amber)
 *   TIME   -> spindle       (violet)
 *
 * A rotating ring + additive halo make power-ups pop against asteroids.
 */
export class PowerUp {
  constructor(scene) {
    this.scene = scene;
    this.type = 'powerup';
    this.active = false;
    this.powerType = 'SHIELD';
    this._t = randRange(0, TAU);

    this.group = new THREE.Group();

    // Distinct core shapes, created once and swapped in per type.
    this._cores = {
      SHIELD: new THREE.IcosahedronGeometry(0.4, 0),
      BOOST: new THREE.BoxGeometry(0.5, 0.5, 0.5),
      TIME: new THREE.OctahedronGeometry(0.42, 0),
    };
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a1024,
      emissive: 0x5df2c4,
      emissiveIntensity: 1.6,
      metalness: 0.3,
      roughness: 0.25,
      flatShading: true,
    });
    this.core = new THREE.Mesh(this._cores.SHIELD, this.coreMat);
    this.group.add(this.core);

    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0x5df2c4,
      emissive: 0x5df2c4,
      emissiveIntensity: 1.1,
      metalness: 0.4,
      roughness: 0.4,
    });
    this.ringGeo = new THREE.TorusGeometry(0.62, 0.05, 8, 28);
    this.ring = new THREE.Mesh(this.ringGeo, this.ringMat);
    this.group.add(this.ring);

    this.haloMat = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: 0x5df2c4,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Sprite(this.haloMat);
    this.halo.scale.set(2.2, 2.2, 1);
    this.group.add(this.halo);

    this.group.visible = false;
    scene.add(this.group);
  }

  spawn(type, x, y, z) {
    this.active = true;
    this.powerType = POWERUPS[type] ? type : 'SHIELD';
    const color = new THREE.Color(POWERUPS[this.powerType].color);
    this.core.geometry = this._cores[this.powerType];
    this.coreMat.emissive.copy(color);
    this.ringMat.color.copy(color);
    this.ringMat.emissive.copy(color);
    this.haloMat.color.copy(color);
    this.group.visible = true;
    this.group.position.set(x, y, z);
    this._t = randRange(0, TAU);
  }

  update(dt, worldSpeed, elapsed) {
    this.group.position.z += worldSpeed * dt;
    this.core.rotation.y += dt * 1.8;
    this.core.rotation.x += dt * 0.9;
    this.ring.rotation.z += dt * 2.2;
    this.ring.rotation.x = Math.PI * 0.5 + Math.sin(elapsed * 2) * 0.4;
    const pulse = 2 + Math.sin((elapsed + this._t) * 5) * 0.3;
    this.halo.scale.set(pulse, pulse, 1);
  }

  getCollider() {
    return { position: this.group.position, radius: 0.8 };
  }

  deactivate() {
    this.active = false;
    this.group.visible = false;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const g of Object.values(this._cores)) g.dispose();
    this.ringGeo.dispose();
    this.coreMat.dispose();
    this.ringMat.dispose();
    this.haloMat.dispose();
  }
}
