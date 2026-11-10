// Wow engine tests. Plain Node, no install:  node wow-src/test.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const W = createRequire(import.meta.url)('./engine.js');
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const each = fn => { for (const st of W.STYLES) for (const idea of [...st.ideas, W.generate(st, 1), W.generate(st, 2), W.generate(st, 3)]) fn(st, idea); };

test('Forty-five lanes (27 techno, 18 house; 27 current, 18 classic), 149 written ideas, 58 voices', () => {
  assert.equal(W.STYLES.length, 45);
  assert.equal(new Set(W.STYLES.map(s => s.id)).size, 45);
  assert.equal(W.SOUNDS.length, 58); assert.equal(new Set(W.SOUNDS.map(s => s.id)).size, 58); assert.equal(new Set(W.SOUNDS.map(s => s.name)).size, 58, 'every voice has its own name');
  assert.equal(W.STYLES.reduce((a, s) => a + s.ideas.length, 0), 149);
  assert.equal(new Set(W.STYLES.flatMap(s => s.ideas.map(i => i.text))).size, 149, 'no two written ideas are the same');
  assert.equal(W.STYLES.filter(s => s.family === 'house').length, 18); assert.equal(W.STYLES.filter(s => s.family === 'techno').length, 27);
  assert.equal(W.STYLES.filter(s => s.era === 'now').length, 27); assert.equal(W.STYLES.filter(s => s.era === 'classic').length, 18);
  for (const st of W.STYLES) { assert(st.ideas.length >= 3 && st.ideas.length <= 6, st.id); assert(st.why.length >= 3 && st.recipe.length >= 4 && st.idea && st.lane, st.id); assert(st.bpm >= 110 && st.bpm <= 170, st.id); }
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
test('Options: any lane takes any voice, chord movement, break and fill, and still obeys the rules', () => {
  const base = W.styleById('tech');
  assert.equal(W.withOptions(base, {}).vkey, ''); assert.equal(W.withOptions(base, {sound: 'tech', move: 'auto', brk: 'auto', fill: 'auto'}).vkey, '');
  for (const st of W.STYLES) for (const sound of ['', 'acid', 'x-yoy']) for (const move of Object.keys(W.MOVES)) for (const brk of Object.keys(W.BREAKS)) for (const fill of Object.keys(W.FILL_NAMES)) {
    const o = W.withOptions(st, {sound, move, brk, fill});
    assert.equal(o.sound.id, sound || st.id); assert.equal(o.rigKey, st.id + '/' + (sound || st.id));
    if (move !== 'auto') assert.deepEqual(o.prog, W.MOVES[move]);
    if (fill === 'none') assert.equal(o.fill2, 'none'); else assert.notEqual(o.fill === o.fill2 && o.fill !== 'none', true);
    if (sound) continue;
    for (const s of W.SECTIONS) {
      const sec = W.sectionFor(o, st.ideas[0], s.id); let end = 0;
      for (const n of sec.notes) { assert(n.t >= end && n.t + n.l <= 128 && n.semi >= -7 && n.semi <= 19, `${st.id} ${move} ${brk} ${fill} ${s.id}`); end = n.t + n.l; }
      if (st.kickFree) for (const b of sec.bars) { const kicks = new Set(W.drumBar(o, b).filter(h => h.type === 'kick').map(h => h.s)); for (const n of b.notes) assert(!kicks.has(n.s)); }
    }
  }
  const a = W.sectionFor(W.withOptions(base, {brk: 'pad'}), base.ideas[0], 'break'), b = W.sectionFor(W.withOptions(base, {brk: 'drone'}), base.ideas[0], 'break');
  assert.equal(a.notes.length, 4); assert.equal(b.notes.length, 1);
  assert.notDeepEqual(W.sectionFor(W.withOptions(base, {move: 'i-VI-VII'}), base.ideas[0], 'drop1').notes, W.sectionFor(base, base.ideas[0], 'drop1').notes);
});
test('The pattern bank: 28 distinct rhythms that work on every lane, in every section', () => {
  assert.equal(W.BANK.length, 28); assert.equal(new Set(W.BANK.map(b => b.text)).size, 28); assert.equal(new Set(W.BANK.map(b => b.id)).size, 28);
  assert(W.SOURCES.length >= 8 && W.SOURCES.every(s => /^https:\/\//.test(s.url) && s.title && s.used));
  for (const b of W.BANK) {
    assert.deepEqual(W.checkLoop(b.notes, null), [], b.id); assert.deepEqual(W.normalize(b.notes), b.notes, b.id + ' is already normal');
    for (const st of W.STYLES) {
      const o = W.withOptions(st, {}, b);
      assert.equal(o.kickFree, st.kickFree && !b.notes.some(n => n.s % 4 === 0), 'a loop that lands on the kick switches the dodge off');
      for (const s of W.SECTIONS) { const sec = W.sectionFor(o, b, s.id); let end = 0; assert(sec.notes.length > 0); for (const n of sec.notes) { assert(n.t >= end && n.t + n.l <= 128, `${b.id} on ${st.id} ${s.id}`); end = n.t + n.l; } }
    }
  }
});
test('Ghost notes are quiet, short and never chosen for the skeleton; accent shapes set a hierarchy', () => {
  const g = W.parse(". 0g 0 . | . 0g 0 . | . 0g 0 . | . 0g 0 0g " + ". 0g 0 . | . 0g 0 . | . 0g 0 . | 0g 0g 0 .");
  assert(g.filter(n => n.ghost).every(n => n.short && n.l === 1)); assert.deepEqual(W.parse(W.unparse(g)), g);
  const st = W.styleById('disco'), drop = W.section(st, g, 'drop1');
  assert(drop.notes.filter(n => n.ghost).length >= 20 && drop.notes.filter(n => n.ghost).every(n => n.vel === .35));
  assert(W.skeleton(g).every(n => !n.ghost) && W.skeleton(g).length >= 2);
  for (const k of ['offbeat', 'roll', 'back', 'flat']) {
    const sec = W.section(W.withOptions(st, {accent: k}), g, 'drop1');
    for (const n of sec.notes) assert.equal(n.vel, n.ghost ? .35 : W.ACCENTS[k].v[n.t % 4]);
  }
  assert.equal(W.withOptions(st, {accent: 'auto'}).vkey, '');
});
test('The editor\'s normaliser makes any note list legal', () => {
  const r = W.rng(5);
  for (let i = 0; i < 2000; i++) {
    const notes = Array.from({length: 1 + Math.floor(r() * 14)}, () => ({s: Math.floor(r() * 40) - 4, l: Math.floor(r() * 9), semi: Math.floor(r() * 40) - 15, acc: r() < .3, slide: r() < .4, wow: r() < .3, short: r() < .3, ...(r() < .2 ? {ghost: true} : {})}));
    const n = W.normalize(notes);
    assert(n.length >= 1); assert.deepEqual(W.checkLoop(n, null).filter(p => !p.includes('fewer')), []); assert.deepEqual(W.parse(W.unparse(n)), n); assert.deepEqual(W.normalize(n), n);
    const v = W.validate({idea: -2, custom: W.unparse(n)}); assert.equal(v.idea, -2); assert.equal(v.custom, W.unparse(n));
    for (const s of W.SECTIONS) W.section(W.styleById('tech'), n, s.id);
  }
  assert.equal(W.validate({idea: -2, custom: 'rubbish'}).idea, 0); assert.equal(W.validate({idea: 9, style: 'afro'}).idea, 0);
  assert.equal(W.ideaFor(W.styleById('tech'), -2, 1, W.BANK[0].text).custom, true);
});
test('Broken-beat lanes put the kick where they say', () => {
  const g = W.styleById('garage'), bar = W.section(g, g.ideas[0].notes, 'drop1').bars[0];
  assert.deepEqual(W.drumBar(g, bar).filter(h => h.type === 'kick').map(h => h.s), [0, 10]);
});
test('Saved state is validated', () => {
  assert.deepEqual(W.validate(null), W.defaults());
  const s = W.validate({style: 'nope', section: 'x', bpm: 999, key: -3, wow: 'a', idea: 7, family: 'jazz'});
  assert.equal(s.style, 'tech'); assert.equal(s.section, 'drop1'); assert.equal(s.bpm, 170); assert.equal(s.key, 0); assert.equal(s.wow, 70); assert.equal(s.idea, 0); assert.equal(s.family, 'all');
  const o = W.validate({sound: 'nope', move: 'x', brk: 'pad', fill: 'gap', swing: 99, gate: 1, pump: 500, family: 'classic'});
  assert.equal(o.sound, ''); assert.equal(o.move, 'auto'); assert.equal(o.brk, 'pad'); assert.equal(o.fill, 'gap'); assert.equal(o.swing, 30); assert.equal(o.gate, 30); assert.equal(o.pump, 150); assert.equal(o.family, 'classic');
  assert.equal(W.validate({style: 'acid', idea: -1, seed: 42}).seed, 42);
});
console.log(`${count} Wow engine tests passed.`);
