/* breeder-genome:start */
// Breeder's genome: a whole groove (drums, bass, riff, chords, harmony, sounds, tempo and feel) as genes, built
// on Orbit's genres, grooves, basslines, patterns and fingerprint. Two parents cross over gene group by gene group
// (the kick from one, the hats from the other, the riff's rhythm from one and its notes from the other), children
// mutate inside the genre's grammar, and every child is measured: Orbit's genre fingerprint for the riff, the
// genre's kick anchors and backbeat for the drums, kick avoidance and density for the bass. A generation is chosen
// for quality and for difference from its siblings. Pure JavaScript, no DOM: breeder-src/test.mjs runs this code.
const TB = (() => {
'use strict';
const {mod} = OT;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STEPS = 32, LOOP_BARS = 4, LOOP_BEATS = LOOP_BARS * 4;
const LANES = {
  k: {name: 'Kick', pitch: 36, voice: 'kick', role: 'kick'}, c: {name: 'Clap', pitch: 39, voice: 'clap', role: 'clap'},
  h: {name: 'Closed hat', pitch: 42, voice: 'chh', role: 'hats'}, o: {name: 'Open hat', pitch: 46, voice: 'ohh', role: 'hats'},
  s: {name: 'Shaker', pitch: 70, voice: 'shaker', role: 'perc'}, r: {name: 'Rim', pitch: 37, voice: 'rim', role: 'perc'},
  t: {name: 'Conga', pitch: 64, voice: 'conga', role: 'perc'}, b: {name: 'Cowbell', pitch: 56, voice: 'cowbell', role: 'perc'}};
const LK = Object.keys(LANES);
const VEL = {x: 100, X: 122, g: 62};
// gene groups: what crosses over together, and what you can lock
const GROUPS = [
  {k: 'kick', name: 'Kick', lanes: ['k']}, {k: 'clap', name: 'Clap', lanes: ['c']}, {k: 'hats', name: 'Hats', lanes: ['h', 'o']},
  {k: 'perc', name: 'Percussion', lanes: ['s', 'r', 't', 'b']}, {k: 'bass', name: 'Bassline'}, {k: 'rhythm', name: 'Riff rhythm'},
  {k: 'notes', name: 'Riff notes'}, {k: 'sounds', name: 'Sounds'}, {k: 'harmony', name: 'Key and chords'}, {k: 'feel', name: 'Tempo and swing'}];
const RHYTHM = ['rate', 'steps', 'gate'], NOTES = ['pool', 'order', 'seq', 'octaves', 'count', 'reg', 'advance', 'reset', 'pedal', 'follow'];
const BASS_SOUNDS = ['tp-rolling', 'tp-house-bass', 'tp-sub', 'reese', 'acid-303'];
const PAD_SOUNDS = ['warm-pad', 'glass-pad', 'string-swell', 'shimmer', 'organ-sustain', 'choir', 'drone'];
const SIDECHAIN = {'tech-house': 5, 'melodic-techno': 6, progressive: 6, trance: 6, afro: 4, deep: 4, techno: 4, acid: 4, 'nu-disco': 5, garage: 4, 'hard-techno': 5, minimal: 3, 'dub-techno': 5, detroit: 4};

// ---------- small helpers ----------
const pickA = (r, a) => a[Math.floor(r() * a.length)];
const pickW = (r, w) => { const e = Object.entries(w), tot = e.reduce((s, [, v]) => s + v, 0); let x = r() * tot; for (const [k, v] of e) { x -= v; if (x <= 0) return k; } return e[e.length - 1][0]; };
const irange = (r, [a, b]) => Math.round(a + r() * (b - a));
const twice = s => (s + s).slice(0, STEPS);
const blank = () => '.'.repeat(STEPS);
const setAt = (s, i, c) => s.slice(0, i) + c + s.slice(i + 1);
const rot = (s, k) => { k = mod(k, s.length); return s.slice(s.length - k) + s.slice(0, s.length - k); };
const on = c => c !== '.' && c !== '-';
const clone = g => JSON.parse(JSON.stringify(g));
function swingTime(t, swing) {
  const sw = (swing - 50) / 100; if (sw <= 0) return t;
  const h = Math.floor(t / 0.5 + 1e-6) * 0.5, pos = t - h, mid = 0.25 + sw * 0.5;
  return h + (pos <= 0.25 ? pos * mid / 0.25 : mid + (pos - 0.25) * (0.5 - mid) / 0.25);
}
let counter = 0;
const newId = gen => `g${gen}-${(++counter).toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;
const ADJ = ['Night', 'Rubber', 'Velvet', 'Chrome', 'Sunday', 'Static', 'Hollow', 'Liquid', 'Concrete', 'Neon', 'Dusty', 'Paper', 'Iron', 'Silver', 'Basement', 'Fever', 'Slow', 'Wired', 'Golden', 'Low', 'Glass', 'Tidal', 'Molten', 'Lunar', 'Electric', 'Smoke', 'Bent', 'Second', 'Warm', 'Deep', 'Midnight', 'Copper'];
const NOUN = ['Signal', 'Ghost', 'Engine', 'Prayer', 'Motion', 'Animal', 'Circuit', 'Window', 'Pulse', 'Garden', 'Ritual', 'Mirror', 'Machine', 'Tunnel', 'Fever', 'Room', 'Dancer', 'Wave', 'Station', 'Orbit', 'Shadow', 'Rain', 'Heart', 'Code', 'Static', 'River', 'Ladder', 'Spark', 'Satellite', 'Bloom', 'Theory', 'Habit'];
const nameFor = r => `${pickA(r, ADJ)} ${pickA(r, NOUN)}`;

// ---------- making a groove ----------
const genreOf = id => OB.GENRES[id] || OB.GENRES['tech-house'];
function baseDrums(genreId) {
  const lanes = OB.GROOVES[genreOf(genreId).groove].lanes, d = {};
  for (const l of LK) d[l] = lanes[l] ? twice(lanes[l]) : blank();
  return d;
}
function riffGenes(st) {
  const o = {sound: st.sound};
  for (const k of [...RHYTHM, ...NOTES]) o[k] = k === 'steps' ? (typeof st.steps === 'string' ? st.steps : OE.stepsString(st.steps)) : st[k];
  if (Array.isArray(o.seq)) o.seq = o.seq.slice(0, 32);
  for (const k of ['echo', 'echoTime', 'echoShift', 'echoFb', 'feel', 'lock', 'tlen', 'strum', 'strumDir']) if (st[k] != null && st[k] !== 0 && st[k] !== 'straight') o[k] = st[k];
  return o;
}
// The first generation of a genre: bank patterns of that genre and generated ones, each on the genre's groove and
// bassline with a small twist, so the eight start different but all in the genre.
function seed(genreId, n = 8, seedNum = 1) {
  const g = genreOf(genreId), r = OT.rng(seedNum * 7919 + 13), pats = OB.PATTERNS.filter(p => p.genre === genreId && !String(p.sub || '').match(/build|break|intro/i));
  const pool = pats.slice(), out = [];
  // Orbit's generator, and a few bank patterns written for breaks, can fall outside the genre's fingerprint: each slot
  // tries up to six candidates and keeps the first that fits (or the best), so a family starts in its genre
  const riffFit = st => OE.fit(OE.metrics(OE.render(st, {bars: LOOP_BARS, evo: false, fills: false, mutate: false})), g.target).score;
  const sigs = new Set();
  for (let i = 0; i < n; i++) {
    let st = null, best = -1;
    for (let tries = 0; tries < 6; tries++) {
      const c = i < Math.ceil(n * 0.6) && pool.length ? OE.normalize(OB.stateFor(pool.splice(Math.floor(r() * pool.length), 1)[0])) : OE.generate(genreId, Math.floor(r() * 1e6) + 1);
      if (sigs.has(OE.signature(c))) continue;
      const f = riffFit(c); if (f > best) { best = f; st = c; }
      if (f >= 88) break;
    }
    if (!st) st = OE.generate(genreId, Math.floor(r() * 1e6) + 1);
    sigs.add(OE.signature(st));
    const gm = {
      id: newId(1), gen: 1, parents: [], genre: genreId, name: nameFor(r), origin: st.from && st.from !== 'generated' ? `Orbit pattern "${st.name}"` : 'Orbit\'s generator',
      bpm: clamp(st.bpm, g.bpm[0], g.bpm[1]), swing: clamp(Math.round(st.swing || 50), 50, 70), key: st.key, scale: st.scale, prog: st.prog,
      pad: r() < 0.35 ? 'pad' : 'off', padSound: pickA(r, PAD_SOUNDS),
      drums: baseDrums(genreId), bass: {steps: twice(OB.BASS[g.bass].steps), sound: pickA(r, g.bass === 'sub' || g.bass === 'dub' ? ['tp-sub', 'tp-rolling'] : ['tp-rolling', 'tp-house-bass', 'tp-sub'])},
      riff: riffGenes(st), log: [],
    };
    if (i > 0) mutate(gm, i % 3 === 0 ? 2 : 1, r, {only: ['kick', 'clap', 'hats', 'perc', 'bass', 'feel'], genre: genreId, silent: true});
    gm.log = [`From ${gm.origin}, on the ${OB.GROOVES[g.groove].name.toLowerCase()} groove and the ${OB.BASS[g.bass].name.toLowerCase()} bassline.`];
    out.push(gm);
  }
  return out;
}

// ---------- mutation: one move at a time, inside the genre's grammar ----------
function kickAnchors(genreId) { const k = twice(OB.GROOVES[genreOf(genreId).groove].lanes.k || 'X...X...X...X...'); const a = []; for (let i = 0; i < STEPS; i++) if (on(k[i])) a.push(i); return a; }
function bassAvoidsKick(genreId) { const b = OB.BASS[genreOf(genreId).bass].steps, k = OB.GROOVES[genreOf(genreId).groove].lanes.k || ''; let hit = 0, n = 0; for (let i = 0; i < 16; i++) if (on(b[i])) { n++; if (on(k[i] || '.')) hit++; } return n ? hit / n < 0.25 : true; }
function euclidStr(k, n = 16, rr = 0) { const e = OE.euclid(k, n, 0); let s = e.map(v => v ? 'x' : '.').join(''); return rot(s, rr); }
const DEG_W = {x: 6, o: 3, '5': 3, '3': 1.2, '7': 1};
const OPS = [
  // drums
  {g: 'hats', w: 3, f: (gm, r) => { const l = gm.drums.o.includes('x') && r() < 0.5 ? 'o' : 'h'; if (!/[xXg]/.test(gm.drums[l])) return null; const k = r() < 0.5 ? 1 : -1; gm.drums[l] = rot(gm.drums[l], k); return `${LANES[l].name.toLowerCase()} moved a 16th ${k > 0 ? 'later' : 'earlier'}`; }},
  {g: 'hats', w: 3, f: (gm, r) => { const s = gm.drums.h, i = Math.floor(r() * STEPS); if (i % 4 === 0) return null; if (on(s[i])) { gm.drums.h = setAt(s, i, '.'); return `closed hat taken off step ${i + 1}`; } gm.drums.h = setAt(s, i, 'g'); return `ghost hat added on step ${i + 1}`; }},
  {g: 'hats', w: 1.5, f: (gm, r) => { const opts = [['..x...x...x...x.', 'open hats on the off-beats'], ['..............x.', 'one open hat at the end of each bar'], ['..x.......x.....', 'open hats on beats 1.3 and 3.3'], ['......x.......x.', 'open hats on the 2s and 4s off-beats'], [null, 'open hats out']]; const [p, w] = pickA(r, opts); const nv = p ? twice(p) : blank(); if (nv === gm.drums.o) return null; gm.drums.o = nv; return w; }},
  {g: 'hats', w: 1.2, f: (gm, r) => { const s = gm.drums.h; const fill = pickA(r, ['gggg', 'gxgx', 'xggg']); gm.drums.h = s.slice(0, 28) + fill; return 'a hat roll into the next bar'; }},
  {g: 'perc', w: 3, f: (gm, r) => { const l = pickA(r, ['s', 'r', 't', 'b']), k = irange(r, [2, 7]), rr = irange(r, [0, 15]); const nv = twice(euclidStr(k, 16, rr)); if (nv === gm.drums[l]) return null; gm.drums[l] = nv; return `${LANES[l].name.toLowerCase()}: a Euclidean ${k} in 16, turned ${rr}`; }},
  {g: 'perc', w: 2, f: (gm, r) => { const l = pickA(r, ['s', 'r', 't', 'b'].filter(l => /[xXg]/.test(gm.drums[l]))); if (!l) return null; if (r() < 0.35) { gm.drums[l] = blank(); return `${LANES[l].name.toLowerCase()} out`; } const k = r() < 0.5 ? 1 : 2; gm.drums[l] = rot(gm.drums[l], k); return `${LANES[l].name.toLowerCase()} turned ${k} 16th${k > 1 ? 's' : ''}`; }},
  {g: 'perc', w: 1.2, f: (gm, r, o) => { const gg = pickA(r, Object.keys(OB.GROOVES)), src = OB.GROOVES[gg].lanes, l = pickA(r, ['s', 'r', 't', 'b'].filter(l => src[l])); if (!l) return null; const nv = twice(src[l]); if (nv === gm.drums[l]) return null; gm.drums[l] = nv; return `${LANES[l].name.toLowerCase()} borrowed from the ${OB.GROOVES[gg].name.toLowerCase()} groove`; }},
  {g: 'kick', w: 0.9, f: (gm, r, o) => { const s = gm.drums.k, anchors = new Set(kickAnchors(o.genre)), cands = [14, 15, 30, 31, 7, 23, 10, 26].filter(i => !anchors.has(i)), i = pickA(r, cands); if (on(s[i])) { gm.drums.k = setAt(s, i, '.'); return `extra kick on step ${i + 1} taken out`; } if ((s.match(/[xXg]/g) || []).length >= anchors.size + 2) return null; gm.drums.k = setAt(s, i, 'g'); return `a ghost kick on step ${i + 1}`; }},
  {g: 'clap', w: 1.5, f: (gm, r) => { const s = gm.drums.c, i = pickA(r, [7, 15, 23, 31, 14, 30, 11, 27]); if (on(s[i])) { gm.drums.c = setAt(s, i, '.'); return `clap ghost on step ${i + 1} out`; } gm.drums.c = setAt(s, i, 'g'); return `a ghost clap on step ${i + 1}`; }},
  {g: 'clap', w: 0.6, f: (gm, r) => { const s = gm.drums.c; if (!/[xX]/.test(s)) return null; gm.drums.c = s.replace(/[xX]/g, c => r() < 0.5 ? 'X' : 'x'); return 'clap accents changed'; }},
  // bass
  {g: 'bass', w: 3, f: (gm, r, o) => { const s = gm.bass.steps, avoid = bassAvoidsKick(o.genre) ? new Set(kickAnchors(o.genre)) : new Set(), i = Math.floor(r() * STEPS); if (avoid.has(i)) return null; if (on(s[i])) { if ((s.match(/[^.\-]/g) || []).length <= 2) return null; let nv = setAt(s, i, '.'); for (let j = i + 1; j < STEPS && nv[j] === '-'; j++) nv = setAt(nv, j, '.'); gm.bass.steps = nv; return `bass note on step ${i + 1} out`; } gm.bass.steps = setAt(s, i, pickW(r, {x: 4, o: 1, '5': 1})); return `a bass note on step ${i + 1}`; }},
  {g: 'bass', w: 3, f: (gm, r) => { const s = gm.bass.steps, idx = [...s].map((c, i) => [c, i]).filter(([c]) => on(c)); if (!idx.length) return null; const [c, i] = pickA(r, idx), nd = pickW(r, Object.fromEntries(Object.entries(DEG_W).filter(([d]) => d !== c.toLowerCase()))); gm.bass.steps = setAt(s, i, c === c.toUpperCase() && /[XO]/.test(c) && /[xo]/.test(nd) ? nd.toUpperCase() : nd); return `bass on step ${i + 1}: ${({x: 'root', o: 'octave', 5: 'fifth', 3: 'third', 7: 'seventh'})[c.toLowerCase()] || 'root'} → ${({x: 'root', o: 'octave', 5: 'fifth', 3: 'third', 7: 'seventh'})[nd]}`; }},
  {g: 'bass', w: 1.5, f: (gm, r, o) => { const k = pickA(r, [1, -1, 2, 16]); const nv = rot(gm.bass.steps, k); if (nv[0] === '-') return null; if (bassAvoidsKick(o.genre)) { const a = new Set(kickAnchors(o.genre)); if ([...nv].some((c, i) => on(c) && a.has(i))) return null; } gm.bass.steps = nv; return k === 16 ? 'bassline bars swapped' : `bassline moved a 16th ${k > 0 ? 'later' : 'earlier'}${Math.abs(k) > 1 ? ' (two)' : ''}`; }},
  {g: 'bass', w: 1.5, f: (gm, r) => { const s = gm.bass.steps, idx = [...s].map((c, i) => [c, i]).filter(([c, i]) => on(c) && i + 1 < STEPS); if (!idx.length) return null; const [, i] = pickA(r, idx); if (s[i + 1] === '-') { let nv = s; for (let j = i + 1; j < STEPS && nv[j] === '-'; j++) nv = setAt(nv, j, '.'); gm.bass.steps = nv; return `bass note on step ${i + 1} shortened`; } if (s[i + 1] !== '.') return null; gm.bass.steps = setAt(s, i + 1, '-'); return `bass note on step ${i + 1} held longer`; }},
  {g: 'bass', w: 0.8, f: (gm, r) => { const s = gm.bass.steps, idx = [...s].map((c, i) => [c, i]).filter(([c]) => /[xo]/i.test(c)); if (!idx.length) return null; const [c, i] = pickA(r, idx); gm.bass.steps = setAt(s, i, c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()); return `bass accent ${c === c.toUpperCase() ? 'off' : 'on'} step ${i + 1}`; }},
  {g: 'bass', w: 0.7, f: (gm, r, o) => { const id = pickA(r, Object.keys(OB.BASS)); const nv = twice(OB.BASS[id].steps); if (nv === gm.bass.steps) return null; if (bassAvoidsKick(o.genre)) { const a = new Set(kickAnchors(o.genre)); if ([...nv].some((c, i) => on(c) && a.has(i))) return null; } gm.bass.steps = nv; return `bassline borrowed: ${OB.BASS[id].name.toLowerCase()}`; }},
  // riff: Orbit's own variations (checked against the genre), and small note moves
  {g: 'rhythm', w: 3, f: (gm, r, o) => { const v = OE.vary(stateOf(gm), 4, Math.floor(r() * 1e6) + 1, {wild: !!o.wild}); if (!v.length) return null; const pick = v.slice().sort((a, b) => b.fit - a.fit)[Math.floor(r() * Math.min(2, v.length))]; const nr = riffGenes(pick.st); for (const k of RHYTHM) gm.riff[k] = nr[k]; for (const k of ['echo', 'echoTime', 'echoShift', 'echoFb', 'feel']) if (nr[k] != null) gm.riff[k] = nr[k]; return `riff: ${pick.what}`; }, also: ['notes']},
  {g: 'rhythm', w: 1.2, f: (gm, r) => { const g = clamp(+(gm.riff.gate * (r() < 0.5 ? 0.72 : 1.35)).toFixed(2), 0.12, 0.95); if (g === gm.riff.gate) return null; const was = gm.riff.gate; gm.riff.gate = g; return `riff notes ${g < was ? 'shorter' : 'longer'} (gate ${Math.round(was * 100)} → ${Math.round(g * 100)}%)`; }},
  {g: 'notes', w: 2.5, f: (gm, r) => { if (gm.riff.order !== 'seq' || !gm.riff.seq.length) return null; const i = Math.floor(r() * gm.riff.seq.length), d = pickA(r, [1, -1, 2, -2]); gm.riff.seq = gm.riff.seq.slice(); gm.riff.seq[i] = clamp(gm.riff.seq[i] + d, -7, 14); return `riff note ${i + 1} ${d > 0 ? 'up' : 'down'} ${Math.abs(d)} step${Math.abs(d) > 1 ? 's' : ''}`; }},
  {g: 'notes', w: 0.8, f: (gm, r) => { const d = pickA(r, [-5, 5, -7, 7, 12, -12]), nr = clamp(gm.riff.reg + d, 46, 82); if (nr === gm.riff.reg) return null; gm.riff.reg = nr; return `riff ${d > 0 ? 'up' : 'down'} ${Math.abs(d) === 12 ? 'an octave' : Math.abs(d) + ' semitones'} in register`; }},
  // sounds
  {g: 'sounds', w: 1.5, f: (gm, r, o) => { const g = genreOf(o.genre), s = pickA(r, g.gen.sounds.filter(x => x !== gm.riff.sound)); if (!s) return null; gm.riff.sound = s; return `riff sound: ${OB.SOUNDS_BY_ID[s].name}`; }},
  {g: 'sounds', w: 0.9, f: (gm, r) => { const s = pickA(r, BASS_SOUNDS.filter(x => x !== gm.bass.sound)); gm.bass.sound = s; return `bass sound: ${({'tp-rolling': 'rolling', 'tp-house-bass': 'house', 'tp-sub': 'sub', reese: 'Reese', 'acid-303': 'acid'})[s]}`; }},
  {g: 'sounds', w: 0.6, f: (gm, r) => { const s = pickA(r, PAD_SOUNDS.filter(x => x !== gm.padSound)); gm.padSound = s; return `chord sound: ${OB.SOUNDS_BY_ID[s] ? OB.SOUNDS_BY_ID[s].name : s}`; }},
  // harmony
  {g: 'harmony', w: 1, f: (gm, r, o) => { const p = pickA(r, genreOf(o.genre).progs).p; if (p === gm.prog) return null; gm.prog = p; return `chords: ${p}`; }},
  {g: 'harmony', w: 0.8, f: (gm, r) => { const m = {off: ['pad', 'stab'], pad: ['off', 'stab'], stab: ['off', 'pad']}[gm.pad] || ['pad']; gm.pad = pickA(r, m); return `chords ${gm.pad === 'off' ? 'out' : gm.pad === 'pad' ? 'held as a pad' : 'as off-beat stabs'}`; }},
  {g: 'harmony', w: 0.4, f: (gm, r, o) => { const k = pickA(r, genreOf(o.genre).gen.keys.filter(k => k !== gm.key)); if (k == null) return null; gm.key = k; return `key: ${OT.keyLabel(k, gm.scale)}`; }},
  // feel
  {g: 'feel', w: 1.4, f: (gm, r, o) => { const sw = genreOf(o.genre).gen.swing, d = pickA(r, [-2, 2, 3, -3]), v = clamp(gm.swing + d, Math.max(50, sw[0] - 3), Math.min(68, sw[1] + 3)); if (v === gm.swing) return null; gm.swing = v; return `swing ${v}%`; }},
  // migration: only with drift past halfway. The child moves toward another genre: its kick, tempo and swing, maybe its
  // hats, and from then on it mutates in that genre's grammar
  {g: 'kick', w: 0, drift: 2.4, also: ['feel'], f: (gm, r) => {
    const to = pickA(r, Object.keys(OB.GENRES).filter(id => id !== gm.genre)), g2 = genreOf(to), G = baseDrums(to);
    gm.genre = to; gm.drums.k = G.k; gm.bpm = irange(r, g2.bpm); gm.swing = irange(r, g2.gen.swing);
    const hats = r() < 0.5; if (hats) { gm.drums.h = G.h; gm.drums.o = G.o; }
    return `drifted toward ${g2.name}: its kick, ${gm.bpm} BPM, swing ${gm.swing}%${hats ? ' and its hats' : ''}`;
  }},
  {g: 'feel', w: 0.6, f: (gm, r, o) => { const b = genreOf(o.genre).bpm, v = clamp(gm.bpm + pickA(r, [-2, -1, 1, 2]), b[0] - 2, b[1] + 2); if (v === gm.bpm) return null; gm.bpm = v; return `${v} BPM`; }},
];
// Apply k moves (one log line each), never touching locked groups, never breaking the genre's kick anchors.
function mutate(gm, k, r, o = {}) {
  const locks = new Set(o.locks || []), allow = op => !locks.has(op.g) && !(op.also || []).some(x => locks.has(x)) && (!o.only || o.only.includes(op.g)) && (o.wild || !(op.g === 'harmony' && op.w < 0.5));
  const drift = clamp(o.drift || 0, 0, 1), wt = op => op.drift ? (drift >= 0.5 ? op.drift * drift : 0) : op.w;
  const ops = OPS.filter(op => allow(op) && wt(op) > 0), lines = [];
  for (let n = 0, tries = 0; n < k && tries < k * 12 && ops.length; tries++) {
    const tot = ops.reduce((s, op) => s + wt(op), 0); let x = r() * tot, op = ops[0];
    for (const p of ops) { x -= wt(p); if (x <= 0) { op = p; break; } }
    const before = JSON.stringify([gm.drums, gm.bass, gm.riff, gm.prog, gm.key, gm.pad, gm.swing, gm.bpm, gm.padSound]);
    let line = null; try { line = op.f(gm, r, Object.assign({}, o, {genre: gm.genre})); } catch (_) { line = null; }
    if (!line || JSON.stringify([gm.drums, gm.bass, gm.riff, gm.prog, gm.key, gm.pad, gm.swing, gm.bpm, gm.padSound]) === before) continue;
    lines.push(line); n++;
  }
  repair(gm);
  if (!o.silent) gm.log.push(...lines.map(l => 'Mutation: ' + l + '.'));
  return lines;
}
// the genre's kick anchors always play; a groove always has a riff and a bassline
function repair(gm) {
  let k = gm.drums.k; for (const i of kickAnchors(gm.genre)) if (!on(k[i])) k = setAt(k, i, 'X'); gm.drums.k = k;
  if ((gm.bass.steps.match(/[^.\-]/g) || []).length < 2) gm.bass.steps = twice(OB.BASS[genreOf(gm.genre).bass].steps);
  if (gm.bass.steps[0] === '-') gm.bass.steps = '.' + gm.bass.steps.slice(1);
  if (!/[^.\-]/.test(gm.riff.steps)) gm.riff.steps = 'x' + gm.riff.steps.slice(1);
}

// ---------- crossover: gene group by gene group ----------
function crossover(a, b, r, gen) {
  const c = clone(a), from = {};
  c.id = newId(gen); c.gen = gen; c.parents = [a.id, b.id]; c.name = nameFor(r); c.log = [];
  const take = (grp, fn) => { const useB = r() < 0.5; from[grp] = useB ? b : a; if (useB) fn(); };
  for (const g of GROUPS) {
    if (g.lanes) {
      const useB = r() < 0.5, split = r() < 0.22;
      for (const l of g.lanes) { const pa = a.drums[l], pb = b.drums[l]; c.drums[l] = split ? (useB ? pb.slice(0, 16) + pa.slice(16) : pa.slice(0, 16) + pb.slice(16)) : useB ? pb : pa; }
      from[g.k] = split ? (useB ? 'splitBA' : 'splitAB') : useB ? b : a;
      continue;
    }
    switch (g.k) {
      case 'bass': { const useB = r() < 0.5, split = r() < 0.2; c.bass.steps = split ? (useB ? b.bass.steps.slice(0, 16) + a.bass.steps.slice(16) : a.bass.steps.slice(0, 16) + b.bass.steps.slice(16)) : (useB ? b : a).bass.steps; from.bass = split ? (useB ? 'splitBA' : 'splitAB') : useB ? b : a; break; }
      case 'rhythm': take('rhythm', () => { for (const k of RHYTHM) c.riff[k] = b.riff[k]; }); break;
      case 'notes': take('notes', () => { for (const k of NOTES) c.riff[k] = clone(b.riff)[k]; }); break;
      case 'sounds': take('sounds', () => { c.riff.sound = b.riff.sound; c.bass.sound = b.bass.sound; c.padSound = b.padSound; }); break;
      case 'harmony': take('harmony', () => { c.key = b.key; c.scale = b.scale; c.prog = b.prog; c.pad = b.pad; }); break;
      case 'feel': take('feel', () => { c.bpm = b.bpm; c.swing = b.swing; }); break;
    }
  }
  // genre: the parent the drums mostly came from
  const drumVotes = ['kick', 'clap', 'hats', 'perc'].filter(k => from[k] === b || from[k] === 'splitBA').length;
  c.genre = drumVotes >= 3 ? b.genre : a.genre;
  repair(c);
  const nm = p => p === 'splitAB' ? `bar 1 from ${a.name}, bar 2 from ${b.name}` : p === 'splitBA' ? `bar 1 from ${b.name}, bar 2 from ${a.name}` : `from ${p.name}`;
  c.log.push(`Child of ${a.name} × ${b.name}: ${GROUPS.map(g => `${g.name.toLowerCase()} ${nm(from[g.k])}`).join('; ')}.`);
  c.from = Object.fromEntries(Object.entries(from).map(([k, v]) => [k, typeof v === 'string' ? 'split' : v.id]));
  return c;
}
function applyLocks(c, primary, locks) {
  for (const k of locks) {
    const g = GROUPS.find(x => x.k === k); if (!g) continue;
    if (g.lanes) for (const l of g.lanes) c.drums[l] = primary.drums[l];
    else if (k === 'bass') c.bass.steps = primary.bass.steps;
    else if (k === 'rhythm') for (const x of RHYTHM) c.riff[x] = primary.riff[x];
    else if (k === 'notes') for (const x of NOTES) c.riff[x] = clone(primary.riff)[x];
    else if (k === 'sounds') { c.riff.sound = primary.riff.sound; c.bass.sound = primary.bass.sound; c.padSound = primary.padSound; }
    else if (k === 'harmony') { c.key = primary.key; c.scale = primary.scale; c.prog = primary.prog; c.pad = primary.pad; }
    else if (k === 'feel') { c.bpm = primary.bpm; c.swing = primary.swing; }
  }
}

// ---------- hearing it: the genome as notes ----------
function stateOf(gm) {
  return OE.normalize(Object.assign({genre: gm.genre, bpm: gm.bpm, key: gm.key, scale: gm.scale, prog: gm.prog, swing: gm.swing}, clone(gm.riff), {evo: 'none', fill: 'none', mutate: 0, bars: LOOP_BARS, seed: 7, human: 0}));
}
function render(gm) {
  const st = stateOf(gm), R = OE.render(st, {bars: LOOP_BARS, evo: false, fills: false, mutate: false}), h = R.harmony, parts = [];
  for (const l of LK) {
    const s = gm.drums[l], notes = [];
    for (let b = 0; b < LOOP_BARS / 2; b++) for (let i = 0; i < STEPS; i++) { const c = s[i]; if (!on(c)) continue; const gt = b * 8 + i / 4; notes.push({t: l === 'k' || l === 'c' ? gt : swingTime(gt, gm.swing), d: 0.1, n: LANES[l].pitch, v: VEL[c] || 100}); }
    if (notes.length) parts.push({key: l, name: LANES[l].name, role: LANES[l].role, kind: 'drum', pitch: LANES[l].pitch, voice: LANES[l].voice, sound: LANES[l].voice, notes, ch: 9, src: 'drums'});
  }
  // the bass: x root, o octave, 5 fifth, 3 third, 7 seventh, - tie; the root of the chord playing, between C1 and G1
  const bass = [], bs = gm.bass.steps;
  for (let b = 0; b < LOOP_BARS / 2; b++) for (let i = 0; i < STEPS; i++) {
    const c = bs[i], gt = b * 8 + i / 4;
    if (c === '.') continue;
    if (c === '-') { if (bass.length) bass[bass.length - 1].d += 0.25; continue; }
    const ch = h.chords[OE.chordIndexAt(h, gt)]; let root = 36 + mod(ch.root - 36, 12); if (root > 43) root -= 12;
    const third = ch.iv.includes(3) ? 3 : 4, seventh = ch.iv.includes(11) ? 11 : 10, cl = c.toLowerCase();
    const n = cl === 'o' ? root + 12 : cl === '5' ? root + 7 : cl === '3' ? root + third : cl === '7' ? root + seventh : root;
    bass.push({t: swingTime(gt, gm.swing), d: 0.2, n, v: c === 'X' || c === 'O' ? 116 : 98});
  }
  if (bass.length) parts.push({key: 'bass', name: 'Bass', role: 'bass', kind: 'melodic', sound: gm.bass.sound, notes: bass, ch: 1, src: 'bass'});
  const riff = R.events.map(e => ({t: Math.max(0, e.t), d: Math.max(0.03, e.d), n: e.n, v: clamp(Math.round(e.v), 1, 127)})).filter(e => e.t < LOOP_BEATS);
  if (riff.length) parts.push({key: 'riff', name: 'Riff', role: 'lead', kind: 'melodic', sound: gm.riff.sound, notes: riff, ch: 2, src: 'riff'});
  if (gm.pad === 'pad') parts.push({key: 'pad', name: 'Chords', role: 'pad', kind: 'melodic', sound: gm.padSound, notes: OE.renderChords(st, h, LOOP_BARS).map(n => ({t: n.t, d: n.d, n: n.n, v: 68})), ch: 3, src: 'pad'});
  else if (gm.pad === 'stab') {
    const ns = []; for (let t = 0; t < LOOP_BEATS; t += 2) { const ch = h.chords[OE.chordIndexAt(h, t + 1.5)], vo = OE.renderChords(st, h, LOOP_BARS).filter(n => n.t <= t + 1.5 + 1e-6).slice(-ch.notes.length); for (const n of vo) ns.push({t: swingTime(t + 1.5, gm.swing), d: 0.3, n: n.n + 12, v: 84}); }
    parts.push({key: 'pad', name: 'Chord stabs', role: 'chords', kind: 'melodic', sound: 'chord-stab', notes: ns, ch: 3, src: 'pad'});
  }
  return {parts, R, st, harmony: h, bpm: gm.bpm, beats: LOOP_BEATS, bars: LOOP_BARS};
}

// ---------- measuring it ----------
function laneSim(a, b) { let inter = 0, uni = 0; for (let i = 0; i < STEPS; i++) { const x = on(a[i]), y = on(b[i]); if (x || y) uni++; if (x && y) inter++; } return uni ? inter / uni : 1; }
function drumFit(gm, genreId) {
  const anchors = kickAnchors(genreId), k = gm.drums.k, kickOk = anchors.filter(i => on(k[i])).length / Math.max(1, anchors.length);
  const extra = [...k].filter((c, i) => on(c) && !anchors.includes(i)).length, kick = kickOk * Math.max(0, 1 - Math.max(0, extra - 2) * 0.2);
  const G = baseDrums(genreId), back = [...G.c].map((c, i) => [c, i]).filter(([c]) => /[xX]/.test(c)).map(([, i]) => i);
  const backbeat = back.length ? back.filter(i => on(gm.drums.c[i]) || on(gm.drums.r[i])).length / back.length : 1;
  const cnt = d => ['h', 'o', 's'].reduce((s, l) => s + (d[l].match(/[xXg]/g) || []).length, 0), want = cnt(G), have = cnt(gm.drums);
  const hats = clamp(1 - Math.abs(have - want) / Math.max(want, 8), 0, 1);
  return Math.round(100 * (0.45 * kick + 0.25 * backbeat + 0.3 * hats));
}
function bassFit(gm, genreId) {
  const s = gm.bass.steps, k = gm.drums.k, ref = twice(OB.BASS[genreOf(genreId).bass].steps), refK = baseDrums(genreId).k;
  const coll = (b, kk) => { let n = 0, h = 0; for (let i = 0; i < STEPS; i++) if (on(b[i])) { n++; if (on(kk[i])) h++; } return n ? h / n : 0; };
  const dens = b => (b.match(/[^.\-]/g) || []).length;
  const kick = clamp(1 - Math.max(0, coll(s, k) - coll(ref, refK) - 0.1) * 2, 0, 1), density = clamp(1 - Math.abs(dens(s) - dens(ref)) / Math.max(dens(ref), 6), 0, 1);
  return Math.round(100 * (0.6 * kick + 0.4 * density));
}
function measure(gm, rendered) {
  const rd = rendered || render(gm), g = genreOf(gm.genre), m = OE.metrics(rd.R), riff = OE.fit(m, g.target);
  const drums = drumFit(gm, gm.genre), bass = bassFit(gm, gm.genre);
  // the riff sitting in the bass's register muddies both
  const clash = rd.parts.find(p => p.key === 'riff') && m.lowest < 47 ? 8 : 0;
  const fit = clamp(Math.round(0.5 * riff.score + 0.3 * drums + 0.2 * bass - clash), 0, 100);
  return {fit, riff: riff.score, drums, bass, clash, axes: riff.axes, metrics: m, reads: readsAs(gm, m)};
}
// which genre this groove reads as: Orbit's fingerprint of the riff against every genre, the drums against every
// genre's groove, and the tempo against every genre's range
function readsAs(gm, m) {
  const out = [];
  for (const [id, g] of Object.entries(OB.GENRES)) {
    const rf = OE.fit(m, g.target).score, G = baseDrums(id);
    const df = 100 * (0.35 * laneSim(gm.drums.k, G.k) + 0.2 * laneSim(gm.drums.c, G.c) + 0.3 * (0.6 * laneSim(gm.drums.h, G.h) + 0.4 * laneSim(gm.drums.o, G.o)) + 0.15 * (['s', 'r', 't', 'b'].reduce((s, l) => s + laneSim(gm.drums[l], G[l]), 0) / 4));
    const tempo = gm.bpm >= g.bpm[0] - 1 && gm.bpm <= g.bpm[1] + 1 ? 100 : Math.max(0, 100 - 12 * Math.min(Math.abs(gm.bpm - g.bpm[0]), Math.abs(gm.bpm - g.bpm[1])));
    out.push({genre: id, name: g.name, color: g.color, score: Math.round(0.45 * rf + 0.35 * df + 0.2 * tempo)});
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}
// how different two grooves sound: what plays where, which notes, which key and which sounds (0 = the same, 1 = nothing shared)
function distance(a, b, ra, rb) {
  ra = ra || render(a); rb = rb || render(b);
  let dd = 0, w = 0; for (const l of LK) { const act = /[xXg]/.test(a.drums[l]) || /[xXg]/.test(b.drums[l]); if (!act) continue; const ww = l === 'k' ? 1.6 : l === 'c' ? 1.2 : 1; dd += ww * (1 - laneSim(a.drums[l], b.drums[l])); w += ww; }
  const drums = w ? dd / w : 0;
  let bd = 0; for (let i = 0; i < STEPS; i++) { const x = a.bass.steps[i], y = b.bass.steps[i]; if (on(x) !== on(y)) bd += 1; else if (on(x) && x.toLowerCase() !== y.toLowerCase()) bd += 0.5; }
  const grid = p => { const m = new Map(); if (p) for (const n of p.notes) { const k = Math.round(n.t * 4); if (!m.has(k) || m.get(k) < n.n) m.set(k, n.n); } return m; };
  const A = grid(ra.parts.find(p => p.key === 'riff')), B = grid(rb.parts.find(p => p.key === 'riff'));
  const keys = new Set([...A.keys(), ...B.keys()]); let rr = 0, pn = 0, both = 0;
  for (const k of keys) { if (A.has(k) !== B.has(k)) rr++; else { both++; if (mod(A.get(k) - B.get(k), 12) !== 0) pn++; } }
  const rhythm = keys.size ? rr / keys.size : 0, notes = both ? pn / both : 0;
  const harmony = (a.key !== b.key ? 0.5 : 0) + (a.prog !== b.prog ? 0.35 : 0) + (a.pad !== b.pad ? 0.15 : 0);
  const sounds = ((a.riff.sound !== b.riff.sound) + (a.bass.sound !== b.bass.sound) + (a.padSound !== b.padSound && (a.pad !== 'off' || b.pad !== 'off'))) / 3;
  return clamp(0.3 * drums + 0.2 * Math.min(1, bd / 12) + 0.2 * rhythm + 0.15 * notes + 0.1 * harmony + 0.05 * sounds, 0, 1);
}

// ---------- a new generation ----------
// Every slot draws several candidates (a crossover of two favourites, or a copy of one, then mutated) and keeps the
// one with the best mix of genre fit and difference from the siblings already chosen. Drift turns the fit down: at
// full drift only difference counts, and the line can walk into another genre.
const STRENGTH = {gentle: 0.6, bold: 1, wild: 1.8};
function breed(favs, o = {}) {
  if (!favs.length) throw Error('Star at least one groove to breed from.');
  const n = o.n || 8, gen = (o.gen || Math.max(...favs.map(f => f.gen)) + 1), r = OT.rng((o.seed || 1) * 104729 + gen * 31), locks = o.locks || [], drift = clamp(o.drift ?? 0.2, 0, 1);
  const sf = STRENGTH[o.strength] || 1, wild = o.strength === 'wild', K = o.candidates || 6;
  const out = [], rendered = new Map();
  const R = g => { if (!rendered.has(g.id)) rendered.set(g.id, render(g)); return rendered.get(g.id); };
  if (o.keepParents) for (const f of favs) if (out.length < n) out.push(Object.assign(clone(f), {elite: true}));
  const pairs = []; for (let i = 0; i < favs.length; i++) for (let j = i + 1; j < favs.length; j++) pairs.push([favs[i], favs[j]]);
  const ladder = [1, 1, 2, 2, 3, 3, 4, 5];
  let slot = 0;
  while (out.length < n) {
    let best = null;
    for (let c = 0; c < K; c++) {
      let child;
      if (pairs.length) { const [a, b] = pairs[slot % pairs.length]; child = r() < 0.5 ? crossover(a, b, r, gen) : crossover(b, a, r, gen); const k = Math.max(0, Math.round((slot % 3) * sf * 0.7 + (r() < 0.4 ? 1 : 0))); if (k) mutate(child, k, r, {locks, wild, drift}); }
      else {
        const p = favs[slot % favs.length]; child = clone(p); child.id = newId(gen); child.gen = gen; child.parents = [p.id]; child.name = nameFor(r); child.log = [`Child of ${p.name}.`]; delete child.elite; delete child.from;
        mutate(child, Math.max(1, Math.round(ladder[slot % ladder.length] * sf)), r, {locks, wild, drift});
      }
      applyLocks(child, favs[0], locks); repair(child);
      const rc = R(child), meas = measure(child, rc);
      const near = [...out, ...favs].map(x => distance(child, x, rc, R(x)));
      const minD = near.length ? Math.min(...near) : 1;
      if (minD < 0.015) continue;   // a copy of something already here
      const q = (1 - drift) * meas.fit / 100 + (0.35 + 0.5 * drift) * minD;
      if (!best || q > best.q) best = {q, child, meas, d: minD};
    }
    if (!best) { slot++; if (slot > n * 6) break; continue; }
    best.child.measured = best.meas; out.push(best.child); slot++;
  }
  // nearest to the first favourite first: the eight run from "a little different" to "far out"
  const p0 = favs[0], keep = out.filter(x => x.elite), kids = out.filter(x => !x.elite);
  kids.forEach(k => { k.distance = distance(k, p0, R(k), R(p0)); });
  kids.sort((a, b) => a.distance - b.distance);
  return [...keep, ...kids];
}

// ---------- from your own loop ----------
const PAD_LANE = {35: 'k', 36: 'k', 38: 'c', 39: 'c', 40: 'c', 42: 'h', 44: 'h', 46: 'o', 51: 'o', 53: 'o', 59: 'o', 54: 's', 69: 's', 70: 's', 37: 'r', 75: 'r', 76: 'r', 77: 'r', 56: 'b', 67: 'b', 68: 'b'};
function laneOfPart(p) { if (p.role === 'kick') return 'k'; if (p.role === 'clap') return 'c'; if (PAD_LANE[p.pitch]) return PAD_LANE[p.pitch]; if (p.role === 'hats') return /open|ride/i.test(p.name) ? 'o' : 'h'; if ((p.pitch >= 41 && p.pitch <= 50) || (p.pitch >= 60 && p.pitch <= 66)) return 't'; return 'r'; }
// A loop (Transplant's loop reader) becomes the first groove of a family: its drums on the grid, its bassline as
// degrees of the key, its lead (or chords) as an Orbit riff.
function fromLoop(loop, genreId) {
  const g = genreOf(genreId), r = OT.rng(7), key = loop.key ? loop.key.pc : OT.pcOf(g.key), scale = loop.key ? (loop.key.scale === 'major' ? 'major' : 'minor') : g.scale;
  const drums = Object.fromEntries(LK.map(l => [l, blank()])), lines = [];
  for (const p of loop.parts.filter(p => p.kind === 'drum')) {
    const l = laneOfPart(p);
    let s = drums[l];
    for (const n of p.notes) { const i = Math.round(n.t * 4); if (i < 0 || i >= STEPS) continue; s = setAt(s, i, n.v >= 112 ? 'X' : n.v < 75 ? 'g' : 'x'); }
    drums[l] = s;
  }
  if (!/[xXg]/.test(drums.k)) { drums.k = baseDrums(genreId).k; lines.push('no kick in your loop: the genre\'s kick added'); }
  const bassPart = loop.parts.find(p => p.role === 'bass');
  let bass = twice(OB.BASS[g.bass].steps);
  if (bassPart) {
    let s = blank(); const low = Math.min(...bassPart.notes.map(n => n.n));
    for (const n of bassPart.notes) {
      const i = Math.round(n.t * 4); if (i < 0 || i >= STEPS) continue;
      const iv = mod(n.n - key, 12), oct = n.n - low >= 12 - mod(low - key, 12) && n.n >= low + 7;
      const c = iv === 0 ? (oct ? 'o' : 'x') : iv === 7 ? '5' : iv === 3 || iv === 4 ? '3' : iv === 10 || iv === 11 ? '7' : iv <= 2 ? 'x' : iv <= 5 ? '3' : iv <= 8 ? '5' : '7';
      s = setAt(s, i, n.v >= 112 && /[xo]/.test(c) ? c.toUpperCase() : c);
      for (let j = 1; j < Math.round(n.d * 4) && i + j < STEPS && s[i + j] === '.'; j++) if (n.d > 0.4) s = setAt(s, i + j, '-');
    }
    if ((s.match(/[^.\-]/g) || []).length >= 2) bass = s;
  } else lines.push('no bass in your loop: the genre\'s bassline added');
  const lead = loop.parts.find(p => p.role === 'lead') || loop.parts.find(p => p.role === 'chords') || loop.parts.find(p => p.role === 'vox') || loop.parts.find(p => p.role === 'pad');
  const base = {genre: genreId, bpm: Math.round(loop.bpm || g.bpm[0]), key, scale, prog: 'i', swing: 50};
  let riff;
  if (lead) {
    const top = lead.notes.filter(n => n.t < 16); // one voice: the highest note at each onset
    const byT = new Map(); for (const n of top) { const k = Math.round(n.t * 4); if (!byT.has(k) || byT.get(k).n < n.n) byT.set(k, n); }
    const res = OE.riffFromNotes([...byT.values()], Object.assign({}, base, {reg: Math.round(top.reduce((s, n) => s + n.n, 0) / Math.max(1, top.length))}));
    riff = riffGenes(OE.normalize(Object.assign({}, base, res.patch, {sound: OB.SOUNDS_BY_ID[lead.sound] ? lead.sound : genreOf(genreId).gen.sounds[0], reg: res.patch.reg || 64})));
    riff.reg = clamp(Math.round(Math.min(...top.map(n => n.n)) + 2), 48, 80);
    base.swing = res.swing || 50;
  } else { riff = riffGenes(OE.generate(genreId, 11)); lines.push('no lead in your loop: a riff from Orbit\'s generator added'); }
  const chordsPart = loop.parts.find(p => p.role === 'chords' || p.role === 'pad');
  const gm = {id: newId(1), gen: 1, parents: [], genre: genreId, name: (loop.name || 'Your loop').slice(0, 32), origin: 'your loop', bpm: base.bpm, swing: base.swing, key, scale, prog: 'i',
    pad: chordsPart && chordsPart !== lead ? 'pad' : 'off', padSound: chordsPart && OB.SOUNDS_BY_ID[chordsPart.sound] ? chordsPart.sound : 'warm-pad', drums, bass: {steps: bass, sound: bassPart && BASS_SOUNDS.includes(bassPart.sound) ? bassPart.sound : 'tp-rolling'}, riff, log: []};
  repair(gm);
  gm.log.push(`From your loop${lines.length ? ` (${lines.join('; ')})` : ''}: the drums on the 16th grid, the bassline as degrees of ${OT.keyLabel(key, scale)}, the lead as an Orbit riff.`);
  return gm;
}

// ---------- out ----------
const ascii = s => String(s).normalize('NFKD').replace(/[^\x20-\x7e]/g, '').trim() || 'Groove';
function tracksOf(rd, offset = 0) {
  const drums = rd.parts.filter(p => p.kind === 'drum'), mel = rd.parts.filter(p => p.kind !== 'drum');
  const out = [];
  if (drums.length) out.push({name: 'Drums', ch: 9, notes: drums.flatMap(p => p.notes.map(n => ({t: n.t + offset, d: n.d, n: n.n, v: n.v})))});
  for (const p of mel) out.push({name: p.name, ch: p.ch, notes: p.notes.map(n => ({t: n.t + offset, d: n.d, n: n.n, v: n.v}))});
  return out;
}
function midi(gm) { const rd = render(gm); return OT.writeMidi(tracksOf(rd), {bpm: gm.bpm, name: ascii(gm.name), beats: LOOP_BEATS, markers: [{t: 0, text: ascii(gm.name)}]}); }
// a family line, oldest first, each groove for 8 bars: the evolution as an arrangement
function lineageMidi(line) {
  const byName = new Map();
  line.forEach((gm, i) => { const rd = render(gm); for (const rep of [0, 1]) for (const tr of tracksOf(rd, i * 32 + rep * LOOP_BEATS)) { if (!byName.has(tr.name)) byName.set(tr.name, {name: tr.name, ch: tr.ch, notes: []}); byName.get(tr.name).notes.push(...tr.notes); } });
  return OT.writeMidi([...byName.values()], {bpm: line[line.length - 1].bpm, name: 'Breeder lineage', beats: line.length * 32, markers: line.map((gm, i) => ({t: i * 32, text: ascii(`Gen ${gm.gen}: ${gm.name}`)}))});
}
// the groove as a loop Transplant can read (TL's saved-loop format)
function toLoop(gm) {
  const rd = render(gm), role = {riff: 'lead', bass: 'bass', pad: gm.pad === 'stab' ? 'chords' : 'pad'}, follow = {kick: 'kick', clap: 'clap', hats: 'hats', perc: 'hats', bass: 'bass', lead: 'pads', chords: 'pads', pad: 'pads'};
  return {bars: LOOP_BARS, bpm: gm.bpm, name: gm.name, key: {pc: gm.key, scale: gm.scale, name: OT.keyLabel(gm.key, gm.scale), camelot: OT.camelot(gm.key, gm.scale)},
    parts: rd.parts.map(p => { const rl = p.kind === 'drum' ? p.role : role[p.key]; return {id: 'b' + p.key, name: p.name, role: rl, kind: p.kind, pitch: p.pitch, voice: p.voice, sound: p.sound,
      src: p.kind === 'drum' ? {id: 'bdrums', name: 'Drums', file: 'breeder', ch: 9} : {id: 'b' + p.key, name: p.name, file: 'breeder', ch: p.ch}, notes: p.notes.map(n => ({t: n.t, d: n.d, n: n.n, v: n.v})), mute: false, solo: false, level: 1, entry: 'auto', follow: follow[rl] || 'pads'}; })};
}
// the audio engine's (Transplant's TA) plan for one groove, looped
function plan(gm, opts = {}) {
  const rd = render(gm), depth = opts.duck ?? (SIDECHAIN[gm.genre] || 4), rel = 60000 / gm.bpm * 0.36;
  const GROUP = {kick: 'drums', clap: 'drums', hats: 'drums', perc: 'drums', bass: 'bass', lead: 'synths', chords: 'synths', pad: 'synths'};
  return {bpm: gm.bpm, beats: LOOP_BEATS, bars: LOOP_BARS, filt: {}, gain: new Float32Array(LOOP_BEATS * 4).fill(1), mutes: [], tapes: [], tails: [], fx: [], duck: new Float32Array(LOOP_BARS).fill(depth), release: new Float32Array(LOOP_BARS).fill(rel),
    parts: rd.parts.map(p => { const m = (opts.mix || {})[p.key] || {}; return {id: p.key, role: p.role, group: GROUP[p.role] || 'synths', notes: p.notes, part: {name: p.name, role: p.role, kind: p.kind, voice: p.voice, sound: p.sound, pitch: p.pitch, mute: !!m.mute, solo: !!m.solo, level: m.level ?? (p.key === 'pad' ? 0.8 : 1), notes: p.notes}}; })};
}
function validate(gm) {
  if (!gm || typeof gm !== 'object' || !OB.GENRES[gm.genre] || !gm.drums || !gm.bass || !gm.riff) return false;
  for (const l of LK) if (typeof gm.drums[l] !== 'string' || gm.drums[l].length !== STEPS || !/^[.xXg]+$/.test(gm.drums[l])) return false;
  return typeof gm.bass.steps === 'string' && gm.bass.steps.length === STEPS && /^[.\-xXoO537]+$/.test(gm.bass.steps) && typeof gm.riff.steps === 'string';
}

return {STEPS, LOOP_BARS, LOOP_BEATS, LANES, LK, GROUPS, OPS, BASS_SOUNDS, PAD_SOUNDS, SIDECHAIN, seed, mutate, repair, crossover, applyLocks, breed, render, measure, readsAs, distance,
  drumFit, bassFit, kickAnchors, bassAvoidsKick, fromLoop, midi, lineageMidi, toLoop, plan, stateOf, validate, clone, swingTime, nameFor};
})();
/* breeder-genome:end */
