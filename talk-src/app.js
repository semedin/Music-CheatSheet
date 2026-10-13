// Talk page: wiring the engine and audio to the page.
(() => {
  const $ = id => document.getElementById(id);
  const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const NOTE = n => KEYS[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  const STORE = 'fieldwork.talk.v1';
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const svgNS = 'http://www.w3.org/2000/svg';

  let s;
  try { s = TK.validate(JSON.parse(localStorage.getItem(STORE) || 'null') || TK.defaults()); } catch { s = TK.defaults(); }
  let voice = null, hook = null, loop = null, ph = null;

  const status = (msg, ms = 2600) => { const el = $('status'); el.textContent = msg; el.classList.add('show'); clearTimeout(status.t); status.t = setTimeout(() => el.classList.remove('show'), ms); };
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {} };
  const download = (bytes, name, type) => { const url = URL.createObjectURL(new Blob([bytes], {type})); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); };
  const stem = () => 'Talk_' + (loop?.name || 'loop').replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '') + '_' + KEYS[s.key].replace('♯', 's').replace('♭', 'b') + 'm_' + s.bpm;

  // ---------------------------------------------------------------- voice
  function setVoice(take) {
    voice = {samples: take.samples, sr: take.sr, name: take.name, buffers: new Map(), syl: []};
    analyse();
    // warm the pitched versions in the background so the first play is in time
    let k = 0; const warm = [-5, 7]; const step = () => { if (!voice || k >= warm.length) return; try { TA.variant(voice, warm[k++], false); } catch {} setTimeout(step, 30); }; setTimeout(step, 50);
  }
  function analyse() {
    if (!voice) return;
    voice.syl = TK.syllables(voice.samples, voice.sr, {split: s.split / 100}).map(x => ({...x, hz: TK.pitchAt(voice.samples, voice.sr, x.start, x.end)}));
    update();
    drawWave();
  }

  // ---------------------------------------------------------------- compute + draw
  function update() {
    loop = TK.loopFor(s);
    if (voice?.syl.length) { hook = {syl: voice.syl, bpm: s.bpm}; hook.events = TK.treat(hook, s.treatment, {key: s.key}); }
    else hook = null;
    ph = TK.phrase(s, loop, hook && !s.mutes.vocal ? hook : null);
    if (!ph.vocal.length && hook) ph.vocal = TK.vocalLane(hook, s.bars); // still drawn when muted
    drawTimeline(); drawReadouts(); markStudies(); drawTreatments(); drawVoiceReadouts();
    $('studio-title').textContent = loop.name; $('study-feel').textContent = loop.feel;
    save();
  }

  function el(tag, attrs, parent) { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; }

  function mini(svg, notes, steps = 32) {
    svg.setAttribute('viewBox', '0 0 320 46'); svg.setAttribute('preserveAspectRatio', 'none'); svg.innerHTML = '';
    for (let b = 0; b < steps; b += 4) el('rect', {x: b * 10, y: 0, width: 1, height: 46, fill: b % 16 ? '#2c2531' : '#4a3f52'}, svg);
    for (const x of notes) {
      const talk = TK.isTalk(x.shape), y = 36 - Math.max(-2, Math.min(15, x.semi)) * 2;
      el('rect', {x: x.s * 10 + 1, y: y - 4, width: Math.max(6, x.l * 10 - 2), height: 7, rx: 2, fill: talk ? '#ff5b38' : '#cfc4d4'}, svg);
      if (x.bend) el('line', {x1: x.s * 10 + 1, y1: y - 12, x2: x.s * 10 + 8, y2: y - 4, stroke: '#ff9b6b', 'stroke-width': 2}, svg);
    }
  }

  function buildStudies() {
    const host = $('studies'); host.innerHTML = '';
    TK.STUDIES.forEach((st, i) => {
      const b = document.createElement('button'); b.className = 'study'; b.dataset.study = i; b.setAttribute('role', 'listitem');
      const words = [...new Set(st.notes.filter(x => TK.isTalk(x.shape)).map(x => TK.SHAPES[x.shape].say))];
      b.innerHTML = `<small>${String(i + 1).padStart(2, '0')} · says ${esc(words.join(', ') || TK.SHAPES[st.shape].say)}</small><b>${esc(st.name)}</b><svg aria-hidden="true"></svg>`;
      b.title = st.feel; mini(b.querySelector('svg'), st.notes);
      b.onclick = () => { s.study = i; update(); restartIfPlaying(); };
      host.appendChild(b);
    });
    const g = document.createElement('button'); g.className = 'study gen'; g.dataset.study = -1;
    g.innerHTML = `<small>NEW EVERY CLICK · SAME RULES</small><b>↻ Generate a loop</b><span class="muted">Seeded, never on the kick, 2 talking notes.</span><svg aria-hidden="true"></svg>`;
    g.onclick = () => { if (s.study === -1) s.seed = s.seed % 999999 + 1; s.study = -1; update(); restartIfPlaying(); };
    host.appendChild(g);
  }
  function markStudies() {
    document.querySelectorAll('.study').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.study === s.study)));
    const g = document.querySelector('.study.gen svg'); if (g) mini(g, s.study === -1 ? loop.notes : []);
    if (s.study === -1) document.querySelector('.study.gen small').textContent = 'SEED #' + s.seed + ' · CLICK FOR ANOTHER';
  }

  function drawTimeline() {
    const svg = $('timeline'), W = 1100, beats = ph.beats, X = b => 30 + b / beats * (W - 40);
    svg.innerHTML = '';
    const root = TK.rootMidi(s.key), Y = n => 188 - (n - root + 3) * 6.2;
    for (let bar = 0; bar <= s.bars; bar++) {
      const x = X(bar * 4); el('rect', {x, y: 8, width: 1, height: 232, fill: bar % 4 ? '#262029' : '#43394a'}, svg);
      if (bar < s.bars && (s.bars <= 16 || bar % 4 === 0)) el('text', {x: x + 3, y: 246, fill: '#857a8c', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace'}, svg).textContent = bar + 1;
    }
    el('text', {x: 2, y: 30, fill: '#e4f75a', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace'}, svg).textContent = 'VOX';
    el('text', {x: 2, y: 130, fill: '#ff9b6b', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace'}, svg).textContent = 'BASS';
    el('text', {x: 2, y: 229, fill: '#857a8c', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace'}, svg).textContent = 'KICK';
    // vocal
    const vg = el('g', {opacity: s.mutes.vocal ? .3 : 1}, svg);
    for (const e of ph.vocal) {
      el('rect', {x: X(e.t), y: 14 + (e.rev ? 10 : 0), width: Math.max(2, X(e.t + e.d) - X(e.t)), height: e.rev ? 14 : 24, rx: 3, fill: '#e4f75a', 'fill-opacity': .25 + .65 * e.gain}, vg);
    }
    // mouth curve (CC74)
    if (ph.bass.length) el('polyline', {points: ph.bass.map(x => `${X(x.t)},${200 - x.mouth * 150}`).join(' '), fill: 'none', stroke: '#ff5b38', 'stroke-opacity': .25, 'stroke-dasharray': '3 4'}, svg);
    // bass
    const bg = el('g', {opacity: s.mutes.bass ? .3 : 1}, svg);
    for (const x of ph.bass) {
      const talk = TK.isTalk(x.shape), y = Y(x.n), w = Math.max(2, X(x.t + x.d) - X(x.t));
      if (x.bend) el('line', {x1: X(x.t), y1: Y(x.n + x.bend), x2: X(x.t + x.glide), y2: y, stroke: '#ff9b6b', 'stroke-width': 1.5}, bg);
      el('rect', {x: X(x.t), y: y - 4, width: w, height: 8, rx: 2, fill: talk ? '#ff5b38' : x.ghost ? '#6d6273' : '#cfc4d4'}, bg);
      if (talk && s.bars <= 16) el('text', {x: X(x.t), y: y - 8, fill: '#ff9b6b', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace'}, bg).textContent = TK.SHAPES[x.shape].say;
    }
    const kg = el('g', {opacity: s.mutes.drums ? .3 : 1}, svg);
    for (const h of ph.drums) if (h.part === 'kick') el('rect', {x: X(h.t), y: 216, width: 3, height: 14, fill: '#7d6f86'}, kg);
    el('line', {id: 'playhead', x1: 30, x2: 30, y1: 8, y2: 240, stroke: '#f2ece2', 'stroke-width': 2, visibility: TA.player.playing ? 'visible' : 'hidden'}, svg);
  }

  function readout(host, items) {
    host.innerHTML = items.map(([v, label, cls]) => `<div class="${cls || ''}"><span>${v}</span><small>${label}</small></div>`).join('');
  }
  const pct = x => Math.round(x * 100) + '%';
  function drawReadouts() {
    const r = ph.readout;
    readout($('readouts'), [
      [r.talk, 'TALKING NOTES IN THE PHRASE'],
      [pct(r.alive), 'BARS THAT DIFFER FROM THE LOOP', r.alive >= .25 ? 'good' : 'warn'],
      [r.kickHits, 'BASS NOTES ON A KICK', r.kickHits ? 'warn' : 'good'],
      hook ? [pct(r.overlapBefore) + ' → ' + pct(s.room ? r.overlapAfter : r.overlapBefore), 'LONG/TALKING BASS UNDER THE VOCAL', (s.room ? r.overlapAfter : r.overlapBefore) > .15 ? 'warn' : 'good'] : ['—', 'BASS UNDER THE VOCAL (RECORD A HOOK)'],
      [r.notes, 'BASS NOTES / PHRASE'],
    ]);
  }
  function drawVoiceReadouts() {
    if (!voice) { readout($('voice-readouts'), [['—', 'SYLLABLES']]); return; }
    const sy = voice.syl;
    readout($('voice-readouts'), [
      [sy.length, 'SYLLABLES FOUND', sy.length >= 2 && sy.length <= 8 ? 'good' : 'warn'],
      [hook ? TK.phraseBeats(hook).toFixed(1) : '—', 'BEATS LONG AT ' + s.bpm + ' BPM', hook && TK.phraseBeats(hook) <= 3.6 ? 'good' : 'warn'],
      [hook ? Math.round(TK.grooveFit(hook)) + ' ms' : '—', 'AVERAGE 16TH SNAP'],
      [sy.map(x => x.hz ? NOTE(Math.round(69 + 12 * Math.log2(x.hz / 440))) : '·').join(' ') || '—', 'PITCH PER SYLLABLE'],
    ]);
  }

  function drawWave() {
    const svg = $('wave'); svg.innerHTML = '';
    if (!voice) return;
    const x = voice.samples, W = 800, H = 160, n = 400, per = Math.ceil(x.length / n), dur = x.length / voice.sr;
    voice.syl.forEach((sy, i) => {
      const g = el('g', {class: 'syl', 'data-syl': i}, svg);
      el('rect', {x: sy.start / dur * W, y: 0, width: (sy.end - sy.start) / dur * W, height: H, fill: '#e4f75a', 'fill-opacity': .14}, g);
      el('rect', {x: sy.start / dur * W, y: 0, width: 2, height: H, fill: '#e4f75a'}, g);
      el('text', {x: sy.start / dur * W + 5, y: 16, fill: '#e4f75a', 'font-size': 12, 'font-family': 'JetBrains Mono, monospace'}, g).textContent = i + 1;
      g.addEventListener('click', () => TA.audition((c, gg, t) => TA.vocalEvent(c, gg.vocal, voice, {src: i, d: 8, semis: 0, gain: 1, fx: ''}, t, 60 / s.bpm)));
    });
    let d = '';
    for (let i = 0; i < n; i++) { let p = 0; for (let j = i * per; j < Math.min(x.length, (i + 1) * per); j++) p = Math.max(p, Math.abs(x[j])); const xx = i / n * W, h = p * H * .48; d += `M${xx.toFixed(1)} ${(H / 2 - h).toFixed(1)}V${(H / 2 + h).toFixed(1)}`; }
    el('path', {d, stroke: '#f2ece2', 'stroke-width': 1.4, fill: 'none', 'pointer-events': 'none'}, svg);
    $('take-name').textContent = voice.name;
  }

  function buildTreatments() {
    const host = $('treatments'); host.innerHTML = '';
    TK.TREATMENTS.forEach(t => {
      const b = document.createElement('button'); b.className = 'treat'; b.dataset.treat = t.id;
      b.innerHTML = `<b>${esc(t.name)}</b><small>${esc(t.text)}</small><svg aria-hidden="true" viewBox="0 0 320 30" preserveAspectRatio="none"></svg>`;
      b.onclick = () => { s.treatment = t.id; update(); if (!TA.player.playing) togglePlay(); };
      host.appendChild(b);
    });
  }
  function drawTreatments() {
    document.querySelectorAll('.treat').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.treat === s.treatment));
      const svg = b.querySelector('svg'); svg.innerHTML = '';
      for (let k = 0; k <= 8; k++) el('rect', {x: k * 40, y: 0, width: 1, height: 30, fill: k % 4 ? '#2c2531' : '#4a3f52'}, svg);
      if (!hook) return;
      for (const e of TK.treat(hook, b.dataset.treat, {key: s.key})) el('rect', {x: e.t * 40, y: e.semis > 0 ? 3 : e.semis < 0 ? 15 : 9, width: Math.max(2, e.d * 40 - 1), height: 12, rx: 2, fill: e.rev ? '#ff9b6b' : '#e4f75a', 'fill-opacity': .3 + .7 * e.gain}, svg);
    });
  }

  // ---------------------------------------------------------------- transport
  const source = () => ({ph, state: s, voice});
  function setPlaying(on) { for (const id of ['play', 'hero-play']) { $(id).textContent = on ? '■ Stop' : id === 'play' ? '▶ Play' : '▶ Hear the room'; $(id).setAttribute('aria-pressed', String(on)); } const p = $('playhead'); if (p) p.setAttribute('visibility', on ? 'visible' : 'hidden'); }
  function togglePlay() { if (TA.player.playing) { TA.stop(); setPlaying(false); } else { TA.start(source); setPlaying(true); } }
  function restartIfPlaying() { if (TA.player.playing) { TA.start(source); setPlaying(true); } }
  let raf = 0;
  TA.player.onBeat = beat => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; const p = $('playhead'); if (!p) return;
      const x = 30 + beat / ph.beats * 1060; p.setAttribute('x1', x); p.setAttribute('x2', x); p.setAttribute('visibility', 'visible');
      $('pos').textContent = 'BAR ' + String(Math.floor(beat / 4) + 1).padStart(2, '0') + ' / ' + s.bars;
    });
  };

  // ---------------------------------------------------------------- controls
  function bindControls() {
    $('key').innerHTML = KEYS.map((k, i) => `<option value="${i}">${k} minor</option>`).join('');
    $('kit').innerHTML = Object.entries(TK.KITS).map(([id, k]) => `<option value="${id}">${k.name}</option>`).join('');
    $('demo').innerHTML = TK.DEMOS.map((d, i) => `<option value="${i}">${esc(d.name)}</option>`).join('');
    const sync = () => {
      $('bpm').value = s.bpm; $('key').value = s.key; $('bars').value = s.bars; $('kit').value = s.kit; $('demo').value = s.demo; $('room').checked = s.room;
      for (const k of ['mouth', 'drive', 'sub', 'gate', 'swing', 'split']) { $(k).value = s[k]; $(k + '-o').textContent = s[k] + '%'; }
    };
    sync();
    $('bpm').onchange = e => { const v = Math.round(+e.target.value); if (v >= 100 && v <= 140) { s.bpm = v; update(); } else { e.target.value = s.bpm; status('Tempo from 100 to 140 BPM.'); } };
    $('key').onchange = e => { s.key = +e.target.value; update(); };
    $('bars').onchange = e => { s.bars = +e.target.value; update(); restartIfPlaying(); };
    $('kit').onchange = e => { s.kit = e.target.value; update(); };
    for (const k of ['mouth', 'drive', 'sub', 'gate', 'swing']) $(k).oninput = e => { s[k] = +e.target.value; $(k + '-o').textContent = s[k] + '%'; update(); };
    let splitT = 0;
    $('split').oninput = e => { s.split = +e.target.value; $('split-o').textContent = s.split + '%'; clearTimeout(splitT); splitT = setTimeout(analyse, 120); };
    $('room').onchange = e => { s.room = e.target.checked; update(); };
    $('demo').onchange = e => { s.demo = +e.target.value; loadDemo(); };
    $('mutes').innerHTML = ['bass', 'drums', 'vocal'].map(p => `<button data-mute="${p}" aria-pressed="${s.mutes[p]}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('');
    $('mutes').onclick = e => { const p = e.target.dataset?.mute; if (!p) return; s.mutes[p] = !s.mutes[p]; e.target.setAttribute('aria-pressed', s.mutes[p]); update(); };
    $('moves').innerHTML = TK.MOVES.map(m => `<label class="move"><input type="checkbox" data-move="${m.id}" ${s.moves[m.id] ? 'checked' : ''}><span><b>${esc(m.name)}</b><em>${esc(m.when.toUpperCase())}</em></span><small>${esc(m.text)}</small></label>`).join('');
    $('moves').onchange = e => { const id = e.target.dataset.move; if (!id) return; s.moves[id] = e.target.checked; update(); };
    $('say').innerHTML = '<span class="label">HEAR IT SAY</span>' + ['wah', 'wow', 'yeah', 'ow', 'oi', 'you', 'we', 'aa', 'oo', 'ee'].map(k => `<button data-shape="${k}">${TK.SHAPES[k].say}</button>`).join('');
    $('say').onclick = e => {
      const shape = e.target.dataset?.shape; if (!shape) return;
      const spb = 60 / s.bpm;
      TA.audition((c, g, t) => TA.bassNote(c, g.bass, {n: TK.rootMidi(s.key), d: 1.4, v: 118, shape, bend: 0, glide: 0, mouth: Math.min(1, s.mouth / 100 + .1)}, t, spb, {drive: s.drive / 100, sub: s.sub / 100}));
    };
    $('play').onclick = togglePlay; $('hero-play').onclick = togglePlay;
    document.addEventListener('keydown', e => {
      if (e.target.closest?.('input,select,textarea,button')) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.key === 'Escape' && TA.player.playing) togglePlay();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && TA.player.playing) togglePlay(); });
  }

  // ---------------------------------------------------------------- takes: mic, file, robot
  function loadDemo() { const d = TK.demoVoice(s.demo, 44100); setVoice({samples: d.samples, sr: d.sr, name: d.name}); }
  let take = null;
  async function toggleRecord() {
    const btn = $('rec');
    if (take) { take.stop(); return; }
    try {
      btn.setAttribute('aria-pressed', 'true'); btn.querySelector('b').textContent = 'Recording…';
      take = await TA.record({max: 5, onLevel: p => { $('level').style.width = Math.min(100, p * 140) + '%'; }});
      const result = await take.done;
      setVoice({...result, name: 'Your take · ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})});
      status(voice.syl.length + ' syllables found. Pick a treatment.');
    } catch (e) {
      status(e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in the address bar, or load a file.' : e.message || 'Recording failed.', 4200);
    } finally {
      take = null; btn.setAttribute('aria-pressed', 'false'); btn.querySelector('b').textContent = 'Record'; $('level').style.width = '0';
    }
  }
  $('rec').onclick = toggleRecord;
  $('file').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size > 30e6) { status('Choose a file under 30 MB.'); return; }
    try { const r = await TA.decode(await f.arrayBuffer()); setVoice({...r, name: f.name}); status(voice.syl.length + ' syllables found.'); }
    catch (err) { status(err.message?.includes('silent') ? err.message : 'That file could not be decoded. Try a WAV or MP3.', 4200); }
  };

  // ---------------------------------------------------------------- exports
  async function busy(btn, fn) {
    if (btn.disabled) return; const label = btn.textContent; btn.disabled = true; btn.textContent = 'Rendering…';
    try { await fn(); } catch (e) { console.error(e); status('Export failed: ' + (e.message || e), 4200); } finally { btn.disabled = false; btn.textContent = label; }
  }
  const enc = t => new TextEncoder().encode(t);
  const hookPhrase = id => ({beats: 8, bars: 2, bass: [], drums: [], vocal: TK.treat(hook, id, {key: s.key}), markers: []});
  const needVoice = () => { if (!hook) throw Error('Record or load a hook first.'); };
  $('x-midi').onclick = () => { download(TK.exportMidi(s, ph), stem() + '.mid', 'audio/midi'); status('MIDI saved: bass with bend and CCs, drums, vocal syllables.'); };
  $('x-mix').onclick = e => busy(e.target, async () => { download(TA.wav(await TA.render(ph, s, voice)), stem() + '_mix.wav', 'audio/wav'); });
  $('x-stems').onclick = e => busy(e.target, async () => {
    const files = [];
    for (const part of ['bass', 'drums', 'vocal']) {
      if (s.mutes[part] || (part === 'vocal' && !hook)) continue;
      const mutes = {bass: part !== 'bass', drums: part !== 'drums', vocal: part !== 'vocal'};
      files.push({name: stem() + '_' + part + '.wav', bytes: TA.wav(await TA.render(ph, s, voice, {mutes}))});
    }
    files.push({name: stem() + '.mid', bytes: TK.exportMidi(s, ph)});
    files.push({name: 'session.json', bytes: enc(JSON.stringify(s, null, 2))});
    files.push({name: 'README.txt', bytes: enc(`Talk, from Fieldwork\n${loop.name}, ${KEYS[s.key]} minor, ${s.bpm} BPM, ${s.bars} bars.\nStems start at bar 1 and include a 1.5 s tail. The bass stem has the kick sidechain pump baked in.\nMIDI: Talk bass carries pitch bend (range ±12), CC74 = mouth (formant frequency), CC1 = vowel. Drums use GM notes on channel 10. Vocal syllables start at C1.\n`)});
    download(OT.zip(files), stem() + '_stems.zip', 'application/zip');
  });
  $('x-hook').onclick = e => busy(e.target, async () => { needVoice(); download(TA.wav(await TA.render(hookPhrase(s.treatment), s, voice, {mutes: {}, tail: 1})), stem() + '_hook-' + s.treatment + '.wav', 'audio/wav'); });
  $('x-hooks').onclick = e => busy(e.target, async () => {
    needVoice();
    const files = [];
    for (const t of TK.TREATMENTS) files.push({name: 'hook-' + t.id + '_' + s.bpm + 'bpm.wav', bytes: TA.wav(await TA.render(hookPhrase(t.id), s, voice, {mutes: {}, tail: 1}))});
    voice.syl.forEach((sy, i) => {
      const a = Math.round(sy.start * voice.sr), b = Math.round(sy.end * voice.sr), x = voice.samples.slice(a, b);
      for (let k = 0; k < 64 && k < x.length; k++) { x[k] *= k / 64; x[x.length - 1 - k] *= k / 64; }
      files.push({name: 'syllable-' + String(i + 1).padStart(2, '0') + '.wav', bytes: TA.wav(TA.toBuffer(x, voice.sr))});
    });
    download(OT.zip(files), stem() + '_hooks.zip', 'application/zip');
  });

  // ---------------------------------------------------------------- hero art: the five vowels as formant bars
  (() => {
    const g = $('art-bars'), vs = Object.values(TK.VOWELS);
    vs.forEach((v, i) => v.f.forEach((f, j) => {
      const h = 30 + Math.log2(f / 200) * 34, x = 22 + i * 46 + j * 12;
      el('rect', {x, y: 210 - h, width: 9, height: h, rx: 4, fill: j === 0 ? '#ff5b38' : j === 1 ? '#ff9b6b' : '#e4f75a', 'fill-opacity': 1 - j * .22}, g);
    }));
    'aeiou'.split('').forEach((c, i) => el('text', {x: 34 + i * 46, y: 236, fill: '#a99fae', 'font-size': 16, 'text-anchor': 'middle', 'font-family': 'Bricolage Grotesque, sans-serif'}, g).textContent = c);
  })();

  buildStudies(); buildTreatments(); bindControls();
  loadDemo();
  window.TALK_QA = {get state() { return s; }, get ph() { return ph; }, get voice() { return voice; }, get hook() { return hook; }, player: TA.player, setVoice, update};
})();
