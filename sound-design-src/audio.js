const HZ=n=>440*Math.pow(2,(n-69)/12);
const bound=(x,a,b)=>Math.min(b,Math.max(a,x));
function patternFor(p){
 const n=p.note,ev=(step,note=n,len=.65,vel=90)=>({step,note,len,vel}),ch=(step,len=1.1)=>[0,3,7,10].map(d=>ev(step,n+d,len));
 const patterns={
 rolling:()=>[2,3,6,7,10,11,14,18,19,22,23,26,27,30].map((s,i)=>ev(s,n,.65,[95,65,80][i%3])),
 offbeat:()=>[2,6,10,14,18,22,26,30].map(s=>ev(s,n,1.3)),
 syncopated:()=>[0,3,6,10,12,15,18,22,27,30].map((s,i)=>ev(s,n+(p.family==='Leads'?[0,0,3,7][i%4]:0),.9,[100,65,85][i%3])),
 long:()=>[ev(0,n,14),ev(16,n+3,14)],
 acid:()=>[0,2,3,6,8,10,11,14,16,18,19,22,24,27,28,30].map((s,i)=>ev(s,n+[0,0,12,0,3,0,7,0][i%8],i%4===1?1.15:.7,i%4===0?115:75)),
 octaves:()=>Array.from({length:16},(_,i)=>ev(i*2,n+(i%3===2?12:0),.75)),
 chords:()=>[0,6,12,18,24,28].flatMap(s=>ch(s,1.4)),
 'sparse-chords':()=>[0,11,20].flatMap(s=>ch(s,1.3)),
 stab:()=>[0,6,10,16,23,28].map(s=>ev(s,n,1.2)),
 melody:()=>[0,3,6,10,14,16,19,22,26,30].map((s,i)=>ev(s,n+[0,7,3,10,7,0,3,7,12,7][i],1.6)),
 hypnotic:()=>[0,3,6,9,12,15,18,21,24,27,30].map((s,i)=>ev(s,n+[0,0,0,3,0,7][i%6],.7)),
 glide:()=>[ev(0,n,3),ev(5,n+3,4.3),ev(9,n+7,4),ev(16,n,3),ev(21,n+10,4.3),ev(25,n+7,5)],
 pad:()=>[0,3,7].map(d=>ev(0,n+d,30,80)),
 drone:()=>[ev(0,n,30,80)],
 kick:()=>Array.from({length:8},(_,i)=>ev(i*4,n,3.8)),
 hat:()=>Array.from({length:16},(_,i)=>ev(i*2,n,.7,i%2?65:95)),
 clap:()=>[4,12,20,28].map(s=>ev(s,n,2.7)),
 shaker:()=>Array.from({length:32},(_,i)=>ev(i,n,.8,[45,75,55,95][i%4])),
 clave:()=>[0,6,11,16,22,27,30].map(s=>ev(s,n,.6)),
 rise:()=>[ev(0,n,64,70)],
 impact:()=>[ev(0,n,24,85)],
 zap:()=>[ev(0,n,3),ev(12,n+5,3),ev(24,n+7,3)],
 rumble:()=>Array.from({length:8},(_,i)=>ev(i*4,n,3.8,80))
 };return (patterns[p.pattern]||patterns.rolling)().sort((a,b)=>a.step-b.step||a.note-b.note);
}
function midiBytes(p,bpm){
 const events=[],push=(t,bytes,order=1)=>events.push({t:Math.round(t),bytes,order});
 const tempo=Math.round(60000000/bpm);push(0,[255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255],-3);push(0,[255,88,4,4,2,24,8],-2);
 for(const e of patternFor(p)){push(e.step*120,[144,e.note,e.vel]);push((e.step+e.len)*120,[128,e.note,0],0);}
 events.sort((a,b)=>a.t-b.t||a.order-b.order);const bytes=[];let last=0;
 const vlq=v=>{let a=[v&127];while(v>>=7)a.unshift((v&127)|128);return a;};
 for(const e of events){bytes.push(...vlq(e.t-last),...e.bytes);last=e.t;}
 const end=Math.max(3840,p.pattern==='rise'?7680:3840,last);bytes.push(...vlq(end-last),255,47,0);
 const len=bytes.length;return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(len>>>24)&255,(len>>>16)&255,(len>>>8)&255,len&255,...bytes]);
}
function envelopePoints(a,gate){
 const [atk,hold,dec,sus,rel]=a,A=Math.max(.001,atk/1000),H=hold/1000,D=Math.max(.001,dec/1000),S=sus/100,R=Math.max(.008,rel/1000);
 const segments=[[0,0],[A,1],[A+H,1],[A+H+D,S]],value=t=>t<A?t/A:t<A+H?1:t<A+H+D?1+(S-1)*(t-A-H)/D:S;
 return [...segments.filter(([t])=>t<gate),[gate,value(gate)],[gate+R,0]];
}
function applyEnvelope(param,time,amp,gate,level){param.setValueAtTime(0,time);for(const [t,v]of envelopePoints(amp,gate))param.linearRampToValueAtTime(v*level,time+t);}
function noiseBuffer(ctx){const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*2),ctx.sampleRate),v=b.getChannelData(0);let seed=12345;for(let i=0;i<v.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;v[i]=(seed/4294967296)*2-1;}return b;}
function soundGraph(ctx,destination,p,events,bpm,start=0,raw=false){
 const group=ctx.createGain();group.gain.value=.14;const safety=ctx.createDynamicsCompressor();safety.threshold.value=-8;safety.knee.value=8;safety.ratio.value=8;safety.attack.value=.003;safety.release.value=.15;group.connect(safety);safety.connect(destination);
 const sources=[],nodes=[group,safety],noise=noiseBuffer(ctx),step=60/bpm/4;
 const record=node=>(nodes.push(node),node),source=node=>(sources.push(node),node);
 const wet=record(ctx.createGain()),delay=record(ctx.createDelay(2)),feed=record(ctx.createGain());wet.gain.value=raw?0:(p.space||(/Delay/i.test(p.fx)?.15:0));delay.delayTime.value=60/bpm*.75;feed.gain.value=.25;group.connect(delay);delay.connect(wet);wet.connect(safety);delay.connect(feed);feed.connect(delay);
 for(const e of events){
  const t=start+e.step*step,gate=e.len*step,amp=raw?[3,0,200,80,40]:p.amp,end=t+gate+amp[4]/1000+.05,level=(e.vel/127)*.8;
  const gain=record(ctx.createGain()),filter=record(ctx.createBiquadFilter());
  filter.type=raw?'lowpass':p.filter.startsWith('High')?'highpass':p.filter.startsWith('Band')?'bandpass':'lowpass';
  const cutoff=raw?14000:p.cut;filter.frequency.setValueAtTime(bound(cutoff,30,16000),t);filter.Q.value=raw?.6:(p.res||0)/13+.6;filter.connect(gain);gain.connect(group);applyEnvelope(gain.gain,t,amp,gate,level);
  if(!raw&&p.env&&p.filter!=='Off'&&p.peak!==p.cut){const attack=(p.envAttack||0)/1000;filter.frequency.setValueAtTime(bound(attack?p.cut:p.peak,30,16000),t);if(attack)filter.frequency.exponentialRampToValueAtTime(bound(p.peak,30,16000),t+attack);filter.frequency.exponentialRampToValueAtTime(bound(p.cut,30,16000),t+attack+p.env/1000);}
  if(!raw&&p.pattern==='rise'){filter.frequency.setValueAtTime(300,t);filter.frequency.exponentialRampToValueAtTime(12000,t+gate);}
  if(!raw&&p.wobble){const lfo=source(ctx.createOscillator()),depth=record(ctx.createGain());lfo.frequency.value=bpm/60*p.wobble;depth.gain.value=900;filter.frequency.setValueAtTime(1200,t);lfo.connect(depth);depth.connect(filter.frequency);lfo.start(t);lfo.stop(end);}
  if(p.wave==='noise'||p.wave==='snare'){const src=source(ctx.createBufferSource());src.buffer=noise;src.loop=true;src.connect(filter);src.start(t);src.stop(end);if(p.clap&&!raw){gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(0,t);for(const offset of [0,.015,.03]){gain.gain.linearRampToValueAtTime(level,t+offset+.002);gain.gain.linearRampToValueAtTime(.001,t+offset+.012);}gain.gain.linearRampToValueAtTime(level*.7,t+.05);gain.gain.exponentialRampToValueAtTime(.0001,t+.24);}}
  if(p.wave!=='noise'){
   const stack=p.stack||[0],count=raw?1:(p.stack?1:Math.min(p.voices||1,7));
   for(const sem of stack)for(let k=0;k<count;k++){
    const osc=source(ctx.createOscillator()),v=record(ctx.createGain());osc.type=['sawtooth','triangle','square','sine'].includes(p.wave)?p.wave:'triangle';const f=HZ(e.note+sem);osc.frequency.setValueAtTime(f,t);v.gain.value=1/(stack.length*Math.sqrt(count));osc.detune.value=count===1?0:((k/(count-1))*2-1)*(p.detune||7);osc.connect(v);
    if(p.wave==='snare'){const body=record(ctx.createGain());body.gain.value=.45;v.connect(body);body.connect(gain);}else v.connect(filter);
    if(p.pitchDrop&&!raw){osc.frequency.setValueAtTime(f*2**(p.pitchDrop/12),t);osc.frequency.exponentialRampToValueAtTime(f,t+p.pitchTime);}
    if(p.fm&&!raw){const mod=source(ctx.createOscillator()),depth=record(ctx.createGain());mod.frequency.value=f*(p.ratio||2);depth.gain.setValueAtTime(f*p.fm,t);depth.gain.exponentialRampToValueAtTime(Math.max(1,f*p.fm*.08),t+Math.min(gate,.35));mod.connect(depth);depth.connect(osc.frequency);mod.start(t);mod.stop(end);}
    osc.start(t);osc.stop(end);
   }
  }
 }
 const duration=Math.max(...events.map(e=>(e.step+e.len)*step))+p.amp[4]/1000+1.5;
 return {duration,stop(){group.gain.cancelScheduledValues(ctx.currentTime);group.gain.setTargetAtTime(0,ctx.currentTime,.008);for(const s of sources){try{s.stop(ctx.currentTime+.03);}catch{}}},dispose(){for(const n of [...sources,...nodes])try{n.disconnect();}catch{}}};
}
const AudioSketch={ctx:null,current:null,timer:null,token:0,onStop:()=>{},async play(p,bpm,{raw=false,events=null}={}){this.stop();const token=this.token;if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();if(token!==this.token)return;this.current=soundGraph(this.ctx,this.ctx.destination,p,events||patternFor(p),bpm,this.ctx.currentTime+.05,raw);this.timer=setTimeout(()=>this.stop(),(this.current.duration+.1)*1000);},stop(){this.token++;clearTimeout(this.timer);if(this.current){const old=this.current;old.stop();setTimeout(()=>old.dispose(),70);this.current=null;}this.onStop();}};
