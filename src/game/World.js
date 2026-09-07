import * as THREE from 'three';
import { RENDER, SPAWN_Z, DESPAWN_Z } from './Constants.js';
import { getGlowTexture, getSoftCircleTexture } from './Textures.js';
import { randRange } from '../utils/MathUtils.js';

/**
 * The procedural space environment: starfields, drifting nebula clouds, a few
 * distant planets, fog and lighting.
 *
 * Everything is built once and animated in place. Stars use THREE.Points (a
 * single draw call for thousands of points) rather than individual meshes, and
 * a near "streak" layer scrolls toward the camera to sell forward motion.
 */
export class World {
  /**
   * @param {THREE.Scene} scene
   * @param {{ lowFx?: boolean }} [opts]
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.lowFx = !!opts.lowFx;
    this._disposables = [];

    scene.background = new THREE.Color(0x03040c);
    scene.fog = new THREE.Fog(0x05061a, RENDER.fogNear, RENDER.fogFar);

    this._buildLights();
    this._buildFarStars();
    this._buildStreakStars();
    this._buildNebula();
    this._buildPlanets();
  }

  _track(material, geometry) {
    if (material) this._disposables.push(material);
    if (geometry) this._disposables.push(geometry);
  }

  _buildLights() {
    const ambient = new THREE.AmbientLight(0x8899ff, 0.55);
    const key = new THREE.DirectionalLight(0xbfe0ff, 1.15);
    key.position.set(-4, 8, 6);
    const rim = new THREE.DirectionalLight(0xb08aff, 0.5);
    rim.position.set(6, -3, -8);
    this.scene.add(ambient, key, rim);
  }

  _buildFarStars() {
    const count = this.lowFx ? 900 : 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x9ec5ff),
      new THREE.Color(0xffd9a8),
      new THREE.Color(0xc9b3ff),
    ];
    for (let i = 0; i < count; i++) {
      // distribute on a large sphere shell around the player
      const r = randRange(120, 260);
      const theta = randRange(0, Math.PI * 2);
      const phi = Math.acos(randRange(-1, 1));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[(Math.random() * palette.length) | 0];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.4,
      map: getSoftCircleTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.farStars = new THREE.Points(geo, mat);
    this.scene.add(this.farStars);
    this._track(mat, geo);
  }

  /**
   * Near starfield that scrolls toward the camera and wraps around, creating
   * the sensation of speed. The scroll rate is driven by the ship's velocity.
   */
  _buildStreakStars() {
    const count = this.lowFx ? 260 : 520;
    this._streakCount = count;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = randRange(-55, 55);
      positions[i * 3 + 1] = randRange(-32, 32);
      positions[i * 3 + 2] = randRange(SPAWN_Z, DESPAWN_Z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.9,
      map: getSoftCircleTexture(),
      color: 0xbcd4ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.streakStars = new THREE.Points(geo, mat);
    this.scene.add(this.streakStars);
    this._track(mat, geo);
  }

  _buildNebula() {
    this.nebulae = [];
    if (this.lowFx) return; // nebula clouds are decorative — skip on low FX
    const colors = [0x5a7bff, 0xb08aff, 0x3fd0c9];
    const tex = getGlowTexture();
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: colors[i],
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = randRange(90, 150);
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(randRange(-60, 60), randRange(-30, 30), randRange(-200, -120));
      this.scene.add(sprite);
      this.nebulae.push(sprite);
      this._disposables.push(mat);
    }
  }

  _buildPlanets() {
    this.planets = [];
    const defs = [
      { radius: 16, color: 0x3a4a8c, emissive: 0x1a2350, x: -58, y: 20, z: -170 },
      { radius: 10, color: 0x7a4a6c, emissive: 0x2a1030, x: 52, y: -22, z: -140 },
    ];
    for (const d of defs) {
      const geo = new THREE.IcosahedronGeometry(d.radius, this.lowFx ? 1 : 2);
      const mat = new THREE.MeshStandardMaterial({
        color: d.color,
        emissive: d.emissive,
        emissiveIntensity: 0.4,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
      });
      const planet = new THREE.Mesh(geo, mat);
      planet.position.set(d.x, d.y, d.z);
      this.scene.add(planet);
      this.planets.push(planet);
      this._track(mat, geo);
    }
  }

  /**
   * Animate the environment.
   * @param {number} dt      Delta time in seconds.
   * @param {number} speed   Ship velocity (world units/sec) — scrolls streaks.
   */
  update(dt, speed) {
    // Slow parallax rotation of the distant shell.
    this.farStars.rotation.y += dt * 0.006;
    this.farStars.rotation.x += dt * 0.002;

    // Scroll near stars toward the camera and wrap them back to the front.
    const pos = this.streakStars.geometry.attributes.position;
    const arr = pos.array;
    const travel = speed * dt;
    for (let i = 0; i < this._streakCount; i++) {
      let z = arr[i * 3 + 2] + travel;
      if (z > DESPAWN_Z) {
        z += SPAWN_Z - DESPAWN_Z;
        arr[i * 3] = randRange(-55, 55);
        arr[i * 3 + 1] = randRange(-32, 32);
      }
      arr[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;

    // Gentle drift on nebula + planets for a living backdrop.
    for (const n of this.nebulae) n.material.rotation += dt * 0.02;
    for (const p of this.planets) {
      p.rotation.y += dt * 0.03;
      p.rotation.x += dt * 0.008;
    }
  }

  dispose() {
    this.scene.background = null;
    this.scene.fog = null;
    const remove = (obj) => obj && this.scene.remove(obj);
    remove(this.farStars);
    remove(this.streakStars);
    this.nebulae.forEach(remove);
    this.planets.forEach(remove);
    // Remove lights too.
    for (const child of [...this.scene.children]) {
      if (child.isLight) this.scene.remove(child);
    }
    for (const d of this._disposables) d.dispose?.();
    this._disposables.length = 0;
  }
}
