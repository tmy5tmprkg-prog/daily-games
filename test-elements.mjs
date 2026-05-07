// Test: verify Elements puzzle generation produces solvable puzzles in each
// difficulty tier across a span of dates. Run with: node test-elements.mjs

import {
  ELEMENTS_EMOJI_POOL,
  STARTERS,
  COMBINATIONS,
  TIERS,
  TIER_BANDS,
  bfsDepths,
  generateElementsPuzzle,
  getEmoji,
} from './data/emoji-elements.js';

let failures = 0;
function assert(cond, msg) {
  if (cond) return;
  console.error('  FAIL:', msg);
  failures++;
}

console.log('── Dataset summary ─────────────────────────────────────────────');
console.log(`pool: ${ELEMENTS_EMOJI_POOL.length} emojis`);
console.log(`combinations: ${COMBINATIONS.length}`);
console.log(`starters: ${STARTERS.map(id => getEmoji(id).emoji).join(' ')}`);

// ── Reachability from the four starters ────────────────────────────────────

console.log('');
console.log('── Reachability from starters ─────────────────────────────────');
const depths = bfsDepths(STARTERS);
const histogram = new Map();
for (const [, d] of depths) histogram.set(d, (histogram.get(d) || 0) + 1);
const sortedDepths = [...histogram.keys()].sort((a, b) => a - b);
for (const d of sortedDepths) {
  console.log(`  depth ${d}: ${histogram.get(d)} emojis`);
}
console.log(`  total reachable: ${depths.size} / ${ELEMENTS_EMOJI_POOL.length}`);

const orphans = ELEMENTS_EMOJI_POOL.filter(e => !depths.has(e.id));
assert(orphans.length === 0, `unreachable nodes: ${orphans.map(e => e.id).join(', ')}`);

const maxDepth = Math.max(...depths.values());
console.log(`  max depth: ${maxDepth}`);
const hardMax = TIER_BANDS.hard[1];
assert(maxDepth >= TIER_BANDS.hard[0], `max depth ${maxDepth} below hard min ${TIER_BANDS.hard[0]}`);
if (maxDepth < hardMax) {
  console.warn(`  note: max depth ${maxDepth} < hard band max ${hardMax} — hard tier will cap at ${maxDepth}`);
}

// ── Per-tier candidate count ────────────────────────────────────────────────

console.log('');
console.log('── Per-tier candidates ───────────────────────────────────────');
const starterSet = new Set(STARTERS);
for (const tier of TIERS) {
  const [lo, hi] = TIER_BANDS[tier];
  const candidates = [...depths.entries()]
    .filter(([id, d]) => d >= lo && d <= hi && !starterSet.has(id));
  console.log(`  ${tier} (par ${lo}–${hi}): ${candidates.length} candidates`);
  assert(candidates.length > 0, `no candidates in tier ${tier}`);
}

// ── 60 days × 3 tiers = 180 daily puzzles ───────────────────────────────────

console.log('');
console.log('── generateElementsPuzzle (60 dates × 3 tiers) ────────────────');
const start = new Date('2026-05-01');
const N = 60;
const perTierParHist = { easy: new Map(), medium: new Map(), hard: new Map() };

for (let i = 0; i < N; i++) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + i);
  const dateStr = d.toISOString().slice(0, 10);
  for (const tier of TIERS) {
    let puzzle;
    try {
      puzzle = generateElementsPuzzle(dateStr, tier);
    } catch (e) {
      assert(false, `${dateStr} ${tier}: ${e.message}`);
      continue;
    }
    const [lo, hi] = TIER_BANDS[tier];
    assert(puzzle.par >= lo, `${dateStr} ${tier}: par ${puzzle.par} below band [${lo},${hi}]`);
    assert(puzzle.par <= Math.min(hi, maxDepth), `${dateStr} ${tier}: par ${puzzle.par} above band [${lo},${hi}]`);
    assert(puzzle.targetId !== undefined, `${dateStr} ${tier}: missing targetId`);
    assert(!starterSet.has(puzzle.targetId), `${dateStr} ${tier}: target is a starter`);
    perTierParHist[tier].set(puzzle.par, (perTierParHist[tier].get(puzzle.par) || 0) + 1);
  }
}

for (const tier of TIERS) {
  const hist = perTierParHist[tier];
  const parts = [...hist.keys()].sort((a, b) => a - b)
    .map(p => `par=${p}:${hist.get(p)}`).join(' ');
  console.log(`  ${tier}: ${parts}`);
}

// ── Sample puzzles per tier ────────────────────────────────────────────────

console.log('');
console.log('── Sample puzzles (first 8 dates per tier) ────────────────────');
for (const tier of TIERS) {
  console.log(`  ${tier}:`);
  for (let i = 0; i < 8; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const p = generateElementsPuzzle(dateStr, tier);
    const t = getEmoji(p.targetId);
    console.log(`    ${dateStr}  ${t.emoji} ${t.label.padEnd(14)} par=${p.par}`);
  }
}

console.log('');
if (failures === 0) {
  console.log('✅ All checks passed.');
} else {
  console.log(`❌ ${failures} failure(s).`);
  process.exit(1);
}
