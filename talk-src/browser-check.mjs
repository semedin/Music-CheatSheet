// Drives talk.html in Chromium: loads, plays, switches loops and treatments, renders audio offline and checks it.
//   node talk-src/browser-check.mjs        (artifacts in /tmp/talk-qa or $TALK_QA_DIR)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
const require = createRequire(import.meta.url), {chromium} = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url)), qa = process.env.TALK_QA_DIR || '/tmp/talk-qa';
fs.mkdirSync(qa, {recursive: true});
const server = http.createServer((req, res) => { if (req.url !== '/talk.html') { res.writeHead(404).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(path.join(root, 'talk.html'))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/talk.html`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
const report = {checks: [], errors: [], audio: {}};
const check = (name, value) => { report.checks.push({name, pass: !!value}); assert(value, name); console.log('PASS ' + name); };
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !m.text().includes('Failed to load resource') && report.errors.push(m.text()));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url); await page.waitForFunction(() => window.TALK_QA?.hook);
  check('Fourteen studies plus the generator, eight moves, eight treatments', await page.locator('.study').count() === 15 && await page.locator('.move').count() === 8 && await page.locator('.treat').count() === 8);
  check('The robot demo is cut into three syllables', await page.evaluate(() => TALK_QA.voice.syl.length === 3));
  await page.screenshot({path: path.join(qa, 'desktop.png'), fullPage: true});
  await page.click('#play'); await page.waitForTimeout(700);
  check('Playback runs and the playhead moves', await page.evaluate(() => TALK_QA.player.playing && TALK_QA.player.beat > 0));
  for (const i of [3, 7, 12]) { await page.click(`[data-study="${i}"]`); await page.waitForTimeout(120); }
  check('Switching loops keeps playing', await page.evaluate(() => TALK_QA.state.study === 12 && TALK_QA.player.playing));
  await page.click('.study.gen'); await page.click('.study.gen');
  check('The generator gives a new seed on a second click', await page.evaluate(() => TALK_QA.state.study === -1 && TALK_QA.state.seed > 1));
  for (const t of ['mantra', 'chipmunk', 'tuned', 'call']) { await page.click(`[data-treat="${t}"]`); await page.waitForTimeout(250); }
  check('Treatments switch while playing', await page.evaluate(() => TALK_QA.state.treatment === 'call' && TALK_QA.player.playing));
  await page.click('#play');
  check('No bass note lands on a kick in any study', await page.evaluate(() => { for (let i = 0; i < 14; i++) { TALK_QA.state.study = i; TALK_QA.update(); if (TALK_QA.ph.readout.kickHits) return false; } return true; }));
  // offline renders: the mix, each part alone, and each hook treatment
  const audio = await page.evaluate(async () => {
    const out = {}, s = TALK_QA.state; s.study = 0; s.treatment = 'call'; TALK_QA.update();
    const st = b => TA.stats(b);
    out.mix = st(await TA.render(TALK_QA.ph, s, TALK_QA.voice));
    for (const part of ['bass', 'drums', 'vocal']) out[part] = st(await TA.render(TALK_QA.ph, s, TALK_QA.voice, {mutes: {bass: part !== 'bass', drums: part !== 'drums', vocal: part !== 'vocal'}}));
    for (const t of TK.TREATMENTS) out['hook-' + t.id] = st(await TA.render({beats: 8, bars: 2, bass: [], drums: [], vocal: TK.treat(TALK_QA.hook, t.id, {key: s.key}), markers: []}, s, TALK_QA.voice, {mutes: {}, tail: 1}));
    // the talking bass must actually change its spectrum: compare an "ee" note with an "oo" note
    const one = async shape => { const c = new OfflineAudioContext(1, 44100, 44100), g = TA.graph(c, c.destination); TA.bassNote(c, g.bass, {n: 45, d: 1.5, v: 110, shape, bend: 0, glide: 0, mouth: .8}, .05, .476, {drive: .45, sub: 0}); const b = await c.startRendering(); const x = b.getChannelData(0).slice(8000, 24384); let hi = 0, all = 0; for (let i = 1; i < x.length; i++) { const d = x[i] - x[i - 1]; hi += d * d; all += x[i] * x[i]; } return hi / all; };
    out.brightnessEE = await one('ee'); out.brightnessOO = await one('oo');
    return out;
  });
  report.audio = audio;
  for (const [k, v] of Object.entries(audio)) if (typeof v === 'object') check(k + ' renders finite, audible and unclipped (peak ' + v.peak.toFixed(2) + ', rms ' + v.rms.toFixed(3) + ')', v.bad === 0 && v.rms > .004 && v.peak <= 1);
  check('"ee" is brighter than "oo" (the formants do something): ' + audio.brightnessEE.toFixed(3) + ' vs ' + audio.brightnessOO.toFixed(3), audio.brightnessEE > audio.brightnessOO * 1.3);
  const dl = await Promise.all([page.waitForEvent('download'), page.click('#x-midi')]);
  check('MIDI downloads', (await dl[0].path()) && dl[0].suggestedFilename().endsWith('.mid'));
  const mobile = await browser.newPage({viewport: {width: 390, height: 900}});
  await mobile.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await mobile.goto(url); await mobile.waitForFunction(() => window.TALK_QA?.hook);
  check('No horizontal scroll on a phone', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.screenshot({path: path.join(qa, 'mobile.png'), fullPage: true});
  check('No page errors', report.errors.length === 0);
} finally {
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); server.close();
  if (report.errors.length) console.log('Errors:', report.errors);
}
