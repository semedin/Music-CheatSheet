// Pocket composition: derive bass motifs from the source riff’s accents, rests, contour and harmony.
// Time is in quarter-note beats; the same event lists drive playback and MIDI export.
const PK = (() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const STUDIES=[
    {name:'Velvet rope',tag:'ANCHOR / SHARED ACCENTS',mode:'anchor',sound:'round',activity:.65,gate:.65,text:'The strongest accents in your riff become low-end anchors. Roots sustain into its rests.',move:'The same accent pattern returns after a quieter third section.'},
    {name:'Rubber room',tag:'SHADOW / SAME MOTIF',mode:'shadow',sound:'rubber',activity:.9,gate:.45,text:'Your riff’s accented notes become a low, clipped shadow. Shared attacks and pitches make one gesture.',move:'The bass follows your motif instead of adding a second one.'},
    {name:'After hours',tag:'REPLY / PHRASE GAPS',mode:'answer',sound:'warm',activity:.65,gate:.8,text:'The bass waits for your phrase to finish, then replies using its notes and the current chord.',move:'Replies repeat as a motif. The space section holds back the secondary notes.'},
    {name:'Sidewinder',tag:'INTERLOCK / REAL RESTS',mode:'interlock',sound:'pluck',activity:1,gate:.3,text:'Short low notes occupy actual rests in your riff. A single interlocking rhythm, rather than two competing loops.',move:'The written pocket repeats intact, with less activity in bars 9–12.'},
    {name:'Negative space',tag:'FLOOR / LESS IS MORE',mode:'floor',sound:'round',activity:.35,gate:1.55,text:'Two low anchors per two bars. The bass gives the riff a floor and leaves the identity to your lead.',move:'No extra answer line. Listen to how little accompaniment the riff needs.'},
    {name:'Loose change',tag:'BOUNCE / ACCENT ECHO',mode:'bounce',sound:'rubber',activity:.85,gate:.38,text:'Low accents share the riff’s timing, with quieter echoes only where the melody leaves room.',move:'A repeated accent-and-echo pattern provides continuity through the phrase.'},
    {name:'Cross current',tag:'CONTRARY / SHARED PHRASING',mode:'contrary',sound:'warm',activity:.7,gate:.55,text:'Bass moves against the contour of your riff, but shares its accents and follows its harmony.',move:'Opposite melodic motion creates contrast without a separate rhythmic agenda.'},
    {name:'One more',tag:'PICKUP / PHRASE LANDING',mode:'pickup',sound:'pluck',activity:.7,gate:.45,text:'A small pickup in the riff’s late-bar rests leads back to its strongest opening accents.',move:'The turnaround comes from your phrase’s landing, rather than an imposed fill.'}
  ];
  const DEMOS=['Euphoric hard arp','Organ bounce','Two-bar walk','Rubber minimal'].map(name=>OB.PATTERNS.find(p=>p.name===name));
  function demo(i=0){const p=DEMOS[i],source=fromOrbit(OE.pack(OE.normalize({...OB.stateFor(p),bars:8})));return {...source.hook,genre:p.genre,key:source.key,scale:source.scale,bpm:source.bpm,swing:source.swing,hookSound:source.hookSound};}
  function defaults(){const d=demo();return {version:1,hook:d,bpm:d.bpm,key:d.key,scale:d.scale,progression:'i7',harmonyMode:'source',hookSound:d.hookSound,foundation:'auto',bars:16,swing:d.swing,push:0,gate:70,density:60,answer:0,duck:65,kick:'study',seed:1,selected:0,edits:{},mutes:{hook:false,kick:false,sub:false,bass:false,answer:false,hats:false}};}
  function validate(s){
    if(!s||s.version!==1)throw Error('This is not a Pocket session.');
    const out=defaults();
    for(const [k,a,b] of [['bpm',70,180],['key',0,11],['bars',4,16],['swing',50,65],['push',-20,20],['gate',25,100],['density',20,100],['answer',0,100],['duck',0,100],['seed',1,1e7],['selected',0,7]]){if(!Number.isFinite(s[k])||s[k]<a||s[k]>b)throw Error('Invalid '+k);out[k]=s[k];}
    if(![4,8,16].includes(s.bars)||!Number.isInteger(s.key)||!Number.isInteger(s.selected)||!['minor','dorian','major'].includes(s.scale)||!['study','four','broken','skip'].includes(s.kick))throw Error('Invalid musical settings.');
    if(typeof s.progression!=='string'||s.progression.length>120)throw Error('Invalid chords.');
    if(!s.hook||typeof s.hook.name!=='string'||s.hook.name.length>150||!Number.isFinite(s.hook.beats)||s.hook.beats<1||s.hook.beats>64||!Array.isArray(s.hook.notes)||!s.hook.notes.length||s.hook.notes.length>2048)throw Error('Invalid hook.');
    out.hook={name:s.hook.name,beats:s.hook.beats,notes:s.hook.notes.map(n=>{if(!n||!['t','d','n','v'].every(k=>Number.isFinite(n[k]))||n.t<0||n.t>=s.hook.beats||n.d<=0||n.d>s.hook.beats-n.t+.001||!Number.isInteger(n.n)||n.n<0||n.n>127||n.v<1||n.v>127)throw Error('Invalid hook note.');return {t:n.t,d:n.d,n:n.n,v:n.v};})};
    out.scale=s.scale;out.progression=s.progression;out.kick=s.kick;
    out.harmonyMode=s.harmonyMode||'source';if(!['source','manual'].includes(out.harmonyMode))throw Error('Invalid harmony mode.');
    out.foundation=s.foundation||'auto';if(!['auto','house','rave'].includes(out.foundation))throw Error('Invalid foundation.');
    out.hookSound=s.hookSound||'tech-pluck';if(!OSND.some(p=>p.id===out.hookSound))throw Error('Invalid riff voice.');
    if(s.hook.genre&&OB.GENRES[s.hook.genre])out.hook.genre=s.hook.genre;
    if(s.hook.orbit){if(typeof s.hook.orbit!=='string'||s.hook.orbit.length>180000)throw Error('Invalid Orbit source.');out.hook.orbit=OE.pack(OE.unpack(s.hook.orbit));}
    if(s.hook.harmony){const h=s.hook.harmony;if(!Number.isFinite(h.beats)||h.beats<=0||h.beats>64||!Array.isArray(h.chords)||!h.chords.length||h.chords.length>64)throw Error('Invalid source harmony.');out.hook.harmony={beats:h.beats,chords:h.chords.map(c=>{if(!Number.isFinite(c.t)||!Number.isFinite(c.d)||c.t<0||c.d<=0||c.t+c.d>h.beats+.001||!Number.isInteger(c.root)||c.root<0||c.root>11||!OT.Q[c.q]||!Array.isArray(c.notes)||!c.notes.length||c.notes.length>8||!c.notes.every(n=>Number.isInteger(n)&&n>=0&&n<=127))throw Error('Invalid source chord.');return {t:c.t,d:c.d,root:c.root,q:c.q,notes:c.notes.slice()};})};}
    const p=OT.parseProgression(out.progression,out.key,out.scale);if(p.errors.length||!p.chords.length)throw Error(p.errors.join('; ')||'Enter at least one chord.');
    for(const k of Object.keys(out.mutes))out.mutes[k]=s.mutes?.[k]===true;
    if(s.edits&&typeof s.edits==='object')for(const [k,v] of Object.entries(s.edits)){if(!/^([0-9]|[12][0-9]|3[01])$/.test(k)||![0,1,2,3].includes(v))throw Error('Invalid step edit.');out.edits[k]=v;}
    return out;
  }
  function importTrack(track,name,bpm){
    const notes=track.notes.filter(n=>n.ch!==9);
    if(!notes.length)throw Error('Choose a melodic MIDI track.');
    if(notes.length>2048)throw Error('Choose a shorter riff (up to 2,048 notes).');
    const end=Math.max(Number.isFinite(track.beats)?track.beats:0,...notes.map(n=>n.t+n.d));
    if(end>64)throw Error('Choose a riff up to 16 bars long.');
    const beats=Math.max(4,Math.ceil(end/4)*4), key=OT.detectKey(notes);
    const signature=String(name).toLowerCase().replace(/[^a-z0-9]/g,'');const pattern=[...OB.PATTERNS].sort((a,b)=>b.name.length-a.name.length).find(p=>signature.includes(p.name.toLowerCase().replace(/[^a-z0-9]/g,'')));
    return {hook:{name:String(name).slice(0,150),beats,genre:pattern?.genre,notes:notes.map(({t,n,d,v})=>({t,n,d:Math.min(d,beats-t),v}))},bpm:clamp(bpm||126,70,180),key:key.key,scale:key.scale,harmonyMode:'source',hookSound:pattern?.sound||'tech-pluck'};
  }
  function fromOrbit(packed){
    if(typeof packed!=='string'||packed.length>180000)throw Error('Choose a smaller Orbit session.');
    const st=OE.unpack(packed),bars=Math.min(16,st.bars),r=OE.render(st,{bars});
    if(!r.events.length||r.events.length>2048)throw Error('Choose an Orbit riff with 1–2,048 notes.');
    return {hook:{name:st.name||OB.PATTERNS.find(p=>p.id===st.from)?.name||'Orbit riff',beats:bars*4,genre:st.genre,orbit:OE.pack(st),notes:r.events.map(({t,d,n,v})=>({t,d,n,v})),harmony:{beats:r.harmony.beats,chords:r.harmony.chords.map(({t,d,root,q,notes})=>({t,d,root,q,notes}))}},bpm:st.bpm,key:st.key,scale:['minor','dorian','major'].includes(st.scale)?st.scale:'minor',swing:st.swing,hookSound:st.sound,harmonyMode:'source'};
  }
  function midiHarmony(imported,midi,selected){
    const track=midi.tracks.find(t=>t!==selected&&/^(?:orbit )?chords$|harmony/i.test(t.name)&&!t.drums&&t.notes.length);
    if(track){const h=OT.chordsFromNotes(track.notes);if(h.chords.length)imported.hook.harmony={beats:Math.max(track.beats||h.beats,h.beats),chords:h.chords.map(({t,d,root,q,notes})=>({t,d,root,q,notes}))};}
    return imported;
  }
  // Melody-only harmony is a proposal: score sustained/accented pitch classes over whole bars,
  // then choose a smooth chord path. Never chase every passing sixteenth with a new chord.
  function harmony(s){
    if(s.harmonyMode==='manual'){
      const p=OT.parseProgression(s.progression,s.key,s.scale);if(p.errors.length||!p.chords.length)throw Error(p.errors.join('; ')||'Enter a chord.');let t=0;
      return {kind:'Your chord path',chords:p.chords.map(c=>{const out={t,d:c.len*4,root:c.root,q:c.q,notes:OT.voice(c.root,OT.Q[c.q].iv,60,null)};t+=out.d;return out;}),beats:p.chords.reduce((a,c)=>a+c.len*4,0)};
    }
    if(s.hook.harmony)return {...s.hook.harmony,kind:s.hook.orbit?'Orbit harmony · preserved':'Imported chord track'};
    const scale=OT.SCALES[s.scale].st,candidates=scale.map((pc,i)=>{const iv=[0,OT.mod(scale[(i+2)%7]-pc,12),OT.mod(scale[(i+4)%7]-pc,12)];return {root:OT.mod(s.key+pc,12),q:iv[1]===3?(iv[2]===6?'dim':'min'):'maj',iv};});
    const slots=Math.ceil(s.hook.beats/4),scores=[];
    for(let b=0;b<slots;b++)scores.push(candidates.map((c,j)=>{
      const pcs=c.iv.map(i=>OT.mod(c.root+i,12));let total=0;
      for(const n of s.hook.notes){const duration=Math.max(0,Math.min(n.t+n.d,(b+1)*4)-Math.max(n.t,b*4));if(!duration)continue;
        const weight=(.2+Math.min(duration,.7))*n.v/127*(Math.abs(n.t-Math.round(n.t))<.08?1.4:1),pc=n.n%12;
        total+=weight*(pcs.includes(pc)?2:pcs.some(p=>OT.mod(pc-p,12)===1||OT.mod(p-pc,12)===1)?-1.7:-.65);
      }
      return total+(j===0?.7:0);
    }));
    const dp=[],prev=[];for(let b=0;b<slots;b++){dp[b]=[];prev[b]=[];for(let j=0;j<candidates.length;j++){let best=-Infinity,choice=0;for(let k=0;k<candidates.length;k++){const value=(b?dp[b-1][k]:0)+scores[b][j]-(b&&j!==k?1.7:0);if(value>best){best=value;choice=k;}}dp[b][j]=best;prev[b][j]=choice;}}
    let chosen=dp.at(-1).indexOf(Math.max(...dp.at(-1)));const path=[];for(let b=slots-1;b>=0;b--){path[b]=chosen;chosen=prev[b][chosen];}
    const chords=[];for(let b=0;b<slots;b++){const c=candidates[path[b]],d=Math.min(4,s.hook.beats-b*4);if(chords.at(-1)?.root===c.root&&chords.at(-1)?.q===c.q)chords.at(-1).d+=d;else chords.push({t:b*4,d,root:c.root,q:c.q,notes:OT.voice(c.root,OT.Q[c.q].iv,60,chords.at(-1)?.notes)});}
    return {kind:'Riff-derived harmony · audition the proposal',chords,beats:s.hook.beats};
  }
  function compose(s,index=s.selected){
    const dense=s.foundation==='rave'||s.foundation==='auto'&&(s.hook.genre==='hard-techno'||s.bpm>=140||s.hook.notes.length/(s.hook.beats/4)>=12);
    const rave=[
      ['Rave floor','A low offbeat pulse follows the arp’s chord roots. Your arp remains the only melodic voice.'],
      ['Locked drive','Kick and low pulse share one regular grid underneath the fast arp.'],
      ['Late pressure','A short root late in each beat answers the kick without another melody.'],
      ['Under current','Three quiet root pulses between kicks support the sixteenths above.'],
      ['Long shadow','Sustained low chord roots, ducked by the kick. The arp supplies the motion.'],
      ['Double bounce','A root-and-octave rebound under the arp, returning to the same chord anchor.'],
      ['Half-light','Two short low pulses per beat, restrained in level and melodic movement.'],
      ['Last lift','Offbeat roots with a small pickup only before the next bar.']
    ];
    const study=dense?{...STUDIES[index],name:rave[index][0],tag:'RAVE / '+['OFFBEAT','LOCKED','LATE','PULSED','SUSTAINED','OCTAVES','RESTRAINED','PICKUP'][index],text:rave[index][1],move:'The foundation follows the source chord path; the arp carries the melodic development.'}:STUDIES[index],beats=s.bars*4,h=harmony(s);
    const chordAt=t=>{const p=OT.mod(t,h.beats);return h.chords.find(c=>p>=c.t-1e-6&&p<c.t+c.d-1e-6)||h.chords[0];};
    const lanes={hook:[],kick:[],sub:[],bass:[],answer:[],hats:[]};
    for(let start=0;start<beats;start+=s.hook.beats)for(const n of s.hook.notes)if(start+n.t<beats)lanes.hook.push({...n,t:start+n.t,d:Math.min(n.d,beats-start-n.t)});
    const add=(lane,t,n,d,v,extra={})=>{if(t>=beats||t<-.1)return;t=clamp(t,0,beats-.025);lanes[lane].push({...extra,t,n,d:Math.max(.025,Math.min(d,beats-t)),v:Math.round(clamp(v,1,127))});};
    const swing=t=>{const half=Math.floor(t/.5+1e-6)*.5,pos=t-half,mid=.25+(s.swing-50)/100*.5;return half+(pos<=.25?pos*mid/.25:mid+(pos-.25)*(.5-mid)/.25);},push=s.push/1000*s.bpm/60;
    const hookActive=(t,d=.2)=>lanes.hook.some(n=>n.t<t+d&&n.t+n.d>t);
    const hookAttack=t=>lanes.hook.some(n=>Math.abs(n.t-t)<.13);
    const kickMode=s.kick==='study'?(!dense&&index===6?'broken':'four'):s.kick;
    for(let b=0;b<s.bars;b++){
      const space=s.bars===16&&Math.floor(b/4)===2;
      for(const k of kickMode==='broken'?[0,1.5,2.75]:kickMode==='skip'?[0,1,2.5]:[0,1,2,3])add('kick',b*4+k,36,.12,k===0?106:99);
      // An offbeat hat is the timekeeper. Ghosts borrow the riff's accents, rather than another blanket rhythm.
      for(let q=0;q<4;q++)if(!space||q%2===0)add('hats',b*4+.5+q,42,.05,53);
    }
    let previousPitch=36+s.key;
    for(let cycle=0;cycle<beats;cycle+=8){
      const space=s.bars===16&&Math.floor(cycle/16)===2;
      const notes=lanes.hook.filter(n=>n.t>=cycle&&n.t<Math.min(cycle+8,beats));
      const grouped=new Map();for(const n of notes){const t=Math.round((n.t-cycle)*1e5)/1e5,old=grouped.get(t);if(!old||n.v>old.v)grouped.set(t,{...n,t,weight:n.v/127+(Math.abs(t-Math.round(t))<.08?.25:0)+Math.min(n.d,.5)});}
      const onsets=[...grouped.values()].sort((a,b)=>a.t-b.t),target=Math.max(2,Math.round((3+s.density/100*7)*study.activity));
      const accents=[...onsets].sort((a,b)=>b.weight-a.weight).slice(0,target).sort((a,b)=>a.t-b.t);
      const candidates=[];const put=(t,weight,source=null,anchor=false)=>{if(t>=0&&t<8&&!candidates.some(c=>Math.abs(c.t-t)<.12))candidates.push({t,weight,source,anchor});};
      const gaps=[];for(let q=0;q<32;q++){const t=swing(cycle+q/4)-cycle;if(!hookActive(cycle+t,.22)&&!hookAttack(cycle+t))gaps.push({t,weight:1+(q%4===2?.65:0)+(q%16>10?.25:0)});}
      // Each relationship derives a motif from the source. It repeats intact; seed variations change secondary choices.
      if(study.mode==='shadow'||study.mode==='contrary')for(const n of accents)put(n.t,n.weight,n);
      else if(study.mode==='floor')for(let b=0;b<2;b++)put(b*4+.5,3,null,true);
      else if(study.mode==='answer'){
        for(let i=0;i<onsets.length;i++){const n=onsets[i],next=onsets[i+1]?.t??8,end=n.t+Math.min(n.d,.5);if(next-end>=.45)put(end+.08,2+(next-end)*.4,n);}
      }else if(study.mode==='interlock')for(const g of gaps)put(g.t,g.weight);
      else if(study.mode==='pickup'){
        for(const g of gaps.filter(g=>g.t%4>=2.5))put(g.t,g.weight+.5);
        for(const n of accents.filter(n=>n.t%4<1))put(n.t,n.weight,n,true);
      }else if(study.mode==='bounce'){
        for(const n of accents){put(n.t,n.weight,n);const t=n.t+.5;if(!hookActive(cycle+t,.15))put(t,n.weight*.65,n);}
      }else{
        // Root foundation: share the hook's strongest offbeat accents, then sustain into its rests.
        for(let b=0;b<2;b++){const n=accents.filter(n=>Math.floor(n.t/4)===b).sort((a,b)=>b.weight-a.weight)[0];put(n?.t??b*4+.5,3,n,true);}
        for(const g of gaps)put(g.t,g.weight*.7);
      }
      if(dense){candidates.length=0;for(let b=0;b<8;b++){
        const phases=index===4?[0]:index===1?[0,.5]:index===3?[.25,.5,.75]:index===5?[.5,.75]:index===6?[.25,.75]:index===2?[.75]:[.5];
        for(const phase of phases)put(b+phase,phase===.5?3:2.6,null,b%4===0);
        if(index===7&&b%4===3)put(b+.75,2.8);
      }}
      if(!candidates.length)for(let b=0;b<2;b++)put(b*4+.5,3,null,true);
      const seedNoise=t=>OT.hash(s.seed,index,Math.round(OT.mod(cycle,s.hook.beats)*100),t)*.2;
      let selected=candidates.sort((a,b)=>(b.weight+(b.anchor?3:0)+seedNoise(b.t))-(a.weight+(a.anchor?3:0)+seedNoise(a.t))).slice(0,Math.min(dense?Math.max(4,Math.ceil(4+((index===4?8:index===3?24:index===1||index===5||index===6?16:9)-4)*s.density/100)):target,candidates.length)).sort((a,b)=>a.t-b.t);
      // Avoid clusters: supporting bass is slower than a dense arp, even with density at 100%.
      selected=selected.filter((n,i)=>i===0||n.t-selected[i-1].t>=(dense?.2:.38));
      const spaced=space?selected.filter((c,i)=>c.anchor||i%2===0):selected;
      const cells=new Map(spaced.map(c=>[Math.floor(c.t*4+.0001),c]));
      for(const [step,value] of Object.entries(s.edits)){cells.delete(+step);if(value)cells.set(+step,{t:swing(cycle+(+step)/4)-cycle,weight:2.3,edit:value,anchor:true});}
      const written=[...cells.values()].sort((a,b)=>a.t-b.t);
      for(let i=0;i<written.length;i++){
        const c=written[i],t=cycle+c.t+push;if(t>=beats)continue;
        const ch=chordAt(Math.max(0,t)),pcs=[...new Set(OT.Q[ch.q].iv.slice(0,3).map(n=>OT.mod(n+ch.root,12)))];
        const nearby=notes.filter(n=>Math.abs(n.t-(cycle+c.t))<.35||n.t<=cycle+c.t&&n.t+n.d>cycle+c.t);
        const allowed=pcs.filter(pc=>!nearby.some(n=>[1,11].includes(OT.mod(n.n-pc,12))));
        const options=(allowed.length?allowed:[ch.root]).flatMap(pc=>[36+pc,48+pc]).filter(n=>n<=52);
        let pitch=36+ch.root;
        if(c.edit)pitch+=c.edit===2?7:c.edit===3?12:0;
        else if(!dense&&study.mode==='shadow'&&c.source&&pcs.includes(c.source.n%12))pitch=36+c.source.n%12;
        else if(!dense&&study.mode==='contrary'&&c.source){const prior=onsets.findLast(n=>n.t<c.source.t),direction=Math.sign(c.source.n-(prior?.n??c.source.n));pitch=options.sort((a,b)=>Math.abs(a-(previousPitch-direction*3))-Math.abs(b-(previousPitch-direction*3)))[0];}
        else if(!dense&&['answer','bounce','pickup'].includes(study.mode)&&i>0){const source=c.source?.n??onsets.at(-1)?.n??s.key;pitch=options.sort((a,b)=>(Math.abs(a-previousPitch)*.55+(a%12===source%12?0:2)+(a%12===ch.root?-.8:0))-(Math.abs(b-previousPitch)*.55+(b%12===source%12?0:2)+(b%12===ch.root?-.8:0)))[0];}
        else if(!dense&&!allowed.includes(ch.root)&&allowed.length)pitch=options.sort((a,b)=>Math.abs(a-previousPitch)-Math.abs(b-previousPitch))[0];
        if(dense&&index===5&&!c.edit&&c.t%1>.6)pitch+=12;
        previousPitch=pitch;
        const next=written[i+1]?.t??8,untilKick=lanes.kick.find(k=>k.t>Math.max(0,t)+.1)?.t??beats;
        const base=dense?(index===4?.95:index===3?.16:.3):study.mode==='floor'?1.55:study.mode==='shadow'?Math.min(c.source?.d??.35,.65):Math.min((next-c.t)*.7,study.gate);
        const d=Math.max(.08,Math.min(base*s.gate/70,next-c.t-.03,untilKick-Math.max(0,t)-.05));
        const v=clamp((c.anchor?94:58+c.weight*15)+(s.seed===1?0:Math.round(seedNoise(c.t)*30)-3),60,98);
        add('bass',t,pitch,d,v,{anchor:!!c.anchor,source:c.source?.t??null});
        // Both layers play the same pitch class and articulation; no unrelated root under a moving fifth.
        add('sub',t,pitch-12,d,v*.9);
      }
      // No blanket chord garnish. Answer with a short fragment of this riff, only in a real pause.
      const answerCount=(dense?0:Math.round(s.answer/100*3))*(study.mode==='floor'||study.mode==='shadow'?0:1);
      const answerGaps=gaps.filter(g=>g.t>1&&!hookActive(cycle+g.t,.5)&&!lanes.bass.some(n=>n.t<cycle+g.t+.3&&n.t+n.d>cycle+g.t)).sort((a,b)=>b.weight-a.weight).slice(0,space?0:answerCount);
      for(const g of answerGaps){const ch=chordAt(cycle+g.t),pcs=OT.Q[ch.q].iv.map(n=>OT.mod(n+ch.root,12));const source=[...onsets].reverse().find(n=>pcs.includes(n.n%12));if(source)add('answer',cycle+g.t,48+source.n%12,.16,48);}
    }
    for(const lane of ['sub','bass']){lanes[lane].sort((a,b)=>a.t-b.t);lanes[lane].forEach((n,i)=>{if(lanes[lane][i+1])n.d=Math.min(n.d,lanes[lane][i+1].t-n.t);});}
    for(const arr of Object.values(lanes))arr.sort((a,b)=>a.t-b.t||a.n-b.n);
    const bass=lanes.bass,attack=bass.filter(n=>lanes.kick.some(k=>Math.abs(k.t-n.t)<.1)).length,overlap=bass.filter(n=>lanes.hook.some(h=>h.t<n.t+n.d&&h.t+h.d>n.t)).length;
    const stages=['Establish','Answer','Make space','Return'];
    return {study,index,beats,lanes,foundation:dense?'Rave foundation':'Riff-led foundation',harmony:h,relationship:study.text,markers:Array.from({length:Math.ceil(s.bars/4)},(_,i)=>({t:i*16,text:stages[s.bars===16?i:i%2]})),stats:{hits:bass.length,kickCoincidence:bass.length?Math.round(attack/bass.length*100):0,hookOverlap:bass.length?Math.round(overlap/bass.length*100):0,answers:lanes.answer.length}};
  }
  const NAMES={hook:'Original hook',kick:'Kick',sub:'Sub foundation',bass:'Bass character',answer:'Riff answer',hats:'Hats'};
  function midi(s,r,only=null){return OT.writeMidi(Object.entries(r.lanes).filter(([k])=>only?k===only:!s.mutes[k]).map(([k,notes])=>({name:NAMES[k],ch:k==='kick'||k==='hats'?9:{hook:0,sub:1,bass:2,answer:3}[k],notes})),{bpm:s.bpm,beats:r.beats,name:'Pocket - '+r.study.name,markers:r.markers});}
  return {STUDIES,DEMOS,demo,defaults,validate,importTrack,midiHarmony,fromOrbit,harmony,compose,midi,NAMES};
})();
