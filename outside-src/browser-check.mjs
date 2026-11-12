// Drives outside.html in Chromium: loads the demo, plays it, walks every place, checks what each chain does to the audio,
// uploads a file, loads a reference and takes every download.
//   node outside-src/browser-check.mjs        (artifacts in /tmp/outside-qa or $OUTSIDE_QA_DIR)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
const require = createRequire(import.meta.url), {chromium} = require('playwright'), O = require('./engine.js');
const root = fileURLToPath(new URL('../', import.meta.url)), qa = process.env.OUTSIDE_QA_DIR || '/tmp/outside-qa';
fs.mkdirSync(qa, {recursive: true});
const server = http.createServer((req, res) => { if (req.url !== '/outside.html') { res.writeHead(404).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(path.join(root, 'outside.html'))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/outside.html`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
const report = {checks: [], errors: [], audio: {}};
const check = (name, value) => { report.checks.push({name, pass: !!value}); assert(value, name); console.log('PASS ' + name); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 2, acceptDownloads: true}), page = await ctx.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !m.text().includes('Failed to load resource') && report.errors.push(m.text()));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url); await page.waitForFunction(() => window.OUTSIDE_QA);
  check('Seven places on the map, six beside it, no report yet', await page.locator('#spots .spot').count() === 7 && await page.locator('#world button').count() === 6 && await page.locator('#report-body').isHidden() && await page.locator('#bar').isHidden());
  await page.screenshot({path: path.join(qa, 'empty.png'), fullPage: true});

  await page.click('#demo-bad'); await page.waitForFunction(() => OUTSIDE_QA.tracks.mine && OUTSIDE_QA.player.playing, null, {timeout: 30000}); await page.waitForTimeout(900);
  check('The demo is measured and starts playing', await page.evaluate(() => OUTSIDE_QA.player.now() > 0 && !document.getElementById('bar').hidden && document.getElementById('map').classList.contains('playing')));
  const bad = await page.evaluate(() => { const r = OUTSIDE_QA.tracks.mine.rep; return {overall: r.overall, fixes: r.fixes.map(f => f.id), planted: document.querySelectorAll('#planted li:not(.miss)').length, rows: document.querySelectorAll('#card tbody tr').length, scores: [...document.querySelectorAll('#spots .sc, #world .sc')].map(e => e.textContent)}; });
  check('The report finds all seven planted problems and shows twelve places', bad.planted === 7 && bad.rows === 12 && O.PLANTED.every(p => bad.fixes.includes(p[0])) && bad.scores.filter(Boolean).length === 12);
  await page.screenshot({path: path.join(qa, 'floor.png'), fullPage: true});

  // every place: walk there, let the crossfade finish, and read the analysers
  const live = await page.evaluate(async () => {
    const Q = OUTSIDE_QA, out = {}, pw = (an, a, b) => { const d = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(d); let s = 0; const hz = Q.ctx.sampleRate / an.fftSize; for (let k = Math.round(a / hz); k < b / hz; k++) s += Math.pow(10, d[k] / 10); return s; }, dB = x => 10 * Math.log10(x + 1e-20);
    for (const p of Q.O.PLACES) {
      Q.go(p.id, true); clearTimeout(Q.player.doorTimer); await new Promise(r => setTimeout(r, 1300));
      const acc = {low: 0, mid: 0, dryLow: 0, dryMid: 0, all: 0};
      for (let i = 0; i < 12; i++) { acc.low += pw(Q.player.wet, 35, 120); acc.mid += pw(Q.player.wet, 500, 4000); acc.dryLow += pw(Q.player.dry, 35, 120); acc.dryMid += pw(Q.player.dry, 500, 4000); acc.all += pw(Q.player.wet, 20, 20000); await new Promise(r => setTimeout(r, 90)); }
      out[p.id] = {low: dB(acc.low), mid: dB(acc.mid), dryLow: dB(acc.dryLow), dryMid: dB(acc.dryMid), name: document.getElementById('p-name').textContent, door: !document.getElementById('door').hidden, amb: !!Q.player.ambNode, finite: Number.isFinite(acc.all) && acc.all > 0};
    }
    return out;
  });
  report.audio.live = live;
  const tilt = id => (live[id].low - live[id].mid) - (live[id].dryLow - live[id].dryMid);
  check('All thirteen places play and none goes silent or non-finite', Object.values(live).every(v => v.finite && Math.max(v.low, v.mid) > -90));
  check('The studio leaves the mix alone', Math.abs(tilt('studio')) < 1.5);
  check('The phone and the laptop lose the low end; the walls lose everything else', tilt('phone') < -35 && tilt('laptop') < -22 && tilt('queue') > 25 && tilt('toilets') > 8 && tilt('smoke') > 15);
  check('The sub stack is heavier than the floor, and the floor heavier than the studio', tilt('sub') > tilt('floor') + 3 && tilt('floor') > 2);
  check('Doors on the three wall places, ambience where a place has its own noise', ['toilets', 'smoke', 'queue'].every(id => live[id].door) && !live.floor.door && live.bar.amb && live.car.amb && !live.phone.amb);

  await page.click('[data-place="phone"]'); await page.waitForTimeout(500);
  check('The phone shows its findings with a fix under each', await page.locator('#p-findings .finding').count() >= 2 && /harmonics/i.test(await page.locator('#p-findings').innerText()) && Number(await page.locator('#p-score b').innerText()) < 62);
  await page.screenshot({path: path.join(qa, 'phone.png'), fullPage: true});
  await page.keyboard.press('s'); const flipped = await page.evaluate(() => OUTSIDE_QA.state.place); await page.keyboard.press('s');
  check('S flips to the studio and back', flipped === 'studio' && await page.evaluate(() => OUTSIDE_QA.state.place) === 'phone');
  await page.keyboard.press('ArrowLeft'); check('Arrow keys walk', await page.evaluate(() => OUTSIDE_QA.state.place) === 'laptop');
  await page.click('[data-place="smoke"]'); await page.waitForTimeout(600);
  const door = await page.evaluate(async () => { const Q = OUTSIDE_QA, band = () => { const d = new Float32Array(Q.player.wet.frequencyBinCount); Q.player.wet.getFloatFrequencyData(d); let s = 0; const hz = Q.ctx.sampleRate / Q.player.wet.fftSize; for (let k = Math.round(600 / hz); k < 2500 / hz; k++) s += Math.pow(10, d[k] / 10); return 10 * Math.log10(s + 1e-20); }; Q.player.holdDoor(false); await new Promise(r => setTimeout(r, 1200)); const shut = band(); Q.player.holdDoor(true); await new Promise(r => setTimeout(r, 1200)); const open = band(), leaf = document.getElementById('door-smoke').classList.contains('open'); Q.player.holdDoor(false); return {shut, open, leaf}; });
  report.audio.door = door;
  check('Holding the door lets the mids out and swings the door on the map', door.open > door.shut + 15 && door.leaf);
  const lv = await page.evaluate(() => { const Q = OUTSIDE_QA, m = document.getElementById('match'); const a = Q.levelsFor('phone')[0]; m.click(); const b = Q.levelsFor('phone')[0]; m.click(); return {a, b}; });
  check('Loudness matching lifts the phone; real levels drop it', lv.a > 0 && lv.b < -15);
  await page.keyboard.press(' '); check('Space pauses', await page.evaluate(() => !OUTSIDE_QA.player.playing)); await page.keyboard.press(' ');

  // offline renders of every place
  const renders = await page.evaluate(async () => {
    const Q = OUTSIDE_QA, t = Q.tracks.mine, out = {};
    for (const p of Q.O.PLACES) { const b = await Q.A.render(t.buffer, p, {start: 0, len: 8, gainDb: Q.levelsFor(p.id)[0]}), d = b.getChannelData(0), e = b.getChannelData(1); let peak = 0, sq = 0, bad = 0, diff = 0; for (let i = 0; i < d.length; i++) { if (!Number.isFinite(d[i])) bad++; peak = Math.max(peak, Math.abs(d[i])); sq += d[i] * d[i]; diff += (d[i] - e[i]) ** 2; } out[p.id] = {peak, rms: Math.sqrt(sq / d.length), bad, side: Math.sqrt(diff / d.length), secs: b.duration}; }
    return out;
  });
  report.audio.renders = renders;
  check('Every place renders offline: finite, audible, not clipping hard', Object.values(renders).every(r => !r.bad && r.rms > .004 && r.peak < 1.6));
  check('Mono places come out mono, and matched places land near each other in level', renders.phone.side < 1e-4 && renders.bt.side < 1e-4 && renders.floor.side > 1e-3 && Object.values(renders).every(r => Math.abs(20 * Math.log10(r.rms / renders.studio.rms)) < 9));

  // downloads
  const grab = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); const f = path.join(qa, d.suggestedFilename()); await d.saveAs(f); return f; };
  const wavFile = await grab('#bounce'), wav = fs.readFileSync(wavFile);
  check('The place bounce is a 16-bit stereo WAV of the drop', wav.toString('latin1', 0, 4) === 'RIFF' && wav.readUInt16LE(22) === 2 && wav.readUInt16LE(34) === 16 && wav.length > 1e6);
  const mdFile = await grab('#md'), md = fs.readFileSync(mdFile, 'utf8');
  check('The Markdown report lists the fixes and all twelve places', /## Fix first/.test(md) && (md.match(/^\| (?!Place|---)/gm) || []).length === 12 && /not a measurement/.test(md));

  // the fixed demo, then a real file as the mix and the flawed demo as the reference
  await page.click('#demo-good'); await page.waitForFunction(() => OUTSIDE_QA.tracks.mine.demo === 'good', null, {timeout: 30000});
  const good = await page.evaluate(() => ({overall: OUTSIDE_QA.tracks.mine.rep.overall, fixes: OUTSIDE_QA.tracks.mine.rep.fixes.length}));
  check('The fixed demo scores far higher and reports none of the seven', good.overall >= bad.overall + 20 && good.fixes === 0);
  const d = O.demo(true, 44100), d2 = O.demo(false, 44100), long = n => { const x = new Float32Array(n.length * 3); x.set(n.map(v => v * .25), 0); x.set(n, n.length); x.set(n.map(v => v * .25), n.length * 2); return x; };
  fs.writeFileSync(path.join(qa, 'mix.wav'), O.wav(long(d.L), long(d.R), 44100)); fs.writeFileSync(path.join(qa, 'ref.wav'), O.wav(d2.L, d2.R, 44100));
  await page.setInputFiles('#file', path.join(qa, 'mix.wav')); await page.waitForFunction(() => OUTSIDE_QA.tracks.mine.name === 'mix', null, {timeout: 30000});
  const up = await page.evaluate(() => { const t = OUTSIDE_QA.tracks.mine; return {start: t.ov.start, len: t.ov.len, secs: t.ov.secs, overall: t.rep.overall, loop: OUTSIDE_QA.player.tracks.mine.loop, pos: OUTSIDE_QA.player.now()}; });
  report.upload = up;
  check('An uploaded file is decoded, the loud middle third is found and looped', up.secs > 90 && up.start > 28 && up.start < 33 && up.loop && up.pos >= up.loop[0] - .1 && up.pos <= up.loop[1] && up.overall >= 90);
  await page.setInputFiles('#ref-file', path.join(qa, 'ref.wav')); await page.waitForFunction(() => OUTSIDE_QA.tracks.ref, null, {timeout: 30000});
  await page.keyboard.press('r'); await page.waitForTimeout(400);
  check('A reference loads, gets its own column and R switches to it', await page.evaluate(() => OUTSIDE_QA.player.which === 'ref' && OUTSIDE_QA.player.playing && document.querySelectorAll('#card td.refcol').length === 12 && getComputedStyle(document.querySelector('#card td.refcol')).display !== 'none' && Math.abs(OUTSIDE_QA.player.tracks.mine.gain + OUTSIDE_QA.tracks.mine.m.lufs - OUTSIDE_QA.player.tracks.ref.gain - OUTSIDE_QA.tracks.ref.m.lufs) < .01));
  await page.keyboard.press('r');
  await page.locator('#card tbody tr').nth(11).click(); check('A row in the report walks to that place', await page.evaluate(() => OUTSIDE_QA.state.place) === 'phone');
  await page.locator('#report').scrollIntoViewIfNeeded(); await page.screenshot({path: path.join(qa, 'report.png')});
  await page.reload(); await page.waitForFunction(() => window.OUTSIDE_QA);
  check('The last place and the settings survive a reload', await page.evaluate(() => OUTSIDE_QA.state.place === 'phone' && document.getElementById('p-name').textContent === 'Phone speaker'));

  const phone = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true}), pp = await phone.newPage();
  pp.on('pageerror', e => report.errors.push('phone: ' + e.message)); await pp.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pp.goto(url); await pp.click('#demo-bad'); await pp.waitForFunction(() => OUTSIDE_QA.tracks.mine, null, {timeout: 30000}); await pp.waitForTimeout(800);
  check('On a phone nothing overflows sideways', await pp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await pp.screenshot({path: path.join(qa, 'phone-layout.png'), fullPage: true});
  check('No page errors', report.errors.length === 0);
} catch (e) { report.failure = String(e && e.stack || e); console.error(report.failure); if (report.errors.length) console.error(report.errors); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); server.close(); }
console.log(`${report.checks.filter(c => c.pass).length} browser checks passed; artifacts in ${qa}`);
