// Talk engine: pure functions, no Web Audio. Runs in the page and in Node tests.
// Depends on OT (arp-src/theory.js) for rng, MIDI and ZIP.
const TK = (() => {
  const STEPS = 32;                 // a loop is two bars of 16ths
  const KICK = [0, 4, 8, 12, 16, 20, 24, 28];
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------------------------------------------------------------- vowels
  // Formant centres (Hz) and relative gains. Formants don't follow the note,
  // which is exactly why a bass passed through them sounds like it is talking.
  const VOWELS = {
    a: {f: [800, 1150, 2900], g: [1, .55, .22], cc: 0},
    e: {f: [450, 1750, 2600], g: [1, .5, .25], cc: 32},
    i: {f: [300, 2200, 3000], g: [1, .35, .25], cc: 64},
    o: {f: [480, 820, 2800], g: [1, .7, .12], cc: 96},
    u: {f: [330, 680, 2500], g: [1, .5, .08], cc: 127},
  };
  const SHAPES = {
    aa: {v: ['a'], say: 'aah'}, oo: {v: ['u'], say: 'ooh'}, ee: {v: ['i'], say: 'eee'},
    wah: {v: ['u', 'a'], say: 'wah'}, wow: {v: ['u', 'a', 'u'], say: 'wow'}, yeah: {v: ['i', 'e', 'a'], say: 'yeah'},
    ow: {v: ['a', 'o', 'u'], say: 'ow'}, oi: {v: ['o', 'i'], say: 'oi'}, you: {v: ['i', 'u'], say: 'you'},
    we: {v: ['u', 'i'], say: 'we'},
  };
  const TALK = ['wah', 'wow', 'yeah', 'ow', 'oi', 'you', 'we'];
  const isTalk = shape => (SHAPES[shape]?.v.length || 1) > 1;
  // move "shift": every second 8-bar block, talk shapes answer with a different word
  const ROTATE = {wah: 'yeah', wow: 'oi', yeah: 'wah', ow: 'we', oi: 'wow', you: 'ow', we: 'you', aa: 'oo', oo: 'aa', ee: 'oo'};

  // ---------------------------------------------------------------- bass studies
  // n(step, length in 16ths, semitones over the root, vowel shape, start bend in semitones, accent)
  const n = (s, l, semi = 0, shape = null, bend = 0, acc = 0) => ({s, l, semi, shape, bend, acc});
  const per = (steps, f) => steps.map(f);
  const STUDIES = [
    {name: 'Offbeat rubber', mouth: 45, shape: 'oo', feel: 'The tech house default: one rubbery note on every offbeat, and the only word comes at the end of bar two.',
      notes: [...per([2, 6, 10, 14, 18, 22, 26], s => n(s, 1)), n(30, 2, 7, 'wah', 0, 1)]},
    {name: 'Gallop talk', mouth: 50, shape: 'aa', feel: 'Pairs of 16ths after each kick push the groove forward. The last pair climbs and says "ow".',
      notes: [...[0, 1, 2, 3, 4, 5, 6].flatMap(b => [n(b * 4 + 2, 1, 0, null, 0, 1), n(b * 4 + 3, 1)]), n(30, 1, 10, 'ow', 0, 1), n(31, 1, 12)]},
    {name: 'Question & answer', mouth: 55, shape: 'oo', feel: 'Bar one asks with short notes. Bar two answers with one long "wah", and that note is the hook.',
      notes: [n(2, 1), n(3, 1), n(6, 1), n(10, 1), n(11, 1), n(14, 1, 3), n(18, 6, 0, 'wah', 0, 1), n(26, 1), n(30, 1, 3)]},
    {name: 'The yawn', mouth: 60, shape: 'oo', feel: 'Very few notes, very long words. The groove comes from the drums; the bass becomes a voice.',
      notes: [n(2, 10, 0, 'wow', 0, 1), n(14, 1, 7), n(18, 8, 0, 'ow', 0, 1), n(30, 2, 10)]},
    {name: 'Octave chatter', mouth: 40, shape: 'oo', feel: 'Root on the offbeat, octave a 16th later on every second beat, and a high "you" to end the phrase. Busy without ever touching the kick.',
      notes: [0, 1, 2, 3, 4, 5, 6].flatMap(b => b % 2 ? [n(b * 4 + 2, 1), n(b * 4 + 3, 1, 12, 'ee')] : [n(b * 4 + 2, 1, 0, null, 0, 1)]).concat([n(30, 2, 12, 'you', 0, 1)])},
    {name: 'Drop stab', mouth: 50, shape: 'aa', feel: 'Each stab starts an octave high and falls into the root: the pitch drop is the word.',
      notes: [n(2, 2, 0, null, 12, 1), n(7, 1, 7), n(10, 2, 0, null, 12, 1), n(18, 2, 0, null, 12, 1), n(23, 1, 7), n(26, 2, 0, null, 12, 1), n(30, 2, 0, 'wah', 5, 1)]},
    {name: 'Wonky 3-3-2', mouth: 50, shape: 'oo', feel: 'A tresillo shifted off the kick. It leans against the four-to-the-floor instead of sitting on it.',
      notes: [n(3, 1), n(6, 1), n(9, 1, 7), n(14, 1, 10), n(19, 1), n(22, 1, 3), n(25, 1), n(30, 2, 0, 'wah', 0, 1)]},
    {name: 'Rolling 16ths', mouth: 35, shape: 'aa', feel: 'Every 16th that is not a kick, accents on the offbeats, then it climbs into a "wah". Open the mouth move and it builds by itself.',
      notes: [...Array(32).keys()].filter(s => s % 4 && s < 29).map(s => n(s, 1, 0, null, 0, s % 4 === 2 ? 1 : 0)).concat([n(29, 1, 3), n(30, 2, 7, 'wah', 0, 1)])},
    {name: 'Late talker', mouth: 55, shape: 'oo', feel: 'Everything lands on the last 16th of the beat, so the bass always sounds slightly late and lazy.',
      notes: [n(3, 1), n(7, 1), n(11, 3, 0, 'oi', 0, 1), n(19, 1), n(23, 1), n(27, 3, 0, 'you', 0, 1), n(31, 1, 10)]},
    {name: 'Minimal dot', mouth: 40, shape: 'oo', feel: 'Two notes a bar and one high "we" at the end. The space is the groove, and it leaves the whole stage to a vocal.',
      notes: [n(2, 3), n(11, 1, 7), n(18, 3), n(27, 1, 10), n(30, 2, 12, 'we', 0, 1)]},
    {name: 'Walk up', mouth: 45, shape: 'oo', feel: 'Bar one holds the root; bar two walks up the minor scale and lands on a "wah".',
      notes: [...per([2, 6, 10, 14, 18], s => n(s, 1)), n(22, 1, 3), n(26, 1, 5), n(29, 1, 7), n(30, 2, 10, 'wah', 0, 1)]},
    {name: 'Yeah yeah', mouth: 60, shape: 'oo', feel: 'The bass says "yeah" on beats two and four, where the clap is. It answers the clap instead of the kick.',
      notes: [n(2, 1), n(6, 2, 0, 'yeah', 0, 1), n(10, 1), n(14, 2, 0, 'yeah', 0, 1), n(18, 1), n(22, 2, 0, 'yeah', 0, 1), n(26, 1, 7), n(29, 3, 5, 'ow', 0, 1)]},
    {name: 'Growl rail', mouth: 65, shape: 'ow', feel: 'Long offbeat notes that each say "ow". A continuous growl, closer to a voice than a bassline.',
      notes: [...per([2, 6, 10, 14, 18, 22, 26], s => n(s, 2, 0, 'ow', 0, s % 8 === 2 ? 1 : 0)), n(30, 2, 10, 'wow', 0, 1)]},
    {name: 'Bounce b7', mouth: 45, shape: 'oo', feel: 'Root and the flat seventh below trade places. Simple, minor and very hard to get out of your head.',
      notes: [n(2, 1), n(6, 1, -2), n(10, 1), n(13, 1, 10), n(14, 1, 12, 'ee'), n(18, 1), n(22, 1, -2), n(26, 1, 3), n(30, 2, 0, 'wah', 0, 1)]},
  ];

  // ---------------------------------------------------------------- the grammar
  // Rules every loop obeys, checked by the tests and by the generator.
  function checkLoop(notes) {
    const problems = [];
    const sorted = [...notes].sort((a, b) => a.s - b.s);
    sorted.forEach((x, i) => {
      if (!Number.isInteger(x.s) || x.s < 0 || x.s >= STEPS) problems.push('step ' + x.s + ' is outside the loop');
      if (x.l < 1 || x.s + x.l > STEPS) problems.push('note at ' + x.s + ' runs past the loop');
      if (KICK.includes(x.s)) problems.push('note at ' + x.s + ' starts on a kick');
      if (x.semi < -5 || x.semi > 15) problems.push('note at ' + x.s + ' is out of range');
      if (i && sorted[i - 1].s + sorted[i - 1].l > x.s) problems.push('notes at ' + sorted[i - 1].s + ' and ' + x.s + ' overlap');
    });
    return problems;
  }

  // Seeded generator. It writes in the same grammar the studies use.
  function generate(seed, {density = 60, talk = 2} = {}) {
    const r = OT.rng(seed * 7919 + 13);
    const pick = a => a[Math.floor(r() * a.length)];
    const anchors = {off: [2, 6, 10, 14], late: [3, 7, 11, 15], gallop: [2, 3, 6, 7, 10, 11, 14, 15], wonky: [3, 6, 9, 14], roll: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]};
    const kind = pick(Object.keys(anchors));
    const base = pick(['oo', 'oo', 'aa', 'ow']);
    let notes = [];
    for (const bar of [0, 1]) {
      let steps = anchors[kind].filter(() => r() * 100 < density + 25);
      if (steps.length < 2) steps = anchors[kind].slice(0, 2);
      for (const s of steps) {
        const roll = r();
        const semi = roll < .68 ? 0 : pick([7, 10, 12, 3, -2]);
        notes.push(n(bar * 16 + s, 1, semi, semi === 12 ? 'ee' : null, 0, s % 4 === 2 ? 1 : 0));
      }
    }
    notes.sort((a, b) => a.s - b.s);
    // talk notes: long vowel shapes, mostly late in bar two where the phrase answers itself
    const want = clamp(Math.round(talk), 0, 3);
    for (let k = 0; k < want; k++) {
      const pool = notes.filter(x => !isTalk(x.shape) && (k === 0 ? x.s >= 24 : true));
      if (!pool.length) break;
      const x = pool[Math.floor(r() * pool.length)];
      x.shape = pick(TALK); x.acc = 1;
      const room = (notes.find(y => y.s > x.s)?.s ?? STEPS) - x.s;
      x.l = clamp(2 + Math.floor(r() * 5), 1, STEPS - x.s);
      // a talk note eats the notes it covers, but never crosses the loop end
      notes = notes.filter(y => y === x || y.s < x.s || y.s >= x.s + x.l);
      if (room < 1) x.l = 1;
      if (r() < .3) x.bend = pick([5, 12]);
    }
    // the phrase end: a different note on the last event of bar two
    const last = notes.filter(x => x.s >= 24).pop();
    if (last && last.semi === 0 && r() < .8) last.semi = pick([7, 10, 3, 12]);
    const out = notes.map(x => ({...x}));
    const problems = checkLoop(out);
    if (problems.length) throw Error('Generator broke its own grammar: ' + problems.join('; '));
    return {name: 'Generated · ' + kind + ' #' + seed, mouth: 50, shape: base, feel: 'A new loop in the ' + kind + ' grammar: never on the kick, ' + want + ' talking note' + (want === 1 ? '' : 's') + ', and a different note to end the phrase.', notes: out};
  }

  // ---------------------------------------------------------------- the phrase: one loop, kept alive
  const MOVES = [
    {id: 'open', name: 'Open the mouth', when: 'whole phrase', text: 'The formant filter opens from 40% to your mouth setting across the phrase. Exported as CC74.'},
    {id: 'swap', name: 'Note swap', when: 'bar 4 of every 4', text: 'The last note of every fourth bar swaps: a root becomes the fifth, anything else falls back to the root. The turnaround a DJ hears coming.'},
    {id: 'gap', name: 'Leave a gap', when: 'bar 4 of every 8', text: 'The last beat of bar 4 goes silent. Space for a vocal, a clap fill, or just a breath.'},
    {id: 'ghost', name: 'Ghost 16ths', when: 'bars 5–8 of every 8', text: 'Quiet 16ths after the notes in the second half of every 8 bars. Same loop, more motion.'},
    {id: 'drop', name: 'Pitch-drop fill', when: 'bar 8 of every 8', text: 'The last beat of every eighth bar becomes an octave-high stab that falls into the root.'},
    {id: 'lift', name: 'Octave lift', when: 'second half', text: 'In the second half, notes on beats two and four jump an octave. The energy rises without a new idea.'},
    {id: 'shift', name: 'New word', when: 'every second 8 bars', text: 'Talking notes say a different word in alternate 8-bar blocks: "wah" becomes "yeah", "ow" becomes "we".'},
    {id: 'talk2x', name: 'Double talk', when: 'last 2 bars', text: 'Long talking notes split in two at the end of the phrase, so the bass stutters into the next section.'},
  ];

  const rootMidi = key => { const r = 24 + mod(key, 12); return r < 28 ? r + 12 : r; };
  // swing: odd 16ths move later inside their 8th
  const swingT = (step, swing) => step % 2 ? Math.floor(step / 2) * .5 + .5 * swing / 100 : step / 4;
  const loopSig = notes => notes.map(x => [x.s, x.l, x.semi, x.shape, x.bend, x.ghost ? 1 : 0].join(':')).join('|');

  function barNotes(loop, bar, bars, moves) {
    let ns = loop.notes.filter(x => Math.floor(x.s / 16) === bar % 2).map(x => ({...x, s: x.s % 16, shape: x.shape || loop.shape}));
    const in8 = bar % 8;
    if (moves.shift && Math.floor(bar / 8) % 2 === 1) ns.forEach(x => { if (isTalk(x.shape)) x.shape = ROTATE[x.shape] || x.shape; });
    if (moves.swap && bar % 4 === 3) { const t = ns[ns.length - 1]; if (t) t.semi = t.semi === 0 ? 7 : 0; }
    if (moves.lift && bar >= bars / 2) ns.forEach(x => { if ((x.s === 6 || x.s === 14) && x.semi <= 3) x.semi += 12; });
    if (moves.ghost && in8 >= 4) {
      const add = [];
      for (const x of ns) {
        const g = x.s + x.l;
        if (g < 16 && g % 4 && !ns.some(y => y.s <= g && y.s + y.l > g) && !add.some(y => y.s === g)) add.push({s: g, l: 1, semi: x.semi, shape: loop.shape, bend: 0, acc: 0, ghost: 1});
      }
      ns = ns.concat(add);
    }
    if (moves.gap && in8 === 3) ns = ns.filter(x => x.s < 12).map(x => ({...x, l: Math.min(x.l, 12 - x.s)}));
    if (moves.drop && in8 === 7) { ns = ns.filter(x => x.s < 12).map(x => ({...x, l: Math.min(x.l, 14 - x.s)})); ns.push({s: 14, l: 2, semi: 0, shape: 'wah', bend: 12, acc: 1}); }
    if (moves.talk2x && bar >= bars - 2) ns = ns.flatMap(x => {
      if (!isTalk(x.shape) || x.l < 2) return [x];
      let h = Math.floor(x.l / 2);
      if ((x.s + h) % 4 === 0) h = h + 1 < x.l ? h + 1 : h - 1; // the second half never starts on a kick
      return h >= 1 && (x.s + h) % 4 ? [{...x, l: h}, {...x, s: x.s + h, l: x.l - h, acc: 0}] : [x];
    });
    return ns.sort((a, b) => a.s - b.s);
  }

  function phrase(state, loop, hook = null) {
    const bars = state.bars, root = rootMidi(state.key), moves = state.moves || {};
    const beats = bars * 4, mouth = state.mouth / 100;
    const notes = [];
    let alive = 0;
    const plainA = loopSig(barNotes(loop, 0, bars, {})), plainB = loopSig(barNotes(loop, 1, bars, {}));
    for (let bar = 0; bar < bars; bar++) {
      const ns = barNotes(loop, bar, bars, moves);
      if (loopSig(ns) !== (bar % 2 ? plainB : plainA)) alive++;
      for (const x of ns) {
        const t = bar * 4 + swingT(x.s, state.swing);
        const end = bar * 4 + swingT(x.s + x.l, state.swing);
        const d = Math.max(.06, (end - t) * (isTalk(x.shape) ? .97 : state.gate / 100));
        const prog = moves.open ? .4 + .6 * (t / beats) : 1;
        notes.push({t, d, n: root + x.semi, v: x.ghost ? 50 : x.acc ? 118 : 96, shape: x.shape, bend: x.bend || 0,
          glide: x.bend ? Math.min(.25, d * .6) : 0, mouth: clamp(mouth * prog + (x.acc ? .1 : 0), 0, 1), ghost: !!x.ghost, bar});
      }
    }
    // the bass makes room for the vocal: two voices shouldn't talk at once.
    // Talking notes under a syllable go quiet; other notes are cut where a syllable starts. Short notes stay: they are the groove.
    const vocal = hook ? vocalLane(hook, bars) : [];
    const spans = vocal.map(e => [e.t, e.t + e.d]);
    const voiced = spans.reduce((s, [a, b]) => s + b - a, 0);
    const talkers = list => list.filter(x => isTalk(x.shape) || x.d >= .45);
    const overlapTime = list => spans.reduce((s, [a, b]) => s + list.reduce((q, x) => q + Math.max(0, Math.min(b, x.t + x.d) - Math.max(a, x.t)), 0), 0);
    const overlapBefore = voiced ? overlapTime(talkers(notes)) / voiced : 0;
    let kept = notes;
    if (hook && state.room) {
      kept = [];
      for (const x of notes) {
        const hit = spans.filter(([a, b]) => x.t < b - .01 && x.t + x.d > a + .01);
        if (!hit.length) { kept.push(x); continue; }
        if (isTalk(x.shape)) continue;
        const cut = Math.min(...hit.map(([a]) => a).filter(a => a > x.t + .01), x.t + x.d);
        let d = Math.min(x.d, cut - x.t);
        if (d >= .45 && hit.some(([a, b]) => x.t >= a - .01 && x.t < b)) d = .2; // starts under a syllable: keep the hit, drop the hold
        if (d >= .06) kept.push({...x, d});
      }
    }
    const overlapAfter = voiced ? overlapTime(talkers(kept)) / voiced : 0;
    const kicks = drums(state).filter(h => h.part === 'kick').map(h => h.t);
    return {
      beats, bars, bass: kept, vocal, drums: drums(state),
      readout: {
        notes: kept.length, talk: kept.filter(x => isTalk(x.shape)).length,
        alive: alive / bars, kickHits: kept.filter(x => kicks.some(k => Math.abs(k - x.t) < .02)).length,
        overlapBefore, overlapAfter, removed: notes.length - kept.length,
      },
      markers: Array.from({length: bars / 4}, (_, i) => ({t: i * 16, text: 'Bars ' + (i * 4 + 1) + '-' + (i * 4 + 4)})),
    };
  }

  // ---------------------------------------------------------------- drums: a tech house floor to hear it against
  const KITS = {
    floor: {name: 'Floor', text: 'Kick, clap, offbeat open hat, shaker 16ths.'},
    stripped: {name: 'Stripped', text: 'Kick and offbeat hat only. Hear the bass carry the groove.'},
    full: {name: 'Full', text: 'Adds a rim pattern and a closed-hat skip.'},
  };
  function drums(state) {
    const hits = [], kit = state.kit || 'floor', sw = state.swing;
    for (let bar = 0; bar < state.bars; bar++) for (let s = 0; s < 16; s++) {
      const t = bar * 4 + swingT(s, sw), add = (part, v) => hits.push({t, part, v});
      if (s % 4 === 0) add('kick', 120);
      if (s % 4 === 2) add('hat', 92);
      if (kit === 'stripped') continue;
      if (s === 4 || s === 12) add('clap', 108);
      add('shaker', s % 4 === 2 ? 70 : s % 2 ? 46 : 34);
      if (kit === 'full') { if ([3, 10].includes(s) || (bar % 2 && s === 15)) add('rim', 80); if ([1, 7, 13].includes(s)) add('closed', 58); }
    }
    return hits;
  }

  // ---------------------------------------------------------------- voice analysis (works on mono Float32Array)
  function envelope(x, sr, hop = .005) {
    const h = Math.max(1, Math.round(hop * sr)), out = new Float32Array(Math.ceil(x.length / h));
    for (let i = 0; i < out.length; i++) { let s = 0; const a = i * h, b = Math.min(x.length, a + h); for (let j = a; j < b; j++) s += x[j] * x[j]; out[i] = Math.sqrt(s / Math.max(1, b - a)); }
    return out;
  }

  // Syllables: voiced regions above a threshold, split at dips. `split` (0..1) sets how deep a dip must be.
  function syllables(x, sr, {split = .5, minLen = .06} = {}) {
    const hop = .005, env = envelope(x, sr, hop), sm = new Float32Array(env.length);
    for (let i = 0; i < env.length; i++) { let s = 0, c = 0; for (let k = -2; k <= 2; k++) if (env[i + k] != null) { s += env[i + k]; c++; } sm[i] = s / c; }
    let peak = 0; for (const v of sm) peak = Math.max(peak, v);
    if (peak < 1e-4) return [];
    const sorted = Array.from(sm).sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * .1)] || 0;
    const thr = Math.max(peak * .08, floor * 3);
    const regions = [];
    for (let i = 0, start = -1; i <= sm.length; i++) {
      const on = i < sm.length && sm[i] > thr;
      if (on && start < 0) start = i;
      if (!on && start >= 0) { regions.push([start, i]); start = -1; }
    }
    // join regions separated by less than 30 ms (a consonant, not a new syllable)
    const joined = [];
    for (const r of regions) { const p = joined[joined.length - 1]; if (p && (r[0] - p[1]) * hop < .03) p[1] = r[1]; else joined.push([...r]); }
    const out = [];
    const depth = .35 + .5 * clamp(split, 0, 1);   // higher split = shallower dips also split
    for (const [a, b] of joined) {
      let cuts = [a];
      // find local minima well below both neighbouring maxima
      for (let i = a + 8; i < b - 8; i++) {
        let isMin = true; for (let k = -6; k <= 6; k++) if (sm[i + k] < sm[i]) { isMin = false; break; }
        if (!isMin) continue;
        let l = 0, r = 0; for (let k = cuts[cuts.length - 1]; k < i; k++) l = Math.max(l, sm[k]); for (let k = i; k < b; k++) r = Math.max(r, sm[k]);
        if (sm[i] < depth * Math.min(l, r) && (i - cuts[cuts.length - 1]) * hop >= minLen) cuts.push(i);
      }
      cuts.push(b);
      for (let k = 0; k < cuts.length - 1; k++) {
        const s = cuts[k], e = cuts[k + 1];
        if ((e - s) * hop < minLen) { if (out.length && k) out[out.length - 1].end = e * hop; continue; }
        let pk = 0; for (let i = s; i < e; i++) pk = Math.max(pk, sm[i]);
        // the onset is where this syllable first reaches 25% of its own peak
        let on = s; while (on < e && sm[on] < pk * .25) on++;
        out.push({start: Math.max(0, (on - 1) * hop), end: e * hop, peak: pk});
      }
    }
    return out.slice(0, 16);
  }

  // Pitch of a stretch of audio by normalized autocorrelation, 70–600 Hz. null when unvoiced.
  function pitchAt(x, sr, start, end) {
    const mid = (start + end) / 2, N = Math.round(.05 * sr), a = Math.max(0, Math.round(mid * sr) - (N >> 1));
    const seg = x.subarray(a, Math.min(x.length, a + N));
    if (seg.length < N * .8) return null;
    let mean = 0; for (const v of seg) mean += v; mean /= seg.length;
    const minLag = Math.floor(sr / 600), maxLag = Math.min(seg.length - 2, Math.ceil(sr / 70));
    const ac = lag => { let s = 0, e1 = 0, e2 = 0; for (let i = 0; i + lag < seg.length; i++) { const p = seg[i] - mean, q = seg[i + lag] - mean; s += p * q; e1 += p * p; e2 += q * q; } return s / Math.sqrt(e1 * e2 + 1e-12); };
    const vals = []; for (let lag = minLag; lag <= maxLag; lag++) vals.push(ac(lag));
    let best = -1, bi = 0;
    // first strong peak, so we don't jump an octave down
    let gmax = Math.max(...vals);
    for (let i = 1; i < vals.length - 1; i++) if (vals[i] > vals[i - 1] && vals[i] >= vals[i + 1] && vals[i] > .85 * gmax) { best = vals[i]; bi = i; break; }
    if (best < .5) return null;
    const y0 = vals[bi - 1], y1 = vals[bi], y2 = vals[bi + 1], shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
    return sr / (minLag + bi + clamp(shift, -.5, .5));
  }

  // Time stretch by WSOLA: overlap-add grains, each nudged to line up with the previous one,
  // so a stretched voice keeps its pitch and doesn't phase.
  function stretch(x, factor, sr) {
    const N = 2 * Math.round(.02 * sr), Hs = N >> 1, Ha = Hs / factor, tol = Math.round(.008 * sr);
    const outLen = Math.max(1, Math.round(x.length * factor)), out = new Float32Array(outLen + N), wsum = new Float32Array(outLen + N);
    const w = new Float32Array(N); for (let i = 0; i < N; i++) w[i] = .5 - .5 * Math.cos(2 * Math.PI * i / N);
    const at = i => (i >= 0 && i < x.length ? x[i] : 0);
    let prev = 0;
    for (let k = 0, o = 0; o < outLen; k++, o += Hs) {
      const nominal = Math.round(k * Ha);
      let best = nominal;
      if (k) {
        let bc = -Infinity;
        const want = prev + Hs; // where the previous grain would have continued
        for (let d = -tol; d <= tol; d += 2) {
          const c0 = nominal + d; let c = 0;
          for (let i = 0; i < Hs; i += 2) c += at(c0 + i) * at(want + i);
          if (c > bc) { bc = c; best = c0; }
        }
      }
      for (let i = 0; i < N; i++) { out[o + i] += at(best + i) * w[i]; wsum[o + i] += w[i]; }
      prev = best;
    }
    const y = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) y[i] = wsum[i] > .05 ? out[i] / wsum[i] : 0;
    return y;
  }
  // Pitch shift, same length: stretch by the pitch ratio, then resample back.
  function pitchShift(x, sr, semis) {
    if (!semis) return Float32Array.from(x);
    const r = Math.pow(2, semis / 12), st = stretch(x, r, sr), y = new Float32Array(x.length);
    for (let i = 0; i < y.length; i++) { const p = i * r, k = Math.floor(p), f = p - k; y[i] = k + 1 < st.length ? st[k] * (1 - f) + st[k + 1] * f : 0; }
    return y;
  }

  // ---------------------------------------------------------------- demo phrases (a robot says them, record yourself for the real thing)
  // syllable: [vowel or formants, length s, pitch Hz, consonant: 't'|'n'|'p'|'s'|'m'|'' ]
  const DEMOS = [
    {name: 'Robot: "turn it up"', words: 'turn it up', syl: [[[500, 1350, 1700], .26, 150, 't'], ['i', .14, 165, 'n'], [[620, 1180, 2400], .3, 140, 'p']]},
    {name: 'Robot: "let me see you move"', words: 'let me see you move', syl: [['e', .16, 160, 'l'], ['i', .14, 170, 'm'], ['i', .2, 180, 's'], ['u', .2, 165, ''], ['u', .34, 150, 'm']]},
    {name: 'Robot: "all night long"', words: 'all night long', syl: [['o', .24, 140, ''], [[700, 1200, 2600], .24, 155, 'n'], ['o', .4, 130, 'l']]},
  ];
  function demoVoice(index, sr = 44100) {
    const d = DEMOS[index] || DEMOS[0], gap = .07;
    const total = d.syl.reduce((s, x) => s + x[1] + gap, .12);
    const x = new Float32Array(Math.ceil(total * sr));
    const r = OT.rng(1000 + index);
    let t = .06;
    for (const [v, len, hz, cons] of d.syl) {
      const fs = Array.isArray(v) ? v : VOWELS[v].f;
      const cLen = cons ? (cons === 's' || cons === 't' || cons === 'p' ? .05 : .04) : 0;
      // consonant: a short noise burst (plosive/fricative) or a hum (nasal/liquid)
      for (let i = 0; i < cLen * sr; i++) {
        const k = Math.floor((t + i / sr) * sr); if (k >= x.length) break;
        const e = Math.sin(Math.PI * i / (cLen * sr));
        x[k] += 'tps'.includes(cons) ? (r() * 2 - 1) * .18 * e : Math.sin(2 * Math.PI * hz * i / sr) * .25 * e;
      }
      t += cLen;
      // vowel: a glottal pulse train through three resonators
      const res = fs.map((f, j) => ({f, bw: 80 + j * 60, y1: 0, y2: 0, g: [1, .6, .3][j]}));
      res.forEach(q => { const R = Math.exp(-Math.PI * q.bw / sr); q.a1 = 2 * R * Math.cos(2 * Math.PI * q.f / sr); q.a2 = -R * R; q.b0 = 1 - R; });
      let ph = 0;
      const nLen = Math.floor(len * sr);
      for (let i = 0; i < nLen; i++) {
        const k = Math.floor(t * sr) + i; if (k >= x.length) break;
        const f0 = hz * (1 - .12 * i / nLen); ph += f0 / sr;
        let src = 0; if (ph >= 1) { ph -= 1; src = 1; }
        let y = 0;
        for (const q of res) { const o = q.b0 * src + q.a1 * q.y1 + q.a2 * q.y2; q.y2 = q.y1; q.y1 = o; y += o * q.g; }
        const env = Math.min(1, i / (.015 * sr)) * Math.min(1, (nLen - i) / (.04 * sr));
        x[k] += y * env * 3;
      }
      t += len + gap;
    }
    let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
    for (let i = 0; i < x.length; i++) x[i] = x[i] / (pk || 1) * .8;
    return {samples: x, sr, name: d.name, words: d.words, expected: d.syl.length};
  }

  // ---------------------------------------------------------------- hook treatments
  // A hook is {syl:[{start,end,hz}], length (s), bpm}. Each treatment returns events over a 2-bar (8 beat) loop:
  // {t, d (beats), src (syllable index, -1 = whole phrase), semis, gain, rev, fx}
  const TREATMENTS = [
    {id: 'straight', name: 'Straight up', text: 'Your phrase as you said it, each syllable snapped to the nearest 16th, entering on the first offbeat.'},
    {id: 'mantra', name: 'Mantra low', text: 'The whole phrase five semitones down, same length, driven. Repeated every bar until it becomes a chant.'},
    {id: 'chipmunk', name: 'Chipmunk chop', text: 'Up a fifth and cut into 16th slices that cycle through your syllables on a syncopated grid.'},
    {id: 'stutter', name: 'Stutter in', text: 'The first syllable three times on 16ths, then the phrase: "t-t-turn it up".'},
    {id: 'tuned', name: 'Tuned chop', text: 'Every syllable pitched to a note of the key (root, flat seven, fifth, octave) and placed on dotted 8ths.'},
    {id: 'phone', name: 'Phone throw', text: 'Band-passed like a phone call, with the last syllable thrown into three fading echoes.'},
    {id: 'call', name: 'Call & response', text: 'The phrase in bar one only. Bar two is silent so the bass can answer it.'},
    {id: 'reverse', name: 'Reverse swell', text: 'The last syllable reversed and swelling into the downbeat, then the phrase.'},
  ];

  const q16 = b => Math.round(b * 4) / 4;
  function natural(hook, entry = .5, limit = 8) {
    const spb = 60 / hook.bpm, s0 = hook.syl[0]?.start || 0, ev = [];
    let last = -1;
    hook.syl.forEach((s, i) => {
      let t = entry + q16((s.start - s0) / spb);
      if (t <= last) t = last + .25;
      last = t;
      if (t < limit) ev.push({t, src: i, semis: 0, gain: 1, rev: false, fx: ''});
    });
    ev.forEach((e, i) => { const len = (hook.syl[e.src].end - hook.syl[e.src].start) / spb, next = ev[i + 1] ? ev[i + 1].t : limit; e.d = Math.max(.1, Math.min(len, next - e.t, limit - e.t)); });
    return ev;
  }
  const phraseBeats = hook => { const s = hook.syl; return s.length ? (s[s.length - 1].end - s[0].start) * hook.bpm / 60 : 0; };
  // groove fit: average distance (ms) the 16th snap moved each syllable
  function grooveFit(hook) {
    const spb = 60 / hook.bpm, s0 = hook.syl[0]?.start || 0;
    if (!hook.syl.length) return 0;
    return hook.syl.reduce((a, s) => { const b = (s.start - s0) / spb; return a + Math.abs(b - q16(b)) * spb * 1000; }, 0) / hook.syl.length;
  }

  function treat(hook, id, {key = 9} = {}) {
    const L = 8, syl = hook.syl;
    if (!syl.length) return [];
    const pb = phraseBeats(hook), spb = 60 / hook.bpm;
    const repeat = (ev, every) => { const out = []; for (let o = 0; o < L; o += every) for (const e of ev) if (e.t + o < L) out.push({...e, t: e.t + o, d: Math.min(e.d, L - e.t - o)}); return out; };
    const lenOf = i => (syl[i].end - syl[i].start) / spb;
    switch (id) {
      case 'straight': return pb <= 3.4 ? repeat(natural(hook, .5, 4), 4) : natural(hook, .5, L);
      case 'mantra': { const d = Math.min(pb, 3.5); return repeat([{t: .5, d, src: -1, semis: -5, gain: 1, rev: false, fx: 'drive'}], 4); }
      case 'chipmunk': {
        const grid = [2, 3, 6, 10, 11, 14, 18, 19, 22, 26, 27, 30];
        return grid.map((s, k) => ({t: s / 4, d: Math.min(.25, lenOf(k % syl.length)), src: k % syl.length, semis: 7, gain: s % 4 === 2 ? 1 : .8, rev: false, fx: ''}));
      }
      case 'stutter': {
        const first = [.5, .75, 1].map((t, k) => ({t, d: Math.min(.22, lenOf(0)), src: 0, semis: 0, gain: .7 + .1 * k, rev: false, fx: ''}));
        return first.concat(natural(hook, 1.25, L));
      }
      case 'tuned': {
        const tonic = 440 * Math.pow(2, (mod(key - 9, 12)) / 12);
        const melody = [0, 10, 7, 12, 3];
        const ev = [];
        for (let k = 0, t = .5; t < L - .2; k++, t += .75) {
          const i = k % syl.length, hz = syl[i].hz;
          let semis = 0;
          if (hz) {
            const target = tonic * Math.pow(2, melody[k % melody.length] / 12);
            const raw = 12 * Math.log2(target / hz);
            semis = Math.round(raw - 12 * Math.round(raw / 12)); // nearest octave of the target note
          }
          ev.push({t, d: Math.min(.7, lenOf(i)), src: i, semis, gain: 1, rev: false, fx: ''});
        }
        return ev;
      }
      case 'phone': {
        const ev = natural(hook, .5, 6).map(e => ({...e, fx: 'phone'}));
        const last = ev[ev.length - 1];
        if (last) [.75, 1.5, 2.25].forEach((o, k) => { if (last.t + o < L) ev.push({...last, t: last.t + o, d: Math.min(last.d, L - last.t - o), gain: [.5, .3, .18][k], fx: 'phone dark'}); });
        return ev;
      }
      case 'call': return natural(hook, .5, 4);
      case 'reverse': {
        const i = syl.length - 1, d = Math.min(1, lenOf(i));
        return [{t: L - d, d, src: i, semis: 0, gain: .8, rev: true, fx: ''}].concat(natural(hook, 0, L - d));
      }
    }
    return [];
  }

  // vocal events across the whole phrase (the 2-bar treatment repeated)
  function vocalLane(hook, bars) {
    const ev = hook.events || [];
    const out = [];
    for (let o = 0; o < bars * 4; o += 8) for (const e of ev) if (e.t + o < bars * 4) out.push({...e, t: e.t + o});
    return out;
  }

  // ---------------------------------------------------------------- MIDI
  const DRUM_NOTE = {kick: 36, clap: 39, hat: 46, closed: 42, shaker: 70, rim: 37};
  const BEND_RANGE = 12;
  function bassTrack(ph) {
    const notes = [], cc = [], pb = [];
    for (const x of ph.bass) {
      notes.push({t: x.t, d: x.d, n: x.n, v: x.v});
      cc.push({t: x.t, cc: 74, v: Math.round(x.mouth * 127)});
      const vs = (SHAPES[x.shape] || SHAPES.oo).v;
      vs.forEach((v, i) => cc.push({t: x.t + (vs.length > 1 ? x.d * i / (vs.length - 1) * .9 : 0), cc: 1, v: VOWELS[v].cc}));
      if (x.bend) {
        for (let k = 0; k <= 4; k++) pb.push({t: x.t + x.glide * k / 4, v: Math.round(8191 * clamp(x.bend * (1 - k / 4) / BEND_RANGE, -1, 1))});
      }
    }
    // a bend always returns to centre before the next note
    return {name: 'Talk bass', notes, cc, pb};
  }
  function exportMidi(state, ph, {parts = {bass: true, drums: true, vocal: true}} = {}) {
    const tracks = [];
    if (parts.bass && !state.mutes?.bass) tracks.push(bassTrack(ph));
    if (parts.drums && !state.mutes?.drums) for (const part of ['kick', 'clap', 'hat', 'closed', 'shaker', 'rim']) {
      const hs = ph.drums.filter(h => h.part === part);
      if (hs.length) tracks.push({name: part[0].toUpperCase() + part.slice(1), ch: 9, notes: hs.map(h => ({t: h.t, d: .1, n: DRUM_NOTE[part], v: h.v}))});
    }
    if (parts.vocal && ph.vocal.length && !state.mutes?.vocal) tracks.push({name: 'Vocal syllables (Drum Rack from C1)', notes: ph.vocal.map(e => ({t: e.t, d: e.d, n: 36 + Math.max(0, e.src), v: Math.round(clamp(e.gain, .1, 1) * 112)}))});
    return OT.writeMidi(tracks, {bpm: state.bpm, beats: ph.beats, name: 'Talk', markers: ph.markers});
  }

  // ---------------------------------------------------------------- state
  function defaults() {
    return {v: 1, bpm: 126, key: 9, bars: 16, study: 0, seed: 1, swing: 56, gate: 80, mouth: 55, drive: 45, sub: 70, kit: 'floor',
      moves: {open: true, swap: true, gap: false, ghost: true, drop: true, lift: false, shift: true, talk2x: false},
      room: true, treatment: 'call', split: 50, demo: 0, mutes: {bass: false, drums: false, vocal: false}};
  }
  function validate(s) {
    if (!s || typeof s !== 'object') throw Error('Not a Talk session.');
    const d = defaults(), out = {...d};
    const num = (k, a, b, int) => { if (s[k] == null) return; const v = Number(s[k]); if (!Number.isFinite(v) || v < a || v > b || (int && !Number.isInteger(v))) throw Error('Invalid ' + k + '.'); out[k] = v; };
    num('bpm', 100, 140); num('key', 0, 11, true); num('study', -1, STUDIES.length - 1, true); num('seed', 1, 1e6, true);
    num('swing', 50, 70); num('gate', 30, 100); num('mouth', 0, 100); num('drive', 0, 100); num('sub', 0, 100); num('split', 0, 100); num('demo', 0, DEMOS.length - 1, true);
    if (s.bars != null) { if (![8, 16, 32].includes(s.bars)) throw Error('Invalid bars.'); out.bars = s.bars; }
    if (s.kit != null) { if (!KITS[s.kit]) throw Error('Invalid kit.'); out.kit = s.kit; }
    if (s.treatment != null) { if (!TREATMENTS.some(t => t.id === s.treatment)) throw Error('Invalid treatment.'); out.treatment = s.treatment; }
    if (s.room != null) out.room = !!s.room;
    for (const group of ['moves', 'mutes']) if (s[group] != null) {
      if (typeof s[group] !== 'object') throw Error('Invalid ' + group + '.');
      out[group] = {...d[group]};
      for (const k of Object.keys(s[group])) { if (!Object.prototype.hasOwnProperty.call(d[group], k)) throw Error('Unknown ' + group + ' entry.'); out[group][k] = !!s[group][k]; }
    }
    return out;
  }
  const loopFor = state => state.study >= 0 ? STUDIES[state.study] : generate(state.seed);

  return {STEPS, KICK, VOWELS, SHAPES, TALK, isTalk, STUDIES, MOVES, KITS, TREATMENTS, DEMOS, DRUM_NOTE, BEND_RANGE,
    checkLoop, generate, phrase, drums, rootMidi, swingT, envelope, stretch, syllables, pitchAt, pitchShift, demoVoice,
    treat, natural, grooveFit, phraseBeats, vocalLane, exportMidi, bassTrack, defaults, validate, loopFor};
})();
