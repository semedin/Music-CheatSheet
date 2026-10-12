import assert from 'node:assert/strict';
import {load} from './load.mjs';

// Orbit's engine against answers worked out by hand, and the bank against its own genres.
//   node arp-src/test.mjs
const {OT, OB, OE} = load();
let checks = 0;
function check(name, fn) { const t = Date.now(); fn(); checks++; console.log(`PASS ${name} (${Date.now() - t} ms)`); }
const near = (v, want, tol, what) => assert(Math.abs(v - want) <= tol, `${what}: got ${v}, want ${want} ± ${tol}`);
const base = (o = {}) => OE.normalize(Object.assign({genre: 'tech-house', key: 9, scale: 'minor', prog: 'i', bpm: 126, swing: 50, evo: 'none', fill: 'none', human: 0}, o));
const four = st => OE.render(st, {bars: 4, evo: false, fills: false, mutate: false});

// ---- theory ----
check('Progressions: roman numerals follow the scale, chord symbols parse, bad tokens are named', () => {
  assert.deepEqual(OT.parseProgression('i VI III VII', 9, 'minor').chords.map(c => c.name), ['Am', 'F', 'C', 'G']);
  assert.deepEqual(OT.parseProgression('i7 IV', 7, 'dorian').chords.map(c => c.name), ['Gm7', 'C']);
  assert.deepEqual(OT.parseProgression('Am7 Fmaj7 C G:2 bVII7 iv9', 9, 'minor').chords.map(c => c.name + ':' + c.len), ['Am7:1', 'Fmaj7:1', 'C:1', 'G:2', 'G7:1', 'Dm9:1']);
  assert.deepEqual(OT.parseProgression('i bII', 4, 'phrygian').chords.map(c => c.name), ['Em', 'F']);
  assert.deepEqual(OT.parseProgression('i bVI bVII', 9, 'minor').chords.map(c => c.name), ['Am', 'F', 'G']);
  const bad = OT.parseProgression('Xm7 Iq', 9, 'minor');
  assert.equal(bad.chords.length, 0); assert.equal(bad.errors.length, 2);
});
check('Names and Camelot: C3 = MIDI 60 as in Live, A minor = 8A, C major = 8B, F minor = 4A', () => {
  assert.equal(OT.noteName(60), 'C3'); assert.equal(OT.noteName(69), 'A3');
  assert.equal(OT.camelot(9, 'minor'), '8A'); assert.equal(OT.camelot(0, 'major'), '8B'); assert.equal(OT.camelot(5, 'minor'), '4A');
  near(OT.hz(69), 440, 1e-9, 'A3');
});
check('Voice leading: i–VI–III–VII moves fewer semitones voice-led than in root position', () => {
  const led = OE.harmony(base({prog: 'i VI III VII', reg: 64})), root = OE.harmony(base({prog: 'i VI III VII', reg: 64, voicing: 'root'}));
  const cost = h => h.chords.reduce((s, c, i) => s + OT.movement(c.notes, h.chords[(i + 1) % h.chords.length].notes), 0);
  assert(cost(led) < cost(root) * 0.7, `voice-led ${cost(led)} vs root ${cost(root)}`);
  for (const c of led.chords) { const mean = c.notes.reduce((a, b) => a + b, 0) / c.notes.length; near(mean, 64, 7, 'register of ' + c.name); }
});
check('Key detection: an A minor progression reads as A minor, a C major one as C major', () => {
  const am = [57, 60, 64].map(n => ({t: 0, d: 4, n})).concat([53, 57, 60].map(n => ({t: 4, d: 4, n})), [52, 55, 59].map(n => ({t: 8, d: 4, n})), [57, 60, 64].map(n => ({t: 12, d: 4, n})));
  assert.deepEqual([OT.detectKey(am).key, OT.detectKey(am).scale], [9, 'minor']);
  const cm = [60, 64, 67].map(n => ({t: 0, d: 4, n})).concat([65, 69, 72].map(n => ({t: 4, d: 4, n})), [67, 71, 74].map(n => ({t: 8, d: 4, n})), [60, 64, 67].map(n => ({t: 12, d: 4, n})));
  assert.deepEqual([OT.detectKey(cm).key, OT.detectKey(cm).scale], [0, 'major']);
  // the relative pair: Am7 Fmaj7 C G has C major's notes; its first chord says A minor
  const ch = (t, ns) => ns.map(n => ({t, d: 4, n}));
  const rel = [...ch(0, [57, 60, 64, 67]), ...ch(4, [53, 57, 60, 64]), ...ch(8, [48, 55, 64]), ...ch(12, [55, 59, 62])];
  const k = OT.detectKey(rel, OT.chordsFromNotes(rel).chords[0]);
  assert.deepEqual([k.key, k.scale], [9, 'minor']);
  const k2 = OT.detectKey(cm, OT.chordsFromNotes(cm).chords[0]);
  assert.deepEqual([k2.key, k2.scale], [0, 'major']);
});
check('Chord import: Am7 Fmaj7 C G(2 beats) Em(2 beats) found with their lengths and own voicings', () => {
  const ch = (t, d, ns) => ns.map(n => ({t, d, n, v: 100}));
  const notes = [...ch(0, 4, [57, 60, 64, 67]), ...ch(4, 4, [53, 57, 60, 64]), ...ch(8, 4, [48, 55, 64]), ...ch(12, 2, [55, 59, 62]), ...ch(14, 2, [52, 55, 59])];
  const {chords, beats} = OT.chordsFromNotes(notes);
  assert.equal(beats, 16);
  assert.deepEqual(chords.map(c => OT.chordName(c.root, c.q, 9, 'minor') + '@' + c.t + '/' + c.d), ['Am7@0/4', 'Fmaj7@4/4', 'C@8/4', 'G@12/2', 'Em@14/2']);
  assert.deepEqual(chords[2].notes, [48, 55, 64], 'the open C voicing is kept');
  // imported chords keep their shape in the arp, moved whole octaves to the register
  const st = base({imported: {chords, beats, key: 9, scale: 'minor', name: 't'}, reg: 64});
  const h = OE.harmony(st);
  assert.deepEqual(h.chords[2].notes.map(n => n - h.chords[2].notes[0]), [0, 7, 16]);
});
check('MIDI: write → read keeps every note, the tempo and the track names; drums on channel 10', () => {
  const notes = [{t: 0, d: 0.25, n: 60, v: 100}, {t: 0.5, d: 0.5, n: 67, v: 90}, {t: 3.75, d: 0.25, n: 72, v: 127}];
  const bytes = OT.writeMidi([{name: 'Lead', ch: 0, notes, cc: [{t: 0, cc: 74, v: 10}, {t: 2, cc: 74, v: 100}]}, {name: 'Drums', ch: 9, notes: [{t: 0, d: 0.1, n: 36, v: 110}]}], {bpm: 124, beats: 4});
  const m = OT.readMidi(bytes);
  near(m.bpm, 124, 0.01, 'tempo');
  const lead = m.tracks.find(t => t.name === 'Lead');
  assert.deepEqual(lead.notes.map(n => [n.t, n.n, n.v, +n.d.toFixed(4)]), notes.map(n => [n.t, n.n, n.v, n.d]));
  assert.deepEqual(lead.cc.map(c => [c.t, c.cc, c.v]), [[0, 74, 10], [2, 74, 100]]);
  assert(m.tracks.find(t => t.name === 'Drums').drums);
});

// ---- the engine ----
check('Cycle counter: 3 notes over 8 hits → 3 bars; 5 steps × 3 notes → 15 bars; restart every bar → 1', () => {
  assert.equal(OE.cycle(base({steps: '..xx..xx..xx..xx', pool: 'triad', reset: 'never'})).bars, 3);
  assert.equal(OE.cycle(base({steps: '..x.x', pool: 'triad', reset: 'never'})).bars, 15);
  assert.equal(OE.cycle(base({steps: '..x.x', pool: 'triad', reset: 'bar'})).bars, 5);
  assert.equal(OE.cycle(base({steps: '..xx..xx..xx..xx', pool: 'triad', reset: 'bar'})).bars, 1);
  assert.equal(OE.cycle(base({steps: 'x..', pool: 'triad', reset: 'never', advance: 'step'})).bars, 3);
  assert(OE.cycle(base({order: 'random'})).random);
});
check('Render: notes follow the pool and the order; the cycle carries across rests; reset restarts it', () => {
  const st = base({steps: 'x.x.x.x.x.x.x.x.', pool: 'triad', order: 'up', reset: 'never', reg: 64});
  const R = four(st), pool = R.pools[0].base;
  assert.deepEqual(R.events.slice(0, 6).map(e => e.n), [pool[0], pool[1], pool[2], pool[0], pool[1], pool[2]]);
  const R2 = four(base({steps: 'x.x.x.x.x.x.x.x.', pool: 'triad', order: 'up', reset: 'bar', reg: 64}));
  assert.equal(R2.events[8].n, pool[0], 'bar 2 restarts the cycle');
  const R3 = four(base({steps: 'xxxx', pool: 'triad', order: 'up', reset: 'never', advance: 'step', reg: 64}));
  assert.equal(R3.events.length, 64);
});
check('Step types: accents, octaves, chord hits, pedal notes, ties, ratchets and slides', () => {
  const st = base({steps: 'Xo.cp-r.s.x.....', pool: 'triad', order: 'up', reset: 'bar', reg: 64, vel: 90, accent: 30});
  const R = OE.render(st, {bars: 1, evo: false}), ev = R.events, P = R.pools[0];
  assert.equal(ev[0].v, 120, 'accent velocity');
  assert.equal(ev[1].n, P.base[1] + 12, 'octave up');
  const chord = ev.filter(e => e.kind === 'chord');
  assert.deepEqual(chord.map(e => e.n), P.chordNotes, 'a chord hit plays the voicing');
  const ped = ev.find(e => e.kind === 'pedal'); assert.equal(ped.n, P.base[0]);
  near(ped.d, 0.25 * 2 - 0.25 * 0.08 - 0, 0.03, 'the tie extends the pedal through the next step');
  const rat = ev.filter(e => Math.abs(e.gt - 1.5) < 1e-6 || Math.abs(e.gt - 1.625) < 1e-6); assert.equal(rat.length, 2, 'ratchet = two 32nds');
  const sl = ev.find(e => e.slide), nx = ev.find(e => e.glideFrom != null);
  assert(sl && nx && nx.glideFrom === sl.n && sl.t + sl.d > nx.t, 'a slide overlaps the next note, which glides from it');
});
check('Swing: 57% moves both off-16ths of each beat 0.035 beats late and leaves the 8ths alone', () => {
  const R = four(base({steps: 'xxxx', swing: 57}));
  near(R.events[1].t - R.events[1].gt, 0.035, 1e-9, 'off-16th'); near(R.events[2].t, 0.5, 1e-9, 'the 8th');
  near(R.events[3].t - R.events[3].gt, 0.035, 1e-9, 'the last 16th of the beat swings too');
  near(R.events[4].t, 1, 1e-9, 'the next beat');
});
check('Measurements: full 16ths 0% syncopated, off-beat 8ths 100%, quarter notes 100% kick clash', () => {
  const m = st => OE.metrics(four(base(st)));
  assert.equal(m({steps: 'xxxxxxxxxxxxxxxx'}).sync, 0);
  assert.equal(m({steps: '..x...x...x...x.'}).sync, 1);
  assert.equal(m({steps: 'x...x...x...x...'}).kick, 1);
  assert.equal(m({steps: '..x...x...x...x.'}).kick, 0);
  near(m({steps: 'x...', gate: 0.5}).length, 0.5, 1e-9, 'length in 16ths');
  near(m({steps: 'xxxxxxxxxxxxxxxx'}).density, 16, 1e-9, 'density');
});
check('Evolution: lanes interpolate, periodic lanes repeat, step lanes step; MIDI carries them as CC74', () => {
  const st = base({evo: 'slow-open', cut: 0.5});
  near(OE.evoAt(st, 0, 32).cut, 0.08, 1e-9, 'start'); near(OE.evoAt(st, 32, 32).cut, 0.82, 1e-9, 'end');
  const br = base({evo: 'breathe', cut: 0.5});
  near(OE.evoAt(br, 0, 64).cut, OE.evoAt(br, 16, 64).cut, 1e-9, 'period of 4 bars');
  assert.equal(OE.evoAt(base({evo: 'afterlife'}), 100, 256).oct, 0); assert.equal(OE.evoAt(base({evo: 'afterlife'}), 140, 256).oct, 1);
  const m = OT.readMidi(OE.exportMidi(base({evo: 'slow-open', bars: 8}), {bars: 8}));
  const cc = m.tracks.find(t => t.name === 'Orbit Arp').cc.filter(c => c.cc === 74);
  assert(cc.length > 20 && cc[0].v < cc[cc.length - 1].v, 'rising CC74');
});
check('Fills and mutation: drop silences the last beat; mutation changes exactly one note in odd blocks', () => {
  const st = base({steps: 'xxxxxxxxxxxxxxxx', fill: 'drop', fillEvery: 4, bars: 4});
  const R = OE.render(st);
  assert.equal(R.events.filter(e => e.gt >= 15 && e.gt < 16).length, 0);
  assert.equal(R.events.filter(e => e.gt >= 11 && e.gt < 12).length, 4);
  const mu = OE.render(base({steps: 'x.x.x.x.x.x.x.x.', order: 'seq', seq: [0, 1, 2, 3], pool: 'scale', mutate: 2, bars: 4, reset: 'bar'}));
  const bar = b => mu.events.filter(e => e.bar === b).map(e => e.n).join(',');
  assert.equal(bar(0), bar(1)); assert.notEqual(bar(0), bar(2)); assert.equal(bar(2), bar(3));
});

// ---- the bank ----
check(`Bank: ${OB.PATTERNS.length} patterns, unique ids, every step string valid, every sound and progression known`, () => {
  assert(OB.PATTERNS.length >= 120);
  assert.equal(new Set(OB.PATTERNS.map(p => p.id)).size, OB.PATTERNS.length);
  assert(OB.PATTERNS.filter(p => p.genre === 'tech-house').length >= 40, 'tech house is the deep end');
  for (const p of OB.PATTERNS) {
    OE.parseSteps(p.steps);
    assert(OB.SOUNDS_BY_ID[p.sound], p.id + ' sound');
    assert(OB.GENRES[p.genre], p.id + ' genre');
    const st = OB.stateFor(p);
    assert.equal(OT.parseProgression(st.prog, st.key, st.scale).errors.length, 0, p.id + ' progression');
    assert(p.why && p.why.length > 30, p.id + ' explains itself');
  }
  for (const g of Object.values(OB.GENRES)) for (const q of g.progs) assert.equal(OT.parseProgression(q.p, OT.pcOf(g.key), g.scale).errors.length, 0, g.name + ' ' + q.p);
});
check('Bank vs fingerprint: every pattern sits inside its own genre on every axis', () => {
  const out = [];
  for (const p of OB.PATTERNS) {
    const st = OE.normalize(OB.stateFor(p)), f = OE.fit(OE.metrics(four(st)), OB.GENRES[p.genre].target);
    const bad = f.axes.filter(a => !a.ok);
    if (bad.length) out.push(`${p.id}: ${bad.map(a => `${a.id}=${(+a.v).toFixed(2)} [${a.lo}, ${a.hi}]`).join(' ')}`);
  }
  assert.equal(out.length, 0, out.join('\n'));
});
check('Bank vs key: every note is in the scale or in the chord under it', () => {
  for (const p of OB.PATTERNS) {
    const st = OE.normalize(OB.stateFor(p)), R = OE.render(st, {bars: 4}), sc = OT.SCALES[st.scale].st;
    for (const e of R.events) {
      const ch = R.harmony.chords[e.ci], inChord = ch.iv.some(i => OT.mod(ch.root + i - e.n, 12) === 0);
      assert(sc.includes(OT.mod(e.n - st.key, 12)) || inChord, `${p.id}: ${OT.noteName(e.n)} over ${ch.name}`);
    }
  }
});
check('Bank vs register: no arp outside the piano, and only the acid genre lives under 165 Hz', () => {
  for (const p of OB.PATTERNS) {
    const st = OE.normalize(OB.stateFor(p)), m = OE.metrics(four(st));
    assert(m.lowest >= 36 && m.highest <= 96, p.id + ' range');
    if (!OB.GENRES[p.genre].lowOk) assert(m.low <= 0.2, `${p.id}: ${Math.round(m.low * 100)}% under 165 Hz`);
  }
});
check('Sounds: every patch has a Serum 2 and an Ableton recipe and valid synth settings', () => {
  assert(OB.SOUNDS.length >= 18);
  for (const s of OB.SOUNDS) {
    assert(s.serum.length >= 3 && s.live.length >= 2, s.id + ' recipes');
    assert(s.osc.length && s.filter && s.amp && s.level > 0, s.id + ' synth');
    for (const o of s.osc) assert(['saw', 'square', 'sine', 'triangle', 'organ', 'hollow', 'pulse25'].includes(o.wave), s.id + ' wave ' + o.wave);
  }
});
check('Rules: every rule has a base in the bank, and its A and B really differ', () => {
  assert.equal(OB.RULES.length, 12);
  for (const r of OB.RULES) {
    const b = OB.BY_ID[r.base]; assert(b, r.id + ' base');
    const A = OE.normalize(Object.assign(OB.stateFor(b), r.A.patch)), B = OE.normalize(Object.assign(OB.stateFor(b), r.B.patch));
    assert.notEqual(OE.pack(A), OE.pack(B), r.id);
  }
});

// ---- the generator, fixes and translations ----
check('Generator: eight combos per genre, all fitting (≥ 95), no two rhythms alike, the same seed gives the same eight', () => {
  for (const g of Object.keys(OB.GENRES)) {
    const a = OE.find(g, 8, 7), b = OE.find(g, 8, 7);
    assert.equal(a.length, 8, g);
    assert(a.every(c => c.fit >= 95), g + ': ' + a.map(c => c.fit));
    assert.equal(new Set(a.map(c => OE.stepsString(c.st.steps))).size, 8, g + ' distinct');
    assert.deepEqual(a.map(c => OE.pack(c.st)), b.map(c => OE.pack(c.st)), g + ' deterministic');
    if (!OB.GENRES[g].lowOk) assert(a.filter(c => c.m.low > 0.2).length <= 1, g + ': candidates in the bass range');
    for (const c of a) if (c.st.steps.some(s => s.type === 'chord')) assert(!['acid-303', 'perc-bleep', 'sub-pulse', 'log-drum', 'vox-chop', 'rubber-stab', 'kalimba'].includes(c.st.sound), g + ' chords on a mono sound');
  }
});
check('Generator keeps what you ask: key, tempo, chords and sound', () => {
  const keep = {key: 2, scale: 'dorian', bpm: 124, prog: 'i7 IV', sound: 'rhodes'};
  for (const c of OE.find('deep', 8, 3, keep)) { assert.equal(c.st.key, 2); assert.equal(c.st.scale, 'dorian'); assert.equal(c.st.bpm, 124); assert.equal(c.st.prog, 'i7 IV'); assert.equal(c.st.sound, 'rhodes'); }
});
check('Variations: eight, all different from the original and from each other, harmony and sound unchanged', () => {
  const st = OE.normalize(OB.stateFor(OB.BY_ID['tech-house-organ-bounce']));
  const v = OE.vary(st, 8, 1);
  assert.equal(v.length, 8);
  assert.equal(new Set(v.map(x => OE.signature(x.st))).size, 8);
  for (const x of v) { assert.equal(x.st.prog, st.prog); assert.equal(x.st.sound, st.sound); assert.equal(x.st.key, st.key); }
});
check('Fixes: a riff stuck on the kick gets an edit that moves it off, and the edit really raises the fit', () => {
  const bad = OE.normalize(Object.assign(OB.stateFor(OB.BY_ID['tech-house-organ-bounce']), {steps: 'x...x...x..x.x..'}));
  const before = OE.fit(OE.metrics(four(bad)), OB.GENRES['tech-house'].target).score;
  const s = OE.suggestions(bad);
  assert(s.length >= 1);
  const after = OE.fit(OE.metrics(four(OE.normalize(Object.assign({}, bad, s[0].patch)))), OB.GENRES['tech-house'].target).score;
  assert(after > before, `${before} → ${after}`);
  assert.equal(OE.suggestions(OE.normalize(OB.stateFor(OB.BY_ID['tech-house-organ-bounce']))).length, 0, 'nothing to fix on a fitting pattern');
});
check('Ableton Arpeggiator: plain up 16ths are exact; rests and accents send you to the MIDI export', () => {
  const ex = OE.liveArp(OB.stateFor(OB.BY_ID['trance-uplifter']));
  assert.equal(ex.verdict, 'exact');
  assert.deepEqual(Object.fromEntries(ex.settings).Style, 'Up');
  assert.equal(OE.liveArp(OB.stateFor(OB.BY_ID['tech-house-organ-bounce'])).verdict, 'midi');
  near(OE.delayTable(120).find(d => d.n === '1/8').ms, 250, 1e-9, 'an 8th at 120');
});
check('Export: full sketch has five tracks, the arp matches the render, bytes are deterministic, share links round-trip', () => {
  const st = OE.normalize(OB.stateFor(OB.BY_ID['melodic-techno-afterlife-sequence']));
  const bytes = OE.exportMidi(st, {bars: 8, parts: {arp: true, chords: true, input: true, bass: true, drums: true}});
  const m = OT.readMidi(bytes);
  assert.deepEqual(m.tracks.filter(t => t.notes.length).map(t => t.name), ['Orbit Arp', 'Chords', 'Arp input (for Live\'s Arpeggiator)', 'Bass', 'Drums']);
  assert.equal(m.tracks.find(t => t.name === 'Orbit Arp').notes.length, OE.render(st, {bars: 8}).events.length);
  assert.deepEqual(bytes, OE.exportMidi(st, {bars: 8, parts: {arp: true, chords: true, input: true, bass: true, drums: true}}));
  const back = OE.unpack(OE.pack(st));
  assert.equal(OE.pack(back), OE.pack(st));
  assert.equal(OE.stepsString(back.steps), OE.stepsString(st.steps));
  assert.match(OE.fileStem(st), /^Orbit_Afterlife-sequence_Am_124bpm$/);
  const z = OT.zip([{name: 'a.mid', bytes}, {name: 'b.txt', bytes: new TextEncoder().encode('hi')}]);
  assert.deepEqual([z[0], z[1], z[2], z[3]], [80, 75, 3, 4]);
});

console.log(`\n${checks} checks passed`);
