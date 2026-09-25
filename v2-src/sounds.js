/* Offline preview patches: real synthesis parameters, no downloaded samples. */
const SOUND_DEFAULTS={engine:'sub',wave:'sawtooth',voices:1,detune:0,attack:.008,decay:.18,sustain:.25,release:.12,cutoff:3200,resonance:.8,filterEnv:1.5,ratio:2,index:1.5,level:.9};
const sound=(id,name,group,desc,parameters)=>({id,name,group,desc,...SOUND_DEFAULTS,...parameters});
const SOUNDS=[
 sound('analog-pluck','Analog pluck','Plucks & mallets','A rounded saw pluck with a quick filter fall.',{cutoff:2100,filterEnv:2.5,sustain:.12}),
 sound('wide-pluck','Wide detuned pluck','Plucks & mallets','Three gently detuned saw voices with a longer tail.',{voices:3,detune:11,decay:.3,release:.35,cutoff:3600,sustain:.18}),
 sound('soft-pluck','Soft triangle pluck','Plucks & mallets','A gentle triangle attack for quieter melodic lines.',{wave:'triangle',cutoff:2200,decay:.32,sustain:.08,release:.25}),
 sound('glass-pluck','Glass pluck','Plucks & mallets','A clean FM attack with a slowly fading glass edge.',{engine:'fm',wave:'sine',ratio:2,index:1.8,decay:.4,sustain:.1,cutoff:6500,release:.32}),
 sound('fm-pluck','FM tine pluck','Plucks & mallets','A bright ratio-three FM pluck with a short body.',{engine:'fm',wave:'sine',ratio:3,index:2.8,decay:.17,sustain:.04,cutoff:7000}),
 sound('digital-pluck','Digital pin pluck','Plucks & mallets','A square pluck with a narrow resonant attack.',{wave:'square',cutoff:3300,resonance:2.5,decay:.1,sustain:.04,release:.07}),
 sound('short-saw','Dry saw sequence','Plucks & mallets','Fast attack, short release and a dry saw edge.',{cutoff:4100,decay:.09,sustain:.3,release:.045,filterEnv:1.1}),
 sound('kalimba','Kalimba-like tine','Plucks & mallets','Soft additive tines with a small upper inharmonic partial.',{engine:'additive',wave:'sine',partials:[[1,1],[2.76,.18],[5.4,.07]],attack:.003,decay:.22,sustain:.01,release:.18,cutoff:5000}),
 sound('marimba','Marimba-like mallet','Plucks & mallets','A low fundamental and a quiet upper bar resonance.',{engine:'additive',wave:'sine',partials:[[1,1],[4,.2],[9,.06]],attack:.002,decay:.3,sustain:.015,release:.15,cutoff:5000}),
 sound('crystal-bell','Crystal bell','Plucks & mallets','A high-ratio FM bell with a longer ringing release.',{engine:'fm',wave:'sine',ratio:3.5,index:2.5,attack:.003,decay:.7,sustain:.08,release:.8,cutoff:10500}),
 sound('resonant-lead','Resonant mono-style lead','Leads','Saw lead with a pronounced filter envelope.',{cutoff:1700,resonance:5,filterEnv:3.2,decay:.3,sustain:.65,release:.18,level:.7}),
 sound('supersaw','Three-voice supersaw','Leads','Three spread saw voices for broad melodic hooks.',{voices:3,detune:19,attack:.018,decay:.2,sustain:.8,release:.3,cutoff:6500,filterEnv:1.1,level:.7}),
 sound('detuned-saw','Twin saw lead','Leads','A tighter detuned pair with a slightly darker filter.',{voices:2,detune:7,cutoff:3600,sustain:.7,release:.15}),
 sound('hollow-square','Hollow square lead','Leads','Odd-harmonic body with a rounded attack.',{wave:'square',cutoff:1900,attack:.013,decay:.25,sustain:.55,release:.2}),
 sound('brass-stab','Synthetic brass stab','Leads','A swelling saw attack that quickly narrows into the body.',{voices:2,detune:4,attack:.035,decay:.17,sustain:.45,release:.08,cutoff:1700,filterEnv:3}),
 sound('vowel-lead','Vowel-shaped lead','Leads','Parallel formant filters give a saw a vocal colour.',{engine:'formant',formants:[650,1100,2500],cutoff:4500,attack:.018,sustain:.65,release:.17}),
 sound('organ-lead','Drawbar lead','Leads','Sine harmonics at octave and fifth drawbar intervals.',{engine:'additive',wave:'sine',partials:[[1,1],[2,.5],[3,.24],[4,.15]],attack:.004,decay:.05,sustain:.9,release:.055,cutoff:6000}),
 sound('vocalish-pluck','Vocal-colour pluck','Leads','A short formant-filtered synth, useful for chopped-note ideas.',{engine:'formant',formants:[350,1500,2800],wave:'square',attack:.009,decay:.12,sustain:.12,release:.1,cutoff:4500}),
 sound('talkbox-lead','Talkbox-colour lead','Leads','A narrow nasal formant pair over a saw carrier.',{engine:'formant',formants:[450,850,2200],attack:.02,decay:.16,sustain:.75,release:.15,cutoff:3900}),
 sound('digital-lead','Digital FM lead','Leads','A bright, slightly inharmonic FM tone for angular hooks.',{engine:'fm',wave:'sine',ratio:1.5,index:4,cutoff:8000,attack:.008,sustain:.65,release:.12}),
 sound('acid-sequence','Acid sequence lead','Leads','A hollow resonant square with a fast accented envelope.',{wave:'square',cutoff:850,resonance:6,filterEnv:5,attack:.002,decay:.09,sustain:.2,release:.04,level:.55}),
 sound('breathy-lead','Breathy triangle lead','Leads','A triangle body mixed with filtered noise and light vibrato.',{wave:'triangle',noise:.1,vibrato:5,attack:.06,decay:.2,sustain:.7,release:.25,cutoff:3300}),
 sound('round-saw','Rounded saw bass','Bass','A full saw bass softened by a low-pass envelope.',{cutoff:550,filterEnv:3.5,decay:.13,sustain:.4,release:.07}),
 sound('offbeat-pluck','Offbeat pluck bass','Bass','A short, weighty bass attack for the spaces between kicks.',{cutoff:600,filterEnv:4,decay:.1,sustain:.15,release:.04}),
 sound('soft-sub','Soft triangle sub','Bass','A quiet triangle harmonic above the fundamental.',{wave:'triangle',cutoff:450,filterEnv:1.2,attack:.015,sustain:.8,release:.1}),
 sound('deep-sine','Pure sine sub','Bass','A clean sine fundamental with a click-free envelope.',{wave:'sine',cutoff:400,filterEnv:1,attack:.009,decay:.1,sustain:.9,release:.065}),
 sound('rubber-bass','Rubber bass','Bass','A square body with a springy resonant filter drop.',{wave:'square',cutoff:450,filterEnv:5,resonance:3.8,decay:.14,sustain:.2,release:.055,level:.65}),
 sound('acid-bass','Acid bass','Bass','A resonant saw with a fast envelope and velocity accents.',{cutoff:650,filterEnv:5,resonance:7,decay:.11,sustain:.35,release:.05,level:.55}),
 sound('drive-bass','Driven bass','Bass','A clipped saw signal with a dark low-pass finish.',{cutoff:1100,filterEnv:2,drive:2.8,attack:.003,decay:.1,sustain:.5,release:.06,level:.55}),
 sound('organ-bass','Organ bass','Bass','Fundamental, octave and fifth sine drawbars.',{engine:'additive',wave:'sine',partials:[[1,1],[2,.4],[3,.14]],cutoff:1000,attack:.005,decay:.1,sustain:.65,release:.05}),
 sound('plucked-bass','Plucked string bass','Bass','A triangle fundamental with brief upper string harmonics.',{engine:'additive',wave:'sine',partials:[[1,1],[2,.3],[3,.18],[5,.07]],cutoff:1200,attack:.003,decay:.2,sustain:.08,release:.08}),
 sound('disco-bass','Picked disco bass','Bass','A bright, quick bass with a little pick-like noise.',{wave:'triangle',noise:.025,cutoff:1800,filterEnv:2,attack:.002,decay:.16,sustain:.22,release:.075}),
 sound('donk-bass','FM donk bass','Bass','A short octave-ratio FM knock with a firm low body.',{engine:'fm',wave:'sine',ratio:2,index:4.5,cutoff:3800,attack:.003,decay:.095,sustain:.035,release:.04}),
 sound('fm-growl','FM growl bass','Bass','An evolving FM edge over a low sine carrier.',{engine:'fm',wave:'sine',ratio:1,index:7,cutoff:2400,resonance:2,drive:1.6,attack:.005,decay:.3,sustain:.5,release:.08,level:.6}),
 sound('psy-bass','Tight psy bass','Bass','Very fast saw attack, small filter movement and a short tail.',{cutoff:480,filterEnv:7,attack:.0015,decay:.055,sustain:.08,release:.018,level:.7}),
 sound('reese-bass','Twin Reese bass','Bass','Two detuned saws through a dark filter.',{voices:2,detune:13,cutoff:850,filterEnv:1.2,attack:.025,decay:.15,sustain:.85,release:.15,level:.7}),
 sound('slow-strings','Slow synthetic strings','Keys & pads','Three saw voices with a soft swell and long release.',{voices:3,detune:8,attack:.32,decay:.5,sustain:.75,release:1.1,cutoff:2200,filterEnv:1.15,level:.65}),
 sound('anthem-saws','Anthem chord stack','Keys & pads','A bright three-voice saw stack with a quick pad envelope.',{voices:3,detune:16,attack:.04,decay:.2,sustain:.8,release:.4,cutoff:5200,level:.6}),
 sound('dark-stab','Dark techno stab','Keys & pads','A short low-pass square stack with little sustain.',{wave:'square',voices:2,detune:4,attack:.006,decay:.14,sustain:.08,release:.12,cutoff:1000,filterEnv:3.5,level:.7}),
 sound('organ-stab','House organ stab','Keys & pads','Drawbar harmonics with a quick percussive fade.',{engine:'additive',wave:'sine',partials:[[1,1],[2,.5],[4,.27],[6,.12]],attack:.003,decay:.2,sustain:.3,release:.07,cutoff:5000}),
 sound('cinema-pad','Cinematic pad','Keys & pads','A slow, dark detuned pad with subtle vibrato.',{voices:3,detune:12,attack:.5,decay:.6,sustain:.8,release:1.6,cutoff:1300,filterEnv:1.3,vibrato:3,level:.6}),
 sound('warm-pad','Warm triangle pad','Keys & pads','A softly attacked triangle pair for sustained harmony.',{wave:'triangle',voices:2,detune:5,attack:.2,decay:.4,sustain:.75,release:.9,cutoff:2600,level:.8}),
 sound('chorus-pad','Detuned square pad','Keys & pads','A hollow, spread square texture with a long tail.',{wave:'square',voices:3,detune:9,attack:.18,decay:.35,sustain:.6,release:.8,cutoff:1600,filterEnv:1.2,level:.55}),
 sound('felt-keys','Felt-like keys','Keys & pads','Soft sine partials with a muted hammer-like attack.',{engine:'additive',wave:'sine',partials:[[1,1],[2,.28],[3,.11]],attack:.012,decay:.45,sustain:.1,release:.3,cutoff:2400}),
 sound('electric-keys','FM electric keys','Keys & pads','A rounded electric-key tine with velocity-sensitive FM.',{engine:'fm',wave:'sine',ratio:1,index:1.4,attack:.004,decay:.55,sustain:.12,release:.4,cutoff:6000}),
 sound('bright-piano','Synthetic piano','Keys & pads','Six weighted harmonics with a quick attack and decaying body.',{engine:'additive',wave:'sine',partials:[[1,1],[2,.55],[3,.28],[4,.18],[5,.09],[6,.045]],attack:.002,decay:.5,sustain:.1,release:.24,cutoff:7500,filterEnv:1.2}),
 sound('clav-keys','Clav-like keys','Keys & pads','Short square harmonics with a percussive, muted tail.',{wave:'square',cutoff:2200,filterEnv:2.5,attack:.002,decay:.075,sustain:.02,release:.04}),
 sound('metal-bell','Metal FM bell','Keys & pads','An inharmonic bell with a slower high-frequency decay.',{engine:'fm',wave:'sine',ratio:2.71,index:5,attack:.002,decay:.9,sustain:.05,release:.85,cutoff:11000,level:.65})
];
const KIT_DEFAULTS={kick:52,kickDecay:.26,pitchDrop:3,snare:175,snareDecay:.13,hat:7200,hatDecay:.045,openDecay:.18,clap:.12,metal:0,drive:1,noise:1};
const kit=(id,name,desc,p)=>({id,name,group:'Drum kits',desc,...KIT_DEFAULTS,...p});
const DRUM_KITS=[
 kit('club-909','Club 909 study','Firm short kick, bright hats and a tight snare.',{}),
 kit('trance-909','Trance 909 study','A tighter kick and longer, brighter open hats.',{kick:55,kickDecay:.22,hat:8800,openDecay:.25,snare:195}),
 kit('punchy-house','Punchy house','A deep short kick with a dry clap and crisp hats.',{kick:48,kickDecay:.2,pitchDrop:4,snare:210,snareDecay:.1,hat:8000,clap:.085}),
 kit('warehouse','Warehouse','A deeper kick, longer snare and a rougher drum bus.',{kick:45,kickDecay:.36,drive:1.8,snare:155,snareDecay:.2,hat:5400,metal:.2}),
 kit('minimal-click','Minimal clicks','Tiny dry drums with high, clipped percussion.',{kick:58,kickDecay:.14,snare:255,snareDecay:.065,hat:9300,hatDecay:.022,openDecay:.09,noise:.65}),
 kit('hard-909','Hard 909 study','Clipped kick and snare with metallic upper percussion.',{kick:49,kickDecay:.28,pitchDrop:5,drive:2.8,snare:220,snareDecay:.16,hat:7900,metal:.5}),
 kit('deep-house','Deep house','A warm low kick, soft snare and darker hats.',{kick:46,kickDecay:.3,snare:165,snareDecay:.12,hat:5700,noise:.8}),
 kit('soft-organic','Soft organic','Rounded drums with quiet, papery high percussion.',{kick:54,kickDecay:.23,pitchDrop:2,snare:150,snareDecay:.09,hat:4600,hatDecay:.06,noise:.65}),
 kit('break-machine','Break machine','Punchy broken-beat drums and longer snare colour.',{kick:57,kickDecay:.19,snare:205,snareDecay:.19,hat:6900,drive:1.25}),
 kit('uk-garage','UK garage','Compact kick, clipped snare and short shuffling hats.',{kick:51,kickDecay:.18,snare:235,snareDecay:.095,hat:8400,hatDecay:.032,openDecay:.12}),
 kit('organic-percussion','Organic percussion','Soft kick, woody rim and darker hand-percussion colour.',{kick:61,kickDecay:.16,pitchDrop:2,snare:145,snareDecay:.075,hat:4300,noise:.6}),
 kit('disco-707','Disco 707 study','Higher kick, bright clap and a light hat engine.',{kick:63,kickDecay:.18,snare:225,snareDecay:.12,hat:8800,clap:.16,noise:1.1}),
 kit('bass-breaks','Bass breaks','Deep punch, sharp snare and a lightly clipped edge.',{kick:44,kickDecay:.22,pitchDrop:4,snare:230,snareDecay:.15,hat:7600,drive:1.7}),
 kit('neuro-breaks','Neuro breaks','Very short kick and snappy, high-pitched snare.',{kick:55,kickDecay:.14,pitchDrop:4,snare:260,snareDecay:.105,hat:9600,hatDecay:.028,drive:1.6}),
 kit('psy-kit','Psy kit','Short clicky kick and narrow, fast high percussion.',{kick:48,kickDecay:.18,pitchDrop:5,snare:200,snareDecay:.085,hat:10300,hatDecay:.025,openDecay:.11,metal:.25}),
 kit('long-808','Long 808 study','A sustained sine kick, soft snare and metallic hats.',{kick:43,kickDecay:.65,pitchDrop:2,snare:165,snareDecay:.15,hat:6900,metal:.75,openDecay:.3})
];
function soundOptions(role){return role==='drums'?DRUM_KITS:SOUNDS}
function soundById(id,role){return soundOptions(role).find(s=>s.id===id)}
function suggestedSound(p){const a=p.artist?artistOf(p):null;if(a)return a.patch[ROLES.indexOf(p.role)];const g=GENRES.find(g=>g.id===p.genre);return({melody:'analog-pluck',bass:g.bass==='acid'?'acid-bass':g.bass==='psy'?'psy-bass':g.bass==='reese'?'reese-bass':'round-saw',chords:g.chord==='sustain'?'warm-pad':'organ-stab',arp:'glass-pluck',drums:g.drum==='garage'?'uk-garage':g.drum==='dnb'?'break-machine':'club-909'})[p.role]}
function defaultMix(role){return{level:role==='chords'?65:role==='arp'?65:80,tone:0,space:role==='drums'||role==='bass'?0:15,pan:0}}
