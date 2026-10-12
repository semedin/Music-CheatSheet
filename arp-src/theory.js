// Orbit theory: note names, scales, chord symbols and roman numerals, voicing with voice leading,
// key and chord detection, and Standard MIDI Files in and out. No DOM, no audio: the tests run it in Node.
const OT = (() => {
  const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const ASCII = {'♯': '#', '♭': 'b'};
  // keys that are spelled with flats (as tonic of a minor or major key)
  const FLAT_MINOR = new Set([0, 2, 3, 5, 7, 10]), FLAT_MAJOR = new Set([1, 3, 5, 8, 10]);

  const SCALES = {
    minor: {name: 'Natural minor', st: [0, 2, 3, 5, 7, 8, 10], minor: true},
    dorian: {name: 'Dorian', st: [0, 2, 3, 5, 7, 9, 10], minor: true},
    phrygian: {name: 'Phrygian', st: [0, 1, 3, 5, 7, 8, 10], minor: true},
    harmonic: {name: 'Harmonic minor', st: [0, 2, 3, 5, 7, 8, 11], minor: true},
    major: {name: 'Major', st: [0, 2, 4, 5, 7, 9, 11], minor: false},
    mixolydian: {name: 'Mixolydian', st: [0, 2, 4, 5, 7, 9, 10], minor: false},
    lydian: {name: 'Lydian', st: [0, 2, 4, 6, 7, 9, 11], minor: false},
  };

  // chord qualities: intervals from the root, and how the symbol is written
  const Q = {
    'maj': {iv: [0, 4, 7], sym: ''},
    'min': {iv: [0, 3, 7], sym: 'm'},
    '7': {iv: [0, 4, 7, 10], sym: '7'},
    'm7': {iv: [0, 3, 7, 10], sym: 'm7'},
    'maj7': {iv: [0, 4, 7, 11], sym: 'maj7'},
    'm9': {iv: [0, 3, 7, 10, 14], sym: 'm9'},
    'maj9': {iv: [0, 4, 7, 11, 14], sym: 'maj9'},
    '9': {iv: [0, 4, 7, 10, 14], sym: '9'},
    'm11': {iv: [0, 3, 7, 10, 14, 17], sym: 'm11'},
    'add9': {iv: [0, 4, 7, 14], sym: 'add9'},
    'madd9': {iv: [0, 3, 7, 14], sym: 'm(add9)'},
    'sus2': {iv: [0, 2, 7], sym: 'sus2'},
    'sus4': {iv: [0, 5, 7], sym: 'sus4'},
    '7sus4': {iv: [0, 5, 7, 10], sym: '7sus4'},
    'dim': {iv: [0, 3, 6], sym: 'dim'},
    'm7b5': {iv: [0, 3, 6, 10], sym: 'm7♭5'},
    'aug': {iv: [0, 4, 8], sym: 'aug'},
    '6': {iv: [0, 4, 7, 9], sym: '6'},
    'm6': {iv: [0, 3, 7, 9], sym: 'm6'},
    '5': {iv: [0, 7], sym: '5'},
  };
  // suffix spellings people type, mapped to a quality (major and minor contexts handled by the parser)
  const SUFFIX = {
    '': 'maj', 'M': 'maj', 'maj': 'maj', 'm': 'min', 'min': 'min', '-': 'min', 'mi': 'min',
    '7': '7', 'dom7': '7', 'm7': 'm7', 'min7': 'm7', '-7': 'm7', 'mi7': 'm7',
    'maj7': 'maj7', 'M7': 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', 'ma7': 'maj7',
    'm9': 'm9', 'min9': 'm9', '-9': 'm9', 'maj9': 'maj9', 'M9': 'maj9', '9': '9', 'm11': 'm11', 'min11': 'm11',
    'add9': 'add9', 'add2': 'add9', 'madd9': 'madd9', 'm(add9)': 'madd9', 'madd2': 'madd9',
    'sus2': 'sus2', 'sus': 'sus4', 'sus4': 'sus4', '7sus4': '7sus4', '7sus': '7sus4',
    'dim': 'dim', '°': 'dim', 'o': 'dim', 'm7b5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', 'm7♭5': 'm7b5',
    'aug': 'aug', '+': 'aug', '6': '6', 'm6': 'm6', 'min6': 'm6', '5': '5',
  };

  const mod = (n, m) => ((n % m) + m) % m;
  const pcOf = name => {
    const m = /^([A-Ga-g])([#b♯♭]?)/.exec(String(name).trim());
    if (!m) return null;
    const base = {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11}[m[1].toLowerCase()];
    return mod(base + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0), 12);
  };
  const useFlats = (key, scale) => (SCALES[scale] || SCALES.minor).minor ? FLAT_MINOR.has(mod(key, 12)) : FLAT_MAJOR.has(mod(key, 12));
  const pcName = (pc, key = 0, scale = 'minor') => (useFlats(key, scale) ? FLAT : SHARP)[mod(pc, 12)];
  const noteName = (n, key = 0, scale = 'minor') => pcName(n, key, scale) + (Math.floor(n / 12) - 2); // Ableton: C3 = 60
  const asciiName = s => String(s).replace(/[♯♭]/g, c => ASCII[c]);
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  // Camelot code for DJs: minor keys are A, major keys are B
  function camelot(key, scale) {
    const minor = (SCALES[scale] || SCALES.minor).minor;
    const n = mod((mod(key, 12) - (minor ? 8 : 11)) * 7, 12) + 1;
    return n + (minor ? 'A' : 'B');
  }
  const keyLabel = (key, scale) => pcName(key, key, scale) + ' ' + (SCALES[scale] || SCALES.minor).name.toLowerCase();

  const ROMAN = ['vii', 'iii', 'iv', 'vi', 'ii', 'v', 'i'];
  const ROMAN_DEG = {i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6};
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];

  // One token: a roman numeral relative to the key's scale (i, VI, bVII7, iv9 …) or a chord symbol (Am7, F#m, Bbmaj7 …).
  // An optional ":n" sets how many chord slots it lasts.
  function parseChord(token, key, scale) {
    let t = String(token).trim(), len = 1;
    const lm = /:(\d+(?:\.\d+)?)$/.exec(t);
    if (lm) { len = Math.min(16, Math.max(0.25, parseFloat(lm[1]))); t = t.slice(0, lm.index); }
    if (!t) return {error: 'empty chord'};
    t = t.split('/')[0]; // slash bass is ignored: the arp voices the chord itself
    const sc = SCALES[scale] || SCALES.minor;
    const rm = /^([b#♭♯]?)(vii|iii|iv|vi|ii|v|i)(.*)$/i.exec(t);
    if (rm && !/^[A-G]/.test(t)) {
      const numeral = rm[2], lower = numeral === numeral.toLowerCase();
      if (!lower && numeral !== numeral.toUpperCase()) return {error: `"${token}" mixes upper and lower case`};
      const acc = rm[1] === 'b' || rm[1] === '♭' ? -1 : rm[1] ? 1 : 0;
      const deg = ROMAN_DEG[numeral.toLowerCase()];
      // plain numerals are degrees of the current scale (i VI III VII in minor = Am F C G);
      // with an accidental they are read against the major scale, as borrowed chords usually are (bVII in A = G)
      const root = mod(key + (acc ? MAJOR[deg] + acc : sc.st[deg]), 12);
      let suf = rm[3];
      let q;
      if (suf === '' ) q = lower ? 'min' : 'maj';
      else if (suf === '°' || suf === 'o' || suf === 'dim') q = 'dim';
      else if (suf === 'ø' || suf === 'ø7' || suf === 'm7b5') q = 'm7b5';
      else if (suf === '7') q = lower ? 'm7' : '7';
      else if (suf === '9') q = lower ? 'm9' : '9';
      else if (suf === '11') q = lower ? 'm11' : '9';
      else if (suf === '6') q = lower ? 'm6' : '6';
      else if (suf === 'add9' || suf === 'add2') q = lower ? 'madd9' : 'add9';
      else if (suf === 'maj7' || suf === 'M7' || suf === 'Δ') q = 'maj7';
      else if (suf === 'maj9' || suf === 'M9') q = 'maj9';
      else if (SUFFIX[suf] && ['sus2', 'sus4', '7sus4', '5', 'aug'].includes(SUFFIX[suf])) q = SUFFIX[suf];
      else return {error: `"${token}": unknown numeral suffix "${suf}"`};
      return {root, q, len, roman: t};
    }
    const cm = /^([A-G])([#b♯♭]?)(.*)$/.exec(t);
    if (!cm) return {error: `"${token}" is not a chord symbol or a roman numeral`};
    const root = pcOf(cm[1] + cm[2]);
    const q = SUFFIX[cm[3]];
    if (!q) return {error: `"${token}": unknown chord quality "${cm[3]}"`};
    return {root, q, len};
  }

  function chordName(root, q, key, scale) { return pcName(root, key, scale) + (Q[q] ? Q[q].sym : ''); }

  // A progression string → chords. Separators: spaces, bars (|), commas, en dashes.
  function parseProgression(text, key, scale) {
    const tokens = String(text || '').split(/[\s|,–]+/).filter(Boolean);
    const chords = [], errors = [];
    for (const tok of tokens) {
      const c = parseChord(tok, key, scale);
      if (c.error) errors.push(c.error);
      else chords.push({...c, iv: Q[c.q].iv.slice(), name: chordName(c.root, c.q, key, scale)});
    }
    if (!chords.length && !errors.length) errors.push('Type at least one chord');
    return {chords, errors};
  }

  // Roman numeral for a chord in a key, for display under an imported progression
  function romanFor(root, q, key, scale) {
    const sc = SCALES[scale] || SCALES.minor, rel = mod(root - key, 12);
    let deg = sc.st.indexOf(rel), acc = '';
    if (deg < 0) { deg = sc.st.indexOf(mod(rel + 1, 12)); acc = '♭'; if (deg < 0) { deg = sc.st.indexOf(mod(rel - 1, 12)); acc = '♯'; } }
    if (deg < 0) return '?';
    const minorish = ['min', 'm7', 'm9', 'm11', 'madd9', 'm6', 'dim', 'm7b5'].includes(q);
    let r = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'][deg];
    if (!minorish) r = r.toUpperCase();
    const tail = {dim: '°', m7b5: 'ø', m7: '7', '7': '7', maj7: 'maj7', m9: '9', '9': '9', maj9: 'maj9', m11: '11', add9: 'add9', madd9: 'add9', sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', aug: '+', '6': '6', m6: '6', '5': '5'}[q] || '';
    return acc + r + tail;
  }

  // Voicing. Each inversion of the chord is tried in each octave; the one closest to the previous voicing wins,
  // with a pull toward the register centre so a long progression can't drift away.
  function voice(root, iv, center, prev) {
    const base = iv.map(i => root + i);
    const n = base.length, cands = [];
    for (let inv = 0; inv < n; inv++) {
      const v = base.map((p, k) => p + (k < inv ? 12 : 0)).sort((a, b) => a - b);
      for (let o = -4; o <= 6; o++) cands.push(v.map(p => p + 12 * o));
    }
    let best = null, bestCost = Infinity;
    for (const v of cands) {
      const mean = v.reduce((s, p) => s + p, 0) / n;
      let cost = Math.abs(mean - center) * (prev ? 0.35 : 1);
      if (prev && prev.length) cost += movement(prev, v);
      if (cost < bestCost - 1e-9) { bestCost = cost; best = v; }
    }
    return best;
  }
  // total semitones moved: each note to its nearest note in the other chord, both ways, halved
  function movement(a, b) {
    let s = 0;
    for (const p of a) s += Math.min(...b.map(q => Math.abs(p - q)));
    for (const q of b) s += Math.min(...a.map(p => Math.abs(p - q)));
    return s / 2;
  }
  // Keep an imported voicing's shape, shift it whole octaves so its middle sits near the register centre
  function shiftTo(notes, center) {
    const mean = notes.reduce((s, p) => s + p, 0) / notes.length;
    const o = Math.round((center - mean) / 12);
    return notes.map(p => p + 12 * o).sort((a, b) => a - b);
  }

  // ---- key and chord detection ----
  const KK_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const KK_MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  function corr(a, b) {
    const ma = a.reduce((s, x) => s + x, 0) / 12, mb = b.reduce((s, x) => s + x, 0) / 12;
    let n = 0, da = 0, db = 0;
    for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return da && db ? n / Math.sqrt(da * db) : 0;
  }
  // Krumhansl–Kessler: duration-weighted pitch classes against the 24 key profiles
  // A loop's first chord usually is its tonic, so when one is given it tips the balance between a key and its
  // relative (Am7–Fmaj7–C–G has C major's notes but is in A minor).
  function detectKey(notes, first) {
    const w = new Array(12).fill(0);
    for (const n of notes) w[mod(n.n, 12)] += n.d;
    let best = {key: 9, scale: 'minor', r: -2}, tonic = null;
    for (let k = 0; k < 12; k++) for (const [scale, prof] of [['minor', KK_MIN], ['major', KK_MAJ]]) {
      const rot = prof.map((_, i) => prof[mod(i - k, 12)]);
      const r = corr(w, rot);
      if (r > best.r) best = {key: k, scale, r};
      if (first && mod(first.root, 12) === k && (scale === 'minor') === MINORISH.has(first.q)) tonic = {key: k, scale, r};
    }
    return tonic && tonic.r >= best.r - 0.2 ? tonic : best;
  }
  const MINORISH = new Set(['min', 'm7', 'm9', 'm11', 'madd9', 'm6', 'dim', 'm7b5']);
  // Name a set of pitches: every root × quality template scored on the duration-weighted pitch classes,
  // with a bonus when the root is the lowest note.
  const DETECT_Q = ['maj', 'min', '7', 'm7', 'maj7', 'm9', 'maj9', '9', 'add9', 'madd9', 'sus2', 'sus4', '7sus4', 'dim', 'm7b5', '6', 'm6', '5', 'm11', 'aug'];
  function detectChord(weights, bass) {
    const total = weights.reduce((s, x) => s + x, 0) || 1;
    let best = null;
    for (let r = 0; r < 12; r++) for (const q of DETECT_Q) {
      const pcs = new Set(Q[q].iv.map(i => mod(r + i, 12)));
      let hit = 0, miss = 0, extra = 0;
      for (let pc = 0; pc < 12; pc++) { if (pcs.has(pc)) { if (weights[pc] > 0) hit += weights[pc]; else miss++; } else extra += weights[pc]; }
      let score = hit / total - extra / total * 1.2 - miss * 0.22 - pcs.size * 0.012;
      if (bass != null && mod(bass, 12) === r) score += 0.12;
      if (!weights[r]) score -= 0.3;
      if (!best || score > best.score) best = {root: r, q, score};
    }
    return best;
  }

  // Chords out of a MIDI clip: beat-by-beat pitch sets, merged while they stay the same.
  // Returns chords with their actual pitches (the imported voicing), lengths in beats, and names.
  function chordsFromNotes(notes, opts = {}) {
    const slot = opts.slot || 1;
    if (!notes.length) return {chords: [], beats: 0};
    const t0 = Math.floor(Math.min(...notes.map(n => n.t)) / 4) * 4;
    const end = Math.max(...notes.map(n => n.t + n.d)) - t0;
    const beats = Math.max(4, Math.ceil(end / 4 - 0.02) * 4);
    const slots = [];
    for (let s = 0; s < beats / slot; s++) {
      const a = t0 + s * slot, b = a + slot, w = new Array(12).fill(0), pitches = new Map();
      for (const n of notes) {
        const ov = Math.min(b, n.t + n.d) - Math.max(a, n.t);
        if (ov >= Math.min(0.24, n.d * 0.5)) { w[mod(n.n, 12)] += ov; pitches.set(n.n, (pitches.get(n.n) || 0) + ov); }
      }
      const max = Math.max(...w);
      const set = w.map(x => x >= max * 0.2 && x > 0 ? 1 : 0).join('');
      slots.push({w, pitches, set, empty: max === 0});
    }
    const segs = [];
    for (const [i, s] of slots.entries()) {
      if (s.empty) { if (segs.length) segs[segs.length - 1].len += slot; continue; }
      const last = segs[segs.length - 1];
      if (last && last.set === s.set) { last.len += slot; s.w.forEach((x, k) => last.w[k] += x); for (const [p, v] of s.pitches) last.pitches.set(p, (last.pitches.get(p) || 0) + v); }
      else segs.push({start: i * slot, len: slot, set: s.set, w: s.w.slice(), pitches: new Map(s.pitches)});
    }
    if (segs.length && segs[0].start > 0) { segs[0].len += segs[0].start; segs[0].start = 0; }
    // the voicing: the pitches that sound for a real share of the chord, one per pitch class per octave
    const chords = segs.map(s => {
      const maxp = Math.max(...s.pitches.values());
      const ps = [...s.pitches.entries()].filter(([, v]) => v >= maxp * 0.25).map(([p]) => p).sort((a, b) => a - b);
      const det = detectChord(s.w, ps[0]);
      return {t: s.start, d: s.len, notes: ps.slice(0, 8), root: det.root, q: det.q, iv: Q[det.q].iv.slice()};
    });
    return {chords, beats};
  }

  // ---- Standard MIDI Files ----
  const vlq = n => { const b = [n & 127]; while ((n >>= 7)) b.unshift((n & 127) | 128); return b; };
  const be = (n, len) => { const b = []; for (let i = len - 1; i >= 0; i--) b.push((n >>> (8 * i)) & 255); return b; };
  const ascii = s => Array.from(asciiName(s)).map(c => c.charCodeAt(0) & 127);
  // tracks: [{name, ch, notes:[{t,d,n,v}], cc:[{t,cc,v}]}], times in beats
  function writeMidi(tracks, {bpm = 124, ppq = 480, name = 'Orbit', beats = null, markers = []} = {}) {
    const end = beats != null ? Math.round(beats * ppq) : null;
    const chunk = events => {
      events.sort((a, b) => a.tick - b.tick || a.order - b.order);
      const body = [];
      let last = 0;
      for (const e of events) { body.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
      const stop = end != null ? Math.max(end, last) : last;
      body.push(...vlq(stop - last), 255, 47, 0);
      return [77, 84, 114, 107, ...be(body.length, 4), ...body];
    };
    const us = Math.round(60000000 / bpm);
    const nm = ascii(name);
    const conductor = [
      {tick: 0, order: 0, bytes: [255, 3, ...vlq(nm.length), ...nm]},
      {tick: 0, order: 1, bytes: [255, 81, 3, ...be(us, 3)]},
      {tick: 0, order: 2, bytes: [255, 88, 4, 4, 2, 24, 8]},
      ...markers.map((m, i) => { const t = ascii(m.text); return {tick: Math.round(m.t * ppq), order: 3 + i, bytes: [255, 6, ...vlq(t.length), ...t]}; }),
    ];
    const out = [chunk(conductor)];
    for (const tr of tracks) {
      const ch = tr.ch || 0, tn = ascii(tr.name || 'Track');
      const ev = [{tick: 0, order: -3, bytes: [255, 3, ...vlq(tn.length), ...tn]}];
      for (const c of tr.cc || []) ev.push({tick: Math.max(0, Math.round(c.t * ppq)), order: -1, bytes: [176 + ch, c.cc & 127, Math.max(0, Math.min(127, Math.round(c.v)))]});
      for (const n of tr.notes) {
        const a = Math.max(0, Math.round(n.t * ppq));
        let b = Math.max(a + 1, Math.round((n.t + n.d) * ppq));
        if (end != null) b = Math.min(b, end);
        if (b <= a) continue;
        ev.push({tick: a, order: 1, bytes: [144 + ch, n.n & 127, Math.max(1, Math.min(127, Math.round(n.v)))]});
        ev.push({tick: b, order: 0, bytes: [128 + ch, n.n & 127, 0]});
      }
      out.push(chunk(ev));
    }
    return new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, 1, ...be(out.length, 2), ...be(ppq, 2), ...out.flat()]);
  }

  function readMidi(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b.length > 4e6) throw Error('Choose a MIDI file smaller than 4 MB.');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let pos = 0;
    const need = n => { if (pos + n > b.length) throw Error('The MIDI file is incomplete.'); };
    const u8 = () => { need(1); return b[pos++]; };
    const u16 = () => { need(2); const n = dv.getUint16(pos); pos += 2; return n; };
    const u32 = () => { need(4); const n = dv.getUint32(pos); pos += 4; return n; };
    const str = n => { need(n); let s = ''; while (n--) s += String.fromCharCode(b[pos++]); return s; };
    const rv = () => { let n = 0, x, c = 0; do { x = u8(); n = n * 128 + (x & 127); if (++c > 4) throw Error('Invalid MIDI length.'); } while (x & 128); return n; };
    if (str(4) !== 'MThd') throw Error('This is not a Standard MIDI File.');
    const hl = u32(), format = u16(), count = u16(), ppq = u16();
    if (hl < 6 || format > 2 || (ppq & 32768) || !ppq) throw Error('Use a MIDI file with beat-based timing.');
    pos += hl - 6;
    let bpm = null, events = 0;
    const tracks = [];
    for (let tr = 0; tr < count && pos < b.length; tr++) {
      const id = str(4), size = u32();
      if (id !== 'MTrk') { pos += size; continue; }
      need(size);
      const end = pos + size;
      let tick = 0, status = 0, name = '';
      const on = new Map(), notes = [], cc = [];
      while (pos < end) {
        if (++events > 300000) throw Error('This MIDI file has too many events.');
        tick += rv();
        let st = u8();
        if (st < 128) { if (!status) throw Error('Invalid running status.'); pos--; st = status; } else if (st < 240) status = st;
        if (st === 255) {
          const type = u8(), len = rv(); need(len);
          if (type === 3 && !name) name = str(len);
          else { if (type === 81 && len === 3 && bpm == null) bpm = 60000000 / (b[pos] * 65536 + b[pos + 1] * 256 + b[pos + 2]); pos += len; }
        } else if (st === 240 || st === 247) { const len = rv(); need(len); pos += len; }
        else {
          const type = st & 240, ch = st & 15, d1 = u8(), d2 = type === 192 || type === 208 ? 0 : u8();
          const key = ch * 128 + d1;
          if (type === 144 && d2 > 0) { if (!on.has(key)) on.set(key, []); on.get(key).push({t: tick / ppq, n: d1, v: d2, ch}); }
          else if (type === 128 || type === 144) { const n = on.get(key)?.shift(); if (n && tick / ppq > n.t) notes.push({...n, d: tick / ppq - n.t}); }
          else if (type === 176) cc.push({t: tick / ppq, cc: d1, v: d2, ch});
        }
      }
      pos = end;
      for (const q of on.values()) for (const n of q) if (tick / ppq > n.t) notes.push({...n, d: tick / ppq - n.t});
      notes.sort((a, b) => a.t - b.t || a.n - b.n);
      tracks.push({name: name || 'Track ' + (tr + 1), beats: tick / ppq, notes, cc, drums: notes.length > 0 && notes.every(n => n.ch === 9)});
    }
    return {ppq, bpm, format, tracks};
  }

  // Polyphony of a track: the average number of notes sounding at each note start. Chords score 3+, a lead ~1.
  function polyphony(notes) {
    if (!notes.length) return 0;
    let s = 0;
    for (const a of notes) s += notes.filter(b => b.t <= a.t + 0.01 && b.t + b.d > a.t + 0.01).length;
    return s / notes.length;
  }

  // ---- small helpers shared by the engine ----
  function rng(seed) {
    let a = (seed >>> 0) || 0x9E3779B9;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (...xs) => { let h = 2166136261; for (const x of xs) { h ^= Math.floor(x * 1000003) >>> 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((h >>> 0) % 1000003) / 1000003; };
  const gcd = (a, b) => { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => Math.round(a / gcd(a, b) * b);

  // ZIP (stored, no compression) for the crate export
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const le = (n, len) => be(n, len).reverse(), chunks = [], central = [];
    let off = 0;
    for (const f of files) {
      const name = Array.from(new TextEncoder().encode(f.name)), data = f.bytes, crc = crc32(data);
      const head = new Uint8Array([80, 75, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 33, 0, ...le(crc, 4), ...le(data.length, 4), ...le(data.length, 4), ...le(name.length, 2), 0, 0, ...name]);
      chunks.push(head, data);
      central.push(80, 75, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 33, 0, ...le(crc, 4), ...le(data.length, 4), ...le(data.length, 4), ...le(name.length, 2), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...le(off, 4), ...name);
      off += head.length + data.length;
    }
    chunks.push(new Uint8Array(central), new Uint8Array([80, 75, 5, 6, 0, 0, 0, 0, ...le(files.length, 2), ...le(files.length, 2), ...le(central.length, 4), ...le(off, 4), 0, 0]));
    const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let p = 0;
    for (const c of chunks) { out.set(c, p); p += c.length; }
    return out;
  }

  return {SHARP, FLAT, SCALES, Q, mod, pcOf, pcName, noteName, asciiName, hz, camelot, keyLabel, parseChord, parseProgression,
    chordName, romanFor, voice, movement, shiftTo, detectKey, detectChord, chordsFromNotes, writeMidi, readMidi, polyphony,
    rng, hash, gcd, lcm, zip, crc32};
})();
