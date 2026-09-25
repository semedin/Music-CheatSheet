// Additional V3 preview voices. The underlying V2 files remain unchanged.
SOUNDS.push(
 sound('log-drum','Log drum study','Bass','A pitched FM knock with a short low body; audition the bass melody with a log-drum instrument in Live.',{engine:'fm',wave:'sine',ratio:2,index:3.4,attack:.002,decay:.16,sustain:.025,release:.05,cutoff:1800,filterEnv:2.2,level:1}),
 sound('dry-triangle','Dry triangle / writing','Leads','A plain sustained voice for judging the notes and their lengths.',{wave:'triangle',attack:.006,decay:.09,sustain:.7,release:.04,cutoff:5800,filterEnv:1}),
 sound('soft-mono','Soft mono / singing','Leads','A soft sustained lead that makes held notes and phrasing easy to hear.',{wave:'sawtooth',attack:.025,decay:.14,sustain:.6,release:.12,cutoff:1300,filterEnv:1.6,level:.72}),
 sound('rave-organ','Rave organ study','Keys & pads','A firm, harmonically rich organ attack for repeated lead notes.',{engine:'additive',partials:[[1,1],[2,.6],[3,.25],[4,.3]],attack:.005,decay:.12,sustain:.5,release:.08,cutoff:6800,filterEnv:1.2}),
 // Expanded edition voices for house and techno writing.
 sound('hoover','Hoover study','Leads','A wide, detuned and driven saw stack with slow vibrato for rave, gabber and hard-house answers.',{voices:3,detune:32,vibrato:18,attack:.02,decay:.3,sustain:.7,release:.18,cutoff:2400,resonance:1.4,filterEnv:1.8,drive:1.6,level:.62}),
 sound('house-piano','90s house piano study','Keys & pads','A bright additive piano-like attack for offbeat house riffs and chords.',{engine:'additive',partials:[[1,1],[2,.55],[3,.28],[4,.2],[5,.1],[8,.05]],attack:.002,decay:.45,sustain:.12,release:.3,cutoff:7000,filterEnv:1.2}),
 sound('acid-squelch','Acid squelch / 303 study','Leads','A driven, highly resonant saw with a snappy filter envelope for accented acid lines.',{wave:'sawtooth',cutoff:700,resonance:9,filterEnv:5.5,attack:.002,decay:.13,sustain:.2,release:.05,drive:2.2,level:.5}),
 sound('vocal-chop','Vocal chop study','Leads','A short “ah” formant attack for chopped vocal-style hooks. Not a sampled voice.',{engine:'formant',formants:[750,1180,2600],attack:.004,decay:.12,sustain:.35,release:.06,cutoff:5200,filterEnv:1.3,level:1.1}),
 sound('jack-bass','Jacking square bass','Bass','A dark square bass with a quick filter pop for Chicago and tech-house riffs.',{wave:'square',cutoff:650,resonance:3,filterEnv:3.5,attack:.002,decay:.12,sustain:.25,release:.05,level:.8}),
 sound('chord-stab','Minor chord stab study','Keys & pads','Each note sounds a short minor triad, like a chord-memory stab in techno.',{engine:'additive',partials:[[1,1],[1.1892,.75],[1.4983,.8],[2,.45],[2.3784,.25]],attack:.002,decay:.22,sustain:.08,release:.12,cutoff:3600,filterEnv:2}),
 sound('dub-chord','Dub chord study','Keys & pads','A soft minor-seventh chord per note with a longer tail, for delay-heavy dub and deep techno.',{engine:'additive',partials:[[1,1],[1.1892,.7],[1.4983,.75],[1.7818,.45],[2,.3]],attack:.004,decay:.5,sustain:.05,release:.5,cutoff:1500,filterEnv:2.4,level:.8})
);
DRUM_KITS.push(
 kit('chicago-808','Chicago drum-machine study','Round kick, bright metallic hats and a snappy clap for jack and acid house.',{kick:50,kickDecay:.38,pitchDrop:2,snare:190,snareDecay:.11,hat:7400,hatDecay:.04,openDecay:.24,metal:.6,clap:.2}),
 kit('rumble-techno','Rumble techno','A long, driven low kick and dark hats for warehouse, stab and deep techno.',{kick:42,kickDecay:.5,pitchDrop:3,drive:2.2,snare:160,snareDecay:.16,hat:6000,hatDecay:.05,openDecay:.2,metal:.3}),
 kit('tech-house','Tight tech house','A short punchy kick, dry clap and crisp shuffling hats.',{kick:52,kickDecay:.22,pitchDrop:4,drive:1.4,snare:215,snareDecay:.09,hat:9800,hatDecay:.03,openDecay:.16,clap:.14})
);
