// Dependency-free integration runner: an isolated local Chrome process executes the page's own test script.
// Real wall-clock time is needed for OfflineAudioContext; Chromium virtual time can end before rendering completes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),qa=path.join(here,'qa'),mobile=process.argv.includes('--mobile'),label=mobile?'mobile':'desktop';
const source=fs.readFileSync(path.join(qa,'browser-check.html'),'utf8').replace("document.title='QA '+document.body.dataset.qa;","document.title='QA '+document.body.dataset.qa; fetch('/qa-result',{method:'POST',headers:{'Content-Type':'application/json'},body:report.textContent});");
let resolveResult;const result=new Promise(resolve=>resolveResult=resolve);
const server=http.createServer((req,res)=>{if(req.url==='/qa-result'&&req.method==='POST'){let data='';req.on('data',chunk=>{data+=chunk;if(data.length>100000)req.destroy();});req.on('end',()=>{try{resolveResult(JSON.parse(data));res.end('ok');}catch{res.writeHead(400).end();}});}else if(req.url==='/'||req.url==='/app'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(mobile&&req.url==='/'?'<!doctype html><style>body{margin:0}iframe{display:block;width:390px;height:2300px;border:0}</style><iframe src="/app" allow="autoplay"></iframe>':source);}else res.writeHead(204).end();});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'fieldwork-v3-browser-')),log=fs.openSync(path.join(qa,label+'-integration.log'),'w');
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-sandbox','--disable-gpu-sandbox','--disable-software-rasterizer','--disable-background-networking','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--window-size='+(mobile?'390,2300':'1512,2300'),'--user-data-dir='+profile,`http://127.0.0.1:${server.address().port}/`],{windowsHide:true,stdio:['ignore',log,log]});
child.on('error',error=>resolveResult({status:'failed',errors:[error.message],results:[]}));
const timer=setTimeout(()=>resolveResult({status:'failed',errors:['Browser tests timed out after 45 seconds.'],results:[]}),45000);
const report=await result;clearTimeout(timer);fs.writeFileSync(path.join(qa,label+'-report.json'),JSON.stringify(report,null,2));
child.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.closeSync(log);
console.log(label+': '+report.status+' / '+report.results.length+' browser assertions');if(report.errors.length)console.log(report.errors.join('\n'));if(report.status!=='passed')process.exitCode=1;
