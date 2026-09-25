import fs from 'node:fs';
const root=new URL('./',import.meta.url);
const read=n=>fs.readFileSync(new URL(n,root),'utf8');
const html=read('template.html').replace('/* STUDIO_STYLES */',read('legacy.css')+'\n'+read('studio.css')).replace('<!-- REFERENCE -->',read('reference.html')).replace('/* STUDIO_SCRIPT */',read('sounds-catalog.js')+'\n'+read('catalog-extra.js')+'\n'+read('studio.js'));
fs.writeFileSync(new URL('../drum-library.html',root),html);
console.log('Built standalone drum-library.html ('+Math.round(Buffer.byteLength(html)/1024)+' KB)');
