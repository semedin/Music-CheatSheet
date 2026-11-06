// ---------- Transplant: the page ----------
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bb = TM.barBeat;
const STORE = 'fieldwork.transplant.v1';
const S = {model: null, loop: null, opts: TE.defaults(), ov: {}, plan: null, shapeId: null, demoId: null, refBuf: null, refFile: null, ourLufs: null, match: 1,
  zoom: 1, sel: null, mode: 'you', loopOn: false, pos: 0, bpm: null, undo: [], busy: false};
const A = {ctx: null, eng: null, pl: null, refSrc: null, refGain: null, refT0: 0, refK0: 0, refOn: false, vol: 0.8};
const shapeCache = new Map();
const shapeModel = id => { if (!shapeCache.has(id)) shapeCache.set(id, TM.buildShape(TSHAPES.find(s => s.id === id))); return shapeCache.get(id); };

function toast(m, ms = 2800) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); }
function download(name, data, type) { const b = data instanceof Blob ? data : new Blob([data], {type}), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const safe = s => String(s || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w\- ()]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50) || 'untitled';
const base = () => `${safe(S.loop && (S.loop.name || 'My loop'))} in ${safe(S.model && S.model.name)}`;
const fmtT = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s - m * 60)).padStart(2, '0')}`; };
const secAt = k => S.model && S.model.sections.find(s => k >= s.start * 4 && k < s.end * 4);

// ---------- persistence ----------
function save() {
  clearTimeout(save.t);
  save.t = setTimeout(() => {
    if (!S.model || !S.loop) return;
    try {
      const j = {v: 1, model: TM.serialize(S.model), loop: TL.serialize(S.loop), opts: S.opts, ov: S.ov, shapeId: S.shapeId, demoId: S.demoId, zoom: S.zoom, bpm: S.bpm};
      const txt = JSON.stringify(j); if (txt.length < 3.5e6) localStorage.setItem(STORE, txt);
    } catch (_) {}
  }, 400);
}
function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(STORE) || 'null'); if (!j || j.v !== 1) return false;
    applySession(j, false); return true;
  } catch (_) { return false; }
}
function applySession(j, announce = true) {
  const m = TM.revive(j.model), l = TL.revive(j.loop);
  S.model = m; S.loop = l; S.opts = Object.assign(TE.defaults(), j.opts || {}); S.ov = j.ov || {}; S.shapeId = j.shapeId || null; S.demoId = j.demoId || null; S.zoom = j.zoom || 1; S.bpm = j.bpm || l.bpm || m.bpm;
  S.refBuf = null; S.ourLufs = null; S.undo = [];
  $('#zoom').value = String(S.zoom);
  recompute(); renderSetup();
  if (announce) toast(`Session opened: ${l.name || 'your loop'} in ${m.name}`);
}

// ---------- audio ----------
function ensureAudio() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A.ctx; }
  const C = window.AudioContext || window.webkitAudioContext; A.ctx = new C({latencyHint: 'interactive'});
  A.out = A.ctx.createGain(); A.out.gain.value = A.vol; A.out.connect(A.ctx.destination);
  A.eng = TA.create(A.ctx, {destination: A.out}); A.pl = TA.player(A.ctx, A.eng); A.pl.onend = () => { S.pos = 0; ui(); };
  A.refGain = A.ctx.createGain(); A.refGain.connect(A.out);
  if (S.plan) A.eng.load(S.plan, {kickHz: TA.kickFor(S.loop.key)});
  return A.ctx;
}
const playing = () => (A.pl && A.pl.playing) || A.refOn;
function beatNow() {
  if (A.refOn && S.model && S.model.audio) return (A.ctx.currentTime - A.refT0) / S.model.audio.beatDur + A.refK0;
  if (A.pl && A.pl.playing) return A.pl.beat();
  return S.pos;
}
function startRef(k) {
  stopRef();
  const au = S.model.audio, t = Math.max(0, au.t0 + k * au.beatDur);
  if (!S.refBuf || t >= S.refBuf.duration) return;
  const src = A.ctx.createBufferSource(); src.buffer = S.refBuf; src.connect(A.refGain);
  A.refGain.gain.value = S.match;
  const at = A.ctx.currentTime + 0.04; src.start(at, t); A.refSrc = src; A.refT0 = at; A.refK0 = k; A.refOn = true;
  src.onended = () => { if (A.refSrc === src) { A.refOn = false; A.refSrc = null; ui(); } };
}
function stopRef() { if (A.refSrc) { const s = A.refSrc; A.refSrc = null; try { s.stop(); } catch (_) {} } A.refOn = false; }
function play(from = S.pos) {
  ensureAudio(); if (!S.plan) return;
  from = clamp(from, 0, S.plan.beats - 0.01);
  if (S.loopOn) { const sec = secAt(from) || S.model.sections[0]; if (!A.pl.loop || from < A.pl.loop[0] || from >= A.pl.loop[1]) A.pl.setLoop([sec.start * 4, sec.end * 4]); }
  if (S.mode === 'ref' && S.refBuf) { A.pl.stop(); startRef(from); }
  else { stopRef(); A.pl.play(from); }
  ui(); loopUI();
}
function stop() { if (!A.pl) return; S.pos = clamp(beatNow() || 0, 0, S.plan ? S.plan.beats : 0); A.pl.stop(); stopRef(); ui(); }
function seek(k) { S.pos = clamp(k, 0, S.plan ? S.plan.beats - 0.01 : 0); if (playing()) play(S.pos); else { ui(); drawOverlay(); } }
function setMode(m) {
  if (m === 'ref' && !S.refBuf) { toast(S.model && S.model.audio ? 'Drop the reference track in again to hear it: a saved or JSON arrangement carries the measurements, not the audio.' : 'A shape has no audio. Drop a real track to A/B against it.', 4200); return; }
  const was = playing(), k = beatNow();
  S.mode = m; $('#abYou').classList.toggle('on', m === 'you'); $('#abRef').classList.toggle('on', m === 'ref');
  $('#abYou').setAttribute('aria-pressed', String(m === 'you')); $('#abRef').setAttribute('aria-pressed', String(m === 'ref'));
  if (was) play(k);
}
async function matchLoudness() {
  S.ourLufs = null; S.match = 1;
  if (!S.refBuf || !S.model.audio || !Number.isFinite(S.model.audio.lufs) || !S.plan) { abInfo(); return; }
  const pl = S.plan, e = pl.metrics.energy; let best = 0, bv = -1;
  for (let b = 0; b + 8 <= pl.bars; b += 4) { let s = 0; for (let i = b; i < b + 8; i++) s += e[i]; if (s > bv) { bv = s; best = b; } }
  const id = (matchLoudness.id = (matchLoudness.id || 0) + 1);
  try {
    const r = await TA.render(pl, {k0: best * 4, k1: best * 4 + 32, sampleRate: 44100, tail: 0, kickHz: TA.kickFor(S.loop.key)});
    if (id !== matchLoudness.id) return;
    const L = await XR.loudness([r.L, r.R], r.sampleRate);
    S.ourLufs = L.I; S.match = clamp(Math.pow(10, (S.ourLufs - S.model.audio.lufs) / 20), 0.05, 4);
  } catch (_) { S.match = 1; }
  if (A.refGain) A.refGain.gain.value = S.match;
  abInfo();
}
function abInfo() {
  const el = $('#abInfo');
  if (!S.refBuf) { el.textContent = ''; return; }
  if (S.ourLufs == null) { el.textContent = 'A/B: same bar, each at its own tempo. Matching loudness…'; return; }
  const d = 20 * Math.log10(S.match);
  el.textContent = `A/B: same bar, each at its own tempo. The reference (${S.model.audio.lufs.toFixed(1)} LUFS) is ${Math.abs(d) < 0.3 ? 'at its own level' : `${d < 0 ? 'turned down' : 'turned up'} ${Math.abs(d).toFixed(1)} dB`} to match your preview's loudest 8 bars (${S.ourLufs.toFixed(1)} LUFS).`;
}

// ---------- recompute ----------
function snapshot() { S.undo.push(JSON.stringify({ov: S.ov, opts: S.opts, parts: S.loop.parts.map(p => ({id: p.id, role: p.role, follow: p.follow, entry: p.entry, sound: p.sound, level: p.level, mute: p.mute, solo: p.solo})), bars: S.loop.bars})); if (S.undo.length > 80) S.undo.shift(); }
function undo() {
  const j = S.undo.pop(); if (!j) { toast('Nothing to undo.'); return; }
  const u = JSON.parse(j); S.ov = u.ov; S.opts = u.opts; S.loop.bars = u.bars; S.loop.beats = u.bars * 4;
  for (const q of u.parts) { const p = S.loop.parts.find(x => x.id === q.id); if (p) Object.assign(p, q); }
  recompute(); toast('Undone.');
}
function recompute({restart = true} = {}) {
  if (!S.model || !S.loop) return;
  S.loop.bpm = S.bpm || S.loop.bpm || S.model.bpm; S.bpm = S.loop.bpm;
  const k = playing() ? beatNow() : S.pos;
  S.plan = TE.plan(S.model, S.loop, S.opts, S.ov);
  for (const id of Object.keys(S.ov)) if (!S.loop.parts.some(p => p.id === id)) delete S.ov[id];
  if (A.eng) { A.eng.load(S.plan, {kickHz: TA.kickFor(S.loop.key)}); if (restart && A.pl.playing) A.pl.play(Math.min(k, S.plan.beats - 0.01)); }
  for (const s of ['#board', '#partsSec', '#movesSec', '#measSec', '#exportSec', '#transport']) $(s).hidden = false;
  $('#bpm').value = String(Math.round(S.bpm * 100) / 100);
  renderFacts(); layoutBoard(); draw(); renderParts(); renderMoves(); renderTouches(); renderMeasured(); renderLive(); ui(); save();
  clearTimeout(recompute.m); recompute.m = setTimeout(matchLoudness, 900);
}
function setModel(m, {buffer = null, shapeId = null} = {}) {
  S.model = m; S.refBuf = buffer; S.shapeId = shapeId; S.ov = {}; S.sel = null; S.undo = [];
  if (!S.loop) S.loop = TL.demo('warehouse'), S.demoId = 'warehouse';
  if (!S.bpm || shapeId) S.bpm = S.loop.bpm || m.bpm;
  if (!S.refBuf && S.mode === 'ref') setMode('you');
  if (A.pl) A.pl.setLoop(null);
  recompute(); renderSetup();
}
function setLoop(l, {demoId = null} = {}) {
  S.loop = l; S.demoId = demoId; S.ov = {}; S.sel = null; S.undo = [];
  S.bpm = l.bpm || (S.model && S.model.bpm) || 124;
  if (!S.model) { S.model = shapeModel('peak-techno'); S.shapeId = 'peak-techno'; }
  recompute(); renderSetup();
}

// ---------- the setup cards ----------
function laneSketch(m, w = 190, h = 30) {
  const rows = ['kick', 'clap', 'hats', 'bass', 'pads', 'fx'], rh = h / rows.length, X = b => b / m.bars * w;
  let out = '';
  rows.forEach((l, i) => { const c = TM.LANE[l].c; let b = 0; while (b < m.bars) { if (!m.on[l][b]) { b++; continue; } let e = b; while (e < m.bars && m.on[l][e]) e++; out += `<rect x="${X(b).toFixed(1)}" y="${(i * rh + 0.6).toFixed(1)}" width="${(X(e) - X(b)).toFixed(1)}" height="${(rh - 1.2).toFixed(1)}" rx="1" fill="${c}" opacity=".85"/>`; b = e; } });
  for (const s of m.sections) out += `<rect x="${X(s.start).toFixed(1)}" y="0" width="0.8" height="${h}" fill="#ffffff40"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}
function loopSketch(l, w = 190, h = 30) {
  const ps = l.parts.slice(0, 8), rh = h / Math.max(1, ps.length), X = t => t / (l.bars * 4) * w;
  let out = '';
  ps.forEach((p, i) => { for (const n of p.notes) out += `<rect x="${X(n.t).toFixed(1)}" y="${(i * rh + 0.5).toFixed(1)}" width="${Math.max(0.9, X(n.d)).toFixed(1)}" height="${(rh - 1).toFixed(1)}" fill="${p.color}"/>`; });
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}
function renderSetup() {
  $('#shapes').innerHTML = TSHAPES.map(s => { const m = shapeModel(s.id); return `<button class="chipcard" type="button" role="listitem" data-shape="${s.id}" aria-pressed="${S.shapeId === s.id}" title="${esc(s.blurb)}"><b>${esc(s.name)}</b><small>${s.bpm} BPM · ${m.bars} bars · ${m.moves.length} moves</small>${laneSketch(m)}</button>`; }).join('');
  $('#demos').innerHTML = TL.DEMOS.map(d => { const l = demoCache(d.id); return `<button class="chipcard" type="button" role="listitem" data-demo="${d.id}" aria-pressed="${S.demoId === d.id}" title="${esc(d.blurb)}"><b>${esc(d.name)}</b><small>${esc(d.key)} · ${d.bpm} BPM · ${d.bars} bars · ${l.parts.length} parts</small>${loopSketch(l)}</button>`; }).join('');
  const m = S.model, l = S.loop;
  $('#refStatus').innerHTML = m ? `<b>${esc(m.name)}</b> · ${Math.round(m.bpm * 10) / 10} BPM${m.key ? ` · ${esc(m.key.name)}` : ''} · ${m.bars} bars · ${m.sections.length} sections · ${m.moves.length} moves · ${({audio: 'measured from audio', blueprint: 'from a Blueprint file', 'blueprint-v1': 'from an older Blueprint file (lanes and positions only)', shape: 'a built-in shape', saved: 'saved'})[m.source] || m.source}${S.refBuf ? ' · <span style="color:var(--ok)">A/B ready</span>' : m.audio ? ' · <span class="warn">drop the track again for the A/B</span>' : ''}` : '';
  $('#loopStatus').innerHTML = l ? `<b>${esc(l.name || 'Your loop')}</b> · ${l.bars} bar${l.bars > 1 ? 's' : ''} · ${l.parts.length} parts${l.key ? ` · ${esc(l.key.name)} (${esc(l.key.camelot)})` : ''}${l.bpm ? ` · ${Math.round(l.bpm * 10) / 10} BPM` : ''}${l.warnings && l.warnings.length ? `<br><span class="warn">${esc(l.warnings.join(' '))}</span>` : ''}${l.shifted ? `<br><span class="warn">${l.shifted} empty bars at the start were removed.</span>` : ''}` : '';
}
const demoCaches = new Map();
const demoCache = id => { if (!demoCaches.has(id)) demoCaches.set(id, TL.demo(id)); return demoCaches.get(id); };

// ---------- loading a reference ----------
function setProg(p) { const el = $('#refProg'); el.hidden = !p; if (p) { $('.bar i', el).style.width = Math.round(p.frac * 100) + '%'; $('.st', el).textContent = p.stage; $('.pc', el).textContent = Math.round(p.frac * 100) + '%'; } }
function refErr(m) { const el = $('#refErr'); el.hidden = !m; el.textContent = m || ''; }
async function analyse(L, R, sr, name) {
  const an = await XR.analyze({L, R, sr}, p => setProg({stage: p.stage, frac: p.frac * 0.6}));
  await BP.prepare(an, p => setProg({stage: p.stage, frac: 0.6 + 0.4 * p.frac}));
  return TM.fromAnalysis(an, name);
}
async function decodeFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer()), info = XR.sniff(bytes, file.name), sr = info.sr >= 8000 && info.sr <= 192000 ? info.sr : 44100;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, ctx = new OAC(2, 1, sr);
  return await new Promise((res, rej) => { const p = ctx.decodeAudioData(bytes.buffer, res, rej); if (p && p.then) p.then(res, rej); });
}
async function loadRef(file) {
  if (!file || S.busy) return;
  refErr(''); S.busy = true; busy(true);
  try {
    if (/\.json$/i.test(file.name) || file.type === 'application/json') {
      if (file.size > 20e6) throw Error('That JSON file is too big to be a Blueprint export.');
      const j = JSON.parse(await file.text());
      if (j && j.v === 1 && j.loop && j.model) { applySession(j); return; }
      setModel(TM.fromJSON(j, (j.track || file.name).replace(/\.json$/i, '').replace(/ - Blueprint$/, '')));
      toast(`Arrangement read from ${file.name}${S.model.source === 'blueprint-v1' ? ' (an older Blueprint file: lanes and positions, without exact roll hits)' : ''}`, 4200);
      return;
    }
    if (file.size > 400e6) throw Error('Choose a file under 400 MB.');
    setProg({stage: 'Decoding ' + file.name, frac: 0});
    const buf = await decodeFile(file);
    if (buf.duration < 20) throw Error('That file is under 20 seconds. Transplant needs a whole track to borrow its arrangement.');
    if (buf.duration > 20 * 60) throw Error('Choose a track under 20 minutes.');
    const t0 = performance.now(), m = await analyse(buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : null, buf.sampleRate, file.name.replace(/\.[^.]+$/, ''));
    setProg(null); S.refFile = file;
    setModel(m, {buffer: buf});
    toast(`Measured in ${((performance.now() - t0) / 1000).toFixed(1)} s: ${m.sections.length} sections and ${m.moves.length} moves, rebuilt on your loop.`, 4200);
    $('#board').scrollIntoView({behavior: 'smooth'});
  } catch (e) {
    setProg(null);
    refErr(/decode|EncodingError|Unable to decode/i.test(String(e && (e.name + e.message))) ? "This browser couldn't decode that file. Try an MP3 or WAV export of it." : (e && e.message) || String(e));
  } finally { S.busy = false; busy(false); }
}
async function loadDemoTrack() {
  if (S.busy) return; refErr(''); S.busy = true; busy(true);
  try {
    setProg({stage: 'Synthesizing the demo track', frac: 0}); await new Promise(r => setTimeout(r, 30));
    const d = BPDemo.synthDemo({fx: true}), buf = toBuffer(d);
    const m = await analyse(d.L, d.R, d.sr, 'Blueprint demo track');
    setProg(null); setModel(m, {buffer: buf});
    toast(`The demo track: ${m.sections.length} sections and ${m.moves.length} moves measured, rebuilt on your loop. Press R to hear the original.`, 4800);
    $('#board').scrollIntoView({behavior: 'smooth'});
  } catch (e) { setProg(null); refErr(e.message || String(e)); } finally { S.busy = false; busy(false); }
}
function toBuffer({L, R, sr}) {
  const b = new AudioBuffer({length: L.length, numberOfChannels: 2, sampleRate: sr});
  b.copyToChannel(L, 0); b.copyToChannel(R || L, 1); return b;
}
function busy(on) { for (const id of ['#refPick', '#refJson', '#refDemo']) $(id).disabled = on; }

// ---------- loading a loop ----------
function loopErr(m) { const el = $('#loopErr'); el.hidden = !m; el.textContent = m || ''; }
async function loadLoop(files) {
  files = [...files].filter(f => /\.(mid|midi|smf)$/i.test(f.name) || /midi/.test(f.type));
  if (!files.length) { loopErr('Choose MIDI files (.mid). In Live: right-click a clip → Export MIDI Clip.'); return; }
  loopErr('');
  try {
    const inputs = await Promise.all(files.slice(0, 32).map(async f => ({name: f.name, bytes: new Uint8Array(await f.arrayBuffer())})));
    const l = TL.fromMidi(inputs);
    l.name = files.length === 1 ? files[0].name.replace(/\.(mid|midi)$/i, '') : commonName(files.map(f => f.name)) || 'My loop';
    setLoop(l);
    toast(`${l.parts.length} parts from ${files.length} file${files.length > 1 ? 's' : ''}: ${l.bars} bars${l.key ? ', ' + l.key.name : ''}. Check each part's role below.`, 4200);
  } catch (e) { loopErr(e.message || String(e)); }
}
function commonName(names) { const n = names.map(s => s.replace(/\.(mid|midi)$/i, '')); let p = n[0] || ''; for (const s of n) while (p && !s.startsWith(p)) p = p.slice(0, -1); return p.replace(/[\s\-_]+$/, '').trim(); }

// ---------- the board ----------
const CV = {rows: [], width: 0, height: 0, dpr: 1, moveRows: [], fxHits: [], partRows: new Map()};
const RH = {ruler: 22, sections: 26, grp: 18, lane: 12, mvRow: 13, part: 26, fx: 28, energy: 54};
function layoutBoard() {
  const pl = S.plan, m = S.model, rows = [];
  let y = 0; const add = (r) => { r.y = y; y += r.h; rows.push(r); return r; };
  add({k: 'ruler', h: RH.ruler, label: 'Bar'});
  add({k: 'sections', h: RH.sections, label: 'Sections'});
  add({k: 'grp', h: RH.grp, label: 'Reference', cls: 'ref'});
  for (const l of TM.LANES) add({k: 'lane', lane: l.k, h: RH.lane, label: l.name, c: l.c});
  // moves stacked in rows so their dimension lines never overlap
  const mvs = m.moves.slice().sort((a, b) => a.k0 - b.k0), ends = [];
  CV.moveRows = mvs.map(e => { const k1 = Math.max(e.k1, e.k0 + m.beats / 120); let r = ends.findIndex(x => x <= e.k0 - 0.5); if (r < 0) { r = ends.length; ends.push(0); } ends[r] = k1; return {e, r}; });
  add({k: 'moves', h: Math.max(1, ends.length) * RH.mvRow + 8, label: 'Moves', n: ends.length});
  add({k: 'grp', h: RH.grp, label: 'Your loop', cls: 'you'});
  CV.partRows = new Map();
  for (const x of pl.parts) CV.partRows.set(x.id, add({k: 'part', x, h: RH.part, label: x.part.name, c: x.part.color}));
  add({k: 'fx', h: RH.fx, label: 'FX'});
  add({k: 'energy', h: RH.energy, label: 'Shape'});
  CV.rows = rows; CV.height = y;
  $('#labels').style.height = y + 'px';
  $('#labels').innerHTML = rows.map(r => {
    const st = `top:${r.y}px;height:${r.h}px`;
    if (r.k === 'grp') return `<div class="lb grp ${r.cls}" style="${st}">${esc(r.label)}</div>`;
    if (r.k === 'part') { const n = r.x.act.on.reduce((s, v) => s + v, 0); return `<div class="lb part${r.x.part.mute ? ' mute' : ''}" style="${st}"><i style="background:${r.c}"></i>${esc(r.label)}<small>${n}</small></div>`; }
    if (r.k === 'lane') return `<div class="lb" style="${st};font-size:11px;color:var(--dim)"><i style="background:${r.c};height:6px"></i>${esc(r.label)}</div>`;
    return `<div class="lb" style="${st};color:var(--dim)">${esc(r.label)}</div>`;
  }).join('');
}
const X = k => k / S.plan.beats * CV.width;
function draw() {
  if (!S.plan) return;
  const sc = $('#scroll'), cv = $('#cv'), ov = $('#ov'), dpr = Math.min(2, window.devicePixelRatio || 1), m = S.model, pl = S.plan;
  const minPx = window.innerWidth < 600 ? 3.2 : 2;
  CV.width = Math.max(sc.clientWidth * S.zoom, Math.ceil(m.bars * minPx)); CV.dpr = dpr;
  for (const c of [cv, ov]) { c.width = Math.round(CV.width * dpr); c.height = Math.round(CV.height * dpr); c.style.width = CV.width + 'px'; c.style.height = CV.height + 'px'; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, CV.width, CV.height);
  const W = CV.width, H = CV.height, pxBar = W / m.bars, mono = '500 10.5px "IBM Plex Mono", ui-monospace, monospace', body = '600 11px Archivo, system-ui, sans-serif';
  // phrase shading and bar lines
  for (const s of m.sections) for (let b = s.start, i = 0; b < s.end; b += 8, i++) if (i % 2) { g.fillStyle = '#ffffff05'; g.fillRect(X(b * 4), 0, X(Math.min(s.end, b + 8) * 4) - X(b * 4), H); }
  g.fillStyle = '#ffffff0b'; if (pxBar >= 5) for (let b = 0; b <= m.bars; b++) g.fillRect(Math.round(X(b * 4)), 0, 1, H);
  g.fillStyle = '#ffffff14'; for (let b = 0; b <= m.bars; b += 4) g.fillRect(Math.round(X(b * 4)), 0, 1, H);
  g.fillStyle = '#ffffff2e'; for (const s of m.sections) g.fillRect(Math.round(X(s.start * 4)), 0, 1, H);
  for (const r of CV.rows) {
    const {y, h} = r;
    if (r.k === 'ruler') {
      g.fillStyle = '#12171b'; g.fillRect(0, y, W, h); g.font = mono; g.textBaseline = 'middle'; g.fillStyle = '#86939E';
      const every = pxBar * 8 >= 34 ? (pxBar * 4 >= 34 ? 4 : 8) : 16;
      for (let b = 0; b < m.bars; b += every) g.fillText(String(b + 1), X(b * 4) + 3, y + h / 2);
    } else if (r.k === 'sections') {
      for (const s of m.sections) { const x0 = X(s.start * 4) + 1, x1 = X(s.end * 4) - 1; g.fillStyle = s.color + '38'; rr(g, x0, y + 3, x1 - x0, h - 6, 4); g.fill(); g.fillStyle = s.color; g.fillRect(x0, y + 3, 3, h - 6); g.font = body; g.fillStyle = '#fff'; g.textBaseline = 'middle'; clipText(g, `${s.name}  ${s.bars}`, x0 + 7, y + h / 2, x1 - x0 - 10); }
    } else if (r.k === 'lane') {
      const a = m.lanes[r.lane], on = m.on[r.lane], c = r.c;
      for (let k = 0; k < m.beats; k++) { const v = a[k]; if (v < 0.05) continue; g.fillStyle = c; g.globalAlpha = 0.12 + 0.55 * v; g.fillRect(X(k), y + 2, Math.max(1, X(k + 1) - X(k)), h - 4); }
      g.globalAlpha = 1; g.fillStyle = c;
      let b = 0; while (b < m.bars) { if (!on[b]) { b++; continue; } let e = b; while (e < m.bars && on[e]) e++; g.fillRect(X(b * 4), y + h - 2, X(e * 4) - X(b * 4), 1.5); b = e; }
    } else if (r.k === 'moves') {
      for (const {e, r: sub} of CV.moveRows) {
        const yy = y + 5 + sub * RH.mvRow, x0 = X(e.k0), x1 = Math.max(x0 + 3, X(e.k1)), on = !S.opts.off[e.id] && S.opts.cats[e.cat] !== false, sel = S.sel && S.sel.move === e.id;
        g.globalAlpha = on ? 1 : 0.3; g.strokeStyle = e.color; g.fillStyle = e.color; g.lineWidth = sel ? 2.5 : 1.5;
        if (e.type === 'crash' || e.type === 'boom') { g.beginPath(); g.moveTo(x0, yy + 1); g.lineTo(x0 + 4, yy + 5); g.lineTo(x0, yy + 9); g.lineTo(x0 - 4, yy + 5); g.closePath(); g.fill(); }
        else if (X(e.k1) - x0 < 7) { g.beginPath(); g.moveTo(x0 - 3.5, yy + 1); g.lineTo(x0 + 3.5, yy + 1); g.lineTo(x0, yy + 9); g.closePath(); g.fill(); }
        else { g.beginPath(); g.moveTo(x0, yy + 1); g.lineTo(x0, yy + 9); g.moveTo(x1, yy + 1); g.lineTo(x1, yy + 9); g.moveTo(x0, yy + 5); g.lineTo(x1, yy + 5); g.stroke(); }
        if (x1 - x0 > 60 || (e.type === 'crash' && pxBar > 10)) { g.font = '600 10px Archivo, system-ui'; g.fillStyle = '#fff'; g.textBaseline = 'middle'; clipText(g, short(e), x0 + 6, yy + 5, x1 - x0 - 10); }
        if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(x0 - 3, yy - 1, x1 - x0 + 6, 12); }
        g.globalAlpha = 1;
      }
    } else if (r.k === 'grp') {
      g.fillStyle = r.cls === 'ref' ? '#7fd6ff10' : '#ff8a3d10'; g.fillRect(0, y, W, h); g.fillStyle = r.cls === 'ref' ? '#7fd6ff' : '#ff8a3d'; g.fillRect(0, y + h - 1, W, 1);
    } else if (r.k === 'part') drawPart(g, r, pxBar);
    else if (r.k === 'fx') drawFx(g, r);
    else if (r.k === 'energy') drawEnergy(g, r);
  }
  drawOverlay();
}
function short(e) { return ({lp: e.opening ? 'LP opens' : 'LP closes', hp: e.opening ? 'HP opens' : 'HP rises', lpStatic: `LP ${TE.hzText(e.hz)}`, hpStatic: `HP ${TE.hzText(e.hz)}`, riser: 'Riser', reverse: 'Reverse', pitchUp: `Pitch +${Math.round(e.semis)}`, pitchDown: 'Downlifter', roll: 'Roll', kickOut: 'Kick out', gap: 'Gap', tail: 'Tail', echo: `Throw ${e.note || ''}`, crash: 'Crash', boom: 'Boom', stutter: `Stutter ${e.grid || ''}`, tapeStop: 'Tape stop', width: 'Width', fade: 'Fade'})[e.type] || e.title; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function clipText(g, t, x, y, w) { if (w < 14) return; let s = t; while (s.length > 1 && g.measureText(s).width > w) s = s.slice(0, -2) + '…'; if (g.measureText(s).width <= w) g.fillText(s, x, y); }
function drawPart(g, r, pxBar) {
  const {x, y, h} = r, m = S.model, c = x.part.color, on = x.act.on, why = x.act.why, ov = S.ov[x.id] || {};
  g.globalAlpha = x.part.mute ? 0.35 : 1;
  // waiting bars: the lane plays, this layer doesn't (yet)
  for (let b = 0; b < m.bars; b++) if (!on[b] && why[b] === 2) { g.strokeStyle = c + '40'; g.setLineDash([2, 3]); g.strokeRect(X(b * 4) + 0.5, y + 4.5, X(b * 4 + 4) - X(b * 4) - 1, h - 9); g.setLineDash([]); }
  let b = 0;
  while (b < m.bars) { if (!on[b]) { b++; continue; } let e = b; while (e < m.bars && on[e]) e++; const x0 = X(b * 4) + 0.5, x1 = X(e * 4) - 0.5; g.fillStyle = c + '2a'; rr(g, x0, y + 3, x1 - x0, h - 6, 3); g.fill(); g.strokeStyle = c + 'aa'; g.lineWidth = 1; g.stroke(); b = e; }
  // notes
  const ns = x.notes, drum = x.part.kind === 'drum', lo = Math.min(...x.part.notes.map(n => n.n)), hi = Math.max(...x.part.notes.map(n => n.n)), span = Math.max(1, hi - lo);
  const TAGC = {roll: '#fff', echo: '#c6ffd9', stutter: '#ffe27a', fill: '#ffffff', held: '#bfe6ff', carry: c};
  for (const n of ns) {
    const xx = X(n.t);
    if (drum) { const hh = (h - 10) * (0.35 + 0.65 * n.v / 127); g.fillStyle = n.tag ? TAGC[n.tag] || '#fff' : c; g.fillRect(xx, y + h - 5 - hh, Math.max(1, Math.min(2, pxBar / 16)), hh); }
    else { const yy = y + 5 + (h - 12) * (1 - (n.n - lo) / span); g.fillStyle = n.tag ? TAGC[n.tag] || '#fff' : c; g.fillRect(xx, yy, Math.max(1, X(n.t + n.d) - xx - 0.5), 2); }
  }
  // overrides
  for (const k of Object.keys(ov)) { const bar = +k; g.fillStyle = ov[k] ? '#7EE0A5' : '#FF6B5B'; g.beginPath(); g.arc(X(bar * 4 + 2), y + 3.5, 2.2, 0, 7); g.fill(); }
  // the filter on this part's group, as a line: where the cutoff is, darker above it
  const F = S.plan.filt[x.group];
  if (F) {
    g.globalAlpha = 1; g.strokeStyle = '#7CE7FF'; g.lineWidth = 1.2; g.beginPath(); let pen = false;
    for (let i = 0; i < F.lp.length; i += 2) {
      const lp = F.lp[i], hp = F.hp[i], act = (lp < 19000 || hp > 25) && on[Math.floor(i / 16)];
      if (!act) { pen = false; continue; }
      const f = lp < 19000 ? lp : hp, yy = y + h - 3 - (h - 6) * clamp(Math.log2(f / 30) / Math.log2(18000 / 30), 0, 1), xx = X(i / 4);
      g.fillStyle = '#0E121599'; if (lp < 19000) g.fillRect(xx, y + 2, X(i / 4 + 0.5) - xx, yy - y - 2); else g.fillRect(xx, yy, X(i / 4 + 0.5) - xx, y + h - 2 - yy);
      if (!pen) { g.moveTo(xx, yy); pen = true; } else g.lineTo(xx, yy);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}
function drawFx(g, r) {
  const {y, h} = r; CV.fxHits = [];
  for (const f of S.plan.fx) {
    const x0 = X(f.k0), x1 = Math.max(x0 + 2, X(f.k1)), touch = f.src === 'touch', col = TM.COLOR[TM.CAT[f.type]];
    g.fillStyle = col + (touch ? '55' : 'aa'); g.strokeStyle = col; g.lineWidth = 1; if (touch) g.setLineDash([2, 2]);
    g.beginPath();
    if (f.type === 'riser' || f.type === 'pitchUp') { g.moveTo(x0, y + h - 4); g.lineTo(x1, y + 4); g.lineTo(x1, y + h - 4); g.closePath(); g.fill(); }
    else if (f.type === 'reverse') { g.moveTo(x0, y + h - 4); g.quadraticCurveTo(x1 - 2, y + h - 4, x1, y + 4); g.lineTo(x1, y + h - 4); g.closePath(); g.fill(); }
    else if (f.type === 'pitchDown') { g.moveTo(x0, y + 4); g.lineTo(x1, y + h - 4); g.lineTo(x0, y + h - 4); g.closePath(); g.fill(); }
    else if (f.type === 'crash') { g.moveTo(x0, y + 5); g.lineTo(x0 + 5, y + h / 2); g.lineTo(x0, y + h - 5); g.lineTo(x0 - 5, y + h / 2); g.closePath(); g.fill(); g.stroke(); }
    else if (f.type === 'boom') { g.arc(x0 + 8, y + h / 2, 4.5, 0, 7); g.fill(); g.stroke(); }
    g.setLineDash([]);
    CV.fxHits.push({f, x0: Math.min(x0 - 6, x0), x1: Math.max(x1, x0 + 14)});
  }
  // gaps and tape stops as cuts across the whole board
  for (const mu of S.plan.mutes) { g.fillStyle = '#0E1215'; const a = X(mu.k0), b = X(mu.k1); g.fillRect(a, CV.rows.find(q => q.k === 'grp' && q.cls === 'you').y + RH.grp, Math.max(1.5, b - a), y - CV.rows.find(q => q.k === 'grp' && q.cls === 'you').y - RH.grp); }
}
function drawEnergy(g, r) {
  const {y, h} = r, pl = S.plan, m = S.model, E = pl.metrics.energy, mx = Math.max(...E, 1e-9), T = m.tensionBar, xb = b => X(b * 4 + 2);
  g.fillStyle = '#7fd6ff22'; g.beginPath(); g.moveTo(xb(0), y + h - 3); for (let b = 0; b < m.bars; b++) g.lineTo(xb(b), y + h - 3 - (h - 8) * T[b]); g.lineTo(xb(m.bars - 1), y + h - 3); g.closePath(); g.fill();
  g.strokeStyle = '#7FD6FF'; g.lineWidth = 1.4; g.beginPath(); for (let b = 0; b < m.bars; b++) { const yy = y + h - 3 - (h - 8) * T[b]; b ? g.lineTo(xb(b), yy) : g.moveTo(xb(b), yy); } g.stroke();
  g.strokeStyle = '#FF8A3D'; g.lineWidth = 2; g.beginPath(); for (let b = 0; b < m.bars; b++) { const yy = y + h - 3 - (h - 8) * E[b] / mx; b ? g.lineTo(xb(b), yy) : g.moveTo(xb(b), yy); } g.stroke();
}
function drawOverlay() {
  const ov = $('#ov'); if (!ov || !S.plan) return;
  const g = ov.getContext('2d'); g.setTransform(CV.dpr, 0, 0, CV.dpr, 0, 0); g.clearRect(0, 0, CV.width, CV.height);
  const lp = A.pl && A.pl.loop;
  if (lp) { g.fillStyle = '#FFC53114'; g.fillRect(X(lp[0]), 0, X(lp[1]) - X(lp[0]), CV.height); g.fillStyle = '#FFC531'; g.fillRect(X(lp[0]), 0, X(lp[1]) - X(lp[0]), 3); }
  if (CV.hoverBar != null) { g.fillStyle = '#ffffff0d'; g.fillRect(X(CV.hoverBar * 4), 0, X(CV.hoverBar * 4 + 4) - X(CV.hoverBar * 4), CV.height); }
  const k = beatNow(); if (k == null) return;
  const x = X(k); g.fillStyle = S.mode === 'ref' ? '#7FD6FF' : '#FFFFFF'; g.fillRect(Math.round(x), 0, 1.5, CV.height);
  g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x + 6, 0); g.lineTo(x + 0.5, 7); g.closePath(); g.fill();
}

// ---------- board interaction ----------
function rowAt(y) { return CV.rows.find(r => y >= r.y && y < r.y + r.h); }
function hitMove(px, py, r) { for (const {e, r: sub} of CV.moveRows) { const yy = r.y + 5 + sub * RH.mvRow, x0 = X(e.k0) - 5, x1 = Math.max(X(e.k1), X(e.k0) + 8) + 5; if (px >= x0 && px <= x1 && py >= yy - 3 && py <= yy + 12) return e; } return null; }
function pos(ev) { const rc = $('#cv').getBoundingClientRect(); const px = ev.clientX - rc.left, py = ev.clientY - rc.top; return {px, py, k: clamp(px / CV.width, 0, 0.99999) * S.plan.beats}; }
let drag = null;
function onDown(ev) {
  if (!S.plan || ev.button > 0 && ev.button !== 0) return;
  const p = pos(ev), r = rowAt(p.py); if (!r) return;
  const bar = Math.floor(p.k / 4);
  if (r.k === 'part') {
    const x = r.x, cur = x.act.on[bar];
    snapshot();
    const mode = ev.altKey ? 'clear' : cur ? 0 : 1;
    if (ev.shiftKey) { const s = S.model.sections.find(s => bar >= s.start && bar < s.end), a = s.start + Math.floor((bar - s.start) / 8) * 8; for (let b = a; b < Math.min(s.end, a + 8); b++) paint(x.id, b, mode); recompute(); return; }
    drag = {type: 'paint', id: x.id, mode, last: bar}; paint(x.id, bar, mode); recompute();
    $('#cv').setPointerCapture(ev.pointerId); ev.preventDefault(); return;
  }
  if (r.k === 'moves') { const e = hitMove(p.px, p.py, r); if (e) { selectMove(e, true); return; } }
  if (r.k === 'fx') { const h = CV.fxHits.find(q => p.px >= q.x0 && p.px <= q.x1); if (h) { const mv = h.f.id ? S.model.moves.find(m => m.id === h.f.id) : null; if (mv) selectMove(mv, true); else { S.sel = {bar: Math.floor(h.f.k0 / 4)}; inspectBar(S.sel.bar); seek(Math.max(0, h.f.k0 - 8)); } return; } }
  drag = {type: 'seek', k0: p.k, bar0: bar, moved: false}; $('#cv').setPointerCapture(ev.pointerId);
}
function paint(id, bar, mode) { if (mode === 'clear') { if (S.ov[id]) { delete S.ov[id][bar]; if (!Object.keys(S.ov[id]).length) delete S.ov[id]; } } else { (S.ov[id] ||= {})[bar] = mode; } }
function onMove(ev) {
  if (!S.plan) return;
  const p = pos(ev), bar = Math.floor(p.k / 4);
  if (drag && drag.type === 'paint') { if (bar !== drag.last) { const a = Math.min(bar, drag.last), b = Math.max(bar, drag.last); for (let q = a; q <= b; q++) paint(drag.id, q, drag.mode); drag.last = bar; cancelAnimationFrame(onMove.raf); onMove.raf = requestAnimationFrame(() => recompute({restart: false})); } return; }
  if (drag && drag.type === 'seek') { if (Math.abs(bar - drag.bar0) >= 1) { drag.moved = true; const a = Math.min(bar, drag.bar0), b = Math.max(bar, drag.bar0) + 1; ensureAudio(); A.pl.setLoop([a * 4, b * 4]); S.loopOn = true; loopUI(); drawOverlay(); } return; }
  CV.hoverBar = bar; tip(p, ev); drawOverlay();
}
function onUp(ev) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.type === 'paint') { recompute(); return; }
  if (d.type === 'seek') {
    if (d.moved) { const lp = A.pl.loop; S.pos = lp[0]; play(lp[0]); toast(`Looping bars ${lp[0] / 4 + 1}–${lp[1] / 4}. L or the Loop button stops it.`); }
    else { const bar = Math.floor(d.k0 / 4); S.sel = {bar}; inspectBar(bar); seek(bar * 4); }
  }
}
function tip(p, ev) {
  const t = $('#tip'), r = rowAt(p.py); if (!r) { t.hidden = true; return; }
  const bar = Math.floor(p.k / 4), sec = secAt(p.k); let html = '';
  if (r.k === 'part') {
    const x = r.x, on = x.act.on[bar], w = x.act.why[bar], ov = S.ov[x.id] && S.ov[x.id][bar] != null;
    html = `<b>${esc(x.part.name)}</b>, bar ${bar + 1}${sec ? ` (${esc(sec.name)})` : ''}<br>${on ? 'Plays' : 'Silent'}: ${ov ? 'you set this bar' : w === 2 ? `the ${esc(TM.LANE[x.part.follow].name.toLowerCase())} lane plays, but this layer waits for a fuller phrase` : on ? `follows ${esc(TM.LANE[x.part.follow] ? TM.LANE[x.part.follow].name.toLowerCase() : x.part.follow)}` : 'its lane is out here'}<br><small>Click to switch, drag to paint, Alt-click to give it back, Shift-click for the phrase</small>`;
  } else if (r.k === 'moves') { const e = hitMove(p.px, p.py, r); html = e ? `<b>${esc(e.title)}</b><br>${esc(e.at)} → ${esc(e.to)}<br><small>Click to see how it was rebuilt</small>` : ''; }
  else if (r.k === 'lane') { const v = S.model.lanes[r.lane][Math.floor(p.k)]; html = `<b>${esc(r.label)}</b> in the reference, bar ${bar + 1}: ${S.model.on[r.lane][bar] ? 'plays' : 'out'} (level ${Math.round(v * 100)}%)`; }
  else if (r.k === 'energy') html = `Bar ${bar + 1}: reference tension ${Math.round(S.model.tensionBar[bar] * 100)}, your energy ${Math.round(S.plan.metrics.energy[bar] / Math.max(...S.plan.metrics.energy) * 100)}`;
  else if (r.k === 'fx') { const h = CV.fxHits.find(q => p.px >= q.x0 && p.px <= q.x1); html = h ? `<b>${esc(TM.TITLES[h.f.type])}</b>${h.f.src === 'touch' ? ' (a touch: the reference has none here)' : ''}<br>${esc(bb(h.f.k0))} → ${esc(bb(h.f.k1))}` : ''; }
  else html = `Bar ${bar + 1}${sec ? `, ${esc(sec.name)}` : ''}<br><small>Click to play from here, drag to loop</small>`;
  if (!html) { t.hidden = true; return; }
  t.innerHTML = html; t.hidden = false;
  const sc = $('#scroll'), sr = sc.getBoundingClientRect(), tx = ev.clientX - sr.left + sc.scrollLeft + 14, ty = ev.clientY - sr.top + 12;
  t.style.left = Math.min(tx, sc.scrollLeft + sc.clientWidth - 330) + 'px'; t.style.top = Math.min(ty, CV.height - 70) + 'px';
}

// ---------- inspector ----------
function selectMove(e, hear) {
  S.sel = {move: e.id}; draw(); renderMoves();
  const l = S.plan.log.find(l => l.move.id === e.id);
  const kv = (k, v) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`;
  const facts = [kv('From', e.at), kv('To', e.to), kv('Family', e.cat), kv('Status', l ? l.status : 'off')];
  if (e.target) facts.push(kv('On', TE.TARGET_NAME[e.target]));
  if (e.conf != null && S.model.source === 'audio') facts.push(kv('Measured', e.conf >= 0.7 ? 'sure' : e.conf >= 0.4 ? 'likely' : 'check by ear'));
  const recipe = l ? TE.recipe(l, S.plan) : [];
  const bp = (e.type === 'lp' || e.type === 'hp') ? TE.breakpoints(e) : [];
  $('#insp').innerHTML = `<h3><span style="color:${e.color}">■</span> ${esc(e.title)} <small>${esc(e.at)} → ${esc(e.to)}</small></h3>
    <div class="kv">${facts.join('')}</div>
    ${l ? `<p><b>On your loop:</b> ${esc(l.text)}</p>` : '<p>This move is switched off.</p>'}
    ${e.what ? `<p class="note">In the reference: ${esc(e.what)}</p>` : ''}
    ${recipe.length ? `<h4 style="margin:10px 0 4px">In Live</h4><ol>${recipe.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` : ''}
    ${bp.length ? `<table><thead><tr><th>Bar</th><th>Cutoff</th><th>CC74</th></tr></thead><tbody>${bp.map(p => `<tr><td class="num">${esc(p.bar)}</td><td class="num">${esc(TE.hzText(p.hz))}</td><td class="num">${p.cc}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="row"><button class="btn sm" id="ipLoop" type="button">Loop it</button>${S.refBuf ? '<button class="btn ghost sm" id="ipRef" type="button">Hear the reference here</button>' : ''}</div>`;
  const a = Math.max(0, Math.floor(e.k0 / 4) - 2) * 4, b = Math.min(S.plan.beats, (Math.ceil(e.k1 / 4) + 1) * 4);
  $('#ipLoop').onclick = () => { ensureAudio(); A.pl.setLoop([a, b]); S.loopOn = true; setMode('you'); play(a); };
  if ($('#ipRef')) $('#ipRef').onclick = () => { ensureAudio(); A.pl.setLoop([a, b]); S.loopOn = true; setMode('ref'); play(a); };
  if (hear) { ensureAudio(); A.pl.setLoop([a, b]); S.loopOn = true; loopUI(); play(a); }
}
function inspectBar(bar) {
  const m = S.model, pl = S.plan, sec = m.sections.find(s => bar >= s.start && bar < s.end), k0 = bar * 4, k1 = k0 + 4;
  const lanes = TM.LANES.filter(l => m.on[l.k][bar]).map(l => l.name);
  const parts = pl.parts.filter(x => x.notes.some(n => n.t >= k0 && n.t < k1));
  const moves = pl.log.filter(l => l.move.k1 > k0 && l.move.k0 < k1);
  const tags = pl.tags.filter(t => t.k1 > k0 && t.k0 < k1 && t.type === 'fill');
  $('#insp').innerHTML = `<h3>Bar ${bar + 1} <small>${sec ? esc(sec.name) + `, bar ${bar - sec.start + 1} of ${sec.bars}` : ''}</small></h3>
    <div class="kv"><div><small>The reference plays</small><b>${esc(lanes.join(', ') || 'nothing')}</b></div><div><small>Your parts here</small><b>${esc(parts.map(x => x.part.name).join(', ') || 'none')}</b></div></div>
    ${moves.length ? `<ul>${moves.map(l => `<li><b>${esc(l.move.title)}</b> (${esc(l.move.at)}): ${esc(l.text || 'switched off')}</li>`).join('')}</ul>` : ''}
    ${tags.length ? `<p class="note">${tags.map(t => esc(t.what)).join(' · ')}</p>` : ''}`;
}

// ---------- panels ----------
function renderFacts() {
  const m = S.model, l = S.loop, M = S.plan.metrics;
  const f = (cls, k, v) => `<div class="fact ${cls}"><small>${esc(k)}</small><b title="${esc(v)}">${esc(v)}</b></div>`;
  $('#facts').innerHTML = [f('ref', 'Reference', m.name), f('ref', 'Its shape', `${m.bars} bars · ${m.sections.length} sections`), f('you', 'Your loop', `${l.bars} bars × ${Math.round(M.reps * 10) / 10}`), f('you', 'Parts', `${l.parts.length}`),
    f('ok', 'Shape match', `${Math.round(M.shape * 100)} / 100`), f('ok', 'Changes', `every ${M.every.toFixed(1)} bars`), f('ok', 'Moves rebuilt', `${M.rebuilt} of ${M.total}`)].join('');
  $('#boardHint').textContent = `${S.plan.metrics.notes.toLocaleString()} notes written · ${S.plan.fx.length} FX · ${Object.values(S.ov).reduce((s, o) => s + Object.keys(o).length, 0)} bars set by you`;
  const cats = TM.CATS.filter(c => m.moves.some(e => e.cat === c));
  $('#legend').innerHTML = [...cats.map(c => `<span><i style="background:${TM.COLOR[c]}"></i>${c}</span>`), '<span><i style="background:none;border:1px dashed #888"></i>layer waiting for a fuller phrase</span>', '<span><i style="background:#7CE7FF;height:2px"></i>filter cutoff on that group</span>', '<span><i style="background:#fff;width:3px"></i>roll, throw, stutter or fill</span>'].join('');
}
function soundOptions(p) {
  if (p.kind === 'drum') return TA.DRUM_VOICES.map(v => `<option value="${v}"${p.sound === v ? ' selected' : ''}>${esc(TA.DRUM_NAME[v])}</option>`).join('');
  const fam = new Map(); for (const s of TA.SOUNDS) { if (!fam.has(s.family)) fam.set(s.family, []); fam.get(s.family).push(s); }
  return [...fam].map(([f, ss]) => `<optgroup label="${esc(f)}">${ss.map(s => `<option value="${s.id}"${p.sound === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
}
function renderParts() {
  const l = S.loop, pl = S.plan;
  $('#loopbar').innerHTML = `<span>Loop <select id="loopBars">${[1, 2, 4, 8, 16, 32].map(b => `<option value="${b}"${l.bars === b ? ' selected' : ''}>${b} bar${b > 1 ? 's' : ''}</option>`).join('')}</select></span>
    <span>Key <b>${esc(l.key ? `${l.key.name} (${l.key.camelot})` : 'unclear')}</b></span><span>Kick tuned to <b>${TA.kickFor(l.key).toFixed(1)} Hz</b></span>
    <span>Played <b>${Math.round(pl.metrics.reps * 10) / 10}×</b> across the arrangement</span>
    <label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="restart"${S.opts.touches.restart ? ' checked' : ''}> each section starts on bar 1 of the loop</label>`;
  $('#loopBars').onchange = e => { snapshot(); l.bars = +e.target.value; l.beats = l.bars * 4; recompute(); };
  $('#restart').onchange = e => { snapshot(); S.opts.touches.restart = e.target.checked; recompute(); };
  $('#parts').innerHTML = pl.parts.filter(x => !x.synthetic).map(x => {
    const p = x.part, n = x.act.on.reduce((s, v) => s + v, 0), ent = TE.ENTRIES.find(e => e.k === p.entry) || TE.ENTRIES[0];
    const same = pl.parts.filter(y => y.part.follow === p.follow && !y.synthetic).length, laneName = TM.LANE[p.follow] ? TM.LANE[p.follow].name : p.follow;
    const desc = p.kind === 'drum' ? `pad ${OT.noteName(p.pitch)} · ${p.notes.length} hits` : `${p.notes.length} notes · ${OT.noteName(Math.min(...p.notes.map(q => q.n)))}–${OT.noteName(Math.max(...p.notes.map(q => q.n)))}`;
    const waits = x.act.why.reduce((s, v) => s + (v === 2 ? 1 : 0), 0);
    return `<div class="prow" style="--c:${p.color}" data-id="${p.id}">
      <div class="pname"><b title="${esc(p.name)}">${esc(p.name)}</b><small>${esc(desc)}</small></div>
      <label>Role<select data-k="role">${TL.ROLES.map(r => `<option value="${r.k}"${p.role === r.k ? ' selected' : ''}${p.kind === 'drum' && !TL.DRUM_ROLES.has(r.k) && r.k !== 'fx' ? ' disabled' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
      <label>Follows<select data-k="follow">${TM.LANES.map(q => `<option value="${q.k}"${p.follow === q.k ? ' selected' : ''}>${esc(q.name)}</option>`).join('')}</select></label>
      <label>Enters<select data-k="entry">${TE.ENTRIES.map(e => `<option value="${e.k}"${p.entry === e.k ? ' selected' : ''} title="${esc(e.text)}">${esc(e.name)}</option>`).join('')}</select></label>
      <label>Sound<select data-k="sound">${soundOptions(p)}</select></label>
      <label>Level<input type="range" min="0" max="150" value="${Math.round((p.level ?? 1) * 100)}" data-k="level"></label>
      <div class="ms"><button type="button" class="m" aria-pressed="${!!p.mute}" title="Mute">M</button><button type="button" class="s" aria-pressed="${!!p.solo}" title="Solo">S</button></div>
      <canvas width="600" height="60" aria-hidden="true"></canvas>
      <div class="why">${whyText(x, n, same, laneName, waits, ent)}</div>
    </div>`;
  }).join('');
  for (const row of $$('#parts .prow')) {
    const p = l.parts.find(q => q.id === row.dataset.id); if (!p) continue;
    drawMini(row.querySelector('canvas'), p, l);
    for (const sel of row.querySelectorAll('select')) sel.onchange = () => {
      snapshot(); const k = sel.dataset.k, v = sel.value;
      if (k === 'role') { TL.setRole(p, v); } else p[k] = v;
      if (k === 'sound' && A.ctx) previewSound(p);
      recompute();
    };
    row.querySelector('input[data-k=level]').oninput = e => { p.level = +e.target.value / 100; if (A.eng) A.eng.levels(); save(); };
    row.querySelector('.m').onclick = e => { p.mute = !p.mute; e.target.setAttribute('aria-pressed', String(p.mute)); if (A.eng) A.eng.levels(); layoutBoard(); draw(); save(); };
    row.querySelector('.s').onclick = e => { p.solo = !p.solo; e.target.setAttribute('aria-pressed', String(p.solo)); if (A.eng) A.eng.levels(); save(); };
  }
}
function whyText(x, n, same, laneName, waits, ent) {
  const p = x.part, ov = S.ov[p.id] ? Object.keys(S.ov[p.id]).length : 0, tail = ov ? ` You set ${ov} bar${ov > 1 ? 's' : ''} by hand.` : '';
  const head = `Plays <b>${n}</b> of ${S.plan.bars} bars`;
  if (p.entry === 'auto' && S.opts.touches.layers && same > 1) return `${head}, ${waits ? `one of ${same} parts on the <b>${esc(laneName)}</b> lane: it waits ${waits} bar${waits > 1 ? 's' : ''} for the reference's fuller phrases, so the layers arrive one at a time` : `the main layer of the <b>${esc(laneName)}</b> lane (${same} parts share it): it plays wherever the reference's lane does`}.${tail}`;
  if (p.entry === 'auto' || p.entry === 'lane') return `${head}, wherever the reference's <b>${esc(laneName)}</b> lane plays.${tail}`;
  return `${head}. <b>${esc(ent.name)}</b>: ${esc(ent.text.charAt(0).toLowerCase() + ent.text.slice(1))}.${tail}`;
}
function drawMini(cv, p, l) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height, beats = l.bars * 4; g.clearRect(0, 0, w, h);
  g.fillStyle = '#ffffff10'; for (let b = 0; b <= l.bars; b++) g.fillRect(Math.round(b / l.bars * w), 0, 1, h);
  const lo = Math.min(...p.notes.map(n => n.n)), hi = Math.max(...p.notes.map(n => n.n)), span = Math.max(1, hi - lo);
  g.fillStyle = p.color;
  for (const n of p.notes) { if (n.t >= beats) continue; const x = n.t / beats * w, y = p.kind === 'drum' ? h * (1 - 0.35 - 0.55 * n.v / 127) : 4 + (h - 12) * (1 - (n.n - lo) / span); g.globalAlpha = 0.45 + 0.55 * n.v / 127; g.fillRect(x, y, Math.max(2, n.d / beats * w - 1), p.kind === 'drum' ? h * (0.35 + 0.55 * n.v / 127) - 4 : 6); }
  g.globalAlpha = 1;
}
function previewSound(p) {
  ensureAudio(); const n = p.notes[0]; if (!n) return;
  const mini = {parts: [{part: p, id: p.id, role: p.role, group: TE.GROUP_OF[p.role], notes: p.notes.filter(q => q.t < 4).map(q => ({...q})), act: {on: new Uint8Array(1)}}], bpm: S.bpm, beats: 4, filt: {}, gain: new Float32Array(16).fill(1), mutes: [], tapes: [], tails: [], fx: [], duck: new Float32Array(1), release: new Float32Array(1)};
  if (A.pl.playing) return;
  // one small engine for auditions, reused
  const eng = A.prev || (A.prev = TA.create(A.ctx, {destination: A.out}));
  eng.silence(); eng.load(mini, {kickHz: TA.kickFor(S.loop.key)}); eng.prepare(); const t0 = A.ctx.currentTime + 0.05; eng.schedule(0, 4, k => t0 + k * eng.spb, {fresh: true});
}
function renderMoves() {
  const m = S.model, pl = S.plan;
  $('#cats').innerHTML = TM.CATS.filter(c => m.moves.some(e => e.cat === c)).map(c => `<label><input type="checkbox" data-cat="${c}"${S.opts.cats[c] !== false ? ' checked' : ''}><i style="background:${TM.COLOR[c]}"></i>${c}<small>${m.moves.filter(e => e.cat === c).length}</small></label>`).join('') || '<p class="note">This arrangement has no moves.</p>';
  for (const cb of $$('#cats input')) cb.onchange = () => { snapshot(); S.opts.cats[cb.dataset.cat] = cb.checked; recompute(); };
  $('#mvRows').innerHTML = pl.log.map(l => { const e = l.move, sel = S.sel && S.sel.move === e.id; return `<tr class="mrow${l.status === 'off' ? ' off' : ''}${sel ? ' sel' : ''}" data-id="${e.id}"><td><input type="checkbox" aria-label="Use this move"${S.opts.off[e.id] ? '' : ' checked'}${S.opts.cats[e.cat] === false ? ' disabled' : ''}></td><td class="at">${esc(e.at)}</td><td><span style="color:${e.color}">■</span> <b>${esc(e.title)}</b></td><td>${esc(l.text || (S.opts.cats[e.cat] === false ? `${e.cat} moves are switched off.` : 'Switched off.'))}</td><td><span class="pill ${l.status}">${l.status}</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="note">No moves.</td></tr>';
  for (const tr of $$('#mvRows tr.mrow')) {
    const e = m.moves.find(x => x.id === tr.dataset.id), cb = tr.querySelector('input');
    cb.onclick = ev => ev.stopPropagation();
    cb.onchange = () => { snapshot(); if (cb.checked) delete S.opts.off[e.id]; else S.opts.off[e.id] = true; recompute(); };
    tr.onclick = () => { selectMove(e, true); $('#board').scrollIntoView({behavior: 'smooth', block: 'start'}); };
  }
}
function renderTouches() {
  const pl = S.plan, cnt = k => pl.touches.filter(t => t.k === k).length;
  const layered = pl.parts.filter(x => x.act.why.some(v => v === 2)).length;
  const counts = {layers: `${layered} part${layered === 1 ? '' : 's'} layered`, restart: `${S.model.sections.length} sections`, holdBreaks: `${cnt('holdBreaks')} held`, fills: `${cnt('fills')} fills`, impacts: `${cnt('impacts')} added`};
  $('#touches').innerHTML = TE.TOUCHES.map(t => `<label class="touch"><input type="checkbox" data-t="${t.k}"${S.opts.touches[t.k] ? ' checked' : ''}><b>${esc(t.name)}</b><small>${esc(S.opts.touches[t.k] ? counts[t.k] : 'off')}</small><p>${esc(t.text)}</p></label>`).join('');
  for (const cb of $$('#touches input')) cb.onchange = () => { snapshot(); S.opts.touches[cb.dataset.t] = cb.checked; recompute(); };
}
function renderMeasured() {
  const M = S.plan.metrics, m = S.model, sh = Math.round(M.shape * 100);
  const tile = (cls, k, v, sub, p) => `<div class="tile ${cls}"><small>${esc(k)}</small><b>${v}</b><p>${esc(p || sub || '')}</p></div>`;
  $('#tiles').innerHTML = [
    tile(sh >= 85 ? 'good' : sh >= 70 ? 'mid' : '', 'Shape match', `${sh}<em> / 100</em>`, '', sh >= 85 ? 'The same shape: your energy rises and falls where the reference\'s tension does.' : sh >= 70 ? 'Close. The chart shows where your energy parts from the reference.' : 'Looser than the reference. Look for bars where your layers wait, or a lane you have no part for.'),
    tile('', 'Something changes', `every ${M.every.toFixed(1)}<em> bars</em>`, '', `The reference: every ${M.everyRef.toFixed(1)} bars. Your loop alone: never, ${Math.round(M.reps * 10) / 10} times over.`),
    tile('', 'Longest stretch with no change', `${M.longest}<em> bars</em>`, '', `The reference's: ${M.longestRef} bars.`),
    tile(M.fidelity >= 0.95 ? 'good' : 'mid', 'Lanes followed', `${Math.round(M.fidelity * 100)}<em>%</em>`, '', `of bars, the main part of each lane plays exactly where the reference's lane does.${M.uncovered.length ? ` No part of yours follows ${M.uncovered.map(l => TM.LANE[l].name.toLowerCase()).join(', ')}.` : ''}`),
    tile(M.rebuilt === M.total ? 'good' : 'mid', 'Moves rebuilt', `${M.rebuilt}<em> of ${M.total}</em>`, '', 'on your own parts, or as FX at your tempo. The rest play in the preview and are written into the plan.'),
  ].join('');
  // the chart
  const svg = $('#shapeSvg'), W = 1000, H = 220, bars = m.bars, E = M.energy, mx = Math.max(...E, 1e-9), xb = b => (b + 0.5) / bars * W, Y = v => H - 12 - v * (H - 26);
  let s = m.sections.map(q => `<rect x="${(q.start / bars * W).toFixed(1)}" y="0" width="${(q.bars / bars * W).toFixed(1)}" height="${H}" fill="${q.color}" opacity=".08"/><text x="${(q.start / bars * W + 4).toFixed(1)}" y="13" fill="#86939E" font-size="11" font-family="Archivo, system-ui">${esc(q.name)}</text>`).join('');
  s += `<path d="M${xb(0)},${Y(0)} ${Array.from(m.tensionBar, (v, b) => `L${xb(b).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} L${xb(bars - 1)},${Y(0)} Z" fill="#7fd6ff1c"/>`;
  s += `<path d="${Array.from(m.tensionBar, (v, b) => `${b ? 'L' : 'M'}${xb(b).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="#7FD6FF" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  s += `<path d="${Array.from(E, (v, b) => `${b ? 'L' : 'M'}${xb(b).toFixed(1)},${Y(v / mx).toFixed(1)}`).join(' ')}" fill="none" stroke="#FF8A3D" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
  svg.innerHTML = s;
  $('#measNote').textContent = `Shape match is the rank correlation between the two curves, bar by bar (Spearman, so a louder or quieter mix doesn't change it). Your energy is counted from what plays in each bar: each part weighted by its role (kick 3, bass and clap 2.5, hats and synths 1.5…), how open its filter is and how hard it's played, plus the risers. ${m.source === 'audio' ? 'The reference\'s tension is measured from its audio: loudness, brightness, how many parts play and how much noise is rising.' : 'The reference\'s tension comes from its lanes and its risers.'}`;
}
function renderLive() { $('#liveSteps').innerHTML = TE.liveSteps(S.plan).map(s => `<li>${esc(s)}</li>`).join(''); }

// ---------- transport UI ----------
function ui() {
  const k = beatNow() ?? S.pos, sec = secAt(k), on = playing();
  $('#play').textContent = on ? '■ Stop' : '▶ Play'; $('#play').setAttribute('aria-pressed', String(on));
  $('#tBar').textContent = `${Math.floor(k / 4) + 1}.${Math.floor(((k % 4) + 4) % 4) + 1}`;
  $('#tSec').textContent = sec ? sec.name : '–'; if (sec) $('#tSec').style.background = sec.color + '55';
  $('#tTime').textContent = fmtT(k * 60 / (S.mode === 'ref' && S.model && S.model.audio ? 60 / S.model.audio.beatDur : S.bpm || 120));
  $('#abRef').disabled = !S.refBuf; $('#abRef').title = S.refBuf ? 'The reference track at the same bar (R)' : 'Drop a real reference track to A/B against it';
}
function loopUI() { const on = !!(A.pl && A.pl.loop); S.loopOn = on; $('#loopBtn').setAttribute('aria-pressed', String(on)); drawOverlay(); }
function frame() {
  if (playing()) {
    let k = beatNow();
    if (A.refOn && A.pl.loop && k >= A.pl.loop[1]) { startRef(A.pl.loop[0]); k = A.pl.loop[0]; }
    S.pos = k; ui(); drawOverlay();
    // follow the playhead when zoomed
    const sc = $('#scroll'), x = X(k);
    if (S.zoom > 1 && !drag && (x < sc.scrollLeft + 40 || x > sc.scrollLeft + sc.clientWidth - 80)) sc.scrollLeft = Math.max(0, x - sc.clientWidth * 0.25);
  }
  requestAnimationFrame(frame);
}

// ---------- exports ----------
function xProg(p) { const el = $('#xProg'); el.hidden = !p; if (p) { $('.bar i', el).style.width = Math.round(p.frac * 100) + '%'; $('.st', el).textContent = p.stage; $('.pc', el).textContent = Math.round(p.frac * 100) + '%'; } }
function readme() {
  return [`Transplant: ${S.loop.name || 'your loop'} in the arrangement of ${S.model.name}`, '', `Tempo: ${Math.round(S.bpm * 100) / 100} BPM. Length: ${S.plan.bars} bars. Every file starts at bar 1.`, '',
    'Files', '- One MIDI file per track of your loop. A Drum Rack clip comes back as one file with every pad on its own note.', '- Filter sweeps are CC74 on the tracks they filter. MIDI-learn CC74 to a synth\'s cutoff to hear them, or draw the breakpoints from the plan on an Auto Filter.',
    '- FX tracks (risers, reverse cymbals, crashes, booms, pitch risers): play them on your own sounds, or use the FX audio pack.', '- Transplant plan.md: every move with its recipe for Live, the breakpoints and the sidechain.', '',
    'Into Live', ...TE.liveSteps(S.plan).map((s, i) => `${i + 1}. ${s}`), ''].join('\n');
}
async function exportFx() {
  const fx = S.plan.fx; if (!fx.length) { toast('This arrangement has no FX to render.'); return; }
  xProg({stage: 'Rendering FX', frac: 0});
  try {
    const files = [];
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i], tail = f.type === 'crash' ? 4 : f.type === 'boom' ? 2.5 : 0.6;
      const r = await TA.render(S.plan, {k0: f.k0, k1: Math.max(f.k1, f.k0 + 0.5), only: {notes: false, fxIds: new Set([f])}, tail, kickHz: TA.kickFor(S.loop.key)});
      files.push({name: TE.fxFile(f).replace(/[^\w\-. ()]+/g, '-'), bytes: TA.wav(r, {normalize: true})});
      xProg({stage: `Rendering FX ${i + 1} of ${fx.length}`, frac: (i + 1) / fx.length});
    }
    files.push({name: 'README.txt', bytes: new TextEncoder().encode(`FX for ${S.loop.name || 'your loop'} in the arrangement of ${S.model.name}, at ${Math.round(S.bpm * 100) / 100} BPM.\nEach file is named by the bar and beat where it starts. Drop it there on an audio track, warp off. Risers and swells end on the downbeat they lead into.\n`)});
    download(`${base()} - FX audio.zip`, OT.zip(files), 'application/zip');
  } catch (e) { toast('Rendering failed: ' + (e.message || e)); } finally { xProg(null); }
}
async function exportMix() {
  xProg({stage: 'Rendering the mix', frac: 0});
  try {
    const r = await TA.render(S.plan, {kickHz: TA.kickFor(S.loop.key), prog: async p => { xProg({stage: 'Rendering the mix', frac: p}); await new Promise(res => setTimeout(res, 0)); }});
    download(`${base()} - preview mix.wav`, TA.wav(r), 'audio/wav');
    const st = TA.stats(r); toast(`Mix rendered: ${fmtT(r.length / r.sampleRate)}, peak ${(20 * Math.log10(st.peak || 1e-9)).toFixed(1)} dBFS.`);
  } catch (e) { toast('Rendering failed: ' + (e.message || e)); } finally { xProg(null); }
}
async function exportStems() {
  const groups = new Map(); for (const x of S.plan.parts) { const k = x.part.src ? x.part.src.id : x.id; if (!groups.has(k)) groups.set(k, {name: x.part.src ? x.part.src.name : x.part.name, ids: new Set()}); groups.get(k).ids.add(x.id); }
  const jobs = [...groups.values()].map(g => ({name: g.name, only: {parts: g.ids, fx: false}}));
  if (S.plan.fx.length) jobs.push({name: 'FX', only: {notes: false}});
  try {
    const files = [];
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i]; xProg({stage: `Stem ${i + 1} of ${jobs.length}: ${j.name}`, frac: i / jobs.length});
      const r = await TA.render(S.plan, {only: j.only, kickHz: TA.kickFor(S.loop.key), prog: async p => { xProg({stage: `Stem ${i + 1} of ${jobs.length}: ${j.name}`, frac: (i + p) / jobs.length}); await new Promise(res => setTimeout(res, 0)); }});
      files.push({name: `${String(i + 1).padStart(2, '0')} ${safe(j.name)}.wav`, bytes: TA.wav(r)});
    }
    files.push({name: 'README.txt', bytes: new TextEncoder().encode(readme())});
    download(`${base()} - stems.zip`, OT.zip(files), 'application/zip');
  } catch (e) { toast('Rendering failed: ' + (e.message || e)); } finally { xProg(null); }
}

// ---------- the hero ----------
function heroArt() {
  const W = 360, H = 300, rows = 6, ref = ['#FF4B32', '#FF8A2B', '#FFC531', '#E07B39', '#3FD0C9', '#A78BFA'], you = ['#FF4B32', '#FF8A2B', '#FFC531', '#E07B39', '#FF5FA2', '#7C9CFF'];
  const pat = [[1, 1, 1, 0, 1, 1, 0, 1], [0, 1, 1, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1, 1, 1], [0, 0, 1, 0, 1, 1, 0, 1], [0, 0, 1, 1, 1, 1, 1, 0], [0, 0, 0, 1, 0, 0, 1, 0]];
  let s = `<defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7FD6FF" stop-opacity=".0"/><stop offset=".5" stop-color="#7FD6FF" stop-opacity=".35"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/></linearGradient></defs>`;
  s += `<text x="0" y="14" fill="#7FD6FF" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">THEIR ARRANGEMENT</text>`;
  pat.forEach((r, i) => r.forEach((v, j) => { if (v) s += `<rect x="${j * 45 + 1}" y="${24 + i * 13}" width="43" height="9" rx="2" fill="${ref[i]}" opacity=".75"/>`; }));
  s += `<rect x="0" y="108" width="${W}" height="80" fill="url(#hg)"/><path d="M180 116 v44 m-10 -10 l10 12 l10 -12" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>`;
  s += `<text x="0" y="202" fill="#FF8A3D" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">YOUR LOOP, TRANSPLANTED</text>`;
  pat.forEach((r, i) => r.forEach((v, j) => { if (v) { s += `<rect x="${j * 45 + 1}" y="${212 + i * 13}" width="43" height="9" rx="2" fill="${you[i]}" opacity=".9"/>`; for (let q = 0; q < 4; q++) s += `<rect x="${j * 45 + 4 + q * 10}" y="${214 + i * 13}" width="${i < 3 ? 2 : 7}" height="5" fill="#0E1215" opacity=".45"/>`; } }));
  $('#heroArt').innerHTML = s;
}

// ---------- wiring ----------
function bindDrop(el, onFiles) {
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); });
}
function wire() {
  bindDrop($('#refDrop'), fs => loadRef(fs[0])); bindDrop($('#loopDrop'), fs => loadLoop(fs));
  $('#refDrop').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.tagName === 'B' || e.target.tagName === 'SPAN') $('#refFile').click(); });
  $('#loopDrop').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.tagName === 'B' || e.target.tagName === 'SPAN') $('#loopFile').click(); });
  for (const [d, f] of [['#refDrop', '#refFile'], ['#loopDrop', '#loopFile']]) $(d).addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); $(f).click(); } });
  $('#refPick').onclick = e => { e.stopPropagation(); $('#refFile').accept = 'audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aif,.aiff'; $('#refFile').click(); };
  $('#refJson').onclick = e => { e.stopPropagation(); $('#refFile').accept = '.json,application/json'; $('#refFile').click(); };
  $('#refFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; loadRef(f); };
  $('#refDemo').onclick = e => { e.stopPropagation(); loadDemoTrack(); };
  $('#loopPick').onclick = e => { e.stopPropagation(); $('#loopFile').click(); };
  $('#loopFile').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; loadLoop(fs); };
  $('#shapes').onclick = e => { const b = e.target.closest('[data-shape]'); if (!b) return; setModel(shapeModel(b.dataset.shape), {shapeId: b.dataset.shape}); toast(`${TSHAPES.find(s => s.id === b.dataset.shape).name}: ${TSHAPES.find(s => s.id === b.dataset.shape).blurb}`, 4200); };
  $('#demos').onclick = e => { const b = e.target.closest('[data-demo]'); if (!b) return; setLoop(TL.demo(b.dataset.demo), {demoId: b.dataset.demo}); };
  $('#heroPlay').onclick = () => {
    if (!S.plan) { setModel(shapeModel('peak-techno'), {shapeId: 'peak-techno'}); }
    const drop = S.model.sections.find(s => s.label === 'Drop'), from = drop ? Math.max(0, drop.start - 12) * 4 : 0;
    setMode('you'); if (A.pl) A.pl.setLoop(null); loopUI(); play(from);
    $('#board').scrollIntoView({behavior: 'smooth', block: 'start'});
    toast(`Playing from bar ${from / 4 + 1}: the groove, the build and the first drop. R switches to the reference (when it's a real track).`, 4600);
  };
  $('#play').onclick = () => playing() ? stop() : play();
  $('#abYou').onclick = () => setMode('you'); $('#abRef').onclick = () => setMode('ref');
  $('#loopBtn').onclick = () => { ensureAudio(); if (A.pl.loop) { A.pl.setLoop(null); loopUI(); } else { const sec = secAt(beatNow() ?? S.pos) || S.model.sections[0]; A.pl.setLoop([sec.start * 4, sec.end * 4]); loopUI(); if (playing()) play(Math.max(sec.start * 4, beatNow())); } };
  $('#bpm').onchange = e => { const v = clamp(+e.target.value || S.bpm, 60, 200); S.bpm = v; S.loop.bpm = v; recompute(); };
  $('#vol').oninput = e => { A.vol = +e.target.value / 100; if (A.out) A.out.gain.setTargetAtTime(A.vol, A.ctx.currentTime, 0.02); };
  $('#zoom').onchange = e => { S.zoom = +e.target.value; draw(); save(); };
  $('#undo').onclick = undo;
  $('#resetOv').onclick = () => { if (!Object.keys(S.ov).length) { toast('Every bar already follows the reference.'); return; } snapshot(); S.ov = {}; recompute(); toast('Every bar follows the reference again.'); };
  const cv = $('#cv');
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', () => { drag = null; });
  cv.addEventListener('pointerleave', () => { CV.hoverBar = null; $('#tip').hidden = true; drawOverlay(); });
  $('#xParts').onclick = () => { const files = TE.partMidis(S.plan).map(f => ({name: f.name, bytes: f.bytes})); files.push({name: 'Transplant plan.md', bytes: new TextEncoder().encode(TE.planMarkdown(S.plan, {loop: S.loop.name}))}, {name: 'README.txt', bytes: new TextEncoder().encode(readme())}); download(`${base()} - parts.zip`, OT.zip(files), 'application/zip'); };
  $('#xMidi').onclick = () => download(`${base()}.mid`, TE.arrangedMidi(S.plan, base()), 'audio/midi');
  $('#xPlan').onclick = () => download(`${base()} - plan.md`, TE.planMarkdown(S.plan, {loop: S.loop.name}), 'text/markdown');
  $('#xFx').onclick = exportFx; $('#xMix').onclick = exportMix; $('#xStems').onclick = exportStems;
  $('#xSave').onclick = () => download(`${base()} - Transplant session.json`, JSON.stringify({v: 1, model: TM.serialize(S.model), loop: TL.serialize(S.loop), opts: S.opts, ov: S.ov, shapeId: S.shapeId, demoId: S.demoId, zoom: S.zoom, bpm: S.bpm}), 'application/json');
  $('#xOpen').onclick = () => $('#sessFile').click();
  $('#sessFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j || j.v !== 1 || !j.model || !j.loop) throw Error('That isn\'t a Transplant session.'); applySession(j); } catch (err) { toast(err.message || String(err), 4200); } };
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || !S.plan) return;
    const k = beatNow() ?? S.pos;
    if (e.code === 'Space') { e.preventDefault(); playing() ? stop() : play(); }
    else if (e.key === 'r' || e.key === 'R') setMode(S.mode === 'ref' ? 'you' : 'ref');
    else if (e.key === 'l' || e.key === 'L') $('#loopBtn').click();
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek((Math.floor(k / 4) + (e.shiftKey ? 8 : 1)) * 4); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(Math.max(0, (Math.ceil(k / 4 - 0.01) - (e.shiftKey ? 8 : 1)) * 4)); }
    else if (e.key === 'Home') seek(0);
    else if (/^[1-9]$/.test(e.key)) { const s = S.model.sections[+e.key - 1]; if (s) seek(s.start * 4); }
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S.plan) draw(); }, 120); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing()) stop(); });
}

// ---------- start ----------
async function fromBlueprint() {
  if (!/from=blueprint/.test(location.hash)) return false;
  history.replaceState(null, '', location.pathname + location.search);
  let item = null;
  try { item = await FWH.take('blueprint'); } catch (_) {}
  if (!item || !item.json) { toast('Nothing arrived from Blueprint: this browser keeps the two pages apart. Download Data (.json) in Blueprint and drop it here.', 6000); return false; }
  const m = TM.fromJSON(item.json, item.name || item.json.track);
  let buf = null;
  try {
    if (item.demo) buf = toBuffer(BPDemo.synthDemo({fx: true}));
    else if (item.file) buf = await decodeFile(item.file);
  } catch (_) {}
  if (!S.loop) { S.loop = TL.demo('warehouse'); S.demoId = 'warehouse'; }
  setModel(m, {buffer: buf});
  toast(`The arrangement of ${m.name} arrived from Blueprint${buf ? ', with its audio for the A/B' : ''}. Drop your loop's MIDI to put yourself in it.`, 5600);
  setTimeout(() => $('#setup').scrollIntoView({behavior: 'smooth'}), 200);
  return true;
}
async function start() {
  heroArt(); wire();
  if (!(await fromBlueprint())) {
    if (!restore()) { S.loop = TL.demo('warehouse'); S.demoId = 'warehouse'; S.model = shapeModel('peak-techno'); S.shapeId = 'peak-techno'; S.bpm = S.loop.bpm; recompute(); }
  }
  renderSetup();
  requestAnimationFrame(frame);
  // for the browser check (transplant-src/browser-check.mjs)
  window.TRANSPLANT_QA = {get S() { return S; }, A, recompute, setMode, play, stop, beatNow, loadRef, ready: true};
}
start();
})();
