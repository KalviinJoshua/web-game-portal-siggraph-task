/**
 * Leaderboard service with a clean local/global split.
 *
 * By default scores are stored locally (browser storage) so the game works
 * with zero configuration. If Supabase credentials are provided through Vite
 * environment variables at build time, the same API transparently reads from /
 * writes to a hosted table — and still falls back to local storage if the
 * network request fails, so the player never loses their run.
 *
 * No secrets are hardcoded. The Supabase anon key is a public client key by
 * design and is injected via `import.meta.env` (see `.env.example`).
 */

import { Storage } from '../utils/Storage.js';
import { sanitizeCallsign } from '../utils/dom.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = import.meta.env.VITE_LEADERBOARD_TABLE || 'nebula_scores';

const REMOTE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Normalise + validate a single score entry before it is stored anywhere. */
function normalizeEntry({ name, score, distance }) {
  const { ok, value } = sanitizeCallsign(name);
  return {
    name: ok ? value : 'PILOT',
    score: Math.max(0, Math.floor(Number(score) || 0)),
    distance: Math.max(0, Math.floor(Number(distance) || 0)),
    ts: Date.now(),
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => b.score - a.score || b.distance - a.distance);
}

// ---- Local provider ---------------------------------------------------------

function localGetTop(limit) {
  return sortEntries(Storage.getLeaderboard()).slice(0, limit);
}

function localSubmit(entry) {
  const list = Storage.getLeaderboard();
  list.push(entry);
  const trimmed = sortEntries(list).slice(0, 50);
  Storage.saveLeaderboard(trimmed);
  return trimmed;
}

// ---- Remote (Supabase REST) provider ---------------------------------------

async function remoteGetTop(limit) {
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}` +
    `?select=name,score,distance&order=score.desc&limit=${limit}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function remoteSubmit(entry) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ name: entry.name, score: entry.score, distance: entry.distance }),
  });
  if (!res.ok) throw new Error(`Leaderboard submit failed: ${res.status}`);
}

// ---- Public service ---------------------------------------------------------

export const LeaderboardService = {
  /** 'GLOBAL' when a backend is configured, otherwise 'LOCAL'. */
  get mode() {
    return REMOTE_ENABLED ? 'GLOBAL' : 'LOCAL';
  },

  /** Fetch the top `limit` entries, sorted by score. Always resolves. */
  async getTop(limit = 10) {
    if (REMOTE_ENABLED) {
      try {
        const rows = await remoteGetTop(limit);
        return sortEntries(rows).slice(0, limit);
      } catch (err) {
        console.warn('[leaderboard] remote read failed, using local copy.', err);
      }
    }
    return localGetTop(limit);
  },

  /**
   * Submit a new score. Always mirrors to local storage first (so the player
   * immediately sees their entry) and additionally posts to the backend when
   * configured. Resolves with the current local top list.
   */
  async submit({ name, score, distance }) {
    const entry = normalizeEntry({ name, score, distance });
    const localTop = localSubmit(entry);
    Storage.setLastCallsign(entry.name);
    Storage.setHighScore(entry.score);

    if (REMOTE_ENABLED) {
      try {
        await remoteSubmit(entry);
      } catch (err) {
        console.warn('[leaderboard] remote submit failed, kept local copy.', err);
      }
    }
    return localTop;
  },
};
