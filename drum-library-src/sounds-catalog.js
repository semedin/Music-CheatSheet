
/* =====================================================================
   AUDIO
   ===================================================================== */
let AC=null,master=null,limiter=null,busses={};
function audio(){
  if(!AC){
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain(); master.gain.value=.72;
    limiter=AC.createDynamicsCompressor();
    limiter.threshold.value=-5; limiter.knee.value=3; limiter.ratio.value=12;
    limiter.attack.value=.002; limiter.release.value=.11;
    limiter.connect(master); master.connect(AC.destination);
  }
  if(AC.state==='suspended') AC.resume();
  return AC;
}
let _nb=null;
function noise(){
  if(!_nb){const n=Math.floor(AC.sampleRate*.6);_nb=AC.createBuffer(1,n,AC.sampleRate);
    const d=_nb.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;}
  const s=AC.createBufferSource(); s.buffer=_nb; s.loop=true; return s;
}
function shaper(k){
  const ws=AC.createWaveShaper(),n=512,c=new Float32Array(n),a=1+k*22;
  for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=Math.tanh(a*x)/Math.tanh(a);}
  ws.curve=c; return ws;
}
function gEnv(g,t,peak,a,d){
  g.setValueAtTime(0,t); g.linearRampToValueAtTime(peak,t+a);
  g.exponentialRampToValueAtTime(.0001,t+a+d);
}
const KITS={
 '909':{kf0:150,kf1:52,kpd:.045,kdec:.40,kdrv:.28,
        sTone:190,sNoise:.62,sDec:.16,cSpread:.011,cDec:.24,
        hDec:.038,hoDec:.30,hMetal:.35,hHP:7600,rDec:.055,
        cbF:[540,800],cbDec:.4,tF:150,tDec:.35,rideDec:.9},
 '808':{kf0:120,kf1:44,kpd:.09,kdec:.95,kdrv:.12,
        sTone:172,sNoise:.42,sDec:.13,cSpread:.014,cDec:.20,
        hDec:.032,hoDec:.42,hMetal:.85,hHP:8200,rDec:.045,
        cbF:[587,845],cbDec:.55,tF:120,tDec:.55,rideDec:.7},
 '707':{kf0:170,kf1:60,kpd:.032,kdec:.26,kdrv:.20,
        sTone:210,sNoise:.70,sDec:.13,cSpread:.009,cDec:.17,
        hDec:.030,hoDec:.22,hMetal:.20,hHP:8800,rDec:.045,
        cbF:[620,900],cbDec:.30,tF:170,tDec:.26,rideDec:.6}
};
const V={
 kick(t,v,K){
   const o=AC.createOscillator(); o.type='sine';
   o.frequency.setValueAtTime(K.kf0,t);
   o.frequency.exponentialRampToValueAtTime(K.kf1,t+K.kpd);
   const g=AC.createGain(); gEnv(g.gain,t,1.0*v,.002,K.kdec);
   const dr=shaper(K.kdrv);
   o.connect(g); g.connect(dr); dr.connect(voiceOutput||limiter);
   o.start(t); o.stop(t+K.kdec+.1);
   const c=AC.createOscillator(); c.type='triangle'; c.frequency.value=K.kf0*2.4;
   const cg=AC.createGain(); gEnv(cg.gain,t,.20*v,.001,.02);
   c.connect(cg); cg.connect(voiceOutput||limiter); c.start(t); c.stop(t+.06);
 },
 snare(t,v,K){
   const n=noise(); const hp=AC.createBiquadFilter(); hp.type='bandpass';
   hp.frequency.value=1900; hp.Q.value=.7;
   const ng=AC.createGain(); gEnv(ng.gain,t,.42*v*K.sNoise,.001,K.sDec);
   n.connect(hp); hp.connect(ng); ng.connect(voiceOutput||limiter); n.start(t); n.stop(t+K.sDec+.1);
   [1,1.58].forEach((m,i)=>{
     const o=AC.createOscillator(); o.type='triangle'; o.frequency.value=K.sTone*m;
     const g=AC.createGain(); gEnv(g.gain,t,(i?.16:.30)*v,.001,K.sDec*.75);
     o.connect(g); g.connect(voiceOutput||limiter); o.start(t); o.stop(t+K.sDec+.1);
   });
 },
 clap(t,v,K){
   const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1250; bp.Q.value=1.1;
   bp.connect(voiceOutput||limiter);
   [0,1,2].forEach(i=>{
     const n=noise(); const g=AC.createGain();
     const tt=t+i*K.cSpread;
     gEnv(g.gain,tt,.34*v,.0008,.017);
     n.connect(g); g.connect(bp); n.start(tt); n.stop(tt+.06);
   });
   const n=noise(); const g=AC.createGain();
   gEnv(g.gain,t+2*K.cSpread,.24*v,.003,K.cDec);
   n.connect(g); g.connect(bp); n.start(t+2*K.cSpread); n.stop(t+K.cDec+.1);
 },
 rim(t,v,K){
   const o=AC.createOscillator(); o.type='square'; o.frequency.value=1720;
   const o2=AC.createOscillator(); o2.type='square'; o2.frequency.value=475;
   const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1650; bp.Q.value=2.4;
   const g=AC.createGain(); gEnv(g.gain,t,.34*v,.0006,K.rDec);
   o.connect(bp);o2.connect(bp);bp.connect(g);g.connect(voiceOutput||limiter);
   o.start(t);o2.start(t);o.stop(t+.1);o2.stop(t+.1);
 },
 hat(t,v,K,open){
   const dec=open?K.hoDec:K.hDec;
   const hp=AC.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=K.hHP;
   const g=AC.createGain(); gEnv(g.gain,t,(open?.20:.26)*v,.0006,dec);
   hp.connect(g); g.connect(voiceOutput||limiter);
   const n=noise(); const ng=AC.createGain(); ng.gain.value=1-K.hMetal*.7;
   n.connect(ng); ng.connect(hp); n.start(t); n.stop(t+dec+.1);
   if(K.hMetal>.05){
     const mg=AC.createGain(); mg.gain.value=K.hMetal*.14; mg.connect(hp);
     [2,3,4.16,5.43,6.79,8.21].forEach(r=>{
       const o=AC.createOscillator(); o.type='square'; o.frequency.value=40*r*1.6;
       o.connect(mg); o.start(t); o.stop(t+dec+.05);
     });
   }
 },
 ride(t,v,K){
   const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=3600; bp.Q.value=.9;
   const g=AC.createGain(); gEnv(g.gain,t,.13*v,.001,K.rideDec);
   bp.connect(g); g.connect(voiceOutput||limiter);
   const n=noise(); const ng=AC.createGain(); ng.gain.value=.5;
   n.connect(ng); ng.connect(bp); n.start(t); n.stop(t+K.rideDec+.1);
   [2.1,3.4,4.7,6.2].forEach(r=>{
     const o=AC.createOscillator(); o.type='square'; o.frequency.value=180*r;
     const og=AC.createGain(); og.gain.value=.09;
     o.connect(og); og.connect(bp); o.start(t); o.stop(t+K.rideDec);
   });
   const p=AC.createOscillator(); p.type='triangle'; p.frequency.value=1500;
   const pg=AC.createGain(); gEnv(pg.gain,t,.10*v,.0008,.05);
   p.connect(pg); pg.connect(voiceOutput||limiter); p.start(t); p.stop(t+.1);
 },
 shaker(t,v){
   const n=noise(); const bp=AC.createBiquadFilter(); bp.type='bandpass';
   bp.frequency.value=6200; bp.Q.value=1.3;
   const g=AC.createGain();
   g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.20*v,t+.012);
   g.gain.exponentialRampToValueAtTime(.0001,t+.075);
   n.connect(bp); bp.connect(g); g.connect(voiceOutput||limiter); n.start(t); n.stop(t+.14);
 },
 tamb(t,v){
   const n=noise(); const bp=AC.createBiquadFilter(); bp.type='bandpass';
   bp.frequency.value=8600; bp.Q.value=2.2;
   const g=AC.createGain(); gEnv(g.gain,t,.20*v,.002,.13);
   n.connect(bp); bp.connect(g); g.connect(voiceOutput||limiter); n.start(t); n.stop(t+.22);
 },
 conga(t,v){
   const o=AC.createOscillator(); o.type='sine';
   o.frequency.setValueAtTime(390,t); o.frequency.exponentialRampToValueAtTime(255,t+.035);
   const g=AC.createGain(); gEnv(g.gain,t,.42*v,.002,.20);
   const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=340; bp.Q.value=2.2;
   o.connect(bp); bp.connect(g); g.connect(voiceOutput||limiter); o.start(t); o.stop(t+.3);
   const n=noise(); const ng=AC.createGain(); gEnv(ng.gain,t,.07*v,.0008,.014);
   const nh=AC.createBiquadFilter(); nh.type='highpass'; nh.frequency.value=2200;
   n.connect(nh); nh.connect(ng); ng.connect(voiceOutput||limiter); n.start(t); n.stop(t+.05);
 },
 cow(t,v,K){
   const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2200; bp.Q.value=1.1;
   const g=AC.createGain(); gEnv(g.gain,t,.16*v,.001,K.cbDec);
   bp.connect(g); g.connect(voiceOutput||limiter);
   K.cbF.forEach(f=>{const o=AC.createOscillator();o.type='square';o.frequency.value=f;
     o.connect(bp);o.start(t);o.stop(t+K.cbDec+.05);});
 },
 tom(t,v,K){
   const o=AC.createOscillator(); o.type='sine';
   o.frequency.setValueAtTime(K.tF,t); o.frequency.exponentialRampToValueAtTime(K.tF*.62,t+.10);
   const g=AC.createGain(); gEnv(g.gain,t,.55*v,.002,K.tDec);
   o.connect(g); g.connect(voiceOutput||limiter); o.start(t); o.stop(t+K.tDec+.1);
   const n=noise(); const ng=AC.createGain(); gEnv(ng.gain,t,.05*v,.001,.03);
   n.connect(ng); ng.connect(voiceOutput||limiter); n.start(t); n.stop(t+.08);
 }
};

/* =====================================================================
   LANES
   ===================================================================== */
const LANES=[
 {id:'kick',  name:'Kick',    c:'#FF4B32', gm:36, play:(t,v,K)=>V.kick(t,v,K),   swing:false},
 {id:'clap',  name:'Clap',    c:'#FF8A2B', gm:39, play:(t,v,K)=>V.clap(t,v,K),   swing:false},
 {id:'snare', name:'Snare',   c:'#FF8A2B', gm:38, play:(t,v,K)=>V.snare(t,v,K),  swing:false},
 {id:'rim',   name:'Rim',     c:'#3FD0C9', gm:37, play:(t,v,K)=>V.rim(t,v,K),    swing:true},
 {id:'chh',   name:'Closed hat',c:'#FFC531',gm:42,play:(t,v,K)=>V.hat(t,v,K,0),  swing:true},
 {id:'ohh',   name:'Open hat', c:'#FFC531', gm:46, play:(t,v,K)=>V.hat(t,v,K,1), swing:true},
 {id:'ride',  name:'Ride',     c:'#FFC531', gm:51, play:(t,v,K)=>V.ride(t,v,K),  swing:true},
 {id:'shaker',name:'Shaker',   c:'#3FD0C9', gm:70, play:(t,v)=>V.shaker(t,v),    swing:true},
 {id:'tamb',  name:'Tambourine',c:'#3FD0C9',gm:54, play:(t,v)=>V.tamb(t,v),      swing:true},
 {id:'conga', name:'Conga',    c:'#3FD0C9', gm:62, play:(t,v)=>V.conga(t,v),     swing:true},
 {id:'cow',   name:'Cowbell',  c:'#3FD0C9', gm:56, play:(t,v,K)=>V.cow(t,v,K),   swing:true},
 {id:'tom',   name:'Tom',      c:'#3FD0C9', gm:45, play:(t,v,K)=>V.tom(t,v,K),   swing:true}
];
const VEL={'X':1.0,'x':.72,'o':.34};

/* =====================================================================
   PATTERN LIBRARY   ( X accent · x normal · o ghost · - off )
   ===================================================================== */
const r=s=>s+s;
const LIB=[
{name:'Classic house',fam:'House',bpm:124,swing:52,
 d:'The 909 template that everything else in house is a deviation from. Kick as a clock, clap on the backbeat, and the open hat sitting on every offbeat 8th — that open hat is the sound people mean when they say "house".',
 sig:'Remove the <b>open hats</b> and this becomes generic techno. That one lane is the genre.',
 p:{kick:r('X---X---X---X---'),clap:r('----X-------X---'),
    chh:r('x---x---x---x---'),ohh:r('--X---X---X---X-')}},

{name:'Deep house',fam:'House',bpm:122,swing:56,
 d:'Everything softened and pulled back. No clap on the backbeat — a rim instead, which sits under the mix rather than punching through it. The shaker does the work the hats would normally do, so the top end never gets aggressive.',
 sig:'The backbeat is a <b>rim, not a clap</b>, and the swing is high enough to hear. Energy comes from the bass, not the drums.',
 p:{kick:r('X---X---X---X---'),rim:r('----x-------x---'),
    chh:r('--o---o---o---o-'),shaker:r('xoxoxoxoxoxoxoxo'),
    ohh:'--------------------------X-----'}},

{name:'Disco house',fam:'House',bpm:122,swing:54,
 d:'House drums with a disco kit on top: a real snare instead of a clap, 16th hats, and a tambourine riding the offbeat 16ths. Busier than classic house by design, because it is imitating a live rhythm section.',
 sig:'<b>Tambourine on the offbeat 16ths</b> plus a snare backbeat. That combination reads as 1978 no matter what else you do.',
 p:{kick:r('X---X---X---X---'),snare:r('----X-------X---'),
    chh:r('xo-oxo-oxo-oxo-o'),ohh:r('--x---x---x---x-'),
    tamb:r('-x-x-x-x-x-x-x-x')}},

{name:'French house',fam:'House',bpm:126,swing:50,
 d:'Straight, hard and filtered. No swing at all — the groove comes from the sample loop, not the grid, so the drums stay rigid underneath. Hats run 16ths flat out and the open hat appears once a bar as punctuation.',
 sig:'<b>Zero swing</b> and relentless 16th hats. The looseness in French house is in the source material, never in the drum programming.',
 p:{kick:r('X---X---X---X---'),clap:r('----X-------X---'),
    chh:r('xoxoxoxoxoxoxoxo'),tamb:r('-o-o-o-o-o-o-o-o'),
    ohh:'--------------------------x-----'}},

{name:'Jackin house',fam:'House',bpm:126,swing:60,
 d:'Heavy shuffle plus a kick that refuses to stay on the grid. The 16th pickup before beat one is the "jack" — it drags the bar forward into the next one. Rim hits fill the gaps the shuffle opens up.',
 sig:'A <b>16th kick pickup</b> at the end of the bar, and swing at 60%. Both, or it is just house.',
 p:{kick:'X---X---X---X---X---X---X---X--x',clap:r('----X-------X---'),
    chh:r('x-o-x-o-x-o-x-o-'),ohh:r('--x---x---x---x-'),
    rim:r('--x-----x-x-----')}},

{name:'Tech house',fam:'House',bpm:126,swing:54,
 d:'House skeleton, techno restraint. The hats drop to offbeat 8ths only, a shaker carries the 16ths at ghost level, and one syncopated rim provides the only surprise in the bar. Sparse enough that the bassline has to be the hook.',
 sig:'Closed hats on the <b>offbeat 8ths only</b> and a single rim off the grid. Everything is subtraction.',
 p:{kick:r('X---X---X---X---'),clap:r('----X-------X---'),
    chh:r('--x---x---x---x-'),rim:r('------x---x-----'),
    shaker:r('-o-o-o-o-o-o-o-o'),ohh:'--------------x---------------x-'}},

{name:'Minimal',fam:'House',bpm:125,swing:52,
 d:'Almost nothing, on purpose. Kick, a ghost hat on the offbeat, one rim somewhere unexpected. The whole point is that the listener fills in what is missing, which is why minimal tracks feel like they are moving despite barely playing anything.',
 sig:'<b>Under twelve hits in two bars.</b> If you can hear the space, it is working.',
 p:{kick:r('X---X---X---X---'),chh:r('--o---o---o---o-'),
    rim:'------x-----------------x-------'}},

{name:'Hypnotic techno',fam:'Techno',bpm:132,swing:50,
 d:'No backbeat at all. Removing the clap removes the sense of a bar, and 16th hats running flat out remove the sense of a beat — what is left is a texture that your body reads as forward motion with nothing to count against.',
 sig:'<b>No clap, no snare, nothing on 2 and 4.</b> That absence is the entire genre.',
 p:{kick:r('X---X---X---X---'),chh:r('xoxoxoxoxoxoxoxo'),
    ride:'--------x---------------x-------'}},

{name:'Peak-time techno',fam:'Techno',bpm:138,swing:50,
 d:'The big-room version: clap back on the backbeat, open hats on the offbeats, tempo up past 135. Structurally almost identical to classic house — the difference is entirely tempo, sound design and the absence of swing.',
 sig:'This is <b>classic house at 138 with no swing</b>. Load them both into the morph lab and count the differences.',
 p:{kick:r('X---X---X---X---'),clap:r('----X-------X---'),
    chh:r('x-x-x-x-x-x-x-x-'),ohh:r('--x---x---x---x-'),
    tom:'----------------------------x-x-'}},

{name:'Hard groove techno',fam:'Techno',bpm:140,swing:52,
 d:'Fast, tribal and percussion-led — the Ben Sims / Jeff Mills lineage. The congas carry a syncopated line that is really a melody, and the kick just holds the floor while the percussion does everything interesting.',
 sig:'The <b>conga line is the hook</b>. Mute it and there is no track.',
 p:{kick:r('X---X---X---X---'),conga:r('--x-x---x--x-x--'),
    chh:r('xoxoxoxoxoxoxoxo'),rim:r('----x-------x-x-'),
    shaker:r('-o-o-o-o-o-o-o-o')}},

{name:'Dub techno',fam:'Techno',bpm:125,swing:54,
 d:'Basic Channel territory. The drums are deliberately unremarkable and mixed low; everything expressive happens in the chord stab and the delay tail. Programming this well means resisting the urge to add anything.',
 sig:'<b>One rim per two bars.</b> The reverb is the instrument, not the kit.',
 p:{kick:r('X---X---X---X---'),chh:r('--o---o---o---o-'),
    rim:'------x-------------------------',
    ride:'----------------------------o---'}},

{name:'Detroit techno',fam:'Techno',bpm:130,swing:50,
 d:'Straight 8th hats, clap on the backbeat, and toms used melodically rather than as fills. The 808/909 kit played with a musician\'s sensibility — this is where techno and funk are closest.',
 sig:'<b>Toms as a melodic line</b>, not as a fill. Pitch them and they become a counter-melody.',
 p:{kick:r('X---X---X---X---'),clap:r('----X-------X---'),
    chh:r('x-x-x-x-x-x-x-x-'),ohh:r('--x---x---x---x-'),
    tom:'--------x---x-------x---x---x---'}},

{name:'Chicago acid house',fam:'House',bpm:120,swing:56,
 d:'The 1987 original: 909 kit, open hat on every offbeat, cowbell in the middle of the bar because the machine had one. Slower than modern house and much swung — the shuffle came from the drum machine, not from a decision.',
 sig:'<b>Open hat on all four offbeats</b> plus a cowbell. Period-correct and completely unsubtle.',
 p:{kick:r('X---X---X---X---'),clap:r('----X-------X---'),
    chh:r('x---x---x---x---'),ohh:r('--X---X---X---X-'),
    cow:'------x---------------x---------'}},

{name:'UK garage · 2-step',fam:'Garage',bpm:135,swing:62,
 d:'The kick leaves the floor. Two or three kicks per bar in shifting positions, snare on 2 and 4 holding everything together, and shuffled 16th hats with gaps in them. The bar never feels balanced, which is exactly the point.',
 sig:'<b>Syncopated kick + straight backbeat.</b> Remove the four-on-the-floor and keep the snare, and you are in 2-step.',
 p:{kick:'X-----x---X-----X-------x---X---',snare:r('----X-------X---'),
    chh:r('xo-oxo-ox-o-xo-o'),
    ohh:'--------------x---------------x-',
    rim:'-----o--------------------o-----'}},

{name:'Speed garage',fam:'Garage',bpm:135,swing:58,
 d:'2-step\'s four-to-the-floor cousin. The kick returns to the grid, so all the syncopation moves into the hats and the bassline. Faster and harder than house at the same tempo because of the shuffle and the snare.',
 sig:'Four-on-the-floor with a <b>snare backbeat and heavy shuffle</b>. The bass does the syncopating.',
 p:{kick:r('X---X---X---X---'),snare:r('----X-------X---'),
    chh:r('xo-oxo-oxo-oxo-o'),ohh:r('--x---x---x---x-'),
    rim:'-------x----------------x-------'}},

{name:'Breakbeat',fam:'Breaks',bpm:130,swing:50,
 d:'A programmed version of a live funk drummer. Kick and snare trade places across the bar, ghost snares fill the 16ths between them, and the two bars are deliberately different — a break that repeats identically stops sounding like a person.',
 sig:'<b>Ghost snares at velocity 30–50.</b> They are the difference between a break and a drum machine.',
 p:{kick:'X--x----X-------X-----x-----x---',
    snare:'----X--o----X--o----X---X---X--o',
    chh:r('x-x-x-x-x-x-x-x-')}},

{name:'Afro house',fam:'Afro / Latin',bpm:122,swing:56,
 d:'Four-on-the-floor with a full percussion ensemble on top. The congas run a rolling pattern that never quite repeats where you expect, the shaker fills every 16th, and the kit drums stay minimal so the percussion has room.',
 sig:'<b>Congas carry a rolling phrase across the bar line</b>, not a one-bar loop. That is what makes it feel endless.',
 p:{kick:r('X---X---X---X---'),conga:'--x-x-x---x-x-x---x-x---x-x-x-x-',
    shaker:r('xoxoxoxoxoxoxoxo'),rim:r('------x-----x---'),
    ohh:'------------x-------------------',
    tom:'--------------------------x-----'}},

{name:'Latin / tribal house',fam:'Afro / Latin',bpm:124,swing:54,
 d:'Built on the tresillo — the three-against-eight pattern underneath most Latin music. Congas play it, the cowbell marks the quarters, and the tambourine sits on the offbeats. Dense but every part is in a different rhythmic layer.',
 sig:'The conga plays <b>E(3,8)</b>: hits on steps 1, 4 and 7. Everything else is built around that.',
 p:{kick:r('X---X---X---X---'),conga:r('x--x--x-x--x--x-'),
    cow:r('----x---x---x---'),shaker:r('-o-o-o-o-o-o-o-o'),
    tamb:r('--x---x---x---x-')}}
];

