// Drives wow.html in Chromium: loads, plays, switches lanes and sections, renders audio offline and checks it.
//   node wow-src/browser-check.mjs        (artifacts in /tmp/wow-qa or $WOW_QA_DIR)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
const require = createRequire(import.meta.url), {chromium} = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url)), qa = process.env.WOW_QA_DIR || '/tmp/wow-qa';
fs.mkdirSync(qa, {recursive: true});
const server = http.createServer((req, res) => { if (req.url !== '/wow.html') { res.writeHead(404).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(path.join(root, 'wow.html'))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/wow.html`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
const report = {checks: [], errors: [], audio: {}};
const check = (name, value) => { report.checks.push({name, pass: !!value}); assert(value, name); console.log('PASS ' + name); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 2, acceptDownloads: true}), page = await ctx.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !m.text().includes('Failed to load resource') && report.errors.push(m.text()));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url); await page.waitForFunction(() => window.WOW_QA);
  check('Sixteen lanes, six sections, three ideas and the generator', await page.locator('.style').count() === 16 && await page.locator('#map button').count() === 6 && await page.locator('#ideas button').count() === 4);
  await page.click('[data-family="techno"]'); check('The family filter shows eight techno lanes', await page.locator('.style').count() === 8 && await page.locator('.style.techno').count() === 8);
  await page.click('[data-family="all"]');
  await page.click('#play'); await page.waitForTimeout(900);
  check('Playback runs and the playhead moves', await page.evaluate(() => WOW_QA.player.playing && WOW_QA.player.now().frac > 0 && document.getElementById('head').getAttribute('visibility') === 'visible'));
  await page.screenshot({path: path.join(qa, 'playing.png')});
  for (const id of ['warp', 'rumble', 'acid']) { await page.click(`[data-style="${id}"]`); await page.waitForTimeout(700); }
  check('Switching lanes keeps playing and takes the lane\'s tempo and key', await page.evaluate(() => WOW_QA.state.style === 'acid' && WOW_QA.state.bpm === 140 && WOW_QA.player.playing && WOW_QA.player.rig.style.id === 'acid'));
  await page.click('[data-section="build"]'); await page.keyboard.press('5');
  check('Sections switch by click and by key', await page.evaluate(() => WOW_QA.state.section === 'drop2' && document.querySelector('#sec-name').textContent === 'Drop 2'));
  await page.click('[data-idea="-1"]'); await page.click('[data-idea="-1"]');
  check('New idea writes a different loop each time', await page.evaluate(() => WOW_QA.state.idea === -1 && WOW_QA.state.seed === 2 && WOW_QA.idea().notes.length > 1));
  await page.click('#play'); await page.click('[data-section="break"]'); await page.click('#journey'); await page.waitForTimeout(1200);
  check('The whole track starts from the chosen section', await page.evaluate(() => WOW_QA.mode === 'journey' && WOW_QA.player.now().pos >= 24 && WOW_QA.player.now().pos < 32 && /BREAK/.test(document.getElementById('pos').textContent)));
  await page.click('[data-section="drop2"]'); await page.waitForTimeout(2400);
  check('Clicking a section while the track plays jumps there on the bar', await page.evaluate(() => WOW_QA.player.now().pos >= 40 && WOW_QA.state.section === 'drop2'));
  await page.click('#journey');
  check('Stop stops', await page.evaluate(() => !WOW_QA.player.playing));
  await page.fill('#bpm', '999'); await page.dispatchEvent('#bpm', 'change'); await page.selectOption('#key', '5');
  check('Tempo is clamped and the root shows its frequency', await page.evaluate(() => WOW_QA.state.bpm === 170 && /F1 = 43\.7 Hz/.test(document.getElementById('hz').textContent)));
  await page.click('[data-style="tech"]'); await page.waitForTimeout(200); await page.click('#play');
  await page.screenshot({path: path.join(qa, 'desktop.png'), fullPage: true});
  const audio = await page.evaluate(async () => {
    const out = {}, stat = b => { const d = b.getChannelData(0); let peak = 0, sq = 0, bad = 0, hi = 0, prev = 0; for (const x of d) { if (!Number.isFinite(x)) bad++; peak = Math.max(peak, Math.abs(x)); sq += x * x; hi += (x - prev) * (x - prev); prev = x; } return {peak, rms: Math.sqrt(sq / d.length), bright: Math.sqrt(hi / sq), bad, secs: b.length / b.sampleRate}; };
    for (const st of WOW.STYLES) for (const id of ['drop1', 'break']) out[st.id + '/' + id] = stat(await WowAudio.render(st, WOW.sectionFor(st, st.ideas[0], id).bars, {bpm: st.bpm, root: WOW.rootMidi(st.key), knobs: WOW.defaults()}));
    const tech = WOW.STYLES[0], r = async k => stat(await WowAudio.render(tech, WOW.sectionFor(tech, tech.ideas[0], 'drop1').bars, {bpm: 128, root: 31, knobs: {...WOW.defaults(), drums: 0, ...k}}));
    out.wow0 = await r({wow: 0, sub: 0}); out.wow100 = await r({wow: 100, sub: 0}); out.sub0 = await r({sub: 0}); out.sub100 = await r({sub: 100});
    return out;
  });
  report.audio = audio;
  const lanes = Object.entries(audio).filter(([k]) => k.includes('/'));
  check('All 32 offline renders are finite, audible and below full scale', lanes.length === 32 && lanes.every(([, a]) => a.bad === 0 && a.rms > .01 && a.peak < .98));
  check('Eight bars render to exactly eight bars', Math.abs(audio['tech/drop1'].secs - 8 * 4 * 60 / 128) < .001);
  check('The wow knob makes the talking notes measurably brighter', audio.wow100.bright > audio.wow0.bright * 1.15);
  check('The sub knob adds real level', audio.sub100.rms > audio.sub0.rms * 1.3);
  for (const [btn, ext, min] of [['#midi-sec', '.mid', 300], ['#midi-all', '.mid', 3000], ['#wav-sec', '.wav', 1e6]]) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(btn)]), file = path.join(qa, dl.suggestedFilename()); await dl.saveAs(file);
    check(`${btn} downloads a ${ext} file`, file.endsWith(ext) && fs.statSync(file).size > min);
  }
  await page.fill('#wow', '35'); await page.reload(); await page.waitForFunction(() => window.WOW_QA);
  check('Settings survive a reload', await page.evaluate(() => WOW_QA.state.style === 'tech' && WOW_QA.state.wow === 35));
  const phone = await browser.newPage({viewport: {width: 390, height: 844}}); await phone.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await phone.goto(url); await phone.waitForFunction(() => window.WOW_QA);
  check('No sideways scroll on a phone', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await phone.screenshot({path: path.join(qa, 'phone.png'), fullPage: true});
  check('No page errors', report.errors.length === 0);
} finally {
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); server.close();
}
console.log(`${report.checks.length} browser checks passed. Artifacts: ${qa}`);
