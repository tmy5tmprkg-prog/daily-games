// Test: verify Brew puzzle generation produces solvable puzzles in the
// desired par range across a span of dates. Run with: node test-brew.mjs

import {
  BREW_EMOJI_POOL,
  PRIMITIVES,
  COMBINATIONS,
  bfsDepths,
  generateBrewPuzzle,
  getEmoji,
} from './data/emoji-brew.js';

console.log('── Dataset summary ─────────────────────────────────────────────');
console.log(`pool: ${BREW_EMOJI_POOL.length} emojis`);
console.log(`primitives: ${PRIMITIVES.length}`);
console.log(`combinations: ${COMBINATIONS.length}`);

// ── Reachability from each primitive subset of 4 ────────────────────────────

console.log('');
console.log('── Reachability from full primitive set ───────────────────────');
const fullDepths = bfsDepths(PRIMITIVES);
const histogram = new Map();
for (const [, d] of fullDepths) histogram.set(d, (histogram.get(d) || 0) + 1);
const sortedDepths = [...histogram.keys()].sort((a, b) => a - b);
for (const d of sortedDepths) {
  console.log(`  depth ${d}: ${histogram.get(d)} emojis`);
}
console.log(`  total reachable: ${fullDepths.size} / ${BREW_EMOJI_POOL.length}`);

const unreachable = BREW_EMOJI_POOL.filter(e => !fullDepths.has(e.id));
if (unreachable.length > 0) {
  console.log(`  unreachable: ${unreachable.map(e => e.emoji + e.id).join(' ')}`);
}

// ── Daily puzzle generation across 60 dates ────────────────────────────────

console.log('');
console.log('── generateBrewPuzzle (60 dates from 2026-05-01) ──────────────');
console.log('date        starters                          target  par');
console.log('──────────────────────────────────────────────────────────────');

const start = new Date('2026-05-01');
const parHist = new Map();
const subsetSizeHist = new Map();
let failures = 0;
const N = 60;

for (let i = 0; i < N; i++) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + i);
  const dateStr = d.toISOString().slice(0, 10);
  let puzzle;
  try { puzzle = generateBrewPuzzle(dateStr); }
  catch (e) { console.log(`${dateStr}  FAILED: ${e.message}`); failures++; continue; }

  const startersStr = puzzle.starters.map(id => getEmoji(id).emoji).join('');
  const targetEmoji = getEmoji(puzzle.targetId).emoji;
  console.log(`${dateStr}  ${startersStr.padEnd(20)}  ${targetEmoji} ${puzzle.targetId.padEnd(14)}  ${puzzle.par}`);

  parHist.set(puzzle.par, (parHist.get(puzzle.par) || 0) + 1);
  subsetSizeHist.set(puzzle.starters.length, (subsetSizeHist.get(puzzle.starters.length) || 0) + 1);
}

console.log('');
console.log('── Par distribution ───────────────────────────────────────────');
for (const par of [...parHist.keys()].sort((a, b) => a - b)) {
  const pct = ((parHist.get(par) / N) * 100).toFixed(0);
  console.log(`  par=${par}: ${parHist.get(par)} (${pct}%)`);
}
console.log('');
console.log('── Starter subset size ─────────────────────────────────────────');
for (const size of [...subsetSizeHist.keys()].sort((a, b) => a - b)) {
  const pct = ((subsetSizeHist.get(size) / N) * 100).toFixed(0);
  console.log(`  size=${size}: ${subsetSizeHist.get(size)} (${pct}%)`);
}
console.log('');
console.log(`Failures: ${failures} / ${N}`);
