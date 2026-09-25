import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const context={module:{exports:{}},TextEncoder};vm.createContext(context);vm.runInContext(['catalog','artists','sounds','engine','artist-engine','audio'].map(x=>fs.readFileSync(path.join(here,x+'.js'),'utf8')).join('\n'),context);const F=context.module.exports;
// A strict Web Audio graph double. Checks scheduling and cleanup; does not render audio.
class Param{
 constructor(){this._value=0;this.events=[]}
 set value(v){assert.ok(Number.isFinite(v),'finite AudioParam value');this._value=v}
 get value(){return this._value}
 event(type,v,t,extra){assert.ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0,'valid automation');if(type==='exponential')assert.ok(v>0);if(type==='target')assert.ok(extra>0);this.events.push({type,v,t});return this}
 setValueAtTime(v,t){return this.event('set',v,t)}
 exponentialRampToValueAtTime(v,t){return this.event('exponential',v,t)}
 linearRampToValueAtTime(v,t){return this.event('linear',v,t)}
 setTargetAtTime(v,t,c){return this.event('target',v,t,c)}
 cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t)}
}
class Node{
 constructor(ac,type){this.ac=ac;this.kind=type;this.connections=[];this.ended=false;for(const key of ['gain','frequency','Q','detune','pan','delayTime','threshold','knee','ratio','attack','release'])this[key]=new Param();ac.nodes.push(this)}
 connect(to){assert.ok(to);this.connections.push(to);return to}
 disconnect(){this.connections=[]}
 start(t){assert.equal(this.startTime,undefined,'a source starts once');assert.ok(Number.isFinite(t)&&t>=0);this.startTime=t;this.ac.sources.push(this)}
 stop(t=this.ac.currentTime){assert.ok(Number.isFinite(t)&&t>=0);this.stopTime=t}
}
class AudioContextDouble{
 constructor(sampleRate=48000){this.sampleRate=sampleRate;this.currentTime=0;this.nodes=[];this.sources=[];this.destination={destination:true}}
 createGain(){return new Node(this,'gain')}
 createDynamicsCompressor(){return new Node(this,'compressor')}
 createStereoPanner(){return new Node(this,'pan')}
 createDelay(){return new Node(this,'delay')}
 createBiquadFilter(){return new Node(this,'filter')}
 createWaveShaper(){return new Node(this,'shaper')}
 createOscillator(){return new Node(this,'oscillator')}
 createBufferSource(){return new Node(this,'buffer')}
 createBuffer(channels,length){const array=new Float32Array(length);return{getChannelData(){return array}}}
 advance(t){this.currentTime=t;for(const s of this.sources)if(!s.ended&&s.stopTime<=t){s.ended=true;s.onended?.()}}
}
function tracks(){return Object.fromEntries(F.ROLES.map(role=>[role,{sound:F.suggestedSound({genre:'melodic',role}),mix:F.defaultMix(role)}]))}
assert.equal(F.SOUNDS.length,48);assert.equal(F.DRUM_KITS.length,16);assert.equal(new Set([...F.SOUNDS,...F.DRUM_KITS].map(s=>s.id)).size,64);
let tonalCases=0,drumCases=0;
for(const patch of F.SOUNDS)for(const role of ['melody','bass','chords','arp'])for(const [pitch,duration] of [[24,.002],[60,.5],[112,8]]){
 const ac=new AudioContextDouble(),ts=tracks();ts[role].sound=patch.id;ts[role].mix.tone=pitch===24?-24:24;
 const engine=F.createSoundEngine(ac,ts,132,.6);engine.note(role,{p:pitch,t:0,d:duration,v:100},.2,.5,ts[role]);assert.equal(engine.activeVoices(),1);assert.ok(ac.sources.length>0,patch.id+' creates sound sources');
 for(const s of ac.sources){assert.ok(s.stopTime>s.startTime,'positive source life');assert.ok(s.connections.length>0,'source connects to graph')}
 ac.advance(20);assert.equal(engine.activeVoices(),0,'notes clean themselves up');engine.stop();assert.ok(ac.nodes.every(n=>n.connections.length===0),'all nodes disconnect');tonalCases++;
}
for(const patch of F.DRUM_KITS){const ac=new AudioContextDouble(44100),ts=tracks();ts.drums.sound=patch.id;const engine=F.createSoundEngine(ac,ts,140,.6);
 for(const pitch of Object.keys(F.DRUM_NAMES).map(Number)){engine.note('drums',{p:pitch,d:.1,t:0,v:110},.1,.43,ts.drums);drumCases++}
 engine.update('drums',{level:0,space:60,pan:-100,tone:-24});engine.level(0);ac.advance(3);assert.equal(engine.activeVoices(),0);engine.stop();assert.ok(ac.nodes.every(n=>!n.connections.length));
}
const ac=new AudioContextDouble(),ts=tracks(),engine=F.createSoundEngine(ac,ts,60);for(let i=0;i<170;i++)engine.note('chords',{p:60+i%12,d:16,v:90},1+i*.01,1,ts.chords);assert.ok(engine.activeVoices()<=160,'voice cap');engine.stop();assert.equal(engine.activeVoices(),0);assert.ok(ac.nodes.every(n=>!n.connections.length));engine.note('bass',{p:40,d:1,v:90},3,1,ts.bass);assert.equal(engine.activeVoices(),0,'stopped engine cannot restart');
console.log(`PASS: ${tonalCases} tonal scheduling cases across 48 patches and four roles, ${drumCases} drum cases across 16 kits, envelope values, natural cleanup, immediate stop, silent mixer and voice cap.`);
console.log('Web Audio graph double only; audible timbre and real-browser performance are not measured by this test.');
