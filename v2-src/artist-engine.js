function generateArtist(p,c){
 const a=artistOf(p),g=genreOf(p),v=p.variation,r=random32(c.seed+p.seed),m=MOODS[c.mood],total=c.bars*4,out=[];
 const baseRh={melody:a.mr,bass:a.br,chords:a.cr,arp:a.ar};
 const add=(step,pitch,len,velocity,anchor=false)=>{
  if(!anchor&&r()>clamp(c.density/100*m.density,.1,1))return;
  const swing=mod(Math.floor(step),2)?c.swing/100*.25:0;
  const t=clamp(step/4+swing+(r()-.5)*c.human*.0012,0,total-1/480);
  out.push({t,p:clamp(pitch,0,127),d:Math.max(.03,Math.min(total-t,len/4*c.gate/80*m.gate)),v:clamp(Math.round(velocity+m.vel+(r()-.5)*c.human+(v===3||v===7?-14:v===2?8:0)),24,124)});
 };
 let previous=null;
 for(let bar=0;bar<c.bars;bar++){
  const base=bar*16,d=c.progression[bar%4],answer=bar%2===1,phraseB=(c.form==='AABA'&&Math.floor(bar/2)%4===2)||(c.form==='ABAC'&&Math.floor(bar/2)%2===1);
  let hits=p.role==='drums'?[]:[...baseRh[p.role]];
  if(p.role==='arp'&&a.ar.every(s=>s%3===0))hits=Array.from({length:16},(_,s)=>s).filter(s=>mod(base+s,3)===0);
  if(v===1&&answer)hits=hits.filter((_,i)=>i%3!==1).map(s=>mod(s+1,16));
  if(v===2)hits=[...hits,...(p.role==='chords'?[14]:[5,13,15])];
  if(v===3)hits=hits.filter((_,i)=>i%2===0);
  if(v===4)hits=hits.map((s,i)=>mod(15-s+(i%2),16));
  if(v===5)hits=p.role==='chords'?[2,9]:[0,3,5,8,10,13,15];
  if(v===6&&answer)hits=[...hits,7,11,14,15];
  if(v===7)hits=p.role==='chords'||p.role==='bass'?[0]:hits.filter((_,i)=>i%2===0).map(s=>mod(Math.floor(s/2)*2,16));
  hits=[...new Set(hits)].sort((x,y)=>x-y);
  if(p.role==='drums'){
   let lanes=[[36,a.k],[38,a.sn],[42,a.hh],[46,[6,14]],[g.drum==='afro'?64:37,a.perc]];
   if(v===1)lanes[0][1]=a.k.map((s,i)=>i>0&&answer?mod(s+1,16):s);
   if(v===2)lanes.push([70,[1,3,5,7,9,11,13,15]]);
   if(v===3)lanes=lanes.slice(0,3).map(([pitch,steps])=>[pitch,pitch===42?steps.filter((_,i)=>i%2===0):steps]);
   if(v===4){lanes[0][1]=[0,3,7,10,14];lanes[1][1]=[4,11]}
   if(v===5){lanes[2][1]=[0,3,6,9,12,15];lanes.push([75,[2,7,12]])}
   if(v===6&&answer)lanes.push([45,[11,13,14,15]]);
   if(v===7)lanes=[[36,[0,a.k.length>3?10:6]],[38,[8]],[42,a.hh.filter((_,i)=>i%2===0)],[37,a.perc.filter((_,i)=>i%2===0)]];
   lanes.forEach(([pitch,steps])=>steps.forEach((s,i)=>{
    if(c.form==='breakdown'&&bar>=c.bars/2&&pitch===36)return;
    add(base+s,pitch,pitch===46?1.3:.45,pitch===36?108:pitch===38?97:65+(i%3)*7,pitch===36||pitch===38);
   }));
   if(bar%4===3&&v!==3&&v!==7)add(base+15,37,.3,43+Math.floor(r()*12));
   continue;
  }
  if(p.role==='chords'){
   const chordRoot=v===5?c.progression[0]:d;
   let ns=chordPitches(chordRoot,c,a.ext,previous,v===2?2:0);previous=ns;
   if(v===2)ns=ns.map((n,i)=>i===ns.length-1?n+12:n);
   if(v===7)ns=ns.filter((_,i)=>i!==1);
   if(v===4)ns=ns.map((n,i)=>i===1?n-12:n).sort((x,y)=>x-y);
   if(v===6&&answer)ns=ns.map((n,i)=>i===ns.length-1?n+12:n);
   const gate=v===3||v===7?12:a.cr.length===1?15:a.cr.length===2?5:1.6;
   hits.forEach((s,i)=>{if(i&&r()>clamp(c.density/100*m.density,.1,1))return;ns.forEach((n,k)=>add(base+s+(c.voicing==='strum'?k*.08:0),n,gate,78+(k===ns.length-1?8:0),true))});
   continue;
  }
  hits.forEach((s,i)=>{
   const next=hits[i+1]??16;
   let n,length=Math.min(next-s-.08,p.role==='bass'?g.bass==='psy'?.7:1.6:2.2);
   if(p.role==='melody'){
    const j=mod(i+(answer?3:0)+(phraseB?2:0)+Math.floor(c.seed/193)%a.mn.length,a.mn.length);
    let degreeOffset=a.mn[v===4?a.mn.length-1-j:j];
    if(v===1&&answer)degreeOffset=7-degreeOffset;
    if(v===5)degreeOffset=i%2===0?0:a.mn[i%a.mn.length];
    if(v===6&&answer)degreeOffset+=Math.floor(i/2);
    if(v===2&&bar>=c.bars/2||c.form==='lift'&&bar>=c.bars/2)degreeOffset+=7;
    if(c.form==='loop')degreeOffset=a.mn[i%a.mn.length];
    if(c.mood==='Playful'&&i%4===2)degreeOffset+=7;
    if(c.mood==='Hypnotic')degreeOffset=a.mn[i%3];
    n=60+c.root+degree(d+degreeOffset+m.lift,c.mode);
    if(v===3||v===7)length=Math.max(.6,next-s-.2);
   }else if(p.role==='bass'){
    let interval=a.bn[mod(i+(answer?Math.floor(c.seed/719)%3:0),a.bn.length)];
    if(v===5)interval=i%3?0:4;
    if(v===4)interval=a.bn[a.bn.length-1-(i%a.bn.length)];
    if(v===6&&answer&&i>=hits.length-3)interval=[2,4,6][i%3];
    if(v===1&&answer&&i===hits.length-1)interval=6;
    if(v===2&&i%4===3)interval=7;
    n=36+c.root+degree(d+interval,c.mode);while(n>60)n-=12;
    if(v===7||v===3||['sustain','reese','halftime'].includes(g.bass))length=Math.max(.6,next-s-.25);
   }else{
    let order=v===4?[...a.ao].reverse():a.ao,index=order[mod(i+(answer?1:0),order.length)];
    if(v===5)index=i%2===0?0:index;
    const tones=[0,2,4,6];n=60+c.root+degree(d+tones[index],c.mode);
    if(v===6&&answer||v===2&&i%4===3)n+=12;
    if(v===7)length=Math.max(.6,next-s-.3);
    else length=Math.min(1.1,next-s-.05);
   }
   add(base+s,n,length,84+(i%3===0?13:-5),i===0);
  });
 }
 return tidyNotes(out,total);
}
function artistPackFiles(){
 const files=packFiles(ARTIST_PRESETS,false);
 for(const a of ARTISTS){const p=ARTIST_PRESETS.find(p=>p.artist===a.id&&p.role==='melody'&&p.variation===0),c=factoryConfig(p);
  const tracks=ROLES.map(role=>{const recipe=ARTIST_PRESETS.find(p=>p.artist===a.id&&p.role===role&&p.variation===0);return{role,name:`${a.name} study / ${ROLE_NAMES[role]}`,notes:generate(recipe,c)}});
  files.push({name:`artists/${a.id}/SKETCH_${a.id}_A-${c.mode}_${c.bpm}bpm.mid`,bytes:midiBytes(tracks,c,a.name+' / '+a.focus)});
 }
 files.push({name:'ARTIST-STUDIES.txt',bytes:new TextEncoder().encode(`FIELDWORK / ARTIST STUDIES\n1,280 original clips + 32 coordinated five-part sketches. 32 profiles covering 31 artist names; Tiësto has classic trance and modern club profiles. Eight treatments per part.\n\nThese are original composition studies using broad listening references, not exact artist presets or song transcriptions. Specific notes, rhythms, tempos and patch choices are our creative interpretation. No artist recordings or samples are included.\n\nAll files are 8 bars in A in the profile's native mode. Load your own sounds in Ableton. The suggested browser patch names are recorded in catalog.json and the profile guide below; MIDI itself does not carry these synthesizers.\n\n${ARTISTS.map(a=>`${a.name} / ${a.focus}\n${ROLES.map((role,i)=>`  ${ROLE_NAMES[role]}: ${a.traits[i]} Suggested sound: ${a.patch[i]}.`).join('\n')}${a.source?'\n  Listening reference: '+a.source:''}`).join('\n\n')}`)});
 return files;
}
Object.assign(Fieldwork,{ARTISTS,ARTIST_PRESETS,GENRE_PRESETS,ARTIST_TREATMENTS,artistOf,treatmentFor,generateArtist,artistPackFiles});
