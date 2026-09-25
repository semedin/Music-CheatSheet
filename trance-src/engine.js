const PITCHES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALES={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11]};
const mod=(n,m)=>((n%m)+m)%m;
const pitch=n=>PITCHES[mod(n,12)];
const noteName=n=>pitch(n)+(Math.floor(n/12)-1);
const degree=(d,root=57,mode='minor')=>root+SCALES[mode][mod(d,7)]+12*Math.floor(d/7);
const library=[...SOURCES.map((s,i)=>{const [name,style,root,mode,pcs,progression,explain]=SOURCE_INFO[i];return {...s,name,style,root,mode,pcs,progression,explain,source:true,bpm:STYLES.find(x=>x.id===style).bpm};}),...STYLES.flatMap((style,i)=>[0,1].map(take=>{
 const pcs=style.prog.map(d=>[0,2,4].map(k=>mod(degree(d+k),12))),notes=[];
 for(let bar=0;bar<8;bar++)style.rh.forEach((beat,j)=>{const phrase=bar%2,idx=(j+phrase*2+take*3)%style.motif.length;let d=style.motif[idx];if(take&&bar%4===3)d=style.motif[(idx+3)%style.motif.length];if(bar===7&&j===style.rh.length-1)d=0;notes.push({t:bar*4+beat,n:degree(d,69),d:Math.min(style.id==='balearic'?.65:.34,4-beat),v:Math.min(115,82+(j%3===0?20:0)+(bar>=4?5:0))});});
 return {id:style.id+'-'+take,name:ORIGINAL_NAMES[i*2+take],style:style.id,root:9,mode:'minor',pcs:[...pcs,...pcs],notes,beats:32,bpm:style.bpm,source:false,explain:style.lesson};
}))];
function voiceChord(pcs,previous){
 const opts=[];for(let inv=0;inv<pcs.length;inv++)for(let shift=-1;shift<=1;shift++){
  const ns=[];for(let k=0;k<pcs.length;k++){let n=48+pcs[(k+inv)%pcs.length]+shift*12;while(ns.length&&n<=ns.at(-1))n+=12;ns.push(n);}if(ns[0]<45||ns.at(-1)>79)continue;
  const cost=previous?ns.reduce((s,n,i)=>s+Math.abs(n-previous[Math.min(i,previous.length-1)]),0):Math.abs(ns[0]-52)+Math.abs(ns.at(-1)-67);opts.push({ns,cost});
 }return opts.sort((a,b)=>a.cost-b.cost)[0].ns;
}
function chordLabel(pcs,shift=0){
 const root=pcs[0],ints=pcs.map(p=>mod(p-root,12));let name=pitch(root+shift);
 const minor=ints.includes(3),major=ints.includes(4),ninth=ints.includes(2),maj7=ints.includes(11),seventh=ints.includes(10);
 if(minor)name+='m';if(!minor&&!major)name+=ints.includes(5)?'sus4':'sus2';
 if(maj7)name+=ninth?'maj9':'maj7';else if(seventh)name+=ninth?'9':'7';else if(ninth)name+='(add9)';
 if(ints.includes(6))name+='(♯11)';if(ints.includes(5)&&(minor||major))name+='(add11)';return name;
}
function makeSketch(item,opts={}){
 const shift=opts.shift||0,variant=opts.variant||'original',chordMode=opts.chordMode||'sustain',style=STYLES.find(s=>s.id===item.style);
 let melody=item.notes.map(n=>({...n})),prev=null;
 const harmony=item.pcs.map((pcs,i)=>{const notes=voiceChord(pcs,prev);prev=notes;return {t:i*4,notes:notes.map(n=>n+shift),root:36+pcs[0]+shift,label:chordLabel(pcs,shift)};});
 if(variant==='lift')melody=melody.map(n=>({...n,n:n.n+(n.t>=item.beats/2?12:0)}));
 if(variant==='space')melody=melody.filter(n=>n.t<item.beats/2||Math.floor(n.t)%2===0).map(n=>({...n,d:n.t>=item.beats/2?Math.min(.65,Math.floor(n.t/4)*4+4-n.t):n.d}));
 if(variant==='slow')melody=melody.filter((n,i)=>i%4===0).map(n=>({...n,d:Math.min(.92,item.beats-n.t)}));
 if(variant==='triplet'){melody=[];for(let b=0;b<item.beats/4;b++){const src=item.notes.filter(n=>n.t>=b*4&&n.t<(b+1)*4);for(let k=0;k<12;k++){const n=src[Math.floor(k*src.length/12)];melody.push({...n,t:b*4+k/3,d:.27});}}}
 if(variant==='weave'){melody=[];harmony.forEach((ch,b)=>{for(let k=0;k<16;k++){const idx=b%2?ch.notes.length-1-k%ch.notes.length:k%ch.notes.length;melody.push({n:ch.notes[idx]+12-shift,t:b*4+k/4,d:.20,v:k%4===0?105:83});}});}
 melody=melody.map(n=>({...n,n:n.n+shift,d:Math.min(n.d,item.beats-n.t)}));
 // Retriggering the same MIDI pitch must end its previous note first.
 if(variant!=='original'||!item.source){const last=new Map();for(const n of melody){const prev=last.get(n.n);if(prev&&prev.t+prev.d>n.t)prev.d=n.t-prev.t;last.set(n.n,n);}}
 const chords=[],bass=[],drums=[];
 harmony.forEach(ch=>{if(chordMode==='arp'){for(let k=0;k<16;k++)chords.push({n:ch.notes[k%ch.notes.length],t:ch.t+k/4,d:.21,v:k%4===0?83:64});}else{const times=chordMode==='pulse'?[0,.5,1,1.5,2,2.5,3,3.5]:[0];for(const t of times)for(const n of ch.notes)chords.push({n,t:ch.t+t,d:chordMode==='pulse'?.3:3.85,v:chordMode==='pulse'?64:58});}
  for(let b=0;b<4;b++){const rhythm=style.bass==='offbeat'?[.5]:style.bass==='psy'?[.25,.5,.75]:[.5,.75];rhythm.forEach((t,j)=>bass.push({n:ch.root,t:ch.t+b+t,d:style.bass==='offbeat'?.32:.19,v:90-j*8}));drums.push({n:36,t:ch.t+b,d:.15,v:106});drums.push({n:42,t:ch.t+b+.5,d:.08,v:73});if(b%2===1)drums.push({n:39,t:ch.t+b,d:.1,v:70});}
 });return {melody,chords,bass,drums,harmony,beats:item.beats,bpm:opts.bpm||item.bpm};
}
const be=(n,len)=>Array.from({length:len},(_,i)=>(n>>>((len-i-1)*8))&255);
function vlq(n){let bytes=[n&127];while(n>>=7)bytes.unshift((n&127)|128);return bytes;}
const ascii=s=>Array.from(s,c=>c.charCodeAt(0));
function midiBytes(sketch,parts=['melody','chords','bass','drums']){
 const ppq=480,end=sketch.beats*ppq,chunk=events=>{events.sort((a,b)=>a.tick-b.tick||a.order-b.order);let last=0,body=[];for(const e of events){body.push(...vlq(e.tick-last),...e.bytes);last=e.tick;}body.push(...vlq(end-last),255,47,0);return [...ascii('MTrk'),...be(body.length,4),...body];};
 const micro=Math.round(60000000/sketch.bpm),tempo=chunk([{tick:0,order:0,bytes:[255,81,3,...be(micro,3)]},{tick:0,order:0,bytes:[255,88,4,4,2,24,8]}]);
 const tracks=parts.map((part,i)=>{const ch=part==='drums'?9:i,name=ascii(part),events=[{tick:0,order:-2,bytes:[255,3,...vlq(name.length),...name]}];for(const n of sketch[part]){const start=Math.round(n.t*ppq),stop=Math.min(end,Math.max(start+1,Math.round((n.t+n.d)*ppq)));events.push({tick:start,order:1,bytes:[144+ch,n.n,n.v]},{tick:stop,order:0,bytes:[128+ch,n.n,0]});}return chunk(events);});
 return new Uint8Array([...ascii('MThd'),0,0,0,6,0,1,...be(tracks.length+1,2),...be(ppq,2),...tempo,...tracks.flat()]);
}
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zipBytes(files){const le=(n,len)=>be(n,len).reverse();let locals=[],central=[],offset=0;for(const file of files){const name=ascii(file.name),data=file.bytes,crc=crc32(data),header=[80,75,3,4,20,0,0,0,0,0,0,0,33,0,...le(crc,4),...le(data.length,4),...le(data.length,4),...le(name.length,2),0,0,...name];locals.push(...header,...data);central.push(80,75,1,2,20,0,20,0,0,0,0,0,0,0,33,0,...le(crc,4),...le(data.length,4),...le(data.length,4),...le(name.length,2),0,0,0,0,0,0,0,0,0,0,0,0,...le(offset,4),...name);offset+=header.length+data.length;}return new Uint8Array([...locals,...central,80,75,5,6,0,0,0,0,...le(files.length,2),...le(files.length,2),...le(central.length,4),...le(offset,4),0,0]);}
