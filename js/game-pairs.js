import { EMOJI_POOL, FALLBACK_PAIRS, buildAdjacency, getEmojiById, isPair } from '../data/emoji-pairs.js';
import { hashDate, makePRNG, seededShuffle, getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';

// ── Puzzle generation ────────────────────────────────────────────────────────

function validPartners(emoji, pool, usedIds) {
  return pool.filter(e => !usedIds.has(e.id) && isPair(emoji.id, e.id));
}

// Counts perfect matchings in a general (non-bipartite) graph.
// Picks the first unmatched emoji and tries pairing it with each valid neighbor.
// Returns early once count exceeds 1 — we only need to distinguish 1 vs >1.
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
    // Remove one non-solution edge per iteration until unique
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

  const solution = []; // [[emojiA, emojiB], ...]
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

  // Fallback: use the pre-verified forced pairs (unique solution guaranteed)
  if (solution.length < 8) {
    solution.length = 0;
    for (const [idA, idB] of FALLBACK_PAIRS) {
      solution.push([getEmojiById(idA), getEmojiById(idB)]);
    }
  }

  const grid16 = solution.flatMap(([a, b]) => [a, b]);
  const adj = buildAdjacency(grid16);

  // Prune non-solution edges from adj until exactly 1 perfect matching remains.
  enforceUniqueness(grid16, solution, adj);

  const positions = seededShuffle([...Array(16).keys()], rng);
  const grid = new Array(16);
  grid16.forEach((emoji, i) => { grid[positions[i]] = emoji; });

  // Solution map: id -> id of correct partner
  const solutionMap = new Map();
  for (const [a, b] of solution) {
    solutionMap.set(a.id, b.id);
    solutionMap.set(b.id, a.id);
  }

  return { grid, solutionMap, adj };
}

// ── State ────────────────────────────────────────────────────────────────────

let state = null; // { grid, solutionMap, adj, matched: Set of id pairs, selected: id|null }
let containerEl = null;
let cookieCallbacks = null;

// ── Rendering ────────────────────────────────────────────────────────────────

function renderGrid() {
  const gridEl = containerEl.querySelector('.pairs-grid');
  gridEl.innerHTML = '';
  state.grid.forEach((emoji, idx) => {
    const cell = document.createElement('button');
    cell.className = 'grid-cell';
    cell.dataset.id = emoji.id;
    cell.dataset.idx = idx;
    cell.textContent = emoji.emoji;
    cell.setAttribute('aria-label', emoji.label);
    if (isMatched(emoji.id)) {
      cell.classList.add('matched');
      cell.disabled = true;
    }
    cell.addEventListener('click', () => handleCellTap(cell));
    gridEl.appendChild(cell);
  });
  updateStatus();
}

function isMatched(id) {
  for (const [a, b] of state.matched) {
    if (a === id || b === id) return true;
  }
  return false;
}

function updateStatus() {
  const statusEl = containerEl.querySelector('.pairs-status');
  const remaining = 8 - state.matched.size;
  statusEl.textContent = remaining === 0 ? 'All pairs found!' : `${remaining} pair${remaining !== 1 ? 's' : ''} remaining`;
}

// ── Interaction ──────────────────────────────────────────────────────────────

function handleCellTap(cell) {
  const id = cell.dataset.id;
  if (state.selected === null) {
    state.selected = id;
    cell.classList.add('selected');
    return;
  }
  if (state.selected === id) {
    state.selected = null;
    cell.classList.remove('selected');
    return;
  }
  const prevId = state.selected;
  const prevCell = containerEl.querySelector(`.grid-cell[data-id="${prevId}"]`);
  prevCell?.classList.remove('selected');
  state.selected = null;

  if (state.solutionMap.get(prevId) === id) {
    // Correct pair
    state.matched.add([prevId, id]);
    [prevCell, cell].forEach(c => {
      if (c) { c.classList.add('matched'); c.disabled = true; }
    });
    saveProgress();
    updateStatus();
    if (state.matched.size === 8) {
      setTimeout(showWinScreen, 400);
    }
  } else {
    // Wrong pair
    [prevCell, cell].forEach(c => c?.classList.add('shake'));
    setTimeout(() => {
      [prevCell, cell].forEach(c => c?.classList.remove('shake'));
    }, 500);
  }
}

// ── Win screen ───────────────────────────────────────────────────────────────

function showWinScreen() {
  const overlay = containerEl.querySelector('.win-overlay');
  overlay.hidden = false;
  startConfetti(containerEl.querySelector('.confetti-canvas'));

  const shareBtn = overlay.querySelector('.share-btn');
  shareBtn.addEventListener('click', () => {
    const text = buildShareText();
    navigator.clipboard.writeText(text).then(() => {
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Share result'; }, 2000);
    }).catch(() => {
      // Fallback for browsers without clipboard API
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
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A3C'];
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

// ── Cookie / persistence ─────────────────────────────────────────────────────

function saveProgress() {
  if (!cookieCallbacks) return;
  cookieCallbacks.saveMatched([...state.matched]);
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initPairsGame(el, cookies) {
  containerEl = el;
  cookieCallbacks = cookies;

  const today = getTodayString();
  const puzzle = generatePuzzle(today);

  const saved = cookies.loadState(today);
  const restoredMatched = new Set();
  if (saved?.matched) {
    for (const pair of saved.matched) restoredMatched.add(pair);
  }

  state = {
    grid: puzzle.grid,
    solutionMap: puzzle.solutionMap,
    adj: puzzle.adj,
    matched: restoredMatched,
    selected: null,
  };

  // Clone template and inject
  const tmpl = document.getElementById('pairs-template');
  const content = tmpl.content.cloneNode(true);
  el.innerHTML = '';
  el.appendChild(content);

  // Set date header
  const dateEl = el.querySelector('.pairs-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }

  const streakEl = el.querySelector('.pairs-streak');
  if (streakEl && saved?.streak) {
    streakEl.textContent = `🔥 ${saved.streak}`;
  }

  renderGrid();

  if (saved?.completed) {
    setTimeout(showWinScreen, 100);
  }
}
