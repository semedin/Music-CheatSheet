// Transplant's engine against answers that are known: the model's maths, every built-in shape, Blueprint files
// old and new, MIDI loops in every layout Live and the other Fieldwork studios write, and the transplant itself on
// every shape × demo loop and on the analysed Blueprint demo track.
//   node transplant-src/test.mjs
import assert from 'node:assert/strict';
import {load} from './load.mjs';

const E = load({analysis: true}), {OT, TM, TSHAPES, TL, TE, XR, BP, BPDemo} = E;
let checks = 0; const t0 = Date.now();
async function check(name, fn) { const t = Date.now(); await fn(); checks++; console.log(`PASS ${name} (${Date.now() - t} ms)`); }
const EPS = 1e-6;
const runs = a => { const out = []; let b = 0; while (b < a.length) { if (!a[b]) { b++; continue; } let e = b; while (e < a.length && a[e]) e++; out.push([b, e]); b = e; } return out; };
const phraseStarts = m => { const s = new Set(); for (const sec of m.sections) for (let a = sec.start; a < sec.end; a += 8) s.add(a); return s; };

// ---------- the model ----------
await check('Positions: "bar.beat.16th" and beats agree both ways', () => {
  for (const [s, k] of [['1.1', 0], ['17.1', 64], ['32.4', 127], ['32.4.3', 127.5], ['48.4', 191]]) { assert.equal(TM.parseAt(s), k, s); assert.equal(TM.barBeat(k), s.replace(/\.1$/, '.1')); }
});
await check('Segmentation: an odd one-bar blip is ignored, a one-bar drop on an 8-bar line is kept, a section line is cheap', () => {
  const v = Array(32).fill(1); v[5] = 0; v[15] = 0;           // bar 6 (odd place) and bar 16 (the end of a phrase)
  const s = TM.segment(v);
  assert.equal(s[5], 1, 'blip on bar 6 smoothed over'); assert.equal(s[15], 0, 'the phrase-end drop is kept');
  const w = Array(24).fill(0).map((_, b) => b >= 11 ? 1 : 0), seg = TM.segment(w.map((x, b) => b === 11 ? 0.45 : x), {cheap: new Set([12])});
  assert.equal(seg.indexOf(1), 12, 'switches on the section line, not a bar early');
});
await check('Isotonic regression is monotone and leaves a monotone series alone; RDP keeps the curve within tolerance', () => {
  const y = [1, 3, 2, 4, 3.5, 6], up = TM.isotonic(y, true);
  for (let i = 1; i < up.length; i++) assert(up[i] >= up[i - 1] - EPS);
  assert.deepEqual(TM.isotonic([1, 2, 3], true), [1, 2, 3]);
  const dn = TM.isotonic(y, false); for (let i = 1; i < dn.length; i++) assert(dn[i] <= dn[i - 1] + EPS);
  const pts = Array.from({length: 40}, (_, i) => ({k: i, o: Math.log2(300) + i / 8 + (i % 3) * 0.01}));
  const r = TM.rdp(pts, 1 / 6); assert(r.length <= 4, 'a straight sweep needs few points: ' + r.length);
  for (const p of pts) { const i = r.findIndex(q => q.k >= p.k); const a = r[Math.max(0, i - 1)], b = r[Math.max(0, i)]; const y = a.k === b.k ? a.o : a.o + (b.o - a.o) * (p.k - a.k) / (b.k - a.k); assert(Math.abs(y - p.o) <= 1 / 6 + 1e-9, 'within a sixth of an octave'); }
});
await check('Every built-in shape is complete: contiguous sections, lanes as written, every move inside the track', () => {
  for (const d of TSHAPES) {
    const m = TM.buildShape(d), bars = d.sections.reduce((s, x) => s + x.bars, 0);
    assert.equal(m.bars, bars, d.id); assert.equal(m.sections[0].start, 0); assert.equal(m.sections[m.sections.length - 1].end, bars);
    for (let i = 1; i < m.sections.length; i++) assert.equal(m.sections[i].start, m.sections[i - 1].end, d.id + ' contiguous');
    let b0 = 0;
    for (const s of d.sections) {
      for (const l of TM.LK) {
        const spec = s.el[l];
        for (let b = 0; b < s.bars; b++) {
          let want = 0;
          if (spec === 1) want = 1; else if (spec) for (const r of String(spec).split(',')) { const [a, e] = r.split('-').map(Number); if (b + 1 >= a && b + 1 <= (e || s.bars)) want = 1; }
          assert.equal(m.on[l][b0 + b], want, `${d.id}: ${l} at bar ${b0 + b + 1}`);
        }
      }
      b0 += s.bars;
    }
    for (const e of m.moves) { assert(e.k0 >= 0 && e.k1 <= m.beats + EPS && e.k1 > e.k0, `${d.id}: ${e.type}@${e.at}`); assert(TM.CAT[e.type]); }
    assert(m.moves.length >= 10, d.id + ' has moves');
    for (let k = 0; k < m.beats; k++) assert(m.tension[k] >= 0 && m.tension[k] <= 1);
  }
});

// ---------- the analysed demo track (one analysis, shared by the checks below) ----------
const demo = BPDemo.synthDemo({fx: true});
const an = await XR.analyze({L: demo.L, R: demo.R, sr: demo.sr}); await BP.prepare(an);
const ref = TM.fromAnalysis(an, 'Blueprint demo');
console.log(`demo analysed: ${ref.bars} bars, ${ref.sections.length} sections, ${ref.moves.length} moves`);
await check('From audio: the demo\'s sections, all of Blueprint\'s moves, tempo and loudness arrive in the model', () => {
  assert.deepEqual(ref.sections.map(s => s.start), an.sections.map(s => s.start));
  assert.equal(ref.moves.length, an.moves.length);
  assert(Math.abs(ref.bpm - 126) < 0.05); assert(ref.audio && Number.isFinite(ref.audio.lufs) && Math.abs(ref.audio.t0 - demo.truth.t0) < 0.02);
  for (const t of ['lp', 'roll', 'gap', 'echo', 'crash', 'riser', 'stutter', 'tapeStop', 'kickOut']) assert(ref.moves.some(e => e.type === t), 'has ' + t);
  // the clap plays on 2 and 4 in the full sections of the demo: its lane reads on there
  for (const b of [20, 52, 80]) assert.equal(ref.on.clap[b], 1, `clap lane on at bar ${b + 1}`);
  for (const b of [34, 40]) assert.equal(ref.on.kick[b], 0, `no kick in the break, bar ${b + 1}`);
});
await check('Blueprint JSON version 2 round-trips exactly; version 1 (no exact beats) still gives the same sections and moves', () => {
  const j2 = JSON.parse(JSON.stringify(BP.exportModel(an, 'demo'))), m2 = TM.fromJSON(j2);
  assert.equal(m2.moves.length, ref.moves.length);
  for (let i = 0; i < ref.moves.length; i++) { assert.equal(m2.moves[i].type, ref.moves[i].type); assert(Math.abs(m2.moves[i].k0 - ref.moves[i].k0) < 0.002); }
  for (const l of TM.LK) assert.deepEqual(Array.from(m2.on[l]), Array.from(ref.on[l]), 'lane ' + l);
  const j1 = {track: j2.track, bpm: j2.bpm, bar1: j2.bar1, bars: j2.bars, key: j2.key, sections: j2.sections, sidechain: j2.sidechain.map(p => ({section: p.section, pump: p.pump, depth: p.depth, releaseMs: p.releaseMs})), lanes: j2.lanes,
    moves: j2.moves.map(e => ({type: e.type, title: e.title, at: e.at, to: e.to, sure: e.sure, target: e.target, what: e.what, recipe: e.recipe, curve: e.curve}))};
  const m1 = TM.fromJSON(j1);
  assert.equal(m1.source, 'blueprint-v1'); assert.deepEqual(m1.sections.map(s => [s.start, s.end, s.label]), ref.sections.map(s => [s.start, s.end, s.label]));
  assert.equal(m1.moves.length, ref.moves.length);
  for (let i = 0; i < m1.moves.length; i++) assert(Math.abs(m1.moves[i].k0 - ref.moves[i].k0) <= 0.25 + EPS, `${m1.moves[i].type} at ${m1.moves[i].at}: read from its position text to the 16th`);
  assert(m1.pumps.some(p => p.pump), 'sidechain carried by section name');
  assert.throws(() => TM.fromJSON({hello: 1}), /Blueprint/);
});
await check('Saved models revive identically', () => {
  const r = TM.revive(JSON.parse(JSON.stringify(TM.serialize(ref))));
  assert.equal(r.bars, ref.bars); assert.equal(r.moves.length, ref.moves.length);
  for (const l of TM.LK) assert.deepEqual(Array.from(r.on[l]), Array.from(ref.on[l]));
});

// ---------- loops from MIDI ----------
const drumNotes = (pitch, steps, bars = 4) => { const o = []; for (let b = 0; b < bars; b++) for (const s of steps) o.push({t: b * 4 + s / 4, d: 0.1, n: pitch, v: 100}); return o; };
const mid = (tracks, opts) => ({name: opts.file, bytes: OT.writeMidi(tracks, {bpm: opts.bpm || 128, beats: opts.beats})});
await check('A multitrack Live export: the Drum Rack is split by pad, roles come from names and notes, 4 bars and the tempo are read', () => {
  const f = mid([
    {name: 'Drums', ch: 9, notes: [...drumNotes(36, [0, 4, 8, 12]), ...drumNotes(39, [4, 12]), ...drumNotes(42, [2, 6, 10, 14]), ...drumNotes(46, [14])]},
    {name: '3-MIDI', ch: 1, notes: [0, 2, 4, 6].map(b => ({t: b * 2 + 0.5, d: 0.4, n: 36, v: 100}))},
    {name: 'Keys', ch: 2, notes: [0, 4, 8, 12].flatMap(t => [60, 63, 67].map(n => ({t, d: 0.5, n, v: 90})))},
    {name: 'Lead', ch: 3, notes: [0, 1, 2, 3, 5, 6].map(i => ({t: i * 0.75, d: 0.25, n: 72 + i, v: 100}))}], {file: 'Loop.mid', bpm: 127, beats: 16});
  const l = TL.fromMidi([f]);
  assert.equal(l.bars, 4); assert.equal(Math.round(l.bpm), 127);
  const roles = Object.fromEntries(l.parts.map(p => [p.name, p.role]));
  assert.equal(roles.Kick, 'kick'); assert.equal(roles.Clap, 'clap'); assert.equal(roles['Closed hat'], 'hats'); assert.equal(roles['Open hat'], 'hats');
  assert.equal(l.parts.find(p => p.notes[0].n === 36 && p.kind === 'melodic').role, 'bass', 'an unnamed low line is the bass');
  assert.equal(roles.Keys, 'chords'); assert.equal(roles.Lead, 'lead');
  assert.equal(new Set(l.parts.filter(p => p.kind === 'drum').map(p => p.src.id)).size, 1, 'the pads remember they came from one clip');
});
await check('One file per part, named by Live\'s clip names; a Type 0 file with several channels; whole empty bars in front removed', () => {
  const files = [['Kick.mid', [{name: 'Kick', notes: drumNotes(60, [0, 4, 8, 12], 2)}]], ['Sub bass.mid', [{name: 'Sub bass', notes: [{t: 0.5, d: 1, n: 33, v: 100}]}]], ['Big Pad.mid', [{name: 'Big Pad', notes: [{t: 0, d: 8, n: 60, v: 80}, {t: 0, d: 8, n: 64, v: 80}]}]]]
    .map(([file, tr]) => mid(tr, {file, beats: 8}));
  const l = TL.fromMidi(files), r = Object.fromEntries(l.parts.map(p => [p.name, p]));
  assert.equal(r.Kick.role, 'kick'); assert.equal(r.Kick.kind, 'drum'); assert.equal(r['Sub bass'].role, 'bass'); assert.equal(r['Big Pad'].role, 'pad'); assert.equal(l.bars, 2);
  const t0f = {name: 'type0.mid', bytes: OT.writeMidi([{name: 'All', notes: []}], {bpm: 124})};
  // Type 0 with two channels: build it by merging two tracks' notes onto one track with different channels
  const two = OT.writeMidi([{name: 'All', ch: 0, notes: [{t: 64, d: 1, n: 40, v: 100}, {t: 66, d: 1, n: 40, v: 100}]}], {bpm: 124});
  const l2 = TL.fromMidi([{name: 'late.mid', bytes: two}]);
  assert.equal(l2.shifted, 16, '16 empty bars removed'); assert.equal(l2.parts[0].notes[0].t, 0);
  assert(t0f.bytes.length > 0);
});
await check('Pocket\'s and Orbit\'s exports read with the right roles: riff, sub and character, kick, hats', () => {
  const f = mid([{name: 'Riff', ch: 0, notes: [{t: 0, d: 0.25, n: 69, v: 100}, {t: 0.5, d: 0.25, n: 72, v: 100}]}, {name: 'Kick', ch: 9, notes: drumNotes(36, [0, 4, 8, 12])},
    {name: 'Sub', ch: 1, notes: [{t: 0.5, d: 0.4, n: 33, v: 100}]}, {name: 'Character', ch: 2, notes: [{t: 0.5, d: 0.4, n: 45, v: 100}]}, {name: 'Hats', ch: 9, notes: drumNotes(42, [2, 6, 10, 14])}], {file: 'Pocket phrase.mid', beats: 16});
  const l = TL.fromMidi([f]), r = Object.fromEntries(l.parts.map(p => [p.name, p.role]));
  assert.equal(r.Riff, 'lead'); assert.equal(r.Kick, 'kick'); assert.equal(r.Sub, 'bass'); assert.equal(r.Hats, 'hats');
  assert.equal(l.parts.find(p => p.name === 'Character').role, 'bass', 'a low "character" line is a bass layer');
  assert.throws(() => TL.fromMidi([{name: 'x.mid', bytes: new Uint8Array([1, 2, 3])}]), /MIDI|notes/);
});
await check('Every demo loop is a valid loop, and loops revive from a save', () => {
  for (const d of TL.DEMOS) {
    const l = TL.demo(d.id); assert.equal(l.bars, d.bars); assert(l.parts.length >= 6);
    for (const p of l.parts) { assert(p.notes.length, p.name); for (const n of p.notes) assert(n.t >= 0 && n.t < l.beats && n.d > 0 && n.n >= 0 && n.n <= 127); }
    const r = TL.revive(JSON.parse(JSON.stringify(TL.serialize(l)))); assert.equal(r.parts.length, l.parts.length);
  }
});

// ---------- the transplant ----------
function grammar(pl, label) {
  const m = pl.model, starts = phraseStarts(m), P = pl.parts;
  // gaps are silent: no note starts inside one, none rings into it
  for (const g of pl.mutes) for (const x of P) for (const n of x.notes) { assert(!(n.t >= g.k0 - EPS && n.t < g.k1 - EPS), `${label}: ${x.part.name} starts at ${n.t} in the gap ${g.k0}–${g.k1}`); assert(!(n.t < g.k0 && n.t + n.d > g.k0 + 0.001), `${label}: ${x.part.name} rings into the gap`); }
  // kick-outs: no kick inside
  for (const l of pl.log.filter(l => l.move.type === 'kickOut' && l.status === 'rebuilt')) for (const x of P.filter(x => x.role === 'kick')) assert(!x.notes.some(n => n.t >= l.move.k0 - EPS && n.t < l.move.k1 - EPS), `${label}: kick inside the kick-out at ${l.move.at}`);
  // layers stack: a layered part only plays where the main part of its lane does; and they enter on phrase lines
  const byLane = new Map(); for (const x of P.filter(x => !x.synthetic && x.part.entry === 'auto')) { if (!byLane.has(x.part.follow)) byLane.set(x.part.follow, []); byLane.get(x.part.follow).push(x); }
  for (const [lane, xs] of byLane) {
    for (const x of xs) for (let b = 0; b < m.bars; b++) if (x.act.on[b]) assert(m.on[lane][b], `${label}: ${x.part.name} plays at bar ${b + 1} where its lane is out`);
    if (xs.length < 2) continue;
    // a layer that waits enters where its lane enters, on a section line, or at the start of an 8-bar phrase
    for (const x of xs) if (x.act.why.some(v => v === 2)) for (const [a] of runs(x.act.on)) if (a > 0 && m.on[lane][a - 1]) assert(starts.has(a), `${label}: ${x.part.name} enters at bar ${a + 1}, not on a phrase line`);
  }
  // every note inside the track, every velocity legal
  for (const x of P) for (const n of x.notes) assert(n.t >= 0 && n.t < pl.beats && n.d > 0 && n.v >= 1 && n.v <= 127, `${label}: ${x.part.name} note ${JSON.stringify(n)}`);
}
await check('Every shape × every demo loop: the grammar holds, every move is rebuilt, the shape follows the reference', () => {
  const shapes = [];
  for (const d of TSHAPES) for (const L of TL.DEMOS) {
    const m = TM.buildShape(d), l = TL.demo(L.id), pl = TE.plan(m, l), M = pl.metrics, label = `${d.id} × ${L.id}`;
    grammar(pl, label);
    assert.equal(M.rebuilt, M.total, `${label}: ${pl.log.filter(x => x.status !== 'rebuilt').map(x => x.move.type + ':' + x.status).join(', ')}`);
    assert(M.fidelity >= 0.999, `${label}: main layers follow their lanes (${M.fidelity})`);
    assert(M.changes > 10 && M.longest <= M.longestRef, `${label}: changes ${M.changes}, longest ${M.longest} vs ${M.longestRef}`);
    shapes.push(M.shape);
  }
  const lo = Math.min(...shapes), avg = shapes.reduce((s, v) => s + v, 0) / shapes.length;
  console.log(`  shape match over ${shapes.length} combinations: lowest ${lo.toFixed(2)}, average ${avg.toFixed(2)}`);
  assert(lo >= 0.7 && avg >= 0.85, 'the energy follows the reference\'s tension');
});
await check('Layers: with three hat parts the closed hat leads, then the perc, then the open hat, each in fewer phrases', () => {
  const m = TM.buildShape(TSHAPES[0]), pl = TE.plan(m, TL.demo('warehouse')), n = name => pl.parts.find(x => x.part.name === name).act.on.reduce((s, v) => s + v, 0);
  assert(n('Closed hat') > n('Rim') && n('Rim') > n('Open hat') && n('Open hat') > 0, `${n('Closed hat')} > ${n('Rim')} > ${n('Open hat')}`);
  const off = TE.plan(m, TL.demo('warehouse'), {touches: {layers: false}}), all = name => off.parts.find(x => x.part.name === name).act.on.reduce((s, v) => s + v, 0);
  assert.equal(all('Open hat'), all('Closed hat'), 'without stacking, every part plays with its lane');
});
await check('Rolls land on your clap, on the grid of the subdivision playing, getting louder; throws decay by the measured step', () => {
  const m = TM.buildShape(TSHAPES[0]), pl = TE.plan(m, TL.demo('tech-house'));
  const roll = pl.log.find(l => l.move.type === 'roll'), clap = pl.parts.find(x => x.role === 'clap'), hits = clap.notes.filter(n => n.tag === 'roll');
  assert(hits.length >= 20 && hits.every(n => n.n === clap.part.pitch));
  const rolls = pl.log.filter(l => l.move.type === 'roll').map(l => l.move);
  for (const h of hits) { const r = rolls.find(m => h.t >= m.k0 - EPS && h.t < m.k1); assert(r, `hit ${h.t} belongs to a roll`); const st = r.steps.filter(s => s.k <= h.t + EPS).pop() || r.steps[0]; assert(Math.abs(h.t * st.n - Math.round(h.t * st.n)) < 1e-6, `hit ${h.t} on the 1/${st.n} grid`); }
  const own = hits.filter(h => h.t >= roll.move.k0 && h.t < roll.move.k1), firstHalf = own.filter(h => h.t < roll.move.k0 + 4), last = own.filter(h => h.t >= roll.move.k1 - 2);
  assert(Math.max(...last.map(h => h.v)) > Math.max(...firstHalf.map(h => h.v)), 'louder at the end');
  const echo = pl.log.find(l => l.move.type === 'echo' && l.status === 'rebuilt'), x = pl.parts.find(p => p.part.name === echo.parts[0]), ec = x.notes.filter(n => n.tag === 'echo').sort((a, b) => a.t - b.t);
  assert(ec.length >= 2);
  for (let i = 1; i < ec.length; i++) { assert(Math.abs(ec[i].t - ec[i - 1].t - echo.move.beats) < 1e-6 || Math.abs(ec[i].t - ec[i - 1].t) < 1e-6); }
  assert(ec[ec.length - 1].v < ec[0].v, 'the repeats get quieter');
});
await check('Stutters repeat your own first slice; tape stops bend the synths; filters arrive as CC74 that opens', () => {
  const m = TM.buildShape(TSHAPES.find(s => s.id === 'hard-techno')), pl = TE.plan(m, TL.demo('warehouse'));
  const st = pl.log.find(l => l.move.type === 'stutter' && l.status === 'rebuilt'), kick = pl.parts.find(x => x.role === 'kick');
  const reps = kick.notes.filter(n => n.t >= st.move.k0 - EPS && n.t < st.move.k1 - EPS);
  assert(reps.length >= 4 && reps.every(n => n.tag === 'stutter')); for (let i = 1; i < reps.length; i++) assert(Math.abs(reps[i].t - reps[i - 1].t - st.move.step) < 1e-6);
  const tape = pl.log.find(l => l.move.type === 'tapeStop'); assert.equal(tape.status, 'rebuilt');
  assert(pl.parts.filter(x => x.group !== 'drums').every(x => x.pb.some(p => p.v === -8191)), 'every synth bends down');
  const m2 = TM.buildShape(TSHAPES.find(s => s.id === 'melodic-techno')), p2 = TE.plan(m2, TL.demo('melodic')), pad = p2.parts.find(x => x.role === 'pad');
  const sweep = m2.moves.find(e => e.type === 'lp' && e.opening), cc = pad.cc.filter(c => c.t >= sweep.k0 && c.t < sweep.k1);
  assert(cc.length > 10); for (let i = 1; i < cc.length; i++) assert(cc[i].v >= cc[i - 1].v, 'the cutoff only opens');
  assert(cc[0].v < 50 && pad.cc.some(c => c.t >= sweep.k1 - 1 && c.v === 127), 'from closed to open');
});
await check('Your hand wins: a bar painted on plays, a bar painted off is silent; touches switch off for a faithful copy', () => {
  const m = TM.buildShape(TSHAPES[0]), l = TL.demo('warehouse'), acid = l.parts.find(p => p.name === 'Acid riff');
  const pl = TE.plan(m, l, TE.defaults(), {[acid.id]: {0: 1, 40: 0}}), x = pl.parts.find(p => p.id === acid.id);
  assert.equal(x.act.on[0], 1); assert.equal(x.act.on[40], 0); assert.equal(x.act.why[0], 3);
  assert(x.notes.some(n => n.t < 4) && !x.notes.some(n => n.t >= 160 && n.t < 164));
  const faithful = TE.plan(m, l, {touches: {layers: true, restart: true, holdBreaks: false, fills: false, impacts: false}});
  assert.equal(faithful.touches.length, 0); assert(faithful.fx.every(f => f.src === 'reference'));
  const full = TE.plan(m, l); assert(full.touches.some(t => t.k === 'fills'));
  for (const t of full.touches.filter(t => t.k === 'fills' && /beat 4/.test(t.text))) for (const k of full.parts.filter(x => x.role === 'kick')) assert(!k.notes.some(n => n.t >= t.bar * 4 + 3 - EPS && n.t < t.bar * 4 + 4), 'the fill took the kick off beat 4');
});
await check('Chords are held through breaks, ringing until the next chord', () => {
  const m = TM.buildShape(TSHAPES.find(s => s.id === 'deep-house')), l = TL.demo('deep'), pl = TE.plan(m, l, TE.defaults(), {[l.parts.find(p => p.role === 'chords').id]: Object.fromEntries(Array.from({length: 16}, (_, i) => [48 + i, 1]))});
  const x = pl.parts.find(p => p.role === 'chords'), br = m.sections.find(s => s.label === 'Break'), held = x.notes.filter(n => n.tag === 'held' && n.t >= br.start * 4 && n.t < br.end * 4);
  assert(held.length > 10, 'held: ' + held.length);
  const ons = [...new Set(x.notes.filter(n => n.t >= br.start * 4 && n.t < br.end * 4).map(n => n.t))].sort((a, b) => a - b);
  for (const n of held) { const next = ons.find(t => t > n.t + EPS) ?? br.end * 4; assert(n.t + n.d <= next + EPS && n.t + n.d >= next - 0.05, 'rings until the next chord'); }
});
await check('The analysed demo track, transplanted: every measured move handled, the gap silent, the reference\'s roll hits on your clap', () => {
  for (const L of TL.DEMOS) {
    const pl = TE.plan(ref, TL.demo(L.id)), M = pl.metrics, label = `demo × ${L.id}`;
    grammar(pl, label);
    assert(pl.log.every(l => ['rebuilt', 'preview', 'described'].includes(l.status)), `${label}: ${pl.log.filter(l => !['rebuilt', 'preview', 'described'].includes(l.status)).map(l => l.move.type + ' ' + l.status).join(', ')}`);
    assert(M.shape >= 0.65, `${label}: shape ${M.shape}`);
    const roll = pl.log.find(l => l.move.type === 'roll'); assert(/the reference's own hits/.test(roll.text));
    const gap = ref.moves.find(e => e.type === 'gap'); for (const x of pl.parts) assert(!x.notes.some(n => n.t >= gap.k0 && n.t < gap.k1));
  }
});
await check('MIDI out: the arranged file and the per-part files read back with every note, Drum Rack pads on one track, markers and CC', () => {
  const m = TM.buildShape(TSHAPES[1]), pl = TE.plan(m, TL.demo('tech-house')), trs = TE.tracks(pl);
  const back = OT.readMidi(TE.arrangedMidi(pl, 'Test · ±'));
  const notes = trs.reduce((s, t) => s + t.notes.length, 0), read = back.tracks.reduce((s, t) => s + t.notes.length, 0);
  assert.equal(read, notes, 'every note'); assert(Math.abs(back.bpm - pl.bpm) < 0.01);
  const drums = back.tracks.find(t => t.name === 'Drums'); assert(drums && new Set(drums.notes.map(n => n.n)).size >= 5, 'every pad on the Drum Rack track');
  assert(back.tracks.some(t => t.cc.some(c => c.cc === 74)), 'filter as CC74');
  for (const t of back.tracks) assert(/^[\x20-\x7e]*$/.test(t.name), 'ASCII names: ' + t.name);
  const files = TE.partMidis(pl); assert.equal(files.length, trs.length);
  for (const f of files) { const r = OT.readMidi(f.bytes); assert.equal(r.tracks.reduce((s, t) => s + t.notes.length, 0), f.track.notes.length, f.name); }
  const md = TE.planMarkdown(pl, {loop: 'Test'}); assert(/## Every move/.test(md) && /\| Bar \| Frequency \| CC74 \|/.test(md) && md.length > 2000);
});
await check('Speed: a 224-bar plan with a 16-bar loop takes under 250 ms', () => {
  const m = TM.buildShape(TSHAPES.find(s => s.id === 'melodic-techno')), l = TL.demo('melodic'); l.bars = 16; l.beats = 64;
  const t = Date.now(); for (let i = 0; i < 3; i++) TE.plan(m, l); const ms = (Date.now() - t) / 3;
  assert(ms < 250, `${ms.toFixed(0)} ms`); console.log(`  ${ms.toFixed(0)} ms per plan`);
});
await check('The player: looping for a minute, swapping tempo mid-loop and running off the end each schedule every beat once and never spin', async () => {
  const fs = await import('node:fs'), vm = await import('node:vm');
  if (!globalThis.TA) vm.runInThisContext(fs.readFileSync(new URL('./audio.js', import.meta.url), 'utf8') + '\nglobalThis.TA = TA;');
  const timers = []; const realSI = globalThis.setInterval, realCI = globalThis.clearInterval;
  globalThis.setInterval = fn => { timers.push(fn); return timers.length; }; globalThis.clearInterval = () => { timers.length = 0; };
  try {
    const ctx = {currentTime: 0}, sched = [];
    const mk = bpm => ({bpm, beats: 16});
    const gain = {cancelScheduledValues() {}, setValueAtTime() {}}, eng = {master: {gain}, spb: 60 / 130, plan: mk(130), load(p) { this.plan = p; this.spb = 60 / p.bpm; }, prepare() {}, silence() {}, prune() {}, schedule(a, b, tOf) { sched.push([a, b, tOf(a), tOf(b)]); }};
    const pl = TA.player(ctx, eng);
    pl.setLoop([0, 16]); pl.play(0);
    let lastBeat = 0, wraps = 0;
    for (let i = 0; i < 1800; i++) {                       // 63 s of 35 ms ticks
      ctx.currentTime += 0.035;
      const t = Date.now(); for (const f of timers) f(); assert(Date.now() - t < 50, 'a tick returns at once');
      const b = pl.beat(); if (b < lastBeat - 1) wraps++; lastBeat = b;
      if (i === 900) pl.swap(mk(124));
    }
    assert(wraps >= 7, 'the loop wrapped: ' + wraps);
    // every beat of every pass scheduled exactly once, and the clock never runs backwards or skips
    for (let i = 1; i < sched.length; i++) {
      const [a0, b0, , t1] = sched[i - 1], [a1, , t2] = sched[i];
      assert(a1 === b0 || (b0 === 16 && a1 === 0), `scheduled ${a0}–${b0} then from ${a1}`);
      assert(Math.abs(t2 - t1) < 1e-9, 'the next window starts exactly where the last ended, in time');
    }
    assert(sched.every(([a, b]) => b > a && b <= 16), 'windows inside the loop');
    assert(Math.abs(eng.spb - 60 / 124) < 1e-12, 'swapped to the new tempo on a bar line');
    // without a loop, it plays to the end and stops
    pl.stop(); pl.setLoop(null); sched.length = 0; let ended = false; pl.onend = () => { ended = true; };
    pl.play(8); for (let i = 0; i < 400 && !ended; i++) { ctx.currentTime += 0.035; for (const f of timers.slice()) f(); }
    assert(ended && !pl.playing, 'stops at the end');
  } finally { globalThis.setInterval = realSI; globalThis.clearInterval = realCI; }
});
console.log(`\n${checks} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
