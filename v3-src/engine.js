const V3 = (() => {
 const D=V3_DATA,copy=x=>JSON.parse(JSON.stringify(x)),bound=(n,a,b)=>Math.max(a,Math.min(b,n));
 const rng=seed=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
 const pick=(r,x)=>x[Math.floor(r()*x.length)],mod=(n,m)=>(n%m+m)%m;
 const getStyle=id=>D.styles.find(s=>s.id===id)||D.styles[0];
 const getArtist=id=>D.artists.find(a=>a.id===id);
 function config(style='singable',artist='') {const s=getStyle(style),a=getArtist(artist);return {style:s.id,artist,seed:482785,root:9,mode:a?.mode||s.mode,bpm:a?.bpm||s.bpm,bars:8,space:35,life:35,swing:a?.swing??s.swing,span:a?.span??s.span??9,emotion:'native',form:'AAA′B',harmony:0,relation:'keep'};}
 function degree(d,mode){const scale=MODES[mode]||MODES.minor;return Math.floor(d/7)*12+scale[mod(d,7)]}
 function pitch(d,c,register){return (register??getStyle(c.style).register)+c.root+degree(d,c.mode)}
 function clean(notes,beats=8){
  const out=notes.filter(n=>Number.isFinite(n.t)&&Number.isFinite(n.p)&&Number.isFinite(n.d)&&Number.isFinite(n.v)&&n.t>=0&&n.t<beats&&n.d>0).map(n=>({...n,t:Math.round(n.t*480)/480,p:bound(Math.round(n.p),0,127),d:Math.max(1/480,Math.round(n.d*480)/480),v:bound(Math.round(n.v),1,127)})).sort((a,b)=>a.t-b.t||b.p-a.p);
  const unique=out.filter((n,i)=>i===0||n.t!==out[i-1].t);
  return unique.map((n,i)=>({...n,d:Math.max(1/480,Math.min(n.d,(unique[i+1]?.t??beats)-n.t,beats-n.t))}));
 }
 function melody(c){
  const s=getStyle(c.style),a=getArtist(c.artist),r=rng(c.seed+s.salt),kind=s.kind,K=D.kinds[kind]||{};
  let hits=[...pick(r,D.rhythms[kind])];
  const sparse=s.sparse?1.25:1,keep=1-c.space/160*sparse*(a?.density??1);
  hits=hits.filter((x,i)=>i===0||i===hits.length-1||r()<keep);
  if(c.space<25){const free=[1,5,9,13,17,21,25,29].filter(x=>!hits.includes(x));hits.push(...free.filter(()=>r()<.23));}
  // Shift a whole subphrase, preserving its internal groove, rather than scattering timing randomly.
  if(r()<.3&&hits.every(x=>x<31))hits=hits.map(x=>x+1);
  hits.sort((a,b)=>a-b);
  // Call and answer: bar two repeats bar one's rhythm and pitches; only the last two notes answer differently.
  const call=a?.echo?hits.filter(x=>x<16):[],echo=call.length>=2?call.length:0;
  if(echo)hits=[...call,...call.map(x=>x+16)];
  const shape=[...pick(r,D.shapes[kind])],contour=a?.contour||pick(r,K.contours||['arch','fall','rise','bounce']);
  const maxDegree=['hypnotic','percussion','rolling'].includes(kind)?Math.min(c.span,4):K.reach?Math.min(c.span,K.reach):c.span;
  const repeat=a?.repeat??({hypnotic:.7,percussion:.55,rolling:.65,rave:.5,hook:.27,cinematic:.24,broken:.33,disco:.35}[kind]??K.repeat);
  const focus=c.emotion==='yearning'?2:c.emotion==='suspended'?4:0;
  const top=K.top??4,stepChance=K.step??.28,leap=a?.leap??K.leap??(contour==='pedal'?5:3),octave=a?.oct??s.oct??K.oct??0,lift=a?.reg??0,length=a?.len??1;
  let prior=shape[0],upper=shape[0],out=[];const degrees=[],octaves=[];
  hits.forEach((step,i)=>{
   const progress=i/Math.max(1,hits.length-1),last=i===hits.length-1,answer=echo&&i>=echo&&i<hits.length-2;let d=shape[i%shape.length];
   if(contour==='fall')d=top-d;
   if(contour==='rise'&&progress>.55)d+=1;
   if(contour==='arch'&&progress>.3&&progress<.65)d+=1;
   if(contour==='zigzag'&&i%2===1)d+=2;
   if(contour==='climb')d+=Math.floor(progress*3);
   if(contour==='answer'&&progress>=.5)d=d>=2?d-2:d+2;
   if(c.emotion==='bright'&&progress>.45&&progress<.7)d+=1;
   if(c.emotion==='restless'&&i%4===3)d+=r()<.5?1:-1;
   d+=focus;
   // A pedal contour alternates a fixed anchor with a moving upper voice; repetition applies to that upper voice.
   const ref=contour==='pedal'?upper:prior;
   if(r()<repeat&&i>0)d=ref;
   else if(r()<stepChance)d=ref+pick(r,[-1,1]);
   d=bound(d,0,maxDegree);if(last)d=pick(r,[0,2,4].filter(n=>n<=maxDegree));
   if(i>0&&Math.abs(d-prior)>leap&&r()<.8)d=prior+Math.sign(d-prior)*pick(r,[1,2]);
   if(contour==='pedal'){if(i%2===0&&!last)d=0;else upper=d;}
   if(answer)d=degrees[i-echo];
   let oct=0;if(octave&&i>0&&!last)oct=r()<octave?12:0;if(answer)oct=octaves[i-echo];
   degrees.push(d);octaves.push(oct);
   prior=d;
   const t=step/4,gap=((hits[i+1]??32)-step)/4;
   const held=['hook','cinematic'].includes(kind)||last,short=!(held&&gap>=.75);
   let duration=held&&gap>=.75?gap*(c.emotion==='yearning'?.96:.88):Math.min(gap*.78,pick(r,[.16,.23,.34,.46]));
   if(kind==='rave'&&i%4===0)duration=Math.min(gap*.9,.7);
   if(kind==='rolling')duration=Math.min(gap*.74,.23);
   if(kind==='percussion')duration=Math.min(gap*.65,.29);
   if(short){
    if(kind==='stab')duration=Math.min(gap*.6,.17);
    if(kind==='piano')duration=Math.min(gap*.85,.42);
    if(kind==='vocal')duration=gap<=.3?gap*.72:Math.min(gap*.8,pick(r,[.22,.3,.48]));
    if(kind==='sequence')duration=Math.min(gap*.7,.3);
    // Acid slides are written as legato notes that reach the next attack; a mono synth with glide turns them into slides.
    if(kind==='acid')duration=r()<.2?gap:Math.min(gap*.6,.2);
    if(kind==='jack')duration=Math.min(gap*.7,i%3===0?.36:.2);
   }
   if(c.emotion==='suspended'&&gap>.7)duration=gap*.96;
   if(length!==1)duration=Math.min(gap*.97,duration*length);
   const strong=mod(step,4)===0,crest=d>=maxDegree-1;
   let velocity=strong?102:mod(step,2)===0?91:78;
   if(kind==='acid')velocity=r()<.32?116:mod(step,2)===0?84:72;
   if((kind==='jack'||kind==='stab')&&i%3===0)velocity+=8;
   out.push({id:'m'+i,t,p:pitch(d,c)+lift+oct,d:duration,v:bound(velocity+(crest?5:0)+Math.round((r()-.5)*8),58,114),locked:false,anchor:i===0||last});
  });
  return clean(out);
 }
 function nearest(p,c,choices){let best=p,dist=100;for(let n=p-12;n<=p+12;n++){if(choices.some(d=>mod(n-c.root,12)===mod(degree(d,c.mode),12))&&Math.abs(n-p)<dist){best=n;dist=Math.abs(n-p)}}return best}
 function mutate(motif,c,kind,seed=c.seed+7919){
  const r=rng(seed),s=getStyle(c.style),out=copy(motif),available=out.map((n,i)=>n.locked?-1:i).filter(i=>i>=0);
  if(!available.length)return out;
  if(kind==='rhythm'){
   // Pitch order and protected events survive. Move onsets within their neighbours.
   // An attack stays put when its neighbours leave no room, or when it would move into a protected note that is still sounding.
   available.forEach(i=>{if(r()<.58){const n=out[i],prev=out[i-1],lo=(prev?.t??-.25)+.25,hi=(out[i+1]?.t??8)-.25,moved=bound(n.t+pick(r,[-.5,-.25,.25,.5]),Math.max(0,lo),Math.min(7.75,hi));if(lo<=hi&&(!prev?.locked||moved>=prev.t+prev.d))n.t=moved;}});
   if(out.every((n,i)=>n.t===motif[i].t)){const i=available.find(i=>(out[i+1]?.t??8)-out[i].t>.5);if(i!==undefined)out[i].t+=.25;}
   return fitAroundLocks(out,motif);
  }
  if(kind==='ending'){
   const ending=available.filter(i=>out[i].t>=Math.max(4,(out.at(-1)?.t??7)-2));
   ending.forEach((i,j)=>{const n=out[i];n.p=nearest(n.p+pick(r,[-2,2,3]),c,j===ending.length-1?[0,2,4]:[0,1,2,3,4,5,6]);n.v=bound(n.v+(j===ending.length-1?5:-3),1,127)});
   const i=ending.at(-1);if(i!==undefined)out[i].d=Math.min(8-out[i].t,Math.max(.6,out[i].d*1.7));
   return fitAroundLocks(out,motif);
  }
  if(kind==='pitch'){
   const shift=pick(r,[-2,-1,1,2]);available.forEach((i,k)=>{const n=out[i];if(k%3===0||r()<.4)n.p=nearest(bound(n.p+shift,48+c.root,84+c.root),c,[0,1,2,3,4,5,6])});
   return out;
  }
  available.forEach(i=>{const n=out[i];n.v=bound(n.v+pick(r,[-12,-7,7,12]),45,118);n.d*=pick(r,[.6,.85,1.15,1.5]);});return fitAroundLocks(out,motif);
 }
 function fitAroundLocks(out,original){
  const fixed=original.filter(n=>n.locked),result=out.map(n=>copy(fixed.find(f=>f.id===n.id)||n));
  for(const n of result){if(n.locked)continue;for(const f of fixed){if(n.t>=f.t&&n.t<f.t+f.d)n.t=f.t+f.d;}}
  result.sort((a,b)=>a.t-b.t);
  const cleanResult=[];
  for(let i=0;i<result.length;i++){const n=result[i];if(n.locked){cleanResult.push(n);continue;}const gap=(result[i+1]?.t??8)-n.t;if(n.t<8&&gap>0)cleanResult.push({...n,d:Math.max(1/480,Math.min(n.d,gap,8-n.t))});}
  return cleanResult;
 }
 function progression(c){const s=getStyle(c.style);return s.progressions[c.harmony%s.progressions.length]}
 function labels(c){return c.form==='AAAA'?['A','A','A','A']:c.form==='ABAB'?['A','B','A','B']:c.form==='AABA'?['A','A','B','A']:['A','A','A′','B']}
 function phrase(motif,c){
  const ls=labels(c),out=[],prog=progression(c);
  for(let block=0;block<c.bars/2;block++){
   const letter=ls[block%4];let cell=copy(motif);
   if(letter==='B')cell=mutate(cell,c,'ending',c.seed+931);
   if(letter==='A′')cell=mutate(cell,c,'touch',c.seed+419);
   if(c.relation==='land'&&block%4>0){const last=[...cell].reverse().find(n=>!n.locked);if(last)last.p=nearest(last.p,c,[prog[block%4],prog[block%4]+2,prog[block%4]+4]);}
   cell.forEach(n=>out.push({...n,t:n.t+block*8,id:n.id+'b'+block,source:n.id,block}));
  }
  return out;
 }
 function voice(d,c,previous){
  const base=[0,2,4].map(k=>48+c.root+degree(d+k,c.mode));let candidates=[];
  for(let oct=-2;oct<=1;oct++)for(let inv=0;inv<3;inv++){const v=base.map((n,i)=>n+oct*12+(i<inv?12:0)).sort((a,b)=>a-b);if(v[0]>=45&&v[2]<=81)candidates.push(v)}
  const target=previous||[55,60,64];return candidates.sort((a,b)=>a.reduce((sum,n,i)=>sum+Math.abs(n-target[i]),0)-b.reduce((sum,n,i)=>sum+Math.abs(n-target[i]),0))[0]||base;
 }
 function accompaniment(motif,c){
  const s=getStyle(c.style),r=rng(c.seed+6163),prog=progression(c),mel=phrase(motif,c),tracks={melody:mel,bass:[],chords:[],arp:[],drums:[]};
  let prev=null;const add=(role,t,p,d,v)=>tracks[role].push({t,p,d,v,id:role+tracks[role].length});
  for(let bar=0;bar<c.bars;bar++){
   const t=bar*4,d=prog[Math.floor(bar/2)%4];
   const broken=['breaks','garage','electro','dnb','amapiano','stutter'].includes(s.id)||s.beat==='broken';
   let kicks=broken?(s.id==='dnb'?[0,2.5]:s.id==='amapiano'?[0,1.75,3.5]:bar%2?[0,1.5,2.75]:[0,1.75,2.5]):s.beat==='threestep'?[0,1.5,3]:[0,1,2,3];
   kicks.forEach(x=>add('drums',t+x,36,.12,108));
   (s.id==='amapiano'?[2]:[1,3]).forEach(x=>add('drums',t+x,s.family==='House'||s.family==='Disco'?39:38,.12,96));
   const hats=s.kind==='rolling'||s.id==='hardgroove'||s.id==='dnb'||s.hat==='roll'?[0,.5,.75,1,1.5,2,2.5,2.75,3,3.5]:[.5,1.5,2.5,3.5];
   // House-style open hats sit on the offbeat, with quiet closed hats between them.
   hats.forEach((x,i)=>add('drums',t+x,s.hat==='open'?46:42,s.hat==='open'?.2:.07,i%2?70:85));
   if(s.hat==='open')[.75,1.75,2.75,3.75].forEach(x=>add('drums',t+x,42,.05,58));
   if(['percussion','broken','disco','jack','vocal','piano'].includes(s.kind))pick(r,[[.75,2.25,3.75],[.25,1.75,2.75],[1.25,2.5,3.25]]).forEach((x,i)=>add('drums',t+x,['hardgroove','tribal','afro','amapiano'].includes(s.id)||s.kit==='organic-percussion'?[63,64,45][i]:37,.1,58+i*6));
   if(bar%4===3)add('drums',t+3.75,37,.08,54);
   const basePitch=36+c.root+degree(d,c.mode),rollingBass=s.kind==='rolling'||s.bassline==='rolling',octaveBass=s.kind==='disco'||s.bassline==='octave';let bassHits;
   if(rollingBass)bassHits=Array.from({length:12},(_,i)=>Math.floor(i/3)+(i%3+1)/4);
   else if(s.id==='amapiano')bassHits=bar%2?[.75,1.5,2.25,2.75,3.5]:[.5,1.75,2.5,3.25];
   else if(octaveBass)bassHits=[0,.5,1.5,2,2.5,3.5];
   else if(s.bassline==='syncopated')bassHits=[.5,.75,1.5,2.5,2.75,3.5];
   else if(broken)bassHits=[.5,1.25,2.75,3.5];
   else bassHits=[.5,1.5,2.5,3.5];
   const gaps=bassHits.filter(x=>!mel.some(n=>n.t>=t&&n.t<t+4&&Math.abs(n.t-(t+x))<.18));
   if(!rollingBass&&!octaveBass&&s.id!=='amapiano')bassHits=gaps.length>=2?gaps:bassHits.filter((_,i)=>i%2===0);
   bassHits.forEach((x,i)=>{
    const octave=octaveBass&&i%3===1?12:0,log=s.id==='amapiano'&&i%3===2?degree(4,c.mode):0;
    const untilKick=(kicks.find(k=>k>x)??4)-x,untilNext=(bassHits[i+1]??4)-x;
    add('bass',t+x,bound(basePitch+octave+log,28,65),Math.max(.06,Math.min(rollingBass?.16:s.id==='amapiano'?.25:.43,untilKick-.04,untilNext-.04)),i%3===0?102:84);
   });
   if(bar%2===0){const ns=voice(d,c,prev);prev=ns;const sustained=['cinematic','hook'].includes(s.kind)||s.chords==='pad';
    // Piano chords rock in a 3-3-2 pocket; offbeat chords answer every kick, as in dub and stab techno.
    const stamps=sustained?[0]:s.chords==='piano'?[0,.75,1.5,2.5,3.25,4,4.75,5.5,6.5,7.25]:s.chords==='offbeat'?[.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5]:[.5,2.5,4.5,6.5];
    stamps.forEach(x=>ns.forEach((n,i)=>add('chords',t+x,n,sustained?7.7:s.chords==='piano'?.32:.35,70+i*4)));
   }
   const ns=voice(d,c,prev).map(n=>n+12);
   [.25,1.25,2.25,3.25].filter(x=>!mel.some(n=>n.t<t+x+.3&&n.t+n.d>t+x-.1)).forEach((x,i)=>add('arp',t+x,ns[(i+bar)%3],.22,65+i*3));
  }
  return tracks;
 }
 function performed(notes,c,role){
  const total=c.bars*4;return notes.map((n,i)=>{
   const seed=(n.source||n.id||String(i)).split('').reduce((s,x)=>s*31+x.charCodeAt(0),17)>>>0,r=rng(seed),sixteenth=Math.round(n.t*4),onGrid=Math.abs(n.t*4-sixteenth)<.01;
   const swing=onGrid&&sixteenth%2===1?c.swing/100*.16:0;
   const human=role==='drums'&&n.p===36?0:(r()-.5)*c.life/100*.025;
   const t=bound(n.t+swing+human,0,total-1/480);
   return {...n,t,d:Math.max(1/480,Math.min(n.d,total-t)),v:bound(Math.round(n.v+(r()-.5)*c.life/100*8),1,127)};
  });
 }
 function metrics(notes){const ds=notes.slice(1).map((n,i)=>Math.abs(n.p-notes[i].p));return {notes:notes.length,range:notes.length?Math.max(...notes.map(n=>n.p))-Math.min(...notes.map(n=>n.p)):0,repeat:ds.length?Math.round(100*ds.filter(d=>d===0).length/ds.length):0,space:Math.round(100*(1-notes.reduce((sum,n)=>sum+n.d,0)/8)),held:notes.filter(n=>n.d>=.75).length};}
 function midi(notesByRole,c,title='Fieldwork V3'){const tracks=Object.entries(notesByRole).map(([role,notes])=>({role,name:title+' / '+ROLE_NAMES[role],notes:performed(notes,c,role)}));return midiBytes(tracks,{...c,progression:progression(c)},title);}
 function signature(ns){return ns.map(n=>[Math.round(n.t*480),n.p,Math.round(n.d*480)].join(':')).join('|')}
 function familyFiles(motif,c){const s=getStyle(c.style),title=`FW3_${s.id}_${NOTE_NAMES[c.root]}-${c.mode}_${c.bpm}bpm_seed-${c.seed}`,tr=accompaniment(motif,c),files=[];
  for(const [role,notes] of Object.entries(tr))files.push({name:title+'/'+role+'.mid',bytes:midi({[role]:notes},c,title)});
  files.push({name:title+'/motif-2bars.mid',bytes:midi({melody:motif},{...c,bars:2},title+' motif')});
  files.push({name:title+'/sketch.mid',bytes:midi(tr,c,title)});return files;
 }
 function pack(artistCollection=false){const midi=(artistCollection?D.artists.length*4:D.styles.length*8)*2;return {midi,name:`Fieldwork-V3-${midi}-${artistCollection?'Artist':'Style'}-Studies.zip`};}
 function library(artistCollection=false){const files=[],catalog=[],items=artistCollection?D.artists:D.styles;
  for(let j=0;j<items.length;j++)for(let i=0;i<(artistCollection?4:8);i++){
   const item=items[j],c=config(artistCollection?item.style:item.id,artistCollection?item.id:'');c.seed=310019+j*13007+i*7919;c.space=[22,35,48,60][i%4];
   const motif=melody(c),tr=accompaniment(motif,c),name=`${item.id}/${String(i+1).padStart(2,'0')}_${NOTE_NAMES[c.root]}-${c.mode}_${c.bpm}bpm`;
   files.push({name:name+'_melody.mid',bytes:midi({melody:tr.melody},c,item.name)});files.push({name:name+'_sketch.mid',bytes:midi(tr,c,item.name)});
   catalog.push({name:item.name,config:c,motif,focus:artistCollection?item.focus:item.lesson});
  }
  files.push({name:'recipes.json',bytes:new TextEncoder().encode(JSON.stringify(catalog,null,2))});
  files.push({name:'READ-ME.txt',bytes:new TextEncoder().encode('FIELDWORK V3 / ORIGINAL STARTING POINTS\n\nEach idea includes an eight-bar melody and a five-part MIDI sketch. The melody is built from a persistent two-bar motif: A, A, A-prime, B. Chords last two bars; the hook does not automatically transpose with them.\n\nArtist studies are original interpretations of broad writing approaches, not transcriptions or exact reproductions. Audition and edit with your own sounds. MIDI includes performed timing, duration and velocity, not browser patches, glide or effects.\n\nIn Ableton: import onto MIDI tracks, choose instruments, set the BPM shown in the name, and check the eight-bar loop bracket. MIDI pitch 60 is labelled C3. Drum map: 36 kick, 37 rim, 38 snare, 39 clap, 42 hat, 45 tom, 63/64 percussion. Sketches contain all five parts: mute supporting parts to taste. Individual exports are format 0; sketches format 1; 480 PPQ.\n\nRecipes and seeds are included in recipes.json. This collection is generated and structurally tested; musical judgement belongs to your ears.\n')});return files;
 }
 function parseMidi(bytes){
  if(bytes.length>4e6)throw Error('Choose a MIDI file smaller than 4 MB.');const b=new Uint8Array(bytes),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);let pos=0;
  const need=n=>{if(pos+n>b.length)throw Error('The MIDI file is incomplete.');};
  const u8=()=>{need(1);return b[pos++]},u16=()=>{need(2);const n=dv.getUint16(pos);pos+=2;return n},u32=()=>{need(4);const n=dv.getUint32(pos);pos+=4;return n},str=n=>{need(n);let s='';while(n--)s+=String.fromCharCode(b[pos++]);return s},vlq=()=>{let n=0,x,count=0;do{x=u8();n=n*128+(x&127);if(++count>4)throw Error('Invalid MIDI event length.')}while(x&128);return n};
  if(str(4)!=='MThd')throw Error('This is not a Standard MIDI File.');const hlen=u32(),format=u16(),count=u16(),ppq=u16();if(hlen<6||format>1||ppq&32768||!ppq||count>128)throw Error('Use a format 0 or 1 MIDI file with beat-based timing.');need(hlen-6);pos+=hlen-6;
  const tracks=[];let tempo=120,events=0;
  for(let tr=0;tr<count;tr++){
   if(str(4)!=='MTrk')throw Error('Missing MIDI track.');const size=u32();need(size);const end=pos+size;let tick=0,status=0,name='Track '+(tr+1),active=new Map(),notes=[];
   while(pos<end){if(++events>200000)throw Error('This MIDI file has too many events.');tick+=vlq();let st=u8();if(st<128){if(!status)throw Error('Invalid running status.');pos--;st=status;}else if(st<240)status=st;
    if(st===255){const type=u8(),len=vlq();need(len);if(type===3)name=str(len);else{if(type===81&&len===3){const us=b[pos]*65536+b[pos+1]*256+b[pos+2];if(us>0)tempo=60000000/us;}pos+=len;}}
    else if(st===240||st===247){const len=vlq();need(len);pos+=len;status=0;}
    else if(st<240){const type=st&240,ch=st&15,p=u8(),v=type===192||type===208?0:u8();if(p>127||v>127)throw Error('Invalid MIDI note data.');const key=ch+':'+p;
     if(type===144&&v>0){if(!active.has(key))active.set(key,[]);active.get(key).push({t:tick/ppq,p,v,ch});}
     else if(type===128||type===144){const n=active.get(key)?.shift();if(n&&ch!==9&&tick/ppq>n.t)notes.push({...n,d:tick/ppq-n.t});}
    }else throw Error('Unsupported MIDI event.');
    if(pos>end)throw Error('A MIDI event extends beyond its track.');
   }
   for(const queue of active.values())for(const n of queue)if(n.ch!==9&&tick/ppq>n.t)notes.push({...n,d:tick/ppq-n.t});
   if(notes.length)tracks.push({name,notes:notes.sort((a,b)=>a.t-b.t||b.p-a.p)});
  }
  if(!tracks.length)throw Error('No pitched notes found. Choose a melody MIDI clip.');return {tracks,tempo};
 }
 function importMotif(track){const start=Math.floor(track.notes[0].t/4)*4;return clean(track.notes.filter(n=>n.t>=start&&n.t<start+8).map((n,i)=>({id:'import'+i,t:n.t-start,p:n.p,d:n.d,v:n.v,locked:false,anchor:i===0})));}
 return {D,copy,bound,rng,pick,getStyle,getArtist,config,degree,pitch,clean,melody,mutate,phrase,accompaniment,performed,progression,labels,metrics,midi,signature,familyFiles,pack,library,parseMidi,importMotif};
})();
