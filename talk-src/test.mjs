// Talk engine tests. Plain Node, no install:  node talk-src/test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
vm.runInThisContext(['arp-src/theory.js', 'talk-src/engine.js'].map(p => fs.readFileSync(root + p, 'utf8')).join('\n') + '\nObject.assign(globalThis,{TK,OT});');
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const sine = (hz, secs, sr = 44100) => Float32Array.from({length: Math.round(secs * sr)}, (_, i) => .5 * Math.sin(2 * Math.PI * hz * i / sr));
const hookFor = (demo = 0, bpm = 126) => { const v = TK.demoVoice(demo); const syl = TK.syllables(v.samples, v.sr).map(s => ({...s, hz: TK.pitchAt(v.samples, v.sr, s.start, s.end)})); return {v, syl, bpm}; };

test('All fourteen studies obey the grammar: never on a kick, no overlaps, inside the loop', () => {
  assert.equal(TK.STUDIES.length, 14);
  for (const st of TK.STUDIES) { assert.deepEqual(TK.checkLoop(st.notes), [], st.name); assert(st.notes.some(n => TK.isTalk(n.shape)), st.name + ' says something'); }
});
test('The grammar check catches what it claims to', () => {
  assert(TK.checkLoop([{s: 4, l: 1, semi: 0}]).some(p => p.includes('kick')));
  assert(TK.checkLoop([{s: 2, l: 3, semi: 0}, {s: 3, l: 1, semi: 0}]).some(p => p.includes('overlap')));
  assert(TK.checkLoop([{s: 30, l: 4, semi: 0}]).some(p => p.includes('past the loop')));
});
test('2,000 generated loops follow the same grammar, deterministically', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const a = TK.generate(seed);
    assert.deepEqual(TK.checkLoop(a.notes), []);
    assert.deepEqual(a, TK.generate(seed));
  }
  assert.notDeepEqual(TK.generate(1).notes, TK.generate(2).notes);
});
test('Every study, key and phrase length: no bass note lands on a kick, bass stays in its register', () => {
  for (let i = 0; i < 14; i++) for (let key = 0; key < 12; key++) for (const bars of [8, 16, 32]) {
    const s = {...TK.defaults(), study: i, key, bars, moves: Object.fromEntries(TK.MOVES.map(m => [m.id, true]))};
    const ph = TK.phrase(s, TK.loopFor(s));
    assert.equal(ph.readout.kickHits, 0, `${TK.STUDIES[i].name} key ${key}`);
    for (const n of ph.bass) { assert(n.n >= 26 && n.n <= 55); assert(n.t >= 0 && n.t + n.d <= ph.beats + 1e-9 && n.d > 0); assert(n.mouth >= 0 && n.mouth <= 1); }
    for (let k = 1; k < ph.bass.length; k++) assert(ph.bass[k - 1].t + ph.bass[k - 1].d <= ph.bass[k].t + 1e-9, 'monophonic');
  }
});
test('Moves keep the loop alive: with none on, no bar differs; each move changes something', () => {
  const s = {...TK.defaults(), bars: 16, moves: Object.fromEntries(TK.MOVES.map(m => [m.id, false]))};
  const plain = TK.phrase(s, TK.STUDIES[0]);
  assert.equal(plain.readout.alive, 0);
  for (const m of TK.MOVES) {
    if (m.id === 'open') continue; // a CC move: the notes stay, the mouth moves
    const st = {...s, moves: {...s.moves, [m.id]: true}};
    const changed = [0, 2, 4, 8, 12].some(i => TK.phrase(st, TK.STUDIES[i]).readout.alive > 0);
    assert(changed, m.name + ' changes at least one bar');
  }
  const open = TK.phrase({...s, moves: {...s.moves, open: true}}, TK.STUDIES[0]);
  assert(open.bass[0].mouth < open.bass[open.bass.length - 1].mouth, 'the mouth opens across the phrase');
});
test('Swing moves only the odd 16ths, by the stated amount', () => {
  assert.equal(TK.swingT(2, 60), .5); assert.equal(TK.swingT(1, 50), .25); assert.equal(TK.swingT(1, 60), .3);
});
test('Syllable detector finds every syllable of the three robot phrases, onsets within 25 ms', () => {
  for (let d = 0; d < TK.DEMOS.length; d++) {
    const v = TK.demoVoice(d), syl = TK.syllables(v.samples, v.sr);
    assert.equal(syl.length, v.expected, TK.DEMOS[d].name);
    // known onsets: each syllable starts at 0.06 s plus the previous syllables, consonants and gaps
    let t = .06; const want = [];
    for (const [, len, , cons] of TK.DEMOS[d].syl) { want.push(t); t += (cons ? ('tps'.includes(cons) ? .05 : .04) : 0) + len + .07; }
    syl.forEach((s, i) => assert(Math.abs(s.start - want[i]) < .025, `${TK.DEMOS[d].name} syllable ${i + 1}: ${s.start.toFixed(3)} vs ${want[i].toFixed(3)}`));
  }
});
test('Silence has no syllables; one tone is one syllable', () => {
  assert.equal(TK.syllables(new Float32Array(44100), 44100).length, 0);
  const x = new Float32Array(44100); x.set(sine(220, .4), 8820);
  assert.equal(TK.syllables(x, 44100).length, 1);
});
test('Pitch detection is within 1% from 80 to 500 Hz and ignores noise', () => {
  for (const hz of [80, 110, 147, 220, 330, 500]) assert(Math.abs(TK.pitchAt(sine(hz, .3), 44100, 0, .3) / hz - 1) < .01, hz + ' Hz');
  const r = OT.rng(3), noise = Float32Array.from({length: 13230}, () => r() * 2 - 1);
  assert.equal(TK.pitchAt(noise, 44100, 0, .3), null);
});
test('Pitch shift keeps the length and lands within 1% of the target pitch', () => {
  const x = sine(200, .6);
  for (const semis of [-7, -5, 3, 7, 12]) {
    const y = TK.pitchShift(x, 44100, semis);
    assert.equal(y.length, x.length);
    const got = TK.pitchAt(y, 44100, .15, .45), want = 200 * 2 ** (semis / 12);
    assert(Math.abs(got / want - 1) < .01, `${semis}: ${got.toFixed(1)} vs ${want.toFixed(1)}`);
  }
});
test('Eight treatments: events stay inside two bars and reference real syllables', () => {
  for (let d = 0; d < 3; d++) for (const bpm of [118, 126, 132]) {
    const h = hookFor(d, bpm);
    for (const t of TK.TREATMENTS) {
      const ev = TK.treat(h, t.id, {key: 9});
      assert(ev.length, t.name);
      for (const e of ev) { assert(e.t >= 0 && e.d > 0 && e.t + e.d <= 8 + 1e-9, t.name); assert(e.src >= -1 && e.src < h.syl.length); assert(Math.abs(e.semis) <= 12); }
    }
  }
});
test('Natural placement snaps to 16ths and keeps the order of the syllables', () => {
  const h = hookFor(1), ev = TK.natural(h, .5, 8);
  ev.forEach((e, i) => { assert.equal(e.t * 4, Math.round(e.t * 4)); assert.equal(e.src, i); if (i) assert(e.t > ev[i - 1].t); });
  assert(TK.grooveFit(h) <= 60 / 126 / 8 * 1000 + 1e-9, 'a snap never moves a syllable more than half a 16th');
});
test('Tuned chop lands each voiced syllable on a key note', () => {
  const h = hookFor(0), key = 9, notes = [0, 10, 7, 12, 3].map(x => (x + key) % 12);
  for (const e of TK.treat(h, 'tuned', {key})) {
    const hz = h.syl[e.src].hz; if (!hz) continue;
    const midi = Math.round(69 + 12 * Math.log2(hz * 2 ** (e.semis / 12) / 440));
    assert(notes.includes(((midi % 12) + 12) % 12));
  }
});
test('Call & response leaves bar two to the bass; making room removes talking bass under the voice', () => {
  const h = hookFor(0); h.events = TK.treat(h, 'call');
  assert(h.events.every(e => e.t + e.d <= 4));
  const s = {...TK.defaults(), treatment: 'call'};
  for (let i = 0; i < 14; i++) {
    const loose = TK.phrase({...s, room: false}, TK.STUDIES[i], h), tight = TK.phrase({...s, room: true}, TK.STUDIES[i], h);
    assert(tight.readout.overlapAfter <= loose.readout.overlapBefore + 1e-9);
    assert.equal(tight.readout.overlapAfter, 0, TK.STUDIES[i].name);
    assert(tight.bass.length >= loose.bass.length * .5, 'the groove survives');
  }
});
test('MIDI round trip: notes, tempo, markers, drums on channel 10, bend and both CCs', () => {
  for (const bars of [8, 16, 32]) {
    const s = {...TK.defaults(), bars, study: 5}, h = hookFor(0); h.events = TK.treat(h, 'straight');
    const ph = TK.phrase(s, TK.loopFor(s), h), m = OT.readMidi(TK.exportMidi(s, ph));
    assert(Math.abs(m.bpm - s.bpm) < .01);
    const bass = m.tracks.find(t => t.name === 'Talk bass');
    assert.equal(bass.notes.length, ph.bass.length);
    bass.notes.forEach((n, i) => { assert.equal(n.n, ph.bass[i].n); assert(Math.abs(n.t - ph.bass[i].t) < 1 / 480); });
    assert(bass.cc.some(c => c.cc === 74) && bass.cc.some(c => c.cc === 1));
    assert(bass.pb && bass.pb.some(p => p.v > 8000) && bass.pb.some(p => p.v === 0), 'drop stabs bend an octave and return');
    const kick = m.tracks.find(t => t.name === 'Kick');
    assert(kick.drums && kick.notes.length === bars * 4 && kick.notes.every(n => n.n === 36));
    const vox = m.tracks.find(t => t.name.startsWith('Vocal'));
    assert.equal(vox.notes.length, ph.vocal.length);
    assert(vox.notes.every(n => n.n >= 36 && n.n < 36 + h.syl.length));
  }
});
test('Muted parts are left out of the MIDI', () => {
  const s = {...TK.defaults(), mutes: {bass: true, drums: false, vocal: false}}, ph = TK.phrase(s, TK.loopFor(s));
  assert(!OT.readMidi(TK.exportMidi(s, ph)).tracks.some(t => t.name === 'Talk bass'));
});
test('Session validation accepts its own output and rejects hostile or out-of-range input', () => {
  const s = TK.defaults();
  assert.deepEqual(TK.validate(JSON.parse(JSON.stringify(s))), s);
  for (const bad of [{bpm: 0}, {bpm: 'x'}, {bars: 12}, {key: 1.5}, {study: 99}, {kit: 'nope'}, {treatment: 'evil'}, {moves: {__proto__: {x: 1}, hack: true}}, {mutes: 'all'}, {swing: 90}])
    assert.throws(() => TK.validate({...s, ...bad}), JSON.stringify(bad));
  assert.throws(() => TK.validate(null));
});
test('Standalone HTML has no placeholders, unique IDs and a compilable script', () => {
  const html = fs.readFileSync(root + 'talk.html', 'utf8');
  assert(!/\/\*(STYLE|THEORY|ENGINE|AUDIO|APP)\*\//.test(html));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
});
console.log(count + ' groups passed.');
