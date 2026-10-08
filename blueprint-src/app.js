// ---------- page ----------
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmtT = t => { const s = Math.max(0, t), m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
const confPill = c => `<span class="conf ${c >= 0.7 ? 'hi' : c >= 0.4 ? 'mid' : 'lo'}">${c >= 0.7 ? 'sure' : c >= 0.4 ? 'likely' : 'check by ear'}</span>`;
const CAT_ORDER = ['Filter', 'Riser', 'Drums', 'Space', 'Impact', 'Glitch', 'Mix'];
const S = {an: null, sel: null, zoom: 1, spec: 'M', cat: 'All', sweep: null, hover: null, demo: null};

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
function download(name, data, type) { const b = data instanceof Blob ? data : new Blob([data], {type}), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); }
const base = () => ((S.an && S.an.meta.name) || 'track').replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'track';
const kTime = k => S.an.grid.t0 + k * S.an.grid.beatDur, tBeat = t => (t - S.an.grid.t0) / S.an.grid.beatDur;
const sectionAtK = k => S.an.sections.find(s => k >= s.start * 4 && k < s.end * 4);

// ---------- loading ----------
function setProg(p) { const el = $('#prog'); el.hidden = !p; if (p) { $('.bar i', el).style.width = Math.round(p.frac * 100) + '%'; $('.st', el).textContent = p.stage; $('.pc', el).textContent = Math.round(p.frac * 100) + '%'; } }
function setErr(m) { const el = $('#err'); el.hidden = !m; el.textContent = m || ''; }
function busy(on) { $('#pick').disabled = on; $('#demoBtn').disabled = on; }
async function decode(file) {
  const bytes = new Uint8Array(await file.arrayBuffer()), info = XR.sniff(bytes, file.name), sr = info.sr >= 8000 && info.sr <= 192000 ? info.sr : 44100;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, ctx = new OAC(2, 1, sr);
  const buf = await new Promise((res, rej) => { const p = ctx.decodeAudioData(bytes.buffer, res, rej); if (p && p.then) p.then(res, rej); });
  return {buf, info};
}
async function analyzeBuffer(buf, meta) {
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null, t0 = performance.now();
  const an = await XR.analyze({L, R, sr: buf.sampleRate}, p => setProg({stage: p.stage, frac: p.frac * 0.6}));
  await BP.prepare(an, p => setProg({stage: p.stage, frac: 0.6 + 0.4 * p.frac}));
  an.buffer = buf; an.meta = meta; an.ms = performance.now() - t0;
  setProg(null); stop();
  S.an = an; S.sel = null; P.off = 0; P.loop = null; mapCache = null; specCache = {};
  $('#results').hidden = false; $('#transport').hidden = false;
  renderAll();
  $('#plan').scrollIntoView({behavior: 'smooth'});
  toast(`Measured in ${(an.ms / 1000).toFixed(1)} s: ${an.moves.length} moves in ${an.sections.length} sections`);
}
async function loadFile(file) {
  if (!file) return; setErr(''); busy(true); setProg({stage: 'Decoding ' + file.name, frac: 0}); S.demo = null;
  try { const {buf, info} = await decode(file); await analyzeBuffer(buf, {name: file.name, info}); }
  catch (e) { console.error(e); setProg(null); setErr(`Couldn't read "${file.name}". ${/aif/i.test(file.name) ? 'This browser can\'t decode AIFF; Safari can, or convert it to WAV.' : 'The browser couldn\'t decode it; try a WAV, FLAC or MP3 of the same track.'}${e && e.message ? ` (${e.message})` : ''}`); }
  finally { busy(false); }
}
async function loadDemo() {
  setErr(''); busy(true); setProg({stage: 'Synthesizing the demo track', frac: 0.01}); await new Promise(r => setTimeout(r, 30));
  try {
    const d = BPDemo.synthDemo({fx: true}); S.demo = d;
    const buf = new AudioBuffer({length: d.L.length, numberOfChannels: 2, sampleRate: d.sr}); buf.copyToChannel(d.L, 0); buf.copyToChannel(d.R, 1);
    await analyzeBuffer(buf, {name: 'Blueprint demo (126 BPM, A minor, 17 planted moves).wav', info: {codec: 'Demo', sr: d.sr}});
  } catch (e) { console.error(e); setProg(null); setErr('The demo failed to build: ' + e.message); }
  finally { busy(false); }
}

// ---------- playback ----------
const P = {ctx: null, src: null, playing: false, off: 0, at: 0, rate: 1, loop: null, mode: 'full', click: false, nodes: [], timer: 0, raf: 0, lastV: -1};
function ac() {
  if (!P.ctx) { const C = window.AudioContext || window.webkitAudioContext; P.ctx = new C(); P.in = P.ctx.createGain(); P.out = P.ctx.createGain(); P.out.gain.value = 0.9; P.out.connect(P.ctx.destination); setMode(P.mode); }
  if (P.ctx.state === 'suspended') P.ctx.resume();
  return P.ctx;
}
function pos() { if (!P.playing || !P.ctx) return P.off; let t = P.off + (P.ctx.currentTime - P.at) * P.rate; if (P.loop && t >= P.loop.e) t = P.loop.s + ((t - P.loop.s) % (P.loop.e - P.loop.s)); return t; }
function play() {
  const an = S.an; if (!an) return; const ctx = ac(); stopSrc();
  if (P.loop && (P.off < P.loop.s || P.off >= P.loop.e)) P.off = P.loop.s;
  if (P.off >= an.dur - 0.05) P.off = 0;
  const src = ctx.createBufferSource(); src.buffer = an.buffer; src.playbackRate.value = P.rate;
  if (P.loop) { src.loop = true; src.loopStart = P.loop.s; src.loopEnd = P.loop.e; }
  src.connect(P.in); src.start(0, Math.max(0, P.off)); P.src = src; P.at = ctx.currentTime; P.playing = true; P.lastV = -1;
  src.onended = () => { if (P.src === src && P.playing) { P.playing = false; P.off = 0; P.src = null; ui(); } };
  clearInterval(P.timer); P.timer = setInterval(clicks, 25); ui(); frame();
}
function stopSrc() { if (P.src) { try { P.src.onended = null; P.src.stop(); } catch {} P.src.disconnect(); P.src = null; } }
function stop() { if (P.playing) P.off = pos(); stopSrc(); P.playing = false; clearInterval(P.timer); ui(); }
function toggle() { P.playing ? stop() : play(); }
function seek(t) { if (!S.an) return; t = XR.clamp(t, 0, S.an.dur - 0.01); const was = P.playing; if (was) { stopSrc(); P.playing = false; } P.off = t; if (was) play(); else { ui(); overlay(); } }
function setLoop(s, e) { P.loop = s == null ? null : {s: Math.max(0, s), e: Math.min(S.an.dur, e)}; $('#loopBtn').classList.toggle('on', !!P.loop); if (P.playing) { const t = pos(); stopSrc(); P.playing = false; P.off = P.loop && (t < P.loop.s || t >= P.loop.e) ? P.loop.s : t; play(); } else overlay(); }
function loopBeats(k0, k1, start = true) { setLoop(kTime(k0), kTime(k1)); seek(kTime(k0)); if (start && !P.playing) play(); }
function setMode(mode) {
  P.mode = mode; if (!P.ctx) return; const ctx = P.ctx;
  try { P.in.disconnect(); } catch {} for (const n of P.nodes) try { n.disconnect(); } catch {} P.nodes = [];
  const bq = (type, f) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; P.nodes.push(b); return b; };
  const chain = list => { let a = P.in; for (const n of list) { a.connect(n); a = n; } a.connect(P.out); };
  if (mode === 'low') chain([bq('lowpass', 250), bq('lowpass', 250)]);
  else if (mode === 'mids') chain([bq('highpass', 250), bq('lowpass', 4000)]);
  else if (mode === 'highs') chain([bq('highpass', 4000), bq('highpass', 4000)]);
  else if (mode === 'side') { const sp = ctx.createChannelSplitter(2), gl = ctx.createGain(), gr = ctx.createGain(), sum = ctx.createGain(), mg = ctx.createChannelMerger(2); gl.gain.value = 0.5; gr.gain.value = -0.5; P.nodes.push(sp, gl, gr, sum, mg); P.in.connect(sp); sp.connect(gl, 0); sp.connect(gr, 1); gl.connect(sum); gr.connect(sum); sum.connect(mg, 0, 0); sum.connect(mg, 0, 1); mg.connect(P.out); }
  else P.in.connect(P.out);
}
function clicks() {
  if (!P.playing || !P.click) { P.lastV = -1; return; }
  const ctx = P.ctx, now = ctx.currentTime, g = S.an.grid;
  let v0 = Math.max(P.lastV, P.off + (now - P.at) * P.rate); const v1 = P.off + (now + 0.12 - P.at) * P.rate;
  if (v1 <= v0) return;
  // v is "virtual" time since play started; with a loop it folds back onto the loop
  const fold = v => P.loop && v >= P.loop.e ? P.loop.s + ((v - P.loop.s) % (P.loop.e - P.loop.s)) : v;
  while (v0 < v1 - 1e-9) {
    const ta = fold(v0), segEnd = P.loop ? v0 + (P.loop.e - ta) : v1, vb = Math.min(v1, segEnd);
    let k = Math.ceil((ta - g.t0) / g.beatDur - 1e-9);
    for (let t = g.t0 + k * g.beatDur; t < ta + (vb - v0); k++, t = g.t0 + k * g.beatDur) {
      const when = P.at + (v0 + (t - ta) - P.off) / P.rate, o = ctx.createOscillator(), gn = ctx.createGain(), down = XR.mod(k, 4) === 0;
      o.frequency.value = down ? 1760 : 1320; gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(down ? 0.3 : 0.18, when + 0.002); gn.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
      o.connect(gn); gn.connect(ctx.destination); o.start(when); o.stop(when + 0.06);
    }
    v0 = vb;
  }
  P.lastV = v1;
}
function ui() {
  const an = S.an; if (!an) return;
  $('#play').textContent = P.playing ? 'Stop' : 'Play';
  const t = pos(), k = tBeat(t), sec = sectionAtK(Math.floor(k));
  $('#tBar').textContent = t < an.grid.t0 ? 'pickup' : `${Math.floor(k / 4) + 1}.${Math.floor(XR.mod(k, 4)) + 1}`;
  $('#tTime').textContent = fmtT(t);
  const sc = $('#tSec'); sc.textContent = sec ? sec.name : ''; sc.style.background = sec ? sec.color : 'transparent'; sc.hidden = !sec;
  const mv = an.moves.filter(e => k >= e.k0 && k < Math.max(e.k1, e.k0 + 0.5)).sort((a, b) => b.conf - a.conf)[0];
  $('#tMove').textContent = mv ? mv.title : '';
  $('#tName').textContent = an.meta.name;
}
function frame() { cancelAnimationFrame(P.raf); if (!P.playing) return; ui(); overlay(); P.raf = requestAnimationFrame(frame); }

// ---------- the drawing ----------
const CATC = {Filter: '#7FD6FF', Riser: '#B9A3FF', Drums: '#FFA463', Space: '#7DDB8F', Impact: '#FF6B5B', Glitch: '#F2C14E', Mix: '#5FD3C8'};
const LINE = '#D6E9FF', DIM = '#8FB2D6', PENCIL = '#F2C14E', SHEET = '#123B66';
let specCache = {}, mapCache = null;
// Moves go on rows like dimension lines on a drawing: a move and its label take a row's space, and the next
// move on that row has to start after both.
function moveRows(moves, X, W, font) {
  const m = document.createElement('canvas').getContext('2d'); m.font = font;
  const rows = [];
  for (const e of [...moves].sort((a, b) => a.k0 - b.k0)) {
    const x0 = X(e.k0), x1 = Math.max(X(Math.max(e.k1, e.k0 + 0.25)), x0 + 3), tw = m.measureText(e.title).width;
    e._inside = x1 - x0 > tw + 18; const end = e._inside ? x1 : Math.min(W, x1 + tw + 10);
    let r = rows.findIndex(r => r < x0 - 6); if (r < 0) { rows.push(end); r = rows.length - 1; } else rows[r] = end; e._row = r;
  }
  return Math.max(2, rows.length);
}
function layout(an, compact, nRows) {
  const L = {};
  let y = 0; const put = (k, h) => { L[k] = {y, h}; y += h; };
  put('ruler', 18); put('sec', compact ? 20 : 24); put('moves', 6 + nRows * (compact ? 15 : 17)); y += 4;
  put('lanes', BP.LANES.length * (compact ? 9 : 13)); y += 6;
  put('cut', compact ? 44 : 64); y += 4;
  put('spec', compact ? 80 : 124); y += 4;
  put('ten', compact ? 0 : 34);
  L.H = y + 4; return L;
}
const FLO = 40;
function specImage(an, src) {
  if (specCache[src]) return specCache[src];
  const Sx = an.S, arr = Sx[src], NB = Sx.NB, cols = Math.min(Sx.n, 6000), cv = document.createElement('canvas'); cv.width = cols; cv.height = NB;
  const cx = cv.getContext('2d'), img = cx.createImageData(cols, NB), vals = [];
  for (let i = 0; i < arr.length; i += 7) vals.push(10 * Math.log10(arr[i] + 1e-14));
  vals.sort((a, b) => a - b); const top = vals[Math.floor(vals.length * 0.995)], lo = top - 60;
  for (let c = 0; c < cols; c++) {
    const j0 = Math.floor(c * Sx.n / cols), j1 = Math.max(j0 + 1, Math.floor((c + 1) * Sx.n / cols));
    for (let b = 0; b < NB; b++) {
      let v = 0; for (let j = j0; j < j1; j++) v = Math.max(v, arr[j * NB + b]);
      const q = XR.clamp((10 * Math.log10(v + 1e-14) - lo) / (top - lo), 0, 1), o = ((NB - 1 - b) * cols + c) * 4;
      // cyanotype: blueprint blue through pale line-blue to white
      img.data[o] = 18 + q * q * 237; img.data[o + 1] = 59 + q * 196; img.data[o + 2] = 102 + Math.sqrt(q) * 153; img.data[o + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0); return specCache[src] = cv;
}
// Draw the arrangement of beats [k0, k1) into a canvas `cv` of CSS width W.
function drawSheet(cv, an, k0, k1, W, compact) {
  const X = k => (k - k0) / (k1 - k0) * W, mono = getComputedStyle(document.body).getPropertyValue('--mono'), body = getComputedStyle(document.body).getPropertyValue('--body');
  const visible = an.moves.filter(e => e.k1 > k0 && e.k0 < k1), nRows = moveRows(visible, X, W, `600 ${compact ? 10.5 : 11.5}px ${body}`);
  const L = layout(an, compact, nRows), dpr = window.devicePixelRatio || 1, H = L.H;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d', {willReadFrequently: !!compact}); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = SHEET; c.fillRect(0, 0, W, H);
  const pxBar = X(4) - X(0), step = [1, 2, 4, 8, 16, 32].find(n => n * pxBar >= 34) || 32;
  // grid: bars faint, 4-bar lines stronger, 8-bar lines strongest
  for (let b = Math.ceil(k0 / 4); b * 4 <= k1; b++) {
    const x = Math.round(X(b * 4)) + 0.5; c.strokeStyle = b % 8 === 0 ? '#ffffff33' : b % 4 === 0 ? '#ffffff1c' : '#ffffff0d';
    if (pxBar >= 3 || b % 4 === 0) { c.beginPath(); c.moveTo(x, L.sec.y); c.lineTo(x, H); c.stroke(); }
    if (b % step === 0) { c.fillStyle = DIM; c.font = `11px ${mono}`; c.textBaseline = 'top'; c.fillText(String(b + 1), x + 3, 4); c.fillStyle = '#ffffff55'; c.fillRect(x - 0.5, 0, 1, 14); }
  }
  if (pxBar >= 60) for (let k = Math.ceil(k0); k <= k1; k++) if (k % 4) { const x = Math.round(X(k)) + 0.5; c.strokeStyle = '#ffffff08'; c.beginPath(); c.moveTo(x, L.sec.y); c.lineTo(x, H); c.stroke(); }
  // sections: outlined frames with their name, like a title on a sheet
  for (const s of an.sections) {
    const x0 = X(s.start * 4), x1 = X(s.end * 4); if (x1 < 0 || x0 > W) continue;
    c.fillStyle = s.color + 'CC'; c.fillRect(x0 + 1, L.sec.y + 2, Math.max(1, x1 - x0 - 2), L.sec.h - 4);
    c.save(); c.beginPath(); c.rect(x0 + 1, L.sec.y, x1 - x0 - 2, L.sec.h); c.clip(); c.fillStyle = '#14263A'; c.font = `600 ${compact ? 11 : 12.5}px ${body}`; c.textBaseline = 'middle';
    c.fillText(`${s.name}  ${s.end - s.start} bars`, x0 + 6, L.sec.y + L.sec.h / 2); c.restore();
  }
  // moves: dimension lines, end ticks and a label, in their category's colour
  const rowH = compact ? 15 : 17;
  for (const e of visible) {
    const kk1 = Math.max(e.k1, e.k0 + 0.25), x0 = X(e.k0), x1 = Math.max(X(kk1), x0 + 3); if (x1 < 0 || x0 > W) continue;
    const y = L.moves.y + 4 + e._row * rowH + rowH / 2, col = e.color, sel = S.sel === e;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = sel ? 2.5 : 1.25;
    c.beginPath(); c.moveTo(x0, y - 5); c.lineTo(x0, y + 5); c.moveTo(x1, y - 5); c.lineTo(x1, y + 5); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    // arrowheads where there's room
    if (x1 - x0 > 14) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 5, y - 3); c.lineTo(x0 + 5, y + 3); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x1, y); c.lineTo(x1 - 5, y - 3); c.lineTo(x1 - 5, y + 3); c.closePath(); c.fill(); }
    const label = e.title, f = `${sel ? 600 : 500} ${compact ? 10.5 : 11.5}px ${body}`; c.font = f; const tw = c.measureText(label).width;
    if (e._inside) { const lx = (x0 + x1) / 2 - tw / 2; c.fillStyle = SHEET; c.fillRect(lx - 3, y - 7, tw + 6, 14); c.fillStyle = sel ? PENCIL : LINE; c.textBaseline = 'middle'; c.fillText(label, lx, y); }
    else if (W - x1 > tw + 8) { c.fillStyle = sel ? PENCIL : col; c.textBaseline = 'middle'; c.fillText(label, x1 + 4, y); }
    e._hit = {x0: x0 - 3, x1: x1 + 3, y0: y - rowH / 2, y1: y + rowH / 2};
  }
  c.lineWidth = 1;
  // element lanes: clips where each part plays, opacity = how strongly
  BP.LANES.forEach((l, i) => {
    const lh = (compact ? 9 : 13), y = L.lanes.y + i * lh, a = an.lanes[l.k];
    c.fillStyle = '#ffffff08'; c.fillRect(0, y + 1, W, lh - 2);
    for (let k = Math.max(0, Math.floor(k0)); k < Math.min(a.length, Math.ceil(k1)); k++) { const v = a[k]; if (v < 0.08) continue; c.fillStyle = l.c; c.globalAlpha = 0.15 + 0.85 * Math.min(1, v); c.fillRect(X(k), y + 1, Math.max(1, X(k + 1) - X(k) - (pxBar > 40 ? 1 : 0)), lh - 2); }
    c.globalAlpha = 1;
  });
  // filter cutoffs: one curve per sweep on a log axis, held filters as dashed lines
  const fy = hz => L.cut.y + L.cut.h - XR.clamp(Math.log2(hz / 30) / Math.log2(10500 / 30), 0, 1) * L.cut.h;
  c.strokeStyle = '#ffffff1a'; for (const hz of [100, 1000, 10000]) { const y = Math.round(fy(hz)) + 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  const specY = hz => L.spec.y + L.spec.h - XR.clamp(12 * Math.log2(hz / FLO) / an.S.NB, 0, 1) * L.spec.h;
  // spectrogram slice
  const im = specImage(an, S.spec), n = an.S.n, sx0 = an.S.j(kTime(k0)) / n * im.width, sx1 = an.S.j(kTime(k1)) / n * im.width;
  const a = XR.clamp(sx0, 0, im.width), b = XR.clamp(sx1, 0, im.width);
  if (b > a) { c.imageSmoothingEnabled = true; c.drawImage(im, a, 0, b - a, im.height, (a - sx0) / (sx1 - sx0) * W, L.spec.y, (b - a) / (sx1 - sx0) * W, L.spec.h); }
  for (const e of an.moves) {
    if (e.type === 'lp' || e.type === 'hp') {
      const pts = e.curve.filter(p => p.hz), col = e.target === 'drums' ? CATC.Drums : e.target === 'mix' ? PENCIL : CATC.Filter;
      for (const [yf, lw] of [[fy, 2], [specY, 2.5]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach((p, i) => { const x = X(p.k + 0.5), y = yf(p.hz); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
      if (pts.length && X(pts[0].k) >= 0) { c.fillStyle = col; c.font = `600 11px ${body}`; c.textBaseline = 'bottom'; const p = pts[0]; c.fillText(`${e.type === 'lp' ? 'LP' : 'HP'} ${BP.hzText(p.hz)}`, Math.max(2, X(p.k)), fy(p.hz) - 2); }
    } else if (e.type === 'lpStatic') {
      c.strokeStyle = CATC.Filter; c.setLineDash([5, 4]); c.lineWidth = 2; for (const yf of [fy, specY]) { c.beginPath(); c.moveTo(X(e.k0), yf(e.hz)); c.lineTo(X(e.k1), yf(e.hz)); c.stroke(); } c.setLineDash([]);
    } else if ((e.type === 'pitchUp' || e.type === 'pitchDown') && e.track) {
      c.strokeStyle = CATC.Riser; c.lineWidth = 2; c.beginPath(); e.track.forEach(([k, hz], i) => { const x = X(k), y = specY(hz); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    }
  }
  c.lineWidth = 1;
  // tension
  if (!compact && L.ten.h) {
    const T0 = an.tension, T = Float32Array.from(T0, (v, k) => { let s = 0, n = 0; for (let q = k - 2; q <= k + 1; q++) if (q >= 0 && q < T0.length) { s += T0[q]; n++; } return s / n; }); c.fillStyle = PENCIL + '30'; c.beginPath(); c.moveTo(X(k0), L.ten.y + L.ten.h);
    for (let k = Math.max(0, Math.floor(k0)); k < Math.min(T.length, Math.ceil(k1)); k++) c.lineTo(X(k + 0.5), L.ten.y + L.ten.h - T[k] * (L.ten.h - 4));
    c.lineTo(X(Math.min(T.length, k1)), L.ten.y + L.ten.h); c.closePath(); c.fill();
  }
  return {c, L, X, W, H, k0, k1};
}
function labels(c, L, left, compact) {
  const body = getComputedStyle(document.body).getPropertyValue('--body');
  c.font = `500 ${compact ? 10 : 11}px ${body}`; c.textBaseline = 'middle';
  const lab = (t, y, col = DIM) => { const w = c.measureText(t).width + 8; c.fillStyle = SHEET + 'E6'; c.fillRect(left, y - 7, w, 14); c.fillStyle = col; c.fillText(t, left + 4, y); };
  lab('Moves', L.moves.y + 8, PENCIL);
  BP.LANES.forEach((l, i) => { const lh = compact ? 9 : 13; if (!compact || i % 2 === 0) lab(l.name, L.lanes.y + i * lh + lh / 2, '#fff'); });
  lab('Filter cutoff (30 Hz to 10 kHz)', L.cut.y + 8); lab('Spectrogram, 40 Hz to 10 kHz', L.spec.y + 8);
  if (!compact && L.ten.h) lab('Tension', L.ten.y + 8);
}
function mainDraw() {
  const an = S.an, cv = $('#cv'), box = $('#scroll'), W = Math.max(320, Math.floor(box.clientWidth * S.zoom)), nB = an.grid.nBars * 4;
  const key = [W, S.zoom, S.spec, S.sel && S.sel.id, window.devicePixelRatio].join('|');
  if (!mapCache || mapCache.key !== key) { const off = document.createElement('canvas'), r = drawSheet(off, an, 0, nB, W, false); mapCache = {key, off, r}; }
  const {off, r} = mapCache, dpr = window.devicePixelRatio || 1;
  cv.width = off.width; cv.height = off.height; cv.style.width = r.W + 'px'; cv.style.height = r.H + 'px';
  const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(off, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return {c, r};
}
function overlay() {
  if (!S.an) return; const {c, r} = mainDraw(), {L, X} = r;
  labels(c, L, $('#scroll').scrollLeft, false);
  if (P.loop) { const a = X(tBeat(P.loop.s)), b = X(tBeat(P.loop.e)); c.fillStyle = PENCIL + '1f'; c.fillRect(a, L.sec.y, b - a, r.H - L.sec.y); c.fillStyle = PENCIL; c.fillRect(a, L.sec.y - 3, b - a, 3); }
  if (S.sweep) { const a = X(Math.min(S.sweep.a, S.sweep.b)), b = X(Math.max(S.sweep.a, S.sweep.b)); c.fillStyle = '#ffffff22'; c.fillRect(a, L.sec.y, b - a, r.H - L.sec.y); }
  if (S.hover != null) { c.fillStyle = '#ffffff66'; c.fillRect(Math.round(X(S.hover)), L.sec.y, 1, r.H - L.sec.y); }
  const x = Math.round(X(tBeat(pos()))); c.fillStyle = '#fff'; c.fillRect(x - 1, 0, 2, r.H);
  for (const t of $$('.mini canvas')) miniOverlay(t);
}
function wireDrawing() {
  const cv = $('#cv'), tip = $('#tip'), box = $('#scroll');
  const at = e => { const rc = cv.getBoundingClientRect(), nB = S.an.grid.nBars * 4; return {k: XR.clamp((e.clientX - rc.left) / rc.width, 0, 1) * nB, x: e.clientX - rc.left, y: e.clientY - rc.top}; };
  const moveAt = p => S.an.moves.find(e => e._hit && p.x >= e._hit.x0 && p.x <= e._hit.x1 && p.y >= e._hit.y0 && p.y <= e._hit.y1);
  cv.addEventListener('pointerdown', e => { if (!S.an) return; const p = at(e); cv.setPointerCapture(e.pointerId); S.sweep = {a: p.k, b: p.k, x: p.x}; });
  cv.addEventListener('pointermove', e => {
    if (!S.an) return; const p = at(e), an = S.an;
    if (S.sweep) { S.sweep.b = p.k; overlay(); return; }
    S.hover = p.k; const mv = moveAt(p); cv.style.cursor = mv ? 'pointer' : 'crosshair';
    const k = Math.floor(p.k), sec = sectionAtK(k), plays = BP.LANES.filter(l => an.lanes[l.k][k] > 0.5).map(l => l.name.toLowerCase());
    const here = an.moves.filter(m => p.k >= m.k0 && p.k < Math.max(m.k1, m.k0 + 0.5)).map(m => m.title);
    tip.hidden = false; tip.style.left = p.x + 'px'; tip.style.top = (p.y - 10) + 'px';
    const L0 = mapCache && mapCache.r.L, onSec = L0 && p.y >= L0.sec.y && p.y <= L0.sec.y + L0.sec.h;
    tip.innerHTML = mv ? `<b>${esc(mv.title)}</b><br>${esc(mv.at)} to ${esc(mv.to)}<br>Click to open it` : onSec && sec ? `<b>${esc(sec.name)}</b>, bars ${sec.start + 1}–${sec.end}<br>${esc(sec.why.join(' '))}` : `<b>Bar ${Math.floor(p.k / 4) + 1}.${Math.floor(XR.mod(p.k, 4)) + 1}</b>${sec ? ` in ${esc(sec.name)}` : ''}<br>${plays.length ? esc(plays.join(', ')) : 'nothing playing'}${here.length ? `<br>${esc(here.join(', '))}` : ''}`;
    overlay();
  });
  cv.addEventListener('pointerleave', () => { S.hover = null; tip.hidden = true; overlay(); });
  cv.addEventListener('pointerup', e => {
    if (!S.an) return; const sw = S.sweep; S.sweep = null; if (!sw) return; const p = at(e);
    if (Math.abs(p.x - sw.x) < 5) { const mv = moveAt(p); if (mv) { select(mv, true); return; } seek(kTime(Math.floor(p.k / 4) * 4)); return; }
    const a = Math.min(sw.a, p.k), b = Math.max(sw.a, p.k), b0 = Math.floor(a / 4) * 4, b1 = Math.max(b0 + 4, Math.ceil(b / 4) * 4);
    loopBeats(b0, b1, false); toast(`Looping bars ${b0 / 4 + 1}–${b1 / 4}`);
  });
  box.addEventListener('scroll', overlay);
  addEventListener('resize', () => { mapCache = null; if (S.an) { overlay(); renderTransitions(); } });
}

// ---------- inspector ----------
function select(e, scroll) {
  S.sel = e; mapCache = null; overlay(); renderInspector(); $$('tr.mv').forEach(r => r.classList.toggle('sel', r.dataset.id === e.id));
  if (scroll) $('#insp').scrollIntoView({behavior: 'smooth', block: 'nearest'});
  // bring the move into view in the drawing
  const box = $('#scroll'), x = (e.k0 / (S.an.grid.nBars * 4)) * box.scrollWidth; if (x < box.scrollLeft || x > box.scrollLeft + box.clientWidth - 40) box.scrollLeft = Math.max(0, x - 80);
}
function evidence(e) {
  const r = [], n = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '–';
  const add = (k, v) => r.push([k, v]);
  add('Starts', `bar ${e.at}`); add('Ends', `bar ${e.to}`); add('Length', BP.lengthText(e.k1 - e.k0));
  switch (e.type) {
    case 'lp': case 'hp': add('Filtered part', {music: 'Music (synths, pads, bass)', drums: 'Drums', mix: 'Whole mix'}[e.target]); add('Cutoff', `${BP.hzText(e.fromHz)} → ${e.reachedOpen ? 'open' : BP.hzText(e.toHz)}`); add('Skirt', `~${Math.round(e.slope)} dB/oct`); add('Fit quality', `${Math.round(e.r2 * 100)}% of the change explained`); if (e.partFit) add('Checked per part', `music ${e.partFit.music == null ? "can't tell" : Math.round(e.partFit.music * 100) + '%'}, drums ${e.partFit.drums == null ? "can't tell" : Math.round(e.partFit.drums * 100) + '%'}`); break;
    case 'lpStatic': add('Cutoff', BP.hzText(e.hz)); add('Holds against', `${e.against} similar section${e.against > 1 ? 's' : ''}`); break;
    case 'riser': add('Climb', `${n(e.riseDb)} dB`); add('Noise-likeness', `${n(e.flat, 2)} (white noise ≈ 0.56)`); break;
    case 'reverse': add('Swell', `${n(e.riseDb)} dB into the bar line`); break;
    case 'pitchUp': case 'pitchDown': add('Glide', `${n(e.semis)} semitones, ${BP.hzText(e.fromHz)} → ${BP.hzText(e.toHz)}`); break;
    case 'tapeStop': add('Pitch fall', `${n(e.semis)} semitones`); add('Level fall', `${n(e.levelDrop)} dB`); break;
    case 'roll': for (const s of e.steps) add(s.name, `from bar ${BP.barBeat(s.k)}`); add('Hits', String(e.hits.length)); add('Gets louder by', `${n(e.velDb)} dB`); break;
    case 'gap': add('Silence', BP.lengthText(e.beats)); add('Depth', `${n(e.depth, 0)} dB`); break;
    case 'crash': add('Jump', `${n(Math.min(e.jump, 60), 0)} dB`); add('Decay (T60)', e.t60 ? `${n(e.t60)} s` : '–'); break;
    case 'boom': add('Above the next bars', `${n(e.excess)} dB`); break;
    case 'echo': add('Delay', `${e.note}, ${Math.round(e.ms)} ms`); add('Repeats', String(e.repeats)); add('Each repeat', `${n(e.repeatDb)} dB (feedback ~${Math.round(e.feedback * 100)}%)`); break;
    case 'tail': add('Decay (RT60)', `${n(e.rt60)} s`); break;
    case 'stutter': add('Grid', e.grid); add('Deeper than usual by', `${n(e.excess, 0)} dB`); break;
    case 'width': add('Side vs mid', `${e.db > 0 ? '+' : ''}${n(e.db)} dB`); add('Utility Width', `~${e.utility}%`); break;
    case 'fade': add('Level change', `${e.db > 0 ? '+' : ''}${n(e.db)} dB`); break;
  }
  return r;
}
function renderInspector() {
  const e = S.sel, m = $('#inspMain'), side = $('#inspSide'); if (!e) return;
  const bp = (e.type === 'lp' || e.type === 'hp') ? e.curve.filter(p => p.hz).filter((p, i, a) => i === 0 || i === a.length - 1 || p.k % 4 === 0) : [];
  m.innerHTML = `<h3>${esc(e.title)} ${confPill(e.conf)}</h3><div class="when num">bar ${esc(e.at)} to ${esc(e.to)}, ${esc(e.cat.toLowerCase())}</div><p class="what">${esc(e.what)}</p>
    <h3 style="font-size:17px;margin-top:14px">Rebuild it in Live</h3><ol class="steps">${e.recipe.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
    <div class="row"><button class="btn" id="ipPlay" type="button">Play it</button><button class="btn ghost" id="ipLoop" type="button">Loop it</button>${e.type === 'roll' ? '<button class="btn ghost" id="ipRoll" type="button">Roll MIDI</button>' : ''}<button class="btn ghost" id="ipCopy" type="button">Copy the steps</button><button class="btn ghost sm" id="ipPrev" type="button">Previous move</button><button class="btn ghost sm" id="ipNext" type="button">Next move</button></div>`;
  side.innerHTML = `<h3>Measured</h3><table><tbody>${evidence(e).map(([k, v]) => `<tr><th style="border-bottom:1px solid var(--paper-3);font-weight:500">${esc(k)}</th><td class="num">${esc(v)}</td></tr>`).join('')}</tbody></table>
    ${bp.length ? `<h3 style="font-size:16px;margin-top:14px">Automation breakpoints</h3><p class="note">Set these on Auto Filter's Frequency. CC is the same point as a 0–127 value.</p><table><thead><tr><th>Bar</th><th>Frequency</th><th>CC</th></tr></thead><tbody>${bp.map(p => `<tr><td class="num">${BP.barBeat(p.k)}</td><td class="num">${BP.hzText(p.hz)}</td><td class="num">${BP.hzToCC(p.hz)}</td></tr>`).join('')}${e.opening ? `<tr><td class="num">${esc(e.to)}</td><td class="num">${e.type === 'lp' ? '20 kHz (open)' : '20 Hz (open)'}</td><td class="num">${e.type === 'lp' ? 127 : 0}</td></tr>` : ''}</tbody></table>` : ''}`;
  const pre = Math.max(0, Math.floor(e.k0 / 4) * 4 - 8), post = Math.min(S.an.grid.nBars * 4, Math.ceil(Math.max(e.k1, e.k0 + 1) / 4) * 4 + 4);
  $('#ipPlay').onclick = () => { setLoop(null); seek(kTime(pre)); if (!P.playing) play(); };
  $('#ipLoop').onclick = () => loopBeats(pre, post);
  $('#ipCopy').onclick = () => copy(`${e.title} (bar ${e.at} to ${e.to})\n${e.what}\n${e.recipe.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
  if ($('#ipRoll')) $('#ipRoll').onclick = () => download(`${base()} - roll ${e.at}.mid`, BP.rollMidi(S.an, e), 'audio/midi');
  const i = S.an.moves.indexOf(e);
  $('#ipPrev').onclick = () => S.an.moves[i - 1] && select(S.an.moves[i - 1]); $('#ipNext').onclick = () => S.an.moves[i + 1] && select(S.an.moves[i + 1]);
}
function copy(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Copied'), () => { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast('Copied'); }); }

// ---------- render ----------
function renderAll() { renderPlan(); renderTruth(); mapCache = null; overlay(); renderLegend(); renderTransitions(); renderMoves(); renderPhrases(); renderMotion(); renderExport(); ui(); $('#inspMain').innerHTML = '<p class="empty">Click a move in the drawing, or one of the signature moves above, to see how it was measured and how to rebuild it.</p>'; $('#inspSide').innerHTML = ''; }
function renderPlan() {
  const an = S.an, g = an.grid, k = an.key, cats = {}; for (const e of an.moves) cats[e.cat] = (cats[e.cat] || 0) + 1;
  const changes = an.phrases.filter(p => p.inn.length || p.out.length).length;
  const fact = (s, b, d) => `<div><small>${s}</small><b>${b}</b><span>${d}</span></div>`;
  $('#facts').innerHTML = [
    fact('Tempo', `${g.bpm.toFixed(2)}`, 'BPM'),
    fact('Key', k ? esc(k.name.replace(' minor', 'm').replace(' major', '')) : '–', k ? `${k.camelot}, ${k.minor ? 'minor' : 'major'}` : 'unclear'),
    fact('Length', `${g.nBars} bars`, fmtT(an.dur)),
    fact('Sections', String(an.sections.length), an.sections.map(s => s.label).filter((v, i, a) => a.indexOf(v) === i).join(', ')),
    fact('Moves found', String(an.moves.length), CAT_ORDER.filter(c => cats[c]).map(c => `${cats[c]} ${c.toLowerCase()}`).join(', ') || 'none'),
    fact('Something changes', `${changes} of ${an.phrases.length}`, 'eight-bar phrases'),
    fact('Sidechain', (() => { const p = an.pumps.filter(x => x.pump); return p.length ? `${Math.round(Math.max(...p.map(x => x.depth)))} dB` : 'none seen'; })(), (() => { const p = an.pumps.filter(x => x.pump); return p.length ? `in ${p.map(x => x.section).join(', ')}` : 'or hidden by other parts'; })()),
    fact('Loudness', `${an.loud.I.toFixed(1)}`, 'LUFS integrated')].join('');
  const ORDER = ['Intro', 'Groove', 'Break', 'Build', 'Drop', 'Outro'], rank = BP.SECTION_TYPES.map(x => x.label);
  $('#types').innerHTML = ORDER.map(l => { const t = BP.SECTION_TYPES.find(x => x.label === l), n = an.sections.filter(s => s.label === l).length; return `<div class="${n ? '' : 'absent'}"><dt><i style="background:${XR.LABEL_COLOR[l]}"></i>${l}<small>${n ? `${n} in this track` : 'none in this track'}, rule ${rank.indexOf(l) + 1} of 6</small></dt><dd>${esc(t.def)}</dd></div>`; }).join('');
  $('#secTable tbody').innerHTML = an.sections.map((s, i) => `<tr data-i="${i}"><td class="num">${s.start + 1}–${s.end}</td><td><span class="swatch" style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:${s.color}"></span><b style="font-weight:600">${esc(s.name)}</b><br><span class="note">${s.end - s.start} bars</span></td><td>${esc(s.why.join(' '))}</td></tr>`).join('');
  $$('#secTable tbody tr').forEach(r => r.onclick = () => { const s = an.sections[+r.dataset.i]; loopBeats(s.start * 4, s.end * 4); });
  $('#strip').innerHTML = an.sections.map((s, i) => `<button type="button" data-i="${i}" style="background:${s.color};flex:${s.end - s.start} 1 0">${esc(s.name)}<small>${s.start + 1}–${s.end}</small></button>`).join('');
  $$('#strip button').forEach(b => b.onclick = () => { const s = an.sections[+b.dataset.i]; loopBeats(s.start * 4, s.end * 4); });
  const sig = [...an.moves].sort((a, b) => b.conf * (b.k1 - b.k0 + 4) - a.conf * (a.k1 - a.k0 + 4)).slice(0, 6).sort((a, b) => a.k0 - b.k0);
  $('#sig').innerHTML = sig.length ? sig.map(e => `<li data-id="${e.id}" style="--c:${e.color}"><b>${esc(e.title)}</b><span class="num">bar ${esc(e.at)}</span><br><span>${esc(snippet(e))}</span></li>`).join('') : '<li style="--c:#8FB2D6">No transition moves found. The arrangement still shows what plays where.</li>';
  $$('#sig li[data-id]').forEach(li => li.onclick = () => { select(an.moves.find(e => e.id === li.dataset.id), true); });
}
function snippet(e) { let t = e.what.split('. ')[0].replace(/^[^:]*: /, '').replace(/\.$/, ''); return t.charAt(0).toUpperCase() + t.slice(1) + '.'; }
function renderTruth() {
  const p = $('#truthPanel'), d = S.demo; p.hidden = !d; if (!d) return;
  const an = S.an, NAME = {lp: 'Low-pass opening on the music', lpStatic: 'Low-pass held on the music bus', hp: 'High-pass on the whole mix', riser: 'Noise riser', pitchUp: 'Pitch riser', pitchDown: 'Downlifter', roll: 'Snare roll', gap: 'Silence before the drop', crash: 'Crash', boom: 'Sub boom', echo: 'Delay throw', width: 'Stereo narrowing', sidechain: 'Sidechain', stutter: '1/16 stutter', reverse: 'Reverse crash', kickOut: 'Kick drop-out', tapeStop: 'Tape stop', fade: 'Fade out'};
  const setting = t => ({lp: '300 Hz → 12 kHz, 24 dB', lpStatic: '800 Hz, 24 dB', hp: '30 → 700 Hz, 24 dB', riser: '+24 dB, filter 500 Hz → 9 kHz', pitchUp: '+24 semitones', pitchDown: '−24 semitones', roll: '8ths, 16ths, 32nds', gap: '1 beat', crash: 'T60 2.5 s', boom: '42 Hz', echo: '3/16, −6 dB per repeat', width: 'side −14 dB', sidechain: '8 dB, back in 154 ms', stutter: '1/16 gate', reverse: '~4 beats', kickOut: 'last 2 beats', tapeStop: '2 beats', fade: '−30 dB'}[t.type] || '');
  const order = t => t.type === 'sidechain' ? 64 : (t.start ?? t.bar) * 4 - (t.type === 'reverse' || t.type === 'gap' ? 4 : 0);
  const rows = [...d.truth.events].sort((a, b) => order(a) - order(b)).map(t => {
    const k0 = (t.start ?? t.bar) * 4 - (t.type === 'reverse' || t.type === 'gap' ? 4 : 0), k1 = (t.end ?? t.bar + 1) * 4;
    if (t.type === 'sidechain') { const f = an.pumps.filter(x => x.pump); return [t, f.length ? `${f.map(x => `${x.section}: ${x.depth.toFixed(1)} dB, ${Math.round(x.releaseMs)} ms`).join('; ')}` : null, f.length ? 'groove only: in the drops a lead hits on every kick and hides it' : '']; }
    const m = an.moves.filter(e => e.type === t.type && e.k1 > k0 - 2 && e.k0 < k1 + 2).sort((a, b) => b.conf - a.conf)[0];
    return [t, m ? `bar ${m.at} to ${m.to}` : null, m ? evidence(m).slice(3).map(([k, v]) => `${k}: ${v}`).join('; ') || m.what.split('. ')[0] : ''];
  });
  $('#truth tbody').innerHTML = rows.map(([t, f, how]) => `<tr><td>${esc(NAME[t.type] || t.type)}</td><td class="num">${t.type === 'sidechain' ? 'groove, drops' : t.start != null ? `bar ${t.start + 1} to ${t.end + 1}` : `bar ${t.bar + 1}`}</td><td>${esc(setting(t))}</td><td class="${f ? 'ok' : 'miss'}">${f ? esc(f) : 'not found'}</td><td class="note">${esc(how)}</td></tr>`).join('');
}
function renderLegend() {
  $('#legend').innerHTML = CAT_ORDER.map(c => `<span><i style="background:${CATC[c]}"></i>${c}</span>`).join('') + `<span><i style="background:${PENCIL}"></i>Cutoff on the whole mix</span><span><i style="background:${CATC.Filter}"></i>Cutoff on the music</span>`;
  $('#dInfo').textContent = `${S.an.moves.length} moves, ${S.an.sections.length} sections`;
}
function renderTransitions() {
  const an = S.an, box = $('#trs'); if (!an) return;
  if (!an.transitions.length) { box.innerHTML = '<p class="empty">No section changes were found: the track runs as one section.</p>'; return; }
  box.innerHTML = an.transitions.map((t, i) => {
    const steps = t.events.slice().sort((a, b) => a.k0 - b.k0);
    const lv = Number.isFinite(t.jump) ? `${t.jump >= 0 ? '+' : '−'}${Math.abs(t.jump).toFixed(1)} dB` : '–';
    return `<article class="tr" id="tr${i}"><header><h3>Bar ${t.bar + 1}: ${esc(t.from.name)} into ${esc(t.to.name)}</h3><span class="num">level ${lv}${t.pump && t.pump.pump ? `, pumps ${t.pump.depth.toFixed(0)} dB after` : ''}</span><span class="grow"></span><button class="btn sm" type="button" data-play="${i}">Play the transition</button></header>
      <p class="note" style="padding:0 16px 10px;margin:0"><b style="color:var(--ink)">Why ${esc(t.to.name)}:</b> ${esc(t.to.why.join(' '))}</p>
      <div class="mini"><canvas data-tr="${i}"></canvas></div>
      <div class="body"><div><h3 style="font-size:16px;margin-bottom:8px">What changes</h3>
        <div class="ch">${t.inn.map(c => `<span class="in">${esc(c.name)} in</span>`).join('')}${t.out.map(c => `<span class="out">${esc(c.name)} out</span>`).join('')}${!t.inn.length && !t.out.length ? '<span>Same parts on both sides</span>' : ''}</div>
        ${steps.length ? `<h3 style="font-size:16px;margin:14px 0 6px">Moves into it</h3><div class="ch">${steps.map(e => `<span style="border-color:${e.color}">${esc(e.title)} <span class="num">${esc(e.at)}</span></span>`).join('')}</div>` : '<p class="note" style="margin-top:12px">No transition moves: the change is made by the parts alone.</p>'}</div>
        <div><h3 style="font-size:16px;margin-bottom:6px">Rebuild it, in order</h3><ol class="rebuild">${[...steps.map(e => ({k: e.k0, html: `<span class="num">${esc(e.at)}</span><b>${esc(e.title)}.</b> ${esc(e.recipe[0])}${e.recipe[1] ? ' ' + esc(e.recipe[1]) : ''}`})), ...(t.inn.length || t.out.length ? [{k: t.k - 0.001, html: `<span class="num">${t.bar + 1}.1</span><b>On the downbeat:</b> ${[t.inn.length ? 'bring in ' + t.inn.map(c => c.name.toLowerCase()).join(', ') : '', t.out.length ? 'take out ' + t.out.map(c => c.name.toLowerCase()).join(', ') : ''].filter(Boolean).join('; ')}.`}] : [])].sort((x, y) => x.k - y.k).map(x => `<li><div>${x.html}</div></li>`).join('')}</ol></div></div></article>`;
  }).join('');
  $$('[data-play]', box).forEach(b => b.onclick = () => { const t = an.transitions[+b.dataset.play]; loopBeats(Math.max(0, t.k - 32), Math.min(an.grid.nBars * 4, t.k + 16)); });
  $$('.mini canvas', box).forEach(cv => { const t = an.transitions[+cv.dataset.tr], W = Math.max(300, cv.parentElement.clientWidth - 16); cv._r = drawSheet(cv, an, Math.max(0, t.k - 32), Math.min(an.grid.nBars * 4, t.k + 16), W, true); cv._img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); labels(cv.getContext('2d'), cv._r.L, 0, true); cv._img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    cv.onclick = e => { const rc = cv.getBoundingClientRect(), k = t.k - 32 + (e.clientX - rc.left) / rc.width * (cv._r.k1 - cv._r.k0); seek(kTime(Math.max(0, Math.floor(k)))); if (!P.playing) play(); }; });
}
function miniOverlay(cv) {
  if (!cv._img || !cv._r) return; const c = cv.getContext('2d'), dpr = window.devicePixelRatio || 1; c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(cv._img, 0, 0);
  const k = tBeat(pos()); if (k < cv._r.k0 || k > cv._r.k1) return; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#fff'; c.fillRect(Math.round(cv._r.X(k)) - 1, 0, 2, cv._r.H);
}
function renderMoves() {
  const an = S.an, cats = ['All', ...CAT_ORDER.filter(c => an.moves.some(e => e.cat === c))];
  $('#cats').innerHTML = cats.map(c => `<button type="button" class="${S.cat === c ? 'on' : ''}" data-c="${c}">${c !== 'All' ? `<i style="background:${CATC[c]}"></i>` : ''}${c === 'All' ? `All ${an.moves.length}` : `${c} ${an.moves.filter(e => e.cat === c).length}`}</button>`).join('');
  $$('#cats button').forEach(b => b.onclick = () => { S.cat = b.dataset.c; renderMoves(); });
  const list = an.moves.filter(e => S.cat === 'All' || e.cat === S.cat);
  $('#mvRows').innerHTML = list.length ? list.map(e => `<tr class="mv${S.sel === e ? ' sel' : ''}" data-id="${e.id}"><td class="num">${esc(e.at)}</td><td><span style="color:${e.color};font-weight:700">■</span> <b style="font-weight:600">${esc(e.title)}</b></td><td>${esc(evidence(e).slice(3, 5).map(([k, v]) => `${k} ${v}`).join(', '))}</td><td class="num">${esc(BP.lengthText(e.k1 - e.k0))}</td><td>${confPill(e.conf)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No moves in this group.</td></tr>';
  $$('tr.mv').forEach(r => r.onclick = () => { const e = an.moves.find(m => m.id === r.dataset.id); select(e); const pre = Math.max(0, Math.floor(e.k0 / 4) * 4 - 4), post = Math.min(an.grid.nBars * 4, Math.ceil(Math.max(e.k1, e.k0 + 1) / 4) * 4 + 4); loopBeats(pre, post); });
}
function renderPhrases() {
  const an = S.an;
  $('#phr').innerHTML = an.phrases.map(p => `<div class="ph"><div class="num">bars ${p.start + 1}–${p.end}<div class="t"><i style="width:${Math.round(p.tension * 100)}%"></i></div></div><div><b style="font-weight:600">${esc(p.section)}</b>: ${p.inn.length ? '<span style="color:#1C6B3A">+ ' + esc(p.inn.join(', ')) + '</span>' : ''}${p.inn.length && p.out.length ? '; ' : ''}${p.out.length ? '<span style="color:#9B2C22">− ' + esc(p.out.join(', ')) + '</span>' : ''}${!p.inn.length && !p.out.length ? '<span class="note">same parts</span>' : ''}${p.events.length ? `. ${esc(p.events.map(e => `${e.title.toLowerCase()} at ${e.at}`).join(', '))}` : ''}</div></div>`).join('');
}
function svgLine(svg, vals, opts) {
  const W = 600, H = 150, n = vals.length, fin = vals.filter(Number.isFinite); if (!fin.length) { svg.innerHTML = ''; return; }
  const lo = opts.lo ?? Math.min(...fin), hi = opts.hi ?? Math.max(...fin), Y = v => 140 - XR.clamp((v - lo) / (hi - lo || 1), 0, 1) * 128;
  let d = '', pen = false; vals.forEach((v, i) => { if (!Number.isFinite(v)) { pen = false; return; } d += `${pen ? 'L' : 'M'}${(i / (n - 1) * W).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; });
  const secs = S.an.sections.map(s => `<line x1="${s.start * 4 / n * W}" x2="${s.start * 4 / n * W}" y1="0" y2="150" stroke="#ffffff22"/><text x="${s.start * 4 / n * W + 3}" y="12" fill="#8FB2D6" font-size="10" font-family="Archivo,sans-serif">${esc(s.name)}</text>`).join('');
  svg.innerHTML = `${secs}${opts.fill ? `<path d="${d}L${W},150L0,150Z" fill="${opts.color}33"/>` : ''}<path d="${d}" fill="none" stroke="${opts.color}" stroke-width="1.6"/>`;
}
function renderMotion() {
  const an = S.an;
  const T0 = Array.from(an.tension); svgLine($('#tensionSvg'), T0.map((v, k) => { const a = T0.slice(Math.max(0, k - 2), k + 2); return a.reduce((x, y) => x + y) / a.length; }), {color: PENCIL, fill: true, lo: 0, hi: 1});
  const w = Array.from(an.width), sm = w.map((v, i) => { const a = w.slice(Math.max(0, i - 2), i + 3).filter(Number.isFinite); return a.length ? a.reduce((x, y) => x + y) / a.length : NaN; });
  svgLine($('#widthSvg'), sm, {color: CATC.Mix});
  $('#pumps').innerHTML = an.pumps.length ? an.pumps.map(p => {
    const c = p.curve, lo = Math.min(...c.filter(Number.isFinite)), hi = Math.max(...c.filter(Number.isFinite)), Y = v => 70 - XR.clamp((v - lo) / (hi - lo || 1), 0, 1) * 60;
    const d = c.map((v, i) => `${i ? 'L' : 'M'}${(i / (c.length - 1) * 240).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    return `<figure><svg viewBox="0 0 240 78" role="img" aria-label="Pump curve for ${esc(p.section)}" style="background:var(--sheet);width:100%;border-radius:2px"><line x1="0" x2="240" y1="${Y(hi)}" y2="${Y(hi)}" stroke="#ffffff22"/><path d="${d}" fill="none" stroke="${p.pump ? PENCIL : '#8FB2D6'}" stroke-width="2"/></svg><figcaption><b>${esc(p.section)}</b>: ${p.pump ? `ducks ${p.depth.toFixed(1)} dB at the kick, back within 1 dB after ${Math.round(p.releaseMs)} ms` : `no clear pump (${p.depth.toFixed(1)} dB of movement, not the shape of one)`}</figcaption></figure>`;
  }).join('') : '<p class="empty">No sections with a kick on beats 1 and 3, so there is nothing to measure.</p>';
}
function renderExport() {
  const g = S.an.grid;
  $('#liveSteps').innerHTML = [
    `Set Live's tempo to ${g.bpm.toFixed(2)} BPM.`,
    `Drop the reference on an audio track, turn Warp on and set its tempo to ${g.bpm.toFixed(2)}. Bar 1 of the drawing starts ${(g.t0 * 1000).toFixed(0)} ms into the file: drag the clip's start marker there, or nudge the first warp marker onto it.`,
    'Drag Blueprint MIDI into the arrangement at bar 1. The section names land as locators; each element gets its own MIDI track with clips where it plays.',
    'Replace the clips with your own parts, or keep them as a map and mute them.',
    'For the filter sweeps, put Auto Filter on the matching group and draw the breakpoints from each move (open a move above to see them). The CC74 track carries the same curve if you prefer to copy it from the clip envelope.',
    'Turn on Click in the transport here and compare with Live\'s metronome before trusting anything else.'].map(s => `<li>${esc(s)}</li>`).join('');
}

// ---------- exports ----------
function wireExport() {
  $('#midiBtn').onclick = () => download(`${base()} - Blueprint.mid`, BP.blueprintMidi(S.an), 'audio/midi');
  $('#mdBtn').onclick = () => download(`${base()} - Blueprint.md`, BP.report(S.an, base()), 'text/markdown');
  $('#jsonBtn').onclick = () => { const an = S.an, r = v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v; download(`${base()} - Blueprint.json`, JSON.stringify({track: an.meta.name, bpm: r(an.grid.bpm), bar1: r(an.grid.t0), bars: an.grid.nBars, key: an.key && an.key.name, sections: an.sections.map(s => ({name: s.name, label: s.label, start: s.start + 1, end: s.end})), moves: an.moves.map(e => ({type: e.type, title: e.title, at: e.at, to: e.to, sure: r(e.conf), target: e.target, what: e.what, recipe: e.recipe, curve: e.curve && e.curve.filter(p => p.hz).map(p => [r(p.k), Math.round(p.hz)])})), sidechain: an.pumps.map(p => ({section: p.section, pump: p.pump, depth: r(p.depth), releaseMs: p.releaseMs && Math.round(p.releaseMs)})), lanes: Object.fromEntries(Object.entries(an.elementSpans).map(([k, v]) => [k, v.map(([a, b]) => [r(a), r(b)])]))}, null, 1), 'application/json'); };
  $('#copyBtn').onclick = () => copy(S.an.transitions.map(t => `Bar ${t.bar + 1}: ${t.from.name} into ${t.to.name}\n` + t.events.map(e => `  ${e.at}  ${e.title}: ${e.recipe.join(' ')}`).join('\n')).join('\n\n'));
}

// ---------- wiring ----------
function wireDrop(el) { el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); }); el.addEventListener('dragleave', () => el.classList.remove('over')); el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }); }
function init() {
  $('#pick').onclick = () => $('#file').click(); $('#file').onchange = e => loadFile(e.target.files[0]); $('#demoBtn').onclick = loadDemo; wireDrop($('#drop'));
  $('#play').onclick = toggle; $('#loopBtn').onclick = () => { if (P.loop) setLoop(null); else if (S.sel) { const e = S.sel; loopBeats(Math.floor(e.k0 / 4) * 4, Math.ceil(Math.max(e.k1, e.k0 + 1) / 4) * 4, false); } else { const k = Math.floor(tBeat(pos()) / 16) * 16; loopBeats(Math.max(0, k), k + 16, false); } };
  $('#clickBtn').onclick = () => { P.click = !P.click; $('#clickBtn').classList.toggle('on', P.click); };
  $('#listen').onchange = e => { ac(); setMode(e.target.value); };
  $('#speed').onchange = e => { const was = P.playing; if (was) stop(); P.rate = +e.target.value; if (was) play(); };
  $('#zoom').onchange = e => { S.zoom = +e.target.value; mapCache = null; overlay(); };
  $('#specSrc').onchange = e => { S.spec = e.target.value; mapCache = null; overlay(); };
  wireDrawing(); wireExport();
  addEventListener('keydown', e => {
    if (!S.an || e.target.matches('input,select,textarea')) return;
    const g = S.an.grid;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const k = tBeat(pos()), d = (e.shiftKey ? 32 : 4) * (e.key === 'ArrowRight' ? 1 : -1); seek(kTime(Math.max(0, Math.floor(k / 4) * 4 + d))); }
    else if (e.key === 'l' || e.key === 'L') $('#loopBtn').click();
    else if (e.key === 'm' || e.key === 'M') $('#clickBtn').click();
    else if (e.key === ']' || e.key === '[') { const k = tBeat(pos()), list = S.an.moves; const m = e.key === ']' ? list.find(x => x.k0 > k + 0.1) : [...list].reverse().find(x => x.k0 < k - 0.5); if (m) { select(m); seek(kTime(Math.max(0, Math.floor(m.k0 / 4) * 4 - 4))); } }
    void g;
  });
}
init();
})();
