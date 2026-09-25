/* Original studies, expanded with hand-programmed two-bar examples.
   Positions below are one-based sixteenth notes. These are teaching sketches. */
const hits=(positions,ghosts=[])=>{const a=Array(32).fill('-');positions.forEach(n=>a[n-1]='x');ghosts.forEach(n=>a[n-1]='o');return a.join('');};
const floor=r('X---X---X---X---'),back=r('----X-------X---'),eighth=r('x-x-x-x-x-x-x-x-'),off=r('--x---x---x---x-'),sixteen=r('xoxoxoxoxoxoxoxo');
const EXTRA=[
 ['Soulful house','House',121,57,'Warm','warm organic gospel','A soft backbeat and tambourine leave a pocket for a vocal.','Keep the tambourine quieter than the clap; the shaker supplies continuity.',{kick:floor,clap:back,chh:off,shaker:r('x-oox-oox-oox-oo'),tamb:hits([7,15,23,31]),conga:hits([4,11,20,27],[16,32])}],
 ['Lo-fi house','House',118,58,'Dust','dusty tape vinyl','A hazy, lightly shuffled groove with a dry rim and uneven hats.','Shorten the kick before adding saturation; leave the rim small and close.',{kick:floor,rim:back,chh:r('x-ox--o-x-ox--o-'),ohh:hits([15,27]),snare:hits([],[12,28])}],
 ['Piano house','House',126,52,'909','bright punchy piano','A firm clap and bright offbeat hats support busy chord rhythms.','Keep the drum rhythm simple enough for the piano to provide the syncopation.',{kick:floor,clap:back,snare:r('----o-------o---'),chh:eighth,ohh:off,tamb:hits([8,16,24,30,32])}],
 ['Progressive house','House',124,52,'Warm','progressive smooth deep','A steady pulse with a two-bar tom answer for long transitions.','Introduce the tom answer only every few phrases when arranging.',{kick:floor,clap:back,chh:r('x-o-x-o-x-o-x-oo'),ohh:hits([7,15,23,31]),tom:hits([11,26,28,31]),shaker:r('-o-o-o-o-o-o-o-o')}],
 ['Melodic house','House',122,54,'Warm','melodic rounded organic','Rounded drums and a restrained shaker create room for sustained harmony.','Use a short, low kick and avoid a long open hat under every chord.',{kick:floor,clap:back,chh:hits([3,7,11,19,23,31]),shaker:r('x-oox-oox-oox-oo'),conga:hits([10,16,26,30])}],
 ['Bass house','House',128,50,'Punch','bass house tight heavy','A compact, forceful beat with stop-start hats and a kick pickup.','Dry, short drums let a distorted bass occupy the sustain.',{kick:hits([1,5,9,13,17,21,25,29,32]),clap:back,chh:r('--x---x-x-x--o--'),ohh:hits([7,23]),snare:hits([],[16,28,30])}],
 ['Microhouse','House',123,59,'Click','micro minimal click foley','Small clicks and a sparse backbeat make tiny offsets audible.','Search for foley transients and trim them into very short percussion hits.',{kick:floor,rim:hits([13,29]),chh:hits([3,8,11,19,24,27],[6,22]),conga:hits([10,26]),shaker:hits([],[2,15,18,31])}],
 ['Acid techno','Techno',138,51,'909','acid raw analog','A rigid machine pulse leaves the rhythmic focus to a moving acid sequence.','Keep the drums dry; automate the acid phrase rather than filling every lane.',{kick:floor,clap:back,chh:sixteen,ohh:off,cow:hits([4,12,20,27]),tom:hits([30,32])}],
 ['Industrial techno','Techno',142,50,'Grit','industrial distorted metal','Sparse metallic strikes cut across a dense, straight hat bed.','Choose one metallic accent and leave space for its tail.',{kick:floor,snare:back,chh:sixteen,ride:hits([1,9,17,25]),rim:hits([4,10,19,26,31]),tom:hits([15,32])}],
 ['Hard techno','Techno',150,50,'Grit','hard techno distorted punch','A fast four-on-the-floor study with an insistent ride and short turnaround.','Keep the kick tail controlled at this tempo so the next transient stays clear.',{kick:floor,clap:back,chh:eighth,ohh:off,ride:r('x---x---x---x---'),snare:hits([30,31,32])}],
 ['Minimal techno','Techno',128,53,'Click','minimal techno dry click','An almost empty top line turns two rim hits into a recurring motif.','Audition the rim pitch as carefully as a synth note.',{kick:floor,chh:hits([3,11,19,27],[8,24]),rim:hits([7,22]),tom:hits([16,30])}],
 ['Melodic techno','Techno',126,50,'Punch','melodic techno clean deep','A centered kick and clap with a small tom figure around the backbeat.','Leave the midrange percussion sparse when the synth arpeggio gets busy.',{kick:floor,clap:back,chh:eighth,ohh:hits([7,15,23,31]),tom:hits([10,12,26,28,32]),shaker:r('-o-o-o-o-o-o-o-o')}],
 ['Broken dub techno','Techno',124,55,'Warm','dub deep broken muted','An off-center kick and isolated rim offer space for dub chord echoes.','Try the rim through a filtered dotted-eighth delay in your DAW.',{kick:hits([1,7,11,17,23,29]),rim:hits([13,29]),chh:r('--o---x---o---x-'),ride:hits([],[16,32]),tom:hits([10,26])}],
 ['UK funky','Garage',130,54,'707','uk funky tribal dry','A house pulse meets a displaced snare and a conversational conga part.','Listen to the snare placement against the congas before adding bass.',{kick:floor,snare:r('----x-----x--x--'),chh:off,conga:hits([3,8,11,19,22,27,32]),shaker:r('-o-o-o-o-o-o-o-o')}],
 ['Bassline garage','Garage',138,59,'Punch','bassline garage bouncy punch','A brisk, shuffled four-on-the-floor foundation with a snare-led backbeat.','Keep the kick compact so an offbeat bass phrase can answer it.',{kick:floor,snare:back,chh:r('xo-oxo-ox-ooxo-o'),ohh:hits([7,15,23,31]),rim:hits([4,20,30])}],
 ['Future garage','Garage',132,61,'Dust','future garage atmospheric dusty','A broken kick, restrained snare and ghost hats make a spacious half-lit groove.','Use a dry snare core and add a separate, quieter reverb layer.',{kick:hits([1,8,11,17,24,27]),snare:back,chh:r('x-oo--o-x-o---oo'),rim:hits([],[12,28]),shaker:hits([3,15,19,31])}],
 ['Electro','Breaks',132,50,'808','electro 808 robotic','A syncopated machine kick and snare stay rigid while the toms answer.','Use tight 808-style hits; the straight timing is part of this example.',{kick:hits([1,7,9,16,19,23,25,30]),snare:back,chh:eighth,ohh:hits([8,24]),tom:hits([11,15,27,31]),cow:hits([4,20])}],
 ['Jungle','Breaks',168,54,'Break','jungle chopped break acoustic','Two distinct bars of syncopated kicks, ghost snares and brisk hats.','This is a sixteenth-grid sketch; chopped breaks also use finer timing and sample articulation.',{kick:hits([1,7,11,17,20,27]),snare:hits([5,13,21,28],[4,8,12,16,24,30,32]),chh:r('x-xxx-x-x-xxx-x-'),ride:hits([1,17]),ohh:hits([15,31])}],
 ['Liquid drum & bass','Breaks',174,52,'Break','liquid drum bass crisp soft','A fast two-step foundation with soft ghost notes around clear snares.','Choose a snare with body and a short tail; let the harmony provide width.',{kick:hits([1,11,17,27]),snare:hits([5,13,21,29],[8,16,24,32]),chh:eighth,shaker:r('-o-o-o-o-o-o-o-o'),ohh:hits([15,31])}],
 ['Neuro drum & bass','Breaks',172,50,'Punch','neuro drum bass tight processed','A sharply defined two-step beat with compact syncopated accents.','Trim tails and use a focused snare; leave room for detailed bass movement.',{kick:hits([1,11,17,26,31]),snare:hits([5,13,21,29],[12,28]),chh:r('x-oxx-x-x-oxx-x-'),ohh:hits([7,23]),rim:hits([16,32])}],
 ['Halftime bass','Breaks',170,54,'808','halftime deep sub sparse','One heavy snare halfway through each bar opens a wide rhythmic pocket.','At 170 BPM this backbeat feels like 85; keep the bass phrase equally spacious.',{kick:hits([1,7,17,23,30]),snare:hits([9,25],[16,32]),chh:r('x---x-ox--o-x---'),ohh:hits([15,31]),rim:hits([12,28])}],
 ['Big beat','Breaks',128,52,'Break','big beat crunchy funk','Chunky kicks and strong snares push a busy, break-like top line.','Try a crunchy snare and tambourine; match their room character.',{kick:hits([1,4,9,11,17,23,25,28]),snare:hits([5,13,21,29],[8,16,24,32]),chh:sixteen,tamb:off,ohh:hits([15,31])}],
 ['Amapiano','Afro / Latin',112,58,'Warm','amapiano log drum soft shaker','Soft kick anchors, swung shaker and tom syncopation outline a spacious groove.','The tom lane stands in for a log-drum rhythm; use a tuned log-drum instrument in your DAW.',{kick:hits([1,9,17,25]),rim:hits([5,13,21,29]),shaker:sixteen,chh:off,tom:hits([4,7,12,16,19,23,28,31]),conga:hits([10,26])}],
 ['Organic house','Afro / Latin',116,56,'Warm','organic house hand percussion','A soft floor pulse under congas, shaker and gently changing accents.','Seek natural, dry percussion and vary velocity before reaching for more reverb.',{kick:floor,rim:hits([13,29]),shaker:r('xoooxoxoxoooxoxo'),conga:hits([3,6,11,15,19,24,27,30]),tom:hits([8,32]),ohh:hits([7,23])}],
 ['Baile funk','Afro / Latin',130,50,'808','baile funk tamborzao punch','A syncopated kick and tom conversation inspired by tamborzão textures.','Use this as a starting rhythm; the tone and articulation of the percussion matter.',{kick:hits([1,7,11,17,23,27]),snare:hits([5,13,21,29]),tom:hits([3,6,9,15,19,22,25,31]),conga:hits([4,12,20,28]),chh:hits([1,9,17,25])}],
 ['Reggaeton','Afro / Latin',96,50,'Punch','reggaeton dembow dry','A dembow-inspired kick and displaced snare pattern with sparse hat support.','Keep the kick and snare relationship prominent; start with short, dry one-shots.',{kick:r('X-------X-------'),snare:r('----x--x----x--x'),chh:eighth,rim:hits([8,16,24,32]),conga:hits([11,27])}],
 ['Uplifting trance','Trance',138,50,'909','trance bright punchy','A straight floor pulse, bright offbeats and a rising snare turnaround.','Choose a clean kick and a bright open hat with enough space for rolling bass.',{kick:floor,clap:back,chh:eighth,ohh:off,ride:hits([1,9,17,25]),snare:hits([29,30,31,32])}],
 ['Psytrance','Trance',145,50,'Click','psytrance tight short clean','A very tight kick, restrained clap and animated sixteenth hat accents.','The bass is a separate part: keep the kick short enough for the following bass notes.',{kick:floor,clap:back,chh:r('x-oox-oox-oxx-oo'),ohh:hits([7,15,23,31]),rim:hits([4,12,20,28]),tom:hits([30,32])}],
 ['Boom bap','Hip-hop',90,60,'Dust','boom bap dusty vinyl acoustic','A loose kick phrase, dry backbeat and ghost snares sketch a sampled-drum feel.','Try a rounded kick and dusty snare from a similar room or recording texture.',{kick:hits([1,8,11,17,20,27]),snare:back,chh:eighth,ohh:hits([16,32]),snare:hits([5,13,21,29],[4,12,24])}],
 ['Trap','Hip-hop',140,54,'808','trap 808 crisp tight','Half-time snare and short hat bursts leave space for a separate 808 bassline.','These rolls use sixteenths; add 32nds or triplets in your DAW for finer detail.',{kick:hits([1,7,17,23,28]),snare:hits([9,25]),clap:hits([9,25]),chh:r('x-x-x-xxx-x-xxxx'),ohh:hits([5,21]),rim:hits([16,32])}]
];
EXTRA.forEach(([name,fam,bpm,swing,kit,tags,d,sig,p])=>LIB.push({name,fam,bpm,swing,kit,tags,d,sig,p}));
const ORIGINAL_NOTES=[
 ['909','classic house analog bright','A familiar four-on-the-floor foundation with clap backbeats and open hats on the offbeats.','Listen to the open hat length against the kick; shorten it for a tighter bounce.'],
 ['Warm','deep house warm rounded','A restrained house study with a rim backbeat and a softly moving shaker.','The rim and shaker keep this particular example understated.'],
 ['707','disco house live bright','A snare, animated hats and tambourine suggest a live disco rhythm section.','Use the tambourine to add lift without overpowering the snare.'],
 ['Punch','french house crunchy filtered','A straight machine bed designed to sit under a chopped or filtered sample.','Keep the top line controlled when the sample already contains drums.'],
 ['909','jackin house shuffled funky','A shuffled house study with syncopated rims and a late second-bar kick pickup.','The pickup and hat swing pull this example toward the next downbeat.'],
 ['Punch','tech house dry tight','A compact floor pulse with closed offbeat hats, syncopated rims and quiet shaker.','Keep the kick short and the rim distinct from the clap.'],
 ['Click','minimal house click sparse','A sparse house sketch that gives a pair of rim hits plenty of space.','Eighteen hits across two bars: space makes the small accents easy to hear.'],
 ['909','hypnotic techno raw looping','This example drops the backbeat and uses continuous hats for forward movement.','Try an understated ride; hypnotic techno can also include claps and snares.'],
 ['Punch','peak time techno punch bright','A driving floor pulse, backbeat and open hats with a tom turnaround.','Compare the tempo, hat density and sound palette with classic house.'],
 ['909','hardgroove techno tribal conga','A fast percussion-led study with congas forming the main rhythmic motif.','Balance the conga accents before adding more top-end layers.'],
 ['Warm','dub techno muted soft','Sparse drums leave room for chords and delay tails in a dub arrangement.','Keep the rim clear but small; audition a quiet filtered delay in the DAW.'],
 ['808','detroit techno analog tom','Straight machine hats and a backbeat support a recurring tom phrase.','Tune the toms to work with your bass and harmony.'],
 ['909','chicago acid house raw cowbell','A machine-house foundation with bright offbeat hats and cowbell accents.','A small amount of cowbell goes a long way; audition its pitch against the acid line.'],
 ['707','uk garage 2 step shuffled','Syncopated kicks and a snare backbeat support skipping, heavily swung hats.','Keep the main snare clear while the hats fill and leave small gaps.'],
 ['Punch','speed garage snare shuffled','A four-on-the-floor garage example with a snare backbeat and shuffled top line.','Try short hats so the shuffle remains articulate at this tempo.'],
 ['Break','breakbeat acoustic crunchy','A two-bar programmed break with changing kicks and ghost snares.','Quiet snare taps suggest articulation; use several sample variations in your DAW.'],
 ['Warm','afro house organic percussion','A floor pulse with a changing conga phrase and continuous shaker.','Treat the percussion as an interlocking conversation, not a wall of equally loud hits.'],
 ['707','latin tribal house conga cowbell','A percussion-led house sketch with repeating conga groupings and cowbell timekeeping.','The conga lane groups sixteenth notes 3–3–2; this is one possible Latin-inspired device.']
];
ORIGINAL_NOTES.forEach(([kit,tags,d,sig],i)=>Object.assign(LIB[i],{kit,tags,d,sig}));
// The legacy hat strings had 15 steps per bar. Restore the missing final rest
// before repeating, so bar two does not start a sixteenth early.
LIB[2].p.chh=r('xo-oxo-oxo-oxo-o-');
LIB[14].p.chh=r('xo-oxo-oxo-oxo-o-');
LIB[4].p.kick=floor.slice(0,31)+'x';
/* Repair the legacy strings explicitly to their intended two-bar length. */
LIB.forEach((p,i)=>{p.id=p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');Object.keys(p.p).forEach(k=>p.p[k]=p.p[k].padEnd(32,'-').slice(0,32));});
Object.assign(KITS,{
 Warm:{...KITS['808'],kf1:49,kdec:.30,kdrv:.08,sNoise:.4,sDec:.12,hHP:6100,hDec:.027,hoDec:.18,cDec:.14},
 Dust:{...KITS['707'],kf0:115,kf1:57,kdec:.23,kdrv:.48,sTone:165,sNoise:.54,hHP:4800,hoDec:.16,cDec:.12},
 Punch:{...KITS['909'],kf0:190,kf1:53,kdec:.24,kdrv:.45,sNoise:.8,sDec:.12,hDec:.022,hoDec:.17,cDec:.14},
 Click:{...KITS['707'],kf0:210,kf1:52,kpd:.018,kdec:.18,hDec:.018,hoDec:.12,rDec:.025,cDec:.10},
 Grit:{...KITS['909'],kf0:200,kf1:48,kdec:.32,kdrv:.72,sNoise:.9,sDec:.2,hHP:6200,hoDec:.24},
 Break:{...KITS['707'],kf0:130,kf1:64,kdec:.20,sTone:220,sNoise:.8,sDec:.19,hMetal:.08,hHP:5900,hoDec:.21}
});
/* Nine synthesized kit characters; no external audio assets. */
const KIT_NAMES=['909','808','707','Warm','Dust','Punch','Click','Grit','Break'];
const FAMILY_COLORS={'House':'#e45d36','Techno':'#8b89c7','Garage':'#4b967d','Breaks':'#b37b3f','Afro / Latin':'#899442','Trance':'#598bac','Hip-hop':'#b47889'};
const SOUND_ROLES={
 kick:['kick','Short low-end anchor. Match the tail to the space before your next bass note.'],
 clap:['clap','Look for a clear transient and a tail that does not wash over the hats.'],
 snare:['snare','Choose the body first; quieter ghost hits should still sound related.'],
 rim:['rimshot woodblock','A short midrange accent. Try rimshot, clave or woodblock separately.'],
 chh:['closed hat','A short, dry hat makes swing and velocity differences easier to hear.'],
 ohh:['open hat','Listen to the decay against the next kick. Trim or choke it if needed.'],
 ride:['ride cymbal','Choose a soft wash or a clear bell according to the space in the mix.'],
 shaker:['shaker','Choose a dry one-shot for this grid; a loop introduces its own groove.'],
 tamb:['tambourine','Prefer a short hit when the pattern is busy. Watch the sharp upper mids.'],
 conga:['conga percussion','Try low and high conga hits; varied articulation helps repeated notes.'],
 cow:['cowbell','Audition the pitch with the bassline. Keep this strong tone in the background.'],
 tom:['tom','Tune the resonant body to your track, and keep the decay out of the kick.']
};
const TAKES=['Foundation','Stripped','Displaced','Turnaround'];
function expand(p){return Object.fromEntries(LANES.map(l=>[l.id,(p[l.id]||'-'.repeat(32)).split('')]));}
function patternTake(p,take){
 const out=expand(p.p);
 if(take==='Stripped'){
  // Retain the melodic-techno tom motif as its third voice in the stripped take.
  const main=['kick',out.snare.some(v=>v!=='-')?'snare':out.clap.some(v=>v!=='-')?'clap':'rim',p.name==='Melodic techno'?'tom':'chh'];
  LANES.forEach(l=>{if(!main.includes(l.id))out[l.id].fill('-');else out[l.id]=out[l.id].map((v,s)=>v==='o'||(l.id==='chh'&&s%4!==0)?'-':v);});
 }else if(take==='Displaced'){
  const candidates=['conga','rim','tom','shaker','chh'];
  const id=candidates.find(k=>out[k].some(v=>v!=='-'))||'chh';
  out[id]=out[id].slice(-1).concat(out[id].slice(0,-1));
  out[id][31]=out[id][31]==='-'?'o':'X';
 }else if(take==='Turnaround'){
  const id=out.snare.some(v=>v!=='-')?'snare':'tom';
  [27,29,30,31].forEach((s,i)=>out[id][s]=['o','x','x','X'][i]);
  out.chh[30]='-';out.chh[31]='-';out.ohh[31]='-';
 }
 return out;
}
function soundQuery(p,id){
 const role=id==='tom'&&p.name==='Amapiano'?'log drum':SOUND_ROLES[id][0].split(' ').slice(0,id==='chh'||id==='ohh'?2:1).join(' ');
 const texture={Warm:'warm',Dust:'dusty',Punch:'tight',Click:'short',Grit:'distorted',Break:'acoustic','909':'909','808':'808','707':'707'}[p.kit];
 const style=p.tags.split(' ').slice(0,2).join(' ');
 return `${style} ${texture} ${role}`;
}
