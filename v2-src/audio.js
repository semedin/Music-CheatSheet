const noiseCache=new WeakMap(),driveCurves=new Map();
function getNoise(ac){if(!noiseCache.has(ac)){const b=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),data=b.getChannelData(0),r=random32(771);for(let i=0;i<data.length;i++)data[i]=r()*2-1;noiseCache.set(ac,b)}return noiseCache.get(ac)}
function driveCurve(amount){if(!driveCurves.has(amount)){const curve=new Float32Array(2048),normal=Math.tanh(amount);for(let i=0;i<curve.length;i++)curve[i]=Math.tanh((i/(curve.length-1)*2-1)*amount)/normal;driveCurves.set(amount,curve)}return driveCurves.get(amount)}
function createSoundEngine(ac,tracks,bpm,masterLevel=.55){
 const master=ac.createGain(),compressor=ac.createDynamicsCompressor(),channels={},groups=new Set();let stopped=false;
 master.gain.value=masterLevel*.55;compressor.threshold.value=-13;compressor.knee.value=14;compressor.ratio.value=5;compressor.attack.value=.004;compressor.release.value=.12;master.connect(compressor);compressor.connect(ac.destination);
 for(const role of ROLES){
  const input=ac.createGain(),gain=ac.createGain(),pan=ac.createStereoPanner(),delay=ac.createDelay(3),feedback=ac.createGain(),wet=ac.createGain(),lp=ac.createBiquadFilter();
  input.connect(gain);gain.connect(pan);pan.connect(master);input.connect(delay);delay.connect(lp);lp.connect(wet);wet.connect(pan);lp.connect(feedback);feedback.connect(delay);
  delay.delayTime.value=60/bpm*.75;feedback.gain.value=.24;lp.type='lowpass';lp.frequency.value=3200;
  channels[role]={input,gain,pan,wet,nodes:[input,gain,pan,delay,feedback,wet,lp]};
 }
 function update(role,mix){const ch=channels[role],now=ac.currentTime;ch.gain.gain.setTargetAtTime(mix.level/100,now,.02);ch.wet.gain.setTargetAtTime(mix.space/100*.7*mix.level/100,now,.03);ch.pan.pan.setTargetAtTime(mix.pan/100,now,.02)}
 for(const role of ROLES)update(role,tracks[role].mix||defaultMix(role));
 function group(t,end){
  if(groups.size>=160)groups.values().next().value.dispose();
  const nodes=[],sources=[];let remaining=0,disposed=false;
  const g={nodes,sources,dispose(){if(disposed)return;disposed=true;for(const s of sources){try{s.stop()}catch{}}for(const n of nodes){try{n.disconnect()}catch{}}groups.delete(g)}};
  groups.add(g);
  g.node=n=>{nodes.push(n);return n};
  g.start=(s)=>{sources.push(s);nodes.push(s);remaining++;s.onended=()=>{remaining--;if(remaining===0)g.dispose()};s.start(t);s.stop(end);return s};
  return g;
 }
 function envelope(param,t,d,p,level){
  const attack=Math.min(p.attack,d*.45),decay=Math.min(p.decay,Math.max(.001,d-attack)*.8),sustain=Math.max(.0001,level*p.sustain);
  param.setValueAtTime(.0001,t);param.exponentialRampToValueAtTime(Math.max(.0002,level),t+Math.max(.001,attack));param.exponentialRampToValueAtTime(sustain,t+Math.max(.002,attack+decay));param.setValueAtTime(sustain,t+d);param.exponentialRampToValueAtTime(.0001,t+d+p.release);
 }
 function tonal(role,n,t,beatSeconds,track){
  const p=soundById(track.sound,role)||soundById(suggestedSound({role,genre:'melodic'}),role),mix=track.mix||defaultMix(role),d=Math.max(.025,n.d*beatSeconds),end=t+d+p.release+.03,g=group(t,end),gain=g.node(ac.createGain()),filter=g.node(ac.createBiquadFilter()),sum=g.node(ac.createGain()),freq=440*Math.pow(2,(n.p-69)/12),vel=n.v/127;
  const base=role==='bass'?.25:role==='chords'?.068:role==='arp'?.1:.14;
  envelope(gain.gain,t,d,p,base*p.level*vel);
  filter.type='lowpass';filter.Q.value=p.resonance;
  const cutoff=clamp(p.cutoff*Math.pow(2,mix.tone/12),60,ac.sampleRate*.43);
  filter.frequency.setValueAtTime(clamp(cutoff*p.filterEnv*(.6+.4*vel),60,ac.sampleRate*.44),t);
  filter.frequency.exponentialRampToValueAtTime(cutoff,t+Math.max(.025,Math.min(d,p.decay)));
  sum.connect(filter);let tail=filter;
  if(p.drive){const shaper=g.node(ac.createWaveShaper());shaper.curve=driveCurve(p.drive);shaper.oversample='2x';tail.connect(shaper);tail=shaper}
  if(p.engine==='formant'){
   const formantSum=g.node(ac.createGain());formantSum.gain.value=.6;
   p.formants.forEach(hz=>{const f=g.node(ac.createBiquadFilter());f.type='bandpass';f.frequency.value=clamp(hz*Math.pow(2,mix.tone/48),100,10000);f.Q.value=5;tail.connect(f);f.connect(formantSum)});tail=formantSum;
  }
  tail.connect(gain);gain.connect(channels[role].input);
  const oscillator=(frequency,wave,weight,detune=0)=>{const osc=ac.createOscillator(),v=g.node(ac.createGain());osc.type=wave;osc.frequency.value=clamp(frequency,1,ac.sampleRate*.44);osc.detune.value=detune;v.gain.value=weight;osc.connect(v);v.connect(sum);return osc};
  if(p.engine==='additive'){
   const weights=p.partials.reduce((s,x)=>s+x[1],0);for(const [ratio,weight] of p.partials)if(freq*ratio<ac.sampleRate*.44)g.start(oscillator(freq*ratio,'sine',weight/weights));
  }else if(p.engine==='fm'){
   const carrier=oscillator(freq,'sine',1),modulator=ac.createOscillator(),depth=g.node(ac.createGain());modulator.type='sine';modulator.frequency.value=Math.min(ac.sampleRate*.4,freq*p.ratio);depth.gain.setValueAtTime(freq*p.index*(.3+.7*vel),t);depth.gain.exponentialRampToValueAtTime(Math.max(.1,freq*p.index*.1),t+Math.max(.04,Math.min(d,p.decay)));modulator.connect(depth);depth.connect(carrier.frequency);g.start(carrier);g.start(modulator);
  }else{
   for(let i=0;i<p.voices;i++){const detune=p.voices===1?0:(i/(p.voices-1)*2-1)*p.detune,osc=oscillator(freq,p.wave,1/p.voices,detune);
    if(p.vibrato){const lfo=ac.createOscillator(),depth=g.node(ac.createGain());lfo.frequency.value=5.2;depth.gain.value=p.vibrato;lfo.connect(depth);depth.connect(osc.detune);g.start(lfo)}g.start(osc);
   }
  }
  if(p.noise){const source=ac.createBufferSource(),v=g.node(ac.createGain());source.buffer=getNoise(ac);source.loop=true;v.gain.value=p.noise;source.connect(v);v.connect(sum);g.start(source)}
 }
 function drum(n,t,track){
  const p=soundById(track.sound,'drums')||DRUM_KITS[0],mix=track.mix||defaultMix('drums'),vel=n.v/127,scale=Math.pow(2,mix.tone/36);
  let duration=n.p===36?p.kickDecay:n.p===46?p.openDecay:n.p===38?p.snareDecay:n.p===39?p.clap:n.p===42||n.p===70?p.hatDecay:.12;
  const g=group(t,t+duration+.05),sum=g.node(ac.createGain()),gain=g.node(ac.createGain()),filter=g.node(ac.createBiquadFilter());
  filter.type='lowpass';filter.frequency.value=clamp(16000*scale,1500,ac.sampleRate*.44);sum.connect(filter);let tail=filter;
  if(p.drive>1){const shape=g.node(ac.createWaveShaper());shape.curve=driveCurve(p.drive);shape.oversample='2x';tail.connect(shape);tail=shape}
  tail.connect(gain);gain.connect(channels.drums.input);
  const level=vel*(n.p===36?.32:n.p===38||n.p===39?.18:.085);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(level,t+.002);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  const tone=(hz,weight,type='sine',fall=null)=>{const osc=ac.createOscillator(),amp=g.node(ac.createGain());osc.type=type;osc.frequency.setValueAtTime(hz,t);if(fall)osc.frequency.exponentialRampToValueAtTime(fall,t+Math.min(.12,duration*.7));amp.gain.value=weight;osc.connect(amp);amp.connect(sum);g.start(osc)};
  const noise=(hz,type,weight)=>{const s=ac.createBufferSource(),f=g.node(ac.createBiquadFilter()),amp=g.node(ac.createGain());s.buffer=getNoise(ac);f.type=type;f.frequency.value=clamp(hz*scale,100,ac.sampleRate*.44);f.Q.value=.8;amp.gain.value=weight;s.connect(f);f.connect(amp);amp.connect(sum);g.start(s)};
  if(n.p===36){tone(p.kick*p.pitchDrop,1,'sine',p.kick);noise(5500,'highpass',.035)}
  else if(n.p===38){tone(p.snare,.35,'triangle',p.snare*.8);noise(1900,'bandpass',p.noise)}
  else if(n.p===39){noise(1500,'bandpass',p.noise);gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(.0001,t);for(let i=0;i<3;i++){gain.gain.linearRampToValueAtTime(level,t+i*.012+.002);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.012+.011)}gain.gain.setValueAtTime(level*.65,t+.038);gain.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.05,duration))}
  else if([42,46,70].includes(n.p)){noise(p.hat,'highpass',p.noise*(1-p.metal*.6));if(p.metal)for(const ratio of [1,1.34,1.83,2.41])tone(3200*ratio,p.metal*.055,'square')}
  else if([45,63,64].includes(n.p)){const hz=n.p===45?125:n.p===63?230:310;tone(hz*1.8,1,'sine',hz);noise(2500,'bandpass',.05)}
  else{tone(n.p===75?1800:n.p===76?850:1000,.55,'triangle');tone(n.p===75?2400:1650,.22);noise(2900,'bandpass',.15)}
 }
 return{
  note(role,n,t,beatSeconds,track){if(stopped)return;if(role==='drums')drum(n,t,track);else tonal(role,n,t,beatSeconds,track)},
  update,level(value){master.gain.setTargetAtTime(value*.55,ac.currentTime,.025)},
  stop(){if(stopped)return;stopped=true;for(const g of [...groups])g.dispose();for(const ch of Object.values(channels))ch.nodes.forEach(n=>n.disconnect());master.disconnect();compressor.disconnect()},
  activeVoices(){return groups.size}
 };
}
Object.assign(Fieldwork,{SOUNDS,DRUM_KITS,soundOptions,soundById,suggestedSound,defaultMix,createSoundEngine});
