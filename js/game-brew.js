import { BREW_EMOJI_POOL, getCombineResult, getEmoji, generateBrewPuzzle } from '../data/emoji-brew.js';
import { getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';

let state = null;
let containerEl = null;
let cookieCallbacks = null;
let drag = null; // { sourceId, pointerId, ghostEl, hoverId }

// ── Rendering ────────────────────────────────────────────────────────────────

function renderTarget() {
  const target = getEmoji(state.targetId);
  const targetEl = containerEl.querySelector('.brew-target-emoji');
  targetEl.textContent = target.emoji;
  targetEl.setAttribute('aria-label', target.label);
}

function updateMoves() {
  const movesEl = containerEl.querySelector('.brew-moves');
  movesEl.textContent = `Moves: ${state.moves}`;
}

function renderPool() {
  const poolEl = containerEl.querySelector('.brew-pool');
  poolEl.innerHTML = '';
  state.cellMap.clear();
  // Render starters first (dim them subtly so the player can tell), then discoveries.
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
  cell.className = 'brew-cell';
  cell.dataset.id = id;
  cell.textContent = emoji.emoji;
  cell.setAttribute('aria-label', emoji.label);
  cell.setAttribute('title', emoji.label);
  if (id === state.targetId && state.discovered.has(id)) {
    cell.classList.add('brew-cell-target');
  }
  attachDragHandlers(cell);
  return cell;
}

function popInCell(id) {
  const cell = state.cellMap.get(id);
  if (!cell) return;
  cell.classList.add('brew-cell-pop');
  cell.addEventListener('animationend', () => cell.classList.remove('brew-cell-pop'), { once: true });
}

function shakeCell(id) {
  const cell = state.cellMap.get(id);
  if (!cell) return;
  cell.classList.add('brew-cell-shake');
  cell.addEventListener('animationend', () => cell.classList.remove('brew-cell-shake'), { once: true });
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
  ghost.className = 'brew-ghost';
  ghost.textContent = getEmoji(id).emoji;
  document.body.appendChild(ghost);
  drag = { sourceId: id, pointerId: e.pointerId, ghostEl: ghost, hoverId: null };
  positionGhost(e.clientX, e.clientY);
  cell.classList.add('brew-cell-dragging');
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
      prev?.classList.remove('brew-cell-hover');
    }
    if (overId && overId !== drag.sourceId) {
      overCell.classList.add('brew-cell-hover');
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
  if (drag.hoverId) state.cellMap.get(drag.hoverId)?.classList.remove('brew-cell-hover');
  state.cellMap.get(drag.sourceId)?.classList.remove('brew-cell-dragging');
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
  return el?.closest('.brew-cell');
}

// ── Combine logic ────────────────────────────────────────────────────────────

function attemptCombine(idA, idB) {
  const result = getCombineResult(idA, idB);
  if (!result) {
    shakeCell(idA);
    shakeCell(idB);
    return;
  }
  if (state.discovered.has(result)) {
    // Valid pair, but the result is already in the pool — no-op.
    return;
  }
  state.discovered.add(result);
  state.moves++;

  // Append the new cell to the pool with a pop animation.
  const poolEl = containerEl.querySelector('.brew-pool');
  const cell = createCell(result);
  poolEl.appendChild(cell);
  state.cellMap.set(result, cell);
  popInCell(result);

  if (result === state.targetId) {
    state.cellMap.get(result)?.classList.add('brew-cell-target');
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
  cookieCallbacks.saveProgress({
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
  const overlay = containerEl.querySelector('.brew-win-overlay');
  if (!overlay.hidden) return;
  overlay.hidden = false;
  const movesEl = overlay.querySelector('.brew-win-moves');
  movesEl.textContent = `You: ${state.moves} moves · Best: ${state.par}`;
  const titleEl = overlay.querySelector('.brew-win-title');
  if (titleEl) titleEl.textContent = state.isDaily ? '🎉 Brewed!' : '✨ Solved!';
  const shareBtn = overlay.querySelector('.share-btn');
  if (shareBtn) shareBtn.hidden = !state.isDaily;
  startConfetti(overlay.querySelector('.confetti-canvas'));
  if (state.isDaily && cookieCallbacks) cookieCallbacks.markComplete();
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
  const overlay = el.querySelector('.brew-win-overlay');
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
  return `Brew 🧙 – ${date}\n${targetEmoji} ${state.moves} moves (best: ${state.par})\n${SITE_URL}`;
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

// ── Init ─────────────────────────────────────────────────────────────────────

function loadPuzzle({ seedStr, isDaily, savedProgress }) {
  const puzzle = generateBrewPuzzle(seedStr);
  state = {
    puzzleDate: isDaily ? seedStr : getTodayString(),
    seedStr,
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
  const overlay = containerEl.querySelector('.brew-win-overlay');
  if (overlay) overlay.hidden = true;
  renderTarget();
  renderPool();
  updateMoves();
  updateModeBadge();
}

function updateModeBadge() {
  const badge = containerEl.querySelector('.brew-mode-badge');
  if (!badge) return;
  badge.textContent = state.isDaily ? 'Daily' : 'Practice';
  badge.classList.toggle('brew-mode-practice', !state.isDaily);
}

function newPuzzle() {
  const seed = `practice:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  loadPuzzle({ seedStr: seed, isDaily: false });
}

export function initBrewGame(el, cookies) {
  containerEl = el;
  cookieCallbacks = cookies;

  const today = getTodayString();
  const saved = cookies.loadState(today);

  const tmpl = document.getElementById('brew-template');
  el.innerHTML = '';
  el.appendChild(tmpl.content.cloneNode(true));

  const dateEl = el.querySelector('.brew-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }
  const streakEl = el.querySelector('.brew-streak');
  if (streakEl && saved?.streak) streakEl.textContent = `🔥 ${saved.streak}`;

  el.querySelector('.brew-reset-btn').addEventListener('click', resetBoard);
  el.querySelector('.brew-new-btn').addEventListener('click', newPuzzle);
  attachOverlayListeners(el);

  loadPuzzle({ seedStr: today, isDaily: true, savedProgress: saved?.progress });

  if (saved?.completed) {
    setTimeout(showWinScreen, 100);
  }
}
