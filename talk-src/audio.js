// Talk audio: the formant bass, a tech house floor, the vocal player, mic capture and offline rendering.
const TA = (() => {
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  let live = null;

  const noiseCache = new WeakMap();
  function noise(ctx) {
    if (!noiseCache.has(ctx)) {
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
      let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
      noiseCache.set(ctx, b);
    }
    return noiseCache.get(ctx);
  }
  const curveCache = new Map();
  function curve(k) {
    k = Math.round(k * 10) / 10;
    if (!curveCache.has(k)) { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } curveCache.set(k, c); }
    return curveCache.get(k);
  }
  function impulse(ctx, secs = 1.4) {
    const len = Math.round(secs * ctx.sampleRate), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let s = 11 + c * 97; for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 1073741823.5 - 1) * Math.pow(1 - i / len, 3) * (i < 30 ? 0 : 1); } }
    return b;
  }

  // ---------------------------------------------------------------- the mix graph
  function graph(ctx, dest) {
    const master = ctx.createGain(); master.gain.value = .7;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .15; comp.knee.value = 6;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .06; lim.knee.value = 0;
    const out = ctx.createGain(); out.gain.value = .92;
    master.connect(comp); comp.connect(lim); lim.connect(out); out.connect(dest);
    const bass = ctx.createGain(), pump = ctx.createGain(), drums = ctx.createGain(), vocal = ctx.createGain();
    bass.connect(pump); pump.connect(master); drums.connect(master);
    const vhp = ctx.createBiquadFilter(); vhp.type = 'highpass'; vhp.frequency.value = 130;
    const vcomp = ctx.createDynamicsCompressor(); vcomp.threshold.value = -20; vcomp.ratio.value = 3;
    vocal.connect(vhp); vhp.connect(vcomp); vcomp.connect(master);
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx); const send = ctx.createGain(); send.gain.value = .18;
    vcomp.connect(send); send.connect(verb); verb.connect(master);
    bass.gain.value = .8; drums.gain.value = .46; vocal.gain.value = 1;
    return {master, bass, pump, drums, vocal, nodes: [master, comp, lim, out, bass, pump, drums, vocal, vhp, vcomp, verb, send]};
  }

  // ---------------------------------------------------------------- the talking bass
  function bassNote(ctx, out, x, t0, spb, p) {
    const dur = Math.max(.04, x.d * spb), end = t0 + dur, f = hz(x.n), glide = Math.max(.01, x.glide * spb);
    const vs = (TK.SHAPES[x.shape] || TK.SHAPES.oo).v.map(v => TK.VOWELS[v]);
    const level = (x.v / 127) * (x.ghost ? .55 : 1);
    const amp = ctx.createGain(); amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(level, t0 + .004); amp.gain.setTargetAtTime(level * .78, t0 + .01, .06);
    amp.gain.setValueAtTime(level * .78, end); amp.gain.linearRampToValueAtTime(0, end + .03);
    amp.connect(out);
    const pitch = (param, mult) => {
      if (x.bend) { param.setValueAtTime(f * mult * Math.pow(2, x.bend / 12), t0); param.exponentialRampToValueAtTime(f * mult, t0 + glide); }
      else param.setValueAtTime(f * mult, t0);
    };
    // character: two detuned saws and a square an octave down, driven, then through the mouth
    const pre = ctx.createGain(); pre.gain.value = .5;
    const oscs = [['sawtooth', -8, 1], ['sawtooth', 8, 1], ['square', 0, .5]].map(([type, cents, mult]) => {
      const o = ctx.createOscillator(); o.type = type; o.detune.value = cents; pitch(o.frequency, mult);
      const g = ctx.createGain(); g.gain.value = type === 'square' ? .35 : .45; o.connect(g); g.connect(pre); o.start(t0); o.stop(end + .06); return o;
    });
    const shaper = ctx.createWaveShaper(); shaper.curve = curve(1 + p.drive * 5); shaper.oversample = '2x';
    pre.connect(shaper);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95; hp.Q.value = .6;
    const char = ctx.createGain(); char.gain.value = .55; char.connect(hp); hp.connect(amp);
    // the mouth: a low-pass that follows the second formant (closed vowels are dark), then three resonant peaks
    const mouth = x.mouth, boost = 4 + 14 * mouth;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .9;
    const lpF = v => Math.min(9000, Math.max(700, v.f[1] * (1.25 + mouth)));
    lp.frequency.setValueAtTime(lpF(vs[0]), t0);
    shaper.connect(lp);
    let node = lp;
    const peaks = [0, 1, 2].map(j => {
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.Q.value = [4, 6, 8][j];
      pk.frequency.setValueAtTime(vs[0].f[j], t0); pk.gain.setValueAtTime(boost * vs[0].g[j], t0);
      node.connect(pk); node = pk; return pk;
    });
    node.connect(char);
    vs.forEach((v, i) => {
      if (!i) return;
      const at = t0 + dur * .9 * i / (vs.length - 1);
      lp.frequency.linearRampToValueAtTime(lpF(v), at);
      peaks.forEach((pk, j) => { pk.frequency.linearRampToValueAtTime(v.f[j], at); pk.gain.linearRampToValueAtTime(boost * v.g[j], at); });
    });
    // sub: a clean sine at the fundamental, it carries the weight on a club system
    if (p.sub > 0) {
      const s = ctx.createOscillator(); s.type = 'sine'; pitch(s.frequency, 1);
      const sg = ctx.createGain(); sg.gain.value = .75 * p.sub; s.connect(sg); sg.connect(amp); s.start(t0); s.stop(end + .06);
    }
    return oscs;
  }

  // ---------------------------------------------------------------- drums
  function hit(ctx, out, part, t, v) {
    const g = ctx.createGain(), lvl = v / 127; g.connect(out);
    const nz = (type, f, q, dec, gain, off = 0) => {
      const t1 = t + off;
      const s = ctx.createBufferSource(); s.buffer = noise(ctx); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const e = ctx.createGain(); e.gain.setValueAtTime(gain * lvl, t1); e.gain.exponentialRampToValueAtTime(.0005, t1 + dec);
      s.connect(fl); fl.connect(e); e.connect(g); s.start(t1, Math.random() * .5); s.stop(t1 + dec + .02);
    };
    switch (part) {
      case 'kick': {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(48, t + .085);
        const e = ctx.createGain(); e.gain.setValueAtTime(1 * lvl, t); e.gain.setTargetAtTime(0, t + .05, .09);
        const sh = ctx.createWaveShaper(); sh.curve = curve(2);
        o.connect(e); e.connect(sh); sh.connect(g); o.start(t); o.stop(t + .45);
        nz('highpass', 3000, .7, .012, .25);
        break;
      }
      case 'clap': for (const d of [0, .011, .022]) nz('bandpass', 1250, 1.1, d === .022 ? .2 : .025, .7, d); break;
      case 'hat': nz('highpass', 7600, .8, .12, .3); break;
      case 'closed': nz('highpass', 9000, .8, .035, .3); break;
      case 'shaker': nz('bandpass', 6200, 1.6, .05, .35); break;
      case 'rim': { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1750; const e = ctx.createGain(); e.gain.setValueAtTime(.45 * lvl, t); e.gain.exponentialRampToValueAtTime(.0005, t + .04); o.connect(e); e.connect(g); o.start(t); o.stop(t + .05); break; }
    }
  }

  // ---------------------------------------------------------------- the voice
  // voice = {samples, sr, syl, buffers: Map}; buffers are context-free AudioBuffers
  function toBuffer(x, sr) { const b = new AudioBuffer({length: Math.max(1, x.length), sampleRate: sr, numberOfChannels: 1}); b.copyToChannel(x, 0); return b; }
  function variant(voice, semis, rev) {
    const key = semis + (rev ? 'r' : '');
    voice.buffers ||= new Map();
    if (!voice.buffers.has(key)) {
      let x = semis ? TK.pitchShift(voice.samples, voice.sr, semis) : voice.samples;
      if (rev) x = Float32Array.from(x).reverse();
      voice.buffers.set(key, toBuffer(x, voice.sr));
    }
    return voice.buffers.get(key);
  }
  function vocalEvent(ctx, out, voice, e, t, spb) {
    const syl = voice.syl;
    if (!syl.length) return;
    const first = syl[0], last = syl[syl.length - 1];
    let start = e.src < 0 ? first.start : syl[e.src].start, len = e.src < 0 ? last.end - first.start : syl[e.src].end - syl[e.src].start;
    len = Math.min(len, e.d * spb);
    const buf = variant(voice, e.semis, e.rev);
    if (e.rev) start = voice.samples.length / voice.sr - (e.src < 0 ? last.end : syl[e.src].end);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const env = ctx.createGain(), g = e.gain;
    env.gain.setValueAtTime(0, t);
    if (e.rev) { env.gain.linearRampToValueAtTime(g * .15, t + .01); env.gain.linearRampToValueAtTime(g, t + len - .012); }
    else { env.gain.linearRampToValueAtTime(g, t + .004); env.gain.setValueAtTime(g, t + Math.max(.005, len - .012)); }
    env.gain.linearRampToValueAtTime(0, t + len);
    let node = env;
    const chain = n => { node.connect(n); node = n; };
    s.connect(env);
    const fx = e.fx || '';
    if (fx.includes('phone')) {
      const a = ctx.createBiquadFilter(); a.type = 'highpass'; a.frequency.value = 480; chain(a);
      const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = 3200; chain(b);
      const sh = ctx.createWaveShaper(); sh.curve = curve(3); chain(sh);
      const m = ctx.createGain(); m.gain.value = .7; chain(m);
    }
    if (fx.includes('drive')) { const sh = ctx.createWaveShaper(); sh.curve = curve(2.5); chain(sh); const m = ctx.createGain(); m.gain.value = .8; chain(m); }
    if (fx.includes('dark')) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; chain(lp); }
    node.connect(out);
    s.start(t, Math.max(0, start), len + .01);
  }

  // ---------------------------------------------------------------- scheduling
  // Schedule beats [from, to) of the phrase, with beat `from` landing at time t.
  function schedule(ctx, g, ph, state, voice, from, to, t) {
    const spb = 60 / state.bpm, at = b => t + (b - from) * spb, inside = b => b >= from && b < to;
    const m = state.mutes || {};
    const p = {drive: state.drive / 100, sub: state.sub / 100};
    if (!m.bass) for (const x of ph.bass) if (inside(x.t)) bassNote(ctx, g.bass, x, at(x.t), spb, p);
    for (const h of ph.drums) if (inside(h.t)) {
      if (!m.drums) hit(ctx, g.drums, h.part, at(h.t), h.v);
      if (h.part === 'kick') { // sidechain pump on the bass
        const k = at(h.t); g.pump.gain.cancelScheduledValues(k); g.pump.gain.setValueAtTime(1, k); g.pump.gain.linearRampToValueAtTime(.35, k + .008); g.pump.gain.setTargetAtTime(1, k + .03, .06 * spb / .48);
      }
    }
    if (!m.vocal && voice) for (const e of ph.vocal) if (inside(e.t)) vocalEvent(ctx, g.vocal, voice, e, at(e.t), spb);
  }

  // ---------------------------------------------------------------- live player
  const player = {playing: false, beat: 0, onBeat: null};
  let timer = null, g = null, cursor = 0, nextT = 0, startT = 0, startBeat = 0, source = null;
  function ctx() {
    if (!live) live = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
    if (live.state === 'suspended') live.resume();
    return live;
  }
  function start(get, fromBeat = 0) {
    stop();
    const c = ctx(); source = get; g = graph(c, c.destination);
    player.playing = true; cursor = fromBeat; nextT = c.currentTime + .08; startT = nextT; startBeat = fromBeat;
    const tick = () => {
      if (!player.playing) return;
      const {ph, state, voice} = source(), spb = 60 / state.bpm;
      if (cursor >= ph.beats) cursor = 0;
      while (nextT < c.currentTime + .15) {
        const to = Math.min(ph.beats, cursor + .5);
        schedule(c, g, ph, state, voice, cursor, to, nextT);
        nextT += (to - cursor) * spb; cursor = to >= ph.beats ? 0 : to;
        if (cursor === 0) { startT = nextT; startBeat = 0; }
      }
      const el = c.currentTime - startT;
      player.beat = el < 0 ? (ph.beats + el / spb) % ph.beats : (startBeat + el / spb) % ph.beats;
      player.onBeat?.(player.beat);
    };
    tick(); timer = setInterval(tick, 25);
  }
  function stop() {
    player.playing = false; clearInterval(timer); timer = null;
    if (g) { const old = g; old.master.gain.setTargetAtTime(0, live.currentTime, .02); setTimeout(() => old.nodes.forEach(n => n.disconnect()), 200); g = null; }
  }

  // audition one bass note or one syllable straight away
  function audition(fn) { const c = ctx(), gg = graph(c, c.destination); fn(c, gg, c.currentTime + .03); setTimeout(() => gg.nodes.forEach(n => n.disconnect()), 4000); }

  // ---------------------------------------------------------------- offline render and WAV
  async function render(ph, state, voice, {mutes = state.mutes, beats = ph.beats, tail = 1.5} = {}) {
    const sr = 44100, spb = 60 / state.bpm, len = Math.ceil((beats * spb + tail) * sr);
    const c = new OfflineAudioContext(2, len, sr), gg = graph(c, c.destination);
    schedule(c, gg, ph, {...state, mutes}, voice, 0, beats, 0);
    return c.startRendering();
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate, data = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
    data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, len * ch * 2, true);
    const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
    let o = 44; for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, x < 0 ? x * 32768 : x * 32767, true); o += 2; }
    return new Uint8Array(data.buffer);
  }
  function stats(buf) {
    let peak = 0, sum = 0, n = 0, bad = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) { if (!Number.isFinite(v)) { bad++; continue; } peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; }
    return {peak, rms: Math.sqrt(sum / Math.max(1, n)), bad};
  }

  // ---------------------------------------------------------------- capture
  function prepare(x, sr) {
    // mono, trimmed to the voice with 40 ms either side, normalized to -2 dBFS, at most 6 s
    let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
    if (pk < 1e-3) throw Error('That recording is silent. Check the microphone and try again.');
    const env = TK.envelope(x, sr, .005), thr = pk * .06;
    let a = env.findIndex(v => v > thr), b = env.length - 1; while (b > a && env[b] < thr) b--;
    const s = Math.max(0, Math.round((a * .005 - .04) * sr)), e = Math.min(x.length, Math.round(((b + 1) * .005 + .04) * sr), s + Math.round(6 * sr));
    const y = x.slice(s, e), g = .79 / pk; for (let i = 0; i < y.length; i++) y[i] *= g;
    return y;
  }
  async function decode(arrayBuffer) {
    const c = ctx(), b = await c.decodeAudioData(arrayBuffer.slice(0));
    const x = new Float32Array(b.length);
    for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < x.length; i++) x[i] += d[i] / b.numberOfChannels; }
    return {samples: prepare(x, b.sampleRate), sr: b.sampleRate};
  }
  // Record from the microphone. Returns a stop() function and a promise of the take.
  async function record({max = 5, onLevel} = {}) {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('This browser cannot record. Load an audio file instead.');
    const stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, noiseSuppression: true, autoGainControl: true}});
    const c = ctx(), src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const rec = new MediaRecorder(stream), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const level = new Float32Array(an.fftSize);
    const meter = setInterval(() => { an.getFloatTimeDomainData(level); let p = 0; for (const v of level) p = Math.max(p, Math.abs(v)); onLevel?.(p); }, 50);
    const done = new Promise((resolve, reject) => {
      rec.onstop = async () => {
        clearInterval(meter); stream.getTracks().forEach(t => t.stop()); src.disconnect();
        try { resolve(await decode(await new Blob(chunks, {type: rec.mimeType}).arrayBuffer())); } catch (e) { reject(e); }
      };
    });
    rec.start();
    const timeout = setTimeout(() => rec.state === 'recording' && rec.stop(), max * 1000);
    return {stop: () => { clearTimeout(timeout); if (rec.state === 'recording') rec.stop(); }, done};
  }

  return {player, ctx, start, stop, audition, bassNote, hit, vocalEvent, graph, schedule, render, wav, stats, decode, prepare, record, variant, toBuffer};
})();
