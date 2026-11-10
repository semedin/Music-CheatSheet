// Wow audio: one mono bass voice with a mouth, a drum machine, a kick-reverb rumble,
// a bar-synced player and an offline renderer. Works on AudioContext and OfflineAudioContext.
const WowAudio = (() => {
  const W = WOW, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function curve(amount) {
    const n = 2048, c = new Float32Array(n), k = 1 + amount * 9, norm = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
    return c;
  }
  function shaper(ctx, amount) { const s = ctx.createWaveShaper(); s.curve = curve(amount); s.oversample = '2x'; return s; }
  function noise(ctx, secs, seed) {
    const r = W.rng(seed), b = ctx.createBuffer(1, Math.round(secs * ctx.sampleRate), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    return b;
  }
  function impulse(ctx) {
    const secs = 1.3, n = Math.round(secs * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const r = W.rng(77 + ch), d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { lp += ((r() * 2 - 1) - lp) * .12; d[i] = lp * Math.pow(1 - i / n, 2.2) * 3; } }
    return b;
  }
  const gain = (ctx, v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const biquad = (ctx, type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };

  // ------------------------------------------------------------ bass voice
  function bass(ctx, sound, dest, knobs) {
    const mix = gain(ctx, 1), pre = gain(ctx, 1), shape = shaper(ctx, .55), lp1 = biquad(ctx, 'lowpass', sound.cut, sound.res), lp2 = biquad(ctx, 'lowpass', sound.cut, .5);
    const dry = gain(ctx, 1), amp = gain(ctx, 0), hp = biquad(ctx, 'highpass', sound.hp, .7), post = gain(ctx, sound.level * .3);
    const oscs = sound.osc.map(o => {
      const osc = ctx.createOscillator(), g = gain(ctx, o.g); osc.type = o.w; osc.detune.value = o.det || 0; osc.frequency.value = 55;
      osc.connect(g).connect(mix); osc.start();
      return {osc, ratio: Math.pow(2, o.oct + (o.semi || 0) / 12)};
    });
    let mod = null, modGain = null;
    if (sound.fm) { mod = ctx.createOscillator(); modGain = gain(ctx, 0); mod.connect(modGain); for (const o of oscs) modGain.connect(o.osc.frequency); mod.start(); }
    mix.connect(pre).connect(shape); shape.connect(lp1).connect(lp2).connect(dry).connect(amp);
    const bps = [], vg = gain(ctx, 0);
    if (sound.vowel) [1, .6, .25].forEach((g, j) => { const bp = biquad(ctx, 'bandpass', W.VOWELS[sound.rest][j], 8), fg = gain(ctx, g); shape.connect(bp).connect(fg).connect(vg); bps.push(bp); });
    vg.connect(amp); amp.connect(hp).connect(post).connect(dest);
    // Space: a short stereo spread above 300 Hz, and a dotted-8th echo. The low end stays mono and dry.
    const widthGain = gain(ctx, 0), echoSend = gain(ctx, 0), echo = ctx.createDelay(1.5);
    if (sound.width || sound.echo) {
      const top = biquad(ctx, 'highpass', 300, .7); post.connect(top);
      [[.011, -.85], [.017, .85]].forEach(([d, pan]) => { const dl = ctx.createDelay(.05), pn = ctx.createStereoPanner(); dl.delayTime.value = d; pn.pan.value = pan; top.connect(dl).connect(pn).connect(widthGain); });
      widthGain.connect(dest);
      const fb = gain(ctx, .42), tone = biquad(ctx, 'bandpass', 1200, .5), pn = ctx.createStereoPanner(); pn.pan.value = .3;
      top.connect(echoSend).connect(echo).connect(tone).connect(fb).connect(echo); tone.connect(pn).connect(dest);
    }
    const sub = ctx.createOscillator(), subAmp = gain(ctx, 0), subGain = gain(ctx, 0); sub.type = 'sine'; sub.frequency.value = 55; sub.connect(subAmp).connect(subGain).connect(dest); sub.start();
    let lastF = 0, lastCut = sound.cut;
    const applyKnobs = t => {
      const kw = knobs.wow / 70, v = clamp(sound.vowel * Math.min(kw, 1.4), 0, .9);
      dry.gain.setTargetAtTime(1 - v * .7, t, .02); vg.gain.setTargetAtTime(v * 7, t, .02);
      subGain.gain.setTargetAtTime(sound.sub * knobs.sub / 70 * sound.level * .5, t, .02);
      const sp = (knobs.space == null ? 100 : knobs.space) / 100;
      widthGain.gain.setTargetAtTime(Math.min(1.2, sound.width * sp) * .7, t, .02); echoSend.gain.setTargetAtTime(Math.min(.9, sound.echo * sp), t, .02);
    };
    applyKnobs(0);
    const base = m => clamp(sound.cut * m.cut * Math.pow(2, (knobs.tone - 50) / 50 * 1.3), 50, 12000);
    // t: start, dur: gate in seconds, n: engine note, m: the bar's settings, step: one 16th in seconds
    function play(t, dur, midi, n, m, step) {
      const f = W.hz(midi), slide = n.slide && lastF > 0, vel = n.vel, glide = Math.min(sound.glide, dur * .8);
      const pe = sound.pitchEnv;
      const pitch = (p, target, from) => {
        if (slide) { p.setValueAtTime(from, t); p.exponentialRampToValueAtTime(target, t + glide); }
        else if (pe) { p.setValueAtTime(target * Math.pow(2, pe.semi * (.6 + .4 * vel) / 12), t); p.exponentialRampToValueAtTime(target, t + Math.min(pe.t, dur * .8)); }
        else p.setValueAtTime(target, t);
      };
      for (const o of oscs) pitch(o.osc.frequency, f * o.ratio, lastF * o.ratio);
      pitch(sub.frequency, f, lastF);
      if (mod) {
        const fc = f * oscs[0].ratio;
        mod.frequency.setValueAtTime(fc * sound.fm.ratio, t);
        modGain.gain.setValueAtTime(fc * sound.fm.amt * (.6 + .4 * vel), t); modGain.gain.exponentialRampToValueAtTime(Math.max(.01, fc * sound.fm.amt * .02), t + Math.min(sound.fm.dec, dur));
      }
      pre.gain.setValueAtTime(.35 + sound.drive * knobs.drive / 50 * m.drive * 1.6, t);
      // amplitude
      const rel = Math.min(sound.rel, dur * .3), atk = Math.min(sound.atk, dur * .2), end = t + dur;
      const env = (g, level) => {
        let hold = level;
        if (slide) g.linearRampToValueAtTime(level, t + glide);
        else {
          g.setValueAtTime(0, t); g.linearRampToValueAtTime(level, t + atk);
          if (sound.pluck) { hold = level * (1 - sound.pluck); g.linearRampToValueAtTime(hold, Math.max(t + atk + .001, Math.min(end - rel, t + atk + .16))); }
        }
        if (!n.legato) { g.setValueAtTime(hold, end - rel); g.linearRampToValueAtTime(0, end); }
      };
      const talking = n.wow && knobs.wow > 0 && m.wow > 0;
      env(amp.gain, talking ? vel * (1 + .35 * Math.min(1, knobs.wow / 70)) : vel);
      lp1.Q.setValueAtTime(talking ? sound.res + 6 * Math.min(1.4, knobs.wow / 70) : sound.res, t);
      if (m.sub > 0) env(subAmp.gain, m.sub * (.75 + .25 * vel)); else subAmp.gain.setValueAtTime(0, t);
      // the filter, and the mouth
      const b = base(m), kw = knobs.wow / 70 * m.wow, wow = n.wow && kw > 0, set = (when, v, ramp) => { v = clamp(v, 40, 15000); for (const l of [lp1, lp2]) ramp ? l.frequency.exponentialRampToValueAtTime(v, when) : l.frequency.setValueAtTime(v, when); lastCut = v; };
      if (wow) { set(t, b * .7); set(t + dur * .45, b * Math.pow(2, sound.wowDepth * Math.min(kw, 1.7)), true); set(end, b * .8, true); }
      else if (sound.lfo && dur > step * 1.5 && knobs.wow > 0) {
        const period = sound.lfo.rate * step, depth = sound.lfo.depth * Math.min(knobs.wow / 70, 1.6);
        for (let c = t; c < end - .01; c += period) { set(c, b * .8); set(Math.min(end, c + period / 2), b * Math.pow(2, depth), true); set(Math.min(end, c + period), b * .8, true); }
      }
      else if (slide) { set(t, lastCut); set(t + glide, b, true); }
      else { set(t, b * Math.pow(2, sound.env * (vel >= 1 ? 1.4 : 1))); set(t + Math.min(sound.dec, dur), b, true); }
      if (bps.length) {
        const path = wow ? sound.word : [sound.rest];
        bps.forEach((bp, j) => { bp.frequency.setValueAtTime(W.VOWELS[path[0]][j], t); for (let k = 1; k < path.length; k++) bp.frequency.linearRampToValueAtTime(W.VOWELS[path[k]][j], t + dur * k / (path.length - 1)); });
      }
      lastF = f;
    }
    // A held note crossing into a new bar follows that bar's filter setting.
    function tie(t, dur, m) {
      const b = base(m);
      for (const l of [lp1, lp2]) { l.frequency.setValueAtTime(lastCut, t); l.frequency.exponentialRampToValueAtTime(b, t + dur * .95); }
      lastCut = b;
    }
    const tempo = (bpm, t) => { echo.delayTime.setTargetAtTime(Math.min(1.4, 60 / bpm * .75), t, .05); };
    return {play, tie, applyKnobs, tempo};
  }

  // ------------------------------------------------------------------- rig
  function rig(ctx, style, knobs) {
    const sound = style.sound, kit = style.kit;
    const sum = gain(ctx, 1), comp = ctx.createDynamicsCompressor(), makeup = gain(ctx, .78), clip = shaper(ctx, .03), master = gain(ctx, knobs.raw ? 1 : .9);
    comp.threshold.value = -15; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = .012; comp.release.value = .14;
    if (knobs.raw) sum.connect(master).connect(ctx.destination); else sum.connect(comp).connect(makeup).connect(clip).connect(master).connect(ctx.destination);
    const analyser = ctx.createAnalyser ? ctx.createAnalyser() : null;
    if (analyser) { analyser.fftSize = 2048; clip.connect(analyser); }
    const drumBus = gain(ctx, 1), duck = gain(ctx, 1), bassBus = gain(ctx, 1);
    drumBus.connect(sum); duck.connect(bassBus).connect(sum);
    const kickBus = gain(ctx, .95);
    if (kit.kdrive) kickBus.connect(shaper(ctx, kit.kdrive)).connect(gain(ctx, .8)).connect(drumBus); else kickBus.connect(drumBus);
    let rumbleDuck = null;
    if (sound.rumble) {
      const send = gain(ctx, sound.rumble), conv = ctx.createConvolver(), lp = biquad(ctx, 'lowpass', 105, 1.2), sh = shaper(ctx, .6), level = gain(ctx, .1);
      conv.buffer = impulse(ctx); rumbleDuck = gain(ctx, 1);
      kickBus.connect(send).connect(conv).connect(lp).connect(sh).connect(rumbleDuck).connect(level).connect(bassBus);
    }
    const voice = bass(ctx, sound, duck, knobs), nz = noise(ctx, 2, 5);
    const burst = (t, len) => { const s = ctx.createBufferSource(); s.buffer = nz; s.start(t, (t * 7.13) % 1.5, len + .05); return s; };
    const hits = {
      kick(t, vel) {
        const o = ctx.createOscillator(), g = gain(ctx, 0), f = kit.kick, len = kit.kd + .1;
        o.frequency.setValueAtTime(f * 5, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + .022); o.frequency.exponentialRampToValueAtTime(f, t + .1);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .002); g.gain.setValueAtTime(vel, t + .035); g.gain.exponentialRampToValueAtTime(.001, t + len);
        o.connect(g).connect(kickBus); o.start(t); o.stop(t + len + .02);
        const c = burst(t, .01), cg = gain(ctx, 0); cg.gain.setValueAtTime(.22 * vel, t); cg.gain.exponentialRampToValueAtTime(.001, t + .012); c.connect(biquad(ctx, 'highpass', 2500)).connect(cg).connect(drumBus);
      },
      clap(t, vel) {
        const s = burst(t, .25), g = gain(ctx, 0), v = vel * .5;
        for (const d of [0, .011, .023]) { g.gain.setValueAtTime(v, t + d); g.gain.exponentialRampToValueAtTime(v * .2, t + d + .009); }
        g.gain.setValueAtTime(v * .8, t + .032); g.gain.exponentialRampToValueAtTime(.001, t + .21);
        s.connect(biquad(ctx, 'bandpass', 1350, .9)).connect(biquad(ctx, 'highpass', 700)).connect(g).connect(drumBus);
      },
      noiseHit(t, vel, hpf, dec, level, bp) {
        const s = burst(t, dec), g = gain(ctx, 0); g.gain.setValueAtTime(vel * level, t); g.gain.exponentialRampToValueAtTime(.001, t + dec);
        let n = s.connect(biquad(ctx, 'highpass', hpf)); if (bp) n = n.connect(biquad(ctx, 'bandpass', bp, 1.2)); n.connect(g).connect(drumBus);
      },
      ch(t, vel) { hits.noiseHit(t, vel, 8200, .04, .34); },
      oh(t, vel) { hits.noiseHit(t, vel, 7000, .17, .26); },
      ride(t, vel) { hits.noiseHit(t, vel, 5200, .3, .2, 7200); },
      perc(t, vel) {
        const o = ctx.createOscillator(), g = gain(ctx, 0); o.type = 'triangle'; o.frequency.setValueAtTime(680, t); o.frequency.exponentialRampToValueAtTime(430, t + .05);
        g.gain.setValueAtTime(vel * .3, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); o.connect(g).connect(drumBus); o.start(t); o.stop(t + .09);
      },
      snare(t, vel) {
        hits.noiseHit(t, vel, 900, .09, .4, 2100);
        const o = ctx.createOscillator(), g = gain(ctx, 0); o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(170, t + .05);
        g.gain.setValueAtTime(vel * .3, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); o.connect(g).connect(drumBus); o.start(t); o.stop(t + .09);
      },
    };
    function hit(type, t, vel, beat) {
      hits[type](t, vel);
      if (type !== 'kick') return;
      // Sidechain: the bass ducks under every kick and swells back.
      const tau = kit.rel * beat * .28, at = Math.max(0, t - .006), depth = Math.min(.98, kit.duck * (knobs.pump == null ? 100 : knobs.pump) / 100);
      duck.gain.setTargetAtTime(1 - depth, at, .002); duck.gain.setTargetAtTime(1, t + .03, tau);
      if (rumbleDuck) { rumbleDuck.gain.setTargetAtTime(.02, at, .002); rumbleDuck.gain.setTargetAtTime(1, t + .05, beat * .2); }
    }
    const setKnobs = () => { voice.applyKnobs(ctx.currentTime); drumBus.gain.setTargetAtTime(knobs.drums / 80 * .78, ctx.currentTime, .02); };
    drumBus.gain.value = knobs.drums / 80 * .78;
    return {ctx, style, key: style.rigKey || style.id, knobs, voice, hit, analyser, setKnobs, stop(t) { master.gain.setTargetAtTime(0, t, .012); setTimeout(() => { try { master.disconnect(); } catch {} }, 400); }};
  }

  // One beat (q = 0..3) of one engine bar, starting from the bar's start time t0.
  function scheduleBeat(r, bar, q, t0, bpm, root) {
    const style = r.style, step = 60 / bpm / 4, beat = step * 4, k = r.knobs, swing = k.swing == null ? style.swing : k.swing / 100, gate = (k.gate == null ? 100 : k.gate) / 100;
    const time = s => t0 + (s + (Math.floor(s) % 2 === 1 ? swing : 0)) * step;
    if (q === 0) r.voice.tempo(bpm, t0);
    if (q === 0) for (const t of bar.ties) if (!(t.wow && bar.m.wow > 0)) r.voice.tie(t0, t.l * step, bar.m);
    for (const n of bar.notes) {
      if (Math.floor(n.s / 4) !== q) continue;
      const a = time(n.s), b = n.short ? a + step * .5 : time(n.s + n.l);
      r.voice.play(a, (b - a) * (n.legato ? 1 : .92 * gate), root + n.semi, n, bar.m, step);
    }
    for (const h of W.drumBar(style, bar)) if (Math.floor(h.s / 4) === q) r.hit(h.type, time(h.s), h.vel, beat);
  }

  // ---------------------------------------------------------------- player
  // program(): {bars, loop} is asked for at every beat, so a change of lane or section lands on the next beat.
  function player(getState, program) {
    const P = {playing: false, ctx: null, rig: null, pos: 0, q: 0, t0: 0, queue: [], timer: null, onbar: null};
    function tick() {
      if (!P.playing) return;
      const st = getState();
      while (true) {
        const step = 60 / st.bpm / 4, tb = P.t0 + P.q * 4 * step;
        if (tb > P.ctx.currentTime + .14) break;
        if (P.q === 0) {
          const prog = program();
          if (P.pos >= prog.bars.length) P.pos = prog.loop ? P.pos % prog.bars.length : 0;
          P.queue.push({t: P.t0, dur: 16 * step, pos: P.pos});
          if (P.queue.length > 6) P.queue.shift();
        }
        P.bars = program().bars;
        if (P.rig.key !== (st.style.rigKey || st.style.id)) { P.rig.stop(tb); P.rig = rig(P.ctx, st.style, st.knobs); }
        scheduleBeat(P.rig, P.bars[P.pos % P.bars.length], P.q, P.t0, st.bpm, st.root);
        if (++P.q === 4) { P.q = 0; P.t0 += 16 * step; P.pos = P.next != null ? P.next : P.pos + 1; P.next = null; }
      }
    }
    P.start = from => {
      if (P.playing) P.stop();
      P.ctx = P.ctx || new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
      P.ctx.resume();
      const st = getState();
      P.rig = rig(P.ctx, st.style, st.knobs); P.pos = from || 0; P.q = 0; P.next = null; P.t0 = P.ctx.currentTime + .08; P.queue = []; P.playing = true;
      tick(); P.timer = setInterval(tick, 25);
    };
    P.stop = () => { if (!P.playing) return; P.playing = false; clearInterval(P.timer); P.rig.stop(P.ctx.currentTime); P.rig = null; P.queue = []; };
    // Jump at the next bar line.
    P.seek = pos => { if (P.q === 0) P.pos = pos; else P.next = pos; };
    // Where the listener is now: {pos, frac} of the bar being heard.
    P.now = () => {
      if (!P.playing) return null;
      const t = P.ctx.currentTime; let cur = null;
      for (const b of P.queue) if (b.t <= t) cur = b;
      return cur ? {pos: cur.pos, frac: clamp((t - cur.t) / cur.dur, 0, 1)} : null;
    };
    P.knobs = () => P.rig && P.rig.setKnobs();
    return P;
  }

  // ---------------------------------------------------------------- render
  async function render(style, bars, {bpm, root, knobs, sampleRate = 44100}) {
    const step = 60 / bpm / 4, len = bars.length * 16 * step;
    const ctx = new OfflineAudioContext(2, Math.round(len * sampleRate), sampleRate), r = rig(ctx, style, knobs);
    bars.forEach((bar, i) => { for (let q = 0; q < 4; q++) scheduleBeat(r, bar, q, i * 16 * step, bpm, root); });
    return ctx.startRendering();
  }
  return {rig, scheduleBeat, player, render, curve};
})();
