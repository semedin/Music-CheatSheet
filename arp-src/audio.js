// Orbit audio: every sound synthesized with Web Audio. One engine per AudioContext (live or offline):
// the arp voice, bass, chord pad and drums, a sidechain duck, ping-pong delay, generated-impulse reverb,
// width, drive, a bus compressor and a limiter. The player loops a phrase with a look-ahead scheduler.
const OA = (() => {
  const curves = new Map();
  function driveCurve(k) {
    const key = Math.round(k * 100);
    if (curves.has(key)) return curves.get(key);
    const n = 2048, c = new Float32Array(n), a = 1 + k * 18;
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(a * x) / Math.tanh(a); }
    curves.set(key, c);
    return c;
  }
  function noiseBuffer(ctx) {
    if (ctx._orbitNoise) return ctx._orbitNoise;
    const len = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    return (ctx._orbitNoise = b);
  }
  // reverb impulse: stereo noise with an exponential decay, a few early reflections, and a tail that darkens
  function impulse(ctx, seconds, damp = 0.5) {
    const sr = ctx.sampleRate, len = Math.max(1, Math.floor(sr * seconds)), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let s = 987 + ch * 7919, lp = 0;
      for (let i = 0; i < len; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const n = (s / 4294967296) * 2 - 1, t = i / sr;
        const coef = 0.15 + 0.8 * Math.min(1, t / seconds) * damp;
        lp = lp + (n - lp) * (1 - coef);
        d[i] = lp * Math.exp(-6.9 * t / seconds);
      }
      for (const [ms, g] of [[7, 0.5], [13, 0.35], [23, 0.28], [31, 0.2], [43, 0.14]]) { const i = Math.floor((ms + ch * 2.5) * sr / 1000); if (i < len) d[i] += g * (ch ? -1 : 1); }
    }
    return b;
  }
  const waves = new Map();
  function wave(ctx, name) {
    const key = name;
    if (!ctx._orbitWaves) ctx._orbitWaves = new Map();
    if (ctx._orbitWaves.has(key)) return ctx._orbitWaves.get(key);
    const N = 64, re = new Float32Array(N), im = new Float32Array(N);
    if (name === 'organ') { for (const [h, a] of [[1, 1], [2, 0.75], [3, 0.5], [4, 0.32], [6, 0.18], [8, 0.12]]) im[h] = a; }
    else if (name === 'hollow') { for (let h = 1; h < N; h++) im[h] = (h % 2 ? 1 / h : 0) * (h === 1 ? 0.35 : 1) * Math.exp(-h / 40); }
    else if (name === 'pulse25') { for (let h = 1; h < N; h++) im[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * 0.25) * Math.exp(-h / 50); }
    else { im[1] = 1; }
    const w = ctx.createPeriodicWave(re, im, {disableNormalization: false});
    ctx._orbitWaves.set(key, w);
    return w;
  }

  function create(ctx, opts = {}) {
    const out = ctx.createGain(); out.gain.value = 0.9;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.06;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 2.5; comp.attack.value = 0.006; comp.release.value = 0.15;
    const master = ctx.createGain(); master.gain.value = 0.8;
    master.connect(comp); comp.connect(limiter); limiter.connect(out);
    const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.78;
    out.connect(analyser);
    if (opts.destination !== false) out.connect(ctx.destination);

    // ---- arp chain: voices → arpIn → high-pass → drive → width → duck → level → master + sends
    const arpIn = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.Q.value = 0.6;
    const drive = ctx.createWaveShaper(); drive.oversample = '2x';
    const driveIn = ctx.createGain(), driveOut = ctx.createGain(), dryPath = ctx.createGain();
    arpIn.connect(hp); hp.connect(driveIn); driveIn.connect(drive); drive.connect(driveOut);
    const preWidth = ctx.createGain(); driveOut.connect(preWidth);
    // width: two modulated short delays panned hard left and right, mixed under the dry signal
    const wetL = ctx.createDelay(0.05), wetR = ctx.createDelay(0.05);
    wetL.delayTime.value = 0.012; wetR.delayTime.value = 0.017;
    const lfo = ctx.createOscillator(), lfoL = ctx.createGain(), lfoR = ctx.createGain();
    lfo.frequency.value = 0.31; lfoL.gain.value = 0.0018; lfoR.gain.value = -0.0018;
    lfo.connect(lfoL); lfo.connect(lfoR); lfoL.connect(wetL.delayTime); lfoR.connect(wetR.delayTime); lfo.start();
    const panL = ctx.createStereoPanner(), panR = ctx.createStereoPanner(); panL.pan.value = -1; panR.pan.value = 1;
    const wetGain = ctx.createGain();
    preWidth.connect(wetL); preWidth.connect(wetR); wetL.connect(panL); wetR.connect(panR); panL.connect(wetGain); panR.connect(wetGain);
    const arpDuck = ctx.createGain(), arpLevel = ctx.createGain();
    preWidth.connect(arpDuck); wetGain.connect(arpDuck);
    arpDuck.connect(arpLevel); arpLevel.connect(master);
    const arpTap = ctx.createAnalyser(); arpTap.fftSize = 4096; arpTap.smoothingTimeConstant = 0.6; arpLevel.connect(arpTap);

    // ---- sends: ping-pong delay with filtered feedback, and the reverb
    const delaySend = ctx.createGain(), revSend = ctx.createGain();
    arpLevel.connect(delaySend); arpLevel.connect(revSend);
    const dL = ctx.createDelay(4), dR = ctx.createDelay(4), fb = ctx.createGain(), dHP = ctx.createBiquadFilter(), dLP = ctx.createBiquadFilter();
    dHP.type = 'highpass'; dHP.frequency.value = 280; dLP.type = 'lowpass'; dLP.frequency.value = 4800;
    const merge = ctx.createChannelMerger(2), delayOut = ctx.createGain();
    delaySend.connect(dHP); dHP.connect(dLP); dLP.connect(dL); dL.connect(dR); dR.connect(fb); fb.connect(dL);
    dL.connect(merge, 0, 0); dR.connect(merge, 0, 1); merge.connect(delayOut);
    const conv = ctx.createConvolver(), pre = ctx.createDelay(0.2), revOut = ctx.createGain(), revHP = ctx.createBiquadFilter();
    pre.delayTime.value = 0.018; revHP.type = 'highpass'; revHP.frequency.value = 220;
    revSend.connect(pre); pre.connect(revHP); revHP.connect(conv); conv.connect(revOut);
    delayOut.connect(revSend);
    const fxDuck = ctx.createGain();
    delayOut.connect(fxDuck); revOut.connect(fxDuck); fxDuck.connect(master);

    // ---- other buses
    const bassBus = ctx.createGain(), bassDuck = ctx.createGain(); bassBus.connect(bassDuck); bassDuck.connect(master);
    const padBus = ctx.createGain(), padDuck = ctx.createGain(), padRev = ctx.createGain(); padBus.connect(padDuck); padDuck.connect(master); padBus.connect(padRev); padRev.gain.value = 0.25; padRev.connect(revSend);
    const drumBus = ctx.createGain(); drumBus.connect(master);
    const drumRev = ctx.createGain(); drumRev.gain.value = 0.06; drumBus.connect(drumRev); drumRev.connect(revSend);

    let P = {}, revSize = -1, curSound = null, lastMono = null, spb = 0.5;
    const noise = noiseBuffer(ctx);

    function set(st, sound) {
      P = st;
      curSound = sound;
      spb = 60 / st.bpm;
      const now = ctx.currentTime;
      hp.frequency.setTargetAtTime(Math.max(20, st.hp || 20), now, 0.02);
      const dr = Math.min(1, (st.drive || 0) * 0.8 + (sound.drive || 0) * 0.6);
      drive.curve = driveCurve(dr);
      driveIn.gain.setTargetAtTime(1 + dr * 1.5, now, 0.02);
      driveOut.gain.setTargetAtTime(1 / (1 + dr * 1.8), now, 0.02);
      wetGain.gain.setTargetAtTime((st.width || 0) * 0.7, now, 0.03);
      const dt = (OE.DELAY_TIMES[st.delayTime] || 0.75) * spb;
      dL.delayTime.setTargetAtTime(Math.min(3.9, dt), now, 0.03);
      dR.delayTime.setTargetAtTime(Math.min(3.9, dt), now, 0.03);
      fb.gain.setTargetAtTime(Math.min(0.85, st.fb ?? 0.38), now, 0.03);
      delaySend.gain.setTargetAtTime((st.delay || 0) * 1.1, now, 0.03);
      revSend.gain.setTargetAtTime((st.reverb || 0) * 1.3, now, 0.03);
      revOut.gain.setTargetAtTime(0.9, now, 0.03);
      const size = Math.round((0.8 + (st.space ?? 0.5) * 4.2) * 10) / 10;
      if (size !== revSize) { conv.buffer = impulse(ctx, size, 0.6); revSize = size; }
      const mix = st.mix || {};
      arpLevel.gain.setTargetAtTime((mix.arp ?? 0.8) * (st.mute && st.mute.arp ? 0 : 1), now, 0.02);
      bassBus.gain.setTargetAtTime((mix.bass ?? 0.7) * (st.ctx && st.ctx.bass ? 1 : 0), now, 0.02);
      padBus.gain.setTargetAtTime((mix.chords ?? 0.45) * (st.ctx && st.ctx.chords ? 1 : 0), now, 0.02);
      drumBus.gain.setTargetAtTime((mix.drums ?? 0.7) * (st.ctx && st.ctx.drums ? 1 : 0), now, 0.02);
    }

    // sidechain: every bus but the drums dips at the kick and climbs back
    function duck(t) {
      const depth = P.duck ?? 0.45;
      if (depth <= 0.01) return;
      for (const [g, k] of [[arpDuck, 1], [bassDuck, 1.1], [padDuck, 1], [fxDuck, 0.6]]) {
        const lo = Math.max(0.02, 1 - depth * k * 0.85);
        g.gain.setTargetAtTime(lo, t, 0.004);
        g.gain.setTargetAtTime(1, t + 0.03, spb * 0.16);
      }
    }
    function sendAt(t, v) { revSend.gain.setTargetAtTime(Math.max(0, ((P.reverb || 0) + v) * 1.3), t, 0.05); }

    // ---- the arp voice
    function note(e, t, sound = curSound) {
      const s = sound, f = OT.hz(e.n), v = e.v / 127, m = e.mod || {cut: P.cut, res: P.res, dec: P.dec};
      const decMul = Math.pow(2, ((m.dec ?? 0.5) - 0.5) * 3);
      const dur = Math.max(0.012, e.d * spb);
      const A = s.amp, att = A.a, dec = A.d * decMul, sus = A.s, rel = A.r * Math.sqrt(decMul);
      const end = Math.max(t + dur, t + att + 0.006);
      const vg = ctx.createGain();
      const poly = e.poly || 1;
      const peak = s.level * (0.3 + 0.7 * v) / Math.sqrt(poly) * (poly > 1 ? 1.25 : 1);
      const legato = e.glideFrom != null && s.mono;
      vg.gain.setValueAtTime(legato ? peak * Math.max(sus, 0.5) : 0, t);
      if (!legato) vg.gain.linearRampToValueAtTime(peak, t + att);
      vg.gain.setTargetAtTime(peak * sus, t + att, Math.max(0.005, dec / 3));
      vg.gain.setTargetAtTime(0, end, Math.max(0.004, rel / 3));
      const stop = end + rel * 2.2 + 0.03;
      if (s.mono) { if (lastMono && lastMono.end > t) lastMono.g.gain.setTargetAtTime(0, t + 0.004, 0.006); lastMono = {g: vg, end: stop}; }
      // filter (or the formant bank)
      const F = s.filter, cutMul = Math.pow(2, ((m.cut ?? 0.5) - 0.5) * 5) * (e.acc ? 1.15 : 1);
      const base = Math.min(16000, Math.max(40, F.cut * cutMul * Math.pow(f / 261.6, F.kt || 0)));
      const peakF = Math.min(18000, base * Math.pow(2, F.env * (0.45 + 0.55 * v) * (e.acc ? 1.3 : 1)));
      const flt = ctx.createBiquadFilter(); flt.type = F.type;
      flt.Q.value = Math.max(0.3, F.q * Math.pow(2, ((m.res ?? 0.3) - 0.3) * 2.6));
      if (F.env) {
        flt.frequency.setValueAtTime(F.a ? base : peakF, t);
        if (F.a) flt.frequency.exponentialRampToValueAtTime(peakF, t + F.a);
        flt.frequency.setTargetAtTime(base + (peakF - base) * F.s, t + (F.a || 0), Math.max(0.005, F.d * decMul / 3));
      } else flt.frequency.setValueAtTime(base, t);
      let head = flt;
      if (s.formants) {
        const sum = ctx.createGain();
        for (const [ff, q, g] of s.formants) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; const bg = ctx.createGain(); bg.gain.value = g * 2.2; flt.connect(bp); bp.connect(bg); bg.connect(sum); }
        head = sum;
      }
      head.connect(vg);
      // tremolo
      if (s.trem) {
        const tl = ctx.createOscillator(), td = ctx.createGain(), tg = ctx.createGain();
        tl.frequency.value = s.trem.rate; td.gain.value = s.trem.depth; tg.gain.value = 1 - s.trem.depth;
        tl.connect(td); td.connect(tg.gain);
        vg.disconnect(); head.disconnect(); head.connect(tg); tg.connect(vg);
        tl.start(t); tl.stop(stop);
      }
      vg.connect(arpIn);
      // oscillators
      const startF = legato ? OT.hz(e.glideFrom) : f;
      const oscs = [];
      for (const o of s.osc) {
        const n = o.voices || 1, ff = f * Math.pow(2, (o.oct || 0) + (o.semi || 0) / 12), sf = startF * Math.pow(2, (o.oct || 0) + (o.semi || 0) / 12);
        const og = ctx.createGain(); og.gain.value = o.gain / Math.sqrt(n);
        og.connect(flt);
        for (let k = 0; k < n; k++) {
          const osc = ctx.createOscillator();
          if (['sine', 'square', 'sawtooth', 'triangle'].includes(o.wave)) osc.type = o.wave;
          else if (o.wave === 'saw') osc.type = 'sawtooth';
          else osc.setPeriodicWave(wave(ctx, o.wave));
          const pos = n > 1 ? (k / (n - 1)) * 2 - 1 : 0;
          osc.detune.value = pos * (o.spread || 0) * (0.6 + (P.width || 0) * 0.8) + (k ? (k * 37 % 7) - 3 : 0);
          if (s.pitch) { osc.frequency.setValueAtTime(sf * Math.pow(2, s.pitch.amt / 12), t); osc.frequency.setTargetAtTime(ff, t, s.pitch.decay / 2.5); }
          else if (legato) { osc.frequency.setValueAtTime(sf, t); osc.frequency.exponentialRampToValueAtTime(ff, t + (s.glide || 0.06)); }
          else osc.frequency.setValueAtTime(ff, t);
          if (s.vib) { const vl = ctx.createOscillator(), vd = ctx.createGain(); vl.frequency.value = s.vib.rate; vd.gain.value = s.vib.depth * 100; vl.connect(vd); vd.connect(osc.detune); vl.start(t + 0.08); vl.stop(stop); }
          let dest = og;
          if (n > 1) { const pan = ctx.createStereoPanner(); pan.pan.value = pos * Math.min(1, 0.3 + (P.width || 0)); pan.connect(og); dest = pan; }
          osc.connect(dest);
          if (s.fm) {
            const mo = ctx.createOscillator(), mg = ctx.createGain();
            mo.frequency.value = ff * s.fm.ratio;
            const idx = ff * s.fm.ratio * s.fm.index * (0.5 + 0.5 * v);
            mg.gain.setValueAtTime(idx, t);
            mg.gain.setTargetAtTime(idx * s.fm.sustain, t, Math.max(0.004, s.fm.decay * decMul / 2.5));
            mo.connect(mg); mg.connect(osc.frequency);
            mo.start(t); mo.stop(stop); oscs.push(mo);
          }
          osc.start(t); osc.stop(stop);
          oscs.push(osc);
        }
      }
      if (s.noise) {
        const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
        ns.buffer = noise; nf.type = 'highpass'; nf.frequency.value = s.noise.hp;
        ng.gain.setValueAtTime(s.noise.gain * (0.4 + 0.6 * v), t); ng.gain.setTargetAtTime(0, t, s.noise.decay / 2);
        ns.connect(nf); nf.connect(ng); ng.connect(vg);
        ns.start(t, (e.n * 0.0173) % 1.5); ns.stop(t + s.noise.decay * 6 + 0.01);
      }
      const last = oscs[oscs.length - 1];
      if (last) last.onended = () => { try { vg.disconnect(); flt.disconnect(); } catch (_) {} };
    }

    // ---- bass: saw + sub through a low-pass with a short envelope
    function bass(e, t) {
      const f = OT.hz(e.n), dur = Math.max(0.03, e.d * spb), v = e.v / 127;
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), og = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f; og.gain.value = 0.35;
      lp.type = 'lowpass'; lp.Q.value = 2.2;
      lp.frequency.setValueAtTime(220 * Math.pow(2, 1.7 * v), t); lp.frequency.setTargetAtTime(230, t, 0.05);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55 * (0.5 + 0.5 * v), t + 0.004);
      g.gain.setTargetAtTime(0.32, t + 0.004, 0.08); g.gain.setTargetAtTime(0, t + dur, 0.02);
      o1.connect(og); og.connect(lp); o2.connect(lp); lp.connect(g); g.connect(bassBus);
      const stop = t + dur + 0.12;
      o1.start(t); o2.start(t); o1.stop(stop); o2.stop(stop);
      o2.onended = () => { try { g.disconnect(); } catch (_) {} };
    }
    // ---- the chord pad: soft, slow, under everything
    function pad(e, t) {
      const f = OT.hz(e.n), dur = Math.max(0.1, e.d * spb);
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.5;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.08); g.gain.setTargetAtTime(0, t + dur, 0.12);
      for (const d of [-9, 9]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.7); }
      lp.connect(g); g.connect(padBus);
    }
    // ---- drums
    function drum(e, t) {
      const v = e.v / 127;
      const nz = (dec, type, freq, q, gain, delay = 0, len = dec * 6) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
        g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(gain, t + delay + 0.0015); g.gain.setTargetAtTime(0, t + delay + 0.002, dec / 3);
        s.connect(f); f.connect(g); g.connect(drumBus); s.start(t + delay, (t * 7.31) % 1.5); s.stop(t + delay + len + 0.02);
      };
      switch (e.lane) {
        case 'k': {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.07); o.frequency.exponentialRampToValueAtTime(44, t + 0.3);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.05 * v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.06, 0.09);
          o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.6);
          nz(0.006, 'highpass', 2500, 0.7, 0.35 * v);
          duck(t);
          break;
        }
        case 'c': for (const [dl, gg] of [[0, 0.5], [0.011, 0.45], [0.022, 0.6]]) nz(dl === 0.022 ? 0.16 : 0.008, 'bandpass', 1150, 1.1, gg * v, dl); break;
        case 'h': nz(0.035, 'highpass', 8200, 0.8, 0.22 * v); break;
        case 'o': nz(0.2, 'highpass', 7600, 0.8, 0.17 * v); break;
        case 's': nz(0.045, 'bandpass', 6500, 1.6, 0.2 * v); break;
        case 'r': { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 1700; g.gain.setValueAtTime(0.22 * v, t); g.gain.setTargetAtTime(0, t, 0.012); o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.1); nz(0.005, 'highpass', 3000, 1, 0.15 * v); break; }
        case 't': { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(205, t + 0.08); g.gain.setValueAtTime(0.4 * v, t); g.gain.setTargetAtTime(0, t + 0.01, 0.07); o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.5); break; }
        case 'b': { for (const fr of [540, 800]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = fr; g.gain.setValueAtTime(0.05 * v, t); g.gain.setTargetAtTime(0, t, 0.04); o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.3); } break; }
      }
    }
    return {ctx, set, note, bass, pad, drum, duck, sendAt, analyser, arpTap, out, get spb() { return spb; }};
  }

  // ---- the phrase as one loop: arp events plus context parts, all in beats
  function phrase(st, R) {
    const bars = R.bars;
    const poly = new Map();
    for (const e of R.events) { const k = Math.round(e.t * 1e4); poly.set(k, (poly.get(k) || 0) + 1); }
    const arp = R.events.map(e => Object.assign({}, e, {poly: e.kind === 'chord' ? poly.get(Math.round(e.t * 1e4)) : 1}));
    return {
      st, beats: bars * 4, bars,
      arp, bass: OE.renderBass(st, R.harmony, bars), drums: OE.renderDrums(st, bars), chords: OE.renderChords(st, R.harmony, bars),
    };
  }

  // ---- the live player: a look-ahead scheduler over a looping phrase
  function player(ctx, engine) {
    let ph = null, playing = false, timer = null, anchorTime = 0, anchorBeat = 0, cursor = 0, spb = 0.5;
    const AHEAD = 0.14;
    const flashes = [];
    let lastSend = null;
    const beatAt = time => anchorBeat + (time - anchorTime) / spb;
    const timeAt = beat => anchorTime + (beat - anchorBeat) * spb;
    const lower = (arr, t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (arr[m].t < t - 1e-9) a = m + 1; else b = m; } return a; };
    function scheduleRange(b0, b1) {
      const L = ph.beats;
      let b = b0;
      while (b < b1 - 1e-9) {
        const iter = Math.floor(b / L + 1e-9), off = iter * L, end = Math.min(b1, off + L);
        const p0 = b - off, p1 = end - off;
        const sound = OB.SOUNDS_BY_ID[ph.st.sound];
        for (const [list, fn] of [[ph.arp, 'note'], [ph.bass, 'bass'], [ph.drums, 'drum'], [ph.chords, 'pad']]) {
          if (fn === 'bass' && !ph.st.ctx.bass) continue;
          if (fn === 'pad' && !ph.st.ctx.chords) continue;
          if (fn === 'drum' && !ph.st.ctx.drums && !ph.st.ctx.kickOnly) continue;
          for (let i = lower(list, p0); i < list.length && list[i].t < p1 - 1e-9; i++) {
            const e = list[i], when = Math.max(ctx.currentTime + 0.002, timeAt(off + e.t));
            if (fn === 'note') {
              if (ph.st.mute && ph.st.mute.arp) continue;
              engine.note(e, when, sound);
              flashes.push({time: when, e, abs: off + e.t});
              if (e.mod && Math.abs((e.mod.send || 0) - (lastSend ?? -9)) > 0.02) { engine.sendAt(when, e.mod.send || 0); lastSend = e.mod.send || 0; }
            } else engine[fn](e, when);
          }
        }
        b = end;
      }
    }
    function tick() {
      if (!playing || !ph) return;
      const until = beatAt(ctx.currentTime + AHEAD);
      if (until > cursor) { scheduleRange(cursor, until); cursor = until; }
      while (flashes.length > 512) flashes.shift();
    }
    return {
      get playing() { return playing; },
      get phrase() { return ph; },
      flashes,
      load(p) {
        const prevBpm = ph ? ph.st.bpm : null;
        if (playing && prevBpm && prevBpm !== p.st.bpm) { const now = ctx.currentTime, b = beatAt(now); anchorTime = now; anchorBeat = b; }
        ph = p; spb = 60 / p.st.bpm; engine.set(p.st, OB.SOUNDS_BY_ID[p.st.sound]);
        if (playing) { const now = beatAt(ctx.currentTime); cursor = Math.max(now, cursor - 0); }
      },
      start(atBeat = 0) {
        if (!ph) return;
        playing = true; spb = 60 / ph.st.bpm;
        anchorTime = ctx.currentTime + 0.06; anchorBeat = atBeat; cursor = atBeat; lastSend = null;
        clearInterval(timer); timer = setInterval(tick, 25); tick();
      },
      stop() { playing = false; clearInterval(timer); flashes.length = 0; },
      beat() { return playing ? beatAt(ctx.currentTime) : null; },
      // jump to the start of the next bar (for A/B switching in time)
      nextBar() { const b = beatAt(ctx.currentTime); return Math.ceil(b / 4) * 4; },
    };
  }

  // ---- offline render to WAV
  async function render(st, R, {loops = 1, tail = 2.5, solo = false, sampleRate = 44100} = {}) {
    const ph = phrase(st, R);
    const spb = 60 / st.bpm, dur = loops * ph.beats * spb + tail;
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
    const eng = create(ctx);
    const s2 = Object.assign({}, st, {ctx: solo ? {drums: false, bass: false, chords: false} : st.ctx});
    eng.set(s2, OB.SOUNDS_BY_ID[st.sound]);
    const t0 = 0.02;
    for (let l = 0; l < loops; l++) {
      const off = l * ph.beats;
      for (const e of ph.arp) { eng.note(e, t0 + (off + e.t) * spb); if (e.mod) eng.sendAt(t0 + (off + e.t) * spb, e.mod.send || 0); }
      if (!solo) {
        if (st.ctx.bass) for (const e of ph.bass) eng.bass(e, t0 + (off + e.t) * spb);
        if (st.ctx.chords) for (const e of ph.chords) eng.pad(e, t0 + (off + e.t) * spb);
        if (st.ctx.drums) for (const e of ph.drums) eng.drum(e, t0 + (off + e.t) * spb);
      } else if ((st.duck || 0) > 0.01) for (const e of ph.drums) if (e.lane === 'k') eng.duck(t0 + (off + e.t) * spb);
    }
    const buf = await ctx.startRendering();
    return buf;
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, sr, true);
    data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, len * ch * 2, true);
    const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, x < 0 ? x * 32768 : x * 32767, true); o += 2; }
    return new Uint8Array(data.buffer);
  }
  // how much of the arp's own energy sits under a frequency, measured on the arp bus
  function lowShare(analyser, hz = 165) {
    const n = analyser.frequencyBinCount, d = new Float32Array(n);
    analyser.getFloatFrequencyData(d);
    const bin = Math.round(hz / (analyser.context.sampleRate / 2) * n);
    let lo = 0, all = 0;
    for (let i = 1; i < n; i++) { const p = Math.pow(10, d[i] / 10); all += p; if (i <= bin) lo += p; }
    return all > 1e-12 ? {share: lo / all, db: 10 * Math.log10(Math.max(1e-12, lo / all))} : null;
  }

  return {create, phrase, player, render, wav, lowShare};
})();
