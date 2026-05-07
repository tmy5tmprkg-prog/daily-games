import { initPairsGame } from './game-pairs.js';
import { initElementsGame } from './game-elements.js';
import { getTodayString } from './prng.js';

const PASSWORD = 'skyr-me'; // obscurity only — visible in DevTools
const AUTH_COOKIE = 'daily_games_auth';
const PAIRS_COOKIE = 'pairs_state';
const ELEMENTS_COOKIE = 'elements_state';

const ELEMENTS_TIERS = ['easy', 'medium', 'hard'];

// ── Cookie helpers ───────────────────────────────────────────────────────────

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function getCookie(name) {
  const match = document.cookie.split('; ').find(r => r.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function isAuthed() {
  return getCookie(AUTH_COOKIE) === btoa(PASSWORD);
}

function setAuthed() {
  setCookie(AUTH_COOKIE, btoa(PASSWORD), 365);
}

// ── Game state cookies ───────────────────────────────────────────────────────

function loadState(cookieName, today) {
  try {
    const raw = getCookie(cookieName);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== today) return null;
    return data;
  } catch {
    return null;
  }
}

function saveState(cookieName, patch) {
  const today = getTodayString();
  let data = loadState(cookieName, today) || { date: today, completed: false, streak: 0, lastCompleted: null };
  Object.assign(data, patch);
  setCookie(cookieName, JSON.stringify(data), 30);
}

function computeNewStreak(prior) {
  if (!prior?.lastCompleted) return 1;
  const today = getTodayString();
  // Anchor to local noon so DST transitions don't shift the date.
  const d = new Date(`${today}T12:00`);
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString('sv');
  return prior.lastCompleted === yesterday ? (prior.streak || 0) + 1 : 1;
}

// ── Elements per-tier persistence ────────────────────────────────────────────
//
// Schema for the elements cookie (one cookie shared by all three tiers,
// reset whenever `date` changes):
//   {
//     date: '2026-05-06',
//     tiers: {
//       easy:   { progress, completed, lastCompleted, streak },
//       medium: { ... },
//       hard:   { ... },
//     },
//   }

function emptyElementsState(today) {
  const tiers = {};
  for (const t of ELEMENTS_TIERS) {
    tiers[t] = { progress: null, completed: false, lastCompleted: null, streak: 0 };
  }
  return { date: today, tiers };
}

function loadElementsState() {
  const today = getTodayString();
  try {
    const raw = getCookie(ELEMENTS_COOKIE);
    if (!raw) return emptyElementsState(today);
    const data = JSON.parse(raw);
    if (!data.tiers) return emptyElementsState(today);
    if (data.date !== today) {
      // New day — preserve streaks and lastCompleted, drop in-progress state.
      const fresh = emptyElementsState(today);
      for (const t of ELEMENTS_TIERS) {
        const prior = data.tiers[t] || {};
        fresh.tiers[t].lastCompleted = prior.lastCompleted ?? null;
        fresh.tiers[t].streak = prior.streak ?? 0;
      }
      return fresh;
    }
    // Same day — fill missing tiers defensively.
    for (const t of ELEMENTS_TIERS) {
      if (!data.tiers[t]) data.tiers[t] = { progress: null, completed: false, lastCompleted: null, streak: 0 };
    }
    return data;
  } catch {
    return emptyElementsState(today);
  }
}

function saveElementsState(data) {
  setCookie(ELEMENTS_COOKIE, JSON.stringify(data), 30);
}

function elementsLoadTier(_today, tier) {
  const data = loadElementsState();
  return data.tiers[tier] || null;
}

function elementsSaveProgress(tier, progress) {
  const data = loadElementsState();
  if (!data.tiers[tier]) return;
  data.tiers[tier].progress = progress;
  saveElementsState(data);
}

function elementsMarkComplete(tier) {
  const data = loadElementsState();
  const tierData = data.tiers[tier];
  if (!tierData || tierData.completed) return;
  const today = getTodayString();
  const streak = computeNewStreak({ lastCompleted: tierData.lastCompleted, streak: tierData.streak });
  tierData.completed = true;
  tierData.lastCompleted = today;
  tierData.streak = streak;
  saveElementsState(data);
}

// ── Tab routing ──────────────────────────────────────────────────────────────

const gameInits = {
  pairs: (el) => {
    const today = getTodayString();
    initPairsGame(el, {
      loadState: (d) => loadState(PAIRS_COOKIE, d),
      saveMatched: (matched) => saveState(PAIRS_COOKIE, { matched }),
      markComplete: () => {
        const prior = loadState(PAIRS_COOKIE, today);
        if (prior?.completed) return;
        const streak = computeNewStreak(prior);
        saveState(PAIRS_COOKIE, { completed: true, lastCompleted: today, streak });
      },
    });
  },
  elements: (el) => {
    initElementsGame(el, {
      loadTier: elementsLoadTier,
      saveProgress: elementsSaveProgress,
      markComplete: elementsMarkComplete,
    });
  },
};

function activateTab(gameId) {
  sessionStorage.setItem('activeTab', gameId);
  document.querySelectorAll('#tab-bar .tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.game === gameId);
  });
  const area = document.getElementById('game-area');
  if (gameInits[gameId]) gameInits[gameId](area);
}

// ── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('password-gate');
  const app  = document.getElementById('app');

  if (isAuthed()) {
    gate.hidden = true;
    app.hidden = false;
    boot();
    return;
  }

  gate.hidden = false;
  app.hidden = true;

  const form = document.getElementById('pw-form');
  const input = document.getElementById('pw-input');
  const error = document.getElementById('pw-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === PASSWORD) {
      setAuthed();
      gate.hidden = true;
      app.hidden = false;
      boot();
    } else {
      error.textContent = 'Incorrect password.';
      input.value = '';
      input.focus();
    }
  });
});

function boot() {
  document.querySelectorAll('#tab-bar .tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.game));
  });
  const saved = sessionStorage.getItem('activeTab') || 'pairs';
  activateTab(saved);
}
