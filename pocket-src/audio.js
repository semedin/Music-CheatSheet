const PA=(()=>{
 const hz=n=>440*2**((n-69)/12);
 function create(ctx,s,r,destination=ctx.destination){
  const master=ctx.createGain();master.gain.value=.65;
  const limit=ctx.createDynamicsCompressor();Object.assign(limit.threshold,{value:-8});limit.knee.value=5;limit.ratio.value=5;limit.attack.value=.003;limit.release.value=.12;master.connect(limit);limit.connect(destination);
  const buses={};for(const k of Object.keys(r.lanes)){buses[k]=ctx.createGain();buses[k].gain.value=s.mutes[k]?0:1;buses[k].connect(master);}
  const noise=ctx.createBuffer(1,ctx.sampleRate*.25,ctx.sampleRate),data=noise.getChannelData(0);let seed=77;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}
  const seconds=60/s.bpm;
  // Reuse Orbit’s actual synth, effects and event modulation for the source voice.
  const source=s.hook.orbit?OE.unpack(s.hook.orbit):OE.normalize({sound:s.hookSound,...OB.SOUNDS_BY_ID[s.hookSound].fx,bpm:s.bpm,hp:s.hook.genre==='hard-techno'?220:160});
  if(source.sound!==s.hookSound){source.sound=s.hookSound;Object.assign(source,OB.SOUNDS_BY_ID[s.hookSound].fx);}
  source.bpm=s.bpm;source.ctx={drums:false,bass:false,chords:false};source.mute={arp:false};
  const hookEngine=OA.create(ctx,{destination:false});hookEngine.set(source,OB.SOUNDS_BY_ID[source.sound]);hookEngine.out.connect(buses.hook);
  const original=s.hook.orbit?OA.phrase(source,OE.render(source,{bars:s.hook.beats/4})).arp:[];
  // One shared send: its rhythm belongs to the source; supporting voices stay dry.

  function voice(k,n,time){
   if(k==='hook'){const local=OT.mod(n.t,s.hook.beats),event=original.find(e=>Math.abs(e.t-local)<.0001&&e.n===n.n);if(event?.mod?.send!==undefined)hookEngine.sendAt(time,event.mod.send);hookEngine.note({...event,...n},time);return;}
   const dur=n.d*seconds,v=n.v/127,bus=buses[k];
   const env=ctx.createGain();env.gain.setValueAtTime(0,time);
   const amp={kick:.65,sub:.24,bass:r.foundation==='Rave foundation'?.095:.11,answer:.05,hats:.055}[k]*v;
   env.gain.linearRampToValueAtTime(amp,time+.004);
   const release=k==='kick'?.14:k==='hats'?.035:.025;
   env.gain.exponentialRampToValueAtTime(Math.max(.0001,amp*(k==='bass'?.45:.7)),time+Math.max(.006,dur));
   env.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.01,dur)+release);
   env.connect(bus);
   if(k==='hats'){
    const src=ctx.createBufferSource();src.buffer=noise;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=8000;src.connect(hp);hp.connect(env);src.start(time);src.stop(time+.13);return;
   }
   const osc=ctx.createOscillator();osc.frequency.value=hz(n.n);
   if(k==='kick'){osc.type='sine';osc.frequency.setValueAtTime(155,time);osc.frequency.exponentialRampToValueAtTime(r.foundation==='Rave foundation'?47:49,time+.04);osc.frequency.exponentialRampToValueAtTime(43,time+.12);osc.connect(env);}
   else if(k==='sub'){osc.type='sine';osc.connect(env);}
   else {
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=k==='bass'?1.2:.6;
    const sound=r.study.sound,top=k==='hook'?3200:k==='answer'?2200:sound==='pluck'?1600:sound==='rubber'?1200:650;
    filter.frequency.setValueAtTime(top,time);filter.frequency.exponentialRampToValueAtTime(k==='bass'?180:500,time+Math.max(.03,dur));
    osc.type=k==='answer'?'triangle':sound==='round'?'triangle':sound==='rubber'?'square':'sawtooth';osc.connect(filter);
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=k==='bass'?110:350;filter.connect(hp);hp.connect(env);

   }
   osc.start(time);osc.stop(time+Math.max(.01,dur)+release+.015);
  }
  function schedule(start,offset=0,length=r.beats){
   if(!s.mutes.kick&&!s.mutes.hook)for(const n of r.lanes.kick)if(n.t>=offset&&n.t<offset+length)hookEngine.duck(start+(n.t-offset)*seconds);
   for(const [k,notes] of Object.entries(r.lanes))for(const n of notes)if(n.t>=offset&&n.t<offset+length&&!s.mutes[k])voice(k,n,start+(n.t-offset)*seconds);
   for(const k of ['sub','bass']){
    const gain=buses[k].gain;if(offset===0)gain.setValueAtTime(s.mutes[k]?0:1,start);
    if(!s.mutes.kick&&!s.mutes[k])for(const n of r.lanes.kick)if(n.t>=offset&&n.t<offset+length){const t=start+(n.t-offset)*seconds;gain.setValueAtTime(1,t);gain.linearRampToValueAtTime(1-s.duck/100*.88,t+.006);gain.linearRampToValueAtTime(1,t+Math.min(seconds*.42,.16));}
   }
  }
  return {schedule,master,hookEngine};
 }
 class Player{
  constructor(tick){this.tick=tick;this.playing=false;this.ctx=null;}
  async start(s,r){this.stop();const ctx=new AudioContext();this.ctx=ctx;await ctx.resume();if(this.ctx!==ctx)return;this.s=s;this.r=r;this.engine=create(this.ctx,s,r);this.origin=this.ctx.currentTime+.06;this.next=0;this.playing=true;
   const pump=()=>{if(!this.playing)return;const sec=60/s.bpm;while(this.origin+this.next*sec<this.ctx.currentTime+.15){const beat=this.next%r.beats;this.engine.schedule(this.origin+this.next*sec,beat,1);this.next++;}const beat=Math.max(0,(this.ctx.currentTime-this.origin)/sec)%r.beats;this.tick(beat);};pump();this.timer=setInterval(pump,25);
  }
  stop(){clearInterval(this.timer);this.playing=false;if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null;}this.tick(-1);}
 }
 async function render(s,r,only=null){const copy={...s,mutes:{...s.mutes}};if(only)for(const k of Object.keys(copy.mutes))copy.mutes[k]=k!==only;
  const rate=44100,ctx=new OfflineAudioContext(2,Math.ceil((r.beats*60/s.bpm+2)*rate),rate);create(ctx,copy,r).schedule(.01);return ctx.startRendering();
 }
 function wav(buffer){const count=buffer.length,ch=buffer.numberOfChannels,bytes=new ArrayBuffer(44+count*ch*2),v=new DataView(bytes);const str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,count*ch*2,true);const arrays=Array.from({length:ch},(_,i)=>buffer.getChannelData(i));for(let i=0;i<count;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,arrays[c][i]));v.setInt16(44+(i*ch+c)*2,x<0?x*32768:x*32767,true);}return new Uint8Array(bytes);}
 return {create,Player,render,wav};
})();
