// Orbit engine: a combo (harmony + note pool + order + step pattern + sound + evolution) rendered to note events,
// plus everything measured from them: the genre fingerprint, the cycle counter, fixes, the generator and the
// Ableton Arpeggiator translation. Pure functions over plain objects; depends on OT (theory) and OB (bank).
const OE = (() => {
  const {mod, hash, lcm, rng} = OT;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const clamp01 = x => clamp(x, 0, 1);
  const EPS = 1e-6;
  // Swing as a time warp of each half beat: the off-16th lands at swing% of the 8th, the rest stretches to fit.
  function swingTime(t, swing) {
    const sw = (swing - 50) / 100;
    if (sw <= 0) return t;
    const h = Math.floor(t / 0.5 + EPS) * 0.5, pos = t - h, mid = 0.25 + sw * 0.5;
    return h + (pos <= 0.25 ? pos * mid / 0.25 : mid + (pos - 0.25) * (0.5 - mid) / 0.25);
  }

  const RATES = {
    '4': {beats: 1, label: '1/4', live: '1/4'},
    '8d': {beats: 0.75, label: '1/8 dotted', live: null},
    '8': {beats: 0.5, label: '1/8', live: '1/8'},
    '8t': {beats: 1 / 3, label: '1/8 triplet', live: '1/12'},
    '16': {beats: 0.25, label: '1/16', live: '1/16'},
    '16t': {beats: 1 / 6, label: '1/16 triplet', live: '1/24'},
    '32': {beats: 0.125, label: '1/32', live: '1/32'},
  };

  const POOLS = {
    chord: {name: 'Chord tones', desc: 'The notes of the current chord, voiced near the register.'},
    triad: {name: 'Triad only', desc: 'Root, third and fifth: 7ths and extensions left out.'},
    chord9: {name: 'Chord + 9th', desc: 'The chord with its 9th added. Instantly more "melodic" and deep.'},
    scale: {name: 'Scale from root', desc: 'Seven scale notes upward from the chord root. Riffs move with the chords.'},
    penta: {name: 'Pentatonic', desc: 'Five pentatonic notes from the chord root. Nothing can clash.'},
    root5: {name: 'Root + 5th', desc: 'Root, fifth, octave. Techno and acid power.'},
    octave: {name: 'Octaves', desc: 'Root and its octave. The disco bounce.'},
    root: {name: 'Root only', desc: 'One note per chord. Rhythm and sound do all the work.'},
    quartal: {name: 'Stacked 4ths', desc: 'Scale notes a fourth apart from the root: open, modern, a little cinematic. Fits over anything in the key.'},
    spread: {name: 'Open voicing', desc: 'The chord spread over two octaves (every other note up an octave): wide leaps from a plain chord.'},
    cluster: {name: 'Cluster', desc: 'Root, 2nd, 3rd and 5th of the scale: notes a step apart that rub, then resolve.'},
  };

  const ORDERS = {
    up: {name: 'Up', live: 'Up'},
    down: {name: 'Down', live: 'Down'},
    updown: {name: 'Up-down', live: 'UpDown'},
    downup: {name: 'Down-up', live: 'DownUp'},
    updown2: {name: 'Up & down (repeat ends)', live: 'Up & Down'},
    converge: {name: 'Converge', live: 'Converge'},
    diverge: {name: 'Diverge', live: 'Diverge'},
    pinky: {name: 'Pinky (top note pedal)', live: 'Pinky Up'},
    thumb: {name: 'Thumb (bottom note pedal)', live: 'Thumb Up'},
    shuffle: {name: 'Shuffle once', live: 'Random Once'},
    random: {name: 'Random each cycle', live: 'Random'},
    seq: {name: 'Written sequence', live: 'Play Order'},
    turing: {name: 'Turing (drifting loop)', live: 'Random'},
  };

  // Microtiming per 16th of the beat, in milliseconds: where each of the four 16ths lands against the grid
  const FEELS = {
    straight: {name: 'On the grid', ms: [0, 0, 0, 0]},
    drunk: {name: 'Drunk (Dilla)', ms: [0, 24, -10, 30], desc: 'The "e" and the "a" drag late and the "and" rushes: the loose, wonky hip-hop feel.'},
    afro: {name: 'Afro lean', ms: [0, 14, -6, 18], desc: 'The off-16ths lean late, as a hand percussionist plays them.'},
    push: {name: 'Ahead (pushing)', ms: [-8, -12, -8, -12], desc: 'Everything a few milliseconds early: urgent, driving.'},
    laid: {name: 'Laid back', ms: [10, 16, 10, 16], desc: 'Everything behind the kick: relaxed, deep.'},
  };
  const ECHO_SHIFTS = {
    '0': 'Same note', '12': 'Up an octave each repeat', '-12': 'Down an octave each repeat', '7': 'Up a fifth each repeat',
    '5': 'Up a fourth each repeat', s1: 'Up one scale step each repeat', 's-1': 'Down one scale step each repeat', s2: 'Up a scale third each repeat',
  };

  // ---- step patterns ----
  // . rest  x note  X accent  o/O octave up  v/V octave down  c/C chord hit  p/P pedal  - tie
  // r ratchet ×2  R ratchet ×3  s/S slide (S accented)
  function parseSteps(str) {
    const out = [];
    for (const ch of String(str).replace(/[\s|]/g, '')) {
      const s = {type: 'note', acc: 0, oct: 0, rat: 1, slide: false, prob: 1};
      switch (ch) {
        case '.': s.type = 'rest'; break;
        case 'x': break;
        case 'X': s.acc = 1; break;
        case 'o': s.oct = 1; break;
        case 'O': s.oct = 1; s.acc = 1; break;
        case 'v': s.oct = -1; break;
        case 'V': s.oct = -1; s.acc = 1; break;
        case 'c': s.type = 'chord'; break;
        case 'C': s.type = 'chord'; s.acc = 1; break;
        case 'p': s.type = 'pedal'; break;
        case 'P': s.type = 'pedal'; s.acc = 1; break;
        case '-': s.type = 'tie'; break;
        case 'r': s.rat = 2; break;
        case 'R': s.rat = 3; break;
        case 's': s.slide = true; break;
        case 'S': s.slide = true; s.acc = 1; break;
        default: throw Error(`Unknown step "${ch}" in "${str}"`);
      }
      out.push(s);
    }
    if (!out.length) throw Error('Empty step pattern');
    return out;
  }
  function stepChar(s) {
    if (s.type === 'rest') return '.';
    if (s.type === 'tie') return '-';
    if (s.type === 'chord') return s.acc ? 'C' : 'c';
    if (s.type === 'pedal') return s.acc ? 'P' : 'p';
    if (s.slide) return s.acc ? 'S' : 's';
    if (s.rat === 3) return 'R';
    if (s.rat === 2) return 'r';
    if (s.oct > 0) return s.acc ? 'O' : 'o';
    if (s.oct < 0) return s.acc ? 'V' : 'v';
    return s.acc ? 'X' : 'x';
  }
  const stepsString = steps => steps.map(stepChar).join('');
  const sounding = s => s.type === 'note' || s.type === 'chord' || s.type === 'pedal';

  function euclid(k, n, rot = 0) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.floor((i * k) / n) !== Math.floor(((i - 1) * k) / n) || (i === 0 && k > 0));
    // Bjorklund-equivalent spacing via the floor trick; rotate so the pattern can start off the beat
    const r = mod(rot, n);
    return out.slice(n - r).concat(out.slice(0, n - r)).map(Boolean);
  }

  // ---- defaults and normalisation ----
  const DEFAULT = {
    v: 1, name: 'Untitled arp', genre: 'tech-house', from: null,
    bpm: 126, key: 9, scale: 'minor',
    prog: 'i', per: 1, imported: null, voicing: 'led',
    pool: 'chord', follow: true, count: 0, octaves: 1, reg: 64,
    order: 'up', seq: [0, 1, 2, 3], pedal: 'low',
    advance: 'note', reset: 'bar',
    rate: '16', steps: 'x.x.x.x.x.x.x.x.', gate: 0.5, swing: 50, human: 0, vel: 92, accent: 26,
    sound: 'tech-pluck', cut: 0.55, res: 0.3, dec: 0.5, drive: 0.15, width: 0.45,
    delay: 0.18, delayTime: '8d', fb: 0.38, reverb: 0.18, space: 0.5, duck: 0.45, hp: 160,
    evo: 'none', depth: 1, fill: 'none', fillEvery: 4, mutate: 0,
    lock: 0.75, tlen: 8, echo: 0, echoTime: '8d', echoFb: 0.55, echoShift: '0', strum: 0, strumDir: 'up', feel: 'straight',
    bars: 8, seed: 1,
    ctx: {drums: true, bass: true, chords: false}, groove: 'house', bassPat: 'offbeat', mix: {arp: 0.8, drums: 0.7, bass: 0.7, chords: 0.45},
  };
  function normalize(input) {
    const st = Object.assign({}, DEFAULT, JSON.parse(JSON.stringify(input || {})));
    st.ctx = Object.assign({}, DEFAULT.ctx, st.ctx || {});
    st.mix = Object.assign({}, DEFAULT.mix, st.mix || {});
    if (typeof st.steps === 'string') st.steps = parseSteps(st.steps);
    st.steps = st.steps.slice(0, 64).map(s => ({type: s.type || 'note', acc: s.acc ? 1 : 0, oct: clamp(s.oct | 0, -2, 2), rat: clamp(s.rat | 0 || 1, 1, 4), slide: !!s.slide, prob: s.prob == null ? 1 : clamp01(+s.prob)}));
    if (!st.steps.length) st.steps = parseSteps('x');
    if (!RATES[st.rate]) st.rate = '16';
    if (!POOLS[st.pool]) st.pool = 'chord';
    if (!ORDERS[st.order]) st.order = 'up';
    st.seq = (Array.isArray(st.seq) ? st.seq : String(st.seq).split(/[\s,]+/)).map(Number).filter(Number.isFinite).map(Math.round).slice(0, 64);
    if (!st.seq.length) st.seq = [0];
    st.bpm = clamp(Math.round(+st.bpm || 124), 60, 200);
    st.key = mod(Math.round(+st.key || 0), 12);
    if (!OT.SCALES[st.scale]) st.scale = 'minor';
    st.octaves = clamp(Math.round(st.octaves), 1, 4);
    st.count = clamp(Math.round(st.count), 0, 8);
    st.reg = clamp(Math.round(st.reg), 36, 96);
    st.per = [0.5, 1, 2, 4].includes(+st.per) ? +st.per : 1;
    st.bars = [1, 2, 4, 8, 16, 32, 64].includes(+st.bars) ? +st.bars : 8;
    st.gate = clamp(+st.gate, 0.05, 1.5);
    st.swing = clamp(+st.swing, 50, 75);
    for (const k of ['cut', 'res', 'dec', 'drive', 'width', 'delay', 'fb', 'reverb', 'space', 'duck', 'human', 'depth']) st[k] = clamp01(+st[k]);
    st.fillEvery = [2, 4, 8, 16].includes(+st.fillEvery) ? +st.fillEvery : 4;
    st.mutate = [0, 2, 4, 8].includes(+st.mutate) ? +st.mutate : 0;
    st.lock = clamp01(+st.lock); st.tlen = clamp(Math.round(+st.tlen || 8), 2, 16);
    st.echo = clamp(Math.round(+st.echo || 0), 0, 8); st.echoFb = clamp(+st.echoFb, 0.1, 0.95);
    if (!(st.echoTime in DELAY_TIMES)) st.echoTime = '8d';
    st.echoShift = String(st.echoShift); if (!(st.echoShift in ECHO_SHIFTS)) st.echoShift = '0';
    st.strum = clamp01(+st.strum || 0); if (!['up', 'down', 'alt'].includes(st.strumDir)) st.strumDir = 'up';
    if (!FEELS[st.feel]) st.feel = 'straight';
    Object.defineProperty(st, '_n', {value: true, enumerable: false});
    return st;
  }

  // ---- harmony ----
  // The progression as timed, voiced chords over one cycle. Imported chords keep their voicing, moved to the register.
  function harmony(st) {
    const cyc = [];
    if (st.imported && st.imported.chords && st.imported.chords.length) {
      const shift = mod(st.key - (st.imported.key ?? st.key) + 6, 12) - 6;
      for (const c of st.imported.chords) {
        const notes = OT.shiftTo(c.notes.map(n => n + shift), st.reg);
        const root = mod(c.root + shift, 12);
        cyc.push({t: c.t, d: c.d, root, q: c.q, iv: c.iv, notes, name: OT.chordName(root, c.q, st.key, st.scale), roman: OT.romanFor(root, c.q, st.key, st.scale), imported: true});
      }
      return {chords: cyc, beats: st.imported.beats, errors: []};
    }
    const {chords, errors} = OT.parseProgression(st.prog, st.key, st.scale);
    const list = chords.length ? chords : OT.parseProgression('i', st.key, st.scale).chords;
    let t = 0, prev = null;
    for (const c of list) {
      const d = c.len * st.per * 4;
      const notes = st.voicing === 'root' ? rootPosition(c.root, c.iv, st.reg) : OT.voice(c.root, c.iv, st.reg, prev);
      prev = notes;
      cyc.push({t, d, root: c.root, q: c.q, iv: c.iv, notes, name: c.name, roman: c.roman || OT.romanFor(c.root, c.q, st.key, st.scale)});
      t += d;
    }
    // close the loop: revoice the first chord against the last so the wrap-around leads smoothly too
    if (cyc.length > 2 && st.voicing !== 'root') {
      const again = OT.voice(cyc[0].root, cyc[0].iv, st.reg, cyc[cyc.length - 1].notes);
      if (OT.movement(again, cyc[1].notes) <= OT.movement(cyc[0].notes, cyc[1].notes) + 1) cyc[0].notes = again;
    }
    return {chords: cyc, beats: t, errors};
  }
  function rootPosition(root, iv, center) {
    const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
    const base = center - mean - mod(center - mean - root, 12);
    const r = center - mean - base > 6 ? base + 12 : base;
    return iv.map(i => r + i);
  }
  function tonicChord(st) {
    const sc = OT.SCALES[st.scale];
    const third = sc.st[2], fifth = sc.st[4];
    const q = third === 3 ? (fifth === 6 ? 'dim' : 'min') : 'maj';
    return {root: st.key, q, iv: OT.Q[q].iv, notes: OT.voice(st.key, OT.Q[q].iv, st.reg, null)};
  }
  function chordIndexAt(h, beat) {
    const t = mod(beat, h.beats);
    for (let i = h.chords.length - 1; i >= 0; i--) if (t >= h.chords[i].t - EPS) return i;
    return 0;
  }

  // ---- note pools ----
  function rootNear(pc, target) { let r = target - mod(target - pc, 12); if (target - r > 6) r += 12; return r; }
  function pool(st, chord) {
    const c = st.follow ? chord : tonicChord(st);
    const v = c.notes.slice().sort((a, b) => a - b);
    const sc = OT.SCALES[st.scale];
    const r = rootNear(c.root, Math.min(v[0], st.reg - 3));
    let base;
    switch (st.pool) {
      case 'triad': {
        const pcs = new Set(c.iv.slice(0, 3).map(i => mod(c.root + i, 12)));
        base = v.filter(p => pcs.has(mod(p, 12)));
        if (base.length < 2) base = v;
        break;
      }
      case 'chord9': {
        base = v.slice();
        const nine = mod(c.root + 2, 12);
        if (!base.some(p => mod(p, 12) === nine)) { let p = v[0] + mod(nine - v[0], 12); base.push(p); }
        break;
      }
      case 'scale': {
        base = [];
        for (let i = 0; i < 12; i++) if (sc.st.includes(mod(r + i - st.key, 12))) base.push(r + i);
        if (!base.length || mod(base[0], 12) !== mod(c.root, 12)) base.unshift(r);
        base = [...new Set(base)].slice(0, 7);
        break;
      }
      case 'penta': {
        const pent = sc.pent || (sc.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]);
        base = [];
        for (let i = 0; i < 12; i++) if (pent.includes(mod(r + i - st.key, 12))) base.push(r + i);
        if (!base.includes(r)) base.unshift(r);
        base = [...new Set(base)].sort((a, b) => a - b).slice(0, 5);
        break;
      }
      case 'quartal': case 'cluster': {
        const lad = ladder(st, r - 24, r + 48), i0 = Math.max(0, lad.findIndex(p => p >= r));
        base = (st.pool === 'quartal' ? [0, 3, 6, 9] : [0, 1, 2, 4]).map(k => lad[i0 + k]);
        base[0] = r;
        break;
      }
      case 'spread': base = v.map((p, i) => i % 2 ? p + 12 : p); break;
      case 'root5': base = [r, r + 7, r + 12]; break;
      case 'octave': base = [r, r + 12]; break;
      case 'root': base = [r]; break;
      default: base = v;
    }
    base = [...new Set(base)].sort((a, b) => a - b);
    return {base, chordNotes: v, root: r};
  }
  // every pitch of the key's scale between lo and hi
  function ladder(st, lo, hi) { const sc = OT.SCALES[st.scale].st, out = []; for (let p = lo; p <= hi; p++) if (sc.includes(mod(p - st.key, 12))) out.push(p); return out; }
  // a pitch moved by scale steps (snapped to the scale first)
  function scaleStep(st, n, k) {
    const lad = ladder(st, n - 40, n + 40);
    let i = 0, best = Infinity;
    lad.forEach((p, j) => { if (Math.abs(p - n) < best) { best = Math.abs(p - n); i = j; } });
    return lad[clamp(i + k, 0, lad.length - 1)];
  }
  function extend(base, count, octaves) {
    let b = count > 0 ? base.slice(0, count) : base.slice();
    const out = [];
    for (let o = 0; o < octaves; o++) for (const p of b) out.push(p + 12 * o);
    return [...new Set(out)].sort((a, b) => a - b);
  }
  function orderSeq(st, M, cycleIndex = 0) {
    const idx = [...Array(M).keys()];
    switch (st.order) {
      case 'up': return idx;
      case 'down': return idx.reverse();
      case 'updown': return M > 2 ? idx.concat(idx.slice(1, -1).reverse()) : idx;
      case 'downup': { const d = idx.slice().reverse(); return M > 2 ? d.concat(d.slice(1, -1).reverse()) : d; }
      case 'updown2': return idx.concat(idx.slice().reverse());
      case 'converge': { const o = []; for (let i = 0; i < Math.ceil(M / 2); i++) { o.push(i); if (M - 1 - i !== i) o.push(M - 1 - i); } return o; }
      case 'diverge': { const o = []; for (let i = 0; i < Math.ceil(M / 2); i++) { o.push(i); if (M - 1 - i !== i) o.push(M - 1 - i); } return o.reverse(); }
      case 'pinky': { if (M < 2) return idx; const o = []; for (let i = 0; i < M - 1; i++) o.push(i, M - 1); return o; }
      case 'thumb': { if (M < 2) return idx; const o = []; for (let i = 1; i < M; i++) o.push(0, i); return o; }
      case 'shuffle': case 'random': {
        const r = rng(st.seed * 7919 + (st.order === 'random' ? cycleIndex * 104729 : 0) + 17);
        const o = idx.slice();
        for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
        return o;
      }
      case 'seq': return st.seq.slice();
      case 'turing': return turing(st, M, cycleIndex);
    }
    return idx;
  }
  // The Turing Machine (after the Music Thing Modular module): a loop of tlen pool indices. Each time the loop comes
  // round, every note has a (1 − lock) chance of being replaced. Lock 100%: a fixed loop. Lock 0%: new notes every time.
  const TURING = new Map();
  function turing(st, M, c) {
    const key = [st.seed, st.lock, st.tlen, M].join('|');
    let list = TURING.get(key);
    if (!list) { if (TURING.size > 64) TURING.clear(); list = [Array.from({length: st.tlen}, (_, i) => Math.floor(hash(st.seed, i, 101) * M))]; TURING.set(key, list); }
    while (list.length <= c) {
      const prev = list[list.length - 1], k = list.length;
      list.push(prev.map((x, i) => hash(st.seed, k, i, 103) < 1 - st.lock ? Math.floor(hash(st.seed, k, i, 107) * M * 1.25) : x));
    }
    return list[c].slice();
  }
  const pitchAt = (p, i) => p[mod(i, p.length)] + 12 * Math.floor(i / p.length);

  // ---- evolution ----
  const EVOS = {
    none: {name: 'Still', desc: 'No movement: the loop as written.'},
    'slow-open': {name: 'Slow open', desc: 'The filter opens across the phrase: dark at bar 1, bright at the end.', cut: [[0, -0.42], [1, 0.32]]},
    breathe: {name: 'Breathe (4 bars)', desc: 'Cutoff swells and falls every four bars, like a slow LFO you can export.', cut: {period: 4, pts: [[0, -0.28], [0.5, 0.2], [1, -0.28]]}},
    build: {name: 'Build to the drop', desc: 'Filter, gate and density all climb; the delay grows into the last bar.', cut: [[0, -0.5], [0.92, 0.42], [1, 0.45]], gate: [[0, 0.65], [1, 1.35]], dens: [[0, 0.55], [0.6, 1]], send: [[0, -0.1], [1, 0.3]]},
    afterlife: {name: '64-bar journey', desc: 'Melodic-techno long form: opens, steps up an octave halfway, decay grows from pluck to lead.', cut: [[0, -0.5], [0.45, 0.05], [0.5, -0.18], [0.95, 0.42], [1, 0.42]], dec: [[0, -0.32], [1, 0.32]], oct: [[0, 0], [0.5, 1]], send: [[0, -0.12], [1, 0.22]], bars: 64},
    'add-notes': {name: 'Add a note every quarter', desc: 'Starts with two notes of the pool and adds one every quarter of the phrase.', cnt: [[0, 2], [0.25, 3], [0.5, 4], [0.75, 5]], cut: [[0, -0.2], [1, 0.22]]},
    'gate-pump': {name: 'Gate pump (2 bars)', desc: 'Notes stretch and shorten every two bars: the groove breathes without a single note changing.', gate: {period: 2, pts: [[0, 0.6], [0.5, 1.6], [1, 0.6]]}},
    'pluck-to-pad': {name: 'Pluck to pad', desc: 'Decay grows from a tight pluck to a long, blooming tone.', dec: [[0, -0.42], [1, 0.42]], send: [[0, -0.1], [1, 0.18]]},
    'dark-ride': {name: 'Dark ride (16 bars)', desc: 'A slow, resonant cutoff wave over 16 bars, for hypnotic techno.', cut: {period: 16, pts: [[0, -0.3], [0.5, 0.2], [1, -0.3]]}, res: {period: 16, pts: [[0, 0], [0.5, 0.25], [1, 0]]}},
    'into-drop': {name: 'Riser in the last quarter', desc: 'Still for three quarters, then the filter, gate and send all rise into the bar line.', cut: [[0, 0], [0.75, 0], [1, 0.45]], gate: [[0, 1], [0.75, 1], [1, 1.4]], send: [[0, 0], [0.75, 0], [1, 0.35]]},
    thin: {name: 'Thin to full', desc: 'Density grows from a third of the notes to all of them; accents always play.', dens: [[0, 0.33], [0.7, 1]]},
  };
  const STEP_LANES = new Set(['oct', 'cnt']);
  function laneAt(lane, p, bar, name) {
    if (!lane) return null;
    let pts = lane, q = p;
    if (lane.period) { pts = lane.pts; q = mod(bar, lane.period) / lane.period; }
    if (q <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (q < pts[i][0]) {
        if (STEP_LANES.has(name)) return pts[i - 1][1];
        const [a, va] = pts[i - 1], [b, vb] = pts[i];
        return va + (vb - va) * (q - a) / (b - a);
      }
    }
    return pts[pts.length - 1][1];
  }
  function evoAt(st, beat, totalBeats) {
    const e = EVOS[st.evo] || EVOS.none, p = clamp01(beat / totalBeats), bar = beat / 4, d = st.depth;
    const v = n => laneAt(e[n], p, bar, n);
    const g = v('gate'), den = v('dens'), oct = v('oct'), cnt = v('cnt');
    return {
      cut: clamp01(st.cut + (v('cut') || 0) * d), res: clamp01(st.res + (v('res') || 0) * d), dec: clamp01(st.dec + (v('dec') || 0) * d),
      send: clamp(((v('send') || 0) * d), -0.5, 0.5),
      gate: g == null ? 1 : 1 + (g - 1) * d, dens: den == null ? 1 : 1 - (1 - den) * d, oct: oct == null ? 0 : Math.round(oct * d), cnt: cnt == null ? 0 : Math.round(cnt),
    };
  }

  const FILLS = {
    none: {name: 'None'},
    drop: {name: 'Drop the last beat', desc: 'The last beat is silent: space before the next phrase.'},
    climb: {name: 'Octave climb', desc: 'The second half of the bar jumps up an octave.'},
    ratchet: {name: 'Ratchet', desc: 'The last beat doubles into 32nds.'},
    roll: {name: 'Roll in', desc: 'The last two beats fill every step, rising in velocity.'},
    answer: {name: 'Answer (reverse)', desc: 'The bar plays the note order backwards: a call and its answer.'},
    stutter: {name: 'Stutter', desc: 'Beat one repeats across the bar.'},
    bounce: {name: 'Bouncing ball', desc: 'The last beat speeds up like a dropped ball: 1, 2, 3 then 4 notes per step, falling in level.'},
  };

  // ---- the render ----
  // Every step of the phrase: which pattern step, which note of the cycle, which chord, with swing, fills,
  // mutation and evolution. Times in beats. `gt` is the unswung grid time the measurements use.
  function render(input, opts = {}) {
    const st = input._n ? input : normalize(input);
    const bars = opts.bars || st.bars, beats = bars * 4;
    const useEvo = opts.evo !== false, useFill = opts.fills !== false && st.fill !== 'none' && bars >= st.fillEvery, useMut = opts.mutate !== false && st.mutate > 0;
    const h = opts.harmony || harmony(st);
    const stepLen = RATES[st.rate].beats, L = st.steps.length;
    const total = Math.floor(beats / stepLen + EPS);
    const pools = h.chords.map(c => pool(st, c));
    const events = [];
    let counter = 0, lastChord = -1, lastBar = -1, last = null, cycleIdx = 0;
    const r = rng(st.seed * 31 + 7);
    const spBeat = 1 / stepLen;
    for (let g = 0; g < total; g++) {
      const t = g * stepLen, bar = Math.floor(t / 4 + EPS), beatInBar = t - bar * 4;
      const ci = chordIndexAt(h, t);
      const ev = useEvo ? evoAt(st, t, beats) : {cut: st.cut, res: st.res, dec: st.dec, send: 0, gate: 1, dens: 1, oct: 0, cnt: 0};
      // resets: at the first step of a bar (or of every 2nd/4th bar), or when the chord changes
      const newBar = bar !== lastBar;
      lastBar = bar;
      if (newBar && (st.reset === 'bar' || (st.reset === '2bar' && bar % 2 === 0) || (st.reset === '4bar' && bar % 4 === 0))) counter = 0;
      if (st.reset === 'chord' && ci !== lastChord) counter = 0;
      lastChord = ci;
      // which pattern step plays here
      const fillBar = useFill && (bar % st.fillEvery === st.fillEvery - 1);
      let si = g % L, s = st.steps[si];
      if (fillBar && st.fill === 'stutter') { const beatStep = Math.floor(beatInBar * spBeat + EPS) % Math.max(1, Math.round(spBeat)); const g0 = Math.round(bar * 4 * spBeat) + beatStep; si = g0 % L; s = st.steps[si]; }
      s = Object.assign({}, s);
      let roll = 0, reverse = false, bounce = 0;
      if (fillBar) {
        if (st.fill === 'drop' && beatInBar >= 3 - EPS) s.type = 'rest';
        if (st.fill === 'climb' && beatInBar >= 2 - EPS && s.type === 'note') s.oct += 1;
        if (st.fill === 'ratchet' && beatInBar >= 3 - EPS) { if (s.type === 'rest' || s.type === 'tie') s.type = 'note'; if (s.type === 'note') s.rat = 2; }
        if (st.fill === 'roll' && beatInBar >= 2 - EPS) { if (s.type !== 'chord') { s.type = 'note'; s.oct = 0; s.rat = 1; } roll = (beatInBar - 2) / 2; }
        if (st.fill === 'answer') reverse = true;
        if (st.fill === 'bounce' && beatInBar >= 3 - EPS) { if (s.type === 'rest' || s.type === 'tie') s.type = 'note'; if (s.type === 'note') { s.rat = clamp(1 + Math.floor((beatInBar - 3) * 4 + EPS), 1, 4); bounce = s.rat; } }
      }
      const P = pools[ci];
      const cnt = ev.cnt > 0 ? ev.cnt : st.count;
      const pl = extend(P.base, cnt, clamp(st.octaves + ev.oct, 1, 5));
      let seq = orderSeq(st, pl.length, cycleIdx);
      if (useMut) {
        const block = Math.floor(bar / st.mutate);
        if (block % 2 === 1 && seq.length > 1) {
          seq = seq.slice();
          const k = Math.floor(hash(st.seed, block, 3) * seq.length), dir = hash(st.seed, block, 5) < 0.5 ? -1 : 1;
          seq[k] = clamp(seq[k] + dir, -pl.length, pl.length * 2);
        }
      }
      if (reverse) seq = seq.slice().reverse();
      const advance = () => { counter++; if (counter % seq.length === 0) cycleIdx++; };
      if (s.type === 'rest') { if (st.advance === 'step') advance(); last = null; continue; }
      if (s.type === 'tie') {
        if (last) for (const e of last) e.d = Math.max(e.d, (t + stepLen) - e.gt - stepLen * 0.08);
        if (st.advance === 'step') advance();
        continue;
      }
      // probability and evolving density: accents and chord hits are kept longest
      const keep = (s.prob >= 1 || hash(st.seed, g, 11) < s.prob) && (ev.dens >= 1 || s.acc || hash(st.seed, g, 13) < ev.dens + (s.type === 'chord' ? 0.25 : 0));
      if (!keep) { if (st.advance === 'step' || s.type === 'note') advance(); last = null; continue; }
      let pitches, pi = -1, ix = -1;
      if (s.type === 'chord') pitches = P.chordNotes.map(p => p + 12 * s.oct);
      else if (s.type === 'pedal') { pi = st.pedal === 'high' ? pl.length - 1 : 0; pitches = [pl[pi] + 12 * s.oct]; }
      else { ix = mod(counter, seq.length); pi = mod(seq[ix], pl.length); pitches = [pitchAt(pl, seq[ix]) + 12 * s.oct]; }
      const accVel = s.acc ? st.accent : 0;
      let vel = st.vel + accVel - (s.type === 'chord' ? 4 : 0);
      if (roll) vel = st.vel - 30 + roll * (st.accent + 34);
      if (bounce) vel -= (bounce - 1) * 9;
      const gl = clamp(st.gate * ev.gate, 0.04, 1.6) * stepLen;
      const n = s.rat || 1, sub = stepLen / n;
      const made = [];
      for (let k = 0; k < n; k++) {
        const gt = t + k * sub;
        for (const p of pitches) {
          const hv = st.human ? (hash(st.seed, g, k, p, 17) - 0.5) * 2 * 14 * st.human : 0;
          const e = {gt, t: gt, d: n > 1 ? Math.min(gl, sub * 0.85) : gl, n: clamp(p, 0, 127), v: clamp(Math.round(vel - (k ? 10 : 0) + hv), 1, 127), acc: !!s.acc, slide: !!s.slide && k === 0, kind: s.type, step: si, g, bar, ci,
            mod: {cut: ev.cut + (s.acc ? 0.12 : 0), res: ev.res, dec: ev.dec, send: ev.send}, pi, ix, sl: seq.length, pl: pl.length, oct: s.oct, rat: n};
          events.push(e); made.push(e);
        }
      }
      last = made.filter(e => e.gt === t);
      if (s.type === 'note' || st.advance === 'step') advance();
    }
    // swing on the off-16ths (anything in between moves proportionally), then humanised timing
    const triplet = st.rate === '8t' || st.rate === '16t';
    for (const e of events) {
      if (!triplet) e.t = swingTime(e.gt, st.swing);
      e.t += feelShift(st, e.gt);
      if (st.human) e.t += (hash(st.seed, e.g, e.n, 23) - 0.5) * 2 * (0.012 * st.bpm / 60) * st.human;
      e.t = Math.max(0, e.t);
    }
    // strum: a chord hit's notes spread from the lowest up (or the highest down, or alternating), up to 80 ms
    if (st.strum > 0) {
      const hits = new Map();
      for (const e of events) if (e.kind === 'chord') { const k = e.g + ':' + e.gt.toFixed(4); if (!hits.has(k)) hits.set(k, []); hits.get(k).push(e); }
      let h = 0;
      for (const list of hits.values()) {
        list.sort((a, b) => a.n - b.n);
        const down = st.strumDir === 'down' || (st.strumDir === 'alt' && h++ % 2 === 1), span = st.strum * 0.08 * st.bpm / 60;
        list.forEach((e, i) => { const f = list.length > 1 ? (down ? list.length - 1 - i : i) / (list.length - 1) : 0; e.t += f * span; e.d = Math.max(0.03, e.d - f * span * 0.5); });
      }
    }
    events.sort((a, b) => a.t - b.t || a.n - b.n);
    // a slide holds its note into the next one (overlapping it, as a 303 or a legato synth expects) and that note glides in
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.slide) continue;
      const nx = events.slice(i + 1).find(x => x.gt > e.gt + EPS && x.kind !== 'chord');
      if (!nx || nx.t - e.t > 1.01) continue;
      e.d = nx.t - e.t + 0.03;
      nx.glideFrom = e.n;
    }
    // echo cascade: each written note repeats as MIDI notes, quieter each time and optionally climbing or falling.
    // Repeats that run past the end wrap to the start, so the loop stays seamless.
    if (st.echo > 0) {
      const dt = DELAY_TIMES[st.echoTime], src = events.slice();
      for (const e of src) {
        let v = e.v;
        for (let k = 1; k <= st.echo; k++) {
          v *= st.echoFb;
          if (v < 6) break;
          const sh = st.echoShift;
          const n = sh[0] === 's' ? scaleStep(st, e.n, +sh.slice(1) * k) : e.n + (+sh) * k;
          if (n < 12 || n > 120) break;
          events.push(Object.assign({}, e, {t: mod(e.t + k * dt, beats), gt: mod(e.gt + k * dt, beats), d: Math.min(e.d, dt * 0.92), n, v: Math.max(1, Math.round(v)), echo: k, slide: false, glideFrom: undefined, acc: false}));
        }
      }
      events.sort((a, b) => a.t - b.t || a.n - b.n);
    }
    return {events, harmony: h, pools, beats, bars, stepLen, st};
  }

  function feelShift(st, gt) {
    const f = FEELS[st.feel];
    if (!f || st.feel === 'straight') return 0;
    const pos = mod(Math.round(mod(gt, 1) / 0.25), 4);
    return f.ms[pos] / 1000 * st.bpm / 60;
  }

  // ---- context parts: bass, drums, chords ----
  function renderBass(st, h, bars) {
    const pat = (OB.BASS[st.bassPat] || OB.BASS.offbeat).steps;
    const out = [], beats = bars * 4, step = 0.25;
    for (let g = 0; g < beats / step; g++) {
      const t = g * step, ch = pat[g % pat.length];
      if (ch === '.' || ch === '-') { if (ch === '-' && out.length) out[out.length - 1].d += step; continue; }
      const c = h.chords[chordIndexAt(h, t)];
      let r = 36 + mod(c.root - 36, 12);
      if (r > 43) r -= 12;
      const third = c.iv.includes(3) ? 3 : 4;
      const n = ch === 'o' || ch === 'O' ? r + 12 : ch === '5' ? r + 7 : ch === '3' ? r + third : ch === '7' ? r + 10 : r;
      out.push({t: swingTime(t, st.swing) + feelShift(st, t), gt: t, d: step * 0.8, n, v: ch === 'X' || ch === 'O' ? 112 : 96});
    }
    return out;
  }
  const DRUM_NOTES = {k: 36, c: 39, h: 42, o: 46, s: 70, r: 37, t: 64, b: 56};
  function renderDrums(st, bars) {
    const gr = OB.GROOVES[st.groove] || OB.GROOVES.house;
    const out = [];
    for (const [lane, pat] of Object.entries(gr.lanes)) {
      const n = pat.length, step = 4 / n;
      for (let b = 0; b < bars; b++) for (let i = 0; i < n; i++) {
        const ch = pat[i];
        if (ch === '.') continue;
        const gt = b * 4 + i * step;
        const swung = lane === 'h' || lane === 's' || lane === 'o' || lane === 'r' || lane === 't' || lane === 'b';
        out.push({t: swung ? swingTime(gt, st.swing) + feelShift(st, gt) : gt, gt, d: 0.1, n: DRUM_NOTES[lane], v: ch === 'X' ? 118 : ch === 'g' ? 60 : 92, lane});
      }
    }
    return out.sort((a, b) => a.t - b.t);
  }
  function renderChords(st, h, bars) {
    const out = [], beats = bars * 4;
    for (let t0 = 0; t0 < beats - EPS; t0 += h.beats) for (const c of h.chords) {
      const t = t0 + c.t;
      if (t >= beats - EPS) break;
      for (const n of c.notes) out.push({t, gt: t, d: Math.min(c.d, beats - t) - 0.02, n: n - 12, v: 70});
    }
    return out;
  }
  // the pool held per chord: what to feed Ableton's Arpeggiator
  function renderArpInput(st, h, bars) {
    const out = [], beats = bars * 4;
    for (let t0 = 0; t0 < beats - EPS; t0 += h.beats) for (const c of h.chords) {
      const t = t0 + c.t;
      if (t >= beats - EPS) break;
      const P = pool(st, c);
      for (const n of extend(P.base, st.count, 1)) out.push({t, gt: t, d: Math.min(c.d, beats - t) - 0.02, n, v: 100});
    }
    return out;
  }

  // ---- measurement ----
  const AXES = [
    {id: 'density', label: 'Density', short: 'Notes', unit: 'notes per bar', min: 0, max: 16, fmt: v => v.toFixed(1)},
    {id: 'sync', label: 'Syncopation', short: 'Sync', unit: 'of notes push against the beat', min: 0, max: 1, fmt: v => Math.round(v * 100) + '%'},
    {id: 'kick', label: 'Kick clash', short: 'Kick', unit: 'of notes start on a kick', min: 0, max: 1, fmt: v => Math.round(v * 100) + '%'},
    {id: 'range', label: 'Range', short: 'Range', unit: 'semitones, lowest to highest', min: 0, max: 36, fmt: v => Math.round(v) + ' st'},
    {id: 'leap', label: 'Leap', short: 'Leap', unit: 'semitones between notes, on average', min: 0, max: 12, fmt: v => v.toFixed(1) + ' st'},
    {id: 'length', label: 'Length', short: 'Length', unit: 'average note in 16ths', min: 0, max: 4, fmt: v => v.toFixed(2)},
    {id: 'swing', label: 'Swing', short: 'Swing', unit: 'on the off-16ths', min: 50, max: 68, fmt: v => Math.round(v) + '%'},
  ];
  const weight = t => { const q = x => Math.abs(t / x - Math.round(t / x)) < 1e-4; return q(4) ? 4 : q(2) ? 3 : q(1) ? 2 : q(0.5) ? 1 : 0; };
  function metrics(R) {
    const st = R.st, ev = R.events.filter(e => !e.echo), bars = R.bars;
    const byOnset = new Map();
    for (const e of ev) { const k = Math.round(e.gt * 1e4); if (!byOnset.has(k)) byOnset.set(k, []); byOnset.get(k).push(e); }
    const onsets = [...byOnset.keys()].sort((a, b) => a - b).map(k => ({t: k / 1e4, es: byOnset.get(k)}));
    const set = new Set(onsets.map(o => Math.round(o.t * 1e4)));
    const N = onsets.length || 1;
    let kick = 0, sync = 0, leap = 0, leaps = 0, lenSum = 0, offs = 0, low = 0, chords = 0;
    let prev = null;
    for (const o of onsets) {
      const w = weight(o.t);
      if (w >= 2) kick++;
      // syncopated: the next stronger metrical position has no note of its own
      if (w < 4) {
        let next = Infinity;
        for (const g of [0.5, 1, 2, 4]) { const tt = (Math.floor(o.t / g + 1e-6) + 1) * g; if (weight(tt) > w && tt < next) next = tt; }
        if (!set.has(Math.round(mod(next, R.beats) * 1e4))) sync++;
      }
      const top = Math.max(...o.es.map(e => e.n));
      if (prev != null) { leap += Math.abs(top - prev); leaps++; }
      prev = top;
      lenSum += Math.max(...o.es.map(e => e.d));
      if (Math.abs(mod(o.t, 0.5) - 0.25) < 1e-4) offs++;
      low += o.es.filter(e => e.n < 52).length / o.es.length;
      if (o.es.some(e => e.kind === 'chord')) chords++;
    }
    const ps = ev.map(e => e.n);
    const swingFelt = offs > 0 && RATES[st.rate].beats <= 0.25 + EPS && st.rate !== '16t';
    return {
      density: onsets.length / bars,
      sync: onsets.length ? sync / N : 0,
      kick: onsets.length ? kick / N : 0,
      range: ps.length ? Math.max(...ps) - Math.min(...ps) : 0,
      leap: leaps ? leap / leaps : 0,
      length: onsets.length ? lenSum / N / 0.25 : 0,
      swing: st.swing, swingFelt,
      low: onsets.length ? low / N : 0,
      lowest: ps.length ? Math.min(...ps) : null, highest: ps.length ? Math.max(...ps) : null,
      pitches: new Set(ps).size, onsets: onsets.length, chordShare: onsets.length ? chords / N : 0,
    };
  }
  function fit(m, target) {
    if (!target) return {score: null, axes: []};
    const axes = AXES.map(a => {
      const tr = target[a.id];
      if (!tr) return {id: a.id, v: m[a.id], ok: true, s: 1};
      if (a.id === 'swing' && !m.swingFelt) return {id: a.id, v: m.swing, lo: tr[0], hi: tr[1], ok: true, s: 1, na: 'No notes on the off-16ths, so swing has nothing to move.'};
      if (a.id === 'leap' && m.chordShare > 0.5) return {id: a.id, v: m.leap, lo: tr[0], hi: tr[1], ok: true, s: 1, na: 'Mostly chord hits: the leap between stabs is not a melody.'};
      const v = m[a.id], span = a.max - a.min;
      let d = 0;
      if (v < tr[0] - 1e-6) d = (tr[0] - v) / span; else if (v > tr[1] + 1e-6) d = (v - tr[1]) / span;
      const s = Math.max(0, 1 - d / 0.22);
      return {id: a.id, v, lo: tr[0], hi: tr[1], ok: d === 0, s, dir: v < tr[0] ? 'low' : v > tr[1] ? 'high' : null};
    });
    return {score: Math.round(100 * axes.reduce((s, a) => s + a.s, 0) / axes.length), axes};
  }

  // ---- the cycle counter ----
  // On one held chord, with nothing evolving: when does the pattern line up with the bar line again?
  function cycle(input) {
    const st = normalize(Object.assign({}, input, {evo: 'none', fill: 'none', mutate: 0, prog: 'i', imported: null}));
    const stepLen = RATES[st.rate].beats, L = st.steps.length;
    const h = harmony(st), P = pool(st, h.chords[0]);
    const M = extend(P.base, st.count, st.octaves).length;
    const seqLen = orderSeq(st, M).length;
    if (st.order === 'random' || (st.order === 'turing' && st.lock < 1)) return {bars: null, random: true, turing: st.order === 'turing', L, seqLen, stepLen};
    const maxBars = 128;
    let counter = 0, lastBar = -1;
    for (let g = 0; ; g++) {
      const t = g * stepLen, bar = Math.floor(t / 4 + EPS);
      const newBar = bar !== lastBar;
      lastBar = bar;
      if (newBar && (st.reset === 'bar' || (st.reset === '2bar' && bar % 2 === 0) || (st.reset === '4bar' && bar % 4 === 0))) counter = 0;
      const onBar = Math.abs(t / 4 - Math.round(t / 4)) < EPS;
      if (onBar && g > 0 && g % L === 0 && mod(counter, seqLen) === 0) return {bars: Math.round(t / 4), L, seqLen, stepLen, steps: g};
      if (t / 4 >= maxBars) return {bars: null, L, seqLen, stepLen, over: maxBars};
      const s = st.steps[g % L];
      if (st.advance === 'step' || s.type === 'note') counter++;
    }
  }
  function cycleText(c, st, hBeats) {
    if (c.turing) return `Turing order at ${Math.round(st.lock * 100)}% lock: the ${st.tlen}-note loop drifts as it plays, so it never repeats exactly.`;
    if (c.random) return 'Random order: it never repeats exactly.';
    if (!c.bars) return `Longer than ${c.over} bars: effectively never repeats.`;
    const unit = st.advance === 'step' ? 'step' : 'note';
    const what = `${c.seqLen}-${unit} cycle against a ${c.L}-step pattern`;
    const progBars = hBeats / 4;
    const full = lcm(c.bars, Math.max(1, Math.round(progBars)));
    return `${what}: lines up with the bar again every ${c.bars} bar${c.bars > 1 ? 's' : ''}` + (progBars > 1 && full !== c.bars ? `, and with the ${progBars}-bar progression every ${full} bars.` : '.');
  }

  // ---- everything at once ----
  function analyse(input, opts = {}) {
    const st = normalize(input);
    const R = render(st, opts);
    const m = metrics(R);
    const g = OB.GENRES[st.genre];
    const f = fit(m, g && g.target);
    const c = cycle(st);
    return {st, R, m, fit: f, cycle: c, cycleText: cycleText(c, st, R.harmony.beats)};
  }

  // ---- fixes: candidate edits that move the fingerprint into the genre's range ----
  function rotate(steps, k) { const n = steps.length, r = mod(k, n); return steps.slice(n - r).concat(steps.slice(0, n - r)); }
  function suggestions(input, max = 4) {
    const base = normalize(input);
    const g = OB.GENRES[base.genre];
    if (!g) return [];
    const score = st => { const R = render(st, {evo: false, fills: false, mutate: false, bars: 4}); return fit(metrics(R), g.target); };
    const now = score(base);
    const bad = now.axes.filter(a => !a.ok).map(a => a.id);
    if (!bad.length) return [];
    const cands = [];
    const T = g.target;
    const add = (axis, text, patch) => cands.push({axis, text, patch});
    if (bad.includes('kick') || bad.includes('sync') || bad.includes('density')) {
      for (let k = 1; k < Math.min(base.steps.length, 16); k++) add(bad.includes('kick') ? 'kick' : 'sync', `Rotate the pattern ${k} step${k > 1 ? 's' : ''} later`, {steps: rotate(base.steps, k)});
    }
    if (bad.includes('density')) {
      const dir = now.axes.find(a => a.id === 'density').dir;
      if (dir === 'high') {
        const order = base.steps.map((s, i) => ({i, w: weight(i * RATES[base.rate].beats) + (s.acc ? 5 : 0)})).filter(o => sounding(base.steps[o.i])).sort((a, b) => a.w - b.w);
        for (const cut of [2, 4, 6]) { const steps = base.steps.map(s => Object.assign({}, s)); order.slice(0, cut).forEach(o => { steps[o.i].type = 'rest'; }); add('density', `Thin out ${cut} of the weakest notes`, {steps}); }
        if (base.rate === '16') add('density', 'Halve the rate to 1/8', {rate: '8', steps: base.steps.filter((_, i) => i % 2 === 0)});
      } else {
        for (const k of [5, 7, 9, 11]) {
          const e = euclid(k, base.steps.length, 1), steps = base.steps.map((s, i) => s.type === 'rest' && e[i] ? Object.assign({}, s, {type: 'note'}) : s);
          add('density', `Fill rests with a ${k}-hit Euclidean pattern`, {steps});
        }
      }
    }
    if (bad.includes('range') || bad.includes('leap')) {
      const dir = now.axes.find(a => a.id === (bad.includes('range') ? 'range' : 'leap')).dir;
      if (dir === 'high') { if (base.octaves > 1) add('range', `Narrow to ${base.octaves - 1} octave${base.octaves > 2 ? 's' : ''}`, {octaves: base.octaves - 1}); add('range', 'Use only 3 notes of the pool', {count: 3}); add('leap', 'Change the order to Up', {order: 'up'}); add('leap', 'Change the order to Converge', {order: 'converge'}); }
      else { add('range', `Widen to ${base.octaves + 1} octaves`, {octaves: Math.min(4, base.octaves + 1)}); add('leap', 'Change the order to Pinky (top-note pedal)', {order: 'pinky'}); add('leap', 'Change the order to Up-down', {order: 'updown'}); add('range', 'Add the 9th to the pool', {pool: 'chord9'}); }
    }
    if (bad.includes('length')) { const mid = (T.length[0] + T.length[1]) / 2; add('length', `Set the gate to ${Math.round(clamp(mid * 0.25 / RATES[base.rate].beats, 0.05, 1.5) * 100)}%`, {gate: +clamp(mid * 0.25 / RATES[base.rate].beats, 0.05, 1.5).toFixed(2)}); }
    if (bad.includes('swing')) { const mid = Math.round((T.swing[0] + T.swing[1]) / 2); add('swing', `Set the swing to ${mid}%`, {swing: mid}); }
    const out = [];
    for (const c of cands) {
      const s = score(normalize(Object.assign({}, base, c.patch)));
      if (s.score >= now.score + 2) out.push(Object.assign(c, {score: s.score, gain: s.score - now.score}));
    }
    out.sort((a, b) => b.score - a.score);
    const seen = new Set(), best = [];
    for (const c of out) { if (seen.has(c.axis)) continue; seen.add(c.axis); best.push(c); if (best.length >= max) break; }
    // register is not in the fingerprint but always matters: notes under ~165 Hz fight the bass
    return best;
  }

  // ---- the generator: write candidates from a genre's grammar, measure them, keep the best and most different ----
  const pickW = (r, obj) => { const e = Object.entries(obj), tot = e.reduce((s, [, w]) => s + w, 0); let x = r() * tot; for (const [k, w] of e) { if ((x -= w) <= 0) return k; } return e[e.length - 1][0]; };
  const pickA = (r, a) => a[Math.floor(r() * a.length)];
  const range = (r, [a, b]) => a + r() * (b - a);
  const irange = (r, [a, b]) => Math.floor(a + r() * (b - a + 1));
  function genSteps(r, gen, L, stepLen) {
    const kind = pickW(r, gen.shapes);
    let on = new Array(L).fill(false);
    const hits = clamp(Math.round(irange(r, gen.hits) * Math.max(L, 8) / 16), 1, L);
    if (kind === 'euclid') on = euclid(hits, L, irange(r, [0, 3]));
    else if (kind === 'offbeat') { for (let i = 0; i < L; i++) { const p = i % 4; on[i] = p === 2 ? r() < 0.9 : p === 3 ? r() < 0.45 : p === 1 ? r() < 0.3 : r() < 0.08; } }
    else if (kind === 'gallop') { for (let i = 0; i < L; i++) { const p = i % 4; on[i] = p !== 1 && !(p === 0 && r() < 0.5); } }
    else if (kind === 'full') { on = on.map(() => r() < 0.94); }
    else if (kind === 'tresillo') { const t = [0, 3, 6, 8, 11, 14]; for (const i of t) if (i < L) on[i] = true; if (r() < 0.5) on = on.map((x, i) => x || (i % 4 === 2 && r() < 0.4)); }
    else if (kind === 'twostep') { for (let i = 0; i < L; i++) on[i] = [0, 3, 6, 10, 13].includes(i % 16) ? r() < 0.85 : r() < 0.08; }
    else if (kind === 'sparse') { const n = Math.round(irange(r, [2, 5]) * Math.max(1, L / 16)); for (let j = 0; j < n; j++) on[irange(r, [0, L - 1])] = true; }
    if (!on.some(Boolean)) on[2 % L] = true;
    const steps = on.map(o => ({type: o ? 'note' : 'rest', acc: 0, oct: 0, rat: 1, slide: false, prob: 1}));
    const hitsAt = steps.map((s, i) => s.type === 'note' ? i : -1).filter(i => i >= 0);
    // Structural choices, made once per pattern the way a producer would, not sprinkled note by note:
    // accents on a cycle (polymeter) or on the strongest positions; at most a couple of octave jumps, ratchets and slides.
    const accEvery = gen.accentEvery ? pickA(r, gen.accentEvery) : 0;
    if (accEvery) hitsAt.forEach(i => { if (i % accEvery === 0) steps[i].acc = 1; });
    else if (r() < gen.accent * 2.5) {
      const motif = irange(r, [0, 3]), per = Math.round(4 / stepLen);
      hitsAt.forEach(i => { if (i % per === (motif + 2) % per || (r() < gen.accent * 0.4)) steps[i].acc = 1; });
    }
    const few = (prob, maxN, fn) => { if (r() >= prob * 4) return; const n = irange(r, [1, maxN]); for (let k = 0; k < n; k++) fn(steps[pickA(r, hitsAt)]); };
    few(gen.oct || 0, Math.max(1, Math.round(L / 12)), s => { s.oct = r() < 0.85 ? 1 : -1; });
    few(gen.ratchet || 0, 1, s => { s.rat = 2; });
    few(gen.slide || 0, Math.max(1, Math.round(L / 6)), s => { s.slide = true; });
    // a chord-hit pattern (stabs) or a pedal pattern (every other note returns to the anchor)
    if (r() < (gen.chordHit || 0) * 3) { const all = r() < 0.6; hitsAt.forEach((i, k) => { if (all || k % 3 === 0) steps[i].type = 'chord'; steps[i].oct = 0; steps[i].rat = 1; steps[i].slide = false; }); }
    else if (r() < (gen.pedal || 0) * 3) hitsAt.forEach((i, k) => { if (k % 2 === 0) { steps[i].type = 'pedal'; steps[i].oct = 0; } });
    if (gen.tie) steps.forEach((s, i) => { if (s.type === 'rest' && i > 0 && sounding(steps[i - 1]) && r() < gen.tie) s.type = 'tie'; });
    return steps;
  }
  function genSeq(r, len, spanMax) {
    const out = [0];
    for (let i = 1; i < len; i++) {
      const prev = out[i - 1], step = pickW(r, {0: 3, 1: 3, '-1': 2, 2: 2, '-2': 1, 3: 1});
      out.push(clamp(prev + (+step), -1, spanMax));
    }
    if (r() < 0.5) out[irange(r, [1, len - 1])] = 0;
    return out;
  }
  const NO_CHORDS = new Set(['acid-303', 'perc-bleep', 'sub-pulse', 'log-drum', 'vox-chop', 'rubber-stab', 'kalimba']);
  function generate(genreId, seed, keep = {}) {
    const g = OB.GENRES[genreId] || OB.GENRES['tech-house'], gen = g.gen, r = rng(seed * 2654435761 + 99);
    const rate = pickW(r, gen.rates), stepLen = RATES[rate].beats;
    const L = +pickW(r, gen.lengths);
    const pool = pickW(r, gen.pools);
    const order = pickW(r, gen.orders);
    const st = {
      genre: genreId, name: g.name + ' idea ' + (seed % 1000), from: 'generated',
      bpm: keep.bpm ?? irange(r, gen.bpm), key: keep.key ?? pickA(r, gen.keys), scale: keep.scale ?? pickW(r, gen.scales),
      prog: keep.prog ?? pickA(r, g.progs).p, per: keep.per ?? pickA(r, gen.per || [1]), imported: keep.imported ?? null,
      pool, follow: r() > (gen.static || 0), count: pool === 'scale' || pool === 'penta' ? 0 : +pickW(r, gen.count || {0: 1}), octaves: +pickW(r, gen.octaves), reg: irange(r, gen.reg),
      order, seq: genSeq(r, irange(r, gen.seqLen || [3, 6]), pool === 'scale' ? 6 : 3), pedal: r() < 0.7 ? 'low' : 'high',
      advance: pickW(r, gen.advance || {note: 1}), reset: pickW(r, gen.reset || {bar: 1}),
      rate, steps: genSteps(r, gen, L, stepLen), gate: +range(r, gen.gate).toFixed(2), swing: Math.round(range(r, gen.swing)), human: +range(r, [0, 0.3]).toFixed(2),
      sound: keep.sound ?? pickA(r, gen.sounds), cut: +range(r, [0.35, 0.7]).toFixed(2), res: +range(r, [0.15, 0.5]).toFixed(2), dec: +range(r, [0.3, 0.7]).toFixed(2),
      evo: pickA(r, gen.evos || ['none']), fill: pickA(r, gen.fills || ['none']), fillEvery: 4, mutate: +pickA(r, [0, 0, 4, 8]),
      groove: g.groove, bassPat: g.bass, bars: keep.bars ?? 8, seed,
    };
    if (keep.imported) st.imported = keep.imported;
    // wild card: the generator may also reach for the unusual tools
    if (keep.wild) {
      const w = rng(seed * 7 + 5);
      if (w() < 0.3) st.pool = pickA(w, ['quartal', 'cluster', 'spread']);
      if (w() < 0.25) { st.order = 'turing'; st.lock = +(0.6 + w() * 0.35).toFixed(2); st.tlen = pickA(w, [5, 6, 7, 8, 12]); }
      if (w() < 0.35) { st.echo = pickA(w, [2, 3, 4]); st.echoTime = pickA(w, ['8d', '16d', '8', '8t']); st.echoShift = pickA(w, ['0', '12', '7', 's1', 's-1', 's2']); st.echoFb = +(0.4 + w() * 0.3).toFixed(2); }
      if (w() < 0.35) st.feel = pickA(w, ['drunk', 'afro', 'push', 'laid']);
      if (st.steps.some(x => x.type === 'chord') && w() < 0.6) { st.strum = +(0.2 + w() * 0.6).toFixed(2); st.strumDir = pickA(w, ['up', 'down', 'alt']); }
      if (w() < 0.15) st.fill = 'bounce';
    }
    // chord hits need a sound that can play chords: mono, percussive and vocal patches get single notes instead
    if (st.steps.some(x => x.type === 'chord') && NO_CHORDS.has(st.sound)) {
      if (keep.sound) st.steps.forEach(x => { if (x.type === 'chord') x.type = 'note'; });
      else st.sound = gen.sounds.find(x => !NO_CHORDS.has(x)) || 'chord-stab';
    }
    const s = OB.SOUNDS_BY_ID[st.sound];
    if (s && s.fx) Object.assign(st, s.fx);
    return normalize(st);
  }
  // How typical a measurement is for the genre: 1 at the middle of every range, 0 at the edges
  function centrality(m, target) {
    let s = 0, n = 0;
    for (const a of AXES) {
      const tr = target[a.id];
      if (!tr || (a.id === 'swing' && !m.swingFelt) || (a.id === 'leap' && m.chordShare > 0.5)) continue;
      const mid = (tr[0] + tr[1]) / 2, half = (tr[1] - tr[0]) / 2 || 1;
      s += Math.min(1.5, Math.abs(m[a.id] - mid) / half); n++;
    }
    return n ? 1 - s / n : 1;
  }
  function signature(st) { return stepsString(st.steps) + '|' + st.pool + '|' + st.order + '|' + st.rate + '|' + (st.order === 'seq' ? st.seq.join('') : '') + '|' + st.echo + st.echoShift + st.feel + Math.round(st.strum * 10); }
  const wildness = st => (st.echo > 0) + (st.order === 'turing') + ['quartal', 'cluster', 'spread'].includes(st.pool) + (st.feel !== 'straight') + (st.strum > 0) + (st.fill === 'bounce');
  function find(genreId, n = 8, seed = 1, keep = {}, tries = 140) {
    const g = OB.GENRES[genreId];
    const out = [];
    for (let i = 0; i < tries; i++) {
      const st = generate(genreId, seed * 1000 + i, keep);
      const R = render(st, {bars: 4, evo: false, fills: false, mutate: false});
      const m = metrics(R), f = fit(m, g.target);
      out.push({st, m, fit: f.score, typical: centrality(m, g.target), sig: signature(st)});
    }
    out.sort((a, b) => (b.fit + 30 * b.typical) - (a.fit + 30 * a.typical) || a.st.seed - b.st.seed);
    // greedy pick for variety: the best remaining candidate, marked down for each pick that shares its sound,
    // its kind (chord stabs, pedal riff, written riff, arp) or its pool
    const kind = st => { const sd = st.steps.filter(sounding); const ch = sd.filter(s => s.type === 'chord').length, pd = sd.filter(s => s.type === 'pedal').length; return ch > sd.length / 2 ? 'stab' : pd ? 'pedal' : st.order === 'seq' ? 'riff' : 'arp'; };
    const picked = [], seen = new Set(), pool = out.slice();
    while (picked.length < n && pool.length) {
      let bi = -1, bs = -Infinity;
      for (let i = 0; i < pool.length; i++) {
        const c = pool[i], k = stepsString(c.st.steps);
        if (seen.has(k)) continue;
        const same = (f) => picked.filter(p => f(p.st) === f(c.st)).length;
        const sc = c.fit + 30 * c.typical - 9 * same(st => st.sound) - 14 * same(kind) - 5 * same(st => st.pool) - (c.m.low > 0.2 && !g.lowOk ? 25 : 0) + (keep.wild ? 7 * Math.min(3, wildness(c.st)) : 0);
        if (sc > bs) { bs = sc; bi = i; }
      }
      if (bi < 0) break;
      const c = pool.splice(bi, 1)[0];
      seen.add(stepsString(c.st.steps));
      c.kind = kind(c.st);
      picked.push(c);
    }
    return picked;
  }
  // Variations of one combo: same harmony, key, tempo and sound; the notes and rhythm moved
  const WILD_POOLS = new Set(['quartal', 'cluster', 'spread']);
  function vary(input, n = 8, seed = 1, opts = {}) {
    const base = normalize(input), g = OB.GENRES[base.genre] || OB.GENRES['tech-house'];
    const out = [];
    const r = rng(seed * 7 + 3);
    const ops = [
      ['Rotated', st => { const k = 1 + Math.floor(r() * (st.steps.length - 1)); st.steps = rotate(st.steps, k); return `pattern rotated ${k} step${k > 1 ? 's' : ''}`; }],
      ['New order', st => { const o = pickA(r, Object.keys(ORDERS).filter(o => o !== st.order && o !== 'random' && (opts.wild || o !== 'turing'))); st.order = o; if (o === 'seq') st.seq = genSeq(r, irange(r, [3, 6]), 3); return `order: ${ORDERS[o].name}`; }],
      ['Accents moved', st => { const every = pickA(r, [3, 5, 6, 7]); st.steps.forEach((s, i) => { s.acc = sounding(s) && i % every === 0 ? 1 : 0; }); return `accent every ${every} steps`; }],
      ['Octave jumps', st => { st.steps.forEach(s => { if (s.type === 'note') s.oct = r() < 0.25 ? 1 : 0; }); return 'octave jumps on a quarter of the notes'; }],
      ['Thinned', st => { let k = 0; st.steps.forEach(s => { if (s.type === 'note' && !s.acc && r() < 0.35) { s.type = 'rest'; k++; } }); return `${k} notes taken out`; }],
      ['Filled', st => { let k = 0; st.steps.forEach(s => { if (s.type === 'rest' && r() < 0.3) { s.type = 'note'; k++; } }); return `${k} rests filled`; }],
      ['New pool', st => { const p = pickA(r, Object.keys(POOLS).filter(p => p !== st.pool && p !== 'root' && (opts.wild || !WILD_POOLS.has(p)))); st.pool = p; return `pool: ${POOLS[p].name}`; }],
      ['Polymeter', st => { const L = pickA(r, [3, 5, 6, 7, 10, 12, 14]); const src = st.steps.filter(sounding).length ? st.steps : parseSteps('x'); st.steps = Array.from({length: L}, (_, i) => Object.assign({}, src[i % src.length])); return `pattern length ${L} steps`; }],
      ['Written riff', st => { st.order = 'seq'; st.seq = genSeq(r, irange(r, [3, 7]), st.pool === 'scale' ? 6 : 3); return `riff ${st.seq.join(' ')}`; }],
      ['Pedal', st => { st.steps.forEach((s, i) => { if (s.type === 'note' && i % 2 === 0) s.type = 'pedal'; }); return 'every other note to the pedal'; }],
      ['Ratchets', st => { st.steps.forEach(s => { if (s.type === 'note' && r() < 0.2) s.rat = 2; }); return 'ratchets on a fifth of the notes'; }],
      ['Halftime', st => { if (st.rate === '16') { st.rate = '8'; return 'rate 1/8'; } st.rate = '16'; return 'rate 1/16'; }],
      ['Stacked 4ths', st => { st.pool = pickA(r, ['quartal', 'cluster', 'spread']); return `pool: ${POOLS[st.pool].name}`; }],
      ['Echo cascade', st => { st.echo = pickA(r, [2, 3, 4]); st.echoTime = pickA(r, ['8d', '16d', '8']); st.echoShift = pickA(r, ['12', '7', 's1', 's2', 's-1']); return `echo ×${st.echo}, ${ECHO_SHIFTS[st.echoShift].toLowerCase()}`; }],
      ['Turing drift', st => { st.order = 'turing'; st.lock = pickA(r, [0.7, 0.8, 0.9]); st.tlen = pickA(r, [5, 6, 7, 8]); return `Turing loop of ${st.tlen}, ${Math.round(st.lock * 100)}% locked`; }],
      ['Feel', st => { st.feel = pickA(r, ['drunk', 'afro', 'push', 'laid']); return `feel: ${FEELS[st.feel].name.toLowerCase()}`; }],
    ];
    if (!opts.wild) ops.length = 12;
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      const st = normalize(base);
      st.seed = base.seed * 31 + i + seed;
      const a = ops[Math.floor(r() * ops.length)], b = r() < 0.5 ? ops[Math.floor(r() * ops.length)] : null;
      const what = [a[1](st)];
      if (b && b !== a) what.push(b[1](st));
      st.from = 'variation';
      st.name = base.name.replace(/ · var.*$/, '') + ' · var ' + (out.length + 1);
      const R = render(st, {bars: 4, evo: false, fills: false, mutate: false});
      const f = fit(metrics(R), g.target);
      if (out.some(o => signature(o.st) === signature(st)) || signature(st) === signature(base)) continue;
      out.push({st, fit: f.score, what: what.join(', ')});
    }
    return out;
  }

  // ---- Ableton translation ----
  function liveArp(input) {
    const st = normalize(input);
    const reasons = [], notes = [];
    const rate = RATES[st.rate];
    const plain = st.steps.every(s => s.type === 'note' && !s.acc && !s.oct && s.rat === 1 && !s.slide && s.prob >= 1);
    const style = ORDERS[st.order].live;
    if (!rate.live) reasons.push('Live\'s Arpeggiator has no dotted rates.');
    if (!plain) {
      const rests = st.steps.some(s => s.type === 'rest' || s.type === 'tie'), acc = st.steps.some(s => s.acc), other = st.steps.some(s => s.oct || s.rat > 1 || s.type === 'chord' || s.type === 'pedal' || s.slide);
      if (rests) reasons.push('The step pattern has rests and ties; the Arpeggiator plays every step.');
      if (acc) reasons.push('Accents: the Arpeggiator plays every note at the same velocity (use Velocity → Target only for a ramp).');
      if (other) reasons.push('Per-step octave jumps, ratchets, chord hits, pedal notes or slides are not Arpeggiator features.');
    }
    if (st.order === 'seq') notes.push('Play Order follows the order the input notes start in: stagger the chord notes in the input clip in the written order (lowest = 0).');
    if (st.evo !== 'none') notes.push('Evolution lanes are in the MIDI export as CC automation; the Arpeggiator can\'t write them.');
    const exact = !reasons.length && st.order !== 'seq' && st.advance === 'note';
    const swing = st.swing > 50 ? `Groove Pool: a 16th swing groove near ${Math.round(st.swing)}% on the Arpeggiator's input clip, or Live 12's MIDI Swing` : 'Off (straight)';
    return {
      verdict: exact ? 'exact' : reasons.length <= 1 && !st.steps.some(s => s.type === 'rest') ? 'close' : 'midi',
      settings: [
        ['Style', style],
        ['Rate', rate.live ? `${rate.live} (Sync on)` : 'n/a: use 1/8 or the MIDI export'],
        ['Gate', Math.round(clamp(st.gate, 0.05, 2) * 100) + '%'],
        ['Steps / Distance', st.octaves > 1 ? `${st.octaves - 1} step${st.octaves > 2 ? 's' : ''}, +12 st (Transpose: Shift)` : '0 (one octave)'],
        ['Retrigger', st.reset === 'bar' ? 'Beat, every 1 bar' : st.reset === 'chord' ? 'Note' : st.reset === '2bar' ? 'Beat, every 2 bars' : st.reset === '4bar' ? 'Beat, every 4 bars' : 'Off'],
        ['Repeats', '∞'],
        ['Hold', 'Off (the input clip holds the notes)'],
        ['Swing', swing],
      ],
      input: st.pool === 'chord' ? 'the Chords track (each chord held)' : `the Arp input track (the ${POOLS[st.pool].name.toLowerCase()} held per chord)`,
      reasons, notes,
    };
  }
  function delayTable(bpm) {
    const q = 60000 / bpm;
    return [['1/32', q / 8], ['1/16', q / 4], ['1/16 dotted', q * 3 / 8], ['1/8 triplet', q / 3], ['1/8', q / 2], ['3/16 (1/8 dotted)', q * 3 / 4], ['1/4', q], ['1/4 dotted', q * 1.5], ['1/2', q * 2]].map(([n, ms]) => ({n, ms, hz: 1000 / ms}));
  }
  const DELAY_TIMES = {'16': 0.25, '8t': 1 / 3, '8': 0.5, '8d': 0.75, '4': 1, '4d': 1.5, '16d': 0.375};

  // ---- MIDI export ----
  function exportMidi(input, opts = {}) {
    const st = normalize(input);
    const bars = opts.bars || st.bars;
    const R = render(st, {bars});
    const parts = opts.parts || {arp: true};
    const tracks = [];
    const tidy = es => es.map(e => ({t: e.t, d: e.d, n: e.n, v: e.v}));
    if (parts.arp) {
      const tr = {name: 'Orbit Arp', ch: 0, notes: tidy(R.events), cc: []};
      if (opts.cc !== false && st.evo !== 'none') {
        const e = EVOS[st.evo];
        const lanes = [['cut', 74], ['res', 71], ['dec', 75], ['send', 91]].filter(([k]) => e[k]);
        for (let t = 0; t < bars * 4; t += 0.25) {
          const v = evoAt(st, t, bars * 4);
          for (const [k, cc] of lanes) tr.cc.push({t, cc, v: k === 'send' ? clamp01(st.reverb + v.send) * 127 : v[k] * 127});
        }
        // drop repeated values
        const lastv = {};
        tr.cc = tr.cc.filter(c => { const k = c.cc, val = Math.round(c.v); if (lastv[k] === val) return false; lastv[k] = val; return true; });
      }
      tracks.push(tr);
    }
    if (parts.chords) tracks.push({name: 'Chords', ch: 1, notes: tidy(renderChords(st, R.harmony, bars)).map(n => Object.assign(n, {n: n.n + 12}))});
    if (parts.input) tracks.push({name: 'Arp input (for Live\'s Arpeggiator)', ch: 2, notes: tidy(renderArpInput(st, R.harmony, bars))});
    if (parts.bass) tracks.push({name: 'Bass', ch: 3, notes: tidy(renderBass(st, R.harmony, bars))});
    if (parts.drums) tracks.push({name: 'Drums', ch: 9, notes: tidy(renderDrums(st, bars))});
    const markers = [];
    for (let t0 = 0; t0 < bars * 4; t0 += R.harmony.beats) for (const c of R.harmony.chords) if (t0 + c.t < bars * 4) markers.push({t: t0 + c.t, text: c.name});
    return OT.writeMidi(tracks, {bpm: st.bpm, name: st.name, beats: bars * 4, markers: opts.markers === false ? [] : markers.slice(0, 256)});
  }
  function fileStem(st) {
    const k = OT.asciiName(OT.pcName(st.key, st.key, st.scale)).replace('#', 's') + (OT.SCALES[st.scale].minor ? 'm' : '');
    const nm = String(st.name || 'arp').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 48) || 'arp';
    return `Orbit_${nm}_${k}_${st.bpm}bpm`;
  }

  // ---- text → rhythm: Morse code, a dot is a note, a dash an accent held for two steps ----
  const MORSE = {a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.'};
  function morse(text) {
    const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
    let out = '';
    words.forEach((w, wi) => {
      const letters = [...w].filter(ch => MORSE[ch]);
      letters.forEach((ch, li) => {
        out += [...MORSE[ch]].map(sym => sym === '.' ? 'x' : 'X-').join('.');
        if (li < letters.length - 1) out += '..';
      });
      if (wi < words.length - 1 && letters.length) out += '....';
    });
    out = out.slice(0, 64).replace(/-$/, '.');
    return out || 'x';
  }

  // ---- a written riff (a MIDI clip) → step pattern + written sequence over the key's scale ----
  // The rhythm is read on the 16th grid (up to 4 bars), held notes become ties, loud notes accents, and each pitch
  // becomes its index on the scale from the tonic, so the riff plays back exactly (notes outside the scale snap).
  function riffFromNotes(notes, input) {
    const st = normalize(Object.assign({}, input, {pool: 'scale', follow: false, count: 0, octaves: 1, imported: null}));
    const ns = notes.filter(n => n.d > 0.02).slice().sort((a, b) => a.t - b.t || b.n - a.n);
    if (!ns.length) throw Error('No notes in that clip.');
    const t0 = Math.floor(ns[0].t / 4 + 1e-6) * 4, end = Math.max(...ns.map(n => n.t + n.d)) - t0;
    const bars = clamp(Math.ceil(end / 4 - 0.02), 1, 4), L = bars * 16;
    const meanV = ns.reduce((a, n) => a + n.v, 0) / ns.length;
    const P = pool(st, tonicChord(st)), base = P.base;
    const steps = [], seq = [];
    let snapped = 0, holdUntil = -1;
    for (let g = 0; g < L; g++) {
      const t = t0 + g * 0.25;
      const here = ns.filter(n => n.t >= t - 0.125 && n.t < t + 0.125);
      if (here.length) {
        const n = here.sort((a, b) => b.v - a.v || b.n - a.n)[0];
        let bi = 0, bd = Infinity;
        for (let i = -35; i <= 42; i++) { const d = Math.abs(pitchAt(base, i) - n.n); if (d < bd) { bd = d; bi = i; } }
        if (bd > 0) snapped++;
        seq.push(bi);
        steps.push({type: 'note', acc: n.v >= Math.max(108, meanV + 12) ? 1 : 0, oct: 0, rat: 1, slide: false, prob: 1});
        holdUntil = n.t + n.d;
      } else steps.push({type: holdUntil > t + 0.07 ? 'tie' : 'rest', acc: 0, oct: 0, rat: 1, slide: false, prob: 1});
    }
    const lens = ns.slice(0, 64).map(n => n.d);
    const gate = clamp(lens.reduce((a, b) => a + b, 0) / lens.length / 0.25, 0.1, 1);
    // its swing: how late the notes near the off-16ths land, as a share of the 8th
    const offs = ns.map(n => n.t - t0).filter(t => Math.abs(mod(t, 0.5) - 0.25 - 0.03) < 0.09).map(t => mod(t, 0.5) - 0.25);
    const swing = offs.length ? clamp(Math.round(50 + offs.reduce((a, b) => a + b, 0) / offs.length / 0.5 * 100), 50, 70) : 50;
    return {patch: {steps, seq: seq.length ? seq : [0], pool: 'scale', follow: false, count: 0, octaves: 1, order: 'seq', rate: '16', advance: 'note', reset: 'never', gate: +Math.min(0.95, gate).toFixed(2),
      swing, fill: 'none', mutate: 0, evo: input.evo || 'none', echo: 0, strum: 0, feel: 'straight', human: 0},
      bars, notes: seq.length, snapped, swing};
  }
  // the seven chords of the key, stacked in thirds from each scale degree (triads, 7ths or 9ths), voiced near the register
  function diatonicChords(input, ext = 'triad') {
    const st = normalize(input), sc = OT.SCALES[st.scale].st, out = [];
    for (let d = 0; d < 7; d++) {
      const deg = k => sc[(d + k) % 7] + 12 * Math.floor((d + k) / 7) - sc[d];
      const iv = [0, deg(2), deg(4)];
      if (ext !== 'triad') iv.push(deg(6));
      if (ext === '9th') iv.push(deg(8));
      const root = mod(st.key + sc[d], 12), w = new Array(12).fill(0);
      iv.forEach(i => { w[mod(root + i, 12)] = 1; });
      let q = OT.detectChord(w, root).q;
      if (OT.Q[q].iv.length !== iv.length || OT.Q[q].iv.some((x, i) => mod(x, 12) !== mod(iv[i], 12))) {
        const exact = Object.entries(OT.Q).find(([, v]) => v.iv.length === iv.length && v.iv.every((x, i) => x === iv[i]));
        if (exact) q = exact[0];
      }
      const flat9 = ext === '9th' && iv[4] === 13 ? '♭9' : '';
      out.push({deg: d, root, q, iv, name: OT.chordName(root, q, st.key, st.scale) + flat9, roman: OT.romanFor(root, q, st.key, st.scale) + flat9, notes: OT.voice(root, iv, st.reg, null)});
    }
    return out;
  }
  // the current order written out as a sequence, so it can be edited note by note
  function writeOut(input) {
    const st = normalize(input), h = harmony(st), P = pool(st, h.chords[0]);
    return orderSeq(st, extend(P.base, st.count, st.octaves).length, 0).slice(0, 64);
  }

  // ---- sharing: a combo as a compact string for the URL ----
  const TYPES = ['rest', 'note', 'chord', 'pedal', 'tie'];
  function pack(input) {
    const st = normalize(input);
    const o = Object.assign({}, st);
    o.steps = st.steps.map(s => [TYPES.indexOf(s.type), s.acc, s.oct, s.rat, s.slide ? 1 : 0, Math.round(s.prob * 100)]);
    delete o._n;
    const json = JSON.stringify(o);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return (typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unpack(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const json = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    const o = JSON.parse(json);
    if (Array.isArray(o.steps)) o.steps = o.steps.map(a => Array.isArray(a) ? {type: TYPES[a[0]] || 'rest', acc: a[1], oct: a[2], rat: a[3], slide: !!a[4], prob: (a[5] ?? 100) / 100} : a);
    return normalize(o);
  }

  function describe(st) {
    const n = st.steps.filter(sounding).length;
    return `${POOLS[st.pool].name} · ${ORDERS[st.order].name}${st.order === 'seq' ? ' ' + st.seq.join(' ') : ''} · ${RATES[st.rate].label} · ${st.steps.length} steps, ${n} sounding` + (st.swing > 50 ? ` · swing ${Math.round(st.swing)}%` : '');
  }

  return {RATES, POOLS, ORDERS, EVOS, FILLS, AXES, DEFAULT, DELAY_TIMES, DRUM_NOTES, parseSteps, stepsString, stepChar, sounding, euclid, normalize, harmony,
    pool, extend, orderSeq, render, FEELS, ECHO_SHIFTS, ladder, scaleStep, morse, riffFromNotes, writeOut, feelShift, diatonicChords, renderBass, renderDrums, renderChords, renderArpInput, metrics, fit, cycle, cycleText, analyse, rotate,
    suggestions, generate, find, vary, centrality, liveArp, delayTable, exportMidi, fileStem, pack, unpack, describe, evoAt, chordIndexAt, weight, signature};
})();
