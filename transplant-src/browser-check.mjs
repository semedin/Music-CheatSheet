// Drives transplant.html in Chromium: plays, switches shapes, loads a MIDI loop, paints bars, renders audio
// offline and checks it, analyses the demo track and A/Bs it, downloads every export, and follows the hand-off
// from Blueprint.
//   node transplant-src/browser-check.mjs        (artifacts in /tmp/transplant-qa or $TRANSPLANT_QA_DIR)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
import {load} from './load.mjs';
const require = createRequire(import.meta.url), {chromium} = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url)), qa = process.env.TRANSPLANT_QA_DIR || '/tmp/transplant-qa';
fs.mkdirSync(qa, {recursive: true});
const {OT} = load();
const server = http.createServer((req, res) => {
  const f = decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')) || 'index.html';
  if (!/^[\w.-]+\.html$/.test(f) || !fs.existsSync(path.join(root, f))) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fs.readFileSync(path.join(root, f)));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
const report = {checks: [], errors: [], audio: {}};
const check = (name, value) => { report.checks.push({name, pass: !!value}); assert(value, name); console.log('PASS ' + name); };
const watch = page => { page.on('pageerror', e => report.errors.push(e.message)); page.on('console', m => m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && report.errors.push(m.text())); return page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); };
const saved = async (dl, name) => { const p = path.join(qa, name); await dl.saveAs(p); return fs.readFileSync(p); };
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
  await watch(page);
  await page.goto(base + 'transplant.html'); await page.waitForFunction(() => window.TRANSPLANT_QA?.ready);
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForFunction(() => window.TRANSPLANT_QA?.ready);
  check('Six shapes, four demo loops, and the board drawn on first load', await page.locator('[data-shape]').count() === 6 && await page.locator('[data-demo]').count() === 4 && await page.isVisible('#board') && await page.locator('#parts .prow').count() === 9);
  await page.screenshot({path: path.join(qa, 'desktop-top.png')});
  await page.click('#heroPlay'); await page.waitForTimeout(1500);
  check('The hero plays the transplant from before the first drop, and the playhead moves', await page.evaluate(() => { const q = TRANSPLANT_QA; return q.A.pl.playing && q.beatNow() > 40 * 4; }));
  for (const id of ['tech-house', 'melodic-techno', 'hard-techno']) { await page.click(`[data-shape="${id}"]`); await page.waitForTimeout(150); }
  check('Switching shapes keeps playing and redraws the arrangement', await page.evaluate(() => TRANSPLANT_QA.A.pl.playing && TRANSPLANT_QA.S.model.shape === 'hard-techno' && TRANSPLANT_QA.S.plan.bars === 128));
  await page.click('#play');
  // a loop from MIDI files, as Live exports them
  const drums = (p, steps) => { const o = []; for (let b = 0; b < 4; b++) for (const s of steps) o.push({t: b * 4 + s / 4, d: 0.1, n: p, v: 100}); return o; };
  const files = [['Beat.mid', [{name: 'Beat', ch: 9, notes: [...drums(36, [0, 4, 8, 12]), ...drums(39, [4, 12]), ...drums(42, [2, 6, 10, 14])]}]], ['Bassline.mid', [{name: 'Bassline', notes: [0, 1, 2, 3].map(i => ({t: i * 4 + 0.5, d: 0.5, n: 36, v: 100}))}]], ['Stabs.mid', [{name: 'Stabs', notes: [0, 4, 8, 12].flatMap(t => [60, 63, 67].map(n => ({t: t + 0.75, d: 0.25, n, v: 100})))}]]];
  const paths = files.map(([name, tr]) => { const p = path.join(qa, name); fs.writeFileSync(p, OT.writeMidi(tr, {bpm: 125, beats: 16})); return p; });
  await page.setInputFiles('#loopFile', paths); await page.waitForTimeout(400);
  check('Three MIDI files become five parts with the right roles, at the file\'s tempo', await page.evaluate(() => { const l = TRANSPLANT_QA.S.loop, r = Object.fromEntries(l.parts.map(p => [p.name, p.role])); return l.parts.length === 5 && r.Kick === 'kick' && r.Clap === 'clap' && r['Closed hat'] === 'hats' && r.Bassline === 'bass' && r.Stabs === 'chords' && Math.round(TRANSPLANT_QA.S.bpm) === 125; }));
  // painting a bar on a part's row, then undo
  const row = await page.evaluate(() => { const S = TRANSPLANT_QA.S, x = S.plan.parts.find(p => p.role === 'chords'); const rows = [...document.querySelectorAll('#labels .lb.part')]; const el = rows.find(r => r.textContent.includes(x.part.name)); return {y: parseFloat(el.style.top) + 13, id: x.id, on0: x.act.on[0]}; });
  await page.locator('#cv').click({position: {x: 3, y: row.y}});
  check('Clicking a part\'s row switches that bar and the arrangement follows', await page.evaluate(r => { const x = TRANSPLANT_QA.S.plan.parts.find(p => p.id === r.id); return x.act.on[0] === (r.on0 ? 0 : 1) && x.act.why[0] >= 3; }, row));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100);
  check('Undo gives the bar back to the reference', await page.evaluate(r => TRANSPLANT_QA.S.plan.parts.find(p => p.id === r.id).act.on[0] === r.on0 && !Object.keys(TRANSPLANT_QA.S.ov).length, row));
  await page.click('[data-shape="peak-techno"]'); await page.waitForTimeout(150);
  await page.locator('#cats input[data-cat="Glitch"]').uncheck();
  check('Switching off a family of moves marks them off and leaves your notes alone there', await page.evaluate(() => TRANSPLANT_QA.S.plan.log.filter(l => l.move.cat === 'Glitch').every(l => l.status === 'off') && document.querySelectorAll('.pill.off').length >= 2));
  await page.locator('#cats input[data-cat="Glitch"]').check();
  await page.click('[data-demo="warehouse"]'); await page.waitForTimeout(150);
  // offline renders: the drop, the build into it, every FX alone
  const audio = await page.evaluate(async () => {
    const S = TRANSPLANT_QA.S, pl = S.plan, out = {}, drop = S.model.sections.find(s => s.label === 'Drop');
    out.drop = TA.stats(await TA.render(pl, {k0: drop.start * 4, k1: drop.start * 4 + 32}));
    out.buildIntoDrop = TA.stats(await TA.render(pl, {k0: (drop.start - 8) * 4, k1: drop.start * 4 + 8}));
    out.breakSection = TA.stats(await TA.render(pl, {k0: S.model.sections.find(s => s.label === 'Break').start * 4, k1: S.model.sections.find(s => s.label === 'Break').start * 4 + 32}));
    for (const t of ['riser', 'reverse', 'pitchUp', 'crash', 'boom']) { const f = pl.fx.find(x => x.type === t); if (f) out['fx-' + t] = TA.stats(await TA.render(pl, {k0: f.k0, k1: Math.max(f.k1, f.k0 + 1), only: {notes: false, fxIds: new Set([f])}, tail: 1})); }
    // the gap before the drop is silent in the render
    const gap = pl.mutes[0], r = await TA.render(pl, {k0: gap.k0 - 4, k1: gap.k1 + 4, tail: 0}), sr = r.sampleRate, spb = 60 / pl.bpm, a = Math.round((4 + 0.12) * spb * sr), b = Math.round((4 + (gap.k1 - gap.k0) - 0.05) * spb * sr);
    let p = 0; for (let i = a; i < b; i++) p = Math.max(p, Math.abs(r.L[i]), Math.abs(r.R[i])); out.gapPeak = p;
    return out;
  });
  report.audio = audio;
  for (const [k, v] of Object.entries(audio)) if (typeof v === 'object') check(`${k} renders finite, audible and unclipped (peak ${v.peak.toFixed(2)}, rms ${v.rms.toFixed(3)})`, v.nonFinite === 0 && v.rms > 0.002 && v.peak <= 1);
  check(`The gap before the drop renders silent (peak ${audio.gapPeak.toFixed(4)})`, audio.gapPeak < 0.02);
  // downloads
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xParts')]);
  const zip = await saved(dl, 'parts.zip'); check('Parts ZIP downloads (MIDI per track, plan, README)', zip[0] === 0x50 && zip[1] === 0x4b && zip.length > 4000);
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xMidi')]);
  const mid = OT.readMidi(await saved(dl, 'arranged.mid')); check(`The arranged MIDI reads back: ${mid.tracks.length} tracks, ${mid.tracks.reduce((s, t) => s + t.notes.length, 0)} notes`, mid.tracks.length >= 6 && mid.tracks.some(t => t.cc.some(c => c.cc === 74)));
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xPlan')]);
  check('The plan downloads with every move and its breakpoints', /## Every move/.test((await saved(dl, 'plan.md')).toString()));
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xFx')]);
  const fxzip = await saved(dl, 'fx.zip'); check('FX audio downloads as a ZIP of WAVs', fxzip[0] === 0x50 && fxzip.includes(Buffer.from('RIFF')));
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xSave')]);
  const sess = JSON.parse((await saved(dl, 'session.json')).toString()); check('The session saves', sess.v === 1 && sess.model && sess.loop);
  await page.screenshot({path: path.join(qa, 'desktop-full.png'), fullPage: true});
  // the real thing: analyse the demo track in the page, then A/B it
  await page.click('#refDemo');
  await page.waitForFunction(() => TRANSPLANT_QA.S.model.source === 'audio', null, {timeout: 180000});
  check('The demo track is analysed in the page: 8 sections and its moves, A/B ready', await page.evaluate(() => { const S = TRANSPLANT_QA.S; return S.model.sections.length === 8 && S.model.moves.length >= 15 && !!S.refBuf && !document.querySelector('#abRef').disabled; }));
  await page.click('#play'); await page.waitForTimeout(500); await page.keyboard.press('r'); await page.waitForTimeout(800);
  check('R switches to the reference at the same bar, and it plays', await page.evaluate(() => TRANSPLANT_QA.S.mode === 'ref' && TRANSPLANT_QA.A.refOn && TRANSPLANT_QA.beatNow() > 0));
  await page.keyboard.press('r'); await page.waitForTimeout(400);
  check('R again comes back to the transplant', await page.evaluate(() => TRANSPLANT_QA.S.mode === 'you' && TRANSPLANT_QA.A.pl.playing && !TRANSPLANT_QA.A.refOn));
  await page.waitForFunction(() => TRANSPLANT_QA.S.ourLufs != null, null, {timeout: 60000});
  check('The A/B is loudness-matched to the preview', await page.evaluate(() => /LUFS/.test(document.querySelector('#abInfo').textContent)));
  await page.click('#play');
  await page.screenshot({path: path.join(qa, 'desktop-analysed.png')});
  // the hand-off from Blueprint
  const bp = await browser.newPage({viewport: {width: 1280, height: 900}});
  await watch(bp);
  await bp.goto(base + 'blueprint.html'); await bp.click('#demoBtn');
  await bp.waitForSelector('#results:not([hidden])', {timeout: 180000});
  await Promise.all([bp.waitForURL(/transplant\.html/), bp.click('#transplantBtn')]);
  await bp.waitForFunction(() => window.TRANSPLANT_QA?.ready && TRANSPLANT_QA.S.model && TRANSPLANT_QA.S.model.source === 'blueprint', null, {timeout: 60000});
  check('Blueprint hands its analysis and audio to Transplant: same sections, A/B ready', await bp.evaluate(() => { const S = TRANSPLANT_QA.S; return S.model.sections.length === 8 && !!S.refBuf && !location.hash.includes('blueprint'); }));
  // phones
  const mobile = await browser.newPage({viewport: {width: 390, height: 860}, deviceScaleFactor: 2});
  await watch(mobile);
  await mobile.goto(base + 'transplant.html'); await mobile.waitForFunction(() => window.TRANSPLANT_QA?.ready);
  check('No horizontal scroll on a phone', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.screenshot({path: path.join(qa, 'mobile.png'), fullPage: true});
  check('No page errors', report.errors.length === 0);
} finally {
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); server.close();
  if (report.errors.length) console.log('Errors:', report.errors);
}
console.log(`${report.checks.filter(c => c.pass).length} browser checks passed; artifacts in ${qa}`);
