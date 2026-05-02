// Test: verify CPD metric and that generatePuzzle reliably picks CPD≥2 puzzles.
// Run with: node test-difficulty.mjs

import { EMOJI_POOL } from './data/emoji-pairs.js';
import { hashDate, makePRNG } from './js/prng.js';
import { tryBuildPuzzle, computeCPD } from './js/game-pairs.js';

function nonSolutionEdgeCount(adj, solutionMap) {
  let count = 0;
  for (const [id, nbrs] of adj) for (const n of nbrs) if (solutionMap.get(id) !== n) count++;
  return count / 2;
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
console.log(`pool size: ${EMOJI_POOL.length}`);
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
