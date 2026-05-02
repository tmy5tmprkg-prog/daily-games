import { EMOJI_POOL, ANCHOR_PAIRS, buildAdjacency, getEmojiById } from '../data/emoji-pairs.js';
import { hashDate, makePRNG, seededShuffle, getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';

// ── Puzzle generation ────────────────────────────────────────────────────────

function validPartners(emoji, pool, usedIds) {
  return pool.filter(e => !usedIds.has(e.id) && e.id !== emoji.id && canPair(emoji, e));
}

function canPair(a, b) {
  const adj = buildAdjacency([a, b]);
  return adj.get(a.id).has(b.id);
}

// Returns number of perfect matchings. left/right are arrays of emoji objects.
function countPerfectMatchings(left, right, adj, matchedRight, idx) {
  if (idx === left.length) return 1;
  let count = 0;
  const neighbors = adj.get(left[idx].id) || new Set();
  for (const r of right) {
    if (!matchedRight.has(r.id) && neighbors.has(r.id)) {
      matchedRight.add(r.id);
      count += countPerfectMatchings(left, right, adj, matchedRight, idx + 1);
      matchedRight.delete(r.id);
      if (count > 1) return count; // early exit — we only need to know if > 1
    }
  }
  return count;
}

function enforceUniqueness(left, right, adj, rng) {
  // Repeatedly remove an ambiguous edge until only 1 perfect matching remains.
  // We identify an edge used by an alternative matching and "break" it by
  // replacing one emoji with a pool emoji that has fewer connections.
  let attempts = 0;
  while (attempts++ < 20) {
    const count = countPerfectMatchings(left, right, adj, new Set(), 0);
    if (count === 1) return true;

    // Find an edge in adj that creates ambiguity: look for a right-side emoji
    // that has >1 valid left-side partner in the current set.
    let broke = false;
    for (const r of right) {
      const lPartners = left.filter(l => (adj.get(l.id) || new Set()).has(r.id));
      if (lPartners.length > 1) {
        // Remove one adjacency edge to reduce ambiguity.
        // Pick the partner that is NOT the intended solution match (index-matched).
        const intendedL = left[right.indexOf(r)];
        const extraL = lPartners.find(l => l.id !== intendedL.id);
        if (extraL) {
          adj.get(extraL.id).delete(r.id);
          adj.get(r.id).delete(extraL.id);
          broke = true;
          break;
        }
      }
    }
    if (!broke) break;
  }
  return countPerfectMatchings(left, right, adj, new Set(), 0) === 1;
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

  // Fallback to anchor pairs if we couldn't find 8
  if (solution.length < 8) {
    solution.length = 0;
    for (const [idA, idB] of ANCHOR_PAIRS) {
      solution.push([getEmojiById(idA), getEmojiById(idB)]);
    }
  }

  const left = solution.map(p => p[0]);
  const right = solution.map(p => p[1]);
  const grid16 = [...left, ...right];
  const adj = buildAdjacency(grid16);

  // Ensure unique solution (modifies adj in-place for counting purposes only;
  // the actual validity shown to the user is driven by adj at game-time).
  enforceUniqueness(left, right, adj, rng);

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
