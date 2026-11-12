// Outside app: the map, the transport, the live spectrum and the report.
(() => {
  const O = OUTSIDE, A = OutsideAudio, $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const store = {get() { try { return JSON.parse(localStorage.getItem('outside:v1')) || {}; } catch { return {}; } }, set(v) { try { localStorage.setItem('outside:v1', JSON.stringify(v)); } catch { /* private mode */ } }};
  const saved = store.get();
  const state = {place: O.placeById(saved.place) ? saved.place : 'floor', last: 'floor', match: saved.match !== false, amb: Number.isFinite(saved.amb) ? saved.amb : 60, loop: saved.loop !== false};
  const save = () => store.set({place: state.place === 'studio' ? state.last : state.place, match: state.match, amb: state.amb, loop: state.loop});
  const tracks = {mine: null, ref: null};
  let ctx = null, player = null;
  const SPOTS = {booth: [280, 122], floor: [280, 290], sub: [108, 152], bar: [182, 414], toilets: [620, 140], smoke: [620, 390], queue: [330, 574]};
  const CHECK_NAMES = {bass: 'The bass note', kick: 'The kick', mono: 'Mono', punch: 'Gaps in the low end', groove: 'The groove through the wall', infra: 'Energy under 30 Hz', lows: 'Weight under 120 Hz', boom: 'Low-mid build-up', harsh: '2–5 kHz when loud', tops: 'The top end'};
  const grade = s => s == null ? '' : s >= 85 ? 'ok' : s >= 62 ? 'warn' : 'bad';
  const colour = s => ({ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)'})[grade(s)] || 'var(--muted)';
  const status = (text, err) => { const el = $('status'); el.textContent = text; el.classList.toggle('err', !!err); };
  const paint = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const svg = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent && parent.appendChild(el); return el; };
  const download = (name, data, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], {type})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const signed = x => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1);

  // ------------------------------------------------------------ the map
  function drawMap() {
    const r = O.rng(3), rings = $('rings'), dancers = $('dancers'), q = $('queue-people'), spots = $('spots'), world = $('world');
    for (const cx of [108, 452]) for (let i = 0; i < 3; i++) svg('circle', {cx, cy: 80, r: 18, class: 'ring-wave', style: `animation-delay:calc(var(--beat,.476s)*${-i / 3})`}, rings);
    for (let i = 0; i < 64; i++) { const x = 70 + r() * 420, y = 150 + r() * 270; if (Object.values(SPOTS).some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 34)) continue; svg('circle', {cx: x.toFixed(1), cy: y.toFixed(1), r: 3.2, class: 'dancer', style: `animation-delay:${(r() * .3).toFixed(2)}s`}, dancers); }
    for (let i = 0; i < 9; i++) svg('circle', {cx: 372 + i * 17 + r() * 5, cy: 548 + r() * 6, r: 3.2, class: 'dancer'}, q);
    for (let i = 0; i < 12; i++) svg('circle', {cx: 545 + r() * 150, cy: 285 + r() * 210, r: 3.2, class: 'dancer'}, q);
    for (const p of O.PLACES) {
      if (SPOTS[p.id]) {
        const [x, y] = SPOTS[p.id], g = svg('g', {class: 'spot', transform: `translate(${x} ${y})`, tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': p.name, 'data-place': p.id}, spots);
        svg('circle', {r: 17, class: 'hit'}, g); svg('text', {class: 'sc'}, g); svg('text', {class: 'nm', y: 34}, g).textContent = p.short;
      } else { const b = document.createElement('button'); b.dataset.place = p.id; b.setAttribute('aria-pressed', 'false'); b.innerHTML = `${esc(p.short)}<span class="sc"></span>`; world.appendChild(b); }
    }
    for (const el of document.querySelectorAll('[data-place]')) { el.addEventListener('click', () => go(el.dataset.place)); el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(el.dataset.place); } }); el.addEventListener('keyup', e => { if (e.key === ' ') e.preventDefault(); }); }
    $('models').tBodies[0].innerHTML = O.PLACES.filter(p => p.id !== 'studio').map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${p.model.map(esc).join(' · ')}</td><td>${p.checks.map(c => CHECK_NAMES[c]).join(', ')}</td></tr>`).join('');
  }
  function markMap() {
    const rep = tracks.mine && tracks.mine.rep;
    for (const el of document.querySelectorAll('[data-place]')) {
      const id = el.dataset.place, p = rep && rep.places.find(x => x.id === id), sc = el.querySelector('.sc');
      el.setAttribute('aria-pressed', String(id === state.place)); el.classList.remove('g-ok', 'g-warn', 'g-bad');
      if (p && p.score != null) { el.classList.add('g-' + grade(p.score)); sc.textContent = p.score; } else sc.textContent = '';
    }
    const you = $('you'), at = SPOTS[state.place];
    if (at) { you.classList.remove('away'); you.setAttribute('transform', `translate(${at[0] + 27} ${at[1] - 21})`); you.style.transform = ''; } else you.classList.add('away');
    $('where').textContent = O.placeById(state.place).name; $('flip').setAttribute('aria-pressed', String(state.place === 'studio'));
  }

  // ------------------------------------------------------------ levels
  const cur = () => tracks[player ? player.which : 'mine'] || tracks.mine;
  function placeRow(t, id) { return t.rep.places.find(p => p.id === id); }
  function levelsFor(id) { // output gain of the place and the level of its own noise, in dB
    const t = cur(), p = O.placeById(id); if (!t) return [-5, null];
    const row = placeRow(t, id), g = (state.match ? O.clamp(-row.loud, -14, 14) : p.level) - 5;
    if (!p.noise || state.amb <= 0 || !player) return [g, null];
    const music = t.m.lufs + (player.tracks[player.which].gain || 0) + row.loud + g;
    return [g, O.clamp(music - p.noise.snr - player.ambLufs(p.noise.kind) + (state.amb - 60) / 4, -60, 12)];
  }
  function trackGains() { if (!player) return; const a = tracks.mine, b = tracks.ref, target = a && b ? Math.min(a.m.lufs, b.m.lufs) : null; for (const w of ['mine', 'ref']) if (tracks[w]) player.setGain(w, target == null ? 0 : target - tracks[w].m.lufs); }
  function relevel() { if (!player || !player.chain) return; const [g, a] = levelsFor(state.place); player.setLevels(g, a); }

  // ------------------------------------------------------------ places
  function go(id, quiet) {
    if (!O.placeById(id)) return;
    if (id !== 'studio') state.last = id; state.place = id; save();
    if (player) { const [g, a] = levelsFor(id); player.setPlace(O.placeById(id), g, a); showDoor(false); }
    renderPlace(); markMap();
    if (!quiet && window.innerWidth < 980 && tracks.mine) $('place').scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  function walk(d) { const i = O.PLACES.findIndex(p => p.id === state.place); go(O.PLACES[(i + d + O.PLACES.length) % O.PLACES.length].id); }
  function flip() { go(state.place === 'studio' ? state.last : 'studio', true); }
  function showDoor(open) { for (const id of ['toilets', 'smoke', 'queue']) $('door-' + id).classList.toggle('open', open && id === state.place); $('door').classList.toggle('on', open); $('door').setAttribute('aria-pressed', String(open)); }
  function bar(el, groups) { el.innerHTML = O.GROUPS6.map(([id, name]) => `<i style="width:${(groups[id] * 100).toFixed(2)}%;background:var(--${id})" title="${name} ${(groups[id] * 100).toFixed(0)}%"></i>`).join(''); }
  function finding(f) { const fix = O.FIXES[f.fix]; return `<div class="finding s${f.sev}"><h4>${esc(f.head)}</h4><p>${esc(f.text)}</p><p class="fix"><b>${esc(fix[0])}.</b> ${esc(fix[1])}</p></div>`; }
  function renderPlace() {
    const p = O.placeById(state.place), t = tracks.mine, row = t && placeRow(t, p.id), group = (O.GROUPS.find(g => g[0] === p.group) || [0, 'Reference'])[1];
    $('p-eyebrow').textContent = `${group} · ${p.tag}`; $('p-name').textContent = p.name; $('p-blurb').textContent = p.blurb; $('p-always').textContent = p.always;
    $('p-model').innerHTML = p.model.map(x => `<li>${esc(x)}</li>`).join('');
    $('door').hidden = !p.chain.some(s => s.k === 'door'); $('bounce').disabled = !t;
    const ring = $('p-score'); ring.hidden = !row || row.score == null;
    if (row && row.score != null) { ring.style.setProperty('--v', row.score); ring.style.setProperty('--c', colour(row.score)); ring.firstElementChild.textContent = row.score; ring.lastElementChild.textContent = row.verdict; }
    $('p-mix').hidden = !row;
    if (row) {
      bar($('mix-studio'), t.rep.places[0].groups); bar($('mix-here'), row.groups);
      $('mix-legend').innerHTML = O.GROUPS6.map(([id, name, a, b]) => `<span style="white-space:nowrap"><span class="sw" style="background:var(--${id})"></span> ${name} ${a < 1000 ? a : a / 1000 + 'k'}–${b < 1000 ? b : b / 1000 + 'k'}</span>`).join(' ');
    }
    const box = $('p-findings');
    if (!row) box.innerHTML = '<p class="note">Drop a mix or play the demo to see what this place does to it.</p>';
    else if (p.id === 'studio') box.innerHTML = `<p class="good">${t.rep.lufs.toFixed(1)} LUFS over the loudest ${Math.round(t.rep.len)} s, peak ${t.rep.peak.toFixed(1)} dBFS, stereo correlation ${t.rep.corr.toFixed(2)}${t.rep.lowNote ? `, low end centred on ${t.rep.lowNote} (${t.rep.lowHz.toFixed(0)} Hz)` : ''}.</p>`;
    else {
      const ref = tracks.ref && placeRow(tracks.ref, p.id);
      box.innerHTML = row.found.map(finding).join('') + row.good.map(g => `<p class="good">${esc(g.text)}</p>`).join('') +
        `<p class="note">Before matching, this place makes your track ${signed(row.loud)} LU ${row.loud >= 0 ? 'louder' : 'quieter'} than the studio.${ref ? ` The reference scores ${ref.score} here${ref.found.length ? ': ' + esc(ref.found.map(f => f.head.toLowerCase()).join(', ')) : ''}.` : ''}</p>`;
    }
  }

  // ------------------------------------------------------------ the report
  const LINES = {Survives: 'It survives the night.', Changes: 'It changes on the way out.', 'Falls apart': 'It falls apart outside the studio.'};
  function renderReport() {
    const t = tracks.mine; $('report-empty').hidden = !!t; $('report-body').hidden = !t; if (!t) return;
    const rep = t.rep, ref = tracks.ref, ring = $('overall');
    ring.style.setProperty('--v', rep.overall); ring.style.setProperty('--c', colour(rep.overall)); ring.firstElementChild.textContent = rep.overall; ring.lastElementChild.textContent = 'of 100';
    $('overall-line').textContent = LINES[rep.verdict];
    $('facts').textContent = `${t.name} · measured on ${O.clock(rep.start)}–${O.clock(rep.start + rep.len)} · ${rep.lufs.toFixed(1)} LUFS · peak ${rep.peak.toFixed(1)} dBFS · correlation ${rep.corr.toFixed(2)}${rep.lowNote ? ` · low end on ${rep.lowNote}` : ''}${rep.bpm ? ` · about ${Math.round(rep.bpm)} BPM` : ''}`;
    $('ref-line').textContent = ref ? `Reference: ${ref.name} scores ${ref.rep.overall}. Where it breaks too, the place is hard on everybody.` : '';
    $('report-body').classList.toggle('has-ref', !!ref); $('add-ref').textContent = ref ? '↻ Change the reference' : '＋ Add a reference track';
    $('fixes').innerHTML = rep.fixes.length ? rep.fixes.map(f => `<li><b>${esc(f.title)}</b><span class="gain">about +${f.points} overall · ${esc(f.places.join(', '))}</span><p>${esc(f.how)}</p></li>`).join('') : '<li class="none">Nothing to fix. No check failed in any of the twelve places.</li>';
    $('card').tBodies[0].innerHTML = rep.places.filter(p => p.score != null).map(p => { const r = ref && placeRow(ref, p.id); return `<tr data-go="${p.id}"><td>${esc(p.name)}</td><td class="num c-${grade(p.score)}">${p.score}</td><td class="num refcol c-${r ? grade(r.score) : ''}">${r ? r.score : ''}</td><td class="num">${signed(p.loud)} LU</td><td>${p.found.length ? p.found.map(f => `<b>${esc(f.head)}.</b>`).join(' ') : '<span class="c-ok">Nothing breaks.</span>'}</td></tr>`; }).join('');
    for (const tr of $('card').tBodies[0].rows) tr.addEventListener('click', () => { go(tr.dataset.go, true); $('night').scrollIntoView({behavior: 'smooth'}); });
    const box = $('planted'); box.hidden = !t.demo;
    if (t.demo) { const found = new Set(rep.fixes.map(f => f.id)), n = O.PLANTED.filter(p => found.has(p[0])).length;
      box.innerHTML = t.demo === 'bad' ? `<p class="label">Planted in this mix: ${O.PLANTED.length} · found by the report: ${n}</p><ul>${O.PLANTED.map(([id, what, why]) => `<li class="${found.has(id) ? '' : 'miss'}"><b>${esc(what)}</b>${esc(why)} → ${esc(O.FIXES[id][0])}</li>`).join('')}</ul>`
        : `<p class="label">The same sixteen bars with all seven problems fixed</p><p class="note">The bass has harmonics and sits in the centre, the kick is short with a click, the bass ducks under it, the rumble is gone, the stab is bright and mono-safe, the pad is high-passed. ${n ? n + ' of the planted problems are still reported.' : 'None of the seven is reported any more.'} Play both and walk to the phone.</p>`; }
  }
  const render = () => { renderPlace(); renderReport(); markMap(); drawWave(); };

  // ------------------------------------------------------------ loading
  function ensure() { if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)(); player = A.player(ctx); player.onDoor = showDoor; QA.player = player; QA.ctx = ctx; }
  function loops() { for (const w of ['mine', 'ref']) { const t = tracks[w]; if (t && player.tracks[w]) player.tracks[w].loop = state.loop && t.buffer.duration > t.ov.len + 2 ? [t.ov.start, t.ov.start + t.ov.len] : null; } }
  async function take(which, L, R, name, demo) {
    ensure(); status(`Measuring ${name}…`); await paint();
    const sr = ctx.sampleRate, ov = O.overview(L, R, sr), m = O.analyse(L, R, sr, ov), rep = O.report(m);
    tracks[which] = {name, buffer: A.buf(ctx, [L, R]), ov, m, rep, demo}; player.tracks[which] = {buffer: tracks[which].buffer, gain: 0, loop: null};
    loops(); trackGains(); $('bar').hidden = false; $('ab-ref').disabled = !tracks.ref;
    document.documentElement.style.setProperty('--beat', (60 / (tracks.mine.rep.bpm || 126)).toFixed(4) + 's');
    if (which === 'mine') { player.stop(); player.which = 'mine'; player.offset = ov.start; setAB(); }
    if (!player.chain) go(state.place, true); else relevel();
    render(); status(which === 'mine' ? `${name}: ${rep.overall} out of 100. Walk the night, then read the report below.` : `Reference loaded: ${name} scores ${rep.overall}. Press R to switch between yours and the reference.`);
    if (which === 'mine') { try { await ctx.resume(); } catch { /* needs a click */ } if (ctx.state === 'running') play(true); }
  }
  async function takeFile(which, file) {
    if (!file) return; ensure(); status(`Decoding ${file.name}…`);
    try {
      const bytes = await file.arrayBuffer(), b = await new Promise((res, rej) => { const p = ctx.decodeAudioData(bytes, res, rej); if (p && p.then) p.then(res, rej); });
      if (b.duration < 4) throw Error('That file is shorter than four seconds.');
      await take(which, b.getChannelData(0), b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0), file.name.replace(/\.[a-z0-9]+$/i, ''));
    } catch (e) { status(e && e.message && /shorter/.test(e.message) ? e.message : `Could not read ${file.name}. Try a WAV, MP3, FLAC or AAC file.`, true); }
  }
  async function takeDemo(fixed) { ensure(); status('Writing the demo mix…'); await paint(); const d = O.demo(fixed, ctx.sampleRate); await take('mine', d.L, d.R, d.name, fixed ? 'good' : 'bad'); $('night').scrollIntoView({behavior: 'smooth'}); }

  // ------------------------------------------------------------ transport
  function play(on) {
    if (!player || !tracks.mine) return; if (on == null) on = !player.playing;
    if (on) { ctx.resume(); player.start(); } else player.stop();
    $('play').textContent = on ? '❚❚' : '▶'; $('play').setAttribute('aria-label', on ? 'Pause' : 'Play'); $('map').classList.toggle('playing', on); if (!on) showDoor(false);
  }
  function setAB(which) {
    if (which && player && tracks[which] && which !== player.which) {
      const from = tracks[player.which], to = tracks[which], pos = player.now(), rel = pos - from.ov.start;
      player.setTrack(which, state.loop && rel >= 0 && rel < from.ov.len ? to.ov.start + Math.min(rel, to.ov.len - .05) : pos % to.buffer.duration); relevel(); drawWave();
    }
    const w = player ? player.which : 'mine'; $('ab-mine').setAttribute('aria-pressed', String(w === 'mine')); $('ab-ref').setAttribute('aria-pressed', String(w === 'ref'));
  }
  let waveImg = null;
  function fit(c) { if (!c._css) { c._css = Number(c.getAttribute('height')); c.style.height = c._css + 'px'; } const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(50, Math.round(c.clientWidth * dpr)), h = Math.round(c._css * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return dpr; }
  function drawWave() {
    const c = $('wave'), t = cur(); if (!t || $('bar').hidden) return; fit(c);
    const off = document.createElement('canvas'), g = off.getContext('2d'), w = off.width = c.width, h = off.height = c.height, rms = t.ov.rms, peak = rms.reduce((a, b) => Math.max(a, b), 1e-6);
    g.fillStyle = 'rgba(255,179,71,.13)'; g.fillRect(t.ov.start / t.ov.secs * w, 0, t.ov.len / t.ov.secs * w, h);
    g.fillStyle = '#59627f'; for (let x = 0; x < w; x += 2) { const a = Math.floor(x / w * rms.length), b = Math.max(a + 1, Math.floor((x + 2) / w * rms.length)); let v = 0; for (let i = a; i < b && i < rms.length; i++) v = Math.max(v, rms[i]); const y = Math.max(1, v / peak * h * .9); g.fillRect(x, (h - y) / 2, 1.4, y); }
    waveImg = off;
  }
  function frame() {
    requestAnimationFrame(frame); if (!player || $('bar').hidden) return;
    const c = $('wave'), t = cur(); if (t && waveImg) { const g = c.getContext('2d'), pos = player.now(), x = pos / t.buffer.duration * c.width; g.clearRect(0, 0, c.width, c.height); g.drawImage(waveImg, 0, 0); g.fillStyle = '#4de3ff'; g.fillRect(x - 1, 0, 2.5, c.height); $('time').textContent = `${O.clock(pos)} / ${O.clock(t.buffer.duration)}`; }
    drawScope();
  }
  const bins = {};
  function drawScope() {
    const c = $('scope'), dpr = fit(c), g = c.getContext('2d'), w = c.width, h = c.height, lo = 20, hi = 20000, top = -18, bot = -98, sr = ctx.sampleRate;
    g.clearRect(0, 0, w, h); g.font = `${10 * dpr}px "JetBrains Mono", monospace`; g.fillStyle = '#48506a'; g.strokeStyle = '#161a26'; g.lineWidth = 1;
    for (const f of [30, 60, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]) { const x = Math.log(f / lo) / Math.log(hi / lo) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.fillText(f < 1000 ? f : f / 1000 + 'k', x + 3 * dpr, h - 4 * dpr); }
    const line = (an, shift) => { const n = an.frequencyBinCount, d = bins[n] || (bins[n] = new Float32Array(n)); an.getFloatFrequencyData(d); const pts = [], cols = Math.round(w / (3 * dpr)); for (let i = 0; i <= cols; i++) { const f0 = lo * Math.pow(hi / lo, (i - .5) / cols), f1 = lo * Math.pow(hi / lo, (i + .5) / cols), a = Math.max(1, Math.floor(f0 / sr * 2 * n)), b = Math.max(a + 1, Math.ceil(f1 / sr * 2 * n)); let v = -200; for (let k = a; k < b && k < n; k++) v = Math.max(v, d[k]); v += shift + 3 * Math.log2(Math.max(f0, 20) / 1000) * .75; pts.push([i / cols * w, O.clamp((top - v) / (top - bot), 0, 1) * h]); } return pts; };
    const path = pts => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); };
    const [pg] = levelsFor(state.place), here = line(player.wet, 0), ghost = line(player.dry, pg);
    path(here); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(77,227,255,.5)'); grad.addColorStop(1, 'rgba(77,227,255,.03)'); g.fillStyle = grad; g.fill();
    path(here); g.strokeStyle = '#4de3ff'; g.lineWidth = 1.6 * dpr; g.stroke();
    path(ghost); g.strokeStyle = '#7b84a3'; g.lineWidth = 1.2 * dpr; g.setLineDash([4 * dpr, 3 * dpr]); g.stroke(); g.setLineDash([]);
    if (player.ambNode && player.ambDb != null) { path(line(player.air, 0)); g.strokeStyle = 'rgba(255,179,71,.8)'; g.lineWidth = 1.1 * dpr; g.stroke(); }
  }

  // ------------------------------------------------------------ wiring
  const QA = window.OUTSIDE_QA = {state, tracks, go, play, take, takeDemo, levelsFor, O, A, player: null, ctx: null};
  drawMap(); render();
  $('demo-bad').addEventListener('click', () => takeDemo(false)); $('demo-good').addEventListener('click', () => takeDemo(true));
  const drop = $('drop'), file = $('file');
  drop.addEventListener('click', () => file.click()); drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  file.addEventListener('change', () => { takeFile('mine', file.files[0]); file.value = ''; });
  document.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); }); document.addEventListener('dragleave', () => drop.classList.remove('over'));
  document.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) takeFile(e.target.closest && e.target.closest('#report') && tracks.mine ? 'ref' : 'mine', f); });
  $('add-ref').addEventListener('click', () => $('ref-file').click()); $('ref-file').addEventListener('change', e => { takeFile('ref', e.target.files[0]); e.target.value = ''; });
  $('play').addEventListener('click', () => play()); $('flip').addEventListener('click', flip);
  $('ab-mine').addEventListener('click', () => setAB('mine')); $('ab-ref').addEventListener('click', () => setAB('ref'));
  $('loop').checked = state.loop; $('match').checked = state.match; $('amb').value = state.amb;
  $('loop').addEventListener('change', e => { state.loop = e.target.checked; save(); if (player) { loops(); player.setLoop(); } });
  $('match').addEventListener('change', e => { state.match = e.target.checked; save(); relevel(); });
  $('amb').addEventListener('input', e => { state.amb = Number(e.target.value); save(); relevel(); });
  $('wave').addEventListener('click', e => { const t = cur(); if (!t) return; const r = e.currentTarget.getBoundingClientRect(); player.seek((e.clientX - r.left) / r.width * t.buffer.duration); });
  const hold = on => { if (player) player.holdDoor(on); };
  $('door').addEventListener('pointerdown', () => hold(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('door').addEventListener(ev, () => player && player.doorHeld && hold(false));
  $('door').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); hold(!player.doorHeld); } });
  $('bounce').addEventListener('click', async () => { const t = cur(), p = O.placeById(state.place); if (!t) return; status(`Rendering ${p.name}…`); const [g] = levelsFor(p.id), b = await A.render(t.buffer, p, {start: t.ov.start, len: t.ov.len, gainDb: g}); download(`${t.name} - ${p.short}.wav`, O.wav(b.getChannelData(0), b.getChannelData(1), b.sampleRate), 'audio/wav'); status(`Saved ${Math.round(t.ov.len)} s of ${t.name} in ${p.name.toLowerCase()}.`); });
  const md = () => O.markdown(tracks.mine.rep, tracks.mine.name, tracks.ref && tracks.ref.rep, tracks.ref && tracks.ref.name);
  $('md').addEventListener('click', () => download(`Outside - ${tracks.mine.name}.md`, md(), 'text/markdown'));
  $('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(md()); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; } setTimeout(() => { $('copy').textContent = 'Copy report'; }, 1600); });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return; const k = e.key.toLowerCase();
    if (k === ' ') { if (!e.target.closest('[data-place]') && e.target.closest('button, a, summary, [role=button]')) return; e.preventDefault(); play(); } // on a place, space still plays
    else if (k === 'arrowright') { e.preventDefault(); walk(1); } else if (k === 'arrowleft') { e.preventDefault(); walk(-1); }
    else if (k === 's') flip(); else if (k === 'r') setAB(player && player.which === 'mine' ? 'ref' : 'mine');
    else if (k === 'd' && !e.repeat) hold(true); else if (k === 'm') $('match').click(); else if (k === 'l') $('loop').click();
  });
  document.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'd') hold(false); });
  window.addEventListener('resize', drawWave);
  requestAnimationFrame(frame);
})();
