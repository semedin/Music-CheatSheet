/* transplant-engine:start */
// The transplant: a reference's arrangement (TM model) rebuilt on your loop (TL parts). For every bar it decides
// which of your parts play, from the reference's lanes; then it rebuilds every move the reference makes on your
// own notes (rolls on your clap, stutters on your bars, throws on the hit that's there, filter sweeps as CC74 on
// the parts they filter); then it measures how close the result is to the reference's shape.
// Pure JavaScript, no DOM: transplant-src/test.mjs runs this exact code.
const TE = (() => {
'use strict';
const {clamp, LK} = TM;
const fin = Number.isFinite;
const EPS = 1e-6;
const GROUP_OF = {kick: 'drums', clap: 'drums', hats: 'drums', perc: 'drums', bass: 'bass', lead: 'synths', chords: 'synths', pad: 'synths', vox: 'synths', fx: 'synths'};
const TARGET = {drums: ['drums'], music: ['bass', 'synths'], synths: ['synths'], mix: ['drums', 'bass', 'synths', 'fx']};
const TARGET_NAME = {drums: 'the drums', music: 'the music (bass and synths)', synths: 'the synths (everything but drums and bass)', mix: 'the whole mix'};
const W = {kick: 3, clap: 2.5, hats: 1.5, perc: 1, bass: 2.5, lead: 1.5, chords: 1.5, pad: 1, vox: 1, fx: 0.6};
// which part of a lane is the main layer: the hook first, then the chords, then the pad; in breaks and intros the pad leads
const RANK = {lead: 0, chords: 1, pad: 2, vox: 3, fx: 4, hats: 0, perc: 1, kick: 0, clap: 0, bass: 0};
const RANK_SOFT = {pad: 0, chords: 1, lead: 2, vox: 3, fx: 4, hats: 0, perc: 1, kick: 0, clap: 0, bass: 0};
const ENTRIES = [
  {k: 'auto', name: 'Auto (layered)', text: 'Follows its lane; if other parts share the lane, it comes in where the reference gets fuller'},
  {k: 'lane', name: 'With the lane', text: 'Plays wherever the reference lane plays'},
  {k: 'layer2', name: 'Second layer', text: 'Only where the lane is in its fuller half'},
  {k: 'layer3', name: 'Third layer', text: 'Only where the lane is at its fullest third'},
  {k: 'drops', name: 'Drops only', text: 'Where the lane plays, in drops'},
  {k: 'breaks', name: 'Breaks only', text: 'Where the lane plays, in breaks'},
  {k: 'always', name: 'Every bar', text: 'Plays from the first bar to the last'},
  {k: 'never', name: 'Never', text: 'Left out'}];
const TOUCHES = [
  {k: 'layers', name: 'Stack layers by fullness', text: 'When several of your parts follow one lane, the main part plays with the lane and the others come in where the reference is fuller, on phrase lines.'},
  {k: 'restart', name: 'Start each section on bar 1 of your loop', text: 'Every section begins at the top of your loop, so an 8-bar progression always starts on its first chord.'},
  {k: 'holdBreaks', name: 'Hold the chords in breaks', text: 'Short chord stabs become held chords in breaks, each one ringing until the next.'},
  {k: 'fills', name: 'Phrase-end fills', text: 'In grooves and drops, the last bar of every 8 gets a fill from your own drums: the kick leaves beat 4, or the clap adds a pickup. Skipped where the reference already does something.'},
  {k: 'impacts', name: 'Land every drop', text: 'A crash and a sub boom on the first beat of each drop, where the reference has none of its own.'}];
const defaults = () => ({touches: {layers: true, restart: true, holdBreaks: true, fills: true, impacts: true}, cats: Object.fromEntries(TM.CATS.map(c => [c, true])), off: {}});

// rank of each value, scaled to 0–1 (ties share their average rank)
function rankNorm(vals) {
  const n = vals.length; if (n <= 1) return vals.map(() => 1);
  const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]), r = new Float64Array(n);
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && Math.abs(vals[idx[j + 1]] - vals[idx[i]]) < 1e-9) j++; const avg = (i + j) / 2; for (let q = i; q <= j; q++) r[idx[q]] = avg / (n - 1); i = j + 1; }
  return Array.from(r);
}
function spearman(a, b) {
  const n = Math.min(a.length, b.length); if (n < 3) return 0;
  const ra = rankNorm(Array.from(a).slice(0, n)), rb = rankNorm(Array.from(b).slice(0, n)), ma = ra.reduce((s, v) => s + v, 0) / n, mb = rb.reduce((s, v) => s + v, 0) / n;
  let x = 0, ya = 0, yb = 0; for (let i = 0; i < n; i++) { x += (ra[i] - ma) * (rb[i] - mb); ya += (ra[i] - ma) ** 2; yb += (rb[i] - mb) ** 2; }
  return ya && yb ? x / Math.sqrt(ya * yb) : 0;
}
const hzToCC = hz => clamp(Math.round(127 * Math.log(Math.max(26, Math.min(19900, hz)) / 26) / Math.log(19900 / 26)), 0, 127);
const hzText = f => !fin(f) ? '–' : f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`;
const bb = TM.barBeat;
// MIDI track names are ASCII: accents dropped, symbols spelled out
const ascii = s => String(s).replace(/·/g, '-').replace(/±/g, '+/-').replace(/♯/g, '#').replace(/♭/g, 'b').normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim() || 'Track';
const list = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

// ---------- 1. which bars each part plays ----------
// eight-bar phrases from each section start; a tail shorter than 4 bars joins the phrase before it
function phrasesOf(model) {
  const out = [];
  for (const s of model.sections) for (let a = s.start; a < s.end; a += 8) {
    const e = Math.min(s.end, a + 8), last = out[out.length - 1];
    if (e - a < 4 && last && last.sec === s) last.end = e; else out.push({start: a, end: e, sec: s});
  }
  return out;
}
function sectionIndex(model) { const s = new Int16Array(model.bars); model.sections.forEach((x, i) => { for (let b = x.start; b < x.end; b++) s[b] = i; }); return s; }
function laneDensity(model, lane) {
  const on = model.on[lane], bars = [], lv = [], tn = [];
  for (let b = 0; b < model.bars; b++) if (on[b]) { bars.push(b); lv.push(model.barMean[lane][b]); tn.push(model.tensionBar[b]); }
  const d = new Float32Array(model.bars), rl = rankNorm(lv), rt = rankNorm(tn);
  bars.forEach((b, i) => { d[b] = 0.55 * rl[i] + 0.45 * rt[i]; });
  return d;
}
function activeBars(model, loop, opts, overrides) {
  const bars = model.bars, secOf = sectionIndex(model), out = new Map();
  const soft = b => ['Break', 'Intro', 'Outro'].includes(model.sections[secOf[b]].label);
  const byLane = new Map();
  for (const p of loop.parts) { if (!byLane.has(p.follow)) byLane.set(p.follow, []); byLane.get(p.follow).push(p); }
  for (const [lane, ps] of byLane) {
    const on = model.on[lane] || new Uint8Array(bars), dens = laneDensity(model, lane);
    // the layered parts of this lane, per bar: their rank among the ranks present
    const layered = ps.filter(p => p.entry === 'auto' && opts.touches.layers);
    // open hats and rides come in after the closed hats; percussion between them
    const rankOf = (p, b) => p.role === 'hats' ? (['ohh', 'ride'].includes(p.voice) ? 2 : 0) : p.role === 'perc' ? 1 : (soft(b) ? RANK_SOFT : RANK)[p.role] ?? 2;
    const layerOn = new Map(layered.map(p => [p.id, new Uint8Array(bars)]));
    if (layered.length) {
      // Layers are decided per phrase (8 bars from each section start), so a layer always enters on a phrase line.
      // With R ranks present, the layer of rank r plays a phrase when the lane's fullness there is at least r / R;
      // the main layer plays wherever the lane does, and a layer only plays where every layer below it does.
      // fullness is ranked across the lane's phrases, so with three ranks the third plays in the fullest third of them
      const phs = phrasesOf(model).map(ph => { const onBars = []; for (let b = ph.start; b < ph.end; b++) if (on[b]) onBars.push(b); return {onBars, d: onBars.length ? onBars.reduce((s, b) => s + dens[b], 0) / onBars.length : 0}; }).filter(p => p.onBars.length);
      const rk = rankNorm(phs.map(p => p.d)); phs.forEach((p, i) => { p.q = phs.length > 1 ? rk[i] : 1; });
      for (const ph of phs) {
        const onBars = ph.onBars, d = ph.q, b0 = onBars[0];
        const ranks = [...new Set(layered.map(p => rankOf(p, b0)))].sort((x, y) => x - y);
        let open = true;
        for (const r of ranks) {
          const i = ranks.indexOf(r), plays = open && (i === 0 || d >= i / ranks.length - 1e-9);
          if (!plays) open = false;
          for (const p of layered) if (rankOf(p, b0) === r && plays) for (const b of onBars) layerOn.get(p.id)[b] = 1;
        }
      }
    }
    for (const p of ps) {
      const a = new Uint8Array(bars), why = new Uint8Array(bars);
      for (let b = 0; b < bars; b++) {
        const lab = model.sections[secOf[b]].label;
        let v;
        switch (p.entry) {
          case 'never': v = 0; break;
          case 'always': v = 1; break;
          case 'drops': v = on[b] && lab === 'Drop'; break;
          case 'breaks': v = on[b] && lab === 'Break'; break;
          case 'layer2': v = on[b] && dens[b] >= 0.5; break;
          case 'layer3': v = on[b] && dens[b] >= 0.667; break;
          case 'lane': v = on[b]; break;
          default: v = layerOn.has(p.id) ? layerOn.get(p.id)[b] : on[b];
        }
        a[b] = v ? 1 : 0;
        why[b] = v ? 1 : on[b] ? 2 : 0;            // 1 plays, 2 the lane plays but this layer waits, 0 the lane is out
      }
      const ov = overrides && overrides[p.id];
      if (ov) for (const [b, v] of Object.entries(ov)) { const i = +b; if (i >= 0 && i < bars) { a[i] = v ? 1 : 0; why[i] = v ? 3 : 4; } }
      out.set(p.id, {on: a, why});
    }
  }
  return out;
}

// ---------- 2. your notes, laid out ----------
function layOut(model, loop, p, act, opts, secOf) {
  const bars = model.bars, L = loop.bars, notes = [];
  const anchor = b => opts.touches.restart ? model.sections[secOf[b]].start : 0;
  const loopBar = b => ((b - anchor(b)) % L + L) % L;
  const secEnd = b => model.sections[secOf[b]].end;
  for (let b = 0; b < bars; b++) {
    if (!act.on[b]) continue;
    let e = b; while (e < bars && act.on[e]) e++;       // the active run [b, e)
    for (let x = b; x < e; x++) {
      // a note rings until the part stops, or until the loop starts again at the next section
      const lb = loopBar(x), w0 = lb * 4, w1 = w0 + 4, stop = Math.min(e, opts.touches.restart ? secEnd(x) : e) * 4;
      for (const n of p.notes) if (n.t >= w0 - EPS && n.t < w1 - EPS) {
        const t = x * 4 + (n.t - w0), d = Math.min(n.d, stop - t);
        if (d > 0.01) notes.push({t, d, n: n.n, v: n.v});
      }
      // entering mid-loop: a held note that started earlier in the loop is struck again, so a pad doesn't arrive silent
      if (x === b && lb > 0) for (const n of p.notes) {
        const end = n.t + n.d;
        if (n.t < w0 - EPS && end > w0 + 0.5) { const d = Math.min(end - w0, stop - x * 4); if (d > 0.25) notes.push({t: x * 4, d, n: n.n, v: Math.round(n.v * 0.92), tag: 'carry'}); }
      }
    }
    b = e - 1;
  }
  return notes;
}

// ---------- 3. the moves, on your parts ----------
function cut(notes, k0, k1) {
  const out = [];
  for (const n of notes) {
    if (n.t >= k0 - EPS && n.t < k1 - EPS) continue;
    if (n.t < k0 && n.t + n.d > k0 + EPS) { const d = k0 - n.t; if (d > 0.02) out.push(Object.assign({}, n, {d})); continue; }
    out.push(n);
  }
  return out;
}
function partsFor(target, P) { const g = TARGET[target] || TARGET.mix; return P.filter(x => g.includes(x.group) || (target === 'mix')); }

function plan(model, loop, opts = defaults(), overrides = {}) {
  opts = Object.assign(defaults(), opts, {touches: Object.assign(defaults().touches, opts.touches || {}), cats: Object.assign(defaults().cats, opts.cats || {}), off: opts.off || {}});
  const bars = model.bars, beats = bars * 4, secOf = sectionIndex(model);
  const act = activeBars(model, loop, opts, overrides);
  const P = loop.parts.map(p => ({part: p, id: p.id, role: p.role, group: GROUP_OF[p.role] || 'synths', act: act.get(p.id), notes: layOut(model, loop, p, act.get(p.id), opts, secOf), cc: [], pb: []}));
  const byId = new Map(P.map(x => [x.id, x]));
  const log = [], fx = [], mutes = [], tags = [], touches = [];
  const tag = (type, k0, k1, what, extra = {}) => tags.push(Object.assign({type, k0, k1, what}, extra));
  const moves = model.moves.map(m => Object.assign({}, m, {enabled: opts.cats[m.cat] !== false && !opts.off[m.id]}));
  const sounding = (x, k) => x.notes.some(n => n.t <= k + EPS && n.t + n.d > k + EPS) || x.notes.some(n => Math.abs(n.t - k) < 0.06);

  // touches that work on whole sections first: held chords in breaks
  if (opts.touches.holdBreaks) {
    for (const x of P) {
      if (x.role !== 'chords') continue;
      const md = x.part.stats ? x.part.stats.dur : 0.5; if (md >= 1.5) continue;
      for (const s of model.sections.filter(s => s.label === 'Break')) {
        const k0 = s.start * 4, k1 = s.end * 4, inside = x.notes.filter(n => n.t >= k0 - EPS && n.t < k1 - EPS);
        if (inside.length < 2) continue;
        const onsets = [...new Set(inside.map(n => Math.round(n.t * 32) / 32))].sort((a, b) => a - b);
        let held = 0;
        for (const n of inside) {
          const o = Math.round(n.t * 32) / 32, next = onsets.find(v => v > o + EPS);
          // a run ends where the part stops playing
          let stop = next ?? k1; for (let b = Math.floor(o / 4); b < Math.ceil(stop / 4); b++) if (!x.act.on[b]) { stop = Math.min(stop, b * 4); break; }
          const d = clamp(stop - n.t - 0.02, n.d, 8);
          if (d > n.d + 0.1) { n.d = d; n.v = Math.round(n.v * 0.85); n.tag = 'held'; held++; }
        }
        if (held) { touches.push({k: 'holdBreaks', bar: s.start, text: `${x.part.name} held through ${s.name}`}); tag('held', k0, k1, `${x.part.name}: chords held`, {part: x.id}); }
      }
    }
  }

  // moves, in an order where each sees the result of the last: silences, rewrites, then additions
  const order = {gap: 0, kickOut: 1, tapeStop: 2, stutter: 3, roll: 4, echo: 5};
  const sorted = moves.slice().sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.k0 - b.k0);
  const drums = P.filter(x => x.group === 'drums'), kicks = P.filter(x => x.role === 'kick');
  const autos = {music: [], drums: [], synths: [], mix: [], bass: []};    // filter automation, by target
  const fades = [], tails = [], tapes = [];
  for (const m of sorted) {
    const entry = {move: m, status: 'off', parts: [], text: ''};
    log.push(entry);
    if (!m.enabled) continue;
    switch (m.type) {
      case 'gap': {
        for (const x of P) x.notes = cut(x.notes, m.k0, m.k1);
        mutes.push({k0: m.k0, k1: m.k1, scope: 'all'});
        entry.status = 'rebuilt'; entry.parts = P.map(x => x.part.name); entry.text = `Every part cut for ${TM.noteName(m.k1 - m.k0) === '1/4' ? '1 beat' : (Math.round((m.k1 - m.k0) * 100) / 100) + ' beats'} before ${bb(m.k1)}, sends too.`;
        break;
      }
      case 'kickOut': {
        if (!kicks.length) { entry.status = 'skipped'; entry.text = 'No kick part to drop.'; break; }
        for (const x of kicks) x.notes = cut(x.notes, m.k0, m.k1);
        entry.status = 'rebuilt'; entry.parts = kicks.map(x => x.part.name); entry.text = `${list(entry.parts)} out from ${bb(m.k0)} to ${bb(m.k1)}.`;
        break;
      }
      case 'tapeStop': {
        const len = m.k1 - m.k0;
        for (const x of drums) x.notes = cut(x.notes, m.k0 + len * 0.5, m.k1);
        for (const x of P.filter(x => x.group !== 'drums')) { x.notes = x.notes.map(n => n.t >= m.k0 && n.t < m.k1 ? Object.assign({}, n, {d: Math.min(n.d, m.k1 - n.t)}) : n); x.pb.push({t: m.k0, v: 0}, {t: m.k0 + len * 0.5, v: -2048}, {t: m.k1 - 0.01, v: -8191}, {t: m.k1, v: 0}); }
        tapes.push({k0: m.k0, k1: m.k1});
        entry.status = 'rebuilt'; entry.parts = P.map(x => x.part.name); entry.text = `Everything slows to a stop over ${Math.round(len * 100) / 100} beats into ${bb(m.k1)} (in the preview); the MIDI bends your synths down and drops the drums halfway.`;
        break;
      }
      case 'stutter': {
        const step = m.step, scope = partsFor(m.target === 'drums' ? 'drums' : m.target === 'synths' ? 'synths' : 'mix', P).filter(x => x.group !== 'fx');
        let n = 0;
        for (const x of scope) {
          let slice = x.notes.filter(q => q.t >= m.k0 - EPS && q.t < m.k0 + step - EPS);
          if (!slice.length) { const ring = x.notes.filter(q => q.t < m.k0 && q.t + q.d > m.k0 + 0.01); slice = ring.map(q => Object.assign({}, q, {t: m.k0})); }
          if (!slice.length) continue;
          x.notes = cut(x.notes, m.k0, m.k1);
          for (let t = m.k0; t < m.k1 - EPS; t += step) for (const q of slice) x.notes.push({t: t + (q.t - m.k0), d: Math.min(q.d, step * 0.7), n: q.n, v: q.v, tag: 'stutter'});
          n++; entry.parts.push(x.part.name);
        }
        entry.status = n ? 'rebuilt' : 'skipped'; entry.text = n ? `The first ${m.grid} of ${bb(m.k0)} repeated to ${bb(m.k1)} on ${list(entry.parts)}.` : 'Nothing of yours plays there to stutter.';
        if (n) tag('stutter', m.k0, m.k1, `Stutter ${m.grid}`);
        break;
      }
      case 'roll': {
        let host = P.find(x => x.role === 'clap' && x.part.voice === 'snare') || P.find(x => x.role === 'clap');
        if (!host) {
          const p = TL.part({name: 'Roll', role: 'clap', kind: 'drum', pitch: 38, voice: 'snare', sound: 'snare', src: {id: 'roll', name: 'Roll', file: 'transplant', ch: 9}, notes: []});
          host = {part: p, id: p.id, role: 'clap', group: 'drums', act: {on: new Uint8Array(bars), why: new Uint8Array(bars)}, notes: [], cc: [], pb: [], synthetic: true};
          P.push(host); byId.set(host.id, host);
        }
        const pitch = host.part.pitch ?? 39, hits = rollHits(m), have = host.notes;
        let added = 0;
        for (const h of hits) { if (have.some(q => Math.abs(q.t - h.k) < 1 / 48)) continue; host.notes.push({t: h.k, d: 0.06, n: pitch, v: h.v, tag: 'roll'}); added++; }
        entry.status = 'rebuilt'; entry.parts = [host.part.name]; entry.text = `${added} hits on ${host.part.name}: ${m.steps.map(s => `${({1: 'quarters', 2: '8ths', 3: '8th triplets', 4: '16ths', 6: '16th triplets', 8: '32nds', 16: '64ths'})[s.n] || s.n + ' a beat'} from ${bb(s.k)}`).join(', ')}, getting louder${m.hits && m.hits.length >= 4 ? ' (the reference\'s own hits, on the grid)' : ''}.`;
        tag('roll', m.k0, m.k1, 'Roll', {part: host.id});
        break;
      }
      case 'echo': {
        const pref = ['clap', 'vox', 'lead', 'chords', 'perc', 'hats'];
        let best = null;
        for (const role of pref) {
          for (const x of P.filter(x => x.role === role)) {
            const near = x.notes.filter(q => q.t >= m.k0 - 0.3 && q.t <= m.k0 + 0.3 && !q.tag).sort((a, b) => Math.abs(a.t - m.k0) - Math.abs(b.t - m.k0))[0]
              || x.notes.filter(q => q.t < m.k0 && q.t >= m.k0 - 1 && !q.tag).sort((a, b) => b.t - a.t)[0];
            if (near) { best = {x, q: near}; break; }
          }
          if (best) break;
        }
        if (!best) { entry.status = 'skipped'; entry.text = 'None of your parts plays near that hit to throw.'; break; }
        const {x, q} = best, g = Math.pow(10, m.repeatDb / 20); let added = 0;
        const chord = x.notes.filter(n => Math.abs(n.t - q.t) < 0.02 && !n.tag);
        for (let r = 1; r <= m.repeats; r++) {
          const t = q.t + r * m.beats; if (t >= beats) break;
          if (x.notes.some(n => Math.abs(n.t - t) < 1 / 16 && !n.tag)) break;   // your part comes back in: the throw stops
          for (const c of chord) x.notes.push({t, d: Math.min(c.d, m.beats * 0.9), n: c.n, v: clamp(Math.round(c.v * Math.pow(g, r)), 1, 127), tag: 'echo'});
          added++;
        }
        entry.status = 'rebuilt'; entry.parts = [x.part.name]; entry.text = `The ${x.part.name} hit at ${bb(q.t)} echoes ${added} time${added === 1 ? '' : 's'} at ${m.note}, ${Math.round(-m.repeatDb * 10) / 10} dB quieter each time.`;
        tag('echo', q.t, q.t + (added + 1) * m.beats, `Throw: ${x.part.name}`, {part: x.id});
        break;
      }
      case 'lp': case 'hp': case 'lpStatic': case 'hpStatic': {
        const tgt = m.target, ps = partsFor(tgt, P).filter(x => x.group !== 'fx');
        autos[tgt].push(m);
        entry.status = ps.length ? 'rebuilt' : 'preview'; entry.parts = ps.map(x => x.part.name);
        entry.text = m.type.endsWith('Static') ? `${m.type === 'lpStatic' ? 'Low' : 'High'}-pass at ${hzText(m.hz)} on ${TARGET_NAME[tgt]} from ${bb(m.k0)} to ${bb(m.k1)}.`
          : `${m.type === 'lp' ? 'Low' : 'High'}-pass on ${TARGET_NAME[tgt]}: ${hzText(m.curve[0].hz)} at ${bb(m.k0)} → ${m.opening ? 'open' : hzText(m.curve[m.curve.length - 1].hz)} at ${bb(m.k1)}, ${m.points.length} breakpoints.`;
        break;
      }
      case 'riser': case 'reverse': case 'pitchUp': case 'pitchDown': case 'crash': case 'boom': {
        fx.push(Object.assign({src: 'reference', id: m.id}, pickFx(m)));
        entry.status = 'rebuilt'; entry.parts = ['FX']; entry.text = fxText(m);
        break;
      }
      case 'fade': fades.push(m); entry.status = 'preview'; entry.text = `Volume ${m.db > 0 ? 'up' : 'down'} ${Math.abs(Math.round(m.db))} dB from ${bb(m.k0)} to ${bb(m.k1)}: in the preview; draw it on the master in Live.`; break;
      case 'tail': tails.push(m); entry.status = 'preview'; entry.text = `A reverb tail after the cut at ${bb(m.k0)} (in the preview).`; break;
      case 'width': entry.status = 'described'; entry.text = `${m.db < 0 ? 'Narrow' : 'Widen'} ${TARGET_NAME[m.target]} by ${Math.abs(Math.round(m.db))} dB of side signal from ${bb(m.k0)} to ${bb(m.k1)}: Utility's Width in Live.`; break;
    }
  }

  // touches: fills at phrase ends, and impacts on drops the reference doesn't land itself
  const busy = (k0, k1) => moves.some(m => m.enabled && m.k1 > k0 + EPS && m.k0 < k1 - EPS && !['width', 'fade', 'tail', 'lp', 'hp', 'lpStatic', 'hpStatic'].includes(m.type));
  if (opts.touches.fills) {
    const claps = P.filter(x => x.role === 'clap' && !x.synthetic);
    for (const s of model.sections) {
      if (!['Groove', 'Drop'].includes(s.label) || s.bars < 16) continue;
      for (let e = s.start + 7, i = 0; e < s.end; e += 8, i++) {
        const k0 = e * 4, k1 = k0 + 4;
        if (busy(k0, k1 + 0.5)) continue;
        const kickOn = kicks.filter(x => x.act.on[e]), clapOn = claps.filter(x => x.act.on[e]);
        if (i % 2 === 0 && kickOn.length) {
          for (const x of kickOn) x.notes = cut(x.notes, k0 + 3, k1);
          touches.push({k: 'fills', bar: e, text: 'Kick leaves beat 4'}); tag('fill', k0 + 3, k1, 'Fill: the kick leaves beat 4');
        } else if (clapOn.length) {
          const x = clapOn[0], pitch = x.part.pitch ?? 39;
          for (const [t, v] of [[k0 + 3.5, 84], [k0 + 3.75, 104]]) if (!x.notes.some(q => Math.abs(q.t - t) < 0.05)) x.notes.push({t, d: 0.06, n: pitch, v, tag: 'fill'});
          touches.push({k: 'fills', bar: e, text: `${x.part.name} pickup into the next phrase`}); tag('fill', k0 + 3.5, k1, `Fill: ${x.part.name} pickup`);
        } else if (kickOn.length) {
          for (const x of kickOn) x.notes = cut(x.notes, k0 + 3, k1);
          touches.push({k: 'fills', bar: e, text: 'Kick leaves beat 4'}); tag('fill', k0 + 3, k1, 'Fill: the kick leaves beat 4');
        }
      }
    }
  }
  if (opts.touches.impacts) {
    for (const s of model.sections) {
      if (s.label !== 'Drop' || !s.start) continue;
      const k = s.start * 4, near = t => moves.some(m => m.enabled && m.type === t && Math.abs(m.k0 - k) <= 1);
      for (const t of ['crash', 'boom']) if (!near(t)) { fx.push(Object.assign({src: 'touch'}, pickFx({type: t, k0: k, k1: k + 1, t60: t === 'crash' ? 2.6 : 1.2}))); touches.push({k: 'impacts', bar: s.start, text: `${t === 'crash' ? 'Crash' : 'Sub boom'} on ${s.name}`}); }
    }
  }
  // silences have the last word: whatever rolls, throws or fills added, a gap is silent and a kick-out has no kick
  for (const g of mutes) for (const x of P) x.notes = cut(x.notes, g.k0, g.k1);
  for (const m of moves) if (m.enabled && m.type === 'kickOut') for (const x of kicks) x.notes = cut(x.notes, m.k0, m.k1);
  // a gap is silence for the effects too
  for (const g of mutes) for (const f of fx) if (f.k0 < g.k0 && f.k1 > g.k0 + EPS && f.type !== 'crash' && f.type !== 'boom') f.k1 = g.k0;

  for (const x of P) { x.notes.sort((a, b) => a.t - b.t || a.n - b.n); x.notes = x.notes.filter(n => n.t >= 0 && n.t < beats - EPS && n.d > 0.005); }

  // ---------- automation: the filter on each group, per 16th, and the same as CC74 ----------
  const groups = ['drums', 'bass', 'synths', 'fx'], filt = {};
  for (const g of groups) filt[g] = {lp: new Float32Array(beats * 4).fill(20000), hp: new Float32Array(beats * 4).fill(20)};
  for (const [tgt, ms] of Object.entries(autos)) for (const m of ms) {
    const gs = (TARGET[tgt] || []).filter(g => g !== 'fx' || tgt === 'mix'), type = m.type.startsWith('lp') ? 'lp' : 'hp';
    const end = m.type.endsWith('Static') ? m.k1 : m.opening ? m.k1 : Math.ceil(m.k1 / 4 - EPS) * 4;
    for (let i = Math.max(0, Math.floor(m.k0 * 4)); i < Math.min(beats * 4, Math.ceil(end * 4)); i++) {
      const k = i / 4, hz = m.type.endsWith('Static') ? m.hz : TM.sweepAt(m, k);
      if (hz == null) continue;
      for (const g of gs) { const a = filt[g][type]; a[i] = type === 'lp' ? Math.min(a[i], hz) : Math.max(a[i], hz); }
    }
  }
  for (const x of P) {
    const g = filt[x.group]; if (!g) continue;
    let last = -1;
    for (let i = 0; i < g.lp.length; i++) {
      const lpOn = g.lp[i] < 19000, hpOn = g.hp[i] > 25;
      const v = lpOn ? hzToCC(g.lp[i]) : hpOn ? hzToCC(g.hp[i]) : 127;
      if (v !== last) { x.cc.push({t: i / 4, cc: 74, v}); last = v; }
    }
    if (x.cc.length === 1 && x.cc[0].v === 127) x.cc = [];
  }
  const gain = new Float32Array(beats * 4).fill(1);
  for (const m of fades) {
    const nextLine = (model.sections.find(s => s.start * 4 >= m.k1 - EPS) || {start: bars}).start * 4;
    for (let i = Math.floor(m.k0 * 4); i < Math.min(beats * 4, nextLine * 4); i++) { const k = i / 4, p = clamp((k - m.k0) / (m.k1 - m.k0), 0, 1); gain[i] *= Math.pow(10, m.db * p / 20); }
  }

  // ---------- sidechain per bar ----------
  const duck = Float32Array.from({length: bars}, (_, b) => { const p = model.pumps.find(p => b >= p.start && b < p.end); return p && p.pump ? p.depth : 0; });
  const release = Float32Array.from({length: bars}, (_, b) => { const p = model.pumps.find(p => b >= p.start && b < p.end); return p && p.releaseMs ? p.releaseMs : 0; });

  const out = {model, loop, opts, bars, beats, secOf, parts: P, fx: fx.sort((a, b) => a.k0 - b.k0), mutes, tapes, tails, filt, gain, duck, release, log: log.sort((a, b) => a.move.k0 - b.move.k0), tags, touches,
    bpm: loop.bpm || model.bpm};
  out.metrics = measure(out);
  return out;
}

// The hits of a roll, on the grid: the reference's own hits snapped to the subdivision playing at that moment,
// or (with no hits) every step of each subdivision, getting louder.
function rollHits(m) {
  const stepAt = k => { let n = m.steps[0].n; for (const s of m.steps) if (k >= s.k - 1e-3) n = s.n; return n; };
  const out = [];
  if (m.hits && m.hits.length >= 4) {
    const top = Math.max(...m.hits.map(h => h.v)) || 1;
    for (const h of m.hits) { const n = stepAt(h.k), k = Math.round(h.k * n) / n; if (k < m.k0 - EPS || k >= m.k1 - EPS) continue; if (out.some(o => Math.abs(o.k - k) < 1e-3)) continue; out.push({k, v: clamp(Math.round(34 + 90 * h.v / top), 1, 127)}); }
  } else {
    for (let i = 0; i < m.steps.length; i++) {
      const s = m.steps[i], e = i + 1 < m.steps.length ? m.steps[i + 1].k : m.k1;
      for (let k = Math.ceil(s.k * s.n - EPS) / s.n; k < e - EPS; k += 1 / s.n) out.push({k, v: 0});
    }
    const lo = 40, hi = clamp(40 + m.velDb * 5, 90, 127);
    for (const h of out) h.v = clamp(Math.round(lo + (hi - lo) * Math.pow((h.k - m.k0) / ((m.k1 - m.k0) || 1), 0.8)), 1, 127);
  }
  return out.sort((a, b) => a.k - b.k);
}
function pickFx(m) {
  const o = {type: m.type, k0: m.k0, k1: m.k1};
  if (m.type === 'riser') o.riseDb = m.riseDb || 18;
  if (m.type === 'pitchUp' || m.type === 'pitchDown') o.semis = m.semis || (m.type === 'pitchUp' ? 12 : -12);
  if (m.type === 'crash') o.t60 = clamp(m.t60 || 2.6, 0.8, 5);
  if (m.type === 'boom') o.k1 = m.k0 + 2;
  return o;
}
function fxText(m) {
  const len = m.k1 - m.k0, L = len >= 4 ? `${Math.round(len / 4 * 10) / 10} bars` : `${Math.round(len * 100) / 100} beats`;
  switch (m.type) {
    case 'riser': return `A noise riser, ${L}, ${Math.round(m.riseDb)} dB up, into ${bb(m.k1)}.`;
    case 'reverse': return `A reverse cymbal swelling into ${bb(m.k1)}.`;
    case 'pitchUp': return `A pitch riser, ${Math.round(m.semis)} semitones up over ${L}, into ${bb(m.k1)}.`;
    case 'pitchDown': return `A downlifter, ${Math.round(-m.semis)} semitones down from ${bb(m.k0)}.`;
    case 'crash': return `A crash on ${bb(m.k0)}.`;
    case 'boom': return `A sub boom on ${bb(m.k0)}.`;
  }
  return '';
}

// ---------- 4. measured ----------
function measure(pl) {
  const {model, bars} = pl, energy = new Float32Array(bars), playing = [];
  const cutoffFactor = (g, b) => { const f = pl.filt[g]; if (!f) return 1; let s = 0; for (let i = b * 16; i < b * 16 + 16; i++) { const lp = clamp(Math.log2(f.lp[i] / 120) / Math.log2(20000 / 120), 0.15, 1), hp = clamp(1 - 0.6 * Math.log2(Math.max(20, f.hp[i]) / 20) / Math.log2(2000 / 20), 0.3, 1); s += lp * hp; } return s / 16; };
  for (let b = 0; b < bars; b++) {
    let e = 0; const set = [];
    for (const x of pl.parts) {
      const ns = x.notes.filter(n => n.t < b * 4 + 4 && n.t + n.d > b * 4);
      if (!ns.length) continue;
      set.push(x.id);
      e += (W[x.role] || 1) * cutoffFactor(x.group, b) * Math.min(1, 0.55 + 0.45 * ns.reduce((s, n) => s + n.v, 0) / ns.length / 100);
    }
    for (const f of pl.fx) if (f.type === 'riser' || f.type === 'pitchUp') { const k = b * 4 + 2; if (k >= f.k0 && k < f.k1) e += 2.5 * (k - f.k0) / (f.k1 - f.k0); }
    energy[b] = e; playing.push(set);
  }
  const shape = spearman(model.tensionBar, energy);
  // where the arrangement changes: the parts playing change, or something happens in the bar
  const ours = new Uint8Array(bars);
  for (let b = 1; b < bars; b++) { const a = playing[b - 1], c = playing[b]; if (a.length !== c.length || a.some(id => !c.includes(id))) ours[b] = 1; }
  for (const t of pl.tags) { const b = Math.floor(t.k0 / 4); if (b > 0 && b < bars) ours[b] = 1; }
  for (const f of pl.fx) { const b = Math.floor(f.k0 / 4); if (b > 0 && b < bars) ours[b] = 1; }
  for (const l of pl.log) if (l.status === 'rebuilt' && ['lp', 'hp', 'lpStatic', 'hpStatic', 'gap', 'kickOut'].includes(l.move.type)) { const b = Math.floor(l.move.k0 / 4); if (b > 0 && b < bars) ours[b] = 1; }
  const runs = a => { let best = 0, cur = 0; for (let b = 0; b < a.length; b++) { if (a[b] && b) cur = 0; cur++; best = Math.max(best, cur); } return best; };
  const nO = ours.reduce((s, v) => s + v, 0), nR = model.changes.reduce((s, v) => s + v, 0);
  // lane fidelity: does the main part of each lane play where the lane does?
  const lanes = [];
  for (const l of LK) {
    const ps = pl.parts.filter(x => x.part.follow === l && !x.synthetic); if (!ps.length) continue;
    let agree = 0; for (let b = 0; b < bars; b++) { const any = ps.some(x => x.act.on[b]); if (!!any === !!model.on[l][b]) agree++; }
    lanes.push({lane: l, agree: agree / bars, parts: ps.map(x => x.part.name)});
  }
  const uncovered = LK.filter(l => !pl.parts.some(x => x.part.follow === l) && model.on[l].some(v => v) && l !== 'fx');
  const rebuilt = pl.log.filter(l => l.status === 'rebuilt').length, total = pl.log.filter(l => l.move.enabled).length;
  return {energy, shape, ours, changes: nO, changesRef: nR, every: bars / Math.max(1, nO), everyRef: bars / Math.max(1, nR), longest: runs(ours), longestRef: runs(model.changes),
    lanes, fidelity: lanes.length ? lanes.reduce((s, l) => s + l.agree, 0) / lanes.length : 0, uncovered, rebuilt, total, notes: pl.parts.reduce((s, x) => s + x.notes.length, 0),
    touches: pl.touches.length, loopBars: pl.loop.bars, reps: bars / pl.loop.bars};
}

// ---------- 5. out: MIDI, the plan ----------
function tracks(pl) {
  // one track per source clip, with every part of a Drum Rack back on its own pads
  const bySrc = new Map();
  for (const x of pl.parts) { const k = x.part.src ? x.part.src.id : x.id; if (!bySrc.has(k)) bySrc.set(k, []); bySrc.get(k).push(x); }
  const out = [];
  for (const [, xs] of bySrc) {
    const src = xs[0].part.src || {name: xs[0].part.name, ch: 0}, notes = xs.flatMap(x => x.part.mute ? [] : x.notes.map(n => ({t: n.t, d: n.d, n: n.n, v: n.v})));
    const cc = xs[0].cc.slice(), pb = xs[0].pb.slice();
    out.push({name: ascii(src.name || xs[0].part.name), ch: clamp(src.ch ?? 0, 0, 15), notes, cc, pb: xs[0].group === 'drums' ? [] : pb, parts: xs.map(x => x.part.name), drums: xs[0].group === 'drums'});
  }
  const FXN = {riser: ['FX - Noise riser', 60], reverse: ['FX - Reverse cymbal', 62], pitchUp: ['FX - Pitch riser (bend range 24)', 64], pitchDown: ['FX - Downlifter (bend range 24)', 65], crash: ['FX - Crash', 49], boom: ['FX - Sub boom', 36]};
  for (const [type, [name, n]] of Object.entries(FXN)) {
    const fs = pl.fx.filter(f => f.type === type); if (!fs.length) continue;
    const tr = {name, ch: type === 'crash' ? 9 : 0, notes: fs.map(f => ({t: f.k0, d: Math.max(0.25, f.k1 - f.k0), n, v: f.src === 'touch' ? 96 : 110})), cc: [], pb: [], fx: true};
    if (type === 'riser') for (const f of fs) for (let k = f.k0; k <= f.k1 + EPS; k += 0.5) tr.cc.push({t: k, cc: 74, v: Math.round(20 + 107 * Math.pow((k - f.k0) / ((f.k1 - f.k0) || 1), 1.6))});
    if (type === 'pitchUp' || type === 'pitchDown') for (const f of fs) { for (let k = f.k0; k <= f.k1 + EPS; k += 0.25) tr.pb.push({t: k, v: clamp(Math.round(8191 * (f.semis / 24) * clamp((k - f.k0) / ((f.k1 - f.k0) || 1), 0, 1)), -8192, 8191)}); tr.pb.push({t: f.k1 + 0.05, v: 0}); }
    out.push(tr);
  }
  return out;
}
const markers = pl => pl.model.sections.map(s => ({t: s.start * 4, text: ascii(`${s.name} (${s.bars} bars)`)}));
function arrangedMidi(pl, name = 'Transplant') { return OT.writeMidi(tracks(pl), {bpm: pl.bpm, name: ascii(name), beats: pl.beats, markers: markers(pl)}); }
function partMidis(pl) { return tracks(pl).map((tr, i) => ({name: `${String(i + 1).padStart(2, '0')} ${tr.name.replace(/[^\w\-() ]+/g, '').trim() || 'Track'}.mid`, bytes: OT.writeMidi([tr], {bpm: pl.bpm, name: tr.name, beats: pl.beats, markers: markers(pl)}), track: tr})); }

function breakpoints(m) { return (m.points || []).map(p => ({bar: bb(p.k), hz: p.hz, cc: hzToCC(p.hz)})); }
function recipe(l, pl) {
  const m = l.move, ps = l.parts.filter(n => n !== 'FX'), on = ps.length ? list(ps) : '';
  switch (m.type) {
    case 'lp': case 'hp': return [`Group ${on || 'the parts'} and put Auto Filter on the group: ${m.type === 'lp' ? 'Low-pass' : 'High-pass'}, 24 dB.`, `Automate Frequency through the breakpoints: ${breakpoints(m).map(p => `${p.bar} ${hzText(p.hz)}`).join(' → ')}${m.opening ? ` → ${m.type === 'lp' ? '20 kHz' : '20 Hz'} (open) at ${bb(m.k1)}` : `, then back open on the next bar line`}.`, 'The MIDI carries the same curve as CC74 on each of those tracks: MIDI-learn CC74 to the cutoff of a synth (Serum, Wavetable via a macro) to play it from the clip.'];
    case 'lpStatic': case 'hpStatic': return [`Auto Filter on ${on || 'the group'}: ${m.type === 'lpStatic' ? 'Low' : 'High'}-pass at ${hzText(m.hz)} from ${bb(m.k0)} to ${bb(m.k1)}.`, 'Snap it open on the next downbeat so the next section arrives brighter.'];
    case 'gap': return [`Delete every clip's notes from ${bb(m.k0)} to ${bb(m.k1)} (already done in the MIDI).`, 'Automate the reverb and delay sends to zero for those beats too, so the drop lands on real silence.'];
    case 'kickOut': return [`The kick is already cut from ${bb(m.k0)} to ${bb(m.k1)} in the MIDI. Nothing else needs to change: the missing kick is the fill.`];
    case 'roll': return [`The roll is written on ${on} in the MIDI, hit for hit.`, 'Velocity → Volume on the pad (or a Drum Rack chain) so the climb is heard; an opening high-pass or a rising pitch on that pad adds lift.'];
    case 'echo': return [`Echo or Delay on a send, synced to ${m.note}, feedback around ${Math.round(Math.pow(10, m.repeatDb / 20) * 100)}%.`, `The echoes are written as notes on ${on} in the MIDI; for the real thing, automate the send up for that one hit instead.`];
    case 'stutter': return [`Beat Repeat on the master or the group from ${bb(m.k0)} to ${bb(m.k1)}: Grid ${m.grid}, Gate 1 beat, Chance 100%, Mix Insert.`, 'The MIDI has the repeats written out on your parts, so it works without Beat Repeat too.'];
    case 'tapeStop': return ['Resample the last beats into an audio clip, set Warp to Re-Pitch and draw a falling tempo, or use a tape-stop plug-in on the master.', `Land it exactly at ${bb(m.k1)}.`];
    case 'riser': return [`Drop "${fxFile({type: 'riser', k0: m.k0, k1: m.k1})}" from the FX audio pack at ${bb(m.k0)}, or white noise on a synth with its cutoff and level rising across it (the FX MIDI track has the CC74 curve).`];
    case 'reverse': return ['A crash, reversed (Rev in the clip view), its end lined up with the downbeat, or the rendered one from the FX audio pack.'];
    case 'pitchUp': case 'pitchDown': return [`One long synth note with its pitch bent ${Math.round(m.semis)} semitones (the FX MIDI track has the bend, range ±24), or the rendered riser from the FX audio pack.`];
    case 'crash': case 'boom': return [`A ${m.type === 'crash' ? 'crash' : 'sub boom'} on ${bb(m.k0)}: the FX MIDI track has the note, the FX audio pack the sound.`];
    case 'fade': return [`Utility Gain on the master: ${Math.round(m.db)} dB from ${bb(m.k0)} to ${bb(m.k1)}.`];
    case 'width': return [`Utility on ${on || 'the music group'}: Width down across ${bb(m.k0)}–${bb(m.k1)}, back to 100% on the downbeat.`];
    case 'tail': return ['Automate the reverb send up on the last hit before the cut and let it ring.'];
  }
  return [];
}
const fxFile = f => `bar ${bb(f.k0)} – ${({riser: 'Noise riser', reverse: 'Reverse cymbal', pitchUp: 'Pitch riser', pitchDown: 'Downlifter', crash: 'Crash', boom: 'Sub boom'})[f.type]}.wav`;

function planMarkdown(pl, names = {}) {
  const {model, loop, metrics: M} = pl, L = [], pct = v => `${Math.round(v * 100)}%`;
  L.push(`# Transplant: ${names.loop || loop.name || 'your loop'} in the arrangement of ${model.name}`, '');
  L.push(`Reference: **${model.name}** · ${Math.round(model.bpm * 10) / 10} BPM${model.key ? ` · ${model.key.name}` : ''} · ${model.bars} bars · ${model.sections.length} sections · ${model.moves.length} moves`, '');
  L.push(`Your loop: ${loop.bars} bars · ${loop.parts.length} parts${loop.key ? ` · ${loop.key.name}` : ''} · played at ${Math.round(pl.bpm * 10) / 10} BPM`, '');
  L.push('## Measured', '', `- Shape match: **${Math.round(M.shape * 100)}** (rank correlation between the reference's tension and your arrangement's energy, bar by bar; 100 is the same shape).`,
    `- Your loop alone repeats ${Math.round(M.reps * 10) / 10} times with no change. Transplanted, something changes at ${M.changes} bar lines, about every ${M.every.toFixed(1)} bars (the reference: every ${M.everyRef.toFixed(1)}). Longest stretch with no change: ${M.longest} bars (the reference: ${M.longestRef}).`,
    `- Lanes followed: ${pct(M.fidelity)} of bars agree with the reference's lanes.`, `- Moves rebuilt on your parts: ${M.rebuilt} of ${M.total}.`, '');
  L.push('## Your parts and what they follow', '', '| Part | Role | Follows | Entry | Bars playing |', '|---|---|---|---|---|');
  for (const x of pl.parts) L.push(`| ${x.part.name} | ${TL.ROLE[x.role].name} | ${TM.LANE[x.part.follow] ? TM.LANE[x.part.follow].name : x.part.follow} | ${(ENTRIES.find(e => e.k === x.part.entry) || ENTRIES[0]).name} | ${x.act.on.reduce((s, v) => s + v, 0)} |`);
  L.push('', '## The arrangement, section by section', '', '| Bars | Section | Playing |', '|---|---|---|');
  for (const s of model.sections) { const ps = pl.parts.filter(x => x.notes.some(n => n.t >= s.start * 4 && n.t < s.end * 4)).map(x => x.part.name); L.push(`| ${s.start + 1}–${s.end} | ${s.name} | ${ps.join(', ') || '–'} |`); }
  L.push('', '## Every move, rebuilt on your loop', '');
  for (const l of pl.log) {
    if (!l.move.enabled) continue;
    L.push(`### ${bb(l.move.k0)} · ${l.move.title} (${l.status})`, '', l.text, '');
    for (const r of recipe(l, pl)) L.push(`- ${r}`);
    if (l.move.points && l.move.points.length) { L.push('', '| Bar | Frequency | CC74 |', '|---|---|---|'); for (const p of breakpoints(l.move)) L.push(`| ${p.bar} | ${hzText(p.hz)} | ${p.cc} |`); }
    L.push('');
  }
  const pumps = model.pumps.filter(p => p.pump);
  if (pumps.length) { L.push('## Sidechain', '', 'Compressor on the music group (bass and synths), sidechained from the kick: attack 1 ms, ratio 4:1, threshold set for this much gain reduction on each kick.', ''); for (const p of pumps) L.push(`- ${p.section} (bars ${p.start + 1}–${p.end}): ${p.depth.toFixed(1)} dB${p.releaseMs ? `, release ${Math.round(p.releaseMs)} ms` : ''}`); L.push(''); }
  if (pl.touches.length) { L.push('## Producer touches', ''); for (const t of pl.touches) L.push(`- Bar ${t.bar + 1}: ${t.text}`); L.push(''); }
  L.push('## Into Live', '', ...liveSteps(pl).map((s, i) => `${i + 1}. ${s}`), '');
  return L.join('\n');
}
function liveSteps(pl) {
  const S = pl.model.sections;
  return [`Set Live's tempo to ${Math.round(pl.bpm * 100) / 100} BPM. Every file starts at bar 1.`,
    'Drag each file from the parts ZIP onto the track that already holds that part\'s instrument (a Drum Rack file goes onto the Drum Rack: every pad keeps its note). Or drop the arranged MIDI into an empty arrangement to get one new track per part.',
    `Set locators at ${S.map(s => `${s.start + 1} (${s.name})`).join(', ')}.`,
    'Group the drums, and the bass with the synths, so the filter sweeps and the sidechain land on the right group. The plan lists each sweep\'s breakpoints for Auto Filter.',
    pl.fx.length ? 'Drop the FX audio files at the bar in their names, on one audio track (or play the FX MIDI tracks on your own riser and impact sounds).' : 'No FX in this arrangement.',
    'Then make it yours: the transplant is a skeleton. Move one transition, rewrite one drop, and it stops being anyone\'s but yours.'];
}

return {ENTRIES, TOUCHES, GROUP_OF, TARGET, TARGET_NAME, W, defaults, plan, activeBars, layOut, rollHits, measure, tracks, arrangedMidi, partMidis, planMarkdown, liveSteps, recipe, breakpoints, fxFile, hzToCC, hzText, spearman, rankNorm, cut};
})();
/* transplant-engine:end */
