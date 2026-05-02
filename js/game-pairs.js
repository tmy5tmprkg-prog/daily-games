import { EMOJI_POOL, FALLBACK_PAIRS, buildAdjacency, getEmojiById, isPair } from '../data/emoji-pairs.js';
import { hashDate, makePRNG, seededShuffle, getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';

const PAIR_COLORS = [
  '#FF6B6B', // coral red
  '#FF9A3C', // orange
  '#FFD93D', // yellow
  '#6BCB77', // green
  '#4DC9C9', // teal
  '#4D96FF', // blue
  '#C77DFF', // purple
  '#FF6BB5', // pink
];

// ── Puzzle generation ────────────────────────────────────────────────────────

function validPartners(emoji, pool, usedIds) {
  return pool.filter(e => !usedIds.has(e.id) && isPair(emoji.id, e.id));
}

function countPerfectMatchings(emojis, adj, matched) {
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

function enforceUniqueness(grid16, solution, adj) {
  const solutionEdges = new Set();
  for (const [a, b] of solution) {
    solutionEdges.add(`${a.id}|${b.id}`);
    solutionEdges.add(`${b.id}|${a.id}`);
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    if (countPerfectMatchings(grid16, adj, new Set()) === 1) return true;
    let pruned = false;
    outer: for (const e of grid16) {
      for (const nId of [...(adj.get(e.id) || [])]) {
        if (!solutionEdges.has(`${e.id}|${nId}`)) {
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

export function generatePuzzle(dateStr) {
  const rng = makePRNG(hashDate(dateStr));
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

  if (solution.length < 8) {
    solution.length = 0;
    for (const [idA, idB] of FALLBACK_PAIRS) {
      solution.push([getEmojiById(idA), getEmojiById(idB)]);
    }
  }

  const grid16 = solution.flatMap(([a, b]) => [a, b]);
  const adj = buildAdjacency(grid16);
  enforceUniqueness(grid16, solution, adj);

  const positions = seededShuffle([...Array(16).keys()], rng);
  const grid = new Array(16);
  grid16.forEach((emoji, i) => { grid[positions[i]] = emoji; });

  const solutionMap = new Map();
  for (const [a, b] of solution) {
    solutionMap.set(a.id, b.id);
    solutionMap.set(b.id, a.id);
  }

  return { grid, solutionMap };
}

// ── State ────────────────────────────────────────────────────────────────────

// pairs: Map<id, { partner: id, colorIdx: number }>  (two entries per pair)
// pending: id | null
// pendingColor: number  (colorIdx of the current pending emoji)
// paletteIdx: number    (advances each time a new pending is started)
let state = null;
let containerEl = null;
let cookieCallbacks = null;

// ── Rendering ────────────────────────────────────────────────────────────────

function cellFor(id) {
  return containerEl.querySelector(`.grid-cell[data-id="${id}"]`);
}

function applyVisualState(id) {
  const cell = cellFor(id);
  if (!cell) return;
  cell.classList.remove('pending', 'paired');
  cell.style.removeProperty('--pair-color');

  if (state.pending === id) {
    cell.classList.add('pending');
    cell.style.setProperty('--pair-color', PAIR_COLORS[state.pendingColor % 8]);
  } else if (state.pairs.has(id)) {
    cell.classList.add('paired');
    cell.style.setProperty('--pair-color', PAIR_COLORS[state.pairs.get(id).colorIdx % 8]);
  }
}

function renderGrid() {
  const gridEl = containerEl.querySelector('.pairs-grid');
  gridEl.innerHTML = '';
  state.grid.forEach((emoji) => {
    const cell = document.createElement('button');
    cell.className = 'grid-cell';
    cell.dataset.id = emoji.id;
    cell.textContent = emoji.emoji;
    cell.setAttribute('aria-label', emoji.label);
    cell.addEventListener('click', () => handleCellTap(emoji.id));
    gridEl.appendChild(cell);
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

  if (!isPaired && !isPending && pending === null) {
    // idle → pending: start a new pair with next palette color
    state.pendingColor = state.paletteIdx;
    state.paletteIdx++;
    state.pending = id;
    applyVisualState(id);
    return;
  }

  if (isPending) {
    // tap own pending → deselect
    state.pending = null;
    applyVisualState(id);
    return;
  }

  if (!isPaired && !isPending && pending !== null) {
    // idle + pending A → form pair: A + id
    const colorIdx = state.pendingColor;
    const prevId = pending;
    state.pairs.set(prevId, { partner: id, colorIdx });
    state.pairs.set(id,     { partner: prevId, colorIdx });
    state.pending = null;
    applyVisualState(prevId);
    applyVisualState(id);
    updateStatus();
    checkWin();
    return;
  }

  if (isPaired && pending === null) {
    // tap a paired emoji with nothing pending → break its pair, partner becomes orphan/pending
    const { partner, colorIdx } = pairs.get(id);
    pairs.delete(id);
    pairs.delete(partner);
    // partner becomes the new pending (orphan keeps old color)
    state.pending = partner;
    state.pendingColor = colorIdx;
    applyVisualState(id);       // id → idle
    applyVisualState(partner);  // partner → pending
    updateStatus();
    return;
  }

  if (isPaired && pending !== null) {
    // pending C + tap paired A (partner B) → C pairs with A, B becomes orphan/pending
    const { partner: partnerOfA } = pairs.get(id);
    const colorIdx = state.pendingColor;
    const prevId = pending;

    // break A's old pair
    pairs.delete(id);
    pairs.delete(partnerOfA);

    // form C–A
    pairs.set(prevId, { partner: id, colorIdx });
    pairs.set(id,     { partner: prevId, colorIdx });

    // B goes back to idle
    state.pending = null;

    applyVisualState(prevId);
    applyVisualState(id);
    applyVisualState(partnerOfA);
    updateStatus();
    checkWin();
    return;
  }
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
  const overlay = containerEl.querySelector('.win-overlay');
  overlay.hidden = false;
  startConfetti(containerEl.querySelector('.confetti-canvas'));

  const closeBtn = overlay.querySelector('.win-close');
  closeBtn.addEventListener('click', () => { overlay.hidden = true; });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });

  const shareBtn = overlay.querySelector('.share-btn');
  shareBtn.addEventListener('click', () => {
    const text = buildShareText();
    navigator.clipboard.writeText(text).then(() => {
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Share result'; }, 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Share result'; }, 2000);
    });
  });

  if (cookieCallbacks) cookieCallbacks.markComplete();
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

  renderGrid();

  if (saved?.completed) {
    setTimeout(showWinScreen, 100);
  }
}
