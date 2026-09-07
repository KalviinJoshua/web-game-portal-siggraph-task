/**
 * Central gameplay + rendering tunables for Nebula Runner.
 *
 * Keeping the numbers in one place makes the game easy to balance and keeps
 * the individual systems readable. Distances are in "world units"; the HUD
 * converts them into flavour values (metres / km-h) for display.
 */

// ---- World layout -----------------------------------------------------------
export const LANES = [-3.4, 0, 3.4]; // x position of the LEFT / CENTER / RIGHT lanes
export const LANE_COUNT = LANES.length;
export const CORRIDOR_HALF_HEIGHT = 2.6; // how far up/down the ship may hover

export const SPAWN_Z = -220; // where new objects appear (far ahead)
export const DESPAWN_Z = 16; // objects past this z (behind the camera) are recycled

// ---- Ship -------------------------------------------------------------------
export const SHIP = {
  radius: 0.85, // collision sphere
  laneLerp: 9, // higher = snappier lane switching
  verticalSpeed: 9, // units/sec while holding up/down
  verticalReturn: 4, // how quickly the ship drifts back to centre when idle
  maxTilt: 0.5, // radians of roll when strafing
  maxPitch: 0.28, // radians of pitch when climbing/diving
};

// ---- Speed & difficulty -----------------------------------------------------
export const SPEED = {
  start: 42, // world units / second at the beginning of a run
  max: 135, // hard cap so late game stays controllable
  rampPerSecond: 1.15, // linear acceleration applied while alive
  kmhFactor: 3.1, // world-units/s -> displayed km/h
};

// Difficulty tiers keyed off distance travelled (metres).
export const DIFFICULTY_TIERS = [
  { name: 'EASY', from: 0, color: '#5df2c4' },
  { name: 'MEDIUM', from: 500, color: '#8ad7ff' },
  { name: 'HARD', from: 1500, color: '#ffb25c' },
  { name: 'EXTREME', from: 3000, color: '#ff6b8a' },
];

export const METRES_PER_UNIT = 1.35; // distance travelled -> HUD metres

// ---- Spawning ---------------------------------------------------------------
export const SPAWN = {
  baseInterval: 1.35, // seconds between spawn "rows" at the start
  minInterval: 0.55, // fastest spawn cadence (extreme difficulty)
  intervalRampMetres: 2600, // distance over which cadence tightens to the minimum
  crystalChance: 0.55, // chance a spawn row also carries a crystal
  powerUpChance: 0.14, // chance a spawn row carries a power-up instead of crystal
};

// ---- Player state -----------------------------------------------------------
export const PLAYER = {
  maxHealth: 3,
  startEnergy: 100,
  maxEnergy: 100,
  energyDrainPerSecond: 1.6, // gentle fuel pressure
  energyPerCrystal: 18,
  starvationInterval: 3.5, // seconds between health loss when energy is empty
  invulnerabilityAfterHit: 1.6, // i-frames so a single asteroid can't chain-hit
};

// ---- Scoring ----------------------------------------------------------------
export const SCORE = {
  perMetre: 1.0,
  crystal: 100,
  powerUp: 250,
  boostMultiplier: 2,
};

// ---- Power-ups --------------------------------------------------------------
export const POWERUPS = {
  SHIELD: { id: 'SHIELD', label: 'Shield', duration: 5, color: '#5df2c4', glyph: '◇' },
  BOOST: { id: 'BOOST', label: 'Energy Boost', duration: 8, color: '#ffd15c', glyph: '⚡' },
  TIME: { id: 'TIME', label: 'Time Dilation', duration: 4, color: '#b08aff', glyph: '◷' },
};
export const TIME_DILATION_FACTOR = 0.45; // obstacle speed multiplier while active

// ---- Rendering --------------------------------------------------------------
export const RENDER = {
  maxPixelRatio: 2,
  fov: 62,
  near: 0.1,
  far: 320,
  fogNear: 90,
  fogFar: 300,
  cameraOffset: { x: 0, y: 3.1, z: 9.2 },
  cameraLerp: 5,
};

// ---- Pool sizes (upper bounds on simultaneously-active objects) -------------
export const POOL = {
  asteroids: 26,
  crystals: 16,
  powerups: 4,
};
