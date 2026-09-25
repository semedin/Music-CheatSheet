import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Dependency-free checks of X-Ray's actual inline engine against signals whose answers are known:
// standard loudness and true-peak test tones, crafted file headers, and synthesized demo tracks
// with exact tempo, downbeat, key, sections, swing and kick note.
//   node xray-tests.mjs
const html = fs.readFileSync(new URL('./xray.html', import.meta.url), 'utf8');
const script = html.match(/<script>\n([\s\S]*?)<\/script>\n<\/body>/)[1];
new vm.Script(script); // the whole page script parses

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'unique static IDs');
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), 'anchor exists: ' + id);
for (const [, id] of script.matchAll(/\$\('#([\w-]+)'\)/g)) assert(ids.includes(id), 'JS target exists: ' + id);

const engine = html.match(/\/\* xray-engine:start \*\/([\s\S]*?)\/\* xray-engine:end \*\//)[1];
const context = {setTimeout, console, unescape, encodeURIComponent};
vm.createContext(context);
vm.runInContext(engine + '\nglobalThis.XR = XR;', context);
const XR = context.XR;

let checks = 0;
async function check(name, fn) { const t = Date.now(); await fn(); checks++; console.log(`PASS ${name} (${Date.now() - t} ms)`); }
const near = (v, want, tol, what) => assert(Math.abs(v - want) <= tol, `${what}: got ${v}, want ${want} ± ${tol}`);
const sine = (sr, sec, f, amp, ph = 0) => { const x = new Float32Array(Math.round(sr * sec)); for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(2 * Math.PI * f * i / sr + ph); return x; };

await check('BS.1770 loudness: a stereo 997 Hz sine at −23 dBFS reads −23.0 LUFS at 44.1 and 48 kHz', async () => {
  for (const sr of [44100, 48000]) {
    const x = sine(sr, 10, 997, Math.pow(10, -23 / 20)), r = await XR.loudness([x, x], sr);
    near(r.I, -23, 0.1, `integrated at ${sr}`); near(r.Smax, -23, 0.1, 'short-term max'); near(r.LRA, 0, 0.1, 'LRA');
  }
});
await check('A mono file is measured as dual mono', async () => {
  const x = sine(48000, 5, 997, Math.pow(10, -20 / 20));
  near((await XR.loudness([x], 48000)).I, (await XR.loudness([x, x], 48000)).I, 0.01, 'mono vs dual mono');
});
await check('True peak finds the inter-sample peak of a quarter-rate sine (sample peak −9.03, true −6.02)', () => {
  const r = XR.truePeak(sine(48000, 2, 12000, 0.5, Math.PI / 4));
  near(XR.db(r.sp ** 2), -9.03, 0.05, 'sample peak'); near(XR.db(r.tp ** 2), -6.02, 0.1, 'true peak');
});
await check('File sniffing: WAV, MP3 (CBR and Xing VBR), FLAC, Ogg Vorbis', () => {
  const w = XR.sniff(XR.wav(new Float32Array(100), new Float32Array(100), 48000), 'x.wav');
  assert.equal(w.codec, 'WAV'); assert.equal(w.sr, 48000); assert.equal(w.bits, 16); assert.equal(w.lossy, false);
  const frame = (xing) => { const len = Math.floor(144000 * 320 / 44100), f = new Uint8Array(len); f.set([0xff, 0xfb, 0xe0, 0x00]); if (xing) f.set([...'Xing'].map(c => c.charCodeAt(0)), 36); return f; };
  const id3 = new Uint8Array([73, 68, 51, 3, 0, 0, 0, 0, 0, 10, ...new Array(10).fill(0)]);
  const mp3 = new Uint8Array([...id3, ...frame(false), ...frame(false), ...frame(false)]);
  const m = XR.sniff(mp3, 'x.mp3'); assert.equal(m.codec, 'MP3'); assert.equal(m.bitrate, 320); assert.equal(m.sr, 44100); assert.equal(m.ch, 2); assert.equal(m.vbr, false);
  assert.equal(XR.sniff(new Uint8Array([...frame(true), ...frame(false)]), 'v.mp3').vbr, true);
  const flac = new Uint8Array(42); flac.set([0x66, 0x4c, 0x61, 0x43]); flac.set([0x0a, 0xc4, 0x42, 0xf0], 18); // 44100 Hz, 2 ch, 16 bit
  const f = XR.sniff(flac, 'x.flac'); assert.equal(f.codec, 'FLAC'); assert.equal(f.sr, 44100); assert.equal(f.ch, 2); assert.equal(f.bits, 16);
  const ogg = new Uint8Array(60); ogg.set([...'OggS'].map(c => c.charCodeAt(0))); ogg.set([1, ...'vorbis'].map(c => typeof c === 'string' ? c.charCodeAt(0) : c), 28); ogg[39] = 2; ogg.set([0x44, 0xac, 0, 0], 40);
  const o = XR.sniff(ogg, 'x.ogg'); assert.equal(o.codec, 'Ogg Vorbis'); assert.equal(o.sr, 44100); assert.equal(o.ch, 2);
});

const cases = [
  {bpm: 124, keyPc: 9, swing: 56, lead: 0.3, sr: 44100},
  {bpm: 128, keyPc: 5, swing: 50, lead: 0.05, sr: 48000},
  {bpm: 140, keyPc: 0, swing: 62, lead: 0.1, sr: 96000},
  {bpm: 174, keyPc: 2, swing: 50, lead: 0.2, sr: 44100},
];
let demo;
for (const o of cases) {
  await check(`Demo ${o.bpm} BPM, ${XR.keyName(o.keyPc, true)}, swing ${o.swing}%, ${o.sr / 1000} kHz: tempo, bar 1, key, sections, groove, kick`, async () => {
    const d = XR.synthDemo(o), an = await XR.analyze({L: d.L, R: d.R, sr: d.sr}), t = d.truth;
    near(an.grid.bpm, t.bpm, 0.02, 'BPM'); near(an.grid.t0, t.t0, 0.01, 'bar 1 time');
    assert.equal(an.key.name, t.key, 'key');
    assert.deepEqual(Array.from(an.sections, s => s.start), [...t.sections], 'section starts');
    assert.deepEqual(Array.from(an.sections, s => s.label), [...t.labels], 'section labels');
    assert.equal(an.sections[1].letter, an.sections[4].letter, 'groove and drop sound alike');
    assert.equal(an.sections[0].letter, an.sections[5].letter, 'intro and outro sound alike');
    near(an.groove.swing16, t.swing, 1.5, '16th swing');
    assert.equal(an.low.kick.midi, t.kickMidi, 'kick note');
    assert.equal(an.low.topNotes[0].midi % 12, t.keyPc, 'most common bass note is the tonic');
    assert.equal(an.low.rel.text, 'the root');
    assert(an.low.width[0].corr > 0.99, 'mono sub');
    assert(an.tempo.conf > 0.8, 'tempo confidence');
    const drop = an.sections.findIndex(s => s.label === 'Drop'), hits = XR.patternFor(an, drop), at = id => hits.filter(h => h.row.id === id).map(h => h.k);
    for (const k of [0, 4, 8, 12]) assert(at('kick').includes(k), 'kick on beat ' + (k / 4 + 1));
    assert(at('clap').includes(4) && at('clap').includes(12), 'clap on 2 and 4');
    if (o.bpm === 124) demo = an;
  });
}

await check('Edits: the grid can be doubled and restored; sections merge and keep their labels', () => {
  const an = demo, {bpm, t0} = an.grid;
  XR.setGrid(an, bpm * 2, t0); assert(an.grid.nBars >= 128 && an.grid.nBars <= 129, 'twice the bars');
  XR.setGrid(an, bpm, t0); assert.deepEqual(Array.from(an.sections, s => s.start), [0, 8, 24, 32, 40, 56]);
  XR.setGrid(an, bpm, t0 + an.grid.beatDur); assert(Math.abs(an.grid.t0 - t0 - an.grid.beatDur) < 1e-9 || an.grid.t0 < t0, 'bar 1 moves by a beat');
  XR.setGrid(an, bpm, t0);
  const edges = an.sections.map(s => s.start).concat(an.grid.nBars), labels = an.sections.map(s => ({userLabel: s.userLabel}));
  labels[1].userLabel = 'Drop'; edges.splice(3, 1); labels.splice(3, 1);
  XR.setSections(an, edges, labels);
  assert.equal(an.sections.length, 5); assert.equal(an.sections[1].label, 'Drop'); assert.equal(an.sections[2].bars, 16);
  an.sections = null; XR.derive(an); assert.equal(an.sections.length, 6);
});
await check('MIDI exports are valid Standard MIDI Files with the right tempo and parts', () => {
  const parse = bytes => {
    const b = Buffer.from(bytes); assert.equal(b.toString('latin1', 0, 4), 'MThd'); const ntr = b.readUInt16BE(10), ppq = b.readUInt16BE(12), tracks = [];
    let p = 14;
    for (let t = 0; t < ntr; t++) {
      assert.equal(b.toString('latin1', p, p + 4), 'MTrk'); const len = b.readUInt32BE(p + 4), end = p + 8 + len; let q = p + 8, run = 0, notes = 0, tempo = null, name = '', tick = 0;
      const vlq = () => { let v = 0, c; do { c = b[q++]; v = (v << 7) | (c & 127); } while (c & 128); return v; };
      while (q < end) {
        tick += vlq(); let st = b[q];
        if (st === 0xff) { const type = b[q + 1]; q += 2; const l = vlq(); if (type === 0x51) tempo = b.readUIntBE(q, 3); if (type === 0x03) name = b.toString('utf8', q, q + l); q += l; continue; }
        if (st & 0x80) { run = st; q++; } else st = run;
        if ((st & 0xf0) === 0x90 && b[q + 1] > 0) notes++;
        q += 2;
      }
      assert.equal(q, end, 'track length matches'); tracks.push({notes, tempo, name, tick}); p = end;
    }
    return {ppq, tracks};
  };
  const sk = parse(XR.skeleton(demo));
  assert.equal(sk.tracks.length, 5); assert.equal(sk.tracks[0].tempo, Math.round(60e6 / demo.grid.bpm));
  assert.deepEqual(sk.tracks.map(t => t.name.split(' ')[0]), ['X-Ray', 'Sections', 'Drums', 'Bass', 'Chords']);
  assert.equal(sk.tracks[1].notes, 6); assert(sk.tracks[2].notes > 400); assert(sk.tracks[3].notes > 20); assert(sk.tracks[4].notes >= 3 * 40);
  assert.equal(parse(XR.grooveMidi(demo)).tracks[0].notes, 64);
  assert(parse(XR.patternMidi(demo, 4)).tracks[0].notes >= 4 * 10);
  const h = parse(XR.harmonyMidi(demo)); assert.equal(h.tracks.length, 3);
});
await check('Compare: a copy 6 dB quieter differs only in loudness', async () => {
  const d = XR.synthDemo({}), q = x => x.map(v => v * 0.5);
  const B = await XR.analyze({L: q(d.L), R: q(d.R), sr: d.sr}), c = XR.compare(demo, B);
  near(c.b.lufs - c.a.lufs, -6.02, 0.05, 'loudness difference');
  for (const x of c.bands) near(x.d, 0, 0.05, 'band ' + x.band.id);
  assert.equal(c.tips.length, 1); assert.match(c.tips[0].text, /^Loudness/);
  const s = XR.summary(demo, 'demo'); assert.equal(JSON.parse(JSON.stringify(s)).curve.length, 60);
});
console.log(`${checks} checks passed.`);
