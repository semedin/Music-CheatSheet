import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir),qa=path.join(dir,'qa');fs.mkdirSync(qa,{recursive:true});
const html=fs.readFileSync(path.join(root,'serum-v2.html'),'utf8'),mobile=process.argv.includes('--mobile'),capture=process.argv.includes('--capture'),localFile=process.argv.includes('--file');
const rumbleCapture=capture&&process.argv.includes('--rumble');
const label=(localFile?'file':mobile?'mobile':'desktop')+(rumbleCapture?'-rumble':'');
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(dir,'catalog.js'),'utf8')+'\nthis.patches=PATCHES;',sandbox);
if(sandbox.patches.length!==48)throw Error('Expected 48 recipes');
if(new Set(sandbox.patches.map(p=>p.id)).size!==48)throw Error('Duplicate IDs');
if(/__(CSS|CONTENT|SCRIPT)__/.test(html))throw Error('Unresolved build marker');
if(/<script[^>]+src=|<link[^>]+href="https?:|fetch\(/.test(html))throw Error('Unexpected network dependency');
const testCode=fs.readFileSync(path.join(dir,'check-browser.js'),'utf8');
let resolveResult;const result=new Promise(resolve=>resolveResult=resolve);
const server=http.createServer((req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 if(req.url==='/result'&&req.method==='POST'){let data='';req.on('data',part=>data+=part);req.on('end',()=>{try{resolveResult(JSON.parse(data));res.end('ok');}catch{res.writeHead(400).end();}});return;}
 if(req.url==='/handbook'&&req.method==='POST'){let data='';req.on('data',part=>data+=part);req.on('end',()=>{fs.writeFileSync(path.join(root,'Serum-2-Sound-Design-Handbook.md'),data);res.end('ok');});return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');
 if(mobile&&req.url==='/'){res.end('<!doctype html><style>body{margin:0}iframe{width:390px;height:2300px;border:0;display:block}</style><iframe src="/app" allow="autoplay"></iframe>');return;}
 res.end(capture?(rumbleCapture?html.replace('</body>',"<script>document.documentElement.style.scrollBehavior='auto';setView('rumble',{scroll:false});document.getElementById('rumbleChoices').scrollIntoView({behavior:'instant',block:'start'});</script></body>"):html):html.replace('</body>',`<script>${testCode}</script></body>`));
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sound-design-qa-')),log=fs.openSync(path.join(qa,label+(capture?'-capture':'-test')+'.log'),'w');
const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-gpu-sandbox','--disable-software-rasterizer','--run-all-compositor-stages-before-draw','--disable-threaded-scrolling','--disable-background-networking','--no-first-run','--no-default-browser-check','--hide-scrollbars','--autoplay-policy=no-user-gesture-required','--window-size='+(mobile?'390,2300':'1440,1800'),'--user-data-dir='+profile];
if(capture)args.push('--screenshot='+path.join(qa,label+'.png'),'--virtual-time-budget=2500');
let url=`http://127.0.0.1:${server.address().port}/`;
if(localFile){const file=path.join(qa,'file-check.html'),code=testCode.replaceAll("fetch('/result'",`fetch('${url}result'`).replaceAll("fetch('/handbook'",`fetch('${url}handbook'`);fs.writeFileSync(file,html.replace('</body>',`<script>${code}</script></body>`));url=pathToFileURL(file).href;}
args.push(url);
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',args,{windowsHide:true,stdio:['ignore',log,log]});
child.on('error',e=>resolveResult({status:'failed',errors:[e.message]}));
if(capture)child.on('exit',code=>resolveResult({status:code===0?'passed':'failed',capture:label+'.png'}));
const timeout=setTimeout(()=>resolveResult({status:'failed',errors:['45-second browser test timeout']}),45000);
const report=await result;clearTimeout(timeout);child.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.closeSync(log);
fs.writeFileSync(path.join(qa,label+(capture?'-capture':'-report')+'.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,viewport:report.viewport,assertions:report.assertions,audioRenders:report.audioStats?.length,capture:report.capture,errors:report.errors},null,2));if(report.status!=='passed')process.exitCode=1;
