'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mod=(x,n)=>((x%n)+n)%n;
const clone=x=>JSON.parse(JSON.stringify(x));
function random32(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function degree(d,mode){const scale=MODES[mode]||MODES.minor;return Math.floor(d/7)*12+scale[mod(d,7)]}
function nearestScale(p,root,mode){let best=p,dist=99;for(let n=Math.max(0,p-6);n<=Math.min(127,p+6);n++){if(MODES[mode].includes(mod(n-root,12))&&Math.abs(n-p)<dist){best=n;dist=Math.abs(n-p)}}return best}
function noteName(n){return NOTE_NAMES[mod(n,12)]+(Math.floor(n/12)-2)} // Ableton: MIDI 60 = C3.
function genreOf(p){return GENRES.find(g=>g.id===(typeof p==='string'?p:p.genre))||GENRES[0]}
function factoryConfig(p){const base=genreOf(p),a=p.artist?artistOf(p):null,g=a?{...base,...a}:base;return{genre:p.genre,artist:a?.id||null,root:9,mode:g.mode,bpm:g.bpm,bars:8,progression:[...g.prog[p.variation%2]],mood:'Native',density:100,gate:80,swing:g.swing,human:5,seed:p.seed,form:'AABA',voicing:'auto'}}
function chordPitches(rootDegree,c,count=4,previous=null,variation=0){
 let ns=Array.from({length:count},(_,i)=>48+c.root+degree(rootDegree+2*i,c.mode));
 if(c.voicing==='open'||variation===2){if(ns.length>3)ns[1]+=12;ns.sort((a,b)=>a-b)}
 if(c.voicing==='root')return ns;
 let candidates=[];
 for(let shift=-1;shift<=1;shift++)for(let inv=0;inv<count;inv++){
  let v=ns.map((n,i)=>n+12*shift+(i<inv?12:0)).sort((a,b)=>a-b);
  if(v[0]>=45&&v.at(-1)<=88)candidates.push(v);
 }
 if(!candidates.length)return ns;
 const target=previous||ns.map((_,i)=>54+c.root+i*3);
 return candidates.sort((a,b)=>a.reduce((s,n,i)=>s+Math.abs(n-target[Math.min(i,target.length-1)]),0)-b.reduce((s,n,i)=>s+Math.abs(n-target[Math.min(i,target.length-1)]),0))[0];
}
function progressionLabel(c){return c.progression.map(d=>{
 const ns=[0,2,4].map(i=>degree(d+i,c.mode)-degree(d,c.mode));
 const quality=ns[1]===3?(ns[2]===6?'dim':'m'):ns[2]===8?'aug':'';
 return NOTE_NAMES[mod(c.root+degree(d,c.mode),12)]+quality;
}).join(' → ')}
function tidyNotes(notes,beats){
 const valid=notes.filter(n=>Number.isFinite(n.t)&&Number.isFinite(n.d)&&Number.isFinite(n.p)&&Number.isFinite(n.v)&&n.t>=0&&n.t<beats&&n.d>0).map(n=>({t:Math.round(n.t*480)/480,d:Math.max(1/480,Math.min(beats-n.t,Math.round(n.d*480)/480)),p:clamp(Math.round(n.p),0,127),v:clamp(Math.round(n.v),1,127)})).filter(n=>n.t<beats).sort((a,b)=>a.t-b.t||a.p-b.p);
 const out=[],last=new Map();
 for(const n of valid){n.d=Math.min(n.d,beats-n.t);const old=last.get(n.p);if(old){if(old.t===n.t){old.v=Math.max(old.v,n.v);old.d=Math.max(old.d,n.d);continue}old.d=Math.min(old.d,n.t-old.t)}out.push(n);last.set(n.p,n)}
 return out;
}
function generate(p,c){
 if(p.artist)return generateArtist(p,c);
 const g=genreOf(p),r=random32((c.seed+p.seed)>>>0),v=p.variation,m=MOODS[c.mood]||MOODS.Native,notes=[],total=c.bars*4,mutation=Math.floor(c.seed/97)%7;
 const rhythm=(role)=>role==='bass'?BASS_RHYTHMS[g.bass]:role==='chords'?CHORD_RHYTHMS[g.chord]:g.rh;
 const push=(step,pitch,len,vel,anchor=false)=>{
  if(!anchor&&r()>clamp(c.density/100*m.density,0.15,1))return;
  let t=step/4+(Math.floor(step)%2?c.swing/100*.25:0)+(r()-.5)*c.human/100*.12;
  t=clamp(t,0,total-1/480);
  notes.push({t,p:pitch,d:clamp(len/4*c.gate/80*m.gate,.035,total-t),v:clamp(vel+m.vel+(v===3?-12:v===2?5:0)+(r()-.5)*c.human*1.2,25,124)});
 };
 let prev=null;
 for(let bar=0;bar<c.bars;bar++){
  const d=c.progression[bar%4],base=bar*16;
  const isB=c.form==='AABA'&&Math.floor(bar/2)%4===2||c.form==='ABAC'&&Math.floor(bar/2)%2===1;
  const ending=bar===c.bars-1;
  let hits=[...rhythm(p.role)||g.rh];
  if(v===1&&bar%2)hits=hits.filter((_,i)=>i%3!==1).map(s=>(s+1)%16).sort((a,b)=>a-b);
  if(v===2&&p.role!=='chords')hits=[...new Set([...hits,5,13])].sort((a,b)=>a-b);
  if(v===3)hits=hits.filter((_,i)=>i%2===0);
  if(bar%2===1&&mutation>0&&hits.length>2&&p.role!=='chords')hits=[...new Set(hits.map((s,i)=>i===hits.length-1?mod(s+(mutation%3)-1,16):s))].sort((a,b)=>a-b);
  if(c.form==='breakdown'&&bar>=c.bars/2&&p.role==='drums')hits=[];
  if(p.role==='drums'){
   const lanes=DRUMS[g.drum];
   lanes.forEach(([pitch,steps])=>steps.forEach((s,i)=>{
    if(c.form==='breakdown'&&bar>=c.bars/2&&pitch===36)return;
    if(v===3&&pitch!==36&&pitch!==38&&pitch!==39&&i%2)return;
    let st=s;
    if(v===1&&bar%2&&pitch===36&&s!==0)st=mod(s+1,16);
    push(base+st,pitch,pitch===46?1.5:.5,pitch===36?108:pitch===38||pitch===39?96:st%4===2?83:62,pitch===36||pitch===38||pitch===39);
   }));
   if(v===2&&bar%4===3)[13,14,15].forEach((s,i)=>push(base+s,38,.4,63+i*12,true));
   if(v===1&&bar%2)[9,15].forEach(s=>push(base+s,37,.3,49));
   if(v===3&&bar%4===3)push(base+15,75,.4,64,true);
   if(mutation>1&&bar%2===1)push(base+[3,7,9,11,15][mutation%5],mutation%2?37:70,.3,45+mutation*3);
   continue;
  }
  if(p.role==='chords'){
   const count=v===3?Math.max(4,g.ext):g.ext,ns=chordPitches(d,c,count,prev,v);prev=ns;
   hits.forEach((s,i)=>{
    if(i>0&&r()>clamp(c.density/100*m.density,.15,1))return;
    const length=g.chord==='sustain'?15.7:g.chord==='dub'?2.2:g.chord==='future'?1.2:v===3?4:1.5;
    ns.forEach((pitch,k)=>push(base+s+(c.voicing==='strum'?k*.08:0),pitch+(mutation>3&&bar%2&&k===ns.length-1?12:0),length,78+(k===ns.length-1?9:0)+(i%2?-6:4),true));
   });continue;
  }
  if(p.role==='arp'){
   let order=ARP_ORDERS[g.arp];
   const step=g.arp==='dotted'?3:g.arp==='sparse'?4:g.arp==='euclid'?1:2;
   const start=g.arp==='dotted'?mod(-base,3):0;
   hits=[];for(let s=start;s<16;s+=step){if(g.arp==='euclid'&&mod((base+s)*7,16)>=7)continue;hits.push(s)}
   if(v===1)order=[...order].reverse();
   if(v===3)hits=hits.filter((_,i)=>i%2===0);
   const ns=chordPitches(d,{...c,voicing:'root'},4,null,0).map(n=>n+12);
   hits.forEach((s,i)=>{
    const k=g.arp==='random'?Math.floor(r()*4):order[(Math.floor((base+s)/step)+(v===2?bar:0))%order.length];
    push(base+s,ns[k]+(v===2&&i%4===3?12:0),step*.65,76+(i%4===0?19:0),i===0);
   });continue;
  }
  hits.forEach((s,i)=>{
   if(p.role==='melody'&&ending&&s>12&&v!==2)return;
   let len=Math.min((hits[i+1]??16)-s,v===3?5:2),pitch,vel=84+(i%3===0?13:-4);
   if(p.role==='bass'){
    const octaves=g.bass==='disco'||g.bass==='acid'||g.bass==='electro';
    let off=octaves&&i%3===1?7:(['funk','garage','breaks','neuro','wobble','skip'].includes(g.bass)&&i%4===3?4:0);
    if(v===1&&bar%2&&i===hits.length-1)off=6;
    if(v===2&&i%4===2)off=7;
    if(mutation&&bar%2===1&&i===hits.length-1&&g.bass!=='psy')off=[0,2,4,6,7,4,2][mutation];
    pitch=36+c.root+degree(d+off,c.mode);
    while(pitch>60)pitch-=12;
    if(['sustain','reese','halftime'].includes(g.bass))len=Math.max(.5,(hits[i+1]??16)-s-.3);
    if(g.bass==='psy')len=.7;
    if(g.bass==='offbeat')len=1.4;
    if(g.bass==='acid')len=i%3===0?1.6:.7;
    vel=i%4===0?108:i%3===0?97:82;
   }else{
    let idx=(i+(bar%2)*3+(isB?2:0)+Math.floor(c.seed%7))%g.mot.length;
    let motif=g.mot[idx];
    if(v===1&&bar%2)motif=7-motif;
    if(v===2&&bar>=c.bars/2)motif+=7;
    if(v===3)motif=Math.min(motif,6);
    if(c.mood==='Hypnotic')motif=g.mot[i%3];
    if(c.mood==='Playful'&&i%3===1)motif+=7;
    if(c.form==='lift'&&bar>=c.bars/2)motif+=7;
    if(c.form==='loop')motif=g.mot[i%g.mot.length];
    let relative=motif+(s%4===0?(mod(motif,2)?-1:0):0);
    pitch=60+c.root+degree(d+relative+m.lift,c.mode);
    if(v===3)len=Math.max(1,(hits[i+1]??16)-s-1);
    if(ending&&i===hits.length-1)pitch=60+c.root+degree(d+4,c.mode);
   }
   push(base+s,pitch,len,vel,i===0);
  });
  // Higher density grows the rhythm with quiet scale/chord-tone responses.
  if(c.density*m.density>105&&p.role!=='drums'&&p.role!=='chords'){
   const free=[1,5,9,13].filter(s=>!hits.includes(s));
   free.forEach(s=>{if(r()<(c.density*m.density-100)/70)push(base+s,(p.role==='bass'?36:60)+c.root+degree(d+2,c.mode),.65,64,true)});
  }
 }
 return tidyNotes(notes,total);
}
function transformNotes(notes,kind,c,role){
 let out=clone(notes),beats=c.bars*4;
 if(kind==='reverse')out=out.map(n=>({...n,t:Math.max(0,beats-n.t-n.d)}));
 if(kind==='rotate')out=out.map(n=>({...n,t:mod(n.t+.25,beats)}));
 if(kind==='thin')out=out.filter((n,i)=>i%3!==2);
 if(kind==='up'||kind==='down')out=out.map(n=>({...n,p:clamp(n.p+(kind==='up'?12:-12),0,127)}));
 if(kind==='invert'&&role!=='drums'&&out.length){let center=out[0].p;out=out.map(n=>({...n,p:nearestScale(clamp(center*2-n.p,0,127),c.root,c.mode)}))}
 if(kind==='answer')out=out.filter(n=>n.t<beats/2).flatMap((n,i)=>[n,...(i%3===2?[]:[{...n,t:n.t+beats/2,p:role==='drums'?n.p:nearestScale(clamp(n.p+(i%2?2:-2),0,127),c.root,c.mode),v:Math.max(1,n.v-10)}])]);
 if(kind==='staccato')out=out.map(n=>({...n,d:Math.min(n.d,.18)}));
 return tidyNotes(out,beats);
}
function vlq(n){n=Math.max(0,Math.round(n));let bytes=[n&127];while(n>>>=7)bytes.unshift((n&127)|128);return bytes}
const utf8=s=>Array.from(new TextEncoder().encode(s));
const be16=n=>[n>>>8&255,n&255];
const be32=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255];
function midiBytes(tracks,c,title='Fieldwork V2'){
 const ppq=480,end=c.bars*4*ppq,multi=tracks.length>1;
 const tempo=Math.round(60000000/c.bpm);
 const meta=[{t:0,order:0,d:[255,81,3,...be32(tempo).slice(1)]},{t:0,order:0,d:[255,88,4,4,2,24,8]}];
 const text=`${NOTE_NAMES[c.root]} ${MODE_NAMES[c.mode]}; ${c.bpm} BPM; ${c.bars} bars; ${progressionLabel(c)}; MIDI notes only`;
 meta.push({t:0,order:0,d:[255,1,...vlq(utf8(text).length),...utf8(text)]});
 function chunk(events,name){
  const nm=utf8(name);events.push({t:0,order:-1,d:[255,3,...vlq(nm.length),...nm]});
  events.sort((a,b)=>a.t-b.t||a.order-b.order);
  let bytes=[],last=0;
  for(const e of events){bytes.push(...vlq(e.t-last),...e.d);last=e.t}
  bytes.push(...vlq(Math.max(end,last)-last),255,47,0);
  return [...utf8('MTrk'),...be32(bytes.length),...bytes];
 }
 let chunks=[];
 if(multi)chunks.push(chunk(meta,title));
 tracks.forEach((tr,i)=>{
  const ch=tr.role==='drums'?9:i,events=multi?[]:clone(meta);
  tidyNotes(tr.notes,c.bars*4).forEach(n=>{
   const start=Math.round(n.t*ppq),finish=Math.min(end,Math.max(start+1,Math.round((n.t+n.d)*ppq)));
   events.push({t:start,order:2,d:[144|ch,n.p,n.v]},{t:finish,order:1,d:[128|ch,n.p,0]});
  });chunks.push(chunk(events,tr.name||ROLE_NAMES[tr.role]));
 });
 const parts=[new Uint8Array([...utf8('MThd'),...be32(6),...be16(multi?1:0),...be16(chunks.length),...be16(ppq)]),...chunks.map(x=>new Uint8Array(x))];
 return concatBytes(parts);
}
function concatBytes(parts){const out=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));let offset=0;parts.forEach(p=>{out.set(p,offset);offset+=p.length});return out}
const CRC_TABLE=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
const le16=n=>[n&255,n>>>8&255];
const le32=n=>[n&255,n>>>8&255,n>>>16&255,n>>>24&255];
function zipBytes(files){
 let local=[],central=[],offset=0;
 for(const file of files){const name=utf8(file.name),b=file.bytes,crc=crc32(b);
  const header=new Uint8Array([80,75,3,4,...le16(20),...le16(2048),0,0,0,0,33,0,...le32(crc),...le32(b.length),...le32(b.length),...le16(name.length),0,0,...name]);
  local.push(header,b);
  central.push(new Uint8Array([80,75,1,2,...le16(20),...le16(20),...le16(2048),0,0,0,0,33,0,...le32(crc),...le32(b.length),...le32(b.length),...le16(name.length),0,0,0,0,0,0,0,0,0,0,0,0,...le32(offset),...name]));
  offset+=header.length+b.length;
 }
 const directory=concatBytes(central),tail=new Uint8Array([80,75,5,6,0,0,0,0,...le16(files.length),...le16(files.length),...le32(directory.length),...le32(offset),0,0]);
 return concatBytes([...local,directory,tail]);
}
function slug(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'')}
function packFiles(presets,includeSketches=false){
 const files=[],manifest=[];
 for(const p of presets){const c=factoryConfig(p),g=genreOf(p),a=p.artist?artistOf(p):null,name=`${a?'artists/'+a.id:g.id}/${p.role}/${p.id}_A-${c.mode}_${c.bpm}bpm_8bar.mid`;
  files.push({name,bytes:midiBytes([{role:p.role,name:p.name,notes:generate(p,c)}],c,p.name)});
  manifest.push({file:name,name:p.name,genre:g.name,role:p.role,mood:p.mood,technique:p.technique,bpm:c.bpm,key:'A '+c.mode,seed:c.seed,progression:progressionLabel(c),inspiration:a?a.name+' / '+a.focus:g.artist,...(a?{suggestedSound:a.patch[ROLES.indexOf(p.role)],study:a.traits[ROLES.indexOf(p.role)]}:{})});
 }
 if(includeSketches)GENRES.forEach(g=>{const p=PRESETS.find(p=>p.genre===g.id&&p.role==='melody'&&p.variation===0),c=factoryConfig(p);
  files.push({name:`${g.id}/SKETCH_${g.id}_A-${c.mode}_${c.bpm}bpm.mid`,bytes:midiBytes(ROLES.map(role=>{const preset=PRESETS.find(p=>p.genre===g.id&&p.role===role&&p.variation===0);return{role,name:ROLE_NAMES[role],notes:generate(preset,c)}}),c,g.title)});
 });
 files.push({name:'catalog.json',bytes:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
 files.push({name:'START-HERE.txt',bytes:new TextEncoder().encode(`FIELDWORK / V2\n${presets.length} original recipe clips${includeSketches?' + 24 five-part sketches':''}. 8 bars, 4/4, A in each native mode, native genre tempo.\n\nDrag .mid files into Ableton Live MIDI tracks and load instruments. Individual clips use SMF0; sketches use SMF1 with separate melody, bass, chords, arpeggio and drums tracks. All files use 480 PPQ and end at exactly 8 bars, including trailing silence. Check the clip loop bracket after import. Set Live's tempo to the BPM in the filename if desired.\n\nMIDI carries notes, lengths and velocity, not audio, glide, automation or synth presets. Live does not assign General MIDI sounds automatically. Drum pitches: 36 kick, 37 rim, 38 snare, 39 clap, 42 closed hat, 45 low tom, 46 open hat, 63/64 conga, 70 shaker, 75 claves, 76 woodblock. MIDI 60 is labelled C3 in Live.\n\nArtist names are creative listening references, not transcriptions, endorsements or claims that these patterns occur in any recording. All motifs are original generated compositions. Use the HTML tools to edit, transpose, change phrase length, create variations, save sessions and export new packs.\n\nReference: https://help.ableton.com/hc/en-us/articles/209068169-Understanding-MIDI-files\n`)});
 return files;
}
const Fieldwork={ROLES,ROLE_NAMES,GENRES,PRESETS,MODES,MODE_NAMES,MOODS,NOTE_NAMES,DRUM_NAMES,TREATMENTS,GUIDES_V2,clone,clamp,mod,degree,noteName,nearestScale,genreOf,factoryConfig,progressionLabel,generate,tidyNotes,transformNotes,midiBytes,zipBytes,crc32,packFiles,slug};
if(typeof module!=='undefined')module.exports=Fieldwork;
