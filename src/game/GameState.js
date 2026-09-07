import { DIFFICULTY_TIERS, METRES_PER_UNIT, PLAYER, SPEED } from './Constants.js';
import { safeNumber } from '../utils/MathUtils.js';

/**
 * The finite set of states the game can be in. Keeping these as explicit
 * constants (rather than scattered booleans) makes the flow easy to follow:
 *
 *   MENU -> LOADING -> READY -> PLAYING <-> PAUSED -> GAME_OVER -> READY ...
 */
export const STATE = Object.freeze({
  MENU: 'MENU', // on the hub, game not created yet
  LOADING: 'LOADING', // building the Three.js scene
  READY: 'READY', // start screen ("START RUN")
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
});

/**
 * Plain data container for a single run. All mutable gameplay values live here
 * so any UI element (HUD, game-over screen) reads from one source of truth and
 * `reset()` guarantees a completely clean restart.
 */
export class GameData {
  constructor(highScore = 0) {
    this.highScore = safeNumber(highScore, 0);
    this.reset();
  }

  reset() {
    this.score = 0;
    this.distanceUnits = 0; // raw world units travelled
    this.speed = SPEED.start; // world units / second
    this.health = PLAYER.maxHealth;
    this.energy = PLAYER.startEnergy;
    this.multiplier = 1; // becomes boostMultiplier while Energy Boost is active
    this.elapsed = 0; // seconds this run has been active
  }

  /** Distance in flavour "metres" for the HUD. */
  get metres() {
    return Math.floor(this.distanceUnits * METRES_PER_UNIT);
  }

  /** Speed in flavour "km/h" for the HUD. */
  get kmh() {
    return Math.round(this.speed * SPEED.kmhFactor);
  }

  /** Current difficulty tier object based on distance travelled. */
  get difficulty() {
    const m = this.metres;
    let tier = DIFFICULTY_TIERS[0];
    for (const t of DIFFICULTY_TIERS) if (m >= t.from) tier = t;
    return tier;
  }

  /** Normalised 0..1 progress used to scale spawn cadence + speed. */
  get intensity() {
    return Math.min(1, this.metres / 3000);
  }
}
