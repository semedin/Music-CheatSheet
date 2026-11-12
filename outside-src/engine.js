// Outside engine: pure functions, no Web Audio. Runs in the page and in Node tests.
// A place is a chain of stages (filters, a room, a wall, a width). The same chain
// spec builds the audio graph in audio.js and the power response used here, so the
// report describes the thing you are listening to.
const OUTSIDE = (() => {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const dB = p => 10 * Math.log10(Math.max(p, 1e-30));
  const lin = d => Math.pow(10, d / 20);
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const noteOf = hz => { const m = Math.round(69 + 12 * Math.log2(hz / 440)); return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); };

  // ---------------------------------------------------------------- filters
  // RBJ biquads plus first-order sections, normalised so a[0] = 1.
  function biquad(t, f, sr, q = Math.SQRT1_2, g = 0) {
    const w = 2 * Math.PI * clamp(f, 1, sr * 0.49) / sr, c = Math.cos(w), s = Math.sin(w);
    if (t === 'lp1' || t === 'hp1') { const k = Math.tan(w / 2), n = 1 / (1 + k); return t === 'lp1' ? {b: [k * n, k * n, 0], a: [1, (k - 1) * n, 0]} : {b: [n, -n, 0], a: [1, (k - 1) * n, 0]}; }
    const A = Math.pow(10, g / 40), al = s / (2 * q); let b0, b1, b2, a0, a1, a2;
    if (t === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (t === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (t === 'peaking') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
    else if (t === 'lowshelf') { const r = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * c + r); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - r); a0 = (A + 1) + (A - 1) * c + r; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - r; }
    else if (t === 'highshelf') { const r = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * c + r); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - r); a0 = (A + 1) - (A - 1) * c + r; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - r; }
    else throw Error('Unknown filter ' + t);
    return {b: [b0 / a0, b1 / a0, b2 / a0], a: [1, a1 / a0, a2 / a0]};
  }
  function mag2(c, f, sr) {
    const w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = c.b[0] + c.b[1] * c1 + c.b[2] * c2, ni = -(c.b[1] * s1 + c.b[2] * s2), dr = 1 + c.a[1] * c1 + c.a[2] * c2, di = -(c.a[1] * s1 + c.a[2] * s2);
    return (nr * nr + ni * ni) / (dr * dr + di * di);
  }
  // A filter in a place spec is a short array: ['highpass', 32, .71], ['peaking', 300, .9, -2.5],
  // ['lowshelf', 85, 7], ['lp1', 180], ['gain', -6].
  function coefs(list, sr) {
    const out = {cs: [], gain: 1};
    for (const [t, a, b, c] of list || []) {
      if (t === 'gain') out.gain *= lin(a);
      else if (t === 'lowshelf' || t === 'highshelf') out.cs.push(biquad(t, a, sr, Math.SQRT1_2, b));
      else if (t === 'peaking') out.cs.push(biquad(t, a, sr, b, c));
      else out.cs.push(biquad(t, a, sr, b == null ? Math.SQRT1_2 : b));
    }
    return out;
  }
  function run(x, c) { // one biquad over a Float32Array, new array out
    const y = new Float32Array(x.length), [b0, b1, b2] = c.b, a1 = c.a[1], a2 = c.a[2]; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = x[i], o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o; }
    return y;
  }
  const chainRun = (x, list, sr) => { const k = coefs(list, sr); let y = x; for (const c of k.cs) y = run(y, c); if (k.gain !== 1) { if (y === x) y = Float32Array.from(x); for (let i = 0; i < y.length; i++) y[i] *= k.gain; } return y; };

  // ---------------------------------------------------------------- places
  // The club's own sound, shared by every place inside or behind its walls.
  const PA = [['highpass', 32, .6], ['highpass', 32, 1.2], ['lowshelf', 85, 7], ['peaking', 300, .9, -2.5], ['peaking', 3000, 1.2, 2], ['highshelf', 9000, -3]];
  const HALL = {rt: [1.7, 1.1, .6], pre: 18, wet: -7, er: .25, seed: 11};
  const PLACES = [
    {id: 'studio', name: 'Studio', group: 'home', short: 'Studio', level: 0, tag: 'What you mixed',
      blurb: 'Your file, untouched. Every other place is measured against this one.',
      always: 'Nothing is modelled here. If something is wrong in this place, it is in the mix.',
      model: ['No processing'], chain: [], checks: []},
    {id: 'booth', name: 'The booth', group: 'club', short: 'Booth', level: 2, tag: 'What the DJ hears',
      blurb: 'Two loud monitors a metre from your head, and the room arriving late and bassy over the top of them.',
      always: 'The room\'s low end reaches the booth about 45 ms after the monitors. Long bass turns into a second, late bass.',
      model: ['Booth monitors: +2 dB shelf under 100 Hz, +3 dB at 2.5 kHz', 'Floor bleed: 45 ms late, low-passed at 300 Hz, −7 dB', 'Small room, 0.35 s', 'Limiter'],
      chain: [{k: 'eq', f: [['lowshelf', 100, 2], ['peaking', 2500, 1, 3]]}, {k: 'slap', ms: 45, g: -7, lp: 300}, {k: 'room', rt: [.5, .35, .25], pre: 4, wet: -12, er: .4, seed: 21}, {k: 'limit'}],
      checks: ['punch', 'harsh']},
    {id: 'floor', name: 'Middle of the floor', group: 'club', short: 'Floor', level: 4, tag: 'The reason you made it',
      blurb: 'A big rig tuned heavy, mono subs, a room that rings for over a second, and a few hundred bodies soaking up the top.',
      always: 'The subs are mono and the room holds bass for 1.7 seconds. Whatever gap you left between kicks, the room fills part of it.',
      model: ['Mono below 100 Hz', 'High-pass 32 Hz, 24 dB/oct', '+7 dB shelf under 85 Hz, −2.5 dB at 300 Hz, +2 dB at 3 kHz, −3 dB above 9 kHz', 'Room: 1.7 s in the lows, 1.1 s in the mids, 0.6 s in the highs', 'System limiter'],
      chain: [{k: 'width', w: 1, below: 100}, {k: 'eq', f: PA}, {k: 'room', ...HALL}, {k: 'limit'}],
      checks: ['punch', 'mono', 'infra', 'lows', 'harsh']},
    {id: 'sub', name: 'At the sub stack', group: 'club', short: 'Sub stack', level: 6, tag: 'One metre from the bins',
      blurb: 'The tops fire over your head. What is left is the bottom two octaves, fourteen decibels up, and your ribcage.',
      always: 'Everything above 3.5 kHz is shadowed here. This place only asks one thing: is the bottom octave clean and in the centre?',
      model: ['Mono below 120 Hz', '+14 dB shelf under 95 Hz, +3 dB at 50 Hz', 'Tops shadowed: −6 dB/oct above 3.5 kHz, −6 dB above 5 kHz', 'Soft saturation', 'Room at −12 dB'],
      chain: [{k: 'width', w: 1, below: 120}, {k: 'eq', f: [['highpass', 30, .6], ['highpass', 30, 1.2], ['lowshelf', 95, 14], ['peaking', 50, 1.4, 3], ['lp1', 3500], ['highshelf', 5000, -6], ['gain', -6]]}, {k: 'drive', pre: 3, amt: .25}, {k: 'room', ...HALL, wet: -12, seed: 12}, {k: 'limit'}],
      checks: ['lows', 'infra', 'mono']},
    {id: 'bar', name: 'The back bar', group: 'club', short: 'Back bar', level: -2, tag: 'Thirty metres back',
      blurb: 'Past the point where the room is louder than the speakers. Mostly reverb, a boom off the back wall, and people ordering.',
      always: 'Back here the reverb is louder than the direct sound. Detail goes first; rhythm and bass note are what get through.',
      model: ['Width 60%', 'Club rig curve', '+3 dB room mode at 140 Hz', '−7 dB above 5 kHz, −6 dB/oct above 7 kHz', 'Room at +1 dB: more reverb than direct sound', 'Bar crowd'],
      chain: [{k: 'width', w: .6, below: 100}, {k: 'eq', f: [...PA, ['peaking', 140, 1.2, 3], ['highshelf', 5000, -7], ['lp1', 7000]]}, {k: 'room', rt: [1.9, 1.2, .6], pre: 30, wet: 1, er: .15, seed: 13}, {k: 'limit'}],
      noise: {kind: 'bar', snr: 9}, checks: ['punch', 'boom', 'mono']},
    {id: 'toilets', name: 'The toilets', group: 'wall', short: 'Toilets', level: -12, tag: 'One wall and a door',
      blurb: 'The whole room squeezed through a wall into a tiled box. Then someone opens the door and the track walks in.',
      always: 'A wall passes roughly everything under 200 Hz. If the kick and bass are one smear in the club, in here they are one note.',
      model: ['The club room first', 'Wall: −6 dB/oct above 180 Hz, −12 dB/oct above 260 Hz, +5 dB resonance at 62 Hz', 'Door open: low-pass 2.5 kHz', 'Tiled room, 0.9 s in the mids', 'Hand dryer'],
      chain: [{k: 'eq', f: PA}, {k: 'room', ...HALL, wet: -3, seed: 14}, {k: 'door', every: [9, 16], hold: 2.6, shut: [['lp1', 180], ['lowpass', 260, .71], ['peaking', 62, 3, 5]], open: [['lowpass', 2500, .71], ['highshelf', 4000, -6], ['gain', 3]]}, {k: 'width', w: 0}, {k: 'room', rt: [.5, .9, .7], pre: 5, wet: -4, er: .35, seed: 31}],
      noise: {kind: 'tiles', snr: 12}, checks: ['groove']},
    {id: 'smoke', name: 'The smoking area', group: 'wall', short: 'Smoking area', level: -14, tag: 'Outside, door swinging',
      blurb: 'A wall, an open sky and forty conversations. The door swings every few bars and lets the mids out.',
      always: 'No room out here, so nothing hides behind reverb. People decide to go back in on kick and bass alone.',
      model: ['The club room first', 'Wall: −6 dB/oct above 140 Hz, −12 dB/oct above 220 Hz, +4 dB at 55 Hz', 'Door open: low-pass 3 kHz', 'Mono by distance', 'Crowd talking'],
      chain: [{k: 'eq', f: PA}, {k: 'room', ...HALL, wet: -3, seed: 15}, {k: 'door', every: [5, 10], hold: 2.2, shut: [['lp1', 140], ['lowpass', 220, .71], ['peaking', 55, 2.5, 4]], open: [['lowpass', 3000, .71], ['gain', 2]]}, {k: 'width', w: .3}],
      noise: {kind: 'crowd', snr: 5}, checks: ['groove']},
    {id: 'queue', name: 'The queue', group: 'wall', short: 'Queue', level: -20, tag: 'On the street',
      blurb: 'The building is the speaker now. One resonance near 48 Hz, a slap off the flats opposite, and traffic.',
      always: 'From the street a club is a thump at one pitch. This is the only version of your track most of the city will ever hear.',
      model: ['The club room first', 'Building: −6 dB/oct above 90 Hz, −24 dB/oct above 150 Hz, +6 dB resonance at 48 Hz', 'Echo off the street: 80 ms, −10 dB', 'Door open: low-pass 1.2 kHz', 'Street'],
      chain: [{k: 'eq', f: PA}, {k: 'room', ...HALL, wet: -3, seed: 16}, {k: 'door', every: [14, 24], hold: 1.8, shut: [['lp1', 90], ['lowpass', 150, .6], ['lowpass', 150, 1.1], ['peaking', 48, 4, 6]], open: [['lowpass', 1200, .71], ['gain', 2]]}, {k: 'width', w: 0}, {k: 'slap', ms: 80, g: -10, lp: 400}],
      noise: {kind: 'street', snr: 6}, checks: ['groove']},
    {id: 'field', name: 'Festival field', group: 'world', short: 'Festival', level: -4, tag: 'Sixty metres from the stage',
      blurb: 'No walls. The air eats the top, the ground takes a bite out of the low mids, and the wind moves what is left around.',
      always: 'Sixty metres of air removes about 9 dB above 6 kHz, and the wind makes it come and go. Hats are the first thing a field loses.',
      model: ['Width 50%', 'High-pass 35 Hz, +5 dB shelf under 80 Hz', 'Ground dip: −3 dB at 250 Hz', 'Air: −9 dB above 6 kHz, −6 dB/oct above 9 kHz', 'Late echo: 180 ms, −14 dB', 'Wind on the top end', 'Open-air crowd'],
      chain: [{k: 'width', w: .5, below: 100}, {k: 'eq', f: [['highpass', 35, .71], ['lowshelf', 80, 5], ['peaking', 250, .8, -3], ['highshelf', 6000, -9], ['lp1', 9000]]}, {k: 'slap', ms: 180, g: -14, lp: 2000}, {k: 'wind', depth: 5}, {k: 'limit'}],
      noise: {kind: 'wind', snr: 13}, checks: ['tops', 'mono', 'lows']},
    {id: 'car', name: 'The car home', group: 'world', short: 'Car', level: -6, tag: 'Driver\'s seat, 80 km/h',
      blurb: 'A small sealed box that adds bass for free, door speakers that boom at 130 Hz, and the road underneath all of it.',
      always: 'A car cabin lifts everything under 70 Hz by about 7 dB and booms around 130 Hz. Low-mid build-up that was polite on monitors is not polite here.',
      model: ['Cabin gain: +7 dB shelf under 70 Hz', 'Door speakers: +5 dB at 130 Hz, −4 dB at 350 Hz, +3 dB at 2.2 kHz, −3 dB above 8 kHz', 'Driver\'s seat: left +2 dB, right −1.5 dB and 0.5 ms late', 'Cabin reflections, 0.08 s', 'Road noise'],
      chain: [{k: 'width', w: .8}, {k: 'eq', f: [['lowshelf', 70, 7], ['peaking', 130, 2.2, 5], ['peaking', 350, 1, -4], ['peaking', 2200, 1.5, 3], ['highshelf', 8000, -3], ['gain', -3]]}, {k: 'offset', l: 2, r: -1.5, ms: .5}, {k: 'room', rt: [.12, .08, .05], pre: 2, wet: -8, er: .5, seed: 41}, {k: 'limit'}],
      noise: {kind: 'road', snr: 11}, checks: ['boom', 'lows']},
    {id: 'bt', name: 'Bluetooth speaker', group: 'world', short: 'Speaker', level: -8, tag: 'On a kitchen counter',
      blurb: 'One driver, a port tuned to 62 Hz, and a chip that turns everything up until the limiter says no.',
      always: 'Mono, and nothing under 60 Hz. A bass note below that is heard through its harmonics or not at all.',
      model: ['Mono', 'High-pass 62 Hz, 24 dB/oct, with a port bump', '+4 dB at 95 Hz, +2 dB at 4 kHz, −4 dB above 10 kHz', 'Soft saturation', 'Limiter'],
      chain: [{k: 'width', w: 0}, {k: 'eq', f: [['highpass', 62, .7], ['highpass', 62, 1.3], ['peaking', 95, 1.4, 4], ['peaking', 4000, 1, 2], ['highshelf', 10000, -4]]}, {k: 'drive', pre: 3, amt: .2}, {k: 'limit'}],
      checks: ['bass', 'mono']},
    {id: 'laptop', name: 'Laptop speakers', group: 'world', short: 'Laptop', level: -12, tag: 'Where demos get judged',
      blurb: 'Two coins of speaker under the keyboard. Nothing below 190 Hz, a honk at 900, and whoever you sent the demo to.',
      always: 'Nothing under 190 Hz for any track. The kick is its knock and the bass is its harmonics.',
      model: ['Width 70%', 'High-pass 190 Hz, 24 dB/oct', '+4 dB at 900 Hz, +3 dB at 3.5 kHz, −3 dB above 11 kHz', 'Limiter'],
      chain: [{k: 'width', w: .7}, {k: 'eq', f: [['highpass', 190, .8], ['highpass', 190, 1], ['peaking', 900, 1.2, 4], ['peaking', 3500, 1.5, 3], ['highshelf', 11000, -3]]}, {k: 'limit'}],
      checks: ['bass', 'kick', 'mono']},
    {id: 'phone', name: 'Phone speaker', group: 'world', short: 'Phone', level: -16, tag: 'Where most people hear it first',
      blurb: 'One speaker the size of a fingernail. Nothing below 430 Hz, a spike at 2.8 kHz, and it clips.',
      always: 'Everything under 430 Hz is gone, for every track ever made. What counts is what you put above it.',
      model: ['Mono', 'High-pass 430 Hz, 30 dB/oct', '+6 dB at 2.8 kHz, +3 dB at 1 kHz', 'Low-pass 9 kHz', 'Clipping', 'Limiter'],
      chain: [{k: 'width', w: 0}, {k: 'eq', f: [['highpass', 430, .7], ['highpass', 430, 1.3], ['hp1', 300], ['peaking', 2800, 1.6, 6], ['peaking', 1000, 1, 3], ['lowpass', 9000, .71]]}, {k: 'drive', pre: 6, amt: .5}, {k: 'limit'}],
      checks: ['bass', 'kick', 'mono']},
  ];
  const GROUPS = [['club', 'Inside'], ['wall', 'Through the wall'], ['world', 'Out in the world']];
  const placeById = id => PLACES.find(p => p.id === id);

  // Reverberation time at a frequency: low value to 125 Hz, mid at 1 kHz, high from 8 kHz.
  function rtAt(room, f) {
    const [l, m, h] = room.rt;
    if (f <= 125) return l; if (f >= 8000) return h;
    return f < 1000 ? l + (m - l) * Math.log(f / 125) / Math.log(8) : m + (h - m) * Math.log(f / 1000) / Math.log(8);
  }
  const roomColour = (room, f) => { const er = room.er == null ? .2 : room.er; return er + (1 - er) * rtAt(room, f) / room.rt[1]; };

  // Compile a place for a sample rate, then ask for its power response and width at any frequency.
  function compile(place, sr) {
    return {place, sr, stages: place.chain.map(s => s.k === 'eq' ? {...s, c: coefs(s.f, sr)} : s.k === 'door' ? {...s, c: coefs(s.shut, sr), co: coefs(s.open, sr)} : s.k === 'slap' ? {...s, c: coefs([['lowpass', s.lp, .71]], sr)} : s)};
  }
  function respond(cp, f, doorOpen = false) {
    let h2 = 1, w = 1;
    for (const s of cp.stages) {
      if (s.k === 'eq' || s.k === 'door') { const k = s.k === 'door' && doorOpen ? s.co : s.c; for (const c of k.cs) h2 *= mag2(c, f, cp.sr); h2 *= k.gain * k.gain; }
      else if (s.k === 'room') h2 *= 1 + lin(s.wet) ** 2 * roomColour(s, f);
      else if (s.k === 'slap') h2 *= 1 + lin(s.g) ** 2 * mag2(s.c.cs[0], f, cp.sr);
      else if (s.k === 'width') w *= s.below && f < s.below ? 0 : s.w;
    }
    return {h2, w};
  }

  // A room as an impulse response: a few early reflections, then three bands of noise that
  // each die at their own rate. Scaled so the response adds roomColour(f) of energy.
  function impulse(room, sr) {
    const [rl, rm, rh] = room.rt, pre = Math.round((room.pre || 0) / 1000 * sr), er = room.er == null ? .2 : room.er;
    const n = pre + Math.ceil(Math.max(rl, rm, rh) * 1.15 * sr), scale = Math.sqrt((1 - er) / (rm * sr / 13.816)), out = [];
    for (let ch = 0; ch < 2; ch++) {
      const r = rng((room.seed || 1) * 2 + ch + 1), w = new Float32Array(n - pre);
      for (let i = 0; i < w.length; i++) w[i] = (r() + r() + r() - 1.5) * 2; // variance 1
      const lo = chainRun(w, [['lowpass', 250, .54], ['lowpass', 250, 1.31]], sr), hi = chainRun(w, [['highpass', 4000, .54], ['highpass', 4000, 1.31]], sr);
      const d = new Float32Array(n), kl = 6.908 / (rl * sr), km = 6.908 / (rm * sr), kh = 6.908 / (rh * sr), ramp = .008 * sr;
      for (let i = 0; i < w.length; i++) d[pre + i] = (lo[i] * Math.exp(-kl * i) + (w[i] - lo[i] - hi[i]) * Math.exp(-km * i) + hi[i] * Math.exp(-kh * i)) * scale * Math.min(1, i / ramp);
      let e = 0; const taps = []; for (let k = 0; k < 6; k++) { const a = Math.pow(.78, k) * (r() < .5 ? -1 : 1); taps.push([pre + Math.round((.004 + (k + r()) * .011 * (rm > .5 ? 1 : .3)) * sr), a]); e += a * a; }
      for (const [i, a] of taps) if (i < n) d[i] += a * Math.sqrt(er / e);
      out.push(d);
    }
    return out;
  }

  // ---------------------------------------------------------------- ambience
  // Every background is synthesised: there are no audio files in this folder.
  function crowd(sr, n, r, voices, bright = 1) {
    const L = new Float32Array(n), R = new Float32Array(n);
    for (let v = 0; v < voices; v++) {
      const pan = r(), gl = Math.cos(pan * Math.PI / 2), gr = Math.sin(pan * Math.PI / 2), base = 95 + r() * 150, lvl = .4 + r() * .6;
      let ph = r(), i = Math.floor(-r() * sr), y1a = 0, y2a = 0, x1 = 0, x2 = 0, y1b = 0, y2b = 0;
      while (i < n) {
        const talk = r() < .72, syl = talk ? 2 + Math.floor(r() * 9) : 1;
        for (let s = 0; s < syl && i < n; s++) {
          const len = Math.round((talk ? .11 + r() * .16 : .25 + r() * 1.1) * sr), f1 = 300 + r() * 560, f2 = (900 + r() * 1400) * bright, f0 = base * (.85 + r() * .4), amp = talk ? lvl * (.5 + r() * .5) : 0;
          const ca = biquad('peaking', f1, sr, 7, 0), wa = 2 * Math.PI * f1 / sr, wb = 2 * Math.PI * f2 / sr, ra = .985, rb = .98;
          const a1a = -2 * ra * Math.cos(wa), a2a = ra * ra, a1b = -2 * rb * Math.cos(wb), a2b = rb * rb; void ca;
          for (let k = 0; k < len && i < n; k++, i++) {
            if (i < 0) continue;
            ph += f0 / sr; if (ph >= 1) ph -= 1;
            const src = (ph * 2 - 1) + (r() - .5) * .3, d = src - x2; x2 = x1; x1 = src; // differentiated source, two resonators
            const ya = d - a1a * y1a - a2a * y2a; y2a = y1a; y1a = ya;
            const yb = d - a1b * y1b - a2b * y2b; y2b = y1b; y1b = yb;
            const o = (ya * (1 - ra) * 6 + yb * (1 - rb) * 3) * amp * Math.sin(Math.PI * k / len) ** 1.5;
            L[i] += o * gl; R[i] += o * gr;
          }
        }
      }
    }
    return [L, R];
  }
  function colour(n, r, list, sr) { const w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = r() * 2 - 1; return chainRun(w, list, sr); }
  function slow(n, r, sr, hz) { // a smooth random curve between 0 and 1
    const out = new Float32Array(n), step = Math.max(1, Math.round(sr / hz)); let a = r(), b = r();
    for (let i = 0; i < n; i++) { const k = i % step; if (!k && i) { a = b; b = r(); } const t = k / step, s = t * t * (3 - 2 * t); out[i] = a + (b - a) * s; }
    return out;
  }
  function ambience(kind, sr = 44100, secs = 8, seed = 7) {
    const fade = Math.round(sr * .8), n = Math.round(secs * sr) + fade, r = rng(seed + kind.length * 131 + kind.charCodeAt(0));
    let L = new Float32Array(n), R = new Float32Array(n);
    const add = (l, rr, g) => { for (let i = 0; i < n; i++) { L[i] += l[i] * g; R[i] += rr[i] * g; } };
    const norm = x => { let s = 0; for (const v of x[0]) s += v * v; for (const v of x[1]) s += v * v; const k = 1 / Math.sqrt(s / (2 * n) + 1e-12); for (let i = 0; i < n; i++) { x[0][i] *= k; x[1][i] *= k; } return x; };
    if (kind === 'crowd' || kind === 'bar') {
      add(...norm(crowd(sr, n, r, kind === 'bar' ? 26 : 20)), 1);
      if (kind === 'bar') for (let c = 0; c < 9; c++) { const t0 = Math.floor(r() * (n - sr)), f = 3200 + r() * 2600, g = .5 + r(), p = r(); for (let i = 0; i < sr * .25; i++) { const o = Math.sin(2 * Math.PI * f * i / sr) * Math.exp(-i / (sr * .035)) * g; L[t0 + i] += o * p; R[t0 + i] += o * (1 - p); } }
      add(colour(n, r, [['lp1', 300]], sr), colour(n, r, [['lp1', 300]], sr), 1.2);
    } else if (kind === 'street') {
      add(colour(n, r, [['lp1', 45], ['lp1', 200]], sr), colour(n, r, [['lp1', 45], ['lp1', 200]], sr), 60);
      add(colour(n, r, [['lowpass', 700, .5]], sr), colour(n, r, [['lowpass', 700, .5]], sr), .5);
      const car = colour(n, r, [['lowpass', 900, .6], ['hp1', 90]], sr), mid = n * .55, wd = sr * 1.5;
      for (let i = 0; i < n; i++) { const g = Math.exp(-(((i - mid) / wd) ** 2)) * 5, p = clamp(.5 + (i - mid) / (wd * 4), 0, 1); L[i] += car[i] * g * (1 - p); R[i] += car[i] * g * p; }
      const c = norm(crowd(sr, n, r, 7, .8)); add(chainRun(c[0], [['lowpass', 1500, .7]], sr), chainRun(c[1], [['lowpass', 1500, .7]], sr), .35);
    } else if (kind === 'road') {
      add(colour(n, r, [['lp1', 55], ['lp1', 160]], sr), colour(n, r, [['lp1', 55], ['lp1', 160]], sr), 60);
      add(colour(n, r, [['peaking', 1000, .6, 12], ['lowpass', 2500, .7]], sr), colour(n, r, [['peaking', 1000, .6, 12], ['lowpass', 2500, .7]], sr), .09);
      const wob = slow(n, r, sr, .7); for (let i = 0; i < n; i++) { const t = i / sr, o = (Math.sin(2 * Math.PI * 87 * t) + .5 * Math.sin(2 * Math.PI * 174 * t + 1) + .25 * Math.sin(2 * Math.PI * 261 * t + 2)) * (.6 + .4 * wob[i]) * .25; L[i] += o; R[i] += o; }
    } else if (kind === 'tiles') {
      const c = norm(crowd(sr, n, r, 5, .8)); add(chainRun(c[0], [['lowpass', 900, .7]], sr), chainRun(c[1], [['lowpass', 900, .7]], sr), .35);
      const dl = colour(n, r, [['peaking', 1800, .5, 14], ['hp1', 300], ['lowpass', 6000, .7]], sr), dr = colour(n, r, [['peaking', 1800, .5, 14], ['hp1', 300], ['lowpass', 6000, .7]], sr), a = sr * 2.2, b = sr * 5.6;
      for (let i = 0; i < n; i++) { const g = clamp((i - a) / (sr * .15), 0, 1) * clamp((b - i) / (sr * .5), 0, 1), t = i / sr, tone = Math.sin(2 * Math.PI * 310 * t) * 1.2; L[i] += (dl[i] + tone) * g * .5; R[i] += (dr[i] + tone) * g * .5; }
      for (let i = 0; i < n; i++) { const o = Math.sin(2 * Math.PI * 120 * i / sr) * .12; L[i] += o; R[i] += o; }
    } else if (kind === 'wind') {
      const g = slow(n, r, sr, .45), g2 = slow(n, r, sr, .3), wl = colour(n, r, [['lp1', 420], ['hp1', 60]], sr), wr = colour(n, r, [['lp1', 420], ['hp1', 60]], sr);
      for (let i = 0; i < n; i++) { L[i] += wl[i] * (.15 + g[i] ** 2) * 9; R[i] += wr[i] * (.15 + g2[i] ** 2) * 9; }
      const c = norm(crowd(sr, n, r, 14)); add(chainRun(c[0], [['hp1', 400]], sr), chainRun(c[1], [['hp1', 400]], sr), .55);
    } else throw Error('Unknown ambience ' + kind);
    const m = n - fade, l = new Float32Array(m), rr = new Float32Array(m); // fold the tail over the head so the loop has no seam
    for (let i = 0; i < m; i++) { const k = i < fade ? i / fade : 1, a = Math.sqrt(k), b = Math.sqrt(1 - k); l[i] = L[i] * a + (i < fade ? L[m + i] * b : 0); rr[i] = R[i] * a + (i < fade ? R[m + i] * b : 0); }
    let s = 0; for (let i = 0; i < m; i++) s += l[i] * l[i] + rr[i] * rr[i];
    const k = .1 / Math.sqrt(s / (2 * m) + 1e-12); for (let i = 0; i < m; i++) { l[i] *= k; rr[i] *= k; }
    return [l, rr];
  }

  // ---------------------------------------------------------------- demo mix
  // Sixteen bars of house at 126 BPM, written twice: once with five planted problems,
  // once with each of them fixed. The tests check that the report finds exactly those five.
  const PLANTED = [
    ['harmonics', 'The bassline is a pure sine at 44 Hz', 'No harmonics, so it vanishes on anything smaller than a club.'],
    ['basswide', 'The bass has a stereo widener on it', 'Left and right are 140° apart: summed to mono it drops about 9 dB.'],
    ['tail', 'The kick rings for half a second and the bass is never ducked', 'There is no gap in the low end for a room to leave alone.'],
    ['click', 'The kick has no click', 'On a speaker with no bass there is nothing left of it.'],
    ['infra', 'A 21 Hz rumble runs under everything', 'No speaker here plays it. It only eats headroom.'],
    ['wide', 'The chord stab is nearly out of phase and dull', 'It is the hook, and it cancels in mono.'],
    ['mud', 'A pad sits at 90–300 Hz', 'Polite on monitors, a boom in a car.'],
  ];
  function demo(fixed, sr = 44100) {
    const bpm = 126, beat = 60 / bpm, step = beat / 4, bars = 16, n = Math.round(bars * 4 * beat * sr), L = new Float32Array(n), R = new Float32Array(n), r = rng(fixed ? 5 : 4), TAU = 2 * Math.PI;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12), at = t => Math.round(t * sr);
    // kick
    const click = (() => { const len = at(.04), a = new Float32Array(len); for (let i = 0; i < len; i++) a[i] = (r() * 2 - 1) * Math.exp(-i / (sr * .007)); return chainRun(a, [['peaking', 2200, 1, 12], ['hp1', 600]], sr); })();
    for (let b = 0; b < bars * 4; b++) {
      const i0 = at(b * beat), len = at(fixed ? .32 : .47); let ph = 0;
      for (let i = 0; i < len && i0 + i < n; i++) {
        const t = i / sr, f = fixed ? 50 + 135 * Math.exp(-t / .028) : 47 + 115 * Math.exp(-t / .04); ph += TAU * f / sr;
        let o = Math.sin(ph) * Math.exp(-t / (fixed ? .085 : .4)) * Math.min(1, i / (fixed ? 40 : 260)) * Math.min(1, (len - i) / 200);
        if (fixed) o = Math.tanh(o * 1.6) * .72 + (i < click.length ? click[i] * .3 : 0); else o *= .9;
        L[i0 + i] += o * .62; R[i0 + i] += o * .62;
      }
    }
    // bass
    const pat = [[[2, 0], [3, 0], [6, 0], [10, 0], [11, 3], [14, 0]], [[2, 0], [3, 0], [6, 0], [7, -2], [10, 0], [14, 3], [15, 0]]];
    let lp = 0;
    for (let bar = 0; bar < bars; bar++) {
      const p = pat[bar % 2];
      p.forEach(([s, semi], j) => {
        const next = j + 1 < p.length ? p[j + 1][0] : 18, f = hz(29 + semi), i0 = at((bar * 16 + s) * step), len = at((fixed ? Math.min(next - s, 2) * .82 : (next - s)) * step);
        for (let i = 0; i < len && i0 + i < n; i++) {
          const t = i / sr, ph = TAU * f * t, env = Math.min(1, i / (sr * .004)) * Math.min(1, (len - i) / (sr * .02));
          if (!fixed) { L[i0 + i] += Math.sin(ph) * env * .36; R[i0 + i] += Math.sin(ph + 2.44) * env * .36; continue; }
          const tb = ((i0 + i) / sr) % beat, duck = 1 - .85 * Math.exp(-tb / .08), saw = ((f * 2 * t) % 1) * 2 - 1; lp += (saw - lp) * .2;
          const o = (Math.sin(ph) * .34 + Math.tanh(Math.sin(ph) * 3) * .12 + lp * .17) * env * duck;
          L[i0 + i] += o; R[i0 + i] += o;
        }
      });
    }
    if (!fixed) for (let i = 0; i < n; i++) { const o = Math.sin(TAU * 21 * i / sr) * .14; L[i] += o; R[i] += o; }
    // hats and clap
    const hat = (t0, g, dec) => { const i0 = at(t0), len = at(dec * 5), a = new Float32Array(len), b = new Float32Array(len); for (let i = 0; i < len; i++) { const e = Math.exp(-i / (sr * dec)); a[i] = (r() * 2 - 1) * e; b[i] = (r() * 2 - 1) * e; } const fa = chainRun(a, [['highpass', 7000, .8]], sr), fb = chainRun(b, [['highpass', 7000, .8]], sr); for (let i = 0; i < len && i0 + i < n; i++) { L[i0 + i] += (fa[i] * .8 + fb[i] * .2) * g; R[i0 + i] += (fb[i] * .8 + fa[i] * .2) * g; } };
    for (let s = 0; s < bars * 16; s++) hat(s * step, s % 4 === 2 ? .5 : s % 4 ? .16 : 0, s % 4 === 2 ? .045 : .012);
    for (let b = 0; b < bars * 4; b++) if (b % 2 === 1) { const i0 = at(b * beat), len = at(.3), a = new Float32Array(len); for (let i = 0; i < len; i++) { const t = i / sr; a[i] = (r() * 2 - 1) * (t < .03 ? (Math.floor(t / .01) % 2 ? .4 : 1) * Math.exp(-(t % .01) / .004) + .3 : Math.exp(-(t - .03) / .07)); } const f = chainRun(a, [['peaking', 1600, 1.2, 10], ['hp1', 500], ['lowpass', 6000, .7]], sr); for (let i = 0; i < len && i0 + i < n; i++) { L[i0 + i] += f[i] * .2; R[i0 + i] += f[i] * .2; } }
    // chord stab (the hook) and pad, from bar 5
    const chord = [53, 56, 60, 63], stabs = [[3, 9], [3, 11, 14]];
    for (let bar = 4; bar < bars; bar++) for (const s of stabs[bar % 2]) {
      const i0 = at((bar * 16 + s) * step), len = at(.34), a = new Float32Array(len), b = new Float32Array(len);
      for (let i = 0; i < len; i++) { const t = i / sr, e = Math.exp(-t / .13) * Math.min(1, i / 60); let x = 0, y = 0; for (const m of chord) { x += ((hz(m - .06) * t) % 1) * 2 - 1; y += ((hz(m + .06) * t + .3) % 1) * 2 - 1; } a[i] = x * e; b[i] = y * e; }
      const lpf = fixed ? [['lowpass', 3200, .9], ['hp1', 220]] : [['lowpass', 1100, .7], ['lowpass', 1100, .7]], fa = chainRun(a, lpf, sr), fb = chainRun(b, lpf, sr), g = fixed ? .2 : .28;
      for (let i = 0; i < len && i0 + i < n; i++) { L[i0 + i] += fa[i] * g; R[i0 + i] += (fixed ? fa[i] * .7 + fb[i] * .3 : -.85 * fa[i]) * g; }
    }
    { const i0 = at(16 * 4 * step), len = n - i0, a = new Float32Array(len); for (let i = 0; i < len; i++) { const t = i / sr; a[i] = (((87.31 * t) % 1) + ((130.81 * t) % 1) + ((207.65 * t) % 1)) * 2 - 3; }
      const f = chainRun(a, fixed ? [['lowpass', 900, .7], ['highpass', 220, .7]] : [['lowpass', 320, .7], ['lowpass', 320, .7]], sr), g = fixed ? .035 : .16;
      for (let i = 0; i < len; i++) { const e = Math.min(1, i / (sr * .5)) * Math.min(1, (len - i) / (sr * .05)); L[i0 + i] += f[i] * g * e; R[i0 + i] += f[i] * g * e; } }
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const k = .89 / peak; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
    return {L, R, sr, bpm, bars, name: fixed ? 'Demo mix, fixed' : 'Demo mix, seven planted problems'};
  }

  // ---------------------------------------------------------------- analysis
  function fftPlan(N) {
    const rev = new Uint32Array(N), bits = Math.log2(N), cos = new Float64Array(N / 2), sin = new Float64Array(N / 2), win = new Float64Array(N); let ws = 0;
    for (let i = 0; i < N; i++) { let x = i, y = 0; for (let b = 0; b < bits; b++) { y = y << 1 | x & 1; x >>= 1; } rev[i] = y; win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / N); ws += win[i] * win[i]; }
    for (let i = 0; i < N / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / N); sin[i] = -Math.sin(2 * Math.PI * i / N); }
    return {N, rev, cos, sin, win, ws};
  }
  function fft(re, im, p) {
    const N = p.N;
    for (let i = 0; i < N; i++) { const j = p.rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= N; size <<= 1) { const half = size >> 1, stride = N / size;
      for (let s = 0; s < N; s += size) for (let k = 0; k < half; k++) { const c = p.cos[k * stride], sn = p.sin[k * stride], a = s + k, b = a + half, tr = re[b] * c - im[b] * sn, ti = re[b] * sn + im[b] * c; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; } }
  }
  const KW = sr => [biquad('highpass', 38.135, sr, .5), biquad('highshelf', 1681.97, sr, Math.SQRT1_2, 4)];
  const GROUPS6 = [['sub', 'Sub', 20, 60], ['bass', 'Bass', 60, 120], ['lowmid', 'Low mids', 120, 300], ['mid', 'Mids', 300, 2000], ['pres', 'Presence', 2000, 6000], ['air', 'Air', 6000, 20000]];
  const ENV_BANDS = [[35, 120], [120, 300], [300, 1000], [1000, 4000], [4000, 12000]];

  // Where the loudest stretch of the track is: that is the part every place gets judged on.
  function overview(L, R, sr, want = 32) {
    const blk = Math.round(sr * .05), nb = Math.floor(L.length / blk), rms = new Float32Array(nb);
    for (let b = 0; b < nb; b++) { let s = 0; for (let i = b * blk, e = i + blk; i < e; i++) s += L[i] * L[i] + R[i] * R[i]; rms[b] = Math.sqrt(s / (2 * blk)); }
    const w = Math.min(nb, Math.round(want / .05)); let sum = 0, best = -1, at = 0;
    for (let b = 0; b < nb; b++) { sum += rms[b] * rms[b]; if (b >= w) sum -= rms[b - w] * rms[b - w]; if (b >= w - 1 && sum > best * 1.0001) { best = sum; at = b - w + 1; } }
    return {rms, block: .05, start: at * .05, len: w * .05, secs: L.length / sr};
  }

  function analyse(L, R, sr, win) {
    const total = L.length; win = win || overview(L, R, sr);
    const i0 = clamp(Math.round(win.start * sr), 0, total), n = Math.max(1, Math.min(total - i0, Math.round(win.len * sr)));
    const N = 1 << Math.round(Math.log2(sr * .186)), hop = N >> 2, plan = fftPlan(N), half = N / 2, df = sr / N, norm = 2 / (N * plan.ws);
    const psdM = new Float64Array(half + 1), psdS = new Float64Array(half + 1), re = new Float64Array(N), im = new Float64Array(N), re2 = new Float64Array(N), im2 = new Float64Array(N);
    const frames = Math.max(1, Math.floor((n - N) / hop) + 1), fr = [], lo = Math.max(2, Math.round(30 / df)), hi = Math.round(130 / df);
    let peak = 0, sq = 0;
    for (let i = i0; i < i0 + n; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > peak) peak = a; if (b > peak) peak = b; sq += L[i] * L[i] + R[i] * R[i]; }
    const pm = new Float64Array(half + 1), ps = new Float64Array(half + 1);
    for (let f = 0; f < frames; f++) {
      const o = i0 + f * hop;
      for (let i = 0; i < N; i++) { const k = o + i, l = k < total ? L[k] : 0, r = k < total ? R[k] : 0, w = plan.win[i]; re[i] = (l + r) * .5 * w; im[i] = 0; re2[i] = (l - r) * .5 * w; im2[i] = 0; }
      fft(re, im, plan); fft(re2, im2, plan);
      for (let k = 1; k < half; k++) { pm[k] = (re[k] * re[k] + im[k] * im[k]) * norm; ps[k] = (re2[k] * re2[k] + im2[k] * im2[k]) * norm; psdM[k] += pm[k]; psdS[k] += ps[k]; }
      // the bassline: the strongest low peak and everything locked to its harmonic series
      let kb = lo; for (let k = lo; k <= hi; k++) if (pm[k] > pm[kb]) kb = k;
      const a = pm[kb - 1], b = pm[kb], c = pm[kb + 1], den = a - 2 * b + c, f0 = (kb + (den ? clamp(.5 * (a - c) / den, -.5, .5) : 0)) * df;
      const sum = (arr, fc) => { const k = Math.round(fc / df); let s = 0; for (let j = k - 2; j <= k + 2; j++) if (j > 0 && j < half) s += arr[j]; return s; };
      const p1 = sum(pm, f0) + sum(ps, f0), pts = [];
      for (let h = 1; h * f0 <= 2000; h++) { const on = sum(pm, h * f0), ons = sum(ps, h * f0), off = (sum(pm, (h - .5) * f0) + sum(pm, (h + .5) * f0)) / 2, offs = (sum(ps, (h - .5) * f0) + sum(ps, (h + .5) * f0)) / 2; pts.push([h * f0, on - off, ons - offs, on]); }
      fr.push({f0, p1, pts});
    }
    for (let k = 0; k <= half; k++) { psdM[k] /= frames; psdS[k] /= frames; }
    // gather the bassline into twelfth-octave bins from 25 Hz to 2 kHz
    const BN = 78, bassM = new Float64Array(BN), bassS = new Float64Array(BN), bassOn = new Float64Array(BN), bassF = Array.from({length: BN}, (_, j) => 25 * Math.pow(2, j / 12)), maxP1 = Math.max(...fr.map(f => f.p1)), hist = new Map(); let used = 0;
    for (const f of fr) if (f.p1 > maxP1 * .05) { used++; for (const [hz, m, s, on] of f.pts) { const j = Math.round(12 * Math.log2(hz / 25)); if (j >= 0 && j < BN) { bassM[j] += m; bassS[j] += s; bassOn[j] += on; } } const semi = Math.round(12 * Math.log2(f.f0 / 440)); hist.set(semi, (hist.get(semi) || 0) + f.p1); }
    for (let j = 0; j < BN; j++) { const real = bassM[j] > bassOn[j] * .37; bassM[j] = real ? bassM[j] / (used || 1) : 0; bassS[j] = real ? Math.max(0, bassS[j]) / (used || 1) : 0; } // a partial counts when it stands 2 dB clear of what lies between the partials
    const semi = [...hist].sort((a, b) => b[1] - a[1])[0], lowHz = semi ? 440 * Math.pow(2, semi[0] / 12) : 0;

    // envelopes of five bands at 5 ms, for the kick and the gaps between kicks
    const M = new Float32Array(n); for (let i = 0; i < n; i++) M[i] = (L[i0 + i] + R[i0 + i]) * .5;
    const eh = Math.round(sr * .005), en = Math.floor(n / eh), env = ENV_BANDS.map(([a, b]) => { const y = chainRun(M, [['highpass', a, .71], ['highpass', a, .71], ['lowpass', b, .71], ['lowpass', b, .71]], sr), e = new Float32Array(en); for (let j = 0; j < en; j++) { let s = 0; for (let i = j * eh, x = i + eh; i < x; i++) s += y[i] * y[i]; e[j] = s / eh; } return e; });
    const envHopS = () => eh / sr;
    const low = env[0], maxLow = low.reduce((a, b) => Math.max(a, b), 0), onsets = [];
    for (let j = 6; j < en - 10; j++) { const rise = dB(low[j + 2] + maxLow * 1e-4) - dB(low[j - 3] + maxLow * 1e-4); if (rise < 5 || low[j + 4] < maxLow * .05) continue; let top = true; for (let k = -12; k <= 12 && top; k++) if (k && j + k > 5 && j + k < en - 10 && dB(low[j + k + 2] + maxLow * 1e-4) - dB(low[j + k - 3] + maxLow * 1e-4) > rise) top = false; if (top && (!onsets.length || j - onsets[onsets.length - 1] > 24)) onsets.push(j); }
    const pct = (arr, q) => { const s = Float64Array.from(arr).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
    const rise = new Float32Array(en); for (let j = 3; j < en - 2; j++) rise[j] = Math.max(0, dB(low[j + 2] + maxLow * 1e-4) - dB(low[j - 3] + maxLow * 1e-4));
    let bpm = null, kicks = [];
    if (onsets.length >= 8) {
      const mean = low.reduce((a, b) => a + b, 0) / en, ac = lag => { let s = 0; for (let j = lag; j < en; j++) s += (low[j] - mean) * (low[j - lag] - mean); return s / (en - lag); }; let best = -Infinity;
      for (let b = 85; b <= 180; b += .25) { const T = 60 / b / envHopS(); if (4 * T >= en * .6) continue; const s = ac(Math.round(T)) + ac(Math.round(2 * T)) + ac(Math.round(4 * T)); if (s > best) { best = s; bpm = b; } }
      // follow the beat: best phase for the grid, then snap each beat to the nearest rise
      const T = 60 / bpm / envHopS(); let ph = 0, top = -1;
      for (let p = 0; p < Math.ceil(T); p++) { let s = 0; for (let x = p; x < en; x += T) s += rise[Math.round(x)] || 0; if (s > top) { top = s; ph = p; } }
      for (let x = ph; x < en - 10; x += T) { let at = Math.round(x), bestR = 0; for (let k = -3; k <= 3; k++) { const j = Math.round(x) + k; if (j > 5 && j < en && rise[j] > bestR) { bestR = rise[j]; at = j; } } if (bestR >= 3) { kicks.push(at); x = at; } }
    }
    if (kicks.length < 8) kicks = onsets;
    // a kick reads when it rises out of what came before it and is not dwarfed by the loud hits in the same band
    const contrast = env.map(e => { const v = [], loud = dB(pct(e, .9) + 1e-12); for (const j of kicks) { let pk = 0; for (let k = j - 2; k <= j + 8; k++) if (k >= 0 && k < en) pk = Math.max(pk, e[k]); const before = []; for (let k = j - 30; k <= j - 4; k++) if (k >= 0) before.push(e[k]); if (before.length > 6) v.push(Math.min(dB(pk + 1e-12) - dB(pct(before, .5) + 1e-12), dB(pk + 1e-12) - loud + 10)); } return v.length >= 4 ? pct(v, .3) : null; });
    const m = {sr, N, df, psdM, psdS, bassM, bassS, bassF, lowHz, lowNote: lowHz ? noteOf(lowHz) : null, env, envHop: eh / sr, onsets: onsets.length, kicks: kicks.length, contrast, bpm,
      peak: dB(peak * peak), rms: dB(sq / (2 * n)), start: i0 / sr, len: n / sr, secs: total / sr};
    m.crest = m.peak - m.rms;
    const st = hear(m, compile(PLACES[0], sr));
    m.lufs = st.lufs; m.corr = (st.pM - st.pS) / (st.pM + st.pS + 1e-30);
    return m;
  }

  // What a place does to the measured track: loudness, the balance of six bands, the bassline, mono loss.
  function hear(m, cp) {
    const half = m.psdM.length - 1, kw = KW(m.sr), o = {groups: {}, mono: {}};
    if (!cp.h2 || cp.h2.length !== half + 1) { cp.h2 = new Float64Array(half + 1); cp.w2 = new Float64Array(half + 1); cp.kw = new Float64Array(half + 1); for (let k = 1; k <= half; k++) { const r = respond(cp, k * m.df); cp.h2[k] = r.h2; cp.w2[k] = r.w * r.w; cp.kw[k] = mag2(kw[0], k * m.df, m.sr) * mag2(kw[1], k * m.df, m.sr); } }
    let z = 0, zFull = 0, pM = 0, pS = 0, tot = 0; const g = GROUPS6.map(() => 0), gFull = GROUPS6.map(() => 0);
    for (let k = 1; k < half; k++) {
      const f = k * m.df, a = m.psdM[k] * cp.h2[k], b = m.psdS[k] * cp.h2[k], p = a + cp.w2[k] * b; z += p * cp.kw[k]; zFull += (a + b) * cp.kw[k]; pM += a; pS += b; tot += p;
      for (let i = 0; i < 6; i++) if (f >= GROUPS6[i][2] && f < GROUPS6[i][3]) { g[i] += p; gFull[i] += a + b; }
    }
    o.pM = pM; o.pS = pS; o.power = dB(tot); o.lufs = -0.691 + dB(2 * z); o.monoLoss = dB(z) - dB(zFull);
    GROUPS6.forEach(([id], i) => { o.groups[id] = g[i] / (tot + 1e-30); o.mono[id] = dB(g[i] + 1e-30) - dB(gFull[i] + 1e-30); });
    let bz = 0, bl = 0, bFull = 0;
    for (let j = 0; j < m.bassF.length; j++) { const f = m.bassF[j], r = respond(cp, f), k = mag2(kw[0], f, m.sr) * mag2(kw[1], f, m.sr), a = (m.bassM[j] + r.w * r.w * m.bassS[j]) * r.h2 * k; bz += a; if (f < 200) { bl += a; bFull += (m.bassM[j] + m.bassS[j]) * r.h2 * k; } }
    o.bass = dB(bz + 1e-30) - dB(z + 1e-30); // the bassline under the whole mix, in this place
    o.bassMono = bl > z * .01 ? dB(bl + 1e-30) - dB(bFull + 1e-30) : 0; // only where this place plays the bass at all
    // the kick: the best contrast among the bands this place still plays
    const gains = ENV_BANDS.map(([a, b]) => dB(respond(cp, Math.sqrt(a * b)).h2)), top = Math.max(...gains); let kc = null, kb = -1;
    m.contrast.forEach((c, i) => { if (i < 4 && c != null && gains[i] > top - 14 && (kc == null || c > kc)) { kc = c; kb = i; } });
    o.kick = kc; o.kickBand = kb;
    // gaps in the low end, after every room and echo in the chain has filled them
    let e = Float64Array.from(m.env[0]); const hopS = m.envHop;
    for (const s of cp.stages) {
      if (s.k === 'room') { const er = s.er == null ? .2 : s.er, w2 = lin(s.wet) ** 2, a = Math.exp(-13.816 * hopS / s.rt[0]), y = new Float64Array(e.length); let acc = 0; for (let i = 0; i < e.length; i++) { acc = a * acc + (1 - a) * e[i]; y[i] = e[i] * (1 + w2 * er) + w2 * (1 - er) * (s.rt[0] / s.rt[1]) * acc; } e = y; }
      else if (s.k === 'slap' && s.lp <= 500) { const d = Math.round(s.ms / 1000 / hopS), g2 = lin(s.g) ** 2, y = Float64Array.from(e); for (let i = d; i < e.length; i++) y[i] += g2 * e[i - d]; e = y; }
    }
    const sm = new Float64Array(e.length); for (let i = 0; i < e.length; i++) { let s = 0, c = 0; for (let k = -2; k <= 2; k++) if (i + k >= 0 && i + k < e.length) { s += e[i + k]; c++; } sm[i] = s / c; }
    const sorted = sm.slice().sort(), q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    o.depth = dB(q(.95) + 1e-12) - dB(q(.1) + 1e-12);
    return o;
  }
  // The deepest gap a place allows: a tight kick on every beat, sent through the same rooms.
  const TIGHT = new Map();
  function tight(place, bpm = 126) {
    const key = place.id + '/' + Math.round(bpm); if (TIGHT.has(key)) return TIGHT.get(key);
    const hop = .005, n = 2400, e = new Float32Array(n), beat = 60 / bpm / hop; for (let i = 0; i < n; i++) e[i] = Math.exp(-((i % beat) * hop) / .045) + .03;
    const d = hear({sr: 44100, df: 44100 / 8192, psdM: new Float64Array(3), psdS: new Float64Array(3), bassF: [], bassM: [], bassS: [], contrast: [], env: [e], envHop: hop}, compile(place, 44100)).depth;
    TIGHT.set(key, d); return d;
  }

  // ---------------------------------------------------------------- verdicts
  const FIXES = {
    harmonics: ['Give the bassline harmonics', 'Saturator on the bass (Analog Clip, Drive 6–10 dB, Dry/Wet to taste), or duplicate the bass an octave up, band-pass it 200–900 Hz and blend it in around −12 dB. Stay in the phone place while you turn it up, and stop when the note comes back.'],
    click: ['Give the kick a click', 'Layer a 10 ms tick on the kick (a rim, a closed hat or noise, 2–5 kHz), or lift the kick\'s own attack: EQ Eight bell +3 dB at 3 kHz, or Drum Buss with Transients up. The body stays as it is.'],
    basswide: ['Put the low end in the centre', 'Utility on the bass bus with Bass Mono at 120 Hz, and take any chorus, widener or stereo reverb off the sub layer. Club subs and small speakers are mono: what differs between left and right down there cancels.'],
    wide: ['Tame the widener', 'Something wide is out of phase and disappears in mono. Lower the widener or Haas delay on it, or keep a mono copy of the part in the centre under the wide one. Check with Utility set to Mono.'],
    tail: ['Open gaps in the low end', 'Shorten the kick\'s tail (under about 200 ms at 125 BPM and up), shorten the bass notes, or sidechain the bass harder: Compressor, ratio ∞:1, release 80–120 ms. A room adds its own tail to every kick, so leave it some space to fill.'],
    infra: ['Cut what no speaker plays', 'EQ Eight high-pass at 25–30 Hz, 24 dB/oct or steeper, on the sub or the master. Nothing in a club, a car or a kitchen reproduces it, and the limiter still has to carry it.'],
    mud: ['Clear the low mids', 'High-pass pads, chords and reverb returns at 150–250 Hz, and dip 2–4 dB around 130–250 Hz on whatever is left holding a note there.'],
    harsh: ['Soften 2–5 kHz', 'A club rig\'s horns are loudest exactly there. Find the part that owns that band (a lead, a clap, a hat bus) and dip 2–3 dB with a wide bell, or use a dynamic EQ that only works on the loud hits.'],
    dull: ['Open the top', 'There is little above 5 kHz to lose. Raise the hats and percussion bus, or add a high shelf of 2–3 dB at 8 kHz on the tops only.'],
    thin: ['Add weight under 120 Hz', 'Less of the energy sits in the bottom two octaves than a big system expects. Turn the kick and sub up against everything else, and check they are not being high-passed twice.'],
    heavy: ['Take weight out of the bottom', 'Almost all of the energy is under 120 Hz. On a rig that already adds 7 dB down there, the limiter will pump and the rest of the track gets turned down with it.'],
  };
  const f1 = x => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1), n1 = x => Math.abs(x).toFixed(1);
  const lowShare = h => h.groups.sub + h.groups.bass;
  const idx = (m, a, b, c, d) => { let x = 0, y = 0; for (let k = 1; k < m.psdM.length - 1; k++) { const f = k * m.df, p = m.psdM[k] + m.psdS[k]; if (f >= a && f < b) x += p; if (f >= c && f < d) y += p; } return dB(x + 1e-30) - dB(y + 1e-30); };
  // Each check looks at one thing in one place and returns a finding, or nothing.
  const CHECKS = {
    bass(m, h, st, p) {
      const drop = h.bass - st.bass;
      if (drop > -12 && h.bass > -24) return {ok: `The bassline is ${n1(h.bass)} dB under the mix here (${n1(st.bass)} dB in the studio). The note still reads.`};
      const gone = drop < -22 || h.bass < -34;
      return {sev: gone ? 2 : 1, pen: gone ? 34 : 16, fix: 'harmonics', val: h.bass, unit: 'dB', head: gone ? 'The bassline is gone' : 'The bassline is thin',
        text: `It sits ${n1(h.bass)} dB under the rest of the mix here, against ${n1(st.bass)} dB in the studio. ${p.id === 'bt' ? 'The speaker stops at 62 Hz' : 'This speaker plays nothing down there'}, and your bass has ${gone ? 'almost nothing' : 'little'} above it${m.lowNote ? ` (the low end is centred on ${m.lowNote}, ${m.lowHz.toFixed(0)} Hz)` : ''}.`};
    },
    kick(m, h) {
      if (h.kick == null) return null;
      if (h.kick >= 7) return {ok: `The kick stands ${n1(h.kick)} dB clear of what is around it in the band this speaker plays.`};
      const gone = h.kick < 3.5;
      return {sev: gone ? 2 : 1, pen: gone ? 26 : 12, fix: 'click', val: h.kick, unit: 'dB', head: gone ? 'The kick disappears' : 'The kick is faint',
        text: `In the band this speaker plays, the kick only rises ${n1(h.kick)} dB above what is already there. Its body is below the speaker and it has ${gone ? 'no' : 'not much'} click to stand in for it.`};
    },
    mono(m, h, st, p) {
      const out = [], wide = Math.min(h.mono.mid, h.mono.pres, h.mono.lowmid), lowOnly = p.chain.some(s => s.k === 'width' && s.below && s.w === 1);
      if (h.bassMono < -1.5) { const bad = h.bassMono < -3; out.push({sev: bad ? 2 : 1, pen: bad ? 28 : 15, fix: 'basswide', val: h.bassMono, unit: 'dB', head: bad ? 'The bass cancels in mono' : 'The bass loses level in mono', text: `Summed to mono the bassline drops ${n1(h.bassMono)} dB. ${lowOnly ? 'The subs here are mono, so that is what the room gets.' : 'This place is mono, so that is all of it.'} Its left and right channels are out of step with each other.`}); }
      if (!lowOnly && wide < -2) { const bad = wide < -5, which = h.mono.mid === wide ? 'mids' : h.mono.pres === wide ? 'presence band' : 'low mids'; out.push({sev: bad ? 2 : 1, pen: bad ? 22 : 10, fix: 'wide', val: wide, unit: 'dB', head: bad ? 'A wide part cancels' : 'A wide part gets quieter', text: `The ${which} lose ${n1(wide)} dB when left and right are folded together here. Something in that band is wide by being out of phase.`}); }
      return out.length ? out : {ok: 'Folding left and right together costs less than 1.5 dB anywhere. Nothing here depends on being wide.'};
    },
    punch(m, h, st, p) {
      const best = tight(p, m.bpm || 126), short = best - h.depth;
      if (short < 3.5) return {ok: `The low end falls ${n1(h.depth)} dB between hits after this room (${n1(st.depth)} dB in the studio). The tightest kick there is manages ${n1(best)} dB here, so the kick has somewhere to land.`};
      const bad = short > 6;
      return {sev: bad ? 2 : 1, pen: bad ? 28 : 17, fix: 'tail', val: h.depth, unit: 'dB', head: bad ? 'The low end is one continuous note' : 'The low end smears',
        text: `Between hits the low end only falls ${n1(h.depth)} dB in this room, where a tight kick and bass manage ${n1(best)} dB. It was ${n1(st.depth)} dB in the studio, and ${p.id === 'booth' ? 'the late bass from the floor' : `the room's ${p.chain.find(s => s.k === 'room').rt[0]} s of bass reverb`} filled what gap there was.`};
    },
    groove(m, h, st, p) {
      const best = tight(p, m.bpm || 126), short = best - h.depth;
      if (short < 3.5) return {ok: `Through the wall the low end still moves ${n1(h.depth)} dB between hits (the most this wall allows is ${n1(best)} dB). From here it sounds like a kick drum, not a hum.`};
      const bad = short > 6;
      return {sev: bad ? 2 : 1, pen: bad ? 32 : 20, fix: 'tail', val: h.depth, unit: 'dB', head: bad ? 'From here it is a hum' : 'The groove is blurred',
        text: `All that gets through a wall is the low end, and yours only moves ${n1(h.depth)} dB between hits by the time it arrives, where a tight kick and bass manage ${n1(best)} dB. The kick and the bass have run together.`};
    },
    infra(m) {
      let a = 0, t = 0; for (let k = 1; k < m.psdM.length - 1; k++) { const p = m.psdM[k] + m.psdS[k]; t += p; if (k * m.df < 30) a += p; }
      const share = a / t;
      if (share < .02) return {ok: `${(share * 100).toFixed(1)}% of the energy is under 30 Hz. Nothing wasted.`};
      const bad = share > .08;
      return {sev: bad ? 2 : 1, pen: bad ? 18 : 8, fix: 'infra', val: share * 100, unit: '%', head: 'Energy no speaker plays',
        text: `${(share * 100).toFixed(0)}% of the track's energy is below 30 Hz. This rig is high-passed at 32 Hz, so the room never hears it, and removing it gives back about ${n1(dB(1 - share))} dB of headroom.`};
    },
    lows(m, h, st, p) {
      const s = lowShare(st);
      if (s < .35) return {sev: s < .2 ? 2 : 1, pen: s < .2 ? 22 : 10, fix: 'thin', val: s * 100, unit: '%', head: 'Light on a big system', text: `${(s * 100).toFixed(0)}% of the energy is under 120 Hz. Club records usually sit between 55 and 80%.${p.id === 'sub' ? ' At the stack that is all there is to hear.' : ''}`};
      if (s > .92) return {sev: 1, pen: 10, fix: 'heavy', val: s * 100, unit: '%', head: 'Almost all bottom', text: `${(s * 100).toFixed(0)}% of the energy is under 120 Hz, before this place adds its own. Club records usually sit between 55 and 80%.`};
      return {ok: `${(s * 100).toFixed(0)}% of the energy is under 120 Hz, inside the usual 55–80% for club records${s > .8 ? ' (at the heavy end)' : s < .55 ? ' (at the light end)' : ''}.`};
    },
    boom(m, h, st, p) {
      const v = idx(m, 110, 260, 260, 2600);
      if (v < 6) return {ok: `The low mids (110–260 Hz) sit ${f1(v)} dB against the mids. This place adds to that band, and there is room for it.`};
      const bad = v > 10;
      return {sev: bad ? 2 : 1, pen: bad ? 24 : 14, fix: 'mud', val: v, unit: 'dB', head: bad ? 'It booms' : 'Low mids build up',
        text: `110–260 Hz is ${f1(v)} dB against the mids in your mix, and ${p.id === 'car' ? 'the door speakers add 5 dB at 130 Hz' : 'the back wall adds 3 dB at 140 Hz'} on top.`};
    },
    harsh(m) {
      const v = idx(m, 2000, 5000, 250, 2000);
      if (v < -4) return {ok: `2–5 kHz sits ${f1(v)} dB against the mids. Loud, that band is where a rig hurts, and yours has room.`};
      const bad = v > -1;
      return {sev: bad ? 2 : 1, pen: bad ? 20 : 9, fix: 'harsh', val: v, unit: 'dB', head: bad ? 'Harsh when loud' : 'Forward at 2–5 kHz', text: `2–5 kHz is ${f1(v)} dB against the mids. Most club records are 8 to 12 dB down there, and the horns add 2–3 dB more.`};
    },
    tops(m) {
      const v = idx(m, 5000, 20000, 250, 2000);
      if (v > -22) return {ok: `The top (above 5 kHz) is ${f1(v)} dB against the mids. After 9 dB of air loss there is still something left.`};
      const bad = v < -28;
      return {sev: bad ? 2 : 1, pen: bad ? 18 : 8, fix: 'dull', val: v, unit: 'dB', head: bad ? 'No top end reaches the back' : 'The top end is fragile', text: `Above 5 kHz your mix is already ${f1(v)} dB against the mids. Sixty metres of air takes another 9 dB.`};
    },
  };
  const VERDICT = s => s >= 85 ? 'Survives' : s >= 62 ? 'Changes' : 'Falls apart';

  // The whole report: one entry per place, an overall score, and the fixes ranked by how much they buy.
  function report(m) {
    const cps = PLACES.map(p => compile(p, m.sr)), hs = cps.map(cp => hear(m, cp)), st = hs[0], places = [];
    PLACES.forEach((p, i) => {
      const h = hs[i], found = [], good = [];
      for (const c of p.checks) { const r = CHECKS[c](m, h, st, p); for (const x of Array.isArray(r) ? r : r ? [r] : []) x.ok ? good.push({check: c, text: x.ok}) : found.push({check: c, ...x}); }
      found.sort((a, b) => b.pen - a.pen);
      const score = p.id === 'studio' ? null : Math.round(clamp(100 - found.reduce((s, f) => s + f.pen, 0), 4, 100));
      places.push({id: p.id, name: p.name, score, verdict: score == null ? '' : VERDICT(score), found, good, loud: h.lufs - st.lufs, lufs: h.lufs, groups: h.groups, bass: h.bass, kick: h.kick, depth: h.depth, monoLoss: h.monoLoss});
    });
    const scored = places.filter(p => p.score != null), overall = Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length), by = new Map();
    for (const p of scored) for (const f of p.found) { const e = by.get(f.fix) || {id: f.fix, title: FIXES[f.fix][0], how: FIXES[f.fix][1], gain: 0, places: []}; e.gain += f.pen; if (!e.places.includes(p.name)) e.places.push(p.name); by.set(f.fix, e); }
    const fixes = [...by.values()].sort((a, b) => b.gain - a.gain).map(f => ({...f, points: Math.round(f.gain / scored.length)}));
    return {places, overall, verdict: VERDICT(overall), fixes, lufs: m.lufs, peak: m.peak, crest: m.crest, corr: m.corr, lowNote: m.lowNote, lowHz: m.lowHz, bpm: m.bpm, start: m.start, len: m.len, secs: m.secs};
  }
  const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function markdown(rep, name, ref, refName) {
    const out = [`# Outside: ${name}`, '', `Translation score **${rep.overall} / 100** (${rep.verdict.toLowerCase()}), measured on ${clock(rep.start)}–${clock(rep.start + rep.len)}, the loudest ${Math.round(rep.len)} s.`,
      `${rep.lufs.toFixed(1)} LUFS, peak ${rep.peak.toFixed(1)} dBFS, stereo correlation ${rep.corr.toFixed(2)}${rep.lowNote ? `, low end centred on ${rep.lowNote} (${rep.lowHz.toFixed(0)} Hz)` : ''}${rep.bpm ? `, about ${Math.round(rep.bpm)} BPM` : ''}.`, ''];
    if (ref) out.push(`Reference: ${refName}, ${ref.overall} / 100.`, '');
    if (rep.fixes.length) { out.push('## Fix first', ''); rep.fixes.forEach((f, i) => out.push(`${i + 1}. **${f.title}** (about +${f.points} overall; ${f.places.join(', ')}). ${f.how}`)); out.push(''); }
    out.push('## Place by place', '', `| Place | Score |${ref ? ' Reference |' : ''} Loudness | What happens |`, `|---|---|${ref ? '---|' : ''}---|---|`);
    rep.places.forEach((p, i) => { if (p.score != null) out.push(`| ${p.name} | ${p.score} |${ref ? ` ${ref.places[i].score} |` : ''} ${f1(p.loud)} LU | ${p.found.length ? p.found.map(f => `${f.head}. ${f.text}`).join(' ') : 'Nothing breaks. ' + p.good.map(g => g.text).join(' ')} |`); });
    out.push('', 'Every place is a model built from typical figures, not a measurement of a real room or device. See OUTSIDE.md.');
    return out.join('\n');
  }

  function wav(L, R, sr) {
    const n = L.length, b = new DataView(new ArrayBuffer(44 + n * 4)), s = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); b.setUint32(4, 36 + n * 4, true); s(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 2, true); b.setUint32(24, sr, true); b.setUint32(28, sr * 4, true); b.setUint16(32, 4, true); b.setUint16(34, 16, true); s(36, 'data'); b.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { b.setInt16(44 + i * 4, Math.round(clamp(L[i], -1, 1) * 32767), true); b.setInt16(46 + i * 4, Math.round(clamp(R[i], -1, 1) * 32767), true); }
    return new Uint8Array(b.buffer);
  }

  return {tight, PLACES, GROUPS, GROUPS6, ENV_BANDS, FIXES, PLANTED, PA, placeById, rng, dB, lin, clamp, noteOf, clock, biquad, mag2, coefs, run, chainRun, rtAt, roomColour, compile, respond, impulse, ambience, demo, fftPlan, fft, overview, analyse, hear, report, markdown, wav, VERDICT};
})();
if (typeof module !== 'undefined') module.exports = OUTSIDE;
