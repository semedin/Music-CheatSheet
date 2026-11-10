// Wow app: the page. State in, DOM out.
(() => {
  const W = WOW, $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const KEY = 'fieldwork-wow-1';
  let state = W.defaults();
  try { state = W.validate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const KEYS = Object.keys(W.defaults());
  const pack = s => btoa(unescape(encodeURIComponent(JSON.stringify(Object.fromEntries(KEYS.filter(k => k !== 'family').map(k => [k, s[k]])))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unpack = t => W.validate(JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))))));
  try { const m = /[#&]w=([\w-]+)/.exec(location.hash); if (m) { state = {...unpack(m[1]), family: state.family}; history.replaceState(null, '', location.pathname + location.search); } } catch {}
  const lane = () => W.styleById(state.style), idea = () => W.ideaFor(lane(), state.idea, state.seed, state.custom), style = () => W.withOptions(lane(), state, idea()), root = () => W.rootMidi(state.key);
  const sec = id => W.sectionFor(style(), idea(), id || state.section);
  const KNOBS = ['wow', 'drive', 'sub', 'tone', 'drums', 'swing', 'gate', 'pump', 'space'];
  const STARTS = []; { let n = 0; for (const s of W.SECTIONS) { STARTS.push(n); n += s.reps * W.BARS; } }
  const TOTAL = STARTS[STARTS.length - 1] + W.BARS;
  let mode = 'loop';
  const player = WowAudio.player(
    () => ({style: style(), bpm: state.bpm, root: root(), knobs: state}),
    () => mode === 'journey' ? {bars: W.journey(style(), idea()), loop: true} : {bars: sec().bars, loop: true});

  // ------------------------------------------------------------ style grid
  function mini(notes) {
    const semis = notes.map(n => n.semi), lo = Math.min(...semis), hi = Math.max(...semis), span = Math.max(1, hi - lo);
    return `<svg viewBox="0 0 128 34" preserveAspectRatio="none" aria-hidden="true">${[0, 16, 32, 48, 64, 80, 96, 112].map(x => `<line x1="${x}" x2="${x}" y1="0" y2="34"/>`).join('')}` +
      notes.map(n => `<rect class="${n.wow ? 'w' : ''}" x="${n.s * 4 + .4}" y="${(27 - (n.semi - lo) / span * 24).toFixed(1)}" width="${((n.short ? .55 : n.l) * 4 - .8).toFixed(1)}" height="5" rx="1.5"/>`).join('') + '</svg>';
  }
  function renderStyles() {
    const n = f => W.STYLES.filter(s => f === 'all' || s.family === f || s.era === f).length;
    $('family').innerHTML = [['all', 'All'], ['house', 'House'], ['techno', 'Techno'], ['now', 'Right now'], ['classic', 'Classics & revivals']].map(([id, label]) => [id, `${label} · ${n(id)}`]).map(([id, label]) => `<button data-family="${id}" aria-pressed="${state.family === id}">${label}</button>`).join('');
    $('styles').innerHTML = W.STYLES.filter(s => state.family === 'all' || s.family === state.family || s.era === state.family).map(s =>
      `<button class="style ${s.family}" role="listitem" data-style="${s.id}" aria-pressed="${s.id === state.style}"><span class="meta"><span>${esc(s.genre)}</span><span>${s.bpm}</span></span><b>${esc(s.name)}</b><small><i>${esc(s.year)}</i> · ${esc(s.lane)}</small>${mini(s.ideas[0].notes)}</button>`).join('');
  }

  // ------------------------------------------------------------------ deck
  function renderDeck() {
    const s = style(), id = idea();
    $('deck').className = 'deck ' + s.family;
    $('deck-genre').textContent = `${s.genre} · ${s.year} · ${s.bpm} BPM · ${s.family}`;
    $('deck-name').textContent = s.name; $('deck-idea').textContent = s.idea; $('deck-lane').textContent = 'In the lane of ' + s.lane + '.';
    $('ideas').innerHTML = s.ideas.map((x, i) => `<button data-idea="${i}" aria-pressed="${state.idea === i}">${esc(x.name)}</button>`).join('') +
      (state.custom ? `<button class="mine" data-idea="-2" aria-pressed="${state.idea === -2}">✎ Your loop</button>` : '') +
      `<button class="dice" data-idea="-1" aria-pressed="${state.idea === -1}" title="Write a new loop in this lane's grammar">⚄ New idea${state.idea === -1 ? ' #' + state.seed : ''}</button>`;
    const t = id.text.replace(/\|/g, ' ').trim().split(/\s+/), row = b => [0, 4, 8, 12].map(q => t.slice(b * 16 + q, b * 16 + q + 4).map(x => x.padEnd(4)).join('')).join('│ ');
    $('pattern').textContent = 'bar 1  ' + row(0) + '\nbar 2  ' + row(1) + '\n\n.  rest   -  hold   !  accent   ~  slide   w  wow   \'  short   g  ghost';
    $('bpm').value = state.bpm; $('key').value = state.key;
    const hzv = W.hz(root());
    $('hz').textContent = `${W.noteName(root())} = ${hzv.toFixed(1)} Hz · ${W.subVerdict(hzv)} · kick ${state.tune ? 'tuned to ' + W.noteName(root()) : 'at ' + s.kit.kick + ' Hz, the lane\'s own'}`;
    $('tune').checked = !!state.tune;
    $('why').innerHTML = s.why.map(x => `<li>${esc(x)}</li>`).join('');
    $('recipe').innerHTML = s.recipe.map(x => `<li>${esc(x)}</li>`).join('');
    $('sound-note').textContent = `Preview voice "${s.sound.name}": ${s.sound.osc.map(o => o.w).join(' + ')}${s.sound.fm ? ', FM' : ''}${s.sound.vowel ? `, formant filter saying "${s.sound.say}"` : ''}${s.sound.lfo ? ', filter wobble on 8ths' : ''}${s.sound.rumble ? ', kick reverb rumble' : ''}${s.sound.echo ? ', dotted-8th echo' : ''}${s.sound.width ? ', stereo spread above 300 Hz' : ''}; sidechain ${Math.round(s.kit.duck * 100)}%. A browser synth for judging the notes. Build the real one in your own synth.`;
    $('map').innerHTML = W.SECTIONS.map((x, i) => { const m = W.measure(s, sec(x.id), root()); return `<button data-section="${x.id}" class="${x.reps > 1 ? 'long' : ''}" aria-pressed="${x.id === state.section}" style="--e:${Math.round(m.energy * 100)}%"><span class="prog"></span><b>${i + 1} · ${x.name}</b><small>${x.reps * W.BARS} bars · ${m.perBar.toFixed(1)} notes/bar</small><i></i></button>`; }).join('');
    $('versions').tBodies[0].innerHTML = W.SECTIONS.map(x => {
      const sc = sec(x.id), m = W.measure(s, sc, root()), cuts = sc.bars.map(b => b.m.cut), pct = v => Math.round(v / 1.25 * 100) + '%';
      const subs = sc.bars.map(b => b.m.sub > 0), kicks = sc.bars.map(b => b.d.kick > 0), span = a => a.every(Boolean) ? 'on' : a.some(Boolean) ? (a[0] ? `out at bar ${a.indexOf(false) + 1}` : `in at bar ${a.indexOf(true) + 1}`) : 'off';
      return `<tr data-row="${x.id}" class="${x.id === state.section ? 'cur' : ''}"><td>${x.name}</td><td class="num">${x.reps * W.BARS}</td><td>${esc(sc.what[0])}</td><td class="num">${m.perBar.toFixed(1)}</td><td class="num">${pct(cuts[0])} → ${pct(cuts[7])}</td><td class="num">${span(subs)}</td><td class="num">${span(kicks)}</td></tr>`;
    }).join('');
    for (const k of KNOBS) { $(k).value = state[k]; $(k + '-o').textContent = state[k]; }
    $('sound').value = state.sound || state.style; $('move').value = state.move; $('brk').value = state.brk; $('fill').value = state.fill; $('accent').value = state.accent;
    renderEditor(); renderCrate();
    for (const b of document.querySelectorAll('.bankcard')) b.setAttribute('aria-pressed', state.idea === -2 && b.dataset.text === state.custom);
    $('recipe-title').textContent = state.sound && state.sound !== state.style ? `The sound this lane was written for (you are hearing “${s.sound.name}”)` : 'The sound';
    for (const b of document.querySelectorAll('.style')) b.setAttribute('aria-pressed', b.dataset.style === state.style);
    renderSection();
  }

  // ---------------------------------------------------------------- editor
  // Click a cell to add a note. Click a note to apply the tool. Every section rewrites itself.
  const EW = 1280, ETOP = 16, EROW = 13, EHI = 15, ELO = -5, ECOL = EW / W.LOOP;
  const TOOLS = [['draw', 'Add / remove'], ['long', 'Longer'], ['cut', 'Shorter'], ['short', "Short '"], ['acc', 'Accent !'], ['ghost', 'Ghost g'], ['wow', 'Wow w'], ['slide', 'Slide ~']];
  let tool = 'draw';
  function renderEditor() {
    const notes = idea().notes, kicks = lane().kit.kicks || W.KICK;
    $('tools').innerHTML = TOOLS.map(([id, label]) => `<button data-tool="${id}" aria-pressed="${tool === id}">${label}</button>`).join('') + `<button id="clear-loop" title="Back to the lane's first idea">Reset</button>`;
    let g = '';
    for (let s = 0; s < W.LOOP; s++) g += `<rect class="${kicks.includes(s % 16) ? 'k' : s % 2 ? 'o' : 'e'}" x="${s * ECOL}" y="${ETOP}" width="${ECOL}" height="${(EHI - ELO + 1) * EROW}"/>`;
    for (const semi of [0, 12, 7]) g += `<rect class="r${semi}" x="0" y="${ETOP + (EHI - semi) * EROW}" width="${EW}" height="${EROW}"/>`;
    for (let s = 0; s <= W.LOOP; s += 4) g += `<line class="${s % 16 ? 'beat' : 'bar'}" x1="${s * ECOL}" x2="${s * ECOL}" y1="0" y2="${ETOP + (EHI - ELO + 1) * EROW}"/>`;
    for (let b = 0; b < 8; b++) g += `<text x="${b * 4 * ECOL + 5}" y="11">${Math.floor(b / 4) + 1}.${b % 4 + 1}</text>`;
    g += `<text class="lab" x="${EW - 6}" y="${ETOP + (EHI - 0) * EROW + 10}" text-anchor="end">root</text><text class="lab" x="${EW - 6}" y="${ETOP + (EHI - 12) * EROW + 10}" text-anchor="end">octave</text><text class="lab" x="${EW - 6}" y="${ETOP + (EHI - 7) * EROW + 10}" text-anchor="end">fifth</text>`;
    notes.forEach((n, i) => {
      const x = n.s * ECOL + 1, w = (n.short ? .55 : n.l) * ECOL - 2, y = ETOP + (EHI - n.semi) * EROW + 1;
      if (n.slide && i) g += `<path class="sl" d="M${x - 6} ${ETOP + (EHI - notes[i - 1].semi) * EROW + EROW / 2} L${x + 5} ${y + EROW / 2}"/>`;
      g += `<rect class="n${n.wow ? ' w' : ''}${n.ghost ? ' g' : ''}" x="${x}" y="${y}" width="${w.toFixed(1)}" height="${EROW - 2}" rx="3"${n.acc ? ' stroke="#fff" stroke-width="2"' : ''}/>`;
    });
    $('edit').innerHTML = g;
  }
  function editAt(step, semi) {
    if (step < 0 || step >= W.LOOP || semi > EHI || semi < ELO) return;
    let notes = idea().notes.map(n => ({...n}));
    const hit = notes.find(n => n.semi === semi && n.s <= step && step < n.s + n.l);
    if (!hit) notes.push({s: step, l: 1, semi, acc: tool === 'acc', slide: tool === 'slide', wow: tool === 'wow', short: tool === 'short', ...(tool === 'ghost' ? {ghost: true, short: true} : {})});
    else if (tool === 'draw') { if (notes.length > 1) notes = notes.filter(n => n !== hit); }
    else if (tool === 'long') { const next = notes.find(n => n.s >= hit.s + hit.l); hit.short = false; delete hit.ghost; if (hit.s + hit.l < (next ? next.s : W.LOOP)) hit.l++; }
    else if (tool === 'cut') { if (hit.l > 1) hit.l--; else hit.short = true; }
    else if (tool === 'short') { hit.short = !hit.short; delete hit.ghost; if (hit.short) hit.l = 1; }
    else if (tool === 'ghost') { if (hit.ghost) { delete hit.ghost; hit.short = false; } else { hit.ghost = true; hit.short = true; hit.l = 1; } }
    else hit[tool] = !hit[tool];
    notes = W.normalize(notes);
    if (!notes.length) return;
    state.custom = W.unparse(notes); state.idea = -2; save(); renderDeck();
  }
  $('edit').addEventListener('click', e => {
    const r = $('edit').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * EW, y = (e.clientY - r.top) / r.height * (ETOP + (EHI - ELO + 1) * EROW);
    editAt(Math.floor(x / ECOL), EHI - Math.floor((y - ETOP) / EROW));
  });

  // ------------------------------------------------------------------ bank
  function renderBank() {
    $('bank').innerHTML = W.BANK.map(b => `<button class="bankcard" role="listitem" data-bank="${b.id}" data-text="${esc(W.unparse(b.notes))}" aria-pressed="false">${mini(b.notes)}<b>${esc(b.name)}</b><small>${esc(b.why)}</small><i>${esc(b.home)}</i></button>`).join('');
    $('sources').innerHTML = W.SOURCES.map(s => `<li><a href="${s.url}" rel="noopener" target="_blank">${esc(s.title)}</a>: ${esc(s.used)}.</li>`).join('');
  }

  // ----------------------------------------------------------------- crate
  const CRATE = 'fieldwork-wow-crate-1';
  const crate = () => { try { const c = JSON.parse(localStorage.getItem(CRATE) || '[]'); return Array.isArray(c) ? c.filter(x => x && typeof x.n === 'string' && typeof x.s === 'string').slice(0, 40) : []; } catch { return []; } };
  const putCrate = c => { try { localStorage.setItem(CRATE, JSON.stringify(c.slice(0, 40))); } catch {} };
  function renderCrate() {
    const c = crate(), now = pack(state);
    $('crate').innerHTML = c.length ? c.map((x, i) => `<li><button data-crate="${i}" aria-pressed="${x.s === now}">${esc(x.n)}</button><button data-uncrate="${i}" aria-label="Remove ${esc(x.n)} from the crate">×</button></li>`).join('') : '<li class="empty">Nothing saved yet. Save a setup you like and it stays in this browser.</li>';
  }
  const setupName = () => `${lane().name} · ${idea().name}${state.sound && state.sound !== state.style ? ' · ' + style().sound.name : ''} · ${W.NAMES[state.key]} ${state.bpm}`;

  // --------------------------------------------------------------- section
  const RW = 1280, RH = 330, PAD = 20, LANES = 62;
  function renderSection() {
    const s = style(), sc = sec(), info = W.SECTIONS.find(x => x.id === state.section), m = W.measure(s, sc, root());
    // One pitch range for all six sections, so the roll does not jump when you switch.
    let lo = 0, hi = 12; for (const x of W.SECTIONS) for (const n of sec(x.id).notes) { lo = Math.min(lo, n.semi); hi = Math.max(hi, n.semi); }
    const rows = hi - lo + 1, h = (RH - PAD - LANES) / rows, y = semi => PAD + (hi - semi) * h, sw = RW / (W.BARS * W.SPB);
    let g = '<defs><linearGradient id="wowgrad" x1="0" x2="1"><stop offset="0" stop-color="var(--a)"/><stop offset=".5" stop-color="var(--b)"/><stop offset="1" stop-color="var(--a)"/></linearGradient></defs>';
    for (let i = 0; i <= W.BARS * 4; i++) { const x = i * 4 * sw; g += `<line class="${i % 4 ? 'beat' : 'bar'}" x1="${x}" x2="${x}" y1="${i % 4 ? PAD : 0}" y2="${RH}"/>`; }
    for (let b = 0; b < W.BARS; b++) g += `<text x="${b * 16 * sw + 6}" y="13">${b + 1}</text>`;
    g += `<line class="root" x1="0" x2="${RW}" y1="${y(0) + h / 2}" y2="${y(0) + h / 2}"/>`;
    const nh = Math.max(4, Math.min(h - 1.5, 15));
    sc.notes.forEach((n, i) => {
      const x = n.t * sw, w = Math.max(3, (n.short ? .55 : n.l) * sw - 2), yy = y(n.semi) + (h - nh) / 2;
      if (n.slide && i) { const p = sc.notes[i - 1]; g += `<path class="sl" d="M${x - 5} ${y(p.semi) + h / 2} L${x + 5} ${yy + nh / 2}"/>`; }
      g += `<rect class="n${n.wow ? ' w' : ''}${n.ghost ? ' g' : ''}" x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="${nh.toFixed(1)}" rx="3"${n.vel >= 1 ? ' stroke="#fff" stroke-width="1.5"' : ''}><title>${W.noteName(root() + n.semi)}${n.wow ? ' · wow' : ''}${n.slide ? ' · slide' : ''}${n.ghost ? ' · ghost' : ''}</title></rect>`;
    });
    // Lanes under the notes: filter, sub, kick.
    const ly = RH - LANES;
    g += `<rect class="lane" x="0" y="${ly}" width="${RW}" height="${LANES}"/>`;
    sc.bars.forEach((b, i) => {
      const x = i * 16 * sw, fh = Math.min(1, b.m.cut / 1.3) * 22;
      g += `<rect class="cut" x="${x + 1}" y="${ly + 26 - fh}" width="${16 * sw - 2}" height="${fh}"/>`;
      if (b.m.sub > 0) g += `<rect class="subon" x="${x + 1}" y="${ly + 32}" width="${16 * sw - 2}" height="${4 + 6 * b.m.sub}" rx="2"/>`;
      for (const hit of W.drumBar(s, b)) if (hit.type === 'kick') g += `<rect class="kick" x="${x + hit.s * sw}" y="${ly + 48}" width="${sw - 2}" height="9" rx="2"/>`;
    });
    g += `<text x="6" y="${ly + 12}">FILTER</text><text x="6" y="${ly + 45}">SUB</text><text x="6" y="${ly + 61}" style="fill:#8f89a3">KICK</text>`;
    g += `<line id="head" x1="0" x2="0" y1="0" y2="${RH}" visibility="hidden"/>`;
    $('roll').innerHTML = g;
    $('sec-eyebrow').textContent = `Section ${W.SECTIONS.indexOf(info) + 1} of 6 · ${info.reps * W.BARS} bars`;
    $('sec-name').textContent = info.name; $('sec-role').textContent = info.role;
    $('sec-what').innerHTML = sc.what.map(x => `<li>${esc(x)}</li>`).join('');
    const kicked = sc.bars.reduce((a, b) => a + b.notes.filter(n => b.d.kick && n.s % 4 === 0 && n.s < b.d.cut).length, 0);
    const cell = (k, v, sub) => `<div><dt>${k}</dt><dd>${v}<small>${sub}</small></dd></div>`;
    $('measures').innerHTML = cell('Notes / bar', m.perBar.toFixed(1), `${m.notes} in 8 bars`) + cell('On a kick', kicked, kicked ? 'sidechain separates them' : 'the kick has its own space') +
      cell('Bass sounding', Math.round(m.gate * 100) + '%', 'of the time') + cell('Off the grid', Math.round(m.offbeat * 100) + '%', 'on odd 16ths') +
      cell('Pitches', m.pitches, `${W.noteName(m.lo)} to ${W.noteName(m.hi)}`) + cell('Gestures', m.wow + m.slides, `${m.wow} wow · ${m.slides} slide`);
    for (const b of document.querySelectorAll('#map button')) b.setAttribute('aria-pressed', b.dataset.section === state.section);
    for (const r of document.querySelectorAll('#versions tbody tr')) r.className = r.dataset.row === state.section ? 'cur' : '';
  }

  // ------------------------------------------------------------- transport
  function buttons() {
    const loop = player.playing && mode === 'loop', all = player.playing && mode === 'journey';
    $('play').textContent = loop ? '■ Stop' : '▶ Loop section'; $('play').classList.toggle('on', loop);
    $('journey').textContent = all ? '■ Stop' : '▶ Play the whole track'; $('journey').classList.toggle('on', all);
    $('hero-play').textContent = player.playing ? '■ Stop' : '▶ Drop it'; $('hero-play').classList.toggle('on', player.playing);
    if (!player.playing) { const h = $('head'); if (h) h.setAttribute('visibility', 'hidden'); for (const p of document.querySelectorAll('.prog')) p.style.width = '0'; $('pos').textContent = 'BAR 1 / 8'; }
  }
  function toggle(m) {
    if (player.playing && mode === m) player.stop();
    else { mode = m; player.start(m === 'journey' ? STARTS[W.SECTIONS.findIndex(x => x.id === state.section)] : 0); }
    buttons();
  }
  function setSection(id, fromPlayer) {
    if (state.section === id) return;
    state.section = id; save(); renderSection();
    if (!fromPlayer && player.playing && mode === 'journey') player.seek(STARTS[W.SECTIONS.findIndex(x => x.id === id)]);
  }
  function frame() {
    requestAnimationFrame(frame);
    scope();
    const now = player.now(); if (!now) return;
    let bar = now.pos % W.BARS, secIdx = W.SECTIONS.findIndex(x => x.id === state.section);
    if (mode === 'journey') {
      const pos = now.pos % TOTAL; secIdx = STARTS.findLastIndex(s => s <= pos); bar = (pos - STARTS[secIdx]) % W.BARS;
      setSection(W.SECTIONS[secIdx].id, true);
      const len = W.SECTIONS[secIdx].reps * W.BARS;
      document.querySelectorAll('.prog').forEach((p, i) => { p.style.width = i === secIdx ? ((pos - STARTS[secIdx] + now.frac) / len * 100).toFixed(1) + '%' : '0'; });
      $('pos').textContent = `${W.SECTIONS[secIdx].name.toUpperCase()} · BAR ${pos + 1} / ${TOTAL}`;
    } else $('pos').textContent = `BAR ${bar + 1} / ${W.BARS}`;
    const h = $('head'), x = (bar + now.frac) / W.BARS * RW;
    if (h) { h.setAttribute('x1', x); h.setAttribute('x2', x); h.setAttribute('visibility', 'visible'); }
  }

  // ----------------------------------------------------------------- scope
  const cv = $('scope'), cx = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let buf = null, phase = 0, drawn = false;
  function scope() {
    const playing = player.playing && player.rig && player.rig.analyser;
    if (!playing && drawn && still) return;
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h);
    const N = 220, ys = new Float32Array(N);
    if (playing) {
      const an = player.rig.analyser; if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(buf);
      for (let i = 0; i < N; i++) ys[i] = buf[Math.floor(i / N * buf.length * .8)] * 1.5;
    } else {
      phase += still ? 0 : .012;
      for (let i = 0; i < N; i++) { const x = i / N; ys[i] = Math.sin(x * 9 + phase * 2) * Math.sin(x * Math.PI) * .32 * (.6 + .4 * Math.sin(x * 2.3 - phase)); }
    }
    const grad = cx.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#ff3d8b'); grad.addColorStop(.45, '#ffb23d'); grad.addColorStop(.7, '#c6ff3d'); grad.addColorStop(1, '#3de1ff');
    cx.strokeStyle = grad; cx.lineJoin = 'round';
    for (let k = 0; k < 7; k++) {
      cx.globalAlpha = .5 - k * .065; cx.lineWidth = k === 0 ? 2.5 : 1.2; cx.beginPath();
      for (let i = 0; i < N; i++) { const x = i / (N - 1) * w, yy = h * .42 + ys[i] * h * (.42 - k * .035) + k * 13; i ? cx.lineTo(x, yy) : cx.moveTo(x, yy); }
      cx.stroke();
    }
    cx.globalAlpha = 1; drawn = true;
  }

  // --------------------------------------------------------------- exports
  function download(bytes, name, type) {
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([bytes], {type}));
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const fileName = (part, ext) => `wow-${state.style}-${idea().name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${part}-${W.NAMES[state.key].replace('♯', 's')}-${state.bpm}bpm.${ext}`;
  const barsFor = all => all ? W.journey(style(), idea()) : sec().bars;
  function exportMidi(all) {
    download(W.midi(style(), barsFor(all), {root: root(), bpm: state.bpm, drums: $('with-drums').checked, name: `Wow: ${style().name} (${idea().name})`}), fileName(all ? 'track' : state.section, 'mid'), 'audio/midi');
    $('export-note').textContent = `Saved ${all ? '64 bars with section markers' : 'the ' + state.section + ' section'}. Straight grid; the preview swings its 16ths ${state.swing}%, so add groove to taste.`;
  }
  async function renderWav(all, btn) {
    const label = btn.textContent; btn.disabled = true; btn.textContent = 'Rendering…';
    try {
      const out = await WowAudio.render(style(), barsFor(all), {bpm: state.bpm, root: root(), knobs: {...state, drums: $('with-drums').checked ? state.drums : 0}});
      download(W.wav(out.getChannelData(0), out.getChannelData(1), out.sampleRate), fileName(all ? 'track' : state.section, 'wav'), 'audio/wav');
      $('export-note').textContent = `Rendered ${(out.length / out.sampleRate).toFixed(1)} s at ${out.sampleRate / 1000} kHz, cut exactly on the bar line so it loops.`;
    } catch (e) { $('export-note').textContent = 'Could not render audio in this browser: ' + e.message; }
    btn.disabled = false; btn.textContent = label;
  }

  // ---------------------------------------------------------------- events
  $('key').innerHTML = W.NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.family) { state.family = b.dataset.family; save(); renderStyles(); }
    else if (b.dataset.style) {
      const first = b.dataset.style !== state.style; state.style = b.dataset.style;
      if (first) { const s = lane(); state.bpm = s.bpm; state.key = s.key; state.idea = 0; state.swing = Math.round(s.swing * 100); state.sound = ''; state.move = state.brk = state.fill = state.accent = 'auto'; }
      save(); renderDeck();
      if (!player.playing) { mode = 'loop'; player.start(0); buttons(); }
      if (first && innerWidth < 980) $('deck').scrollIntoView({block: 'start'});
    }
    else if (b.dataset.bank) {
      state.custom = b.dataset.text; state.idea = -2; save(); renderDeck();
      if (!player.playing) { mode = 'loop'; player.start(0); buttons(); }
      $('export-note').textContent = `"${b.querySelector('b').textContent}" is now your loop on ${lane().name}. Edit it below, or pick another lane to hear it there.`;
    }
    else if (b.dataset.tool) { tool = b.dataset.tool; renderEditor(); }
    else if (b.dataset.crate != null) { const c = crate()[+b.dataset.crate]; if (c) { try { state = {...unpack(c.s), family: state.family}; } catch {} save(); renderStyles(); renderDeck(); } }
    else if (b.dataset.uncrate != null) { const c = crate(); c.splice(+b.dataset.uncrate, 1); putCrate(c); renderCrate(); }
    else if (b.dataset.idea != null) { const i = +b.dataset.idea; if (i === -1) state.seed = state.idea === -1 ? state.seed + 1 : state.seed; state.idea = i; save(); renderDeck(); }
    else if (b.dataset.section) setSection(b.dataset.section);
  });
  $('play').onclick = () => toggle('loop'); $('journey').onclick = () => toggle('journey');
  $('hero-play').onclick = () => { if (player.playing) { player.stop(); buttons(); } else { state.section = 'drop1'; renderSection(); toggle('loop'); } };
  $('bpm').onchange = () => { state.bpm = W.validate({...state, bpm: $('bpm').value}).bpm; save(); renderDeck(); };
  $('sound').innerHTML = ['house', 'techno'].map(f => `<optgroup label="${f === 'house' ? 'House voices' : 'Techno voices'}">${W.STYLES.filter(s => s.family === f).map(s => `<option value="${s.id}">${esc(s.sn)} (${esc(s.name)})</option>`).join('')}</optgroup>`).join('') +
    `<optgroup label="More voices">${W.SOUNDS.filter(s => s.extra).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`;
  const options = (id, map) => { $(id).innerHTML = Object.entries(map).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(''); };
  options('move', W.MOVE_NAMES); options('brk', W.BREAKS); options('fill', W.FILL_NAMES); options('accent', W.ACCENT_NAMES);
  $('tune').onchange = () => { state.tune = $('tune').checked ? 1 : 0; save(); renderDeck(); };
  $('sound').onchange = () => { state.sound = $('sound').value === state.style ? '' : $('sound').value; save(); renderDeck(); };
  for (const k of ['move', 'brk', 'fill', 'accent']) $(k).onchange = () => { state[k] = $(k).value; save(); renderDeck(); };
  $('surprise').onclick = () => {
    const pick = a => a[Math.floor(Math.random() * a.length)], s = pick(W.STYLES);
    Object.assign(state, {style: s.id, bpm: s.bpm, key: s.key, swing: Math.round(s.swing * 100), idea: pick([0, 1, 2, -1]), seed: 1 + Math.floor(Math.random() * 999), sound: '', move: 'auto', brk: 'auto', fill: 'auto', accent: 'auto', family: 'all'});
    save(); renderStyles(); renderDeck(); if (!player.playing) { mode = 'loop'; player.start(0); buttons(); }
  };
  $('key').onchange = () => { state.key = +$('key').value; save(); renderDeck(); };
  for (const k of KNOBS) $(k).oninput = () => { state[k] = +$(k).value; $(k + '-o').textContent = state[k]; save(); player.knobs(); };
  $('crate-save').onclick = () => { const c = crate().filter(x => x.s !== pack(state)); c.unshift({n: setupName(), s: pack(state)}); putCrate(c); renderCrate(); };
  $('share').onclick = async () => {
    const url = location.href.split('#')[0] + '#w=' + pack(state);
    try { await navigator.clipboard.writeText(url); $('export-note').textContent = 'Link copied. It opens this exact lane, loop, sound and settings.'; }
    catch { $('export-note').innerHTML = `Copy this link: <a href="${esc(url)}">${esc(url.slice(0, 60))}…</a>`; }
  };
  document.addEventListener('click', e => { if (e.target.id === 'clear-loop') { state.idea = 0; state.custom = ''; save(); renderDeck(); } });
  $('midi-sec').onclick = () => exportMidi(false); $('midi-all').onclick = () => exportMidi(true);
  $('wav-sec').onclick = e => renderWav(false, e.currentTarget); $('wav-all').onclick = e => renderWav(true, e.currentTarget);
  addEventListener('keydown', e => {
    if (e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') { if (e.target.closest('button,a')) return; e.preventDefault(); toggle(mode); }
    else if (/^[1-6]$/.test(e.key)) setSection(W.SECTIONS[+e.key - 1].id);
  });
  renderStyles(); renderBank(); renderDeck(); buttons(); requestAnimationFrame(frame);
  window.WOW_QA = {get state() { return state; }, player, style, idea, sec, get mode() { return mode; }};
})();
