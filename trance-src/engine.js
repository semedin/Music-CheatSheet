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
 const top=item.analysis.top,topKeys=new Set(top.map(n=>n.t.toFixed(7)+':'+n.n)),root=60+item.root,pcs=item.pcs.map(c=>[...c]);
 if(variant==='resolve'){pcs[pcs.length-2]=triad(item.root,item.mode,4);if(item.mode==='minor')pcs[pcs.length-2][1]=mod(item.root+11,12);pcs[pcs.length-1]=triad(item.root,item.mode,0);}
 const harmony=pcs.map((pcs,i)=>{const notes=voiceChord(pcs,prev);prev=notes;return {t:i*4,notes:notes.map(n=>n+shift),root:36+pcs[0]+shift,label:chordLabel(pcs,shift)};});
 if(variant==='lift')melody=melody.map(n=>{if(n.t<item.beats/2||!topKeys.has(n.t.toFixed(7)+':'+n.n))return n;const progress=(n.t-item.beats/2)/(item.beats/2),rise=Math.round(Math.sin(progress*Math.PI)*4)+1;return {...n,n:degree(scaleIndex(n.n,root,item.mode)+rise,root,item.mode)};});
 if(variant==='space'){melody=top.filter(n=>n.t<item.beats/2||Math.floor(n.t)%2===0).map((n,i)=>{const answer=n.t>=item.beats/2,d=scaleIndex(n.n,root,item.mode),centre=scaleIndex(top[Math.floor(top.length/2)].n,root,item.mode);return {...n,n:answer?degree(clamp(centre*2-d,centre-5,centre+5),root,item.mode):n.n,d:answer?Math.min(.7,item.beats-n.t):n.d};});}
 if(variant==='slow'){melody=[];for(let b=0;b<item.beats/4;b++){const ns=top.filter(n=>n.t>=b*4&&n.t<(b+1)*4);if(!ns.length)continue;for(let j=0;j<2;j++){const n=ns[Math.floor(j*ns.length/2)];melody.push({...n,t:b*4+j*2,d:j===1?1.8:1.7,v:90});}}}
 if(variant==='triplet'){melody=[];for(let b=0;b<item.beats/4;b++){const src=top.filter(n=>n.t>=b*4&&n.t<(b+1)*4);if(!src.length)continue;for(let k=0;k<12;k++){const n=src[Math.floor(k*src.length/12)];melody.push({...n,t:b*4+k/3,d:.27});}}}
 if(variant==='weave'){melody=[];harmony.forEach((ch,b)=>{const ns=top.filter(n=>n.t>=b*4&&n.t<(b+1)*4),around=ns.length?ns.reduce((s,n)=>s+n.n,0)/ns.length:root+7;for(let k=0;k<16;k++){let n;if(k%4===0){n=nearestPitch(pcs[b][(k/4)%pcs[b].length],around+Math.sin((b*16+k)/16)*3);}else{const last=melody.at(-1).n,delta=k%4===3?-1:1;n=degree(scaleIndex(last,root,item.mode)+delta,root,item.mode);}melody.push({n,t:b*4+k/4,d:.21,v:k%4===0?106:78});}});}
 if(variant==='sequence')melody=top.map(n=>{const step=[0,2,3,1][Math.floor(n.t/8)%4];return {...n,n:degree(scaleIndex(n.n,root,item.mode)+step,root,item.mode)};});
 if(variant==='resolve'){melody=melody.filter(n=>n.t<item.beats-8);const near=top.at(-1)?.n||root,tonic=nearestPitch(item.root,near);for(let b=0;b<2;b++){const pattern=b?[4,2,1,0]:[4,6,5,6],times=[0,1,2,3];times.forEach((t,i)=>{let n=degree(pattern[i],tonic,item.mode);if(!b&&pattern[i]===6&&item.mode==='minor')n=tonic+11;melody.push({n,t:item.beats-8+b*4+t,d:i===3?.88:.82,v:100-i*3});});}}
 melody=melody.map(n=>({...n,n:n.n+shift,d:Math.min(n.d,item.beats-n.t)}));
 if(variant!=='original'||!item.source)melody=cleanNotes(melody,item.beats);
 const chords=[],bass=[],drums=[];
 harmony.forEach(ch=>{if(chordMode==='arp'){for(let k=0;k<16;k++)chords.push({n:ch.notes[k%ch.notes.length],t:ch.t+k/4,d:.21,v:k%4===0?83:64});}else{const times=chordMode==='pulse'?[0,.5,1,1.5,2,2.5,3,3.5]:[0];for(const t of times)for(const n of ch.notes)chords.push({n,t:ch.t+t,d:chordMode==='pulse'?.3:3.85,v:chordMode==='pulse'?64:58});}
  for(let b=0;b<4;b++){const rhythm=style.bass==='offbeat'?[.5]:style.bass==='psy'?[.25,.5,.75]:[.5,.75];rhythm.forEach((t,j)=>bass.push({n:ch.root,t:ch.t+b+t,d:style.bass==='offbeat'?.32:.19,v:90-j*8}));drums.push({n:36,t:ch.t+b,d:.15,v:106});drums.push({n:42,t:ch.t+b+.5,d:.08,v:73});if(b%2===1)drums.push({n:39,t:ch.t+b,d:.1,v:70});}
 });const topline=variant==='original'?item.analysis.top.map(n=>({...n,n:n.n+shift})):upperVoice(melody,item.beats),chordTop=harmony.map(ch=>({n:ch.notes.at(-1),t:ch.t,d:3.85,v:90}));
 return {melody,topline,chordTop,chords,bass,drums,harmony,beats:item.beats,bpm:opts.bpm||item.bpm};
}
function listeningSketch(sketch,mode='full',start=0,length=sketch.beats){
 const out={...sketch,beats:Math.min(length,sketch.beats-start)};
 for(const part of ['melody','chords','bass','drums']){const events=part==='melody'&&mode==='upper'?sketch.topline:part==='melody'&&mode==='chordTop'?sketch.chordTop:sketch[part];out[part]=events.filter(n=>n.t<start+out.beats&&n.t+n.d>start).map(n=>({...n,t:Math.max(0,n.t-start),d:Math.min(n.t+n.d,start+out.beats)-Math.max(n.t,start)}));}
 return out;
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
function zipBytes(files){const le=(n,len)=>be(n,len).reverse(),chunks=[],central=[];let offset=0;for(const file of files){const name=ascii(file.name),data=file.bytes,crc=crc32(data),header=new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,33,0,...le(crc,4),...le(data.length,4),...le(data.length,4),...le(name.length,2),0,0,...name]);chunks.push(header,data);central.push(80,75,1,2,20,0,20,0,0,0,0,0,0,0,33,0,...le(crc,4),...le(data.length,4),...le(data.length,4),...le(name.length,2),0,0,0,0,0,0,0,0,0,0,0,0,...le(offset,4),...name);offset+=header.length+data.length;}chunks.push(new Uint8Array(central),new Uint8Array([80,75,5,6,0,0,0,0,...le(files.length,2),...le(files.length,2),...le(central.length,4),...le(offset,4),0,0]));const out=new Uint8Array(chunks.reduce((s,c)=>s+c.length,0));let p=0;for(const c of chunks){out.set(c,p);p+=c.length;}return out;}
function packReadme(){return `FIELDWORK / TRANCE GOD MODE\n\n${LIBRARY_COUNTS.sources} source MIDIs, preserved byte-for-byte in Untouched-sources.\n${LIBRARY_COUNTS.studies} melodic developments, each explicitly linked to its source.\n${TREATMENTS.length} treatments per source/development: ${LIBRARY_COUNTS.treatments} arranged sketches.\n\nNew horizon: 8-bar source-inspired answer. Ascension: 16-bar development.\nMelodic pitch contour, phrase roles, changing harmony and final cadences are built into the developments.\nEvery arranged file has melody, suggested voiced chords, bass and drums plus tempo metadata.\nOriginal sources may include pedal notes, stacked chords and overlapping note events; these are preserved in the Original treatment.\nOther treatments extract/develop the upper line and may simplify or rewrite the source.\nThe new Melody 1–18 files specify approximately 138 BPM; the older Trance_melody files have no tempo and use suggested style tempos.\nChords and key labels are working interpretations. MIDI contains notes, not audio or synth presets.\nThis pack uses default development settings, original pitch and sustained chords. Use the page's individual exports for your custom answer, tempo, key or chord motion.\nUpper line and chord-top melody can also be exported separately from the page.\nC4 = MIDI 60. Drum map: kick 36, clap 39, closed hat 42.\n`;}
