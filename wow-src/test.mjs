// Wow engine tests. Plain Node, no install:  node wow-src/test.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const W = createRequire(import.meta.url)('./engine.js');
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const each = fn => { for (const st of W.STYLES) for (const idea of [...st.ideas, W.generate(st, 1), W.generate(st, 2), W.generate(st, 3)]) fn(st, idea); };

test('Sixteen lanes, eight house and eight techno, three written ideas each', () => {
  assert.equal(W.STYLES.length, 16);
  assert.equal(new Set(W.STYLES.map(s => s.id)).size, 16);
  for (const f of ['house', 'techno']) assert.equal(W.STYLES.filter(s => s.family === f).length, 8);
  for (const st of W.STYLES) { assert.equal(st.ideas.length, 3, st.id); assert(st.why.length >= 3 && st.recipe.length >= 4 && st.idea && st.lane, st.id); assert(st.bpm >= 118 && st.bpm <= 156, st.id); }
});
test('Every written idea obeys its lane\'s grammar', () => {
  for (const st of W.STYLES) for (const idea of st.ideas) assert.deepEqual(W.checkLoop(idea.notes, st), [], st.id + ' / ' + idea.name);
});
test('The grammar check catches what it claims to', () => {
  const kf = {kickFree: true};
  assert(W.checkLoop([{s: 4, l: 1, semi: 0}, {s: 6, l: 1, semi: 0}], kf).some(p => p.includes('kick')));
  assert(W.checkLoop([{s: 2, l: 3, semi: 0}, {s: 3, l: 1, semi: 0}], kf).some(p => p.includes('overlap')));
  assert(W.checkLoop([{s: 2, l: 1, semi: 0}, {s: 30, l: 4, semi: 0}], kf).some(p => p.includes('past the loop')));
  assert(W.checkLoop([{s: 2, l: 1, semi: 0}, {s: 6, l: 1, semi: 3, slide: true}], kf).some(p => p.includes('slide')));
  assert(W.checkLoop([{s: 2, l: 1, semi: 0}], kf).some(p => p.includes('fewer')));
});
test('Notation round-trips, and bad notation is refused', () => {
  for (const st of W.STYLES) for (const idea of st.ideas) assert.deepEqual(W.parse(W.unparse(idea.notes)), idea.notes);
  assert.throws(() => W.parse('0 . .'));
  assert.throws(() => W.parse('- ' + '. '.repeat(31)));
  assert.throws(() => W.parse('x ' + '. '.repeat(31)));
});
test('300 generated ideas per lane follow the grammar, deterministically', () => {
  for (const st of W.STYLES) {
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) { const g = W.generate(st, seed); assert.deepEqual(W.checkLoop(g.notes, st), [], st.id + ' seed ' + seed); assert.deepEqual(g, W.generate(st, seed)); seen.add(g.text); }
    assert(seen.size > 100, st.id + ' generator has variety: ' + seen.size);
  }
});
test('Every section of every idea is monophonic, in the phrase and in register', () => {
  each((st, idea) => { for (const s of W.SECTIONS) {
    const sec = W.section(st, idea.notes, s.id); let end = 0, prev = null;
    assert(sec.notes.length > 0 && sec.what.length === 4 && sec.bars.length === 8, st.id + s.id);
    for (const n of sec.notes) {
      assert(n.t >= end, `${st.id} ${idea.name} ${s.id}: overlap at ${n.t}`); assert(n.t + n.l <= 128 && n.l > 0); assert(n.semi >= -7 && n.semi <= 19);
      if (n.slide) assert(prev && prev.t + prev.l === n.t && prev.legato, `${st.id} ${s.id}: slide from nothing`);
      end = n.t + n.l; prev = n;
    }
    assert.equal(sec.bars.reduce((a, b) => a + b.notes.length, 0), sec.notes.length);
  } });
});
test('Kick-free lanes never start a note on a kick that is playing, in any section', () => {
  each((st, idea) => { if (!st.kickFree) return; for (const s of W.SECTIONS) for (const b of W.section(st, idea.notes, s.id).bars) {
    const kicks = new Set(W.drumBar(st, b).filter(h => h.type === 'kick').map(h => h.s));
    for (const n of b.notes) assert(!kicks.has(n.s), `${st.id} ${idea.name} ${s.id} bar ${b.bar + 1} step ${n.s}`);
  } });
});
test('Each section does its job', () => {
  each((st, idea) => {
    const sec = id => W.section(st, idea.notes, id), intro = sec('intro'), drop = sec('drop1'), brk = sec('break'), build = sec('build'), drop2 = sec('drop2'), outro = sec('outro');
    assert(intro.notes.every(n => n.semi === 0 && !n.wow && !n.slide), 'intro is the root only');
    assert(intro.notes.length < W.tileCount(idea.notes), st.id + ' intro is thinner than the loop');
    assert(intro.bars.slice(0, 4).every(b => b.m.sub === 0) && intro.bars.slice(4).every(b => b.m.sub === 1));
    assert(brk.bars.every(b => !b.d.kick), 'no kick in the break');
    assert(brk.notes.every(n => n.t + n.l <= 124), 'the break ends with a silent beat');
    assert(build.notes.every(n => n.t + n.l <= 120), 'two silent beats before the drop');
    assert(!build.bars[7].d.kick && build.bars[7].m.sub === 0 && build.bars[7].d.cut === 8);
    assert(build.bars[7].m.cut > build.bars[0].m.cut * 2, 'the build opens the filter');
    assert.deepEqual(build.notes.filter(n => n.t >= 112).map(n => n.semi), [0, 0, 3, 3, 7, 7, 12, 12]);
    assert(drop2.bars.every(b => b.d.ride && b.m.drive > 1) && drop2.bars.reduce((a, b) => a + b.m.cut, 0) > drop.bars.reduce((a, b) => a + b.m.cut, 0), 'drop 2 is brighter and has the ride');
    assert(outro.bars[7].m.sub === 0 && outro.bars[7].d.kick === 1 && outro.bars[7].m.cut < outro.bars[0].m.cut);
    const e = id => W.measure(st, sec(id), 31).energy;
    assert(e('drop2') >= e('drop1') && e('drop1') > e('intro') && e('drop1') > e('break') && e('drop1') > e('outro'), st.id + ' ' + idea.name + ' energy curve');
  });
});
test('Drop 1 is the loop as written, apart from the two fills', () => {
  for (const st of W.STYLES) for (const idea of st.ideas) {
    const d = W.section(st, idea.notes, 'drop1').notes;
    for (const n of idea.notes) if (n.s < 12) assert(d.some(x => x.t === n.s && x.semi === n.semi + st.prog[0]), st.id + ' ' + idea.name);
  }
});
test('The track is 64 bars and the MIDI file is well formed', () => {
  each((st, idea) => {
    const bars = W.journey(st, idea); assert.equal(bars.length, 64);
    for (const drums of [true, false]) {
      const m = W.midi(st, bars, {root: W.rootMidi(st.key), bpm: st.bpm, drums});
      assert.equal(String.fromCharCode(...m.slice(0, 4)), 'MThd'); assert.equal(m[11], drums ? 3 : 2);
      let p = 14, tracks = 0; const open = new Map();
      while (p < m.length) {
        assert.equal(String.fromCharCode(...m.slice(p, p + 4)), 'MTrk'); const len = (m[p + 4] << 24 | m[p + 5] << 16 | m[p + 6] << 8 | m[p + 7]) >>> 0; let q = p + 8; const end = q + len; tracks++;
        while (q < end) {
          while (m[q++] & 128); const st0 = m[q++];
          if (st0 === 0xFF) { q++; let l = 0, b; do { b = m[q++]; l = l << 7 | b & 127; } while (b & 128); q += l; continue; }
          const k = (st0 & 15) + ':' + m[q]; assert(m[q] < 128 && m[q + 1] < 128);
          if ((st0 & 0xF0) === 0x90) open.set(k, (open.get(k) || 0) + 1); else if ((st0 & 0xF0) === 0x80) open.set(k, open.get(k) - 1);
          q += 2;
        }
        assert.equal(q, end); p = end;
      }
      assert.equal(tracks, drums ? 3 : 2); assert([...open.values()].every(v => v === 0), 'every note on has a note off');
    }
  });
});
test('Roots stay in the sub register and the WAV header is right', () => {
  for (let pc = 0; pc < 12; pc++) { const r = W.rootMidi(pc); assert(r >= 28 && r <= 39 && r % 12 === pc); assert(W.hz(r) > 41 && W.hz(r) < 78); }
  assert.equal(W.noteName(33), 'A1');
  const w = W.wav(new Float32Array([0, 1, -1, 2]), new Float32Array(4), 44100), v = new DataView(w.buffer);
  assert.equal(w.length, 44 + 16); assert.equal(v.getUint32(24, true), 44100); assert.equal(v.getInt16(48, true), 32767); assert.equal(v.getInt16(56, true), 32767);
});
test('Saved state is validated', () => {
  assert.deepEqual(W.validate(null), W.defaults());
  const s = W.validate({style: 'nope', section: 'x', bpm: 999, key: -3, wow: 'a', idea: 7, family: 'jazz'});
  assert.equal(s.style, 'tech'); assert.equal(s.section, 'drop1'); assert.equal(s.bpm, 170); assert.equal(s.key, 0); assert.equal(s.wow, 70); assert.equal(s.idea, 2); assert.equal(s.family, 'all');
  assert.equal(W.validate({style: 'acid', idea: -1, seed: 42}).seed, 42);
});
console.log(`${count} Wow engine tests passed.`);
