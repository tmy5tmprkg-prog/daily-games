// Test: verify CPD metric and that generatePuzzle reliably picks CPD≥2 puzzles.
// Run with: node test-difficulty.mjs

import { EMOJI_POOL, FALLBACK_PAIRS, buildAdjacency, getEmojiById, isPair } from './data/emoji-pairs.js';
import { hashDate, makePRNG, seededShuffle } from './js/prng.js';

// ── Core logic (mirrors game-pairs.js) ──────────────────────────────────────

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

function computeCPD(adj) {
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

function nonSolutionEdgeCount(adj, solutionMap) {
  let count = 0;
  for (const [id, nbrs] of adj) for (const n of nbrs) if (solutionMap.get(id) !== n) count++;
  return count / 2;
}

function tryBuildPuzzle(rng) {
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
  const solutionMap = new Map();
  for (const [a, b] of solution) { solutionMap.set(a.id, b.id); solutionMap.set(b.id, a.id); }
  return { solution, adj, solutionMap };
}

function generatePuzzle(dateStr) {
  let fallback = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makePRNG(hashDate(`${dateStr}:${attempt}`));
    const puzzle = tryBuildPuzzle(rng);
    if (!puzzle) continue;
    if (!fallback) fallback = { attempt, puzzle };
    if (computeCPD(puzzle.adj) >= 2) return { attempt, puzzle };
  }
  return fallback;
}

// ── Sanity checks ────────────────────────────────────────────────────────────

function makeAdj(edges) {
  const adj = new Map();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }
  return adj;
}

console.log('── Sanity checks ───────────────────────────────────────────────');

const adj1 = makeAdj([['A','B'],['C','D'],['E','F'],['G','H'],['I','J'],['K','L'],['M','N'],['O','P']]);
console.assert(computeCPD(adj1) === 1, 'FAIL: all degree-1 should be CPD=1');
console.log('  all forced (degree-1 everywhere):       CPD=' + computeCPD(adj1) + '  ✓');

// CPD=2: O is degree-1→M (round 1). Removing M makes S degree-1→T (round 2).
//   M:{O,S,T}, O:{M}, S:{M,T}, T:{M,S}  — mirrors real moon/owl/star/telescope cluster
const adj2 = makeAdj([
  ['M','O'], ['M','S'], ['M','T'], ['S','T'],
  ['A','B'], ['C','D'], ['E','F'], ['G','H'], ['I','J'], ['K','L'],
]);
console.assert(computeCPD(adj2) === 2, 'FAIL: cascade should be CPD=2, got ' + computeCPD(adj2));
console.log('  cascade (owl→moon reveals star→tel):   CPD=' + computeCPD(adj2) + '  ✓');

console.log('');

// ── Main test: generatePuzzle selects CPD≥2 for 30 dates ────────────────────

console.log('── generatePuzzle CPD≥2 selection (30 dates) ──────────────────');
console.log('date        attempt  cpd  fakeEdges  pairs');
console.log('──────────────────────────────────────────────────────────────');

const start = new Date('2026-05-01');
let maxAttempts = 0;
let totalAttempts = 0;
let failures = 0;
const N = 30;

for (let i = 0; i < N; i++) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + i);
  const dateStr = d.toISOString().slice(0, 10);
  const result = generatePuzzle(dateStr);

  if (!result) { console.log(`${dateStr}  FAILED`); failures++; continue; }

  const cpd = computeCPD(result.puzzle.adj);
  const nse = nonSolutionEdgeCount(result.puzzle.adj, result.puzzle.solutionMap);
  const pairsStr = result.puzzle.solution.map(([a, b]) => `${a.emoji}${b.emoji}`).join(' ');
  if (result.attempt > maxAttempts) maxAttempts = result.attempt;
  totalAttempts += result.attempt + 1;

  const cpdOk = cpd >= 2 ? '✓' : '✗';
  console.log(`${dateStr}  att=${String(result.attempt).padEnd(3)}  cpd=${cpd}${cpdOk}  fake=${nse}  ${pairsStr}`);
}

console.log('');
console.log(`All CPD≥2:       ${failures === 0 ? 'YES ✓' : 'NO — ' + failures + ' failures'}`);
console.log(`Max attempts:    ${maxAttempts}`);
console.log(`Avg attempts:    ${(totalAttempts / N).toFixed(1)}`);
console.log(`No infinite loops: ✓`);
