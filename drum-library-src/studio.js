const $=id=>document.getElementById(id),NS=32;
const clone=x=>JSON.parse(JSON.stringify(x));
const S={index:0,take:'Foundation',name:LIB[0].name,fam:LIB[0].fam,bpm:124,swing:52,human:0,kit:'909',volume:65,pat:expand(LIB[0].p),mute:{},solo:{},laneSwing:{},level:{},playing:false};
LANES.forEach(l=>{S.mute[l.id]=false;S.solo[l.id]=false;S.laneSwing[l.id]=l.swing;S.level[l.id]=100;});
let voiceOutput=null,history=[],future=[],paint=null,toastTimer,libraryLimit=12,filterFamily='All',onlySaved=false,favourites=new Set(),sourceHint='';
const STORE='fieldwork-kit-v2',FAV_STORE='fieldwork-kit-favourites-v2';
try{const a=JSON.parse(localStorage.getItem(FAV_STORE)||'[]');if(Array.isArray(a))favourites=new Set(a.filter(id=>LIB.some(p=>p.id===id)));}catch{}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600);}
function snapshot(){const {playing,...state}=S;return clone(state);}
function checkpoint(){history.push(snapshot());if(history.length>70)history.shift();future=[];updateHistory();}
function updateHistory(){$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function restore(state){const was=S.playing;stop();Object.assign(S,clone(state));sourceHint='';syncUI();renderSound();renderLibrary();if(was)start();}
function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop());updateHistory();toast('Previous edit restored.');}
function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop());updateHistory();}
function modify(fn,message){checkpoint();fn();sourceHint='';syncUI();renderSound();if(message)toast(message);}
function loadPattern(index,{play=false,scroll=false,record=true}={}){
 if(record)checkpoint();const was=S.playing;stop();const p=LIB[index];
 Object.assign(S,{index,take:'Foundation',name:p.name,fam:p.fam,bpm:p.bpm,swing:p.swing,kit:p.kit,pat:patternTake(p,'Foundation')});
 LANES.forEach(l=>{S.mute[l.id]=false;S.solo[l.id]=false;S.laneSwing[l.id]=l.swing;S.level[l.id]=100;});
 sourceHint='';syncUI();renderSound();renderLibrary();if(scroll)$('seq').scrollIntoView({block:'start'});if(play||was)start();
}
function syncUI(){
 $('patName').textContent=S.name;$('patFamily').textContent=S.fam;$('patternIndex').textContent=`STUDY ${String(S.index+1).padStart(2,'0')} / ${LIB.length} · ${S.take.toUpperCase()}`;
 $('takeHint').textContent=S.take+' · '+({Foundation:'The full style study. Start here, then make it yours.',Stripped:'Kick, backbeat and one supporting voice. Space for an intro or breakdown.',Displaced:'One supporting lane moves a sixteenth later. Listen to the shifted accents.',Turnaround:'A second-bar fill creates an answer to the first bar.'}[S.take]);
 for(const id of ['bpm','swing','human','kit','take','vol'])$(id).value=S[id==='vol'?'volume':id];
 $('swingv').textContent=S.swing+'%';$('humanv').textContent=S.human+'ms';$('volv').textContent=S.volume;
 $('favourite').textContent=favourites.has(LIB[S.index].id)?'★':'☆';$('favourite').setAttribute('aria-pressed',favourites.has(LIB[S.index].id));$('favourite').setAttribute('aria-label',`Favourite ${LIB[S.index].name}`);
 $('laneLevel').value=S.level[$('euLane').value];$('laneLevelV').textContent=$('laneLevel').value+'%';
 $('nowPlaying').textContent=S.playing?'Playing · '+S.name:'Ready when you are.';drawGrid();updateMix();
}
function activeLanes(pat=S.pat){return LANES.filter(l=>pat[l.id].some(v=>v!=='-'));}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function spliceURL(q){return 'https://splice.com/sounds/search/samples?search='+encodeURIComponent(q);}
function renderSound(){
 const p=LIB[S.index];$('patternDescription').textContent=sourceHint||p.d;$('patternTip').textContent=p.sig.replace(/<[^>]+>/g,'');
 const used=activeLanes();$('soundList').innerHTML=used.length?used.map(l=>{
  const q=soundQuery(p,l.id);return `<div class="sound-item"><div class="sound-item-head"><span><i style="background:${l.c}"></i>${l.name}</span><button data-copy="${l.id}" aria-label="Copy ${l.name} search">Copy</button></div><a class="search-link" href="${escapeHTML(spliceURL(q))}" target="_blank" rel="noopener noreferrer"><span>${escapeHTML(q)}</span><span aria-hidden="true">↗</span></a><small>${p.name==='Amapiano'&&l.id==='tom'?'Use a tuned log drum here; the browser tom only sketches its rhythm.':SOUND_ROLES[l.id][1]}</small></div>`;
 }).join(''):'<p class="sound-help">Add a hit to a lane to see its sound-search guide.</p>';
}
async function copyText(text){try{if(!navigator.clipboard)throw Error();await navigator.clipboard.writeText(text);toast('Copied. Paste into Splice to find your sounds.');}catch{$('copyText').value=text;$('copyDialog').showModal();$('copyText').focus();$('copyText').select();}}
$('copyKit').onclick=()=>copyText(`${LIB[S.index].name} / ${S.bpm} BPM / ${S.take}\nFilter: one-shots\n`+activeLanes().map(l=>l.name+': '+soundQuery(LIB[S.index],l.id)).join('\n'));
$('soundList').onclick=e=>{const b=e.target.closest('[data-copy]');if(b)copyText(soundQuery(LIB[S.index],b.dataset.copy));};
/* Grid: arrow-key navigation, pointer painting and spoken cell states. */
const laneCol=$('laneCol'),stepCol=$('stepCol'),cells={};
function buildGrid(){
 laneCol.innerHTML='<div class="lhead"><span class="lname" style="color:#92a080">VOICE / M S ~</span></div>';
 const ruler=document.createElement('div');ruler.className='ruler';
 for(let s=0;s<NS;s++){const el=document.createElement('i');el.textContent=s%4===0?`${s<16?'A':'B'}${s%16/4+1}`:s%2===0?'&':'';if(s%4===0)el.className='b';ruler.appendChild(el);}stepCol.appendChild(ruler);
 LANES.forEach(l=>{
  const header=document.createElement('div');header.className='lhead';header.innerHTML=`<button class="lname" data-prev="${l.id}" aria-label="Preview ${l.name}">${l.name}</button><button class="lbtn m" data-mute="${l.id}" aria-label="Mute ${l.name}" aria-pressed="false">M</button><button class="lbtn" data-solo="${l.id}" aria-label="Solo ${l.name}" aria-pressed="false">S</button><button class="lbtn sw" data-sw="${l.id}" aria-label="Swing ${l.name}" aria-pressed="${l.swing}">~</button>`;laneCol.appendChild(header);
  const row=document.createElement('div');row.className='row';row.dataset.lane=l.id;row.style.setProperty('--c',l.c);cells[l.id]=[];
  for(let s=0;s<NS;s++){const b=document.createElement('button');b.className='cell'+(s%4===0?' beat':'')+(s===16?' bar1':'');b.dataset.lane=l.id;b.dataset.step=s;b.tabIndex=l.id==='kick'&&s===0?0:-1;cells[l.id].push(b);row.appendChild(b);}stepCol.appendChild(row);
 });const ph=document.createElement('div');ph.className='ph';ph.id='phBar';ph.innerHTML='<i></i>';stepCol.appendChild(ph);
}
const STATE_NAMES={'-':'off',x:'hit',X:'accent',o:'ghost'},CYCLE={'-':'x',x:'X',X:'o',o:'-'};
function drawGrid(){LANES.forEach(l=>{
 cells[l.id].forEach((cell,s)=>{const v=S.pat[l.id][s];cell.classList.toggle('on',v==='x');cell.classList.toggle('acc',v==='X');cell.classList.toggle('gho',v==='o');cell.setAttribute('aria-pressed',v!=='-');cell.setAttribute('aria-label',`${l.name}, bar ${s<16?1:2}, step ${s%16+1}, ${STATE_NAMES[v]}`);});
 for(const [data,key] of [['mute','mute'],['solo','solo'],['sw','laneSwing']])laneCol.querySelector(`[data-${data}="${l.id}"]`).setAttribute('aria-pressed',S[key][l.id]);
 });}
function focusCell(cell){stepCol.querySelectorAll('.cell[tabindex="0"]').forEach(el=>el.tabIndex=-1);cell.tabIndex=0;cell.focus({preventScroll:true});}
function editCell(cell){const {lane,step}=cell.dataset;S.pat[lane][step]=CYCLE[S.pat[lane][step]];drawGrid();renderSound();if(S.pat[lane][step]!=='-')previewVoice(lane,VEL[S.pat[lane][step]]);}
stepCol.addEventListener('pointerdown',e=>{const c=e.target.closest('.cell');if(!c||e.button!==0)return;e.preventDefault();checkpoint();focusCell(c);const {lane,step}=c.dataset;const value=CYCLE[S.pat[lane][step]];paint={value};S.pat[lane][step]=value;drawGrid();if(value!=='-')previewVoice(lane,VEL[value]);stepCol.setPointerCapture(e.pointerId);});
stepCol.addEventListener('pointermove',e=>{if(!paint)return;const c=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell');if(!c||!stepCol.contains(c))return;S.pat[c.dataset.lane][c.dataset.step]=paint.value;drawGrid();});
const finishPaint=()=>{if(paint){paint=null;renderSound();}};
window.addEventListener('pointerup',finishPaint);window.addEventListener('pointercancel',finishPaint);
stepCol.addEventListener('click',e=>{const c=e.target.closest('.cell');if(c&&e.detail===0){checkpoint();editCell(c);}});
stepCol.addEventListener('keydown',e=>{const c=e.target.closest('.cell');if(!c)return;let row=LANES.findIndex(l=>l.id===c.dataset.lane),s=+c.dataset.step;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')s=(s+31)%32;if(e.key==='ArrowRight')s=(s+1)%32;if(e.key==='ArrowUp')row=(row+11)%12;if(e.key==='ArrowDown')row=(row+1)%12;if(e.key==='Home')s=0;if(e.key==='End')s=31;focusCell(cells[LANES[row].id][s]);});
laneCol.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.prev){previewVoice(b.dataset.prev,.85);return;}for(const [data,key] of [['mute','mute'],['solo','solo'],['sw','laneSwing']])if(b.dataset[data])modify(()=>{S[key][b.dataset[data]]=!S[key][b.dataset[data]];});};
/* A short scheduling horizon keeps playback responsive to live edits. Each
   transport run owns a gain bus so Stop also silences already-scheduled hits. */
let timer=null,raf=null,nextT=0,nextStep=0,visualQueue=[],runBus=null,busNodes={},starting=false,audioGeneration=0;
function audible(id){return !S.mute[id]&&(!LANES.some(l=>S.solo[l.id])||S.solo[id]);}
function createRun(){if(runBus){const old=runBus;old.gain.setTargetAtTime(0,AC.currentTime,.005);setTimeout(()=>old.disconnect(),60);}runBus=AC.createGain();runBus.connect(limiter);busNodes={};LANES.forEach(l=>{const g=AC.createGain();g.connect(runBus);busNodes[l.id]=g;});updateMix();}
function updateMix(){if(master)master.gain.value=S.volume/100*.8;LANES.forEach(l=>{if(busNodes[l.id])busNodes[l.id].gain.value=audible(l.id)?S.level[l.id]/100:0;});}
function playVoice(l,t,v){voiceOutput=busNodes[l.id]||limiter;l.play(t,v,KITS[S.kit]);voiceOutput=null;}
async function ensureAudio(){audio();await AC.resume();if(AC.state!=='running')throw Error('Audio is suspended');updateMix();if(!runBus)createRun();}
async function previewVoice(id,v){try{await ensureAudio();playVoice(LANES.find(l=>l.id===id),AC.currentTime+.01,v);}catch{toast('Audio could not start. Try the Play button again.');}}
async function start(){if(S.playing||starting)return;starting=true;const generation=audioGeneration;try{await ensureAudio();if(generation!==audioGeneration)return;createRun();S.playing=true;nextT=AC.currentTime+.065;nextStep=0;visualQueue=[];$('playBtn').textContent='■ STOP';$('playBtn').setAttribute('aria-pressed','true');$('nowPlaying').textContent='Playing · '+S.name;schedule();animate();renderPreviewButtons();}catch{toast('Audio could not start. Check browser audio permissions and try Play.');}finally{starting=false;}}
function stop(){audioGeneration++;starting=false;S.playing=false;clearTimeout(timer);cancelAnimationFrame(raf);timer=raf=null;visualQueue=[];if(runBus){const old=runBus;old.gain.cancelScheduledValues(AC.currentTime);old.gain.setTargetAtTime(0,AC.currentTime,.005);setTimeout(()=>old.disconnect(),60);runBus=null;busNodes={};}if($('playBtn')){$('playBtn').textContent='▶ PLAY';$('playBtn').setAttribute('aria-pressed','false');$('nowPlaying').textContent='Ready when you are.';}stepCol.querySelectorAll('.lit').forEach(c=>c.classList.remove('lit'));renderPreviewButtons();}
function scheduleStep(step,base,sd){LANES.forEach(l=>{const v=S.pat[l.id][step];if(v==='-'||!audible(l.id))return;const swing=S.laneSwing[l.id]&&step%2?sd*(S.swing-50)/50:0;const human=(Math.random()*2-1)*S.human/1000;playVoice(l,Math.max(AC.currentTime+.003,base+swing+human),VEL[v]);});}
function schedule(){if(!S.playing)return;while(nextT<AC.currentTime+.1){const sd=60/S.bpm/4;scheduleStep(nextStep,nextT,sd);visualQueue.push({step:nextStep,time:nextT});nextT+=sd;nextStep=(nextStep+1)%32;}timer=setTimeout(schedule,25);}
function animate(){if(!S.playing)return;let current;while(visualQueue.length&&visualQueue[0].time<=AC.currentTime)current=visualQueue.shift();if(current){stepCol.querySelectorAll('.lit').forEach(c=>c.classList.remove('lit'));LANES.forEach(l=>{if(S.pat[l.id][current.step]!=='-')cells[l.id][current.step].classList.add('lit');});$('phBar').firstChild.style.left=current.step/32*100+'%';}raf=requestAnimationFrame(animate);}
$('playBtn').onclick=()=>S.playing||starting?stop():start();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(S.playing||starting))stop();});
window.addEventListener('pagehide',stop);
/* Parameters and edits. A slider drag is a single undoable action. */
function bounded(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)&&String(value).trim()!==''?Math.max(min,Math.min(max,Math.round(n))):fallback;}
for(const id of ['bpm','swing','human','vol','laneLevel']){
 const el=$(id);let editing=false;const begin=()=>{if(!editing){checkpoint();editing=true;}};
 el.addEventListener('pointerdown',begin);el.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))begin();});
 el.addEventListener('input',()=>{begin();if(id==='bpm')return;const n=+el.value;if(id==='laneLevel')S.level[$('euLane').value]=n;else S[id==='vol'?'volume':id]=n;if(id==='swing')$('swingv').textContent=n+'%';if(id==='human')$('humanv').textContent=n+'ms';if(id==='vol')$('volv').textContent=n;if(id==='laneLevel')$('laneLevelV').textContent=n+'%';updateMix();});
 el.addEventListener('change',()=>{if(id==='bpm'){begin();S.bpm=bounded(el.value,65,190,S.bpm);el.value=S.bpm;}editing=false;});el.addEventListener('blur',()=>editing=false);
}
$('kit').onchange=e=>{checkpoint();S.kit=e.target.value;};
$('take').onchange=e=>{const take=e.target.value;modify(()=>{S.take=take;S.name=LIB[S.index].name;S.pat=patternTake(LIB[S.index],take);},take==='Foundation'?'Foundation restored.':'Take loaded.');};
$('undo').onclick=undo;$('redo').onclick=redo;
$('resetPattern').onclick=()=>modify(()=>{S.pat=patternTake(LIB[S.index],S.take);S.name=LIB[S.index].name;},'Current take restored.');
$('clearAll').onclick=()=>modify(()=>LANES.forEach(l=>S.pat[l.id].fill('-')),'Grid cleared. Undo brings it back.');
$('dblBtn').onclick=()=>modify(()=>LANES.forEach(l=>S.pat[l.id]=S.pat[l.id].slice(0,16).concat(S.pat[l.id].slice(0,16))),'Bar 1 copied to bar 2.');
$('fillBtn').onclick=()=>modify(()=>{const id=S.pat.snare.some(v=>v!=='-')?'snare':'tom';[28,29,30,31].forEach((s,i)=>S.pat[id][s]=i===3?'X':i===0?'o':'x');S.pat.chh[31]='-';S.pat.ohh[31]='-';},'Second-bar turnaround added.');
$('varyBtn').onclick=()=>{
 const candidates=activeLanes().filter(l=>!['kick','clap','snare'].includes(l.id));if(!candidates.length){toast('Add a hat or percussion part first.');return;}
 modify(()=>{const l=candidates[Math.floor(Math.random()*candidates.length)],s=Math.floor(Math.random()*32);S.pat[l.id][s]=CYCLE[S.pat[l.id][s]];for(let j=0;j<2;j++){const step=(s+3+j*7)%32;S.pat[l.id][step]=CYCLE[S.pat[l.id][step]];}},'Texture varied. Kick and backbeat preserved.');
};
function euclid(k,n,rotation=0){const result=Array(n).fill(0);let bucket=n-k;for(let i=0;i<n;i++){bucket+=k;if(bucket>=n){bucket-=n;result[(i+rotation)%n]=1;}}return result;}
$('euGo').onclick=()=>modify(()=>{const k=bounded($('euHits').value,1,16,5),rot=bounded($('euRot').value,0,15,0);$('euHits').value=k;$('euRot').value=rot;const a=euclid(k,16,rot);S.pat[$('euLane').value]=Array.from({length:32},(_,s)=>a[s%16]?(s%4===0?'X':'x'):'-');},'Euclidean rhythm applied to the selected lane.');
$('rotateLane').onclick=()=>modify(()=>{const id=$('euLane').value;S.pat[id]=S.pat[id].slice(-1).concat(S.pat[id].slice(0,-1));},'Lane shifted one sixteenth note.');
$('euLane').onchange=()=>{$('laneLevel').value=S.level[$('euLane').value];$('laneLevelV').textContent=$('laneLevel').value+'%';};
/* Portable, strictly validated sessions. Saving is explicit, including on file://. */
function validateSession(file){
 if(!file||file.format!=='fieldwork-kit'||file.version!==2||!file.state)throw Error('Not a Fieldwork Kit v2 session.');
 const x=file.state,out={};
 for(const [key,min,max] of [['index',0,LIB.length-1],['bpm',65,190],['swing',50,70],['human',0,20],['volume',0,100]]){if(!Number.isInteger(x[key])||x[key]<min||x[key]>max)throw Error('Invalid '+key);out[key]=x[key];}
 if(!KIT_NAMES.includes(x.kit)||!TAKES.includes(x.take))throw Error('Unknown kit or take.');out.kit=x.kit;out.take=x.take;
 if(typeof x.name!=='string'||!x.name.length||x.name.length>160)throw Error('Invalid pattern name.');out.name=x.name;out.fam=LIB[out.index].fam;
 for(const key of ['pat','mute','solo','laneSwing','level']){if(!x[key]||typeof x[key]!=='object')throw Error('Missing '+key);out[key]={};LANES.forEach(l=>{const v=x[key][l.id];if(key==='pat'){if(!Array.isArray(v)||v.length!==32||!v.every(n=>['-','x','X','o'].includes(n)))throw Error('Invalid pattern lane.');out[key][l.id]=v.slice();}else if(key==='level'){if(!Number.isInteger(v)||v<0||v>100)throw Error('Invalid lane level.');out[key][l.id]=v;}else{if(typeof v!=='boolean')throw Error('Invalid lane control.');out[key][l.id]=v;}});}
 return out;
}
function session(){return {format:'fieldwork-kit',version:2,state:snapshot()};}
function download(bytes,type,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);}
function filename(){return S.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,100)+'-'+S.take.toLowerCase();}
$('saveSession').onclick=()=>{try{localStorage.setItem(STORE,JSON.stringify(session()));toast('Session saved in this browser.');}catch{toast('Browser storage unavailable. Use Session file to keep this groove.');}};
$('restoreSession').onclick=()=>{try{const saved=localStorage.getItem(STORE);if(!saved){toast('No saved session yet. Use Save session first.');return;}const data=validateSession(JSON.parse(saved));checkpoint();restore(data);toast('Saved session restored.');}catch{toast('Could not restore this saved session. Your current pattern is unchanged.');}};
$('exportSession').onclick=()=>{download(JSON.stringify(session(),null,2),'application/json',filename()+'.json');toast('Session file exported.');};
$('importSession').onclick=()=>$('sessionFile').click();
$('sessionFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error('File too large.');const data=validateSession(JSON.parse(await f.text()));checkpoint();restore(data);toast('Session opened.');}catch{toast('Cannot open this file. Choose a valid Fieldwork Kit session.');}finally{e.target.value='';}};
/* General MIDI, channel 10. Preserve loop length, swing and audible lane mix. */
function varlen(n){const out=[n&127];while(n>>=7)out.unshift((n&127)|128);return out;}
function midiBytes(state=S){
 const ppq=480,tps=120,events=[],solo=LANES.some(l=>state.solo[l.id]);
 LANES.forEach(l=>{if(state.mute[l.id]||(solo&&!state.solo[l.id])||state.level[l.id]===0)return;state.pat[l.id].forEach((v,s)=>{if(v==='-')return;const t=s*tps+(state.laneSwing[l.id]&&s%2?Math.round(tps*(state.swing-50)/50):0),vel=Math.max(1,Math.round(VEL[v]*118*state.level[l.id]/100));events.push({t,type:0x99,note:l.gm,vel},{t:t+48,type:0x89,note:l.gm,vel:0});});});
 events.sort((a,b)=>a.t-b.t||a.type-b.type);const tempo=Math.round(60000000/state.bpm),trk=[0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255,0,255,88,4,4,2,24,8];let last=0;
 events.forEach(e=>{trk.push(...varlen(e.t-last),e.type,e.note,e.vel);last=e.t;});trk.push(...varlen(3840-last),255,47,0);const n=trk.length;
 return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,ppq>>8,ppq&255,77,84,114,107,(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255,...trk]);
}
$('exportMidi').onclick=()=>{download(midiBytes(),'audio/midi',filename()+'-'+S.bpm+'bpm.mid');toast('Two-bar MIDI exported. Drop it onto a General MIDI drum rack.');};
/* Library: combined search, favourites, density/tempo sorts and progressive loading. */
const FAMS=['All',...new Set(LIB.map(p=>p.fam))];
function hitCount(p){return Object.values(p.p).join('').replace(/-/g,'').length;}
function filteredLibrary(){const words=$('search').value.toLowerCase().trim().split(/\s+/).filter(Boolean);const result=LIB.map((p,i)=>({p,i})).filter(({p})=>(filterFamily==='All'||p.fam===filterFamily)&&(!onlySaved||favourites.has(p.id))&&words.every(w=>(p.name+' '+p.fam+' '+p.tags+' '+p.d+' '+p.kit+' '+Object.keys(p.p).map(k=>soundQuery(p,k)).join(' ')).toLowerCase().includes(w)));const sort=$('sort').value;if(sort==='tempo')result.sort((a,b)=>a.p.bpm-b.p.bpm);if(sort==='name')result.sort((a,b)=>a.p.name.localeCompare(b.p.name));if(sort==='density')result.sort((a,b)=>hitCount(a.p)-hitCount(b.p));return result;}
function renderLibrary(){
 const all=filteredLibrary(),shown=all.slice(0,libraryLimit);$('resultCount').textContent=`${shown.length} of ${all.length} studies · ${all.length*4} available takes`;$('emptyLibrary').hidden=all.length>0;$('showMore').hidden=shown.length===all.length;
 $('showMore').textContent=`Show ${Math.min(12,all.length-shown.length)} more patterns ↓`;
 $('libGrid').innerHTML=shown.map(({p,i})=>`<article class="gcard" style="--family:${FAMILY_COLORS[p.fam]}"><div class="card-meta"><span class="card-family"><i></i>${p.fam} / ${String(i+1).padStart(2,'0')}</span><button class="star" data-fav="${i}" aria-pressed="${favourites.has(p.id)}" aria-label="Favourite ${escapeHTML(p.name)}">${favourites.has(p.id)?'★':'☆'}</button></div><div class="gcard-top"><h3>${p.name}</h3><span class="bpm">${p.bpm} <small>BPM</small></span></div><div class="gcanvas"><canvas data-g="${i}" role="img" aria-label="${escapeHTML(p.name)}: two bars, ${hitCount(p)} hits"></canvas></div><div class="card-tags"><span>${p.swing}% swing</span><span>${hitCount(p)} hits / 2 bars</span><span>${p.kit} kit</span></div><p>${p.d}</p><a class="card-query" href="${escapeHTML(spliceURL(soundQuery(p,'kick')))}" target="_blank" rel="noopener noreferrer"><span>TRY ON SPLICE ↗</span>${escapeHTML(soundQuery(p,'kick'))}</a><div class="card-actions"><button data-load="${i}">Open in playground ↗</button><button data-preview="${i}" aria-label="Preview ${escapeHTML(p.name)}">▶ Preview</button></div></article>`).join('');drawAllCards();renderPreviewButtons();
}
function renderPreviewButtons(){document.querySelectorAll('[data-preview]').forEach(b=>{const active=S.playing&&+b.dataset.preview===S.index;b.textContent=active?'■ Stop':'▶ Preview';b.classList.toggle('preview-active',active);b.setAttribute('aria-label',(active?'Stop ':'Preview ')+LIB[+b.dataset.preview].name);b.setAttribute('aria-pressed',active);});}
function drawCard(cv,p){const dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth||330,h=cv.clientHeight||69;cv.width=w*dpr;cv.height=h*dpr;const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle='#242c22';x.fillRect(0,0,w,h);const used=LANES.filter(l=>p.p[l.id]?.replace(/-/g,'').length),rh=(h-12)/Math.max(1,used.length),cw=(w-16)/32;for(let s=0;s<32;s++){x.fillStyle=s%4===0?'#414b36':'#30392b';x.fillRect(8+s*cw,6,Math.max(1,cw-2),h-12);}used.forEach((l,row)=>{for(let s=0;s<32;s++){const v=p.p[l.id][s];if(v==='-')continue;x.fillStyle=l.c;x.globalAlpha=v==='X'?1:v==='x'?.8:.35;x.fillRect(8+s*cw,6+row*rh,Math.max(1,cw-2),Math.max(2,rh-3));}});x.globalAlpha=1;x.fillStyle='#b8c69e';x.fillRect(w/2,4,1,h-8);}
function drawAllCards(){document.querySelectorAll('canvas[data-g]').forEach(cv=>drawCard(cv,LIB[+cv.dataset.g]));}
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawAllCards,80);});
function toggleFavourite(index){const id=LIB[index].id;if(favourites.has(id))favourites.delete(id);else favourites.add(id);try{localStorage.setItem(FAV_STORE,JSON.stringify([...favourites]));}catch{toast('Favourite updated for this visit; browser storage is unavailable.');}syncUI();renderLibrary();}
$('favourite').onclick=()=>toggleFavourite(S.index);
$('libGrid').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.fav!==undefined){toggleFavourite(+b.dataset.fav);return;}if(b.dataset.load!==undefined){loadPattern(+b.dataset.load,{scroll:true});return;}if(b.dataset.preview!==undefined){const i=+b.dataset.preview;if(S.playing&&S.index===i)stop();else loadPattern(i,{play:true});}};
$('search').oninput=$('sort').onchange=()=>{libraryLimit=12;renderLibrary();};
$('onlyFavourites').onclick=()=>{onlySaved=!onlySaved;$('onlyFavourites').setAttribute('aria-pressed',onlySaved);libraryLimit=12;renderLibrary();};
$('clearFilters').onclick=()=>{filterFamily='All';onlySaved=false;$('search').value='';$('sort').value='curated';$('onlyFavourites').setAttribute('aria-pressed','false');libraryLimit=12;renderFamilyFilters();renderLibrary();};
$('showMore').onclick=()=>{libraryLimit+=12;renderLibrary();};
function renderFamilyFilters(){$('libFilter').innerHTML=FAMS.map(f=>`<button class="tool" data-family="${f}" aria-pressed="${filterFamily===f}">${f}<small>${f==='All'?LIB.length:LIB.filter(p=>p.fam===f).length}</small></button>`).join('');}
$('libFilter').onclick=e=>{const b=e.target.closest('[data-family]');if(b){filterFamily=b.dataset.family;libraryLimit=12;renderFamilyFilters();renderLibrary();}};
$('surprise').onclick=()=>loadPattern((S.index+1+Math.floor(Math.random()*(LIB.length-1)))%LIB.length,{play:true,scroll:true});
/* Morph only changes the workbench when explicitly sent. */
function morphResult(a,b,percent){const A=patternTake(a,'Foundation'),B=patternTake(b,'Foundation'),diff=[],priority={kick:0,snare:1,clap:2,ohh:3};LANES.forEach(l=>{for(let step=0;step<32;step++)if(A[l.id][step]!==B[l.id][step])diff.push({lane:l.id,name:l.name,step,to:B[l.id][step]});});diff.sort((x,y)=>(priority[x.lane]??9)-(priority[y.lane]??9)||x.step-y.step);const applied=Math.round(diff.length*percent/100);diff.slice(0,applied).forEach(d=>A[d.lane][d.step]=d.to);return {pat:A,diff,applied,structure:diff.filter(d=>['kick','snare','clap','ohh'].includes(d.lane)).length,bpm:Math.round(a.bpm+(b.bpm-a.bpm)*percent/100),swing:Math.round(a.swing+(b.swing-a.swing)*percent/100)};}
function renderMorph(){const m=morphResult(LIB[+$('selA').value],LIB[+$('selB').value],+$('morphSl').value);$('diffN').textContent=`${m.applied} / ${m.diff.length} cells`;$('morphPercent').textContent=$('morphSl').value+'%';$('diffList').textContent=m.diff.length?`${m.structure} structural changes, then ${m.diff.length-m.structure} texture changes. ${m.bpm} BPM · ${m.swing}% swing. `+(m.applied?`Latest: ${m.diff[m.applied-1].name}, bar ${Math.floor(m.diff[m.applied-1].step/16)+1}, step ${m.diff[m.applied-1].step%16+1}.`:'Pattern A is intact.'):'Identical grids. Tempo and swing still interpolate between the selected studies.';}
$('selA').onchange=$('selB').onchange=()=>{$('morphSl').value=0;renderMorph();};$('morphSl').oninput=renderMorph;
$('swapAB').onclick=()=>{const a=$('selA').value;$('selA').value=$('selB').value;$('selB').value=a;$('morphSl').value=100-+$('morphSl').value;renderMorph();};
$('morphStruct').onclick=()=>{const m=morphResult(LIB[+$('selA').value],LIB[+$('selB').value],0);$('morphSl').value=m.diff.length?m.structure/m.diff.length*100:0;renderMorph();};
$('morphLoad').onclick=()=>{
 checkpoint();const ai=+$('selA').value,bi=+$('selB').value,pct=+$('morphSl').value,a=LIB[ai],b=LIB[bi],m=morphResult(a,b,pct);stop();S.index=pct<50?ai:bi;S.name=pct===0?a.name:pct===100?b.name:a.name+' × '+b.name;S.fam=LIB[S.index].fam;S.take='Foundation';S.kit=LIB[S.index].kit;S.pat=m.pat;S.bpm=m.bpm;S.swing=m.swing;LANES.forEach(l=>{S.mute[l.id]=S.solo[l.id]=false;S.laneSwing[l.id]=l.swing;S.level[l.id]=100;});sourceHint=`Hybrid: ${a.name} → ${b.name}, ${pct}% across. Sound suggestions use the ${LIB[S.index].name} palette.`;syncUI();renderSound();renderLibrary();$('seq').scrollIntoView({block:'start'});start();toast('Hybrid loaded. Edit it, save it or export the MIDI.');
};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)||e.target.isContentEditable||$('copyDialog').open)return;if(e.code==='Space'){e.preventDefault();S.playing||starting?stop():start();}if(e.key==='/'){e.preventDefault();$('search').focus();$('library').scrollIntoView({block:'start'});}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}});
document.querySelector('a[href="#roles"]').onclick=()=>document.querySelector('.field-notes').open=true;
function init(){
 $('kit').innerHTML=KIT_NAMES.map(k=>`<option>${k}</option>`).join('');
 $('euLane').innerHTML=LANES.map(l=>`<option value="${l.id}">${l.name}</option>`).join('');$('euLane').value='shaker';
 for(const id of ['selA','selB'])$(id).innerHTML=LIB.map((p,i)=>`<option value="${i}">${p.name} · ${p.bpm}</option>`).join('');$('selA').value=5;$('selB').value=13;$('morphSl').step='any';
 buildGrid();renderFamilyFilters();syncUI();renderSound();renderLibrary();renderMorph();
 $('genreTable').innerHTML=LIB.map(p=>{const lanes=expand(p.p),back=lanes.snare.some(v=>v!=='-')?'snare':lanes.clap.some(v=>v!=='-')?'clap':lanes.rim.some(v=>v!=='-')?'rim':null;const positions=back?lanes[back].slice(0,16).map((v,s)=>v!=='-'?s+1:null).filter(Boolean).join(', '):'—';return `<tr><td><b>${p.name}</b></td><td class="num">${p.bpm}</td><td>${p.p.kick===floor?'Four on the floor':'Other placement'}</td><td>${back?back+' · '+positions:'None'}</td><td>${lanes.chh.slice(0,16).filter(v=>v!=='-').length} closed hits / bar 1</td><td class="num">${p.swing}%</td></tr>`;}).join('');
 if(['#roles','#vocab','#numbers'].includes(location.hash))document.querySelector('.field-notes').open=true;
}
init();
