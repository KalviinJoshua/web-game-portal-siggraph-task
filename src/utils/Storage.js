/**
 * Safe persistence layer.
 *
 * All access to localStorage is wrapped so the game keeps working when storage
 * is unavailable (private mode, disabled cookies, quota errors). When that
 * happens we transparently fall back to an in-memory store for the session, so
 * scores still behave sensibly until the tab is closed.
 */

const PREFIX = 'nebula-runner:';
const HIGH_SCORE_KEY = `${PREFIX}highScore`;
const LEADERBOARD_KEY = `${PREFIX}leaderboard`;
const LAST_NAME_KEY = `${PREFIX}callsign`;

// In-memory fallback used only when localStorage throws.
const memory = new Map();
let storageAvailable = null;

function detectStorage() {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const probe = `${PREFIX}__probe__`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

function readRaw(key) {
  if (detectStorage()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  return memory.has(key) ? memory.get(key) : null;
}

function writeRaw(key, value) {
  if (detectStorage()) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memory.set(key, value);
}

/** Parse JSON defensively; returns `fallback` on any problem. */
function readJSON(key, fallback) {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

// ---- Public API -------------------------------------------------------------

export const Storage = {
  isPersistent() {
    return detectStorage();
  },

  /** Personal best score. Always returns a clean, non-negative integer. */
  getHighScore() {
    const value = Number(readJSON(HIGH_SCORE_KEY, 0));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  },

  setHighScore(score) {
    if (!Number.isFinite(score) || score < 0) return this.getHighScore();
    const best = Math.max(this.getHighScore(), Math.floor(score));
    writeRaw(HIGH_SCORE_KEY, JSON.stringify(best));
    return best;
  },

  /** Raw local leaderboard entries (unsorted). Callers sort/trim as needed. */
  getLeaderboard() {
    const list = readJSON(LEADERBOARD_KEY, []);
    return Array.isArray(list) ? list : [];
  },

  saveLeaderboard(entries) {
    if (!Array.isArray(entries)) return;
    writeRaw(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
  },

  getLastCallsign() {
    const name = readJSON(LAST_NAME_KEY, '');
    return typeof name === 'string' ? name : '';
  },

  setLastCallsign(name) {
    if (typeof name === 'string') writeRaw(LAST_NAME_KEY, JSON.stringify(name));
  },
};
