// Outside engine tests. Plain Node, no install:  node outside-src/test.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const O = createRequire(import.meta.url)('./engine.js');
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} ± ${tol}, got ${a}`);
const SR = 44100, dB = O.dB;
const sine = (hz, amp, secs = 6, phase = 0) => { const x = new Float32Array(Math.round(secs * SR)); for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(2 * Math.PI * hz * i / SR + phase); return x; };
const power = x => { let s = 0; for (const v of x) s += v * v; return s / x.length; };
const band = (psd, df, a, b) => { let s = 0; for (let k = Math.ceil(a / df); k * df < b; k++) s += psd[k]; return s; };

test('Thirteen places: the studio and twelve others, each with a chain, a model and checks', () => {
  assert.equal(O.PLACES.length, 13); assert.equal(new Set(O.PLACES.map(p => p.id)).size, 13);
  assert.deepEqual(O.PLACES[0].chain, []);
  for (const p of O.PLACES.slice(1)) { assert(p.chain.length && p.checks.length && p.model.length >= 3 && p.blurb && p.always && p.tag, p.id); assert(O.GROUPS.some(g => g[0] === p.group), p.id); for (const c of p.checks) assert(['bass', 'kick', 'mono', 'punch', 'groove', 'infra', 'lows', 'boom', 'harsh', 'tops'].includes(c), p.id + ' ' + c); }
  assert.deepEqual(O.PLACES.filter(p => p.chain.some(s => s.k === 'door')).map(p => p.id), ['toilets', 'smoke', 'queue']);
  for (const f of O.PLANTED) assert(O.FIXES[f[0]], f[0]);
});
test('Filters: the response formula matches the filter actually run on a signal', () => {
  for (const [spec, hz] of [[['highpass', 430, 1.3], 200], [['lowpass', 260, .71], 800], [['peaking', 2800, 1.6, 6], 2800], [['lowshelf', 85, 7], 40], [['highshelf', 6000, -9], 12000], [['lp1', 180], 720], [['hp1', 300], 75]]) {
    const k = O.coefs([spec], SR), x = sine(hz, .5, 2), y = O.run(x, k.cs[0]).subarray(SR); // skip the first second
    near(dB(power(y)) - dB(power(x.subarray(SR))), dB(O.mag2(k.cs[0], hz, SR)), .15, spec.join(' ') + ' at ' + hz);
  }
  near(dB(O.mag2(O.biquad('lp1', 1000, SR), 1000, SR)), -3.01, .05); near(dB(O.mag2(O.biquad('highpass', 100, SR), 100, SR)), -3.01, .05);
  near(dB(O.mag2(O.biquad('peaking', 1000, SR, 1, 6), 1000, SR)), 6, .01); near(dB(O.mag2(O.biquad('lowshelf', 100, SR, .707, 7), 5, SR)), 7, .1);
});
test('Each place does what its description says', () => {
  const r = (id, f, open) => { const x = O.respond(O.compile(O.placeById(id), SR), f, open); return {g: dB(x.h2), w: x.w}; };
  near(r('studio', 1000).g, 0, 1e-9); assert.equal(r('studio', 50).w, 1);
  assert(r('phone', 100).g < -55 && r('phone', 300).g < -12 && r('phone', 2800).g > 5 && r('phone', 1000).w === 0);
  assert(r('laptop', 60).g < -35 && r('laptop', 1000).g > 0); assert(r('bt', 30).g < -20 && r('bt', 95).g > 2 && r('bt', 500).w === 0);
  assert(r('floor', 50).g > r('floor', 1000).g + 5 && r('floor', 20).g < r('floor', 50).g - 12, 'heavy rig, high-passed'); assert.equal(r('floor', 60).w, 0); assert.equal(r('floor', 500).w, 1);
  assert(r('sub', 50).g - r('sub', 8000).g > 25, 'sub stack'); assert(r('car', 60).g - r('car', 350).g > 8, 'cabin gain');
  assert(r('field', 12000).g - r('field', 1000).g < -10, 'air'); assert(r('bar', 1000).g > r('floor', 1000).g, 'more room at the bar');
  for (const id of ['toilets', 'smoke', 'queue']) { assert(r(id, 50).g - r(id, 1000).g > 25, id + ' wall'); assert(r(id, 1000, true).g - r(id, 1000).g > 15, id + ' door'); }
  assert(r('queue', 1000).g < r('smoke', 1000).g && r('smoke', 1000).g < r('toilets', 1000).g, 'thicker walls further out');
});
test('A room\'s impulse response has the energy and the decay the report assumes', () => {
  const room = {rt: [1.7, 1.1, .6], pre: 18, wet: -7, er: .25, seed: 11}, [l, r] = O.impulse(room, SR), N = 1 << 17, plan = O.fftPlan(N);
  assert(l.length === r.length && l.length > 1.7 * SR && l.slice(0, Math.round(.017 * SR)).every(v => v === 0), 'pre-delay is silent');
  const re = new Float64Array(N), im = new Float64Array(N); re.set(l.subarray(0, N)); O.fft(re, im, plan);
  const esd = (a, b) => { let s = 0, n = 0; for (let k = Math.ceil(a * N / SR); k * SR / N < b; k++) { s += re[k] * re[k] + im[k] * im[k]; n++; } return s / n; };
  near(dB(esd(500, 2000)), dB(O.roomColour(room, 1000)), 1.5, 'mid energy'); near(dB(esd(40, 120)), dB(O.roomColour(room, 80)), 2, 'low energy'); near(dB(esd(8000, 14000)), dB(O.roomColour(room, 10000)), 2, 'high energy');
  const lo = O.chainRun(l, [['lowpass', 120, .71], ['lowpass', 120, .71]], SR), e = t => power(lo.subarray(Math.round(t * SR), Math.round((t + .1) * SR)));
  near((dB(e(.2)) - dB(e(.9))) / .7, 60 / 1.7, 6, 'low band decays at 60 dB per 1.7 s');
  let diff = 0; for (let i = 0; i < l.length; i++) diff += (l[i] - r[i]) ** 2; assert(diff / l.length > 1e-7, 'left and right differ');
  assert.equal(O.rtAt(room, 60), 1.7); assert.equal(O.rtAt(room, 1000), 1.1); assert.equal(O.rtAt(room, 12000), .6); assert(O.rtAt(room, 350) < 1.7 && O.rtAt(room, 350) > 1.1);
});
test('Five ambiences: finite, level, loop without a seam, and each its own colour', () => {
  const bright = {};
  for (const kind of ['crowd', 'bar', 'street', 'road', 'tiles', 'wind']) {
    const [l, r] = O.ambience(kind, 22050, 4); assert.equal(l.length, 4 * 22050); assert(l.every(Number.isFinite) && r.every(Number.isFinite), kind);
    near(Math.sqrt((power(l) + power(r)) / 2), .1, .002, kind + ' rms'); let step = 0; for (let i = 1; i < l.length; i++) step += (l[i] - l[i - 1]) ** 2; assert(Math.abs(l[0] - l[l.length - 1]) < 6 * Math.sqrt(step / l.length) + .01, kind + ' seam'); // the jump across the loop point is no bigger than any other step
    let peak = 0; for (const v of l) peak = Math.max(peak, Math.abs(v)); assert(peak < 1, kind + ' peak ' + peak);
    const hp = O.chainRun(l, [['highpass', 800, .71]], 22050); bright[kind] = dB(power(hp)) - dB(power(l));
  }
  assert(bright.crowd > bright.road + 10 && bright.crowd > bright.street + 6, 'voices are brighter than a road: ' + JSON.stringify(bright));
  assert.throws(() => O.ambience('nope'));
});
test('Loudness: a 1 kHz sine at −20 dBFS in both channels reads −20 LUFS, and 3 dB less in one', () => {
  const x = sine(1000, .1), z = new Float32Array(x.length), m = O.analyse(x, x, SR, {start: 0, len: 6}); near(m.lufs, -20 - 3.01 + 3.01 + .0, .4); near(m.peak, -20, .1); near(m.corr, 1, .001);
  near(O.analyse(x, z, SR, {start: 0, len: 6}).lufs, m.lufs - 3.01, .1); near(O.analyse(x, x.map(v => -v), SR, {start: 0, len: 6}).corr, -1, .001);
});
test('The loudest stretch is found, and only that stretch is measured', () => {
  const quiet = sine(200, .05, 40), loud = sine(200, .5, 40), L = new Float32Array(SR * 120); L.set(quiet, 0); L.set(loud, SR * 40); L.set(quiet, SR * 80);
  const ov = O.overview(L, L, SR); assert(ov.start >= 39.9 && ov.start + ov.len <= 80.1 && ov.len === 32, JSON.stringify([ov.start, ov.len])); near(ov.secs, 120, .01);
  near(O.analyse(L, L, SR, ov).peak, -6.02, .1); assert.equal(O.overview(quiet.subarray(0, SR * 10), quiet.subarray(0, SR * 10), SR).len, 10);
});
test('Mono loss is measured from the signal: out of phase cancels, in phase does not', () => {
  const a = sine(50, .4), phone = O.compile(O.placeById('phone'), SR), floor = O.compile(O.placeById('floor'), SR), mid = sine(1000, .2);
  const mix = (x, y) => x.map((v, i) => v + y[i]);
  const inPhase = O.analyse(mix(a, mid), mix(a, mid), SR, {start: 0, len: 6}); near(O.hear(inPhase, floor).monoLoss, 0, .05); near(O.hear(inPhase, floor).bassMono, 0, .05);
  const b = sine(50, .4, 6, 2 * Math.PI / 3), out = O.analyse(mix(a, mid), mix(b, mid), SR, {start: 0, len: 6}); // 120° apart: the mono sum is 6 dB down
  near(O.hear(out, floor).bassMono, -6.02, .4, 'bass, 120° apart'); near(O.hear(out, phone).mono.mid, 0, .05, 'the mids were mono all along');
  const wide = O.analyse(mix(a, mid), mix(a, mid.map(v => -v)), SR, {start: 0, len: 6}); assert(O.hear(wide, phone).mono.mid < -40, 'an out-of-phase mid vanishes on a phone'); near(O.hear(wide, floor).mono.mid, 0, .05, 'and stays on a stereo rig');
});
test('The bass note: a sine vanishes on a phone, the same note with harmonics does not', () => {
  const n = SR * 8, pure = new Float32Array(n), rich = new Float32Array(n), hat = new Float32Array(n), r = O.rng(2);
  for (let i = 0; i < n; i++) { const t = i / SR, gate = (t % .5) < .3 ? 1 : 0, ph = 2 * Math.PI * 55 * t; pure[i] = Math.sin(ph) * .5 * gate; let s = 0; for (let h = 1; h <= 24; h++) s += Math.sin(ph * h) / h; rich[i] = s * .3 * gate; hat[i] = (r() - .5) * .02; }
  const an = x => O.analyse(x.map((v, i) => v + hat[i]), x.map((v, i) => v + hat[i]), SR, {start: 0, len: 8}), a = an(pure), b = an(rich), ph = O.compile(O.placeById('phone'), SR), st = O.compile(O.placeById('studio'), SR);
  assert.equal(a.lowNote, 'A1'); near(a.lowHz, 55, 2);
  assert(O.hear(a, ph).bass - O.hear(a, st).bass < -25, 'sine: ' + (O.hear(a, ph).bass - O.hear(a, st).bass)); assert(O.hear(b, ph).bass - O.hear(b, st).bass > -10, 'saw: ' + (O.hear(b, ph).bass - O.hear(b, st).bass));
  const find = m => O.report(m).places.find(p => p.id === 'phone').found.map(f => f.fix); assert(find(a).includes('harmonics')); assert(!find(b).includes('harmonics'));
});
test('A room fills the gaps: the same kick is shallower on the floor, shallower still at the bar', () => {
  const d = O.demo(true, SR), m = O.analyse(d.L, d.R, SR), depth = id => O.hear(m, O.compile(O.placeById(id), SR)).depth;
  assert(depth('studio') > depth('booth') && depth('booth') > depth('floor') && depth('floor') > depth('bar'), ['studio', 'booth', 'floor', 'bar'].map(depth).join(' '));
  near(depth('phone'), depth('studio'), 1e-9); for (const p of O.PLACES) assert(O.tight(p) > 8 && O.tight(p) <= O.tight(O.PLACES[0]) + .3, p.id);
});
const bad = O.demo(false, SR), good = O.demo(true, SR), mb = O.analyse(bad.L, bad.R, SR), mg = O.analyse(good.L, good.R, SR), rb = O.report(mb), rg = O.report(mg);
test('The two demo mixes are the same sixteen bars at 126 BPM, at the same peak', () => {
  assert.equal(bad.L.length, good.L.length); near(bad.L.length / SR, 16 * 4 * 60 / 126, .001); near(mb.peak, -1.01, .05); near(mg.peak, -1.01, .05);
  near(mb.bpm, 126, .5); near(mg.bpm, 126, .5); assert.equal(mg.lowNote, 'F1'); near(mg.lowHz, 43.65, 1.5); assert(mb.corr < .5 && mg.corr > .9);
  assert.deepEqual(O.demo(false, SR).L.subarray(0, 5000), bad.L.subarray(0, 5000), 'deterministic');
});
test('The report finds all seven planted problems in the first mix, and none in the fixed one', () => {
  assert.deepEqual(rb.fixes.map(f => f.id).sort(), O.PLANTED.map(p => p[0]).sort()); assert.deepEqual(rg.fixes, []);
  assert(rb.overall <= 78 && rg.overall >= 97, `${rb.overall} / ${rg.overall}`); assert.equal(rg.verdict, 'Survives'); assert.equal(rb.verdict, 'Changes');
});
test('Each planted problem is reported in the places it belongs to', () => {
  const where = id => rb.fixes.find(f => f.id === id).places, has = (id, ...names) => names.forEach(n => assert(where(id).includes(n), `${id} should be reported in ${n}: ${where(id)}`));
  has('harmonics', 'Phone speaker'); has('click', 'Phone speaker'); has('basswide', 'Middle of the floor', 'At the sub stack'); has('wide', 'Phone speaker', 'Bluetooth speaker');
  has('tail', 'Middle of the floor', 'The queue', 'The toilets', 'The smoking area'); has('infra', 'Middle of the floor', 'At the sub stack'); has('mud', 'The car home', 'The back bar');
  for (const p of rb.places.slice(1)) { const g = rg.places.find(x => x.id === p.id); assert(g.score >= p.score, p.id); assert(p.score >= 4 && p.score <= 100); }
  assert(rb.places.find(p => p.id === 'phone').score < 50, 'the phone is where the first mix fails hardest'); assert.equal(rb.places[0].score, null);
});
test('What a place does to the balance and the level is in the report', () => {
  const p = id => rg.places.find(x => x.id === id), low = x => x.groups.sub + x.groups.bass;
  assert(low(p('phone')) < .01 && low(p('queue')) > .95 && low(p('sub')) > low(p('studio')) && p('laptop').groups.sub < .01);
  for (const x of rg.places) near(Object.values(x.groups).reduce((a, b) => a + b, 0), 1, .02, x.id);
  assert(p('phone').loud < -4 && p('laptop').loud < -3 && p('sub').loud > 3 && p('studio').loud === 0);
  near(low(p('studio')), .85, .12, 'the demo sits near the heavy end of a club record');
});
test('The checks catch what they claim to on signals built to trip them', () => {
  const noise = (list, g, seed) => { const r = O.rng(seed), x = new Float32Array(SR * 8); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return O.chainRun(x, list, SR).map(v => v * g); };
  const rep = x => O.report(O.analyse(x, x, SR, {start: 0, len: 8})), fixes = (r, place) => r.places.find(p => p.id === place).found.map(f => f.fix), add = (...xs) => xs[0].map((_, i) => xs.reduce((s, x) => s + x[i], 0));
  const bn = (lo, hi, g, seed) => noise([...Array(4).fill(['highpass', lo, .7]), ...Array(4).fill(['lowpass', hi, .7])], g, seed); // steep, so one band does not leak into the next
  const body = bn(40, 110, .5, 1), mids = bn(300, 2000, .02, 2);
  assert(fixes(rep(add(body, mids, bn(2000, 5000, .05, 3))), 'floor').includes('harsh'));
  assert(fixes(rep(add(body, mids)), 'field').includes('dull')); assert(fixes(rep(add(body, mids, bn(90, 320, .5, 4))), 'car').includes('mud'));
  assert(fixes(rep(add(body.map(v => v * .05), mids.map(v => v * 5))), 'floor').includes('thin')); assert(fixes(rep(add(body, mids, sine(22, .3, 8))), 'sub').includes('infra'));
  assert(fixes(rep(add(body, mids)), 'floor').includes('tail'), 'a low end with no gaps at all');
  assert(!fixes(rep(add(body, mids, bn(5000, 12000, .01, 5))), 'field').includes('dull')); assert(!fixes(rep(add(body, mids)), 'car').includes('mud'));
  assert.deepEqual(fixes(rep(add(body, mids)), 'studio'), []);
});
test('The Markdown report and the WAV writer', () => {
  const md = O.markdown(rb, 'Demo', rg, 'Fixed'); assert(md.startsWith('# Outside: Demo') && md.includes('## Fix first') && md.includes('| Phone speaker |') && md.includes('Reference: Fixed') && md.includes('not a measurement'));
  assert.equal(md.split('\n').filter(l => /^\| (?!Place|---)/.test(l)).length, 12); assert(O.markdown(rg, 'Fixed').includes('Nothing breaks'));
  const w = O.wav(Float32Array.of(0, 1, -1, 2), Float32Array.of(0, .5, -.5, 0), 48000), v = new DataView(w.buffer);
  assert.equal(w.length, 44 + 16); assert.equal(String.fromCharCode(...w.subarray(0, 4)), 'RIFF'); assert.equal(v.getUint32(24, true), 48000); assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getInt16(48, true), 32767); assert.equal(v.getInt16(52, true), -32767); assert.equal(v.getInt16(56, true), 32767, 'clipped, not wrapped'); assert.equal(O.clock(125), '2:05'); assert.equal(O.noteOf(43.65), 'F1');
});
console.log(`${count} Outside engine tests passed`);
