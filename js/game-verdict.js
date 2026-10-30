import { generateVerdictPuzzle, isConsistent, getViolationMessage } from '../data/verdict-data.js';
import { getTodayString } from './prng.js';

const SITE_URL = 'https://tmy5tmprkg-prog.github.io/daily-games';

let containerEl, cookieCallbacks, state;

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderGame() {
  const poolEl = containerEl.querySelector('.verdict-witnesses');
  poolEl.innerHTML = '';

  state.puzzle.witnesses.forEach((witness, wIdx) => {
    const section = document.createElement('div');
    section.className = 'verdict-witness';

    const nameEl = document.createElement('div');
    nameEl.className = 'verdict-witness-name';
    nameEl.textContent = witness.name;
    section.appendChild(nameEl);

    const stmtsEl = document.createElement('div');
    stmtsEl.className = 'verdict-statements';

    witness.statements.forEach(stmt => {
      const btn = document.createElement('button');
      btn.className = 'verdict-stmt';
      btn.dataset.stmtIdx = stmt.stmtIdx;
      btn.textContent = `"${stmt.text}"`;
      if (state.marked.has(stmt.stmtIdx)) btn.classList.add('verdict-marked');
      btn.addEventListener('click', () => handleStatementClick(stmt.stmtIdx, wIdx));
      stmtsEl.appendChild(btn);
    });

    section.appendChild(stmtsEl);
    poolEl.appendChild(section);
  });

  updateSubmitState();
}

function updateSubmitState() {
  const btn = containerEl.querySelector('.verdict-submit-btn');
  btn.disabled = state.marked.size !== 2 || state.solved;
}

function markCell(stmtIdx, on) {
  const btn = containerEl.querySelector(`[data-stmt-idx="${stmtIdx}"]`);
  if (btn) btn.classList.toggle('verdict-marked', on);
}

// ── Interaction ───────────────────────────────────────────────────────────────

function handleStatementClick(stmtIdx, witnessIdx) {
  if (state.solved) return;

  if (state.marked.has(stmtIdx)) {
    state.marked.delete(stmtIdx);
    markCell(stmtIdx, false);
  } else {
    // Enforce max 1 mark per witness
    const alreadyMarkedInWitness = [...state.marked].find(idx => {
      const wIdx = Math.floor(idx / 2);
      return wIdx === witnessIdx;
    });
    if (alreadyMarkedInWitness !== undefined) return;

    if (state.marked.size >= 2) return;
    state.marked.add(stmtIdx);
    markCell(stmtIdx, true);
  }

  updateSubmitState();
  persistState();
}

function handleSubmit() {
  if (state.marked.size !== 2 || state.solved) return;

  state.attempts++;
  const [lieA, lieB] = [...state.marked];

  if (isConsistent(state.puzzle.allStmts, lieA, lieB)) {
    state.solved = true;
    persistState();
    setTimeout(showWinScreen, 300);
    return;
  }

  // Wrong answer — show violation message and flash button
  const msg = getViolationMessage(state.puzzle.allStmts, lieA, lieB);
  const feedbackEl = containerEl.querySelector('.verdict-feedback');
  feedbackEl.textContent = msg;

  const submitBtn = containerEl.querySelector('.verdict-submit-btn');
  submitBtn.classList.add('verdict-shake');
  submitBtn.addEventListener('animationend', () => submitBtn.classList.remove('verdict-shake'), { once: true });
}

// ── Persistence ───────────────────────────────────────────────────────────────

function persistState() {
  if (!cookieCallbacks?.saveMarked) return;
  cookieCallbacks.saveMarked({
    marked: [...state.marked],
    attempts: state.attempts,
    solved: state.solved,
  });
}

// ── Win screen ────────────────────────────────────────────────────────────────

function showWinScreen() {
  if (cookieCallbacks) cookieCallbacks.markComplete();

  const overlay = containerEl.querySelector('.win-overlay');
  overlay.hidden = false;
  startConfetti(containerEl.querySelector('.confetti-canvas'));

  const attemptsEl = overlay.querySelector('.verdict-win-attempts');
  if (attemptsEl) {
    attemptsEl.textContent = state.attempts === 1
      ? 'First try!'
      : `Solved in ${state.attempts} attempt${state.attempts !== 1 ? 's' : ''}.`;
  }

  const streakEl = overlay.querySelector('.streak');
  const saved = cookieCallbacks?.loadState(getTodayString());
  if (streakEl && saved?.streak > 1) {
    streakEl.textContent = `🔥 ${saved.streak} day streak`;
  }
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

function buildShareText() {
  const [sA, sB] = state.puzzle.solution;
  const rows = Array.from({ length: 2 }, (_, li) =>
    Array.from({ length: 4 }, (_, w) => {
      const stmtIdx = w * 2 + li;
      return (stmtIdx === sA || stmtIdx === sB) ? '🟥' : '🟩';
    }).join('')
  );
  const d = new Date(`${state.puzzle.puzzleDate}T12:00`);
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const attempts = state.attempts === 1 ? '1 attempt' : `${state.attempts} attempts`;
  return `Verdict ⚖️ – ${date}\n${rows.join('\n')}\n${attempts}\n${SITE_URL}`;
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

function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const colors = ['#5b8dee', '#7c5cbf', '#4caf7d', '#ffdd00', '#fc9043', '#e05c5c'];
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

// ── Init ──────────────────────────────────────────────────────────────────────

export function initVerdictGame(el, cookies) {
  containerEl = el;
  cookieCallbacks = cookies;

  const today = getTodayString();
  const puzzle = generateVerdictPuzzle(today);
  const saved = cookies.loadState(today);

  state = {
    puzzle,
    marked: new Set(saved?.marked ?? []),
    attempts: saved?.attempts ?? 0,
    solved: saved?.solved ?? false,
  };

  const tmpl = document.getElementById('verdict-template');
  const content = tmpl.content.cloneNode(true);
  el.innerHTML = '';
  el.appendChild(content);

  const dateEl = el.querySelector('.verdict-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }

  const streakEl = el.querySelector('.verdict-streak');
  if (streakEl && saved?.streak) {
    streakEl.textContent = `🔥 ${saved.streak}`;
  }

  const scenarioEl = el.querySelector('.verdict-scenario');
  if (scenarioEl) {
    scenarioEl.innerHTML = `<strong>${puzzle.scenario.title}.</strong> ${puzzle.scenario.intro}`;
  }

  el.querySelector('.verdict-submit-btn').addEventListener('click', handleSubmit);
  attachOverlayListeners(el);
  renderGame();

  if (state.solved) setTimeout(showWinScreen, 100);
}
