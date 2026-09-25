import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
let html=read('template.html').replace('__CSS__',()=>read('style.css')).replace('__CONTENT__',()=>read('lessons.html')+'\n'+read('rumble.html')).replace('__SCRIPT__',()=>['catalog.js','learning.js','audio.js','rumble.js','app.js'].map(read).join('\n'));
fs.writeFileSync(path.join(dir,'../serum-v2.html'),html);
console.log('Built serum-v2.html ('+Math.round(Buffer.byteLength(html)/1024)+' KB), standalone and offline.');
