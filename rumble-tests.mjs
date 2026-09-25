import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Dependency-free checks of the actual inline engine; no simulated audio-quality claims.
const html=fs.readFileSync(new URL('./rumble.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(js);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'unique static IDs');
for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(id),'anchor exists: '+id);
for(const [,id] of js.matchAll(/\$\('#([\w-]+)'\)/g))assert(ids.includes(id),'JS target exists: '+id);

const boot=js.indexOf('\ninitSelects(); renderCtrls();');
assert(boot>0);
const elements=new Map();
function element(sel){
  if(!elements.has(sel))elements.set(sel,{value:sel==='#styleFamily'?'all':'',innerHTML:'',textContent:'',hidden:false,dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(){}});
  return elements.get(sel);
}
const context={structuredClone,console,Float32Array,ArrayBuffer,DataView,Math,Number,Object,JSON,URL,Blob,setTimeout,clearTimeout,document:{querySelector:element,querySelectorAll:()=>[]}};
vm.createContext(context);
vm.runInContext(js.slice(0,boot)+'\nglobalThis.test={PRESETS,MODES,CTRLS,S,subEvents,dipEvents,simDuck,makeIR,shaperCurve,encodeWav,validateSession,takeSnapshot,buildNotes,renderLibrary,renderExperiments,showRack,renderSequence,playKick,playSub,scheduleBeat,renderBuf,buildGraph,RACKS,EXPERIMENTS};})();',context);
const t=context.test;
assert.equal(t.PRESETS.length,24);assert.equal(Object.keys(t.MODES).length,10);assert.equal(new Set(t.PRESETS.map(p=>p.id)).size,24);
assert.equal(t.EXPERIMENTS.length,8);assert.equal(Object.keys(t.RACKS).length,4);

let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('24 presets round-trip through strict session validation',()=>{
  for(const p of t.PRESETS){const result=t.validateSession({format:'rumble-lab',version:2,state:{bpm:p.bpm,key:9,tune:0,preset:p.id,P:p}});assert.equal(result.preset,p.id);assert.equal(JSON.stringify(result.P.pattern),JSON.stringify(p.pattern));}
});
check('invalid and injected session properties cannot enter app state',()=>{
  const session={format:'rumble-lab',version:2,state:structuredClone(t.takeSnapshot())};
  for(const mutate of [x=>x.state.P.mode='__proto__',x=>x.state.P.drive=NaN,x=>x.state.P.pattern[2]=9,x=>x.state.bpm=999,x=>x.state.key=2.5,x=>x.version=1]){const x=structuredClone(session);mutate(x);assert.throws(()=>t.validateSession(x));}
  session.state.P.name='<script>alert(1)</script>';session.state.playing=true;session.state.P.__proto__={bad:true};
  const clean=t.validateSession(session);assert(!('playing' in clean));assert(!('name' in clean.P));assert(!('bad' in clean.P));
});
check('session and preset patterns are independent copies',()=>{
  const a=t.takeSnapshot();a.P.pattern[0]=2;assert.equal(t.S.P.pattern[0],0);
  const b=t.validateSession({format:'rumble-lab',version:2,state:t.takeSnapshot()});b.P.pattern[0]=2;assert.equal(t.S.P.pattern[0],0);
});
check('triplets, swing and per-bar patterns schedule at musical positions',()=>{
  const p={...t.PRESETS[0],mode:'triplet',subTune:7};let ev=t.subEvents(p,120,0);
  assert.equal(ev.length,2);assert(Math.abs(ev[0][0]-1/6)<1e-10);assert(Math.abs(ev[1][0]-1/3)<1e-10);assert(Math.abs(ev[0][1]-2**(7/12))<1e-10);
  p.mode='pattern';p.pattern=[0,1,2,0,0,0,0,0,0,0,0,2,0,0,0,0];p.swing=40;p.gate=80;
  ev=t.subEvents(p,120,0);assert.equal(ev.length,2);assert.equal(ev[0][0],.175);assert.equal(ev[0][2],.1);assert.equal(ev[0][3],.48);assert.equal(ev[1][3],1);
  assert.equal(t.subEvents(p,120,1).length,0);assert.equal(t.subEvents(p,120,2).length,1);assert.equal(t.subEvents(p,120,4).length,2);
  p.pattern=Array(16).fill(0);assert.equal(t.subEvents(p,120,0).length,0);
});
check('every mode produces finite in-range pump values across tempo extremes',()=>{
  for(const p of t.PRESETS)for(const bpm of [118,p.bpm,165]){
    const events=t.dipEvents(p,bpm);assert(events.every(([ms,v,tau],i)=>Number.isFinite(ms)&&ms>=0&&ms<60000/bpm&&v>=0&&v<=1&&tau>0&&(!i||ms>=events[i-1][0])));
    const env=t.simDuck(p,bpm,200);assert([...env].every(v=>Number.isFinite(v)&&v>=0&&v<=1.001));
  }
});
check('gated and swell modes have distinct envelope shapes',()=>{
  const p={...t.PRESETS[1],depth:1};p.mode='gated';const gate=t.simDuck(p,132,400);assert(gate[240]>.7);assert(gate[390]<.1);
  p.mode='swell';const swell=t.simDuck(p,132,400);assert(swell[300]>swell[150]);assert(swell[150]>swell[30]);
});
check('IR and waveshaper generation is deterministic, finite and bounded',()=>{
  const ctx={sampleRate:8000,createBuffer:(channels,length,sampleRate)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return {length,sampleRate,getChannelData:i=>data[i]};}};
  const a=t.makeIR(ctx,6,.5),b=t.makeIR(ctx,6,.5);assert.equal(a.length,48000);assert.deepEqual(a.getChannelData(0),b.getChannelData(0));assert(a.getChannelData(0).some(x=>x!==0));assert(a.getChannelData(0).every(Number.isFinite));
  for(const d of [0,.5,1]){const c=t.shaperCurve(d);assert(c.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));assert.equal(c[0],-1);assert.equal(c[c.length-1],1);}
});
check('WAV header, signed PCM, clipping bounds and stem rounding',()=>{
  const mix=[Float32Array.from([0,.4,-.8]),Float32Array.from([.2,-.6,.9])],buf=t.encodeWav(mix,44100,.5),view=new DataView(buf);
  assert.equal(buf.byteLength,56);assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(24,true),44100);assert.equal(view.getUint16(34,true),16);assert.equal(view.getInt16(44,true),0);assert.equal(view.getInt16(46,true),3276);
  const clamp=new DataView(t.encodeWav([Float32Array.from([2]),Float32Array.from([-2])],44100,1));assert.equal(clamp.getInt16(44,true),32767);assert.equal(clamp.getInt16(46,true),-32768);
  const a=[.2,-.4,.1],b=[.3,.2,-.05],read=x=>new DataView(t.encodeWav([Float32Array.from(x),Float32Array.from(x)],44100,.6));
  const av=read(a),bv=read(b),mv=read(a.map((x,i)=>x+b[i]));for(let i=0;i<3;i++)assert(Math.abs(av.getInt16(44+i*4,true)+bv.getInt16(44+i*4,true)-mv.getInt16(44+i*4,true))<=1);
});
check('library filtering and empty result feedback',()=>{
  element('#styleSearch').value='';t.renderLibrary();assert.equal((element('#typeCards').innerHTML.match(/<article/g)||[]).length,24);
  element('#styleFamily').value='Experimental';t.renderLibrary();assert.equal((element('#typeCards').innerHTML.match(/<article/g)||[]).length,4);
  element('#styleFamily').value='all';element('#styleSearch').value='ceramic';t.renderLibrary();assert(element('#typeCards').innerHTML.includes('Ceramic teeth'));assert(element('#styleCount').textContent.startsWith('1 /'));
  element('#styleSearch').value='no-such-sound';t.renderLibrary();assert.equal(element('#styleEmpty').hidden,false);assert.equal(element('#typeCards').innerHTML,'');
});
check('rack builds, experiment cards, pattern UI and complete notes render',()=>{
  for(const id of Object.keys(t.RACKS)){t.showRack(id);assert(element('#rackRecipe').innerHTML.includes(t.RACKS[id].title));assert.equal((element('#rackRecipe').innerHTML.match(/<li>/g)||[]).length,5);}
  t.renderExperiments();assert.equal((element('#experimentCards').innerHTML.match(/<article/g)||[]).length,8);
  t.renderSequence();assert.equal((element('#sequence').innerHTML.match(/data-step=/g)||[]).length,16);
  const notes=t.buildNotes();for(const r of Object.values(t.RACKS))assert(notes.includes(r.title));for(const e of t.EXPERIMENTS)assert(notes.includes(e[1]));assert(notes.includes('16 steps'));assert(notes.includes('55.00 Hz'));
});

// Audio API contract checks: detect invalid event times/values without claiming to render sound.
class Param{
  value=0;events=[];
  setValueAtTime(v,t){this.add('set',v,t);}
  linearRampToValueAtTime(v,t){this.add('linear',v,t);}
  exponentialRampToValueAtTime(v,t){assert(v>0);this.add('exponential',v,t);}
  setTargetAtTime(v,t,tau){assert(Number.isFinite(tau)&&tau>0);this.add('target',v,t);}
  add(kind,v,time){assert(Number.isFinite(v));assert(Number.isFinite(time)&&time>=0);this.events.push({kind,v,time});}
}
class AudioMock{
  currentTime=0;sampleRate=8000;nodes=[];
  node(type){const n={kind:type,type,gain:new Param(),frequency:new Param(),Q:new Param(),delayTime:new Param(),connect:()=>{},start:t=>{assert(t>=0);n.started=t;},stop:t=>{assert(t>=n.started);n.stopped=t;}};this.nodes.push(n);return n;}
  createGain(){return this.node('gain');}createOscillator(){return this.node('oscillator');}createBufferSource(){return this.node('buffer');}createBiquadFilter(){return this.node('filter');}createDelay(){return this.node('delay');}createConvolver(){return this.node('convolver');}createWaveShaper(){return this.node('shaper');}
  createBuffer(channels,len,sr){const data=Array.from({length:channels},()=>new Float32Array(len));return {getChannelData:i=>data[i]};}
}
check('all 24 graphs schedule four bars without invalid AudioParam events',()=>{
  for(const p of t.PRESETS){const ctx=new AudioMock(),n=t.buildGraph(ctx,{});for(let i=0;i<16;i++)t.scheduleBeat(ctx,n,p,55,p.bpm,i*60/p.bpm,{beatIndex:i});assert(ctx.nodes.some(n=>n.kind==='oscillator'));assert(ctx.nodes.filter(n=>n.kind==='oscillator').every(n=>n.stopped>n.started));}
});
const offlineContexts=[];
class OfflineMock extends AudioMock{
  constructor(channels,length,sampleRate){super();Object.assign(this,{channels,length,sampleRate});offlineContexts.push(this);}
  async startRendering(){return {getChannelData:()=>new Float32Array(this.length)};}
}
context.window={OfflineAudioContext:OfflineMock};
const snapshot={...t.takeSnapshot(),P:structuredClone(t.PRESETS.find(p=>p.id==='breath'))};snapshot.bpm=120;
const rendered=await t.renderBuf('rumble',snapshot),offline=offlineContexts.at(-1);
check('offline contract keeps four exact bars after full long-reverb warm-up',()=>{
  assert.equal(rendered.len,8*44100);assert.equal(rendered.chans[0].length,rendered.len);assert.equal(rendered.chans[1].length,rendered.len);
  const warmSeconds=offline.length/44100-8;assert(warmSeconds>snapshot.P.size);assert.equal(warmSeconds%2,0);
  assert.equal(offline.nodes.find(n=>n.kind==='shaper').curve[0],-1);
});

// Exercise the complete initializer and event callbacks using a small DOM contract stub.
const domNodes=new Map();
const paint=new Proxy({}, {get:()=>()=>{}});
function domNode(selector){
  if(!domNodes.has(selector))domNodes.set(selector,{value:selector==='#styleFamily'?'all':'',innerHTML:'',textContent:'',hidden:false,disabled:false,style:{},width:0,height:0,clientWidth:480,dataset:{},listeners:new Map(),classList:{toggle(){},add(){},remove(){}},setAttribute(){},getContext:()=>paint,addEventListener(event,fn){this.listeners.set(event,fn);},focus(){},querySelector:domNode});
  return domNodes.get(selector);
}
const uiContext={structuredClone,console,Float32Array,ArrayBuffer,DataView,Math,Number,Object,JSON,URL,Blob,setTimeout,clearTimeout,requestAnimationFrame:()=>{},window:{devicePixelRatio:1,addEventListener(){}},document:{querySelector:domNode,querySelectorAll:()=>[],addEventListener(){}}};
vm.createContext(uiContext);
vm.runInContext(js.replace('\ninitSelects(); renderCtrls();','\nglobalThis.app={S,loadPreset,takeSnapshot};\ninitSelects(); renderCtrls();'),uiContext);
check('complete page initialization creates default library and pattern controls',()=>{
  assert.equal(uiContext.app.S.preset,'ware');assert.equal((domNode('#typeCards').innerHTML.match(/<article/g)||[]).length,24);assert.equal((domNode('#sequence').innerHTML.match(/data-step=/g)||[]).length,16);assert(domNode('#beatMs').textContent.includes('132'));
});
check('A/B swaps full sound settings and pattern without changing output volume',()=>{
  const a=uiContext.app.takeSnapshot();domNode('#storeA').listeners.get('click')();assert.equal(domNode('#swapA').disabled,false);
  uiContext.app.loadPreset('ceramic');uiContext.app.S.vol=.25;domNode('#swapA').listeners.get('click')();assert.equal(uiContext.app.S.preset,a.preset);assert.equal(uiContext.app.S.vol,.25);
  domNode('#swapA').listeners.get('click')();assert.equal(uiContext.app.S.preset,'ceramic');
});
check('variation keeps tempo, key and kick, while pattern controls update state',()=>{
  const before=uiContext.app.takeSnapshot();domNode('#mutate').listeners.get('click')();const after=uiContext.app.takeSnapshot();assert.equal(after.bpm,before.bpm);assert.equal(after.key,before.key);for(const c of t.CTRLS[0].items)assert.equal(after.P[c.k],before.P[c.k]);
  domNode('#enablePattern').listeners.get('click')();assert.equal(uiContext.app.S.P.mode,'pattern');domNode('#swing').listeners.get('input')({target:{value:'35'}});assert.equal(uiContext.app.S.P.swing,35);assert.equal(domNode('#swingV').textContent,'35%');
});
const badInput={target:{files:[{size:5,text:async()=>'{oops'}],value:'bad.json'}};const beforeImport=JSON.stringify(uiContext.app.takeSnapshot());
await domNode('#sessionFile').listeners.get('change')(badInput);
check('failed file import leaves the current sound intact and reports an error',()=>{assert.equal(JSON.stringify(uiContext.app.takeSnapshot()),beforeImport);assert(domNode('#sessionStatus').textContent.startsWith('Could not load:'));assert.equal(badInput.target.value,'');});

console.log(`\n${checks} groups passed. Browser rendering, listening and real OfflineAudioContext rendering still require a browser.`);
