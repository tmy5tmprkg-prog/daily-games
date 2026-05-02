export const EMOJI_POOL = Object.freeze([
  // sky_day (G01)
  { id: 'sun',        emoji: '☀️',  label: 'Sun',         groups: ['G01', 'G12'] },
  { id: 'sunflower',  emoji: '🌻',  label: 'Sunflower',   groups: ['G04', 'G01'] },
  { id: 'sunglasses', emoji: '😎',  label: 'Sunglasses',  groups: ['G01'] },
  { id: 'rainbow',    emoji: '🌈',  label: 'Rainbow',     groups: ['G12', 'G01'] },
  // sky_night (G02)
  { id: 'moon',       emoji: '🌙',  label: 'Moon',        groups: ['G02', 'G14'] },
  { id: 'star',       emoji: '⭐',  label: 'Star',        groups: ['G02', 'G14'] },
  { id: 'owl',        emoji: '🦉',  label: 'Owl',         groups: ['G02', 'G06'] },
  { id: 'telescope',  emoji: '🔭',  label: 'Telescope',   groups: ['G14', 'G02'] },
  // nature_water (G03)
  { id: 'frog',       emoji: '🐸',  label: 'Frog',        groups: ['G06', 'G03'] },
  { id: 'turtle',     emoji: '🐢',  label: 'Turtle',      groups: ['G06', 'G07'] },
  // nature_flora (G04)
  { id: 'blossom',    emoji: '🌸',  label: 'Blossom',     groups: ['G04', 'G05'] },
  { id: 'herb',       emoji: '🌿',  label: 'Herb',        groups: ['G04'] },
  { id: 'hibiscus',   emoji: '🌺',  label: 'Hibiscus',    groups: ['G04', 'G07'] },
  { id: 'strawberry', emoji: '🍓',  label: 'Strawberry',  groups: ['G10', 'G04'] },
  // nature_fauna_insect (G05)
  { id: 'bee',        emoji: '🐝',  label: 'Bee',         groups: ['G05', 'G04'] },
  { id: 'butterfly',  emoji: '🦋',  label: 'Butterfly',   groups: ['G05', 'G04'] },
  { id: 'caterpillar',emoji: '🐛',  label: 'Caterpillar', groups: ['G05'] },
  // nature_fauna_mammal (G06)
  { id: 'parrot',     emoji: '🦜',  label: 'Parrot',      groups: ['G06', 'G08'] },
  // ocean (G07)
  { id: 'wave',       emoji: '🌊',  label: 'Wave',        groups: ['G07', 'G03', 'G12'] },
  { id: 'surfer',     emoji: '🏄',  label: 'Surfer',      groups: ['G07'] },
  { id: 'shell',      emoji: '🐚',  label: 'Shell',       groups: ['G07'] },
  { id: 'crab',       emoji: '🦀',  label: 'Crab',        groups: ['G07'] },
  // music (G08)
  { id: 'note',       emoji: '🎵',  label: 'Music Note',  groups: ['G08'] },
  { id: 'notes',      emoji: '🎶',  label: 'Notes',       groups: ['G08'] },
  { id: 'guitar',     emoji: '🎸',  label: 'Guitar',      groups: ['G08'] },
  { id: 'piano',      emoji: '🎹',  label: 'Piano',       groups: ['G08'] },
  { id: 'mic',        emoji: '🎤',  label: 'Microphone',  groups: ['G08'] },
  // security (G09)
  { id: 'key',        emoji: '🔑',  label: 'Key',         groups: ['G09'] },
  { id: 'lock',       emoji: '🔒',  label: 'Lock',        groups: ['G09'] },
  { id: 'shield',     emoji: '🛡️',  label: 'Shield',      groups: ['G09'] },
  { id: 'sword',      emoji: '⚔️',  label: 'Sword',       groups: ['G09', 'G13'] },
  // food_sweet (G10)
  { id: 'cake',       emoji: '🍰',  label: 'Cake',        groups: ['G10'] },
  { id: 'chocolate',  emoji: '🍫',  label: 'Chocolate',   groups: ['G10'] },
  { id: 'candy',      emoji: '🍬',  label: 'Candy',       groups: ['G10'] },
  { id: 'icecube',    emoji: '🧊',  label: 'Ice Cube',    groups: ['G12', 'G10'] },
  // food_hot (G11)
  { id: 'pepper',     emoji: '🌶️',  label: 'Pepper',      groups: ['G11'] },
  { id: 'fire',       emoji: '🔥',  label: 'Fire',        groups: ['G11', 'G12'] },
  { id: 'noodles',    emoji: '🍜',  label: 'Noodles',     groups: ['G11'] },
  // weather (G12)
  { id: 'cloud',      emoji: '☁️',  label: 'Cloud',       groups: ['G12'] },
  { id: 'snowflake',  emoji: '❄️',  label: 'Snowflake',   groups: ['G12'] },
  { id: 'partly',     emoji: '⛅',  label: 'Partly Cloudy',groups: ['G12', 'G01'] },
  // tools (G13)
  { id: 'wrench',     emoji: '🔧',  label: 'Wrench',      groups: ['G13'] },
  { id: 'bolt',       emoji: '🔩',  label: 'Bolt',        groups: ['G13'] },
  { id: 'screwdriver',emoji: '🪛',  label: 'Screwdriver', groups: ['G13'] },
  { id: 'magnet',     emoji: '🧲',  label: 'Magnet',      groups: ['G13'] },
  // celestial (G14)
  { id: 'rocket',     emoji: '🚀',  label: 'Rocket',      groups: ['G14'] },
  { id: 'globe',      emoji: '🌍',  label: 'Globe',       groups: ['G14'] },
  { id: 'ufo',        emoji: '🛸',  label: 'UFO',         groups: ['G14'] },
]);

// Any emoji in groupA can validly pair with any emoji in groupB (and vice versa)
export const PAIR_RULES = Object.freeze([
  { groupA: 'G01', groupB: 'G01' },
  { groupA: 'G02', groupB: 'G02' },
  { groupA: 'G04', groupB: 'G05' }, // flora + insects
  { groupA: 'G07', groupB: 'G07' },
  { groupA: 'G08', groupB: 'G08' },
  { groupA: 'G09', groupB: 'G09' },
  { groupA: 'G10', groupB: 'G10' },
  { groupA: 'G11', groupB: 'G11' },
  { groupA: 'G12', groupB: 'G12' },
  { groupA: 'G13', groupB: 'G13' },
  { groupA: 'G14', groupB: 'G14' },
  { groupA: 'G06', groupB: 'G03' }, // mammals + water habitat
  { groupA: 'G01', groupB: 'G12' }, // sun/sky + weather
  { groupA: 'G14', groupB: 'G02' }, // celestial + night sky
]);

// Guaranteed-unambiguous pairs used as fallback if random selection fails
export const ANCHOR_PAIRS = Object.freeze([
  ['key',         'lock'],
  ['wrench',      'screwdriver'],
  ['guitar',      'piano'],
  ['chocolate',   'candy'],
  ['pepper',      'noodles'],
  ['rocket',      'ufo'],
  ['snowflake',   'cloud'],
  ['caterpillar', 'hibiscus'],
]);

function groupsOf(emojiObj) {
  return emojiObj.groups;
}

function arePairs(a, b) {
  if (a.id === b.id) return false;
  for (const rule of PAIR_RULES) {
    const aInA = a.groups.includes(rule.groupA);
    const aInB = a.groups.includes(rule.groupB);
    const bInA = b.groups.includes(rule.groupA);
    const bInB = b.groups.includes(rule.groupB);
    if ((aInA && bInB) || (aInB && bInA)) return true;
  }
  return false;
}

export function buildAdjacency(emojiSubset) {
  const adj = new Map();
  for (const e of emojiSubset) adj.set(e.id, new Set());
  for (let i = 0; i < emojiSubset.length; i++) {
    for (let j = i + 1; j < emojiSubset.length; j++) {
      if (arePairs(emojiSubset[i], emojiSubset[j])) {
        adj.get(emojiSubset[i].id).add(emojiSubset[j].id);
        adj.get(emojiSubset[j].id).add(emojiSubset[i].id);
      }
    }
  }
  return adj;
}

export function getEmojiById(id) {
  return EMOJI_POOL.find(e => e.id === id);
}
