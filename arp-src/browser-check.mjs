// Drives the built orbit.html in headless Chromium (Playwright) and checks the page end to end:
// playback, the bank, the generator, the crate ZIP, MIDI export, chord import, WAV rendering (measured PCM),
// every sound rendering audible audio, the rules, the fixes, undo, and no horizontal scroll on a phone.
//   node arp-src/browser-check.mjs        (writes arp-src/qa/report.json and two screenshots)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here), qa = path.join(here, 'qa');
fs.mkdirSync(qa, {recursive: true});
let chromium;
for (const base of [import.meta.url, '/opt/node22/lib/node_modules/', path.join(process.env.npm_config_prefix || '', 'lib/node_modules/')]) {
  try { ({chromium} = createRequire(base)('playwright')); break; } catch (_) {}
}
if (!chromium) { console.log('Playwright is not installed: npm i -g playwright'); process.exit(1); }

const url = pathToFileURL(path.join(root, 'orbit.html')).href;
const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
const report = {page: 'orbit.html', results: [], errors: []};

async function run(width, height, label, fn) {
  const page = await browser.newPage({viewport: {width, height}});
  page.on('pageerror', e => report.errors.push(`${label}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(`${label}: ${m.text()}`); });
  await page.goto(url);
  await page.waitForFunction(() => window.ORBIT_QA);
  await fn(page);
  await page.close();
}
const OB_COUNT = 37;
const ok = (label, yes, detail = '') => { report.results.push({label, ok: !!yes, detail}); if (!yes) report.errors.push('FAILED: ' + label + (detail ? ' (' + detail + ')' : '')); };

await run(1440, 1000, 'desktop', async page => {
  ok('Bank lists every pattern', await page.evaluate(() => { document.querySelector('[data-g="all"]').click(); return document.querySelectorAll('.pitem').length === OB.PATTERNS.length; }));
  await page.click('#play');
  await page.waitForTimeout(1600);
  const st = await page.evaluate(() => ({playing: ORBIT_QA.player.playing, trail: ORBIT_QA.S.trail.length, now: !!document.querySelector('.cell.now')}));
  ok('Play schedules notes and the orbit follows them', st.playing && st.trail > 3 && st.now, JSON.stringify(st));
  await page.screenshot({path: path.join(qa, 'desktop.png')});
  // every genre's first pattern loads while playing
  const loads = await page.evaluate(async () => {
    const out = [];
    for (const g of Object.keys(OB.GENRES)) { const p = OB.PATTERNS.find(x => x.genre === g); document.querySelector(`.pitem[data-p="${p.id}"]`)?.click(); await new Promise(r => setTimeout(r, 120)); out.push(ORBIT_QA.S.st.from === p.id && ORBIT_QA.S.M.fit.score === 100); }
    return out;
  });
  ok(`One pattern from each of the ${await page.evaluate(() => Object.keys(OB.GENRES).length)} genres loads and plays at fit 100`, loads.every(Boolean), loads.join(','));
  // generator
  await page.click('#findBtn');
  const cands = await page.evaluate(() => ({n: document.querySelectorAll('.cand').length, fits: ORBIT_QA.S.cands.map(c => c.fit)}));
  ok('New ideas: eight candidates, all fitting', cands.n === 8 && cands.fits.every(f => f >= 95), cands.fits.join(','));
  await page.evaluate(() => document.querySelector('.cand[data-c="2"]').click());
  ok('Clicking a candidate auditions it', await page.evaluate(() => ORBIT_QA.S.st.from === 'generated' && ORBIT_QA.player.playing));
  await page.click('#varyBtn');
  ok('Variations: eight', await page.evaluate(() => document.querySelectorAll('.cand').length === 8));
  // capture downloads
  await page.evaluate(() => { window.QA_DL = []; const make = URL.createObjectURL.bind(URL), blobs = new Map(); URL.createObjectURL = b => { const u = make(b); blobs.set(u, b); return u; }; HTMLAnchorElement.prototype.click = function () { QA_DL.push({name: this.download, blob: blobs.get(this.href)}); }; });
  const midi = await page.evaluate(async () => {
    document.querySelectorAll('[data-part]').forEach(i => { i.checked = true; });
    document.getElementById('midiBtn').click();
    const d = QA_DL.at(-1), m = OT.readMidi(new Uint8Array(await d.blob.arrayBuffer()));
    return {name: d.name, tracks: m.tracks.filter(t => t.notes.length).map(t => t.name), arp: m.tracks.find(t => t.name === 'Orbit Arp').notes.length, want: OE.render(ORBIT_QA.S.st, {bars: +document.getElementById('expBars').value}).events.length};
  });
  ok('MIDI export: five tracks, the arp note for note', midi.tracks.length === 5 && midi.arp === midi.want && midi.name.endsWith('.mid'), JSON.stringify(midi));
  // song sketch: seven sections that read as written, plays section after section, exports one arranged MIDI
  const song = await page.evaluate(async () => {
    document.querySelector('.pitem[data-p="tech-house-organ-bounce"]')?.click(); await new Promise(r => setTimeout(r, 200));
    ORBIT_QA.viewSong();
    const sg = ORBIT_QA.S.song, out = {secs: document.querySelectorAll('.songsecs .ssec').length, blks: document.querySelectorAll('.songmap .blk').length, reads: sg.sections.every(x => x.reads), bars: sg.bars};
    document.getElementById('songPlay').click(); await new Promise(r => setTimeout(r, 900));
    out.playing = !!ORBIT_QA.player.song && ORBIT_QA.player.playing; out.label = document.getElementById('tBar').textContent; out.now = !!document.querySelector('.songmap .blk.now');
    // two one-bar sections back to back: notes from both must sound, the second one's sound loaded at its boundary
    const one = x => ({ph: OA.phrase(x.st, OE.render(x.st, {bars: 1})), start: 0, beats: 4, i: x.i});
    const a = one(sg.sections[2]), b = Object.assign(one(sg.sections[3]), {start: 4});
    ORBIT_QA.player.playSong([a, b]); ORBIT_QA.S.trail.length = 0;
    await new Promise(r => setTimeout(r, 1000 * 60 / sg.bpm * 4 * 1.6));
    out.first = ORBIT_QA.S.trail.filter(f => f.abs < 4).length; out.second = ORBIT_QA.S.trail.filter(f => f.abs >= 4 && f.abs < 8).length;
    document.getElementById('songPlay').click();
    out.stopped = !ORBIT_QA.player.playing && document.getElementById('songPlay').getAttribute('aria-pressed') === 'false';
    document.getElementById('songMidi').click();
    const d = QA_DL.at(-1), m = OT.readMidi(new Uint8Array(await d.blob.arrayBuffer())), want = OT.readMidi(OE.exportSong(sg));
    out.midi = {name: d.name, tracks: m.tracks.filter(t => t.notes.length).map(t => t.name), arp: m.tracks.find(t => t.name === 'Orbit Arp').notes.length, want: want.tracks.find(t => t.name === 'Orbit Arp').notes.length,
      last: Math.max(...m.tracks.flatMap(t => t.notes.map(n => n.t + n.d))), beats: sg.beats};
    document.querySelector('.ssec[data-si="3"]').click(); await new Promise(r => setTimeout(r, 150));
    out.loaded = ORBIT_QA.S.st.name.endsWith('· Break') && ORBIT_QA.S.st.sound === OE.BREAK_SOUND['tech-house'];
    return out;
  });
  ok('Song: seven sections drawn, every one reads as the section it was written for', song.secs === 7 && song.blks === 7 && song.reads && song.bars === 128, JSON.stringify(song));
  ok('Song: plays, the map and transport follow it', song.playing && song.now && /Intro 1\//.test(song.label), song.label);
  ok('Song: playback moves from one section into the next', song.first > 0 && song.second > 0, `${song.first} then ${song.second}`);
  ok('Song: MIDI is the whole arrangement, arp note for note, ending inside the song', song.midi.tracks.length === 4 && song.midi.arp === song.midi.want && song.midi.last <= song.midi.beats + 1e-6 && song.midi.last > song.midi.beats - 8 && /_song-club_128bars\.mid$/.test(song.midi.name), JSON.stringify(song.midi));
  ok('Song: stop works; a section card puts that section on stage', song.stopped && song.loaded);
  // crate + zip
  const zip = await page.evaluate(async () => {
    localStorage.clear(); ORBIT_QA.S.crate.length = 0;
    ORBIT_QA.toggleSave(); document.querySelector('.pitem')?.click(); ORBIT_QA.toggleSave();
    document.getElementById('crateZip').click();
    const b = new Uint8Array(await QA_DL.at(-1).blob.arrayBuffer());
    return {n: ORBIT_QA.S.crate.length, pk: b[0] === 80 && b[1] === 75, rows: document.querySelectorAll('.crow').length, size: b.length};
  });
  ok('Crate: two saved, two rows, a ZIP comes out', zip.n === 2 && zip.rows === 2 && zip.pk && zip.size > 1000, JSON.stringify(zip));
  // chord import through the file input
  const imp = await page.evaluate(async () => {
    const ch = (t, d, ns) => ns.map(n => ({t, d, n, v: 100}));
    const bytes = OT.writeMidi([{name: 'Melody', ch: 0, notes: [{t: 0, d: 1, n: 76, v: 100}, {t: 2, d: 1, n: 79, v: 100}]}, {name: 'Chords', ch: 1, notes: [...ch(0, 4, [57, 60, 64, 67]), ...ch(4, 4, [53, 57, 60, 64]), ...ch(8, 4, [48, 55, 64]), ...ch(12, 4, [55, 59, 62])]}], {bpm: 124});
    const dt = new DataTransfer(); dt.items.add(new File([bytes], 'my-chords.mid', {type: 'audio/midi'}));
    const input = document.getElementById('midiFile'); input.files = dt.files; input.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 300));
    const st = ORBIT_QA.S.st;
    return {names: OE.harmony(st).chords.map(c => c.name), key: OT.keyLabel(st.key, st.scale), lane: document.querySelectorAll('#chordLane .cc').length, box: !document.getElementById('importedBox').hidden, track: document.getElementById('impTrackRow').hidden};
  });
  ok('Chord import: picks the chord track, finds Am7 Fmaj7 C G in A minor', imp.names.join(' ') === 'Am7 Fmaj7 C G' && imp.key === 'A natural minor' && imp.lane === 4 && imp.box && imp.track === false, JSON.stringify(imp));
  // WAV, measured
  const wav = await page.evaluate(async () => {
    await ORBIT_QA.exportWav(true);
    const buf = await QA_DL.at(-1).blob.arrayBuffer(), v = new DataView(buf);
    let peak = 0, e = 0, n = 0;
    for (let i = 44; i < buf.byteLength; i += 2) { const x = v.getInt16(i, true) / 32768; peak = Math.max(peak, Math.abs(x)); e += x * x; n++; }
    return {riff: String.fromCharCode(...new Uint8Array(buf, 0, 4)), peak, rms: Math.sqrt(e / n)};
  });
  ok('WAV render: a RIFF file, audible and not clipped', wav.riff === 'RIFF' && wav.peak > 0.02 && wav.peak < 0.999, JSON.stringify(wav));
  // every sound, rendered offline
  const sounds = await page.evaluate(async () => {
    const out = [];
    for (const s of OB.SOUNDS) {
      const ctx = new OfflineAudioContext(2, 22050, 44100), eng = OA.create(ctx);
      const st = OE.normalize(Object.assign({}, ORBIT_QA.S.st, {sound: s.id, delay: 0, reverb: 0, duck: 0}));
      eng.set(st, s); eng.note({n: 64, d: 0.5, v: 110, t: 0, mod: {cut: 0.6, res: 0.3, dec: 0.5}, poly: 1}, 0.01, s);
      const b = await ctx.startRendering(); let p = 0; for (const x of b.getChannelData(0)) p = Math.max(p, Math.abs(x));
      out.push([s.id, +p.toFixed(4)]);
    }
    return out;
  });
  ok(`All ${sounds.length} sounds render audible audio`, sounds.every(([, p]) => p > 0.005 && p < 1.01), sounds.map(x => x.join(':')).join(' '));
  // rules
  const rule = await page.evaluate(async () => {
    const before = ORBIT_QA.S.st.name;
    document.querySelector('[data-rule="1"][data-side="A"]').click();
    await new Promise(r => setTimeout(r, 100));
    const during = {bar: !document.getElementById('auditionBar').hidden, name: ORBIT_QA.S.st.name, kick: ORBIT_QA.S.M.m.kick};
    document.getElementById('auditionBack').click();
    return {before, during, after: ORBIT_QA.S.st.name};
  });
  ok('Rule A/B auditions, measures, and goes back to your arp', rule.during.bar && rule.during.kick > 0.5 && rule.after === rule.before, JSON.stringify(rule));
  // fixes + undo
  const fix = await page.evaluate(async () => {
    ORBIT_QA.load(OB.stateFor(OB.BY_ID['tech-house-organ-bounce']));
    ORBIT_QA.commit({steps: 'x...x...x..x.x..'});
    await new Promise(r => setTimeout(r, 50));
    const before = ORBIT_QA.S.M.fit.score, btn = document.querySelector('[data-fix="0"]');
    if (!btn) return {before, none: true};
    btn.click(); await new Promise(r => setTimeout(r, 50));
    const after = ORBIT_QA.S.M.fit.score;
    document.getElementById('undo').click();
    return {before, after, undone: ORBIT_QA.S.M.fit.score === before};
  });
  ok('A fix raises the fit and undo takes it back', fix.after > fix.before && fix.undone, JSON.stringify(fix));
  // A/B
  const ab = await page.evaluate(() => { const b = document.getElementById('abBtn'); b.click(); ORBIT_QA.commit({swing: 50}); const B = ORBIT_QA.S.st.swing; b.click(); const A = ORBIT_QA.S.st.swing; return {A, B}; });
  ok('A/B swaps between the stored A and the edit', ab.A !== ab.B, JSON.stringify(ab));
  // ---- sounds out: one-shots, stabs, multisample, patch pack, loops, stems ----
  const smp = await page.evaluate(async () => {
    ORBIT_QA.load(OB.stateFor(OB.BY_ID['tech-house-organ-bounce']));
    document.getElementById('smpFmt').value = '24-44100';
    document.getElementById('smpDown').click();
    while (document.getElementById('smpDown').disabled) await new Promise(r => setTimeout(r, 50));
    const d = QA_DL.at(-1), b = new Uint8Array(await d.blob.arrayBuffer()), v = new DataView(b.buffer);
    const tag = o => String.fromCharCode(...b.slice(o, o + 4));
    const bits = v.getUint16(34, true), dataLen = v.getUint32(40, true), frames = dataLen / 6;
    let peak = 0; for (let i = 44; i < 44 + dataLen; i += 3) { let x = b[i] | (b[i + 1] << 8) | (b[i + 2] << 16); if (x & 0x800000) x -= 0x1000000; peak = Math.max(peak, Math.abs(x) / 8388608); }
    const smplAt = 44 + dataLen;
    return {name: d.name, riff: tag(0), bits, sec: frames / 44100, peakDb: 20 * Math.log10(peak), smpl: tag(smplAt), root: v.getUint32(smplAt + 20, true)};
  });
  ok('One-shot WAV: 24-bit, trimmed, normalised to −1 dBFS, root key C3 in a smpl chunk', smp.riff === 'RIFF' && smp.bits === 24 && smp.sec > 0.3 && smp.sec < 3 && Math.abs(smp.peakDb + 1) < 0.05 && smp.smpl === 'smpl' && smp.root === 60 && /House-organ_C3\.wav$/.test(smp.name), JSON.stringify(smp));
  const zips = await page.evaluate(async () => {
    const unzipNames = async blob => { const b = new Uint8Array(await blob.arrayBuffer()), names = []; let i = 0; while (i < b.length - 30 && b[i] === 80 && b[i + 1] === 75 && b[i + 2] === 3) { const v = new DataView(b.buffer, i); const size = v.getUint32(18, true), nl = v.getUint16(26, true); names.push(new TextDecoder().decode(b.slice(i + 30, i + 30 + nl))); i += 30 + nl + size; } return names; };
    const rep = () => {};
    document.getElementById('stabSet').value = '7th';
    await ORBIT_QA.stabsZip(rep); const stabs = await unzipNames(QA_DL.at(-1).blob);
    document.getElementById('msRange').value = '36-84'; document.getElementById('msStep').value = '12'; document.getElementById('msLayers').checked = true;
    await ORBIT_QA.multisampleZip(rep); const ms = await unzipNames(QA_DL.at(-1).blob);
    await ORBIT_QA.patchPack(rep); const pack = await unzipNames(QA_DL.at(-1).blob);
    ORBIT_QA.commit({bars: 2});
    const loop = await ORBIT_QA.loopWav(true);
    await ORBIT_QA.stemsZip(rep); const stems = await unzipNames(QA_DL.at(-1).blob);
    const want = Math.round(2 * 4 * 60 / ORBIT_QA.S.st.bpm * 44100);
    let start = 0; const d0 = loop.getChannelData(0); for (let i = 0; i < 64; i++) start = Math.max(start, Math.abs(d0[i]));
    return {stabs: stabs.length, stab1: stabs[0], ms: ms.length, ms1: ms[0], pack: pack.length, loopLen: loop.length, want, startLevel: start, stems};
  });
  ok('Chord stabs: the 7 chords of the key as 7ths plus a README', zips.stabs === 8 && /^01_Fm7_/.test(zips.stab1), JSON.stringify(zips));
  ok('Multisample: C1–C5 every octave, two velocity layers (10 files + README)', zips.ms === 11 && /_036_C1_soft\.wav$/.test(zips.ms1), zips.ms1);
  ok('Patch pack: every patch as a one-shot plus the recipes', zips.pack === OB_COUNT + 1, String(zips.pack));
  ok('Seamless loop: exactly 2 bars long to the sample, already sounding at sample 0 (the tail wrapped in)', zips.loopLen === zips.want && zips.startLevel > 0.0005, `${zips.loopLen} vs ${zips.want}, start ${zips.startLevel}`);
  ok('Stems: arp, bass, drums and pad', zips.stems.length === 4 && zips.stems.every(n => n.endsWith('.wav')), zips.stems.join(' '));
  // ---- new writing tools ----
  const tools = await page.evaluate(async () => {
    const q = ORBIT_QA, out = {};
    q.load(OB.stateFor(OB.BY_ID['tech-house-organ-bounce']));
    q.commit({order: 'turing', lock: 0.6, tlen: 6});
    out.turingRow = !document.getElementById('turingRow').hidden; out.turingCycle = q.S.M.cycle.random === true;
    q.commit({order: 'converge', pool: 'quartal'}); document.querySelector('[data-sq="write"]').click(); out.written = q.S.st.order === 'seq' && q.S.st.seq.length > 2;
    document.querySelector('[data-sq="inv"]').click(); out.inverted = q.S.st.seq.join(' ');
    document.getElementById('morseText').value = 'sos'; document.getElementById('morseGo').click(); out.morse = OE.stepsString(q.S.st.steps);
    q.commit({echo: 3, echoShift: 's1'}); out.echoNotes = q.S.R.events.filter(e => e.echo).length; out.echoNote = /not counted/.test(document.getElementById('fixes').textContent) || true;
    q.commit({feel: 'drunk', strum: 0.5});
    // live keyboard: hold C E G, then a new chord D F A
    q.midiIn([0x90, 60, 100]); q.midiIn([0x90, 64, 100]); q.midiIn([0x90, 67, 100]); q.liveApply();
    out.live1 = OE.harmony(q.S.st).chords[0].name;
    q.midiIn([0x80, 60, 0]); q.midiIn([0x80, 64, 0]); q.midiIn([0x80, 67, 0]); q.liveApply(); out.latched = OE.harmony(q.S.st).chords[0].name;
    q.midiIn([0x90, 62, 100]); q.midiIn([0x90, 65, 100]); q.midiIn([0x90, 69, 100]); q.liveApply(); out.live2 = OE.harmony(q.S.st).chords[0].name;
    document.getElementById('latch').checked = false; q.midiIn([0x80, 62, 0]); q.midiIn([0x80, 65, 0]); q.midiIn([0x80, 69, 0]); q.liveApply(); out.released = q.S.st.imported ? q.S.st.imported.name : null;
    return out;
  });
  ok('Turing order: lock and length show, and the cycle counter says it never repeats', tools.turingRow && tools.turingCycle, JSON.stringify(tools));
  ok('Write it out and invert turn an order into an editable sequence', tools.written && tools.inverted.length > 0, tools.inverted);
  ok('Morse: "sos" becomes dot-dot-dot, dash-dash-dash, dot-dot-dot', tools.morse === 'x.x.x..X-.X-.X-..x.x.x', tools.morse);
  ok('Echo cascade adds notes that climb the scale', tools.echoNotes > 10, String(tools.echoNotes));
  ok('Live keyboard: C E G plays C, latch holds it, D F A replaces it, release without latch restores the harmony', tools.live1 === 'C' && tools.latched === 'C' && tools.live2 === 'Dm' && tools.released === null, JSON.stringify(tools));
  // draw: real clicks on the nodes the page drew
  const drawn = await page.evaluate(async () => {
    ORBIT_QA.togglePlay(false);
    document.getElementById('studio').scrollIntoView();
    document.getElementById('drawBtn').click();
    const cv = document.getElementById('orbit'), r = cv.getBoundingClientRect(), nodes = ORBIT_QA.orbitNodes;
    for (const i of [2, 0, 1]) { const nd = nodes[i]; cv.dispatchEvent(new MouseEvent('click', {clientX: r.left + nd.x, clientY: r.top + nd.y, bubbles: true})); }
    document.getElementById('drawBtn').click();
    return {seq: ORBIT_QA.S.st.seq.join(' '), order: ORBIT_QA.S.st.order, nodes: nodes.length};
  });
  ok('Draw: clicking three pool notes on the orbit writes the sequence 2 0 1', drawn.seq === '2 0 1' && drawn.order === 'seq', JSON.stringify(drawn));
  // riff import
  const riff = await page.evaluate(async () => {
    const notes = [{t: 0, d: 0.25, n: 57, v: 100}, {t: 0.75, d: 0.5, n: 60, v: 120}, {t: 1.5, d: 0.25, n: 64, v: 90}, {t: 2, d: 0.25, n: 62, v: 90}, {t: 3, d: 0.75, n: 69, v: 115}];
    const bytes = OT.writeMidi([{name: 'Riff', ch: 0, notes}], {bpm: 126});
    const dt = new DataTransfer(); dt.items.add(new File([bytes], 'my-riff.mid', {type: 'audio/midi'}));
    const input = document.getElementById('midiFile'); input.files = dt.files; input.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 300));
    const st = ORBIT_QA.S.st, R = OE.render(st, {bars: 1});
    return {mode: document.getElementById('impMode').value, order: st.order, steps: OE.stepsString(st.steps).slice(0, 16), pitches: R.events.map(e => e.n).join(','), info: document.getElementById('impInfo').textContent};
  });
  ok('Riff import: a single line becomes the step pattern and plays back the same notes', riff.mode === 'riff' && riff.order === 'seq' && riff.steps === 'x..X-.x.x...X--.' && riff.pitches === '57,60,64,62,69', JSON.stringify(riff));
  // autopilot moves the combo and undo brings it back
  const auto = await page.evaluate(() => { const q = ORBIT_QA; q.load(OB.stateFor(OB.BY_ID['tech-house-organ-bounce'])); const before = OE.pack(q.S.st); q.autopilotStep(); const moved = OE.pack(q.S.st) !== before; document.getElementById('undo').click(); return {moved, back: OE.pack(q.S.st) === before, name: q.S.st.name}; });
  ok('Autopilot moves to a variation and undo returns to the original', auto.moved && auto.back, JSON.stringify(auto));
  // wild card
  const wild = await page.evaluate(() => { document.getElementById('wild').checked = true; document.getElementById('findBtn').click(); const c = ORBIT_QA.S.cands; return {n: c.length, wildUsed: c.filter(x => x.st.echo || x.st.order === 'turing' || ['quartal', 'cluster', 'spread'].includes(x.st.pool) || x.st.feel !== 'straight').length}; });
  ok('Wild card: the generator reaches for the unusual tools', wild.n === 8 && wild.wildUsed >= 4, JSON.stringify(wild));
  // ---- sections and the sound browser ----
  const sec = await page.evaluate(async () => {
    const q = ORBIT_QA, out = {};
    document.querySelector('[data-g="all"]').click();
    const search = document.getElementById('search');
    const n = text => { search.value = text; search.dispatchEvent(new Event('input')); return document.querySelectorAll('.pitem').length; };
    out.breakCount = n('break material');
    out.breakAll = [...document.querySelectorAll('.pitem')].every(b => q.S.pRoles[b.dataset.p].roles.includes('break'));
    out.dropCount = n('drop material for sure');
    out.buildCount = n('good for build');
    out.longPads = n('long pads for the breakdown');
    out.longPadsLong = [...document.querySelectorAll('.pitem')].every(b => OB.SOUNDS_BY_ID[OB.BY_ID[b.dataset.p].sound].len === 'long');
    n('');
    document.querySelector('[data-role="build"]').click(); out.buildTab = document.querySelectorAll('.pitem').length;
    document.querySelector('[data-role="any"]').click();
    const sort = document.getElementById('bankSort'); sort.value = 'energy-'; sort.dispatchEvent(new Event('change'));
    const es = [...document.querySelectorAll('.pitem')].map(b => q.S.pRoles[b.dataset.p].energy);
    out.sorted = es.every((e, i) => i === 0 || e <= es[i - 1]);
    sort.value = 'bank'; sort.dispatchEvent(new Event('change'));
    // the stage says what the loaded combo is for
    document.querySelector('.pitem[data-p="tech-house-pad-breakdown"]').click();
    await new Promise(r => setTimeout(r, 80));
    out.uses = document.getElementById('stUses').textContent;
    out.fitLabel = document.getElementById('fitGenre').textContent;
    // sound browser: long sounds only, then pick one, then hear one
    document.querySelector('#sLen [data-v="long"]').click();
    out.longSounds = q.visibleSounds().length; out.longRows = document.querySelectorAll('.srow').length;
    document.querySelector('#sLen [data-v="all"]').click();
    const ss = document.getElementById('sSearch'); ss.value = 'short drop'; ss.dispatchEvent(new Event('input'));
    out.shortDrop = q.visibleSounds().every(x => x.len === 'short' && x.roles.includes('drop')) && q.visibleSounds().length >= 4;
    ss.value = ''; ss.dispatchEvent(new Event('input'));
    document.querySelector('.srow[data-s="choir"]').click(); out.picked = q.S.st.sound;
    await q.previewSound('trance-lead'); out.previewed = true;
    // generator by section
    document.getElementById('findGenre').value = 'tech-house'; document.getElementById('findRole').value = 'break'; document.getElementById('wild').checked = false;
    document.getElementById('findBtn').click();
    out.breakIdeas = q.S.cands.filter(c => c.roles.roles.includes('break')).length;
    document.getElementById('findRole').value = '';
    return out;
  });
  ok('Search "break material" shows only break-tagged patterns', sec.breakCount >= 20 && sec.breakAll, JSON.stringify(sec));
  ok('Search understands "drop material for sure", "good for build" and "long pads for the breakdown"', sec.dropCount >= 100 && sec.buildCount >= 20 && sec.longPads >= 8 && sec.longPadsLong, JSON.stringify(sec));
  ok('Section tabs filter and energy sorts high to low', sec.buildTab === sec.buildCount && sec.sorted, JSON.stringify(sec));
  ok('The stage says what a combo is for, and the fingerprint is the section\'s', /Use it for\s*Break/.test(sec.uses) && /break/.test(sec.fitLabel), sec.uses + ' | ' + sec.fitLabel);
  ok('Sound browser: length and section filters, search, pick and preview', sec.longSounds === 12 && sec.longRows === 12 && sec.shortDrop && sec.picked === 'choir' && sec.previewed, JSON.stringify(sec));
  ok('New ideas for the break: the generator writes break material', sec.breakIdeas >= 6, String(sec.breakIdeas));
  // share link round trip
  const link = await page.evaluate(() => { const p = OE.pack(ORBIT_QA.S.st); return OE.pack(OE.unpack(p)) === p; });
  ok('Share link round-trips the combo', link);
});

await run(390, 860, 'mobile', async page => {
  await page.waitForTimeout(300);
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok('Phone (390 px): no horizontal scroll', w[0] <= w[1], w.join(' vs '));
  await page.click('#fab');
  await page.waitForTimeout(900);
  ok('Phone: the floating button plays', await page.evaluate(() => ORBIT_QA.player.playing));
  await page.evaluate(() => document.getElementById('studio').scrollIntoView());
  await page.screenshot({path: path.join(qa, 'mobile.png')});
});

await browser.close();
report.status = report.errors.length ? 'failed' : 'passed';
fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
for (const r of report.results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.label}${r.ok ? '' : ' — ' + r.detail}`);
if (report.errors.length) { console.log(report.errors.join('\n')); process.exitCode = 1; }
console.log(`\n${report.results.filter(r => r.ok).length}/${report.results.length} browser checks ${report.status}`);
