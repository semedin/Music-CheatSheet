// Drives breeder.html in Chromium: plays, stars and breeds, swaps grooves on the bar while playing (across tempos),
// locks genes, renders grooves offline and checks them, breeds from a MIDI loop, downloads every export, survives a
// reload, and hands a groove to Transplant.
//   node breeder-src/browser-check.mjs        (artifacts in /tmp/breeder-qa or $BREEDER_QA_DIR)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
import {load} from './load.mjs';
const require = createRequire(import.meta.url), {chromium} = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url)), qa = process.env.BREEDER_QA_DIR || '/tmp/breeder-qa';
fs.mkdirSync(qa, {recursive: true});
const {OT} = load();
const server = http.createServer((req, res) => {
  const f = decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')) || 'index.html';
  if (!/^[\w.-]+\.html$/.test(f) || !fs.existsSync(path.join(root, f))) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fs.readFileSync(path.join(root, f)));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
const report = {checks: [], errors: [], audio: {}};
const check = (name, value) => { report.checks.push({name, pass: !!value}); assert(value, name); console.log('PASS ' + name); };
const watch = page => { page.on('pageerror', e => report.errors.push(e.message)); page.on('console', m => m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && report.errors.push(m.text())); return page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); };
const saved = async (dl, name) => { const p = path.join(qa, name); await dl.saveAs(p); return fs.readFileSync(p); };
const Q = (page, fn, arg) => page.evaluate(fn, arg);
const wraps = n => n < 0 ? 'no (the page froze)' : n;
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
  await watch(page);
  await page.goto(base + 'breeder.html'); await page.waitForFunction(() => window.BREEDER_QA?.ready);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.BREEDER_QA?.ready);
  check('Fourteen genres and a first techno family of eight on load', await page.locator('[data-genre]').count() === 14 && await page.locator('#pop .card').count() === 8 && await Q(page, () => BREEDER_QA.S.genre === 'techno'));
  await page.screenshot({path: path.join(qa, 'desktop-top.png')});
  await page.click('#heroGo'); await page.waitForTimeout(1200);
  check('The hero plays the first groove, and the playhead moves', await Q(page, () => BREEDER_QA.A.pl.playing && BREEDER_QA.A.pl.beat() > 0.5));
  // the loop wraps every four bars: play through three wraps and the page has to stay responsive
  const wrapsOk = await Promise.race([(async () => {
    let wraps = 0, last = 0;
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(500); const b = await Q(page, () => BREEDER_QA.A.pl.beat()); if (b < last - 1) wraps++; last = b; }
    return wraps;
  })(), new Promise(r => setTimeout(() => r(-1), 60000))]);
  check(`Playing through ${wraps(wrapsOk)} loop wraps, the page stays responsive and keeps time`, wrapsOk >= 2 && await Q(page, () => BREEDER_QA.A.pl.playing));
  await page.locator('#pop .card .star').nth(0).click(); await page.locator('#pop .card .star').nth(4).click();
  check('Stars enable Breed', await page.isEnabled('#breed') && /2 stars/.test(await page.textContent('#breedHint')));
  await page.click('#breed'); await page.waitForTimeout(500);
  check('Breeding makes generation 2: the two parents first, six children, each measured', await Q(page, () => { const S = BREEDER_QA.S, m = S.gens[S.cur].members; return S.gens.length === 2 && m.length === 8 && m[0].elite && m[1].elite && m.slice(2).every(k => k.parents.length === 2 && Number.isFinite(BREEDER_QA.M(k).fit)); }));
  // swapping on the bar line while playing, across tempos
  const swap = await Q(page, async () => {
    const S = BREEDER_QA.S, ms = S.gens[S.cur].members, a = BREEDER_QA.A, cur = ms.find(m => m.id === S.playId) || ms[0];
    const other = ms.find(m => m.id !== cur.id && m.bpm !== cur.bpm) || ms.find(m => m.id !== cur.id);
    const before = a.pl.beat(); BREEDER_QA.hear(other); const pending = a.pl.pending;
    await new Promise(r => setTimeout(r, 2600));
    const after = a.pl.beat();
    return {pending, playing: a.pl.playing, now: S.playId === other.id, plan: a.eng.plan.bpm === other.bpm, before, after, bpmChange: other.bpm !== cur.bpm};
  });
  check(`Clicking another groove while playing swaps it on the next bar without stopping${swap.bpmChange ? ', across a tempo change' : ''}`, swap.pending && swap.playing && swap.now && swap.plan && Number.isFinite(swap.after));
  // locks
  await page.click('[data-lock="kick"]'); await page.click('[data-lock="bass"]');
  await page.locator('#pop .card .star').nth(2).click(); await page.locator('#pop .card .star').nth(5).click();
  await page.click('#breed'); await page.waitForTimeout(400);
  check('Locked kick and bassline are exactly the first star\'s in every child', await Q(page, () => { const S = BREEDER_QA.S, g = S.gens[S.cur], p = S.byId.get(g.parents[0]); const kids = g.members.filter(k => !k.elite); return kids.length >= 6 && kids.every(k => k.drums.k === p.drums.k && k.bass.steps === p.bass.steps); }));
  await page.click('[data-lock="kick"]'); await page.click('[data-lock="bass"]');
  await page.click('#back');
  check('Back a generation shows generation 2 again', /^2 \//.test(await page.textContent('#genNav')) && /Generation 2/.test(await page.textContent('#genTitle')));
  await page.click('#fwd');
  // offline renders across genres (playback stopped first: renders and live audio share the CPU)
  if (await Q(page, () => BREEDER_QA.A.pl.playing)) await page.click('#play');
  const audio = await Q(page, async () => {
    const out = {};
    for (const id of ['techno', 'tech-house', 'garage', 'hard-techno']) { const g = TB.seed(id, 2, 4)[1]; out[id] = TA.stats(await TA.render(TB.plan(g), {k0: 0, k1: 16, tail: 1, kickHz: TA.kickFor({pc: g.key})})); }
    return out;
  });
  report.audio = audio;
  for (const [k, v] of Object.entries(audio)) check(`${k} groove renders finite, audible and unclipped (peak ${v.peak.toFixed(2)}, rms ${v.rms.toFixed(3)})`, v.nonFinite === 0 && v.rms > 0.01 && v.peak <= 1);
  // exports
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xMidi')]);
  const mid = OT.readMidi(await saved(dl, 'loop.mid')); check(`The MIDI loop reads back: ${mid.tracks.length} tracks, drums on channel 10`, mid.tracks.some(t => t.name === 'Drums' && t.notes.every(n => n.ch === 9)) && mid.tracks.some(t => t.name === 'Riff'));
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xLine')]);
  const line = OT.readMidi(await saved(dl, 'lineage.mid')); check('The lineage MIDI has a marker per generation', line.tracks.length >= 3);
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xWav')]);
  const wav = await saved(dl, 'loop.wav'); check('The WAV loop downloads', wav.slice(0, 4).toString() === 'RIFF' && wav.length > 100000);
  await page.click('#xKeep');
  check('Keep puts the groove on the keepers shelf', await page.locator('#keepers .keeper').count() === 1);
  // from your own loop
  const d = (p, steps) => { const o = []; for (let b = 0; b < 2; b++) for (const s of steps) o.push({t: b * 4 + s / 4, d: 0.1, n: p, v: 100}); return o; };
  const f = path.join(qa, 'My groove.mid');
  fs.writeFileSync(f, OT.writeMidi([{name: 'Drums', ch: 9, notes: [...d(36, [0, 4, 8, 12]), ...d(39, [4, 12]), ...d(42, [2, 6, 10, 14])]}, {name: 'Bass', ch: 1, notes: [{t: 0.5, d: 0.25, n: 41, v: 100}, {t: 2.5, d: 0.25, n: 48, v: 100}]}, {name: 'Lead', ch: 2, notes: [0, 3, 6, 10].map((s, i) => ({t: s / 4, d: 0.2, n: [65, 68, 72, 70][i], v: 100}))}], {bpm: 124, beats: 8}));
  await page.setInputFiles('#loopFile', f); await page.waitForTimeout(500);
  check('Breeding from a MIDI loop: your loop first, seven children of it', await Q(page, () => { const S = BREEDER_QA.S, m = S.gens[S.cur].members; return m.length === 8 && m[0].name === 'My groove' && m.slice(1).every(k => k.parents[0] === m[0].id); }));
  await page.screenshot({path: path.join(qa, 'desktop-full.png'), fullPage: true});
  // survives a reload
  const n = await Q(page, () => BREEDER_QA.S.gens.length);
  await page.waitForTimeout(500); await page.reload(); await page.waitForFunction(() => window.BREEDER_QA?.ready);
  check('The family and the keepers survive a reload', await Q(page, n => BREEDER_QA.S.gens.length === n && BREEDER_QA.S.keepers.length === 1, n));
  // into Transplant
  await Promise.all([page.waitForURL(/transplant\.html/), page.click('#xTransplant')]);
  await page.waitForFunction(() => window.TRANSPLANT_QA?.ready && TRANSPLANT_QA.S.loop && TRANSPLANT_QA.S.plan, null, {timeout: 30000});
  check('Transplant it: the groove arrives in Transplant as the loop, arranged', await Q(page, () => { const S = TRANSPLANT_QA.S; return S.loop.bars === 4 && S.loop.parts.some(p => p.role === 'kick') && S.loop.parts.some(p => p.role === 'lead') && S.plan.metrics.notes > 500 && !location.hash.includes('breeder'); }));
  const mobile = await browser.newPage({viewport: {width: 390, height: 860}, deviceScaleFactor: 2});
  await watch(mobile);
  await mobile.goto(base + 'breeder.html'); await mobile.waitForFunction(() => window.BREEDER_QA?.ready);
  check('No horizontal scroll on a phone', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.screenshot({path: path.join(qa, 'mobile.png'), fullPage: true});
  check('No page errors', report.errors.length === 0);
} finally {
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); server.close();
  if (report.errors.length) console.log('Errors:', report.errors);
}
console.log(`${report.checks.filter(c => c.pass).length} browser checks passed; artifacts in ${qa}`);
