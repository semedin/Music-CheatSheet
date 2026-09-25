// Reference analysis and melodic development. No random chromatic walks:
// a source supplies the rhythm/interval vocabulary; phrase targets and harmony shape its answer.
const NEW_SOURCE_INFO={
 1:['Northern lights','uplifting',9,'minor',[0,0,6,5,0,0,6,5],'Alternating low anchors and eighth-note upper replies. Bars 7–8 expand the first phrase with a rising turn and a falling answer.'],
 2:['Violet pressure','tech',5,'minor',[2,2,0,0,2,2,0,0],'A clipped sixteenth-note pedal riff. F rises to G in the upper voice while the low anchor moves from A♭ to F.'],
 3:['Prismatic ascent','uplifting',1,'minor',[0,0,0,0,5,5,3,3],'Root–fifth machinery under a climbing upper voice. Listen for the upper line adding E, F♯, G♯ and A as the phrase develops.'],
 4:['The deep signal','hard',3,'minor',[0,0,0,0,5,5,3,3],'A low octave pedal frames a descending high hook; the second half changes the foundation and reaches into a higher register.'],
 5:['In the distance','classic',9,'minor',[0,0,6,6,5,5,3,3],'A three-note engine shifts across the bar. The high line moves E–G–A–G while bass roots descend A–G–F–D.'],
 6:['Crimson horizon','hard',2,'minor',[0,5,2,2,0,5,2,4],'Wide low/high separation, short gates and an expanded final answer. B♭ supplies tension above D; the ending introduces E above A.'],
 7:['Weightless motion','progressive',3,'minor',[0,0,6,6,4,4,5,5,0,0,6,6,4,4,5,5],'A dotted-eighth pulse crosses bar lines. Paired low and high notes trace a 16-bar arc, with a changed high answer at the end.'],
 8:['Velvet cathedral','classic',5,'minor',[0,0,0,0,5,5,3,3],'This file contains actual stacked chord stabs. The highest voice moves independently over F-minor, D♭ and B♭ colour. Use Upper line to hear that melody.'],
 9:['Chromatic daylight','goa',0,'minor',[0,0,0,0,2,2,3,2],'A B♭–C figure reaches toward D, F and E♭ over changing low anchors. One exactly duplicated source note is retained in the untouched file.'],
 10:['A sky without edges','balearic',2,'minor',[0,5,3,3,3,3,2,2,0,5,3,3,3,3,2,2],'A–B♭–F forms the high hook; low roots give it changing emotional context. The very wide register is part of the original sketch.'],
 11:['Emerald transmission','goa',4,'minor',[0,0,5,6,0,0,5,6],'Three-note sixteenth cells create a rolling sequence while the upper notes climb F♯–G–A. The second phrase changes the last two bars.'],
 12:['Eclipse','uplifting',4,'minor',[0,0,2,4,5,2,5,6,5,6,0,6,5,6,3,4],'A full 16-bar, two-layer phrase with a rising upper line, changing roots and a late high point. The last bar uses D♯ against B: a harmonic-minor dominant pull back to E.'],
 13:['Memory in motion','psy',9,'minor',[0,5,0,6,0,5,0,6],'A steady A/C call alternates with a moving F/G answer. The lower and upper registers trade places inside the same bar.'],
 14:['Gravity turns','balearic',4,'minor',[0,3,5,6,0,3,5,6],'Uneven offbeat replies and longer lead notes carry the phrase. The second pass reaches higher on A-minor before descending toward D.'],
 15:['Last light on Earth','uplifting',11,'minor',[0,0,5,5,3,3,4,4],'A B-minor riff grows into a wider melodic climb over G and E. The final A♯ is the raised seventh, strengthening the F♯-major dominant.'],
 16:['Infinite return','progressive',1,'minor',[0,0,2,2,6,6,5,5,0,0,2,2,6,6,5,5],'A 16-bar C♯-minor sequence with a consistent low/mid motor and a developing upper line. Two-bar roots make the phrase feel broader.'],
 17:['Floating cities','balearic',8,'minor',[0,0,6,6,3,3,3,3],'Longer eighth-note arpeggios with a gradually rising ending. The F-natural over C♯ suggests a major-IV colour, so the key label is a working centre.'],
 18:['After the stars','progressive',4,'major',[0,4,5,3,0,4,5,3],'E–B–C♯m–A harmony, a repeated B common tone and expressive note lengths. The last bar opens the upper line from C♯ toward G♯ and A.']
};
const mod=(n,m)=>((n%m)+m)%m;
const PITCHES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALES={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11]};
const pitch=n=>PITCHES[mod(n,12)],noteName=n=>pitch(n)+(Math.floor(n/12)-1);
const degree=(d,root=57,mode='minor')=>root+SCALES[mode][mod(d,7)]+12*Math.floor(d/7);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function scaleIndex(n,root,mode){let best=0,cost=Infinity;for(let d=-28;d<42;d++){const c=Math.abs(degree(d,root,mode)-n);if(c<cost){cost=c;best=d;}}return best;}
function nearestPitch(pc,around){return pc+12*Math.round((around-pc)/12);}
function cleanNotes(notes,beats){
 const unique=new Map();for(const n of notes){if(n.t<0||n.t>=beats||n.d<=0)continue;const key=n.t.toFixed(7)+':'+n.n;const old=unique.get(key);if(!old||n.v>old.v)unique.set(key,{...n,d:Math.min(n.d,beats-n.t)});}
 const out=[...unique.values()].sort((a,b)=>a.t-b.t||a.n-b.n),last=new Map();for(const n of out){const p=last.get(n.n);if(p&&p.t+p.d>n.t)p.d=n.t-p.t;last.set(n.n,n);}return out.filter(n=>n.d>1e-6);
}
function upperVoice(notes,beats){
 // A pronounced register gap separates interleaved pedal notes from the hook.
 const pitches=[...new Set(notes.map(n=>n.n))].sort((a,b)=>a-b);let split=-Infinity,gap=6;
 for(let i=1;i<pitches.length;i++){const g=pitches[i]-pitches[i-1],above=notes.filter(n=>n.n>=pitches[i]).length;if(g>=gap&&above>=Math.min(8,notes.length*.15)){gap=g;split=(pitches[i]+pitches[i-1])/2;}}
 const grouped=new Map();for(const n of notes){if(n.n<split)continue;const key=n.t.toFixed(7),old=grouped.get(key);if(!old||n.n>old.n)grouped.set(key,{...n});}
 return cleanNotes([...grouped.values()],beats);
}
function phraseMetrics(notes,beats){
 const top=upperVoice(notes,beats),pitches=top.map(n=>n.n),counts=new Set(pitches),bars=Array.from({length:beats/4},(_,b)=>{const ns=top.filter(n=>n.t>=b*4&&n.t<(b+1)*4);return ns.length?{low:Math.min(...ns.map(n=>n.n)),high:Math.max(...ns.map(n=>n.n)),mean:ns.reduce((s,n)=>s+n.n,0)/ns.length}:null;});
 let steps=0,leaps=0,turns=0,previousSign=0;for(let i=1;i<pitches.length;i++){const diff=pitches[i]-pitches[i-1];if(diff&&Math.abs(diff)<=2)steps++;if(Math.abs(diff)>=5)leaps++;const sign=Math.sign(diff);if(sign&&previousSign&&sign!==previousSign)turns++;if(sign)previousSign=sign;}
 return {top,bars,low:Math.min(...pitches),high:Math.max(...pitches),range:Math.max(...pitches)-Math.min(...pitches),unique:counts.size,steps,leaps,turns,peakBar:top.length?Math.floor(top.find(n=>n.n===Math.max(...pitches)).t/4)+1:1};
}
function workingKey(notes){const weights=Array(12).fill(0);notes.forEach(n=>weights[n.n%12]+=n.d);let best={root:9,mode:'minor',score:-Infinity};for(let root=0;root<12;root++)for(const mode of ['minor','major']){let score=0;for(let pc=0;pc<12;pc++)score+=weights[pc]*(SCALES[mode].includes(mod(pc-root,12))?1:-3);score+=weights[root]*.2;if(score>best.score)best={root,mode,score};}return best;}
function triad(root,mode,d){return [0,2,4].map(k=>mod(degree(d+k,root,mode),12));}
function sourceItem(s){
 const old=s.id.startsWith('source-')?SOURCE_INFO[Number(s.id.split('-')[1])-1]:null,info=NEW_SOURCE_INFO[Number(s.id.split('-')[1])];let name,style,root,mode,pcs,explain;
 if(old){[name,style,root,mode,pcs,,explain]=old;}else if(info){[name,style,root,mode,,explain]=info;pcs=info[4].map(d=>triad(root,mode,d));if(s.id==='example-12')pcs[15]=[11,3,6];if(s.id==='example-15')pcs[7]=[6,10,1];if(s.id==='example-17'){pcs[4]=pcs[5]=pcs[6]=pcs[7]=[1,5,8];}}else{({root,mode}=workingKey(s.notes));name=s.file.replace(/\.midi?$/i,'');style='uplifting';pcs=Array.from({length:s.beats/4},()=>triad(root,mode,0));explain='Imported source. Key and supporting harmony are working interpretations; audition the upper line before developing the phrase.';}
 const item={...s,name,style,root,mode,pcs,explain,source:true,sourceBpm:s.bpm,bpm:Math.round(s.bpm||STYLES.find(x=>x.id===style).bpm),originId:s.id};item.analysis=phraseMetrics(s.notes,s.beats);return item;
}
const sourceLibrary=SOURCES.map(sourceItem).sort((a,b)=>a.id.startsWith('example-')!==b.id.startsWith('example-')?(a.id.startsWith('example-')?-1:1):a.file.localeCompare(b.file,'en',{numeric:true}));
// Source upper-line rhythms are kept intact inside a two-bar motif; altered answers
// change pitch targets and cadence, not merely timbre or playback octave.
function motifOf(source){
 const top=source.analysis.top;let best=[],bestScore=-Infinity;
 for(let b=0;b<Math.min(source.beats/4,8)-1;b+=2){const slice=top.filter(n=>n.t>=b*4&&n.t<(b+2)*4),distinct=new Set(slice.map(n=>n.n)).size;const score=distinct*2+Math.min(slice.length,20)*.15;if(slice.length>=4&&score>bestScore){best=slice.map(n=>({...n,t:n.t-b*4}));bestScore=score;}}
 if(!best.length)best=top.filter(n=>n.t<8).map(n=>({...n}));
 const low=60+source.root,degrees=best.map(n=>scaleIndex(n.n,low,source.mode)),median=[...degrees].sort((a,b)=>a-b)[Math.floor(degrees.length/2)]||0,offset=7*Math.floor(median/7);
 return best.map((n,i)=>({...n,deg:degrees[i]-offset}));
}
function makeDevelopment(source,options={}){
 const take=options.take||0,seed=options.seed||0,bars=Number(options.bars)||(take?16:8),arc=options.arc||(take?'ascent':'arch'),motion=Number(options.motion)||7,density=options.density||'source',root=source.root>5?48+source.root:60+source.root,mode=source.mode;
 const motif=motifOf(source),notes=[],pcs=[],roles=[],seedOffset=mod(seed,5)-2;
 const sourceDegrees=source.pcs.map(c=>scaleIndex(c[0],source.root,mode)%7).map(d=>mod(d,7));
 const fallback=mode==='major'?[0,4,5,3]:[0,5,2,6];
 const harmonies=new Set(sourceDegrees).size>=3?sourceDegrees:fallback;
 const phraseSize=bars/4;
 const targets=arc==='ascent'?[2,4,7,9,11,9,6,7]:arc==='valley'?[7,5,3,2,5,8,6,7]:[2,4,6,4,7,10,8,7];
 for(let bar=0;bar<bars;bar++){
  const section=Math.floor(bar/phraseSize),role=['Statement','Answer','Climax','Resolve'][section];roles.push(role);
  let chordDegree=harmonies[bar%harmonies.length];if(bar>=bars-2)chordDegree=bar===bars-2?4:0;
  const chord=triad(source.root,mode,chordDegree);if(mode==='minor'&&bar===bars-2)chord[1]=mod(source.root+11,12);pcs.push(chord);
  const srcBar=motif.filter(n=>Math.floor(n.t/4)===(bar%2));let rhythm=srcBar.length?srcBar:motif.filter(n=>n.t<4);
  if(density!=='source'){const times=density==='flow'?[0,.5,1,1.5,2,2.5,3,3.5]:[0,.25,.75,1,1.5,1.75,2,2.5,2.75,3.25,3.5,3.75];rhythm=times.map((t,i)=>({...rhythm[i%rhythm.length],t,d:.2}));}
  const phase=bar/(bars-1),targetIndex=Math.min(7,Math.floor(phase*8));let target=targets[targetIndex];
  // Repeat the opening cell at bar 3 with its harmonic context. Later answers
  // are new, directed phrases; the climax is reserved for the third quarter.
  if(bar===2)target=targets[0];if(section>0)target+=seedOffset;
  if(section===2)target+=take?2:1;
  const centre=2+Math.round(target*motion/7),mean=rhythm.reduce((s,n)=>s+n.deg,0)/rhythm.length;
  const hasContour=new Set(rhythm.map(n=>n.deg)).size>=3;let previous=null;
  rhythm.forEach((n,i)=>{
   const beat=mod(n.t,4),u=i/Math.max(1,rhythm.length-1);
   let shape=hasContour?n.deg-mean:([0,1,2,1,3,2,1,0][i%8]);
   if(section===1&&bar%2)shape=-shape*.75;if(section===3)shape=(1-u)*3-1;
   let colour=0;if(section>0&&seed){let hash=(Math.imul(seed+1,2654435761)^Math.imul(bar+1,2246822519)^Math.imul(i+1,3266489917))>>>0;hash^=hash>>>16;colour=mod(hash,3)-1;}
   let d=Math.round(centre+shape*.75)+colour;if(previous!==null)d=clamp(d,previous-3,previous+3);
   let midi=degree(d,root,mode);
   const strong=i===0||Math.abs(beat-2)<.001;
   if(strong){const candidates=chord.flatMap(pc=>[nearestPitch(pc,midi)-12,nearestPitch(pc,midi),nearestPitch(pc,midi)+12]);midi=candidates.sort((a,b)=>Math.abs(a-midi)-Math.abs(b-midi))[0];d=scaleIndex(midi,root,mode);}
   if(section===2&&bar===Math.floor(bars*.625)&&i===Math.floor(rhythm.length*.6)){d=Math.min(14,centre+3);midi=degree(d,root,mode);}
   if(bar===bars-1&&i>=rhythm.length-3){const ending=[2,1,0],idx=i-(rhythm.length-3);d=7+ending[Math.max(0,idx)];midi=degree(d,root,mode);}
   const next=rhythm[i+1],gap=next?mod(next.t,4)-beat:4-beat;let duration=Math.min(Math.max(.13,n.d*.9),Math.max(.1,gap*.88));
   if(bar%phraseSize===phraseSize-1&&i===rhythm.length-1)duration=Math.max(.2,4-beat-.04);
   notes.push({n:clamp(midi,48,100),t:bar*4+beat,d:duration,v:clamp(Math.round(88+(strong?16:0)+section*2+(i%3===0?5:-3)),68,116)});previous=d;
  });
 }
 const lastBar=bars-1,lastEvents=notes.filter(n=>n.t>=lastBar*4);if(lastEvents.length){const firstLate=lastEvents.find(n=>n.t>=lastBar*4+2.5)||lastEvents.at(-1);for(let i=notes.length-1;i>=0;i--)if(notes[i].t>=firstLate.t)notes.splice(i,1);notes.push({n:root+12,t:firstLate.t,d:bars*4-firstLate.t-.06,v:102});}
 const clean=cleanNotes(notes,bars*4),analysis=phraseMetrics(clean,bars*4);
 return {id:source.id+(take?'-ascension':'-answer'),name:source.name+(take?' / Ascension':' / New horizon'),originId:source.id,originFile:source.file,style:source.style,root:source.root,mode,pcs,notes:clean,beats:bars*4,bpm:source.bpm,source:false,take,roles,analysis,settings:{bars,arc,motion,density,seed},explain:`Developed from ${source.file}: its upper-line rhythm becomes a ${bars}-bar ${arc==='arch'?'rising-and-falling':arc==='ascent'?'climbing':'falling-then-rising'} phrase. The opening returns, the answer changes pitch, and the last two bars resolve the harmony.`};
}
const library=[...sourceLibrary,...sourceLibrary.flatMap(s=>[makeDevelopment(s,{take:0}),makeDevelopment(s,{take:1})])];
const LIBRARY_COUNTS={sources:sourceLibrary.length,studies:library.length-sourceLibrary.length,total:library.length,treatments:library.length*TREATMENTS.length};
function sourceFor(item){return sourceLibrary.find(s=>s.id===(item.originId||item.id));}
