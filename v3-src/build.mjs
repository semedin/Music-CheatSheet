import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(here),read=name=>fs.readFileSync(path.join(here,name),'utf8');
// V2 is read-only: reuse its MIDI container/ZIP writers and preview synthesizers, not its composition engines.
const libs=['catalog.js','artists.js','sounds.js','engine.js','artist-engine.js'].map(name=>fs.readFileSync(path.join(root,'v2-src',name),'utf8')).join('\n')+'\n'+read('audio.js')+'\n'+read('sounds.js');
const core=libs+'\n'+read('catalog.js')+'\n'+read('engine.js');
const vars={CSS:read('style.css'),LIBS:libs,CATALOG:read('catalog.js'),ENGINE:read('engine.js'),APP:read('app.js')};
const html=read('template.html').replace(/__(CSS|LIBS|CATALOG|ENGINE|APP)__/g,(_,key)=>vars[key]);
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
fs.writeFileSync(path.join(root,'fieldwork-v3.html'),html);
console.log(`fieldwork-v3.html: ${Buffer.byteLength(html).toLocaleString()} bytes; all code, data and sound synthesis embedded.`);
if(process.argv.includes('--pack')){const ctx={TextEncoder,Uint8Array,module:{exports:{}}};vm.createContext(ctx);vm.runInContext(core+'\nthis.V=V3;this.zip=zipBytes;',ctx);
 for(const artists of [false,true]){const {name}=ctx.V.pack(artists),files=ctx.V.library(artists);fs.writeFileSync(path.join(root,name),ctx.zip(files));console.log(`${name}: ${files.filter(f=>f.name.endsWith('.mid')).length} MIDI files`);}
}
