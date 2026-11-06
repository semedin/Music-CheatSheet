/* transplant-model:start */
// Transplant's reference model: one shape for every arrangement Transplant can borrow, whether it was measured
// from audio by X-Ray and Blueprint, read from a Blueprint JSON file (version 1 or 2), or written as a built-in
// shape. Everything is per beat (lanes, tension) or in beats (moves), and the lanes are then read per bar with a
// phrase-aware segmentation so a part comes in or goes out on a bar line, preferably the start of a phrase.
// Pure JavaScript, no DOM: transplant-src/test.mjs runs this exact code.
const TM = (() => {
'use strict';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fin = v => typeof v === 'number' && Number.isFinite(v);
const mean = a => { let s = 0, c = 0; for (const v of a) if (fin(v)) { s += v; c++; } return c ? s / c : 0; };

// The element lanes Blueprint measures, in its order. w is the weight a lane carries in the energy of a bar.
const LANES = [
  {k: 'kick', name: 'Kick', c: '#FF4B32', w: 3}, {k: 'clap', name: 'Clap / snare', c: '#FF8A2B', w: 2.5}, {k: 'hats', name: 'Hats', c: '#FFC531', w: 1.5},
  {k: 'top', name: 'Sustained highs', c: '#E8D48B', w: 1}, {k: 'bass', name: 'Bass', c: '#E07B39', w: 2.5},
  {k: 'pads', name: 'Chords / synths', c: '#3FD0C9', w: 1.5}, {k: 'fx', name: 'Noise / FX', c: '#A78BFA', w: 0.6}];
const LK = LANES.map(l => l.k), LANE = Object.fromEntries(LANES.map(l => [l.k, l]));
const LABELS = ['Intro', 'Groove', 'Break', 'Build', 'Drop', 'Outro'];
const LABEL_COLOR = {Intro: '#3FD0C9', Groove: '#5FBF52', Break: '#A78BFA', Build: '#FFC531', Drop: '#FF4B32', Outro: '#9C9484'};
const CAT = {lp: 'Filter', hp: 'Filter', lpStatic: 'Filter', hpStatic: 'Filter', riser: 'Riser', reverse: 'Riser', pitchUp: 'Riser', pitchDown: 'Riser', roll: 'Drums', kickOut: 'Drums', gap: 'Space', tail: 'Space', echo: 'Space', crash: 'Impact', boom: 'Impact', stutter: 'Glitch', tapeStop: 'Glitch', width: 'Mix', fade: 'Mix'};
const COLOR = {Filter: '#7CE7FF', Riser: '#A78BFA', Drums: '#FF8A2B', Space: '#5FBF52', Impact: '#FF4B32', Glitch: '#FFC531', Mix: '#3FD0C9'};
const CATS = ['Filter', 'Riser', 'Drums', 'Space', 'Impact', 'Glitch', 'Mix'];
const TITLES = {lp: 'Low-pass sweep', hp: 'High-pass sweep', lpStatic: 'Section held under a low-pass', hpStatic: 'Section held under a high-pass', riser: 'Noise riser', reverse: 'Reverse cymbal / swell',
  pitchUp: 'Pitch riser', pitchDown: 'Downlifter', tapeStop: 'Tape stop', roll: 'Snare / clap roll', kickOut: 'Kick drops out', gap: 'Silence before the drop', tail: 'Reverb tail',
  echo: 'Delay throw', crash: 'Crash on the downbeat', boom: 'Sub boom on the downbeat', stutter: 'Stutter / gate', width: 'Stereo narrowing', fade: 'Fade out'};
const GRID_BEATS = {'1/4': 1, '1/8': 0.5, '1/16': 0.25, '1/32': 0.125, '1/16T': 1 / 6, '1/8T': 1 / 3, '1/32T': 1 / 12};
const NOTE_BEATS = [[0.125, '1/32'], [1 / 6, '1/16T'], [0.25, '1/16'], [1 / 3, '1/8T'], [0.375, '3/32'], [0.5, '1/8'], [2 / 3, '1/4T'], [0.75, '3/16'], [1, '1/4'], [1.5, '3/8'], [2, '1/2']];

// "17.1" (bar 17, beat 1) or "32.4.3" (… third 16th) → beats from the start, as Blueprint writes positions
function parseAt(s) {
  if (fin(s)) return s;
  const m = /^\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?\s*$/.exec(String(s || ''));
  if (!m) return NaN;
  return (+m[1] - 1) * 4 + ((+m[2] || 1) - 1) + ((+m[3] || 1) - 1) / 4;
}
const barBeat = k => { const b = Math.floor(k / 4 + 1e-6), bt = k - 4 * b; return `${b + 1}.${Math.floor(bt + 1e-6) + 1}${Math.abs(bt - Math.round(bt)) > 0.05 ? '.' + (Math.floor((bt % 1) * 4 + 1e-6) + 1) : ''}`; };
const noteName = beats => { let best = null; for (const [v, n] of NOTE_BEATS) { const e = Math.abs(beats / v - 1); if (e < 0.06 && (!best || e < best.e)) best = {n, e}; } return best ? best.n : `${Math.round(beats * 100) / 100} beats`; };

// ---------- segmentation: a lane per bar, on or off, switching on phrase lines ----------
// Two states, a cost for being on where the lane is quiet (and off where it plays), and a cost for switching that
// is lowest on an 8-bar line, low on a 4-bar line and high anywhere else. The cheapest path (Viterbi) is the lane
// as an arranger would draw it: a one-bar blip on an odd bar is ignored, a one-bar drop at the end of a phrase is kept.
function switchCost(b, lambda, cheap) {
  const base = b % 8 === 0 ? 0.35 : b % 4 === 0 ? 0.6 : b % 2 === 0 ? 1.2 : 1.5;
  return lambda * base * (cheap && cheap.has(b) ? 0.45 : 1);
}
function segment(values, {theta = 0.5, lambda = 0.45, cheap = null} = {}) {
  const n = values.length, out = new Uint8Array(n);
  if (!n) return out;
  const em = (b, s) => { const v = clamp(values[b] + (0.5 - theta), 0, 1); return s ? 1 - v : v; };
  const cost = [new Float64Array(n), new Float64Array(n)], from = [new Uint8Array(n), new Uint8Array(n)];
  cost[0][0] = em(0, 0); cost[1][0] = em(0, 1);
  for (let b = 1; b < n; b++) {
    const sw = switchCost(b, lambda, cheap);
    for (let s = 0; s < 2; s++) {
      const stay = cost[s][b - 1], move = cost[1 - s][b - 1] + sw;
      if (stay <= move) { cost[s][b] = stay + em(b, s); from[s][b] = s; } else { cost[s][b] = move + em(b, s); from[s][b] = 1 - s; }
    }
  }
  let s = cost[1][n - 1] < cost[0][n - 1] ? 1 : 0;
  for (let b = n - 1; b >= 0; b--) { out[b] = s; s = from[s][b]; }
  return out;
}

// ---------- curves ----------
// Isotonic regression (pool adjacent violators): the closest monotone series to the measured one. A filter sweep
// moves one way; the jitter the measurement adds doesn't, and this removes it without flattening the shape.
function isotonic(y, increasing = true) {
  const v = increasing ? y.slice() : y.map(x => -x), blocks = [];
  for (const x of v) { blocks.push({s: x, n: 1}); while (blocks.length > 1 && blocks[blocks.length - 2].s / blocks[blocks.length - 2].n > blocks[blocks.length - 1].s / blocks[blocks.length - 1].n) { const b = blocks.pop(); blocks[blocks.length - 1].s += b.s; blocks[blocks.length - 1].n += b.n; } }
  const out = []; for (const b of blocks) for (let i = 0; i < b.n; i++) out.push(b.s / b.n);
  return increasing ? out : out.map(x => -x);
}
// Ramer–Douglas–Peucker on (beat, octave): the fewest breakpoints that redraw the curve within tol octaves.
function rdp(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let best = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], t = (p.k - a.k) / ((b.k - a.k) || 1), y = a.o + (b.o - a.o) * t, d = Math.abs(p.o - y);
    if (d > best) { best = d; idx = i; }
  }
  if (best <= tol) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), tol).slice(0, -1), ...rdp(pts.slice(idx), tol)];
}
// The cutoff of a sweep at beat k (Hz), from its smoothed curve; open (20 kHz / 20 Hz) outside it as Blueprint draws it.
function sweepAt(m, k) {
  const c = m.curve, open = m.type === 'lp' ? 20000 : 20;
  if (!c || !c.length || k < m.k0) return null;
  if (k < c[0].k) return m.opening ? c[0].hz : null;
  const last = c[c.length - 1];
  if (k >= last.k) {
    if (m.opening) { const end = Math.max(m.k1, last.k + 0.01); if (k >= end) return null; const p = (k - last.k) / (end - last.k); return last.hz * Math.pow(open / last.hz, p); }
    return k < Math.ceil(m.k1 / 4 - 1e-6) * 4 ? last.hz : null;
  }
  for (let i = 1; i < c.length; i++) if (k < c[i].k) { const p = (k - c[i - 1].k) / ((c[i].k - c[i - 1].k) || 1); return c[i - 1].hz * Math.pow(c[i].hz / c[i - 1].hz, p); }
  return last.hz;
}

// ---------- moves ----------
const TYPES = new Set(Object.keys(CAT));
function normMove(raw, beats, beatDur) {
  if (!raw || !TYPES.has(raw.type)) return null;
  const m = Object.assign({}, raw);
  m.k0 = fin(m.k0) ? m.k0 : parseAt(m.at); m.k1 = fin(m.k1) ? m.k1 : parseAt(m.to);
  if (!fin(m.k0)) return null;
  if (!fin(m.k1) || m.k1 <= m.k0) m.k1 = m.k0 + (['crash', 'boom'].includes(m.type) ? 1 : 4);
  m.k0 = clamp(m.k0, 0, beats); m.k1 = clamp(m.k1, m.k0 + 0.05, beats);
  m.conf = fin(m.conf) ? m.conf : fin(m.sure) ? m.sure : 1;
  m.cat = CAT[m.type]; m.color = COLOR[m.cat]; m.title = m.title || TITLES[m.type];
  m.at = barBeat(m.k0); m.to = barBeat(m.k1);
  if (!['music', 'drums', 'mix', 'synths'].includes(m.target)) m.target = m.type === 'lpStatic' || m.type === 'hpStatic' || m.type === 'width' ? 'music' : 'mix';
  switch (m.type) {
    case 'lp': case 'hp': {
      let c = (m.curve || []).map(p => Array.isArray(p) ? {k: +p[0], hz: +p[1]} : {k: +p.k, hz: +p.hz}).filter(p => fin(p.k) && fin(p.hz) && p.hz > 10).sort((a, b) => a.k - b.k);
      if (!c.length) { const f0 = fin(m.fromHz) ? m.fromHz : (m.type === 'lp' ? 300 : 30), f1 = fin(m.toHz) ? m.toHz : (m.type === 'lp' ? 20000 : 800); c = [{k: m.k0, hz: f0}, {k: m.k1, hz: f1}]; }
      if (typeof m.opening !== 'boolean') m.opening = m.type === 'lp' ? c[c.length - 1].hz >= c[0].hz : c[c.length - 1].hz <= c[0].hz;
      // a low-pass opens as its cutoff climbs, a high-pass as its cutoff falls
      const up = (m.type === 'lp') === m.opening, o = isotonic(c.map(p => Math.log2(p.hz)), up);
      c = c.map((p, i) => ({k: p.k, hz: clamp(Math.pow(2, o[i]), 20, 20000)}));
      m.curve = c; m.fromHz = c[0].hz; m.toHz = c[c.length - 1].hz;
      const pts = rdp(c.map(p => ({k: p.k, o: Math.log2(p.hz), hz: p.hz})), 1 / 6);
      m.points = pts.map(p => ({k: p.k, hz: p.hz}));
      break;
    }
    case 'lpStatic': case 'hpStatic': m.hz = clamp(fin(m.hz) ? m.hz : (m.type === 'lpStatic' ? 800 : 300), 20, 20000); break;
    case 'roll': {
      const len = m.k1 - m.k0;
      let st = (m.steps || []).filter(s => fin(s.k) && fin(s.n) && s.n > 0).map(s => ({k: clamp(s.k, m.k0, m.k1), n: Math.round(s.n), name: s.name})).sort((a, b) => a.k - b.k);
      if (!st.length) st = len >= 8 ? [{k: m.k0, n: 2}, {k: m.k0 + len / 2, n: 4}, {k: m.k0 + len * 0.75, n: 8}] : len >= 3 ? [{k: m.k0, n: 4}, {k: m.k0 + len * 0.5, n: 8}] : [{k: m.k0, n: 8}];
      st[0].k = m.k0; m.steps = st;
      m.hits = (m.hits || []).map(h => Array.isArray(h) ? {k: +h[0], v: +h[1]} : {k: +h.k, v: +h.v}).filter(h => fin(h.k) && h.k >= m.k0 - 0.1 && h.k < m.k1 + 0.1);
      m.velDb = fin(m.velDb) ? m.velDb : 12;
      break;
    }
    case 'gap': m.beats = m.k1 - m.k0; break;
    case 'kickOut': m.beats = m.k1 - m.k0; break;
    case 'echo': {
      let b = fin(m.beats) ? m.beats : fin(m.ms) && beatDur ? m.ms / 1000 / beatDur : NaN;
      if (!fin(b) && m.note) { const k = Object.entries({'3/16': 0.75, '1/8': 0.5, '1/4': 1, '1/16': 0.25, '3/8': 1.5, '1/8T': 1 / 3, '1/4T': 2 / 3}).find(([n]) => String(m.note).startsWith(n)); if (k) b = k[1]; }
      // snap to the nearest note value: the throw is tempo-synced, the measurement isn't exact
      m.beats = NOTE_BEATS.reduce((best, [v]) => Math.abs(Math.log(v / (b || 0.75))) < Math.abs(Math.log(best / (b || 0.75))) ? v : best, 0.75);
      m.note = noteName(m.beats); m.repeats = clamp(Math.round(fin(m.repeats) ? Math.max(3, m.repeats + 1) : 4), 2, 8); m.repeatDb = clamp(fin(m.repeatDb) ? m.repeatDb : -4.5, -12, -1.5);
      break;
    }
    case 'stutter': m.step = GRID_BEATS[m.grid] || (fin(m.step) ? m.step : 0.25); m.grid = m.grid || noteName(m.step); break;
    case 'pitchUp': m.semis = clamp(fin(m.semis) ? Math.abs(m.semis) : 12, 3, 48); break;
    case 'pitchDown': m.semis = -clamp(fin(m.semis) ? Math.abs(m.semis) : 12, 3, 48); break;
    case 'tapeStop': m.semis = -clamp(fin(m.semis) ? Math.abs(m.semis) : 24, 6, 48); break;
    case 'riser': m.riseDb = clamp(fin(m.riseDb) ? m.riseDb : 18, 6, 48); break;
    case 'reverse': break;
    case 'fade': m.db = clamp(fin(m.db) ? m.db : -18, -60, 18); break;
    case 'width': m.db = fin(m.db) ? m.db : -12; break;
    case 'tail': m.t60 = clamp(fin(m.t60) ? m.t60 : 2.2, 0.8, 8); break;
    case 'crash': case 'boom': m.k1 = Math.min(beats, m.k0 + 1); m.t60 = fin(m.t60) ? m.t60 : 2.5; break;
  }
  return m;
}

// ---------- tension, for sources that don't carry it ----------
function computeTension(m) {
  const n = m.beats, t = new Float32Array(n), W = Object.fromEntries(LANES.map(l => [l.k, l.w]));
  for (let k = 0; k < n; k++) { let s = 0; for (const l of LK) s += W[l] * (m.lanes[l][k] || 0); t[k] = s; }
  for (const e of m.moves) if (['riser', 'pitchUp', 'roll', 'reverse'].includes(e.type) || (e.type === 'hp' && !e.opening)) {
    for (let k = Math.floor(e.k0); k < Math.min(n, Math.ceil(e.k1)); k++) t[k] += 3 * clamp((k - e.k0) / (e.k1 - e.k0), 0, 1);
  }
  const sm = Float32Array.from(t, (v, k) => (t[Math.max(0, k - 1)] + 2 * v + t[Math.min(n - 1, k + 1)]) / 4);
  const s = Array.from(sm).sort((a, b) => a - b), lo = s[Math.floor(n * 0.02)] || 0, hi = s[Math.floor(n * 0.98)] || 1;
  return Float32Array.from(sm, v => clamp((v - lo) / ((hi - lo) || 1), 0, 1));
}

// ---------- assembling a model ----------
function cleanSections(list, bars) {
  let S = (list || []).map(s => ({start: Math.round(s.start), end: Math.round(s.end), label: LABELS.includes(s.label) ? s.label : 'Groove', name: String(s.name || s.label || 'Section').slice(0, 40)}))
    .filter(s => fin(s.start) && fin(s.end) && s.end > s.start).sort((a, b) => a.start - b.start);
  const out = [];
  for (const s of S) {
    s.start = clamp(s.start, 0, bars); s.end = clamp(s.end, 0, bars);
    const prev = out[out.length - 1];
    if (prev && s.start < prev.end) s.start = prev.end;
    if (prev && s.start > prev.end) prev.end = s.start;
    if (s.end > s.start) out.push(s);
  }
  if (!out.length) out.push({start: 0, end: bars, label: 'Groove', name: 'Groove'});
  out[0].start = 0; out[out.length - 1].end = bars;
  const count = {}, seen = {};
  for (const s of out) count[s.label] = (count[s.label] || 0) + 1;
  for (const s of out) { seen[s.label] = (seen[s.label] || 0) + 1; if (!/\d$/.test(s.name) && s.name === s.label && count[s.label] > 1) s.name = `${s.label} ${seen[s.label]}`; s.color = LABEL_COLOR[s.label]; s.bars = s.end - s.start; }
  return out;
}

function finalize(m) {
  const bars = m.bars, beats = bars * 4;
  m.beats = beats;
  m.sections = cleanSections(m.sections, bars);
  for (const l of LK) { const a = new Float32Array(beats), src = m.lanes && m.lanes[l]; if (src) for (let k = 0; k < beats; k++) a[k] = clamp(+src[k] || 0, 0, 1); m.lanes[l] = a; }
  m.moves = (m.moves || []).map(e => normMove(e, beats, m.audio && m.audio.beatDur)).filter(Boolean).sort((a, b) => a.k0 - b.k0);
  m.moves.forEach((e, i) => { e.id = 'r' + i; });
  if (!m.tension || m.tension.length !== beats) m.tension = computeTension(m);
  else m.tension = Float32Array.from(m.tension, v => clamp(+v || 0, 0, 1));
  // per bar: the lane's mean, then on/off from the segmentation; section lines and the ends of lead-in moves are cheap places to switch
  const cheap = new Set(m.sections.map(s => s.start));
  for (const e of m.moves) if (['gap', 'riser', 'roll', 'reverse', 'kickOut', 'crash', 'boom'].includes(e.type)) cheap.add(Math.round((e.type === 'crash' || e.type === 'boom' ? e.k0 : e.k1) / 4));
  m.barMean = {}; m.on = {};
  // drums are hits on some beats (a clap on 2 and 4 is 0, 1, 0, 1), so a drum lane's bar is its two strongest
  // beats; a sustained lane's bar is the mean of its four
  const HITS = new Set(['kick', 'clap', 'hats']);
  for (const l of LK) {
    const a = m.lanes[l], v = new Float32Array(bars);
    for (let b = 0; b < bars; b++) {
      const q = Array.from(a.subarray(b * 4, b * 4 + 4));
      if (HITS.has(l)) { q.sort((x, y) => y - x); v[b] = ((q[0] || 0) + (q[1] || 0)) / 2; } else v[b] = q.reduce((s, x) => s + x, 0) / 4;
    }
    m.barMean[l] = v;
    m.on[l] = segment(Array.from(v), {theta: l === 'kick' ? 0.42 : 0.5, cheap});
  }
  m.tensionBar = Float32Array.from({length: bars}, (_, b) => mean(Array.from(m.tension.subarray(b * 4, b * 4 + 4))));
  // sidechain per section
  const pumps = [];
  for (const s of m.sections) {
    const p = (m.pumps || []).find(p => p.start === s.start) || (m.pumps || []).find(p => p.section === s.name);
    pumps.push({start: s.start, end: s.end, section: s.name, pump: !!(p && p.pump), depth: p && fin(p.depth) ? clamp(p.depth, 0, 24) : 0, releaseMs: p && fin(p.releaseMs) ? clamp(p.releaseMs, 40, 900) : null});
  }
  m.pumps = pumps;
  m.changes = referenceChanges(m);
  return m;
}
// Where the reference changes: a lane switches, a section starts, or a move happens in the bar.
function referenceChanges(m) {
  const out = new Uint8Array(m.bars);
  for (let b = 1; b < m.bars; b++) if (LK.some(l => m.on[l][b] !== m.on[l][b - 1])) out[b] = 1;
  for (const s of m.sections) if (s.start > 0) out[s.start] = 1;
  for (const e of m.moves) { const b = Math.floor(e.k0 / 4); if (b > 0 && b < m.bars && !['width', 'fade', 'tail'].includes(e.type)) out[b] = 1; }
  return out;
}

// A Blueprint JSON file (version 1 or 2), or one of Transplant's own saved models.
function fromJSON(j, name) {
  if (typeof j === 'string') { try { j = JSON.parse(j); } catch (_) { throw Error("This file isn't valid JSON."); } }
  if (!j || typeof j !== 'object') throw Error("This file isn't a Blueprint export.");
  if (j.kind === 'fieldwork-arrangement') return revive(j);
  const bars = Math.round(+j.bars);
  if (!Array.isArray(j.sections) || !(bars >= 4 && bars <= 2048)) throw Error("This JSON isn't a Blueprint export: it has no sections or bars. In Blueprint, use Data (.json).");
  const beats = bars * 4, lanes = {};
  if (j.beats && j.beats.lanes) for (const l of LK) lanes[l] = Float32Array.from({length: beats}, (_, k) => +((j.beats.lanes[l] || [])[k] || 0));
  else for (const l of LK) { const a = new Float32Array(beats); for (const [s, e] of (j.lanes && j.lanes[l]) || []) for (let k = Math.max(0, Math.floor(s)); k < Math.min(beats, Math.ceil(e)); k++) a[k] = 1; lanes[l] = a; }
  const sections = j.sections.map(s => ({start: (+s.start || 1) - 1, end: +s.end, label: s.label, name: s.name}));
  const pumps = (j.sidechain || []).map(p => ({start: fin(+p.start) && p.start ? p.start - 1 : (sections.find(s => s.name === p.section) || {}).start, section: p.section, pump: !!p.pump, depth: +p.depth, releaseMs: +p.releaseMs}));
  const bpm = clamp(+j.bpm || 124, 40, 220);
  return finalize({
    kind: 'fieldwork-arrangement', v: 1, name: String(name || j.track || 'Blueprint').slice(0, 80), source: j.version >= 2 ? 'blueprint' : 'blueprint-v1', bpm,
    key: j.key ? {name: j.key, camelot: j.camelot || null} : null, bars, lanes, sections, pumps,
    tension: j.beats && j.beats.tension && j.beats.tension.length === beats ? j.beats.tension : null,
    moves: (j.moves || []).map(e => Object.assign({}, e, {conf: fin(e.sure) ? e.sure : e.conf})),
    audio: fin(+j.bar1) ? {t0: +j.bar1, beatDur: +j.beatDur || 60 / bpm, lufs: fin(+j.lufs) ? +j.lufs : null} : null,
  });
}
// The analysis of an audio file (X-Ray + Blueprint engines in this page): the same path as a Blueprint file.
function fromAnalysis(an, name) {
  const m = fromJSON(BP.exportModel(an, name), name);
  m.source = 'audio';
  m.audio = {t0: an.grid.t0, beatDur: an.grid.beatDur, lufs: an.loud && an.loud.I, dur: an.dur};
  return m;
}

// Built-in shapes: sections with what plays when, written in bars relative to each section, and the moves.
// el: {lane: 1 | 0 | 'a-b,c-d' (bars of the section, from 1)}, lv: {lane: 0–1} how full the lane is,
// moves: [{t: type, at: 'bar.beat' in the section, to: 'bar.beat' | 'end', …}]
function rangeBars(spec, len) {
  if (spec === 1 || spec === true) return [[0, len]];
  if (!spec) return [];
  return String(spec).split(',').map(r => { const [a, b] = r.split('-'); const s = Math.max(1, +a || 1), e = b === '' || b == null ? (r.includes('-') ? len : s) : +b; return [s - 1, Math.min(len, e)]; }).filter(([s, e]) => e > s);
}
function buildShape(def) {
  const bars = def.sections.reduce((s, x) => s + x.bars, 0), beats = bars * 4, lanes = Object.fromEntries(LK.map(l => [l, new Float32Array(beats)])), moves = [], sections = [], pumps = [];
  let b0 = 0;
  for (const s of def.sections) {
    sections.push({start: b0, end: b0 + s.bars, label: s.label, name: s.name || s.label});
    for (const l of LK) {
      const lv = clamp(s.lv && fin(s.lv[l]) ? s.lv[l] : 1, 0, 1);
      for (const [a, e] of rangeBars(s.el[l], s.bars)) for (let k = (b0 + a) * 4; k < (b0 + e) * 4; k++) lanes[l][k] = 0.6 + 0.4 * lv;
    }
    const pos = (p, end) => p === 'end' ? (b0 + s.bars) * 4 : b0 * 4 + parseAt(p);
    for (const mv of s.moves || []) {
      const e = Object.assign({}, mv, {type: mv.t, k0: pos(mv.at || '1.1'), k1: mv.to ? pos(mv.to) : undefined});
      delete e.t; delete e.at; delete e.to;
      if (e.type === 'roll' && mv.steps) e.steps = mv.steps.map(([at, n]) => ({k: pos(at), n}));
      if ((e.type === 'lp' || e.type === 'hp') && mv.hz) e.curve = [{k: e.k0, hz: mv.hz[0]}, ...(mv.mid || []).map(([at, hz]) => ({k: pos(at), hz})), {k: e.k1, hz: mv.hz[1]}];
      moves.push(e);
    }
    pumps.push({start: b0, section: s.name || s.label, pump: !!s.side, depth: s.side || 0, releaseMs: s.side ? 60000 / def.bpm * 0.38 : null});
    b0 += s.bars;
  }
  return finalize({kind: 'fieldwork-arrangement', v: 1, name: def.name, source: 'shape', shape: def.id, bpm: def.bpm, key: null, bars, lanes, sections, pumps, moves, tension: null, audio: null, blurb: def.blurb});
}

// Save and restore (typed arrays as plain arrays)
function serialize(m) {
  const r2 = a => Array.from(a, v => Math.round(v * 100) / 100);
  return {kind: 'fieldwork-arrangement', v: 1, name: m.name, source: m.source, shape: m.shape, blurb: m.blurb, bpm: m.bpm, key: m.key, bars: m.bars,
    sections: m.sections.map(s => ({start: s.start, end: s.end, label: s.label, name: s.name})),
    lanes: Object.fromEntries(LK.map(l => [l, r2(m.lanes[l])])), tension: r2(m.tension),
    moves: m.moves.map(e => { const o = Object.assign({}, e); delete o.id; delete o.color; return o; }),
    pumps: m.pumps.map(p => ({start: p.start, section: p.section, pump: p.pump, depth: p.depth, releaseMs: p.releaseMs})),
    audio: m.audio ? {t0: m.audio.t0, beatDur: m.audio.beatDur, lufs: m.audio.lufs} : null};
}
function revive(j) {
  const bars = Math.round(+j.bars);
  if (!(bars >= 4 && bars <= 2048)) throw Error('This saved arrangement is damaged.');
  return finalize({kind: 'fieldwork-arrangement', v: 1, name: String(j.name || 'Arrangement').slice(0, 80), source: j.source || 'saved', shape: j.shape, blurb: j.blurb, bpm: clamp(+j.bpm || 124, 40, 220), key: j.key || null, bars,
    sections: j.sections, lanes: j.lanes || {}, tension: j.tension, moves: j.moves || [], pumps: j.pumps || [], audio: j.audio || null});
}

return {LANES, LK, LANE, LABELS, LABEL_COLOR, CAT, CATS, COLOR, TITLES, GRID_BEATS, parseAt, barBeat, noteName, segment, isotonic, rdp, sweepAt, normMove,
  computeTension, finalize, fromJSON, fromAnalysis, buildShape, serialize, revive, clamp, mean};
})();
/* transplant-model:end */
