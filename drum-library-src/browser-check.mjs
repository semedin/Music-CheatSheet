// Dependency-free headless Chromium QA, using a fresh task-local browser profile.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
const qa=path.resolve('drum-library-src/qa');fs.mkdirSync(qa,{recursive:true});
const profile=path.join(os.tmpdir(),'fieldwork-drum-qa-'+process.pid);
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const endpoint=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Browser did not start: '+output)),18000);child.on('error',reject);child.stderr.on('data',b=>{output+=b;const m=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});child.on('exit',c=>reject(Error('Browser exited '+c+': '+output)));});
const port=new URL(endpoint).port;let targets;
try{for(let i=0;i<20;i++){try{targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(targets.some(t=>t.type==='page'))break;}catch{}await new Promise(r=>setTimeout(r,150));}if(!targets)throw Error('Cannot reach local browser debugger.');}catch(e){child.kill();throw e;}
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let nextId=0;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);});
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
const checks=[];async function check(name,expression){const result=await evaluate(expression);if(!result)throw Error('FAIL '+name);checks.push(name);console.log('PASS '+name);}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:pathToFileURL(path.resolve('drum-library.html')).href});
 for(let i=0;i<40;i++){if(await evaluate("document.readyState==='complete' && typeof S!=='undefined' && document.querySelectorAll('.cell').length===384"))break;await new Promise(r=>setTimeout(r,100));}
 await check('page boots without external resources',"document.querySelectorAll('.cell').length===384 && LIB.length===48 && document.querySelectorAll('.gcard').length===12");
 await check('desktop has no page overflow','document.documentElement.scrollWidth<=innerWidth');
 await check('accented downbeats use the lane colour, not the background stripe',"getComputedStyle(cells.kick[0]).backgroundColor==='rgb(255, 75, 50)' && getComputedStyle(cells.clap[4]).backgroundColor==='rgb(255, 138, 43)'");
 await check('Splice links contain the current active lane searches',"document.querySelectorAll('.sound-item').length===4 && [...document.querySelectorAll('.search-link')].every(a=>a.href.includes('splice.com/sounds/search/samples?search='))");
 await check('keyboard cell activation, undo and redo work',"(()=>{const c=cells.kick[0];c.click();const edited=S.pat.kick[0]==='o';$('undo').click();const restored=S.pat.kick[0]==='X';$('redo').click();return edited&&restored&&S.pat.kick[0]==='o';})()");
 await check('take selector changes notes and undo restores them',"(()=>{const a=JSON.stringify(S.pat);$('take').value='Stripped';$('take').dispatchEvent(new Event('change'));const changed=JSON.stringify(S.pat)!==a;$('undo').click();return changed&&JSON.stringify(S.pat)===a;})()");
 await check('search and family filters combine; reset recovers the library',"(()=>{$('search').value='jungle';$('search').dispatchEvent(new Event('input'));const found=document.querySelectorAll('.gcard').length===1;document.querySelector('[data-family=House]').click();const empty=!$('emptyLibrary').hidden;$('clearFilters').click();return found&&empty&&document.querySelectorAll('.gcard').length===12;})()");
 await check('pagination exposes all studies',"(()=>{for(let i=0;i<3;i++)$('showMore').click();return document.querySelectorAll('.gcard').length===48&&$('showMore').hidden;})()");
 await check('favourites and saved sessions restore',"(()=>{loadPattern(30);$('favourite').click();$('onlyFavourites').click();const fav=document.querySelectorAll('.gcard').length===1;$('saveSession').click();loadPattern(0);$('restoreSession').click();const restored=S.index===30;$('onlyFavourites').click();return fav&&restored;})()");
 await check('morph is independent until sent and endpoints match',"(()=>{const before=JSON.stringify(S.pat);$('morphSl').value=100;$('morphSl').dispatchEvent(new Event('input'));const stable=JSON.stringify(S.pat)===before;$('morphLoad').click();return stable&&JSON.stringify(S.pat)===JSON.stringify(expand(LIB[13].p));})()");
 await check('play starts, edits are scheduled and stop clears transport',"(async()=>{await start();await new Promise(r=>setTimeout(r,180));const ok=S.playing&&AC.state==='running'&&nextStep>0;stop();return ok&&!S.playing&&timer===null&&runBus===null;})()");
 await check('mute and solo state reset when loading a pattern',"(()=>{document.querySelector('[data-mute=kick]').click();document.querySelector('[data-solo=snare]').click();loadPattern(0);return !S.mute.kick&&!S.solo.snare&&document.querySelector('[data-mute=kick]').getAttribute('aria-pressed')==='false';})()");
 await check('all nine synthesized kits render finite non-silent audio',`(async()=>{stop();const old={AC,master,limiter,_nb,voiceOutput};const stats=[];try{for(const name of KIT_NAMES){AC=new OfflineAudioContext(1,44100*3,44100);_nb=null;master=AC.createGain();master.gain.value=.45;master.connect(AC.destination);limiter=AC.createDynamicsCompressor();limiter.connect(master);voiceOutput=limiter;LANES.forEach((l,i)=>l.play(.03+i*.14,.75,KITS[name]));const data=(await AC.startRendering()).getChannelData(0);let peak=0,sum=0;for(const v of data){if(!Number.isFinite(v))return false;peak=Math.max(peak,Math.abs(v));sum+=v*v;}stats.push({kit:name,peak,rms:Math.sqrt(sum/data.length)});if(peak<.005||peak>=1)return false;}return stats.length===9;}finally{AC=old.AC;master=old.master;limiter=old.limiter;_nb=old._nb;voiceOutput=old.voiceOutput;}})()`);
 await evaluate("stop();loadPattern(0);$('clearFilters').click();$('toast').classList.remove('visible');window.scrollTo(0,0)");
 fs.writeFileSync(path.join(qa,'desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 await evaluate("$('seq').scrollIntoView();");fs.writeFileSync(path.join(qa,'playground.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate("$('library').scrollIntoView();");fs.writeFileSync(path.join(qa,'library.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('window.scrollTo(0,0)');
 await check('mobile has no document overflow','document.documentElement.scrollWidth<=innerWidth');
 fs.writeFileSync(path.join(qa,'mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate("$('seq').scrollIntoView()");fs.writeFileSync(path.join(qa,'mobile-playground.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await check('mobile grid remains scrollable',"document.querySelector('.seqwrap').scrollWidth>document.querySelector('.seqwrap').clientWidth");
 await check('field notes open through navigation',"(()=>{document.querySelector('a[href=\"#roles\"]').click();return document.querySelector('.field-notes').open;})()");
 for(const width of [320,768,1024]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await check(width+'px viewport has no document overflow','document.documentElement.scrollWidth<=innerWidth');}
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(qa,'results.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));console.log('Browser checks passed: '+checks.length);
}finally{try{await call('Browser.close');}catch{}ws.close();child.kill();await new Promise(r=>setTimeout(r,300));if(path.dirname(profile)===path.resolve(os.tmpdir())&&path.basename(profile)==='fieldwork-drum-qa-'+process.pid){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:200});}catch{console.log('Temporary Chrome profile remains at '+profile);}}}
