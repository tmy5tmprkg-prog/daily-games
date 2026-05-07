import {
  ELEMENTS_EMOJI_POOL,
  STARTERS,
  TIERS,
  TIER_LABELS,
  getCombineResult,
  getEmoji,
  generateElementsPuzzle,
  loadElements,
} from '../data/emoji-elements.js';
import { getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';
const DEFAULT_TIER = 'medium';
const TIER_SESSION_KEY = 'elementsActiveTier';

let state = null;
let containerEl = null;
let cookieCallbacks = null;
let drag = null; // { sourceId, pointerId, ghostEl, hoverId }

// ── Rendering ────────────────────────────────────────────────────────────────

function renderTarget() {
  const target = getEmoji(state.targetId);
  const targetEl = containerEl.querySelector('.elements-target-emoji');
  targetEl.textContent = target.emoji;
  targetEl.setAttribute('aria-label', target.label);
}

function updateMoves() {
  const movesEl = containerEl.querySelector('.elements-moves');
  movesEl.textContent = `Moves: ${state.moves}`;
}

function renderPool() {
  const poolEl = containerEl.querySelector('.elements-pool');
  poolEl.innerHTML = '';
  state.cellMap.clear();
  // Render starters first, then discoveries in insertion order.
  const starterSet = new Set(state.starters);
  const ordered = [
    ...state.starters,
    ...[...state.discovered].filter(id => !starterSet.has(id)),
  ];
  for (const id of ordered) {
    const cell = createCell(id);
    poolEl.appendChild(cell);
    state.cellMap.set(id, cell);
  }
}

function createCell(id) {
  const emoji = getEmoji(id);
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'elements-cell';
  cell.dataset.id = id;
  cell.textContent = emoji.emoji;
  cell.setAttribute('aria-label', emoji.label);
  cell.setAttribute('title', emoji.label);
  if (id === state.targetId && state.discovered.has(id)) {
    cell.classList.add('elements-cell-target');
  }
  attachDragHandlers(cell);
  return cell;
}

function popInCell(id) {
  const cell = state.cellMap.get(id);
  if (!cell) return;
  cell.classList.add('elements-cell-pop');
  cell.addEventListener('animationend', () => cell.classList.remove('elements-cell-pop'), { once: true });
}

function shakeCell(id) {
  const cell = state.cellMap.get(id);
  if (!cell) return;
  cell.classList.add('elements-cell-shake');
  cell.addEventListener('animationend', () => cell.classList.remove('elements-cell-shake'), { once: true });
}

// ── Drag interaction (Pointer Events) ────────────────────────────────────────

function attachDragHandlers(cell) {
  cell.addEventListener('pointerdown', onPointerDown);
  cell.addEventListener('pointermove', onPointerMove);
  cell.addEventListener('pointerup', onPointerUp);
  cell.addEventListener('pointercancel', cancelDrag);
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  e.preventDefault();
  const cell = e.currentTarget;
  const id = cell.dataset.id;
  cell.setPointerCapture(e.pointerId);
  const ghost = document.createElement('div');
  ghost.className = 'elements-ghost';
  ghost.textContent = getEmoji(id).emoji;
  document.body.appendChild(ghost);
  drag = { sourceId: id, pointerId: e.pointerId, ghostEl: ghost, hoverId: null };
  positionGhost(e.clientX, e.clientY);
  cell.classList.add('elements-cell-dragging');
}

function onPointerMove(e) {
  if (!drag || drag.pointerId !== e.pointerId) return;
  e.preventDefault();
  positionGhost(e.clientX, e.clientY);
  const overCell = cellUnderPoint(e.clientX, e.clientY);
  const overId = overCell?.dataset.id ?? null;
  if (overId !== drag.hoverId) {
    if (drag.hoverId) {
      const prev = state.cellMap.get(drag.hoverId);
      prev?.classList.remove('elements-cell-hover');
    }
    if (overId && overId !== drag.sourceId) {
      overCell.classList.add('elements-cell-hover');
      drag.hoverId = overId;
    } else {
      drag.hoverId = null;
    }
  }
}

function onPointerUp(e) {
  if (!drag || drag.pointerId !== e.pointerId) return;
  e.preventDefault();
  const sourceId = drag.sourceId;
  const overCell = cellUnderPoint(e.clientX, e.clientY);
  const targetId = overCell?.dataset.id ?? null;
  cleanupDrag();
  if (targetId && targetId !== sourceId) attemptCombine(sourceId, targetId);
}

function cancelDrag() {
  if (!drag) return;
  cleanupDrag();
}

function cleanupDrag() {
  if (!drag) return;
  drag.ghostEl?.remove();
  if (drag.hoverId) state.cellMap.get(drag.hoverId)?.classList.remove('elements-cell-hover');
  state.cellMap.get(drag.sourceId)?.classList.remove('elements-cell-dragging');
  drag = null;
}

function positionGhost(x, y) {
  drag.ghostEl.style.left = `${x}px`;
  drag.ghostEl.style.top = `${y}px`;
}

function cellUnderPoint(x, y) {
  // The pointer is captured by the source cell, so elementFromPoint normally
  // still returns whatever is visually under the cursor. We hide the ghost
  // briefly so it doesn't intercept the hit test.
  const ghost = drag?.ghostEl;
  if (ghost) ghost.style.pointerEvents = 'none';
  const el = document.elementFromPoint(x, y);
  return el?.closest('.elements-cell');
}

// ── Combine logic ────────────────────────────────────────────────────────────

function attemptCombine(idA, idB) {
  const result = getCombineResult(idA, idB);
  if (!result) {
    shakeCell(idA);
    shakeCell(idB);
    return;
  }
  if (state.discovered.has(result)) return;
  state.discovered.add(result);
  state.moves++;

  const poolEl = containerEl.querySelector('.elements-pool');
  const cell = createCell(result);
  poolEl.appendChild(cell);
  state.cellMap.set(result, cell);
  popInCell(result);

  if (result === state.targetId) {
    state.cellMap.get(result)?.classList.add('elements-cell-target');
  }

  updateMoves();
  persistState();

  if (state.discovered.has(state.targetId)) {
    setTimeout(showWinScreen, 350);
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

function persistState() {
  if (!state.isDaily) return;
  if (!cookieCallbacks?.saveProgress) return;
  cookieCallbacks.saveProgress(state.tier, {
    discovered: [...state.discovered],
    moves: state.moves,
  });
}

// ── Reset ────────────────────────────────────────────────────────────────────

function resetBoard() {
  state.discovered = new Set(state.starters);
  state.moves = 0;
  renderPool();
  updateMoves();
  persistState();
}

// ── Win screen ───────────────────────────────────────────────────────────────

function showWinScreen() {
  const overlay = containerEl.querySelector('.elements-win-overlay');
  if (!overlay.hidden) return;
  overlay.hidden = false;
  const movesEl = overlay.querySelector('.elements-win-moves');
  movesEl.textContent = `You: ${state.moves} moves · Best: ${state.par}`;
  const titleEl = overlay.querySelector('.elements-win-title');
  if (titleEl) titleEl.textContent = state.isDaily ? '🎉 Combined!' : '✨ Solved!';
  const tierBadge = overlay.querySelector('.elements-win-tier');
  if (tierBadge) tierBadge.textContent = TIER_LABELS[state.tier] || '';
  const shareBtn = overlay.querySelector('.share-btn');
  if (shareBtn) shareBtn.hidden = !state.isDaily;
  startConfetti(overlay.querySelector('.confetti-canvas'));
  if (state.isDaily && cookieCallbacks) cookieCallbacks.markComplete(state.tier);
  refreshStreakDisplay();
}

function flashCopied(btn) {
  btn.textContent = 'Copied!';
  setTimeout(() => { btn.textContent = 'Share result'; }, 2000);
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

function attachOverlayListeners(el) {
  const overlay = el.querySelector('.elements-win-overlay');
  overlay.querySelector('.win-close').addEventListener('click', () => { overlay.hidden = true; });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
  const shareBtn = overlay.querySelector('.share-btn');
  shareBtn.addEventListener('click', () => {
    copyToClipboard(buildShareText()).then(() => flashCopied(shareBtn));
  });
}

function buildShareText() {
  const d = new Date(`${state.puzzleDate}T12:00`);
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const targetEmoji = getEmoji(state.targetId).emoji;
  const tierLabel = TIER_LABELS[state.tier];
  return `Elements 🜂 – ${date} (${tierLabel})\n${targetEmoji} ${state.moves} moves (best: ${state.par})\n${SITE_URL}`;
}

function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const colors = ['#0ece28', '#70d7ee', '#fc9043', '#ffdd00', '#E6194B', '#395de1', '#c347e9'];
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
  }));
  const start = performance.now();
  function tick(now) {
    if (now - start > 4000) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.rotation += p.rotSpeed;
      if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Tier switching ───────────────────────────────────────────────────────────

function switchTier(newTier) {
  if (!TIERS.includes(newTier)) return;
  if (state?.tier === newTier) return;
  // Persist current state before switching.
  if (state) persistState();
  sessionStorage.setItem(TIER_SESSION_KEY, newTier);
  loadDailyForTier(newTier);
  updateTierPills();
  refreshStreakDisplay();
}

function updateTierPills() {
  const pills = containerEl.querySelectorAll('.elements-tier-pill');
  for (const pill of pills) {
    pill.classList.toggle('active', pill.dataset.tier === state.tier);
    pill.setAttribute('aria-selected', pill.dataset.tier === state.tier ? 'true' : 'false');
  }
}

function refreshStreakDisplay() {
  const streakEl = containerEl.querySelector('.elements-streak');
  if (!streakEl || !cookieCallbacks?.loadTier) return;
  const today = getTodayString();
  const tierState = cookieCallbacks.loadTier(today, state.tier);
  const streak = tierState?.streak || 0;
  streakEl.textContent = streak > 0 ? `🔥 ${streak}` : '';
}

// ── Init ─────────────────────────────────────────────────────────────────────

function loadPuzzle({ seedStr, tier, isDaily, savedProgress }) {
  const puzzle = generateElementsPuzzle(seedStr, tier);
  state = {
    puzzleDate: isDaily ? seedStr : getTodayString(),
    seedStr,
    tier,
    isDaily,
    targetId: puzzle.targetId,
    par: puzzle.par,
    starters: [...puzzle.starters],
    discovered: new Set(puzzle.starters),
    moves: 0,
    cellMap: new Map(),
  };
  if (savedProgress?.discovered) {
    for (const id of savedProgress.discovered) state.discovered.add(id);
    state.moves = savedProgress.moves || 0;
  }
  const overlay = containerEl.querySelector('.elements-win-overlay');
  if (overlay) overlay.hidden = true;
  renderTarget();
  renderPool();
  updateMoves();
  updateModeBadge();
}

function loadDailyForTier(tier) {
  const today = getTodayString();
  const saved = cookieCallbacks?.loadTier?.(today, tier);
  loadPuzzle({
    seedStr: today,
    tier,
    isDaily: true,
    savedProgress: saved?.progress,
  });
  if (saved?.completed) setTimeout(showWinScreen, 100);
}

function updateModeBadge() {
  const badge = containerEl.querySelector('.elements-mode-badge');
  if (!badge) return;
  badge.textContent = state.isDaily ? 'Daily' : 'Practice';
  badge.classList.toggle('elements-mode-practice', !state.isDaily);
}

function newPractice() {
  const seed = `practice:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  loadPuzzle({ seedStr: seed, tier: state.tier, isDaily: false });
}

export async function initElementsGame(el, cookies) {
  await loadElements();

  containerEl = el;
  cookieCallbacks = cookies;

  const tmpl = document.getElementById('elements-template');
  el.innerHTML = '';
  el.appendChild(tmpl.content.cloneNode(true));

  const dateEl = el.querySelector('.elements-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }

  // Difficulty pills
  for (const pill of el.querySelectorAll('.elements-tier-pill')) {
    pill.addEventListener('click', () => switchTier(pill.dataset.tier));
  }

  el.querySelector('.elements-reset-btn').addEventListener('click', resetBoard);
  el.querySelector('.elements-new-btn').addEventListener('click', newPractice);
  attachOverlayListeners(el);

  const initialTier = TIERS.includes(sessionStorage.getItem(TIER_SESSION_KEY))
    ? sessionStorage.getItem(TIER_SESSION_KEY)
    : DEFAULT_TIER;
  loadDailyForTier(initialTier);
  updateTierPills();
  refreshStreakDisplay();
}

// Re-export for completeness (used nowhere else, but keeps the shape parallel
// to other game modules that surface their dataset).
export { ELEMENTS_EMOJI_POOL };
