import { EMOJI_POOL, buildAdjacency, edgeKey, isPair } from '../data/emoji-pairs.js';
import { hashDate, makePRNG, seededShuffle, getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';

const PAIR_COLORS = [
  '#0ece28', // green
  '#70d7ee', // cyan
  '#fc9043', // orange
  '#ffdd00', // yellow
  '#E6194B', // red
  '#395de1', // blue
  '#c347e9', // purple
  '#575756', // gray
];

// ── Puzzle generation ────────────────────────────────────────────────────────

export function validPartners(emoji, pool, usedIds) {
  return pool.filter(e => !usedIds.has(e.id) && isPair(emoji.id, e.id));
}

export function countPerfectMatchings(emojis, adj, matched) {
  const first = emojis.find(e => !matched.has(e.id));
  if (!first) return 1;
  let count = 0;
  for (const nId of (adj.get(first.id) || [])) {
    if (!matched.has(nId)) {
      matched.add(first.id);
      matched.add(nId);
      count += countPerfectMatchings(emojis, adj, matched);
      matched.delete(first.id);
      matched.delete(nId);
      if (count > 1) return count;
    }
  }
  return count;
}

export function enforceUniqueness(grid16, solution, adj) {
  const solutionEdges = new Set(solution.map(([a, b]) => edgeKey(a.id, b.id)));
  for (let attempt = 0; attempt < 100; attempt++) {
    if (countPerfectMatchings(grid16, adj, new Set()) === 1) return true;
    let pruned = false;
    outer: for (const e of grid16) {
      for (const nId of [...(adj.get(e.id) || [])]) {
        if (!solutionEdges.has(edgeKey(e.id, nId))) {
          adj.get(e.id).delete(nId);
          adj.get(nId).delete(e.id);
          pruned = true;
          break outer;
        }
      }
    }
    if (!pruned) break;
  }
  return countPerfectMatchings(grid16, adj, new Set()) === 1;
}

// Counts constraint-propagation rounds needed to solve the puzzle.
// A uniquely-solvable puzzle always terminates (no backtracking is ever truly
// required — see comment on generatePuzzle). Higher rounds = harder.
export function computeCPD(adj) {
  const rem = new Map();
  for (const [id, nbrs] of adj) rem.set(id, new Set(nbrs));
  let rounds = 0;
  while (rem.size > 0) {
    const forced = [...rem.keys()].filter(id => rem.get(id).size === 1);
    if (forced.length === 0) return Infinity;
    rounds++;
    const removed = new Set();
    for (const id of forced) {
      if (removed.has(id)) continue;
      const nbrs = rem.get(id);
      if (!nbrs || nbrs.size !== 1) continue;
      const [partnerId] = nbrs;
      removed.add(id);
      removed.add(partnerId);
    }
    for (const id of removed) rem.delete(id);
    for (const s of rem.values()) for (const id of removed) s.delete(id);
  }
  return rounds;
}

export function tryBuildPuzzle(rng) {
  const shuffled = seededShuffle([...EMOJI_POOL], rng);
  const solution = [];
  const usedIds = new Set();

  for (const emoji of shuffled) {
    if (usedIds.has(emoji.id)) continue;
    const candidates = validPartners(emoji, shuffled, usedIds);
    if (candidates.length === 0) continue;
    const partner = candidates[Math.floor(rng() * candidates.length)];
    solution.push([emoji, partner]);
    usedIds.add(emoji.id);
    usedIds.add(partner.id);
    if (solution.length === 8) break;
  }

  if (solution.length < 8) return null;

  const grid16 = solution.flatMap(([a, b]) => [a, b]);
  const adj = buildAdjacency(grid16);
  enforceUniqueness(grid16, solution, adj);

  const grid = seededShuffle(grid16, rng);

  const solutionMap = new Map();
  for (const [a, b] of solution) {
    solutionMap.set(a.id, b.id);
    solutionMap.set(b.id, a.id);
  }

  return { grid, solution, solutionMap, adj };
}

export function generatePuzzle(dateStr) {
  let fallback = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makePRNG(hashDate(`${dateStr}:${attempt}`));
    const puzzle = tryBuildPuzzle(rng);
    if (!puzzle) continue;
    if (!fallback) fallback = puzzle;
    // CPD ≥ 2: player must first solve the obvious pairs, then use those to deduce
    // the ambiguous ones — plus misleading non-solution edges add red-herring friction.
    // (CPD ≥ 3 is mathematically impossible for uniquely-solvable puzzles.)
    if (computeCPD(puzzle.adj) >= 2) return puzzle;
  }
  if (fallback) return fallback;
  throw new Error(`Could not generate puzzle for ${dateStr}`);
}

// ── State ────────────────────────────────────────────────────────────────────

// pairs: Map<id, { partner: id, colorIdx }> — two entries per pair
let state = null;
let containerEl = null;
let cookieCallbacks = null;

// ── Rendering ────────────────────────────────────────────────────────────────

function applyVisualState(id) {
  const cell = state.cellMap.get(id);
  if (!cell) return;
  cell.classList.remove('pending', 'paired');
  cell.style.removeProperty('--pair-color');

  if (state.pending === id) {
    cell.classList.add('pending');
    cell.style.setProperty('--pair-color', PAIR_COLORS[state.pendingColor % PAIR_COLORS.length]);
  } else if (state.pairs.has(id)) {
    cell.classList.add('paired');
    cell.style.setProperty('--pair-color', PAIR_COLORS[state.pairs.get(id).colorIdx % PAIR_COLORS.length]);
  }
}

function renderGrid() {
  const gridEl = containerEl.querySelector('.pairs-grid');
  gridEl.innerHTML = '';
  state.cellMap.clear();
  state.grid.forEach((emoji) => {
    const cell = document.createElement('button');
    cell.className = 'grid-cell';
    cell.dataset.id = emoji.id;
    cell.textContent = emoji.emoji;
    cell.setAttribute('aria-label', emoji.label);
    cell.addEventListener('click', () => handleCellTap(emoji.id));
    gridEl.appendChild(cell);
    state.cellMap.set(emoji.id, cell);
    applyVisualState(emoji.id);
  });
  updateStatus();
}

function updateStatus() {
  const statusEl = containerEl.querySelector('.pairs-status');
  const formed = state.pairs.size / 2;
  statusEl.textContent = `${formed} / 8 pairs formed`;
}

// ── Interaction ──────────────────────────────────────────────────────────────

function handleCellTap(id) {
  const { pairs, pending } = state;
  const isPaired  = pairs.has(id);
  const isPending = pending === id;

  if (isPending) {
    state.pending = null;
    applyVisualState(id);
    return;
  }

  if (!isPaired && pending === null) {
    state.pendingColor = state.paletteIdx;
    state.paletteIdx++;
    state.pending = id;
    applyVisualState(id);
    return;
  }

  if (!isPaired && pending !== null) {
    const colorIdx = state.pendingColor;
    const prevId = pending;
    pairs.set(prevId, { partner: id, colorIdx });
    pairs.set(id,     { partner: prevId, colorIdx });
    state.pending = null;
    applyVisualState(prevId);
    applyVisualState(id);
    updateStatus();
    checkWin();
    return;
  }

  if (isPaired && pending === null) {
    // partner becomes the new pending and inherits the broken pair's color
    const { partner, colorIdx } = pairs.get(id);
    pairs.delete(id);
    pairs.delete(partner);
    state.pending = partner;
    state.pendingColor = colorIdx;
    applyVisualState(id);
    applyVisualState(partner);
    updateStatus();
    return;
  }

  // isPaired && pending !== null: pending steals id from its partner; partner goes idle
  const { partner: partnerOfA } = pairs.get(id);
  const colorIdx = state.pendingColor;
  const prevId = pending;
  pairs.delete(id);
  pairs.delete(partnerOfA);
  pairs.set(prevId, { partner: id, colorIdx });
  pairs.set(id,     { partner: prevId, colorIdx });
  state.pending = null;
  applyVisualState(prevId);
  applyVisualState(id);
  applyVisualState(partnerOfA);
  updateStatus();
  checkWin();
}

// ── Win check ────────────────────────────────────────────────────────────────

function checkWin() {
  if (state.pairs.size < 16) return;

  const allCorrect = [...state.pairs.entries()].every(
    ([id, { partner }]) => state.solutionMap.get(id) === partner
  );

  if (allCorrect) {
    setTimeout(showWinScreen, 300);
  } else {
    const gridEl = containerEl.querySelector('.pairs-grid');
    gridEl.classList.add('shake');
    gridEl.addEventListener('animationend', () => gridEl.classList.remove('shake'), { once: true });
  }
}

// ── Reset ────────────────────────────────────────────────────────────────────

function resetBoard() {
  state.pairs.clear();
  state.pending = null;
  state.pendingColor = 0;
  state.paletteIdx = 0;
  renderGrid();
}

// ── Win screen ───────────────────────────────────────────────────────────────

function showWinScreen() {
  containerEl.querySelector('.win-overlay').hidden = false;
  startConfetti(containerEl.querySelector('.confetti-canvas'));
  if (cookieCallbacks) cookieCallbacks.markComplete();
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
  const overlay = el.querySelector('.win-overlay');
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
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const squares = '🟩'.repeat(8);
  return `Emoji Pairs – ${date}\n8/8 ✅  ${squares}\n${SITE_URL}`;
}

function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const colors = PAIR_COLORS;
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

export function initPairsGame(el, cookies) {
  containerEl = el;
  cookieCallbacks = cookies;

  const today = getTodayString();
  const puzzle = generatePuzzle(today);
  const saved = cookies.loadState(today);

  state = {
    grid: puzzle.grid,
    solutionMap: puzzle.solutionMap,
    pairs: new Map(),
    pending: null,
    pendingColor: 0,
    paletteIdx: 0,
    cellMap: new Map(),
  };

  const tmpl = document.getElementById('pairs-template');
  const content = tmpl.content.cloneNode(true);
  el.innerHTML = '';
  el.appendChild(content);

  const dateEl = el.querySelector('.pairs-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }

  const streakEl = el.querySelector('.pairs-streak');
  if (streakEl && saved?.streak) {
    streakEl.textContent = `🔥 ${saved.streak}`;
  }

  el.querySelector('.reset-btn').addEventListener('click', resetBoard);
  attachOverlayListeners(el);

  renderGrid();

  if (saved?.completed) {
    setTimeout(showWinScreen, 100);
  }
}
