// Elements game dataset.
//
// Data lives in `data/combinations.txt` (curated via curator.html) and
// `data/emoji-embeddings.json` (labels). Loaded lazily by `loadElements()`
// the first time the elements game tab is opened, so the module evaluates
// synchronously and the rest of the app boots without waiting on a fetch.
//
// Schema in combinations.txt: one line per pair, `<p1> + <p2> = <child>`.
// Empty lines and `#`-prefixed comments are ignored. The curator writes parent
// chars in canonical sorted order and strips trailing U+FE0F variation
// selectors; we follow the same conventions here.

import { hashDate, makePRNG } from '../js/prng.js';

// ── Live-binding exports populated by loadElements() ─────────────────────────

export let ELEMENTS_EMOJI_POOL = Object.freeze([]);
export let STARTERS = Object.freeze([]);
export let COMBINATIONS = Object.freeze([]);

let COMBO_MAP = new Map();
let POOL_BY_ID = new Map();
let loadPromise = null;

// ── Loader (idempotent, cached) ──────────────────────────────────────────────

const STARTER_INPUTS = ['🔥', '💧', '🌱', '🌬️'];
const FE0F_RE = /️/g;
const BOM_RE = /^﻿/;
const stripFE0F = s => s.replace(FE0F_RE, '');

async function loadText(relativeToModule) {
  const url = new URL(relativeToModule, import.meta.url);
  if (typeof window !== 'undefined') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return await res.text();
  }
  // Node ESM (used by test-elements.mjs).
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  return await readFile(fileURLToPath(url), 'utf8');
}

function parseCombinations(text, strippedToCanonical) {
  const out = [];
  const cleaned = text.replace(BOM_RE, '');
  const canon = ch => {
    const k = stripFE0F((ch || '').normalize('NFC'));
    return strippedToCanonical.get(k) || ch;
  };
  for (const raw of cleaned.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.split(/\s*=\s*/);
    if (eq.length !== 2) continue;
    const left = eq[0].split(/\s*\+\s*/);
    if (left.length !== 2) continue;
    const a = canon(left[0]);
    const b = canon(left[1]);
    const c = canon(eq[1]);
    if (!a || !b || !c || a === b) continue;
    out.push([a, b, c]);
  }
  return out;
}

export function loadElements() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [combinationsText, embeddingsJSON] = await Promise.all([
      loadText('./combinations.txt'),
      loadText('./emoji-embeddings.json'),
    ]);

    const embeddings = JSON.parse(embeddingsJSON);
    const labelOf = new Map();
    const strippedToCanonical = new Map();
    for (const item of embeddings) {
      strippedToCanonical.set(stripFE0F(item.char), item.char);
      const label = item.name ? item.name.charAt(0).toUpperCase() + item.name.slice(1) : item.char;
      labelOf.set(item.char, label);
    }

    const canonStarters = STARTER_INPUTS.map(ch => {
      const k = stripFE0F(ch.normalize('NFC'));
      return strippedToCanonical.get(k) || ch;
    });

    const triples = parseCombinations(combinationsText, strippedToCanonical);
    const poolSet = new Set(canonStarters);
    for (const [a, b, c] of triples) { poolSet.add(a); poolSet.add(b); poolSet.add(c); }

    ELEMENTS_EMOJI_POOL = Object.freeze(
      [...poolSet].map(ch => Object.freeze({
        id: ch,
        emoji: ch,
        label: labelOf.get(ch) || ch,
      })),
    );
    STARTERS = Object.freeze([...canonStarters]);
    COMBINATIONS = Object.freeze(triples.map(t => Object.freeze([...t])));

    COMBO_MAP = new Map();
    for (const [a, b, result] of COMBINATIONS) {
      COMBO_MAP.set(edgeKey(a, b), result);
    }
    POOL_BY_ID = new Map(ELEMENTS_EMOJI_POOL.map(e => [e.id, e]));
  })();
  return loadPromise;
}

// ── Lookup ───────────────────────────────────────────────────────────────────

export function edgeKey(idA, idB) {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

export function getCombineResult(idA, idB) {
  if (idA === idB) return null;
  return COMBO_MAP.get(edgeKey(idA, idB)) ?? null;
}

export function getEmoji(id) {
  return POOL_BY_ID.get(id);
}

// ── BFS depth from the starter set ───────────────────────────────────────────

export function bfsDepths(starterIds) {
  const depth = new Map();
  for (const id of starterIds) depth.set(id, 0);
  while (true) {
    const closure = [...depth.keys()];
    const newAtThisLevel = new Set();
    for (let i = 0; i < closure.length; i++) {
      for (let j = i + 1; j < closure.length; j++) {
        const result = getCombineResult(closure[i], closure[j]);
        if (result && !depth.has(result) && !newAtThisLevel.has(result)) {
          newAtThisLevel.add(result);
        }
      }
    }
    if (newAtThisLevel.size === 0) break;
    const nextLevel = Math.max(...depth.values()) + 1;
    for (const id of newAtThisLevel) depth.set(id, nextLevel);
  }
  return depth;
}

// ── Daily puzzle generation ──────────────────────────────────────────────────

export const TIERS = Object.freeze(['easy', 'medium', 'hard']);

export const TIER_BANDS = Object.freeze({
  easy:   [2, 3],
  medium: [4, 6],
  hard:   [7, 10],
});

export const TIER_LABELS = Object.freeze({
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
});

export function generateElementsPuzzle(seedStr, tier) {
  const band = TIER_BANDS[tier];
  if (!band) throw new Error(`Unknown tier: ${tier}`);
  const [minPar, maxPar] = band;
  const depths = bfsDepths(STARTERS);
  const starterSet = new Set(STARTERS);
  const candidates = [...depths.entries()]
    .filter(([id, d]) => d >= minPar && d <= maxPar && !starterSet.has(id))
    .map(([id, par]) => ({ id, par }));

  if (candidates.length === 0) {
    const fallback = [...depths.entries()]
      .filter(([id, d]) => d >= minPar && !starterSet.has(id))
      .map(([id, par]) => ({ id, par }))
      .sort((a, b) => a.par - b.par);
    if (fallback.length === 0) {
      throw new Error(`No targets reachable for tier ${tier} from ${seedStr}`);
    }
    const pick = fallback[0];
    return { puzzleDate: seedStr, tier, starters: [...STARTERS], targetId: pick.id, par: pick.par };
  }

  const rng = makePRNG(hashDate(`${seedStr}:${tier}`));
  const pick = candidates[Math.floor(rng() * candidates.length)];
  return { puzzleDate: seedStr, tier, starters: [...STARTERS], targetId: pick.id, par: pick.par };
}
