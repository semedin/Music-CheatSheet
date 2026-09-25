import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(here);
const context={module:{exports:{}},TextEncoder,Uint8Array};vm.createContext(context);
const coreCode=['catalog.js','artists.js','sounds.js','engine.js','artist-engine.js','audio.js'].map(file=>fs.readFileSync(path.join(here,file),'utf8')).join('\n');
vm.runInContext(coreCode,context);
const F=context.module.exports;
function parseMidi(input){
 const b=Buffer.from(input);let pos=0;
 const str=n=>{const s=b.toString('ascii',pos,pos+n);pos+=n;return s};
 const u16=()=>{const n=b.readUInt16BE(pos);pos+=2;return n},u32=()=>{const n=b.readUInt32BE(pos);pos+=4;return n};
 const vlq=()=>{let n=0,count=0,x;do{assert.ok(pos<b.length);x=b[pos++];n=n*128+(x&127);assert.ok(++count<=4)}while(x&128);return n};
 assert.equal(str(4),'MThd');assert.equal(u32(),6);const format=u16(),count=u16(),ppq=u16(),tracks=[];assert.ok(format===0||format===1);assert.equal(ppq,480);
 for(let i=0;i<count;i++){
  assert.equal(str(4),'MTrk');const size=u32(),end=pos+size;let tick=0,eot=false,on=0;const active=new Map(),channels=new Set(),events=[];
  while(pos<end){tick+=vlq();const status=b[pos++];assert.ok(status>=128);
   if(status===255){const type=b[pos++],len=vlq();if(type===47){assert.equal(len,0);assert.equal(active.size,0,'hanging MIDI notes');eot=true}if(type===81)assert.equal(len,3);pos+=len}
   else{assert.ok((status&240)===128||(status&240)===144);const pitch=b[pos++],velocity=b[pos++],ch=status&15,key=ch+':'+pitch;assert.ok(pitch<128&&velocity<128);channels.add(ch);
    if((status&240)===144&&velocity>0){assert.ok(!active.has(key),'overlapping retrigger');active.set(key,tick);on++;events.push({tick,pitch,velocity,ch})}else{assert.ok(active.has(key),'note-off without note-on');assert.ok(tick>active.get(key),'zero duration');active.delete(key)}
   }
  }assert.equal(pos,end);assert.ok(eot);tracks.push({end:tick,on,channels,events});
 }assert.equal(pos,b.length);return{format,count,ppq,tracks};
}
function parseZip(input){const b=Buffer.from(input),files=[];let pos=0;while(b.readUInt32LE(pos)===0x04034b50){const method=b.readUInt16LE(pos+8),crc=b.readUInt32LE(pos+14),length=b.readUInt32LE(pos+18),nameLength=b.readUInt16LE(pos+26),extra=b.readUInt16LE(pos+28),name=b.toString('utf8',pos+30,pos+30+nameLength),start=pos+30+nameLength+extra;assert.equal(method,0);const bytes=b.subarray(start,start+length);assert.equal(F.crc32(bytes),crc);files.push({name,bytes});pos=start+length}
 const cdStart=pos;let count=0;while(b.readUInt32LE(pos)===0x02014b50){const nameLength=b.readUInt16LE(pos+28),extra=b.readUInt16LE(pos+30),comment=b.readUInt16LE(pos+32),offset=b.readUInt32LE(pos+42);assert.equal(b.readUInt32LE(offset),0x04034b50);const name=b.toString('utf8',pos+46,pos+46+nameLength);assert.equal(name,files[count].name);count++;pos+=46+nameLength+extra+comment}assert.equal(b.readUInt32LE(pos),0x06054b50);assert.equal(b.readUInt16LE(pos+10),files.length);assert.equal(b.readUInt32LE(pos+12),pos-cdStart);assert.equal(b.readUInt32LE(pos+16),cdStart);assert.equal(pos+22,b.length);assert.equal(count,files.length);return files}
assert.equal(F.GENRES.length,24);assert.equal(F.GENRE_PRESETS.length,480);assert.equal(F.ARTISTS.length,32);assert.equal(new Set(F.ARTISTS.map(a=>a.name)).size,31);assert.equal(F.ARTIST_PRESETS.length,1280);assert.equal(F.PRESETS.length,1760);assert.equal(new Set(F.PRESETS.map(p=>p.id)).size,1760);
let midiCount=0,totalNotes=0;
for(const p of F.PRESETS){const c=F.factoryConfig(p),notes=F.generate(p,c);assert.ok(notes.length>0,p.id+' empty');assert.equal(JSON.stringify(notes),JSON.stringify(F.generate(p,c)),'seed must reproduce');
 const parsed=parseMidi(F.midiBytes([{role:p.role,name:p.name,notes}],c));assert.equal(parsed.format,0);assert.equal(parsed.tracks[0].on,notes.length);assert.equal(parsed.tracks[0].end,8*4*480);assert.ok(parsed.tracks[0].channels.has(p.role==='drums'?9:0));midiCount++;totalNotes+=notes.length;
 for(const n of notes){assert.ok(n.t+n.d<=32+.00001);if(p.role!=='drums')assert.ok(F.MODES[c.mode].includes(F.mod(n.p-c.root,12)),p.id+' out of scale')}
}
console.log(`PASS: ${midiCount} deterministic factory clips; ${totalNotes.toLocaleString()} notes; complete note-offs, channels, scale membership and 8-bar ends.`);
let combinations=0;
for(const mode of Object.keys(F.MODES))for(const rootNote of [0,6,11])for(const bars of [4,16])for(const role of F.ROLES){const p=F.PRESETS.find(p=>p.genre==='psy'&&p.role===role&&p.variation===2),c={...F.factoryConfig(p),mode,root:rootNote,bars,swing:60,human:30,density:150,gate:150,mood:'Euphoric'},ns=F.generate(p,c);parseMidi(F.midiBytes([{role,notes:ns}],c));assert.ok(ns.every(n=>n.t>=0&&n.d>0&&n.t+n.d<=bars*4+.00001));combinations++}
console.log(`PASS: ${combinations} edge combinations across modes, keys, phrase lengths and extreme timing controls.`);
for(const g of F.GENRES){const p=F.PRESETS.find(p=>p.genre===g.id&&p.role==='melody'&&p.variation===0),c=F.factoryConfig(p),tracks=F.ROLES.map(role=>({role,notes:F.generate(F.PRESETS.find(x=>x.genre===g.id&&x.role===role&&x.variation===0),c)})),m=parseMidi(F.midiBytes(tracks,c));assert.equal(m.format,1);assert.equal(m.count,6);m.tracks.forEach(t=>assert.equal(t.end,15360));assert.ok(m.tracks.at(-1).channels.has(9))}
console.log('PASS: 24 complete SMF1 sketches with five separate parts and a conductor track.');
const zip=F.zipBytes(F.packFiles(F.GENRE_PRESETS,true)),files=parseZip(zip);assert.equal(files.filter(f=>f.name.endsWith('.mid')).length,504);files.filter(f=>f.name.endsWith('.mid')).forEach(f=>parseMidi(f.bytes));assert.equal(JSON.parse(files.find(f=>f.name==='catalog.json').bytes.toString()).length,480);
console.log(`PASS: ZIP local headers, central directory, CRC32 and all 504 MIDI entries (${zip.length.toLocaleString()} bytes).`);
const artistZip=F.zipBytes(F.artistPackFiles()),artistFiles=parseZip(artistZip);assert.equal(artistFiles.filter(f=>f.name.endsWith('.mid')).length,1312);artistFiles.filter(f=>f.name.endsWith('.mid')).forEach(f=>parseMidi(f.bytes));assert.equal(JSON.parse(artistFiles.find(f=>f.name==='catalog.json').bytes.toString()).length,1280);
assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,'Fieldwork-V2-Artist-Studies-1312-MIDI.zip'))).digest('hex'),createHash('sha256').update(artistZip).digest('hex'),'delivered pack matches generator');
for(const a of F.ARTISTS)for(const role of F.ROLES){const presets=F.ARTIST_PRESETS.filter(p=>p.artist===a.id&&p.role===role);assert.equal(presets.length,8);assert.ok(F.soundById(a.patch[F.ROLES.indexOf(role)],role),a.id+' missing sound');const signatures=new Set(presets.map(p=>{const ns=F.generate(p,{...F.factoryConfig(p),human:0,swing:0});return ns.map(n=>[Math.round(n.t*4),n.p,Math.round(n.d*4)].join(':')).join('|')}));assert.equal(signatures.size,8,a.id+' / '+role+' needs structurally different treatments');}
console.log('PASS: 1,312 artist MIDI files, delivered archive equality, eight distinct treatments per artist/part and valid suggested sounds.');
const p=F.PRESETS[0],c=F.factoryConfig(p);for(const kind of ['reverse','rotate','thin','up','down','invert','answer','staccato']){const ns=F.transformNotes(F.generate(p,c),kind,c,p.role);parseMidi(F.midiBytes([{role:p.role,notes:ns}],c))}
const special=parseMidi(F.midiBytes([{role:'bass',notes:[{t:0,d:4,p:36,v:90},{t:1,d:1,p:36,v:80},{t:1,d:.5,p:36,v:75}]}],c));assert.equal(special.tracks[0].on,2);const empty=parseMidi(F.midiBytes([{role:'melody',notes:[]}],c));assert.equal(empty.tracks[0].end,15360);
console.log('PASS: transforms, same-pitch overlap resolution, duplicate hits and empty clips with trailing silence.');
// Exercise session validation and state-changing callbacks without a browser dependency.
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',disabled:false,checked:false,dataset:{},files:[],addEventListener(){},setAttribute(){},getAttribute(){},focus(){},click(){},classList:{add(){},remove(){},toggle(){}}});return elements.get(id)}
const appContext={...context,document:{getElementById:element,querySelector(){return null},querySelectorAll(){return[]},addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout,setInterval,clearInterval,cancelAnimationFrame(){},requestAnimationFrame(){},console,Blob,URL};vm.createContext(appContext);
const code=coreCode+'\nconst PAGE="studio";\n'+fs.readFileSync(path.join(here,'app.js'),'utf8')+'\nthis.getState=()=>S;this.validation=validateSession;this.importer=importSession;this.changeSoundTest=changeSound;this.filtered=filteredPresets;this.loadPresetTest=loadPreset;';
vm.runInContext(code,appContext);assert.equal(appContext.getState().active,'melody');assert.ok(element('catalog').innerHTML.includes('data-preset'));assert.ok(element('roll').innerHTML.includes('data-note'));
const original=JSON.stringify(appContext.getState());element('generate').onclick();assert.notEqual(JSON.stringify(appContext.getState()),original);element('undo').onclick();assert.equal(JSON.stringify(appContext.getState()),original);element('redo').onclick();assert.notEqual(JSON.stringify(appContext.getState()),original);
const state=appContext.getState();state.tracks.bass.locked=true;const locked=JSON.stringify(state.tracks.bass.notes);element('generate').onclick();assert.equal(JSON.stringify(appContext.getState().tracks.bass.notes),locked);
const valid=JSON.parse(JSON.stringify(appContext.getState()));assert.equal(appContext.validation(valid).version,2);let invalid=structuredClone(valid);invalid.config.bpm=0;assert.throws(()=>appContext.validation(invalid));invalid=structuredClone(valid);invalid.tracks.melody.notes[0].p=999;assert.throws(()=>appContext.validation(invalid));invalid=structuredClone(valid);invalid.config.mode='__proto__';assert.throws(()=>appContext.validation(invalid));
appContext.importer(JSON.stringify(valid));assert.equal(JSON.stringify(appContext.getState()),JSON.stringify(appContext.validation(valid)));
console.log('PASS: app initialization, generation, undo/redo, track locks and validated session round trips (DOM stub; not a browser test).');
const oldSession=JSON.parse(JSON.stringify(valid));delete oldSession.config.artist;for(const role of F.ROLES){delete oldSession.tracks[role].sound;delete oldSession.tracks[role].mix}const migrated=appContext.validation(oldSession);for(const role of F.ROLES)assert.ok(F.soundById(migrated.tracks[role].sound,role));
const beforeSound=JSON.stringify(appContext.getState().tracks.melody.notes);appContext.changeSoundTest('melody','supersaw');assert.equal(JSON.stringify(appContext.getState().tracks.melody.notes),beforeSound);assert.equal(appContext.getState().tracks.melody.sound,'supersaw');element('undo').onclick();assert.equal(appContext.getState().tracks.melody.sound,valid.tracks.melody.sound);
element('artistScene').value='karla-blum';element('artistScene').onchange();for(const role of F.ROLES){assert.equal(F.artistOf({artist:appContext.getState().config.artist}).name,'Karla Blum');assert.ok(appContext.getState().tracks[role].preset.includes('karla-blum'));assert.ok(F.soundById(appContext.getState().tracks[role].sound,role))}
element('filterCollection').value='artists';element('search').value='tiesto';assert.equal(appContext.filtered().length,80);element('search').value='';element('filterArtist').value='deadmau5';element('filterRole').value='drums';assert.equal(appContext.filtered().length,8);element('clearFilters').onclick();assert.equal(appContext.filtered().length,1760);
invalid=JSON.parse(JSON.stringify(appContext.getState()));invalid.tracks.drums.sound='supersaw';assert.throws(()=>appContext.validation(invalid));invalid=JSON.parse(JSON.stringify(appContext.getState()));invalid.tracks.bass.mix.level=Infinity;assert.throws(()=>appContext.validation(invalid));invalid=JSON.parse(JSON.stringify(appContext.getState()));invalid.config.artist='unknown';assert.throws(()=>appContext.validation(invalid));
console.log('PASS: old-session migration, sound selection preserving MIDI, artist scenes, accent-insensitive artist filters and mixer validation.');
for(const file of ['index.html','melody-v2.html','chords-v2.html','bass-v2.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.ok(html.startsWith('<!DOCTYPE html>'));assert.ok(!/__([A-Z_]+)__/.test(html));assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html));new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);const markup=html.replace(/<script>[\s\S]*?<\/script>/g,'');const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const [,href] of markup.matchAll(/href="([^"#]+)"/g)){if(!href.startsWith('http'))assert.ok(fs.existsSync(path.join(root,href)),file+' missing '+href)}}
console.log('PASS: four standalone HTML outputs, inline script syntax, unique IDs and local navigation targets.');
console.log('All checks passed.');
