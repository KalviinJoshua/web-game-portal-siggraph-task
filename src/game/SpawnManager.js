import { LANES, SPAWN, SPAWN_Z } from './Constants.js';
import { clamp, lerp, randRange, randInt, pick, chance } from '../utils/MathUtils.js';

const POWER_TYPES = ['SHIELD', 'SHIELD', 'BOOST', 'BOOST', 'TIME']; // weighted bag

/**
 * Procedural spawn director.
 *
 * On a cadence that tightens with difficulty, it emits a "row" built from one
 * of several hand-tuned patterns. Every pattern guarantees at least one clear
 * lane, so the game is always fair — it never asks the player to dodge an
 * impossible wall. Rewards (crystals, power-ups) are steered into safe lanes.
 */
export class SpawnManager {
  constructor(pools) {
    this.pools = pools;
    this.reset();
  }

  reset() {
    this.timer = 0;
    this.warmup = 1.5; // brief calm at the very start of a run
  }

  update(dt, data) {
    if (this.warmup > 0) {
      this.warmup -= dt;
      return;
    }
    this.timer += dt;
    const progress = clamp(data.metres / SPAWN.intervalRampMetres, 0, 1);
    const interval = lerp(SPAWN.baseInterval, SPAWN.minInterval, progress);
    if (this.timer >= interval) {
      this.timer = 0;
      this._spawnRow(data);
    }
  }

  // ---- Spawn helpers --------------------------------------------------------

  _scale(data) {
    return clamp(randRange(0.85, 1.35) + data.intensity * randRange(0.1, 0.9), 0.8, 2.4);
  }

  _asteroid(laneIndex, scale, zOffset = 0, drift = false) {
    const a = this.pools.asteroids.acquire();
    if (!a) return;
    a.spawn(LANES[laneIndex], 0, SPAWN_Z - zOffset, scale);
    if (drift) {
      const target = LANES[1];
      const dir = Math.sign(target - LANES[laneIndex]) || 1;
      a.setDrift(dir * randRange(0.9, 1.4), Math.min(LANES[laneIndex], target), Math.max(LANES[laneIndex], target));
    }
  }

  _crystal(laneIndex, zOffset = 0) {
    const c = this.pools.crystals.acquire();
    if (!c) return;
    c.spawn(LANES[laneIndex], randRange(-0.2, 0.9), SPAWN_Z - zOffset);
  }

  _powerup(laneIndex, zOffset = 0) {
    const p = this.pools.powerups.acquire();
    if (!p) return;
    p.spawn(pick(POWER_TYPES), LANES[laneIndex], 0.4, SPAWN_Z - zOffset);
  }

  /** Drop a crystal (or, more rarely, a power-up) into one of the safe lanes. */
  _maybeReward(freeLanes) {
    if (!freeLanes.length) return;
    const lane = pick(freeLanes);
    if (chance(SPAWN.powerUpChance)) this._powerup(lane);
    else if (chance(SPAWN.crystalChance)) this._crystal(lane);
  }

  _freeExcept(blocked) {
    return [0, 1, 2].filter((l) => !blocked.includes(l));
  }

  // ---- Patterns -------------------------------------------------------------

  _spawnRow(data) {
    const t = data.intensity;
    const weights = {
      single: 1.0,
      crystalRun: 0.75,
      gap: 0.2 + t * 0.9,
      drift: t > 0.15 ? 0.2 + t * 0.7 : 0,
      corridor: 0.15 + t * 0.35,
    };
    const pattern = this._weightedPick(weights);
    this[`_pattern_${pattern}`](data);
  }

  _weightedPick(weights) {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [key, w] of entries) {
      if ((r -= w) <= 0) return key;
    }
    return entries[0][0];
  }

  /** One asteroid, two open lanes. */
  _pattern_single(data) {
    const lane = randInt(0, 2);
    this._asteroid(lane, this._scale(data));
    this._maybeReward(this._freeExcept([lane]));
  }

  /** Two lanes blocked, a single gap to thread. */
  _pattern_gap(data) {
    const gap = randInt(0, 2);
    for (const lane of this._freeExcept([gap])) this._asteroid(lane, this._scale(data));
    // reward tends to sit in the gap so threading it pays off
    if (chance(0.6)) this._crystal(gap, 4);
    else this._maybeReward([gap]);
  }

  /** An asteroid that drifts from an edge toward the centre (far edge stays safe). */
  _pattern_drift(data) {
    const startEdge = chance(0.5) ? 0 : 2;
    this._asteroid(startEdge, this._scale(data), 0, true);
    const safe = startEdge === 0 ? 2 : 0;
    this._maybeReward([safe]);
  }

  /** An asteroid plus a trailing line of crystals in a safe lane. */
  _pattern_crystalRun(data) {
    const lane = randInt(0, 2);
    this._asteroid(lane, this._scale(data));
    const rewardLane = pick(this._freeExcept([lane]));
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) this._crystal(rewardLane, i * 6);
  }

  /** Risk/reward: a power-up in the open lane, asteroids flanking it. */
  _pattern_corridor(data) {
    const open = randInt(0, 2);
    for (const lane of this._freeExcept([open])) this._asteroid(lane, this._scale(data));
    this._powerup(open);
  }
}
