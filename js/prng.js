export function hashDate(dateStr) {
  let h = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    h = Math.imul(h, 33) ^ dateStr.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

export function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(array, rng) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getTodayString() {
  return new Date().toLocaleDateString('sv');
}
