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
check('Bank vs fingerprint: every pattern sits inside its own genre, for the section it is written for, on every axis', () => {
  const out = [];
  for (const p of OB.PATTERNS) {
    const st = OE.normalize(OB.stateFor(p)), f = OE.sectionFit(st, OE.metrics(four(st))).fit;
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
check('Sounds: every patch has a Serum 2 and an Ableton recipe, a length, sections, an energy and valid synth settings', () => {
  assert(OB.SOUNDS.length >= 36);
  assert.equal(new Set(OB.SOUNDS.map(x => x.id)).size, OB.SOUNDS.length);
  for (const len of ['short', 'medium', 'long']) assert(OB.SOUNDS.filter(x => x.len === len).length >= 10, len);
  for (const x of OB.SOUNDS) { assert(['short', 'medium', 'long'].includes(x.len) && x.roles.length && x.roles.every(r => OE.ROLES[r]) && x.energy >= 0 && x.energy <= 1, x.id + ' tags'); }
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

// ---- the outside-the-box tools ----
check('New scales: Phrygian dominant, Hungarian minor, double harmonic, melodic minor and Locrian parse and pool correctly', () => {
  assert.deepEqual(OT.parseProgression('I II iv', 4, 'phrygdom').chords.map(c => c.name), ['E', 'F', 'Am']);
  assert.equal(OE.harmony(base({scale: 'locrian', prog: 'i'})).chords[0].name, 'Am');
  for (const sc of ['melodic', 'phrygdom', 'hungarian', 'dharmonic', 'locrian']) {
    const st = base({scale: sc, pool: 'penta', steps: 'xxxxxxxxxxxxxxxx', order: 'up', octaves: 2});
    for (const e of four(st).events) assert(OT.SCALES[sc].st.includes(OT.mod(e.n - 9, 12)), `${sc}: ${OT.noteName(e.n)}`);
  }
});
check('New pools: stacked 4ths are a fourth apart in the scale, the cluster rubs, the open voicing spreads the chord', () => {
  const p = pool => OE.render(base({pool, steps: 'x', reg: 64}), {bars: 1}).pools[0].base;
  assert.deepEqual(p('quartal').map(n => n - p('quartal')[0]), [0, 5, 10, 15]);
  assert.deepEqual(p('cluster').map(n => n - p('cluster')[0]), [0, 2, 3, 7]);
  const closed = p('chord'), open = p('spread');
  assert(open[open.length - 1] - open[0] > closed[closed.length - 1] - closed[0] + 6, 'wider than the closed chord');
});
check('Turing order: 100% lock is a fixed loop, lower locks drift but stay deterministic', () => {
  const st = lock => base({order: 'turing', lock, tlen: 6, steps: 'x.x.x.x.x.x.x.x.', reset: 'never', seed: 4, pool: 'chord9', octaves: 2});
  const bars = R => [0, 1, 2, 3].map(b => R.events.filter(e => e.bar === b).map(e => e.n).join(','));
  const fixed = OE.render(st(1), {bars: 6});
  const notes = fixed.events.map(e => e.n);
  for (let i = 6; i < notes.length; i++) assert.equal(notes[i], notes[i - 6], 'a 6-note loop at full lock');
  assert.equal(OE.cycle(st(1)).bars, 3, '6 notes over 8 hits a bar: 3 bars');
  const loose = OE.render(st(0.3), {bars: 4});
  assert.notDeepEqual(bars(loose).slice(0, 2), bars(fixed).slice(0, 2));
  assert.deepEqual(bars(loose), bars(OE.render(st(0.3), {bars: 4})), 'same seed, same drift');
  assert(OE.cycle(st(0.3)).random);
});
check('Echo cascade: repeats at the echo time, quieter each time, climbing the scale, wrapped round the loop, exported, not fingerprinted', () => {
  const st = base({steps: 'x...............', echo: 3, echoTime: '8d', echoFb: 0.5, echoShift: 's1', vel: 100, accent: 0});
  const R = OE.render(st, {bars: 1}), ev = R.events;
  assert.deepEqual(ev.map(e => +e.t.toFixed(3)), [0, 0.75, 1.5, 2.25]);
  assert.deepEqual(ev.map(e => e.v), [100, 50, 25, 13]);
  for (let i = 1; i < 4; i++) assert.equal(ev[i].n, OE.scaleStep(st, ev[0].n, i));
  const late = OE.render(base({steps: '..............x.', echo: 2, echoTime: '8d', echoFb: 0.6}), {bars: 1});
  assert(late.events.some(e => e.echo && e.t < 1), 'an echo past the end wraps to the start');
  assert.equal(OE.metrics(R).density, 1, 'the fingerprint counts only the written note');
  assert.equal(OT.readMidi(OE.exportMidi(st, {bars: 1})).tracks.find(t => t.name === 'Orbit Arp').notes.length, 4);
});
check('Strum and feel: chord notes spread up to 80 ms in order; Drunk drags the e and the a and pushes the and', () => {
  const st = base({steps: 'C...............', prog: 'i7', strum: 1, strumDir: 'down', bpm: 120});
  const ev = OE.render(st, {bars: 1}).events.sort((a, b) => b.n - a.n);
  near(ev[ev.length - 1].t - ev[0].t, 0.08 * 2, 1e-9, 'full strum in beats at 120');
  assert(ev.every((e, i) => i === 0 || e.t > ev[i - 1].t), 'down: highest note first');
  const f = OE.render(base({steps: 'xxxx', feel: 'drunk', bpm: 120}), {bars: 1}).events;
  near((f[1].t - f[1].gt) * 500, 24, 1e-6, 'the e, ms'); near((f[2].t - f[2].gt) * 500, -10, 1e-6, 'the and, ms'); near((f[3].t - f[3].gt) * 500, 30, 1e-6, 'the a, ms');
  assert.equal(OE.metrics(OE.render(base({steps: 'xxxx', feel: 'drunk'}), {bars: 4, evo: false})).sync, 0, 'measured on the grid');
});
check('Bouncing-ball fill: the last beat plays 1, 2, 3, then 4 notes per step', () => {
  const R = OE.render(base({steps: 'xxxxxxxxxxxxxxxx', fill: 'bounce', fillEvery: 2, bars: 2}));
  const lastBeat = R.events.filter(e => e.gt >= 7 - 1e-9);
  assert.deepEqual([7, 7.25, 7.5, 7.75].map(t => lastBeat.filter(e => e.gt >= t - 1e-9 && e.gt < t + 0.25 - 1e-9).length), [1, 2, 3, 4]);
});
check('Morse: "sos" is dot-dot-dot dash-dash-dash dot-dot-dot; words get a longer gap; never longer than 64 steps', () => {
  assert.equal(OE.morse('SOS'), 'x.x.x..X-.X-.X-..x.x.x');
  assert.equal(OE.morse('e e'), 'x....x');
  assert(OE.morse('the quick brown fox jumps over the lazy dog').length <= 64);
  OE.parseSteps(OE.morse('tech house 2026'));
});
check('Riff import: rhythm, accents, ties, pitches and swing come back exactly; notes outside the scale snap', () => {
  const sw = 0.035;
  const riff = [{t: 0, d: 0.25, n: 57, v: 100}, {t: 0.75 + sw, d: 0.5, n: 60, v: 124}, {t: 1.5, d: 0.25, n: 64, v: 90}, {t: 2, d: 0.25, n: 62, v: 90}, {t: 3, d: 0.75, n: 69, v: 120}, {t: 4.5, d: 0.2, n: 61, v: 90}];
  const r = OE.riffFromNotes(riff, base({}));
  assert.equal(OE.stepsString(r.patch.steps), 'x..X-.x.x...X--...x.............');
  assert.equal(r.snapped, 1); assert.equal(r.bars, 2); assert.equal(r.swing, 57);
  const R = OE.render(OE.normalize(Object.assign(base({}), r.patch)), {bars: 2});
  assert.deepEqual(R.events.map(e => [e.gt, e.n]), [[0, 57], [0.75, 60], [1.5, 64], [2, 62], [3, 69], [4.5, 60]]);
});
check('Write it out: every order becomes the same notes as a written sequence', () => {
  for (const order of ['up', 'converge', 'pinky', 'thumb', 'updown', 'diverge']) {
    const st = base({order, pool: 'chord9', octaves: 2, steps: 'xxxxxxxxxxxxxxxx', reset: 'never'});
    const as = OE.render(st, {bars: 2}).events.map(e => e.n), written = OE.render(Object.assign({}, st, {order: 'seq', seq: OE.writeOut(st)}), {bars: 2}).events.map(e => e.n);
    assert.deepEqual(written, as, order);
  }
});
check('Chords of the key: seven per scale, named, in key; 9ths name their flat 9ths', () => {
  assert.deepEqual(OE.diatonicChords(base({}), '7th').map(c => c.name), ['Am7', 'Bm7♭5', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7']);
  assert.deepEqual(OE.diatonicChords(base({scale: 'major', key: 0}), 'triad').map(c => c.name), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  assert.equal(OE.diatonicChords(base({}), '9th')[4].name, 'Em7♭9');
  for (const c of OE.diatonicChords(base({}), '9th')) for (const n of c.notes) assert(OT.SCALES.minor.st.includes(OT.mod(n - 9, 12)));
});
check('Wild card: the generator and variations use the new tools only when asked', () => {
  const uses = st => st.echo > 0 || st.order === 'turing' || ['quartal', 'cluster', 'spread'].includes(st.pool) || st.feel !== 'straight' || st.strum > 0;
  assert.equal(OE.find('tech-house', 8, 5).filter(c => uses(c.st)).length, 0);
  assert(OE.find('tech-house', 8, 5, {wild: true}).filter(c => uses(c.st)).length >= 5);
  assert(OE.find('tech-house', 8, 5, {wild: true}).every(c => c.fit >= 90));
  const org = OB.stateFor(OB.BY_ID['tech-house-organ-bounce']);
  assert.equal(OE.vary(org, 8, 1).filter(v => uses(v.st)).length, 0);
});

// ---- sections ----
check('Sections: written breaks read as breaks, risers as builds, riffs as drops, sparse openers as intros', () => {
  const prim = id => OE.roles(OB.stateFor(OB.BY_ID[id])).primary, has = (id, r) => OE.roles(OB.stateFor(OB.BY_ID[id])).roles.includes(r);
  for (const id of ['tech-house-pad-breakdown', 'tech-house-choir-break', 'tech-house-gospel-organ-break', 'melodic-techno-shimmer-break', 'progressive-pad-swell-break', 'trance-string-breakdown', 'deep-rhodes-broken-chord', 'deep-gospel-break']) assert.equal(prim(id), 'break', id);
  for (const id of ['tech-house-string-rise', 'tech-house-noise-swell', 'tech-house-zap-fills', 'melodic-techno-drone-build', 'hard-techno-hoover-rise', 'tech-house-roll-in-stab']) assert.equal(prim(id), 'build', id);
  for (const id of ['tech-house-organ-bounce', 'tech-house-acid-roller', 'tech-house-swung-stab-roll', 'trance-euphoric-gate', 'hard-techno-hoover-anthem', 'nu-disco-clav-funk', 'tech-house-rolling-16ths']) assert.equal(prim(id), 'drop', id);
  for (const id of ['tech-house-micro-intro', 'melodic-techno-drone-intro', 'minimal-micro-plucks', 'progressive-harp-intro']) assert.equal(prim(id), 'intro', id);
  assert(has('tech-house-gate-riser', 'build'), 'the gate riser is also a build');
  const n = r => OB.PATTERNS.filter(p => OE.roles(OB.stateFor(p)).roles.includes(r)).length;
  for (const r of ['drop', 'build', 'break', 'intro']) assert(n(r) >= 20, `${r}: ${n(r)}`);
});
check('Sections: energy orders a pad break below a drop riff below a hoover anthem; reasons are given', () => {
  const r = id => OE.roles(OB.stateFor(OB.BY_ID[id]));
  assert(r('tech-house-pad-breakdown').energy < r('tech-house-organ-bounce').energy && r('tech-house-organ-bounce').energy < r('hard-techno-hoover-anthem').energy);
  assert(r('tech-house-pad-breakdown').why.break.includes('long notes'));
  assert(r('tech-house-string-rise').why.build.some(w => /Build to the drop/.test(w)));
});
check('Sections: a break may hold long notes on the beat; the drop keeps the genre fingerprint', () => {
  const t = OB.GENRES['tech-house'].target;
  assert.deepEqual(OE.roleTarget(t, 'drop'), t);
  const b = OE.roleTarget(t, 'break');
  assert(!b.kick && b.length[1] >= 16 && b.density[0] <= 1);
  const pad = OE.normalize(OB.stateFor(OB.BY_ID['tech-house-pad-breakdown'])), m = OE.metrics(four(pad));
  assert(OE.fit(m, t).score < 100, 'against the drop it does not fit');
  assert.equal(OE.sectionFit(pad, m).fit.score, 100, 'as a break it does');
});
check('Search words: "good for build", "break material", "drop material for sure", "short plucks for the intro"', () => {
  const q = x => { const r = OE.parseQuery(x); return [[...r.roles].join(','), [...r.lens].join(','), r.words.join(' ')]; };
  assert.deepEqual(q('good for build'), ['build', '', '']);
  assert.deepEqual(q('break material'), ['break', '', '']);
  assert.deepEqual(q('drop material for sure'), ['drop', '', '']);
  assert.deepEqual(q('short plucks for the intro'), ['intro', 'short', 'plucks']);
  assert.deepEqual(q('long pads for the breakdown'), ['break', 'long', '']);
  assert.deepEqual(q('acid riser'), ['build', '', 'acid']);
});
check('Generator by section: eight drop, build, break and intro ideas per genre, each tagged for its section and fitting it', () => {
  for (const g of ['tech-house', 'melodic-techno', 'trance', 'deep']) for (const role of ['drop', 'build', 'break', 'intro']) {
    const c = OE.find(g, 8, 11, {role});
    assert.equal(c.length, 8, `${g} ${role}`);
    const on = c.filter(x => x.roles.roles.includes(role)).length;
    assert(on >= 6, `${g} ${role}: ${on} of 8 tagged ${role}`);
    assert(c.every(x => x.fit >= 85), `${g} ${role}: ${c.map(x => x.fit)}`);
  }
  const br = OE.find('tech-house', 8, 3, {role: 'break'});
  assert(br.filter(x => OB.SOUNDS_BY_ID[x.st.sound].len !== 'short').length >= 5, 'breaks reach for longer sounds');
});

console.log(`\n${checks} checks passed`);
