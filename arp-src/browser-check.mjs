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
  ok('One pattern from each of the 12 genres loads and plays at fit 100', loads.every(Boolean), loads.join(','));
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
