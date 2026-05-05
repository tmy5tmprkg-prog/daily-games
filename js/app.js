import { initPairsGame } from './game-pairs.js';
import { initBrewGame } from './game-brew.js';
import { getTodayString } from './prng.js';

const PASSWORD = 'skyr-me'; // obscurity only — visible in DevTools
const AUTH_COOKIE = 'daily_games_auth';
const PAIRS_COOKIE = 'pairs_state';
const BREW_COOKIE = 'brew_state';

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

function computeNewStreak(saved) {
  if (!saved?.lastCompleted) return 1;
  const today = getTodayString();
  // Anchor to local noon so DST transitions don't shift the date.
  const d = new Date(`${today}T12:00`);
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString('sv');
  return saved.lastCompleted === yesterday ? (saved.streak || 0) + 1 : 1;
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
  brew: (el) => {
    const today = getTodayString();
    initBrewGame(el, {
      loadState: (d) => loadState(BREW_COOKIE, d),
      saveProgress: (progress) => saveState(BREW_COOKIE, { progress }),
      markComplete: () => {
        const prior = loadState(BREW_COOKIE, today);
        if (prior?.completed) return;
        const streak = computeNewStreak(prior);
        saveState(BREW_COOKIE, { completed: true, lastCompleted: today, streak });
      },
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
