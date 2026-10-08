/* blueprint-synth:start */
// Blueprint's demo track: a 96-bar house/techno arrangement synthesized in plain JavaScript, with every
// transition move placed at a known bar and setting. With {fx: false} the same song is rendered with no
// effects at all (no filters, risers, rolls, gaps, throws, stutters, sidechain or fades), which is the
// control: the detectors must find the moves in the first and nothing in the second.
const BPDemo = (() => {
'use strict';
const TAU = 2 * Math.PI, mod = (a, n) => ((a % n) + n) % n;
const midi2hz = m => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function coef(type, f, sr, Q) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), a0 = 1 + al;
  const b0 = type === 'lp' ? (1 - cs) / 2 : (1 + cs) / 2, b1 = type === 'lp' ? 1 - cs : -(1 + cs);
  return [b0 / a0, b1 / a0, b0 / a0, -2 * cs / a0, (1 - al) / a0];
}
// A 24 dB/oct Butterworth low- or high-pass whose cutoff follows fcAt(seconds), applied in place to
// samples [i0, i1) of each channel. Coefficients are refreshed every 16 samples.
function sweep(chs, sr, i0, i1, type, fcAt) {
  i0 = Math.max(0, i0); i1 = Math.min(chs[0].length, i1);
  for (const x of chs) {
    const st = [[0, 0, 0, 0], [0, 0, 0, 0]]; let c = null;
    for (let i = i0; i < i1; i++) {
      if (((i - i0) & 15) === 0) { const f = fcAt(i / sr); c = [coef(type, f, sr, 0.5411961), coef(type, f, sr, 1.306563)]; }
      let v = x[i];
      for (let s = 0; s < 2; s++) { const [b0, b1, b2, a1, a2] = c[s], z = st[s], y = b0 * v + b1 * z[0] + b2 * z[1] - a1 * z[2] - a2 * z[3]; z[1] = z[0]; z[0] = v; z[3] = z[2]; z[2] = y; v = y; }
      x[i] = v;
    }
  }
}
const logLerp = (a, b, p) => a * Math.pow(b / a, Math.max(0, Math.min(1, p)));

function synthDemo(o = {}) {
  const fx = o.fx !== false, bpm = o.bpm || 126, sr = o.sr || 44100, keyPc = o.keyPc ?? 9, lead = o.lead ?? 0.25, bars = 96;
  const beat = 60 / bpm, bar = beat * 4, sx = beat / 4, len = Math.ceil((lead + bars * bar + 2.5) * sr), rand = rng(o.seed || 11);
  const T = b => lead + b * bar, I = t => Math.round(t * sr);
  const stem = () => [new Float32Array(len), new Float32Array(len)];
  const NT = 1 << 20, noise = new Float32Array(NT); for (let i = 0; i < NT; i++) noise[i] = rand() * 2 - 1;
  let np = 0; const nz = () => noise[(np = (np + 1) & (NT - 1))];
  const seekNoise = () => { np = Math.floor(rand() * NT); };
  const D = stem(), PAD = stem(), MU = stem(), F = stem();
  const add = (st, i, l, r = l) => { if (i >= 0 && i < len) { st[0][i] += l; st[1][i] += r; } };
  const SEC = [['Intro', 0, 16], ['Groove', 16, 32], ['Break', 32, 48], ['Drop', 48, 64], ['Bridge', 64, 72], ['Drop', 72, 88], ['Outro', 88, 96]];
  const sec = b => SEC.find(s => b >= s[1] && b < s[2])[0];

  // ---- drums ----
  const fk = midi2hz(33 + mod(keyPc - 9, 12) > 37 ? 21 + mod(keyPc - 9, 12) : 33 + mod(keyPc - 9, 12));
  const kickWave = (() => { const n = Math.round(0.42 * sr), w = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const x = i / sr, f = fk + (160 - fk) * Math.exp(-x / 0.028); ph += TAU * f / sr; w[i] = Math.sin(ph) * Math.exp(-x / 0.15) + (x < 0.003 ? (rand() * 2 - 1) * 0.12 : 0); } return w; })();
  const kick = t => { const o0 = I(t); for (let i = 0; i < kickWave.length; i++) add(D, o0 + i, 0.9 * kickWave[i]); };
  const noiseHit = (st, t, dec, g, hp, lp, pan = 0, reverse = false) => {
    const c1 = coef('hp', hp, sr, 0.8), c2 = coef('lp', lp, sr, 0.8), n = Math.round(Math.min(6, dec * 7) * sr), buf = new Float32Array(n), k = Math.exp(-1 / (dec * sr));
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, env = g; seekNoise();
    for (let i = 0; i < n; i++) {
      const v = nz(), y = c1[0] * v + c1[1] * x1 + c1[2] * x2 - c1[3] * y1 - c1[4] * y2; x2 = x1; x1 = v;
      const z = c2[0] * y + c2[1] * y1 + c2[2] * y2 - c2[3] * z1 - c2[4] * z2; y2 = y1; y1 = y; z2 = z1; z1 = z; buf[i] = z * env; env *= k;
    }
    const gl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2, o0 = I(t);
    if (reverse) for (let i = 0; i < n; i++) add(st, o0 - n + i, buf[n - 1 - i] * gl, buf[n - 1 - i] * gr);
    else for (let i = 0; i < n; i++) add(st, o0 + i, buf[i] * gl, buf[i] * gr);
  };
  const clap = (t, g = 0.85, st = D) => { for (const [d, k] of [[0, 0.5], [0.009, 0.6], [0.018, 1]]) noiseHit(st, t + d, k === 1 ? 0.06 : 0.01, g * k, 900, 2600); };
  const hat = (t, open, g) => noiseHit(D, t, open ? 0.11 : 0.02, g, 7500, 16000, open ? 0.25 : -0.2);
  for (let b = 0; b < bars; b++) {
    const t = T(b), s = sec(b);
    const kicks = s !== 'Break', full = b >= 16 && b < 32 || b >= 48 && b < 64 || b >= 72 && b < 88;
    if (kicks) for (let k = 0; k < 4; k++) { if (fx && b === 71 && k >= 2) continue; kick(t + k * beat); }
    if (full) for (const k of [1, 3]) clap(t + k * beat);
    if ((b >= 8 && s === 'Intro') || full || s === 'Bridge' || s === 'Outro') for (let k = 0; k < 16; k++) hat(t + k * sx + (k % 2 ? 0.012 : 0), false, k % 4 === 2 ? 0.15 : k % 2 ? 0.07 : 0.1);
    if (full) for (let k = 0; k < 4; k++) hat(t + k * beat + beat / 2, true, 0.09);
  }
  const truth = [];
  if (fx) {
    // snare roll into the drop: 8ths from bar 45, 16ths from bar 47, 32nds from bar 48 (counting from 1), stopping a beat early for the gap
    for (const [a, b, div] of [[44, 46, 2], [46, 47, 4], [47, 47.75, 8]]) for (let t = T(a); t < T(b) - 1e-6; t += beat / div) { const p = (t - T(44)) / (T(47.75) - T(44)); clap(t, 0.25 + 0.55 * p); }
    truth.push({type: 'roll', start: 44, end: 47.75, subdivs: [[44, 2], [46, 4], [47, 8]]});
    // delay throw on the last clap of the groove: dotted 8th (3/16), each repeat 6 dB down
    for (let r = 1; r <= 6; r++) clap(T(31) + 3 * beat + r * 0.75 * beat, 0.85 * Math.pow(0.5, r));
    truth.push({type: 'echo', bar: 32, note: '3/16', ms: 0.75 * beat * 1000, repeatDb: -6.02});
  }

  // ---- music ----
  const prog = [[0, 'm'], [8, ''], [3, ''], [10, '']];
  const chordNotes = b => { const [iv, q] = prog[b % 4], r = mod(keyPc + iv, 12); let base = 57 + mod(r - 9, 12); if (base > 62) base -= 12; return (q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12]).map(i => base + i); };
  const padBar = (b, g) => {
    const notes = chordNotes(b), fs = notes.map(m => midi2hz(m) / sr), o0 = I(T(b)), n = Math.round(bar * sr) + Math.round(0.12 * sr), pl = notes.map(() => rand()), pr = notes.map(() => rand());
    for (let i = 0; i < n; i++) {
      const x = i / sr, env = Math.min(1, x / 0.03) * (x < bar ? 1 : Math.max(0, 1 - (x - bar) / 0.12)); let l = 0, r = 0;
      for (let q = 0; q < fs.length; q++) { pl[q] += fs[q] * 0.996; if (pl[q] >= 1) pl[q] -= 1; pr[q] += fs[q] * 1.004; if (pr[q] >= 1) pr[q] -= 1; l += 2 * pl[q] - 1; r += 2 * pr[q] - 1; }
      add(PAD, o0 + i, g * l * env, g * r * env);
    }
  };
  for (let b = 0; b < bars; b++) if (sec(b) !== "Outro") padBar(b, 0.07);
  const bassMidi = b => 33 + mod(keyPc + prog[b % 4][0] - 9, 12);
  const bassNote = (t, m, dur) => {
    const f = midi2hz(m) / sr, o0 = I(t), n = Math.round((dur + 0.02) * sr); let lp = 0, ph = 0;
    for (let i = 0; i < n; i++) { const x = i / sr, env = Math.min(1, x / 0.003) * (x < dur ? 1 : Math.max(0, 1 - (x - dur) / 0.02)); ph += f; if (ph >= 1) ph -= 1; const v = 0.75 * Math.sin(TAU * ph) + 0.3 * (2 * ph - 1); lp += 0.09 * (v - lp); add(MU, o0 + i, 0.3 * lp * env); }
  };
  const motif = [0, 3, 7, 10, 12, 10, 7, 5].map(i => 69 + mod(keyPc - 9, 12) + i);
  const leadNote = (t, m, dur) => { const f = midi2hz(m) / sr, o0 = I(t), n = Math.round((dur + 0.05) * sr); let lp = 0, ph = 0; for (let i = 0; i < n; i++) { const x = i / sr, env = Math.min(1, x / 0.005) * (x < dur ? Math.exp(-x / 0.25) : 0); ph += f; if (ph >= 1) ph -= 1; lp += 0.25 * ((ph < 0.4 ? 1 : -1) - lp); add(MU, o0 + i, 0.07 * lp * env, 0.065 * lp * env); } };
  for (let b = 0; b < bars; b++) {
    const t = T(b), s = sec(b);
    if (s === 'Groove' || s === 'Drop' || s === 'Bridge') for (let k = 0; k < 4; k++) bassNote(t + k * beat + beat / 2, bassMidi(b), beat * 0.42);
    if ((s === 'Break' && b >= 36) || s === 'Drop') motif.forEach((m, i) => leadNote(t + i * beat / 2, m + (b % 2 && i === 7 ? 2 : 0), beat * 0.4));
  }
  // pad treatment: filters, width, sidechain
  if (fx) {
    sweep(PAD, sr, 0, I(T(16)), 'lp', t => logLerp(300, 12000, (t - T(0)) / (T(16) - T(0))));
    truth.push({type: 'lp', target: 'music', start: 0, end: 16, from: 300, to: 12000});
    // narrow the pad across the riser: side down 14 dB
    for (let i = I(T(40)); i < I(T(48)); i++) { const p = (i / sr - T(40)) / (T(47.75) - T(40)), sg = Math.pow(10, -14 * Math.min(1, p) / 20), l = PAD[0][i], r = PAD[1][i], m = (l + r) / 2, s = (l - r) / 2 * sg; PAD[0][i] = m + s; PAD[1][i] = m - s; }
    truth.push({type: 'width', target: 'music', start: 40, end: 47.75, db: -14});
    // sidechain: 8 dB of ducking from every kick, back within 1 dB after ~154 ms
    const depth = 1 - Math.pow(10, -8 / 20), tau = 0.09;
    for (let b = 0; b < bars; b++) { const s = sec(b); if (!(s === 'Groove' || s === 'Drop')) continue; for (let k = 0; k < 4; k++) { const tk = T(b) + k * beat, i0 = I(tk), n = Math.round(beat * sr); for (let i = 0; i < n && i0 + i < len; i++) { const g = 1 - depth * Math.exp(-i / sr / tau); PAD[0][i0 + i] *= g; PAD[1][i0 + i] *= g; } } }
    truth.push({type: 'sidechain', sections: ['Groove', 'Drop', 'Drop 2'], depth: 8, releaseMs: 154});
  }
  for (let i = 0; i < len; i++) { MU[0][i] += PAD[0][i]; MU[1][i] += PAD[1][i]; }
  if (fx) {
    // the bridge runs the whole music bus (pad and bass) through a low-pass at 800 Hz
    sweep(MU, sr, I(T(64)), I(T(72)), 'lp', () => 800);
    truth.push({type: 'lpStatic', target: 'music', start: 64, end: 72, hz: 800});
  }

  // ---- transition effects ----
  if (fx) {
    // noise riser: white noise through an opening low-pass, rising 24 dB, bars 41–48
    { const i0 = I(T(40)), i1 = I(T(47.75)), buf = [new Float32Array(len), new Float32Array(len)];
      seekNoise(); for (let i = i0; i < i1; i++) { const p = (i - i0) / (i1 - i0), g = 0.16 * Math.pow(10, -24 * (1 - p) / 20); buf[0][i] = nz() * g; buf[1][i] = buf[0][i]; }
      sweep(buf, sr, i0, i1, 'lp', t => logLerp(500, 9000, (t - T(40)) / (T(47.75) - T(40))));
      for (let i = i0; i < i1; i++) { F[0][i] += buf[0][i]; F[1][i] += buf[1][i]; } }
    truth.push({type: 'riser', start: 40, end: 47.75, from: 500, to: 9000, riseDb: 24});
    // pitch riser (a saw gliding up two octaves) over the last bars of the build, and a downlifter out of the drop
    const glide = (t0, t1, m0, m1, g) => { const o0 = I(t0), n = I(t1) - o0; let ph = 0, lp = 0; for (let i = 0; i < n; i++) { const p = i / n, f = midi2hz(m0 + (m1 - m0) * p) / sr, env = Math.min(1, i / (0.02 * sr)) * Math.min(1, (n - i) / (0.01 * sr)); ph += f; if (ph >= 1) ph -= 1; lp += 0.3 * ((2 * ph - 1) - lp); add(F, o0 + i, g * lp * env); } };
    glide(T(46), T(47.75), 60, 84, 0.15);
    truth.push({type: 'pitchUp', start: 46, end: 47.75, semis: 24});
    glide(T(64), T(65), 84, 60, 0.09);
    truth.push({type: 'pitchDown', start: 64, end: 65, semis: -24});
    // crash and sub boom on the drop
    noiseHit(F, T(48), 0.36, 0.28, 4000, 16000);
    truth.push({type: 'crash', bar: 48, decayS: 0.36 * Math.log(1000)});
    { const o0 = I(T(48)), n = Math.round(3 * sr); let ph = 0; for (let i = 0; i < n; i++) { const x = i / sr, f = 42 + 20 * Math.exp(-x / 0.08); ph += TAU * f / sr; add(F, o0 + i, 0.8 * Math.sin(ph) * Math.exp(-x / 0.8)); } }
    truth.push({type: 'boom', bar: 48});
    // reverse crash into bar 73
    noiseHit(F, T(72), 0.25, 0.3, 3000, 14000, 0, true);
    truth.push({type: 'reverse', bar: 72});
    truth.push({type: 'kickOut', start: 71.5, end: 72});
  }
  const L = new Float32Array(len), R = new Float32Array(len);
  for (let i = 0; i < len; i++) { L[i] = D[0][i] + MU[0][i] + F[0][i]; R[i] = D[1][i] + MU[1][i] + F[1][i]; }
  if (fx) {
    // high-pass on everything across the end of the build, 30 Hz → 700 Hz
    sweep([L, R], sr, I(T(44)), I(T(47.75)), 'hp', t => logLerp(30, 700, (t - T(44)) / (T(47.75) - T(44))));
    truth.push({type: 'hp', target: 'mix', start: 44, end: 47.75, from: 30, to: 700});
    // one beat of silence before the drop
    for (let i = I(T(47.75)); i < I(T(48)); i++) { L[i] = 0; R[i] = 0; }
    truth.push({type: 'gap', bar: 48, beats: 1});
    // 1/16 gate on the last bar of the first drop
    for (let i = I(T(63)); i < I(T(64)); i++) { const ph = mod((i / sr - T(63)) / sx, 1), g = ph < 0.5 ? Math.min(1, ph / 0.01) : Math.max(0, 1 - (ph - 0.5) / 0.01); L[i] *= g; R[i] *= g; }
    truth.push({type: 'stutter', start: 63, end: 64, grid: '1/16'});
    // tape stop over the last two beats of the second drop
    { const i0 = I(T(87.5)), n = I(T(88)) - i0, sL = L.slice(i0, i0 + n), sR = R.slice(i0, i0 + n);
      for (let i = 0; i < n; i++) { const u = i / n, p = n * (u - u * u / 2), k = Math.floor(p), f = p - k; L[i0 + i] = (sL[k] || 0) * (1 - f) + (sL[k + 1] || 0) * f; R[i0 + i] = (sR[k] || 0) * (1 - f) + (sR[k + 1] || 0) * f; } }
    truth.push({type: 'tapeStop', start: 87.5, end: 88});
    // fade the outro out by 30 dB
    for (let i = I(T(88)); i < len; i++) { const g = Math.pow(10, -30 * Math.min(1, (i / sr - T(88)) / (T(96) - T(88))) / 20); L[i] *= g; R[i] *= g; }
    truth.push({type: 'fade', start: 88, end: 96, db: -30});
  }
  let pk = 0; for (let i = 0; i < len; i++) { L[i] = Math.tanh(1.1 * L[i]); R[i] = Math.tanh(1.1 * R[i]); pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
  const gn = Math.pow(10, -1 / 20) / pk; for (let i = 0; i < len; i++) { L[i] *= gn; R[i] *= gn; }
  return {L, R, sr, truth: {bpm, t0: lead, keyPc, bars, sections: SEC.map(s => s[1]), labels: SEC.map(s => s[0]), events: truth}};
}
return {synthDemo, sweep};
})();
/* blueprint-synth:end */
