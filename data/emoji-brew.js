// Emoji combination dataset for the Brew game.
//
// The player starts with a daily-seeded subset of PRIMITIVES and combines
// emojis pairwise to discover new ones. Inputs persist (Little Alchemy style):
// a successful merge adds the result to the pool but doesn't consume the
// inputs. Difficulty (par) is the BFS shortest-path depth from the starter
// subset to the daily target, measured in successful merges.

export const BREW_EMOJI_POOL = Object.freeze([
  // Primitives
  { id: 'fire',         emoji: '🔥', label: 'Fire'          },
  { id: 'water',        emoji: '💧', label: 'Water'         },
  { id: 'earth',        emoji: '🌍', label: 'Earth'         },
  { id: 'air',          emoji: '💨', label: 'Air'           },
  { id: 'plant',        emoji: '🌱', label: 'Plant'         },
  { id: 'stone',        emoji: '🪨', label: 'Stone'         },
  { id: 'ice',          emoji: '🧊', label: 'Ice'           },
  { id: 'wood',         emoji: '🪵', label: 'Wood'          },
  { id: 'metal',        emoji: '🔩', label: 'Metal'         },
  { id: 'salt',         emoji: '🧂', label: 'Salt'          },
  // Tier 1 composites
  { id: 'steam',        emoji: '♨️',  label: 'Steam'         },
  { id: 'lava',         emoji: '🌋', label: 'Lava'          },
  { id: 'ash',          emoji: '⚱️',  label: 'Ash'           },
  { id: 'charcoal',     emoji: '⚫', label: 'Charcoal'      },
  { id: 'sword',        emoji: '🗡️',  label: 'Sword'         },
  { id: 'mud',          emoji: '🟫', label: 'Mud'           },
  { id: 'cloud',        emoji: '☁️',  label: 'Cloud'         },
  { id: 'tree',         emoji: '🌳', label: 'Tree'          },
  { id: 'boat',         emoji: '⛵', label: 'Boat'          },
  { id: 'sand',         emoji: '🏖️',  label: 'Sand'          },
  { id: 'ocean',        emoji: '🌊', label: 'Ocean'         },
  { id: 'grass',        emoji: '🌿', label: 'Grass'         },
  { id: 'forest',       emoji: '🌲', label: 'Forest'        },
  { id: 'mountain',     emoji: '⛰️',  label: 'Mountain'      },
  { id: 'ore',          emoji: '⛏️',  label: 'Ore'           },
  { id: 'snowman',      emoji: '⛄', label: 'Snowman'       },
  { id: 'desert',       emoji: '🏜️',  label: 'Desert'        },
  { id: 'leaf',         emoji: '🍃', label: 'Leaf'          },
  { id: 'snowflake',    emoji: '❄️',  label: 'Snowflake'     },
  { id: 'airplane',     emoji: '✈️',  label: 'Airplane'      },
  { id: 'kite',         emoji: '🪁', label: 'Kite'          },
  { id: 'bamboo',       emoji: '🎋', label: 'Bamboo'        },
  { id: 'pickle',       emoji: '🥒', label: 'Pickle'        },
  { id: 'house',        emoji: '🏠', label: 'House'         },
  { id: 'axe',          emoji: '🪓', label: 'Axe'           },
  { id: 'glacier',      emoji: '🏔️',  label: 'Glacier'       },
  // Tier 2+
  { id: 'glass',        emoji: '🪟', label: 'Glass'         },
  { id: 'rain',         emoji: '🌧️',  label: 'Rain'          },
  { id: 'wind',         emoji: '🌬️',  label: 'Wind'          },
  { id: 'snow',         emoji: '🌨️',  label: 'Snow'          },
  { id: 'lightning',    emoji: '⚡', label: 'Lightning'     },
  { id: 'fog',          emoji: '🌁', label: 'Fog'           },
  { id: 'sun',          emoji: '☀️',  label: 'Sun'           },
  { id: 'mushroom',     emoji: '🍄', label: 'Mushroom'      },
  { id: 'brick',        emoji: '🧱', label: 'Brick'         },
  { id: 'apple',        emoji: '🍎', label: 'Apple'         },
  { id: 'peak',         emoji: '🗻', label: 'Peak'          },
  { id: 'village',      emoji: '🏘️',  label: 'Village'       },
  { id: 'sunflower',    emoji: '🌻', label: 'Sunflower'     },
  { id: 'partlyCloudy', emoji: '⛅', label: 'Partly Cloudy' },
  { id: 'rainbow',      emoji: '🌈', label: 'Rainbow'       },
  { id: 'island',       emoji: '🏝️',  label: 'Island'        },
  { id: 'storm',        emoji: '⛈️',  label: 'Storm'         },
  { id: 'flower',       emoji: '🌸', label: 'Flower'        },
  { id: 'cactus',       emoji: '🌵', label: 'Cactus'        },
  { id: 'panda',        emoji: '🐼', label: 'Panda'         },
  { id: 'hurricane',    emoji: '🌀', label: 'Hurricane'     },
  { id: 'rose',         emoji: '🌹', label: 'Rose'          },
  { id: 'butterfly',    emoji: '🦋', label: 'Butterfly'     },
  { id: 'unicorn',      emoji: '🦄', label: 'Unicorn'       },
  // Expanded set
  { id: 'ink',          emoji: '✒️',  label: 'Ink'           },
  { id: 'shield',       emoji: '🛡️',  label: 'Shield'        },
  { id: 'mango',        emoji: '🥭', label: 'Mango'         },
  { id: 'ship',         emoji: '🚢', label: 'Ship'          },
  { id: 'coral',        emoji: '🪸', label: 'Coral'         },
  { id: 'lily',         emoji: '🪷', label: 'Lily'          },
  { id: 'waterfall',    emoji: '🏞️',  label: 'Waterfall'     },
  { id: 'puddle',        emoji: '💦', label: 'Puddle'        },
  { id: 'tea',          emoji: '🍵', label: 'Tea'           },
  { id: 'treehouse',    emoji: '🏡', label: 'Treehouse'     },
  { id: 'garden',       emoji: '🪴', label: 'Garden'        },
  { id: 'bottle',       emoji: '🍾', label: 'Bottle'        },
  { id: 'thunder',      emoji: '🌩️',  label: 'Thunder'       },
  { id: 'soup',         emoji: '🍲', label: 'Soup'          },
  { id: 'pie',          emoji: '🥧', label: 'Pie'           },
  { id: 'city',         emoji: '🏙️',  label: 'City'          },
  { id: 'palm',         emoji: '🌴', label: 'Palm'          },
  { id: 'magic',        emoji: '🪄', label: 'Magic'         },
  { id: 'fish',         emoji: '🐟', label: 'Fish'          },
  { id: 'dragon',       emoji: '🐉', label: 'Dragon'        },
  { id: 'tornado',      emoji: '🌪️',  label: 'Tornado'       },
  { id: 'witch',        emoji: '🧙', label: 'Witch'         },
  { id: 'potion',       emoji: '🧪', label: 'Potion'        },
  { id: 'crystal',      emoji: '💎', label: 'Crystal'       },
  { id: 'gem',          emoji: '💍', label: 'Gem'           },
  { id: 'castle',       emoji: '🏰', label: 'Castle'        },
  { id: 'pearl',        emoji: '🦪', label: 'Pearl'         },
  { id: 'shrimp',       emoji: '🦐', label: 'Shrimp'        },
]);

export const PRIMITIVES = Object.freeze([
  'fire', 'water', 'earth', 'air', 'plant', 'stone', 'ice', 'wood', 'metal', 'salt',
]);

// Curated combination rules. Order within a triple doesn't matter — lookup is
// done by sorted-pair edge key. Combinations whose result is already in the
// player's pool become silent no-ops at runtime.
export const COMBINATIONS = Object.freeze([
  // Tier 1 — primitive + primitive
  ['fire',  'water', 'steam'],
  ['fire',  'earth', 'lava'],
  ['fire',  'plant', 'ash'],
  ['fire',  'wood',  'charcoal'],
  ['fire',  'metal', 'sword'],
  ['fire',  'ice',   'water'],     // no-op when water already present
  ['fire',  'air',   'sun'],
  ['water', 'earth', 'mud'],
  ['water', 'air',   'cloud'],
  ['water', 'plant', 'tree'],
  ['water', 'wood',  'boat'],
  ['water', 'stone', 'sand'],
  ['water', 'salt',  'ocean'],
  ['earth', 'plant', 'grass'],
  ['earth', 'wood',  'forest'],
  ['earth', 'stone', 'mountain'],
  ['earth', 'metal', 'ore'],
  ['earth', 'salt',  'desert'],
  ['air',   'plant', 'leaf'],
  ['air',   'ice',   'snowflake'],
  ['air',   'metal', 'airplane'],
  ['air',   'wood',  'kite'],
  ['plant', 'wood',  'bamboo'],
  ['plant', 'salt',  'pickle'],
  ['wood',  'stone', 'house'],
  ['wood',  'metal', 'axe'],
  ['stone', 'ice',   'glacier'],
  // Tier 2 — composite + (primitive or composite)
  ['cloud', 'water', 'rain'],
  ['cloud', 'air',   'wind'],
  ['cloud', 'ice',   'snow'],
  ['cloud', 'fire',  'lightning'],
  ['cloud', 'earth', 'fog'],
  ['snow',  'earth', 'snowman'],
  ['mud',   'plant', 'mushroom'],
  ['mud',   'fire',  'brick'],
  ['tree',  'plant', 'apple'],
  ['sand',  'fire',  'glass'],
  ['mountain','cloud','peak'],
  ['house', 'earth', 'village'],
  // Tier 3
  ['sun',   'plant', 'sunflower'],
  ['sun',   'cloud', 'partlyCloudy'],
  ['sun',   'rain',  'rainbow'],
  ['rain',  'plant', 'flower'],
  ['ocean', 'stone', 'island'],
  ['ocean', 'cloud', 'storm'],
  ['desert','plant', 'cactus'],
  ['bamboo','earth', 'panda'],
  // Tier 4
  ['storm', 'ocean', 'hurricane'],
  ['flower','plant', 'rose'],
  ['flower','air',   'butterfly'],
  ['rainbow','sun',  'unicorn'],
  // Expanded combinations
  ['charcoal',  'water',  'ink'],
  ['sword',     'metal',  'shield'],
  ['sun',       'tree',   'mango'],
  ['boat',      'ocean',  'ship'],
  ['ocean',     'plant',  'coral'],
  ['grass',     'water',  'lily'],
  ['mountain',  'water',  'waterfall'],
  ['snowman',   'sun',    'puddle'],
  ['leaf',      'water',  'tea'],
  ['house',     'tree',   'treehouse'],
  ['house',     'plant',  'garden'],
  ['glass',     'water',  'bottle'],
  ['lightning', 'cloud',  'thunder'],
  ['mushroom',  'water',  'soup'],
  ['apple',     'house',  'pie'],
  ['village',   'metal',  'city'],
  ['island',    'plant',  'palm'],
  ['rainbow',   'air',    'magic'],
  ['coral',     'ocean',  'fish'],
  ['magic',     'fire',   'dragon'],
  ['wind',      'storm',  'tornado'],
  ['magic',     'potion', 'witch'],
  ['bottle',    'plant',  'potion'],
  ['salt',      'ore',    'crystal'],
  ['crystal',   'metal',  'gem'],
  ['village',   'stone',  'castle'],
  ['ocean',     'sand',   'pearl'],
  ['coral',     'earth',  'shrimp'],
]);

// ── Lookup ───────────────────────────────────────────────────────────────────

export function edgeKey(idA, idB) {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

const COMBO_MAP = new Map();
for (const [a, b, result] of COMBINATIONS) {
  COMBO_MAP.set(edgeKey(a, b), result);
}

export function getCombineResult(idA, idB) {
  if (idA === idB) return null;
  return COMBO_MAP.get(edgeKey(idA, idB)) ?? null;
}

export function getEmoji(id) {
  return BREW_EMOJI_POOL.find(e => e.id === id);
}

// ── BFS depth from a starter subset ──────────────────────────────────────────
//
// Because inputs persist when combined, the discovered set grows monotonically.
// At each level we expand the closure with every result reachable in a single
// merge from the current closure. This gives the minimum number of merges
// required to first reach each id — exactly the par metric we want.

export function bfsDepths(starterIds) {
  const depth = new Map();
  for (const id of starterIds) depth.set(id, 0);
  let level = 0;
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
    level++;
    for (const id of newAtThisLevel) depth.set(id, level);
  }
  return depth;
}

// ── Daily puzzle generation ──────────────────────────────────────────────────
//
// Mirrors generatePuzzle in game-pairs.js: hash the date with an attempt
// counter, seed an RNG, and try multiple seeds until we find a starter subset
// + target with par in the desired range. Falls back to the first generation
// that produced any reachable target.

import { hashDate, makePRNG, seededShuffle } from '../js/prng.js';

const MIN_PAR_HARD = 3;
const MAX_PAR = 7;

// Two-phase generation: prefer par >= 4 puzzles. Fall back to par >= 3 only
// when the seed family doesn't yield any deeper targets.
export function generateBrewPuzzle(seedStr) {
  let fallback = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makePRNG(hashDate(`${seedStr}:${attempt}`));
    const subsetSize = 4 + Math.floor(rng() * 3); // 4, 5, or 6
    const starters = seededShuffle([...PRIMITIVES], rng).slice(0, subsetSize);
    const depths = bfsDepths(starters);
    const minPar = attempt < 120 ? 4 : MIN_PAR_HARD;
    const candidates = [...depths.entries()]
      .filter(([, d]) => d >= minPar && d <= MAX_PAR)
      .map(([id, d]) => ({ id, par: d }));
    if (candidates.length === 0) {
      if (!fallback) {
        const any = [...depths.entries()].filter(([, d]) => d >= MIN_PAR_HARD);
        if (any.length > 0) {
          const [id, par] = any[Math.floor(rng() * any.length)];
          fallback = { puzzleDate: seedStr, starters, targetId: id, par };
        }
      }
      continue;
    }
    const pick = candidates[Math.floor(rng() * candidates.length)];
    return { puzzleDate: seedStr, starters, targetId: pick.id, par: pick.par };
  }
  if (fallback) return fallback;
  throw new Error(`Could not generate Brew puzzle for ${seedStr}`);
}
