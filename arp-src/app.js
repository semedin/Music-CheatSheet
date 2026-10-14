// Orbit, the page: state and history, the bank, the orbit and the piano roll, the step editor, the controls,
// the fingerprint, the generator, the crate, chord import, the Ableton cards, the rules and the genre guides.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pct = v => Math.round(v * 100) + '%';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const KEY_NOW = 'orbit.current.v1', KEY_CRATE = 'orbit.crate.v1';

  const S = {st: null, hist: [], fut: [], A: null, side: 'B', aud: null, crate: store.get(KEY_CRATE) || [], filter: 'tech-house', q: '', tool: 'note',
    cands: [], candKind: '', R: null, M: null, ph: null, flashes: [], trail: [], lastFlash: 0, paint: null, importFile: null, importMode: 'chords', importInfo: '',
    role: 'any', sort: 'bank', sLen: 'all', sRole: 'all', sQ: '', pRoles: null,
    held: new Set(), down: new Set(), liveFresh: true, preLive: undefined, midi: null, draw: false, drawSeq: null, auto: false, autoAt: null, sample: null};
  let actx = null, engine = null, player = null;

  // ---------- helpers ----------
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
  function download(bytes, name, type) {
    const blob = new Blob([bytes], {type}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const genre = () => OB.GENRES[S.st.genre] || OB.GENRES['tech-house'];
  const sound = () => OB.SOUNDS_BY_ID[S.st.sound] || OB.SOUNDS[0];
  const nn = n => OT.noteName(n, S.st.key, S.st.scale);
  function setAccent(color) {
    const r = document.documentElement.style;
    r.setProperty('--g', color); r.setProperty('--g2', color + '44'); r.setProperty('--g3', color + '18');
  }
  function opt(sel, items, val) { sel.innerHTML = items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''); if (val != null) sel.value = val; }

  // ---------- state ----------
  function snapshot() { return JSON.stringify(Object.assign({}, S.st, {steps: S.st.steps})); }
  function commit(patch, {history = true, light = false} = {}) {
    if (history) { S.hist.push(snapshot()); if (S.hist.length > 150) S.hist.shift(); S.fut.length = 0; }
    S.st = OE.normalize(Object.assign({}, S.st, patch));
    refresh(light);
  }
  function load(st, {history = true, keepPlaying = true} = {}) {
    if (history && S.st) { S.hist.push(snapshot()); if (S.hist.length > 150) S.hist.shift(); S.fut.length = 0; }
    S.st = OE.normalize(st);
    refresh();
  }
  function undo() { if (!S.hist.length) return toast('Nothing to undo'); S.fut.push(snapshot()); S.st = OE.normalize(JSON.parse(S.hist.pop())); refresh(); }
  function redo() { if (!S.fut.length) return toast('Nothing to redo'); S.hist.push(snapshot()); S.st = OE.normalize(JSON.parse(S.fut.pop())); refresh(); }

  // ---------- analysis + views ----------
  let slowTimer = null;
  function refresh(light = false) {
    const st = S.st;
    S.R = OE.render(st);
    if ($('pocketSend')) $('pocketSend').href = 'pocket.html#orbit=' + OE.pack(st);
    const mR = OE.render(st, {bars: 4, evo: false, fills: false, mutate: false});
    const m = OE.metrics(mR), sf = OE.sectionFit(st, m), f = sf.fit, c = OE.cycle(st);
    S.M = {m, fit: f, role: sf.role, roles: sf.roles, cycle: c, cycleText: OE.cycleText(c, st, S.R.harmony.beats), mR};
    S.ph = OA.phrase(st, S.R);
    if (player) { player.load(S.ph); songButton(); }
    setAccent(genre().color);
    viewTransport(); viewStage(); viewGrid(); viewControls(); drawRollLayer(); orbitStatic(); viewBankActive();
    document.querySelectorAll('.srow').forEach(r => r.classList.toggle('on', r.dataset.s === st.sound));
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => { viewMeasure(); viewAbleton(); viewSamples(); viewSong(); store.set(KEY_NOW, OE.pack(st)); }, light ? 140 : 0);
  }

  function viewTransport() {
    const st = S.st;
    $('bpm').value = st.bpm; $('key').value = st.key; $('scale').value = st.scale; $('bars').value = st.bars;
    document.querySelectorAll('[data-ctx]').forEach(b => b.classList.toggle('on', !!st.ctx[b.dataset.ctx]));
    $('tName').textContent = st.name;
    const fc = $('tFit'); fc.textContent = S.M.fit.score == null ? '' : S.M.fit.score; fc.classList.toggle('low', S.M.fit.score < 80);
    fc.title = `Fit with ${genre().name}: ${S.M.fit.score}/100`;
    const packed = OE.pack(st);
    $('saveBtn').classList.toggle('on', S.crate.some(c => c.st === packed));
    $('abBtn').classList.toggle('on', !!S.A); $('abBtn').textContent = S.A ? 'A/B · ' + S.side : 'A/B';
    $('undo').disabled = !S.hist.length; $('redo').disabled = !S.fut.length;
  }
  function viewStage() {
    const st = S.st, g = genre(), p = st.from && OB.BY_ID[st.from];
    $('stKicker').textContent = p ? `${g.name} · ${p.sub}` : st.from === 'generated' ? `${g.name} · generated` : st.from === 'variation' ? `${g.name} · variation` : g.name;
    $('stName').textContent = st.name;
    $('stWhy').textContent = p ? p.why : st.from === 'generated' ? 'Written by the generator from the genre\'s grammar and measured against its fingerprint.' : st.from === 'variation' ? 'A variation: same key, tempo, harmony and sound; the notes or the rhythm moved.' : st.from === 'import' ? 'Your chords, arpeggiated.' : g.blurb;
    const s = sound();
    const R0 = S.M.roles;
    $('stUses').innerHTML = `<span>Use it for</span>` + Object.keys(OE.ROLES).filter(r => R0.roles.includes(r)).sort((a, b) => R0.scores[b] - R0.scores[a]).map((r, i) => `<span class="rchip${i ? ' dim' : ''}" style="--rc:${OE.ROLES[r].color}" title="${esc(OE.ROLES[r].desc + (R0.why[r].length ? ' Here: ' + R0.why[r].join(', ') + '.' : ''))}">${esc(OE.ROLES[r].name)}</span>`).join('') + `<span class="energy" title="Energy: density, syncopation, accents, short notes and how punchy the sound is">energy <i style="--e:${R0.energy}%"></i> ${R0.energy}</span>` + (R0.why[R0.primary].length ? `<span class="hint">${esc(R0.why[R0.primary].join(' · '))}</span>` : '');
    $('stChips').innerHTML = [OT.keyLabel(st.key, st.scale) + ' · ' + OT.camelot(st.key, st.scale), st.bpm + ' BPM', OE.RATES[st.rate].label, OE.POOLS[st.pool].name, st.order === 'turing' ? `Turing ${Math.round(st.lock * 100)}% lock` : OE.ORDERS[st.order].name, s.name, st.evo !== 'none' ? OE.EVOS[st.evo].name : null, st.echo ? `echo ×${st.echo}` : null, st.feel !== 'straight' ? OE.FEELS[st.feel].name : null, st.strum ? 'strum' : null].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
    // chord lane
    const h = S.R.harmony;
    $('chordLane').innerHTML = h.chords.map((c, i) => `<div class="cc" data-ci="${i}"><b>${esc(c.name)}</b><small>${esc(c.roman)} · ${c.d / 4 >= 1 ? (c.d / 4) + ' bar' + (c.d > 4 ? 's' : '') : c.d + ' beats'} · ${c.notes.map(nn).join(' ')}</small></div>`).join('');
    $('stepLen').textContent = `${st.steps.length} steps · ${OE.RATES[st.rate].label}`;
    $('cycleBar').innerHTML = S.M.cycleText.replace(/(\d+ bars?)/g, '<b>$1</b>');
  }

  // ---------- step grid ----------
  const TOOLS = [
    ['note', 'Note', '■'], ['acc', 'Accent', '◆'], ['chord', 'Chord hit', '≡'], ['pedal', 'Pedal', 'P'], ['tie', 'Tie', '—'],
    ['oct', 'Octave', '↑'], ['rat', 'Ratchet', '×2'], ['slide', 'Slide', '~'], ['prob', 'Chance', '%'], ['erase', 'Rest', '·'],
  ];
  function glyph(s) { return s.type === 'rest' ? '·' : s.type === 'tie' ? '—' : s.type === 'chord' ? '≡' : s.type === 'pedal' ? 'P' : s.acc ? '◆' : '■'; }
  function viewGrid() {
    const st = S.st, L = st.steps.length, names = new Array(L).fill('');
    for (const e of S.R.events) if (e.g < L * 2 && !names[e.step] && e.kind !== 'chord') names[e.step] = nn(e.n);
    for (const e of S.R.events) if (e.kind === 'chord' && !names[e.step]) names[e.step] = S.R.harmony.chords[e.ci].name;
    const perBeat = Math.round(1 / OE.RATES[st.rate].beats) || 1;
    let html = '';
    for (let r = 0; r < L; r += 16) {
      const n = Math.min(16, L - r);
      html += `<div class="grow-row" style="grid-template-columns:repeat(${n},minmax(30px,1fr));min-width:${Math.max(n * 34, 0)}px">`;
      for (let i = r; i < r + n; i++) {
        const s = st.steps[i];
        const cls = ['cell', s.type, s.acc && s.type !== 'rest' && s.type !== 'tie' ? 'acc' : '', i % perBeat === 0 ? 'beat' : ''].join(' ');
        const md = [s.oct > 0 ? '↑'.repeat(s.oct) : s.oct < 0 ? '↓' : '', s.rat > 1 ? '×' + s.rat : '', s.slide ? '~' : ''].join('');
        html += `<div class="${cls}" data-i="${i}" role="button" aria-label="Step ${i + 1}: ${s.type}${s.acc ? ', accent' : ''}"><span class="ix">${i + 1}</span>${md ? `<span class="md">${md}</span>` : ''}<span class="gl">${glyph(s)}</span><span class="nm">${esc(names[i] || '')}</span>${s.prob < 1 ? `<span class="pb"><i style="width:${s.prob * 100}%"></i></span>` : ''}</div>`;
      }
      html += '</div>';
    }
    $('grid').innerHTML = html;
  }
  function applyTool(i, mode) {
    const steps = S.st.steps.map(s => Object.assign({}, s)), s = steps[i];
    const t = S.tool;
    const on = s.type !== 'rest';
    if (mode == null) {
      // decide the paint action from the first cell
      if (t === 'note') mode = s.type === 'note' && !s.acc ? 'off' : 'on';
      else if (t === 'acc') mode = s.acc && on ? 'off' : 'on';
      else if (t === 'chord') mode = s.type === 'chord' ? 'off' : 'on';
      else if (t === 'pedal') mode = s.type === 'pedal' ? 'off' : 'on';
      else if (t === 'tie') mode = s.type === 'tie' ? 'off' : 'on';
      else if (t === 'slide') mode = s.slide ? 'off' : 'on';
      else mode = 'cycle';
    }
    switch (t) {
      case 'note': if (mode === 'on') { s.type = 'note'; s.acc = 0; } else s.type = 'rest'; break;
      case 'acc': if (mode === 'on') { if (s.type === 'rest' || s.type === 'tie') s.type = 'note'; s.acc = 1; } else s.acc = 0; break;
      case 'chord': s.type = mode === 'on' ? 'chord' : 'note'; break;
      case 'pedal': s.type = mode === 'on' ? 'pedal' : 'note'; break;
      case 'tie': s.type = mode === 'on' ? 'tie' : 'rest'; break;
      case 'oct': if (!on || s.type === 'tie') s.type = 'note'; s.oct = s.oct === 0 ? 1 : s.oct === 1 ? 2 : s.oct === 2 ? -1 : 0; break;
      case 'rat': if (!on || s.type === 'tie') s.type = 'note'; s.rat = s.rat >= 3 ? 1 : s.rat + 1; break;
      case 'slide': if (mode === 'on') { if (!on || s.type === 'tie') s.type = 'note'; s.slide = true; } else s.slide = false; break;
      case 'prob': if (!on) s.type = 'note'; s.prob = s.prob >= 1 ? 0.75 : s.prob > 0.7 ? 0.5 : s.prob > 0.45 ? 0.25 : 1; break;
      case 'erase': s.type = 'rest'; s.acc = 0; s.oct = 0; s.rat = 1; s.slide = false; s.prob = 1; break;
    }
    S.st.steps = steps;
    S.st = OE.normalize(S.st);
    refresh(true);
    return mode;
  }
  function patternTool(k) {
    const st = S.st, steps = st.steps.map(s => Object.assign({}, s)), L = steps.length;
    const rest = () => ({type: 'rest', acc: 0, oct: 0, rat: 1, slide: false, prob: 1});
    let out = steps;
    if (k === 'len-') out = L > 1 ? steps.slice(0, L - 1) : steps;
    if (k === 'len+') out = L < 64 ? steps.concat([rest()]) : steps;
    if (k === 'rotl') out = OE.rotate(steps, -1);
    if (k === 'rotr') out = OE.rotate(steps, 1);
    if (k === 'rev') out = steps.slice().reverse();
    if (k === 'inv') out = steps.map(s => s.type === 'rest' ? Object.assign(rest(), {type: 'note'}) : rest());
    if (k === 'dbl') out = L <= 32 ? steps.concat(steps.map(s => Object.assign({}, s))) : steps;
    if (k === 'clr') out = steps.map(rest);
    if (k === 'rnd') { const g = OE.generate(st.genre, Math.floor(Math.random() * 1e6)); out = g.steps.slice(0, 64); }
    commit({steps: out});
  }

  // ---------- controls ----------
  const SLIDERS = {
    swing: v => Math.round(v) + '%', gate: v => Math.round(v * 100) + '%', accent: v => '+' + Math.round(v), human: v => pct(v),
    cut: v => pct(v), res: v => pct(v), dec: v => pct(v), drive: v => pct(v), width: v => pct(v),
    delay: v => pct(v), fb: v => pct(v), reverb: v => pct(v), space: v => (0.8 + v * 4.2).toFixed(1) + ' s', duck: v => pct(v), hp: v => Math.round(v) + ' Hz', depth: v => pct(v),
    lock: v => pct(v), strum: v => Math.round(v * 80) + ' ms', echoFb: v => pct(v),
  };
  function viewControls() {
    const st = S.st, active = document.activeElement;
    const setv = (id, v) => { const e = $(id); if (e && e !== active) e.value = v; };
    if ($('prog') !== active) $('prog').value = st.prog;
    const errs = st.imported ? [] : OT.parseProgression(st.prog, st.key, st.scale).errors;
    $('progErr').hidden = !errs.length; $('progErr').textContent = errs.join(' · ');
    $('prog').disabled = !!st.imported;
    opt($('progPreset'), [['', 'Pick one…'], ...genre().progs.map(p => [p.p, `${p.name}: ${p.p}`]), ...Object.values(OB.GENRES).filter(g => g !== genre()).flatMap(g => g.progs.slice(0, 2).map(p => [p.p, `${g.name}: ${p.p}`]))], '');
    for (const k of ['per', 'voicing', 'pool', 'count', 'order', 'octaves', 'advance', 'reset', 'pedal', 'rate', 'sound', 'evo', 'fill', 'fillEvery', 'mutate', 'delayTime', 'groove', 'bassPat', 'feel', 'strumDir', 'tlen', 'echo', 'echoTime', 'echoShift']) setv(k, st[k]);
    $('turingRow').hidden = st.order !== 'turing';
    document.querySelectorAll('[data-sq]').forEach(b => { b.hidden = (b.dataset.sq === 'write') === (st.order === 'seq'); });
    $('feelDesc').textContent = OE.FEELS[st.feel].desc || 'Every note on the grid (swing still applies).';
    $('follow').checked = st.follow;
    setv('seq', st.seq.join(' '));
    $('seqRow').hidden = st.order !== 'seq';
    setv('reg', st.reg); $('regOut').textContent = nn(st.reg) + ' · ' + Math.round(OT.hz(st.reg)) + ' Hz';
    setv('seed', st.seed);
    for (const [k, f] of Object.entries(SLIDERS)) { setv(k, st[k]); const o = $(k + 'Out'); if (o) o.textContent = f(st[k]); }
    document.querySelectorAll('[data-mix]').forEach(i => { if (i !== active) i.value = st.mix[i.dataset.mix]; });
    $('soundDesc').textContent = sound().desc;
    $('evoDesc').textContent = (OE.EVOS[st.evo] || {}).desc || '';
    $('delayMs').textContent = Math.round((OE.DELAY_TIMES[st.delayTime] || 0.75) * 60000 / st.bpm) + ' ms';
    // import box
    const live = st.imported && st.imported.name === 'Live keyboard';
    $('importedBox').hidden = !S.importFile || live || (S.importMode === 'chords' && !st.imported);
    if (S.importFile) {
      $('impName').textContent = S.importFile.name;
      $('impMode').value = S.importMode;
      $('impInfo').textContent = S.importMode === 'riff' ? S.importInfo : st.imported ? `${st.imported.chords.length} chords over ${st.imported.beats / 4} bars · read as ${OT.keyLabel(st.imported.key, st.imported.scale)}` : '';
      $('impToText').hidden = S.importMode === 'riff';
    }
    if ($('expName') !== active) $('expName').value = st.name;
    if (!S.expTouched) $('expBars').value = [4, 8, 16, 32, 64].includes(st.bars) ? st.bars : 8;
  }
  function bindControls() {
    const num = id => +$(id).value;
    $('bpm').addEventListener('change', () => commit({bpm: num('bpm')}));
    $('key').addEventListener('change', () => commit({key: num('key')}));
    $('scale').addEventListener('change', () => commit({scale: $('scale').value}));
    $('bars').addEventListener('change', () => commit({bars: num('bars')}));
    document.querySelectorAll('[data-ctx]').forEach(b => b.addEventListener('click', () => commit({ctx: Object.assign({}, S.st.ctx, {[b.dataset.ctx]: !S.st.ctx[b.dataset.ctx]})}, {history: false})));
    $('prog').addEventListener('input', () => { const r = OT.parseProgression($('prog').value, S.st.key, S.st.scale); if (!r.errors.length) commit({prog: $('prog').value}, {history: false, light: true}); else { $('progErr').hidden = false; $('progErr').textContent = r.errors.join(' · '); } });
    $('prog').addEventListener('change', () => { const r = OT.parseProgression($('prog').value, S.st.key, S.st.scale); if (!r.errors.length) commit({prog: $('prog').value}); });
    $('progPreset').addEventListener('change', () => { if ($('progPreset').value) commit({prog: $('progPreset').value, imported: null}); });
    for (const k of ['per', 'octaves', 'count', 'fillEvery', 'mutate', 'tlen', 'echo']) $(k).addEventListener('change', () => commit({[k]: num(k)}));
    for (const k of ['voicing', 'pool', 'order', 'advance', 'reset', 'pedal', 'rate', 'evo', 'fill', 'delayTime', 'groove', 'bassPat', 'feel', 'strumDir', 'echoTime', 'echoShift']) $(k).addEventListener('change', () => commit({[k]: $(k).value}));
    // the written sequence, as something to edit
    document.querySelectorAll('[data-sq]').forEach(b => b.addEventListener('click', () => {
      const sq = S.st.order === 'seq' ? S.st.seq.slice() : OE.writeOut(S.st), hi = Math.max(...sq), lo = Math.min(...sq);
      const out = {write: sq, rev: sq.slice().reverse(), inv: sq.map(i => hi + lo - i), up: sq.map(i => i + 1), down: sq.map(i => i - 1), rot: sq.slice(1).concat(sq.slice(0, 1))}[b.dataset.sq];
      commit({order: 'seq', seq: out});
      toast(b.dataset.sq === 'write' ? `Written out: ${out.join(' ')}. Edit it freely.` : `Sequence: ${out.join(' ')}`);
    }));
    $('morseGo').addEventListener('click', () => { const t = $('morseText').value.trim() || S.st.name; const steps = OE.morse(t); commit({steps}); toast(`"${t}" in Morse: ${steps.length} steps`); });
    $('morseText').addEventListener('keydown', e => { if (e.key === 'Enter') $('morseGo').click(); });
    $('impMode').addEventListener('change', () => { if (S.importFile) applyImport(S.importFile, +$('impTrack').value, $('impMode').value); });
    $('liveBtn').addEventListener('click', liveConnect);
    $('latch').addEventListener('change', () => { if (!$('latch').checked) { for (const n of [...S.held]) if (!S.down.has(n)) S.held.delete(n); liveApply(); } });
    $('drawBtn').addEventListener('click', () => {
      S.draw = !S.draw; S.drawSeq = null;
      $('drawBtn').classList.toggle('on', S.draw); document.querySelector('.orbitbox').classList.toggle('drawing', S.draw);
      $('drawBtn').textContent = S.draw ? '✓ Done' : '✎ Draw';
      if (S.draw) toast('Click the pool notes on the inner ring in the order they should play');
      if (!player || !player.playing) drawOrbit(null);
    });
    $('orbit').addEventListener('click', e => {
      if (!S.draw || !O.nodes) return;
      const r = $('orbit').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = Infinity;
      for (const nd of O.nodes) { const d = Math.hypot(nd.x - x, nd.y - y); if (d < bd) { bd = d; best = nd; } }
      if (!best || bd > Math.max(22, O.nodeGap * 0.45)) return;
      if (!S.drawSeq) { S.drawSeq = []; S.hist.push(snapshot()); S.fut.length = 0; }
      S.drawSeq.push(best.i);
      commit({order: 'seq', seq: S.drawSeq.slice()}, {history: false});
      toast('Sequence: ' + S.drawSeq.join(' '));
    });
    const syncAuto = on => { S.auto = on; $('auto').checked = on; $('autoBtn').classList.toggle('on', on); S.autoAt = null; if (on) toast(`Autopilot on: a new variation every ${$('autoEvery').value} bars while it plays. Undo goes back.`); };
    $('auto').addEventListener('change', () => syncAuto($('auto').checked));
    $('autoBtn').addEventListener('click', () => syncAuto(!S.auto));
    $('sound').addEventListener('change', () => { const s = OB.SOUNDS_BY_ID[$('sound').value]; commit(Object.assign({sound: s.id}, s.fx || {})); });
    $('follow').addEventListener('change', () => commit({follow: $('follow').checked}));
    $('seq').addEventListener('change', () => commit({seq: $('seq').value}));
    $('reg').addEventListener('input', () => commit({reg: num('reg')}, {history: false, light: true}));
    $('reg').addEventListener('change', () => commit({reg: num('reg')}));
    $('seed').addEventListener('change', () => commit({seed: num('seed')}));
    $('reseed').addEventListener('click', () => commit({seed: 1 + Math.floor(Math.random() * 99998)}));
    for (const k of Object.keys(SLIDERS)) {
      $(k).addEventListener('input', () => commit({[k]: num(k)}, {history: false, light: true}));
      $(k).addEventListener('change', () => { S.hist.push(snapshot()); S.fut.length = 0; viewTransport(); });
    }
    document.querySelectorAll('[data-mix]').forEach(i => i.addEventListener('input', () => commit({mix: Object.assign({}, S.st.mix, {[i.dataset.mix]: +i.value})}, {history: false, light: true})));
    // step grid painting
    const grid = $('grid');
    grid.addEventListener('pointerdown', e => {
      const c = e.target.closest('.cell'); if (!c) return;
      e.preventDefault();
      S.hist.push(snapshot()); S.fut.length = 0;
      const mode = applyTool(+c.dataset.i);
      S.paint = {mode: S.tool === 'oct' || S.tool === 'rat' || S.tool === 'prob' ? null : mode, done: new Set([+c.dataset.i])};
    });
    grid.addEventListener('pointermove', e => {
      if (!S.paint || S.paint.mode == null) return;
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.cell'); if (!c) return;
      const i = +c.dataset.i; if (S.paint.done.has(i)) return;
      S.paint.done.add(i); applyTool(i, S.paint.mode);
    });
    addEventListener('pointerup', () => { if (S.paint) { S.paint = null; viewTransport(); } });
    $('tools').innerHTML = TOOLS.map(([k, l, g]) => `<button type="button" data-tool="${k}" class="${k === S.tool ? 'on' : ''}"><i>${g}</i>${l}</button>`).join('');
    $('tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; S.tool = b.dataset.tool; document.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b)); });
    document.querySelectorAll('[data-pt]').forEach(b => b.addEventListener('click', () => patternTool(b.dataset.pt)));
    $('eucGo').addEventListener('click', () => {
      const k = clamp(num('eucK'), 1, 64), n = clamp(num('eucN'), 1, 64), r = clamp(num('eucR'), 0, 63);
      const on = OE.euclid(Math.min(k, n), n, r), old = S.st.steps;
      commit({steps: on.map((x, i) => x ? Object.assign({}, old[i % old.length] && old[i % old.length].type !== 'rest' && old[i % old.length].type !== 'tie' ? old[i % old.length] : {type: 'note', acc: 0, oct: 0, rat: 1, slide: false, prob: 1}) : {type: 'rest', acc: 0, oct: 0, rat: 1, slide: false, prob: 1})});
      toast(`Euclidean ${k} in ${n}, rotated ${r}`);
    });
    // import
    $('importBtn').addEventListener('click', () => $('midiFile').click());
    $('midiFile').addEventListener('change', () => { const f = $('midiFile').files[0]; if (f) importFile(f); $('midiFile').value = ''; });
    $('impClear').addEventListener('click', () => { S.importFile = null; commit({imported: null}); });
    $('impToText').addEventListener('click', () => {
      const imp = S.st.imported; if (!imp) return;
      const per = S.st.per, text = imp.chords.map(c => { const len = c.d / (4 * per); const nm = OT.asciiName(OT.chordName(c.root, c.q, imp.key, imp.scale)).replace('m(add9)', 'madd9').replace('m7♭5', 'm7b5'); return nm + (Math.abs(len - 1) > 0.01 ? ':' + +len.toFixed(2) : ''); }).join(' ');
      commit({imported: null, prog: text, key: imp.key, scale: imp.scale});
      toast('The chords are now text you can edit (the voicing is the page\'s own).');
    });
    $('impTrack').addEventListener('change', () => { if (S.importFile) applyImport(S.importFile, +$('impTrack').value, S.importMode); });
    // drag & drop anywhere
    addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); document.body.classList.add('dropping'); } });
    addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
    addEventListener('drop', e => {
      document.body.classList.remove('dropping');
      const f = e.dataTransfer?.files?.[0]; if (!f) return;
      e.preventDefault();
      if (/\.json$/i.test(f.name)) openSession(f); else importFile(f);
    });
  }

  // ---------- chord import ----------
  async function importFile(file) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mid = OT.readMidi(bytes);
      const tracks = mid.tracks.map((t, i) => ({i, t, notes: t.notes.filter(n => n.ch !== 9)})).filter(x => x.notes.length);
      if (!tracks.length) throw Error('No pitched notes in this file.');
      tracks.forEach(x => { x.poly = OT.polyphony(x.notes); });
      S.importFile = {name: file.name.replace(/\.midi?$/i, ''), mid, tracks};
      opt($('impTrack'), tracks.map(x => [x.i, `${x.t.name} (${x.notes.length} notes, ${x.poly.toFixed(1)} at once)`]));
      const best = tracks.slice().sort((a, b) => b.poly - a.poly)[0];
      $('impTrack').value = best.i;
      $('impTrackRow').hidden = tracks.length < 2;
      // a single line (a riff or a melody) becomes the pattern; anything with chords becomes the harmony
      applyImport(S.importFile, best.i, best.poly < 1.25 ? 'riff' : 'chords');
    } catch (err) { toast('Could not read that MIDI: ' + err.message); console.error(err); }
  }
  function applyImport(f, ti, mode = 'chords') {
    const tr = f.tracks.find(x => x.i === ti) || f.tracks[0];
    S.importMode = mode;
    if (mode === 'riff') {
      const k = OT.detectKey(tr.notes);
      const r = OE.riffFromNotes(tr.notes, Object.assign({}, S.st, {key: k.key, scale: k.scale}));
      const allowed = [1, 2, 4, 8, 16, 32, 64], bars = allowed.find(b => b >= Math.max(r.bars, S.st.bars)) || 64;
      S.importInfo = `A riff of ${r.notes} notes over ${r.bars} bar${r.bars > 1 ? 's' : ''}, read in ${OT.keyLabel(k.key, k.scale)}${r.snapped ? `; ${r.snapped} note${r.snapped > 1 ? 's' : ''} outside the scale snapped to it` : ''}. Now vary it, fingerprint it or play it on any patch.`;
      commit(Object.assign({}, r.patch, {key: k.key, scale: k.scale, imported: null, bars, from: 'import', name: f.name}));
      toast(`Riff imported: ${r.notes} notes, ${OT.keyLabel(k.key, k.scale)}`);
      $('gHarmony').open = true;
      return;
    }
    const {chords, beats} = OT.chordsFromNotes(tr.notes);
    if (!chords.length) return toast('No chords found in that track.');
    const k = OT.detectKey(tr.notes, chords[0]);
    const bars = beats / 4, allowed = [1, 2, 4, 8, 16, 32, 64];
    const fitBars = allowed.find(b => b >= bars) || 64;
    const patch = {imported: {name: f.name, chords, beats, key: k.key, scale: k.scale}, key: k.key, scale: k.scale, bars: Math.max(fitBars, Math.min(S.st.bars, 64)), from: S.st.from};
    if (f.mid.bpm && Math.abs(f.mid.bpm - S.st.bpm) > 0.5 && f.mid.bpm >= 60 && f.mid.bpm <= 200) toast(`${chords.length} chords imported in ${OT.keyLabel(k.key, k.scale)}. The file says ${Math.round(f.mid.bpm)} BPM; the tempo field is yours to change.`);
    else toast(`${chords.length} chords imported, read as ${OT.keyLabel(k.key, k.scale)}.`);
    commit(patch);
    $('gHarmony').open = true;
  }

  // ---------- bank ----------
  function viewBankTabs() {
    const tabs = [['all', 'All', '#ECEEF5'], ...Object.entries(OB.GENRES).map(([id, g]) => [id, g.name, g.color])];
    $('genreTabs').innerHTML = tabs.map(([id, n, c]) => `<button type="button" role="tab" data-g="${id}" style="--c:${c}" class="${S.filter === id ? 'on' : ''}" aria-selected="${S.filter === id}"><i style="background:${c}"></i>${esc(n)}</button>`).join('');
  }
  function patternRoles() {
    if (!S.pRoles) { S.pRoles = {}; for (const p of OB.PATTERNS) S.pRoles[p.id] = OE.roles(OB.stateFor(p)); }
    return S.pRoles;
  }
  // search: section words ("drop", "build", "breakdown"…) and length words ("short", "long", "pads"…) filter by tag,
  // everything else is matched against the text. "drop material for sure" is just "drop".
  function visiblePatterns() {
    const q = OE.parseQuery(S.q), PR = patternRoles();
    const roles = new Set(q.roles); if (S.role !== 'any') roles.add(S.role);
    const list = OB.PATTERNS.filter(p => {
      if (S.filter !== 'all' && p.genre !== S.filter) return false;
      const r = PR[p.id], snd = OB.SOUNDS_BY_ID[p.sound];
      if (roles.size && ![...roles].some(x => r.roles.includes(x))) return false;
      if (q.lens.size && !q.lens.has(snd.len)) return false;
      const text = [p.name, p.sub, p.why, snd.name, snd.family, OB.GENRES[p.genre].name, p.pool, p.order].join(' ').toLowerCase();
      return q.words.every(w => text.includes(w));
    });
    if (S.sort === 'energy-') list.sort((a, b) => PR[b.id].energy - PR[a.id].energy);
    if (S.sort === 'energy+') list.sort((a, b) => PR[a.id].energy - PR[b.id].energy);
    if (S.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }
  const roleTags = rs => `<span class="rtags">${Object.keys(OE.ROLES).filter(r => rs.includes(r)).map(r => `<span class="rtag" style="--rc:${OE.ROLES[r].color}">${r === 'intro' ? 'intro' : r}</span>`).join('')}</span>`;
  function viewRoleTabs() {
    const tabs = [['any', 'Any section', '#ECEEF5'], ...Object.entries(OE.ROLES).map(([k, v]) => [k, v.name, v.color])];
    $('roleTabs').innerHTML = tabs.map(([k, n, c]) => `<button type="button" data-role="${k}" style="--rc:${c}" class="${S.role === k ? 'on' : ''}" title="${esc(k === 'any' ? 'Every pattern' : OE.ROLES[k].desc)}">${esc(n)}</button>`).join('');
  }
  function strip(steps) {
    const st = typeof steps === 'string' ? OE.parseSteps(steps) : steps;
    return st.slice(0, 16).map(s => `<i class="${s.type === 'rest' ? '' : s.type === 'tie' ? 't' : s.type === 'chord' ? 'c' : s.type === 'pedal' ? 'p' : s.acc ? 'a' : 'n'}"></i>`).join('');
  }
  function viewBank() {
    const list = visiblePatterns();
    $('bankCount').textContent = `${list.length} of ${OB.PATTERNS.length}`;
    let html = '', lastSub = '';
    const PR = patternRoles(), grouped = S.sort === 'bank';
    for (const p of list) {
      const g = OB.GENRES[p.genre], sub = (S.filter === 'all' ? g.name + ' · ' : '') + p.sub, r = PR[p.id];
      if (grouped && sub !== lastSub) { html += `<p class="psub">${esc(sub)}</p>`; lastSub = sub; }
      const s = OB.SOUNDS_BY_ID[p.sound];
      html += `<button type="button" class="pitem" data-p="${p.id}" style="--c:${g.color}"><b>${esc(p.name)}${roleTags(r.roles)}</b><small>${grouped ? '' : esc(g.name) + ' · '}${p.bpm || Math.round((g.bpm[0] + g.bpm[1]) / 2)} · ${esc(s ? s.name : '')} · energy ${r.energy}</small><span class="strip">${strip(p.steps)}</span><span class="en" style="--e:${r.energy}%"></span></button>`;
    }
    $('plist').innerHTML = html || '<p class="empty">Nothing matches.</p>';
    viewBankActive();
  }
  // ---------- the sound browser ----------
  function visibleSounds() {
    const q = OE.parseQuery(S.sQ);
    const lens = new Set(q.lens); if (S.sLen !== 'all') lens.add(S.sLen);
    const roles = new Set(q.roles); if (S.sRole !== 'all') roles.add(S.sRole);
    return OB.SOUNDS.filter(x => (!lens.size || lens.has(x.len)) && (!roles.size || [...roles].some(r => x.roles.includes(r))) && q.words.every(w => [x.name, x.family, x.desc, x.tags.join(' ')].join(' ').toLowerCase().includes(w)));
  }
  function viewSoundBrowser() {
    const segs = (id, cur, items) => { $(id).innerHTML = items.map(([k, n, c]) => `<button type="button" data-v="${k}" style="--rc:${c || 'var(--g)'}" class="${cur === k ? 'on' : ''}">${esc(n)}</button>`).join(''); };
    segs('sLen', S.sLen, [['all', 'Any length'], ['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']]);
    segs('sRole', S.sRole, [['all', 'Any section'], ...Object.entries(OE.ROLES).map(([k, v]) => [k, k === 'intro' ? 'Intro' : v.name, v.color])]);
    const list = visibleSounds();
    $('sList').innerHTML = list.map(x => `<div class="srow ${x.id === S.st.sound ? 'on' : ''}" data-s="${x.id}" role="button" tabindex="0" title="${esc(x.desc)}"><span><b>${esc(x.name)}${roleTags(x.roles)}</b><small>${esc(x.family)} · ${x.len} · energy ${Math.round(x.energy * 100)}</small></span><button class="ib" type="button" data-hear="${x.id}" title="Hear one note" aria-label="Hear ${esc(x.name)}">▶</button></div>`).join('') || '<p class="note">No sound matches.</p>';
  }
  async function previewSound(id) {
    const x = OB.SOUNDS_BY_ID[id], st = Object.assign({}, S.st, {sound: id}, x.fx || {});
    const note = S.st.reg - OT.mod(S.st.reg - S.st.key, 12) + (OT.mod(S.st.reg - S.st.key, 12) > 6 ? 12 : 0);
    const buf = await OA.renderSample(OE.normalize(st), {notes: [note], hold: {short: 0.2, medium: 0.5, long: 1.6}[x.len], vel: 110, fx: true, maxSec: 6});
    playBuffer(buf);
  }
  function viewBankActive() { document.querySelectorAll('.pitem').forEach(b => b.classList.toggle('on', b.dataset.p === S.st.from)); }
  function stepPattern(dir) {
    const list = visiblePatterns(); if (!list.length) return;
    let i = list.findIndex(p => p.id === S.st.from);
    i = i < 0 ? 0 : (i + dir + list.length) % list.length;
    loadPattern(list[i].id);
    document.querySelector(`.pitem[data-p="${list[i].id}"]`)?.scrollIntoView({block: 'nearest'});
  }
  function loadPattern(id) {
    const p = OB.BY_ID[id]; if (!p) return;
    const st = OB.stateFor(p);
    // keep what the person set up around the arp
    st.ctx = S.st ? S.st.ctx : undefined;
    if (S.st && S.st.imported) { st.imported = S.st.imported; st.key = S.st.key; st.scale = S.st.scale; }
    load(st);
  }

  // ---------- the orbit ----------
  const O = {size: 0, dpr: 1, pool: [], seqLen: 1};
  function orbitStatic() {
    const R = S.R, ev = R.events;
    const first = ev.find(e => e.pl) || null;
    O.seqLen = first ? first.sl : 1;
    O.poolN = first ? first.pl : 3;
    // the figure the order draws: consecutive pool indices of the first notes
    O.figure = ev.filter(e => e.kind === 'note' && e.ci === (first ? first.ci : 0)).slice(0, Math.max(8, O.seqLen * 2)).map(e => e.pi);
    if (!player || !player.playing) drawOrbit(null);
  }
  function sizeCanvas(cv) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    return {dpr, w, h};
  }
  function drawOrbit(pos) {
    const cv = $('orbit'); if (!cv || !cv.clientWidth) return;
    const {dpr, w, h} = sizeCanvas(cv), c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.47, st = S.st, L = st.steps.length;
    const col = getComputedStyle(document.documentElement);
    const G = col.getPropertyValue('--g').trim() || '#C6FF3D', ACC = '#FFD166', CH = '#FF5CA8', PD = '#5CC8FF';
    const ang = f => -Math.PI / 2 + f * Math.PI * 2;
    const beats = S.R.beats;
    const pb = pos == null ? null : ((pos % beats) + beats) % beats;
    // outer: the phrase, bar by bar, chord by chord
    const bars = S.R.bars, h0 = S.R.harmony;
    for (let b = 0; b < bars; b++) {
      const a0 = ang(b / bars) + 0.01, a1 = ang((b + 1) / bars) - 0.01;
      const ci = OE.chordIndexAt(h0, b * 4);
      c.beginPath(); c.arc(cx, cy, R, a0, a1);
      c.strokeStyle = pb != null && pb >= b * 4 && pb < (b + 1) * 4 ? G : ci % 2 ? '#3A4157' : '#2A3042'; c.lineWidth = 4; c.stroke();
    }
    if (pb != null) { c.beginPath(); c.arc(cx, cy, R + 6, ang(0), ang(pb / beats)); c.strokeStyle = G + '66'; c.lineWidth = 1.5; c.stroke(); }
    // step ring
    const r1 = R * 0.86, thick = Math.max(6, R * 0.085);
    const stepLen = OE.RATES[st.rate].beats;
    const curStep = pb == null ? -1 : Math.floor(pb / stepLen + 1e-6) % L;
    const gap = L > 32 ? 0.006 : 0.014;
    for (let i = 0; i < L; i++) {
      const s = st.steps[i], a0 = ang(i / L) + gap, a1 = ang((i + 1) / L) - gap;
      let color = '#1E2230';
      if (s.type === 'note') color = s.acc ? ACC : G;
      else if (s.type === 'chord') color = CH;
      else if (s.type === 'pedal') color = PD;
      else if (s.type === 'tie') color = G + '55';
      const now = i === curStep;
      c.beginPath(); c.arc(cx, cy, r1, a0, a1);
      c.strokeStyle = s.type === 'rest' ? (now ? '#3A4157' : '#1A1E2A') : now ? '#FFFFFF' : color + (s.type === 'tie' ? '' : s.prob < 1 ? '99' : 'DD');
      c.lineWidth = thick * (now ? 1.25 : s.acc ? 1.08 : 1); c.lineCap = 'butt';
      if (now && s.type !== 'rest') { c.shadowColor = color; c.shadowBlur = 22; }
      c.stroke(); c.shadowBlur = 0;
      if (s.oct) { const a = (a0 + a1) / 2; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + Math.cos(a) * (r1 + thick * 0.8), cy + Math.sin(a) * (r1 + thick * 0.8), 2, 0, 7); c.fill(); }
    }
    // step hand
    if (pb != null) {
      const a = ang((pb / stepLen % L) / L);
      c.strokeStyle = G + 'AA'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6); c.lineTo(cx + Math.cos(a) * (r1 + thick / 2 + 2), cy + Math.sin(a) * (r1 + thick / 2 + 2)); c.stroke();
    }
    // note-cycle ring
    const r2 = R * 0.69, N = Math.max(1, O.seqLen);
    const lastNote = S.trail.length ? S.trail[S.trail.length - 1] : null;
    const curIx = lastNote && lastNote.e.ix >= 0 ? lastNote.e.ix : -1;
    for (let i = 0; i < N; i++) {
      const a = ang(i / N), x = cx + Math.cos(a) * r2, y = cy + Math.sin(a) * r2;
      c.beginPath(); c.arc(x, y, i === curIx ? 4.5 : 2.5, 0, 7); c.fillStyle = i === curIx ? ACC : '#4A5270'; c.fill();
      if (i === curIx) { c.shadowColor = ACC; c.shadowBlur = 14; c.fill(); c.shadowBlur = 0; }
    }
    c.beginPath(); c.arc(cx, cy, r2, 0, 7); c.strokeStyle = '#ffffff10'; c.lineWidth = 1; c.stroke();
    // pool ring with the figure the notes draw
    const r3 = R * 0.5, M = Math.max(1, (lastNote && lastNote.e.pl) || O.poolN || 3);
    const node = i => { const a = ang(((i % M) + M) % M / M); return [cx + Math.cos(a) * r3, cy + Math.sin(a) * r3]; };
    O.nodes = Array.from({length: M}, (_, i) => { const [x, y] = node(i); return {i, x, y}; });
    O.nodeGap = M > 1 ? 2 * Math.PI * r3 / M : 60;
    c.beginPath(); c.arc(cx, cy, r3, 0, 7); c.strokeStyle = '#ffffff0c'; c.stroke();
    c.globalCompositeOperation = 'lighter';
    if (pos == null && O.figure && O.figure.length > 1) {
      for (let k = 1; k < O.figure.length; k++) { const [x0, y0] = node(O.figure[k - 1]), [x1, y1] = node(O.figure[k]); c.strokeStyle = G + '40'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    }
    const now = actx ? actx.currentTime : 0;
    const tr = S.trail;
    for (let k = 1; k < tr.length; k++) {
      const a = tr[k - 1], b = tr[k];
      if (a.e.pi < 0 || b.e.pi < 0) continue;
      const age = now - b.time, al = Math.max(0, 1 - age / 2.2);
      if (al <= 0) continue;
      const [x0, y0] = node(a.e.pi), [x1, y1] = node(b.e.pi);
      c.strokeStyle = (b.e.kind === 'pedal' || a.e.kind === 'pedal' ? PD : b.e.acc ? ACC : G) + Math.round(al * 200).toString(16).padStart(2, '0');
      c.lineWidth = 1 + al * 2.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    const pl = lastNote && lastNote.e.pl ? lastNote.e.pl : O.poolN;
    const poolNotes = currentPool();
    const recentChord = tr.length && tr[tr.length - 1].e.kind === 'chord' && now - tr[tr.length - 1].time < 0.25;
    for (let i = 0; i < M; i++) {
      const [x, y] = node(i);
      const hit = tr.length && ((tr[tr.length - 1].e.pi === i && now - tr[tr.length - 1].time < 0.3) || recentChord);
      c.beginPath(); c.arc(x, y, hit ? 9 : 6, 0, 7);
      c.fillStyle = hit ? (recentChord ? CH : G) : '#151926'; c.fill();
      c.strokeStyle = hit ? '#fff' : (st.pedal === 'high' ? i === M - 1 : i === 0) && st.steps.some(s => s.type === 'pedal') ? PD : '#3A4157'; c.lineWidth = 1.5; c.stroke();
      if (hit) { c.shadowColor = recentChord ? CH : G; c.shadowBlur = 20; c.fill(); c.shadowBlur = 0; }
      const lbl = poolNotes[i] != null ? nn(poolNotes[i]) : '';
      if (M <= 16 && lbl) { const a = ang(i / M), lx = cx + Math.cos(a) * (r3 - 22), ly = cy + Math.sin(a) * (r3 - 22); c.fillStyle = hit ? '#fff' : '#8A92AE'; c.font = `500 ${Math.max(9, R * 0.045)}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lbl, lx, ly); }
    }
    // centre
    const ci = pb == null ? 0 : OE.chordIndexAt(h0, pb);
    const ch = h0.chords[ci];
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.font = `800 ${Math.round(R * 0.2)}px Archivo, system-ui, sans-serif`;
    c.fillText(ch ? ch.name : '', cx, cy - R * 0.04);
    c.font = `500 ${Math.round(R * 0.06)}px "IBM Plex Mono", monospace`; c.fillStyle = '#8A92AE';
    const bb = pb == null ? 'press play' : `${Math.floor(pb / 4) + 1}.${Math.floor(pb % 4) + 1} · ${ch ? ch.roman : ''}`;
    c.fillText(bb, cx, cy + R * 0.12);
    if (S.M.cycle.bars) { c.fillStyle = ACC; c.fillText(`cycle ${pb == null ? '—' : (Math.floor(pb / 4) % S.M.cycle.bars) + 1} / ${S.M.cycle.bars}`, cx, cy + R * 0.21); }
    if (S.draw) {
      c.fillStyle = ACC; c.fillText(S.drawSeq ? S.drawSeq.join(' ') : 'click the notes in order', cx, cy + R * 0.3);
      if (S.drawSeq) { c.strokeStyle = ACC; c.lineWidth = 2.2; c.beginPath(); S.drawSeq.forEach((i, k) => { const [x, y] = node(i); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
    }
  }
  function currentPool() {
    const tr = S.trail, e = tr.length ? tr[tr.length - 1].e : S.R.events[0];
    if (!e) return [];
    const P = S.R.pools[e.ci] || S.R.pools[0];
    if (!P) return [];
    return OE.extend(P.base, S.st.count, S.st.octaves).slice(0, e.pl || 99);
  }

  // ---------- the piano roll ----------
  const RL = {layer: null, lo: 48, hi: 84, pad: {t: 22, b: 30, l: 30, r: 8}};
  function drawRollLayer() {
    const cv = $('roll'); if (!cv.clientWidth) return;
    const {dpr, w, h} = sizeCanvas(cv);
    const off = RL.layer || document.createElement('canvas'); RL.layer = off;
    off.width = cv.width; off.height = cv.height;
    const c = off.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const ev = S.R.events, beats = S.R.beats, P = RL.pad;
    const ps = ev.map(e => e.n);
    let lo = ps.length ? Math.min(...ps) : 60, hi = ps.length ? Math.max(...ps) : 72;
    lo -= 3; hi += 3;
    if (hi - lo < 14) { const c = (hi + lo) / 2; lo = Math.floor(c - 7); hi = lo + 14; }
    RL.lo = lo; RL.hi = hi;
    const X = b => P.l + (b / beats) * (w - P.l - P.r), Y = n => P.t + (1 - (n - lo + 0.5) / (hi - lo + 1)) * (h - P.t - P.b), rowH = (h - P.t - P.b) / (hi - lo + 1);
    RL.X = X; RL.Y = Y; RL.rowH = rowH; RL.w = w; RL.h = h;
    // rows: black keys darker, C rows labelled
    for (let n = lo; n <= hi; n++) {
      const black = [1, 3, 6, 8, 10].includes(n % 12);
      c.fillStyle = black ? '#0A0C12' : '#0E1118'; c.fillRect(P.l, Y(n) - rowH / 2, w - P.l - P.r, rowH);
      if (n % 12 === 0) { c.fillStyle = '#6B7290'; c.font = '10px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(nn(n), P.l - 4, Y(n)); }
    }
    // the 165 Hz line: under it, the bass's space
    if (lo < 52) { c.strokeStyle = '#FF6B5B66'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(P.l, Y(51.5)); c.lineTo(w - P.r, Y(51.5)); c.stroke(); c.setLineDash([]); }
    // chords along the top
    const H = S.R.harmony;
    for (let t0 = 0; t0 < beats - 1e-6; t0 += H.beats) H.chords.forEach((ch, i) => {
      const a = t0 + ch.t; if (a >= beats) return;
      const b = Math.min(beats, a + ch.d);
      c.fillStyle = i % 2 ? '#1D2130' : '#161925'; c.fillRect(X(a), 2, X(b) - X(a) - 1, P.t - 5);
      c.fillStyle = '#C9CEE0'; c.font = '600 11px Archivo, system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      if (X(b) - X(a) > 26) c.fillText(ch.name, X(a) + 5, P.t / 2);
    });
    // grid
    const beatW = X(1) - X(0);
    for (let b = 0; b <= beats; b++) {
      const bar = b % 4 === 0;
      if (!bar && beatW < 9) continue;
      c.strokeStyle = bar ? '#2E3448' : '#1A1E2A'; c.lineWidth = 1; c.beginPath(); c.moveTo(X(b) + 0.5, P.t); c.lineTo(X(b) + 0.5, h - P.b); c.stroke();
      if (bar && b < beats && (beatW * 4 > 22 || (b / 4) % 4 === 0)) { c.fillStyle = '#6B7290'; c.font = '10px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(b / 4 + 1, X(b) + 3, h - P.b + 12); }
    }
    // kick ticks
    if (S.st.ctx.drums) for (const d of S.ph.drums) if (d.lane === 'k') { c.fillStyle = '#FF6B5B88'; c.fillRect(X(d.t) - 1, h - P.b + 16, 2, 6); }
    // evolution: the cutoff curve
    if (S.st.evo !== 'none') {
      c.strokeStyle = '#5CC8FFAA'; c.lineWidth = 1.5; c.beginPath();
      for (let k = 0; k <= 200; k++) { const b = k / 200 * beats, v = OE.evoAt(S.st, b, beats).cut; const x = X(b), y = P.t + (1 - v) * (h - P.t - P.b); k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      c.fillStyle = '#5CC8FF'; c.font = '10px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.fillText('cutoff', w - P.r - 2, h - P.b - 4);
    }
    // notes
    const G = getComputedStyle(document.documentElement).getPropertyValue('--g').trim() || '#C6FF3D';
    for (const e of ev) {
      const x = X(e.t), x2 = Math.max(x + 2, X(e.t + e.d) - 1), y = Y(e.n);
      const col = e.kind === 'chord' ? '#FF5CA8' : e.kind === 'pedal' ? '#5CC8FF' : e.acc ? '#FFD166' : G;
      c.globalAlpha = 0.45 + 0.55 * (e.v / 127);
      c.fillStyle = col; c.fillRect(x, y - rowH * 0.42, x2 - x, Math.max(2, rowH * 0.84));
      if (e.glideFrom != null) { c.strokeStyle = col; c.beginPath(); c.moveTo(x - 4, Y(e.glideFrom)); c.lineTo(x + 3, y); c.stroke(); }
    }
    c.globalAlpha = 1;
    paintRoll(null);
  }
  function paintRoll(pos) {
    const cv = $('roll'); if (!RL.layer || !cv.width) return;
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(RL.layer, 0, 0);
    if (pos == null) return;
    const dpr = cv.width / RL.w; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const beats = S.R.beats, pb = ((pos % beats) + beats) % beats, x = RL.X(pb);
    c.fillStyle = '#ffffff14'; c.fillRect(RL.X(Math.floor(pb / 4) * 4), RL.pad.t, RL.X(4) - RL.X(0), RL.h - RL.pad.t - RL.pad.b);
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, RL.pad.t); c.lineTo(x, RL.h - RL.pad.b); c.stroke();
    const now = actx.currentTime;
    c.globalCompositeOperation = 'lighter';
    for (const f of S.trail) {
      const age = now - f.time; if (age > 0.35 || age < 0) continue;
      const e = f.e, al = 1 - age / 0.35, xx = RL.X(e.t), y = RL.Y(e.n);
      c.fillStyle = `rgba(255,255,255,${0.7 * al})`; c.shadowColor = '#fff'; c.shadowBlur = 16 * al;
      c.fillRect(xx - 1, y - RL.rowH * 0.6, Math.max(4, RL.X(e.t + e.d) - xx + 2), RL.rowH * 1.2);
    }
    c.shadowBlur = 0; c.globalCompositeOperation = 'source-over';
  }

  // ---------- playback ----------
  function ensureAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    actx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
    engine = OA.create(actx);
    player = OA.player(actx, engine);
    player.load(S.ph);
  }
  function togglePlay(force) {
    ensureAudio();
    const on = force != null ? force : !player.playing;
    if (on && !player.playing) { player.load(S.ph); player.start(0); S.trail.length = 0; }
    else if (!on && player.playing) { player.stop(); S.trail.length = 0; drawOrbit(null); paintRoll(null); document.querySelectorAll('.cell.now').forEach(x => x.classList.remove('now')); }
    const b = $('play'); b.classList.toggle('on', player.playing); b.querySelector('.ico').textContent = player.playing ? '■' : '▶'; b.querySelector('.lbl').textContent = player.playing ? 'Stop' : 'Play';
    $('fab').textContent = player.playing ? '■' : '▶'; $('fab').classList.toggle('on', player.playing);
    $('heroPlay').innerHTML = player.playing ? '<span class="ico">■</span> Stop' : '<span class="ico">▶</span> Play';
    songButton();
  }
  let lastCell = -1, lastChord = -1, lowTimer = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!player || !player.playing) return;
    const now = actx.currentTime;
    // move scheduled notes into the trail once they sound
    const fl = player.flashes;
    while (fl.length && fl[0].time <= now) { S.trail.push(fl.shift()); if (S.trail.length > 64) S.trail.shift(); }
    const pos = player.beat();
    if (pos == null || pos < 0) return;
    if (player.song) { songFrame(pos); return; }
    const beats = S.R.beats, pb = ((pos % beats) + beats) % beats;
    drawOrbit(pos); paintRoll(pos); scope();
    $('tBar').textContent = `${Math.floor(pb / 4) + 1}.${Math.floor(pb % 4) + 1}`;
    const ci = OE.chordIndexAt(S.R.harmony, pb);
    if (ci !== lastChord) { lastChord = ci; $('tChord').textContent = S.R.harmony.chords[ci].name; document.querySelectorAll('.cc').forEach(x => x.classList.toggle('on', +x.dataset.ci === ci)); }
    const L = S.st.steps.length, cell = Math.floor(pb / OE.RATES[S.st.rate].beats + 1e-6) % L;
    if (cell !== lastCell) { document.querySelector('.cell.now')?.classList.remove('now'); document.querySelector(`.cell[data-i="${cell}"]`)?.classList.add('now'); lastCell = cell; }
    if (now - lowTimer > 0.3) { lowTimer = now; liveRegister(); }
    if (S.auto) {
      const every = +$('autoEvery').value * 4, next = Math.ceil((pos + 1e-6) / every) * every;
      if (next - pos < 0.35 && S.autoAt !== next) { S.autoAt = next; autopilotStep(); }
    }
  }
  function autopilotStep() {
    const v = OE.vary(S.st, 6, 1 + Math.floor(Math.random() * 1e5), {wild: $('wild').checked});
    if (!v.length) return;
    v.sort((a, b) => b.fit - a.fit);
    const pick = v[0];
    load(Object.assign({}, pick.st, {name: S.st.name.replace(/ · (var|auto).*$/, '') + ' · auto', ctx: S.st.ctx, mix: S.st.mix}));
    toast(`Autopilot: ${pick.what} · fit ${pick.fit}`);
  }

  // ---------- live chords from a MIDI keyboard ----------
  async function liveConnect() {
    if (S.midi) {
      for (const i of S.midi.inputs.values()) i.onmidimessage = null;
      S.midi = null; S.held.clear(); S.down.clear(); liveApply();
      $('liveBtn').classList.remove('on'); $('liveStatus').textContent = 'Keyboard off.';
      return;
    }
    if (!navigator.requestMIDIAccess) { $('liveStatus').textContent = 'This browser has no Web MIDI: use Chrome or Edge.'; return; }
    try { S.midi = await navigator.requestMIDIAccess(); } catch (_) { $('liveStatus').textContent = 'MIDI access was refused.'; return; }
    const bind = () => { let n = 0; for (const i of S.midi.inputs.values()) { i.onmidimessage = ev => midiIn(ev.data); n++; } $('liveStatus').textContent = n ? `Listening to ${n} MIDI input${n > 1 ? 's' : ''}: hold a chord and press play.` : 'No MIDI keyboard found: plug one in.'; };
    bind(); S.midi.onstatechange = bind;
    $('liveBtn').classList.add('on');
  }
  function midiIn(d) {
    const type = d[0] & 0xF0, n = d[1], v = d[2];
    if (type === 0x90 && v > 0) { if (S.liveFresh) { S.held.clear(); S.liveFresh = false; } S.held.add(n); S.down.add(n); }
    else if (type === 0x80 || (type === 0x90 && v === 0)) { S.down.delete(n); if (!$('latch').checked) S.held.delete(n); if (!S.down.size) S.liveFresh = true; }
    else return;
    clearTimeout(S.liveT); S.liveT = setTimeout(liveApply, 25);
  }
  function liveApply() {
    const notes = [...S.held].sort((a, b) => a - b);
    if (!notes.length) {
      if (S.preLive !== undefined) { const back = S.preLive; S.preLive = undefined; commit({imported: back}, {history: false, light: true}); }
      return;
    }
    if (S.preLive === undefined) S.preLive = S.st.imported && S.st.imported.name !== 'Live keyboard' ? S.st.imported : null;
    const w = new Array(12).fill(0); notes.forEach(n => { w[n % 12] += 1; });
    const det = OT.detectChord(w, notes[0]);
    commit({imported: {name: 'Live keyboard', chords: [{t: 0, d: 4, notes, root: det.root, q: det.q, iv: OT.Q[det.q].iv.slice()}], beats: 4, key: S.st.key, scale: S.st.scale}}, {history: false, light: true});
    $('liveStatus').textContent = `Playing ${OT.chordName(det.root, det.q, S.st.key, S.st.scale)}: ${notes.map(nn).join(' ')}${$('latch').checked ? ' (latched)' : ''}`;
  }

  // ---------- sounds out ----------
  const slugName = s => OT.asciiName(s).normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  const noteFile = n => OT.asciiName(OT.noteName(n)).replace('#', 's');
  function smpFormat() { const [bits, sr] = $('smpFmt').value.split('-').map(Number); return {bits, sr}; }
  function smpState(soundId) { return Object.assign({}, S.st, {sound: soundId || $('smpSound').value || S.st.sound}); }
  function playBuffer(buf) { ensureAudio(); const src = actx.createBufferSource(); src.buffer = buf; src.connect(engine.out); src.start(); }
  function drawWave(buf) {
    const cv = $('smpWave'), {dpr, w, h} = sizeCanvas(cv), c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const d = buf.getChannelData(0), G = getComputedStyle(document.documentElement).getPropertyValue('--g').trim();
    c.fillStyle = G; const step = Math.max(1, Math.floor(d.length / w));
    for (let x = 0; x < w; x++) { let mn = 0, mx = 0; for (let i = x * step; i < (x + 1) * step && i < d.length; i++) { if (d[i] < mn) mn = d[i]; if (d[i] > mx) mx = d[i]; } c.fillRect(x, h / 2 - mx * h / 2, 1, Math.max(1, (mx - mn) * h / 2)); }
  }
  async function renderOne() {
    const {sr} = smpFormat(), note = +$('smpNote').value, st = smpState();
    const buf = await OA.renderSample(st, {notes: [note], hold: +$('smpHold').value, vel: +$('smpVel').value, fx: $('smpFx').value === 'fx', sampleRate: sr});
    const snd = OB.SOUNDS_BY_ID[st.sound];
    S.sample = {buf, note, name: `Orbit_${slugName(snd.name)}_${noteFile(note)}${$('smpFx').value === 'fx' ? '_fx' : ''}`};
    drawWave(buf);
    $('smpInfo').textContent = `${snd.name} · ${OT.noteName(note)} (${Math.round(OT.hz(note))} Hz) · ${(buf.length / buf.sampleRate).toFixed(2)} s · peak −1 dBFS · ${$('smpFmt').selectedOptions[0].textContent} · root ${OT.noteName(note)} in the file`;
    return S.sample;
  }
  async function busy(btn, fn) {
    const t = btn.textContent; btn.disabled = true; btn.textContent = 'Rendering…';
    try { await fn(msg => { btn.textContent = msg; }); } catch (err) { toast('Could not render: ' + err.message); console.error(err); }
    btn.disabled = false; btn.textContent = t;
  }
  function stabChords() {
    const set = $('stabSet').value;
    if (set === 'prog') { const seen = new Set(); return S.R.harmony.chords.filter(c => { const k = c.name + c.notes.join(','); if (seen.has(k)) return false; seen.add(k); return true; }); }
    return OE.diatonicChords(S.st, set);
  }
  function viewSamples() {
    if (!$('stabList')) return;
    $('stabList').innerHTML = stabChords().map((c, i) => `<button type="button" data-stab="${i}" title="Hear ${esc(c.name)}">${esc(c.name)}<small>${esc(c.roman)} · ${c.notes.map(nn).join(' ')}</small></button>`).join('');
    $('loopLen').textContent = `${S.st.bars} bars at ${S.st.bpm} BPM (${(S.st.bars * 4 * 60 / S.st.bpm).toFixed(2)} s)`;
  }
  async function stabBuffer(c) { const {sr} = smpFormat(); return OA.renderSample(smpState(), {notes: c.notes, hold: +$('stabHold').value, vel: 110, fx: $('smpFx').value === 'fx', sampleRate: sr}); }
  const rootOf = c => c.notes[0] - OT.mod(c.notes[0] - c.root, 12);
  const keyTag = () => OT.asciiName(OT.pcName(S.st.key, S.st.key, S.st.scale)).replace('#', 's') + (OT.SCALES[S.st.scale].minor ? 'm' : '');
  async function stabsZip(report) {
    const {bits} = smpFormat(), list = stabChords(), files = [], snd = OB.SOUNDS_BY_ID[smpState().sound];
    for (const [i, c] of list.entries()) { report(`Chord ${i + 1} of ${list.length}…`); const b = await stabBuffer(c); files.push({name: `${String(i + 1).padStart(2, '0')}_${slugName(c.name)}_${slugName(snd.name)}.wav`, bytes: OA.wav(b, {bits, root: rootOf(c)})}); }
    const lines = list.map((c, i) => `${i + 1}. ${OT.asciiName(c.name)} (${c.roman}): ${c.notes.map(n => OT.asciiName(OT.noteName(n))).join(' ')}`);
    files.push({name: 'README.txt', bytes: new TextEncoder().encode([`ORBIT CHORD STABS · ${snd.name} · ${OT.asciiName(OT.keyLabel(S.st.key, S.st.scale))} (${OT.camelot(S.st.key, S.st.scale)})`, '', ...lines, '', 'One chord per file. Drum Rack: drop the files on the pads. Simpler: load one chord and play it up and down the keyboard (chord memory). Each file carries its chord root as its root key.', ''].join('\n'))});
    download(OT.zip(files), `Orbit_stabs_${slugName(snd.name)}_${keyTag()}.zip`, 'application/zip');
    toast(`${list.length} chord stabs in one ZIP`);
    return files;
  }
  async function multisampleZip(report) {
    const {bits, sr} = smpFormat(), [lo, hi] = $('msRange').value.split('-').map(Number), step = +$('msStep').value, st = smpState(), snd = OB.SOUNDS_BY_ID[st.sound];
    const layers = $('msLayers').checked ? [[70, 'soft'], [127, 'hard']] : [[+$('smpVel').value, '']];
    const notes = []; for (let n = lo; n <= hi; n += step) notes.push(n);
    const files = []; let k = 0;
    for (const n of notes) for (const [v, tag] of layers) {
      report(`Note ${++k} of ${notes.length * layers.length}…`);
      const b = await OA.renderSample(st, {notes: [n], hold: +$('smpHold').value, vel: v, fx: $('smpFx').value === 'fx', sampleRate: sr});
      files.push({name: `${slugName(snd.name)}_${String(n).padStart(3, '0')}_${noteFile(n)}${tag ? '_' + tag : ''}.wav`, bytes: OA.wav(b, {bits, root: n})});
    }
    const text = [`ORBIT MULTISAMPLE · ${snd.name}`, '', `${notes.length} notes from ${OT.asciiName(OT.noteName(lo))} to ${OT.asciiName(OT.noteName(hi))}, every ${step} semitone${step > 1 ? 's' : ''}${layers.length > 1 ? ', two velocity layers (soft = 70, hard = 127)' : ''}.`,
      'File names: patch_MIDInote_Note(_layer).wav, C3 = MIDI 60 as in Live. Each file carries its root key.', "In Live's Sampler: drop the files into the Zone editor, then set each zone's root key and key range from its name.", '', 'The patch in Serum 2:', ...snd.serum.map(x => '- ' + x), ''];
    files.push({name: 'README.txt', bytes: new TextEncoder().encode(text.join('\n'))});
    download(OT.zip(files), `Orbit_multisample_${slugName(snd.name)}.zip`, 'application/zip');
    toast(`${files.length - 1} samples in one ZIP`);
    return files;
  }
  async function patchPack(report) {
    const {bits, sr} = smpFormat(), files = [];
    for (const [i, snd] of OB.SOUNDS.entries()) {
      report(`Patch ${i + 1} of ${OB.SOUNDS.length}…`);
      const st = OE.normalize(Object.assign({}, OE.DEFAULT, snd.fx || {}, {sound: snd.id, bpm: S.st.bpm, key: S.st.key, scale: S.st.scale}));
      const b = await OA.renderSample(st, {notes: [60], hold: 0.5, vel: 110, sampleRate: sr});
      files.push({name: `${String(i + 1).padStart(2, '0')}_${slugName(snd.name)}_C3.wav`, bytes: OA.wav(b, {bits, root: 60})});
    }
    const text = ['ORBIT PATCH PACK', '', 'Every patch as a one-shot at C3 (MIDI 60), half a second held, at its own settings, dry.', ''];
    OB.SOUNDS.forEach((x, i) => text.push(`${i + 1}. ${x.name} (${x.family}): ${x.desc}`, 'Serum 2:', ...x.serum.map(l => '  - ' + l), 'Ableton:', ...x.live.map(l => '  - ' + l), ''));
    files.push({name: 'RECIPES.txt', bytes: new TextEncoder().encode(text.join('\n'))});
    download(OT.zip(files), `Orbit_patch_pack_${OB.SOUNDS.length}.zip`, 'application/zip');
    toast(`${OB.SOUNDS.length} patches in one ZIP`);
    return files;
  }
  async function loopWav(full) {
    const {bits, sr} = smpFormat();
    const buf = await OA.render(S.st, OE.render(S.st), {loops: 1, seamless: true, sampleRate: sr, parts: full ? null : {arp: true, bass: false, drums: false, chords: false}});
    download(OA.wav(buf, {bits}), `${OE.fileStem(S.st)}_${S.st.bars}bars_${full ? 'mix' : 'arp'}_loop.wav`, 'audio/wav');
    toast(`Seamless ${S.st.bars}-bar loop: exactly ${(buf.length / buf.sampleRate).toFixed(3)} s`);
    return buf;
  }
  async function stemsZip(report) {
    const {bits, sr} = smpFormat(), R = OE.render(S.st), files = [];
    for (const part of ['arp', 'bass', 'drums', 'chords']) {
      report(`Stem: ${part === 'chords' ? 'pad' : part}…`);
      const buf = await OA.render(S.st, R, {loops: 1, seamless: true, sampleRate: sr, parts: {arp: part === 'arp', bass: part === 'bass', drums: part === 'drums', chords: part === 'chords'}});
      files.push({name: `${OE.fileStem(S.st)}_${part === 'chords' ? 'pad' : part}.wav`, bytes: OA.wav(buf, {bits})});
    }
    download(OT.zip(files), `${OE.fileStem(S.st)}_${S.st.bars}bars_stems.zip`, 'application/zip');
    toast('Four seamless stems in one ZIP');
    return files;
  }

  function scope() {
    const cv = $('scope'); if (!cv || !cv.offsetParent) return;
    const {dpr, w, h} = sizeCanvas(cv), c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const a = engine.analyser, n = a.frequencyBinCount, d = new Uint8Array(n); a.getByteFrequencyData(d);
    const bars = 40, G = getComputedStyle(document.documentElement).getPropertyValue('--g').trim();
    for (let i = 0; i < bars; i++) {
      const f0 = 30 * Math.pow(16000 / 30, i / bars), f1 = 30 * Math.pow(16000 / 30, (i + 1) / bars);
      const b0 = Math.floor(f0 / (actx.sampleRate / 2) * n), b1 = Math.max(b0 + 1, Math.floor(f1 / (actx.sampleRate / 2) * n));
      let m = 0; for (let k = b0; k < b1; k++) m = Math.max(m, d[k]);
      const bh = (m / 255) * (h - 4);
      c.fillStyle = f0 < 165 ? '#FF6B5B' : G; c.globalAlpha = 0.85; c.fillRect(2 + i * (w - 4) / bars, h - 2 - bh, (w - 4) / bars - 1, bh);
    }
    c.globalAlpha = 1;
  }

  // ---------- fingerprint ----------
  function viewMeasure() {
    const {m, fit, cycle} = S.M, g = genre();
    $('fitNum').textContent = fit.score; $('fitGenre').textContent = g.name + (S.M.role !== 'drop' ? ' · ' + OE.ROLES[S.M.role].name.toLowerCase() : '');
    // radar
    const svg = $('radar'), cx = 180, cy = 165, R = 120, A = OE.AXES, n = A.length;
    const pt = (i, f) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
    const norm = (a, v) => clamp((v - a.min) / (a.max - a.min), 0, 1);
    let s = '';
    for (const f of [0.25, 0.5, 0.75, 1]) s += `<polygon points="${A.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" stroke="#ffffff14"/>`;
    A.forEach((a, i) => { const [x, y] = pt(i, 1); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ffffff10"/>`; });
    const T = OE.roleTarget(g.target, S.M.role);
    const lo = A.map((a, i) => pt(i, T[a.id] ? norm(a, T[a.id][0]) : 0));
    const hi = A.map((a, i) => pt(i, T[a.id] ? norm(a, T[a.id][1]) : 1));
    s += `<path d="M${hi.map(p => p.join(',')).join('L')}Z M${lo.slice().reverse().map(p => p.join(',')).join('L')}Z" fill="var(--g)" fill-opacity=".16" fill-rule="evenodd" stroke="var(--g)" stroke-opacity=".5" stroke-dasharray="3 3"/>`;
    const cur = A.map((a, i) => pt(i, norm(a, m[a.id])));
    s += `<polygon points="${cur.map(p => p.join(',')).join(' ')}" fill="#ffffff10" stroke="#fff" stroke-width="1.6"/>`;
    fit.axes.forEach((ax, i) => { const [x, y] = cur[i]; s += `<circle cx="${x}" cy="${y}" r="4.5" fill="${ax.na ? '#727A96' : ax.ok ? 'var(--g)' : '#FF6B5B'}"/>`; });
    A.forEach((a, i) => { const [x, y] = pt(i, 1.2); s += `<text x="${x}" y="${y}" fill="#A3AAC0" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="middle" dominant-baseline="middle">${a.short}</text>`; });
    svg.innerHTML = s;
    // tiles
    $('tiles').innerHTML = fit.axes.map((ax, i) => {
      const a = A[i], tr = T[a.id];
      const band = tr ? `<span class="band" style="left:${norm(a, tr[0]) * 100}%;width:${(norm(a, tr[1]) - norm(a, tr[0])) * 100}%"></span>` : '';
      return `<div class="tile ${ax.na ? 'na' : ax.ok ? '' : 'bad'}" title="${esc(ax.na || a.unit)}"><small>${a.label}</small><b>${a.fmt(m[a.id])}</b><span class="rng">${tr ? `${g.name}: ${a.fmt(tr[0])}–${a.fmt(tr[1])}` : `not counted in a ${OE.ROLES[S.M.role].name.toLowerCase()}`}${ax.na ? ' · n/a' : ''}</span><div class="bar">${band}<span class="dot" style="left:${norm(a, m[a.id]) * 100}%"></span></div></div>`;
    }).join('');
    // fixes
    const sug = OE.suggestions(S.st);
    const bad = fit.axes.filter(a => !a.ok);
    $('fixes').innerHTML = !bad.length ? `<p class="ok-msg">Every measurement sits inside ${esc(g.name)}'s range.</p>` : sug.length ? sug.map((x, i) => `<div class="fix"><span>${esc(x.text)}<small>${OE.AXES.find(a => a.id === x.axis)?.label || x.axis} · fit ${x.score}</small></span><button class="btn sm" data-fix="${i}" type="button">Apply</button></div>`).join('') : `<p class="note">Out of range on ${bad.map(a => OE.AXES.find(x => x.id === a.id).label.toLowerCase()).join(', ')}, and no single small edit fixes it. Try the generator for this genre.</p>`;
    if (S.st.echo) $('fixes').insertAdjacentHTML('beforeend', '<p class="note" style="margin-top:8px">The echo cascade is not counted: the fingerprint measures the notes you wrote.</p>');
    $('fixes').querySelectorAll('[data-fix]').forEach(b => b.addEventListener('click', () => { const x = sug[+b.dataset.fix]; commit(x.patch); toast(x.text); }));
    // cycle
    $('cycleText').innerHTML = esc(S.M.cycleText).replace(/(\d+ bars?)/g, '<b>$1</b>');
    viewCycleGrid(cycle);
    viewRegister();
  }
  function viewCycleGrid(cy) {
    const st = S.st, rows = Math.min(8, cy.bars || 8), L = st.steps.length, stepLen = OE.RATES[st.rate].beats, per = Math.round(4 / stepLen);
    if (!Number.isInteger(4 / stepLen) || per > 32) { $('cycleGrid').innerHTML = ''; return; }
    let html = '';
    for (let b = 0; b < rows; b++) {
      html += `<div class="cr"><span>bar ${b + 1}</span>`;
      for (let k = 0; k < per; k++) { const g = b * per + k, s = st.steps[g % L]; html += `<i class="${OE.sounding(s) ? (s.acc ? 'a' : 'n') : ''} ${g % L === 0 ? 's' : ''}" title="step ${(g % L) + 1}"></i>`; }
      html += '</div>';
    }
    $('cycleGrid').innerHTML = html + `<p class="note" style="margin-top:6px">White outline: where the pattern starts again. ${cy.bars && cy.bars > 8 ? `Showing 8 of ${cy.bars} bars.` : ''}</p>`;
  }
  function viewRegister(live) {
    const m = S.M.m, g = genre();
    const lowNotes = m.low;
    const warn = lowNotes > 0.2 && !g.lowOk;
    $('regBox').innerHTML = `<p><span class="big">${pct(lowNotes)}</span> of notes under 165 Hz · lowest ${m.lowest != null ? nn(m.lowest) : '—'}, highest ${m.highest != null ? nn(m.highest) : '—'}</p>
      <div class="meter"><i style="width:${clamp(lowNotes, 0, 1) * 100}%"></i></div>
      <p class="note">${warn ? `That is bass territory. Raise the register an octave, or keep the notes and high-pass the arp at ${Math.max(150, S.st.hp)} Hz so the bass keeps the low end.` : g.lowOk && lowNotes > 0.2 ? 'In acid the 303 line often is the bass: mute the Bass part, or give it only the sub under 80 Hz.' : 'Clear of the bass. The high-pass is at ' + Math.round(S.st.hp) + ' Hz.'}</p>
      <p class="note" id="liveLow">${live || (player && player.playing ? 'Measuring the arp output…' : 'Press play to measure the arp\'s actual output.')}</p>`;
  }
  function liveRegister() {
    if (!engine) return;
    const r = OA.lowShare(engine.arpTap, 165);
    const el = $('liveLow'); if (!el || !r) return;
    el.innerHTML = `Live: <b>${(r.share * 100).toFixed(1)}%</b> of the arp's energy is under 165 Hz (${r.db.toFixed(1)} dB), after the ${Math.round(S.st.hp)} Hz high-pass.`;
  }

  // ---------- find ----------
  function miniCanvas(cv, st, color) {
    const R = OE.render(st, {bars: 2, evo: false, fills: false, mutate: false});
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 240, h = cv.clientHeight || 70;
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#0B0D13'; c.fillRect(0, 0, w, h);
    const ps = R.events.map(e => e.n), lo = Math.min(...ps, 60) - 1, hi = Math.max(...ps, lo + 12) + 1;
    c.strokeStyle = '#1D2130'; for (let b = 0; b <= 8; b++) { c.beginPath(); c.moveTo(b / 8 * w + 0.5, 0); c.lineTo(b / 8 * w + 0.5, h); c.stroke(); }
    for (const e of R.events) {
      const x = e.t / 8 * w, x2 = Math.max(x + 2, (e.t + e.d) / 8 * w - 1), y = h - 4 - (e.n - lo) / (hi - lo) * (h - 8);
      c.fillStyle = e.kind === 'chord' ? '#FF5CA8' : e.kind === 'pedal' ? '#5CC8FF' : e.acc ? '#FFD166' : color;
      c.globalAlpha = 0.5 + 0.5 * e.v / 127; c.fillRect(x, y - 2, x2 - x, 4);
    }
    c.globalAlpha = 1;
  }
  function runFind(kind = 'new') {
    const gid = $('findGenre').value || S.st.genre;
    const keep = {};
    if ($('keepHarm').checked) Object.assign(keep, {bpm: gid === S.st.genre ? S.st.bpm : undefined, key: S.st.key, scale: S.st.scale, prog: S.st.imported ? undefined : (gid === S.st.genre ? S.st.prog : undefined), imported: S.st.imported || undefined, bars: S.st.bars});
    if ($('keepSound').checked) keep.sound = S.st.sound;
    if ($('wild').checked) keep.wild = true;
    if ($('findRole').value) keep.role = $('findRole').value;
    for (const k of Object.keys(keep)) if (keep[k] === undefined) delete keep[k];
    const seed = 1 + Math.floor(Math.random() * 1e5);
    const t0 = performance.now();
    S.cands = kind === 'vary' ? OE.vary(S.st, 8, seed, {wild: $('wild').checked}).map(v => Object.assign(v, {typical: null})) : OE.find(gid, 8, seed, keep);
    S.candKind = kind;
    for (const c of S.cands) { c.st.ctx = S.st.ctx; c.st.mix = S.st.mix; }
    viewCands();
    toast(kind === 'vary' ? `8 variations of "${S.st.name}"` : `${S.cands.length} of 140 ${keep.role ? OE.ROLES[keep.role].name.toLowerCase() + ' ' : ''}ideas kept in ${Math.round(performance.now() - t0)} ms`);
  }
  function viewCands() {
    const box = $('cands');
    if (!S.cands.length) { box.innerHTML = '<p class="empty">Press <b>New ideas</b> to write eight combos for the genre, or <b>Variations</b> to move the one you have.</p>'; return; }
    const packed = OE.pack(S.st);
    box.innerHTML = S.cands.map((c, i) => {
      const g = OB.GENRES[c.st.genre], s = OB.SOUNDS_BY_ID[c.st.sound];
      return `<div class="cand ${OE.pack(c.st) === packed ? 'on' : ''}" data-c="${i}" style="--c:${g.color}" tabindex="0" role="button" aria-label="Audition ${esc(c.st.name)}"><canvas></canvas><span class="sc">${c.fit}</span><h4>${esc(c.what ? c.what : s.name + ' · ' + ({stab: 'chord stabs', pedal: 'pedal riff', riff: 'written riff', arp: OE.ORDERS[c.st.order].name.toLowerCase() + ' arp'})[c.kind || 'arp'])}</h4><p>${esc(OE.POOLS[c.st.pool].name)} · ${OE.RATES[c.st.rate].label} · ${c.st.steps.length} steps · ${c.st.bpm} BPM${c.typical != null ? ' · typical ' + Math.round(c.typical * 100) + '%' : ''}</p>${roleTags((c.roles || OE.roles(c.st)).roles)}<div class="ca"><button class="btn sm" data-play="${i}" type="button">▶ Hear</button><button class="btn sm ghost" data-star="${i}" type="button">★ Save</button></div></div>`;
    }).join('');
    box.querySelectorAll('.cand').forEach((el, i) => miniCanvas(el.querySelector('canvas'), S.cands[i].st, OB.GENRES[S.cands[i].st.genre].color));
  }
  function audition(i) {
    const c = S.cands[i]; if (!c) return;
    const st = Object.assign({}, c.st);
    if (S.candKind !== 'vary') st.name = `${OB.GENRES[st.genre].name} idea ${i + 1}`;
    load(st);
    togglePlay(true);
    document.querySelectorAll('.cand').forEach((el, k) => el.classList.toggle('on', k === i));
  }

  // ---------- song sketch ----------
  function viewSong() {
    if (!$('songMap')) return;
    const sg = S.song = OE.song(S.st, $('songForm').value || 'club'), total = sg.beats;
    const mins = total * 60 / sg.bpm / 60;
    $('songMeta').textContent = `${sg.bars} bars · ${Math.floor(mins)}:${String(Math.round(mins % 1 * 60)).padStart(2, '0')} at ${sg.bpm} BPM · ${sg.sections.filter(x => x.reads).length}/${sg.sections.length} sections read as written`;
    $('songMap').innerHTML = sg.sections.map(x => `<button type="button" class="blk" data-si="${x.i}" style="--w:${x.bars};--rc:${OE.ROLES[x.role].color};--e:${Math.round(x.energy * 0.55)}%" title="${esc(x.name)}: ${x.bars} bars, arp energy ${x.energy}"><b>${esc(x.name)}</b><small>${x.bars} bars</small><i></i></button>`).join('') + '<span class="ph" id="songPh"></span>';
    $('songSecs').innerHTML = sg.sections.map(x => `<button type="button" class="ssec" data-si="${x.i}" style="--rc:${OE.ROLES[x.role].color}"><h4>${esc(x.name)}<span>${x.bars} bars · arp energy ${x.energy}</span></h4><p>${esc(x.how)}</p><span class="rd ${x.reads ? 'ok' : 'no'}">${x.reads ? '✓ reads as ' + OE.ROLES[x.role].name.toLowerCase() : '△ reads as ' + OE.ROLES[x.measured].name.toLowerCase()}</span></button>`).join('');
    const notes = [...new Set(sg.sections.map(x => x.note).filter(Boolean))];
    $('songNote').textContent = (FORM_TEXT() + (notes.length ? ' ' + notes.join(' ') : '')).trim();
  }
  const FORM_TEXT = () => (OE.FORMS[$('songForm').value] || OE.FORMS.club).text;
  function songList() {
    return S.song.sections.map(x => {
      const st = Object.assign({}, x.st, {mix: S.st.mix});
      return {ph: OA.phrase(OE.normalize(st), OE.render(st, {bars: x.bars})), start: x.start, beats: x.bars * 4, i: x.i};
    });
  }
  function playSong() {
    ensureAudio();
    if (player.song) { togglePlay(false); return; }
    if (!S.song) viewSong();
    if (player.playing) player.stop();
    player.playSong(songList());
    S.trail.length = 0;
    const b = $('play'); b.classList.add('on'); b.querySelector('.ico').textContent = '■'; b.querySelector('.lbl').textContent = 'Stop';
    $('fab').textContent = '■'; $('fab').classList.add('on'); $('heroPlay').innerHTML = '<span class="ico">■</span> Stop';
    songButton();
    toast(`Playing the ${S.song.name.toLowerCase()}: ${S.song.bars} bars`);
  }
  function songButton() {
    const on = !!(player && player.song);
    const b = $('songPlay'); if (!b) return;
    b.textContent = on ? '■ Stop the song' : '▶ Play the song'; b.setAttribute('aria-pressed', String(on));
    if (!on) { const ph = $('songPh'); if (ph) ph.style.display = 'none'; document.querySelectorAll('.songmap .blk.now').forEach(x => x.classList.remove('now')); }
  }
  let lastSec = -1;
  function songFrame(pos) {
    const sg = player.song, total = sg.beats, p = ((pos % total) + total) % total;
    const sec = sg.list.find(x => p >= x.start && p < x.start + x.beats) || sg.list[0];
    const map = $('songMap'), ph = $('songPh');
    if (map && ph) {
      const blk = map.querySelector(`.blk[data-si="${sec.i}"]`);
      if (blk) { ph.style.display = 'block'; ph.style.left = (blk.offsetLeft + blk.offsetWidth * (p - sec.start) / sec.beats) + 'px'; }
      if (sec.i !== lastSec) { lastSec = sec.i; map.querySelectorAll('.blk').forEach(x => x.classList.toggle('now', +x.dataset.si === sec.i)); }
    }
    const bar = Math.floor((p - sec.start) / 4) + 1;
    $('tBar').textContent = `${S.song.sections[sec.i].name} ${bar}/${sec.beats / 4}`;
  }
  function songLoad(i) {
    const x = S.song && S.song.sections[i]; if (!x) return;
    const st = Object.assign({}, x.st, {ctx: Object.assign({}, S.st.ctx, x.parts), mix: S.st.mix, bars: Math.min(32, x.bars)});
    load(st);
    toast(`${x.name} on stage: undo goes back to the idea`);
  }
  function songMidi() {
    if (!S.song) viewSong();
    const bytes = OE.exportSong(S.song, {name: S.st.name + ' (song)'});
    download(bytes, OE.fileStem(S.st) + '_song-' + S.song.form + '_' + S.song.bars + 'bars.mid', 'audio/midi');
    toast('Song MIDI downloaded: one arp track, chords, bass and drums, a marker per section');
    return bytes;
  }

  // ---------- crate ----------
  function saveCrate() { store.set(KEY_CRATE, S.crate); }
  function toggleSave() {
    const packed = OE.pack(S.st), i = S.crate.findIndex(c => c.st === packed);
    if (i >= 0) { S.crate.splice(i, 1); toast('Removed from the crate'); }
    else { S.crate.unshift({id: Date.now().toString(36), name: S.st.name, genre: S.st.genre, st: packed, fit: S.M.fit.score, time: Date.now()}); toast('Saved to the crate ★'); }
    saveCrate(); viewCrate(); viewTransport();
  }
  function viewCrate() {
    $('crateCount').textContent = S.crate.length ? `${S.crate.length} saved` : 'Nothing saved yet: press ★ on anything you like.';
    $('crateZip').disabled = !S.crate.length;
    $('crateList').innerHTML = S.crate.map((c, i) => {
      let st; try { st = OE.unpack(c.st); } catch (_) { return ''; }
      const g = OB.GENRES[st.genre] || OB.GENRES['tech-house'];
      return `<div class="crow" data-k="${i}" style="--c:${g.color}"><canvas></canvas><div><input value="${esc(c.name)}" data-rename="${i}" aria-label="Name"><small>${esc(g.name)} · ${esc(OT.keyLabel(st.key, st.scale))} · ${st.bpm} BPM · ${esc(OB.SOUNDS_BY_ID[st.sound]?.name || '')} · fit ${c.fit}</small></div><div class="ca"><button class="btn sm" data-cload="${i}" type="button">Load</button><button class="btn sm ghost" data-cmidi="${i}" type="button">MIDI</button><button class="ib" data-cdel="${i}" type="button" aria-label="Delete">✕</button></div></div>`;
    }).join('');
    $('crateList').querySelectorAll('.crow').forEach(el => { const c = S.crate[+el.dataset.k]; try { const st = OE.unpack(c.st); miniCanvas(el.querySelector('canvas'), st, (OB.GENRES[st.genre] || OB.GENRES['tech-house']).color); } catch (_) {} });
  }
  function readme(list) {
    const lines = ['ORBIT CRATE · Fieldwork', '', 'Each combo is a MIDI file with three tracks: the arp (with swing, accents, slides and its evolution as CC74/71/75/91),', 'the chords held per bar, and the Arpeggiator input (the note pool held per chord, for Live\'s Arpeggiator).', 'C3 = MIDI 60 (Ableton). Drag a file into an empty Live set at its tempo.', ''];
    for (const {name, st} of list) {
      const s = OB.SOUNDS_BY_ID[st.sound];
      lines.push(`== ${name} ==`, `${OB.GENRES[st.genre].name} · ${OT.keyLabel(st.key, st.scale)} (${OT.camelot(st.key, st.scale)}) · ${st.bpm} BPM · ${st.bars} bars`,
        `Harmony: ${st.imported ? 'imported (' + st.imported.name + ')' : st.prog} · ${OE.describe(st)}`, `Steps: ${OE.stepsString(st.steps)}`,
        `Sound: ${s.name}. Serum 2:`, ...s.serum.map(x => '  - ' + x), `Evolution: ${OE.EVOS[st.evo].name}. Fill: ${OE.FILLS[st.fill].name}.`, '');
    }
    return lines.join('\n');
  }
  function crateZip() {
    if (!S.crate.length) return;
    const files = [], list = [], used = new Set();
    for (const c of S.crate) {
      let st; try { st = OE.unpack(c.st); } catch (_) { continue; }
      st.name = c.name;
      let fn = OE.fileStem(st); while (used.has(fn)) fn += '_'; used.add(fn);
      files.push({name: fn + '.mid', bytes: OE.exportMidi(st, {bars: st.bars, parts: {arp: true, chords: true, input: true}})});
      list.push({name: c.name, st});
    }
    files.push({name: 'README.txt', bytes: new TextEncoder().encode(readme(list))});
    files.push({name: 'crate.json', bytes: new TextEncoder().encode(JSON.stringify(S.crate, null, 1))});
    download(OT.zip(files), `Orbit-crate-${S.crate.length}-arps.zip`, 'application/zip');
    toast(`${list.length} MIDI files in one ZIP`);
  }
  function sessionOut() {
    download(new TextEncoder().encode(JSON.stringify({orbit: 1, current: OE.pack(S.st), crate: S.crate}, null, 1)), 'Orbit-session.json', 'application/json');
  }
  async function openSession(file) {
    try {
      const j = JSON.parse(await file.text());
      if (!j.orbit) throw Error('not an Orbit session');
      if (Array.isArray(j.crate)) { const seen = new Set(S.crate.map(c => c.st)); for (const c of j.crate) if (!seen.has(c.st)) S.crate.push(c); saveCrate(); viewCrate(); }
      if (j.current) load(OE.unpack(j.current));
      toast('Session opened');
    } catch (err) { toast('Could not open that session: ' + err.message); }
  }

  // ---------- export ----------
  function midiParts() { const p = {arp: true}; document.querySelectorAll('[data-part]').forEach(i => { p[i.dataset.part] = i.checked || i.dataset.part === 'arp'; }); return p; }
  function midiBytes(quick) {
    const bars = quick ? S.st.bars : +$('expBars').value;
    return OE.exportMidi(S.st, {bars, parts: quick ? {arp: true} : midiParts(), cc: quick ? true : $('expCC').checked});
  }
  function midiName(quick) { return OE.fileStem(S.st) + '_' + (quick ? S.st.bars : $('expBars').value) + 'bars.mid'; }
  function exportMidi(quick) { download(midiBytes(quick), midiName(quick), 'audio/midi'); toast('MIDI downloaded: drag it into Live'); }
  function dragStart(e, quick) {
    const blob = new Blob([midiBytes(quick)], {type: 'audio/midi'}), url = URL.createObjectURL(blob);
    try { e.dataTransfer.setData('DownloadURL', `audio/midi:${midiName(quick)}:${url}`); } catch (_) {}
    e.dataTransfer.setData('text/plain', midiName(quick));
    e.dataTransfer.effectAllowed = 'copy';
  }
  async function exportWav(solo) {
    const b = solo ? $('wavArp') : $('wavMix'); b.disabled = true; const t = b.textContent; b.textContent = 'Rendering…';
    try {
      const R = OE.render(S.st);
      const buf = await OA.render(S.st, R, {loops: 2, solo});
      download(OA.wav(buf), OE.fileStem(S.st) + (solo ? '_arp' : '_mix') + '.wav', 'audio/wav');
      toast('WAV rendered in the browser');
    } catch (err) { toast('Could not render: ' + err.message); console.error(err); }
    b.disabled = false; b.textContent = t;
  }
  async function share() {
    const url = location.href.split('#')[0] + '#s=' + OE.pack(S.st);
    try { await navigator.clipboard.writeText(url); toast('Link copied: it opens this exact combo'); }
    catch (_) { history.replaceState(null, '', '#s=' + OE.pack(S.st)); toast('The link is in the address bar'); }
  }

  // ---------- the Ableton cards ----------
  function viewAbleton() {
    const st = S.st, s = sound(), la = OE.liveArp(st);
    const vtext = {exact: 'Exact with the Arpeggiator', close: 'Close with the Arpeggiator', midi: 'Use the MIDI export'}[la.verdict];
    $('arpCard').innerHTML = `<h3>Live's Arpeggiator <span class="verdict ${la.verdict}">${vtext}</span></h3>
      <p class="note">Put Arpeggiator on a MIDI track, feed it ${esc(la.input)} from the MIDI export, and set:</p>
      <table class="kv">${la.settings.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
      ${la.reasons.length ? `<p class="note" style="margin-top:10px"><b>Why not exact:</b> ${la.reasons.map(esc).join(' ')}</p>` : ''}
      ${la.notes.length ? `<p class="note">${la.notes.map(esc).join(' ')}</p>` : ''}
      ${st.echo ? `<p class="note">The echo cascade is written into the MIDI as real notes. To keep it live instead, play the plain arp into a MIDI echo device (Live Suite's Note Echo) at the same time and pitch.</p>` : ''}
      ${st.order === 'turing' ? '<p class="note">A Turing loop is different on every pass: the MIDI export is one take of it. Export a few and keep the best.</p>' : ''}
      <p class="note">MIDI effect chain for the same idea played live: <b>Arpeggiator → Scale</b> (base ${esc(OT.pcName(st.key, st.key, st.scale))}, ${esc(OT.SCALES[st.scale].name)}) <b>→ Velocity</b> (Random 6, for life) <b>→ Note Length</b> (gate ${Math.round(st.gate * 100)}%).</p>`;
    const e = OE.EVOS[st.evo], lanes = [['cut', 74, 'Cutoff'], ['res', 71, 'Resonance'], ['dec', 75, 'Decay'], ['send', 91, 'Reverb']].filter(([k]) => e[k]);
    $('serumCard').innerHTML = `<p class="tag">Serum 2 · ${esc(s.family)}</p><h3>${esc(s.name)}</h3><p class="note">${esc(s.desc)}</p><ol>${s.serum.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      ${lanes.length ? `<p class="lanes">The export's evolution: ${lanes.map(([, cc, n]) => `CC${cc} → ${n}`).join(' · ')}. In Serum 2, right-click the knob (or its macro) → MIDI Learn, then play the clip.</p>` : ''}`;
    $('liveCard').innerHTML = `<p class="tag">Ableton Live · stock devices</p><h3>${esc(s.name)} without Serum</h3><ol>${s.live.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <p class="note">Effects after it, in this order: EQ Eight (low cut at ${Math.round(st.hp)} Hz) → Saturator → Echo or Delay (${esc(delayLabel(st.delayTime))}, ${Math.round(st.fb * 100)}% feedback) on a send → Reverb on a send (${(0.8 + st.space * 4.2).toFixed(1)} s) → Compressor sidechained from the kick.</p>`;
    const dt = OE.delayTable(st.bpm);
    const rel = Math.round(60000 / st.bpm / 2);
    $('mixCard').innerHTML = `<h3>Fitting it in the mix at ${st.bpm} BPM</h3>
      <div class="two" style="margin-top:4px">
        <div><p class="note"><b>Sidechain:</b> Compressor on the arp, sidechain from the kick, ratio 4:1, attack 0.1 ms, release about ${rel} ms (an 8th) so it breathes back before the off-beat. Depth here: ${pct(st.duck)}.</p>
        <p class="note"><b>Low end:</b> high-pass the arp at ${Math.round(Math.max(120, st.hp))}–${Math.round(Math.max(200, st.hp + 60))} Hz. Its lowest note is ${S.M.m.lowest != null ? nn(S.M.m.lowest) + ' (' + Math.round(OT.hz(S.M.m.lowest)) + ' Hz)' : '—'}.</p>
        <p class="note"><b>Space:</b> delay on a send, filtered (HP 300 Hz, LP 5 kHz), sidechained with the arp so the echoes fill the gaps between kicks.</p></div>
        <div><p class="note"><b>Delay times at ${st.bpm} BPM</b></p><div class="dtab">${dt.map(d => `<div><small>${d.n}</small><b>${d.ms.toFixed(1)} ms</b></div>`).join('')}</div></div>
      </div>`;
    $('midiNote').textContent = `Arp: ${S.R.events.length} notes in ${S.st.bars} bars on channel 1${st.evo !== 'none' ? `, with ${lanes.map(([, cc]) => 'CC' + cc).join(', ')} automation` : ''}. Chords, Arp input, Bass and Drums each get their own track. C3 = MIDI 60, as in Live.`;
  }
  function delayLabel(k) { return ({'16': '1/16', '16d': '1/16 dotted', '8t': '1/8 triplet', '8': '1/8', '8d': '1/8 dotted', '4': '1/4', '4d': '1/4 dotted'})[k] || k; }

  // ---------- rules ----------
  function ruleMeasure(rule, st) {
    const R = OE.render(st, {bars: 8}), m = OE.metrics(OE.render(st, {bars: 4, evo: false, fills: false, mutate: false}));
    const bpm = st.bpm;
    switch (rule.axis) {
      case 'pitches': return `${m.pitches} different pitches`;
      case 'kick': return `${pct(m.kick)} of notes on the kick`;
      case 'cycle': { const c = OE.cycle(st); return c.bars ? `repeats every ${c.bars} bar${c.bars > 1 ? 's' : ''}` : 'never repeats'; }
      case 'accent': { const v = R.events.map(e => e.v); return `velocity ${Math.min(...v)}–${Math.max(...v)}`; }
      case 'length': return `notes ${(m.length).toFixed(2)} 16ths long`;
      case 'swing': return `off-16ths ${((st.swing - 50) / 100 * 0.5 * 60000 / bpm).toFixed(1)} ms late`;
      case 'pedal': return `${(m.density).toFixed(0)} notes a bar, ${m.pitches} pitches`;
      case 'evo': { const v = [0, 0.5, 1].map(p => OE.evoAt(st, p * st.bars * 4, st.bars * 4).cut); return st.evo === 'none' ? `cutoff fixed at ${pct(st.cut)}` : `cutoff ${pct(v[0])} → ${pct(v[2])}`; }
      case 'low': return `${pct(m.low)} of notes under 165 Hz`;
      case 'movement': { const h = OE.harmony(st), ch = h.chords; let s = 0; for (let i = 0; i < ch.length; i++) s += OT.movement(ch[i].notes, ch[(i + 1) % ch.length].notes); return `${(s / ch.length).toFixed(1)} semitones per change`; }
      case 'mutate': { const set = new Set(); for (let b = 0; b < 8; b++) set.add(R.events.filter(e => e.bar === b).map(e => (e.gt - b * 4).toFixed(2) + ':' + e.n).join(',')); return `${set.size} different bar${set.size > 1 ? 's' : ''} in 8`; }
      case 'delay': { const reps = st.delay > 0.01 ? Math.ceil(Math.log(0.06) / Math.log(Math.max(0.05, st.fb))) : 0; return `${m.density.toFixed(0)} notes a bar played${reps ? `, ~${Math.round(m.density * (1 + reps))} heard` : ''}`; }
    }
    return '';
  }
  function ruleState(rule, side) {
    const base = OB.stateFor(OB.BY_ID[rule.base]);
    const patch = rule[side].patch;
    return OE.normalize(Object.assign({}, base, patch, {name: `Rule ${OB.RULES.indexOf(rule) + 1} · ${side}: ${rule[side].label}`}));
  }
  function viewRules() {
    $('ruleList').innerHTML = OB.RULES.map((r, i) => {
      const a = ruleMeasure(r, ruleState(r, 'A')), b = ruleMeasure(r, ruleState(r, 'B'));
      return `<article class="rule"><span class="rn">${String(i + 1).padStart(2, '0')}</span><h3>${esc(r.title)}</h3><p>${esc(r.claim)}</p><div class="ab"><button class="A" type="button" data-rule="${i}" data-side="A"><b>${esc(r.A.label)}</b><small>${esc(a)}</small></button><button class="B" type="button" data-rule="${i}" data-side="B"><b>${esc(r.B.label)}</b><small>${esc(b)}</small></button></div></article>`;
    }).join('');
    $('ruleList').addEventListener('click', e => {
      const btn = e.target.closest('[data-rule]'); if (!btn) return;
      const r = OB.RULES[+btn.dataset.rule], side = btn.dataset.side;
      if (!S.aud) S.aud = {prev: snapshot()};
      const st = ruleState(r, side); st.ctx = S.st.ctx;
      S.st = st; refresh();
      togglePlay(true);
      $('auditionBar').hidden = false;
      $('auditionText').innerHTML = `Rule ${+btn.dataset.rule + 1}, <b>${side}</b>: ${esc(r[side].label)} · ${esc(ruleMeasure(r, st))}`;
      document.querySelectorAll('.rule .ab button').forEach(x => x.classList.toggle('on', x === btn));
    });
    $('auditionBack').addEventListener('click', () => { if (S.aud) { S.st = OE.normalize(JSON.parse(S.aud.prev)); S.aud = null; refresh(); } $('auditionBar').hidden = true; document.querySelectorAll('.rule .ab button').forEach(x => x.classList.remove('on')); });
    $('auditionKeep').addEventListener('click', () => { if (S.aud) { S.hist.push(S.aud.prev); S.aud = null; } $('auditionBar').hidden = true; viewTransport(); toast('Kept: undo goes back to your arp'); });
  }

  // ---------- genres ----------
  function viewGenres() {
    $('gcards').innerHTML = Object.entries(OB.GENRES).map(([id, g]) => {
      const count = OB.PATTERNS.filter(p => p.genre === id).length;
      const rngs = OE.AXES.map(a => { const t = g.target[a.id]; if (!t) return ''; const l = (t[0] - a.min) / (a.max - a.min) * 100, w = (t[1] - t[0]) / (a.max - a.min) * 100; return `<span>${a.short}</span><span class="rb"><i style="left:${l}%;width:${Math.max(2, w)}%"></i></span><span>${a.fmt(t[0])}–${a.fmt(t[1])}</span>`; }).join('');
      const snd = g.gen.sounds.map(s => OB.SOUNDS_BY_ID[s]?.name).filter(Boolean).join(', ');
      return `<article class="gcard" style="--c:${g.color}"><h3>${esc(g.name)}<small>${g.bpm[0]}–${g.bpm[1]} BPM · ${count} patterns</small></h3><p class="bl">${esc(g.blurb)}</p><p class="jb">${esc(g.job)}</p><ul>${g.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul><div class="rngs">${rngs}</div><p class="refs">Sounds: ${esc(snd)}</p><p class="refs">Progressions: ${g.progs.map(p => esc(p.p)).join(' · ')}</p><p class="refs">Perspectives: ${esc(g.refs)}</p><div class="ga"><button class="btn sm" data-gopen="${id}" type="button">Open in the bank</button><button class="btn sm ghost" data-gfind="${id}" type="button">✦ New ideas</button></div></article>`;
    }).join('');
    $('gcards').addEventListener('click', e => {
      const o = e.target.closest('[data-gopen]'), f = e.target.closest('[data-gfind]');
      if (o) { S.filter = o.dataset.gopen; viewBankTabs(); viewBank(); const first = visiblePatterns()[0]; if (first) loadPattern(first.id); $('studio').scrollIntoView({behavior: 'smooth'}); }
      if (f) { $('findGenre').value = f.dataset.gfind; $('find').scrollIntoView({behavior: 'smooth'}); runFind('new'); }
    });
  }

  // ---------- boot ----------
  function init() {
    // selects
    opt($('key'), OT.SHARP.map((_, i) => [i, OT.FLAT[i] === OT.SHARP[i] ? OT.SHARP[i] : OT.SHARP[i] + ' / ' + OT.FLAT[i]]));
    opt($('scale'), Object.entries(OT.SCALES).map(([k, v]) => [k, v.name]));
    opt($('rate'), Object.entries(OE.RATES).map(([k, v]) => [k, v.label]));
    opt($('pool'), Object.entries(OE.POOLS).map(([k, v]) => [k, v.name]));
    opt($('order'), Object.entries(OE.ORDERS).map(([k, v]) => [k, v.name]));
    opt($('evo'), Object.entries(OE.EVOS).map(([k, v]) => [k, v.name]));
    opt($('fill'), Object.entries(OE.FILLS).map(([k, v]) => [k, v.name]));
    opt($('groove'), Object.entries(OB.GROOVES).map(([k, v]) => [k, v.name]));
    opt($('bassPat'), Object.entries(OB.BASS).map(([k, v]) => [k, v.name]));
    opt($('findGenre'), Object.entries(OB.GENRES).map(([k, v]) => [k, v.name]));
    opt($('songForm'), Object.entries(OE.FORMS).map(([k, v]) => [k, v.name]), 'club');
    opt($('feel'), Object.entries(OE.FEELS).map(([k, v]) => [k, v.name]));
    opt($('echoShift'), Object.entries(OE.ECHO_SHIFTS));
    opt($('tlen'), [2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map(n => [n, n + ' notes']));
    $('smpSound').innerHTML = '<option value="">the current patch</option>' + OB.SOUNDS.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    opt($('smpNote'), Array.from({length: 73}, (_, i) => 24 + i).map(n => [n, OT.noteName(n) + (n === 60 ? " (Live's root)" : '')]), 60);
    const fams = [...new Set(OB.SOUNDS.map(s => s.family))];
    $('sound').innerHTML = fams.map(f => `<optgroup label="${esc(f)}">${OB.SOUNDS.filter(s => s.family === f).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
    $('stats').innerHTML = [[OB.PATTERNS.length, 'patterns', `${OB.PATTERNS.filter(p => p.genre === 'tech-house').length} tech house`], [Object.keys(OB.GENRES).length, 'genres', 'each measured'], [OB.SOUNDS.length, 'sounds', 'Serum 2 + Live recipes'], [Object.keys(OE.EVOS).length - 1, 'evolutions', 'exported as CC']].map(([n, l, s]) => `<div><dt>${l}</dt><dd>${n}<small>${esc(s)}</small></dd></div>`).join('');
    // first state: a shared link, the last session, or the bank's first tech house riff
    let st = null;
    const m = /#s=([\w-]+)/.exec(location.hash);
    if (m) { try { st = OE.unpack(m[1]); } catch (_) { st = null; } }
    if (!st) { const saved = store.get(KEY_NOW); if (saved) { try { st = OE.unpack(saved); } catch (_) { st = null; } } }
    if (!st) st = OB.stateFor(OB.BY_ID['tech-house-organ-bounce']);
    S.st = OE.normalize(st);
    S.filter = S.st.genre;
    $('findGenre').value = S.st.genre;
    bindControls();
    viewBankTabs(); viewRoleTabs(); viewBank();
    refresh();
    viewSoundBrowser();
    viewCands(); viewCrate(); viewRules(); viewGenres();
    // events
    $('play').addEventListener('click', () => togglePlay());
    $('fab').addEventListener('click', () => togglePlay());
    $('heroPlay').addEventListener('click', () => { togglePlay(); if (player.playing) $('studio').scrollIntoView({behavior: 'smooth'}); });
    $('heroFind').addEventListener('click', () => { $('find').scrollIntoView({behavior: 'smooth'}); runFind('new'); });
    $('genreTabs').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; S.filter = b.dataset.g; viewBankTabs(); viewBank(); });
    $('roleTabs').addEventListener('click', e => { const b = e.target.closest('[data-role]'); if (!b) return; S.role = b.dataset.role; viewRoleTabs(); viewBank(); });
    $('bankSort').addEventListener('change', () => { S.sort = $('bankSort').value; viewBank(); });
    $('sLen').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; S.sLen = b.dataset.v; viewSoundBrowser(); });
    $('sRole').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; S.sRole = b.dataset.v; viewSoundBrowser(); });
    $('sSearch').addEventListener('input', () => { S.sQ = $('sSearch').value; viewSoundBrowser(); });
    $('sList').addEventListener('click', e => {
      const h = e.target.closest('[data-hear]'); if (h) { e.stopPropagation(); previewSound(h.dataset.hear); return; }
      const r = e.target.closest('[data-s]'); if (!r) return;
      const x = OB.SOUNDS_BY_ID[r.dataset.s]; commit(Object.assign({sound: x.id}, x.fx || {}));
      toast(`${x.name}: ${x.len}, best for ${x.roles.map(k => OE.ROLES[k].name.toLowerCase()).join(' and ')}`);
    });
    $('search').addEventListener('input', () => { S.q = $('search').value; viewBank(); });
    $('plist').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) loadPattern(b.dataset.p); });
    $('undo').addEventListener('click', undo); $('redo').addEventListener('click', redo);
    $('saveBtn').addEventListener('click', toggleSave);
    $('abBtn').addEventListener('click', e => {
      if (e.shiftKey && S.A) { S.A = null; S.side = 'B'; toast('A cleared'); viewTransport(); return; }
      if (!S.A) { S.A = snapshot(); S.side = 'B'; toast('Stored as A. Edit freely, then press A/B to compare (Shift-click to clear).'); viewTransport(); return; }
      const cur = snapshot(); S.st = OE.normalize(JSON.parse(S.A)); S.A = cur; S.side = S.side === 'A' ? 'B' : 'A'; refresh(); toast('Now playing ' + S.side);
    });
    $('pocketSend').addEventListener('click', () => { $('pocketSend').href = 'pocket.html#orbit=' + OE.pack(S.st); });
    $('midiQuick').addEventListener('click', () => exportMidi(true));
    $('midiBtn').addEventListener('click', () => exportMidi(false));
    $('dragChip').addEventListener('dragstart', e => dragStart(e, true));
    $('dragChip2').addEventListener('dragstart', e => dragStart(e, false));
    $('wavArp').addEventListener('click', () => exportWav(true));
    $('wavMix').addEventListener('click', () => exportWav(false));
    $('shareBtn').addEventListener('click', share);
    $('smpPlay').addEventListener('click', () => busy($('smpPlay'), async () => { const smp = await renderOne(); playBuffer(smp.buf); }));
    $('smpDown').addEventListener('click', () => busy($('smpDown'), async () => { const smp = await renderOne(); download(OA.wav(smp.buf, {bits: smpFormat().bits, root: smp.note}), smp.name + '.wav', 'audio/wav'); toast('One-shot downloaded: drag it onto a MIDI track for Simpler'); }));
    $('msGo').addEventListener('click', () => busy($('msGo'), multisampleZip));
    $('packGo').addEventListener('click', () => busy($('packGo'), patchPack));
    $('stabGo').addEventListener('click', () => busy($('stabGo'), stabsZip));
    $('stabSet').addEventListener('change', viewSamples);
    $('stabList').addEventListener('click', async e => { const b = e.target.closest('[data-stab]'); if (!b) return; const c = stabChords()[+b.dataset.stab]; playBuffer(await stabBuffer(c)); });
    $('loopArp').addEventListener('click', () => busy($('loopArp'), () => loopWav(false)));
    $('loopMix').addEventListener('click', () => busy($('loopMix'), () => loopWav(true)));
    $('stemsGo').addEventListener('click', () => busy($('stemsGo'), stemsZip));
    $('expBars').addEventListener('change', () => { S.expTouched = true; });
    $('expName').addEventListener('change', () => commit({name: $('expName').value || 'Untitled arp'}));
    $('findBtn').addEventListener('click', () => runFind('new'));
    $('varyBtn').addEventListener('click', () => runFind('vary'));
    $('cands').addEventListener('click', e => {
      const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); const c = S.cands[+st.dataset.star]; const prev = S.st; S.st = OE.normalize(c.st); S.M.fit.score = c.fit; toggleSave(); S.st = prev; refresh(); return; }
      const c = e.target.closest('.cand'); if (c) audition(+c.dataset.c);
    });
    $('songForm').addEventListener('change', () => { viewSong(); if (player && player.song) { player.playSong(songList()); songButton(); } });
    $('songPlay').addEventListener('click', playSong);
    $('songMidi').addEventListener('click', songMidi);
    for (const id of ['songMap', 'songSecs']) $(id).addEventListener('click', e => { const t = e.target.closest('[data-si]'); if (t) songLoad(+t.dataset.si); });
    $('cands').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('cand')) { e.preventDefault(); audition(+e.target.dataset.c); } });
    $('crateList').addEventListener('click', e => {
      const l = e.target.closest('[data-cload]'), m = e.target.closest('[data-cmidi]'), d = e.target.closest('[data-cdel]');
      if (l) { const c = S.crate[+l.dataset.cload]; const st = OE.unpack(c.st); st.name = c.name; load(st); $('studio').scrollIntoView({behavior: 'smooth'}); }
      if (m) { const c = S.crate[+m.dataset.cmidi]; const st = OE.unpack(c.st); st.name = c.name; download(OE.exportMidi(st, {bars: st.bars, parts: {arp: true, chords: true, input: true}}), OE.fileStem(st) + '.mid', 'audio/midi'); }
      if (d) { S.crate.splice(+d.dataset.cdel, 1); saveCrate(); viewCrate(); viewTransport(); }
    });
    $('crateList').addEventListener('change', e => { const r = e.target.closest('[data-rename]'); if (r) { S.crate[+r.dataset.rename].name = r.value || 'Untitled arp'; saveCrate(); } });
    $('crateZip').addEventListener('click', crateZip);
    $('sessionOut').addEventListener('click', sessionOut);
    $('sessionInBtn').addEventListener('click', () => $('sessionIn').click());
    $('sessionIn').addEventListener('change', () => { const f = $('sessionIn').files[0]; if (f) openSession(f); $('sessionIn').value = ''; });
    $('roll').addEventListener('click', e => {
      if (!player || !player.playing) { togglePlay(true); return; }
      const r = $('roll').getBoundingClientRect(), x = e.clientX - r.left;
      const beat = clamp((x - RL.pad.l) / (RL.w - RL.pad.l - RL.pad.r), 0, 0.999) * S.R.beats;
      player.stop(); S.trail.length = 0; player.start(Math.floor(beat / 4) * 4);
    });
    addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { if (typing && tag === 'input' && e.target.type === 'text') return; e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') { if (tag === 'button' || e.target.getAttribute('role') === 'button') return; e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepPattern(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepPattern(-1); }
      else if (e.key === 'g' || e.key === 'G') runFind('new');
      else if (e.key === 'f' || e.key === 'F') toggleSave();
      else if (e.key === 'e' || e.key === 'E') exportMidi(true);
      else if (e.key === 'a' || e.key === 'A') $('abBtn').click();
    });
    let rz = 0;
    addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { drawRollLayer(); drawOrbit(player && player.playing ? player.beat() : null); }); });
    requestAnimationFrame(frame);
    window.ORBIT_QA = {S, refresh, viewSong, playSong, songMidi, songLoad, commit, load, runFind, audition, togglePlay, exportMidi, midiBytes, crateZip, applyImport, importFile, exportWav, toggleSave, midiIn, liveApply, autopilotStep, visiblePatterns, visibleSounds, previewSound, renderOne, stabsZip, multisampleZip, patchPack, loopWav, stemsZip, get orbitNodes() { return O.nodes; }, get player() { return player; }, get engine() { return engine; }};
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
