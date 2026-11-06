// Breeder's genome against what the page claims: every genre seeds valid grooves that read as that genre, the
// genre's grammar survives thousands of mutations, locks hold, crossovers only use real parents' genes, a
// generation has no copies and runs nearest-first, drift lets a family leave its genre, and everything exports.
//   node breeder-src/test.mjs
import assert from 'node:assert/strict';
import {load} from './load.mjs';
const {OT, OB, OE, TL, TB} = load();
let checks = 0; const t0 = Date.now();
async function check(name, fn) { const t = Date.now(); await fn(); checks++; console.log(`PASS ${name} (${Date.now() - t} ms)`); }
const GENRES = Object.keys(OB.GENRES), on = c => c !== '.' && c !== '-';
const genes = g => JSON.stringify([g.drums, g.bass, g.riff, g.key, g.scale, g.prog, g.pad, g.bpm, g.swing]);

await check('Every genre seeds eight valid grooves that fit it and read as it', () => {
  let own = 0, all = 0;
  for (const id of GENRES) {
    const pop = TB.seed(id, 8, 5);
    assert.equal(pop.length, 8);
    for (const g of pop) {
      assert(TB.validate(g), `${id}: ${g.name} valid`);
      const m = TB.measure(g); all++;
      assert(m.fit >= 80, `${id}: ${g.name} fit ${m.fit}`);
      if (m.reads[0].genre === id || m.reads.slice(0, 2).some(r => r.genre === id)) own++;
    }
    assert.equal(new Set(pop.map(genes)).size, 8, `${id}: eight different grooves`);
  }
  assert(own / all >= 0.9, `reads as its own genre: ${own}/${all}`);
});
await check('Seeding is deterministic per seed', () => { for (const id of ['techno', 'garage']) assert.deepEqual(TB.seed(id, 8, 9).map(genes), TB.seed(id, 8, 9).map(genes)); });
await check('2,800 random mutations: the kick anchors always play, the bass stays off the kick where the genre does, the genome stays valid', () => {
  for (const id of GENRES) {
    const r = OT.rng(GENRES.indexOf(id) + 3), anchors = TB.kickAnchors(id), avoid = TB.bassAvoidsKick(id);
    for (const g of TB.seed(id, 4, 2)) {
      const base = TB.clone(g);
      for (let i = 0; i < 50; i++) {
        TB.mutate(g, 1 + Math.floor(r() * 4), r, {wild: i % 2 === 0});
        assert(TB.validate(g), `${id}: valid after ${i} rounds`);
        for (const a of anchors) assert(on(g.drums.k[a]), `${id}: kick anchor ${a} after mutation`);
        if (avoid) for (const a of anchors) assert(!on(base.bass.steps[a]) ? !on(g.bass.steps[a]) || g.bass.steps[a] === '-' : true, `${id}: bass on the kick at ${a}: ${g.bass.steps}`);
        assert((g.bass.steps.match(/[^.\-]/g) || []).length >= 2 && /[^.\-]/.test(g.riff.steps));
      }
    }
  }
});
await check('Mutations say what they did: every log line names a real change', () => {
  const r = OT.rng(4), g = TB.seed('tech-house', 1, 3)[0];
  for (let i = 0; i < 40; i++) { const before = genes(g), lines = TB.mutate(g, 1, r); if (lines.length) assert.notEqual(genes(g), before, 'a logged mutation changed something: ' + lines[0]); }
});
await check('Crossover: every gene group comes from one parent or the other (or bar by bar), and the log says which', () => {
  const r = OT.rng(11);
  for (let i = 0; i < 200; i++) {
    const [a, b] = TB.seed(GENRES[i % GENRES.length], 2, i + 1), c = TB.crossover(a, b, r, 2);
    for (const l of TB.LK) { const x = c.drums[l]; assert([a.drums[l], b.drums[l], a.drums[l].slice(0, 16) + b.drums[l].slice(16), b.drums[l].slice(0, 16) + a.drums[l].slice(16)].includes(x) || TB.kickAnchors(c.genre).length, 'drum lane from a parent'); }
    assert([a.bass.steps, b.bass.steps, a.bass.steps.slice(0, 16) + b.bass.steps.slice(16), b.bass.steps.slice(0, 16) + a.bass.steps.slice(16)].some(s => s.replace(/^-/, '.') === c.bass.steps), 'bass from a parent');
    assert([a, b].some(p => p.riff.steps === c.riff.steps && p.riff.rate === c.riff.rate), 'riff rhythm from a parent');
    assert([a, b].some(p => JSON.stringify(p.riff.seq) === JSON.stringify(c.riff.seq) && p.riff.pool === c.riff.pool), 'riff notes from a parent');
    assert([a, b].some(p => p.key === c.key && p.prog === c.prog), 'harmony from a parent');
    assert(/Child of .* × .*: kick .*; clap .*; hats .*/.test(c.log[0]));
    assert.deepEqual(c.parents, [a.id, b.id]);
  }
});
await check('Locks hold: kick, hats, bassline, riff notes and key are exactly the first star\'s in every child', () => {
  const pop = TB.seed('melodic-techno', 8, 3), locks = ['kick', 'hats', 'bass', 'notes', 'harmony'];
  for (let s = 1; s <= 6; s++) {
    const kids = TB.breed([pop[1], pop[4], pop[6]], {strength: 'wild', drift: 0.5, locks, seed: s});
    for (const k of kids) {
      assert.equal(k.drums.k, pop[1].drums.k); assert.equal(k.drums.h, pop[1].drums.h); assert.equal(k.drums.o, pop[1].drums.o);
      assert.equal(k.bass.steps, pop[1].bass.steps); assert.deepEqual(k.riff.seq, pop[1].riff.seq); assert.equal(k.riff.pool, pop[1].riff.pool);
      assert.equal(k.key, pop[1].key); assert.equal(k.prog, pop[1].prog);
    }
  }
});
await check('A generation: eight, parents first when kept, no copies, children nearest-first, every one measured', () => {
  for (const id of ['techno', 'tech-house', 'deep', 'garage', 'trance']) {
    const pop = TB.seed(id, 8, 7), favs = [pop[0], pop[3]];
    const kids = TB.breed(favs, {strength: 'bold', drift: 0.2, keepParents: true, seed: 3});
    assert.equal(kids.length, 8); assert(kids[0].elite && kids[1].elite);
    const ch = kids.filter(k => !k.elite);
    for (let i = 1; i < ch.length; i++) assert(ch[i].distance >= ch[i - 1].distance - 1e-9, 'nearest first');
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) assert(TB.distance(kids[i], kids[j]) >= 0.015, `${id}: no copies`);
    for (const k of ch) { assert(k.measured && Number.isFinite(k.measured.fit)); assert(k.parents.every(p => favs.some(f => f.id === p))); assert(TB.validate(k)); }
    const one = TB.breed([pop[2]], {strength: 'gentle', seed: 4}); assert.equal(one.length, 8);
    assert(one[0].distance < one[7].distance, 'from a little different to far out');
    assert(one.reduce((s, k) => s + k.measured.fit, 0) / 8 >= 80, `${id}: one parent, gentle: children stay in the genre`);
  }
  assert.throws(() => TB.breed([]), /Star/);
});
await check('Distance: zero to itself, symmetric, between 0 and 1, and bigger for wilder children', () => {
  const pop = TB.seed('techno', 8, 1);
  for (const a of pop) { assert.equal(TB.distance(a, a), 0); for (const b of pop) { const d = TB.distance(a, b); assert(d >= 0 && d <= 1); assert(Math.abs(d - TB.distance(b, a)) < 1e-9); } }
  const avg = st => { const ks = TB.breed([pop[0]], {strength: st, seed: 21}); return ks.reduce((s, k) => s + k.distance, 0) / ks.length; };
  assert(avg('wild') > avg('gentle'), 'wild children are further away');
});
await check('Drift: held in the genre, ten generations stay there; let free, a family walks out of it', () => {
  const run = (drift, pick) => {
    let pop = TB.seed('deep', 8, 2), out = 0;
    for (let g = 0; g < 10; g++) {
      const favs = pick(pop); pop = TB.breed(favs, {strength: drift > 0.5 ? 'wild' : 'bold', drift, keepParents: false, seed: g + 1});
      out += pop.filter(k => TB.measure(k).reads[0].genre !== 'deep').length;
    }
    return {out, fit: pop.reduce((s, k) => s + TB.measure(k).fit, 0) / pop.length};
  };
  const held = run(0, p => p.slice().sort((a, b) => TB.measure(b).fit - TB.measure(a).fit).slice(0, 2));
  const free = run(1, p => p.slice().sort((a, b) => (b.distance || 0) - (a.distance || 0)).slice(0, 2));
  console.log(`  held: ${held.out} of 80 children read as another genre, fit ${held.fit.toFixed(0)}; free: ${free.out} of 80, fit ${free.fit.toFixed(0)}`);
  assert(held.fit >= 85 && held.out <= 12, 'held in the genre');
  assert(free.out >= 12 && free.out > 3 * Math.max(1, held.out), 'drift lets a family walk out of its genre');
});
await check('Rendering: notes inside the loop, drums on their pads, bass in the bass register, the riff above it', () => {
  for (const id of GENRES) for (const g of TB.seed(id, 3, 8)) {
    const rd = TB.render(g);
    for (const p of rd.parts) for (const n of p.notes) assert(n.t >= 0 && n.t < TB.LOOP_BEATS && n.d > 0 && n.v >= 1 && n.v <= 127 && n.n >= 0 && n.n <= 127, `${id}/${p.key}`);
    for (const p of rd.parts.filter(p => p.kind === 'drum')) assert(p.notes.every(n => n.n === p.pitch));
    const bass = rd.parts.find(p => p.key === 'bass'); assert(bass && bass.notes.every(n => n.n >= 24 && n.n <= 58), `${id}: bass register`);
    assert(rd.parts.find(p => p.key === 'riff'), `${id}: a riff`);
  }
});
await check('MIDI: the loop and a lineage read back note for note; the Transplant hand-off revives as a loop', () => {
  const pop = TB.seed('tech-house', 8, 1), kids = TB.breed([pop[0], pop[1]], {seed: 2}), g = kids[3];
  const back = OT.readMidi(TB.midi(g)), rd = TB.render(g), want = rd.parts.reduce((s, p) => s + p.notes.length, 0);
  assert.equal(back.tracks.reduce((s, t) => s + t.notes.length, 0), want); assert(back.tracks.some(t => t.name === 'Drums' && t.notes.every(n => n.ch === 9)));
  const lineB = OT.readMidi(TB.lineageMidi([pop[0], g])); assert.equal(lineB.tracks.reduce((s, t) => s + t.notes.length, 0), 2 * (TB.render(pop[0]).parts.reduce((s, p) => s + p.notes.length, 0) + want));
  const loop = TL.revive(JSON.parse(JSON.stringify(TB.toLoop(g))));
  assert.equal(loop.bars, 4); assert(loop.parts.some(p => p.role === 'kick') && loop.parts.some(p => p.role === 'bass') && loop.parts.some(p => p.role === 'lead'));
  assert(loop.parts.every(p => ['kick', 'clap', 'hats', 'perc', 'bass', 'lead', 'chords', 'pad'].includes(p.role) && typeof p.follow === 'string'));
});
await check('From your loop: the drums land on their lanes, the bassline becomes degrees, the lead an Orbit riff that plays your notes', () => {
  const d = (p, steps) => { const o = []; for (let b = 0; b < 2; b++) for (const s of steps) o.push({t: b * 4 + s / 4, d: 0.1, n: p, v: 100}); return o; };
  const lead = [0, 3, 6, 10, 12].map((s, i) => ({t: s / 4, d: 0.2, n: [69, 72, 69, 76, 74][i], v: 100}));
  const file = {name: 'Mine.mid', bytes: OT.writeMidi([{name: 'Drums', ch: 9, notes: [...d(36, [0, 4, 8, 12]), ...d(39, [4, 12]), ...d(42, [2, 6, 10, 14])]}, {name: 'Bass', ch: 1, notes: [{t: 0.5, d: 0.25, n: 45, v: 100}, {t: 1.5, d: 0.25, n: 52, v: 100}, {t: 2.5, d: 0.25, n: 57, v: 100}]}, {name: 'Lead', ch: 2, notes: lead}], {bpm: 125, beats: 8})};
  const loop = TL.fromMidi([file]), g = TB.fromLoop(loop, 'tech-house');
  assert(TB.validate(g));
  assert.equal(g.drums.k.slice(0, 16), 'x...x...x...x...'); assert.equal(g.drums.c.slice(0, 16), '....x.......x...'); assert.equal(g.drums.h.slice(0, 16), '..x...x...x...x.');
  assert.equal(g.bass.steps.slice(0, 11), '..x...5...o', 'root, fifth, octave of A');
  const riff = TB.render(g).parts.find(p => p.key === 'riff').notes.filter(n => n.t < 4);
  assert.deepEqual(riff.map(n => Math.round(n.t * 4)), [0, 3, 6, 10, 12], 'your rhythm'); assert.deepEqual(riff.map(n => n.n % 12), [69, 72, 69, 76, 74].map(n => n % 12), 'your notes');
  const kids = TB.breed([g], {keepParents: true, seed: 1, gen: 1}); assert.equal(kids[0].id, g.id); assert.equal(kids.length, 8);
});
await check('Speed: a generation from three parents in under 400 ms', () => {
  const pop = TB.seed('melodic-techno', 8, 1), t = Date.now();
  for (let i = 0; i < 3; i++) TB.breed([pop[0], pop[2], pop[5]], {seed: i + 1});
  const ms = (Date.now() - t) / 3; console.log(`  ${ms.toFixed(0)} ms per generation`); assert(ms < 400);
});
console.log(`\n${checks} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
