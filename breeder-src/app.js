// ---------- Breeder: the page ----------
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STORE = 'fieldwork.breeder.v1';
const S = {genre: 'techno', gens: [], cur: 0, favs: new Set(), keepers: [], selId: null, playId: null, strength: 'bold', drift: 0.2, keepParents: true, locks: new Set(), mix: {}, seed: 1, byId: new Map()};
const A = {ctx: null, out: null, eng: null, pl: null, plan: null, vol: 0.8};
const meas = new Map(), rends = new Map();

function toast(m, ms = 2800) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); }
function download(name, data, type) { const b = data instanceof Blob ? data : new Blob([data], {type}), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const safe = s => String(s || '').replace(/[^\w\- ()]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50) || 'groove';
const genOf = id => OB.GENRES[id] || OB.GENRES.techno;
const M = gm => { if (!meas.has(gm.id)) meas.set(gm.id, gm.measured && gm.measured.reads ? gm.measured : TB.measure(gm, R(gm))); return meas.get(gm.id); };
const R = gm => { if (!rends.has(gm.id)) rends.set(gm.id, TB.render(gm)); return rends.get(gm.id); };
const curGen = () => S.gens[S.cur];
const members = () => curGen() ? curGen().members : [];
const sel = () => S.byId.get(S.selId) || members()[0];
function index(gms) { for (const g of gms) S.byId.set(g.id, g); }

// ---------- persistence ----------
function save() {
  clearTimeout(save.t);
  save.t = setTimeout(() => {
    try {
      const strip = g => { const c = Object.assign({}, g); delete c.measured; return c; };
      const j = {v: 1, genre: S.genre, gens: S.gens.slice(-40).map(g => ({members: g.members.map(strip), parents: g.parents || [], genre: g.genre})), cur: Math.min(S.cur, Math.min(S.gens.length, 40) - 1), favs: [...S.favs], keepers: S.keepers.map(strip),
        strength: S.strength, drift: S.drift, keepParents: S.keepParents, locks: [...S.locks], seed: S.seed, selId: S.selId};
      localStorage.setItem(STORE, JSON.stringify(j));
    } catch (_) {}
  }, 300);
}
function apply(j) {
  if (!j || j.v !== 1 || !Array.isArray(j.gens) || !j.gens.length) throw Error('That isn\'t a Breeder family.');
  const gens = j.gens.map(g => ({members: (g.members || []).filter(TB.validate), parents: g.parents || [], genre: g.genre})).filter(g => g.members.length);
  if (!gens.length) throw Error('That family has no valid grooves.');
  S.gens = gens; S.cur = clamp(j.cur | 0, 0, gens.length - 1); S.genre = OB.GENRES[j.genre] ? j.genre : 'techno'; S.favs = new Set(j.favs || []); S.keepers = (j.keepers || []).filter(TB.validate);
  S.strength = ['gentle', 'bold', 'wild'].includes(j.strength) ? j.strength : 'bold'; S.drift = clamp(+j.drift || 0, 0, 1); S.keepParents = j.keepParents !== false; S.locks = new Set(j.locks || []); S.seed = (j.seed | 0) || 1;
  S.byId = new Map(); meas.clear(); rends.clear();
  for (const g of S.gens) index(g.members); index(S.keepers);
  S.selId = S.byId.has(j.selId) ? j.selId : members()[0].id;
}
function restore() { try { const j = JSON.parse(localStorage.getItem(STORE) || 'null'); if (!j) return false; apply(j); return true; } catch (_) { return false; } }

// ---------- audio ----------
function ensureAudio() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; A.ctx = new C({latencyHint: 'interactive'});
  A.out = A.ctx.createGain(); A.out.gain.value = A.vol; A.out.connect(A.ctx.destination);
  A.eng = TA.create(A.ctx, {destination: A.out}); A.pl = TA.player(A.ctx, A.eng);
  A.pl.onswap = () => { ui(); };
}
const playing = () => !!(A.pl && A.pl.playing);
function hear(gm, {start = true} = {}) {
  ensureAudio();
  S.playId = gm.id; S.selId = gm.id;
  A.plan = TB.plan(gm, {mix: S.mix}); const opts = {kickHz: TA.kickFor({pc: gm.key})};
  if (playing()) A.pl.swap(A.plan, opts);
  else if (start) { A.eng.load(A.plan, opts); A.pl.setLoop([0, TB.LOOP_BEATS]); A.pl.play(0); }
  renderPop(); renderDetail(); ui(); save();
}
function stop() { if (A.pl) A.pl.stop(); ui(); renderPop(); }
function togglePlay() { if (playing()) stop(); else { const g = S.byId.get(S.playId) || sel(); if (g) hear(g); } }

// ---------- breeding ----------
function newFamily(genre, {play = false} = {}) {
  S.genre = genre; S.seed++;
  const pop = TB.seed(genre, 8, S.seed);
  S.gens.push({members: pop, parents: [], genre}); S.cur = S.gens.length - 1; S.favs.clear(); index(pop);
  S.selId = pop[0].id; S.mix = {};
  showLab(); renderAll();
  if (play || playing()) hear(pop[0]);
  save();
}
function favGenomes() { return [...S.favs].map(id => S.byId.get(id)).filter(Boolean); }
function breed() {
  const favs = favGenomes();
  if (!favs.length) { toast('Star at least one groove first (★ on a card, or S).'); return; }
  S.seed++;
  const t = performance.now();
  const kids = TB.breed(favs, {strength: S.strength, drift: S.drift, locks: [...S.locks], keepParents: S.keepParents, seed: S.seed});
  for (const k of kids) if (k.measured) meas.set(k.id, k.measured);
  S.gens.push({members: kids, parents: favs.map(f => f.id), genre: S.genre}); S.cur = S.gens.length - 1; S.favs.clear(); index(kids);
  const first = kids.find(k => !k.elite) || kids[0];
  S.selId = first.id;
  renderAll();
  if (playing()) hear(first);
  toast(`Generation ${S.gens.length}: ${kids.filter(k => !k.elite).length} children of ${favs.map(f => f.name).join(' × ')}, nearest first (${Math.round(performance.now() - t)} ms).`, 3600);
  save();
}
function fresh() {
  const keep = members().filter(m => S.favs.has(m.id));
  S.seed++;
  const blood = TB.seed(S.genre, 8 - keep.length, S.seed).map(g => Object.assign(g, {gen: (curGen() ? Math.max(...members().map(m => m.gen)) : 0) + 1}));
  const next = [...keep.map(k => Object.assign(TB.clone(k), {elite: true})), ...blood];
  S.gens.push({members: next, parents: keep.map(k => k.id), genre: S.genre}); S.cur = S.gens.length - 1; S.favs.clear(); index(next);
  S.selId = next[0].id; renderAll(); save();
  toast(`${blood.length} new grooves from ${genOf(S.genre).name}${keep.length ? `, next to your ${keep.length} starred` : ''}.`);
}
function toggleFav(gm) { if (S.favs.has(gm.id)) S.favs.delete(gm.id); else S.favs.add(gm.id); renderPop(); renderKeepers(); ui(); save(); }
function toggleKeep(gm) {
  const i = S.keepers.findIndex(k => k.id === gm.id);
  if (i >= 0) S.keepers.splice(i, 1); else { S.keepers.push(TB.clone(gm)); toast(`${gm.name} kept.`); }
  renderPop(); renderKeepers(); renderDetail(); save();
}

// ---------- drawing a groove ----------
const DEG = {x: 'R', X: 'R', o: '8', O: '8', 5: '5', 3: '3', 7: '7'};
function drawGroove(cv, gm, {big = false} = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 84;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const rd = R(gm), lanes = TB.LK.filter(l => /[xXg]/.test(gm.drums[l])), color = genOf(gm.genre).color;
  const left = big ? 78 : 0, w = W - left, dh = big ? H * 0.42 : H * 0.42, lh = dh / Math.max(1, lanes.length), bh = big ? H * 0.12 : H * 0.14, ry = dh + bh + (big ? 10 : 4), rh = H - ry - 2;
  const LC = {k: '#FF4B32', c: '#FF8A2B', h: '#FFC531', o: '#F2D06B', s: '#E8D48B', r: '#C9A86A', t: '#E07B39', b: '#B88A5A'};
  // bar lines
  // drums and bass are two-bar lines: drawn twice, so the time axis matches the four-bar riff below
  const X64 = i => left + i / 64 * w;
  g.fillStyle = '#ffffff0d'; for (let i = 0; i <= 64; i += 4) g.fillRect(X64(i), 0, 1, dh + bh);
  g.fillStyle = '#ffffff24'; for (let i = 16; i < 64; i += 16) g.fillRect(X64(i), 0, 1, H);
  lanes.forEach((l, j) => {
    const s = gm.drums[l], y = j * lh;
    if (big) { g.fillStyle = '#82938B'; g.font = '500 11px "IBM Plex Mono", monospace'; g.textBaseline = 'middle'; g.fillText(TB.LANES[l].name, 4, y + lh / 2); }
    for (let i = 0; i < 64; i++) { const c = s[i % 32]; if (c === '.') continue; g.fillStyle = LC[l]; g.globalAlpha = c === 'X' ? 1 : c === 'g' ? 0.4 : 0.8; g.fillRect(X64(i) + 0.5, y + lh * 0.18, Math.max(1, w / 64 - 1), lh * 0.64); }
    g.globalAlpha = 1;
  });
  // bass: degrees
  const bs = gm.bass.steps, by = dh + 3;
  if (big) { g.fillStyle = '#82938B'; g.font = '500 11px "IBM Plex Mono", monospace'; g.fillText('Bass', 4, by + bh / 2); }
  for (let i = 0; i < 64; i++) {
    const c = bs[i % 32]; if (c === '.') continue; const x = X64(i), sw = w / 64;
    if (c === '-') { g.fillStyle = '#E07B3988'; g.fillRect(x - 1, by + bh * 0.42, sw + 1, bh * 0.16); continue; }
    g.fillStyle = '#E07B39'; g.fillRect(x + 0.5, by + bh * 0.15, Math.max(1, sw - 1), bh * 0.7);
    if (big && sw > 11) { g.fillStyle = '#0c1110'; g.font = '700 9.5px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText(DEG[c] || '', x + sw / 2, by + bh / 2 + 0.5); g.textAlign = 'left'; }
  }
  // riff (and chords): four bars as a piano roll
  const riff = rd.parts.find(p => p.key === 'riff'), pad = rd.parts.find(p => p.key === 'pad');
  const all = [...(riff ? riff.notes : []), ...(pad ? pad.notes : [])]; if (!all.length) return;
  const lo = Math.min(...all.map(n => n.n)) - 1, hi = Math.max(...all.map(n => n.n)) + 1, Y = n => ry + rh - (n - lo) / (hi - lo) * rh, X = t => left + t / TB.LOOP_BEATS * w;
  g.fillStyle = '#ffffff0d'; for (let b = 0; b <= 4; b++) g.fillRect(X(b * 4), ry, 1, rh);
  if (big) { g.fillStyle = '#82938B'; g.font = '500 11px "IBM Plex Mono", monospace'; g.fillText('Riff', 4, ry + 10); if (pad) g.fillText('+ chords', 4, ry + 24); }
  if (pad) { g.fillStyle = '#7C9CFF55'; for (const n of pad.notes) g.fillRect(X(n.t), Y(n.n) - 1.5, Math.max(1, X(n.t + n.d) - X(n.t) - 1), 3); }
  g.fillStyle = color;
  const nh = big ? 6 : 4, nw = big ? 4 : 1.5;
  for (const n of riff ? riff.notes : []) { g.globalAlpha = 0.45 + 0.55 * n.v / 127; g.fillRect(X(n.t), Y(n.n) - nh / 2, Math.max(nw, X(n.t + n.d) - X(n.t) - 0.5), nh); }
  g.globalAlpha = 1;
}

// ---------- rendering the page ----------
function renderGenres() {
  $('#genres').innerHTML = Object.entries(OB.GENRES).map(([id, g]) => `<button class="genre" type="button" role="listitem" data-genre="${id}" style="--c:${g.color}" aria-pressed="${S.genre === id}" title="${esc(g.blurb)}"><b>${esc(g.name)}</b><small>${g.bpm[0]}–${g.bpm[1]} BPM · ${esc(OB.GROOVES[g.groove].name)}</small></button>`).join('');
}
function renderPop() {
  const ms = members(), gi = S.cur + 1;
  $('#genTitle').textContent = `Generation ${gi}`;
  const pn = curGen().parents.map(id => (S.byId.get(id) || {}).name).filter(Boolean);
  $('#genSub').innerHTML = pn.length ? `Children of <b>${esc(pn.join(' × '))}</b>, nearest first. ` : `The first grooves of a <b>${esc(genOf(curGen().genre).name)}</b> family. `;
  $('#genNav').textContent = `${gi} / ${S.gens.length}`; $('#back').disabled = S.cur === 0; $('#fwd').disabled = S.cur >= S.gens.length - 1;
  $('#pop').innerHTML = ms.map((gm, i) => {
    const m = M(gm), rd = m.reads[0], fav = S.favs.has(gm.id), kept = S.keepers.some(k => k.id === gm.id);
    const d = gm.distance != null ? `<span class="tag" title="How different it sounds from its first parent">${Math.round(gm.distance * 100)}% new</span>` : gm.elite ? '<span class="tag">parent</span>' : '';
    const why = gm.log && gm.log.length ? gm.log.filter(l => l.startsWith('Mutation')).map(l => l.replace(/^Mutation: /, '').replace(/\.$/, '')).join(' · ') || gm.log[0] : '';
    return `<div class="card${S.playId === gm.id && playing() ? ' playing' : ''}${S.selId === gm.id ? ' sel' : ''}${fav ? ' fav' : ''}" role="listitem" data-id="${gm.id}" tabindex="0" aria-label="${esc(gm.name)}, groove ${i + 1}">
      <div class="top"><span class="ix">${i + 1}</span><span class="nm" title="${esc(gm.name)}">${esc(gm.name)}</span><button type="button" class="ic star" aria-pressed="${fav}" title="Star: breed from it (S)">★</button><button type="button" class="ic heart" aria-pressed="${kept}" title="Keep (K)">♥</button></div>
      <canvas aria-hidden="true"></canvas>
      <div class="fitbar" title="Genre fit ${m.fit}"><i style="width:${m.fit}%"></i></div>
      <div class="meta"><span class="chip" style="--c:${rd.color}" title="Reads as ${esc(rd.name)} (${rd.score})">${esc(rd.name)}</span><span>fit ${m.fit}</span><span>${gm.bpm} BPM</span>${d}</div>
      <div class="why">${esc(why)}</div></div>`;
  }).join('');
  $$('#pop .card').forEach(el => { const gm = S.byId.get(el.dataset.id); drawGroove(el.querySelector('canvas'), gm); });
}
function renderDetail() {
  const gm = sel(); if (!gm) return;
  $('#detail').hidden = false;
  const m = M(gm), g = genOf(gm.genre);
  $('#dName').textContent = gm.name;
  $('#dSub').innerHTML = `${esc(g.name)} family · ${gm.bpm} BPM · swing ${gm.swing}% · ${esc(OT.keyLabel(gm.key, gm.scale))} · chords ${esc(gm.prog)}${gm.pad !== 'off' ? ` (${gm.pad === 'pad' ? 'held' : 'stabs'})` : ''} · riff on ${esc((OB.SOUNDS_BY_ID[gm.riff.sound] || {}).name || gm.riff.sound)}`;
  drawGroove($('#dCv'), gm, {big: true});
  const rd = R(gm), keys = rd.parts.map(p => p.key);
  $('#mixer').innerHTML = keys.map(k => `<button type="button" data-k="${k}" aria-pressed="${!(S.mix[k] && S.mix[k].mute)}">${esc((rd.parts.find(p => p.key === k) || {}).name || k)}</button>`).join('');
  $('#scores').innerHTML = `<div><small>Genre fit</small><b>${m.fit}</b></div><div><small>Riff · drums · bass</small><b>${m.riff}·${m.drums}·${m.bass}</b></div><div><small>${gm.distance != null ? 'New against its parent' : 'Generation'}</small><b>${gm.distance != null ? Math.round(gm.distance * 100) + '%' : gm.gen}</b></div>
    <div class="reads">Reads as ${m.reads.map(r => `<span class="chip" style="--c:${r.color}">${esc(r.name)} ${r.score}</span>`).join(' ')}</div>`;
  $('#log').innerHTML = (gm.log || []).map(l => `<li>${esc(l)}</li>`).join('') || '<li>No history.</li>';
  const AX = {density: 'Notes a bar', sync: 'Syncopation', kick: 'On the kick', range: 'Range (st)', leap: 'Leap (st)', length: 'Note length', swing: 'Swing'};
  $('#axes').innerHTML = m.axes.map(a => { const ax = OE.AXES.find(x => x.id === a.id) || {min: 0, max: 1}, P = v => clamp((v - ax.min) / ((ax.max - ax.min) || 1) * 100, 0, 100); return `<div class="axis${a.ok ? '' : ' out'}" title="${esc(a.na || (a.ok ? 'in the genre\'s range' : `the genre wants ${a.lo}–${a.hi}`))}"><small>${esc(AX[a.id] || a.id)}</small><div class="tr"><i style="left:${P(a.lo ?? ax.min)}%;width:${Math.max(1, P(a.hi ?? ax.max) - P(a.lo ?? ax.min))}%"></i><b style="left:calc(${P(a.v)}% - 1px)"></b></div><span>${typeof a.v === 'number' ? (Math.abs(a.v) < 10 ? a.v.toFixed(1) : Math.round(a.v)) : '–'}</span></div>`; }).join('');
  $('#xKeep').textContent = S.keepers.some(k => k.id === gm.id) ? '♥ Kept' : '♥ Keep';
}
function renderTree() {
  const svg = $('#tree'), G = S.gens, colW = 92, rowH = 30, top = 26, H = top + 8 * rowH + 12, W = Math.max(svg.parentNode.clientWidth - 32, 40 + G.length * colW);
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const pos = new Map();
  G.forEach((gen, gi) => gen.members.forEach((m, i) => { if (!pos.has(m.id)) pos.set(m.id, {x: 36 + gi * colW, y: top + 12 + i * rowH, gi}); }));
  let s = '';
  G.forEach((gen, gi) => { const x = 36 + gi * colW; s += `<text x="${x}" y="14" fill="${gi === S.cur ? '#B8FF5C' : '#82938B'}" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle">${gi + 1}</text>`; if (gi === S.cur) s += `<rect x="${x - 18}" y="20" width="36" height="${H - 24}" rx="8" fill="#B8FF5C10"/>`; });
  const parentsUsed = new Set(G.flatMap(g => g.parents || []));
  G.forEach((gen, gi) => gen.members.forEach((m, i) => {
    const p = {x: 36 + gi * colW, y: top + 12 + i * rowH};
    for (const pid of m.elite ? [] : m.parents || []) { const q = pos.get(pid); if (q && q.gi < gi) s += `<path d="M${q.x + 7},${q.y} C${(q.x + p.x) / 2},${q.y} ${(q.x + p.x) / 2},${p.y} ${p.x - 7},${p.y}" stroke="#ffffff30" fill="none"/>`; }
    if (m.elite) { const q = pos.get(m.id); if (q && q.gi < gi) s += `<path d="M${q.x + 7},${q.y} L${p.x - 7},${p.y}" stroke="#FF5FA255" stroke-dasharray="3 3" fill="none"/>`; }
  }));
  G.forEach((gen, gi) => gen.members.forEach((m, i) => {
    const x = 36 + gi * colW, y = top + 12 + i * rowH, c = (M(m).reads[0] || {}).color || '#888', par = parentsUsed.has(m.id), on = S.playId === m.id;
    s += `<g class="node" data-id="${m.id}" data-g="${gi}" style="cursor:pointer"><title>${esc(m.name)} · reads as ${esc(M(m).reads[0].name)} · fit ${M(m).fit}</title><circle cx="${x}" cy="${y}" r="${on ? 9 : 7}" fill="${c}" stroke="${par ? '#FF5FA2' : on ? '#fff' : '#0C1110'}" stroke-width="${par || on ? 2.5 : 1.5}"/></g>`;
  }));
  svg.innerHTML = s;
}
function renderKeepers() {
  $('#keepSec').hidden = false;
  $('#keepers').innerHTML = S.keepers.length ? S.keepers.map(k => `<div class="keeper" style="--c:${genOf(k.genre).color}" data-id="${k.id}"><b title="${esc(k.name)}">${esc(k.name)}</b><small>${esc(genOf(k.genre).name)} · gen ${k.gen}</small><button type="button" data-a="play" title="Hear it">▶</button><button type="button" data-a="star" aria-pressed="${S.favs.has(k.id)}" title="Star it as a parent" style="${S.favs.has(k.id) ? 'color:#FF5FA2;border-color:#FF5FA2' : ''}">★</button><button type="button" data-a="del" title="Remove">✕</button></div>`).join('') : '<p class="empty">Heart a groove (♥ or K) to keep it here.</p>';
}
function renderLocks() {
  $('#locks').innerHTML = '<small>Keep from the first star:</small>' + TB.GROUPS.map(g => `<button type="button" data-lock="${g.k}" aria-pressed="${S.locks.has(g.k)}">${esc(g.name)}</button>`).join('');
}
function renderControls() {
  $$('#strength button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.strength)));
  $('#drift').value = Math.round(S.drift * 100); $('#driftOut').textContent = S.drift < 0.15 ? 'in the genre' : S.drift < 0.5 ? 'a little' : S.drift < 0.8 ? 'free' : 'anything goes';
  $('#keepParents').checked = S.keepParents;
}
function ui() {
  const on = playing(), gm = S.byId.get(S.playId);
  $('#play').textContent = on ? '■ Stop' : '▶ Play'; $('#play').setAttribute('aria-pressed', String(on));
  $('#nowName').textContent = gm ? `${gm.name}${A.pl && A.pl.pending ? ' (next bar)' : ''}` : '–';
  const n = S.favs.size; $('#breed').disabled = !n; $('#breedHint').textContent = n ? `from ${n} star${n > 1 ? 's' : ''}` : 'star one or more';
}
function showLab() { for (const s of ['#transport', '#lab', '#detail', '#treeSec', '#keepSec']) $(s).hidden = false; }
function renderAll() { renderGenres(); renderControls(); renderLocks(); renderPop(); renderDetail(); renderTree(); renderKeepers(); ui(); }
function frame() {
  if (playing()) { const k = A.pl.beat(); if (k != null) $('#pos').textContent = `${Math.floor(k / 4) % TB.LOOP_BARS + 1}.${Math.floor(k % 4) + 1}`; }
  requestAnimationFrame(frame);
}

// ---------- exports ----------
function line(gm) { const out = [gm]; let cur = gm; for (let i = 0; i < 200; i++) { const p = (cur.parents || [])[0]; const g = p && S.byId.get(p); if (!g || out.includes(g)) break; out.unshift(g); cur = g; } return out; }
async function wavLoop(gm) {
  const pl = TB.plan(gm, {mix: S.mix}), r = await TA.render(pl, {k0: 0, k1: TB.LOOP_BEATS, tail: 2, kickHz: TA.kickFor({pc: gm.key})});
  // fold the tail over the start, so the loop repeats seamlessly
  const n = Math.round(TB.LOOP_BEATS * 60 / gm.bpm * r.sampleRate), L = r.L.slice(0, n), Rr = r.R.slice(0, n);
  for (let i = n; i < r.length; i++) { L[i - n] += r.L[i]; Rr[i - n] += r.R[i]; }
  return TA.wav({L, R: Rr, sampleRate: r.sampleRate});
}
async function toTransplant(gm) {
  try { await FWH.put('loop', {loop: TB.toLoop(gm), name: gm.name}); location.href = 'transplant.html#from=breeder'; }
  catch (_) { toast('This browser won\'t hand the groove over between pages here. Download the MIDI loop and drop it into Transplant.', 5200); }
}

// ---------- from your loop ----------
async function fromFiles(files) {
  files = [...files].filter(f => /\.(mid|midi|smf)$/i.test(f.name));
  const err = $('#loopErr'); err.hidden = true;
  if (!files.length) { err.hidden = false; err.textContent = 'Choose MIDI files (.mid). In Live: right-click a clip → Export MIDI Clip.'; return; }
  try {
    const loop = TL.fromMidi(await Promise.all(files.slice(0, 32).map(async f => ({name: f.name, bytes: new Uint8Array(await f.arrayBuffer())}))));
    loop.name = files.length === 1 ? files[0].name.replace(/\.(mid|midi)$/i, '') : 'Your loop';
    const adam = TB.fromLoop(loop, S.genre);
    S.seed++;
    const kids = TB.breed([adam], {strength: 'bold', drift: S.drift, keepParents: true, seed: S.seed, gen: 1});
    S.gens.push({members: kids, parents: [], genre: S.genre}); S.cur = S.gens.length - 1; S.favs.clear(); index(kids);
    S.selId = adam.id; showLab(); renderAll(); save();
    toast(`${adam.name} and seven children of it, in ${genOf(S.genre).name}. Star the ones you like and breed.`, 4200);
    $('#lab').scrollIntoView({behavior: 'smooth'});
  } catch (e) { err.hidden = false; err.textContent = e.message || String(e); }
}

// ---------- hero ----------
function heroArt() {
  const cols = [['#FF4B32', '#FFC531', '#3FD0C9', '#8F7CFF'], ['#FFC531', '#3FD0C9', '#C6FF3D', '#FF5FA2', '#8F7CFF'], ['#3FD0C9', '#C6FF3D', '#FF5FA2', '#B8FF5C'], ['#B8FF5C', '#FF5FA2', '#B8FF5C']];
  let s = '', pts = [];
  cols.forEach((c, gi) => c.forEach((col, i) => { const x = 40 + gi * 92, y = 150 + (i - (c.length - 1) / 2) * 52; pts.push({x, y, gi, i, col}); }));
  const by = gi => pts.filter(p => p.gi === gi);
  for (let gi = 1; gi < cols.length; gi++) for (const p of by(gi)) { const ps = by(gi - 1), a = ps[(p.i * 2) % ps.length], b = ps[(p.i * 2 + 1) % ps.length]; for (const q of [a, b]) s += `<path d="M${q.x + 9},${q.y} C${(q.x + p.x) / 2},${q.y} ${(q.x + p.x) / 2},${p.y} ${p.x - 9},${p.y}" stroke="#ffffff38" fill="none" stroke-width="1.5"/>`; }
  for (const p of pts) s += `<circle cx="${p.x}" cy="${p.y}" r="${p.gi === cols.length - 1 && p.i === 1 ? 13 : 9}" fill="${p.col}" ${p.gi === cols.length - 2 && p.i === 2 ? 'stroke="#FF5FA2" stroke-width="3"' : ''}/>`;
  s += `<text x="40" y="290" fill="#82938B" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">GEN 1</text><text x="316" y="290" fill="#B8FF5C" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2" text-anchor="end">GEN 10</text>`;
  $('#heroArt').innerHTML = s;
}

// ---------- wiring ----------
function wire() {
  $('#genres').onclick = e => { const b = e.target.closest('[data-genre]'); if (!b) return; newFamily(b.dataset.genre, {play: true}); $('#lab').scrollIntoView({behavior: 'smooth'}); };
  $('#heroGo').onclick = () => { if (!S.gens.length || curGen().genre !== 'techno') newFamily('techno'); hear(members()[0]); $('#lab').scrollIntoView({behavior: 'smooth'}); toast('Eight techno grooves. Click one to hear it, star the ones you like, press Breed.', 4200); };
  $('#pop').addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return; const gm = S.byId.get(card.dataset.id);
    if (e.target.closest('.star')) { toggleFav(gm); return; }
    if (e.target.closest('.heart')) { toggleKeep(gm); return; }
    if (S.playId === gm.id && playing()) { S.selId = gm.id; renderDetail(); return; }
    hear(gm);
  });
  $('#pop').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) { e.preventDefault(); hear(S.byId.get(e.target.dataset.id)); } });
  $('#play').onclick = togglePlay;
  $('#breed').onclick = breed;
  $('#fresh').onclick = fresh;
  $('#back').onclick = () => { if (S.cur > 0) { S.cur--; S.favs.clear(); S.selId = members()[0].id; renderAll(); save(); } };
  $('#fwd').onclick = () => { if (S.cur < S.gens.length - 1) { S.cur++; S.favs.clear(); S.selId = members()[0].id; renderAll(); save(); } };
  $('#strength').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.strength = b.dataset.v; renderControls(); save(); };
  $('#drift').oninput = e => { S.drift = +e.target.value / 100; renderControls(); save(); };
  $('#keepParents').onchange = e => { S.keepParents = e.target.checked; save(); };
  $('#locks').onclick = e => { const b = e.target.closest('[data-lock]'); if (!b) return; const k = b.dataset.lock; if (S.locks.has(k)) S.locks.delete(k); else S.locks.add(k); renderLocks(); save(); };
  $('#mixer').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, m = (S.mix[k] ||= {}); m.mute = !m.mute; b.setAttribute('aria-pressed', String(!m.mute)); if (A.plan && A.eng) { for (const p of A.plan.parts) if (p.id === k) p.part.mute = m.mute; A.eng.levels(); } };
  $('#tree').addEventListener('click', e => { const n = e.target.closest('.node'); if (!n) return; const gm = S.byId.get(n.dataset.id); if (!gm) return; S.cur = +n.dataset.g; S.favs.clear(); renderAll(); hear(gm, {start: true}); });
  $('#keepers').onclick = e => { const b = e.target.closest('button'); if (!b) return; const id = b.closest('.keeper').dataset.id, k = S.keepers.find(x => x.id === id); if (!k) return; S.byId.set(k.id, k);
    if (b.dataset.a === 'play') hear(k); else if (b.dataset.a === 'star') toggleFav(k); else if (b.dataset.a === 'del') { S.keepers = S.keepers.filter(x => x.id !== id); S.favs.delete(id); renderKeepers(); renderPop(); save(); } };
  $('#xMidi').onclick = () => { const gm = sel(); download(`${safe(gm.name)} - Breeder loop.mid`, TB.midi(gm), 'audio/midi'); };
  $('#xLine').onclick = () => { const gm = sel(), l = line(gm); download(`${safe(gm.name)} - lineage (${l.length} generations).mid`, TB.lineageMidi(l), 'audio/midi'); toast(`${l.length} generation${l.length > 1 ? 's' : ''}, 8 bars each, oldest first.`); };
  $('#xWav').onclick = async () => { const gm = sel(); $('#xWav').disabled = true; try { download(`${safe(gm.name)} - ${gm.bpm} BPM loop.wav`, await wavLoop(gm), 'audio/wav'); } catch (e) { toast('Rendering failed: ' + (e.message || e)); } finally { $('#xWav').disabled = false; } };
  $('#xTransplant').onclick = () => toTransplant(sel());
  $('#xKeep').onclick = () => toggleKeep(sel());
  $('#xSave').onclick = () => { const strip = g => { const c = Object.assign({}, g); delete c.measured; return c; }; download(`Breeder family - ${safe(genOf(S.genre).name)}.json`, JSON.stringify({v: 1, genre: S.genre, gens: S.gens.map(g => ({members: g.members.map(strip), parents: g.parents, genre: g.genre})), cur: S.cur, favs: [], keepers: S.keepers.map(strip), strength: S.strength, drift: S.drift, keepParents: S.keepParents, locks: [...S.locks], seed: S.seed}), 'application/json'); };
  $('#xOpen').onclick = () => $('#famFile').click();
  $('#famFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { apply(JSON.parse(await f.text())); stop(); showLab(); renderAll(); save(); toast(`Family opened: ${S.gens.length} generations.`); } catch (err) { toast(err.message || String(err), 4200); } };
  const drop = $('#loopDrop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); fromFiles(e.dataTransfer.files); });
  drop.addEventListener('click', e => { if (e.target === drop || e.target.tagName === 'B' || e.target.tagName === 'SPAN') $('#loopFile').click(); });
  drop.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === drop) { e.preventDefault(); $('#loopFile').click(); } });
  $('#loopPick').onclick = e => { e.stopPropagation(); $('#loopFile').click(); };
  $('#loopFile').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; fromFiles(fs); };
  $('#vol').oninput = e => { A.vol = +e.target.value / 100; if (A.out) A.out.gain.setTargetAtTime(A.vol, A.ctx.currentTime, 0.02); };
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey || !S.gens.length) return;
    const ms = members(), i = Math.max(0, ms.findIndex(m => m.id === (S.playId || S.selId)));
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (/^[1-8]$/.test(e.key) && ms[+e.key - 1]) hear(ms[+e.key - 1]);
    else if (e.key === 'ArrowRight') { e.preventDefault(); hear(ms[(i + 1) % ms.length]); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); hear(ms[(i - 1 + ms.length) % ms.length]); }
    else if (e.key === 's' || e.key === 'S') { const g = S.byId.get(S.playId) || sel(); if (g) toggleFav(g); }
    else if (e.key === 'k' || e.key === 'K') { const g = S.byId.get(S.playId) || sel(); if (g) toggleKeep(g); }
    else if (e.key === 'b' || e.key === 'B') breed();
    else if (e.key === 'Backspace') { e.preventDefault(); $('#back').click(); }
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S.gens.length) { renderPop(); renderDetail(); renderTree(); } }, 150); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing()) stop(); });
}

function start() {
  heroArt(); wire();
  if (restore()) { showLab(); renderAll(); }
  else { renderGenres(); newFamily('techno'); }
  requestAnimationFrame(frame);
  window.BREEDER_QA = {get S() { return S; }, A, M, breed, hear, newFamily, toggleFav, ready: true};
}
start();
})();
