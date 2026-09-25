import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../trance.html',import.meta.url),'utf8'),js=html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx={Uint8Array,TextEncoder};
vm.createContext(ctx);vm.runInContext(js.slice(0,js.indexOf('const $=id=>'))+`\nthis.files=library.flatMap(item=>TREATMENTS.map(([variant])=>({name:(item.source?'Source-arrangements':'Melodic-developments')+'/'+item.id+'-'+variant+'.mid',bytes:midiBytes(makeSketch(item,{variant}))})));this.zipBytes=zipBytes;this.sources=SOURCES;this.readme=packReadme();this.count=LIBRARY_COUNTS.treatments;`,ctx);
for(const source of ctx.sources)ctx.files.push({name:'Untouched-sources/'+source.file,bytes:Buffer.from(source.original,'base64')});ctx.files.push({name:'README.txt',bytes:new TextEncoder().encode(ctx.readme)});
const bytes=ctx.zipBytes(ctx.files),name='Fieldwork-Trance-God-Mode-'+ctx.count+'-Sketches.zip';fs.writeFileSync(new URL('../'+name,import.meta.url),bytes);console.log('Wrote '+name+': '+ctx.count+' sketches + '+ctx.sources.length+' original sources + README ('+bytes.length+' bytes).');
