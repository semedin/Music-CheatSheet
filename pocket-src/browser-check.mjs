import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.POCKET_QA_DIR||'/tmp/pocket-qa';fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{if(!['/pocket.html','/orbit.html'].includes(req.url)){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,req.url.slice(1))));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/pocket.html`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const report={checks:[],errors:[],audio:[]};const check=(name,value)=>{report.checks.push({name,pass:!!value});assert(value,name);console.log('PASS '+name);};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.POCKET_QA);
 check('Standalone initializes eight responses and 32 editable steps',await page.locator('.response').count()===8&&await page.locator('.step').count()===32);
 await page.screenshot({path:path.join(qa,'desktop.png'),fullPage:true});
 await page.click('#play');await page.waitForTimeout(600);check('Playback starts and updates the playhead',await page.evaluate(()=>POCKET_QA.player.playing&&document.getElementById('playhead').getAttribute('visibility')==='visible'));
 for(let i=0;i<8;i++){await page.click(`[data-study="${i}"]`);await page.waitForTimeout(100);check('Response '+(i+1)+' selects and keeps playing',await page.evaluate(i=>POCKET_QA.state.selected===i&&POCKET_QA.player.playing,i));}
 await page.click('#play');
 await page.click('#ab');check('Riff-only audition preserves export mutes',await page.evaluate(()=>document.getElementById('ab').getAttribute('aria-pressed')==='true'&&Object.values(POCKET_QA.state.mutes).every(v=>!v)));await page.click('#ab');
 await page.click('[data-step="2"]');await page.click('#regenerate');check('Locked step survives generation',await page.evaluate(()=>POCKET_QA.state.edits[2]===1));
 await page.click('[data-lane="kick"]');check('Part mute affects MIDI export',await page.evaluate(()=>!OT.readMidi(PK.midi(POCKET_QA.state,POCKET_QA.result)).tracks.some(t=>t.name==='Kick')));await page.click('[data-lane="kick"]');
 await page.selectOption('#harmonyMode','manual');await page.fill('#progression','notachord');await page.locator('#progression').press('Tab');check('Invalid chords leave prior composition intact',await page.evaluate(()=>POCKET_QA.state.progression==='i7'&&document.getElementById('progression').value==='i7'));
 await page.selectOption('#demo','1');check('Demo changes key and scale',await page.evaluate(()=>POCKET_QA.state.hook.name==='Organ bounce'&&POCKET_QA.state.hookSound==='organ-stab'&&POCKET_QA.state.harmonyMode==='source'));
 const importBytes=await page.evaluate(()=>Array.from(OT.writeMidi([{name:'Orbit Arp',ch:0,notes:[{t:.75,d:.22,n:74,v:91},{t:2.5,d:.4,n:77,v:80}]},{name:'Drums',ch:9,notes:[{t:0,d:.1,n:36,v:110}]}],{bpm:128,beats:8})));
 await page.setInputFiles('#midiFile',{name:'Orbit-example.mid',mimeType:'audio/midi',buffer:Buffer.from(importBytes)});await page.waitForFunction(()=>POCKET_QA.state.hook.name.includes('Orbit-example'));
 check('Orbit MIDI import retains leading silence and melodic track only',await page.evaluate(()=>POCKET_QA.state.hook.beats===8&&POCKET_QA.state.hook.notes.length===2&&POCKET_QA.state.hook.notes[0].t===.75&&POCKET_QA.state.bpm>127.9));
 const before=await page.evaluate(()=>JSON.stringify(POCKET_QA.state));await page.setInputFiles('#midiFile',{name:'broken.mid',mimeType:'audio/midi',buffer:Buffer.from('not-midi')});await page.waitForTimeout(100);check('Malformed MIDI preserves session',await page.evaluate(before=>JSON.stringify(POCKET_QA.state)===before,before));
 await page.setInputFiles('#midiFile',{name:'<img src=x onerror=alert(1)>.mid',mimeType:'audio/midi',buffer:Buffer.from(importBytes)});await page.waitForTimeout(100);check('Imported names render as text',await page.locator('#hook-name img').count()===0);
 await page.selectOption('#demo','0');await page.selectOption('#bars','4');check('Euphoric hard arp uses its supersaw and four source chords',await page.evaluate(()=>POCKET_QA.state.hookSound==='supersaw'&&POCKET_QA.state.bpm===150&&POCKET_QA.result.harmony.chords.map(c=>c.root).join(',')==='6,2,9,4'&&POCKET_QA.result.foundation==='Rave foundation'));
 const link=await page.evaluate(()=>location.href.split('#')[0]+'#orbit='+POCKET_QA.state.hook.orbit);await page.fill('#orbitLink',link);await page.click('#orbit-load');check('Orbit link keeps patch, harmony and source state',await page.evaluate(()=>!!POCKET_QA.state.hook.orbit&&POCKET_QA.state.hookSound==='supersaw'));

 for(let i=0;i<8;i++){const audio=await page.evaluate(async i=>{const s=PK.defaults();s.bars=4;s.selected=i;const buffer=await PA.render(s,PK.compose(s));let peak=0,power=0,finite=true;for(const v of buffer.getChannelData(0)){finite=finite&&Number.isFinite(v);peak=Math.max(peak,Math.abs(v));power+=v*v;}return {study:i,peak,rms:Math.sqrt(power/buffer.length),finite,length:buffer.length,wav:PA.wav(buffer).slice(0,4).join(',')};},i);report.audio.push(audio);check('Response '+(i+1)+' renders finite, audible, unclipped audio',audio.finite&&audio.rms>.005&&audio.peak<1&&audio.wav==='82,73,70,70');}
 const downloadEvent=page.waitForEvent('download');await page.click('#export-midi');const dl=await downloadEvent;await dl.saveAs(path.join(qa,'phrase.mid'));check('MIDI download has a real SMF header',fs.readFileSync(path.join(qa,'phrase.mid')).subarray(0,4).toString()==='MThd');
 const wavEvent=page.waitForEvent('download');await page.click('#export-wav');const wav=await wavEvent;await wav.saveAs(path.join(qa,'mix.wav'));check('Mix WAV downloads rendered PCM',fs.readFileSync(path.join(qa,'mix.wav')).subarray(0,4).toString()==='RIFF');
 const stemEvent=page.waitForEvent('download',{timeout:60000});await page.click('#export-stems');const zip=await stemEvent;await zip.saveAs(path.join(qa,'stems.zip'));check('Stems ZIP downloads',fs.readFileSync(path.join(qa,'stems.zip')).subarray(0,2).toString()==='PK');
 const savedSeed=await page.evaluate(()=>POCKET_QA.state.seed);await page.click('#save');await page.click('#regenerate');await page.click('.crate-item .load');check('Crate restores a complete idea',await page.evaluate(seed=>POCKET_QA.state.seed===seed,savedSeed));
 const state=await page.evaluate(()=>JSON.stringify(POCKET_QA.state));await page.click('#regenerate');await page.setInputFiles('#session-file',{name:'saved.json',mimeType:'application/json',buffer:Buffer.from(state)});await page.waitForTimeout(100);check('Session import round trips',await page.evaluate(state=>JSON.stringify(POCKET_QA.state)===state,state));
 await page.click('#play');await page.keyboard.press('Escape');check('Escape stops audio',await page.evaluate(()=>!POCKET_QA.player.playing));
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});check('No page overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await page.screenshot({path:path.join(qa,'mobile.png'),fullPage:true});}
 const orbit=await browser.newPage();orbit.on('pageerror',e=>report.errors.push(e.message));await orbit.goto(url.replace('pocket.html','orbit.html'));await orbit.waitForFunction(()=>window.ORBIT_QA);await orbit.evaluate(()=>ORBIT_QA.load(OB.stateFor(OB.PATTERNS.find(p=>p.name==='Euphoric hard arp'))));await orbit.click('#pocketSend');await orbit.waitForFunction(()=>window.POCKET_QA);check('Open in Pocket handoff preserves exact Euphoric hard arp',await orbit.evaluate(()=>POCKET_QA.state.hook.name==='Euphoric hard arp'&&POCKET_QA.state.hookSound==='supersaw'&&POCKET_QA.state.bpm===150&&POCKET_QA.result.harmony.chords.map(c=>c.root).join(',')==='6,2,9,4'));await orbit.close();
 check('No browser JavaScript errors',report.errors.length===0);
}catch(e){report.failure=e.message;throw e;}finally{fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
console.log(report.checks.length+' browser checks passed. Reports: '+qa);
