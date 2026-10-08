/* blueprint-engine:start */
// Blueprint analysis engine. It runs after X-Ray's engine (tempo, grid, sections, loudness) and adds:
// a 1/12-octave spectrogram split into its harmonic part (pads, synths, bass, risers) and its percussive
// part (drums), element lanes per beat, and one detector per kind of arrangement move. Pure JavaScript
// on Float32Arrays, no DOM: blueprint-src/test.mjs runs this exact code against tracks with known answers.
const BP = (() => {
'use strict';
const {db, clamp, pct, mod} = XR;
const makeFFT = XR._fft, hann = XR._hann, filt = XR._filt;
const tick = () => new Promise(r => setTimeout(r, 0));
const mean = a => { let s = 0, c = 0; for (const v of a) if (Number.isFinite(v)) { s += v; c++; } return c ? s / c : NaN; };
const median = a => pct(a, 0.5);
const sum = a => { let s = 0; for (const v of a) s += v; return s; };
const dB10 = p => 10 * Math.log10(p + 1e-14);
function ranks(a) { const idx = a.map((v, i) => i).sort((x, y) => a[x] - a[y]), r = new Array(a.length); idx.forEach((v, i) => r[v] = i); return r; }
function pearson(x, y) { const n = x.length; if (n < 3) return 0; const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : 0; }
// rank correlation of a series against time: +1 = always rising, −1 = always falling
function trend(a) { const v = a.filter(Number.isFinite); return v.length < 3 ? 0 : pearson(ranks(v), v.map((_, i) => i)); }
function linfit(xs, ys) { const n = xs.length, mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } const b = sxx ? sxy / sxx : 0; return {a: my - b * mx, b, r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0}; }
function med(buf, n) { for (let i = 1; i < n; i++) { const v = buf[i]; let j = i - 1; while (j >= 0 && buf[j] > v) { buf[j + 1] = buf[j]; j--; } buf[j + 1] = v; } return n & 1 ? buf[n >> 1] : 0.5 * (buf[n / 2 - 1] + buf[n / 2]); }

// ---------- note values ----------
const NOTE_VALUES = [[0.125, '1/32'], [1 / 6, '1/16T'], [0.25, '1/16'], [1 / 3, '1/8T'], [0.375, '3/32 (dotted 1/16)'], [0.5, '1/8'], [2 / 3, '1/4T'], [0.75, '3/16 (dotted 1/8)'], [1, '1/4'], [1.5, '3/8 (dotted 1/4)'], [2, '1/2'], [4, '1 bar']];
function noteValue(beats, tol = 0.05) { let best = null; for (const [v, name] of NOTE_VALUES) { const e = Math.abs(beats / v - 1); if (e <= tol && (!best || e < best.e)) best = {v, name, e}; } return best; }
const SUBDIV = {1: 'quarters', 2: '8ths', 3: '8th triplets', 4: '16ths', 6: '16th triplets', 8: '32nds', 12: '32nd triplets', 16: '64ths'};
function lengthText(beats) { const q = Math.round(beats * 4) / 4; if (q >= 4 && Math.abs(q / 4 - Math.round(q / 4)) < 0.01) return `${Math.round(q / 4)} bar${Math.round(q / 4) > 1 ? 's' : ''}`; if (q >= 1) return `${q % 1 ? q.toFixed(2).replace(/0$/, '') : q} beat${q === 1 ? '' : 's'}`; const v = noteValue(beats, 0.12); return v ? `a ${v.name} note` : `${Math.round(beats * 1000) / 1000} beats`; }
const hzText = f => !Number.isFinite(f) ? '–' : f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`;

// ---------- the spectral pass: 1/12-octave bands, mid and side, split into harmonic and percussive ----------
const FLO = 40;
function bandsFor(ra) { const fHi = Math.min(10500, ra * 0.46), NB = Math.floor(12 * Math.log2(fHi / FLO)) + 1; return {NB, fc: Array.from({length: NB}, (_, b) => FLO * Math.pow(2, b / 12))}; }
async function spectral(an, prog) {
  const L = an.La, R = an.Ra || an.La, ra = an.ra, N = 2048, hop = 512, fft = makeFFT(N), win = hann(N);
  const n = Math.max(1, Math.floor((L.length - N) / hop) + 1), binHz = ra / N, norm = 1 / Math.pow(N / 4, 2), {NB, fc} = bandsFor(ra);
  const wts = fc.map(c => {
    const lo = c * Math.pow(2, -1 / 24), hi = c * Math.pow(2, 1 / 24), out = [];
    if (hi - lo < binHz) { const k = c / binHz, k0 = Math.floor(k), f = k - k0, s = (hi - lo) / binHz; out.push([k0, (1 - f) * s], [k0 + 1, f * s]); }
    else for (let k = Math.floor(lo / binHz); k <= Math.ceil(hi / binHz); k++) { const a = Math.max(lo, (k - 0.5) * binHz), b = Math.min(hi, (k + 0.5) * binHz); if (b > a) out.push([k, (b - a) / binHz]); }
    return out.filter(([k]) => k >= 1 && k <= N / 2);
  });
  // flatness inside each band (from its own FFT bins) tells noise from tone: 0.5–0.6 for noise, low for a harmonic
  const flatBins = wts.map(w => w.length >= 4 ? w.map(([k]) => k) : null);
  const M = new Float32Array(n * NB), S = new Float32Array(n * NB), F = new Float32Array(n * NB), re = new Float64Array(N), im = new Float64Array(N), pM = new Float64Array(N / 2 + 1), pS = new Float64Array(N / 2 + 1);
  for (let j = 0; j < n; j++) {
    const o = j * hop;
    for (let i = 0; i < N; i++) { const k = o + i; re[i] = (k < L.length ? L[k] : 0) * win[i]; im[i] = (k < R.length ? R[k] : 0) * win[i]; }
    fft(re, im);
    for (let k = 0; k <= N / 2; k++) {
      const k2 = (N - k) % N, a = re[k], b = im[k], c = re[k2], d = im[k2];
      const lr = (a + c) / 2, li = (b - d) / 2, rr = (b + d) / 2, ri = (c - a) / 2;
      const mr = (lr + rr) / 2, mi = (li + ri) / 2, sr = (lr - rr) / 2, si = (li - ri) / 2;
      pM[k] = (mr * mr + mi * mi) * norm; pS[k] = (sr * sr + si * si) * norm;
    }
    for (let b = 0; b < NB; b++) {
      let m = 0, s = 0; for (const [k, w] of wts[b]) { m += pM[k] * w; s += pS[k] * w; } M[j * NB + b] = m; S[j * NB + b] = s;
      const fb = flatBins[b]; if (fb) { let ls = 0, as = 0; for (const k of fb) { ls += Math.log(pM[k] + 1e-24); as += pM[k]; } F[j * NB + b] = Math.exp(ls / fb.length) / (as / fb.length + 1e-24); } else F[j * NB + b] = NaN;
    }
    if ((j & 1023) === 0 && prog) await prog(0.6 * j / n);
  }
  // harmonic/percussive split (median filtering): sustained sounds are smooth along time,
  // hits are smooth along frequency. Soft (Wiener) masks keep every frame's energy accounted for.
  const WT = 17, WF = 13, buf = new Float32Array(Math.max(WT, WF)), Hm = new Float32Array(n * NB), Pm = new Float32Array(n * NB);
  for (let b = 0; b < NB; b++) {
    for (let j = 0; j < n; j++) { let c = 0; for (let q = Math.max(0, j - 8); q <= Math.min(n - 1, j + 8); q++) buf[c++] = M[q * NB + b]; Hm[j * NB + b] = med(buf, c); }
    if ((b & 15) === 0 && prog) await prog(0.6 + 0.25 * b / NB);
  }
  for (let j = 0; j < n; j++) for (let b = 0; b < NB; b++) { let c = 0; for (let q = Math.max(0, b - 6); q <= Math.min(NB - 1, b + 6); q++) buf[c++] = M[j * NB + q]; Pm[j * NB + b] = med(buf, c); }
  // H: sustained, P: hits, HS: the side signal of the sustained part, Q: what is neither steady in time nor
  // spread in frequency (glides, short notes) — the energy above the time-median, where pitch sweeps live.
  // Above 1.2 kHz the split is redone on a 23 ms window. In a 93 ms window, 16th-note hats overlap into a
  // continuous hiss that the time median calls sustained; at 23 ms each hat is its own hit.
  const hiMask = shortMasks(an, fc, NB, n, hop, N);
  const bHi = fc.findIndex(f => f >= 1200);
  const H = new Float32Array(n * NB), P = new Float32Array(n * NB), HS = new Float32Array(n * NB), Q = Pm;
  for (let j = 0; j < n; j++) for (let b = 0; b < NB; b++) {
    const i = j * NB + b, h = Hm[i] * Hm[i], p = Pm[i] * Pm[i];
    const w = b >= bHi && hiMask ? hiMask[j * NB + b] : h + p > 0 ? h / (h + p) : 0.5;
    H[i] = M[i] * w; P[i] = M[i] * (1 - w); HS[i] = S[i] * w; Q[i] = Math.max(0, M[i] - 2 * Hm[i]);
  }
  if (prog) await prog(1);
  return {n, hop, N, ra, fps: ra / hop, NB, fc, M, H, P, HS, Q, F, t: j => (j * hop + N / 2) / ra, j: t => Math.round((t * ra - N / 2) / hop)};
}
// Harmonic/percussive masks for the bands above 1.2 kHz from a 23 ms window (hop 6 ms), averaged back onto
// the main frames weighted by energy, so each main frame gets the share of its top end that is sustained.
function shortMasks(an, fc, NB, n, hop, N) {
  const x = an.Ma, ra = an.ra, Ns = 512, hs = 128, ns = Math.floor((x.length - Ns) / hs) + 1; if (ns < 32) return null;
  const fft = makeFFT(Ns), win = hann(Ns), binHz = ra / Ns, b0 = fc.findIndex(f => f >= 1200), nb = NB - b0;
  const wts = []; for (let b = b0; b < NB; b++) { const lo = fc[b] * Math.pow(2, -1 / 24), hi = fc[b] * Math.pow(2, 1 / 24), w = []; for (let k = Math.floor(lo / binHz); k <= Math.ceil(hi / binHz); k++) { const a = Math.max(lo, (k - 0.5) * binHz), c = Math.min(hi, (k + 0.5) * binHz); if (c > a && k >= 1 && k <= Ns / 2) w.push([k, (c - a) / binHz]); } if (!w.length) { const k = Math.round(fc[b] / binHz); w.push([k, (hi - lo) / binHz]); } wts.push(w); }
  const Ms = new Float32Array(ns * nb), re = new Float64Array(Ns), im = new Float64Array(Ns);
  for (let j = 0; j < ns; j++) {
    const o = j * hs; for (let i = 0; i < Ns; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let q = 0; q < nb; q++) { let v = 0; for (const [k, w] of wts[q]) v += (re[k] * re[k] + im[k] * im[k]) * w; Ms[j * nb + q] = v; }
  }
  const buf = new Float32Array(25), Hm = new Float32Array(ns * nb), Pm = new Float32Array(ns * nb);
  for (let q = 0; q < nb; q++) for (let j = 0; j < ns; j++) { let c = 0; for (let r = Math.max(0, j - 12); r <= Math.min(ns - 1, j + 12); r++) buf[c++] = Ms[r * nb + q]; Hm[j * nb + q] = med(buf, c); }
  for (let j = 0; j < ns; j++) for (let q = 0; q < nb; q++) { let c = 0; for (let r = Math.max(0, q - 6); r <= Math.min(nb - 1, q + 6); r++) buf[c++] = Ms[j * nb + r]; Pm[j * nb + q] = med(buf, c); }
  const out = new Float32Array(n * NB), sc = j => (j * hs + Ns / 2) / ra;
  for (let j = 0; j < n; j++) {
    const tc = (j * hop + N / 2) / ra, s0 = Math.max(0, Math.ceil((tc - N / 4 / ra * 1) * ra / hs - Ns / 2 / hs)), s1 = Math.min(ns - 1, Math.floor((tc + N / 4 / ra) * ra / hs - Ns / 2 / hs));
    for (let q = 0; q < nb; q++) { let e = 0, eh = 0; for (let r = s0; r <= s1; r++) { const i = r * nb + q, h = Hm[i] * Hm[i], p = Pm[i] * Pm[i], m = h + p > 0 ? h / (h + p) : 0.5; e += Ms[i]; eh += Ms[i] * m; } out[j * NB + b0 + q] = e > 0 ? eh / e : 0.5; }
  }
  return out;
}

// Fine envelopes at 5 ms from the mono signal: broadband, the 300 Hz–2 kHz "pad" band and the top end.
function envelopes(an) {
  const x = an.Ma, ra = an.ra, hop = Math.max(1, Math.round(ra / 200)), n = Math.floor(x.length / hop);
  const env = y => { const e = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let k = i * hop, z = k + hop; k < z; k++) s += y[k] * y[k]; e[i] = dB10(s / hop); } return e; };
  // the pump band uses 8th-order filters so a kick's body can't leak into it
  const B8 = [0.5097956, 0.6013449, 0.8999762, 2.5629154];
  return {rate: ra / hop, n, all: env(filt(x, 'hp', 30, ra)), pad: env(filt(filt(x, 'hp', 500, ra, B8), 'lp', 2500, ra, B8)), hi: env(filt(x, 'hp', 4000, ra))};
}
async function prepare(an, prog = () => {}) {
  an.S = await spectral(an, f => prog({stage: 'Harmonic / percussive split', frac: f}));
  an.env = envelopes(an);
  derive(an, {keepSections: !!an.userSections});
  return an;
}

// ---------- beat matrices ----------
// Band power averaged over each beat (or over part of each beat), from frames whose centre lies inside it.
function beatMatrix(an, arr, ph0 = 0, ph1 = 1) {
  const S = an.S, g = an.grid, nB = g.nBars * 4, out = new Float32Array(nB * S.NB);
  for (let k = 0; k < nB; k++) {
    const a = g.t0 + (k + ph0) * g.beatDur, b = g.t0 + (k + ph1) * g.beatDur;
    const j0 = clamp(Math.ceil((a * S.ra - S.N / 2) / S.hop), 0, S.n), j1 = clamp(Math.ceil((b * S.ra - S.N / 2) / S.hop), j0, S.n), c = Math.max(1, j1 - j0);
    for (let j = j0; j < j1; j++) for (let q = 0; q < S.NB; q++) out[k * S.NB + q] += arr[j * S.NB + q];
    for (let q = 0; q < S.NB; q++) out[k * S.NB + q] /= c;
  }
  return out;
}
const bandIdx = (S, f) => clamp(Math.round(12 * Math.log2(f / FLO)), 0, S.NB - 1);
function rowSum(arr, NB, k, b0, b1) { let s = 0; for (let q = b0; q <= b1; q++) s += arr[k * NB + q]; return s; }
function series(an, arr, f0, f1) { const S = an.S, nB = arr.length / S.NB, b0 = bandIdx(S, f0), b1 = bandIdx(S, f1), out = new Float32Array(nB); for (let k = 0; k < nB; k++) out[k] = dB10(rowSum(arr, S.NB, k, b0, b1)); return out; }
function frameSeries(an, arr, f0, f1) { const S = an.S, b0 = bandIdx(S, f0), b1 = bandIdx(S, f1), out = new Float32Array(S.n); for (let j = 0; j < S.n; j++) out[j] = dB10(rowSum(arr, S.NB, j, b0, b1)); return out; }

// ---------- filter fits ----------
// Attenuation D(f) of one spectrum against a reference, fitted with a flat gain plus a low- or high-pass
// skirt of slope s dB/oct from cutoff c. r2 says how much better that explains D than a flat gain alone.
const SLOPES = [12, 18, 24, 36, 48], TRUNC = 12;
// Robust fit: residuals beyond ±12 dB count as 12 dB, so a band region that doesn't follow the filter (dry hats
// above a filtered pad, a lead that enters) costs a fixed amount instead of deciding the fit.
const FLOORS = [9, 14, 20, 30, 48];
function fitSkirt(D, w, type, NB) {
  let W = 0; for (let b = 0; b < NB; b++) W += w[b]; if (W < 6) return null;
  const shape = new Float64Array(NB), T2 = TRUNC * TRUNC;
  const fitG = () => { let gs = 0; for (let b = 0; b < NB; b++) gs += w[b] * (D[b] - shape[b]); let g = gs / W; for (let it = 0; it < 2; it++) { let s2 = 0, w2 = 0; for (let b = 0; b < NB; b++) if (w[b] && Math.abs(D[b] - shape[b] - g) < TRUNC) { s2 += w[b] * (D[b] - shape[b]); w2 += w[b]; } if (w2 > 0.4 * W) g = s2 / w2; } let loss = 0; for (let b = 0; b < NB; b++) if (w[b]) loss += w[b] * Math.min(T2, (D[b] - shape[b] - g) ** 2); return {g, loss}; };
  shape.fill(0); const flat = fitG();
  // the skirt falls at s dB/oct past the cutoff until it reaches a floor (other sounds, or the noise floor)
  let best = null;
  for (let c = 1; c < NB - 1; c++) for (const s of SLOPES) for (const fl of FLOORS) {
    for (let b = 0; b < NB; b++) { const o = type === 'lp' ? b - c : c - b; shape[b] = o > 0 ? Math.max(-fl, -s * o / 12) : 0; }
    const f = fitG(); if (!best || f.loss < best.loss) best = {c, s, fl, g: f.g, loss: f.loss};
  }
  // depth of the skirt inside the weighted range; whether the attenuation keeps growing across the sloped
  // part the way a filter's does (judged on the bands the model explains)
  let depth = 0, res = 0, rc = 0, inl = 0; const beyond = [];
  for (let b = 0; b < NB; b++) if (w[b] > 0) {
    const o = type === 'lp' ? b - best.c : best.c - b, sh = o > 0 ? Math.max(-best.fl, -best.s * o / 12) : 0, r = D[b] - best.g - sh;
    if (Math.abs(r) < TRUNC) { inl++; if (o > 0) { depth = Math.max(depth, -sh); if (best.s * o / 12 <= best.fl + 3) beyond.push([o, D[b]]); } }
    if (b >= best.c - 2 && b <= best.c + 1 && o <= 0) { res += D[b] - best.g; rc++; }
  }
  beyond.sort((x, y) => x[0] - y[0]);
  const skirt = beyond.length >= 4 ? -pearson(beyond.map(x => x[0]), beyond.map(x => x[1])) : beyond.length ? 0.7 : 0;
  return {...best, r2: flat.loss > 0 ? 1 - best.loss / flat.loss : 0, depth, skirt, inliers: inl / W, res: rc ? res / rc : 0, rmse: Math.sqrt(best.loss / W), flatRmse: Math.sqrt(flat.loss / W)};
}
// Reference-relative fit for one spectrum: D = spectrum − reference (dB), weighted to the bands where the
// reference has content. `state` is 'filtered', 'open' (matches the reference) or null (neither).
function relFit(rowA, ref, NB, type) {
  let top = -Infinity; for (let b = 0; b < NB; b++) top = Math.max(top, ref[b] + 3 * b / 12);
  const D0 = new Float64Array(NB), D = new Float64Array(NB), w = new Float64Array(NB);
  for (let b = 0; b < NB; b++) { w[b] = ref[b] + 3 * b / 12 > top - 42 ? 1 : 0; D0[b] = Math.max(rowA[b] - ref[b], -48); }
  // smooth across ±2 semitones: a filter skirt is smooth, the harmonics of a chord are not
  for (let b = 0; b < NB; b++) { let x = 0, c = 0; for (let q = Math.max(0, b - 2); q <= Math.min(NB - 1, b + 2); q++) if (w[q]) { x += D0[q]; c++; } D[b] = c ? x / c : D0[b]; }
  const f = fitSkirt(D, w, type, NB); if (!f) return null;
  f.state = f.r2 > 0.6 && f.depth >= 9 && f.skirt >= 0.6 && f.inliers >= 0.7 ? 'filtered' : f.flatRmse < 4 || f.depth < 6 && f.r2 < 0.3 ? 'open' : null;
  return f;
}
// References that follow the music: for each beat, the open-state beats at the same place in a 4-bar loop
// (so the same chord), falling back to the whole open window.
function loopRefs(dbm, NB, r0, r1) {
  const all = new Float64Array(NB), byPh = Array.from({length: 16}, () => null), cnt = new Uint16Array(16);
  for (let b = 0; b < NB; b++) { const col = []; for (let k = r0; k < r1; k++) col.push(dbm[k * NB + b]); all[b] = pct(col, 0.75); }
  if (r1 - r0 >= 12) for (let k = r0; k < r1; k++) { const p = k % 16; if (!byPh[p]) byPh[p] = new Float64Array(NB); for (let b = 0; b < NB; b++) byPh[p][b] += dbm[k * NB + b]; cnt[p]++; }
  return k => { const p = k % 16; if (!byPh[p]) return all; const r = new Float64Array(NB); for (let b = 0; b < NB; b++) r[b] = byPh[p][b] / cnt[p]; return r; };
}

// ---------- spectral edges per beat ----------
// The highest and lowest bands that reach within 24 dB of the beat's strongest band, on a pink-compensated
// scale (+3 dB/oct) so a normal mix reads roughly flat. Filters move these edges; most other things don't.
function edges(an, X) {
  const S = an.S, NB = S.NB, nB = X.length / NB, hi = new Float32Array(nB).fill(NaN), lo = new Float32Array(nB).fill(NaN), lvl = new Float32Array(nB), y = new Float64Array(NB);
  for (let k = 0; k < nB; k++) {
    let tot = 0; for (let b = 0; b < NB; b++) { tot += X[k * NB + b]; y[b] = dB10(X[k * NB + b]) + 3 * b / 12; }
    lvl[k] = dB10(tot);
    const ys = new Float64Array(NB); for (let b = 0; b < NB; b++) { let s = 0, c = 0; for (let q = Math.max(0, b - 1); q <= Math.min(NB - 1, b + 1); q++) { s += y[q]; c++; } ys[b] = s / c; }
    let pk = -Infinity; for (let b = 0; b < NB; b++) pk = Math.max(pk, ys[b]);
    let h = -1, l = -1; for (let b = 0; b < NB; b++) if (ys[b] >= pk - 24) { if (l < 0) l = b; h = b; }
    hi[k] = h; lo[k] = l;
  }
  const floor = pct(Array.from(lvl), 0.9) - 40;
  for (let k = 0; k < nB; k++) if (lvl[k] < floor) { hi[k] = NaN; lo[k] = NaN; }
  const sm = a => Float32Array.from(a, (v, k) => { const w = [a[k - 1], v, a[k + 1]].filter(Number.isFinite).sort((p, q) => p - q); return w.length ? w[w.length >> 1] : NaN; });
  return {hi: sm(hi), lo: sm(lo), lvl};
}

// Candidate runs where a series moves steadily in one direction: at least `minChange` in total, spread
// over many beats (no single beat carries more than 40% of the move), rank-correlated with time.
function steadyRuns(a, dir, minChange, minLen = 4, maxLen = 128, rho = 0.8) {
  const n = a.length, hits = [];
  for (const W of [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128]) {
    if (W < minLen || W > maxLen) continue;
    for (let s = 0; s + W <= n; s += Math.max(1, W >> 3)) {
      const seg = Array.from(a.subarray ? a.subarray(s, s + W) : a.slice(s, s + W));
      if (seg.filter(Number.isFinite).length < 0.8 * W) continue;
      const v = seg.filter(Number.isFinite), change = (mean(v.slice(-Math.max(2, W >> 3))) - mean(v.slice(0, Math.max(2, W >> 3)))) * dir;
      if (change < minChange) continue;
      if (trend(seg) * dir < rho) continue;
      let maxStep = 0; for (let i = 1; i < v.length; i++) maxStep = Math.max(maxStep, (v[i] - v[i - 1]) * dir);
      if (maxStep > 0.4 * change + 1) continue;
      hits.push([s, s + W]);
    }
  }
  hits.sort((x, y) => x[0] - y[0]);
  const runs = [];
  for (const h of hits) { const r = runs[runs.length - 1]; if (r && h[0] <= r[1]) r[1] = Math.max(r[1], h[1]); else runs.push([...h]); }
  // trim flat ends: the run starts where the series leaves its starting level and ends where it arrives
  return runs.map(([s, e]) => {
    const v = k => a[k];
    while (e - s > minLen && Number.isFinite(v(s + 1)) && (v(s + 1) - v(s)) * dir <= 0.05 * minChange && (v(e - 1) - v(s + 1)) * dir >= minChange) s++;
    while (e - s > minLen && Number.isFinite(v(e - 2)) && (v(e - 1) - v(e - 2)) * dir <= 0.05 * minChange && (v(e - 2) - v(s)) * dir >= minChange) e--;
    return [s, e];
  });
}

// Where a ramp really starts and ends inside a run: fit flat → straight ramp → flat and pick the two
// breakpoints that explain the series best. (A step at the start, like a part entering, stays outside.)
function refineRamp(a, s, e) {
  const v = Array.from(a.subarray ? a.subarray(s, e) : a.slice(s, e)), n = v.length; if (n < 6 || v.some(x => !Number.isFinite(x))) return [s, e];
  const ps = [0], ps2 = [0]; for (const x of v) { ps.push(ps[ps.length - 1] + x); ps2.push(ps2[ps2.length - 1] + x * x); }
  const flatSse = (i, j) => { const m = j - i; if (m <= 0) return 0; const mu = (ps[j] - ps[i]) / m; return ps2[j] - ps2[i] - m * mu * mu; };
  let best = {sse: Infinity, c1: 0, c2: n};
  for (let c1 = 0; c1 <= n - 4; c1++) for (let c2 = c1 + 4; c2 <= n; c2++) {
    const y0 = c1 > 0 ? (ps[c1] - ps[0]) / c1 : v[0], y1 = c2 < n ? (ps[n] - ps[c2]) / (n - c2) : v[n - 1];
    let sse = flatSse(0, c1) + flatSse(c2, n); for (let i = c1; i < c2; i++) { const yy = y0 + (y1 - y0) * (i - c1 + 0.5) / (c2 - c1); sse += (v[i] - yy) ** 2; }
    if (sse < best.sse) best = {sse, c1, c2};
  }
  return [s + best.c1, s + best.c2];
}

// ---------- detectors ----------
const SRC_NAME = {mix: 'the whole mix', music: 'the music (synths, pads, bass)', drums: 'the drums'};
const toBeat = (an, t) => (t - an.grid.t0) / an.grid.beatDur;
const toTime = (an, k) => an.grid.t0 + k * an.grid.beatDur;

// Filter sweeps: a moving spectral edge proposes a run; every beat around it is then fitted against the open
// state (the spectrum just past the run's open end), and the sweep is the stretch where the fitted cutoff
// moves steadily. That second step is what tells a filter from an element coming or going.
function filterSweeps(an) {
  const S = an.S, NB = S.NB, out = [];
  for (const [src, X] of [['music', an.bm.H], ['drums', an.bm.P], ['mix', an.bm.M]]) {
    const E = edges(an, X), dbm = Float32Array.from(X, dB10), nB = X.length / NB, found = [];
    for (const [type, edge, dir] of [['lp', E.hi, 1], ['lp', E.hi, -1], ['hp', E.lo, 1], ['hp', E.lo, -1]]) {
      for (const [s, e] of steadyRuns(edge, dir, 9, 4, 128, 0.75)) {
        if (found.some(f => f.type === type && f.k0 <= s && f.k1 >= e)) continue;
        const openAtEnd = (type === 'lp') === (dir > 0);
        // the open state: start just past the run's open end, then keep walking outward while that window
        // still looks filtered next to the one beyond it (the edge can stall before the filter is open)
        const away = openAtEnd ? 1 : -1, row = k => dbm.subarray(k * NB, k * NB + NB);
        let r0 = openAtEnd ? Math.max(s, e - 2) : Math.max(0, s - 16), r1 = openAtEnd ? Math.min(nB, e + 16) : Math.min(nB, s + 2);
        for (let tries = 0; tries < 6; tries++) {
          const n0 = away > 0 ? r1 : Math.max(0, r0 - 16), n1 = away > 0 ? Math.min(nB, r1 + 16) : r0;
          if (n1 - n0 < 8) break;
          const refN = loopRefs(dbm, NB, n0, n1); let fl = 0, tot = 0;
          for (let k = r0; k < r1; k++) { const f = relFit(row(k), refN(k), NB, type); tot++; if (f && (f.state === 'filtered' || f.state !== 'open' && f.r2 >= 0.15 && f.depth >= 12)) fl++; }
          if (fl < 0.4 * tot) break;
          r0 = n0; r1 = n1;
        }
        // a high-pass can't be read against a stretch where the bass or kick comes or goes: that's the part, not a filter
        if (type === 'hp') { const m = (l, a, b) => { let x = 0; for (let k = a; k < b; k++) x += an.lanes[l][k] || 0; return x / Math.max(1, b - a); }; if (['bass', 'kick'].some(l => Math.abs(m(l, s, e) - m(l, r0, r1)) > 0.4)) continue; }
        const refOf = loopRefs(dbm, NB, r0, r1);
        const a0 = Math.max(0, Math.min(s - 24, away < 0 ? r1 : s)), a1 = Math.min(nB, Math.max(e + 24, away > 0 ? r0 + 2 : e)), fit = [];
        for (let k = a0; k < a1; k++) fit[k] = relFit(dbm.subarray(k * NB, k * NB + NB), refOf(k), NB, type);
        // cutoff position as a band; an open beat counts as beyond the range on the open side. A weak fit
        // still counts while it continues the trajectory: once dry hats sit above a filtered pad, single
        // beats are ambiguous but the cutoff keeps moving the same way.
        const openC = type === 'lp' ? NB + 2 : -3, weak = f => f && f.state !== 'open' && f.r2 >= 0.05 && f.depth >= 9;
        const raw = k => { const f = fit[k]; return !f ? NaN : f.state === 'filtered' || weak(f) ? f.c : f.state === 'open' ? openC : NaN; };
        // the cutoff, smoothed with a 5-beat median: chord changes make single beats jitter by several bands
        const cMed = []; for (let k = a0; k < a1; k++) { const w = []; for (let q = Math.max(a0, k - 2); q <= Math.min(a1 - 1, k + 2); q++) if (Number.isFinite(raw(q))) w.push(raw(q)); cMed[k] = Number.isFinite(raw(k)) && w.length >= 2 ? median(w) : NaN; }
        const cAt = k => cMed[k];
        // the moving direction of the cutoff band: an opening LP's cutoff rises, an opening HP's falls
        const sgn = type === 'lp' ? (openAtEnd ? 1 : -1) : (openAtEnd ? -1 : 1);
        // seed: the filtered beat inside the run nearest its middle
        let seed = -1; for (let d = 0; d <= (e - s); d++) for (const k of [Math.floor((s + e) / 2) - d, Math.floor((s + e) / 2) + d]) if (seed < 0 && k >= s && k < e && fit[k] && fit[k].state === 'filtered' && Number.isFinite(cMed[k])) seed = k;
        if (seed < 0) continue;
        // grow both ways while the cutoff keeps moving the right way (half an octave of slack, three blank beats allowed)
        let k0 = seed, k1 = seed, last = cMed[seed], miss = 0, endOpen = false;
        for (let k = seed + 1; k < a1; k++) { const c = cAt(k); if (!Number.isFinite(c)) { if (++miss > 3) break; continue; } if ((c - last) * sgn < -6) break; miss = 0; k1 = k; if (c === openC || raw(k) === openC && fit[k + 1] && fit[k + 1].state === 'open') { endOpen = true; break; } last = sgn > 0 ? Math.max(last, c) : Math.min(last, c); }
        last = cMed[seed]; miss = 0;
        for (let k = seed - 1; k >= a0; k--) { const c = cAt(k); if (!Number.isFinite(c) || c === openC) { if (++miss > 3) break; continue; } if ((last - c) * sgn < -6) break; miss = 0; k0 = k; last = sgn > 0 ? Math.min(last, c) : Math.max(last, c); }
        const ks = [], strong = []; for (let k = k0; k <= k1; k++) if (fit[k] && fit[k].state !== 'open' && (fit[k].state === 'filtered' || weak(fit[k]))) { ks.push(k); if (fit[k].state === 'filtered') strong.push(k); }
        if (strong.length < 4 || ks.length < 0.5 * (k1 - k0 + 1)) continue;
        const cs = ks.map(k => cMed[k]), tr = trend(cs) * sgn, spanOct = (Math.max(...cs) - Math.min(...cs)) / 12;
        if (tr < 0.7 || spanOct < 0.75) continue;
        const valid = ks.map(k => fit[k]), r2 = median(strong.map(k => fit[k].r2));
        // the sweep ends where the filter is out of the way (opening) or where it stops (closing)
        const end = endOpen ? k1 : k1 + 1;
        found.push({type, src, k0, k1: end, r0, r1, opening: openAtEnd, r2, tr, spanOct, slope: median(valid.map(f => f.s)), res: median(valid.map(f => f.res)),
          curve: Array.from({length: end - k0}, (_, i) => { const k = k0 + i; return {k, hz: ks.includes(k) && Number.isFinite(cMed[k]) && cMed[k] !== openC ? S.fc[clamp(Math.round(cMed[k]), 0, NB - 1)] : null}; }),
          fromHz: S.fc[clamp(Math.round(cMed[ks[0]]), 0, NB - 1)], toHz: S.fc[clamp(Math.round(cMed[ks[ks.length - 1]]), 0, NB - 1)], reachedOpen: endOpen && openAtEnd, strong: strong.length / ks.length,
          conf: clamp((r2 - 0.5) * 2.5, 0, 1) * clamp((tr - 0.5) * 2, 0, 1) * clamp(strong.length / (end - k0) + 0.5, 0, 1)});
      }
    }
    // one entry per stretch: overlapping finds of the same kind are the same sweep
    found.sort((x, y) => y.conf - x.conf);
    for (const f of found) if (!out.some(o => o.src === src && o.type === f.type && o.opening === f.opening && overlap(o, f) > 0.3)) out.push(f);
  }
  const merged = mergeSources(out, (a, b) => a.type === b.type && a.opening === b.opening);
  for (const e of merged) decideTarget(an, e);
  return merged;
}
// When the same move shows up in several sources, keep one. What was filtered is then decided by checking each
// part (music, drums) over the same beats against the same open-state reference: a part is filtered if most of
// its beats fit the same kind of skirt near the same cutoff.
function mergeSources(list, same) {
  const groups = [];
  for (const x of list.sort((a, b) => b.conf - a.conf)) {
    const g = groups.find(g => same(g[0], x) && overlap(g[0], x) > 0.5);
    if (g) g.push(x); else groups.push([x]);
  }
  return groups.map(g => ({...g[0], seenIn: [...new Set(g.map(x => x.src))], conf: clamp(Math.max(...g.map(x => x.conf)) + 0.1 * (g.length - 1), 0, 1)}));
}
function decideTarget(an, e) {
  const S = an.S, NB = S.NB, nB = an.bm.M.length / NB, part = {};
  for (const [src, X] of [['music', an.bm.H], ['drums', an.bm.P]]) {
    const dbm = Float32Array.from(X, dB10), refOf = loopRefs(dbm, NB, e.r0, e.r1); let hit = 0, tot = 0;
    for (let k = Math.max(0, Math.floor(e.k0)); k < Math.min(nB, Math.ceil(e.k1)); k++) {
      const want = e.curve.find(p => p.k === k); if (!want || !want.hz) continue; tot++;
      const f = relFit(dbm.subarray(k * NB, k * NB + NB), refOf(k), NB, e.type);
      if (f && f.state !== 'open' && f.r2 >= 0.1 && f.depth >= 9 && Math.abs(S.fc[f.c] / want.hz - 1) < 1.5 && Math.abs(Math.log2(S.fc[f.c] / want.hz)) < 1) hit++;
    }
    // a part with nothing in the range can't show a filter, and neither can one whose instruments differ from the
    // reference's (an intro without claps looks "filtered" next to a groove with them): those don't count
    const lv = series(an, X, 40, 10500), lvAll = series(an, an.bm.M, 40, 10500); let quiet = 0, n = 0; for (let k = Math.floor(e.k0); k < Math.ceil(e.k1) && k < nB; k++) { n++; if (lv[k] < lvAll[k] - 20) quiet++; }
    const m = (l, a, b) => { let x = 0, c = 0; for (let k = Math.max(0, Math.floor(a)); k < Math.min(nB, Math.ceil(b)); k++) { x += an.lanes[l][k] || 0; c++; } return c ? x / c : 0; };
    const changed = (src === 'drums' ? ['kick', 'clap', 'hats'] : ['pads']).some(l => Math.abs(m(l, e.k0, e.k1) - m(l, e.r0, e.r1)) > 0.15);
    part[src] = quiet > 0.6 * n || changed ? null : tot ? hit / tot : null;
  }
  const m = part.music, d = part.drums;
  e.partFit = part;
  e.target = m != null && d != null ? (m >= 0.4 && d >= 0.4 ? 'mix' : m >= d ? 'music' : 'drums') : m != null ? 'music' : d != null ? 'drums' : 'mix';
}
const overlap = (a, b) => { const o = Math.min(a.k1, b.k1) - Math.max(a.k0, b.k0); return o / Math.max(1, Math.min(a.k1 - a.k0, b.k1 - b.k0)); };

// A filter that sits still for a whole section: the music is darker than in its brightest sections by a clean
// low-pass skirt that keeps falling to the top of the range. A section that merely lacks its lead or its
// hats leaves a dip that recovers, and fails that test. (A static high-pass is indistinguishable from a
// section without bass, so it isn't reported.)
function staticFilters(an, sweeps) {
  const S = an.S, NB = S.NB, X = an.bm.H, secs = an.sections, avg = s => { const r = new Float64Array(NB); for (let k = s.start * 4; k < s.end * 4; k++) for (let b = 0; b < NB; b++) r[b] += X[k * NB + b]; return Array.from(r, v => dB10(v / Math.max(1, (s.end - s.start) * 4))); };
  const A = secs.map(avg), lv = A.map(r => dB10(r.reduce((x, v) => x + Math.pow(10, v / 10), 0))), out = [], top = Math.max(...lv);
  secs.forEach((s, i) => {
    if (lv[i] < top - 20 || s.end - s.start < 4) return;
    if (sweeps.some(w => w.k0 < s.end * 4 - 4 && w.k1 > s.start * 4 + 4)) return;
    // compare only with sections built from the same parts (kick and bass both in, or both out)
    const has = (q, k) => { let c = 0; for (let x = secs[q].start * 4; x < secs[q].end * 4; x++) if (an.lanes[k][x] > 0.5) c++; return c > 0.5 * (secs[q].end - secs[q].start) * 4; };
    const like = j => has(j, 'kick') === has(i, 'kick') && has(j, 'bass') === has(i, 'bass');
    const fits = A.map((r, j) => j === i || lv[j] < top - 20 || !like(j) ? null : relFit(A[i], r, NB, 'lp')).filter(Boolean);
    if (fits.length < 1) return;
    // a cutoff below 200 Hz is a bassline coming or going, not a filter on the music
    const good = fits.filter(f => f.state !== null && f.r2 >= 0.5 && f.depth >= 9 && f.skirt >= 0.85 && f.inliers >= 0.8 && S.fc[f.c] >= 200);
    // it has to hold against at least a third of the comparable sections, and none may say the opposite
    // (this section brighter than them by a clean skirt)
    if (good.length < Math.max(1, 0.34 * fits.length)) return;
    const cs = good.map(f => f.c); if (Math.max(...cs) - Math.min(...cs) > 10) return;
    const hz = S.fc[Math.round(median(cs))]; if (hz > 5000) return;
    out.push({type: 'lpStatic', target: 'music', k0: s.start * 4, k1: s.end * 4, hz, slope: median(good.map(f => f.s)), r2: median(good.map(f => f.r2)), conf: clamp((median(good.map(f => f.r2)) - 0.45) * 3, 0, 1) * clamp(good.length / fits.length + 0.4, 0, 1), against: good.length});
  });
  return out;
}

// Risers in the sustained upper mids (1.5–6 kHz): a steady climb of 9 dB or more, by a layer that is noise (flat inside
// each band) rather than a tonal part getting brighter.
function riserSeries(an) {
  // 1.5–6 kHz: where a riser's noise lives, and below most of the hats' and rides' energy
  const S = an.S, NB = S.NB, X = an.bm.H, HF = an.bm.HF, nB = X.length / NB, b0 = bandIdx(S, 1500), b1 = bandIdx(S, 6000);
  const E = new Float32Array(nB), flat = new Float32Array(nB), cent = new Float32Array(nB);
  for (let k = 0; k < nB; k++) {
    let s = 0, f = 0, wn = 0;
    for (let b = b0; b <= b1; b++) { const p = X[k * NB + b]; s += p; if (Number.isFinite(HF[k * NB + b])) f += HF[k * NB + b]; wn += p * b; }
    E[k] = dB10(s); flat[k] = s > 0 ? f / s : 0; cent[k] = s > 0 ? S.fc[0] * Math.pow(2, wn / s / 12) : NaN;
  }
  return {E, flat, cent};
}
function risers(an) {
  const {E, flat, cent} = an.riser, out = [];
  for (const [s0, e0] of steadyRuns(E, 1, 9, 2, 128, 0.85)) {
    const [s, e] = refineRamp(E, s0, e0), len = e - s; if (len < 2) continue;
    const rise = mean(Array.from(E.subarray(e - 2, e))) - mean(Array.from(E.subarray(s, s + 2)));
    // flatness at the top of the climb, against before it (the original run's start)
    const fl = mean(Array.from(flat.subarray(Math.max(s, e - Math.max(2, len >> 2)), e))), fl0 = mean(Array.from(flat.subarray(s0, s0 + Math.max(2, (e0 - s0) >> 2))));
    if (fl < 0.4 || fl - fl0 < 0.1) continue; // a tonal part getting louder or brighter is a melody, a fade or a filter, not a riser; a noise layer arriving makes the band flatter
    out.push({type: 'riser', k0: s, k1: e, riseDb: rise, flat: fl, flatRise: fl - fl0, centFrom: cent[s], centTo: cent[e - 1], centOct: Math.log2(cent[e - 1] / cent[s]), noise: fl > 0.45,
      conf: clamp((rise - 6) / 12, 0, 1) * clamp((fl - 0.25) * 5, 0, 1), level: Array.from(E.subarray(s, e))});
  }
  return out;
}

// Reverse cymbals and reverse swells: an accelerating climb in the top end that peaks right on a bar line,
// at frame resolution. The same window a bar earlier must not do the same thing.
function reverses(an, lines) {
  const S = an.S, g = an.grid, hi = frameSeries(an, an.S.H, 3000, 10500), out = [];
  const at = t => hi[clamp(S.j(t), 0, S.n - 1)];
  for (const bar of lines) {
    const t = g.barStart(bar); if (t > an.dur - 0.5) continue;
    const jEnd = S.j(t), best = {rise: 0};
    for (const beats of [0.5, 1, 2, 4, 8]) {
      const j0 = S.j(t - beats * g.beatDur); if (j0 < 0) continue;
      const xs = [], ys = []; for (let j = j0; j <= jEnd; j++) { xs.push(S.t(j)); ys.push(hi[j]); }
      const peak = Math.max(...ys.slice(-4)), start = Math.min(...ys.slice(0, 3)), f = linfit(xs, ys);
      const rise = peak - start;
      if (rise > best.rise && f.r > 0.85) Object.assign(best, {beats, rise, r: f.r});
    }
    if (best.rise < 15) continue;
    // not part of a longer riser, and not something that happens every bar
    const earlier = at(t - g.barDur - 0.05) - at(t - g.barDur - best.beats * g.beatDur);
    if (earlier > best.rise * 0.4) continue;
    out.push({type: 'reverse', k0: bar * 4 - best.beats, k1: bar * 4, bar, beats: best.beats, riseDb: best.rise, conf: clamp((best.rise - 12) / 15, 0, 1) * clamp((best.r - 0.8) * 5, 0, 1)});
  }
  return out;
}

// Pitch sweeps (risers, downlifters): a narrow peak in the unsteady part of the spectrum that glides
// continuously, frame after frame, instead of stepping from note to note.
function pitchSweeps(an) {
  const S = an.S, NB = S.NB, b0 = bandIdx(S, 120), b1 = bandIdx(S, 2500), g = an.grid, n = S.n, p = new Float32Array(n).fill(NaN);
  // pitch salience: each candidate fundamental collects its first five harmonics, so the track follows the
  // note instead of hopping between its partials
  const H5 = [0, 12, 19, 24, 28], AW = [1, 0.5, 0.33, 0.25, 0.2], sal = new Float64Array(NB), y = new Float64Array(NB);
  for (let j = 0; j < n; j++) {
    for (let b = 0; b < NB; b++) { let v = 0; for (let h = 0; h < 5; h++) { const q = b + H5[h]; if (q < NB) v += AW[h] * S.Q[j * NB + q]; } sal[b] = v; }
    // a light blur across neighbouring bands so the peak can be interpolated between them: a glide then
    // moves a little every frame, while a held note stays put
    for (let b = 0; b < NB; b++) y[b] = dB10(0.25 * (sal[b - 1] || 0) + 0.5 * sal[b] + 0.25 * (sal[b + 1] || 0));
    let top = -Infinity; for (let b = b0; b <= b1; b++) top = Math.max(top, y[b]);
    let best = -1, bv = -Infinity; const prev = p[j - 1];
    for (let b = Math.max(b0, 6); b <= Math.min(b1, NB - 7); b++) {
      if (!(y[b] >= y[b - 1] && y[b] >= y[b + 1]) || y[b] < top - 20) continue;
      const side = Math.max((y[b - 3] + y[b - 4] + y[b - 5] + y[b - 6]) / 4, (y[b + 3] + y[b + 4] + y[b + 5] + y[b + 6]) / 4);
      if (y[b] - side < 5) continue;
      const score = y[b] + (Number.isFinite(prev) && Math.abs(b - prev) <= 2 ? 15 : 0);
      if (score > bv) { bv = score; best = b; }
    }
    if (best < 0) continue;
    const a = y[best - 1], c = y[best + 1], d = 0.5 * (a - c) / (a - 2 * y[best] + c || 1);
    p[j] = best + clamp(d, -0.5, 0.5);
  }
  const out = [];
  for (const dir of [1, -1]) {
    let run = null, miss = 0;
    const close = () => {
      let v = run; run = null; if (!v || v.length < 8) return;
      // a slow glide reads as a staircase of one-semitone steps (the bands are a semitone wide); a melody or an
      // arpeggio holds each note, then jumps several semitones. Compare the steps between held plateaus.
      const plat = []; for (let i = 0; i < v.length;) { let q = i + 1; while (q < v.length && Math.abs(v[q][1] - v[i][1]) <= 0.3) q++; if (q - i >= 2) plat.push(mean(v.slice(i, q).map(x => x[1]))); i = q; }
      if (plat.length >= 3) { const steps = plat.slice(1).map((x, i) => Math.abs(x - plat[i])); if (median(steps) > 1.6) return; }
      v = v.map(([j], i) => { let sm = 0, c = 0; for (let q = Math.max(0, i - 1); q <= Math.min(v.length - 1, i + 1); q++) { sm += v[q][1]; c++; } return [j, sm / c]; });
      const total = (v[v.length - 1][1] - v[0][1]) * dir, dur = S.t(v[v.length - 1][0]) - S.t(v[0][0]);
      let moving = 0; for (let i = 1; i < v.length; i++) if ((v[i][1] - v[i - 1][1]) * dir > 0.03) moving++;
      // a glide is one smooth line in pitch against time, and it moves at nearly every moment: over any
      // ~70 ms it has climbed (or fallen). A melody steps and holds, so most of its 70 ms windows are flat.
      const r = pearson(v.map(x => x[0]), v.map(x => x[1])) * dir;
      let win = 0, mov = 0; for (let i = 0; i < v.length; i++) { let q = i; while (q < v.length && v[q][0] < v[i][0] + 3) q++; if (q >= v.length) break; win++; if ((v[q][1] - v[i][1]) * dir > 0.15) mov++; }
      if (total < 9 || dur < 0.9 * g.beatDur || moving < 0.5 * (v.length - 1) || r < 0.9 || win < 4 || mov < 0.7 * win) return;
      out.push({type: dir > 0 ? 'pitchUp' : 'pitchDown', k0: toBeat(an, S.t(v[0][0])), k1: toBeat(an, S.t(v[v.length - 1][0])), semis: total * dir, fromHz: S.fc[0] * Math.pow(2, v[0][1] / 12), toHz: S.fc[0] * Math.pow(2, v[v.length - 1][1] / 12), track: v.map(([j, q]) => [toBeat(an, S.t(j)), S.fc[0] * Math.pow(2, q / 12)]), conf: clamp((total - 5) / 10, 0, 1) * clamp(moving / (v.length - 1) * 1.4, 0, 1) * clamp((r - 0.85) * 10, 0, 1)});
    };
    // only frames that continue the glide join it; up to three frames can drop out in between
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(p[j])) { if (run && ++miss > 5) { close(); miss = 0; } continue; }
      const last = run && run[run.length - 1][1], gapF = run ? j - run[run.length - 1][0] : 0;
      // a glide moves at most about a semitone per frame (skipped frames buy a little more room). The
      // tracker may jump an octave when a filter takes the fundamental away: fold that back onto the line.
      let hit = null; if (run) for (const oct of [0, -12, 12]) { const v = p[j] + oct, d = (v - last) * dir; if (d > -0.35 && d < 1.2 + 0.4 * Math.min(2, gapF - 1)) { hit = v; break; } }
      if (hit != null) { run.push([j, hit]); miss = 0; }
      else if (run && ++miss <= 5) continue;
      else { close(); run = [[j, p[j]]]; miss = 0; }
    }
    close();
  }
  // merge pieces of one glide split by a dropout
  out.sort((a, b) => a.k0 - b.k0);
  for (let i = out.length - 1; i > 0; i--) { const a = out[i - 1], b = out[i]; if (a.type === b.type && b.k0 - a.k1 < 0.5 && Math.abs(Math.log2(b.fromHz / a.toHz)) * 12 < 3) { a.k1 = b.k1; a.toHz = b.toHz; a.semis += b.semis; a.track.push(...b.track); a.conf = Math.max(a.conf, b.conf, clamp((Math.abs(a.semis) - 5) / 10, 0, 1)); out.splice(i, 1); } }
  return out;
}

// Snare and clap rolls: the number of hits per beat in the clap band climbs in steps (8ths → 16ths → 32nds).
// A hit counts only if it is percussive (the drum part outweighs the sustained part at that moment) and
// reasonably strong for this track, so lead notes and leakage don't add up to a roll.
function rolls(an, exclude = []) {
  const E = an.E, g = an.grid, S = an.S, on = E.clap.on, rate = E.rate, nB = g.nBars * 4, gap = Math.round(0.022 * rate), peaks = [];
  const ref = pct(Array.from(on).filter((_, i) => i % 3 === 0 && on[i] > 0), 0.98) || 1;
  const b0 = bandIdx(S, 900), b1 = bandIdx(S, 4500);
  for (let i = 1; i < on.length - 1; i++) if (on[i] > 0.1 * ref && on[i] >= on[i - 1] && on[i] > on[i + 1]) {
    const last = peaks[peaks.length - 1]; if (last && i - last.i < gap) { if (on[i] > last.v) { last.i = i; last.v = on[i]; } } else peaks.push({i, v: on[i]});
  }
  const hits = [];
  for (const p of peaks) {
    p.t = p.i / rate - XR.LAT.clap;
    const j = clamp(S.j(p.t + 0.02), 0, S.n - 1), pp = rowSum(S.P, S.NB, j, b0, b1), hh = rowSum(S.H, S.NB, j, b0, b1);
    if (dB10(pp) >= dB10(hh) - 3) hits.push(p);
  }
  const per = Array.from({length: nB}, () => []);
  for (const p of hits) { const k = Math.floor(toBeat(an, p.t) + 1 / 16); if (k >= 0 && k < nB) per[k].push(p); }
  // a roll is hits on a subdivision grid: count a beat as n hits only if most of the n slots (8ths, triplets,
  // 16ths, 32nds...) have a hit on them. Stray onsets off the grid don't add up to a roll.
  const count = per.map((ps, k) => {
    let top = 0; for (let q = Math.max(0, k - 8); q < Math.min(nB, k + 8); q++) for (const p of per[q]) top = Math.max(top, p.v);
    const hs = ps.filter(p => p.v >= 0.18 * top && p.v >= 0.2 * ref).map(p => toBeat(an, p.t) - k);
    // pick the grid that explains the hits best: slots filled, minus hits that sit off it
    let best = hs.length ? 1 : 0, bs = -Infinity;
    for (const n of [2, 3, 4, 6, 8]) {
      // allow one common offset (onsets in a dense roll read a little late, and rolls get pushed or dragged)
      const d0 = median(hs.map(x => x - Math.round(x * n) / n)), dd = Math.abs(d0) <= 0.3 / n ? d0 : 0, ys = hs.map(x => x - dd);
      let on = 0; for (let i = 0; i < n; i++) if (ys.some(x => Math.abs(x - i / n) <= 0.22 / n)) on++;
      const off = ys.filter(x => { const r = x * n - Math.round(x * n); return Math.abs(r) > 0.22; }).length;
      if (on >= Math.ceil(0.75 * n) && on - 0.5 * off > bs) { bs = on - 0.5 * off; best = n; }
    }
    return best;
  });
  const out = [];
  for (let k = 0; k < nB;) {
    if (count[k] < 2 || exclude.some(x => k >= x.k0 - 0.5 && k < x.k1)) { k++; continue; }
    let e = k + 1; while (e < nB && count[e] >= count[e - 1] && count[e] >= 2 && !exclude.some(x => e >= x.k0 - 0.5 && e < x.k1)) e++;
    const len = e - k, cs = count.slice(k, e), mx = Math.max(...cs);
    // grooves with steady 8th or 16th snares aren't rolls: the rate has to climb, or be unusual for the section
    const before = count.slice(Math.max(0, k - 8), k), usual = before.length ? median(before) : 0;
    if (len >= 4 && mx >= 4 && (mx >= 2 * cs[0] || usual < 1.5)) {
      const steps = []; cs.forEach((c, i) => { if (!steps.length || steps[steps.length - 1].n !== c) steps.push({k: k + i, n: c}); });
      // a step of a single beat between two others is usually a stray hit: fold it into its neighbour
      for (let i = steps.length - 2; i > 0; i--) { const nx = steps[i + 1].k - steps[i].k; if (nx === 1) steps.splice(i, 1); }
      const hs = []; for (let q = k; q < e; q++) for (const p of per[q]) hs.push({k: toBeat(an, p.t), v: p.v});
      const v0 = mean(per[k].map(p => p.v)), v1 = mean(per[e - 1].map(p => p.v));
      out.push({type: 'roll', k0: k, k1: e, steps: steps.map(s => ({k: s.k, n: s.n, name: SUBDIV[s.n] || `${s.n} per beat`})), hits: hs, velDb: 20 * Math.log10((v1 + 1e-9) / (v0 + 1e-9)), conf: clamp(len / 8, 0, 1) * clamp((mx / Math.max(1, cs[0]) - 1), 0.5, 1)});
    }
    k = e;
  }
  return out;
}

// Silence before a downbeat: the broadband level falls 25 dB under the bars before and stays down until the
// bar line, where the same spot a bar earlier was full.
function gaps(an, lines) {
  const env = an.env, g = an.grid, out = [], at = t => clamp(Math.round(t * env.rate), 0, env.n - 1);
  for (const bar of lines) {
    const t = g.barStart(bar); if (t <= 4 * g.barDur * 0 + 0.5 || t > an.dur - 0.2) continue;
    const ref = median(Array.from(env.all.subarray(at(t - 4 * g.barDur), at(t - g.barDur))));
    if (!Number.isFinite(ref)) continue;
    const i1 = at(t + 0.03); let i = i1; while (i > at(t - 2.2 * g.beatDur) && env.all[i] > ref - 25) i--; // allow the next hit's attack
    let e = i; while (i > at(t - 2.2 * g.beatDur) && env.all[i] <= ref - 25) i--;
    const s = i + 1, len = (e - s + 1) / env.rate;
    if (len < 0.06 || e < at(t - 0.06)) continue;
    const depth = median(Array.from(env.all.subarray(s, e + 1))) - ref;
    const prev = median(Array.from(env.all.subarray(s - Math.round(g.barDur * env.rate), e + 1 - Math.round(g.barDur * env.rate))));
    if (!(prev - ref > depth + 15)) continue;
    const beats = len / g.beatDur;
    out.push({type: 'gap', k0: bar * 4 - beats, k1: bar * 4, bar, beats, depth, silent: depth < -45, conf: clamp((-depth - 20) / 15, 0, 1) * clamp(len / 0.1, 0, 1)});
  }
  return out;
}

// Impacts on a downbeat: a crash (top end jumps and rings out) or a sub boom (low end swells), measured
// against the same spot in the next two bars, so a pattern that repeats every bar doesn't count.
function impacts(an, lines) {
  const S = an.S, g = an.grid, hi = frameSeries(an, S.H, 4000, 10500), lo = frameSeries(an, S.H, 40, 75), out = [];
  const avg = (a, t0, t1) => mean(Array.from(a.subarray(clamp(S.j(t0), 0, S.n), clamp(S.j(t1), 0, S.n))));
  // decay: a straight line through the dB curve from the peak until it meets the level of later bars
  const decay = (a, t, base) => {
    const j0 = S.j(t); let jp = j0, pk = -Infinity; for (let j = Math.max(0, j0 - 1); j < Math.min(S.n, j0 + 6); j++) if (a[j] > pk) { pk = a[j]; jp = j; }
    // fit from 3 dB under the peak (the analysis window smears the very top) down to 20 dB under it
    const xs = [], ys = []; for (let j = jp; j < Math.min(S.n, jp + Math.round(6 * S.fps)); j++) { if (a[j] < Math.max(base + 6, pk - 20)) break; if (a[j] <= pk - 3) { xs.push(S.t(j)); ys.push(a[j]); } }
    if (xs.length < 4) return {t60: null, s: xs.length / S.fps};
    const f = linfit(xs, ys); return {t60: f.b < -1 ? -60 / f.b : null, s: xs[xs.length - 1] - xs[0], span: pk - ys[ys.length - 1]};
  };
  const nb0 = bandIdx(S, 4000), noiseAt = t => { let f = 0, w = 0; for (let j = S.j(t); j < S.j(t + 0.5 * g.beatDur); j++) for (let b = nb0; b < S.NB; b++) { const i = j * S.NB + b; if (Number.isFinite(S.F[i])) { f += S.H[i] * S.F[i]; w += S.H[i]; } } return w ? f / w : 0; };
  // the sub boom is read between the kick's tail and an offbeat bass: 20–50% into the first two beats
  const loM = frameSeries(an, S.M, 40, 75), between = (t0) => mean([0, 1].map(q => avg(loM, t0 + (q + 0.2) * g.beatDur, t0 + (q + 0.5) * g.beatDur)));
  for (const bar of lines) {
    const t = g.barStart(bar); if (t > an.dur - 3 * g.barDur || bar === 0) continue;
    for (const type of ['crash', 'boom']) {
      let here, before, later;
      if (type === 'crash') {
        here = avg(hi, t, t + g.beatDur); before = avg(hi, t - g.beatDur, t - 0.03); later = Math.max(avg(hi, t + g.barDur, t + g.barDur + g.beatDur), avg(hi, t + 2 * g.barDur, t + 2 * g.barDur + g.beatDur));
        // a cymbal is noise: flat inside each band (a synth's harmonics are not)
        if (noiseAt(t) < 0.4) continue;
      }
      else { here = between(t); before = between(t - g.barDur); later = Math.max(between(t + g.barDur), between(t + 2 * g.barDur)); }
      const jump = here - before, excess = here - later;
      if (jump < 6 || excess < (type === 'boom' ? 3 : 5)) continue;
      const a = type === 'crash' ? hi : loM, base = avg(a, t + 2 * g.barDur, t + 3 * g.barDur), d = decay(a, t, base);
      out.push({type, k0: bar * 4, k1: bar * 4 + clamp((d.s + 0.05) / g.beatDur, 1, 16), bar, jump, excess, decayS: d.s, t60: type === 'crash' ? d.t60 : null, conf: type === 'boom' ? clamp((excess - 1.5) / 4, 0, 1) : clamp((Math.min(jump, excess) - 3) / 8, 0, 1)});
    }
  }
  return out;
}

// Echoes after the drums stop: a chain of hits at a fixed, tempo-synced spacing, each one a steady few dB
// quieter than the last, that carries on past the cut.
function echoes(an, lines) {
  const S = an.S, g = an.grid, a = frameSeries(an, S.P, 700, 4500), out = [];
  for (const bar of lines) {
    const t = g.barStart(bar); if (bar === 0 || t > an.dur - g.barDur) continue;
    // the drums (their peaks, not their average) must fall away at the cut
    const before = pct(Array.from(a.subarray(S.j(t - 2 * g.barDur), S.j(t - g.beatDur))), 0.97), afterPk = pct(Array.from(a.subarray(S.j(t + g.barDur), S.j(t + 2 * g.barDur))), 0.97), after = median(Array.from(a.subarray(S.j(t + g.barDur), S.j(t + 2 * g.barDur))));
    if (!(before - afterPk >= 6)) continue;
    const j0 = S.j(t - 1.5 * g.beatDur), j1 = Math.min(S.n - 1, S.j(t + 2 * g.barDur)), pk = [];
    for (let j = Math.max(1, j0); j < j1; j++) if (a[j] >= a[j - 1] && a[j] > a[j + 1] && a[j] > after + 2) {
      // sub-frame timing from a parabola through the peak
      const y0 = a[j - 1], y1 = a[j], y2 = a[j + 1], d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 || 1);
      pk.push({j, t: S.t(j + clamp(d, -0.5, 0.5)), v: a[j]});
    }
    let best = null;
    for (let x = 0; x < pk.length; x++) for (let y = x + 1; y < pk.length; y++) {
      const d = pk[y].t - pk[x].t; if (d < 0.07 || d > 1.6) continue;
      const nv = noteValue(d / g.beatDur, 0.06); if (!nv) continue;
      // the thrown hit itself sits before the cut, on the 16th grid
      const kx = toBeat(an, pk[x].t); if (pk[x].t > t - 0.05 || Math.abs(kx * 4 - Math.round(kx * 4)) > 0.35) continue;
      const chain = [pk[x], pk[y]];
      // follow the repeats until they sink into the floor (a repeat must be 1 dB under the last and 4.5 dB over the
      // floor: closer than that, the floor flattens the decay)
      for (let r = 2; r < 12; r++) { const want = pk[x].t + r * d, q = pk.find(p => Math.abs(p.t - want) < Math.max(0.025, 0.06 * d)); if (!q || q.v > chain[chain.length - 1].v - 1 || q.v < after + 4.5) break; chain.push(q); }
      const drops = chain.slice(1).map((p, i) => chain[i].v - p.v), sd = Math.sqrt(mean(drops.map(v => (v - mean(drops)) ** 2)));
      // at least two repeats, each a steady 2.5–9 dB quieter (feedback ~35–75%), 6 dB down in all. A loop that
      // fades out loses less per repeat; two unrelated hits rarely line up this neatly.
      if (chain.length < 3 || drops.some(v => v < 2.5 || v > 9) || sd > 2.5 || chain[0].v - chain[chain.length - 1].v < 6) continue;
      if (chain[chain.length - 1].t < t + 0.2) continue;
      const score = chain.length - sd / 2;
      if (!best || score > best.score) best = {chain, d, drops, score, nv};
    }
    if (!best) continue;
    const beats = best.d / g.beatDur, drop = mean(best.drops);
    out.push({type: 'echo', k0: toBeat(an, best.chain[0].t), k1: toBeat(an, best.chain[best.chain.length - 1].t) + 0.5, bar, ms: best.d * 1000, beats, note: best.nv.name, repeats: best.chain.length - 1, repeatDb: -drop, feedback: Math.pow(10, -drop / 20), conf: clamp((best.chain.length - 2) / 3, 0, 1)});
  }
  return out;
}

// Long tails after a cut: the percussive part keeps ringing (reverb) instead of stopping.
function tails(an, lines, echoList) {
  const S = an.S, g = an.grid, a = frameSeries(an, S.P, 300, 8000), out = [];
  for (const bar of lines) {
    if (echoList.some(e => e.bar === bar)) continue;
    const t = g.barStart(bar); if (bar === 0 || t > an.dur - 2 * g.barDur) continue;
    const before = pct(Array.from(a.subarray(S.j(t - 2 * g.barDur), S.j(t - g.beatDur))), 0.9), floor = median(Array.from(a.subarray(S.j(t + g.barDur), S.j(t + 2 * g.barDur)))), afterPk = pct(Array.from(a.subarray(S.j(t + g.barDur), S.j(t + 2 * g.barDur))), 0.9);
    if (!(before - afterPk >= 15)) continue;
    // last strong hit before the cut, then how long it takes to reach the floor
    let jp = S.j(t - g.beatDur), pk = -Infinity; for (let j = jp; j <= S.j(t + 0.1); j++) if (a[j] > pk) { pk = a[j]; jp = j; }
    const span = pk - floor - 4; if (span < 20) continue;
    let je = jp; while (je < S.n - 1 && a[je] > floor + 4) je++;
    const sec = S.t(je) - S.t(jp), rt60 = sec * 60 / span;
    if (rt60 < 1.3) continue;
    out.push({type: 'tail', k0: toBeat(an, S.t(jp)), k1: toBeat(an, S.t(je)), bar, rt60, conf: clamp((rt60 - 1) / 1.5, 0, 1)});
  }
  return out;
}

// Gates and stutters: inside a beat the level chops up and down on a fine grid, far deeper than the
// section usually moves.
function stutters(an) {
  const env = an.env, g = an.grid, nB = g.nBars * 4, depth = new Float32Array(nB), per = new Float32Array(nB), lagOf = new Float32Array(nB);
  const LAGS = [[0.25, '1/16'], [0.125, '1/32'], [1 / 6, '1/16T'], [1 / 3, '1/8T']];
  for (let k = 0; k < nB; k++) {
    const i0 = Math.round(toTime(an, k) * env.rate), i1 = Math.round(toTime(an, k + 1) * env.rate); if (i1 >= env.n || i0 < 0) continue;
    const seg = Array.from(env.all.subarray(i0, i1)).map(v => Math.max(v, -100)); depth[k] = pct(seg, 0.9) - pct(seg, 0.1);
    const m = mean(seg), z = seg.map(v => v - m), z2 = z.reduce((s, v) => s + v * v, 0) || 1;
    let best = 0, bl = 0; for (const [beats] of LAGS) { const L = Math.round(beats * g.beatDur * env.rate); if (L < 2 || L >= z.length / 2) continue; let s = 0; for (let i = 0; i + L < z.length; i++) s += z[i] * z[i + L]; const r = s / z2 * z.length / (z.length - L); if (r > best) { best = r; bl = beats; } }
    per[k] = best; lagOf[k] = bl;
  }
  const out = [];
  for (const s of an.sections) {
    const ks = []; for (let k = s.start * 4; k < s.end * 4; k++) ks.push(k);
    const base = median(ks.map(k => depth[k]));
    let run = null;
    const flush = () => { if (run && run.ks.length >= 2) { const lag = median(run.ks.map(k => lagOf[k])), nm = LAGS.find(l => Math.abs(l[0] - lag) < 1e-6); out.push({type: 'stutter', k0: run.ks[0], k1: run.ks[run.ks.length - 1] + 1, grid: nm ? nm[1] : '1/16', depth: mean(run.ks.map(k => depth[k])), excess: mean(run.ks.map(k => depth[k])) - base, conf: clamp((mean(run.ks.map(k => depth[k])) - base - 8) / 10, 0, 1) * clamp((mean(run.ks.map(k => per[k])) - 0.35) * 3, 0, 1)}); } run = null; };
    for (const k of ks) { const hit = depth[k] - base >= 10 && per[k] >= 0.5; if (hit) { if (!run) run = {ks: []}; run.ks.push(k); } else flush(); }
    flush();
  }
  return out;
}

// Sidechain pumping: fold the 500 Hz–2.5 kHz band over beats 1 and 3 (no clap there) of every bar with a
// kick. A pump has a shape: the level is at its highest just before the kick, falls 4.5 dB or more within
// 70 ms of it, and climbs back steadily. Offbeat stabs or basslines make bumps, not that shape.
function pumps(an) {
  const env = an.env, g = an.grid, NBIN = 48, out = [];
  for (const s of an.sections) {
    const acc = new Float64Array(NBIN), cnt = new Uint32Array(NBIN); let beats = 0;
    for (let b = s.start; b < s.end; b++) for (const q of [0, 2]) {
      const k = b * 4 + q; if (!(an.lanes.kick[k] > 0.5)) continue; beats++;
      const i0 = Math.round(toTime(an, k) * env.rate), L = g.beatDur * env.rate;
      for (let i = 0; i < L; i++) { const ii = i0 + i; if (ii < 0 || ii >= env.n) continue; const bin = Math.min(NBIN - 1, Math.floor(i / L * NBIN)); acc[bin] += env.pad[ii]; cnt[bin]++; }
    }
    if (beats < 4) continue;
    const c = Array.from(acc, (v, i) => cnt[i] ? v / cnt[i] : NaN), ms = i => (i + 0.5) / NBIN * g.beatDur * 1000;
    // skip the first and last bins: the kick's click lands there
    const i0 = 1, i9 = Math.ceil(NBIN * 0.2), head = c.slice(i0, i9), mi = i0 + head.indexOf(Math.min(...head)), lo = c[mi];
    const pre = mean(c.slice(Math.floor(NBIN * 0.85), NBIN - 1)), top = Math.max(...c.slice(1, NBIN - 1));
    const depth = pre - lo;
    // release: fit the climb back as 1 − A·e^(−t/τ) on the gain, then read off when it's back within 1 dB
    const xs = [], ys = []; for (let i = mi; i < NBIN - 1; i++) { const gl = 1 - Math.pow(10, (c[i] - pre) / 20); if (gl > 0.11) { xs.push(ms(i) / 1000); ys.push(Math.log(gl)); } else break; }
    const f = xs.length >= 3 ? linfit(xs, ys) : null, tau = f && f.b < 0 ? -1 / f.b : null;
    const releaseMs = tau ? 1000 * (xs[0] + tau * Math.log((1 - Math.pow(10, (lo - pre) / 20)) / 0.109)) : null;
    const pump = depth >= 4.5 && pre >= top - 1.5 && ms(mi) <= 75 && f && f.r <= -0.9 && releaseMs >= 40;
    out.push({section: s.name, start: s.start, end: s.end, curve: c, depth, dipMs: ms(mi), releaseMs, pump, conf: pump ? clamp((depth - 2) / 5, 0, 1) * clamp((-f.r - 0.8) * 6, 0, 1) : 0});
  }
  return out;
}

// Steady runs, kept inside sections: a width or level change that lines up with a section change is an
// arrangement change, not automation.
function sectionRuns(an, a, dir, minChange, minLen, rho) {
  const out = [];
  for (const s of an.sections) { const a0 = s.start * 4, a1 = s.end * 4; for (const [x, y] of steadyRuns(a.subarray(a0, a1), dir, minChange, minLen, 128, rho)) out.push([a0 + x, a0 + y]); }
  return out;
}
// Width moves in the music: the side signal against the mid, per beat.
function widthMoves(an) {
  const S = an.S, NB = S.NB, X = an.bm.H, XS = an.bm.HS, nB = X.length / NB, w = new Float32Array(nB), lvl = new Float32Array(nB);
  for (let k = 0; k < nB; k++) { let m = 0, s = 0; for (let b = bandIdx(S, 150); b < NB; b++) { m += X[k * NB + b]; s += XS[k * NB + b]; } w[k] = dB10(s) - dB10(m); lvl[k] = dB10(m); }
  const top = pct(Array.from(lvl), 0.9);
  for (let k = 0; k < nB; k++) if (lvl[k] < top - 30) w[k] = NaN;
  const out = [];
  const br = elementBreaks(an, ['bass', 'pads']);
  for (const dir of [1, -1]) for (const [s0, e0] of runsBetween(w, br, dir, 6, 8, 0.85)) {
    const [s, e] = refineRamp(w, s0, e0); if (e - s < 6) continue;
    const d = mean(Array.from(w.subarray(e - 2, e))) - mean(Array.from(w.subarray(s, s + 2)));
    out.push({type: 'width', k0: s, k1: e, db: d, utility: Math.round(100 * Math.pow(10, d / 20)), conf: clamp((Math.abs(d) - 4) / 8, 0, 1)});
  }
  return {series: w, events: out};
}

// Fades: the level glides 9 dB or more over 4 bars or longer while the spectrum keeps its shape.
function fades(an, sweeps) {
  const out = [], lvl = series(an, an.bm.M, 40, 10500), E = an.edgesM;
  const br = elementBreaks(an, ['kick', 'clap', 'hats', 'bass', 'pads']);
  for (const dir of [1, -1]) for (const [s0, e0] of runsBetween(lvl, br, dir, 9, 16, 0.9)) {
    const [s, e] = refineRamp(lvl, s0, e0); if (e - s < 8) continue;
    if (sweeps.some(w => overlap(w, {k0: s, k1: e}) > 0.3)) continue;
    const eh = Math.abs(mean(Array.from(E.hi.subarray(e - 4, e))) - mean(Array.from(E.hi.subarray(s, s + 4)))) / 12;
    if (eh > 0.8) continue;
    const d = mean(Array.from(lvl.subarray(e - 2, e))) - mean(Array.from(lvl.subarray(s, s + 2)));
    out.push({type: 'fade', k0: s, k1: e, db: d, conf: clamp((Math.abs(d) - 6) / 10, 0, 1)});
  }
  return out;
}

// Tape stops: in the last beats before a section change the whole spectrum slides down — each frame is the
// one before it shifted lower — and keeps sliding faster until the bar line, while the level falls.
function tapeStops(an, lines) {
  const S = an.S, NB = S.NB, g = an.grid, out = [], b0 = bandIdx(S, 120), b1 = bandIdx(S, 8000), lv = frameSeries(an, S.M, 40, 10500);
  const row = j => { const r = []; for (let b = b0; b <= b1; b++) r.push(dB10(S.M[j * NB + b])); const m = mean(r); return r.map(v => v - m); };
  const shift = j => { const A = row(j - 2), B = row(j); let best = {lag: 0, r: -1}; for (let L = -12; L <= 2; L++) { let s = 0, x = 0, y = 0; for (let i = Math.max(0, -L); i < A.length && i + L < B.length; i++) { s += A[i] * B[i + L]; x += A[i] ** 2; y += B[i + L] ** 2; } const r = x && y ? s / Math.sqrt(x * y) : -1; if (r > best.r) best = {lag: L, r}; } return best; };
  for (const bar of lines) {
    const t = g.barStart(bar); if (t > an.dur - 0.5) continue;
    const jEnd = S.j(t) - 1, jStart = S.j(t - 4 * g.beatDur); if (jStart < 3) continue;
    const st = []; for (let j = jStart; j <= jEnd; j++) st.push(shift(j));
    // the last frames before the bar line can be near silence: start from the last sliding frame among them,
    // then walk back while the spectrum keeps sliding down (up to five stray frames in a row)
    let i = st.length - 1; while (i >= st.length - 10 && i > 0 && !(st[i].r >= 0.6 && st[i].lag < 0)) i--;
    let cum = 0, n = 0, walked = 0, bad = 0;
    for (; i >= 0; i--) { const x = st[i]; walked++; if (x.r < 0.6 || x.lag >= 0) { if (++bad > 5) { walked -= bad; break; } continue; } bad = 0; cum += x.lag / 2; n++; }
    // most of the walk must be sliding: a kick's own pitch drop on every beat slides only a few frames per beat
    if (n < 8 || cum > -8 || n < 0.6 * walked) continue;
    // the level at the start of the slide against the quietest moment just before the bar line
    const k0 = toBeat(an, S.t(jStart + Math.max(0, i + 1 + bad))), drop = lv[S.j(toTime(an, k0))] - Math.min(...Array.from(lv.subarray(Math.max(0, jEnd - 5), jEnd + 1)));
    if (drop < 3) continue;
    out.push({type: 'tapeStop', k0, k1: bar * 4, bar, semis: cum, levelDrop: drop, conf: clamp((-cum - 6) / 10, 0, 1) * clamp((drop - 1) / 6, 0, 1)});
  }
  return out;
}

// Element changes: beats where a lane steps on or off and stays there (the four beats after differ from the
// four before, and this is where the step happens). A fade or a filter changes lanes slowly; a lane that
// flickers beat to beat averages out.
function elementBreaks(an, keys) {
  const out = new Set(), L = an.lanes;
  for (const k of keys) {
    const a = L[k], m4 = (i, j) => { let s = 0, c = 0; for (let q = Math.max(0, i); q < Math.min(a.length, j); q++) { s += a[q]; c++; } return c ? s / c : 0; };
    const st = Array.from(a, (_, i) => Math.abs(m4(i, i + 4) - m4(i - 4, i)));
    for (let i = 4; i < a.length - 4; i++) if (st[i] >= 0.4 && st[i] >= st[i - 1] && st[i] > st[i + 1]) out.add(i);
  }
  return [...out].sort((x, y) => x - y);
}
function runsBetween(a, breaks, dir, minChange, minLen, rho) {
  const edges = [0, ...breaks, a.length], out = [];
  for (let i = 0; i + 1 < edges.length; i++) { const a0 = edges[i], a1 = edges[i + 1]; if (a1 - a0 < minLen) continue; for (const [x, y] of steadyRuns(a.subarray(a0, a1), dir, minChange, minLen, 128, rho)) out.push([a0 + x, a0 + y]); }
  return out;
}

// ---------- element lanes ----------
// What plays, per beat, 0–1. Drums come from onsets on the grid. Everything sustained gets a threshold of its
// own, found from the track: the per-bar levels are split into two groups (present / absent) where they
// separate best. If they don't separate by 6 dB, the element is either always there or never there.
const LANES = [
  {k: 'kick', name: 'Kick', c: '#FF4B32', note: 36}, {k: 'clap', name: 'Clap / snare', c: '#FF8A2B', note: 39}, {k: 'hats', name: 'Hats', c: '#FFC531', note: 42},
  {k: 'top', name: 'Sustained highs', c: '#E8D48B', note: 46}, {k: 'bass', name: 'Bass', c: '#E07B39', note: 33},
  {k: 'pads', name: 'Chords / synths', c: '#3FD0C9', note: 60}, {k: 'fx', name: 'Noise / FX', c: '#A78BFA', note: 84}];
function otsu(vals) {
  const v = vals.filter(Number.isFinite).sort((a, b) => a - b); if (v.length < 4) return null;
  let best = null, s1 = 0; const tot = v.reduce((a, b) => a + b, 0);
  for (let i = 1; i < v.length; i++) { s1 += v[i - 1]; const m1 = s1 / i, m2 = (tot - s1) / (v.length - i), w = i * (v.length - i) * (m2 - m1) ** 2; if (!best || w > best.w) best = {w, thr: (v[i - 1] + v[i]) / 2, m1, m2}; }
  return best;
}
function laneFromLevels(dbv, nBars, floorDb, silent) {
  const per = Array.from({length: nBars}, (_, b) => mean(Array.from(dbv.subarray(b * 4, b * 4 + 4))));
  // silent bars (the tail of the file, a gap) are off and don't take part in finding the split
  const o = otsu(per.filter((v, b) => !silent[b])), out = new Float32Array(dbv.length);
  if (o && o.m2 - o.m1 >= 6) { for (let k = 0; k < dbv.length; k++) out[k] = silent[k >> 2] ? 0 : clamp((dbv[k] - o.thr) / 6 + 0.5, 0, 1); return out; }
  // no split: present throughout if it is a real part of the mix, otherwise absent
  const on = median(per.filter((v, b) => !silent[b])) > floorDb; for (let k = 0; k < dbv.length; k++) out[k] = on && !silent[k >> 2] && dbv[k] > floorDb ? 1 : 0; return out;
}
function lanes(an) {
  const S = an.S, g = an.grid, E = an.E, NB = S.NB, nB = g.nBars * 4, L = {}, maxIn = XR._maxIn, sx = g.beatDur / 4;
  const raw = {kick: new Float32Array(nB), clap: new Float32Array(nB), hats: new Float32Array(nB)};
  for (let k = 0; k < nB; k++) {
    const t = toTime(an, k);
    raw.kick[k] = maxIn(E.kick.on, E.rate, t + XR.LAT.kick - 0.02, t + XR.LAT.kick + 0.035);
    raw.clap[k] = maxIn(E.clap.on, E.rate, t - sx * 0.5, t + g.beatDur - sx * 0.5);
    let h = 0; for (let q = 0; q < 4; q++) h += maxIn(E.hat.on, E.rate, t + q * sx + XR.LAT.hat - 0.02, t + q * sx + XR.LAT.hat + 0.04); raw.hats[k] = h / 4;
  }
  const kT = pct(Array.from(raw.kick), 0.95) || 1, cT = pct(Array.from(raw.clap), 0.97) || 1, hT = pct(Array.from(raw.hats), 0.95) || 1;
  L.kick = Float32Array.from(raw.kick, v => clamp(v / kT, 0, 1)); L.clap = Float32Array.from(raw.clap, v => clamp(v / cT, 0, 1)); L.hats = Float32Array.from(raw.hats, v => clamp(v / hT, 0, 1));
  // sustained parts: levels from the harmonic part, bass measured late in each beat (after the kick's tail)
  const lvlAll = series(an, an.bm.M, 40, 10500), floor = pct(Array.from(lvlAll), 0.9) - 45;
  const silent = Array.from({length: g.nBars}, (_, b) => mean(Array.from(lvlAll.subarray(b * 4, b * 4 + 4))) < floor + 5);
  L.top = laneFromLevels(series(an, an.bm.H, 6000, 10500), g.nBars, floor - 10, silent);
  // bass: X-Ray's per-bar measure of the low end between the kicks, which already discounts a kick's own tail,
  // modulated per beat by the late-beat low end so a bass that drops out for a beat shows
  const lateLo = series(an, an.bm.Hlate, 40, 220), lt = pct(Array.from(lateLo), 0.95);
  L.bass = Float32Array.from({length: nB}, (_, k) => { const b = an.bars[k >> 2]; return silent[k >> 2] || !b ? 0 : clamp(b.bass * clamp((lateLo[k] - lt + 24) / 12, 0, 1), 0, 1); });
  L.pads = laneFromLevels(series(an, an.bm.H, 250, 4000), g.nBars, floor, silent);
  // noise and FX: a flat (noise-like) sustained layer between 1.5 and 6 kHz, as loud as that region gets
  const R = an.riser, eT = pct(Array.from(R.E), 0.95);
  const fx0 = Float32Array.from(R.E, (v, k) => silent[k >> 2] ? 0 : clamp((R.flat[k] - 0.4) / 0.15, 0, 1) * clamp((v - eT + 18) / 12, 0, 1));
  // a noise layer is sustained: it has to be there on the beats either side too (a clap's tail is not)
  L.fx = Float32Array.from(fx0, (v, k) => Math.min(v, fx0[k - 1] ?? v, fx0[k + 1] ?? v));
  return L;
}
// On/off spans per lane with hysteresis: on above 0.55, off below 0.35, ignoring blips shorter than 2 beats.
function spans(a, on = 0.55, off = 0.35, minLen = 2) {
  const out = []; let s = -1;
  for (let k = 0; k <= a.length; k++) {
    const v = k < a.length ? a[k] : 0;
    if (s < 0 && v >= on) s = k;
    else if (s >= 0 && v < off) { let e = k; while (e < a.length && e < k + 2 && a[e] < off) e++; if (e - k >= 2 || k === a.length || e === a.length) { if (k - s >= minLen) out.push([s, k]); s = -1; } }
  }
  return out;
}

// ---------- tension: loudness, brightness, density and rising FX folded into one curve ----------
function tension(an) {
  const nB = an.grid.nBars * 4, lv = series(an, an.bm.M, 40, 10500), E = an.edgesM, out = new Float32Array(nB);
  const z = a => { const v = Array.from(a).filter(Number.isFinite), m = mean(v), sd = Math.sqrt(mean(v.map(x => (x - m) ** 2))) || 1; return Array.from(a, x => Number.isFinite(x) ? (x - m) / sd : 0); };
  const dens = Array.from({length: nB}, (_, k) => LANES.reduce((s, l) => s + (an.lanes[l.k][k] > 0.5 ? 1 : 0), 0));
  const zl = z(lv), zb = z(E.hi), zd = z(dens), zr = z(an.lanes.fx);
  for (let k = 0; k < nB; k++) out[k] = 0.4 * zl[k] + 0.2 * zb[k] + 0.3 * zd[k] + 0.25 * zr[k];
  const lo = pct(out, 0.02), hi = pct(out, 0.98);
  for (let k = 0; k < nB; k++) out[k] = clamp((out[k] - lo) / (hi - lo || 1), 0, 1);
  return out;
}

// ---------- describing each move, and how to rebuild it in Live ----------
const barBeat = k => { const b = Math.floor(k / 4 + 1e-6), bt = k - 4 * b; return `${b + 1}.${Math.floor(bt + 1e-6) + 1}${Math.abs(bt - Math.round(bt)) > 0.05 ? '.' + (Math.floor((bt % 1) * 4 + 1e-6) + 1) : ''}`; };
const CAT = {lp: 'Filter', hp: 'Filter', lpStatic: 'Filter', hpStatic: 'Filter', riser: 'Riser', reverse: 'Riser', pitchUp: 'Riser', pitchDown: 'Riser', roll: 'Drums', kickOut: 'Drums', gap: 'Space', tail: 'Space', echo: 'Space', crash: 'Impact', boom: 'Impact', stutter: 'Glitch', tapeStop: 'Glitch', width: 'Mix', fade: 'Mix'};
const COLOR = {Filter: '#7CE7FF', Riser: '#A78BFA', Drums: '#FF8A2B', Space: '#5FBF52', Impact: '#FF4B32', Glitch: '#FFC531', Mix: '#3FD0C9'};
function describe(an, e) {
  const L = lengthText(e.k1 - e.k0), at = barBeat(e.k0), to = barBeat(e.k1), tgt = SRC_NAME[e.target] || SRC_NAME.mix, ft = e.target === 'drums' ? 'the drum group' : e.target === 'music' ? 'the music group (everything but the drums)' : 'the master, or a group holding everything';
  const shape = e.curve ? curveShape(e) : '';
  switch (e.type) {
    case 'lp': case 'hp': {
      const nm = e.type === 'lp' ? 'Low-pass' : 'High-pass', a = e.opening ? e.fromHz : e.openHz, b = e.opening ? (e.type === 'lp' ? 'fully open' : 'fully open') : e.toHz;
      const fromTxt = hzText(e.opening ? e.fromHz : (e.type === 'lp' ? e.openHz : e.openHz)), toTxt = e.opening ? 'open' : hzText(e.toHz);
      return {title: `${nm} ${e.opening ? (e.type === 'lp' ? 'opening' : 'releasing') : (e.type === 'lp' ? 'closing' : 'rising')} on ${tgt.replace(/ \(.*\)/, '')}`,
        what: `${nm} sweep on ${tgt}, ${at} → ${to} (${L}). Cutoff ${e.opening ? `from about ${hzText(e.fromHz)} until it's out of the way` : `${e.type === 'lp' ? 'falls' : 'rises'} to about ${hzText(e.toHz)}`}; the skirt is ~${Math.round(e.slope)} dB/oct${e.res > 3 ? `, with a resonant bump of ~${Math.round(e.res)} dB at the cutoff` : ''}.${shape}`,
        recipe: [`Put Auto Filter on ${ft}. ${nm}, ${e.slope >= 21 ? '24' : '12'} dB slope${e.res > 3 ? ', a little resonance' : ''}.`,
          `Automate Frequency from ${e.opening ? hzText(e.fromHz) : (e.type === 'lp' ? '20 kHz' : '20 Hz')} at bar ${at} to ${e.opening ? (e.type === 'lp' ? '20 kHz' : '20 Hz') : hzText(e.toHz)} at bar ${to}.${shape} The breakpoints table has the cutoff bar by bar.`,
          e.opening ? 'Once it is open, bypass the filter so it can\'t colour the next part.' : `Snap it back off on the downbeat of bar ${barBeat(Math.ceil(e.k1 / 4) * 4)}: the return to full range is part of the hit.`]};
    }
    case 'lpStatic': case 'hpStatic': {
      const nm = e.type === 'lpStatic' ? 'low-pass' : 'high-pass';
      return {title: `Section held under a ${nm}`, what: `${at} → ${to} (${L}): the music sits under a ${nm} at about ${hzText(e.hz)} (~${Math.round(e.slope)} dB/oct) compared with the rest of the track. It may be a filter or a darker patch; the effect on the mix is the same.`,
        recipe: [`Auto Filter on the music group, ${nm} at ${hzText(e.hz)}, ${e.slope >= 21 ? '24' : '12'} dB, for the whole section.`, 'Open it on the downbeat where the section ends, so the next part arrives brighter.']};
    }
    case 'riser': {
      const fil = Math.abs(e.centOct) >= 0.7;
      return {title: e.noise ? 'Noise riser' : 'Riser', what: `${at} → ${to} (${L}): a ${e.noise ? 'noise' : 'sustained'} layer in the top end climbs ${Math.round(e.riseDb)} dB${fil ? `, its brightness moving from ~${hzText(e.centFrom)} to ~${hzText(e.centTo)} (an opening filter)` : ''}.`,
        recipe: [`${e.noise ? 'White noise (Operator with the Noise waveform, or a noise sample in Simpler)' : 'A long synth or noise layer'}, ${L} long, ending at ${to}.`, `Volume rising ${Math.round(e.riseDb)} dB across it; draw the curve so most of the climb happens late.`, fil ? `Auto Filter low-pass on it, opening from ${hzText(e.centFrom * 0.6)} to ${hzText(Math.min(18000, e.centTo * 2))}.` : 'Keep the filter still; the level does the work.']};
    }
    case 'reverse': return {title: 'Reverse cymbal / swell', what: `${at} → ${to}: the top end swells ${Math.round(e.riseDb)} dB over ${lengthText(e.beats)} and peaks exactly on bar ${Math.round(e.bar) + 1}. That's the shape of a reversed crash or a reversed reverb tail.`,
      recipe: [`Take a crash (or the reverb tail of a hit), reverse it (Rev in the clip view) and line its end up with the downbeat of bar ${Math.round(e.bar) + 1}.`, `Trim it to ${lengthText(e.beats)}.`]};
    case 'pitchUp': case 'pitchDown': {
      const up = e.type === 'pitchUp';
      return {title: up ? 'Pitch riser' : 'Downlifter', what: `${at} → ${to} (${L}): a tonal sound glides ${up ? 'up' : 'down'} ${Math.round(Math.abs(e.semis))} semitones, ~${hzText(e.fromHz)} → ~${hzText(e.toHz)}.`,
        recipe: [`One long note on a synth (a saw or sine), ${L}.`, `Automate pitch ${up ? '+' : '−'}${Math.round(Math.abs(e.semis))} semitones across it: a pitch envelope or the clip's Transpose envelope.`]};
    }
    case 'tapeStop': return {title: 'Tape stop', what: `${at} → ${to}: everything slows down and drops in pitch (${Math.round(Math.abs(e.semis))}+ semitones) into bar ${e.bar + 1}, the top end going first.`,
      recipe: [`On the master or a group: a tape-stop plugin, or resample the last ${lengthText(e.k1 - e.k0)} and warp it in Re-Pitch mode with a falling tempo envelope.`, `Land it exactly at bar ${e.bar + 1}.`]};
    case 'roll': {
      const st = e.steps.map(s => `${s.name} from ${barBeat(s.k)}`).join(', ');
      return {title: 'Snare / clap roll', what: `${at} → ${to} (${L}): ${st}. Hits get ${e.velDb >= 0 ? 'louder' : 'quieter'} by ~${Math.abs(Math.round(e.velDb))} dB across the roll.`,
        recipe: [`MIDI: ${st}. (The Roll MIDI export has the exact hits.)`, `Velocity ramp of ~${Math.abs(Math.round(e.velDb))} dB${e.velDb >= 0 ? ' upward' : ''}; Velocity → Volume on the drum pad, or automate its level.`, 'Optional: rising pitch or an opening high-pass on the roll for extra lift.']};
    }
    case 'kickOut': return {title: 'Kick drops out', what: `${at} → ${to}: the kick stops for ${lengthText(e.k1 - e.k0)} inside a kick section, then comes back on ${to}.`, recipe: [`Delete the kick for ${lengthText(e.k1 - e.k0)} before ${to}.`, 'The missing kick is the fill: nothing else needs to change.']};
    case 'gap': return {title: e.silent ? 'Silence before the drop' : 'Near-silence before the drop', what: `${barBeat(e.k0)} → ${to}: ${lengthText(e.beats)} of ${e.silent ? 'silence' : 'near silence'} (${Math.round(e.depth)} dB under the bars before).`,
      recipe: [`Cut every track for the last ${lengthText(e.beats)} before ${to}.`, e.silent ? 'Cut reverb and delay sends too, so the drop lands on true silence.' : 'Leave a reverb or delay tail running through it; only the dry parts stop.']};
    case 'crash': return {title: 'Crash on the downbeat', what: `${at}: the top end jumps ${Math.round(e.jump)} dB on the downbeat and rings out over ~${e.decaySec ? e.decaySec : e.decayS.toFixed(1)} s${e.t60 ? ` (T60 ≈ ${e.t60.toFixed(1)} s)` : ''}.`, recipe: [`A crash or impact sample on 1 of bar ${at.split('.')[0]}.`, `Let it ring ~${e.decayS.toFixed(1)} s; high-pass it around 300 Hz so it stays out of the low end.`]};
    case 'boom': return {title: 'Sub boom on the downbeat', what: `${at}: the sub (40–75 Hz) swells ${Math.round(e.excess)} dB above the following bars and takes ~${e.decayS.toFixed(1)} s to settle.`, recipe: [`A sub boom (sine with a fast downward pitch envelope, or an 808) on 1 of bar ${at.split('.')[0]}.`, `Decay ~${e.decayS.toFixed(1)} s. Duck the bass under it for the first beat so they don't stack.`]};
    case 'echo': return {title: 'Delay throw', what: `${at} → ${to}: the last hit echoes ${e.repeats} times, ${e.note ? `every ${e.note}` : `every ${Math.round(e.ms)} ms`} (${Math.round(e.ms)} ms), each repeat ${Math.abs(e.repeatDb).toFixed(1)} dB quieter.`,
      recipe: [`Echo (or Delay) on a send, synced to ${e.note || Math.round(e.ms) + ' ms'}, Feedback ~${Math.round(e.feedback * 100)}%, 100% wet.`, `Automate the send up only for the last hit before bar ${e.bar + 1}, then back to zero.`]};
    case 'tail': return {title: 'Reverb tail through the cut', what: `${at} → ${to}: when the drums stop, they ring out with a decay of about ${e.rt60.toFixed(1)} s instead of stopping dead.`, recipe: [`Reverb on a send (Hybrid Reverb or Reverb), decay ~${e.rt60.toFixed(1)} s.`, `Throw the last bar's drums into it, and cut the dry drums on bar ${e.bar + 1}.`]};
    case 'stutter': return {title: 'Stutter / gate', what: `${at} → ${to}: the whole sound chops on a ${e.grid} grid, ~${Math.round(e.excess)} dB deeper than the section normally moves.`, recipe: [`Beat Repeat on the master or a group for ${L}: Grid ${e.grid}, Gate ${Math.round(e.k1 - e.k0)}/4, Chance 100%, Mix Insert. Or a 50% ${e.grid} volume gate.`, 'Turn it off on the next downbeat.']};
    case 'width': return {title: e.db < 0 ? 'Stereo narrowing' : 'Stereo widening', what: `${at} → ${to} (${L}): the side signal of the music moves ${e.db > 0 ? '+' : '−'}${Math.abs(e.db).toFixed(0)} dB against the mid${e.db < 0 ? ', squeezing the build toward mono' : ''}.`, recipe: [`Utility on the music group: automate Width from 100% to ~${e.utility}% across ${L}.`, e.db < 0 ? 'Snap back to 100% on the drop: the sudden width is part of the impact.' : 'Hold it there for the section.']};
    case 'fade': return {title: e.db < 0 ? 'Fade out' : 'Fade in', what: `${at} → ${to} (${L}): the level glides ${e.db > 0 ? '+' : '−'}${Math.abs(e.db).toFixed(0)} dB without changing tone.`, recipe: [`Volume automation (Utility Gain) ${e.db > 0 ? 'up' : 'down'} ${Math.abs(e.db).toFixed(0)} dB over ${L}.`]};
  }
  return {title: e.type, what: '', recipe: []};
}
function curveShape(e) {
  const pts = e.curve.filter(p => p.hz).map(p => [p.k, Math.log2(p.hz)]); if (pts.length < 5) return '';
  const third = Math.floor(pts.length / 3), a = pts[0][1], b = pts[third][1], c = pts[pts.length - 1 - third][1], d = pts[pts.length - 1][1], tot = d - a;
  if (Math.abs(tot) < 0.3) return '';
  const early = (b - a) / tot, late = (d - c) / tot;
  return early > 0.5 ? ' Most of the movement happens early.' : late > 0.5 ? ' Slow at first, most of the movement at the end.' : ' The cutoff moves evenly (a straight line on Live\'s cutoff knob).';
}

// ---------- sections, found again with everything Blueprint knows ----------
// X-Ray's sections come from per-bar loudness and band energy. Blueprint re-finds them from its element
// lanes, the shape of the harmonic and percussive spectra, and the moves themselves: a gap, a reverse
// cymbal or the end of a riser marks the bar line after it; a crash, boom or downlifter the bar it starts on.
const END_MARK = {gap: 1.2, reverse: 1, riser: 0.8, roll: 0.8, stutter: 0.6, tapeStop: 1, kickOut: 0.6, pitchUp: 0.5, hp: 0.5, lp: 0.3, echo: 0.6};
const START_MARK = {crash: 1, boom: 0.8, pitchDown: 0.4};
function refineSections(an, moves) {
  const g = an.grid, n = g.nBars; if (n < 12) return;
  const L = an.lanes, cols = [];
  const per = a => Array.from({length: n}, (_, b) => mean(Array.from(a.subarray(b * 4, b * 4 + 4))));
  const W = {kick: 3, clap: 2.5, hats: 1.5, top: 1, bass: 2.5, pads: 1.5, fx: 0.6};
  for (const l of LANES) cols.push([per(L[l.k]), W[l.k]]);
  cols.push([per(series(an, an.bm.M, 40, 10500)).map(v => v / 6), 1.5], [per(series(an, an.bm.H, 40, 10500)).map(v => v / 6), 1], [per(series(an, an.bm.P, 40, 10500)).map(v => v / 6), 1], [per(an.edgesH.hi).map(v => Number.isFinite(v) ? v / 12 : 0), 0.8]);
  const feat = Array.from({length: n}, () => []);
  for (const [c, w] of cols) { const m = mean(c), sd = Math.max(0.05, Math.sqrt(mean(c.map(v => (v - m) ** 2)))); c.forEach((v, b) => feat[b].push(Number.isFinite(v) ? (v - m) / sd * w : 0)); }
  const D = feat.map(x => feat.map(y => Math.hypot(...x.map((v, i) => v - y[i]))));
  const nov = w => Array.from({length: n}, (_, b) => { if (b === 0) return 0; const a = Math.max(0, b - w), c = Math.min(n, b + w); let x = 0, xc = 0, y = 0, yc = 0, z = 0, zc = 0; for (let i = a; i < b; i++) for (let j = b; j < c; j++) { x += D[i][j]; xc++; } for (let i = a; i < b; i++) for (let j = a; j < b; j++) { y += D[i][j]; yc++; } for (let i = b; i < c; i++) for (let j = b; j < c; j++) { z += D[i][j]; zc++; } return Math.max(0, x / xc - 0.5 * (y / (yc || 1) + z / (zc || 1))); });
  const N4 = nov(4), N8 = nov(8), N = N4.map((v, b) => v + N8[b]), top = pct(N.slice(1), 0.95) || 1;
  const bonus = new Float64Array(n + 1);
  for (const e of moves) { const end = END_MARK[e.type], start = START_MARK[e.type]; if (end) { const b = Math.round(e.k1 / 4); if (Math.abs(e.k1 - b * 4) <= 1 && b > 0 && b < n) bonus[b] += end * e.conf; } if (start) { const b = Math.round(e.k0 / 4); if (Math.abs(e.k0 - b * 4) <= 0.5 && b > 0 && b < n) bonus[b] += start * e.conf; } }
  const score = N.map((v, b) => (v / top + 0.8 * Math.min(1.5, bonus[b])) * (b % 8 === 0 ? 1.25 : b % 4 === 0 ? 1 : 0.5));
  const sc = score.slice(1), thr = Math.max(0.55, median(sc) + 0.5 * (pct(sc, 0.9) - median(sc)));
  const cand = score.map((v, b) => ({b, v})).filter(c => c.b >= 4 && c.b <= n - 4 && c.v > thr).sort((x, y) => y.v - x.v), cuts = [];
  for (const c of cand) if (cuts.every(b => Math.abs(b - c.b) >= 4)) cuts.push(c.b);
  cuts.sort((x, y) => x - y);
  an.bpNovelty = score;
  XR.setSections(an, [0, ...cuts, n]);
}

// Section types: one fixed vocabulary, each with one definition that can be measured. The rules are tried in
// this order and the first that fits wins, so every section gets exactly one type.
const SECTION_TYPES = [
  {label: 'Drop', def: 'The full arrangement (kick and bass) at or near the track\'s peak level, arriving after a break, a build or a lead-in move. The payoff the track has been setting up.'},
  {label: 'Build', def: 'A short section (16 bars or less) that climbs into a full section: a riser, a roll, a filter sweep or a rising level.'},
  {label: 'Break', def: 'The kick stops, somewhere in the middle of the track. Space and tension before the next full part.'},
  {label: 'Intro', def: 'The opening bars before the full arrangement first arrives. Parts are missing (usually the bass), which leaves room for a DJ to mix in.'},
  {label: 'Outro', def: 'Everything after the last full section. Parts leave or fade, leaving room for a DJ to mix out.'},
  {label: 'Groove', def: 'The kick plays and the track runs, but it isn\'t a drop: nothing builds into it, or it sits below the peak level. The body of the track between the big moments.'}];
const pctS = v => `${Math.round(v * 100)}%`, cap = t => t.charAt(0).toUpperCase() + t.slice(1);
function classify(an, moves) {
  const S = an.sections, n = S.length;
  const has = (s, l) => { let c = 0; for (let k = s.start * 4; k < s.end * 4; k++) if (an.lanes[l][k] > 0.5) c++; return c / Math.max(1, (s.end - s.start) * 4); };
  for (const s of S) { s.k = has(s, 'kick'); s.b = has(s, 'bass'); s.c = has(s, 'clap'); s.full = s.k > 0.6 && s.b > 0.5; }
  const fulls = S.filter(s => s.full), loud = Math.max(...fulls.map(s => s.lufs), -Infinity), firstFull = S.findIndex(s => s.full), lastFull = S.length - 1 - [...S].reverse().findIndex(s => s.full);
  const NAMES = {riser: 'a riser', roll: 'a snare roll', gap: 'a silence', pitchUp: 'a pitch riser', reverse: 'a reverse swell', hp: 'a high-pass sweep', lp: 'a filter sweep', tapeStop: 'a tape stop', kickOut: 'the kick dropping out'};
  const leadIn = i => moves.filter(e => NAMES[e.type] && Math.abs(e.k1 - S[i].start * 4) <= 2);
  const climbs = s => moves.filter(e => ['riser', 'roll', 'pitchUp', 'hp', 'lp'].includes(e.type) && e.k0 < s.end * 4 && e.k1 > s.start * 4 && (e.type !== 'lp' || !e.opening));
  S.forEach((s, i) => {
    const prev = S[i - 1], next = S[i + 1], lv = Number.isFinite(loud) ? s.lufs - loud : NaN, parts = `kick in ${pctS(s.k)} of beats, bass in ${pctS(s.b)}`;
    const why = [], lin = i > 0 ? leadIn(i) : [], up = climbs(s);
    const nearPeak = s.full && lv >= -2, after = i > 0 && (prev.k < 0.5 || lin.length || (i > firstFull && (prev.c < s.c - 0.2 || s.lufs - prev.lufs >= 3)));
    if (nearPeak && after) {
      s.label = 'Drop'; why.push(`Full arrangement: ${parts}.`, `Level ${Math.abs(lv) < 0.3 ? 'is the loudest in the track' : `${Math.abs(lv).toFixed(1)} dB under the loudest section`}.`);
      why.push(prev.k < 0.5 ? `Arrives after ${prev.label === 'Build' || prev.label === 'Break' ? 'the ' + prev.label.toLowerCase() : 'a section without a kick'}.` : lin.length ? `Led into by ${[...new Set(lin.map(e => NAMES[e.type]))].join(', ')}.` : prev.c < s.c - 0.2 ? `The clap returns after a section without it.` : `Jumps ${(s.lufs - prev.lufs).toFixed(1)} dB over the section before.`);
    } else if (i > 0 && next && next.k > 0.6 && next.b > 0.5 && s.end - s.start <= 16 && (up.length || s.rise > 2.5)) {
      s.label = 'Build'; why.push(`${s.end - s.start} bars that climb into the next full section.`, up.length ? `Climbs with ${[...new Set(up.map(e => NAMES[e.type]))].join(', ')}.` : `The level rises ${s.rise.toFixed(1)} dB across it.`);
      if (s.k < 0.3) why.push('No kick.');
    } else if (s.k < 0.3 && i > 0 && i < n - 1 && i > firstFull && i < lastFull) {
      s.label = 'Break'; why.push(`No kick: it plays in ${pctS(s.k)} of beats.`, `Sits between full sections, at ${Number.isFinite(lv) ? Math.abs(lv).toFixed(1) + ' dB under' : 'below'} the loudest.`);
    } else if (firstFull < 0 || i < firstFull) {
      s.label = 'Intro'; why.push(`Before the full arrangement first arrives (bar ${firstFull >= 0 ? S[firstFull].start + 1 : '–'}).`, `${cap(parts)}.`);
    } else if (i > lastFull) {
      s.label = 'Outro'; why.push(`After the last full section (ends at bar ${S[lastFull].end}).`, `${cap(parts)}.`);
    } else {
      s.label = 'Groove'; why.push(`${s.full ? 'Full arrangement' : 'The kick plays'}: ${parts}.`, !nearPeak ? `Sits ${Math.abs(lv).toFixed(1)} dB under the loudest section, so it isn't a drop.` : i === firstFull ? 'The first full section, and nothing builds into it, so it isn\'t a drop.' : 'Nothing builds into it, so it isn\'t a drop.');
    }
    s.why = why; s.def = SECTION_TYPES.find(t => t.label === s.label).def;
  });
}
function nameSections(an, moves) {
  if (!an.sections.length) return;
  classify(an, moves);
  // neighbours of the same type are one section: the change between them shows up in the phrases instead
  const S = an.sections, edges = [0];
  for (let i = 1; i < S.length; i++) if (S[i].label !== S[i - 1].label) edges.push(S[i].start);
  if (edges.length < S.length) { edges.push(an.grid.nBars); XR.setSections(an, edges); classify(an, moves); }
  const count = {}, seen = {}; for (const s of an.sections) count[s.label] = (count[s.label] || 0) + 1;
  for (const s of an.sections) { seen[s.label] = (seen[s.label] || 0) + 1; s.name = count[s.label] > 1 ? `${s.label} ${seen[s.label]}` : s.label; s.color = XR.LABEL_COLOR[s.label] || XR.LABEL_COLOR.Section; }
}

// ---------- assembling everything ----------
function derive(an, opts = {}) {
  const g = an.grid, S = an.S, nB = g.nBars * 4;
  const HF = new Float32Array(S.n * S.NB); for (let i = 0; i < HF.length; i++) HF[i] = Number.isFinite(S.F[i]) ? S.H[i] * S.F[i] : 0;
  an.bm = {M: beatMatrix(an, S.M), H: beatMatrix(an, S.H), P: beatMatrix(an, S.P), HS: beatMatrix(an, S.HS), HF: beatMatrix(an, HF), Q: beatMatrix(an, S.Q), Hlate: beatMatrix(an, S.H, 0.55, 0.95)};
  an.edgesM = edges(an, an.bm.M); an.edgesH = edges(an, an.bm.H);
  an.riser = riserSeries(an);
  an.lanes = lanes(an);
  const lines4 = Array.from({length: Math.floor(g.nBars / 4)}, (_, i) => i * 4).filter(b => b > 0);
  const sweeps = filterSweeps(an), rs = risers(an), rev = reverses(an, lines4), pitch = pitchSweeps(an);
  const gp = gaps(an, lines4), imp = impacts(an, lines4), ech = echoes(an, lines4);
  if (!opts.keepSections) refineSections(an, [...sweeps, ...rs, ...rev, ...pitch, ...gp, ...imp, ...ech]);
  // stutters first: their chopped hits mustn't count as a roll, and a build cites its roll
  const st = stutters(an), rl = rolls(an, st);
  nameSections(an, [...sweeps, ...rs, ...rev, ...pitch, ...gp, ...imp, ...ech, ...rl]);
  const lines = an.sections.map(s => s.start).filter(b => b > 0);
  const tp = tapeStops(an, lines), tl = tails(an, lines, ech), statics = staticFilters(an, sweeps), wd = widthMoves(an), fd = fades(an, sweeps);
  an.width = wd.series;
  // one report per move: a reverse swell isn't also a riser, a tape stop isn't also a downlifter, a noise
  // riser through an opening filter isn't also a low-pass on the music
  const riserList = rs.filter(r => !rev.some(v => overlap(r, v) > 0.5));
  const pitchList = pitch.filter(p => !tp.some(t => overlap(p, t) > 0.3));
  let ev = [...sweeps, ...statics, ...riserList, ...rev, ...pitchList, ...tp, ...rl, ...kickOuts(an), ...gp, ...imp, ...ech, ...tl, ...st, ...wd.events, ...fd];
  ev = ev.filter(e => !(e.type === 'lp' && e.opening && e.target !== 'drums' && riserList.some(r => r.noise && overlap(r, e) > 0.6 && Math.abs(r.k1 - e.k1) <= 2)));
  ev = ev.filter(e => !(e.type === 'kickOut' && gp.some(x => overlap(x, e) > 0.5)));
  // nothing sweeps through silence: a move that runs into a gap ends where the gap starts
  for (const e of ev) if (e.type !== 'gap') for (const x of gp) if (e.k0 < x.k0 && e.k1 > x.k0 + 0.01) {
    e.k1 = x.k0;
    if (e.curve) { e.curve = e.curve.filter(p => p.k < Math.floor(x.k0)); const hz = e.curve.filter(p => p.hz); if (hz.length) { e.fromHz = hz[0].hz; e.toHz = hz[hz.length - 1].hz; } }
  }
  ev = ev.filter(e => e.conf >= 0.15).sort((a, b) => a.k0 - b.k0 || b.conf - a.conf);
  ev.forEach((e, i) => { e.id = 'm' + i; e.cat = CAT[e.type] || 'Mix'; e.color = COLOR[e.cat]; Object.assign(e, describe(an, e)); e.at = barBeat(e.k0); e.to = barBeat(e.k1); });
  an.moves = ev;
  an.pumps = pumps(an);
  an.tension = tension(an);
  an.elementSpans = Object.fromEntries(LANES.map(l => [l.k, spans(an.lanes[l.k], l.k === 'kick' ? 0.45 : 0.55, l.k === 'kick' ? 0.3 : 0.35)]));
  an.phrases = phrases(an);
  an.transitions = transitions(an);
  return an;
}
function kickOuts(an) {
  const K = an.lanes.kick, out = [];
  for (const s of an.sections) {
    const ks = []; for (let k = s.start * 4; k < s.end * 4; k++) ks.push(k);
    if (ks.filter(k => K[k] > 0.45).length < 0.75 * ks.length) continue;
    let r = -1;
    for (const k of [...ks, s.end * 4]) {
      const off = k < s.end * 4 && K[k] < 0.2;
      if (off && r < 0) r = k;
      if (!off && r >= 0) { const len = k - r, back = k < K.length && K[k] > 0.45 || an.lanes.kick[s.end * 4] > 0.45; if (len >= 1 && len <= 8 && r > s.start * 4 && back) out.push({type: 'kickOut', k0: r, k1: k, conf: clamp(0.5 + 0.1 * len, 0, 1)}); r = -1; }
    }
  }
  return out;
}

// Phrases: 8 bars from each section start (shorter at the section's end). What plays, what changed.
function phrases(an) {
  const out = [], on = (l, a, b) => { let c = 0; for (let k = a * 4; k < b * 4; k++) if (an.lanes[l][k] > (l === 'kick' ? 0.45 : 0.55)) c++; return c / Math.max(1, (b - a) * 4); };
  for (const s of an.sections) for (let a = s.start; a < s.end; a += 8) {
    const b = Math.min(s.end, a + 8), p = {start: a, end: b, section: s.name, color: s.color, els: {}, events: an.moves.filter(e => e.k0 >= a * 4 - 0.01 && e.k0 < b * 4)};
    for (const l of LANES) p.els[l.k] = on(l.k, a, b);
    const prev = out[out.length - 1];
    p.inn = prev ? LANES.filter(l => p.els[l.k] >= 0.5 && prev.els[l.k] < 0.25).map(l => l.name) : LANES.filter(l => p.els[l.k] >= 0.5).map(l => l.name);
    p.out = prev ? LANES.filter(l => p.els[l.k] < 0.25 && prev.els[l.k] >= 0.5).map(l => l.name) : [];
    let lv = 0; for (let k = a * 4; k < b * 4; k++) lv += an.tension[k] || 0; p.tension = lv / Math.max(1, (b - a) * 4);
    out.push(p);
  }
  return out;
}

// Transitions: every section change, with everything that happens in the bars around it.
function transitions(an) {
  return an.sections.slice(1).map((s, i) => {
    const prev = an.sections[i], k = s.start * 4, w0 = Math.max(prev.start * 4, k - 64), w1 = Math.min(s.end * 4, k + 16);
    const evs = an.moves.filter(e => e.k1 > w0 + 0.01 && e.k0 < w1 && (e.k1 >= k - 32 || e.k0 >= k - 8));
    const mean4 = (l, a, b) => { let x = 0, c = 0; for (let q = Math.max(0, a); q < Math.min(an.lanes[l].length, b); q++) { x += an.lanes[l][q]; c++; } return c ? x / c : 0; };
    const changes = LANES.map(l => ({k: l.k, name: l.name, before: mean4(l.k, k - 8, k), after: mean4(l.k, k, k + 8)})).filter(c => Math.abs(c.after - c.before) >= 0.35);
    const lv = (a, b) => { const st = an.loud.st; let p = 0, c = 0; for (let i = Math.max(0, Math.floor(toTime(an, a) * 10)); i < Math.min(st.length, Math.floor(toTime(an, b) * 10)); i++) { p += Math.pow(10, st[i] / 10); c++; } return c ? 10 * Math.log10(p / c) : NaN; };
    const jump = lv(k + 1, k + 8) - lv(k - 8, k - 1);
    const pump = an.pumps.find(p => p.start === s.start);
    return {i: i + 1, from: prev, to: s, bar: s.start, k, w0, w1, events: evs, inn: changes.filter(c => c.after > c.before), out: changes.filter(c => c.after < c.before), jump, pump, kind: `${prev.label} → ${s.label}`};
  });
}

// ---------- MIDI with controller lanes ----------
const PPQ = 480, BAR = PPQ * 4;
function midiFile(tracks) {
  const str = s => Array.from(unescape(encodeURIComponent(s)), c => c.charCodeAt(0)), vlq = XR._vlq;
  const chunk = (id, data) => [...str(id), (data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...data];
  const body = tracks.map(tr => {
    const ev = [];
    if (tr.name) ev.push({t: 0, o: 0, d: [0xff, 0x03, ...vlq(str(tr.name).length), ...str(tr.name)]});
    if (tr.bpm) { const us = Math.round(60e6 / tr.bpm); ev.push({t: 0, o: 0, d: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255]}, {t: 0, o: 0, d: [0xff, 0x58, 4, 4, 2, 24, 8]}); }
    for (const m of tr.markers || []) ev.push({t: m.t, o: 0, d: [0xff, 0x06, ...vlq(str(m.text).length), ...str(m.text)]});
    for (const m of tr.texts || []) ev.push({t: m.t, o: 0, d: [0xff, 0x01, ...vlq(str(m.text).length), ...str(m.text)]});
    for (const c of tr.cc || []) ev.push({t: Math.max(0, Math.round(c.t)), o: 1, d: [0xb0 | (c.ch || 0), c.cc, clamp(Math.round(c.v), 0, 127)]});
    for (const n of tr.notes || []) { const ch = n.ch || 0, p = clamp(Math.round(n.p), 0, 127); ev.push({t: Math.max(0, Math.round(n.t)), o: 2, d: [0x90 | ch, p, clamp(Math.round(n.v || 100), 1, 127)]}, {t: Math.max(0, Math.round(n.t + Math.max(1, n.d))), o: 0.5, d: [0x80 | ch, p, 0]}); }
    ev.sort((a, b) => a.t - b.t || a.o - b.o);
    const data = []; let last = 0;
    for (const e of ev) { data.push(...vlq(e.t - last), ...e.d); last = e.t; }
    data.push(0, 0xff, 0x2f, 0);
    return chunk('MTrk', data);
  });
  return new Uint8Array([...chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255]), ...body.flat()]);
}
// Live's Auto Filter frequency knob runs 26 Hz–19.9 kHz on a log scale; CC 0–127 mapped onto that.
const hzToCC = hz => clamp(Math.round(127 * Math.log(Math.max(26, Math.min(19900, hz)) / 26) / Math.log(19900 / 26)), 0, 127);
function blueprintMidi(an, opts = {}) {
  const g = an.grid, tk = k => Math.round(k * PPQ), tracks = [];
  tracks.push({name: `Blueprint · ${g.bpm.toFixed(2)} BPM`, bpm: g.bpm, markers: an.sections.map(s => ({t: s.start * BAR, text: `${s.name} (${s.end - s.start} bars)`})), texts: an.moves.map(e => ({t: tk(e.k0), text: `${e.title} · ${e.at}`}))});
  for (const l of LANES) {
    const notes = an.elementSpans[l.k].map(([a, b]) => ({p: l.note, t: tk(a), d: tk(b - a) - 1, v: clamp(Math.round(40 + 87 * mean(Array.from(an.lanes[l.k].subarray(a, b)))), 1, 127)}));
    if (notes.length) tracks.push({name: `${l.name} (where it plays)`, notes});
  }
  const roll = an.moves.filter(e => e.type === 'roll');
  if (roll.length) tracks.push({name: 'Rolls (detected hits)', notes: roll.flatMap(r => { const top = Math.max(...r.hits.map(h => h.v)); return r.hits.map(h => ({p: 38, t: tk(h.k), d: PPQ / 16, v: clamp(Math.round(30 + 97 * h.v / top), 1, 127)})); })});
  for (const target of ['music', 'drums', 'mix']) {
    const sw = an.moves.filter(e => (e.type === 'lp' || e.type === 'hp') && e.target === target); if (!sw.length) continue;
    const cc = [];
    for (const e of sw) {
      const pts = e.curve.filter(p => p.hz);
      if (e.opening) pts.push({k: e.k1, hz: e.type === 'lp' ? 19900 : 26}); else pts.unshift({k: e.k0, hz: e.type === 'lp' ? 19900 : 26});
      for (const p of pts) cc.push({t: tk(p.k), cc: 74, v: hzToCC(p.hz)});
      if (!e.opening) cc.push({t: tk(Math.ceil(e.k1 / 4) * 4), cc: 74, v: e.type === 'lp' ? 127 : 0});
    }
    tracks.push({name: `Filter cutoff · ${target} (CC74)`, cc, notes: sw.map(e => ({p: e.type === 'lp' ? 60 : 48, t: tk(e.k0), d: tk(e.k1 - e.k0), v: 90}))});
  }
  return midiFile(tracks);
}
function rollMidi(an, e) { const top = Math.max(...e.hits.map(h => h.v)), k0 = Math.floor(e.k0 / 4) * 4; return midiFile([{name: `Roll · ${e.at}`, bpm: an.grid.bpm, notes: e.hits.map(h => ({p: 38, t: Math.round((h.k - k0) * PPQ), d: PPQ / 16, v: clamp(Math.round(30 + 97 * h.v / top), 1, 127)}))}]); }

// ---------- report ----------
function report(an, name) {
  const g = an.grid, L = [];
  L.push(`# Blueprint: ${name}`, '', `${g.bpm.toFixed(2)} BPM · ${an.key ? an.key.name + ' (' + an.key.camelot + ')' : 'key unclear'} · ${g.nBars} bars · ${an.sections.length} sections · ${an.moves.length} moves found`, '');
  L.push('## Sections', '', '| Bars | Section | Length |', '|---|---|---|');
  for (const s of an.sections) L.push(`| ${s.start + 1}–${s.end} | ${s.name} | ${s.end - s.start} bars |`);
  L.push('', '## Every move, in order', '');
  for (const e of an.moves) L.push(`- **${e.at}** ${e.title} (${Math.round(e.conf * 100)}% sure). ${e.what}`);
  L.push('', '## Transitions, and how to rebuild them', '');
  for (const t of an.transitions) {
    L.push(`### Bar ${t.bar + 1}: ${t.kind}`, '');
    if (t.inn.length || t.out.length) L.push(`In: ${t.inn.map(c => c.name).join(', ') || '–'} · Out: ${t.out.map(c => c.name).join(', ') || '–'} · Level ${t.jump >= 0 ? '+' : ''}${Number.isFinite(t.jump) ? t.jump.toFixed(1) : '–'} LU`, '');
    for (const e of t.events) { L.push(`- **${e.at}** ${e.title}`); for (const r of e.recipe) L.push(`  - ${r}`); }
    L.push('');
  }
  L.push('## Phrase by phrase', '');
  for (const p of an.phrases) L.push(`- Bars ${p.start + 1}–${p.end} (${p.section}): ${p.inn.length ? '+ ' + p.inn.join(', ') : ''}${p.out.length ? (p.inn.length ? ' · ' : '') + '− ' + p.out.join(', ') : ''}${!p.inn.length && !p.out.length ? 'same elements' : ''}${p.events.length ? ' · ' + p.events.map(e => e.title.toLowerCase()).join(', ') : ''}`);
  const pp = an.pumps.filter(p => p.pump);
  if (pp.length) { L.push('', '## Sidechain', ''); for (const p of pp) L.push(`- ${p.section}: ${p.depth.toFixed(1)} dB duck, back within 1 dB after ${Math.round(p.releaseMs)} ms`); }
  return L.join('\n') + '\n';
}

return {SECTION_TYPES, _x: {echoes, series, otsu, elementBreaks, widthMoves, staticFilters, loopRefs, filterSweeps, pitchSweeps, tapeStops, echoes, impacts, edges, relFit, riserSeries, frameSeries, bandIdx, toBeat, toTime, pumps, steadyRuns}, prepare, derive, spectral, blueprintMidi, rollMidi, midiFile, report, hzToCC, LANES, CAT, COLOR, barBeat, lengthText, hzText, noteValue, spans, fitSkirt, relFit, steadyRuns};
})();
/* blueprint-engine:end */
