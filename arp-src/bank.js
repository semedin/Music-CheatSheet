// Orbit bank: twelve genres (what the arp's job is, the fingerprint it's measured against, a grammar the generator
// writes from), the drum grooves and basslines that play under it, and the hand-written patterns.
// Patterns are original studies of each genre's conventions, not transcriptions of anyone's record.
const OB = (() => {
  const SOUNDS = OSND, SOUNDS_BY_ID = Object.fromEntries(OSND.map(s => [s.id, s]));

  // ---- drums under the arp: 16 steps per lane. x hit, X accent, g ghost ----
  const GROOVES = {
    house: {name: 'House', lanes: {k: 'X...X...X...X...', c: '....x.......x...', o: '..x...x...x...x.', s: 'g.g.g.g.g.g.g.g.'}},
    tech: {name: 'Tech house', lanes: {k: 'X...X...X...X...', c: '....X.......X...', o: '..x...x...x...x.', h: '.g.g.g.gg.g.g.gg', r: '......x.....x..x'}},
    techno: {name: 'Techno', lanes: {k: 'X...X...X...X...', c: '....x.......x...', h: '..x...x...x...x.', s: 'gggggggggggggggg', r: '.x.....x..x.....'}},
    melodic: {name: 'Melodic techno', lanes: {k: 'X...X...X...X...', c: '....g.......g...', h: '..x...x...x...x.', s: 'g.gg.gg.g.gg.gg.'}},
    trance: {name: 'Trance', lanes: {k: 'X...X...X...X...', c: '....x.......x...', o: '..X...X...X...X.', h: 'gxggxgxggxgggxgx'}},
    afro: {name: 'Afro house', lanes: {k: 'X...X...X...X...', c: '....g.......g...', s: 'x.gxx.gxx.gxx.gx', t: '...x..x...x.x...', r: 'x..x..x...x.x...'}},
    deep: {name: 'Deep house', lanes: {k: 'X...X...X...X...', r: '....x.......x...', o: '..x...x...x...x.', s: '.g.g.g.g.g.g.g.g'}},
    garage: {name: '2-step garage', lanes: {k: 'X.........X.....', c: '....X.......X...', h: '..x.gx.x..x.gx.x', s: 'g.g.g.g.g.g.g.g.'}},
    disco: {name: 'Disco', lanes: {k: 'X...X...X...X...', c: '....x.......x...', o: '..x...x...x...x.', h: 'xgxgxgxgxgxgxgxg'}},
    hard: {name: 'Hard techno', lanes: {k: 'X...X...X...X...', c: '....x.......x...', o: '..x...x...x...x.', h: 'gggggggggggggggg'}},
    minimal: {name: 'Minimal', lanes: {k: 'X...X...X...X...', r: '...x..x.....x...', h: '..g...g...g...g.', s: 'g.g.g.g.g.g.g.g.'}},
    dub: {name: 'Dub techno', lanes: {k: 'X...X...X...X...', h: '..g...x...g...x.', s: '.g.g.g.g.g.g.g.g', r: '...........x....'}},
    detroit: {name: 'Detroit', lanes: {k: 'X...X...X...X...', c: '....x.......x...', o: '..x...x...x...x.', h: 'xgxgxgxgxgxgxgxg', r: '.......x..x.....'}},
  };
  // ---- basslines: x root, X accent, o octave, 5 fifth, 3 third, 7 seventh, - tie ----
  const BASS = {
    offbeat: {name: 'Off-beat', steps: '..x...x...x...x.'},
    rolling: {name: 'Rolling 16ths', steps: '.xxx.xxo.xxx.xx5'},
    tech: {name: 'Tech groove', steps: '..X..x.x..X..x.o'},
    melodic: {name: 'Melodic roll', steps: '.xx5.xxo.xx5.xxx'},
    afro: {name: 'Afro syncopation', steps: '...x..x.....x.x.'},
    deep: {name: 'Deep walk', steps: 'x..x..o...x..5..'},
    garage: {name: '2-step', steps: 'X...-.x...x...o.'},
    disco: {name: 'Octave bounce', steps: 'x.o.x.o.x.o.x.o.'},
    hard: {name: 'Rumble roll', steps: '.xxx.xxx.xxx.xxx'},
    minimal: {name: 'Sparse', steps: '..x....x..x...x.'},
    sub: {name: 'Sub on the off-beat', steps: '..x---.x..x---.x'},
    dub: {name: 'Dub sub', steps: '..x---....x---..'},
    detroit: {name: 'Motor city', steps: '..x.x.o...x.x.o.'},
  };

  // ---- genres ----
  // target: the fingerprint ranges the arps of this genre sit in (see AXES in the engine for the definitions).
  // gen: the grammar the generator writes from.
  const GENRES = {
    'tech-house': {
      name: 'Tech house', color: '#C6FF3D', bpm: [124, 128], groove: 'tech', bass: 'tech', key: 'F', scale: 'minor',
      blurb: 'The riff is a drum. Two to four notes, swung 16ths, a short organ or stab, and a filter that never sits still.',
      job: 'Lock with the bassline and the hats, not on top of them. The arp in tech house is usually a riff: it fills the gaps between the kick and the bass, carries the groove, and gets its hook from rhythm and sound rather than from the notes.',
      tips: ['Two to four notes. The fewer the notes, the more the rhythm and the filter carry it.', 'Keep it off the kick: most notes on the "and" and the "a" of the beat.', 'Swing the 16ths 54–58% and the riff starts to roll.', 'One sound, one filter move, one change every 8 bars. Repetition is the point: give it movement, not new notes.'],
      refs: 'Fisher · Chris Lake · Mau P · Michael Bibi · Patrick Topping · Cloonee',
      progs: [{p: 'i', name: 'One chord (the norm)'}, {p: 'i iv', name: 'i–iv'}, {p: 'i VII', name: 'i–VII'}, {p: 'i7 iv7', name: 'i7–iv7'}, {p: 'i VI', name: 'i–VI'}, {p: 'i9 iv9', name: 'Deep tech 9ths'}],
      target: {density: [2, 12], sync: [0.4, 1], kick: [0, 0.3], range: [0, 15], leap: [0, 8.5], length: [0.25, 1.6], swing: [53, 60]},
      gen: {bpm: [124, 128], keys: [5, 7, 9, 2, 10], scales: {minor: 4, dorian: 2, phrygian: 1}, rates: {'16': 1}, lengths: {16: 6, 32: 2, 12: 1, 6: 1, 5: 1}, shapes: {offbeat: 5, euclid: 3, tresillo: 1, sparse: 1}, hits: [4, 9],
        pools: {scale: 3, chord: 2, root5: 2, root: 1, penta: 2, chord9: 1}, orders: {seq: 5, up: 1, pinky: 1, thumb: 1, updown: 1}, seqLen: [2, 5], octaves: {1: 6, 2: 1}, count: {0: 2, 2: 1, 3: 2},
        advance: {note: 3, step: 1}, reset: {bar: 4, never: 1, '2bar': 1}, gate: [0.22, 0.55], swing: [54, 58], accent: 0.3, oct: 0.1, ratchet: 0.04, chordHit: 0.06, pedal: 0.1,
        sounds: ['organ-stab', 'tech-pluck', 'rubber-stab', 'perc-bleep', 'chord-stab', 'vox-chop', 'sub-pulse', 'micro-pluck', 'mono-lead', 'house-piano', 'marimba', 'wood-knock', 'clav'], evos: ['slow-open', 'breathe', 'none', 'gate-pump'], fills: ['none', 'drop', 'ratchet', 'climb'], reg: [58, 68]},
    },
    'melodic-techno': {
      name: 'Melodic techno', color: '#8F7CFF', bpm: [122, 126], groove: 'melodic', bass: 'melodic', key: 'A', scale: 'minor',
      blurb: 'Straight 16ths that cycle through the chord for 64 bars, dark and wide, opening slowly until the drop.',
      job: 'The arp is the lead and the arrangement. It plays the progression as a continuous sequence and the track is built from its evolution: filter, decay, octave range and density over minutes, not bars.',
      tips: ['Straight 16ths, no swing: the hypnosis comes from evenness.', 'Two octaves of chord tones and voice-led changes keep the line flowing through the progression.', 'Let it take 64 bars to open. Automate cutoff and decay, not notes.', 'Accent every third note against the 16th grid for a rolling three-against-four.'],
      refs: 'Anyma · Tale Of Us · ARTBAT · Adriatique · Massano · Innellea',
      progs: [{p: 'i VI III VII', name: 'The four-chord journey'}, {p: 'i VI VII v', name: 'i–VI–VII–v'}, {p: 'i iv VI v', name: 'i–iv–VI–v'}, {p: 'i III VII VI', name: 'i–III–VII–VI'}, {p: 'i VII VI VII', name: 'Rocking descent'}],
      target: {density: [8, 16], sync: [0, 0.6], kick: [0.1, 0.5], range: [7, 30], leap: [2, 13], length: [0.4, 2.6], swing: [50, 53]},
      gen: {bpm: [122, 126], keys: [9, 2, 6, 4, 0], scales: {minor: 4, harmonic: 1, phrygian: 1}, rates: {'16': 5, '16t': 1, '8': 1}, lengths: {16: 6, 12: 1, 5: 1, 7: 1}, shapes: {full: 5, euclid: 2, offbeat: 1}, hits: [9, 16],
        pools: {chord: 4, chord9: 2, triad: 1, scale: 1}, orders: {up: 3, updown: 2, converge: 1, seq: 2, thumb: 1, pinky: 1, down: 1}, seqLen: [4, 8], octaves: {2: 4, 1: 1, 3: 1}, count: {0: 3, 3: 1, 4: 1},
        advance: {note: 4, step: 1}, reset: {never: 2, chord: 2, bar: 1}, gate: [0.35, 0.8], swing: [50, 51], accent: 0.15, accentEvery: [3, 4, 0, 0], oct: 0.04, ratchet: 0, chordHit: 0, pedal: 0.05,
        sounds: ['dark-saw', 'tech-pluck', 'glass-pluck', 'hollow-square'], evos: ['slow-open', 'afterlife', 'pluck-to-pad', 'breathe'], fills: ['none', 'climb', 'none'], reg: [60, 68], per: [1, 2]},
    },
    progressive: {
      name: 'Progressive house', color: '#5CC8FF', bpm: [120, 124], groove: 'house', bass: 'rolling', key: 'D', scale: 'minor',
      blurb: 'Plucked sequences with a ping-pong delay doing half the writing. Warm, rolling, a little euphoric.',
      job: 'The arp is the pulse and the colour. It sits mid-register, lets the dotted-8th delay fill its gaps, and swells over long builds into a big chord change.',
      tips: ['Write fewer notes and let a 1/8-dotted delay finish the rhythm.', 'Galloping (3+3+2) rhythms give movement without speed.', 'Add the 9th: progressive house lives on suspended, open colours.', 'Decay is the second filter: grow it into the breakdown.'],
      refs: 'Eric Prydz · Lane 8 · Yotto · Ben Böhmer · Cristoph',
      progs: [{p: 'i VI III VII', name: 'i–VI–III–VII'}, {p: 'i VII VI VII', name: 'i–VII–VI–VII'}, {p: 'VI VII i i', name: 'Lift to the tonic'}, {p: 'i III VI VII', name: 'i–III–VI–VII'}, {p: 'iv VI i VII', name: 'Plagal glow'}],
      target: {density: [5, 16], sync: [0, 0.65], kick: [0.1, 0.45], range: [5, 26], leap: [2, 9], length: [0.4, 2.2], swing: [50, 54]},
      gen: {bpm: [120, 124], keys: [2, 9, 4, 7, 11], scales: {minor: 3, major: 1, dorian: 1}, rates: {'16': 4, '8': 2}, lengths: {16: 5, 8: 2, 12: 1}, shapes: {euclid: 3, full: 2, tresillo: 2}, hits: [5, 12],
        pools: {chord: 3, chord9: 3, scale: 1, triad: 1}, orders: {up: 3, updown: 2, seq: 2, converge: 1, pinky: 1}, seqLen: [3, 6], octaves: {2: 3, 1: 2}, count: {0: 3, 3: 1},
        advance: {note: 4, step: 1}, reset: {chord: 2, never: 1, bar: 2}, gate: [0.3, 0.75], swing: [50, 53], accent: 0.2, oct: 0.05, ratchet: 0, chordHit: 0.02, pedal: 0.05,
        sounds: ['glass-pluck', 'tech-pluck', 'supersaw', 'dark-saw', 'string-pluck'], evos: ['pluck-to-pad', 'slow-open', 'build', 'breathe'], fills: ['none', 'climb', 'none'], reg: [60, 70]},
    },
    trance: {
      name: 'Trance', color: '#FF5CA8', bpm: [136, 140], groove: 'trance', bass: 'rolling', key: 'A', scale: 'minor',
      blurb: 'Gated 16ths that leap octaves and climb through the progression. Big, bright and unashamed.',
      job: 'The arp is the engine of the euphoria: every 16th, octave leaps, the chord spelled out in full. Under the breakdown it carries the harmony alone, then the supersaw lead lands on top.',
      tips: ['Every 16th, gated short (40–60%): the gate is the rhythm.', 'Root–octave–fifth shapes and octave leaps make it soar.', 'Change the chord every bar or two and voice-lead the arp through it.', 'Accents on the off-beats push it forward.'],
      refs: 'Armin van Buuren · Above & Beyond · Ferry Corsten · Funk Tribu · Trym',
      progs: [{p: 'i VI III VII', name: 'The anthem'}, {p: 'i VII VI VII', name: 'i–VII–VI–VII'}, {p: 'VI VII i i', name: 'Climb home'}, {p: 'i v VI III iv i iv v', name: 'Eight-bar epic'}, {p: 'i iv VI v', name: 'i–iv–VI–v'}],
      target: {density: [10, 16], sync: [0, 0.7], kick: [0, 0.35], range: [7, 30], leap: [2, 12.5], length: [0.35, 1.3], swing: [50, 52]},
      gen: {bpm: [136, 140], keys: [9, 2, 6, 11, 4], scales: {minor: 4, harmonic: 1}, rates: {'16': 1}, lengths: {16: 5, 8: 1, 12: 1}, shapes: {full: 6, euclid: 1}, hits: [11, 16],
        pools: {chord: 3, root5: 2, triad: 2, chord9: 1}, orders: {up: 3, seq: 3, updown: 1, pinky: 1}, seqLen: [3, 8], octaves: {2: 4, 1: 1, 3: 1}, count: {0: 3, 3: 1},
        advance: {note: 4, step: 1}, reset: {bar: 2, chord: 2, never: 1}, gate: [0.35, 0.6], swing: [50, 51], accent: 0.2, accentEvery: [2, 4, 0], oct: 0.18, ratchet: 0, chordHit: 0, pedal: 0.04,
        sounds: ['supersaw', 'hollow-square', 'glass-pluck', 'trance-lead', 'string-pluck'], evos: ['build', 'slow-open', 'none'], fills: ['roll', 'climb', 'none'], reg: [62, 72]},
    },
    afro: {
      name: 'Afro house', color: '#FFB547', bpm: [118, 123], groove: 'afro', bass: 'afro', key: 'G', scale: 'minor',
      blurb: 'Mallets and plucks in 3-against-2: clave rhythms, pentatonic notes, wood and air.',
      job: 'The arp is melodic percussion. It talks with the congas and shakers, phrases in threes against the four-on-the-floor, and uses pentatonic or modal notes so it can repeat for minutes without wearing out.',
      tips: ['Think clave: 3+3+2 and 3-2 son patterns instead of straight 16ths.', 'Pentatonic, Dorian and Phrygian pools sound right and never clash.', 'A marimba or kalimba with a short decay is half the style.', 'Triplet 16ths against the straight hats give the forward lean.'],
      refs: 'Black Coffee · &ME · Rampa · Adam Port · Themba · Enoo Napa',
      progs: [{p: 'i7 iv7', name: 'i7–iv7'}, {p: 'i VII', name: 'i–VII'}, {p: 'i9 VI7', name: 'i9–VImaj7'}, {p: 'i', name: 'One chord'}, {p: 'i bII', name: 'Phrygian half-step'}],
      target: {density: [3.5, 12], sync: [0.3, 1], kick: [0, 0.4], range: [5, 20], leap: [1.5, 8], length: [0.3, 2], swing: [50, 58]},
      gen: {bpm: [118, 123], keys: [7, 9, 2, 4, 0], scales: {minor: 2, dorian: 2, phrygian: 1}, rates: {'16': 4, '16t': 2}, lengths: {16: 5, 12: 2, 6: 1, 32: 1}, shapes: {tresillo: 5, euclid: 3, offbeat: 1}, hits: [4, 8],
        pools: {penta: 4, scale: 2, chord: 1, chord9: 1}, orders: {seq: 4, up: 1, updown: 1, converge: 1}, seqLen: [3, 6], octaves: {1: 3, 2: 2}, count: {0: 1},
        advance: {note: 3, step: 1}, reset: {bar: 2, never: 1, '2bar': 1}, gate: [0.3, 0.8], swing: [52, 57], accent: 0.25, oct: 0.08, ratchet: 0.03, chordHit: 0, pedal: 0.08,
        sounds: ['marimba', 'kalimba', 'log-drum', 'tech-pluck', 'vox-chop', 'wood-knock'], evos: ['none', 'breathe', 'slow-open'], fills: ['none', 'answer', 'drop'], reg: [60, 70], static: 0.3},
    },
    deep: {
      name: 'Deep & organic house', color: '#4FE3B0', bpm: [118, 122], groove: 'deep', bass: 'deep', key: 'C', scale: 'dorian',
      blurb: 'Broken 9th chords on Rhodes and stabs, with room between the notes. Warm, lazy, soulful.',
      job: 'The arp is the harmony moving. Extended chords (m9, maj7, 11) played as broken chords and stabs, longer notes, slower rates, and a lot of space for the groove and the vocal.',
      tips: ['Use 9ths and 7ths: the extensions are the sound.', 'Fewer notes, longer gates: let each note ring into the next.', 'Dorian minor is the deep house mode.', 'Chord stabs on the off-beat with a dub delay are a whole track.'],
      refs: 'Kerri Chandler · Larry Heard · Moodymann · Sabo · Bedouin',
      progs: [{p: 'i9 iv9', name: 'i9–iv9'}, {p: 'i7 VImaj7', name: 'i7–VImaj7'}, {p: 'i9 VII9', name: 'i9–VII'}, {p: 'iv9 v7 i9', name: 'Soul turnaround'}, {p: 'i11', name: 'One m11'}],
      target: {density: [2, 10], sync: [0.25, 1], kick: [0, 0.5], range: [5, 24], leap: [1.5, 9], length: [0.6, 4], swing: [51, 60]},
      gen: {bpm: [118, 122], keys: [0, 5, 2, 9, 7], scales: {dorian: 3, minor: 2}, rates: {'16': 3, '8': 2}, lengths: {16: 5, 32: 2, 8: 1}, shapes: {euclid: 3, sparse: 2, tresillo: 2, offbeat: 2}, hits: [3, 7],
        pools: {chord9: 4, chord: 3}, orders: {up: 3, updown: 2, converge: 1, seq: 1}, seqLen: [3, 5], octaves: {1: 3, 2: 2}, count: {0: 1},
        advance: {note: 4, step: 1}, reset: {chord: 3, bar: 1}, gate: [0.7, 1.4], swing: [53, 58], accent: 0.2, oct: 0.04, ratchet: 0, chordHit: 0.12, pedal: 0.04,
        sounds: ['rhodes', 'chord-stab', 'house-piano', 'glass-pluck', 'marimba', 'bell-tick'], evos: ['none', 'breathe', 'pluck-to-pad'], fills: ['none', 'drop'], reg: [58, 68], per: [1, 2]},
    },
    techno: {
      name: 'Techno', color: '#A9B4C8', bpm: [128, 135], groove: 'techno', bass: 'sub', key: 'F', scale: 'phrygian',
      blurb: 'One to three notes, repeated until they hypnotise. Polymeters, dark modes and a filter as the only story.',
      job: 'The sequence is the trance state. It barely changes pitch; it changes against the bar (polymeter), against the filter and against the delay. The fewer the notes, the more each move matters.',
      tips: ['One to three notes: root, fifth, a flat second.', 'Odd pattern lengths (3, 5, 7 steps) turn a loop into a slowly rotating shape.', 'Phrygian and minor: the b2 is the darkest note in music.', 'Automate the filter and resonance over 16 bars: that is the arrangement.'],
      refs: 'Charlotte de Witte · Amelie Lens · Adam Beyer · Enrico Sangiuliano · Robert Hood',
      progs: [{p: 'i', name: 'One chord'}, {p: 'i bII', name: 'Phrygian b2'}, {p: 'i v', name: 'i–v'}, {p: 'i VII', name: 'i–VII'}, {p: 'i7', name: 'One m7 (stabs)'}, {p: 'i iv', name: 'i–iv'}],
      target: {density: [2.5, 16], sync: [0, 1], kick: [0, 0.42], range: [0, 15], leap: [0, 8.5], length: [0.25, 1.6], swing: [50, 54]},
      gen: {bpm: [128, 135], keys: [5, 7, 9, 4, 1], scales: {phrygian: 3, minor: 3}, rates: {'16': 6, '8': 1}, lengths: {16: 4, 3: 2, 5: 2, 7: 2, 9: 1, 12: 1, 32: 1}, shapes: {euclid: 4, full: 2, offbeat: 3, sparse: 2}, hits: [3, 10],
        pools: {root5: 3, root: 2, scale: 2, chord: 1}, orders: {seq: 3, up: 2, updown: 1}, seqLen: [2, 4], octaves: {1: 4, 2: 1}, count: {0: 2, 2: 2},
        advance: {note: 2, step: 2}, reset: {never: 3, bar: 2}, gate: [0.25, 0.55], swing: [50, 52], accent: 0.25, accentEvery: [3, 5, 0], oct: 0.1, ratchet: 0.03, chordHit: 0, pedal: 0.1,
        sounds: ['sub-pulse', 'dark-saw', 'perc-bleep', 'chord-stab', 'acid-303', 'micro-pluck', 'wood-knock', 'laser-zap', 'hollow-square'], evos: ['dark-ride', 'breathe', 'slow-open', 'none'], fills: ['none', 'drop', 'stutter'], reg: [56, 64]},
    },
    acid: {
      name: 'Acid', color: '#FFE14D', bpm: [125, 135], groove: 'techno', bass: 'offbeat', key: 'A', scale: 'minor',
      blurb: 'A 303 line: slides, accents and octave jumps, with the resonance doing the screaming.', lowOk: true,
      job: 'The arp is the acid line: a monophonic 16th sequence where accents and slides matter as much as the notes, played on a resonant filter that gets ridden live.',
      tips: ['Slides only glide into the next note: put them before the notes you want to bend into.', 'Accents (velocity 110+) open the filter and the volume together.', 'Root, octave, b3, 5, b7: acid is pentatonic with jumps.', 'Ride cutoff and resonance by hand: the exported CC74/CC71 is a start.'],
      refs: 'Phuture · DJ Pierre · Hardfloor · Josh Wink · I Hate Models',
      progs: [{p: 'i', name: 'One chord'}, {p: 'i VII', name: 'i–VII'}, {p: 'i iv', name: 'i–iv'}],
      target: {density: [6, 16], sync: [0, 0.7], kick: [0.05, 0.5], range: [7, 27], leap: [2, 12.5], length: [0.4, 2], swing: [50, 57]},
      gen: {bpm: [125, 135], keys: [9, 4, 7, 2], scales: {minor: 3, phrygian: 1, dorian: 1}, rates: {'16': 1}, lengths: {16: 6, 32: 1, 7: 1, 13: 1}, shapes: {full: 3, euclid: 3, offbeat: 1}, hits: [7, 13],
        pools: {scale: 3, penta: 3, root5: 1}, orders: {seq: 6, up: 1}, seqLen: [4, 8], octaves: {1: 2, 2: 2}, count: {0: 1},
        advance: {note: 3, step: 1}, reset: {bar: 3, never: 1}, gate: [0.5, 0.9], swing: [50, 56], accent: 0.3, oct: 0.15, ratchet: 0, slide: 0.18, chordHit: 0, pedal: 0, tie: 0.1,
        sounds: ['acid-303'], evos: ['dark-ride', 'breathe', 'slow-open'], fills: ['none', 'climb', 'none'], reg: [48, 58]},
    },
    'nu-disco': {
      name: 'Nu-disco & indie dance', color: '#FF8A5C', bpm: [115, 122], groove: 'disco', bass: 'disco', key: 'E', scale: 'minor',
      blurb: 'Octave bounces and Italo sequences: bright, bouncy, a little cheeky.',
      job: 'The arp is the bassline\'s partner or the bassline itself: octave bounces, galloping Italo sequences, piano stabs. It sits on the beat more than any other genre here, because disco is happy to.',
      tips: ['Octaves on 8ths or 16ths: the disco bounce.', 'Gallop (x.xx) rhythms are pure Italo.', 'Major keys and bright saws are allowed here.', 'A filter that opens and closes every 4 bars is the French-touch move.'],
      refs: 'Purple Disco Machine · Todd Terje · Lindstrøm · Breakbot · Giorgio Moroder',
      progs: [{p: 'i VII VI VII', name: 'i–VII–VI–VII'}, {p: 'i iv VII III', name: 'Circle of fifths'}, {p: 'vi IV I V', name: 'Pop four (major)'}, {p: 'I iii IV V', name: 'Sunny climb'}, {p: 'i VI', name: 'i–VI'}],
      target: {density: [5, 16], sync: [0, 0.7], kick: [0.12, 0.6], range: [5, 26], leap: [3, 12.5], length: [0.35, 1.8], swing: [50, 56]},
      gen: {bpm: [115, 122], keys: [4, 9, 2, 0, 7], scales: {minor: 3, major: 1, dorian: 1}, rates: {'16': 3, '8': 2}, lengths: {16: 5, 8: 2}, shapes: {gallop: 3, full: 3, euclid: 1}, hits: [6, 14],
        pools: {octave: 3, chord: 2, root5: 1, triad: 1}, orders: {up: 3, updown: 1, seq: 2, down: 1}, seqLen: [2, 4], octaves: {1: 2, 2: 2}, count: {0: 1},
        advance: {note: 4}, reset: {bar: 2, chord: 2}, gate: [0.3, 0.7], swing: [50, 55], accent: 0.2, oct: 0.12, ratchet: 0, chordHit: 0.05, pedal: 0,
        sounds: ['disco-saw', 'house-piano', 'tech-pluck', 'supersaw', 'clav', 'mono-lead'], evos: ['breathe', 'none', 'slow-open'], fills: ['none', 'climb', 'roll'], reg: [52, 64]},
    },
    garage: {
      name: 'UK garage & bass house', color: '#3DFFD0', bpm: [128, 134], groove: 'garage', bass: 'garage', key: 'F', scale: 'minor',
      blurb: 'Heavily swung 2-step riffs: organ, vocal chops and rubbery stabs bouncing off the shuffle.',
      job: 'The arp is a shuffled riff that skips around the 2-step kick and snare. Swing is extreme (58–66%), notes are short, and the hook lives in the syncopation.',
      tips: ['Swing hard: 60% and up. Garage without shuffle is house.', 'Riffs answer the 2-step kick: leave beat 1 and the "and" of 3 to it.', 'Organ and vocal chops are the classic sounds.', 'Short gates, then a reverb tail.'],
      refs: 'MJ Cole · Todd Edwards · Sammy Virji · Interplanetary Criminal · Chris Lorenzo',
      progs: [{p: 'i7 iv9', name: 'i7–iv9'}, {p: 'i VI', name: 'i–VI'}, {p: 'i7 VII', name: 'i7–VII'}, {p: 'iv9 i7', name: 'iv9–i7'}],
      target: {density: [3, 11], sync: [0.4, 1], kick: [0, 0.32], range: [0, 17], leap: [0, 9], length: [0.25, 1.8], swing: [57, 68]},
      gen: {bpm: [128, 134], keys: [5, 7, 9, 0], scales: {minor: 3, dorian: 2}, rates: {'16': 1}, lengths: {16: 5, 32: 2}, shapes: {twostep: 4, offbeat: 3, euclid: 1}, hits: [4, 8],
        pools: {scale: 2, chord: 2, chord9: 1, penta: 2, root: 1}, orders: {seq: 4, up: 1, pinky: 1}, seqLen: [2, 5], octaves: {1: 4, 2: 1}, count: {0: 2, 3: 1},
        advance: {note: 3}, reset: {bar: 3, '2bar': 1}, gate: [0.25, 0.6], swing: [59, 65], accent: 0.3, oct: 0.1, ratchet: 0.05, chordHit: 0.12, pedal: 0.05,
        sounds: ['organ-stab', 'vox-chop', 'rubber-stab', 'chord-stab', 'rhodes', 'clav'], evos: ['none', 'breathe', 'gate-pump'], fills: ['none', 'drop', 'ratchet'], reg: [58, 68]},
    },
    'hard-techno': {
      name: 'Hard techno & neo-rave', color: '#FF4D4D', bpm: [145, 155], groove: 'hard', bass: 'hard', key: 'F#', scale: 'minor',
      blurb: 'Rave stabs and trance arps at 150 BPM, distorted and euphoric over a rumbling kick.',
      job: 'The arp is the rave signal: 90s trance and hoover sounds, driven hard, 16ths with octave leaps, often the only melodic element over the kick rumble.',
      tips: ['Fast and simple: three or four notes with octave jumps survive the distortion.', 'Drive and OTT on the arp; keep it above 200 Hz so the rumble owns the low end.', 'Trance progressions are back: i–VI–III–VII at 150.', 'Stabs on the off-beats, sequences on the 16ths.'],
      refs: 'Sara Landry · I Hate Models · Funk Tribu · 999999999 · Kobosil',
      progs: [{p: 'i VI VII v', name: 'i–VI–VII–v'}, {p: 'i', name: 'One chord'}, {p: 'i VI III VII', name: 'Rave anthem'}, {p: 'i VII VI VII', name: 'i–VII–VI–VII'}],
      target: {density: [6, 16], sync: [0, 0.7], kick: [0, 0.5], range: [5, 28], leap: [2, 12.5], length: [0.3, 1.3], swing: [50, 52]},
      gen: {bpm: [145, 155], keys: [6, 9, 4, 1], scales: {minor: 4, harmonic: 1, phrygian: 1}, rates: {'16': 1}, lengths: {16: 6, 8: 1, 12: 1}, shapes: {full: 4, offbeat: 2, euclid: 2}, hits: [8, 16],
        pools: {chord: 3, root5: 2, triad: 2}, orders: {up: 3, seq: 3, pinky: 1}, seqLen: [3, 6], octaves: {2: 3, 1: 2}, count: {0: 3, 3: 1},
        advance: {note: 4}, reset: {bar: 2, chord: 2}, gate: [0.3, 0.55], swing: [50, 51], accent: 0.25, accentEvery: [2, 4, 0], oct: 0.15, ratchet: 0.03, chordHit: 0.05, pedal: 0.05,
        sounds: ['rave-hoover', 'supersaw', 'hollow-square', 'acid-303', 'hoover-long'], evos: ['build', 'slow-open', 'none'], fills: ['roll', 'climb', 'none'], reg: [60, 70]},
    },
    minimal: {
      name: 'Minimal & rominimal', color: '#B7C8A0', bpm: [124, 127], groove: 'minimal', bass: 'minimal', key: 'G', scale: 'minor',
      blurb: 'Tiny, swung, two-bar micro-riffs that you notice only when they stop. Patience as a style.',
      job: 'The arp is a texture: a few blips spread over two bars, swung, quiet, slowly mutating. It rarely plays more than five notes a bar, and its range is small.',
      tips: ['Two-bar patterns (32 steps) with only a handful of notes.', 'Swing 55–60% and humanise: it should feel played, not programmed.', 'Mutate one note every 4 or 8 bars instead of writing a new riff.', 'Small range: everything within an octave.'],
      refs: 'Ricardo Villalobos · Rhadoo · Raresh · Petre Inspirescu · Sonja Moonear',
      progs: [{p: 'i', name: 'One chord'}, {p: 'i7', name: 'One m7'}, {p: 'i iv', name: 'i–iv'}],
      target: {density: [1.5, 7], sync: [0.4, 1], kick: [0, 0.32], range: [0, 13], leap: [0, 7], length: [0.25, 1.4], swing: [53, 62]},
      gen: {bpm: [124, 127], keys: [7, 9, 2, 5], scales: {minor: 2, dorian: 2, phrygian: 1}, rates: {'16': 1}, lengths: {32: 5, 16: 2, 24: 1}, shapes: {sparse: 4, euclid: 2, offbeat: 2}, hits: [3, 7],
        pools: {root: 2, root5: 2, penta: 2, scale: 1}, orders: {seq: 3, up: 1}, seqLen: [2, 4], octaves: {1: 1}, count: {0: 1, 2: 1},
        advance: {note: 2, step: 1}, reset: {'2bar': 3, never: 1}, gate: [0.2, 0.45], swing: [55, 60], accent: 0.3, oct: 0.08, ratchet: 0.06, chordHit: 0, pedal: 0.1,
        sounds: ['perc-bleep', 'rubber-stab', 'sub-pulse', 'marimba', 'micro-pluck', 'wood-knock'], evos: ['none', 'breathe'], fills: ['none', 'drop'], reg: [58, 68]},
    },
    'dub-techno': {
      name: 'Dub techno', color: '#6FA8A0', bpm: [118, 126], groove: 'dub', bass: 'dub', key: 'C', scale: 'minor',
      blurb: 'One minor chord, hit rarely, thrown into a delay that never quite stops. The echo is the arrangement.',
      job: 'The "arp" is a chord stab and its echoes. Two to five hits a bar, often fewer, each one feeding a long, filtered feedback delay and a big reverb, so the space between the hits fills with the chord\'s own reflections. What changes over ten minutes is the filter, the feedback and the reverb, not the notes.',
      tips: ['Fewer hits than you think: two or three a bar, never on the kick.', 'Minor 7th, minor 9th and stacked 4ths: chords with no strong pull, so they can repeat forever.', 'Feedback 55–70% on a dotted-8th delay, filtered: the echoes are the rhythm section.', 'Automate the cutoff and the delay send over 32 bars. That is the whole arrangement.'],
      refs: 'Basic Channel · Maurizio · DeepChord · Echospace · Deadbeat · Fluxion',
      progs: [{p: 'i7', name: 'One m7 (the norm)'}, {p: 'i9', name: 'One m9'}, {p: 'i7 iv7', name: 'i7–iv7'}, {p: 'i7 VII', name: 'i7–VII'}, {p: 'i9 VI', name: 'i9–VI'}],
      target: {density: [1.5, 7], sync: [0.3, 1], kick: [0, 0.4], range: [0, 19], leap: [0, 9], length: [0.3, 3], swing: [50, 56]},
      gen: {bpm: [118, 126], keys: [0, 5, 7, 9, 2], scales: {minor: 4, dorian: 2}, rates: {'16': 4, '8': 1}, lengths: {16: 5, 32: 2, 12: 1}, shapes: {sparse: 4, offbeat: 3, euclid: 2}, hits: [2, 5],
        pools: {chord: 3, chord9: 3, triad: 1}, orders: {up: 2, updown: 1, seq: 1}, seqLen: [2, 4], octaves: {1: 4, 2: 1}, count: {0: 1},
        advance: {note: 3, step: 1}, reset: {chord: 2, never: 1, bar: 1}, gate: [0.3, 0.6], swing: [50, 55], accent: 0.15, oct: 0.03, ratchet: 0, chordHit: 0.3, pedal: 0,
        sounds: ['chord-stab', 'glass-pluck', 'rhodes', 'bell-tick', 'string-pluck'], evos: ['breathe', 'slow-open', 'dark-ride', 'none'], fills: ['none', 'drop'], reg: [58, 66]},
    },
    detroit: {
      name: 'Detroit techno', color: '#E0A458', bpm: [126, 134], groove: 'detroit', bass: 'detroit', key: 'F', scale: 'minor',
      blurb: 'Machine soul: strings and chord stabs over a 909, futuristic sequences, and the stripped-down loop of the second wave.',
      job: 'The arp carries the feeling. Detroit techno puts chords and melody on top of a hard machine groove: string lines and piano stabs that move through minor progressions, sci-fi sequences in 16ths, or, in the minimal strain, a tiny riff repeated until it becomes a groove of its own.',
      tips: ['Minor chords that move: i–VI, i–iv–VII–III. Detroit wants a progression, not a single chord.', 'Strings and stabs play the harmony; the 909 plays it hard.', 'Swing a touch (52–55%): it was played on machines by people who loved funk.', 'Or strip it to one riff and a hi-hat: the minimal Detroit loop is as much the style as the strings.'],
      refs: 'Juan Atkins · Derrick May · Kevin Saunderson · Jeff Mills · Robert Hood · Carl Craig · Underground Resistance',
      progs: [{p: 'i VI', name: 'i–VI'}, {p: 'i iv VII III', name: 'i–iv–VII–III'}, {p: 'i7 iv7', name: 'i7–iv7'}, {p: 'i VII VI VII', name: 'i–VII–VI–VII'}, {p: 'i', name: 'One chord (minimal)'}],
      target: {density: [3, 16], sync: [0, 1], kick: [0, 0.45], range: [0, 24], leap: [0, 10], length: [0.3, 2.5], swing: [50, 56]},
      gen: {bpm: [126, 134], keys: [5, 9, 7, 0, 2], scales: {minor: 4, dorian: 2}, rates: {'16': 5, '8': 1}, lengths: {16: 6, 32: 1, 12: 1}, shapes: {euclid: 3, offbeat: 3, full: 2, tresillo: 2, sparse: 1}, hits: [4, 12],
        pools: {chord: 3, chord9: 2, triad: 2, root5: 1, penta: 1}, orders: {up: 3, updown: 2, seq: 2, converge: 1}, seqLen: [3, 6], octaves: {1: 3, 2: 2}, count: {0: 3, 3: 1},
        advance: {note: 4, step: 1}, reset: {chord: 3, bar: 1, never: 1}, gate: [0.3, 0.7], swing: [51, 55], accent: 0.2, oct: 0.06, ratchet: 0.02, chordHit: 0.12, pedal: 0.04,
        sounds: ['chord-stab', 'string-pluck', 'hollow-square', 'house-piano', 'rhodes', 'perc-bleep', 'dark-saw', 'glass-pluck'], evos: ['slow-open', 'breathe', 'none', 'pluck-to-pad'], fills: ['none', 'climb', 'drop'], reg: [60, 68]},
    },
  };

  // ---- the patterns ----
  const PATTERNS = [];
  const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  function group(genre, sub, defaults, list) {
    for (const [name, steps, o, why] of list) PATTERNS.push(Object.assign({id: slug(genre + ' ' + name), genre, sub, name, steps, why}, defaults, o));
  }

  // ===== TECH HOUSE (deep) =====
  const TH = 'tech-house';
  group(TH, 'Organ riffs', {sound: 'organ-stab', pool: 'scale', order: 'seq', swing: 57, gate: 0.32, reg: 64, evo: 'slow-open', bpm: 126, key: 'F'}, [
    ['Organ bounce', '..X..x.x..X..x.x', {seq: [0, 0, 2, 0, 4, 0], fill: 'drop'}, 'Six notes that never touch the kick. The root repeats so the two moving notes (b3, 5) sound like a hook.'],
    ['Off-beat organ', '..x...x...x..xx.', {seq: [0, 0, 0, 2, 4], swing: 56}, 'The house organ in its home: on the off-beat, with a two-note pickup into beat 4 that does all the talking.'],
    ['Dotted organ', '..x..x..x..x..x.', {seq: [0, 4], reset: 'never', fill: 'none'}, 'Every three 16ths: a dotted-8th pulse against the four-on-the-floor. Two notes, a two-bar cycle.'],
    ['Organ call & answer', '..X..x.x..x.......X..x.x..x..x.x', {seq: [0, 0, 2, 0, 0, 0, 2, 0, 4, 7], reset: '2bar'}, 'Bar 1 asks, bar 2 answers with two extra notes that climb to the octave. The longest pattern here and the most vocal.'],
    ['Organ fifths', '..x..x.x..x..x.x', {pool: 'root5', seq: [0, 1, 0, 1, 2, 1], swing: 56}, 'Root, fifth, octave: an organ riff that works over any bassline because it only uses the strongest intervals.'],
    ['M1 chord organ', '..C..c....C..c..', {pool: 'chord', prog: 'i7 iv7', order: 'up', gate: 0.28, evo: 'breathe'}, 'Chord hits on the organ over i7–iv7. The 90s piano-house move, tightened into tech house.'],
    ['Dorian organ', '..x..x.x.x..x.x.', {scale: 'dorian', seq: [0, 2, 3, 0, 5, 2], key: 'G', evo: 'breathe'}, 'Dorian\'s bright 6th (index 5) is the note that makes this riff smile instead of frown.'],
  ]);
  group(TH, 'Stabs', {sound: 'chord-stab', pool: 'chord', order: 'up', swing: 56, gate: 0.3, reg: 62, bpm: 125, key: 'G', delay: 0.26, reverb: 0.3}, [
    ['Off-beat stab', '..C...c...C...c.', {prog: 'i9', evo: 'breathe'}, 'A minor-9 stab on every off-beat. The delay and reverb make the rest of the rhythm: dub techno\'s gift to tech house.'],
    ['Dub stab', '...C......c.....', {prog: 'i7', delay: 0.4, fb: 0.55, evo: 'slow-open'}, 'Two stabs a bar, one of them pushed a 16th late, with a long feedback delay. Space is the hook.'],
    ['Two-chord stab', '..C..c.....C..c.', {prog: 'i7 VII', evo: 'breathe'}, 'i7 to VII, one bar each. The second hit in each pair lands on the "a" of the beat and drags the groove forward.'],
    ['Stab and note', '..C...x.x.C...x.', {prog: 'i9', order: 'down', sound: 'chord-stab'}, 'A stab, then two single chord tones walking down from the top: chord and riff in one part.'],
    ['Swung stab roll', '..c.cc..c..c.cc.', {prog: 'i7', gate: 0.27, swing: 58, evo: 'gate-pump'}, 'Seven short stabs with pairs on the "and-a": swing turns them into a rolling shuffle.'],
  ]);
  group(TH, 'Pedal & answer', {sound: 'tech-pluck', pool: 'scale', order: 'seq', swing: 56, gate: 0.3, reg: 64, bpm: 126, key: 'A'}, [
    ['Pedal riff', '..p.xp.x..p.xp.x', {seq: [4, 2, 6, 3], evo: 'slow-open'}, 'The root is the pedal (p); between them a four-note line (5, b3, b7, 4) moves. The ear hears two parts.'],
    ['Top pedal', '..x..xx...x..xx.', {pool: 'chord9', order: 'pinky', evo: 'breathe'}, 'Pinky order: the top note returns after every other note, so the riff hangs from a high note.'],
    ['Thumb roll', '.xxx.xxx.xxx.xxx', {pool: 'chord', order: 'thumb', gate: 0.26, swing: 55, accent: 22, evo: 'slow-open'}, 'Twelve 16ths a bar with the kick\'s 16th left empty. Thumb order: the root returns between every note.'],
    ['Question & answer', '.x.x..x..x.x..x.', {pool: 'penta', order: 'up', fill: 'answer', fillEvery: 2}, 'Bar 1 climbs the pentatonic, bar 2 plays the same rhythm in reverse: a call and its answer from one pattern.'],
    ['Octave pedal', '..x.xo.x..x.xo.x', {pool: 'octave', order: 'up', gate: 0.25, sound: 'organ-stab'}, 'Root and octave alternating with two-octave flicks: a riff with almost no notes and huge movement.'],
  ]);
  group(TH, 'Polymeter & rolling', {sound: 'tech-pluck', pool: 'chord', order: 'up', swing: 56, gate: 0.3, reg: 64, bpm: 126, key: 'F', reset: 'never'}, [
    ['3 against 16', '..xx..xx..xx..xx', {pool: 'triad', evo: 'slow-open'}, 'Three chord tones over eight hits a bar: the note on the "and" changes every bar and the loop takes three bars to come back.'],
    ['5-step loop', '..x.x', {pool: 'chord9', count: 3, evo: 'breathe'}, 'A five-step pattern against a sixteen-step bar: the rhythm meets the bar line every five bars, the three notes only every fifteen. Hypnotic without a single new note.'],
    ['7-step loop', '.x..x.x', {pool: 'scale', order: 'seq', seq: [0, 2, 4], evo: 'slow-open'}, 'Seven steps, three notes: 21 notes before the pattern and the note cycle meet again. Tech house\'s "rolling" feel.'],
    ['Rolling 16ths', '.Xxx.xXx.xxX.xxx', {count: 3, order: 'updown', gate: 0.27, accent: 20, reset: 'bar'}, 'Every 16th but the kick, with an accent walking one step later each beat: the rolling riff.'],
    ['Six over sixteen', '.x.x..', {pool: 'triad', order: 'up', gate: 0.28, sound: 'rubber-stab'}, 'A six-step loop (a dotted quarter) against the bar, on odd 16ths only so it never touches the kick: three notes rotating against the beat.'],
    ['Euclid six', '..x..x.x.x..x.x.', {pool: 'scale', order: 'seq', seq: [0, 2, 0, 4, 3, 0], reset: 'bar', sound: 'organ-stab'}, 'Six hits spread as evenly as 16 steps allow (a Euclidean rhythm), rotated off the beat. Even spacing = instant groove.'],
  ]);
  group(TH, 'Bleeps', {sound: 'perc-bleep', pool: 'root', order: 'up', swing: 57, gate: 0.28, reg: 66, bpm: 127, key: 'G'}, [
    ['One-note bleep', '..X..x.o...x..X.', {evo: 'none', fill: 'ratchet'}, 'One note, five hits, one octave flick. The pitch never changes; the accent and the octave are the melody.'],
    ['Rubber bounce', '..x.x..x..x..x.x', {sound: 'rubber-stab', pool: 'root5', order: 'seq', seq: [0, 0, 1, 0, 2, 0], evo: 'breathe'}, 'A rubbery square through a resonant filter, bouncing between the root and the fifth.'],
    ['Ping every three', 'x..', {pool: 'root5', reset: 'never', evo: 'breathe'}, 'One hit every three 16ths, cycling root–fifth–octave: two polymeters at once, and a three-bar shape.'],
    ['Blip ratchet', '..x...r...x..r.x', {evo: 'none'}, 'Two ratchets (two 32nds in one 16th) break up a plain bleep pattern. Minimal tech\'s favourite trick.'],
    ['Tuned perc', '.x..x..x.x...x.x', {pool: 'penta', order: 'seq', seq: [0, 2, 1, 3, 0, 4], sound: 'perc-bleep'}, 'Pentatonic blips placed like a percussion part: halfway between a riff and a conga.'],
  ]);
  group(TH, 'Acid tech', {sound: 'acid-303', pool: 'scale', order: 'seq', swing: 55, gate: 0.6, reg: 60, bpm: 127, key: 'A', evo: 'dark-ride'}, [
    ['Acid roller', '.xSx.xXs.xsX.xxs', {seq: [0, 7, 0, 2, 0, 4, 6, 0, 3, 0, 7, 4]}, 'Twelve notes, none on the kick, with slides and accents. Ride the resonance.'],
    ['Acid stabs', '..X..s.x..X..s.x', {seq: [0, 7, 3, 0, 6, 4], gate: 0.7}, 'Fewer notes, all slides and accents: acid as a riff, not a wall of 16ths.'],
    ['Squelch one-note', '.xXx.xxX.xXx.xxS', {pool: 'root', order: 'up', gate: 0.5}, 'One pitch, all movement from accents and the slide at the end of the bar. Proof that acid is a filter, not a melody.'],
  ]);
  group(TH, 'Vocal chops', {sound: 'vox-chop', pool: 'scale', order: 'seq', swing: 56, gate: 0.45, reg: 66, bpm: 126, key: 'F'}, [
    ['Vox hook', '..x..x....x..x..', {seq: [4, 4, 2, 0], evo: 'none'}, 'Four chopped syllables: two on the fifth, then down. Leave it repetitive, the way a sampled vocal hook is.'],
    ['Chop stutter', '..rx..x...r...x.', {seq: [0, 2, 4, 2], gate: 0.35}, 'Ratchets stutter the chop like a sampler re-triggering. The classic chop-shop rhythm.'],
    ['Vox answer', '..x..x.x..........x..x.x..x..x..', {seq: [4, 2, 0, 4, 2, 0, 6, 4], reset: '2bar'}, 'Two bars: three syllables, silence, then four with a high one. The silence makes the answer land.'],
  ]);
  group(TH, 'Melodic tech house', {sound: 'tech-pluck', pool: 'chord', order: 'up', swing: 55, gate: 0.3, reg: 64, bpm: 125, key: 'A', reset: 'chord'}, [
    ['Melodic tech arp', '.xxx.xxx.xxx.xxx', {prog: 'i VI III VII', octaves: 1, gate: 0.25, evo: 'slow-open'}, 'The four-chord progression spelled out in 16ths, with the kick\'s 16th left out each beat. Voice-led so it flows.'],
    ['Afters pluck', '..xx..x...xx..x.', {prog: 'i iv', pool: 'chord9', order: 'converge', evo: 'breathe'}, 'i to iv with the 9th added: outside-in order turns six notes into a question that keeps asking.'],
    ['Deep tech 9ths', '.x.x..x.x.x..x.x', {prog: 'i9 iv9', pool: 'chord9', order: 'updown', sound: 'glass-pluck', evo: 'pluck-to-pad'}, 'Minor-9th chords as a broken, swung arp, the pluck slowly growing into a pad.'],
    ['Sunset pluck', '..x..xx...x..xx.', {prog: 'VI VII i i', pool: 'chord9', order: 'down', sound: 'glass-pluck', evo: 'slow-open'}, 'VI–VII–i: the progression rises home while the arp falls. Contrary motion is the oldest trick in the book.'],
    ['Two-bar journey', '..x.x..x..x.x.xx..x.x..x..x..x.x', {prog: 'i VI', per: 2, order: 'seq', pool: 'scale', follow: false, seq: [0, 2, 4, 2, 0, 2, 4, 6, 4, 2, 0, 2, 4, 2, 4]}, 'A 32-step riff over a two-bar chord change: a melody hiding inside a groove.'],
  ]);
  group(TH, 'Build tools', {sound: 'chord-stab', pool: 'chord', order: 'up', swing: 56, gate: 0.3, reg: 62, bpm: 126, key: 'F', prog: 'i7', bars: 16}, [
    ['Roll-in stab', '..C...c...C...c.', {fill: 'roll', fillEvery: 4, evo: 'build'}, 'An off-beat stab that rolls into every fourth bar while the build automation climbs.'],
    ['Gate riser', '..x..x.x..x..x.x', {pool: 'scale', order: 'seq', seq: [0, 0, 2, 0, 4, 0], sound: 'organ-stab', evo: 'into-drop', bars: 8}, 'The organ bounce, still for six bars, then the filter, gate and reverb rise into the drop.'],
  ]);

  // ===== MELODIC TECHNO =====
  group('melodic-techno', 'Sequences', {sound: 'dark-saw', pool: 'chord', order: 'up', octaves: 2, gate: 0.5, reg: 62, bpm: 124, key: 'A', prog: 'i VI III VII', reset: 'never', swing: 50}, [
    ['Afterlife sequence', 'XxxXxxXxxXxxXxxX', {evo: 'afterlife', bars: 32}, 'Every 16th through two octaves of chord tones, accented in threes against the four: the long-form melodic techno engine.'],
    ['Converge cascade', 'xxxxxxxxxxxxxxxx', {pool: 'chord9', order: 'converge', evo: 'slow-open', sound: 'tech-pluck'}, 'Outside-in through two octaves with the 9th: wide leaps that settle toward the middle.'],
    ['Pedal ostinato', 'xxxxxxxxxxxxxxxx', {pool: 'scale', order: 'thumb', count: 5, octaves: 1, prog: 'i VI VII v', evo: 'pluck-to-pad'}, 'The root as a pedal between every scale step: a Bach-like ostinato moved into a club.'],
    ['Five-step spiral', 'x.xxx', {pool: 'chord', count: 3, evo: 'slow-open', sound: 'hollow-square'}, 'A five-step loop of four notes against the bar: it spirals and only meets the bar line every five bars.'],
    ['Rolling triplets', 'x.xx.xx.xx.x', {rate: '16t', pool: 'triad', gate: 0.7, evo: 'breathe', sound: 'glass-pluck'}, 'Skipping triplet 16ths against straight hats: a rolling, galloping sequence without any swing.'],
    ['Dark descent', 'xxx.xxx.xxx.xxx.', {order: 'down', prog: 'i VII VI v', evo: 'slow-open'}, 'A falling sequence over a falling progression, with a breath on the last 16th of every beat.'],
    ['Leaping sequence', 'xxxxxxxxxxxxxxxx', {order: 'seq', seq: [0, 3, 1, 4, 2, 5], evo: 'afterlife', bars: 32, sound: 'tech-pluck'}, 'A written order that leaps a fourth up and steps back, over and over: tension without speed.'],
    ['Gated pad-arp', 'x.x.x.x.x.x.x.x.', {rate: '16', gate: 1.4, pool: 'chord9', order: 'updown', octaves: 1, evo: 'breathe', sound: 'dark-saw'}, '8th notes with a long gate: the arp turns into a moving pad that pulses with the sidechain.'],
    ['Cinematic 8ths', 'xxxxxxxx', {rate: '8', pool: 'chord9', octaves: 2, order: 'updown', gate: 0.8, evo: 'slow-open', sound: 'glass-pluck', reset: 'chord'}, 'Slow 8ths over two octaves of 9th chords: the breakdown version of the sequence.'],
    ['Accent drift', 'xXxxxXxxxxXxxxxX', {pool: 'chord', count: 4, order: 'up', evo: 'dark-ride', sound: 'hollow-square'}, 'A four-note cycle with accents placed off the cycle, so the accented note keeps changing.'],
  ]);

  // ===== PROGRESSIVE HOUSE =====
  group('progressive', 'Plucks', {sound: 'glass-pluck', pool: 'chord', order: 'up', octaves: 2, gate: 0.45, reg: 64, bpm: 122, key: 'D', prog: 'i VI III VII', reset: 'chord', delay: 0.32}, [
    ['Prog pluck', 'x.xx.xx.x.xx.xx.', {evo: 'pluck-to-pad'}, 'A 3+3+2 skip rhythm through two octaves: the progressive pluck that moves without hurrying.'],
    ['Dotted delay pluck', 'xx.xxx.x', {rate: '8', delay: 0.42, fb: 0.5, delayTime: '8d', evo: 'slow-open'}, 'Six 8th notes, and a dotted-8th delay writes the 16ths in between. Turn the delay off to hear how much it does.'],
    ['Major 9 bloom', 'xxx.xxx.xxx.xxx.', {scale: 'major', prog: 'vi IV I V', pool: 'chord9', order: 'updown', key: 'D', evo: 'pluck-to-pad'}, 'The pop four in major with every chord a 9th: euphoric but soft.'],
    ['Pedal climb', 'xxxxxxxxxxxxxxxx', {pool: 'chord9', order: 'pinky', octaves: 1, gate: 0.4, evo: 'build', bars: 16}, 'The top note pedals while the rest climb underneath: tension that resolves on every chord change.'],
    ['Sidechain 16ths', 'xxxxxxxxxxxxxxxx', {sound: 'tech-pluck', gate: 0.45, duck: 0.75, octaves: 1, pool: 'chord9', evo: 'breathe'}, 'Every 16th, pumped hard by the kick: the sidechain writes the rhythm.'],
    ['Gallop arp', 'x.xxx.xxx.xxx.xx', {order: 'updown', sound: 'tech-pluck', evo: 'slow-open'}, 'A galloping 16th pattern through the chord: drive without the full 16ths.'],
    ['Three over four', 'xxxxxxxxxxxx', {rate: '16', pool: 'triad', octaves: 1, order: 'up', reset: 'never', evo: 'breathe'}, 'A 12-step pattern over a 16-step bar, three notes: it shifts against the bar every bar.'],
    ['Lift supersaw', 'x.xx.xx.x.xx.xx.', {sound: 'supersaw', prog: 'VI VII i i', gate: 0.42, evo: 'build', bars: 16}, 'The same skip rhythm on a wide supersaw, rising from VI to the tonic: a breakdown lift.'],
  ]);

  // ===== TRANCE =====
  group('trance', 'Gated 16ths', {sound: 'supersaw', pool: 'chord', order: 'up', octaves: 2, gate: 0.45, reg: 64, bpm: 138, key: 'A', prog: 'i VI III VII', reset: 'chord', swing: 50}, [
    ['Root-octave-fifth', 'xxxxxxxxxxxxxxxx', {pool: 'root5', order: 'seq', seq: [0, 2, 1, 2], octaves: 2, evo: 'build', bars: 16}, 'Root, octave, fifth, octave: the trance gate shape. Nothing simpler sounds bigger.'],
    ['Uplifter', 'xxxxxxxxxxxxxxxx', {order: 'up', evo: 'slow-open'}, 'Two octaves of chord tones, straight up, every 16th: the anthem arp.'],
    ['Rolling trance pluck', 'x.xxx.xxx.xxx.xx', {sound: 'glass-pluck', order: 'updown', evo: 'pluck-to-pad'}, 'A galloping pluck through the chords: classic progressive-trance motion.'],
    ['Off-beat gate', '.xxx.xxx.xxx.xxx', {gate: 0.4, accent: 30, order: 'seq', seq: [0, 3, 1, 4, 2, 5], evo: 'build', bars: 16}, 'The kick\'s 16th left out, every other one played: it pushes the beat forward.'],
    ['Neo-trance hollow', '.xxx.xxx.xxx.xxx', {sound: 'hollow-square', bpm: 140, pool: 'triad', order: 'up', octaves: 2, gate: 0.4, evo: 'slow-open'}, 'The narrow hollow square of the new trance wave: thin, nasal and urgent.'],
    ['Pinky trance', 'xxxxxxxxxxxxxxxx', {order: 'pinky', octaves: 1, pool: 'chord', gate: 0.4, sound: 'hollow-square', evo: 'build', bars: 16}, 'The top note between every other note: it sounds like two parts, a melody and its pedal.'],
    ['Octave leaper', 'xoxxoxxoxxoxxoxx', {pool: 'triad', octaves: 1, order: 'up', reset: 'never', gate: 0.42, evo: 'slow-open'}, 'Every third 16th leaps an octave against a three-note cycle: a shimmer that keeps rotating.'],
    ['Eight-bar epic', 'xxxxxxxxxxxxxxxx', {prog: 'i v VI III iv i iv v', order: 'updown', gate: 0.42, sound: 'glass-pluck', evo: 'build', bars: 16}, 'An eight-chord progression voice-led through two octaves: the epic breakdown arp.'],
  ]);

  // ===== AFRO HOUSE =====
  group('afro', 'Mallets & clave', {sound: 'marimba', pool: 'penta', order: 'seq', octaves: 1, gate: 0.5, reg: 64, bpm: 121, key: 'G', swing: 55, reset: 'bar'}, [
    ['Marimba clave', 'x..x..x...x.x...', {seq: [0, 2, 3, 1, 4], gate: 0.6}, 'The 3-2 son clave played on a pentatonic marimba: the rhythmic DNA of the style.'],
    ['Kalimba triplets', '.xxx.x.xx.x.', {rate: '8t', sound: 'kalimba', seq: [0, 2, 1, 3, 2, 4, 3], swing: 50}, 'Triplet 8ths that skip the beat against the straight four: the forward lean of Afro house.'],
    ['Log drum riff', '...x..x.x..x.x..', {sound: 'log-drum', pool: 'root5', seq: [0, 0, 1, 2, 0], reg: 60, gate: 0.6}, 'The amapiano log drum as a syncopated riff on root, fifth and octave.'],
    ['Desert pluck', '..x..x..x.x..x..', {scale: 'phrygian', pool: 'scale', seq: [0, 1, 0, 3, 4, 1], sound: 'tech-pluck', prog: 'i', key: 'E', evo: 'breathe'}, 'Phrygian\'s flat second (index 1) gives the desert colour of organic and Afro house.'],
    ['Three over two', 'x..x..', {pool: 'penta', order: 'up', reset: 'never', sound: 'marimba'}, 'A six-step loop: three-against-two inside every half bar, five notes rotating through it.'],
    ['Afro vox', '...x..x...x.x...', {sound: 'vox-chop', pool: 'scale', scale: 'dorian', seq: [4, 2, 4, 0], gate: 0.5}, 'Chopped syllables on the clave\'s off-beat strokes.'],
    ['Kalimba cascade', '.xx.xx.x.xx.xx.x', {sound: 'kalimba', pool: 'penta', order: 'down', octaves: 1, reset: 'never', swing: 54, evo: 'slow-open'}, 'A falling pentatonic cascade on the kalimba: ten notes a bar over a five-note cycle, so every bar starts on a different note.'],
    ['Call to the conga', '..x..x....x..x.x.....x.x..x..x..', {pool: 'penta', seq: [0, 2, 1, 3, 4, 2, 1, 0, 2, 3], reset: '2bar', gate: 0.55}, 'Two bars of question and answer with long gaps where the congas reply.'],
  ]);

  // ===== DEEP & ORGANIC =====
  group('deep', 'Broken chords', {sound: 'rhodes', pool: 'chord9', order: 'up', octaves: 1, gate: 1, reg: 62, bpm: 120, key: 'C', scale: 'dorian', prog: 'i9 iv9', reset: 'chord', swing: 56}, [
    ['Rhodes broken chord', 'x..x..x...x..x..', {gate: 1.2}, 'The minor-9th chord broken across the clave: long notes overlap and the chord blooms.'],
    ['Kerri stab', '..C..c....C..c..', {sound: 'chord-stab', gate: 0.65, prog: 'i9 VII9'}, 'Chord stabs on the off-beat and the "a": the New Jersey deep house move.'],
    ['Lazy 8ths', '.x.xx.x.', {rate: '8', gate: 1.1, order: 'updown', prog: 'i7 VImaj7', pool: 'chord'}, 'Four lazy 8th notes, three of them off the beat, gate over 100%: every note rings into the next.'],
    ['Organic marimba', '.x..x..x..x..x..', {sound: 'marimba', pool: 'penta', order: 'seq', seq: [0, 2, 1, 3, 2], gate: 0.7, scale: 'minor', key: 'D'}, 'A soft marimba on the off-16ths: organic house\'s wood and air.'],
    ['Soul turnaround', 'x..x..x.x..x..x.', {prog: 'iv9 v7 i9', per: 1, order: 'down', gate: 1}, 'iv9–v7–i9 broken downward: the soul in deep house is the v7 pulling home.'],
    ['Piano house chords', '..C...C..C..C...', {sound: 'house-piano', gate: 0.6, prog: 'i7 iv9', scale: 'minor', key: 'A'}, 'Bright piano stabs in a skipping rhythm: the 90s piano house move.'],
    ['Nine shimmer', '..x.x..x..x.x..x', {sound: 'glass-pluck', gate: 0.7, octaves: 2, order: 'updown', prog: 'i11'}, 'A single minor-11 chord shimmering over two octaves.'],
    ['Two-bar walk', 'x..x..x...x.....x..x..x...x..x..', {order: 'seq', seq: [0, 1, 2, 3, 4, 3, 2, 1, 0], prog: 'i9 iv9', per: 1, gate: 1, reset: 'never'}, 'A walking two-bar figure that climbs and falls through the 9th chords.'],
  ]);

  // ===== TECHNO =====
  group('techno', 'Hypnotic', {sound: 'sub-pulse', pool: 'root5', order: 'up', octaves: 1, gate: 0.4, reg: 56, bpm: 130, key: 'F', scale: 'phrygian', prog: 'i', reset: 'never', swing: 50, evo: 'dark-ride', bars: 16}, [
    ['Three-note hypnosis', '.xxx.xxx.xxx.xxx', {}, 'Root, fifth, octave on every 16th but the kick: twelve notes a bar, three-note cycle, one bar loop.'],
    ['Polymeter three', 'x..', {sound: 'perc-bleep', pool: 'root5', reg: 62}, 'A three-step loop against the four: the classic polymeter that never sounds the same twice in a row.'],
    ['Pulse sequence', 'x.xxx.xxx.xxx.xx', {pool: 'scale', order: 'seq', seq: [0, 0, 1, 0, 3], gate: 0.35}, 'A galloping pulse with the flat second: dark, driving, almost no melody.'],
    ['Dub techno chord', 'C..C......C.....', {sound: 'chord-stab', pool: 'chord', prog: 'i7', scale: 'minor', delay: 0.42, fb: 0.6, reverb: 0.4, gate: 0.4, reg: 62, evo: 'breathe'}, 'Three minor-7 stabs drowned in feedback delay: the Basic Channel blueprint.'],
    ['Bleep techno', '..x.x.x...x..x..', {sound: 'perc-bleep', pool: 'root', reg: 64, gate: 0.3}, 'One pitch in a syncopated rhythm: Sheffield-style bleep techno.'],
    ['Phrygian menace', 'x.x.xx.x.xx.x.x.', {pool: 'scale', order: 'seq', seq: [0, 1, 0, 3, 1], sound: 'dark-saw', reg: 56}, 'Root to flat second and back: the most menacing two notes there are.'],
    ['Five-step drone', 'x.xx.', {pool: 'root5', order: 'updown', sound: 'dark-saw', reg: 56}, 'Five steps, four notes in the up-down cycle: a 20-step shape against 16-step bars.'],
    ['Seven-step rotation', 'xx.x.x.', {pool: 'scale', order: 'seq', seq: [0, 3, 1], sound: 'sub-pulse'}, 'A seven-step loop with a three-note riff: it takes seven bars to come back round.'],
  ]);

  // ===== ACID =====
  group('acid', '303 lines', {sound: 'acid-303', pool: 'scale', order: 'seq', octaves: 1, gate: 0.65, reg: 50, bpm: 128, key: 'A', prog: 'i', reset: 'bar', swing: 52, evo: 'dark-ride', bars: 16}, [
    ['Classic acid', 'xxSxXx-xxsXxx-xS', {seq: [0, 0, 7, 0, 3, 0, 7, 6, 0, 4, 0, 2]}, 'Twelve notes, two ties, three slides, three accents: a textbook 303 line.'],
    ['Acid house bounce', 'x.xSx.Xxx.xsx.Xx', {seq: [0, 7, 0, 3, 0, 6, 0, 4, 2, 0], swing: 55}, 'A swung, bouncy line closer to Chicago than to techno.'],
    ['Octave jumper', 'xoxxOxsxxoxxOxSx', {seq: [0, 0, 2, 0, 4, 0, 6, 0]}, 'Octave jumps (o) on every third 16th: the screaming acid shape.'],
    ['Slow squelch', 'x.s.X.x.x.S.x.x.', {seq: [0, 3, 0, 4, 6, 0, 2, 0], gate: 0.8, bpm: 125}, '8th-note acid with slides: the filter has time to squelch on every note.'],
    ['Acid rush', 'xxxXxxsxxxXxxsxX', {pool: 'penta', seq: [0, 5, 3, 0, 4, 5, 1, 0], bpm: 134, evo: 'build'}, 'A dense pentatonic acid line that builds: acid techno in a hurry.'],
    ['Phrygian acid', 'x.xsx.Xx.xsxX.x.', {scale: 'phrygian', seq: [0, 1, 0, 3, 1, 0, 4, 1], key: 'E'}, 'The flat second, slid into and out of: evil acid.'],
    ['Seven-step acid', 'xsxX.xs', {seq: [0, 7, 3, 0, 4], reset: 'never'}, 'A seven-step acid loop that rotates against the bar: a 303 that seems to improvise.'],
    ['Two-note acid', 'xxXsxxXsxxXsxxXs', {pool: 'root5', seq: [0, 2], gate: 0.7}, 'Only root and octave: the accents and slides make it acid.'],
  ]);

  // ===== NU-DISCO =====
  group('nu-disco', 'Bounce & Italo', {sound: 'disco-saw', pool: 'octave', order: 'up', octaves: 1, gate: 0.45, reg: 60, bpm: 118, key: 'E', prog: 'i VII VI VII', reset: 'chord', swing: 52}, [
    ['Octave bounce', 'x.x.x.x.x.x.x.x.', {evo: 'breathe', reg: 64}, 'Root and octave on 8ths: the disco bassline-arp. The filter breathing every four bars is the French-touch move.'],
    ['Italo sequence', 'xxxxxxxxxxxxxxxx', {pool: 'chord', order: 'up', reg: 56, gate: 0.4}, 'Every 16th through the chord, bright and mechanical: Moroder\'s gift.'],
    ['Disco gallop', 'x.xxx.xxx.xxx.xx', {pool: 'octave', reg: 64}, 'The gallop rhythm on octaves: Italo disco\'s heartbeat.'],
    ['Piano stabs', 'C..C..C.C..C..C.', {sound: 'house-piano', pool: 'chord', scale: 'major', prog: 'vi IV I V', key: 'C', reg: 62, gate: 0.5}, 'Bright piano chords in a 3+3+2 skip over the pop four: pure joy.'],
    ['Falling disco', 'xxxxxxxxxxxxxxxx', {pool: 'chord', order: 'down', octaves: 2, reg: 58, gate: 0.38, sound: 'tech-pluck'}, 'Two octaves falling through each chord: a cascade over the bounce.'],
    ['Indie riff', 'x.x.xx.x.x.x.xx.', {pool: 'scale', order: 'seq', seq: [0, 2, 4, 2, 0, 6, 4, 2], reg: 58, sound: 'disco-saw'}, 'A written scale riff with a dance-punk bounce: indie dance territory.'],
    ['Moroder 8ths', 'x.x.x.x.x.x.x.x.', {pool: 'root5', order: 'updown', reg: 58, gate: 0.5}, 'Root, fifth, octave on 8ths: the 1977 sequence.'],
    ['Sunny climb', 'xxx.xxx.xxx.xxx.', {scale: 'major', prog: 'I iii IV V', pool: 'triad', order: 'up', key: 'D', reg: 60, sound: 'house-piano'}, 'A major climb, I–iii–IV–V, with a breath at the end of each beat.'],
  ]);

  // ===== UK GARAGE & BASS HOUSE =====
  group('garage', 'Shuffle riffs', {sound: 'organ-stab', pool: 'scale', order: 'seq', octaves: 1, gate: 0.35, reg: 62, bpm: 132, key: 'F', prog: 'i7 iv9', reset: 'bar', swing: 62}, [
    ['Speed garage organ', '..x..xx...x..x.x', {seq: [0, 2, 0, 4, 0, 2]}, 'An organ riff swung at 62%: the speed-garage bounce.'],
    ['2-step stabs', '...C..C...C..C..', {sound: 'chord-stab', pool: 'chord', order: 'up', gate: 0.35}, 'Stabs around the 2-step kick, leaving beat 1 and the "and" of 3 empty.'],
    ['Vox shuffle', '..x.x..x..x...x.', {sound: 'vox-chop', seq: [4, 2, 0, 2, 4]}, 'Chopped vocal syllables skipping on the shuffle.'],
    ['Rubber 2-step', '.x..x..x..x..x.x', {sound: 'rubber-stab', pool: 'root5', seq: [0, 1, 0, 2, 0, 1]}, 'A rubbery bleep riff bouncing on swung off-16ths.'],
    ['Garage keys', '..c..x.x..c..x..', {sound: 'rhodes', pool: 'chord9', order: 'up', gate: 0.7}, 'Rhodes chords and single notes: soulful 2-step.'],
    ['Bass house riff', '..X..x.x..X..x.o', {sound: 'organ-stab', bpm: 126, swing: 58, seq: [0, 0, 2, 0, 4, 0], prog: 'i'}, 'The tech house organ riff made rubbery for bass house.'],
    ['Organ skank', '..x...x.x.x...x.', {seq: [0, 4, 0, 2, 6], gate: 0.3}, 'Off-beat organ with a skank in the middle: garage meets ska.'],
    ['Swung pluck', '.x.x..x..x.x..x.', {sound: 'tech-pluck', pool: 'chord', order: 'updown', gate: 0.3}, 'A pluck arp on off-16ths only: at 62% swing it becomes a shuffle.'],
  ]);

  // ===== HARD TECHNO & NEO-RAVE =====
  group('hard-techno', 'Rave', {sound: 'rave-hoover', pool: 'chord', order: 'up', octaves: 2, gate: 0.4, reg: 64, bpm: 150, key: 'F#', prog: 'i VI VII v', reset: 'chord', swing: 50, hp: 220}, [
    ['Rave gate 16ths', 'xxxxxxxxxxxxxxxx', {sound: 'supersaw', evo: 'build', bars: 16}, 'Trance 16ths at 150 BPM through a supersaw: the neo-rave arp.'],
    ['Hoover stabs', '..C.C..C..C.C..C', {gate: 0.5, prog: 'i', pool: 'chord'}, 'Six rave stabs a bar in a pushing, syncopated rhythm, driven hard. Nothing else needed.'],
    ['Neo-rave melody', '.xxx.xxx.xxx.xxx', {sound: 'hollow-square', order: 'seq', seq: [0, 2, 1, 3, 2, 4], octaves: 1}, 'A written sequence on the hollow square, leaving the kick its 16th.'],
    ['Hard acid', 'xxsXxxsXxxsXxxsX', {sound: 'acid-303', pool: 'scale', order: 'seq', seq: [0, 7, 0, 3, 0, 6, 4, 0], octaves: 1, reg: 52, prog: 'i', gate: 0.6}, 'An acid line at 150: slides, accents and distortion.'],
    ['Euphoric hard arp', 'xxxxxxxxxxxxxxxx', {sound: 'supersaw', prog: 'i VI III VII', order: 'updown', evo: 'slow-open'}, 'The trance anthem progression at hard techno tempo.'],
    ['Bounce 8ths', 'x.x.x.x.x.x.x.x.', {pool: 'octave', octaves: 1, gate: 0.5, prog: 'i', reg: 58}, 'Octave 8ths: the hard-bounce lift.'],
    ['Rave pedal', 'xxxxxxxxxxxxxxxx', {order: 'pinky', octaves: 1, sound: 'hollow-square', evo: 'build', bars: 16}, 'The top note pedals over the climb: tension at speed.'],
    ['Octave rush', 'xoxoxoxoxoxoxoxo', {pool: 'triad', octaves: 1, order: 'up', reset: 'never', gate: 0.35, sound: 'rave-hoover'}, 'Every other 16th an octave up, three notes cycling: frantic and bright.'],
  ]);

  // ===== MINIMAL =====
  group('minimal', 'Micro-riffs', {sound: 'perc-bleep', pool: 'root5', order: 'seq', octaves: 1, gate: 0.3, reg: 64, bpm: 125, key: 'G', prog: 'i', reset: '2bar', swing: 58, human: 0.4}, [
    ['Rominimal blip', '..x......x.x.......x.....x...x..', {seq: [0, 1, 0, 1, 0, 0], mutate: 4}, 'Six blips over two bars, a note mutating every four bars: rominimal patience.'],
    ['Rubber minimal', '...x..x.....x.x....x..x......x..', {sound: 'rubber-stab', seq: [0, 0, 1, 0, 2, 1, 0]}, 'Seven rubbery notes across two bars, mostly the root.'],
    ['Micro-riff', '..x..x.....x....', {pool: 'penta', seq: [0, 1, 2], sound: 'perc-bleep', reset: 'bar'}, 'Three notes in a bar, packed into the first half: the rest is groove.'],
    ['Swing blips', '.x...x.x...x..x.', {pool: 'root', order: 'up', swing: 60}, 'A single pitch on swung off-16ths: the shuffle does everything.'],
    ['Dub minimal', '...x..........x.......x.........', {sound: 'chord-stab', pool: 'chord', order: 'up', prog: 'i7', delay: 0.45, fb: 0.6, reverb: 0.35}, 'Three dub chord tones in two bars, with the delay filling the room.'],
    ['Tick-tock', '..x..x....x..x....x..x....x..x..', {sound: 'marimba', pool: 'penta', seq: [0, 2, 1, 3, 0, 2, 4, 1], mutate: 8}, 'A soft marimba ticking in pairs across two bars.'],
  ]);

  // ===== BREAKS, BUILDS AND INTROS: written for the sections around the drop =====
  group(TH, 'Breaks & builds', {sound: 'warm-pad', pool: 'chord9', order: 'up', swing: 54, gate: 1.4, reg: 62, bpm: 126, key: 'F', prog: 'i9 iv9', reset: 'chord', duck: 0.15}, [
    ['Pad breakdown', 'x.x.', {rate: '4', per: 2, evo: 'breathe'}, 'Half notes on a slow, warm pad, two bars a chord: the break where the kick drops out and the chords take over.'],
    ['Choir break', 'x...x...', {rate: '8', sound: 'choir', pool: 'chord', prog: 'i VI', gate: 1.5}, 'A synthesized choir walking up the chord in half notes. Pure emotion before the drop comes back.'],
    ['Gospel organ break', 'C.......C.......', {sound: 'organ-sustain', pool: 'chord', prog: 'i7 iv7', gate: 1.5}, 'Held organ chords with a Leslie wobble, two a bar: the soulful break of piano house, in tech house.'],
    ['String rise', 'xxxxxxxx', {rate: '8', sound: 'string-swell', pool: 'chord', octaves: 2, gate: 0.9, evo: 'build', fill: 'roll', fillEvery: 4, bars: 16, prog: 'i VI', duck: 0.3}, 'Swelling strings in 8ths through two octaves while the build automation climbs: sixteen bars of lift.'],
    ['Noise swell', 'x...', {rate: '4', sound: 'noise-riser', pool: 'root', gate: 1.5, evo: 'into-drop', bars: 8, prog: 'i', duck: 0}, 'One long swell a beat on the root, the filter opening into the last bars: a riser you can play in key.'],
    ['Zap fills', '..x...x...x..xx.', {sound: 'laser-zap', pool: 'root5', order: 'up', gate: 0.4, fill: 'bounce', fillEvery: 4, evo: 'build', prog: 'i', reg: 66, duck: 0.4}, 'Laser zaps on the off-beats, bouncing into every fourth bar: build energy without a single chord.'],
    ['Micro intro', '..x....x..x.....', {sound: 'micro-pluck', pool: 'root', gate: 0.3, evo: 'slow-open', cut: 0.35, prog: 'i', reg: 66, duck: 0.3}, 'Three tiny plucks a bar, dark at first: the DJ-friendly intro version of a riff.'],
    ['Reese riff', 'x-..x-.x..x-..x.', {sound: 'reese', pool: 'root5', order: 'seq', seq: [0, 0, 1, 0, 2, 0], gate: 0.9, prog: 'i', reg: 64, duck: 0.5, swing: 56}, 'A detuned Reese held across two steps at a time: the dark, moving drop riff of bass-house-leaning tech house.'],
  ]);
  group('melodic-techno', 'Breaks & builds', {sound: 'shimmer', pool: 'chord9', order: 'up', octaves: 2, gate: 1.5, reg: 62, bpm: 124, key: 'A', prog: 'i VI III VII', reset: 'chord', swing: 50, duck: 0.15}, [
    ['Drone intro', 'x...', {rate: '4', sound: 'drone', pool: 'root5', octaves: 1, evo: 'slow-open', prog: 'i', cut: 0.3}, 'A low drone on the root and fifth, one note a beat, the filter opening over the phrase: how a melodic techno set begins.'],
    ['Shimmer break', 'x...x.x.', {rate: '8'}, 'Shimmering partials over the four-chord journey, two octaves of 9ths: the breakdown that floats.'],
    ['Glass pad journey', 'xxxx', {rate: '4', sound: 'glass-pad', pool: 'chord', octaves: 1, gate: 1.4}, 'FM bells blooming into pads, a chord tone each beat: the long, cold breakdown.'],
    ['Drone build', 'xxxx', {rate: '4', sound: 'drone', pool: 'root', octaves: 1, gate: 1.2, evo: 'build', bars: 16, prog: 'i', fill: 'roll', fillEvery: 4}, 'One note, one drone, sixteen bars of filter, gate and density climbing: tension with no melody at all.'],
  ]);
  group('progressive', 'Breaks & builds', {sound: 'string-pluck', pool: 'chord9', order: 'up', octaves: 2, gate: 0.5, reg: 64, bpm: 122, key: 'D', prog: 'i VI III VII', reset: 'chord', delay: 0.3}, [
    ['Harp intro', 'x..x..x.x..x..x.', {evo: 'slow-open', cut: 0.4}, 'A bright harp pluck in a 3+3+2 rhythm, opening slowly: the first sixteen bars of a progressive track.'],
    ['Pad swell break', 'x.x.', {rate: '4', sound: 'warm-pad', octaves: 1, gate: 1.5, evo: 'breathe'}, 'Warm pad chords in half notes, breathing every four bars: the breakdown bed under a vocal.'],
  ]);
  group('trance', 'Breaks & builds', {sound: 'trance-lead', pool: 'chord', order: 'up', octaves: 2, gate: 0.55, reg: 64, bpm: 138, key: 'A', prog: 'i VI III VII', reset: 'chord', swing: 50}, [
    ['Euphoric gate', 'xxxxxxxxxxxxxxxx', {evo: 'none'}, 'The euphoric lead gated into 16ths through the anthem progression: the moment the drop lands.'],
    ['String breakdown', 'xxxx', {rate: '4', sound: 'string-swell', octaves: 1, gate: 1.5, duck: 0}, 'Swelling strings, a chord tone a beat: the breakdown before the lead comes in.'],
  ]);
  group('hard-techno', 'Breaks & builds', {sound: 'hoover-long', pool: 'chord', order: 'up', octaves: 1, gate: 0.6, reg: 64, bpm: 150, key: 'F#', prog: 'i VI VII v', reset: 'chord', swing: 50, hp: 220}, [
    ['Hoover anthem', 'x.xx.x.xx.xx.x.x', {evo: 'none'}, 'The 90s hoover, held and scooping, in a pushing rhythm: drops that start riots.'],
    ['Hoover rise', 'xxxxxxxxxxxxxxxx', {evo: 'build', fill: 'roll', fillEvery: 4, bars: 16, gate: 0.45}, 'Every 16th on the hoover while the build automation climbs: sixteen bars of pressure.'],
  ]);
  group('nu-disco', 'Funk & intros', {sound: 'clav', pool: 'chord', order: 'up', octaves: 1, gate: 0.4, reg: 62, bpm: 118, key: 'E', prog: 'i VII VI VII', reset: 'chord', swing: 54}, [
    ['Clav funk', 'x.xx.x.xx.x..x.x', {}, 'A funk clav chopping through the chords: the disco rhythm section in one part.'],
    ['Mono lead hook', 'x.x.xx.x', {rate: '8', sound: 'mono-lead', pool: 'scale', order: 'seq', seq: [0, 2, 4, 2, 6, 4], gate: 0.7, reg: 62, prog: 'i VII VI VII', follow: false}, 'A singing analogue mono lead playing a written hook over the progression.'],
  ]);
  group('deep', 'Intros & breaks', {sound: 'bell-tick', pool: 'chord9', order: 'up', octaves: 1, gate: 0.5, reg: 66, bpm: 120, key: 'C', scale: 'dorian', prog: 'i9 iv9', reset: 'chord', swing: 56}, [
    ['Bell intro', '..x...x...x..x..', {evo: 'slow-open', cut: 0.4}, 'Glinting bell ticks on the off-beats, opening slowly: the intro before the Rhodes arrives.'],
    ['Gospel break', 'C...............', {sound: 'organ-sustain', pool: 'chord', gate: 1.5, prog: 'i7 iv9 VII7 III7'}, 'A held organ chord a bar through a soulful turnaround: the deep house break.'],
  ]);
  group('afro', 'Grooves & intros', {sound: 'wood-knock', pool: 'penta', order: 'seq', octaves: 1, gate: 0.5, reg: 64, bpm: 121, key: 'G', swing: 55, reset: 'bar'}, [
    ['Wood knock groove', 'x..x..x...x.x...', {seq: [0, 2, 1, 3, 2]}, 'Tuned woodblocks on the son clave: a percussion part and a melody at once.'],
    ['Choir lift', 'x.......x.......', {sound: 'choir', pool: 'chord9', order: 'up', gate: 1.5, prog: 'i7 iv7'}, 'A slow choir over the Afro groove, two notes a bar: the spiritual break.'],
  ]);
  group('minimal', 'Intros', {sound: 'micro-pluck', pool: 'root5', order: 'seq', octaves: 1, gate: 0.25, reg: 66, bpm: 125, key: 'G', prog: 'i', reset: '2bar', swing: 58, human: 0.4}, [
    ['Micro plucks', '..x.......x..x.......x....x.....', {seq: [0, 1, 0, 1, 0], evo: 'slow-open', cut: 0.4}, 'Five tiny plucks across two bars, opening slowly: patience, again.'],
  ]);

  // ===== ORBIT 1.3: TECHNO, IN DEPTH =====
  const TC = 'techno';
  group(TC, 'Less is more', {sound: 'perc-bleep', pool: 'root5', order: 'seq', octaves: 1, gate: 0.3, reg: 62, bpm: 130, key: 'F', scale: 'phrygian', prog: 'i', reset: 'never', swing: 50, evo: 'dark-ride', bars: 16}, [
    ['Three hits', '..x...x.....x...', {seq: [0, 0, 1]}, 'Three notes a bar, none on the kick: about the least a riff can be and still be a riff. The fifth on beat four is the only melody.'],
    ['Late pulse', '...x...x...x...x', {pool: 'root', order: 'up', sound: 'sub-pulse', reg: 60}, 'One pitch on the last 16th of every beat, so each note leans into the next kick. Four notes, all push.'],
    ['Answer only', '..........x.x..x', {seq: [0, 1, 0], sound: 'micro-pluck', reg: 64}, 'Nothing for the first half of the bar, then three notes answer the kick. The silence before them is the hook.'],
    ['Late threes', '..x', {pool: 'root5', order: 'up', sound: 'perc-bleep'}, 'A three-step loop that starts on the third 16th: it meets the kick only now and then and drifts around it the rest of the time.'],
    ['Knock riff', '.x....x..x....x.', {sound: 'wood-knock', seq: [0, 1, 0, 0], reg: 64}, 'Four tuned knocks placed like a rimshot pattern: a melody you hear as percussion until the filter opens.'],
    ['Half-bar loop', '..x..x..', {seq: [0, 1], sound: 'micro-pluck', reg: 64, reset: 'bar'}, 'An eight-step loop played twice a bar: root on the "and", fifth on the "a". Two notes, endless.'],
    ['Muted chord', '...c......c...c.', {sound: 'chord-stab', pool: 'chord', order: 'up', prog: 'i7', scale: 'minor', gate: 0.27, reg: 62, evo: 'breathe', reverb: 0.25}, 'Three dry, muted minor-7 hits: the chord as a percussion part, not as harmony.'],
    ['Flat-two nudge', '..x.....x.x...x.', {pool: 'scale', seq: [0, 1, 0, 0], sound: 'dark-saw', reg: 60}, 'Four notes, one of them the flat second. Once a bar the riff leans a semitone up and falls back: the menace is that small.'],
    ['Sub dot', '..x.......x..x..', {pool: 'root', order: 'up', sound: 'sub-pulse', reg: 60, gate: 0.4}, 'Three sub-heavy dots that never move in pitch. Turn the filter and it sounds like a different riff every eight bars.'],
  ]);
  group(TC, 'Peak-time', {sound: 'dark-saw', pool: 'root5', order: 'seq', octaves: 1, gate: 0.3, reg: 60, bpm: 132, key: 'G', scale: 'minor', prog: 'i', reset: 'bar', swing: 50, evo: 'breathe'}, [
    ['Peak stab riff', '..X..x.x..X..x..', {seq: [0, 0, 1, 0, 2]}, 'An accented off-beat, two pickups and an octave flick: the big-room techno riff that a whole main room can clap to.'],
    ['Siren pulse', '.xxx.xxx.xxx.xxx', {pool: 'scale', seq: [0, 1, 0, 2], sound: 'hollow-square', reg: 62, evo: 'gate-pump'}, 'Twelve 16ths a bar wobbling between the root and the next two scale notes: a siren pumped by the sidechain.'],
    ['Off-beat bounce', '..x.o.x...x.o.x.', {pool: 'root', order: 'up', sound: 'dark-saw'}, 'The off-beat root with an octave flick after it: six notes that bounce the whole room on beat two and four.'],
    ['Stab and gap', '..C...c...C..c..', {sound: 'chord-stab', pool: 'chord', order: 'up', prog: 'i', gate: 0.25, reg: 62}, 'Four minor stabs, the last one pulled a 16th early. The gap after it is where the crowd shouts.'],
    ['Rubber drop', '..x..x.x..x..x.x', {sound: 'rubber-stab', seq: [2, 0, 0, 1, 0, 0], reg: 62}, 'A rubbery square that starts each bar an octave up and falls home: the drop is in the pitch, not the rhythm.'],
    ['Laser call', '..x.......x..x..', {sound: 'laser-zap', pool: 'root', order: 'up', reg: 64, gate: 0.35}, 'Three laser zaps a bar on one pitch: the sound effect becomes the riff.'],
    ['Hypno 16ths', 'xxxxxxxxxxxxxxxx', {seq: [0, 0, 1, 0], sound: 'sub-pulse', reg: 60, gate: 0.25, accent: 24}, 'Every 16th, short, with the fifth on every fourth note: a pulsing engine that turns into a lead when the filter opens.'],
    ['Roll and stop', '.xxx.xxx.xxx....', {seq: [0, 1, 0, 2, 1, 0], sound: 'dark-saw'}, 'Three rolling beats, then nothing on the fourth: the gap pulls the next bar in.'],
  ]);
  group(TC, 'Hypnotic loops', {sound: 'perc-bleep', pool: 'scale', order: 'seq', octaves: 1, gate: 0.3, reg: 62, bpm: 132, key: 'A', scale: 'minor', prog: 'i', reset: 'never', swing: 51, evo: 'dark-ride', bars: 16}, [
    ['Turing drift', '.xx.x.xx.x.x.xx.', {order: 'turing', lock: 0.85, tlen: 7}, 'A seven-note loop that changes a note now and then and keeps the change: a hypnotic line that never quite repeats.'],
    ['Echo steps', '..x...x...x.....', {seq: [0, 2, 4], echo: 2, echoTime: '16d', echoShift: 's1', echoFb: 0.5}, 'Three written notes, each followed by two echoes climbing a scale step: three notes become nine.'],
    ['Eleven-step loop', 'x.xx.x.xx.x', {seq: [0, 2, 1]}, 'An eleven-step loop of three notes against the sixteen-step bar: it takes 33 steps for notes and rhythm to meet again.'],
    ['Nine against sixteen', '.x.x..x.x', {seq: [0, 3, 1]}, 'Nine steps, four hits, three notes: a rhythm that shifts by two 16ths every bar and only lines up again after nine bars.'],
    ['Thirteen', '..x.x..x.x.x.', {pool: 'root5', seq: [0, 0, 1, 0]}, 'A thirteen-step loop: so close to a bar that it feels steady, so far that it never sits still.'],
    ['Two-note hypnosis', '.x.x.x.x.x.x.x.x', {pool: 'root5', seq: [0, 1, 0, 0, 2], sound: 'micro-pluck', reg: 64}, 'Eight off-16ths a bar with a five-note cycle: the fifth and the octave land somewhere new every bar.'],
    ['Phrygian tumble', '.x.xx.x..x.xx.x.', {scale: 'phrygian', seq: [0, 1, 0, 4, 3, 1], key: 'E', sound: 'dark-saw', reg: 60}, 'A falling Phrygian figure that keeps landing on the flat second: dark, rolling and slightly off balance.'],
    ['Accent walk', '.xxx.xxx.xxx.xxx', {pool: 'root', order: 'up', accentEvery: 5, steps: '.Xxx.xxX.xxx.Xxx', sound: 'sub-pulse', reg: 60}, 'One pitch, twelve notes a bar, the accent moving: the filter opens on a different 16th every beat.'],
  ]);
  group(TC, 'Warehouse', {sound: 'dark-saw', pool: 'root5', order: 'seq', octaves: 1, gate: 0.35, reg: 60, bpm: 134, key: 'E', scale: 'phrygian', prog: 'i', reset: 'bar', swing: 50, evo: 'dark-ride', drive: 0.5}, [
    ['Grinder', 'x.xx.x.xx.xx.x.x', {seq: [0, 0, 1, 0]}, 'A driven, grinding gallop: root, root, fifth, root. Raw and repetitive on purpose.'],
    ['Semitone crush', '..X..x....X..x..', {pool: 'scale', seq: [0, 1], sound: 'chord-stab', gate: 0.25, reg: 62}, 'The root and the flat second ground against each other in a stab pattern: industrial without any noise.'],
    ['Rattle', '..x.r..x..x.R..x', {pool: 'root', order: 'up', sound: 'perc-bleep', reg: 64}, 'A bleep with a double and a triple ratchet: it rattles like a loose machine.'],
    ['Reese menace', '..x-..x-..x-..x-', {sound: 'reese', pool: 'root5', seq: [0, 0, 1, 0], gate: 0.9, reg: 62}, 'A detuned Reese held across each off-beat: the dark, moving drone of warehouse techno.'],
    ['Fourths in the dark', '..c.....c..c....', {sound: 'chord-stab', pool: 'quartal', order: 'up', gate: 0.3, reg: 62, scale: 'minor', delay: 0.3, fb: 0.5}, 'Stacked-4th chords: no major or minor, just open, cold stone. Three hits and a delay.'],
  ]);
  group(TC, 'Breaks & builds', {sound: 'drone', pool: 'root5', order: 'up', octaves: 1, gate: 1.4, reg: 60, bpm: 130, key: 'F', scale: 'phrygian', prog: 'i', reset: 'never', swing: 50, duck: 0.2}, [
    ['Dark intro loop', '..x...x.....x...', {sound: 'perc-bleep', gate: 0.3, cut: 0.3, evo: 'slow-open', reg: 64, order: 'seq', seq: [0, 0, 1]}, 'Three filtered bleeps, opening slowly over sixteen bars: the DJ-friendly first minute of a techno track.'],
    ['Drone build', 'x...x...x...x...', {evo: 'build', bars: 16, fill: 'roll', fillEvery: 4, gate: 1}, 'A drone retriggered on every beat while the filter, gate and density climb: sixteen bars of pressure with no melody.'],
    ['Riser in key', 'x...', {rate: '4', sound: 'noise-riser', pool: 'root', evo: 'into-drop', bars: 8, duck: 0}, 'One noise swell a beat on the root, opening into the drop: a riser tuned to the track.'],
    ['Cold pad break', 'x.x.', {rate: '4', sound: 'glass-pad', pool: 'chord', prog: 'i7', scale: 'minor', gate: 1.5, evo: 'breathe', reg: 62}, 'Half-note minor-7 pads, cold and slow: the breakdown where the kick drops out and the room breathes.'],
    ['Echo stab break', 'C...', {rate: '4', sound: 'chord-stab', pool: 'chord', prog: 'i7', scale: 'minor', gate: 1.1, delay: 0.5, fb: 0.68, reverb: 0.5, duck: 0, reg: 62}, 'One stab a bar thrown into a long feedback delay: the break is the echo dying away.'],
    ['Laser build', '..x...x...x...x.', {sound: 'laser-zap', pool: 'root5', order: 'up', gate: 0.35, evo: 'build', bars: 16, fill: 'bounce', fillEvery: 4, reg: 64}, 'Laser zaps on the off-beats bouncing into every fourth bar while the build automation climbs.'],
    ['Outro pulse', '..x.......x.....', {sound: 'sub-pulse', pool: 'root', gate: 0.3, cut: 0.3, evo: 'none', reg: 60}, 'Two dark pulses a bar: what is left when everything else has gone. Mix the next track in over it.'],
  ]);

  // ===== DUB TECHNO =====
  const DT = 'dub-techno';
  group(DT, 'Chords & echoes', {sound: 'chord-stab', pool: 'chord', order: 'up', octaves: 1, gate: 0.35, reg: 62, bpm: 122, key: 'C', scale: 'minor', prog: 'i7', reset: 'chord', swing: 52, delay: 0.45, fb: 0.62, delayTime: '8d', reverb: 0.4, evo: 'breathe'}, [
    ['Three in the fog', '...C.....c..C...', {}, 'Three minor-7 stabs, none of them on the beat, each one thrown into a dotted-8th delay. The echoes fill every gap the stabs leave.'],
    ['Off-beat dub', '..c...c...c...c.', {gate: 0.3, evo: 'slow-open'}, 'One stab on every off-beat, the cutoff opening over sixteen bars: the steady pulse under a whole dub techno set.'],
    ['Stone fourths', '...c......c.....', {pool: 'quartal', gate: 0.4, fb: 0.66}, 'Two stacked-4th chords a bar: no third, so no major or minor, just open stone and its echoes.'],
    ['Two-chord drift', '..C.....c..c....', {prog: 'i7 iv7', per: 2, evo: 'slow-open'}, 'i7 for two bars, iv7 for two: the slowest possible change, enough to make the loop breathe without breaking the spell.'],
    ['Minor nine haze', '..C.......c..c..', {pool: 'chord9', prog: 'i9', gate: 0.4, reverb: 0.5}, 'A minor-9 chord hit three times a bar into a big reverb: soft, blurred, endless.'],
    ['Rhodes dub', '..c...c..c......', {sound: 'rhodes', gate: 0.6, prog: 'i9 VI', per: 2, pool: 'chord9'}, 'Electric piano chords instead of a synth stab: warmer, rounder, the deep end of dub techno.'],
    ['Chord ladder', 'x..x..x...x..x..', {gate: 0.45, order: 'up', evo: 'slow-open'}, 'The chord broken into single notes climbing in a 3+3+4 rhythm, each one echoed: an arpeggio drowned in its own delay.'],
    ['Late stab', '...C...c...C...c', {gate: 0.33, fb: 0.58}, 'Every stab on the last 16th of the beat, so each one leans into the next kick. The delay turns the lean into a rolling swing.'],
  ]);
  group(DT, 'Deep pulses', {sound: 'glass-pluck', pool: 'penta', order: 'seq', octaves: 1, gate: 0.4, reg: 64, bpm: 120, key: 'F', scale: 'minor', prog: 'i7', reset: 'never', swing: 52, delay: 0.42, fb: 0.6, delayTime: '8d', reverb: 0.45, evo: 'breathe'}, [
    ['Bell ping', '..x.....x..x....', {sound: 'bell-tick', seq: [0, 2, 4, 1]}, 'Three bell pings a bar cycling four pentatonic notes: the melody rotates slowly while the echoes overlap.'],
    ['Glass drops', '..x...x.x.....x.', {seq: [0, 3, 1, 2]}, 'Glassy plucks falling into a long delay: four notes a bar, a cloud of reflections between them.'],
    ['Single note echo', '..x.......x.....', {pool: 'root5', seq: [0, 1], sound: 'string-pluck', fb: 0.66}, 'Two notes a bar and a delay at two-thirds feedback: the root, the fifth and a whole chorus of echoes.'],
    ['Dub chord pulse', '.c..c..c..c..c..', {sound: 'chord-stab', pool: 'chord', order: 'up', gate: 0.32, delay: 0.35, fb: 0.5}, 'Five quiet chords in a dotted rhythm against the four-on-the-floor: the pulse of the track rather than its hook.'],
  ]);
  group(DT, 'Intros & breaks', {sound: 'chord-stab', pool: 'chord', order: 'up', octaves: 1, gate: 0.4, reg: 62, bpm: 122, key: 'C', scale: 'minor', prog: 'i7', reset: 'chord', swing: 52, delay: 0.5, fb: 0.68, delayTime: '8d', reverb: 0.5, evo: 'slow-open', cut: 0.35}, [
    ['Fog intro', 'x...', {rate: '4', sound: 'glass-pad', gate: 1.2, duck: 0.15}, 'One pad chord tone a beat, filtered dark, slowly opening: the room filling with fog before the first stab.'],
    ['Long-tail stab', 'C...', {rate: '4', gate: 1.1, fb: 0.72, duck: 0}, 'One stab a bar and a delay that almost never dies: the break is the sound of the echo decaying.'],
    ['Tape-echo build', '..c...c...c...c.', {gate: 0.3, evo: 'build', bars: 16, fill: 'roll', fillEvery: 4, cut: 0.5}, 'The off-beat stab with the build automation climbing and a roll into every fourth bar: dub techno, rising.'],
    ['Shimmer chord break', 'x.x.', {rate: '4', sound: 'shimmer', pool: 'chord9', prog: 'i9 iv9', octaves: 2, gate: 1.5, evo: 'breathe', duck: 0}, 'Shimmering minor-9 chords in half notes over two octaves: the beatless middle of a long dub techno track.'],
  ]);

  // ===== DETROIT TECHNO =====
  const DE = 'detroit';
  group(DE, 'Strings & stabs', {sound: 'chord-stab', pool: 'chord', order: 'up', octaves: 1, gate: 0.32, reg: 64, bpm: 130, key: 'F', scale: 'minor', prog: 'i VI', reset: 'chord', swing: 53}, [
    ['Motor stabs', '..C..c...C..c...', {evo: 'breathe'}, 'Minor chord stabs pushing across i–VI, two of them a 16th ahead of the beat: soul played on a machine.'],
    ['Piano jab', '..C..C..C.......', {sound: 'house-piano', prog: 'i7 iv7', gate: 0.3}, 'Three piano chords jabbing in a dotted rhythm, then space: the hook is the rhythm the chords make.'],
    ['String line', '.x.x..x..x.x..x.', {sound: 'string-pluck', pool: 'chord9', order: 'updown', octaves: 2, prog: 'i iv VII III', gate: 0.5, evo: 'pluck-to-pad'}, 'Plucked strings walking up and down two octaves of 9th chords through i–iv–VII–III: the melodic side of Detroit.'],
    ['Rhodes motor', '.x.x..x..x.x..x.', {sound: 'rhodes', pool: 'chord9', order: 'up', prog: 'i9 VI', gate: 0.8}, 'A Rhodes broken through minor-9 chords in a syncopated rhythm: the jazz in Detroit techno.'],
    ['Stab and walk', '..C...x.x.C...x.', {prog: 'i VII VI VII', order: 'down'}, 'A stab, then two chord tones walking down from the top: harmony and riff in one part.'],
  ]);
  group(DE, 'Machine soul', {sound: 'hollow-square', pool: 'chord', order: 'updown', octaves: 2, gate: 0.4, reg: 64, bpm: 130, key: 'A', scale: 'minor', prog: 'i iv VII III', reset: 'chord', swing: 52, evo: 'slow-open'}, [
    ['Motor city arp', 'x.xx.xx.x.xx.xx.', {}, 'A hollow square galloping up and down two octaves through four chords: the futuristic sequence of the first wave.'],
    ['Sci-fi sequence', 'xxxxxxxxxxxxxxxx', {sound: 'dark-saw', order: 'up', gate: 0.35}, 'Every 16th, straight up two octaves of each chord and back down to the bottom: a machine climbing the same staircase forever.'],
    ['Electro bleeps', 'x..x..x.x..x..x.', {sound: 'perc-bleep', pool: 'penta', order: 'seq', seq: [0, 3, 1, 4], octaves: 1, prog: 'i'}, 'Pentatonic bleeps in a 3+3+2 rhythm: the electro side of Detroit, part drum machine, part melody.'],
    ['Dorian space', '..x..x.x..x..x.x', {sound: 'glass-pluck', scale: 'dorian', prog: 'i IV', key: 'D'}, 'A Dorian i–IV with the bright major IV: hopeful, open, the "future" in Detroit\'s futurism.'],
    ['Lead call', '..x..x.x..x.....', {sound: 'mono-lead', pool: 'scale', order: 'seq', seq: [0, 2, 4, 3, 2], octaves: 1, follow: false, prog: 'i VI', gate: 0.5}, 'A singing mono lead playing a five-note hook over the chords: the line you hum on the way home.'],
  ]);
  group(DE, 'Second wave minimal', {sound: 'perc-bleep', pool: 'root', order: 'up', octaves: 1, gate: 0.28, reg: 64, bpm: 132, key: 'F', scale: 'minor', prog: 'i', reset: 'bar', swing: 54}, [
    ['Hood loop', '..x...x.x.....x.', {}, 'One pitch, four hits, and a hi-hat: the stripped-down loop that the minimal strain of Detroit was built on.'],
    ['Pulse riff', '..x.x...x.x..x..', {sound: 'micro-pluck', pool: 'root5', order: 'seq', seq: [0, 0, 1, 0, 2]}, 'Root, fifth and octave in a short repeating figure: a riff so small it becomes part of the groove.'],
    ['Clip and space', '.x...x...x.x....', {sound: 'wood-knock', pool: 'root5', order: 'seq', seq: [0, 1, 0, 0]}, 'Four clipped knocks, the last bar-half empty: the space is as rhythmic as the notes.'],
  ]);
  group(DE, 'Breaks & builds', {sound: 'string-swell', pool: 'chord', order: 'up', octaves: 1, gate: 1.4, reg: 64, bpm: 130, key: 'F', scale: 'minor', prog: 'i VI III VII', reset: 'chord', swing: 52, duck: 0.2}, [
    ['String break', 'xxxx', {rate: '4', gate: 1.5, duck: 0}, 'Swelling strings, a chord tone a beat, through four chords: the moment the drums stop and the soul comes through.'],
    ['Pad intro', 'x.x.', {rate: '4', sound: 'warm-pad', prog: 'i VI', cut: 0.35, evo: 'slow-open', gate: 1.5}, 'Warm pad chords in half notes, filtered and opening: the first sixteen bars before the 909 comes in.'],
    ['Rising strings', 'xxxxxxxx', {rate: '8', octaves: 2, gate: 0.9, evo: 'build', bars: 16, fill: 'roll', fillEvery: 4}, 'Strings in 8ths through two octaves while the build automation climbs: sixteen bars of lift.'],
  ]);

  // ===== ORBIT 1.3: TECH HOUSE, WIDER =====
  group(TH, 'Less is more', {sound: 'tech-pluck', pool: 'root5', order: 'seq', swing: 57, gate: 0.3, reg: 64, bpm: 126, key: 'G', prog: 'i', evo: 'breathe'}, [
    ['Two-note groove', '..x....x..x.....', {seq: [0, 1, 0]}, 'Three hits a bar on two pitches, every one off the kick: so little that the hats and the bass suddenly have room to swing.'],
    ['Answer at the end', '.........x.x..x.', {seq: [0, 0, 1], sound: 'organ-stab'}, 'Half a bar of nothing, then three organ hits answer the groove. The wait makes the riff.'],
    ['Late organ', '...x...x...x..x.', {seq: [0, 0, 0, 1], sound: 'organ-stab'}, 'The organ on the last 16th of each beat, so every hit drags into the next kick. Swung, it rolls.'],
    ['One-note shuffle', '..x..x....x..x..', {pool: 'root', order: 'up', sound: 'rubber-stab'}, 'One pitch, four hits in two pairs: the rubber sound and the swing are the whole idea.'],
    ['Dot dot dash', '..x.x.x-..x.....', {seq: [0, 0, 1, 0], sound: 'mono-lead', gate: 0.5}, 'Two short notes, one held one, a reply: a riff you could say out loud.'],
    ['Space riff', '..x..x..........x..x.x..........', {seq: [0, 1, 0, 1, 2], reset: '2bar', sound: 'micro-pluck'}, 'Five notes across two bars with long gaps: perfect under a vocal, and it still carries the groove.'],
    ['Bleep and gap', '..x.x.......x...', {pool: 'root', order: 'up', sound: 'perc-bleep', reg: 66}, 'Two quick bleeps, a long gap, one more: the gap is where the clap lands.'],
    ['Fifth on four', '..x...x.....x.x.', {seq: [0, 0, 1, 2], sound: 'organ-stab', gate: 0.28}, 'Two roots, then the fifth and the octave on beat four: the riff saves its movement for the end of the bar.'],
  ]);
  group(TH, 'Jackin\' & piano', {sound: 'house-piano', pool: 'chord', order: 'up', swing: 57, gate: 0.3, reg: 62, bpm: 125, key: 'A', prog: 'i7', reset: 'chord'}, [
    ['Jack stab', '..C..C.C..C...c.', {}, 'Minor-7 piano stabs in a jacking, pushed rhythm: Chicago house played at tech house tempo.'],
    ['Piano bounce', '..c..c.c..c..c.c', {prog: 'i7 iv7'}, 'Six piano chords a bar bouncing off the swing, i7 to iv7: the 90s piano house move, tightened.'],
    ['Ninth jack', '.c...c.c.c...c..', {pool: 'chord9', prog: 'i9 VII', gate: 0.28}, 'Minor-9 stabs on a syncopated grid: the extended chords make it deep, the rhythm keeps it jacking.'],
    ['Piano riff', '..x..x.x..x.....', {pool: 'scale', order: 'seq', seq: [0, 4, 2, 0], prog: 'i'}, 'A single-note piano riff, root to fifth and back through the third: piano as a lead, not as chords.'],
    ['Clav jack', '.x.x..x..x.x..x.', {sound: 'clav', pool: 'root5', order: 'seq', seq: [0, 1, 0, 1], prog: 'i'}, 'A funky clav on the off-16ths: jackin\' house\'s rhythm guitar in one bright, short sound.'],
    ['Organ jack', '..xx..x...xx..x.', {sound: 'organ-stab', prog: 'i7', gate: 0.28}, 'Chord tones in pairs on the "and-a": the organ jacks up and down the minor 7th.'],
  ]);
  group(TH, 'Bass-led riffs', {sound: 'mono-lead', pool: 'scale', order: 'seq', swing: 56, gate: 0.4, reg: 60, bpm: 126, key: 'F', prog: 'i', reset: 'bar', evo: 'gate-pump'}, [
    ['Mono hook', '..x..x.x..x..x.x', {seq: [0, 0, 3, 0, 4, 0]}, 'A singing mono synth playing a bass-register hook: root, root, fourth, root, fifth. The riff is the bassline, an octave up.'],
    ['Reese drop', '..x-..x...x-..x.', {sound: 'reese', pool: 'root5', seq: [0, 0, 1], gate: 0.9, reg: 62}, 'A Reese held across two steps then stabbed: the dark, moving drop riff of tech house that leans toward bass house.'],
    ['Rubber riff', '.xx..x.x.xx..x..', {sound: 'rubber-stab', seq: [0, 0, 2, 0, 6], reg: 62}, 'A rubbery square bouncing between the root, the third and the flat seventh: a bassline you can hear on a phone.'],
    ['Talking riff', '..x-.x....x-.x..', {sound: 'vox-chop', seq: [0, 2, 0, 4], gate: 0.5, reg: 64}, 'A held syllable, a short one, repeat: the riff talks. Try it in Talk with the formant bass too.'],
    ['Rubber pickup', '...x..x...x..xx.', {sound: 'rubber-stab', pool: 'root5', seq: [0, 0, 0, 1, 2], reg: 62}, 'The root three times, then a fifth and an octave pickup into the next bar: the bounce of bass house in a single sound.'],
    ['Slide riff', '..x.s.x...xs..x.', {sound: 'acid-303', seq: [0, 3, 0, 4, 0, 7], gate: 0.6, reg: 60, evo: 'dark-ride'}, 'Six notes, two of them sliding into the next: a 303 playing a riff, not an acid line.'],
  ]);
  group(TH, 'Latin & percussive', {sound: 'marimba', pool: 'penta', order: 'seq', swing: 56, gate: 0.45, reg: 66, bpm: 125, key: 'G', prog: 'i', reset: 'bar'}, [
    ['Latin marimba', '..x..x.x..x..x..', {seq: [0, 2, 1, 3, 2]}, 'A marimba on a clave-like grid that never touches the kick: Latin tech house\'s percussion-melody.'],
    ['Wood groove', '.x...xx...x..x.x', {sound: 'wood-knock', pool: 'root5', seq: [0, 1, 0, 2, 1]}, 'Tuned wood knocks in a conga pattern: a percussion part that happens to be in key.'],
    ['Bongo bleep', '..xx..x..xx..x..', {sound: 'perc-bleep', pool: 'root5', seq: [0, 1, 0, 2, 1]}, 'Bleeps in pairs like a bongo player\'s fill, cycling five notes over six hits.'],
    ['Kalimba roll', '.xx..xx..xx..x.x', {sound: 'kalimba', seq: [0, 1, 2, 1, 3]}, 'A kalimba rolling in pairs between the kicks: warm, organic and still on the grid.'],
    ['Log tech', '...x..x..x.x..x.', {sound: 'log-drum', pool: 'root5', seq: [0, 0, 1, 2], reg: 62}, 'The amapiano log drum dropped into a tech house groove: root, root, fifth, octave.'],
    ['Afro tech pluck', '.x.x..x..x.x..x.', {sound: 'tech-pluck', scale: 'dorian', pool: 'scale', seq: [0, 2, 4, 3]}, 'A Dorian pluck on an Afro-tech grid: the bright sixth keeps it from sounding dark.'],
  ]);
  group(TH, 'Peak-time tech', {sound: 'organ-stab', pool: 'scale', order: 'seq', swing: 56, gate: 0.28, reg: 64, bpm: 128, key: 'F', prog: 'i', evo: 'gate-pump'}, [
    ['Festival organ', '..X.xx.x..X.xx.x', {seq: [0, 0, 2, 0, 4, 0, 2, 0]}, 'The organ riff pushed for a big room: eight notes, accents on the off-beats, gate pumping with the kick.'],
    ['Stab train', '..c.cc.c..c.cc.c', {sound: 'chord-stab', pool: 'chord', order: 'up', prog: 'i7'}, 'Ten short minor-7 stabs a bar in a driving train: maximum energy without touching the kick.'],
    ['Siren riff', '.xxx.xxx.xxx.xxx', {sound: 'hollow-square', seq: [0, 4, 0, 3], gate: 0.25, reg: 64}, 'Twelve 16ths a bar flicking between the root and the fifth or fourth: a siren that rolls.'],
    ['Ratchet hook', '..x..r.x..x..R.x', {sound: 'perc-bleep', pool: 'root5', seq: [0, 0, 1, 0, 2]}, 'A riff with a double and a triple ratchet: the stutter is the hook the crowd waits for.'],
    ['Big lift riff', '..x..x.x..x..x.x', {sound: 'supersaw', pool: 'chord', order: 'updown', prog: 'i VI', reg: 64, gate: 0.25}, 'A supersaw playing the chord as a short, syncopated riff: the moment tech house borrows trance\'s size.'],
  ]);
  group(TH, 'Intros & outros', {sound: 'micro-pluck', pool: 'root', order: 'up', swing: 57, gate: 0.28, reg: 66, bpm: 126, key: 'F', prog: 'i', cut: 0.35, evo: 'slow-open', duck: 0.3}, [
    ['DJ intro bleep', '..x.......x.....', {}, 'Two dark plucks a bar, opening slowly: gives the DJ sixteen bars of clean groove to mix over.'],
    ['Filtered organ intro', '..x..x....x.....', {sound: 'organ-stab', pool: 'scale', order: 'seq', seq: [0, 0, 2]}, 'The organ riff with half its notes, filtered dark: the drop\'s riff hinted at, not given away.'],
    ['Outro ticks', '..x...x...x...x.', {sound: 'bell-tick', cut: 0.3, evo: 'none'}, 'Bell ticks on the off-beats, dark and quiet: the last thing playing while the next record comes in.'],
    ['Shaker riff intro', '.x...x...x...x..', {sound: 'wood-knock', pool: 'root5', order: 'seq', seq: [0, 1]}, 'Tuned knocks placed like a shaker, root and fifth: percussion that tells the DJ the key.'],
    ['Pad outro', 'x...', {rate: '4', sound: 'warm-pad', pool: 'chord9', prog: 'i9', gate: 1.5, duck: 0.15}, 'A warm minor-9 pad, one chord tone a beat: the outro that lets the room down gently.'],
  ]);

  // ===== ORBIT 1.3: EVERY GENRE, RICHER =====
  group('minimal', 'Rominimal', {sound: 'perc-bleep', pool: 'root5', order: 'seq', octaves: 1, gate: 0.3, reg: 64, bpm: 125, key: 'G', prog: 'i', reset: '2bar', swing: 58, human: 0.4}, [
    ['Click riff', '..x.x......x.......x.x.....x....', {sound: 'micro-pluck', seq: [0, 1, 0, 1], mutate: 4}, 'Six clicks across two bars in two little clusters, one note changing every four bars: rominimal\'s patience in miniature.'],
    ['Wood minimal', '.x....x...x.....x...x...x..x....', {sound: 'wood-knock', seq: [0, 1, 0, 0, 1, 2, 0]}, 'Seven tuned knocks over two bars: you hear them as percussion until you notice they are in key.'],
    ['Sub blip', '...x......x........x.....x......', {sound: 'sub-pulse', pool: 'root', order: 'up', reg: 62}, 'Four deep blips across two bars, one pitch: the groove is entirely in where they fall.'],
    ['Marimba drift', '..x...x..x...x..', {sound: 'marimba', pool: 'penta', order: 'turing', lock: 0.8, tlen: 5, reset: 'never'}, 'A five-note marimba loop that slowly changes itself: it sounds played, then improvised, then played again.'],
    ['Swing rubber', '..x..x.x...x....', {sound: 'rubber-stab', seq: [0, 0, 1, 0], reset: 'bar'}, 'Four rubbery notes, heavily swung: the shuffle bends them into a lazy little bounce.'],
    ['Two-bar question', '..x..x.x..........x..x.......x..', {seq: [0, 0, 1, 0, 0, 2]}, 'Three notes ask in bar one, three answer in bar two, with an octave at the end: a conversation in six notes.'],
    ['Glitch tick', '..r.....x..x....', {sound: 'bell-tick', pool: 'root', order: 'up', reset: 'bar'}, 'A bell tick with a ratchet stutter and two quiet answers: a glitch you would swear was a mistake the first time.'],
    ['Dub minimal stab', '...c.......c....', {sound: 'chord-stab', pool: 'chord', order: 'up', prog: 'i7', delay: 0.4, fb: 0.55, reverb: 0.3, reset: 'bar'}, 'Two short minor-7 stabs a bar into a dub delay: the minimal take on dub techno.'],
    ['Lazy fifth', '...x.....x....x.', {seq: [0, 1, 0], reset: 'bar'}, 'Three notes a bar on the last 16th of the beat: root, fifth, root, always a touch late.'],
    ['Hidden melody', '..x..x...x...x...x.x.....x..x...', {sound: 'micro-pluck', pool: 'penta', seq: [0, 1, 2, 1, 3], mutate: 4}, 'Eight tiny plucks over two bars with a pentatonic line hidden in them: a melody that only appears if you listen for it.'],
  ]);
  group('acid', 'More 303', {sound: 'acid-303', pool: 'scale', order: 'seq', octaves: 1, gate: 0.65, reg: 50, bpm: 130, key: 'A', prog: 'i', reset: 'bar', swing: 52, evo: 'dark-ride', bars: 16}, [
    ['Acid rolling', 'xsXx.xxsxXx.xsxx', {seq: [0, 0, 3, 0, 7, 0, 5, 4]}, 'Fourteen notes with a breath after beat one and three: a rolling 303 line with slides on the turns.'],
    ['Squelch walk', 'x.xxXsx.x.xxXsx.', {seq: [0, 2, 3, 4, 6, 4, 3, 2]}, 'A line that walks up the scale and back with a slide at the top: acid that sounds like it is going somewhere.'],
    ['Acid pedal', 'pxpX.xpsPxpX.xps', {seq: [4, 6, 3, 7]}, 'The root as a pedal between a four-note line: two parts from one 303.'],
    ['Acid minimal', 'x..sX..x.x.sX...', {seq: [0, 7, 0, 3, 5], gate: 0.7}, 'Seven notes a bar with room between them: the slides and accents have space to squelch.'],
    ['Dorian acid', 'xxsxXx.xxsxXx.xs', {scale: 'dorian', seq: [0, 5, 3, 0, 7, 4, 0, 2], key: 'D'}, 'Dorian\'s bright sixth in an acid line: less evil, more funk.'],
    ['Acid triplets', 'x.sX.x...xsX', {rate: '16t', seq: [0, 3, 7, 5]}, 'Triplet 16ths against the straight hats: the 303 gallops while the drums march.'],
    ['Chicago acid', 'X.xsx.Xsx.xsX.xs', {seq: [0, 0, 3, 0, 7, 4], swing: 56, bpm: 124}, 'A swung, slower line with a slide on every fourth step: acid house as it was in Chicago.'],
    ['Acid build', 'xxxxXxxsxxxxXxxs', {seq: [0, 7, 3, 5, 0, 6], evo: 'build', fill: 'roll', fillEvery: 4}, 'Sixteen notes with the build automation climbing and a roll into every fourth bar: the acid line as the build.'],
  ]);
  group('hard-techno', 'Peak & industrial', {sound: 'rave-hoover', pool: 'chord', order: 'up', octaves: 1, gate: 0.4, reg: 64, bpm: 150, key: 'F#', prog: 'i', reset: 'chord', swing: 50, hp: 220}, [
    ['Schranz stab', '..C.C.C...C.C.C.', {gate: 0.4}, 'Six hoover stabs a bar in two bursts of three: relentless, distorted, a stab where most tracks would leave a gap.'],
    ['Industrial pulse', 'xxxxxxxxxxxxxxxx', {sound: 'dark-saw', pool: 'root5', order: 'seq', seq: [0, 2, 1, 2], drive: 0.6}, 'Every 16th on a driven saw, root and octave and fifth: a pulse with teeth.'],
    ['Hard bounce stab', 'x.x.xo.xx.x.xo.x', {sound: 'hollow-square', pool: 'triad', order: 'up'}, 'A three-note bounce with an octave flick on beats two and four: the hard dance lift at 150.'],
    ['Gabber lead', '.xxx.xxx.xxx.xxx', {sound: 'supersaw', prog: 'i VI VII v', order: 'pinky', octaves: 1}, 'A supersaw hanging from its top note through four chords: the euphoric hard lead, driven.'],
    ['Acid at 150', 'xsxXxsxXxsxXxsxX', {sound: 'acid-303', pool: 'scale', order: 'seq', seq: [0, 0, 7, 0, 3, 0, 5, 6], reg: 58, gate: 0.6}, 'A screaming acid line at hard techno tempo, accent every fourth note, slides in between.'],
    ['Rave piano', 'C.C..C.CC.C..C.C', {sound: 'house-piano', prog: 'i VI III VII'}, 'Rave piano chords pushing through the anthem progression: 90s hardcore\'s piano, driven into 2026.'],
    ['Hoover triplets', 'xx.xx.xx.xx.', {rate: '16t', pool: 'triad', order: 'updown', gate: 0.5}, 'Triplet 16ths on the hoover against the straight kick: the rhythm spins while the floor stomps.'],
    ['Hoover pairs', 'x.xx..xxx.xx..xx', {pool: 'root5', order: 'seq', seq: [0, 2]}, 'Root and octave in pairs that start on and off the beat: the hoover bounces with the kick, then against it.'],
    ['Distorted ladder', 'x.xxx.xxx.xxx.xx', {sound: 'dark-saw', prog: 'i VI VII v', octaves: 2, gate: 0.35, drive: 0.6}, 'A galloping climb through two octaves of each chord, distorted: tension that keeps rising.'],
    ['Neo-rave build', 'xxxxxxxxxxxxxxxx', {sound: 'supersaw', octaves: 2, prog: 'i VI VII v', evo: 'build', bars: 16, fill: 'roll', fillEvery: 4}, 'Every 16th on a supersaw through two octaves while the build automation climbs: sixteen bars to the riot.'],
  ]);
  group('melodic-techno', 'More sequences', {sound: 'dark-saw', pool: 'chord', order: 'up', octaves: 2, gate: 0.5, reg: 62, bpm: 124, key: 'A', prog: 'i VI III VII', reset: 'never', swing: 50}, [
    ['Minor ninth river', 'xxxxxxxxxxxxxxxx', {pool: 'chord9', order: 'updown', prog: 'i iv VI VII', evo: 'slow-open'}, 'Every 16th up and down two octaves of 9th chords: a river of notes with no edges.'],
    ['Spiral down', 'xxxxxxxxxxxxxxxx', {order: 'downup', sound: 'glass-pluck', evo: 'afterlife', bars: 32}, 'Down and back up through two octaves: the line spirals, the filter opens over 32 bars.'],
    ['Cathedral', 'x.xxx.xxx.xxx.xx', {sound: 'hollow-square', order: 'diverge', evo: 'slow-open'}, 'Inside-out from the middle of the chord: the notes spread apart like a building getting bigger.'],
    ['Pulse and pedal', 'xxpxxpxxpxxpxxpx', {sound: 'tech-pluck', evo: 'breathe'}, 'A pedal on the root every third 16th against the chord climbing: the three-against-four built into the notes.'],
    ['Six-step journey', 'xxx.xx', {count: 4, sound: 'glass-pluck', evo: 'slow-open'}, 'A six-step loop of four notes against the bar: it rotates through the four chords and never lands the same way twice.'],
    ['Harmonic sequence', 'xxxxxxxxxxxxxxxx', {scale: 'harmonic', prog: 'i iv V i', reset: 'chord', evo: 'slow-open'}, 'Harmonic minor gives a major V: the sequence lifts at the end of every phrase before falling home.'],
    ['Phrygian sequence', 'xxxxxxxxxxxxxxxx', {scale: 'phrygian', prog: 'i bII', key: 'E', order: 'updown', reset: 'chord', evo: 'dark-ride'}, 'i to the flat II and back: the darkest progression there is, spelled out every 16th.'],
    ['Triplet shimmer', 'xx.xx.xx.xx.', {rate: '16t', pool: 'chord9', sound: 'glass-pluck', gate: 0.6, evo: 'breathe'}, 'Triplet 16ths through two octaves of 9ths: shimmering, slightly out of step with the hats.'],
    ['Accented climb', 'XxxxXxxxXxxxXxxx', {pool: 'triad', octaves: 2, sound: 'tech-pluck', gate: 0.4, reset: 'chord', evo: 'slow-open'}, 'Two octaves of the triad straight up with the accent on every beat: the six-note climb lands somewhere different under each accent.'],
    ['Melodic build', 'xxxxxxxxxxxxxxxx', {sound: 'supersaw', reset: 'chord', evo: 'build', bars: 16, fill: 'climb', fillEvery: 4}, 'The four-chord journey on a supersaw with the build automation and a climbing fill: the last sixteen bars before the drop.'],
  ]);
  group('progressive', 'More plucks', {sound: 'glass-pluck', pool: 'chord9', order: 'up', octaves: 2, gate: 0.45, reg: 64, bpm: 122, key: 'D', prog: 'i VI III VII', reset: 'chord', delay: 0.32}, [
    ['Cascading 9ths', 'xx.xx.xx.xx.xx.x', {order: 'down', evo: 'slow-open'}, 'Falling 9th chords in a 3-3-2 rhythm: a cascade that keeps restarting from the top.'],
    ['Wide pluck', 'x..x..x.x..x..x.', {order: 'updown', evo: 'pluck-to-pad'}, 'Six notes a bar, a dotted rhythm across two octaves: wide, slow and warm.'],
    ['Major lift', 'x.xx.xx.x.xx.xx.', {scale: 'major', prog: 'I V vi IV', pool: 'chord', key: 'D', evo: 'breathe'}, 'The pop four in major as a progressive pluck: the lift that makes a room put its hands up.'],
    ['Echo pluck', 'x.xx.xxx', {rate: '8', echo: 2, echoTime: '8d', echoShift: '0', echoFb: 0.5, octaves: 1, evo: 'slow-open'}, '8th notes with written echoes at a dotted 8th: the delay is in the MIDI, so it follows you into Live.'],
    ['Slow arp', 'xxxxxxxx', {rate: '8', gate: 0.9, order: 'updown', evo: 'pluck-to-pad'}, 'Slow 8ths up and down two octaves of 9ths, the pluck growing into a pad: the breakdown arp.'],
    ['Prog build', 'x.xx.xx.x.xx.xx.', {sound: 'tech-pluck', evo: 'build', bars: 16, fill: 'climb', fillEvery: 4}, 'The skip rhythm with the build automation climbing: the long progressive build, in sixteen bars.'],
  ]);
  group('trance', 'More trance', {sound: 'supersaw', pool: 'chord', order: 'up', octaves: 2, gate: 0.45, reg: 64, bpm: 138, key: 'A', prog: 'i VI III VII', reset: 'chord', swing: 50}, [
    ['Psy roll', 'xxx.xxx.xxx.xxx.', {sound: 'hollow-square', pool: 'root5', order: 'seq', seq: [0, 0, 1, 2], octaves: 1, prog: 'i', bpm: 140}, 'A rolling three-note figure with a breath on every beat: the psy-trance roll, moved up out of the bass.'],
    ['Gated chords', 'cccccccccccccccc', {gate: 0.4, evo: 'slow-open'}, 'The whole chord on every 16th, gated short: the trance gate as a wall of sound.'],
    ['Vocal trance pluck', 'x.xxx.xxx.xxx.xx', {sound: 'glass-pluck', pool: 'chord9', order: 'updown', evo: 'pluck-to-pad'}, 'A soft pluck galloping through 9th chords: the arp that sits under a vocal.'],
    ['Octave shimmer', 'xoxoxoxoxoxoxoxo', {pool: 'triad', octaves: 1, gate: 0.4, sound: 'hollow-square'}, 'Every other 16th an octave up through the triad: a shimmer that makes the chord sparkle.'],
    ['Uplifting three-over-four', 'xxxxxxxxxxxx', {pool: 'triad', reset: 'never', gate: 0.42}, 'A twelve-step pattern over a sixteen-step bar: the line shifts against the beat every bar.'],
    ['Trance build', 'xxxxxxxxxxxxxxxx', {evo: 'build', bars: 16, fill: 'roll', fillEvery: 4}, 'Every 16th through two octaves while the build automation climbs and a roll lands every four bars.'],
  ]);
  group('afro', 'More grooves', {sound: 'marimba', pool: 'penta', order: 'seq', octaves: 1, gate: 0.5, reg: 64, bpm: 121, key: 'G', swing: 55, reset: 'bar'}, [
    ['Shaker pluck', '..x.x..x..x.x..x', {sound: 'tech-pluck', seq: [0, 2, 1, 3]}, 'A pluck on a shaker grid, pentatonic: melody that moves like percussion.'],
    ['Talking drum', '.x..x.x..x..x.x.', {sound: 'log-drum', seq: [0, 2, 1, 0, 3], reg: 62}, 'A log drum with a talking-drum phrasing: it rises and falls like speech.'],
    ['Kora run', '.xx.xx.xx.xx.xx.', {sound: 'string-pluck', order: 'up', gate: 0.4, reset: 'never'}, 'A harp-like pluck running up the pentatonic in pairs, ten notes over a five-note cycle: bright, flowing and never starting a bar the same way.'],
    ['Bell in threes', 'x.xx.xx.x.xx.xx.', {sound: 'bell-tick', seq: [0, 2, 4, 1, 3]}, 'A bell on a 3-3-2 grid cycling five notes: the African bell pattern\'s spirit, on a pentatonic.'],
    ['Chant chop', '..x..x....x..x..', {sound: 'vox-chop', seq: [0, 0, 2, 1]}, 'Four chopped syllables like a call from the crowd: the chant hook of Afro house.'],
    ['Organic build', '.xx.xx.x.xx.xx.x', {sound: 'kalimba', order: 'up', evo: 'build', bars: 16, fill: 'roll', fillEvery: 4}, 'The kalimba cascade with the build automation climbing: tension built from wood and air.'],
  ]);
  group('deep', 'More deep', {sound: 'rhodes', pool: 'chord9', order: 'up', octaves: 1, gate: 1, reg: 62, bpm: 120, key: 'C', scale: 'dorian', prog: 'i9 iv9', reset: 'chord', swing: 56}, [
    ['Rhodes stabs', '..c...c.....c...', {gate: 0.8, prog: 'i9 VII9'}, 'Three Rhodes chords a bar, left to ring: deep house at its most relaxed.'],
    ['Wurli walk', '.x..x..x..x..x..', {order: 'seq', seq: [0, 1, 2, 3, 2], gate: 1.1}, 'A walking line through the 9th chord on a syncopated grid: the bassist\'s idea played on keys.'],
    ['Lo-fi 8ths', '.x.x.xx.', {rate: '8', sound: 'house-piano', pool: 'chord', gate: 1.1, order: 'updown'}, 'Lazy piano 8ths ringing into each other: lo-fi house\'s warmth.'],
    ['Mallet chords', '.x..x..x.x..x...', {sound: 'marimba', gate: 0.8, order: 'updown'}, 'Marimba playing the 9th chord in a broken, syncopated rhythm: organic house\'s wood and warmth.'],
    ['Soul strings', 'x.x.', {rate: '4', sound: 'string-swell', pool: 'chord', gate: 1.5, duck: 0.1}, 'Swelling strings in half notes: the soul break of a deep house track.'],
    ['Late night chords', '...c......c.....', {sound: 'chord-stab', gate: 0.9, prog: 'i11', delay: 0.35, fb: 0.5}, 'Two minor-11 chords a bar into a dub delay: deep house leaning toward dub.'],
  ]);
  group('nu-disco', 'More disco', {sound: 'disco-saw', pool: 'chord', order: 'up', octaves: 1, gate: 0.45, reg: 60, bpm: 118, key: 'E', prog: 'i VII VI VII', reset: 'chord', swing: 52}, [
    ['French filter house', 'x.xx.xx.x.xx.xx.', {evo: 'breathe', reg: 62}, 'A bright saw galloping through the chords with the filter breathing: the French-touch loop.'],
    ['Synth-pop arp', 'xxxxxxxxxxxxxxxx', {sound: 'hollow-square', pool: 'triad', order: 'updown', octaves: 2, scale: 'major', prog: 'I vi IV V', key: 'C'}, 'A bright triad arp up and down two octaves in major: synth-pop\'s innocence at a disco tempo.'],
    ['Boogie stabs', 'c.cc.c.cc.c.cc.c', {sound: 'clav', reg: 62}, 'Clav chords in a boogie rhythm: the 80s funk in nu-disco.'],
    ['Cosmic disco', 'x.x.x.x.x.x.x.x.', {sound: 'mono-lead', pool: 'scale', order: 'seq', seq: [0, 4, 7, 4, 2, 4], follow: false}, 'A mono lead playing a cosmic, leaping sequence on 8ths: Italo meets space.'],
    ['Italo octaves', 'xxxxxxxxxxxxxxxx', {pool: 'octave', reg: 64, gate: 0.35}, 'Root and octave on every 16th: the Italo bassline as an arp.'],
    ['Piano anthem', 'C.C..C.C..C.C...', {sound: 'house-piano', scale: 'major', prog: 'vi IV I V', key: 'C', reg: 62}, 'Piano house chords through the pop four: the most joyful thing in this folder.'],
  ]);
  group('garage', 'More shuffle', {sound: 'organ-stab', pool: 'scale', order: 'seq', octaves: 1, gate: 0.35, reg: 62, bpm: 132, key: 'F', prog: 'i7 iv9', reset: 'bar', swing: 62}, [
    ['Bass house wobble', '..x.xx.x..x.xx.x', {sound: 'rubber-stab', pool: 'root5', seq: [0, 0, 1, 0, 2], prog: 'i', bpm: 126, swing: 58}, 'A rubbery riff with pairs on the "and-a": bass house\'s wobble without a wobble bass.'],
    ['Vocal skip', '.x..x..x...x.x..', {sound: 'vox-chop', seq: [0, 2, 4, 2]}, 'Chopped syllables skipping across the 2-step: a vocal hook made of rhythm.'],
    ['Organ shuffle', '..x..x.x.x...x..', {pool: 'chord9', order: 'up'}, 'The organ through the 9th chord, heavily swung: speed garage\'s rolling organ.'],
    ['Speed stab', '...c..c...c..c..', {sound: 'chord-stab', pool: 'chord', order: 'up', gate: 0.3}, 'Four short chord stabs around the 2-step kick: the space is the groove.'],
    ['UKG keys', '.x.x...x.x.x...x', {sound: 'rhodes', pool: 'chord9', order: 'updown', gate: 0.7}, 'Rhodes notes on the swung off-16ths: soulful 2-step keys.'],
    ['Bassline riff', '..x..x.x...x.x..', {sound: 'mono-lead', seq: [0, 0, 3, 4, 0], reg: 60}, 'A mono riff with a rising middle: UK bassline\'s hook, an octave up.'],
  ]);

  const BY_ID = Object.fromEntries(PATTERNS.map(p => [p.id, p]));

  // A bank entry → a full combo: the genre's defaults, then the sound's effect settings, then the pattern.
  function stateFor(p) {
    const g = GENRES[p.genre];
    const s = SOUNDS_BY_ID[p.sound] || SOUNDS[0];
    const st = Object.assign({
      genre: p.genre, name: p.name, from: p.id,
      bpm: p.bpm || Math.round((g.bpm[0] + g.bpm[1]) / 2), key: OT.pcOf(p.key || g.key), scale: p.scale || g.scale,
      prog: p.prog || g.progs[0].p, groove: g.groove, bassPat: g.bass,
    }, s.fx || {});
    for (const [k, v] of Object.entries(p)) if (!['id', 'genre', 'sub', 'name', 'why', 'key'].includes(k)) st[k] = v;
    if (p.evo && OE.EVOS[p.evo] && OE.EVOS[p.evo].bars && !p.bars) st.bars = Math.min(32, OE.EVOS[p.evo].bars);
    return st;
  }

  // ---- the rules: each one heard as an A/B on a pattern from the bank ----
  const RULES = [
    {id: 'fewer', title: 'Fewer notes, more rhythm', base: 'tech-house-organ-bounce', axis: 'pitches',
      claim: 'A tech house riff with two moving notes is catchier than one with six. When the pitches stop changing, the ear starts following the rhythm and the sound.',
      A: {label: 'Six pitches', patch: {seq: [0, 2, 4, 6, 3, 5]}}, B: {label: 'Root + two', patch: {}}},
    {id: 'kick', title: 'Leave the downbeat to the kick', base: 'tech-house-off-beat-organ', axis: 'kick',
      claim: 'Notes on the kick get masked by it and flatten the groove. Most tech house riffs keep 70% or more of their notes off the beat.',
      A: {label: 'On the kick', patch: {steps: 'x...x...x..x.x..'}}, B: {label: 'Off the kick', patch: {}}},
    {id: 'poly', title: 'Odd against even: polymeter', base: 'tech-house-5-step-loop', axis: 'cycle',
      claim: 'A five-step pattern against a sixteen-step bar comes back to beat one after five bars, and its three notes line up again only after fifteen. The loop sounds alive without a single new note. The cycle counter shows how long it takes.',
      A: {label: '16-step loop', patch: {steps: '..x.x..x.x..x.x.'}}, B: {label: '5-step loop', patch: {}}},
    {id: 'accent', title: 'Accents are the groove', base: 'tech-house-rolling-16ths', axis: 'accent',
      claim: 'The same notes with velocity accents (which also open the filter) groove; without them, twelve 16ths are a typewriter.',
      A: {label: 'No accents', patch: {accent: 0}}, B: {label: 'Accents', patch: {accent: 30}}},
    {id: 'gate', title: 'Short notes, long tails', base: 'tech-house-dotted-organ', axis: 'length',
      claim: 'A short gate (25–35%) keeps the riff percussive; the delay and reverb supply the length. Long gates smear into the bass and hats.',
      A: {label: 'Gate 95%', patch: {gate: 0.95, delay: 0, reverb: 0.05}}, B: {label: 'Gate 30% + delay', patch: {gate: 0.3}}},
    {id: 'swing', title: 'Swing the 16ths 54–58%', base: 'tech-house-thumb-roll', axis: 'swing',
      claim: 'Straight 16ths sound programmed. At 56% the off-16ths land late and the riff starts to roll with the hats. Above 62% it turns into garage.',
      A: {label: 'Straight (50%)', patch: {swing: 50}}, B: {label: 'Swing 56%', patch: {swing: 56}}},
    {id: 'pedal', title: 'A pedal note anchors the line', base: 'tech-house-pedal-riff', axis: 'pedal',
      claim: 'Alternate a fixed note with a moving line and the ear hears two parts: the pedal holds the key while the line wanders freely.',
      A: {label: 'Line only', patch: {steps: '....x..x.....x.x'}}, B: {label: 'Line + pedal', patch: {}}},
    {id: 'filter', title: 'Move the filter, not the notes', base: 'tech-house-organ-bounce', axis: 'evo',
      claim: 'Eight bars of the same notes with the cutoff opening feel like a journey; eight bars without automation feel like a loop. The exported CC74 carries the move into Live.',
      A: {label: 'No automation', patch: {evo: 'none'}}, B: {label: 'Slow open', patch: {evo: 'slow-open'}}},
    {id: 'register', title: 'Stay above the bass', base: 'tech-house-thumb-roll', axis: 'low',
      claim: 'Arp notes below ~165 Hz (E2 in Live) fight the bassline for the same space. An octave up and a high-pass at 150–200 Hz, and both parts get loud.',
      A: {label: 'Down an octave', patch: {reg: 50, hp: 30}}, B: {label: 'In its register', patch: {}}},
    {id: 'voice', title: 'Voice-lead the chord changes', base: 'melodic-techno-afterlife-sequence', axis: 'movement',
      claim: 'When the arp moves to the nearest inversion of the next chord, the line flows through the progression. In root position, it lurches at every change.',
      A: {label: 'Root position', patch: {voicing: 'root'}}, B: {label: 'Voice-led', patch: {}}},
    {id: 'mutate', title: 'Change one note every 4 bars', base: 'minimal-tick-tock', axis: 'mutate',
      claim: 'A riff that changes one note every few bars feels written by a person; one that never changes feels like a loop. Minimal producers live on this.',
      A: {label: 'Never changes', patch: {mutate: 0}}, B: {label: 'One note, every 4 bars', patch: {mutate: 4}}},
    {id: 'space', title: 'Let the delay finish the rhythm', base: 'progressive-dotted-delay-pluck', axis: 'delay',
      claim: 'Plain 8ths plus a 1/8-dotted delay at 40% sounds like a 16th-note sequence. The delay writes half the notes, and they are softer and wider than real ones.',
      A: {label: 'Dry 8ths', patch: {delay: 0}}, B: {label: '+ dotted delay', patch: {}}},
  ];

  return {SOUNDS, SOUNDS_BY_ID, GROOVES, BASS, GENRES, PATTERNS, BY_ID, RULES, stateFor};
})();
