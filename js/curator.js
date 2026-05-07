// Combination curator — see /Users/trevphil/.claude/plans/atomic-cooking-puffin.md

const STARTERS = ['🔥', '💧', '🌱', '🌬️'];
const TOP_K = 50;
const SAVE_DEBOUNCE_MS = 1000;

// ---------- Embeddings ----------

const META = [];                  // [{ char, name }] in vector row order
let EMB = null;                   // Float32Array, length = META.length * DIM
let DIM = 0;
const charToIndex = new Map();    // canonical char -> row index
const strippedToCanonical = new Map(); // FE0F-stripped char -> canonical char

const FE0F_RE = /️/g;
const BOM_RE = /^﻿/;
function stripFE0F(s) {
  return s.replace(FE0F_RE, '');
}

function canonChar(input) {
  if (!input) return input;
  const k = stripFE0F(input.normalize('NFC'));
  return strippedToCanonical.get(k) || input;
}

async function loadEmbeddings() {
  const [metaRes, binRes] = await Promise.all([
    fetch('data/emoji-embeddings.json'),
    fetch('data/emoji-embeddings.bin'),
  ]);
  if (!metaRes.ok || !binRes.ok) {
    throw new Error('Embeddings not found. Run `python tools/embed_emojis.py` first.');
  }
  const metaJson = await metaRes.json();
  const buf = await binRes.arrayBuffer();
  EMB = new Float32Array(buf);
  DIM = EMB.length / metaJson.length;
  if (!Number.isInteger(DIM)) {
    throw new Error(`Embedding size mismatch: ${EMB.length} floats / ${metaJson.length} rows`);
  }
  for (let i = 0; i < metaJson.length; i++) {
    const item = metaJson[i];
    META.push(item);
    charToIndex.set(item.char, i);
    strippedToCanonical.set(stripFE0F(item.char), item.char);
  }
  console.log(`loaded ${META.length} emojis × ${DIM} dims`);
}

function getEmb(char) {
  const i = charToIndex.get(char);
  if (i === undefined) return null;
  return EMB.subarray(i * DIM, (i + 1) * DIM);
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// ---------- State ----------

// edgeKey -> { p1, p2, child }; p1 < p2 (canonical sort).
const combinations = new Map();

let p1 = null;
let p2 = null;
let useMean = false;
let searchTerm = '';
let fileHandle = null;
let fileReady = false;    // permission validated and file read this session.
let lastSavedText = '';   // text last persisted to file
let saveTimer = null;
let activeSlot = null;    // 1 or 2 when picker dialog is open

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function canonicalPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

const HISTORY_MAX = 100;
const history = [];

function pushHistory(entry) {
  history.push(entry);
  if (history.length > HISTORY_MAX) history.shift();
}

function setCombo(a, b, child) {
  if (a === b) return;
  const [pa, pb] = canonicalPair(a, b);
  const key = edgeKey(pa, pb);
  const prev = combinations.get(key);
  if (prev && prev.child === child) return; // no-op
  combinations.set(key, { p1: pa, p2: pb, child });
  pushHistory({ type: 'set', key, prev });
  onMutated();
}

function deleteCombo(key) {
  const prev = combinations.get(key);
  if (!prev) return;
  combinations.delete(key);
  pushHistory({ type: 'delete', key, prev });
  onMutated();
}

function undo() {
  const last = history.pop();
  if (!last) return;
  if (last.type === 'set') {
    if (last.prev) combinations.set(last.key, last.prev);
    else combinations.delete(last.key);
  } else if (last.type === 'delete') {
    combinations.set(last.key, last.prev);
  }
  onMutated();
}

function parentPool() {
  const pool = new Set(STARTERS.map(canonChar));
  for (const v of combinations.values()) pool.add(v.child);
  return [...pool];
}

function reverseIndex() {
  const m = new Map();
  for (const v of combinations.values()) {
    if (!m.has(v.child)) m.set(v.child, []);
    m.get(v.child).push({ p1: v.p1, p2: v.p2 });
  }
  return m;
}

// ---------- Scoring ----------

function rankCandidates(p1Char, p2Char) {
  const e1 = getEmb(p1Char);
  const e2 = getEmb(p2Char);
  if (!e1 || !e2) return [];

  let queryVec = null;
  if (useMean) {
    queryVec = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) queryVec[i] = (e1[i] + e2[i]) / 2;
    let norm = 0;
    for (let i = 0; i < DIM; i++) norm += queryVec[i] * queryVec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < DIM; i++) queryVec[i] /= norm;
  }

  const out = [];
  for (let i = 0; i < META.length; i++) {
    const ch = META[i].char;
    if (ch === p1Char || ch === p2Char) continue;
    const v = EMB.subarray(i * DIM, (i + 1) * DIM);
    let score;
    if (useMean) {
      score = dot(v, queryVec);
    } else {
      const s1 = dot(v, e1);
      const s2 = dot(v, e2);
      score = Math.min(s1, s2);
    }
    out.push({ idx: i, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, TOP_K).map(o => ({ ...META[o.idx], score: o.score }));
}

function searchCandidates(term) {
  const tokens = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const out = [];
  for (let i = 0; i < META.length; i++) {
    const m = META[i];
    if (m.char === p1 || m.char === p2) continue;
    const haystack = (m.name + ' ' + (m.keywords || []).join(' ')).toLowerCase();
    if (tokens.every(t => haystack.includes(t))) {
      out.push({ ...m, score: null });
    }
    if (out.length >= 200) break;
  }
  return out;
}

// ---------- Serialize / parse ----------

function serialize() {
  const lines = [];
  const sorted = [...combinations.values()].sort((a, b) => {
    if (a.p1 !== b.p1) return a.p1 < b.p1 ? -1 : 1;
    return a.p2 < b.p2 ? -1 : 1;
  });
  for (const { p1, p2, child } of sorted) {
    lines.push(`${p1} + ${p2} = ${child}`);
  }
  return lines.join('\n') + (lines.length ? '\n' : '');
}

function parseFile(text) {
  const out = new Map();
  const stripped = text.replace(/^﻿/, '');
  for (const raw of stripped.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqParts = line.split(/\s*=\s*/);
    if (eqParts.length !== 2) continue;
    const left = eqParts[0].split(/\s*\+\s*/);
    if (left.length !== 2) continue;
    const a = canonChar(left[0]);
    const b = canonChar(left[1]);
    const c = canonChar(eqParts[1]);
    if (!a || !b || !c || a === b) continue;
    const [pa, pb] = canonicalPair(a, b);
    out.set(edgeKey(pa, pb), { p1: pa, p2: pb, child: c });
  }
  return out;
}

// ---------- IndexedDB ----------

const DB_NAME = 'curator-v1';
const STORE = 'kv';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- File IO ----------

const FSA_SUPPORTED = typeof window.showOpenFilePicker === 'function';
let fallbackFilename = 'combinations.txt';
let fallbackImported = false; // user has imported or chosen to start fresh in fallback mode.

async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

async function readFromFile() {
  if (!fileHandle) return '';
  const file = await fileHandle.getFile();
  return await file.text();
}

async function writeToFile(text) {
  if (!fileHandle) return;
  const w = await fileHandle.createWritable();
  await w.write(text);
  await w.close();
}

async function connectFile(action) {
  if (!FSA_SUPPORTED) return connectFileFallback(action);
  try {
    let handle;
    if (action === 'open') {
      const picked = await window.showOpenFilePicker({
        types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      handle = picked[0];
    } else {
      handle = await window.showSaveFilePicker({
        suggestedName: 'combinations.txt',
        types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }],
      });
    }
    if (!(await ensurePermission(handle))) {
      alert('Write permission denied.');
      return;
    }
    fileHandle = handle;
    fileReady = false;
    await idbSet('fileHandle', handle);
    await onFileConnected();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error(err);
    alert(`Could not connect file: ${err.message || err}`);
  }
}

function pickFallbackFile() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';
    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) return resolve(null);
      const text = await f.text();
      resolve({ name: f.name, text });
    };
    input.click();
  });
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function connectFileFallback(action) {
  if (action === 'open') {
    const picked = await pickFallbackFile();
    if (!picked) return;
    fallbackFilename = picked.name;
    const fromFile = parseFile(picked.text);
    const shadow = await idbGet('shadow');
    if (shadow && shadow !== picked.text && shadow !== serializeFromMap(fromFile)) {
      pendingShadow = shadow;
      pendingFileMap = fromFile;
      pendingFileText = picked.text;
      document.getElementById('recover-dialog').showModal();
      return;
    }
    combinations.clear();
    for (const [k, v] of fromFile) combinations.set(k, v);
    history.length = 0;
    lastSavedText = picked.text;
    fallbackImported = true;
    fileReady = true;
    render();
  } else {
    // create: start fresh in memory; first Save will download.
    combinations.clear();
    history.length = 0;
    lastSavedText = '';
    fallbackFilename = 'combinations.txt';
    fallbackImported = true;
    fileReady = true;
    render();
  }
}

async function onFileConnected() {
  let fileText = '';
  try {
    fileText = await readFromFile();
  } catch (err) {
    if (err && err.name === 'NotFoundError') {
      alert('File no longer exists. Please reconnect.');
      fileHandle = null;
      await idbDel('fileHandle');
      render();
      return;
    }
    throw err;
  }

  const shadow = await idbGet('shadow');
  const fromFile = parseFile(fileText);

  if (shadow && shadow !== fileText && shadow !== serializeFromMap(fromFile)) {
    // Shadow disagrees — user had unflushed changes.
    pendingShadow = shadow;
    pendingFileMap = fromFile;
    pendingFileText = fileText;
    document.getElementById('recover-dialog').showModal();
    return;
  }

  combinations.clear();
  for (const [k, v] of fromFile) combinations.set(k, v);
  history.length = 0; // fresh file = no undo history
  lastSavedText = fileText;
  fileReady = true;
  render();
}

let pendingShadow = null;
let pendingFileMap = null;
let pendingFileText = '';

function serializeFromMap(map) {
  const sorted = [...map.values()].sort((a, b) => {
    if (a.p1 !== b.p1) return a.p1 < b.p1 ? -1 : 1;
    return a.p2 < b.p2 ? -1 : 1;
  });
  return sorted.map(({ p1, p2, child }) => `${p1} + ${p2} = ${child}`).join('\n')
    + (sorted.length ? '\n' : '');
}

async function applyShadow() {
  const fromShadow = parseFile(pendingShadow);
  combinations.clear();
  for (const [k, v] of fromShadow) combinations.set(k, v);
  history.length = 0;
  lastSavedText = pendingFileText;
  fileReady = true;
  pendingShadow = null;
  pendingFileMap = null;
  scheduleSave();
  render();
}

async function discardShadow() {
  combinations.clear();
  for (const [k, v] of pendingFileMap) combinations.set(k, v);
  history.length = 0;
  lastSavedText = pendingFileText;
  fileReady = true;
  await idbDel('shadow');
  pendingShadow = null;
  pendingFileMap = null;
  render();
}

// ---------- Mutation pipeline ----------

function isDirty() {
  return serialize() !== lastSavedText;
}

function onMutated() {
  idbSet('shadow', serialize()).catch(console.error);
  if (fileReady && FSA_SUPPORTED) scheduleSave();
  render();
}

function scheduleSave() {
  if (!FSA_SUPPORTED) return; // fallback uses manual download only.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
}

async function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!FSA_SUPPORTED) {
    if (!fallbackImported) return;
    const text = serialize();
    downloadText(text, fallbackFilename);
    lastSavedText = text;
    await idbDel('shadow');
    render();
    return;
  }
  if (!fileHandle) return;
  if (!fileReady) {
    if (!(await ensurePermission(fileHandle))) {
      alert('Permission denied.');
      return;
    }
    await onFileConnected();
    if (!fileReady) return; // recovery dialog still open
  }
  const text = serialize();
  if (text === lastSavedText) return;
  try {
    await writeToFile(text);
    lastSavedText = text;
    await idbDel('shadow');
    render();
  } catch (err) {
    if (err && err.name === 'NotFoundError') {
      alert('File no longer exists. Please reconnect.');
      fileHandle = null;
      fileReady = false;
      await idbDel('fileHandle');
      render();
      return;
    }
    console.error('save failed', err);
  }
}

// ---------- Rendering ----------

function el(tag, opts = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(opts)) {
    if (k === 'class') node.className = v;
    else if (k === 'on') for (const [evt, fn] of Object.entries(v)) node.addEventListener(evt, fn);
    else if (k === 'attrs') for (const [a, val] of Object.entries(v)) node.setAttribute(a, val);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

function render() {
  renderSlots();
  renderCandidates();
  renderSidebar();
  renderFileBar();
}

function renderSlots() {
  const slot1 = document.querySelector('.slot[data-slot="1"]');
  const slot2 = document.querySelector('.slot[data-slot="2"]');
  for (const [slot, val] of [[slot1, p1], [slot2, p2]]) {
    slot.innerHTML = '';
    if (val) {
      slot.classList.add('filled');
      slot.append(document.createTextNode(val));
    } else {
      slot.classList.remove('filled');
      slot.append(el('span', { class: 'placeholder' }, '?'));
    }
  }
}

function renderFileBar() {
  const status = document.getElementById('file-status');
  const save = document.getElementById('save-btn');
  const undoBtn = document.getElementById('undo-btn');
  undoBtn.disabled = history.length === 0;

  if (!FSA_SUPPORTED) {
    if (fallbackImported) {
      status.textContent = `Fallback mode — ${fallbackFilename} (Save = download)`;
      status.classList.add('connected');
      status.classList.toggle('dirty', isDirty());
      save.disabled = !isDirty();
      save.textContent = 'Download';
    } else {
      status.textContent = 'Fallback mode (Safari/Firefox) — Open or Create to start';
      status.classList.remove('connected', 'dirty');
      save.disabled = true;
      save.textContent = 'Download';
    }
    return;
  }

  if (fileHandle && fileReady) {
    status.textContent = `Connected: ${fileHandle.name}`;
    status.classList.add('connected');
    status.classList.toggle('dirty', isDirty());
    save.disabled = !isDirty();
    save.textContent = 'Save';
  } else if (fileHandle && !fileReady) {
    status.textContent = `Cached: ${fileHandle.name}`;
    status.classList.remove('connected', 'dirty');
    save.disabled = false;
    save.textContent = 'Reconnect';
  } else {
    status.textContent = 'No file connected';
    status.classList.remove('connected', 'dirty');
    save.disabled = true;
    save.textContent = 'Save';
  }
}

function renderCandidates() {
  const grid = document.getElementById('candidates');
  const hint = document.getElementById('hint');
  grid.innerHTML = '';

  let items;
  if (searchTerm.trim()) {
    items = searchCandidates(searchTerm);
    hint.textContent = items.length ? `${items.length} match(es) for “${searchTerm.trim()}”` : `No matches for “${searchTerm.trim()}”`;
  } else if (p1 && p2) {
    items = rankCandidates(p1, p2);
    hint.textContent = `Top ${items.length} candidates by ${useMean ? 'mean' : 'min'} CLIP similarity`;
  } else {
    items = [];
    hint.textContent = 'Pick two parents to see candidate children, or use search.';
  }

  const rev = reverseIndex();
  for (const item of items) {
    const reuse = rev.get(item.char);
    const tile = el('button', {
      class: 'candidate' + (reuse ? ' reused' : ''),
      type: 'button',
      title: reuse
        ? `Already a child of: ${reuse.map(r => `${r.p1} + ${r.p2}`).join(', ')}`
        : item.name,
      on: { click: () => onCandidateChosen(item.char) },
    },
      el('span', { class: 'emoji' }, item.char),
      el('span', { class: 'name' }, item.name),
      item.score != null ? el('span', { class: 'score' }, item.score.toFixed(3)) : null,
      reuse ? el('span', { class: 'reuse-badge' }, String(reuse.length)) : null,
    );
    grid.append(tile);
  }
}

function renderSidebar() {
  const list = document.getElementById('combo-list');
  const count = document.getElementById('combo-count');
  list.innerHTML = '';
  const sorted = [...combinations.entries()].sort((a, b) => {
    if (a[1].p1 !== b[1].p1) return a[1].p1 < b[1].p1 ? -1 : 1;
    return a[1].p2 < b[1].p2 ? -1 : 1;
  });
  count.textContent = String(sorted.length);
  for (const [key, { p1: a, p2: b, child }] of sorted) {
    const li = el('li', {},
      `${a} + ${b} = ${child}`,
      el('button', {
        class: 'delete',
        type: 'button',
        title: 'Delete',
        on: { click: () => deleteCombo(key) },
      }, '×'),
    );
    list.append(li);
  }
}

// ---------- Parent picker ----------

function openParentPicker(slot) {
  activeSlot = slot;
  const grid = document.getElementById('parent-grid');
  grid.innerHTML = '';
  const otherSlot = slot === 1 ? p2 : p1;
  for (const ch of parentPool()) {
    if (ch === otherSlot) continue; // can't pair with self
    const meta = META[charToIndex.get(ch)] || { name: '' };
    const btn = el('button', {
      type: 'button',
      title: meta.name,
      on: { click: () => choosePicker(ch) },
    }, ch);
    grid.append(btn);
  }
  document.getElementById('parent-picker').showModal();
}

function choosePicker(ch) {
  if (activeSlot === 1) p1 = ch;
  else if (activeSlot === 2) p2 = ch;
  document.getElementById('parent-picker').close();
  activeSlot = null;
  searchTerm = '';
  document.getElementById('search').value = '';
  render();
}

// ---------- Candidate chosen ----------

function onCandidateChosen(child) {
  if (!p1 || !p2) {
    alert('Pick two parents first.');
    return;
  }
  setCombo(p1, p2, child);
  // Reset slots so the user can pick the next pair (the new child is now in the pool).
  p1 = null;
  p2 = null;
  searchTerm = '';
  document.getElementById('search').value = '';
  render();
}

// ---------- Boot ----------

async function boot() {
  try {
    await loadEmbeddings();
  } catch (err) {
    document.body.innerHTML =
      `<div style="padding:40px;font-family:sans-serif;color:#e26a6a">${err.message}</div>`;
    return;
  }

  // Wire up controls.
  for (const slot of document.querySelectorAll('.slot')) {
    slot.addEventListener('click', () => openParentPicker(Number(slot.dataset.slot)));
  }
  document.getElementById('reset-slots').addEventListener('click', () => {
    p1 = null; p2 = null;
    searchTerm = '';
    document.getElementById('search').value = '';
    render();
  });
  document.getElementById('search').addEventListener('input', e => {
    searchTerm = e.target.value;
    renderCandidates();
  });
  document.getElementById('metric-mean').addEventListener('change', e => {
    useMean = e.target.checked;
    renderCandidates();
  });
  document.getElementById('open-btn').addEventListener('click', () => connectFile('open'));
  document.getElementById('create-btn').addEventListener('click', () => connectFile('create'));
  document.getElementById('save-btn').addEventListener('click', saveNow);
  document.getElementById('undo-btn').addEventListener('click', undo);
  window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      undo();
    }
  });
  document.getElementById('parent-cancel').addEventListener('click', () => {
    document.getElementById('parent-picker').close();
    activeSlot = null;
  });
  document.getElementById('recover-yes').addEventListener('click', async () => {
    document.getElementById('recover-dialog').close();
    await applyShadow();
  });
  document.getElementById('recover-no').addEventListener('click', async () => {
    document.getElementById('recover-dialog').close();
    await discardShadow();
  });

  // beforeunload: ensure shadow is fresh. (File write isn't reliable here.)
  window.addEventListener('beforeunload', () => {
    if (isDirty()) {
      try { idbSet('shadow', serialize()); } catch {}
    }
  });

  // Try to recover cached file handle. Don't auto-request perms — needs a user gesture.
  if (FSA_SUPPORTED) {
    const cached = await idbGet('fileHandle');
    if (cached) fileHandle = cached;
  }

  render();
}

boot().catch(err => {
  console.error(err);
  alert(`Boot failed: ${err.message || err}`);
});
