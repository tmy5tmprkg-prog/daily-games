export const EMOJI_POOL = Object.freeze([
  { id: 'sun',         emoji: '☀️',  label: 'Sun'          },
  { id: 'sunflower',   emoji: '🌻',  label: 'Sunflower'    },
  { id: 'sunglasses',  emoji: '😎',  label: 'Sunglasses'   },
  { id: 'rainbow',     emoji: '🌈',  label: 'Rainbow'      },
  { id: 'moon',        emoji: '🌙',  label: 'Moon'         },
  { id: 'star',        emoji: '⭐',  label: 'Star'         },
  { id: 'owl',         emoji: '🦉',  label: 'Owl'          },
  { id: 'telescope',   emoji: '🔭',  label: 'Telescope'    },
  { id: 'frog',        emoji: '🐸',  label: 'Frog'         },
  { id: 'turtle',      emoji: '🐢',  label: 'Turtle'       },
  { id: 'blossom',     emoji: '🌸',  label: 'Blossom'      },
  { id: 'herb',        emoji: '🌿',  label: 'Herb'         },
  { id: 'hibiscus',    emoji: '🌺',  label: 'Hibiscus'     },
  { id: 'strawberry',  emoji: '🍓',  label: 'Strawberry'   },
  { id: 'bee',         emoji: '🐝',  label: 'Bee'          },
  { id: 'butterfly',   emoji: '🦋',  label: 'Butterfly'    },
  { id: 'caterpillar', emoji: '🐛',  label: 'Caterpillar'  },
  { id: 'parrot',      emoji: '🦜',  label: 'Parrot'       },
  { id: 'wave',        emoji: '🌊',  label: 'Wave'         },
  { id: 'surfer',      emoji: '🏄',  label: 'Surfer'       },
  { id: 'shell',       emoji: '🐚',  label: 'Shell'        },
  { id: 'crab',        emoji: '🦀',  label: 'Crab'         },
  { id: 'note',        emoji: '🎵',  label: 'Note'         },
  { id: 'notes',       emoji: '🎶',  label: 'Notes'        },
  { id: 'guitar',      emoji: '🎸',  label: 'Guitar'       },
  { id: 'piano',       emoji: '🎹',  label: 'Piano'        },
  { id: 'mic',         emoji: '🎤',  label: 'Mic'          },
  { id: 'key',         emoji: '🔑',  label: 'Key'          },
  { id: 'lock',        emoji: '🔒',  label: 'Lock'         },
  { id: 'shield',      emoji: '🛡️',  label: 'Shield'       },
  { id: 'sword',       emoji: '⚔️',  label: 'Sword'        },
  { id: 'cake',        emoji: '🍰',  label: 'Cake'         },
  { id: 'chocolate',   emoji: '🍫',  label: 'Chocolate'    },
  { id: 'candy',       emoji: '🍬',  label: 'Candy'        },
  { id: 'icecube',     emoji: '🧊',  label: 'Ice Cube'     },
  { id: 'pepper',      emoji: '🌶️',  label: 'Pepper'       },
  { id: 'fire',        emoji: '🔥',  label: 'Fire'         },
  { id: 'noodles',     emoji: '🍜',  label: 'Noodles'      },
  { id: 'cloud',       emoji: '☁️',  label: 'Cloud'        },
  { id: 'snowflake',   emoji: '❄️',  label: 'Snowflake'    },
  { id: 'partly',      emoji: '⛅',  label: 'Partly Cloudy'},
  { id: 'wrench',      emoji: '🔧',  label: 'Wrench'       },
  { id: 'bolt',        emoji: '🔩',  label: 'Bolt'         },
  { id: 'screwdriver', emoji: '🪛',  label: 'Screwdriver'  },
  { id: 'magnet',      emoji: '🧲',  label: 'Magnet'       },
  { id: 'rocket',      emoji: '🚀',  label: 'Rocket'       },
  { id: 'globe',       emoji: '🌍',  label: 'Globe'        },
  { id: 'ufo',         emoji: '🛸',  label: 'UFO'          },
]);

// Each entry is a [idA, idB] pair with a clear, immediate conceptual connection.
// Reviewed and pruned by semantic analysis — no "they're both in nature" level links.
export const VALID_PAIRS = Object.freeze([
  // ── Sky / sun ──────────────────────────────────────────────────────────────
  ['sun',        'sunflower'  ], // sunflower faces the sun
  ['sun',        'sunglasses' ], // sunglasses worn in bright sun
  ['sun',        'rainbow'    ], // sun + rain = rainbow
  // ── Night sky ──────────────────────────────────────────────────────────────
  ['moon',       'star'       ], // classic night sky pair
  ['moon',       'owl'        ], // owls are nocturnal
  ['moon',       'telescope'  ], // observe the moon through a telescope
  ['star',       'telescope'  ], // observe stars through a telescope
  // ── Garden / insects ───────────────────────────────────────────────────────
  ['sunflower',  'bee'        ], // bees pollinate sunflowers
  ['sunflower',  'butterfly'  ], // butterflies land on sunflowers
  ['blossom',    'herb'       ], // flowers and herbs in the garden
  ['blossom',    'bee'        ], // bees pollinate blossoms
  ['blossom',    'butterfly'  ], // butterflies on blossoms
  ['hibiscus',   'bee'        ], // bees visit hibiscus flowers
  ['hibiscus',   'butterfly'  ], // butterflies on hibiscus
  ['butterfly',  'caterpillar'], // caterpillar transforms into butterfly
  // ── Ocean / beach ──────────────────────────────────────────────────────────
  ['turtle',     'wave'       ], // sea turtles swim in the ocean
  ['turtle',     'shell'      ], // both shells, both ocean floor
  ['wave',       'surfer'     ], // surfers ride waves
  ['wave',       'shell'      ], // shells wash up with waves
  ['wave',       'crab'       ], // crabs live at the ocean's edge
  ['shell',      'crab'       ], // both classic beach finds
  // ── Pond / swamp ───────────────────────────────────────────────────────────
  ['frog',       'turtle'     ], // both pond animals
  // ── Music ──────────────────────────────────────────────────────────────────
  ['note',       'notes'      ], // single note vs double notes, same symbol family
  ['parrot',     'note'       ], // parrots mimic sounds / sing
  ['parrot',     'notes'      ], // parrots mimic sounds / sing
  ['guitar',     'piano'      ], // two instruments
  ['guitar',     'mic'        ], // guitar + mic for live performance
  ['piano',      'mic'        ], // piano + mic for live performance
  // ── Security / combat ──────────────────────────────────────────────────────
  ['key',        'lock'       ], // key unlocks lock
  ['shield',     'sword'      ], // warrior pair
  // ── Sweets ─────────────────────────────────────────────────────────────────
  ['strawberry', 'cake'       ], // strawberry shortcake
  ['strawberry', 'chocolate'  ], // chocolate-covered strawberry
  ['cake',       'chocolate'  ], // chocolate cake
  ['chocolate',  'candy'      ], // both confections
  // ── Hot food ───────────────────────────────────────────────────────────────
  ['pepper',     'fire'       ], // hot pepper = fire/heat
  ['fire',       'noodles'    ], // cooking noodles over fire / hot ramen
  // ── Cold / ice ─────────────────────────────────────────────────────────────
  ['icecube',    'fire'       ], // fire and ice, classic opposites
  ['icecube',    'snowflake'  ], // both frozen water
  // ── Weather ────────────────────────────────────────────────────────────────
  ['cloud',      'partly'     ], // partly cloudy = cloud + sun
  ['snowflake',  'partly'     ], // cold/wintry sky
  // ── Tools ──────────────────────────────────────────────────────────────────
  ['wrench',     'bolt'       ], // wrench tightens bolts
  ['wrench',     'screwdriver'], // both hand tools for assembly
  ['screwdriver','magnet'     ], // magnetized screwdriver tips are a real tool feature
  // ── Space ──────────────────────────────────────────────────────────────────
  ['rocket',     'globe'      ], // rocket launching from / orbiting Earth
  ['rocket',     'ufo'        ], // both spacecraft
  ['globe',      'ufo'        ], // UFO visiting Earth
]);

// O(1) pair lookup — canonical form sorts the two IDs
const _PAIR_SET = new Set(VALID_PAIRS.map(([a, b]) => [a, b].sort().join('|')));
export function isPair(idA, idB) {
  return _PAIR_SET.has([idA, idB].sort().join('|'));
}

// Fallback puzzle — 8 pairs that are forced (each emoji has only 1 valid partner
// within this set), guaranteeing a unique solution without any computation.
export const FALLBACK_PAIRS = Object.freeze([
  ['sun',        'rainbow'    ], // rainbow→sun only
  ['moon',       'owl'        ], // owl→moon only
  ['frog',       'turtle'     ], // frog→turtle only (within this set)
  ['blossom',    'herb'       ], // herb→blossom only
  ['butterfly',  'caterpillar'], // caterpillar→butterfly only
  ['wave',       'surfer'     ], // surfer→wave only
  ['key',        'lock'       ], // both forced
  ['shield',     'sword'      ], // both forced
]);

export function buildAdjacency(emojiSubset) {
  const ids = new Set(emojiSubset.map(e => e.id));
  const adj = new Map();
  for (const e of emojiSubset) adj.set(e.id, new Set());
  for (const [a, b] of VALID_PAIRS) {
    if (ids.has(a) && ids.has(b)) {
      adj.get(a).add(b);
      adj.get(b).add(a);
    }
  }
  return adj;
}

export function getEmojiById(id) {
  return EMOJI_POOL.find(e => e.id === id);
}
