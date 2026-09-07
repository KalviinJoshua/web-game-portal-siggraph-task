import * as THREE from 'three';
import { LANES, SHIP, CORRIDOR_HALF_HEIGHT } from './Constants.js';
import { getGlowTexture, getSoftCircleTexture } from './Textures.js';
import { clamp, damp, randRange } from '../utils/MathUtils.js';

/**
 * The player's spacecraft — a small procedural fighter built from primitive
 * geometry (no external models). It owns its own movement feel: smooth lane
 * switching, free vertical hover within the corridor, banking roll/pitch, an
 * animated engine flame + exhaust trail, and a shield bubble for the power-up.
 */
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.laneIndex = 1; // start centre
    this.targetY = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.roll = 0;
    this.pitch = 0;
    this._blink = 0;
    this._disposables = [];

    this._buildShip();
    this._buildEngine();
    this._buildShield();
    scene.add(this.group);
    this.reset();
  }

  _mat(material, geometry) {
    this._disposables.push(material);
    if (geometry) this._disposables.push(geometry);
    return material;
  }

  _buildShip() {
    // Fuselage — an angular 4-sided cone pointing forward (-Z).
    const bodyGeo = new THREE.ConeGeometry(0.55, 2.1, 4);
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.rotateZ(Math.PI / 4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x9fb4e6,
      metalness: 0.7,
      roughness: 0.35,
      flatShading: true,
    });
    this.body = new THREE.Mesh(bodyGeo, this._mat(bodyMat));
    this.group.add(this.body);

    // Swept wings.
    const wingGeo = new THREE.BoxGeometry(1.7, 0.08, 0.7);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x4a5fa8,
      metalness: 0.6,
      roughness: 0.5,
      flatShading: true,
    });
    this._mat(wingMat, wingGeo);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, -0.05, 0.35);
    this.group.add(wing);
    // Vertical tail fin.
    const finGeo = new THREE.BoxGeometry(0.08, 0.5, 0.5);
    const fin = new THREE.Mesh(finGeo, wingMat);
    fin.position.set(0, 0.25, 0.55);
    this.group.add(fin);
    this._disposables.push(finGeo);

    // Glowing cockpit.
    const cockpitGeo = new THREE.SphereGeometry(0.26, 16, 12);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x0a1430,
      emissive: 0x6ee7ff,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.2,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, this._mat(cockpitMat, cockpitGeo));
    cockpit.position.set(0, 0.16, -0.25);
    cockpit.scale.set(1, 0.7, 1.4);
    this.group.add(cockpit);
  }

  _buildEngine() {
    // Engine flame — additive cone that points backward (+Z) and pulses.
    const flameGeo = new THREE.ConeGeometry(0.28, 1.2, 12);
    flameGeo.rotateX(Math.PI / 2); // tip points +Z (behind the ship)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x8fd8ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flame = new THREE.Mesh(flameGeo, this._mat(flameMat, flameGeo));
    this.flame.position.set(0, 0, 1.05);
    this.group.add(this.flame);

    // Soft additive glow behind the engine.
    const glowMat = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: 0x6ee7ff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.engineGlow = new THREE.Sprite(glowMat);
    this.engineGlow.scale.set(2.2, 2.2, 1);
    this.engineGlow.position.set(0, 0, 1.3);
    this.group.add(this.engineGlow);
    this._disposables.push(glowMat);

    // Exhaust trail — a small local-space point stream scrolling backward.
    this._trailCount = 40;
    const positions = new Float32Array(this._trailCount * 3);
    for (let i = 0; i < this._trailCount; i++) {
      positions[i * 3] = randRange(-0.12, 0.12);
      positions[i * 3 + 1] = randRange(-0.12, 0.12);
      positions[i * 3 + 2] = randRange(1.1, 6.0);
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 0.35,
      map: getSoftCircleTexture(),
      color: 0x7fb8ff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.trail = new THREE.Points(trailGeo, trailMat);
    this.group.add(this.trail);
    this._mat(trailMat, trailGeo);
  }

  _buildShield() {
    const geo = new THREE.SphereGeometry(1.5, 24, 18);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x5df2c4,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });
    this.shield = new THREE.Mesh(geo, this._mat(mat, geo));
    this.shieldActive = false;
    this.group.add(this.shield);
  }

  // ---- Public control -------------------------------------------------------

  reset() {
    this.laneIndex = 1;
    this.targetY = 0;
    this.group.position.set(LANES[1], 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.roll = 0;
    this.pitch = 0;
    this.prevX = LANES[1];
    this.prevY = 0;
    this.invulnerable = false;
    this._blink = 0;
    this.setShield(false);
    this.setVisible(true);
  }

  moveLeft() {
    this.laneIndex = Math.max(0, this.laneIndex - 1);
  }

  moveRight() {
    this.laneIndex = Math.min(LANES.length - 1, this.laneIndex + 1);
  }

  setShield(active) {
    this.shieldActive = active;
  }

  setInvulnerable(active) {
    this.invulnerable = active;
    if (!active) this.setVisible(true);
  }

  setVisible(v) {
    this.body.visible = v;
  }

  /** Collision volume in world space (the group lives at scene root). */
  getCollider() {
    return { position: this.group.position, radius: SHIP.radius };
  }

  /**
   * @param {number} dt
   * @param {{ vertical:number }} input  vertical: +1 up, -1 down, 0 idle
   * @param {number} elapsed  seconds since run start (for idle animation)
   * @param {number} speedNorm 0..1 normalised speed (drives flame length)
   */
  update(dt, input, elapsed, speedNorm = 0) {
    const pos = this.group.position;

    // Horizontal lane easing.
    const targetX = LANES[this.laneIndex];
    pos.x = damp(pos.x, targetX, SHIP.laneLerp, dt);

    // Vertical free hover, returning to centre when no input is held.
    if (input.vertical !== 0) {
      this.targetY += input.vertical * SHIP.verticalSpeed * dt;
    } else {
      this.targetY = damp(this.targetY, 0, SHIP.verticalReturn, dt);
    }
    this.targetY = clamp(this.targetY, -CORRIDOR_HALF_HEIGHT, CORRIDOR_HALF_HEIGHT);
    const bob = Math.sin(elapsed * 1.8) * 0.06; // subtle idle float
    pos.y = damp(pos.y, this.targetY + bob, 10, dt);

    // Banking from actual velocity for a natural, smooth feel.
    const vx = (pos.x - this.prevX) / Math.max(dt, 1e-4);
    const vy = (pos.y - this.prevY) / Math.max(dt, 1e-4);
    const rollTarget = clamp(-vx * 0.055, -SHIP.maxTilt, SHIP.maxTilt);
    const pitchTarget = clamp(-vy * 0.05, -SHIP.maxPitch, SHIP.maxPitch);
    this.roll = damp(this.roll, rollTarget, 8, dt);
    this.pitch = damp(this.pitch, pitchTarget, 8, dt);
    this.group.rotation.z = this.roll;
    this.group.rotation.x = this.pitch;
    this.prevX = pos.x;
    this.prevY = pos.y;

    this._animateEngine(dt, elapsed, speedNorm);
    this._animateShield(dt, elapsed);

    // i-frame blink so the ship reads as "hurt" without disappearing.
    if (this.invulnerable) {
      this._blink += dt;
      this.body.visible = Math.sin(this._blink * 28) > -0.2;
    }
  }

  _animateEngine(dt, elapsed, speedNorm) {
    const pulse = 1 + Math.sin(elapsed * 26) * 0.12;
    const len = 1 + speedNorm * 0.9;
    this.flame.scale.set(pulse, pulse, pulse * len);
    this.flame.material.opacity = 0.75 + Math.sin(elapsed * 40) * 0.1;
    const glow = 1.9 + speedNorm * 0.8 + Math.sin(elapsed * 18) * 0.15;
    this.engineGlow.scale.set(glow, glow, 1);

    // Scroll exhaust points backward and recycle.
    const arr = this.trail.geometry.attributes.position.array;
    const back = (6 + speedNorm * 10) * dt;
    for (let i = 0; i < this._trailCount; i++) {
      let z = arr[i * 3 + 2] + back;
      if (z > 6.2) {
        z = 1.1;
        arr[i * 3] = randRange(-0.12, 0.12);
        arr[i * 3 + 1] = randRange(-0.12, 0.12);
      }
      arr[i * 3 + 2] = z;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
  }

  _animateShield(dt, elapsed) {
    const target = this.shieldActive ? 0.5 + Math.sin(elapsed * 6) * 0.12 : 0;
    this.shield.material.opacity = damp(this.shield.material.opacity, target, 10, dt);
    this.shield.rotation.y += dt * 1.4;
    this.shield.rotation.x += dt * 0.8;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const d of this._disposables) d.dispose?.();
    this._disposables.length = 0;
  }
}
