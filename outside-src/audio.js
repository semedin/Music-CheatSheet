// Outside audio: turns a place's chain spec into Web Audio nodes, plays a track through it with
// crossfades between places, runs the ambience and the doors, and renders a place offline.
// Works on AudioContext and OfflineAudioContext. The filter coefficients come from the engine,
// so what you hear and what the report measures are the same filters.
const OutsideAudio = (() => {
  const O = OUTSIDE;
  const gain = (ctx, v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const buf = (ctx, chans) => { const b = ctx.createBuffer(chans.length, chans[0].length, ctx.sampleRate); chans.forEach((c, i) => b.getChannelData(i).set(c)); return b; };
  // a list of engine filters as IIR nodes
  function filters(ctx, list) {
    const k = O.coefs(list, ctx.sampleRate), input = gain(ctx, k.gain); let last = input;
    for (const c of k.cs) { const f = ctx.createIIRFilter(c.b, c.a); last.connect(f); last = f; }
    return {input, output: last};
  }
  function matrix(ctx, w) { // mid/side width: 0 is mono, 1 leaves it alone
    const input = gain(ctx, 1), sp = ctx.createChannelSplitter(2), mg = ctx.createChannelMerger(2), a = (1 + w) / 2, b = (1 - w) / 2;
    input.channelCount = 2; input.channelCountMode = 'explicit'; input.connect(sp);
    [[0, 0, a], [0, 1, b], [1, 0, b], [1, 1, a]].forEach(([from, to, v]) => { const g = gain(ctx, v); sp.connect(g, from); g.connect(mg, 0, to); });
    return {input, output: mg};
  }
  function curve(amount) { const n = 2048, c = new Float32Array(n), k = 1 + amount * 9, norm = Math.tanh(k); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / norm; } return c; }
  const IRS = new Map(), AMBS = new Map();
  function impulseBuffer(ctx, room) { const key = ctx.sampleRate + '/' + JSON.stringify(room); if (!IRS.has(key)) IRS.set(key, O.impulse(room, ctx.sampleRate)); return buf(ctx, IRS.get(key)); }
  function ambience(ctx, kind) {
    const key = ctx.sampleRate + '/' + kind;
    if (!AMBS.has(key)) { const [l, r] = O.ambience(kind, ctx.sampleRate, 9), m = O.analyse(l, r, ctx.sampleRate, {start: 0, len: 9}); AMBS.set(key, {chans: [l, r], lufs: m.lufs}); }
    const a = AMBS.get(key); return {buffer: buf(ctx, a.chans), lufs: a.lufs};
  }

  // One stage of a chain. Returns {input, output} plus anything that needs stopping or steering.
  function stage(ctx, s, extras) {
    if (s.k === 'eq') return filters(ctx, s.f);
    if (s.k === 'width') {
      if (!s.below) return matrix(ctx, s.w);
      const input = gain(ctx, 1), out = gain(ctx, 1), x = [['lowpass', s.below, Math.SQRT1_2], ['lowpass', s.below, Math.SQRT1_2]], y = [['highpass', s.below, Math.SQRT1_2], ['highpass', s.below, Math.SQRT1_2]];
      const lo = filters(ctx, x), hi = filters(ctx, y), mono = matrix(ctx, 0), wide = matrix(ctx, s.w);
      input.connect(lo.input); lo.output.connect(mono.input); mono.output.connect(out); input.connect(hi.input); hi.output.connect(wide.input); wide.output.connect(out);
      return {input, output: out};
    }
    if (s.k === 'room') { const input = gain(ctx, 1), out = gain(ctx, 1), cv = ctx.createConvolver(), wet = gain(ctx, O.lin(s.wet)); cv.normalize = false; cv.buffer = impulseBuffer(ctx, {rt: s.rt, pre: s.pre, er: s.er, seed: s.seed}); input.connect(out); input.connect(cv); cv.connect(wet); wet.connect(out); return {input, output: out}; }
    if (s.k === 'slap') { const input = gain(ctx, 1), out = gain(ctx, 1), d = ctx.createDelay(.5), lp = filters(ctx, [['lowpass', s.lp, .71], ['gain', s.g]]); d.delayTime.value = s.ms / 1000; input.connect(out); input.connect(d); d.connect(lp.input); lp.output.connect(out); return {input, output: out}; }
    if (s.k === 'door') {
      const input = gain(ctx, 1), out = gain(ctx, 1), shut = filters(ctx, s.shut), open = filters(ctx, s.open), gs = gain(ctx, 1), go = gain(ctx, 0);
      input.connect(shut.input); shut.output.connect(gs); gs.connect(out); input.connect(open.input); open.output.connect(go); go.connect(out);
      extras.door = {spec: s, isOpen: false, set(on, t = .28) { const now = ctx.currentTime; this.isOpen = on; for (const [g, v] of [[go, on ? 1 : 0], [gs, on ? .25 : 1]]) { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(v, now + t); } }};
      return {input, output: out};
    }
    // drive: quiet passages pass at unity, loud ones flatten
    if (s.k === 'drive') { const k = 1 + s.amt * 9, input = gain(ctx, O.lin(s.pre)), sh = ctx.createWaveShaper(), out = gain(ctx, Math.tanh(k) / (k * O.lin(s.pre))); sh.curve = curve(s.amt); sh.oversample = '2x'; input.connect(sh); sh.connect(out); return {input, output: out}; }
    if (s.k === 'limit') { const c = ctx.createDynamicsCompressor(); c.threshold.value = -9; c.knee.value = 5; c.ratio.value = 14; c.attack.value = .003; c.release.value = .14; return {input: c, output: c}; }
    if (s.k === 'offset') { const input = gain(ctx, 1), sp = ctx.createChannelSplitter(2), mg = ctx.createChannelMerger(2), l = gain(ctx, O.lin(s.l)), r = gain(ctx, O.lin(s.r)), d = ctx.createDelay(.05); input.channelCount = 2; input.channelCountMode = 'explicit'; d.delayTime.value = s.ms / 1000; input.connect(sp); sp.connect(l, 0); l.connect(mg, 0, 0); sp.connect(d, 1); d.connect(r); r.connect(mg, 0, 1); return {input, output: mg}; }
    if (s.k === 'wind') { // the top end comes and goes, and the whole thing breathes a little
      const sh = ctx.createBiquadFilter(), out = gain(ctx, 1), n = Math.round(ctx.sampleRate * 11), r = O.rng(91), a = new Float32Array(n), b = new Float32Array(n), step = Math.round(ctx.sampleRate * .9);
      let p = r(), q = r(), p2 = r(), q2 = r();
      for (let i = 0; i < n; i++) { const k = i % step; if (!k && i) { p = q; q = i + step >= n ? a[0] / -1 : r(); p2 = q2; q2 = r(); } const t = k / step, e = t * t * (3 - 2 * t); a[i] = -(p + (q - p) * e); b[i] = (p2 + (q2 - p2) * e - .5) * .3; }
      sh.type = 'highshelf'; sh.frequency.value = 2500; sh.gain.value = 0; sh.connect(out);
      const mk = (data, depth, param) => { const src = ctx.createBufferSource(), g = gain(ctx, depth); src.buffer = buf(ctx, [data]); src.loop = true; src.connect(g); g.connect(param); src.start(); extras.sources.push(src); };
      mk(a, s.depth, sh.gain); mk(b, 1, out.gain);
      return {input: sh, output: out};
    }
    throw Error('Unknown stage ' + s.k);
  }
  function build(ctx, place) {
    const input = gain(ctx, 1), extras = {sources: [], door: null}; input.channelCount = 2; input.channelCountMode = 'explicit';
    let last = input; for (const s of place.chain) { const n = stage(ctx, s, extras); last.connect(n.input); last = n.output; }
    const output = gain(ctx, 1); last.connect(output);
    return {input, output, door: extras.door, stop() { for (const s of extras.sources) try { s.stop(); } catch { /* already stopped */ } }};
  }

  // The player: one track at a time through one place, with a crossfade when either changes.
  function player(ctx) {
    const src = gain(ctx, 1), mix = gain(ctx, 1), master = gain(ctx, 1), amb = gain(ctx, 0), safe = ctx.createDynamicsCompressor();
    const mk = () => { const a = ctx.createAnalyser(); a.fftSize = 8192; a.smoothingTimeConstant = .82; return a; }, dry = mk(), wet = mk(), air = mk();
    safe.threshold.value = -2; safe.knee.value = 2; safe.ratio.value = 20; safe.attack.value = .001; safe.release.value = .08;
    src.connect(dry); mix.connect(wet); mix.connect(master); amb.connect(air); amb.connect(master); master.connect(safe); safe.connect(ctx.destination);
    const P = {ctx, dry, wet, air, playing: false, place: null, chain: null, tracks: {}, which: 'mine', loop: null, onDoor: null, offset: 0, t0: 0, node: null, nodeGain: null, ambNode: null, doorTimer: null, doorHeld: false,
      duration() { const t = P.tracks[P.which]; return t ? t.buffer.duration : 0; },
      now() { // position in the current track, in seconds
        if (!P.playing) return P.offset; const t = P.tracks[P.which]; if (!t) return 0; let p = P.offset + ctx.currentTime - P.t0; const lp = t.loop;
        if (lp && P.offset < lp[1]) { if (p >= lp[1]) p = lp[0] + (p - lp[0]) % (lp[1] - lp[0]); } else p %= t.buffer.duration;
        return p;
      },
      start(at) {
        const t = P.tracks[P.which]; if (!t) return; P.halt(.03);
        const n = ctx.createBufferSource(), g = gain(ctx, 0), now = ctx.currentTime, lp = t.loop; n.buffer = t.buffer; n.loop = true;
        at = O.clamp(at == null ? P.offset : at, 0, t.buffer.duration - .01);
        if (lp && at < lp[1]) { n.loopStart = lp[0]; n.loopEnd = lp[1]; } else { n.loopStart = 0; n.loopEnd = t.buffer.duration; }
        n.connect(g); g.connect(src); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(O.lin(t.gain || 0), now + .03); n.start(now, at);
        P.node = n; P.nodeGain = g; P.offset = at; P.t0 = now; P.playing = true; P.startAmb(); P.armDoor();
      },
      halt(fade = .05) { // stop the music source, keep the position
        if (!P.node) return; const n = P.node, g = P.nodeGain, now = ctx.currentTime; P.offset = P.now();
        g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + fade); try { n.stop(now + fade + .02); } catch { /* not started */ }
        setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, (fade + .1) * 1000); P.node = P.nodeGain = null;
      },
      stop() { P.halt(); P.playing = false; P.stopAmb(); clearTimeout(P.doorTimer); if (P.chain && P.chain.door && !P.doorHeld) P.chain.door.set(false); },
      seek(at) { if (P.playing) P.start(at); else P.offset = O.clamp(at, 0, Math.max(0, P.duration() - .01)); },
      setTrack(which, mapPos) { if (!P.tracks[which] || which === P.which) return; const pos = mapPos == null ? P.now() : mapPos, was = P.playing; P.halt(.03); P.which = which; P.offset = O.clamp(pos, 0, P.tracks[which].buffer.duration - .01); if (was) P.start(); },
      setLoop() { if (P.playing) P.start(P.now()); },
      setGain(which, dBv) { const t = P.tracks[which]; if (!t) return; t.gain = dBv; if (which === P.which && P.nodeGain) P.nodeGain.gain.setTargetAtTime(O.lin(dBv), ctx.currentTime, .03); },
      // Walk to a place: build its chain, fade it up over the old one, let the old room ring out.
      setPlace(place, gainDb, ambDb, fade = .32) {
        const now = ctx.currentTime, old = P.chain, c = build(ctx, place); c.out = gain(ctx, 0); c.output.connect(c.out); c.out.connect(mix); src.connect(c.input);
        c.out.gain.setValueAtTime(0, now); c.out.gain.linearRampToValueAtTime(O.lin(gainDb), now + fade);
        if (old) { try { src.disconnect(old.input); } catch { /* gone */ } old.out.gain.cancelScheduledValues(now); old.out.gain.setValueAtTime(old.out.gain.value, now); old.out.gain.linearRampToValueAtTime(0, now + fade * 1.4); setTimeout(() => { old.stop(); try { old.out.disconnect(); } catch { /* gone */ } }, 2600); }
        P.chain = c; P.place = place; P.ambDb = ambDb; if (P.doorHeld && c.door) c.door.set(true, .05);
        if (P.playing) { P.startAmb(); P.armDoor(); }
      },
      setLevels(gainDb, ambDb) { const now = ctx.currentTime; if (P.chain) P.chain.out.gain.setTargetAtTime(O.lin(gainDb), now, .05); P.ambDb = ambDb; if (P.ambNode) amb.gain.setTargetAtTime(ambDb == null ? 0 : O.lin(ambDb), now, .08); },
      ambLufs(kind) { return ambience(ctx, kind).lufs; },
      startAmb() {
        const kind = P.place && P.place.noise && P.place.noise.kind, now = ctx.currentTime;
        if (P.ambKind === kind && P.ambNode) { amb.gain.setTargetAtTime(P.ambDb == null ? 0 : O.lin(P.ambDb), now, .1); return; }
        P.stopAmb(); if (!kind) return;
        const n = ctx.createBufferSource(), g = gain(ctx, 0); n.buffer = ambience(ctx, kind).buffer; n.loop = true; n.connect(g); g.connect(amb); n.start(now, Math.random() * 3);
        g.gain.linearRampToValueAtTime(1, now + .4); amb.gain.cancelScheduledValues(now); amb.gain.setTargetAtTime(P.ambDb == null ? 0 : O.lin(P.ambDb), now, .1); P.ambNode = n; P.ambG = g; P.ambKind = kind;
      },
      stopAmb() { if (!P.ambNode) return; const n = P.ambNode, g = P.ambG, now = ctx.currentTime; g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + .3); try { n.stop(now + .35); } catch { /* not started */ } P.ambNode = null; P.ambKind = null; },
      armDoor() { // doors open on their own every few seconds, and stay open while held
        clearTimeout(P.doorTimer); const d = P.chain && P.chain.door; if (!d || !P.playing) return; const [a, b] = d.spec.every;
        P.doorTimer = setTimeout(() => { if (!P.playing || P.chain.door !== d) return; if (!P.doorHeld) { d.set(true); P.onDoor && P.onDoor(true); setTimeout(() => { if (!P.doorHeld && P.chain && P.chain.door === d) { d.set(false, .5); P.onDoor && P.onDoor(false); } }, d.spec.hold * 1000); } P.armDoor(); }, (a + Math.random() * (b - a)) * 1000);
      },
      holdDoor(on) { P.doorHeld = on; const d = P.chain && P.chain.door; if (d) { d.set(on, on ? .2 : .45); P.onDoor && P.onDoor(on); } },
    };
    return P;
  }

  // A stretch of a track through a place, offline, with the door shut.
  async function render(buffer, place, {start = 0, len = buffer.duration, gainDb = 0} = {}) {
    const sr = buffer.sampleRate, tail = place.chain.some(s => s.k === 'room') ? 1.2 : .1, ctx = new OfflineAudioContext(2, Math.round((len + tail) * sr), sr), n = ctx.createBufferSource(), c = build(ctx, place), g = gain(ctx, O.lin(gainDb));
    n.buffer = buffer; n.connect(c.input); c.output.connect(g); g.connect(ctx.destination); n.start(0, start, len);
    return ctx.startRendering();
  }
  return {build, player, render, buf, ambience, curve};
})();
