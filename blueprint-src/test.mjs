import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {load, analyse} from './load.mjs';

// Blueprint's engine against tracks whose answers are known.
//   node blueprint-src/test.mjs            demo + control (and variants)
//   node blueprint-src/test.mjs --mp3      also round-trips the demo through 320 and 128 kbps MP3 (needs ffmpeg)
//
// The demo track places every move at a known bar with known settings; the control is the same song with no
// effects at all. A detector has to find the move in the first and stay silent in the second.
const E = load(), {BP, BPDemo, XR} = E;
let checks = 0;
const t0 = Date.now();
async function check(name, fn) { const t = Date.now(); await fn(); checks++; console.log(`PASS ${name} (${Date.now() - t} ms)`); }
const near = (v, want, tol, what) => assert(Math.abs(v - want) <= tol, `${what}: got ${v}, want ${want} ± ${tol}`);
const octs = (a, b) => Math.abs(Math.log2(a / b));
const find = (an, type, k0, k1, extra = () => true) => an.moves.filter(e => e.type === type && e.k1 > k0 && e.k0 < k1 && extra(e));
const one = (an, type, k0, k1, extra) => { const f = find(an, type, k0, k1, extra); assert(f.length >= 1, `${type} expected between beats ${k0}–${k1}; moves: ${an.moves.map(e => `${e.type}@${e.at}`).join(', ')}`); return f.sort((a, b) => b.conf - a.conf)[0]; };

const demo = BPDemo.synthDemo({fx: true}), control = BPDemo.synthDemo({fx: false});
const A = await analyse(E, demo), C = await analyse(E, control);
const tr = Object.fromEntries(demo.truth.events.map(e => [e.type, e]));
console.log(`demo: ${A.moves.length} moves; control: ${C.moves.length} moves (analysis ${((Date.now() - t0) / 1000).toFixed(1)} s for both)`);

await check('Control (same song, no effects): no moves at all', () => {
  assert.equal(C.moves.length, 0, 'control moves: ' + C.moves.map(e => `${e.type}@${e.at} (${e.conf.toFixed(2)})`).join(', '));
  assert.equal(C.pumps.filter(p => p.pump).length, 0, 'control has no sidechain');
});
await check('Control sections are exact: 1, 17, 33, 49, 65, 73, 89', () => {
  assert.deepEqual(C.sections.map(s => s.start), [0, 16, 32, 48, 64, 72, 88]);
});
await check('Grid: 126 BPM to 0.01, bar 1 within 10 ms', () => {
  near(A.grid.bpm, 126, 0.01, 'bpm'); near(A.grid.t0, demo.truth.t0, 0.01, 'bar 1');
});
await check('Low-pass opening on the music in the intro: from ~300 Hz, open by bar 17, drums untouched', () => {
  const e = one(A, 'lp', 0, 64, e => e.opening); const t = tr.lp;
  // the spectrum is read up to 10.5 kHz, so the filter counts as open once its cutoff passes ~8 kHz (beat 56 here)
  assert.equal(e.target, 'music', 'filtered part'); assert(e.k0 <= 4, 'starts in the first bar: ' + e.at); near(e.k1, 58, 4, 'open once the cutoff passes ~8 kHz');
  assert(octs(e.fromHz, t.from) < 0.5, `starts near ${t.from} Hz: ${e.fromHz}`);
  // the traced cutoff follows the true curve fc = 300·40^(k/64) within half an octave all the way
  for (const p of e.curve.filter(p => p.hz)) assert(octs(p.hz, 300 * Math.pow(40, p.k / 64)) < 0.5, `cutoff at beat ${p.k}: ${p.hz} vs ${Math.round(300 * Math.pow(40, p.k / 64))}`);
});
await check('Low-pass held on the music bus through the bridge (bars 65–72), ~800 Hz', () => {
  const e = one(A, 'lpStatic', 256, 288); near(e.k0, 256, 4, 'start'); near(e.k1, 288, 4, 'end'); assert(octs(e.hz, 800) < 0.75, 'cutoff ' + e.hz);
});
await check('High-pass on the whole mix across the end of the build, gone at the gap', () => {
  // the drums change under the filter (the roll builds), so only the music can be checked: 'mix' or 'music' are both honest
  const e = one(A, 'hp', 176, 192, e => !e.opening); assert(['mix', 'music'].includes(e.target), 'target ' + e.target);
  near(e.k1, 191, 1, 'ends where the gap starts'); assert(octs(e.toHz, 700) < 1.25, 'final cutoff ' + e.toHz);
});
await check('Noise riser into the drop', () => {
  const e = one(A, 'riser', 160, 192); assert(e.noise, 'noise'); near(e.k1, 191, 2, 'ends at the gap'); assert(e.riseDb >= 9, 'climbs ' + e.riseDb);
});
await check('Pitch riser (+24 semitones) over the last bars of the build', () => {
  const e = one(A, 'pitchUp', 184, 192); near(e.semis, 24, 4, 'semitones'); near(e.k1, 191, 1.5, 'end');
});
await check('Snare roll: 8ths from bar 45, 16ths from 47, 32nds from 48, getting louder', () => {
  const e = one(A, 'roll', 176, 192); near(e.k0, 176, 2, 'start');
  const at = n => e.steps.find(s => s.n === n); assert(at(2) && at(4) && at(8), 'steps ' + JSON.stringify(e.steps));
  near(at(4).k, 184, 1, '16ths start'); near(at(8).k, 188, 1, '32nds start'); assert(e.velDb > 2, 'louder: ' + e.velDb);
});
await check('One beat of silence before the drop', () => {
  const e = one(A, 'gap', 188, 193); near(e.beats, 1, 0.15, 'length in beats'); assert.equal(e.bar, 48); assert(e.silent);
});
await check('Crash and sub boom on the drop', () => {
  const c = one(A, 'crash', 191, 194); assert.equal(c.bar, 48); assert(c.t60 > 1.5 && c.t60 < 4.5, 'crash T60 ' + c.t60);
  one(A, 'boom', 191, 194);
});
await check('Delay throw on the last clap of the groove: 3/16 (357 ms), steady decay', () => {
  const e = one(A, 'echo', 124, 136); assert.equal(e.bar, 32); assert(/3\/16/.test(e.note), 'note ' + e.note); near(e.ms, tr.echo.ms, 15, 'ms'); assert(e.repeatDb < -2 && e.repeatDb > -9, 'per-repeat ' + e.repeatDb);
});
await check('Stereo narrowing of the music across the build', () => {
  const e = one(A, 'width', 160, 192); assert(e.db <= -8, 'narrows ' + e.db); near(e.k1, 191, 2, 'end');
});
await check('Sidechain in the groove: ~8 dB, back within 1 dB after ~150–250 ms; none in the sections without it', () => {
  const g = A.pumps.find(p => p.start === 16 && p.end === 32); assert(g && g.pump, 'groove pump'); near(g.depth, 8, 1.5, 'depth'); assert(g.releaseMs > 120 && g.releaseMs < 260, 'release ' + g.releaseMs);
  for (const p of A.pumps) if (p.end <= 16 || (p.start >= 64 && p.end <= 72) || p.start >= 88) assert(!p.pump, 'no pump in ' + p.section);
});
await check('1/16 stutter on the last bar of the first drop', () => {
  const e = one(A, 'stutter', 252, 256); near(e.k0, 252, 0.5, 'start'); near(e.k1, 256, 0.5, 'end'); assert.equal(e.grid, '1/16');
});
await check('Downlifter (−24 semitones) out of the drop', () => {
  const e = one(A, 'pitchDown', 256, 262); near(e.k0, 256, 0.5, 'start'); near(e.semis, -24, 4, 'semitones'); near(e.k1, 260, 1.5, 'end');
});
await check('Reverse crash into bar 73, and the kick dropping out for the last two beats before it', () => {
  const r = one(A, 'reverse', 284, 288); assert.equal(r.bar, 72); near(r.beats, 3.7, 1.5, 'length');
  const k = one(A, 'kickOut', 284, 288); near(k.k0, 286, 0.5, 'kick out from'); near(k.k1, 288, 0.5, 'kick back on');
});
await check('Tape stop over the last two beats of the second drop', () => {
  const e = one(A, 'tapeStop', 348, 352); near(e.k0, 350, 1, 'start'); assert.equal(e.bar, 88); assert(e.semis < -12, 'semitones ' + e.semis);
});
await check('Fade out over the outro (−30 dB)', () => {
  const e = one(A, 'fade', 352, 384); assert(e.db < -18, 'dB ' + e.db); near(e.k1, 384, 4, 'end');
});
await check('No extra moves in the demo: every move matches a planted effect', () => {
  const planted = demo.truth.events.map(t => ({...t, k0: (t.start ?? t.bar) * 4 - (t.type === 'reverse' || t.type === 'gap' ? 4 : 0), k1: (t.end ?? t.bar + 1) * 4}));
  const alias = {lp: ['lp'], lpStatic: ['lpStatic'], hp: ['hp'], riser: ['riser'], pitchUp: ['pitchUp'], pitchDown: ['pitchDown'], roll: ['roll'], gap: ['gap'], crash: ['crash'], boom: ['boom'], echo: ['echo'], width: ['width'], stutter: ['stutter'], reverse: ['reverse'], kickOut: ['kickOut'], tapeStop: ['tapeStop'], fade: ['fade']};
  const extra = A.moves.filter(e => !planted.some(t => (alias[t.type] || []).includes(e.type) && e.k1 > t.k0 - 4 && e.k0 < t.k1 + 4));
  assert.equal(extra.length, 0, 'unplanted: ' + extra.map(e => `${e.type}@${e.at} (${e.conf.toFixed(2)})`).join(', '));
});
await check('Element lanes: kick, bass, chords and noise where they really play', () => {
  const on = (k, a, b) => { let c = 0; for (let q = a * 4; q < b * 4; q++) if (A.lanes[k][q] > 0.5) c++; return c / ((b - a) * 4); };
  assert(on('kick', 0, 32) > 0.9 && on('kick', 33, 47) < 0.05, 'kick');
  assert(on('bass', 0, 16) < 0.1 && on('bass', 17, 31) > 0.6 && on('bass', 33, 47) < 0.1, 'bass');
  assert(on('pads', 1, 88) > 0.9 && on('pads', 90, 96) < 0.1, 'chords');
  assert(on('fx', 45, 47) > 0.5 && on('fx', 17, 31) < 0.1, 'noise layer');
  assert(on('clap', 17, 31) > 0.4 && on('clap', 0, 15) < 0.05, 'clap');
});
await check('Every move has a title, a measured description and a Live recipe, with no blanks or NaN', () => {
  for (const e of A.moves) { const all = [e.title, e.what, ...e.recipe].join(' '); assert(e.title && e.what && e.recipe.length, e.type); assert(!/undefined|NaN|null|Infinity/.test(all), `${e.type}: ${all}`); }
});
await check('Transitions: one per section change, each with the moves that lead into it', () => {
  assert.equal(A.transitions.length, A.sections.length - 1);
  const drop = A.transitions.find(t => t.bar === 48); assert(drop, 'transition into the drop');
  for (const ty of ['roll', 'gap', 'crash', 'pitchUp', 'hp']) assert(drop.events.some(e => e.type === ty), 'drop transition includes ' + ty);
});
await check('Blueprint MIDI: a Standard MIDI File with markers, lanes, the roll and cutoff automation as CC74', () => {
  const m = BP.blueprintMidi(A), dv = new DataView(m.buffer);
  assert.equal(String.fromCharCode(...m.slice(0, 4)), 'MThd'); const nT = dv.getUint16(10);
  let p = 14, names = [], cc74 = 0, markers = 0;
  for (let t = 0; t < nT; t++) {
    assert.equal(String.fromCharCode(...m.slice(p, p + 4)), 'MTrk'); const len = dv.getUint32(p + 4), end = p + 8 + len; let q = p + 8, run = 0;
    const vlq = () => { let v = 0, b; do { b = m[q++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
    while (q < end) { vlq(); let st = m[q]; if (st & 0x80) q++; else st = run; run = st;
      if (st === 0xff) { const ty = m[q++], l = vlq(); if (ty === 3) names.push(new TextDecoder().decode(m.slice(q, q + l))); if (ty === 6) markers++; q += l; }
      else if ((st & 0xf0) === 0xb0) { if (m[q] === 74) cc74++; q += 2; } else if ((st & 0xf0) === 0xc0 || (st & 0xf0) === 0xd0) q += 1; else q += 2; }
    p = end;
  }
  assert(markers >= A.sections.length, 'section markers'); assert(names.some(n => /Rolls/.test(n)), 'roll track'); assert(names.some(n => /Filter cutoff · music/.test(n)), 'music cutoff track'); assert(cc74 >= 20, 'CC74 points: ' + cc74);
  assert.equal(BP.hzToCC(26), 0); assert.equal(BP.hzToCC(19900), 127);
});
await check('Report: Markdown with every section and every move', () => {
  const r = BP.report(A, 'demo'); assert(r.startsWith('# Blueprint')); for (const e of A.moves) assert(r.includes(e.title), e.title);
});

// A second rendering at another tempo, key and sample rate: the same moves must come out.
await check('Variant: 122 BPM, F minor, 48 kHz — the headline moves are found again, control still clean', async () => {
  const d2 = BPDemo.synthDemo({fx: true, bpm: 122, keyPc: 5, sr: 48000, lead: 0.4, seed: 5}), c2 = BPDemo.synthDemo({fx: false, bpm: 122, keyPc: 5, sr: 48000, lead: 0.4, seed: 5});
  const a2 = await analyse(E, d2), k2 = await analyse(E, c2);
  near(a2.grid.bpm, 122, 0.02, 'bpm');
  for (const [ty, k0, k1] of [['lp', 0, 64], ['hp', 176, 192], ['riser', 160, 192], ['roll', 176, 192], ['gap', 188, 193], ['crash', 191, 194], ['echo', 124, 136], ['stutter', 252, 256], ['pitchDown', 256, 262], ['reverse', 284, 288], ['tapeStop', 348, 352], ['fade', 352, 384], ['lpStatic', 256, 288], ['pitchUp', 184, 192]]) one(a2, ty, k0, k1);
  assert.equal(k2.moves.length, 0, 'control moves: ' + k2.moves.map(e => `${e.type}@${e.at}`).join(', '));
});

await check('Variants at 132 BPM (D minor) and 118 BPM (G minor, 48 kHz): every planted move found, nothing extra, controls clean', async () => {
  for (const o of [{bpm: 132, keyPc: 2, seed: 21}, {bpm: 118, keyPc: 7, seed: 33, sr: 48000}]) {
    const d = BPDemo.synthDemo({fx: true, ...o}), c = BPDemo.synthDemo({fx: false, ...o}), a = await analyse(E, d), k = await analyse(E, c);
    const want = new Set(d.truth.events.map(e => e.type).filter(t => t !== 'sidechain')), got = new Set(a.moves.map(e => e.type));
    assert.deepEqual([...want].filter(t => !got.has(t)), [], `${o.bpm} BPM missing`);
    assert.deepEqual([...got].filter(t => !want.has(t)), [], `${o.bpm} BPM extra`);
    assert.equal(k.moves.length, 0, `${o.bpm} BPM control: ` + k.moves.map(e => `${e.type}@${e.at}`).join(', '));
  }
});
await check('Section vocabulary: six types only, no two neighbours alike, and every section says why', () => {
  const six = BP.SECTION_TYPES.map(t => t.label);
  for (const an of [A, C]) {
    an.sections.forEach((s, i) => {
      assert(six.includes(s.label), 'type ' + s.label); assert(s.why && s.why.length >= 2 && s.why.every(w => w && !/NaN|undefined|Infinity/.test(w)), 'why for ' + s.name);
      if (i) assert.notEqual(s.label, an.sections[i - 1].label, `neighbours ${an.sections[i - 1].name} and ${s.name}`);
      assert(/^(Intro|Groove|Break|Build|Drop|Outro)( \d+)?$/.test(s.name), 'name ' + s.name);
    });
  }
  assert.deepEqual(A.sections.map(s => s.start), [0, 16, 32, 44, 48, 64, 72, 88], 'demo sections');
});
await check('Section names: the intro, the break, the build and both drops are called what they are', () => {
  const at = b => A.sections.find(s => b >= s.start && b < s.end).label;
  assert.equal(at(0), 'Intro'); assert.equal(at(36), 'Break'); assert.equal(at(46), 'Build'); assert.equal(at(50), 'Drop'); assert.equal(at(80), 'Drop'); assert.equal(at(94), 'Outro');
  const atC = b => C.sections.find(s => b >= s.start && b < s.end).label;
  assert.equal(atC(0), 'Intro'); assert.equal(atC(36), 'Break'); assert.equal(atC(50), 'Drop'); assert.equal(atC(80), 'Drop'); assert.equal(atC(92), 'Outro');
});

if (process.argv.includes('--mp3')) {
  await check('MP3 at 320 and 128 kbps: the same moves as the WAV', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-')), wav = path.join(dir, 'demo.wav');
    fs.writeFileSync(wav, XR.wav(demo.L, demo.R, demo.sr));
    for (const kbps of [320, 128]) {
      const mp3 = path.join(dir, `demo-${kbps}.mp3`), raw = path.join(dir, `demo-${kbps}.f32`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', kbps + 'k', mp3]);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', mp3, '-f', 'f32le', '-ac', '2', '-ar', '44100', raw]);
      const buf = fs.readFileSync(raw), f = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4), n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
      const a = await analyse(E, {L, R, sr: 44100}), want = new Set(A.moves.map(e => e.type)), got = new Set(a.moves.map(e => e.type));
      const missing = [...want].filter(t => !got.has(t));
      assert(missing.length <= (kbps === 128 ? 2 : 1), `${kbps} kbps missing: ${missing.join(', ')}`);
      console.log(`  ${kbps} kbps: ${a.moves.length} moves (WAV ${A.moves.length})${missing.length ? ', missing ' + missing.join(', ') : ''}`);
    }
    fs.rmSync(dir, {recursive: true, force: true});
  });
}
console.log(`\n${checks} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
