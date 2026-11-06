/* transplant-audio:start */
// Transplant's preview: every part of your loop played through the arrangement, synthesized with Web Audio.
// Three groups (drums, bass, synths) plus FX, each with a 24 dB/oct low-pass and high-pass that follow the
// reference's sweeps per 16th, on the dry signal and on the sends. The bass and synths duck under your kick by the
// reference's measured depth and release. Gaps silence the sends too, tape stops slow the whole mix down (a delay
// line whose delay grows, which lowers the pitch the way a slowing tape does), and the risers, crashes and
// booms are synthesized to length. The same graph renders offline for WAV.
const TA = (() => {
'use strict';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hz = n => 440 * Math.pow(2, (n - 69) / 12);

// ---------- shared buffers ----------
function noise(ctx) {
  if (ctx._tpNoise) return ctx._tpNoise;
  const len = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let s = 12345 + ch * 999; for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; } }
  return (ctx._tpNoise = b);
}
function impulse(ctx, seconds = 2.6, damp = 0.55) {
  const sr = ctx.sampleRate, len = Math.max(1, Math.floor(sr * seconds)), b = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let s = 987 + ch * 7919, lp = 0;
    for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; const n = (s / 4294967296) * 2 - 1, t = i / sr, c = 0.15 + 0.8 * Math.min(1, t / seconds) * damp; lp += (n - lp) * (1 - c); d[i] = lp * Math.exp(-6.9 * t / seconds); }
    for (const [ms, g] of [[7, 0.5], [13, 0.35], [23, 0.28], [31, 0.2], [43, 0.14]]) { const i = Math.floor((ms + ch * 2.5) * sr / 1000); if (i < len) d[i] += g * (ch ? -1 : 1); }
  }
  return b;
}
function wave(ctx, name) {
  ctx._tpWaves ||= new Map();
  if (ctx._tpWaves.has(name)) return ctx._tpWaves.get(name);
  const N = 64, re = new Float32Array(N), im = new Float32Array(N);
  if (name === 'organ') for (const [h, a] of [[1, 1], [2, 0.75], [3, 0.5], [4, 0.32], [6, 0.18], [8, 0.12]]) im[h] = a;
  else if (name === 'hollow') for (let h = 1; h < N; h++) im[h] = (h % 2 ? 1 / h : 0) * (h === 1 ? 0.35 : 1) * Math.exp(-h / 40);
  else if (name === 'pulse25') for (let h = 1; h < N; h++) im[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * 0.25) * Math.exp(-h / 50);
  else im[1] = 1;
  const w = ctx.createPeriodicWave(re, im, {disableNormalization: false});
  ctx._tpWaves.set(name, w); return w;
}
const curves = new Map();
function drive(k) { const key = Math.round(k * 100); if (curves.has(key)) return curves.get(key); const n = 2048, c = new Float32Array(n), a = 1 + k * 14; for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(a * x) / Math.tanh(a); } curves.set(key, c); return c; }

// ---------- bass patches (Orbit's patch format), next to Orbit's 37 ----------
const BASS = [
  {id: 'tp-rolling', name: 'Rolling bass', family: 'Bass', desc: 'Saw and a square an octave down through a snapping low-pass: the techno rumble-roll.',
    osc: [{wave: 'saw', gain: 0.5}, {wave: 'square', gain: 0.22, oct: -1}, {wave: 'sine', gain: 0.55}], filter: {type: 'lowpass', cut: 340, q: 3.2, env: 2.3, a: 0, d: 0.085, s: 0.12, kt: 0.35},
    amp: {a: 0.002, d: 0.16, s: 0.55, r: 0.035}, drive: 0.35, level: 0.62, fx: {reverb: 0, delay: 0}},
  {id: 'tp-house-bass', name: 'House bass', family: 'Bass', desc: 'Square and saw with a plucky envelope and a clean sine underneath: the tech house bass.',
    osc: [{wave: 'square', gain: 0.4}, {wave: 'saw', gain: 0.3}, {wave: 'sine', gain: 0.65}], filter: {type: 'lowpass', cut: 480, q: 4, env: 2.6, a: 0, d: 0.14, s: 0.2, kt: 0.3},
    amp: {a: 0.002, d: 0.24, s: 0.55, r: 0.05}, drive: 0.3, level: 0.58, fx: {reverb: 0, delay: 0}},
  {id: 'tp-sub', name: 'Sub bass', family: 'Bass', desc: 'A sine with a touch of triangle an octave up, so it reads on small speakers.',
    osc: [{wave: 'sine', gain: 1}, {wave: 'triangle', gain: 0.12, oct: 1}], filter: {type: 'lowpass', cut: 900, q: 0.5, env: 0, a: 0, d: 0.1, s: 1, kt: 0},
    amp: {a: 0.004, d: 0.3, s: 0.85, r: 0.06}, drive: 0.1, level: 0.78, fx: {reverb: 0, delay: 0}},
];
const SOUNDS = [...BASS, ...(typeof OSND !== 'undefined' ? OSND : [])];
const SOUND = Object.fromEntries(SOUNDS.map(s => [s.id, s]));
const DRUM_VOICES = ['kick', 'clap', 'snare', 'chh', 'ohh', 'ride', 'shaker', 'rim', 'tom', 'conga', 'cowbell', 'wood', 'crash', 'perc'];
const DRUM_NAME = {kick: 'Kick', clap: 'Clap', snare: 'Snare', chh: 'Closed hat', ohh: 'Open hat', ride: 'Ride', shaker: 'Shaker', rim: 'Rim', tom: 'Tom', conga: 'Conga', cowbell: 'Cowbell', wood: 'Wood block', crash: 'Crash', perc: 'Perc blip'};
const ROLE_LEVEL = {kick: 1, clap: 0.62, hats: 0.42, perc: 0.42, bass: 0.86, lead: 0.62, chords: 0.5, pad: 0.46, vox: 0.55, fx: 0.48};
const DRUM_SEND = {clap: 0.16, snare: 0.14, chh: 0.03, ohh: 0.05, ride: 0.06, shaker: 0.05, rim: 0.12, tom: 0.1, conga: 0.1, cowbell: 0.1, wood: 0.12, crash: 0.15, perc: 0.1, kick: 0};
const PERC_HZ = {41: 90, 43: 110, 45: 130, 47: 150, 48: 175, 50: 200, 60: 420, 61: 330, 62: 310, 63: 280, 64: 205, 65: 300, 66: 240};

function create(ctx, {destination = ctx.destination} = {}) {
  const N = noise(ctx), sources = [];
  const track = (node, stop) => { sources.push({node, stop}); return node; };
  // master: limiter at the end, a gentle bus compressor before it
  const master = ctx.createGain(); master.gain.value = 0.86;
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -15; comp.knee.value = 8; comp.ratio.value = 2.2; comp.attack.value = 0.008; comp.release.value = 0.16;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.7;
  comp.connect(limiter); limiter.connect(master); master.connect(analyser); master.connect(destination);
  // tape stop: a delay whose delay time grows (lower pitch), a closing low-pass and a fade; idle it passes straight through
  const tape = ctx.createDelay(4), tapeLP = ctx.createBiquadFilter(), tapeGain = ctx.createGain(), fade = ctx.createGain(), gate = ctx.createGain(), mixIn = ctx.createGain();
  tape.delayTime.value = 0; tapeLP.type = 'lowpass'; tapeLP.frequency.value = 20000; tapeLP.Q.value = 0.5;
  mixIn.connect(gate); gate.connect(fade); fade.connect(tape); tape.connect(tapeLP); tapeLP.connect(tapeGain); tapeGain.connect(comp);
  // returns
  const conv = ctx.createConvolver(); conv.buffer = impulse(ctx); const revIn = ctx.createGain(), revOut = ctx.createGain(), revHP = ctx.createBiquadFilter();
  revHP.type = 'highpass'; revHP.frequency.value = 220; revIn.connect(revHP); revHP.connect(conv); conv.connect(revOut); revOut.gain.value = 0.9; revOut.connect(mixIn);
  const dIn = ctx.createGain(), dL = ctx.createDelay(4), dR = ctx.createDelay(4), dFb = ctx.createGain(), dHP = ctx.createBiquadFilter(), dLP = ctx.createBiquadFilter(), dMerge = ctx.createChannelMerger(2), dOut = ctx.createGain();
  dHP.type = 'highpass'; dHP.frequency.value = 350; dLP.type = 'lowpass'; dLP.frequency.value = 5200; dFb.gain.value = 0.36; dOut.gain.value = 0.8;
  dIn.connect(dHP); dHP.connect(dLP); dLP.connect(dL); dL.connect(dR); dR.connect(dFb); dFb.connect(dL); dL.connect(dMerge, 0, 0); dR.connect(dMerge, 0, 1); dMerge.connect(dOut); dOut.connect(mixIn);
  const sendGate = ctx.createGain(); sendGate.connect(revIn); const dGate = ctx.createGain(); dGate.connect(dIn);

  // groups: dry and send chains, each with a 24 dB/oct low-pass and high-pass (two biquads each)
  const filterChain = (into) => {
    const lp1 = ctx.createBiquadFilter(), lp2 = ctx.createBiquadFilter(), hp1 = ctx.createBiquadFilter(), hp2 = ctx.createBiquadFilter();
    for (const [f, t, q] of [[lp1, 'lowpass', 0.54], [lp2, 'lowpass', 1.31], [hp1, 'highpass', 0.54], [hp2, 'highpass', 1.31]]) { f.type = t; f.Q.value = q; f.frequency.value = t === 'lowpass' ? 20000 : 10; }
    hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2); lp2.connect(into);
    return {input: hp1, lp: [lp1, lp2], hp: [hp1, hp2]};
  };
  const groups = {};
  for (const g of ['drums', 'bass', 'synths', 'fx']) {
    const out = ctx.createGain(), duck = ctx.createGain(); duck.connect(out); out.connect(mixIn);
    const dry = filterChain(duck), rev = filterChain(sendGate), dly = filterChain(dGate);
    groups[g] = {dry, rev, dly, duck, out, lastLp: 20000, lastHp: 10};
  }
  let parts = [], plan = null, spb = 0.5, kickHz = 50;

  function load(pl, o = {}) {
    for (const p of parts) try { p.in.disconnect(); p.rev.disconnect(); p.dly.disconnect(); } catch (_) {}
    plan = pl; spb = 60 / pl.bpm; kickHz = o.kickHz || 50;
    for (const g of ['drums', 'bass', 'synths', 'fx']) { const G = groups[g]; for (const c of [G.dry, G.rev, G.dly]) { for (const f of c.lp) f.frequency.value = 20000; for (const f of c.hp) f.frequency.value = 10; } G.duck.gain.value = 1; }
    const dt = Math.min(3.9, 0.75 * spb); dL.delayTime.value = dt; dR.delayTime.value = dt;
    parts = pl.parts.map(x => {
      // voices → in (level, mute) → the group's dry chain, and through the send amounts to its reverb and delay chains
      const input = ctx.createGain(), rev = ctx.createGain(), dly = ctx.createGain(), G = groups[x.group] || groups.synths;
      input.connect(G.dry.input); input.connect(rev); input.connect(dly); rev.connect(G.rev.input); dly.connect(G.dly.input);
      const s = SOUND[x.part.sound], drum = x.part.kind === 'drum';
      rev.gain.value = drum ? (DRUM_SEND[x.part.voice] ?? 0.08) : clamp(((s && s.fx && s.fx.reverb) || 0.15) * 0.9, 0, 0.6);
      dly.gain.value = drum ? (x.role === 'clap' ? 0.04 : 0) : x.role === 'bass' ? 0 : clamp(((s && s.fx && s.fx.delay) || 0.08) * 0.9, 0, 0.4);
      return {x, in: input, rev, dly, mono: null, voices: []};
    });
    levels();
  }
  function levels(now = ctx.currentTime) {
    const solo = parts.some(p => p.x.part.solo);
    for (const p of parts) { const pp = p.x.part, on = !pp.mute && (!solo || pp.solo); p.in.gain.setTargetAtTime(on ? (ROLE_LEVEL[pp.role] || 0.5) * (pp.level ?? 1) : 0, now, 0.015); }
  }

  // ---- voices ----
  function synth(p, s, e, t, dur) {
    const f = hz(e.n), v = e.v / 127;
    const A = s.amp, att = A.a, dec = A.d, sus = A.s, rel = A.r, end = Math.max(t + dur, t + att + 0.006), stop = end + rel * 2.2 + 0.03;
    const vg = ctx.createGain(), poly = e.poly || 1, peak = s.level * (0.3 + 0.7 * v) / Math.sqrt(poly) * (poly > 1 ? 1.25 : 1);
    const legato = s.mono && p.mono && p.mono.end > t + 0.005;
    vg.gain.setValueAtTime(legato ? peak * Math.max(sus, 0.5) : 0, t);
    if (!legato) vg.gain.linearRampToValueAtTime(peak, t + att);
    vg.gain.setTargetAtTime(peak * sus, t + att, Math.max(0.005, dec / 3));
    vg.gain.setTargetAtTime(0, end, Math.max(0.004, rel / 3));
    if (s.mono) { if (p.mono && p.mono.end > t) p.mono.g.gain.setTargetAtTime(0, t + 0.004, 0.006); p.mono = {g: vg, end: stop, n: e.n}; }
    // voice cap per part: the oldest fades first
    p.voices = p.voices.filter(x => x.stop > t); while (p.voices.length >= 24) p.voices.shift().g.gain.setTargetAtTime(0, t, 0.02); p.voices.push({g: vg, stop});
    const F = s.filter, base = Math.min(16000, Math.max(40, F.cut * Math.pow(f / 261.6, F.kt || 0))), peakF = Math.min(18000, base * Math.pow(2, (F.env || 0) * (0.45 + 0.55 * v)));
    const flt = ctx.createBiquadFilter(); flt.type = F.type; flt.Q.value = Math.max(0.3, F.q);
    if (F.env) { flt.frequency.setValueAtTime(F.a ? base : peakF, t); if (F.a) flt.frequency.exponentialRampToValueAtTime(peakF, t + F.a); flt.frequency.setTargetAtTime(base + (peakF - base) * F.s, t + (F.a || 0), Math.max(0.005, F.d / 3)); }
    else flt.frequency.setValueAtTime(base, t);
    if (s.lfo) { const lo = ctx.createOscillator(), lg = ctx.createGain(); lo.frequency.value = s.lfo.rate; lg.gain.value = base * (Math.pow(2, s.lfo.depth) - 1) * 0.5; lo.connect(lg); lg.connect(flt.frequency); lo.start(t); lo.stop(stop); track(lo, stop); }
    let head = flt;
    if (s.formants) { const sum = ctx.createGain(); for (const [ff, q, g] of s.formants) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; const bg = ctx.createGain(); bg.gain.value = g * 2.2; flt.connect(bp); bp.connect(bg); bg.connect(sum); } head = sum; }
    let dr = null;
    if (s.drive) { dr = ctx.createWaveShaper(); dr.curve = drive(clamp(s.drive * 0.8, 0, 1)); head.connect(dr); head = dr; }
    if (s.trem) { const tl = ctx.createOscillator(), td = ctx.createGain(), tg = ctx.createGain(); tl.frequency.value = s.trem.rate; td.gain.value = s.trem.depth; tg.gain.value = 1 - s.trem.depth; tl.connect(td); td.connect(tg.gain); head.connect(tg); head = tg; tl.start(t); tl.stop(stop); track(tl, stop); }
    head.connect(vg); vg.connect(p.in);
    const startF = legato ? hz(p.monoFrom ?? e.n) : f; p.monoFrom = e.n;
    let last = null;
    for (const o of s.osc) {
      const n = Math.min(o.voices || 1, 5), ff = f * Math.pow(2, (o.oct || 0) + (o.semi || 0) / 12), sf = startF * Math.pow(2, (o.oct || 0) + (o.semi || 0) / 12);
      const og = ctx.createGain(); og.gain.value = o.gain / Math.sqrt(n); og.connect(flt);
      for (let k = 0; k < n; k++) {
        const osc = ctx.createOscillator();
        if (['sine', 'square', 'sawtooth', 'triangle'].includes(o.wave)) osc.type = o.wave; else if (o.wave === 'saw') osc.type = 'sawtooth'; else osc.setPeriodicWave(wave(ctx, o.wave));
        const pos = n > 1 ? (k / (n - 1)) * 2 - 1 : 0;
        osc.detune.value = pos * (o.spread || 0) + (k ? (k * 37 % 7) - 3 : 0);
        if (s.pitch) { osc.frequency.setValueAtTime(sf * Math.pow(2, s.pitch.amt / 12), t); osc.frequency.setTargetAtTime(ff, t, s.pitch.decay / 2.5); }
        else if (legato) { osc.frequency.setValueAtTime(sf, t); osc.frequency.exponentialRampToValueAtTime(ff, t + (s.glide || 0.06)); }
        else osc.frequency.setValueAtTime(ff, t);
        if (s.vib) { const vl = ctx.createOscillator(), vd = ctx.createGain(); vl.frequency.value = s.vib.rate; vd.gain.value = s.vib.depth * 100; vl.connect(vd); vd.connect(osc.detune); vl.start(t + 0.08); vl.stop(stop); track(vl, stop); }
        let dest = og;
        if (n > 1) { const pan = ctx.createStereoPanner(); pan.pan.value = pos * 0.6; pan.connect(og); dest = pan; }
        osc.connect(dest);
        if (s.fm) { const mo = ctx.createOscillator(), mg = ctx.createGain(); mo.frequency.value = ff * s.fm.ratio; const idx = ff * s.fm.ratio * s.fm.index * (0.5 + 0.5 * v); mg.gain.setValueAtTime(idx, t); mg.gain.setTargetAtTime(idx * s.fm.sustain, t, Math.max(0.004, s.fm.decay / 2.5)); mo.connect(mg); mg.connect(osc.frequency); mo.start(t); mo.stop(stop); track(mo, stop); }
        osc.start(t); osc.stop(stop); track(osc, stop); last = osc;
      }
    }
    if (s.noise) {
      const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); ns.buffer = N; nf.type = 'highpass'; nf.frequency.value = s.noise.hp;
      const nl = s.noise.gain * (0.4 + 0.6 * v);
      if (s.noise.sus) { ns.loop = true; ng.gain.setValueAtTime(nl * s.noise.sus, t); ng.gain.setTargetAtTime(0, end, Math.max(0.004, rel / 3)); ns.start(t, (e.n * 0.0173) % 1.5); ns.stop(stop); track(ns, stop); }
      else { ng.gain.setValueAtTime(nl, t); ng.gain.setTargetAtTime(0, t, s.noise.decay / 2); ns.start(t, (e.n * 0.0173) % 1.5); ns.stop(t + s.noise.decay * 6 + 0.01); track(ns, t + s.noise.decay * 6); }
      ns.connect(nf); nf.connect(ng); ng.connect(s.noise.thru ? flt : vg);
    }
    if (last) last.onended = () => { try { vg.disconnect(); flt.disconnect(); if (dr) dr.disconnect(); } catch (_) {} };
  }
  function nz(p, t, {dec, type, freq, q = 1, gain, delay = 0, len = dec * 6, att = 0.0015, hp = 0}) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = N; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(gain, t + delay + att); g.gain.setTargetAtTime(0, t + delay + att + 0.001, dec / 3);
    let head = f; if (hp) { const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; f.connect(h); head = h; }
    s.connect(f); head.connect(g); g.connect(p.in);
    s.start(t + delay, (t * 7.31) % 1.5); s.stop(t + delay + len + 0.02); track(s, t + delay + len);
  }
  function tone(p, t, {type = 'sine', f0, f1 = f0, glide = 0.03, dec, gain, att = 0.002}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.setTargetAtTime(0, t + att, dec / 3);
    o.connect(g); g.connect(p.in); o.start(t); o.stop(t + dec * 5 + 0.05); track(o, t + dec * 5);
  }
  function metal(p, t, {dec, gain, bp = 10000, hpf = 7000}) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter(), h = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = 0.9; h.type = 'highpass'; h.frequency.value = hpf;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.001); g.gain.setTargetAtTime(0, t + 0.002, dec / 3);
    for (const fr of [205.3, 304.4, 369.6, 522.7, 540, 800]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = fr * 1.7; o.connect(f); o.start(t); o.stop(t + dec * 5 + 0.02); track(o, t + dec * 5); }
    f.connect(h); h.connect(g); g.connect(p.in);
  }
  function drum(p, voice, t, e) {
    const v = e.v / 127;
    switch (voice) {
      case 'kick': {
        const o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper(); sh.curve = drive(0.25);
        o.frequency.setValueAtTime(kickHz * 3.6, t); o.frequency.exponentialRampToValueAtTime(kickHz * 1.5, t + 0.022); o.frequency.exponentialRampToValueAtTime(kickHz, t + 0.11);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.0 * (0.35 + 0.65 * v), t + 0.0015); g.gain.setTargetAtTime(0.7 * v, t + 0.01, 0.05); g.gain.setTargetAtTime(0, t + 0.09, 0.1);
        o.connect(sh); sh.connect(g); g.connect(p.in); o.start(t); o.stop(t + 0.75); track(o, t + 0.75);
        nz(p, t, {dec: 0.004, type: 'highpass', freq: 3200, gain: 0.32 * v});
        tone(p, t, {type: 'square', f0: 1600, dec: 0.004, gain: 0.07 * v});
        break;
      }
      case 'clap': for (const [d, gg, dec] of [[0, 0.55, 0.008], [0.0095, 0.5, 0.008], [0.019, 0.55, 0.009], [0.028, 0.75, 0.15]]) nz(p, t, {dec, type: 'bandpass', freq: 1250, q: 1.3, gain: gg * v, delay: d, hp: 600}); break;
      case 'snare': tone(p, t, {type: 'triangle', f0: 230, f1: 175, glide: 0.04, dec: 0.08, gain: 0.45 * v}); nz(p, t, {dec: 0.14, type: 'bandpass', freq: 3200, q: 0.7, gain: 0.5 * v, hp: 1200}); break;
      case 'chh': metal(p, t, {dec: 0.035, gain: 0.32 * v}); nz(p, t, {dec: 0.03, type: 'highpass', freq: 8500, gain: 0.14 * v}); break;
      case 'ohh': metal(p, t, {dec: 0.24, gain: 0.26 * v}); nz(p, t, {dec: 0.22, type: 'highpass', freq: 8000, gain: 0.1 * v}); break;
      case 'ride': metal(p, t, {dec: 0.7, gain: 0.16 * v, bp: 6000, hpf: 4000}); tone(p, t, {f0: 2950, dec: 0.5, gain: 0.04 * v}); break;
      case 'shaker': nz(p, t, {dec: 0.045, type: 'bandpass', freq: 7200, q: 1.6, gain: 0.32 * v, att: 0.006}); break;
      case 'rim': tone(p, t, {type: 'triangle', f0: 1750, dec: 0.014, gain: 0.32 * v}); nz(p, t, {dec: 0.005, type: 'bandpass', freq: 2800, q: 2, gain: 0.25 * v}); break;
      case 'tom': case 'conga': { const f = PERC_HZ[e.n] || (voice === 'tom' ? 130 : 300); tone(p, t, {f0: f * 1.45, f1: f, glide: 0.035, dec: voice === 'tom' ? 0.28 : 0.17, gain: 0.5 * v}); nz(p, t, {dec: 0.006, type: 'bandpass', freq: 3000, q: 1, gain: 0.1 * v}); break; }
      case 'cowbell': for (const fr of [540, 800]) tone(p, t, {type: 'square', f0: fr, dec: 0.12, gain: 0.06 * v}); break;
      case 'wood': tone(p, t, {type: 'triangle', f0: 950, f1: 880, glide: 0.01, dec: 0.045, gain: 0.35 * v}); break;
      case 'crash': metal(p, t, {dec: 1.6, gain: 0.14 * v, bp: 7000, hpf: 4500}); nz(p, t, {dec: 1.5, type: 'highpass', freq: 5000, gain: 0.1 * v}); break;
      default: tone(p, t, {f0: hz(e.n + 12), dec: 0.1, gain: 0.25 * v});
    }
  }
  function playNote(p, e, t) {
    const pp = p.x.part;
    if (pp.kind === 'drum') { drum(p, pp.sound && DRUM_VOICES.includes(pp.sound) ? pp.sound : pp.voice || 'perc', t, e); return; }
    const s = SOUND[pp.sound] || SOUND['tech-pluck'] || BASS[0];
    synth(p, s, e, t, Math.max(0.03, e.d * spb));
  }

  // ---- FX ----
  function fxEvent(f, t, from = 0) {
    const len = Math.max(0.05, (f.k1 - f.k0) * spb), off = clamp(from * spb, 0, len), t0 = t - off, end = t0 + len, st = Math.max(t, t0);
    if (end - st < 0.02) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(groups.fx.dry.input); const s2 = ctx.createGain(); s2.gain.value = 0.35; g.connect(s2); s2.connect(groups.fx.rev.input);
    // a curve over the event, x from 0 to 1, starting wherever playback joins it
    const cv = (param, fn) => { const x0 = (st - t0) / len, n = 64; param.setValueCurveAtTime(Float32Array.from({length: n}, (_, i) => fn(x0 + (1 - x0) * i / (n - 1))), st, Math.max(0.01, end - st)); };
    const metalTo = (dest, mul, hpf, a, b) => { for (const fr of [205.3, 304.4, 369.6, 522.7, 540, 800]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = fr * mul; const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hpf; o.connect(h); h.connect(dest); o.start(a); o.stop(b); track(o, b); } };
    switch (f.type) {
      case 'riser': {
        const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(); s.buffer = N; s.loop = true; bp.type = 'bandpass'; bp.Q.value = 0.9; hp.type = 'highpass';
        cv(bp.frequency, x => 380 * Math.pow(9000 / 380, Math.pow(x, 1.1))); cv(hp.frequency, x => 90 * Math.pow(1800 / 90, Math.pow(x, 1.3)));
        const lo = Math.pow(10, -(f.riseDb || 18) / 20); cv(g.gain, x => 0.42 * lo * Math.pow(1 / lo, Math.pow(x, 1.8)));
        s.connect(bp); bp.connect(hp); hp.connect(g); s.start(st, off % 1.9); s.stop(end + 0.01); track(s, end);
        break;
      }
      case 'reverse': {
        const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), m = ctx.createGain(); s.buffer = N; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 3500;
        cv(g.gain, x => 0.32 * Math.pow(x, 3.2)); m.gain.value = 0.55; m.connect(g);
        s.connect(hp); hp.connect(g); s.start(st); s.stop(end + 0.005); track(s, end);
        metalTo(m, 2.3, 5000, st, end);
        break;
      }
      case 'crash': {
        if (from > 0.5) return;
        const dec = f.t60 || 2.5, s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), m = ctx.createGain(); s.buffer = N; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 4200;
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.3, t0 + 0.002); g.gain.setTargetAtTime(0, t0 + 0.004, dec / 6.9);
        s.connect(hp); hp.connect(g); s.start(t0); s.stop(t0 + dec + 0.1); track(s, t0 + dec);
        m.gain.setValueAtTime(0.4, t0); m.gain.setTargetAtTime(0, t0, dec / 9); m.connect(g); metalTo(m, 3.1, 5500, t0, t0 + dec);
        break;
      }
      case 'boom': {
        if (from > 0.5) return;
        const o = ctx.createOscillator(), sh = ctx.createWaveShaper(); sh.curve = drive(0.3); o.frequency.setValueAtTime(kickHz * 1.6, t0); o.frequency.exponentialRampToValueAtTime(kickHz * 0.62, t0 + 1.1);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.85, t0 + 0.004); g.gain.setTargetAtTime(0, t0 + 0.05, 0.42); s2.gain.value = 0;
        o.connect(sh); sh.connect(g); o.start(t0); o.stop(t0 + 2.4); track(o, t0 + 2.4);
        break;
      }
      case 'pitchUp': case 'pitchDown': {
        const up = f.type === 'pitchUp', semis = f.semis || (up ? 12 : -12), f0 = up ? 140 : 700, f1 = f0 * Math.pow(2, semis / 12), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
        const fq = x => f0 * Math.pow(f1 / f0, x);
        cv(lp.frequency, x => Math.min(16000, fq(x) * 6)); cv(g.gain, x => up ? 0.05 + 0.13 * Math.pow(x, 1.4) : 0.18 * Math.pow(1 - x, 1.3));
        for (const d of [-12, 0, 11]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = d; cv(o.frequency, fq); o.connect(lp); o.start(st); o.stop(end + 0.01); track(o, end); }
        lp.connect(g);
        break;
      }
    }
  }

  // ---- scheduling ----
  let evNotes = [], kicksByT = [];
  function prepare() {
    evNotes = [];
    plan.parts.forEach((x, i) => { for (const n of x.notes) evNotes.push({k: n.t, i, n}); });
    evNotes.sort((a, b) => a.k - b.k);
  }
  const lower = (a, k) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m].k < k) lo = m + 1; else hi = m; } return lo; };
  function setFilters(g, i, t, jump) {
    const G = groups[g], F = plan.filt[g]; if (!F) return;
    const lp = F.lp[i] ?? 20000, hp = F.hp[i] ?? 20;
    if (!jump && lp === G.lastLp && hp === G.lastHp) return;
    for (const c of [G.dry, G.rev, G.dly]) {
      for (const f of c.lp) { if (jump) f.frequency.setValueAtTime(lp, t); else f.frequency.setTargetAtTime(lp, t, 0.03); }
      for (const f of c.hp) { const v = Math.max(10, hp <= 21 ? 10 : hp); if (jump) f.frequency.setValueAtTime(v, t); else f.frequency.setTargetAtTime(v, t, 0.03); }
    }
    G.lastLp = lp; G.lastHp = hp;
  }
  // schedule beats [k0, k1): tOf(k) is the context time of beat k. fresh: the first window after a start or a seek.
  function schedule(k0, k1, tOf, {fresh = false, only = null} = {}) {
    if (!plan) return;
    const now = ctx.currentTime;
    if (fresh) {
      for (const g of Object.keys(groups)) setFilters(g, Math.max(0, Math.floor(k0 * 4)), Math.max(now, tOf(k0)), true);
      fade.gain.setValueAtTime(plan.gain[Math.max(0, Math.floor(k0 * 4))] ?? 1, Math.max(now, tOf(k0)));
      gate.gain.setValueAtTime(1, Math.max(now, tOf(k0)));
    }
    // automation per 16th
    for (let i = Math.max(0, Math.floor(k0 * 4)); i < Math.min(plan.beats * 4, Math.ceil(k1 * 4)); i++) {
      const t = tOf(i / 4); if (t < now - 0.01) continue;
      for (const g of Object.keys(groups)) setFilters(g, i, t, false);
      const gv = plan.gain[i], pv = i ? plan.gain[i - 1] : 1; if (gv !== pv) fade.gain.linearRampToValueAtTime(Math.max(0.0001, gv), t);
    }
    // gaps: the whole mix and the sends are silent
    for (const m of plan.mutes) if (m.k0 < k1 && m.k0 >= k0 - 1e-6) {
      const a = tOf(m.k0), b = tOf(m.k1); if (b < now) continue;
      gate.gain.setTargetAtTime(0, Math.max(now, a), 0.004); gate.gain.setTargetAtTime(1, Math.max(now, b - 0.002), 0.002);
      sendGate.gain.setTargetAtTime(0, Math.max(now, a), 0.004); sendGate.gain.setTargetAtTime(1, b, 0.01);
      dGate.gain.setTargetAtTime(0, Math.max(now, a), 0.004); dGate.gain.setTargetAtTime(1, b, 0.01);
    }
    for (const m of plan.tapes) if (m.k0 < k1 && m.k0 >= k0 - 1e-6) {
      const a = Math.max(now, tOf(m.k0)), b = tOf(m.k1), T = Math.max(0.05, b - a);
      tape.delayTime.cancelScheduledValues(a); tape.delayTime.setValueAtTime(0, a);
      tape.delayTime.setValueCurveAtTime(Float32Array.from({length: 128}, (_, i) => { const x = i / 127 * T; return Math.min(3.9, x * x / (2 * T) * 0.97); }), a, T);
      tape.delayTime.setValueAtTime(0, b + 0.002);
      tapeLP.frequency.setValueAtTime(20000, a); tapeLP.frequency.exponentialRampToValueAtTime(350, b); tapeLP.frequency.setValueAtTime(20000, b + 0.002);
      tapeGain.gain.setValueAtTime(1, a); tapeGain.gain.setValueAtTime(1, a + T * 0.7); tapeGain.gain.linearRampToValueAtTime(0.0001, b); tapeGain.gain.setValueAtTime(1, b + 0.003);
    }
    for (const m of plan.tails) if (m.k0 < k1 && m.k0 >= k0 - 1e-6) { const a = Math.max(now, tOf(m.k0)); revOut.gain.setTargetAtTime(1.8, a, 0.01); revOut.gain.setTargetAtTime(0.9, a + 1.5, 0.4); }
    // notes: on a fresh start, a held note that began before k0 sounds from k0
    if (fresh && (!only || only.notes !== false)) for (const ev of evNotes) {
      if (ev.k >= k0) break;
      const end = ev.k + ev.n.d; if (end <= k0 + 0.1) continue;
      const p = parts[ev.i]; if (!p || p.x.part.kind === 'drum' || (only && only.parts && !only.parts.has(p.x.id))) continue;
      playNote(p, Object.assign({}, ev.n, {d: end - k0}), Math.max(now, tOf(k0)));
    }
    if (!only || only.notes !== false) {
      for (let j = lower(evNotes, k0); j < evNotes.length && evNotes[j].k < k1; j++) {
        const ev = evNotes[j], p = parts[ev.i]; if (!p) continue;
        if (only && only.parts && !only.parts.has(p.x.id)) continue;
        const t = tOf(ev.k); if (t < now - 0.005) continue;
        playNote(p, ev.n, t);
        // the kick ducks the bass and the synths by the reference's depth for this bar
        if (p.x.role === 'kick' && !p.x.part.mute) {
          const b = Math.floor(ev.k / 4), d = plan.duck[b] || 0;
          if (d > 0.3) { const lo = Math.pow(10, -d / 20), rel = (plan.release[b] || spb * 380) / 1000; for (const g of ['bass', 'synths']) { const G = groups[g].duck.gain; G.setTargetAtTime(lo, t, 0.003); G.setTargetAtTime(1, t + 0.018, Math.max(0.02, rel / 3)); } }
        }
      }
    }
    if (!only || only.fx !== false) for (const f of plan.fx) {
      if (only && only.fxIds && !only.fxIds.has(f)) continue;
      if (f.k0 >= k0 - 1e-6 && f.k0 < k1) fxEvent(f, tOf(f.k0));
      else if (fresh && f.k0 < k0 && f.k1 > k0 + 0.1) fxEvent(f, tOf(k0), k0 - f.k0);
    }
  }
  function silence(t = ctx.currentTime) {
    for (const s of sources) if (s.stop > t) try { s.node.stop(t + 0.02); } catch (_) {}
    sources.length = 0;
    for (const p of parts) { p.voices = []; p.mono = null; }
    for (const g of Object.keys(groups)) { groups[g].duck.gain.cancelScheduledValues(t); groups[g].duck.gain.setValueAtTime(1, t); for (const c of [groups[g].dry, groups[g].rev, groups[g].dly]) for (const f of [...c.lp, ...c.hp]) f.frequency.cancelScheduledValues(t); groups[g].lastLp = -1; }
    for (const a of [fade.gain, gate.gain, sendGate.gain, dGate.gain, tapeGain.gain, tape.delayTime, tapeLP.frequency, revOut.gain]) a.cancelScheduledValues(t);
    tape.delayTime.setValueAtTime(0, t); tapeLP.frequency.setValueAtTime(20000, t); tapeGain.gain.setValueAtTime(1, t); gate.gain.setValueAtTime(1, t); sendGate.gain.setValueAtTime(1, t); dGate.gain.setValueAtTime(1, t); revOut.gain.setValueAtTime(0.9, t);
  }
  const prune = t => { for (let i = sources.length - 1; i >= 0; i--) if (sources[i].stop < t - 0.5) sources.splice(i, 1); };
  return {ctx, master, analyser, load, levels, prepare, schedule, silence, prune, get plan() { return plan; }, get spb() { return spb; }};
}

// ---------- the live player ----------
function player(ctx, eng) {
  let playing = false, t0 = 0, k0 = 0, cursor = 0, timer = null, loop = null, fresh = false, segs = [];
  const LOOK = 0.18, TICK = 0.035;
  const tOf = k => t0 + (k - k0) * eng.spb;
  function tick() {
    if (!playing) return;
    const now = ctx.currentTime, until = (now + LOOK - t0) / eng.spb + k0;
    while (cursor < until) {
      let end = Math.min(until, loop ? loop[1] : eng.plan.beats);
      if (end <= cursor) {
        if (loop) { t0 = tOf(loop[1]); k0 = loop[0]; cursor = loop[0]; fresh = true; segs.push({t0, k0}); continue; }
        stop(); api.onend && api.onend(); return;
      }
      eng.schedule(cursor, end, tOf, {fresh}); fresh = false; cursor = end;
      if (loop && cursor >= loop[1] - 1e-9) { t0 = tOf(loop[1]); k0 = loop[0]; cursor = loop[0]; fresh = true; segs.push({t0, k0}); }
    }
    eng.prune(now);
  }
  function play(from = 0) {
    if (playing) stop();
    eng.prepare(); playing = true; k0 = Math.max(0, from); cursor = k0; t0 = ctx.currentTime + 0.06; fresh = true; segs = [{t0, k0}];
    eng.master.gain.cancelScheduledValues(ctx.currentTime); eng.master.gain.setValueAtTime(0.86, ctx.currentTime);
    tick(); timer = setInterval(tick, TICK * 1000);
  }
  function stop() { playing = false; clearInterval(timer); timer = null; eng.silence(ctx.currentTime); }
  function beat() {
    if (!playing) return null;
    const now = ctx.currentTime; let s = segs[0];
    for (const x of segs) if (x.t0 <= now) s = x;
    if (segs.length > 4) segs = segs.filter(x => x === s || x.t0 > now);
    return Math.max(s.k0, (now - s.t0) / eng.spb + s.k0);
  }
  const api = {play, stop, beat, get playing() { return playing; }, setLoop(l) { loop = l && l[1] > l[0] ? l : null; }, get loop() { return loop; }, onend: null};
  return api;
}

// ---------- offline render ----------
// Renders beats [k0, k1) in chunks of 16 bars, each with 2 bars of warm-up, so a long track doesn't need one huge graph.
async function render(pl, {k0 = 0, k1 = pl.beats, sampleRate = 44100, only = null, tail = 2, kickHz = 50, prog = null, chunkBars = 16} = {}) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext, spb = 60 / pl.bpm;
  const total = Math.ceil(((k1 - k0) * spb + tail) * sampleRate), L = new Float32Array(total), R = new Float32Array(total);
  const step = chunkBars * 4, pre = 8;
  for (let a = k0; a < k1; a += step) {
    const b = Math.min(k1, a + step), warm = Math.min(pre, a), w = a - warm, last = b >= k1;
    const len = Math.ceil(((b - w) * spb + (last ? tail : 0.05)) * sampleRate);
    const ctx = new OAC(2, len, sampleRate), eng = create(ctx);
    eng.load(pl, {kickHz}); eng.prepare();
    eng.schedule(w, b, k => (k - w) * spb + 0.0, {fresh: true, only});
    const buf = await ctx.startRendering(), off = Math.round(warm * spb * sampleRate), dst = Math.round((a - k0) * spb * sampleRate);
    const cl = buf.getChannelData(0), cr = buf.getChannelData(1);
    for (let i = off; i < buf.length && dst + i - off < total; i++) { L[dst + i - off] = cl[i]; R[dst + i - off] = cr[i]; }
    prog && await prog((b - k0) / (k1 - k0));
  }
  return {L, R, sampleRate, length: total};
}
function wav({L, R, sampleRate}, {normalize = false} = {}) {
  let peak = 0; for (const c of [L, R]) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > peak) peak = a; }
  const g = normalize && peak > 0 ? 0.891 / peak : peak > 0.999 ? 0.999 / peak : 1, n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, clamp(Math.round(L[i] * g * 32767), -32768, 32767), true); v.setInt16(o + 2, clamp(Math.round(R[i] * g * 32767), -32768, 32767), true); }
  return new Uint8Array(buf);
}
function stats({L, R}) { let peak = 0, ss = 0, nonFinite = 0; for (const c of [L, R]) for (let i = 0; i < c.length; i++) { const x = c[i]; if (!Number.isFinite(x)) { nonFinite++; continue; } const a = Math.abs(x); if (a > peak) peak = a; ss += x * x; } return {peak, rms: Math.sqrt(ss / Math.max(1, L.length * 2)), nonFinite}; }
// a kick tuned to the key: the root nearest 52 Hz between 40 and 66 Hz
function kickFor(key) { if (!key || !Number.isFinite(key.pc)) return 50; let best = 50, d = 1e9; for (let o = -2; o <= 2; o++) { const f = 440 * Math.pow(2, (key.pc - 9) / 12 + o - 2); if (f >= 40 && f <= 66 && Math.abs(f - 52) < d) { d = Math.abs(f - 52); best = f; } } return best; }

return {create, player, render, wav, stats, kickFor, SOUNDS, SOUND, BASS, DRUM_VOICES, DRUM_NAME, ROLE_LEVEL};
})();
/* transplant-audio:end */
