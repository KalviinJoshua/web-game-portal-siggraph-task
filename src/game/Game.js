import * as THREE from 'three';
import {
  RENDER,
  SPEED,
  PLAYER,
  SCORE,
  POWERUPS,
  POOL,
  DESPAWN_Z,
  TIME_DILATION_FACTOR,
  METRES_PER_UNIT,
} from './Constants.js';
import { STATE, GameData } from './GameState.js';
import { ObjectPool } from './ObjectPool.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Asteroid } from './Obstacle.js';
import { Collectible } from './Collectible.js';
import { PowerUp } from './PowerUp.js';
import { Effects } from './Effects.js';
import { InputManager } from './InputManager.js';
import { CollisionManager } from './CollisionManager.js';
import { SpawnManager } from './SpawnManager.js';
import { disposeTextures } from './Textures.js';
import { Storage } from '../utils/Storage.js';
import { clamp, damp, randRange, pick } from '../utils/MathUtils.js';
import { clampDelta, prefersReducedMotion } from '../utils/Performance.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Game — the single owner of the Three.js renderer, scene, camera and every
 * gameplay system. It runs one animation loop (driven by delta time) and
 * exposes a small control surface (init/start/pause/resume/restart/exit) plus
 * hooks the UI layer subscribes to for HUD updates and state changes.
 */
export class Game {
  /**
   * @param {HTMLElement} container  Element the canvas is mounted into.
   * @param {object} hooks           UI callbacks (see AppController).
   */
  constructor(container, hooks = {}) {
    this.container = container;
    this.hooks = hooks;
    this.state = STATE.MENU;
    this.reducedMotion = prefersReducedMotion();

    this.data = new GameData(Storage.getHighScore());
    this.input = new InputManager();

    this._raf = 0;
    this._lastTime = 0;
    this._shake = 0;
    this._idleTime = 0;
    this._hudAccum = 0;
    this._starve = 0;
    this._disposables = [];
    this._powerups = { ready: null, active: { SHIELD: 0, BOOST: 0, TIME: 0 } };

    this._tick = this._tick.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  // ---- Initialisation -------------------------------------------------------

  async init() {
    this._setState(STATE.LOADING);
    const progress = (p, label) => this.hooks.onLoadProgress?.(p, label);

    progress(0.1, 'RENDERER');
    this._initRenderer();
    this._initSceneCamera();
    await sleep(140);

    progress(0.4, '3D ENVIRONMENT');
    this.world = new World(this.scene, { lowFx: this.reducedMotion });
    await sleep(160);

    progress(0.7, 'SPACECRAFT');
    this.player = new Player(this.scene);
    this.effects = new Effects(this.scene);
    await sleep(140);

    progress(0.9, 'GAME SYSTEMS');
    this._initPools();
    this.spawner = new SpawnManager(this.pools);
    this.collisions = new CollisionManager();
    this._bindInput();
    this.input.attach();
    // Bound once so the per-frame collision pass allocates nothing.
    this._collHandlers = {
      onAsteroid: (a) => this._onAsteroid(a),
      onCrystal: (c) => this._onCrystal(c),
      onPowerUp: (p) => this._onPowerUp(p),
    };
    window.addEventListener('resize', this._onResize);
    this._onResize();
    await sleep(120);

    progress(1, 'SYSTEM READY');
    this._lastTime = performance.now();
    this._raf = requestAnimationFrame(this._tick);
    this._setState(STATE.READY);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
    this.renderer.setClearColor(0x03040c, 1);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.renderer.domElement);
    // Pause gracefully if the GPU context is lost.
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.state === STATE.PLAYING) this.pause();
    });
  }

  _initSceneCamera() {
    this.scene = new THREE.Scene();
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera = new THREE.PerspectiveCamera(RENDER.fov, (w || 1) / (h || 1), RENDER.near, RENDER.far);
    this.camera.position.set(0, RENDER.cameraOffset.y, RENDER.cameraOffset.z);
    this.camera.lookAt(0, 0, -8);
  }

  _initPools() {
    // Shared materials — created once and reused by every pooled entity.
    const rockMats = [
      new THREE.MeshStandardMaterial({ color: 0x9a93a6, roughness: 0.95, metalness: 0.05, flatShading: true, emissive: 0x161326 }),
      new THREE.MeshStandardMaterial({ color: 0xac9686, roughness: 0.98, metalness: 0.04, flatShading: true, emissive: 0x181018 }),
      new THREE.MeshStandardMaterial({ color: 0x7f8bb0, roughness: 0.9, metalness: 0.08, flatShading: true, emissive: 0x101a2e }),
    ];
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x0b2a2a,
      emissive: 0x4ef2c8,
      emissiveIntensity: 1.6,
      metalness: 0.3,
      roughness: 0.15,
      flatShading: true,
    });
    this._disposables.push(...rockMats, crystalMat);

    this.pools = {
      asteroids: new ObjectPool(() => new Asteroid(this.scene, pick(rockMats)), POOL.asteroids),
      crystals: new ObjectPool(() => new Collectible(this.scene, crystalMat), POOL.crystals),
      powerups: new ObjectPool(() => new PowerUp(this.scene), POOL.powerups),
    };
  }

  _bindInput() {
    this.input
      .on('lane', (dir) => {
        if (this.state !== STATE.PLAYING) return;
        dir < 0 ? this.player.moveLeft() : this.player.moveRight();
      })
      .on('use', () => {
        if (this.state === STATE.PLAYING) this._useReadyPowerUp();
      })
      .on('pause', () => this.togglePause());
  }

  /** Give the InputManager references to the on-screen touch buttons. */
  attachTouchControls(map) {
    this.input.attachTouch(map);
  }

  // ---- State transitions ----------------------------------------------------

  _setState(next) {
    this.state = next;
    this.input.setActive(next === STATE.PLAYING);
    this.hooks.onStateChange?.(next);
  }

  _resetRun() {
    this.data.reset();
    this.player.reset();
    this.pools.asteroids.releaseAll();
    this.pools.crystals.releaseAll();
    this.pools.powerups.releaseAll();
    this.spawner.reset();
    this._powerups.ready = null;
    this._powerups.active = { SHIELD: 0, BOOST: 0, TIME: 0 };
    this._shake = 0;
    this._starve = 0;
    this._invuln = 0;
    this._lastTime = performance.now();
  }

  /** Begin a fresh run from the start screen. */
  start() {
    if (this.state === STATE.PLAYING) return;
    this._resetRun();
    this._setState(STATE.PLAYING);
  }

  /** Restart after game over / from the pause menu. */
  restart() {
    this._resetRun();
    this._setState(STATE.PLAYING);
  }

  togglePause() {
    if (this.state === STATE.PLAYING) this.pause();
    else if (this.state === STATE.PAUSED) this.resume();
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this._setState(STATE.PAUSED);
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this._lastTime = performance.now(); // avoid a huge dt jump on resume
    this._setState(STATE.PLAYING);
  }

  // ---- Power-ups ------------------------------------------------------------

  _collectPowerUp(type) {
    this._powerups.ready = type;
    const def = POWERUPS[type];
    this.hooks.onToast?.(`${def.label} — press USE`, def.color);
  }

  _useReadyPowerUp() {
    const type = this._powerups.ready;
    if (!type) return;
    this._powerups.ready = null;
    this._powerups.active[type] = POWERUPS[type].duration;
    if (type === 'SHIELD') this.player.setShield(true);
    this.effects.powerBurst(this.player.group.position, POWERUPS[type].color);
    this.hooks.onToast?.(`${POWERUPS[type].label} ACTIVE`, POWERUPS[type].color);
  }

  _updatePowerUps(dt) {
    const a = this._powerups.active;
    for (const type of Object.keys(a)) {
      if (a[type] > 0) {
        a[type] = Math.max(0, a[type] - dt);
        if (a[type] === 0 && type === 'SHIELD') this.player.setShield(false);
      }
    }
    this.data.multiplier = a.BOOST > 0 ? SCORE.boostMultiplier : 1;
  }

  get _obstacleSpeed() {
    return this.data.speed * (this._powerups.active.TIME > 0 ? TIME_DILATION_FACTOR : 1);
  }

  // ---- Collision handlers ---------------------------------------------------

  _onAsteroid(a) {
    const pos = a.mesh.position;
    if (this._powerups.active.SHIELD > 0) {
      this.effects.explosion(pos);
      this.pools.asteroids.release(a);
      this._addShake(0.25);
      return; // shield absorbs the impact
    }
    if (this._invuln > 0) return; // still in post-hit i-frames
    this.effects.explosion(pos);
    this.pools.asteroids.release(a);
    this.data.health -= 1;
    this._invuln = PLAYER.invulnerabilityAfterHit;
    this.player.setInvulnerable(true);
    this._addShake(0.7);
    this.hooks.onDamage?.();
    if (this.data.health <= 0) this._gameOver();
  }

  _onCrystal(c) {
    this.effects.collect(c.group.position);
    this.pools.crystals.release(c);
    this.data.score += SCORE.crystal * this.data.multiplier;
    this.data.energy = clamp(this.data.energy + PLAYER.energyPerCrystal, 0, PLAYER.maxEnergy);
  }

  _onPowerUp(p) {
    const type = p.powerType;
    this.effects.powerBurst(p.group.position, POWERUPS[type].color);
    this.pools.powerups.release(p);
    this.data.score += SCORE.powerUp * this.data.multiplier;
    this._collectPowerUp(type);
  }

  _addShake(amount) {
    if (this.reducedMotion) return;
    this._shake = Math.min(1, this._shake + amount);
  }

  _gameOver() {
    const prevBest = this.data.highScore;
    const score = Math.floor(this.data.score);
    const best = Storage.setHighScore(score);
    this.data.highScore = best;
    this.player.setShield(false);
    this.player.setInvulnerable(false);
    this._setState(STATE.GAME_OVER);
    this.hooks.onGameOver?.({
      score,
      metres: this.data.metres,
      best,
      isNewBest: score > prevBest && score > 0,
    });
  }

  // ---- Main loop ------------------------------------------------------------

  _tick(now) {
    this._raf = requestAnimationFrame(this._tick);
    const dt = clampDelta((now - this._lastTime) / 1000);
    this._lastTime = now;
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    if (this.state === STATE.PLAYING) this._simulate(dt);
    else if (this.state === STATE.READY || this.state === STATE.GAME_OVER) this._idle(dt);
    // PAUSED / LOADING: hold the last frame (no simulation, but still rendered).
  }

  /** Gentle ambient motion for the start + game-over screens. */
  _idle(dt) {
    this._idleTime += dt;
    this.world.update(dt, SPEED.start * 0.5);
    this.player.update(dt, { vertical: 0 }, this._idleTime, 0.2);
    this.effects.update(dt);
    this._updateCamera(dt);
  }

  _simulate(dt) {
    const data = this.data;
    data.elapsed += dt;

    // Speed ramps up over the run (hard-capped so it stays playable).
    data.speed = Math.min(SPEED.max, data.speed + SPEED.rampPerSecond * dt);
    const worldSpeed = data.speed;
    const obstacleSpeed = this._obstacleSpeed;

    // Distance travelled + passive distance score (scaled by boost multiplier).
    data.distanceUnits += worldSpeed * dt;
    data.score += worldSpeed * dt * METRES_PER_UNIT * SCORE.perMetre * data.multiplier;

    this._updateEnergy(dt);
    this._updatePowerUps(dt);

    // Post-hit invulnerability countdown.
    if (this._invuln > 0) {
      this._invuln -= dt;
      if (this._invuln <= 0) this.player.setInvulnerable(false);
    }
    // Advance the world + ship.
    this.world.update(dt, worldSpeed);
    const speedNorm = clamp((data.speed - SPEED.start) / (SPEED.max - SPEED.start), 0, 1);
    this.player.update(dt, { vertical: this.input.vertical }, data.elapsed, speedNorm);

    // Spawn new rows, advance + recycle pooled objects, then test collisions.
    this.spawner.update(dt, data);
    this._advancePools(dt, obstacleSpeed, data.elapsed);
    this.collisions.check(this.player.getCollider(), this.pools, this._collHandlers);

    this.effects.update(dt);
    this._updateCamera(dt);
    this._emitHud(dt);
  }

  _updateEnergy(dt) {
    const data = this.data;
    if (data.energy > 0) {
      data.energy = Math.max(0, data.energy - PLAYER.energyDrainPerSecond * dt);
      this._starve = 0;
      return;
    }
    // Out of energy: lose a heart on a slow, predictable cadence.
    this._starve += dt;
    if (this._starve >= PLAYER.starvationInterval) {
      this._starve -= PLAYER.starvationInterval;
      data.health -= 1;
      this._addShake(0.4);
      this.hooks.onToast?.('ENERGY DEPLETED', '#ff5c7a');
      this.hooks.onDamage?.();
      if (data.health <= 0) this._gameOver();
    }
  }

  _advancePools(dt, obstacleSpeed, elapsed) {
    this.pools.asteroids.forEach((a) => {
      a.update(dt, obstacleSpeed);
      if (a.mesh.position.z > DESPAWN_Z) this.pools.asteroids.release(a);
    });
    this.pools.crystals.forEach((c) => {
      c.update(dt, obstacleSpeed, elapsed);
      if (c.group.position.z > DESPAWN_Z) this.pools.crystals.release(c);
    });
    this.pools.powerups.forEach((p) => {
      p.update(dt, obstacleSpeed, elapsed);
      if (p.group.position.z > DESPAWN_Z) this.pools.powerups.release(p);
    });
  }
  // ---- Camera + HUD ---------------------------------------------------------

  _updateCamera(dt) {
    const off = RENDER.cameraOffset;
    const px = this.player.group.position.x;
    const py = this.player.group.position.y;
    // Soft follow so the ship leads slightly without the corridor swinging wildly.
    this.camera.position.x = damp(this.camera.position.x, off.x + px * 0.35, RENDER.cameraLerp, dt);
    this.camera.position.y = damp(this.camera.position.y, off.y + py * 0.25, RENDER.cameraLerp, dt);
    this.camera.position.z = off.z;

    // Screen shake: exponential decay applied as a tiny positional jitter.
    if (this._shake > 0.001) {
      this._shake = damp(this._shake, 0, 6, dt);
      const s = this._shake * 0.5;
      this.camera.position.x += randRange(-s, s);
      this.camera.position.y += randRange(-s, s);
    } else {
      this._shake = 0;
    }
    this.camera.lookAt(px * 0.2, py * 0.2, -12);
  }

  _emitHud(dt) {
    this._hudAccum += dt;
    if (this._hudAccum < 0.05) return; // ~20 Hz is plenty for text updates
    this._hudAccum = 0;
    const data = this.data;
    this.hooks.onHud?.({
      score: Math.floor(data.score),
      metres: data.metres,
      best: Math.max(data.highScore, Math.floor(data.score)),
      health: data.health,
      maxHealth: PLAYER.maxHealth,
      energy: data.energy,
      maxEnergy: PLAYER.maxEnergy,
      kmh: data.kmh,
      difficulty: data.difficulty,
      ready: this._powerups.ready,
      active: this._powerups.active,
    });
  }
  // ---- Lifecycle ------------------------------------------------------------

  _onResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Tear everything down and free GPU resources (called on exit to the hub). */
  dispose() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    window.removeEventListener('resize', this._onResize);
    this.input.dispose();
    this.world?.dispose();
    this.player?.dispose();
    this.effects?.dispose();
    this.pools?.asteroids.dispose();
    this.pools?.crystals.dispose();
    this.pools?.powerups.dispose();
    for (const d of this._disposables) d.dispose?.();
    this._disposables.length = 0;
    disposeTextures();
    const canvas = this.renderer?.domElement;
    this.renderer?.dispose();
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    this.scene = null;
    this.state = STATE.MENU;
    this.hooks.onStateChange?.(STATE.MENU);
  }
}
