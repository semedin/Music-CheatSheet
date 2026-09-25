const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let selectedNote=-1,libraryPage=0,history=[],future=[],toastTimer,drag=null;
let favorites=new Set();try{const f=JSON.parse(localStorage.getItem('fieldwork-v2-favorites')||'[]');if(Array.isArray(f))favorites=new Set(f.filter(id=>PRESETS.some(p=>p.id===id)))}catch{}
const initial=PRESETS.find(p=>p.genre==='melodic'&&p.role===(PAGE==='studio'?'melody':PAGE)&&p.variation===0);
let S={version:2,config:factoryConfig(initial),active:initial.role,tracks:{}};
function setTrack(role,p){S.tracks[role]={preset:p.id,notes:generate(p,S.config),locked:false,mute:false,solo:false,sound:suggestedSound(p),mix:defaultMix(role)}}
ROLES.forEach(role=>setTrack(role,PRESETS.find(p=>p.genre==='melodic'&&p.role===role&&p.variation===0)));
function presetFor(role=S.active){return PRESETS.find(p=>p.id===S.tracks[role].preset)}
function toast(message){$('toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',5500)}
function remember(){history.push(clone(S));if(history.length>40)history.shift();future=[]}
function change(fn){stopAudio();remember();fn();selectedNote=-1;render()}
function regenerate(all=false){ROLES.forEach(role=>{if(all||!S.tracks[role].locked)S.tracks[role].notes=generate(presetFor(role),S.config)})}
function renderControls(){
 for(const id of ['genre','root','mode','bpm','bars','mood','density','gate','swing','human','seed','form','voicing'])$(id).value=S.config[id];
 $('artistScene').value=S.config.artist||'';
 ['density','gate','swing','human'].forEach(id=>$(id+'Out').textContent=S.config[id]+'%');
 $('progression').innerHTML=S.config.progression.map((d,i)=>`<select aria-label="Chord ${i+1} scale degree" data-chord="${i}">${Array.from({length:7},(_,j)=>`<option value="${j}" ${j===d?'selected':''}>${['1','2','3','4','5','6','7'][j]}</option>`).join('')}</select>`).join('');
 $('chordLabel').textContent=progressionLabel(S.config);
 $('undo').disabled=!history.length;$('redo').disabled=!future.length;
}
function renderTracks(){
 $('tracks').innerHTML=ROLES.map(role=>{const t=S.tracks[role],p=presetFor(role);return `<div class="track ${S.active===role?'active':''}" style="--track:var(--${role})"><div class="track-head"><span class="swatch"></span><button class="select-track" data-role="${role}" aria-pressed="${S.active===role}">${ROLE_NAMES[role]}</button></div><p class="track-name" title="${escapeHTML(p.name)}">${escapeHTML(p.name.split(' / ')[0])} · ${t.notes.length}</p><select class="track-sound" data-sound-role="${role}" aria-label="${ROLE_NAMES[role]} instrument">${soundSelectOptions(role,t.sound)}</select><div class="track-buttons"><button data-role="${role}" data-toggle="mute" aria-label="Mute ${role}" aria-pressed="${t.mute}">M</button><button data-role="${role}" data-toggle="solo" aria-label="Solo ${role}" aria-pressed="${t.solo}">S</button><button data-role="${role}" data-toggle="locked" aria-label="Lock ${role}" aria-pressed="${t.locked}">${t.locked?'Locked':'Lock'}</button></div></div>`}).join('');
}
function soundSelectOptions(role,selected){const list=soundOptions(role);return [...new Set(list.map(s=>s.group))].map(group=>`<optgroup label="${escapeHTML(group)}">${list.filter(s=>s.group===group).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}</optgroup>`).join('')}
function renderSound(){const t=S.tracks[S.active],patch=soundById(t.sound,S.active);$('soundName').textContent=ROLE_NAMES[S.active]+' / '+patch.name;$('soundDescription').textContent=patch.desc;for(const key of ['level','tone','space','pan']){$('mix-'+key).value=t.mix[key];$('mix-'+key+'-out').textContent=t.mix[key]+(key==='tone'?' st':key==='pan'?'':'%')}}
function changeSound(role,id){if(!soundById(id,role))return;remember();S.tracks[role].sound=id;S.active=role;selectedNote=-1;render();toast(soundById(id,role).name+' selected. MIDI notes are unchanged.')}
let rollGeometry;
function drawRoll(){
 const ns=S.tracks[S.active].notes,drums=S.active==='drums',W=Math.max(280,$('roll').clientWidth||1200),H=320,left=58,top=25,bottom=23,total=S.config.bars*4;
 $('roll').setAttribute('viewBox',`0 0 ${W} ${H}`);
 let rows;
 if(drag?.rows)rows=drag.rows;
 else if(drums)rows=Array.from(new Set([...Object.keys(DRUM_NAMES).map(Number),...ns.map(n=>n.p)])).sort((a,b)=>b-a);
 else{const min=ns.length?Math.min(...ns.map(n=>n.p)):60,max=ns.length?Math.max(...ns.map(n=>n.p)):72;let low=Math.max(0,min-2),high=Math.min(127,Math.max(max+2,low+18));if(high-low>48){low=min;high=max}rows=Array.from({length:high-low+1},(_,i)=>high-i)}
 const rh=(H-top-bottom)/rows.length,bw=(W-left)/total;
 rollGeometry={rows,rh,bw,left,top,total,W,H};
 let svg=`<rect width="${W}" height="320" fill="#171e22"/>`;
 rows.forEach((p,i)=>{const y=top+i*rh,inScale=MODES[S.config.mode].includes(mod(p-S.config.root,12)),root=mod(p-S.config.root,12)===0;
  svg+=`<rect x="${left}" y="${y}" width="${W-left}" height="${rh}" fill="${drums?(i%2?'#202a2e':'#1a2327'):root?'#303d37':inScale?'#202a2e':'#192125'}"/><line x1="${left}" y1="${y+rh}" x2="${W}" y2="${y+rh}" stroke="#2b3438" stroke-width=".5"/>`;
  if(drums||rh>12||root)svg+=`<text x="${left-7}" y="${y+rh*.72}" fill="${root?'#c0d3bd':'#94a4a8'}" text-anchor="end" font-size="${drums?10:11}" font-family="Consolas,monospace">${drums?(DRUM_NAMES[p]||p):noteName(p)}</text>`;
 });
 for(let step=0;step<=total*4;step++){const x=left+step/4*bw;svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${H-bottom}" stroke="${step%16===0?'#65706e':step%4===0?'#3e4a4c':'#2a3438'}" stroke-width="${step%16===0?1.4:.65}"/>`;if(step%16===0&&step<total*4)svg+=`<text x="${x+5}" y="16" fill="#b6c1bd" font-size="12" font-family="Consolas,monospace">${step/16+1}</text>`}
 const color={melody:'#ffc96e',bass:'#a4d2ba',chords:'#a9b9ee',arp:'#ef9d87',drums:'#c5cbd0'}[S.active];
 ns.forEach((n,i)=>{const row=rows.indexOf(n.p),x=left+n.t*bw,y=top+row*rh;svg+=`<rect data-note="${i}" class="note ${selectedNote===i?'selected-note':''}" x="${x+.5}" y="${y+1}" width="${Math.max(3,Math.min(n.d*bw-1,W-x-1))}" height="${Math.max(2,rh-2)}" rx="1.6" fill="${color}" fill-opacity="${.4+n.v/127*.6}"><title>${noteName(n.p)} · beat ${n.t.toFixed(2)} · ${n.d.toFixed(2)} beats · velocity ${n.v}</title></rect>`});
 svg+=`<line id="playhead" x1="${left}" x2="${left}" y1="${top}" y2="${H-bottom}" stroke="#f2f2e4" stroke-width="2" opacity="0"/>`;
 $('roll').innerHTML=svg;
}
function renderNoteTools(){
 const ns=S.tracks[S.active].notes;selectedNote=selectedNote>=ns.length?-1:selectedNote;
 $('noteSelect').innerHTML='<option value="-1">Select a note…</option>'+ns.map((n,i)=>`<option value="${i}">${i+1}. ${S.active==='drums'?(DRUM_NAMES[n.p]||noteName(n.p)):noteName(n.p)} · ${(n.t+1).toFixed(2)}</option>`).join('');$('noteSelect').value=selectedNote;
 const n=ns[selectedNote];
 for(const [id,key] of [['notePitch','p'],['noteTime','t'],['noteLength','d'],['noteVelocity','v']]){$(id).value=n?+(n[key].toFixed(3)):'';$(id).disabled=!n}
 $('deleteNote').disabled=!n;$('noteTime').max=S.config.bars*4-.01;$('noteLength').max=n?S.config.bars*4-n.t:S.config.bars*4;
}
function renderRecipe(){
 const p=presetFor(),g=genreOf(p),a=p.artist?artistOf(p):null,ns=S.tracks[S.active].notes,variation=treatmentFor(p);
 $('partTitle').textContent=ROLE_NAMES[S.active]+' / '+p.name.split(' / ')[0];
 $('partMeta').textContent=`${NOTE_NAMES[S.config.root]} ${MODE_NAMES[S.config.mode]} · ${S.config.bars} bars · ${ns.length} notes · ${variation.name}`;
 $('recipeTitle').textContent=(a?a.name+' / '+a.focus:g.name)+' · '+variation.name;
 $('recipeText').textContent=variation.desc+' '+(a?a.traits[ROLES.indexOf(S.active)]:g.tip);
 $('technique').textContent=p.technique+' / '+p.mood;
 $('inspiration').textContent=a?'Original study inspired by '+a.name+'. Each part has its own rhythmic and harmonic recipe.':'Listening references: '+g.artist+'. Original recipe; no song notes copied.';
 if(a?.source)$('inspiration').innerHTML+=` <a href="${escapeHTML(a.source)}" target="_blank" rel="noopener noreferrer">Reference ↗</a>`;
 $('soundText').textContent=g.sound;
 $('partAdvice').textContent={melody:'Try removing every third note, then change only the final two notes of your phrase. The rests are part of the melody.',bass:'Keep the fundamental mono. Match bass release to the space before the next kick. Add glide in the instrument, where it belongs.',chords:'Compare root position with nearest inversion. Keep the top voice intentional; ninths add colour, but density should suit the patch.',arp:'An arpeggio is the motion layer. Try muting the melody while the arp speaks, then trade roles halfway through the phrase.',drums:'Map exported pitches to Drum Rack pads. Mute extra percussion until the kick, snare and hats already move.'}[S.active];
 document.querySelectorAll('[data-transform="invert"],[data-transform="up"],[data-transform="down"]').forEach(b=>b.disabled=S.active==='drums');
}
const searchText=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function filteredPresets(){const query=searchText($('search').value);return PRESETS.filter(p=>{
 const g=genreOf(p),a=p.artist?artistOf(p):null;return(!$('filterCollection').value||($('filterCollection').value==='artists'?!!p.artist:!p.artist))&&(!$('filterArtist').value||p.artist===$('filterArtist').value)&&(!$('filterGenre').value||p.genre===$('filterGenre').value)&&(!$('filterRole').value||p.role===$('filterRole').value)&&(!$('filterMood').value||p.mood===$('filterMood').value)&&(!$('filterTechnique').value||p.technique===$('filterTechnique').value)&&(!$('onlyFavorites').checked||favorites.has(p.id))&&(!query||searchText(`${p.name} ${g.name} ${a?a.name+' '+a.focus:g.artist} ${p.technique} ${p.mood} ${p.role}`).includes(query));
})}
const miniatureCache=new Map();
function miniature(p){if(!miniatureCache.has(p.id)){
 const notes=generate(p,factoryConfig(p)).filter(n=>n.t<8),bins=Array(32).fill(0);
 notes.forEach(n=>{const i=clamp(Math.round(n.t*4),0,31);bins[i]=Math.max(bins[i],n.v)});
 miniatureCache.set(p.id,bins.map(v=>`<i style="height:${v?Math.round(v/127*20):2}px;opacity:${v?.8:.12}"></i>`).join(''));
 }return miniatureCache.get(p.id)}
function renderLibrary(){
 const all=filteredPresets(),size=16,pages=Math.max(1,Math.ceil(all.length/size));libraryPage=clamp(libraryPage,0,pages-1);
 $('libraryCount').textContent=all.length+' recipes';$('pageInfo').textContent=`${libraryPage+1} / ${pages}`;$('prevPage').disabled=libraryPage===0;$('nextPage').disabled=libraryPage===pages-1;$('exportFiltered').disabled=!all.length;
 $('catalog').innerHTML=all.slice(libraryPage*size,(libraryPage+1)*size).map(p=>{const g=genreOf(p),a=p.artist?artistOf(p):null;return `<article class="preset ${S.tracks[p.role].preset===p.id?'selected':''}"><button class="load" data-preset="${p.id}" aria-label="Load ${escapeHTML(p.name)} ${p.role} into current sketch"><span class="type">${escapeHTML(a?a.focus:g.name)} / ${ROLE_NAMES[p.role]}</span><strong>${escapeHTML(p.name)}</strong></button><button class="star" data-favorite="${p.id}" aria-pressed="${favorites.has(p.id)}" aria-label="Favourite ${escapeHTML(p.name)} ${p.role}">${favorites.has(p.id)?'★':'☆'}</button><div class="miniseq" aria-hidden="true">${miniature(p)}</div><p>${p.mood} · ${a?.bpm||g.bpm} BPM · ${p.technique}</p></article>`}).join('')||'<div class="empty">No recipes match. Try another emotion or reset the filters.</div>';
}
function render(){renderControls();renderTracks();renderSound();drawRoll();renderNoteTools();renderRecipe();renderLibrary()}
function loadPreset(id){const p=PRESETS.find(p=>p.id===id);if(S.tracks[p.role].locked){toast(`Unlock ${ROLE_NAMES[p.role]} before replacing its recipe.`);return}change(()=>{S.active=p.role;const flags=S.tracks[p.role];S.tracks[p.role]={...flags,preset:p.id,notes:generate(p,S.config)}});toast(`${ROLE_NAMES[p.role]} loaded in your current key and harmony.`)}
function audibleRoles(){const solo=ROLES.some(r=>S.tracks[r].solo);return ROLES.filter(r=>!S.tracks[r].mute&&(!solo||S.tracks[r].solo))}
function exportTracks(roles){return roles.map(role=>({role,name:ROLE_NAMES[role]+' / '+presetFor(role).name,notes:S.tracks[role].notes}))}
function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Downloaded '+name)}
function filename(label){return `Fieldwork_${slug(label)}_${slug(NOTE_NAMES[S.config.root])}-${S.config.mode}_${S.config.bpm}bpm_${S.config.bars}bar`}
async function exportPack(kind){const presets=kind==='genres'?GENRE_PRESETS:kind==='artists'?ARTIST_PRESETS:filteredPresets();if(!presets.length)return;const button=$(kind==='genres'?'exportAll':kind==='artists'?'exportArtists':'exportFiltered');button.disabled=true;toast(`Preparing ${presets.length} recipes…`);await new Promise(resolve=>setTimeout(resolve,40));try{const files=kind==='artists'?artistPackFiles():packFiles(presets,kind==='genres');download(zipBytes(files),kind==='genres'?'Fieldwork-V2-504-MIDI-Library.zip':kind==='artists'?'Fieldwork-V2-Artist-Studies-1312-MIDI.zip':`Fieldwork-V2-${presets.length}-recipes.zip`,'application/zip')}catch(err){toast('Could not create the pack: '+err.message)}finally{button.disabled=false}}
function sessionText(){return JSON.stringify(S,null,2)}
function validateSession(value){
 if(!value||value.version!==2||!value.config||!value.tracks||!ROLES.includes(value.active))throw Error('This is not a Fieldwork V2 session.');
 const c=value.config;
 const bounded=(key,a,b,integer=false)=>{if(typeof c[key]!=='number'||!Number.isFinite(c[key])||c[key]<a||c[key]>b||(integer&&!Number.isInteger(c[key])))throw Error('Invalid session setting: '+key)};
 bounded('root',0,11,true);bounded('bpm',60,200);bounded('seed',0,999999999,true);bounded('density',30,150);bounded('gate',20,150);bounded('swing',0,60);bounded('human',0,30);
 if(![4,8,16].includes(c.bars)||!Object.hasOwn(MODES,c.mode)||!Object.hasOwn(MOODS,c.mood)||!GENRES.some(g=>g.id===c.genre)||!['AABA','ABAC','lift','breakdown','loop'].includes(c.form)||!['auto','root','open','strum'].includes(c.voicing)||!Array.isArray(c.progression)||c.progression.length!==4||c.progression.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Invalid key, harmony or phrase settings.');
 const clean={version:2,active:value.active,config:{},tracks:{}};
 for(const key of ['genre','root','mode','bpm','bars','progression','mood','density','gate','swing','human','seed','form','voicing'])clean.config[key]=clone(c[key]);
 if(c.artist!=null&&!ARTISTS.some(a=>a.id===c.artist))throw Error('Invalid artist study.');
 clean.config.artist=c.artist||null;
 for(const role of ROLES){const t=value.tracks[role];if(!t||!PRESETS.some(p=>p.id===t.preset&&p.role===role)||!Array.isArray(t.notes)||t.notes.length>20000)throw Error('Invalid '+role+' track.');
  for(const n of t.notes)if(!n||!['t','d','p','v'].every(k=>typeof n[k]==='number'&&Number.isFinite(n[k]))||n.t<0||n.t>=c.bars*4||n.d<=0||n.t+n.d>c.bars*4+.002||!Number.isInteger(n.p)||n.p<0||n.p>127||!Number.isInteger(n.v)||n.v<1||n.v>127)throw Error('Invalid note in '+role+'.');
  const preset=PRESETS.find(p=>p.id===t.preset),soundId=t.sound??suggestedSound(preset),mix=t.mix??defaultMix(role);
  if(!soundById(soundId,role))throw Error('Invalid instrument on '+role+'.');
  const safeMix={};for(const [key,min,max] of [['level',0,100],['tone',-24,24],['space',0,60],['pan',-100,100]]){if(typeof mix[key]!=='number'||!Number.isFinite(mix[key])||mix[key]<min||mix[key]>max)throw Error('Invalid mixer setting.');safeMix[key]=mix[key]}
  clean.tracks[role]={preset:t.preset,notes:tidyNotes(t.notes,c.bars*4),locked:t.locked===true,mute:t.mute===true,solo:t.solo===true,sound:soundId,mix:safeMix};
 }return clean;
}
function importSession(text){const next=validateSession(JSON.parse(text));change(()=>S=next);toast('Session restored, including edited notes and track locks.')}
// Web Audio: lookahead scheduling, an isolated gain bus per playback, immediate stop and cleanup.
let audioContext,previewEngine,audioTimer,audioFrame,audioToken=0,playing=false,playStart=0,scheduleIndex=0,scheduleCycle=0,scheduledEvents=[];
function soundNote(role,n,t,beatSeconds){previewEngine.note(role,n,t,beatSeconds,S.tracks[role])}
function scheduleAudio(){if(!playing)return;const beatSeconds=60/S.config.bpm,total=S.config.bars*4;while(scheduledEvents.length){const e=scheduledEvents[scheduleIndex],t=playStart+(scheduleCycle*total+e.n.t)*beatSeconds;if(t>audioContext.currentTime+.13)break;if(t>=audioContext.currentTime-.02)soundNote(e.role,e.n,Math.max(t,audioContext.currentTime),beatSeconds);scheduleIndex++;if(scheduleIndex>=scheduledEvents.length){scheduleIndex=0;scheduleCycle++}}}
function animateAudio(){if(!playing)return;const beat=mod((audioContext.currentTime-playStart)*S.config.bpm/60,S.config.bars*4),step=Math.floor(beat*4);$('position').textContent=`${Math.floor(beat/4)+1} . ${Math.floor(beat%4)+1} . ${step%4+1}`;const line=$('playhead');if(line&&rollGeometry){const x=rollGeometry.left+beat*rollGeometry.bw;line.setAttribute('x1',x);line.setAttribute('x2',x);line.setAttribute('opacity','1')}audioFrame=requestAnimationFrame(animateAudio)}
function stopAudio(){audioToken++;playing=false;clearInterval(audioTimer);cancelAnimationFrame(audioFrame);previewEngine?.stop();previewEngine=null;$('play').textContent='▶ Play sketch';$('play').setAttribute('aria-label','Play sketch');$('position').textContent='1 . 1 . 1';$('playhead')?.setAttribute('opacity','0')}
async function playAudio(){if(playing){stopAudio();return}const token=++audioToken;try{
 const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)throw Error('Web Audio is unavailable in this browser.');
 if(!audioContext)audioContext=new AudioCtor();await audioContext.resume();if(token!==audioToken)return;
 scheduledEvents=audibleRoles().flatMap(role=>S.tracks[role].notes.map(n=>({role,n}))).sort((a,b)=>a.n.t-b.n.t);if(!scheduledEvents.length){toast('No audible notes. Unmute a part or add some notes.');return}
 previewEngine=createSoundEngine(audioContext,S.tracks,S.config.bpm,+$('volume').value/100);
 playing=true;playStart=audioContext.currentTime+.06;scheduleIndex=0;scheduleCycle=0;$('play').textContent='■ Stop';$('play').setAttribute('aria-label','Stop playback');scheduleAudio();audioTimer=setInterval(scheduleAudio,25);animateAudio();
 }catch(err){stopAudio();toast('Preview unavailable: '+err.message)}}
function pointInRoll(event){const point=$('roll').createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform($('roll').getScreenCTM().inverse())}
function editSelected(fn){if(selectedNote<0)return;const index=selectedNote;stopAudio();remember();fn(S.tracks[S.active].notes[index]);S.tracks[S.active].notes=tidyNotes(S.tracks[S.active].notes,S.config.bars*4);selectedNote=clamp(index,-1,S.tracks[S.active].notes.length-1);render()}
function deleteSelected(){if(selectedNote<0)return;const i=selectedNote;change(()=>S.tracks[S.active].notes.splice(i,1))}
function initialize(){
 document.querySelector(`[data-page="${PAGE}"]`)?.setAttribute('aria-current','page');
 const opts=(items)=>items.map(([v,n])=>`<option value="${v}">${escapeHTML(n)}</option>`).join('');
 $('genre').innerHTML=opts(GENRES.map(g=>[g.id,g.name]));$('filterGenre').innerHTML+=opts(GENRES.map(g=>[g.id,g.name]));
 const artistOptions=opts(ARTISTS.map(a=>[a.id,a.name+' / '+a.focus]));$('filterArtist').innerHTML+=artistOptions;$('artistScene').innerHTML+=artistOptions;
 $('root').innerHTML=opts(NOTE_NAMES.map((n,i)=>[i,n]));$('mode').innerHTML=opts(Object.entries(MODE_NAMES));$('mood').innerHTML=opts(Object.keys(MOODS).map(n=>[n,n]));
 $('filterRole').innerHTML+=opts(ROLES.map(r=>[r,ROLE_NAMES[r]]));$('filterMood').innerHTML+=opts([...new Set(PRESETS.map(p=>p.mood))].sort().map(n=>[n,n]));$('filterTechnique').innerHTML+=opts([...new Set(PRESETS.map(p=>p.technique))].sort().map(n=>[n,n]));
 $('filterRole').value=PAGE==='studio'?'':PAGE;
 $('filterCollection').value='artists';
 $('guides').innerHTML=GUIDES_V2.map(([file,name,desc])=>`<a href="${file}"><b>${name}</b><span>${desc}</span></a>`).join('');
 for(const id of ['search','filterCollection','filterArtist','filterGenre','filterRole','filterMood','filterTechnique','onlyFavorites'])$(id).addEventListener(id==='search'?'input':'change',()=>{libraryPage=0;renderLibrary()});
 $('clearFilters').onclick=()=>{for(const id of ['search','filterCollection','filterArtist','filterGenre','filterRole','filterMood','filterTechnique'])$(id).value='';$('onlyFavorites').checked=false;libraryPage=0;renderLibrary()};
 $('prevPage').onclick=()=>{libraryPage--;renderLibrary();$('catalog').scrollTop=0};$('nextPage').onclick=()=>{libraryPage++;renderLibrary();$('catalog').scrollTop=0};
 $('catalog').onclick=e=>{const star=e.target.closest('[data-favorite]'),load=e.target.closest('[data-preset]');if(star){const id=star.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);try{localStorage.setItem('fieldwork-v2-favorites',JSON.stringify([...favorites]))}catch{toast('Favourites work here, but browser storage is unavailable.')}renderLibrary()}else if(load)loadPreset(load.dataset.preset)};
 $('tracks').onclick=e=>{const b=e.target.closest('button');if(!b)return;const role=b.dataset.role;if(b.dataset.toggle){change(()=>S.tracks[role][b.dataset.toggle]=!S.tracks[role][b.dataset.toggle])}else{S.active=role;selectedNote=-1;render()}};
 $('tracks').onchange=e=>{const role=e.target.dataset.soundRole;if(role)changeSound(role,e.target.value)};
 for(const key of ['level','tone','space','pan']){$('mix-'+key).oninput=()=>{const value=+$('mix-'+key).value;$('mix-'+key+'-out').textContent=value+(key==='tone'?' st':key==='pan'?'':'%');if(previewEngine)previewEngine.update(S.active,{...S.tracks[S.active].mix,[key]:value})};$('mix-'+key).onchange=()=>{remember();S.tracks[S.active].mix[key]=+$('mix-'+key).value;previewEngine?.update(S.active,S.tracks[S.active].mix);renderControls();renderSound()}};
 $('suggestSounds').onclick=()=>{remember();ROLES.forEach(role=>S.tracks[role].sound=suggestedSound(presetFor(role)));render();toast('Suggested instruments loaded for the five current recipes.')};
 $('genre').onchange=()=>{const id=$('genre').value;change(()=>{const g=genreOf(id);S.config.genre=id;S.config.artist=null;S.config.bpm=g.bpm;S.config.mode=g.mode;S.config.swing=g.swing;S.config.progression=[...g.prog[0]];ROLES.forEach(role=>setTrack(role,GENRE_PRESETS.find(p=>p.genre===id&&p.role===role&&p.variation===0)))});toast('Loaded a coordinated '+genreOf(id).name+' sketch. Previous edits are in Undo.')};
 $('artistScene').onchange=()=>{const id=$('artistScene').value;if(!id)return;const a=artistOf(id);change(()=>{const root=S.config.root,bars=S.config.bars,p=ARTIST_PRESETS.find(p=>p.artist===id&&p.role==='melody'&&p.variation===0);S.config={...factoryConfig(p),root,bars};ROLES.forEach(role=>setTrack(role,ARTIST_PRESETS.find(p=>p.artist===id&&p.role===role&&p.variation===0)))});toast(a.name+' / '+a.focus+' loaded with five matching parts and suggested sounds.')};
 for(const id of ['root','mode','bars','mood','bpm','form','voicing','seed'])$(id).onchange=()=>{let value=$(id).value;if(['root','bars','bpm','seed'].includes(id)){value=Number(value);if(!Number.isFinite(value)){renderControls();return}if(id==='bpm')value=clamp(value,60,200);if(id==='seed')value=Math.round(clamp(value,0,999999999))}change(()=>{S.config[id]=value;if(id!=='bpm')regenerate(['root','mode','bars'].includes(id))})};
 for(const id of ['density','gate','swing','human']){$(id).oninput=()=>$(id+'Out').textContent=$(id).value+'%';$(id).onchange=()=>{const value=+$(id).value;change(()=>{S.config[id]=value;regenerate()})}};
 $('progression').onchange=e=>{if(e.target.dataset.chord===undefined)return;const i=+e.target.dataset.chord,d=+e.target.value;change(()=>{S.config.progression[i]=d;regenerate(true)})};
 $('alternateHarmony').onclick=()=>change(()=>{const g=S.config.artist?artistOf(S.config.artist):genreOf(S.config.genre);S.config.progression=[...(JSON.stringify(S.config.progression)===JSON.stringify(g.prog[0])?g.prog[1]:g.prog[0])];regenerate(true)});
 $('generate').onclick=()=>{if(ROLES.every(r=>S.tracks[r].locked)){toast('All parts are locked. Unlock one to generate a variation.');return}change(()=>{S.config.seed=(S.config.seed+7919)%1000000000;regenerate()})};
 $('undo').onclick=()=>{if(!history.length)return;stopAudio();future.push(clone(S));S=history.pop();selectedNote=-1;render()};$('redo').onclick=()=>{if(!future.length)return;stopAudio();history.push(clone(S));S=future.pop();selectedNote=-1;render()};
 document.querySelectorAll('[data-transform]').forEach(b=>b.onclick=()=>change(()=>S.tracks[S.active].notes=transformNotes(S.tracks[S.active].notes,b.dataset.transform,S.config,S.active)));
 $('clearPart').onclick=()=>change(()=>S.tracks[S.active].notes=[]);
 $('noteSelect').onchange=()=>{selectedNote=+$('noteSelect').value;drawRoll();renderNoteTools()};
 for(const [id,key] of [['notePitch','p'],['noteTime','t'],['noteLength','d'],['noteVelocity','v']])$(id).onchange=()=>{let value=Number($(id).value);if(!Number.isFinite(value)){renderNoteTools();return}editSelected(n=>{if(key==='p')value=clamp(Math.round(value),0,127);if(key==='v')value=clamp(Math.round(value),1,127);if(key==='t')value=clamp(value,0,S.config.bars*4-.01);if(key==='d')value=clamp(value,.01,S.config.bars*4-n.t);n[key]=value;n.d=Math.min(n.d,S.config.bars*4-n.t)})};
 $('deleteNote').onclick=deleteSelected;
 $('roll').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const hit=e.target.closest('[data-note]'),pos=pointInRoll(e),geo=rollGeometry;
  $('roll').focus();
  if(hit){selectedNote=+hit.dataset.note;drag={id:e.pointerId,x:pos.x,y:pos.y,index:selectedNote,rows:[...geo.rows],n:{...S.tracks[S.active].notes[selectedNote]},changed:false};$('roll').setPointerCapture(e.pointerId);drawRoll();renderNoteTools();return}
  if(pos.x<geo.left||pos.y<geo.top||pos.y>=297)return;
  const t=clamp(Math.floor((pos.x-geo.left)/geo.bw*4)/4,0,geo.total-.25),p=geo.rows[clamp(Math.floor((pos.y-geo.top)/geo.rh),0,geo.rows.length-1)];
  change(()=>S.tracks[S.active].notes.push({t,p,d:S.active==='drums'?.15:.25,v:96}));selectedNote=S.tracks[S.active].notes.length-1;drawRoll();renderNoteTools();
 });
 $('roll').addEventListener('pointermove',e=>{if(!drag)return;const pos=pointInRoll(e),geo=rollGeometry,dt=Math.round((pos.x-drag.x)/geo.bw*4)/4,dr=Math.round((pos.y-drag.y)/geo.rh);if(!drag.changed&&!dt&&!dr)return;if(!drag.changed){stopAudio();remember();drag.changed=true}const n=S.tracks[S.active].notes[drag.index];n.t=clamp(drag.n.t+dt,0,geo.total-.01);n.d=Math.min(drag.n.d,geo.total-n.t);const row=geo.rows.indexOf(drag.n.p);n.p=geo.rows[clamp(row+dr,0,geo.rows.length-1)];drawRoll()});
 function endDrag(){if(!drag)return;const changed=drag.changed;drag=null;if(changed){S.tracks[S.active].notes=tidyNotes(S.tracks[S.active].notes,S.config.bars*4);selectedNote=-1;render()}}
 $('roll').addEventListener('pointerup',endDrag);$('roll').addEventListener('pointercancel',endDrag);
 $('roll').addEventListener('dblclick',e=>{const hit=e.target.closest('[data-note]');if(hit){selectedNote=+hit.dataset.note;deleteSelected()}});
 $('roll').addEventListener('keydown',e=>{if(['Delete','Backspace'].includes(e.key)){e.preventDefault();deleteSelected()}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();editSelected(n=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')n.t=clamp(n.t+(e.key==='ArrowRight'?.25:-.25),0,S.config.bars*4-.01);else n.p=clamp(n.p+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?12:1),0,127);n.d=Math.min(n.d,S.config.bars*4-n.t)})}});
 $('play').onclick=playAudio;$('volume').oninput=()=>previewEngine?.level(+$('volume').value/100);
 document.addEventListener('keydown',e=>{const editing=/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName);if(e.code==='Space'&&!editing){e.preventDefault();playAudio()}if(e.key==='Escape'){stopAudio()}if(e.key==='/'&&!editing){e.preventDefault();$('search').focus()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio()});window.addEventListener('pagehide',stopAudio);
 $('exportPart').onclick=()=>download(midiBytes(exportTracks([S.active]),S.config),filename(S.active)+'.mid','audio/midi');
 $('exportSketch').onclick=()=>{const roles=audibleRoles();if(!roles.length){toast('Unmute a part before exporting the sketch.');return}download(midiBytes(exportTracks(roles),S.config),filename('sketch')+'.mid','audio/midi')};
 $('exportStems').onclick=()=>download(zipBytes(ROLES.map(role=>({name:filename(role)+'.mid',bytes:midiBytes(exportTracks([role]),S.config)}))),filename('separate-parts')+'.zip','application/zip');
 $('exportVariations').onclick=()=>{const p=presetFor(),files=[],treatmentCount=p.artist?8:4;for(let i=0;i<32;i++){const c={...S.config,seed:(S.config.seed+i*7919)%1000000000},recipe={...p,variation:i%treatmentCount};let notes=generate(recipe,c);const shift=Math.floor(i/treatmentCount)*.25;notes=tidyNotes(notes.map(n=>({...n,t:mod(n.t+shift,c.bars*4)})),c.bars*4);files.push({name:filename(`${S.active}-variation-${String(i+1).padStart(2,'0')}`)+'.mid',bytes:midiBytes([{role:S.active,name:`${p.name} / variation ${i+1}`,notes}],c)})}download(zipBytes(files),filename('32-'+S.active+'-variations')+'.zip','application/zip')};
 $('exportAll').onclick=()=>exportPack('genres');$('exportArtists').onclick=()=>exportPack('artists');$('exportFiltered').onclick=()=>exportPack('filtered');
 $('saveSession').onclick=()=>download(sessionText(),filename('session')+'.json','application/json');$('loadSession').onclick=()=>$('sessionFile').click();
 $('sessionFile').onchange=async()=>{const file=$('sessionFile').files[0];try{if(!file)return;if(file.size>4000000)throw Error('Session file is too large (maximum 4 MB).');importSession(await file.text())}catch(err){toast('Could not open session: '+err.message)}finally{$('sessionFile').value=''}};
 $('saveLocal').onclick=()=>{try{localStorage.setItem('fieldwork-v2-session',sessionText());toast('Saved in this browser. Save a session file to move it between pages or devices.')}catch{toast('Browser storage is unavailable. Use Save session to download a file.')}};
 $('restoreLocal').onclick=()=>{try{const text=localStorage.getItem('fieldwork-v2-session');if(!text){toast('No browser save found on this page. Open a saved session file instead.');return}importSession(text)}catch(err){toast('Could not restore: '+err.message)}};
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>drawRoll());observer.observe($('roll'))}
 render();
}
initialize();
