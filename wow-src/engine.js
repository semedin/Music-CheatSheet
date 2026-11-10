// Wow engine: pure functions, no Web Audio. Runs in the page and in Node tests.
// A bassline is a two-bar loop of 16ths. Every section of a track is that loop
// rewritten by rule: stripped for the intro, flattened and wound up for the build,
// developed for the second drop, thinned for the outro.
const WOW = (() => {
  const SPB = 16, LOOP = 32, BARS = 8;
  const KICK = [0, 4, 8, 12];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
  // Roots live between E1 (41 Hz) and D♯2 (78 Hz): low enough to be a sub, high enough for a club system to reproduce.
  const rootMidi = pc => 28 + ((pc - 4 + 12) % 12);
  const noteName = midi => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // ------------------------------------------------------------- notation
  // 32 tokens, one per 16th. "." rest, "-" hold the previous note, a number is
  // semitones from the root. Flags: ! accent, ~ slide into this note, w wow
  // (the filter opens and closes across the note), ' short, g ghost (quiet, short
  // and dull). "|" is decoration.
  function parse(text) {
    const tok = text.replace(/\|/g, ' ').trim().split(/\s+/);
    if (tok.length !== LOOP) throw Error('A loop needs 32 steps, got ' + tok.length + ': ' + text);
    const notes = [];
    tok.forEach((t, s) => {
      if (t === '.') return;
      if (t === '-') { const last = notes[notes.length - 1]; if (!last || last.s + last.l !== s || last.short) throw Error('Nothing to hold at step ' + s + ': ' + text); last.l++; return; }
      const m = /^(-?\d+)([!~w'g]*)$/.exec(t);
      if (!m) throw Error('Bad token "' + t + '" in: ' + text);
      const f = m[2];
      notes.push({s, l: 1, semi: +m[1], acc: f.includes('!'), slide: f.includes('~'), wow: f.includes('w'), short: f.includes("'") || f.includes('g'), ...(f.includes('g') ? {ghost: true} : {})});
    });
    return notes;
  }
  const unparse = notes => {
    const out = Array(LOOP).fill('.');
    for (const n of notes) { out[n.s] = n.semi + (n.acc ? '!' : '') + (n.slide ? '~' : '') + (n.wow ? 'w' : '') + (n.ghost ? 'g' : n.short ? "'" : ''); for (let i = 1; i < n.l; i++) out[n.s + i] = '-'; }
    return out.join(' ');
  };
  // What every loop must obey. kickFree styles never start a note on a kick.
  function checkLoop(notes, style) {
    const bad = [];
    let end = 0, prev = null;
    for (const n of notes) {
      if (n.s < end) bad.push('overlap at step ' + n.s);
      if (n.s + n.l > LOOP) bad.push('note runs past the loop at step ' + n.s);
      if (style && style.kickFree && n.s % 4 === 0) bad.push('note on a kick at step ' + n.s);
      if (n.semi < -7 || n.semi > 19) bad.push('note out of register at step ' + n.s);
      if (n.slide && (!prev || prev.s + prev.l !== n.s)) bad.push('slide with nothing to slide from at step ' + n.s);
      end = n.s + n.l; prev = n;
    }
    if (notes.length < 2) bad.push('fewer than two notes');
    return bad;
  }

  // ---------------------------------------------------------------- sounds
  const SOUND0 = {osc: [{w: 'sawtooth', oct: 0, det: 0, g: .6}], sub: .7, fm: null, pitchEnv: null, cut: 500, res: 4, env: 2, dec: .15,
    drive: .4, hp: 80, vowel: 0, rest: 'o', word: ['u', 'a', 'u'], say: 'wow', wowDepth: 2.2, lfo: null, glide: .05, rel: .02, atk: .003, pluck: 0, level: .8, rumble: 0, echo: 0, width: 0};
  const sound = o => ({...SOUND0, ...o});
  // Formant centres (Hz). They do not follow the note, which is why a bass through them sounds like a mouth.
  const VOWELS = {a: [800, 1150, 2900], e: [450, 1750, 2600], i: [300, 2200, 3000], o: [480, 820, 2800], u: [330, 680, 2500]};

  // ---------------------------------------------------------------- styles
  const S = (o, ideas) => ({prog: [0, 0, 0, 0], breakProg: [0, 0, -4, -2], breakMode: 'tease', fill: 'octave', fill2: 'run', answers: [0, 0, 0, 0],
    kickFree: true, swing: 0, evolve: 0, era: 'now', year: '2025–26', ...o, ideas: ideas.map(([name, a, b]) => ({name, text: a + ' | ' + b, notes: parse(a + ' ' + b)}))});
  const STYLES = [
    S({id: 'tech', name: 'Rubber roller', family: 'house', genre: 'Tech house', bpm: 128, key: 7, swing: .1,
      lane: 'Chris Lake, FISHER, Cloonee',
      idea: 'The bass is the lead vocal. Short rubbery root notes dodge every kick, then one long note opens its mouth at the end of the bar.',
      why: ['No note ever starts on a kick, so the kick stays the loudest thing in the room.', 'One talking note per bar, always in the same place. The crowd learns it in eight bars and waits for it.', 'Bar two ends on the octave: a question in bar one, an answer in bar two.'],
      recipe: ['Two saws and a square, one voice, mono, legato.', 'Low-pass around 700 Hz into a formant or vowel filter. Automate the vowel, not the cutoff.', 'Drive before the filter so the formants have harmonics to shape.', 'Clean sine sub under 95 Hz on its own chain. Sidechain both to the kick, fast release.'],
      kit: {kick: 50, kd: .26, hat: 'house', clap: 1, perc: '. . . x . . x . . x . . . . x .', duck: .75, rel: .55},
      fill: 'gap', fill2: 'stutter', answers: [0, 3, 0, -2], breakMode: 'tease',
      sound: sound({level: 0.6, osc: [{w: 'sawtooth', oct: 0, det: -7, g: .5}, {w: 'square', oct: 0, det: 7, g: .35}], vowel: .65, cut: 700, res: 5, env: 1.4, dec: .12, drive: .55, sub: .8, hp: 95})},
    [['Offbeat wow', '. . 0 . | . . 0 0\' | . . 0 . | . 3w - .', '. . 0 . | . . 0 0\' | . 0\' . 0 | . 12w - -'],
     ['Late talker', '. . . 0 | . . 0 . | . 0\' . 0 | . . 10w -', '. . . 0 | . . 0 . | . 0\' . 7w | - 5~ - .'],
     ['Gallop', '. 0\' 0 . | . 0\' 0 . | . 0\' 0 . | . 0 3w -', '. 0\' 0 . | . 0\' 0 . | . 0\' 0 . | . 7w - 5\'']]),
    S({id: 'stab', name: 'Mainstage menace', family: 'house', genre: 'Tech house / mainstage', bpm: 127, key: 5, swing: .06,
      lane: 'Mau P, John Summit, Dom Dolla',
      idea: 'Almost nothing, very loud. Two or three huge notes a bar that fall in pitch as they land, and a lot of air between them.',
      why: ['Space is the hook. A gap of five 16ths makes the next hit feel twice as heavy.', 'Each hit drops in pitch as it lands: the "bwomp" that reads on a phone speaker and a festival rig alike.', 'One root, no melody. The vocal or lead gets the whole midrange.'],
      recipe: ['Saw plus a square an octave down, heavy drive, mono.', 'Pitch envelope: +7 semitones falling to the note in about 70 ms.', 'Low-pass 400 Hz, envelope amount high, decay 200 ms. A touch of vowel filter for the "ow".', 'Long sidechain release so the hit swells up out of the kick.'],
      kit: {kick: 47, kd: .3, hat: 'house', clap: 1, perc: '. . . . . . x . . . . x . . . .', duck: .85, rel: .7},
      fill: 'slide', fill2: 'gap', answers: [0, 0, 0, 3], breakMode: 'pad',
      sound: sound({level: 0.45, osc: [{w: 'sawtooth', oct: 0, det: -5, g: .5}, {w: 'square', oct: 0, det: 5, g: .4}], pitchEnv: {semi: 7, t: .07}, vowel: .35, word: ['a', 'o', 'u'], say: 'ow', cut: 420, res: 5, env: 2.6, dec: .22, drive: .7, sub: .9, hp: 85})},
    [['Two hits', '. . 0! - | . . . . | . . 0! - | . 0\' . .', '. . 0! - | . . . . | . 0\' . 0! | - . 3w -'],
     ['Monotone', '. . 0 . | . 0\' . 0 | . . 0 . | . 0\' . 0', '. . 0 . | . 0\' . 0 | . . 0 . | . 0\' -2w -'],
     ['Bwomp', '. . 0w - | - . . 0\' | . . 0w - | - . . .', '. . 0w - | - . . 0\' | . 0\' . 0w | - - 12\' .']]),
    S({id: 'minimal', name: 'Deep tech bounce', family: 'house', genre: 'Minimal / deep tech', bpm: 130, key: 5, swing: .14,
      lane: 'Josh Baker, Rossi., East End Dubs',
      idea: 'A round sub that bounces. Tiny plucks, octave jumps and one slide per bar, with more swing than you think you need.',
      why: ['Octave jumps on weak 16ths make the sub feel like it is skipping.', 'The slide at the end of the bar is the only long gesture, so it reads as the hook.', 'Swing on the 16ths is doing half the work. Turn it off and the loop stops walking.'],
      recipe: ['Sine or triangle with a little square for definition. Mono, legato, glide 90 ms.', 'Low-pass near 900 Hz, short envelope so each note has a soft "p" at the front.', 'Amp decay so short notes pluck; overlapping MIDI notes slide.', 'Very little drive. This bass is about pitch and timing, not tone.'],
      kit: {kick: 49, kd: .22, hat: 'shuffle', clap: 1, perc: '. x . . . . . x . . x . . . . .', duck: .7, rel: .45},
      fill: 'run', fill2: 'slide', answers: [0, 0, 3, 0], breakMode: 'tease',
      sound: sound({level: 0.5, osc: [{w: 'triangle', oct: 0, det: 0, g: .7}, {w: 'square', oct: 0, det: 4, g: .14}], cut: 900, res: 3, env: 1.2, dec: .09, drive: .2, sub: 1, glide: .09, pluck: .35, wowDepth: 1.6, hp: 70})},
    [['Bounce', '. . 0\' . | . 0\' . 12\' | . . 0\' . | . 0 10~ -', '. . 0\' . | . 0\' . 12\' | . . 0\' 3\' | . 0 -2~ -'],
     ['Slinky', '. 0 - . | . . 7\' . | . 0 - . | . 12\' . 10\'', '. 0 - . | . . 7\' . | . 0 - 3~ | - . 5\' .'],
     ['Hiccup', '. . 0\' 0\' | . . . 0 | - . 12\' . | . 0\' . .', '. . 0\' 0\' | . . . 0 | - . 15\' . | . 12 10~ 0\'']]),
    S({id: 'warp', name: 'Speed garage warp', family: 'house', genre: 'Bass house / UKG', bpm: 134, key: 7, swing: .12,
      lane: 'Interplanetary Criminal, Sammy Virji, Bullet Tooth',
      idea: 'Weow. A detuned reese that bends into its notes while the filter wobbles in time, answered by dry organ-style stabs.',
      why: ['Long warping notes against short dry ones: the contrast is the groove.', 'The filter wobble is locked to 8ths, so the bass plays a rhythm even while it holds one note.', 'Slides down at the end of bar two pull you back to the one.'],
      recipe: ['Two saws detuned about 18 cents each way, plus a quiet square an octave up.', 'Low-pass 24 dB near 380 Hz with resonance. LFO to cutoff, synced to 1/8, retriggered per note.', 'Glide 110 ms, legato. Overlap the MIDI notes you want to bend.', 'Drive after the filter, then a clean sub. Keep the reese mono under 150 Hz.'],
      kit: {kick: 51, kd: .22, hat: 'garage', clap: 1, perc: '. . . x . . . . . x . . . . . x', duck: .7, rel: .45},
      fill: 'slide', fill2: 'stutter', answers: [0, 3, 0, 5], breakMode: 'tease',
      sound: sound({level: 0.48, osc: [{w: 'sawtooth', oct: 0, det: -18, g: .45}, {w: 'sawtooth', oct: 0, det: 18, g: .45}, {w: 'square', oct: 1, det: 0, g: .12}], vowel: .3, word: ['u', 'i', 'a', 'u'], say: 'weow', lfo: {rate: 2, depth: 1.5}, cut: 380, res: 7, env: 1, dec: .2, drive: .6, sub: .85, glide: .11, wowDepth: 2.6, hp: 90})},
    [['Warp', '. . 0w - | - . 0\' . | . . 3w - | - . 0\' 0\'', '. . 0w - | - . 0\' . | . . 7w - | - 5~ 3~ -'],
     ['Organ skip', '. . 0\' . | . 0\' . 0\' | . . 0\' . | . 12\' 10\' .', '. . 0\' . | . 0\' . 0\' | . . 3\' . | . 5\' . 7w'],
     ['Reese drag', '. 0w - - | . . 0\' . | . 0w - - | . . -2w -', '. 0w - - | . . 0\' . | . 3w - - | . 0 12~ -']]),
    S({id: 'afro', name: 'Afro house heartbeat', family: 'house', genre: 'Afro house', bpm: 122, key: 9, swing: .08, kickFree: false,
      lane: 'Keinemusik, Black Coffee, Shimza',
      idea: 'A warm, round sub that lands with the kick and then leans against it: three, three, two. It follows the chords and never shouts.',
      why: ['The 3-3-2 pattern crosses the four-on-the-floor, so the body gets two pulses to move to.', 'Longer notes and slow slides: the bass sings under the percussion instead of competing with it.', 'It follows the chord roots (i, i, VI, VII), so eight bars feel like a journey without a single fill.'],
      recipe: ['Triangle or sine with a soft sine an octave up. Slow attack (8 ms) so it never clicks.', 'Low-pass 600 Hz, almost no envelope. Warmth from saturation, not from the filter.', 'Glide 120 ms on overlapping notes.', 'Sidechain with a slower release: the notes land on the kick, so the duck is what separates them.'],
      kit: {kick: 52, kd: .24, hat: 'afro', clap: 0, perc: 'x . . x . . x . . . x . . x . .', duck: .8, rel: .6},
      prog: [0, 0, -4, -2], fill: 'run', fill2: 'octave', breakMode: 'pad',
      sound: sound({level: 0.5, osc: [{w: 'triangle', oct: 0, det: 0, g: .7}, {w: 'sine', oct: 1, det: 0, g: .18}], cut: 600, res: 2, env: .8, dec: .25, drive: .28, sub: 1, glide: .12, atk: .008, rel: .04, wowDepth: 1.4, hp: 60})},
    [['Three three two', '0 - . 0 | - . 0 - | . . 0 - | . 0 . 3', '0 - . 0 | - . 0 - | . . 0 - | . -2 - 0~'],
     ['Heartbeat', '0 - - . | . . 0 . | . 0 - . | . . 7 -', '0 - - . | . . 0 . | . 0 - . | 5 - 3~ -'],
     ['Call down', '. . 0 - | . 0 . . | 0 - . 0 | . . 12\' .', '. . 0 - | . 0 . . | 0 - . 10 | - 7 - .']]),
    S({id: 'melodic', name: 'Melodic house pulse', family: 'house', genre: 'Melodic house & techno', bpm: 124, key: 2,
      lane: 'Anyma, Argy, Massano',
      idea: 'An offbeat pulse that follows four chords. Simple enough to disappear under a big lead, strong enough to carry the drop alone.',
      why: ['Offbeat root notes are the oldest trick there is: kick, bass, kick, bass. The floor moves on the "and".', 'The chord changes every two bars (i, VI, III, VII), so the bass tells the story the lead is singing.', 'A 16th pickup into the next bar keeps the loop rolling over the bar line.'],
      recipe: ['Two saws detuned 10 cents, mono below 150 Hz.', 'Low-pass 500 Hz, envelope 1.5 octaves, decay 200 ms. Open the cutoff over the whole build.', 'Light drive. A second layer an octave up, high-passed, makes it audible on small speakers.', 'Sidechain deep and slow enough that the offbeat note swells.'],
      kit: {kick: 48, kd: .28, hat: 'techno', clap: 1, perc: '. . . . . . . x . . . . . . x .', duck: .85, rel: .6},
      prog: [0, -4, 3, -2], breakProg: [0, -4, 3, -2], fill: 'run', fill2: 'octave', breakMode: 'pad',
      sound: sound({level: 0.52, osc: [{w: 'sawtooth', oct: 0, det: -10, g: .45}, {w: 'sawtooth', oct: 0, det: 10, g: .45}, {w: 'sawtooth', oct: 1, det: 0, g: .1}], cut: 520, res: 3, env: 1.6, dec: .2, drive: .35, sub: .8, hp: 80})},
    [['Pulse', '. . 0 . | . . 0 . | . . 0 . | . . 0 0\'', '. . 0 . | . . 0 . | . . 0 . | . 0\' 0 12\''],
     ['Driver', '. 0\' 0 0\' | . 0\' 0 0\' | . 0\' 0 0\' | . 0\' 0 7\'', '. 0\' 0 0\' | . 0\' 0 0\' | . 0\' 0 0\' | . 12\' 0 10\''],
     ['Arp walker', '. . 0 . | . 7\' 0 . | . . 0 . | . 12\' 10 .', '. . 0 . | . 7\' 0 . | . . 3 . | . 7\' 5 -']]),
    S({id: 'organ', name: 'Organ house', family: 'house', genre: 'House / organ bass', bpm: 126, key: 9, swing: .1, kickFree: false,
      lane: 'Sonny Fodera, Disclosure, the M1 organ lineage',
      idea: 'The hollow organ bass that has been filling floors since the nineties, back on top. It is percussive, melodic and lands on the one.',
      why: ['It plays a tune. Root, third, fourth, fifth: you can sing this bassline, which is why people remember it.', 'Dry, short notes with a click at the front work like an extra drum.', 'The first note of the bar is on the kick, so the loop feels planted and the syncopation after it feels like release.'],
      recipe: ['Sines at the fundamental, the octave and the twelfth (organ drawbars), or an M1-style organ sample.', 'A very short FM or noise click at the start of each note.', 'No filter movement. Short amp decay, no release tail.', 'Layer a sine sub on the same notes. Small room reverb on the top layer only.'],
      kit: {kick: 50, kd: .24, hat: 'house', clap: 1, perc: '. . . x . . . . . . x . . . . .', duck: .7, rel: .45},
      prog: [0, 0, 3, -2], fill: 'run', fill2: 'octave', answers: [0, 0, 0, 0], breakMode: 'tease',
      sound: sound({level: 0.66, osc: [{w: 'sine', oct: 0, det: 0, g: .55}, {w: 'sine', oct: 1, det: 0, g: .42}, {w: 'sine', oct: 1, semi: 7, det: 0, g: .2}], fm: {ratio: 3, amt: 2.2, dec: .035}, cut: 2400, res: 1, env: .3, dec: .1, drive: .3, sub: .55, pluck: .3, wowDepth: 1.2, hp: 60})},
    [['M1 bounce', '0 . . 0\' | . . 0 . | . 0\' . 3 | . . 5 .', '0 . . 0\' | . . 0 . | . 0\' . 7 | . 5 . 3'],
     ['Skippy', '. . 0\' . | . 0\' . 12\' | . . 0\' . | 10\' . 7\' .', '. . 0\' . | . 0\' . 12\' | . . 0\' . | 3\' . 5\' 7\''],
     ['Stab and answer', '0 - . . | . . 0\' 0\' | . . 3 - | . . 0\' .', '0 - . . | . . 0\' 0\' | . . 5 - | 7\' . 10\' .']]),
    S({id: 'disco', name: 'Jackin octaves', family: 'house', genre: 'Funky / jackin house', bpm: 125, key: 9, swing: .12, kickFree: false,
      lane: 'Disco-house and jackin lineage',
      idea: 'Root on the beat, octave on the offbeat, and a walk-up at the end. A bass player\'s line, quantised and filtered.',
      why: ['The octave on the offbeat is a built-in open hi-hat for the low end.', 'Walking notes into the next bar give the loop a direction.', 'Short notes leave room for a chopped sample and a busy drum loop.'],
      recipe: ['Saw and square, or a sampled finger bass.', 'Low-pass 800 Hz, envelope 2.5 octaves, decay 100 ms: a pluck with a bright front.', 'Resonance around 30% so the filter quacks a little.', 'Automate the cutoff by hand through the arrangement, the way a DJ would ride a filter.'],
      kit: {kick: 52, kd: .2, hat: 'house', clap: 1, perc: '. . x . . . . x . . x . . x . .', duck: .6, rel: .4},
      fill: 'run', fill2: 'octave', answers: [0, 0, 0, 0], breakMode: 'tease',
      sound: sound({level: 0.56, osc: [{w: 'sawtooth', oct: 0, det: -4, g: .45}, {w: 'square', oct: 0, det: 4, g: .3}], cut: 800, res: 5, env: 2.4, dec: .1, drive: .3, sub: .6, pluck: .3, hp: 70})},
    [['Octave jack', '0\' . 12\' . | 0\' . 12\' . | 0\' . 12\' . | 0\' 10\' 12\' .', '0\' . 12\' . | 0\' . 12\' . | 0\' . 12\' 7\' | . 5\' 7\' 10\''],
     ['Slap walk', '0 . . 0\' | . 7\' . 0 | . . 10\' . | 12\' . 7\' .', '0 . . 0\' | . 7\' . 0 | . . 3 . | 5 - 7\' .'],
     ['Filter funk', '. . 0\' 0\' | . 12\' . 0\' | . . 0\' 0\' | . 10\' 12\' .', '. . 0\' 0\' | . 12\' . 0\' | . 3\' . 5\' | . 7\' 10 -']]),

    S({id: 'rumble', name: 'Peak-time rumble', family: 'techno', genre: 'Peak time techno', bpm: 136, key: 5,
      lane: 'Charlotte de Witte, Adam Beyer, Enrico Sangiuliano',
      idea: 'The bass is the kick\'s own shadow: a reverb tail, low-passed and ducked, with a sub pattern rolling in the three 16ths between kicks.',
      why: ['Three notes between every kick turn four-on-the-floor into a gallop.', 'One pitch only. Movement comes from velocity and the filter, so nothing fights the kick\'s tuning.', 'The last 16th before each kick is short. That tiny gap is what makes the kick punch.'],
      recipe: ['Send the kick to a reverb (1–2 s), then low-pass at 100–120 Hz, saturate, and sidechain hard to the dry kick.', 'Under it, a sine or filtered saw playing the 16ths between kicks.', 'Tune the kick, the rumble and the sub to the same root.', 'Mono everything below 120 Hz. Automate the low-pass up to 300 Hz in the build.'],
      kit: {kick: 46, kd: .3, hat: 'techno', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .95, rel: .5, kdrive: .5},
      fill: 'gap', fill2: 'stutter', breakMode: 'drone',
      sound: sound({level: 0.42, osc: [{w: 'sine', oct: 0, det: 0, g: .6}, {w: 'sawtooth', oct: 0, det: 0, g: .22}], cut: 190, res: 2, env: .7, dec: .1, drive: .8, sub: .9, rumble: .9, wowDepth: 1.6, hp: 30})},
    [['Rolling', '. 0 0 0\' | . 0 0 0\' | . 0 0 0\' | . 0 0 0\'', '. 0 0 0\' | . 0 0 0\' | . 0 0 0\' | . 0! 0 0\''],
     ['Offbeat sub', '. . 0 - | . . 0 - | . . 0 - | . . 0 -', '. . 0 - | . . 0 - | . . 0 - | . 0\' 0 0\''],
     ['Gallop', '. . 0 0\' | . . 0 0\' | . . 0 0\' | . 0\' 0 0\'', '. . 0 0\' | . . 0 0\' | . 0\' 0 0\' | . 0\' 0! 0\'']]),
    S({id: 'hypnotic', name: 'Hypnotic loop', family: 'techno', genre: 'Hypnotic techno', bpm: 138, key: 4, evolve: .6,
      lane: 'Rene Wise, Ignez, Oscar Mulero',
      idea: 'A cycle of three or five laid over a bar of four. The notes never change; where the accent falls does, and the filter breathes over eight bars.',
      why: ['A three-step figure over 16 steps only lines up every three bars. The ear keeps chasing it.', 'Nothing is ever a fill. Change comes from the filter moving slowly, which is why a loop can run for six minutes.', 'Short, dry, resonant notes sit like an extra percussion line.'],
      recipe: ['Square and saw, low-pass 300 Hz with high resonance, short envelope.', 'Map cutoff to a very slow LFO (8 or 16 bars) or ride it by hand. This is the arrangement.', 'A little delay (dotted 8th, high-passed) on the top layer only.', 'Sub stays plain. Let the mid layer do the moving.'],
      kit: {kick: 47, kd: .22, hat: 'techno', clap: 0, perc: '. . x . . x . . x . . x . . x .', duck: .8, rel: .4},
      fill: 'none', fill2: 'none', breakMode: 'drone',
      sound: sound({level: 0.48, osc: [{w: 'square', oct: 0, det: -3, g: .4}, {w: 'sawtooth', oct: 0, det: 3, g: .4}], cut: 300, res: 9, env: 1.5, dec: .08, drive: .4, sub: .7, wowDepth: 2, hp: 70})},
    [['Three over four', '. 0 0\' 3\' | . 0\' 3 0\' | . 3\' 0 0\' | . 0 0\' 3\'', '. 0\' 3 0\' | . 3\' 0 0\' | . 0 0\' 3\' | . 0\' 3 0\''],
     ['Loop of five', '. 0\' . 0\' | . . 0\' . | . 0\' . 0\' | . 0\' . .', '. 0\' . . | . 0\' . 0\' | . . 0\' . | . 0\' . 0\''],
     ['Pedal and ping', '. 0 - 0\' | . 0 - 0\' | . 0 - 12\' | . 0 - 0\'', '. 0 - 0\' | . 0 - 10\' | . 0 - 0\' | . 0 - 12\'']]),
    S({id: 'groove', name: 'Hard groove funk', family: 'techno', genre: 'Hard groove', bpm: 142, key: 7, swing: .1, kickFree: false,
      lane: 'Ben Sims, Chlär, Funk Assault',
      idea: 'A tom you can tune. Fast, swung, syncopated hits that play with the kick like a second drummer.',
      why: ['It is a drum part with pitch: every note is short and has a small pitch drop, like a tom.', 'Swung 16ths at 142 BPM are where the funk is. Straight, it is a different genre.', 'The pattern repeats every beat and a half, so it tumbles across the bar line.'],
      recipe: ['Sine or triangle with a pitch envelope: +5 semitones falling in 40 ms.', 'Low-pass 700 Hz, drive it into a saturator until it barks.', 'Short decay, no sustain. Velocity to volume and to pitch-envelope amount.', 'Bus it with the toms and percussion, and compress them together.'],
      kit: {kick: 49, kd: .2, hat: 'techno', clap: 1, perc: '. . x . . x . x . . x . x . . x', duck: .6, rel: .3, kdrive: .3},
      fill: 'run', fill2: 'stutter', breakMode: 'tease',
      sound: sound({level: 0.6, osc: [{w: 'sine', oct: 0, det: 0, g: .6}, {w: 'triangle', oct: 1, det: 0, g: .3}], pitchEnv: {semi: 5, t: .04}, cut: 700, res: 2, env: 1, dec: .1, drive: .65, sub: .8, pluck: .5, wowDepth: 1.5, hp: 50})},
    [['Funk engine', '0\' . 0\' 0\' | . 0\' . 0\' | 0\' . 0\' 0\' | . 3\' 0\' .', '0\' . 0\' 0\' | . 0\' . 0\' | 0\' . 0\' 0\' | . 5\' 3\' 0\''],
     ['Tom roller', '. 0\' 0\' . | 0\' . 0\' 7\' | . 0\' 0\' . | 0\' . 5\' 3\'', '. 0\' 0\' . | 0\' . 0\' 7\' | . 0\' 0\' . | 0\' 10\' 7\' 5\''],
     ['Shuffle stab', '. . 0! . | . 0\' . 0! | . . 0! . | . 0\' 3\' .', '. . 0! . | . 0\' . 0! | . . 0! . | 0\' 5\' . 3\'']]),
    S({id: 'hard', name: 'Hard techno slam', family: 'techno', genre: 'Hard techno', bpm: 152, key: 5,
      lane: 'Sara Landry, Nico Moreno, I Hate Models',
      idea: 'Kick, bass, kick, bass, as loud as it goes. A distorted offbeat tone that is half bassline, half second kick.',
      why: ['The offbeat note is as loud as the kick, so the track has eight hits a bar instead of four.', 'Two or three pitches, moved rarely. At 150 BPM a simple root change feels like a key change.', 'Everything is distorted together, which glues kick and bass into one instrument.'],
      recipe: ['Saw and square into hard clipping or a distortion pedal emulation.', 'Low-pass open (900 Hz or more), short pitch or filter envelope for a punchy front.', 'Or resample: bounce the kick\'s tail, pitch it, and play it on the offbeat.', 'Put kick and bass on one bus and clip them together. Check the sub in mono.'],
      kit: {kick: 46, kd: .24, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .95, rel: .35, kdrive: .9},
      fill: 'stutter', fill2: 'gap', answers: [0, 0, 0, 0], breakMode: 'drone',
      sound: sound({level: 0.42, osc: [{w: 'sawtooth', oct: 0, det: -6, g: .5}, {w: 'square', oct: 0, det: 6, g: .4}], cut: 900, res: 2, env: 1, dec: .2, drive: 1, sub: 1, wowDepth: 1.5, hp: 40})},
    [['Offbeat slam', '. . 0! - | . . 0! - | . . 0! - | . . 0! -', '. . 0! - | . . 0! - | . . 0! - | . 0\' 0! -'],
     ['Root move', '. . 0 - | . . 0 - | . . 3 - | . . 0 -', '. . 0 - | . . 0 - | . . 5 - | . . 3 -'],
     ['Stomp', '. . 0 0\' | . . 0 0\' | . . 0 0\' | . 0\' 0 0\'', '. . 0 0\' | . . 0 0\' | . . 12\' 0 | . 0\' 0 0\'']]),
    S({id: 'trance', name: 'Trance-techno roller', family: 'techno', genre: 'Trance techno', bpm: 146, key: 9,
      lane: 'KI/KI, Marlon Hoffstadt',
      idea: 'Three 16ths between every kick, following big simple chords. Nineties trance bass at today\'s tempo.',
      why: ['The rolling 16ths are a constant engine, so the kick can be short and the track still feels full.', 'It follows the chords (i, VI, VII, i). Hands go up on the VI because the bass moved, not because the lead did.', 'Every note is the same length. Machine-tight is the point.'],
      recipe: ['Two detuned saws, low-pass 650 Hz, envelope 2 octaves, decay 90 ms.', 'Every note short and identical. Sidechain does the rest.', 'High-pass the top layer at 100 Hz and put a sine sub on the same MIDI.', 'Open the filter and lengthen the decay through the build.'],
      kit: {kick: 48, kd: .2, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .9, rel: .35, kdrive: .4},
      prog: [0, -4, -2, 0], breakProg: [0, -4, -2, -2], fill: 'run', fill2: 'octave', breakMode: 'pad',
      sound: sound({level: 0.5, osc: [{w: 'sawtooth', oct: 0, det: -9, g: .45}, {w: 'sawtooth', oct: 0, det: 9, g: .45}], cut: 650, res: 4, env: 2, dec: .09, drive: .45, sub: .8, hp: 70})},
    [['Rolling', '. 0\' 0\' 0\' | . 0\' 0\' 0\' | . 0\' 0\' 0\' | . 0\' 0\' 0\'', '. 0\' 0\' 0\' | . 0\' 0\' 0\' | . 0\' 0\' 0\' | . 0\' 0\' 12\''],
     ['Offbeat pump', '. . 0 . | . . 0 . | . . 0 . | . . 0 12\'', '. . 0 . | . . 0 . | . . 0 . | . 7\' 0 12\''],
     ['Gate', '. 0\' 0\' 12\' | . 0\' 0\' 0\' | . 0\' 0\' 12\' | . 0\' 7\' 0\'', '. 0\' 0\' 12\' | . 0\' 0\' 0\' | . 0\' 0\' 12\' | . 10\' 7\' 12\'']]),
    S({id: 'donk', name: 'Bounce donk', family: 'techno', genre: 'Hard bounce', bpm: 150, key: 7,
      lane: 'The hard bounce and donk revival',
      idea: 'Kick, donk, kick, donk. A hollow FM knock on every offbeat that is impossible not to bounce to.',
      why: ['The donk is pitched percussion: a sharp FM attack and no sustain, so it never muddies the kick.', 'It sits on the offbeat like a second kick an octave up. Two-step bounce at 150.', 'A fifth or an octave on the last offbeat is all the melody it needs.'],
      recipe: ['FM: sine carrier, sine modulator at 2:1, modulation falling to zero in 90 ms.', 'One octave above the sub. No filter, or one wide open.', 'Short amp decay. Add a sine sub on the same notes for weight.', 'Drive lightly, and keep it dry and mono.'],
      kit: {kick: 50, kd: .18, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .85, rel: .3, kdrive: .4},
      fill: 'run', fill2: 'stutter', answers: [0, 0, 0, 0], breakMode: 'tease',
      sound: sound({level: 0.66, osc: [{w: 'sine', oct: 1, det: 0, g: .8}], fm: {ratio: 2, amt: 5, dec: .09}, cut: 3200, res: 1, env: .2, dec: .1, drive: .5, sub: .6, pluck: .6, wowDepth: 1, hp: 60})},
    [['Donk', '. . 0\' . | . . 0\' . | . . 0\' . | . . 0\' 7\'', '. . 0\' . | . . 0\' . | . . 0\' . | . 7\' 0\' 12\''],
     ['Double bounce', '. . 0\' 0\' | . . 0\' . | . . 0\' 0\' | . . 12\' .', '. . 0\' 0\' | . . 0\' . | . . 0\' 0\' | . 12\' 10\' 7\''],
     ['Skip', '. . 0\' . | . 0\' 0\' . | . . 0\' . | . 0\' 7\' .', '. . 0\' . | . 0\' 0\' . | . . 3\' . | . 5\' 7\' 12\'']]),
    S({id: 'acid', name: 'Acid line', family: 'techno', genre: 'Acid techno', bpm: 140, key: 9, kickFree: false,
      lane: 'Regal, Boston 168, the 303 lineage',
      idea: 'One oscillator, one resonant filter, and three tricks: accent, slide, and the octave jump. The pattern is nothing; the knob is everything.',
      why: ['Slides and accents fall on different steps each beat, so 16 plain 16ths never sound plain.', 'Octave jumps into a slide are the 303\'s signature gesture.', 'The filter sweep across the phrase is the arrangement. Closed it is a bassline, open it is the lead.'],
      recipe: ['One saw (or square), mono, legato with 60–70 ms glide.', 'Resonant low-pass, 18–24 dB, cutoff low, envelope amount high, decay short.', 'Accent raises volume and envelope amount together. Distortion after the filter.', 'High-pass at 60 Hz and put a separate sub under it if the track needs one.'],
      kit: {kick: 48, kd: .22, hat: 'techno', clap: 1, perc: '. . . . . . x . . . . . . . x .', duck: .7, rel: .35, kdrive: .4},
      fill: 'slide', fill2: 'run', answers: [0, 3, 0, 5], breakMode: 'tease', evolve: .4,
      sound: sound({level: 0.4, osc: [{w: 'sawtooth', oct: 0, det: 0, g: .7}], cut: 320, res: 16, env: 3.2, dec: .16, drive: .7, sub: .35, glide: .07, wowDepth: 3, hp: 60})},
    [['Three tricks', '0\' 0\' 12 0~ | 0\' . 0! 3\' | 0\' 0\' 10 12~ | 0\' 7! . 12\'', '0\' 0\' 12 0~ | 0\' . 0! 3\' | 0\' 0\' 15 12~ | 10\' 7! 3 0~'],
     ['Squelch', '. 0\' 0! . | 0\' 12 0~ . | . 0\' 0! . | 3\' 5 3~ 0\'', '. 0\' 0! . | 0\' 12 0~ . | . 0\' 0! 7\' | 10 12~ - 0\''],
     ['Climber', '0! . 0\' 0\' | 3! . 0\' 0\' | 5! . 0\' 0\' | 7 10~ 12~ 0\'', '0! . 0\' 0\' | 3! . 0\' 0\' | 5! . 7\' 0\' | 12 10~ 7~ 0~']]),
    S({id: 'giant', name: 'Melodic techno giant', family: 'techno', genre: 'Melodic techno', bpm: 126, key: 4, kickFree: false,
      lane: 'Tale Of Us, Anyma, Mind Against',
      idea: 'A wall. One enormous detuned note held under the kick and pumped by the sidechain, with a growl that opens once per bar.',
      why: ['The note is held; the sidechain plays the rhythm. Four swells a bar that you feel in your chest.', 'Chord roots move every two bars (i, III, VI, VII): slow, cinematic, inevitable.', 'One growl per bar gives the wall a face.'],
      recipe: ['Two or three saws detuned 20+ cents, plus one an octave up. Mono below 150 Hz.', 'Low-pass 450 Hz with a slow envelope (400 ms decay). Macro the cutoff for the growl.', 'Sidechain deep with a long release, or draw a volume shape synced to 1/4.', 'Saturate, then a little stereo width above 300 Hz only.'],
      kit: {kick: 46, kd: .32, hat: 'techno', clap: 1, perc: '. . . . . . . . . . . . . . x .', duck: .95, rel: .75},
      prog: [0, 3, -4, -2], breakProg: [0, 3, -4, -2], fill: 'slide', fill2: 'octave', breakMode: 'pad',
      sound: sound({level: 0.46, osc: [{w: 'sawtooth', oct: 0, det: -22, g: .4}, {w: 'sawtooth', oct: 0, det: 22, g: .4}, {w: 'sawtooth', oct: 1, det: 0, g: .16}], vowel: .2, word: ['o', 'a', 'o'], say: 'waow', cut: 450, res: 3, env: 1.2, dec: .4, drive: .5, sub: .9, rel: .05, atk: .01, wowDepth: 2.4, hp: 80})},
    [['Giant', '0 - - - | - - 0 . | 0 - - - | - - 0 0\'', '0 - - - | - - 0 . | 0w - - - | - - 0 0\''],
     ['Rolling stones', '. . 0 0\' | . 0\' 0 . | . . 0 0\' | . 0\' 12\' .', '. . 0 0\' | . 0\' 0 . | . . 0 0\' | . 7\' 12\' 10\''],
     ['Growl answer', '0w - - - | . . 0\' . | 0w - - - | . 0\' 0\' .', '0w - - - | . . 0\' . | 0w - - - | . 7\' 5\' 3\'']]),

    // ------------------------------------------------ more of now, and where it came from
    S({id: 'latin', name: 'Latin tech tumbao', family: 'house', genre: 'Latin tech house', era: 'now', year: '2023–26', bpm: 126, key: 9, swing: .1,
      lane: 'Hugel, Cloonee, the Latin house wave',
      idea: 'The salsa bass player\'s trick in a tech house kit: every note arrives a 16th early and hangs over the beat.',
      why: ['Anticipation. The note lands just before the kick and is still ringing when it hits, so the bar leans forward.', 'Root and fifth only: it is a tumbao, the most danced-to bass pattern there is.', 'It leaves the downbeat empty, which is exactly where the kick and the vocal chop want to be.'],
      recipe: ['Round, woody tone: triangle plus a little saw, or a sampled upright or baby bass.', 'Low-pass 700 Hz, short envelope for a soft pluck.', 'Notes held long enough to cross the kick. The sidechain carves the hole.', 'Layer a conga or timbale loop and let the bass answer it.'],
      kit: {kick: 50, kd: .24, hat: 'afro', clap: 1, perc: 'x . . x . . x . . x . x . . x .', duck: .8, rel: .5},
      fill: 'run', fill2: 'octave', answers: [0, 0, 0, 0], breakMode: 'tease', sn: 'Baby bass',
      sound: sound({level: 0.49, osc: [{w: 'triangle', oct: 0, det: 0, g: .65}, {w: 'sawtooth', oct: 0, det: 5, g: .2}], cut: 700, res: 3, env: 1.4, dec: .12, drive: .35, sub: .9, pluck: .25, glide: .08, wowDepth: 1.6, hp: 65})},
    [['Tumbao', ". . . 0 | - . 7 - | . . . 0 | - . 7 -", ". . . 0 | - . 7 - | . . . 5 | - . 7 12'"],
     ['Anticipated', ". . . 0 | - . . 7 | - . . 0 | - . 5 -", ". . . 0 | - . . 7 | - . . 3 | - 5' 7 -"],
     ['Montuno answer', ". . 0' 0 | - . 7' . | . . 0' 0 | - . 10' .", ". . 0' 0 | - . 7' . | . 12' . 10 | - 7' 5' ."]]),
    S({id: 'piano', name: 'Log drum', family: 'house', genre: 'Amapiano / afro tech', era: 'now', year: '2021–26', bpm: 113, key: 5, swing: .1, kickFree: false,
      lane: 'Kabza De Small, Uncle Waffles, the amapiano crossover',
      idea: 'The log drum: a pitched, knocking sub that plays a melody in the gaps and slides between its notes. Half bassline, half tom fill.',
      why: ['It is percussion you can hum. Every hit knocks at the front and then drops into a sub.', 'The phrase is a whole two bars long and leaves real silence, so each entrance is an event.', 'Slides between the last notes are the signature. Without them it is just an 808.'],
      recipe: ['Sine with a fast pitch drop: an octave down in 50 ms. Add a short FM or wood click.', 'Saturate hard so the knock is audible on a phone.', 'Mono, legato, glide 80–100 ms. Overlap notes to slide.', 'Sparse kick or no four-on-the-floor at all. The log drum is the low end.'],
      kit: {kick: 52, kd: .2, hat: 'shuffle', clap: 1, kicks: [0, 4, 8, 12], perc: 'x . . x . . x . . . x . . x . .', duck: .5, rel: .4},
      fill: 'slide', fill2: 'run', answers: [0, 0, 3, 0], breakMode: 'tease', sn: 'Log drum',
      sound: sound({level: 0.50, osc: [{w: 'sine', oct: 0, det: 0, g: .8}, {w: 'triangle', oct: 1, det: 0, g: .15}], pitchEnv: {semi: 12, t: .05}, fm: {ratio: 2.5, amt: 2, dec: .03}, cut: 1200, res: 1, env: .6, dec: .1, drive: .75, sub: .9, pluck: .3, glide: .09, wowDepth: 1.3, hp: 40})},
    [['Knock', "0 - . . | . . 0' . | . 0 - . | . . 3 5~", ". . 0 - | . . . 0' | . 7 - 5~ | - 3~ - 0'"],
     ['Call', "0' . . 0 | - . . . | 0' . 3 - | . . . .", "0' . . 0 | - . . 7 | - 5~ - 3~ | - . 0' ."],
     ['Tumble', ". . 0 - | . 0' . . | . . 0 - | 7' . 5' .", ". . 0 - | . 0' . . | 12 10~ 7~ - | 5~ - 0' ."]]),
    S({id: 'slap', name: 'Slap house bounce', family: 'house', genre: 'Slap house / Brazilian bass', era: 'classic', year: '2019–22', bpm: 124, key: 4,
      lane: 'Alok, the slap house years',
      idea: 'A deep, clicky bass on every offbeat with a 16th pickup, following four pop chords. The sound of a hundred radio remixes.',
      why: ['Offbeat plus pickup is a bounce anyone can feel in one bar.', 'The click at the front makes it readable on a car stereo; the sub underneath makes it work in a club.', 'Four chords, one bar pattern. The top line gets all the attention.'],
      recipe: ['Square or saw, low-pass 500 Hz, very short pitch envelope for the slap.', 'Fast filter envelope, decay 80 ms.', 'Sine sub an octave below on the same MIDI.', 'Sidechain deep. The bass should feel like it is pushed out of the kick.'],
      kit: {kick: 48, kd: .26, hat: 'house', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .9, rel: .5},
      prog: [0, -4, 3, -2], breakProg: [0, -4, 3, -2], fill: 'run', fill2: 'octave', breakMode: 'pad', sn: 'Slap pluck',
      sound: sound({level: 0.44, osc: [{w: 'square', oct: 0, det: -5, g: .4}, {w: 'sawtooth', oct: 0, det: 5, g: .35}], pitchEnv: {semi: 9, t: .025}, cut: 500, res: 4, env: 2.6, dec: .08, drive: .5, sub: 1, pluck: .3, hp: 80})},
    [['Bounce', ". . 0' 0' | . . 0' . | . . 0' 0' | . . 0' .", ". . 0' 0' | . . 0' . | . . 0' 0' | . 0' 12' ."],
     ['Pickup', ". 0' 0 . | . . 0 . | . 0' 0 . | . . 0 0'", ". 0' 0 . | . . 0 . | . 0' 0 . | . 7' 0 12'"],
     ['Drop it low', ". . 0 - | . . 0' 0' | . . 0 - | . 0' . 0'", ". . 0 - | . . 0' 0' | . . 0 - | . 12' 7' 0'"]]),
    S({id: 'future', name: 'Future house knock', family: 'house', genre: 'Future / bass house', era: 'classic', year: '2014–17', bpm: 126, key: 7,
      lane: 'Tchami, Oliver Heldens, Jauz',
      idea: 'A metallic, hollow pluck that jumps around the octave between kicks. The drop is the bassline and nothing else.',
      why: ['FM gives each note a pitched "tok", so the line reads like a melody played on a pipe.', 'Big interval jumps on weak 16ths: the ear cannot predict it, the body can.', 'Dry and short. All the size comes from the contrast with the break.'],
      recipe: ['FM: sine carrier, modulator at 1:1 or 3:1, modulation envelope 100 ms.', 'One octave above the sub. Add a sine sub below.', 'No reverb. A little drive, and a short pitch envelope if it needs more knock.', 'Automate the modulation amount up through the build.'],
      kit: {kick: 49, kd: .24, hat: 'house', clap: 1, perc: '. . . . . . . x . . . . . . . .', duck: .8, rel: .45},
      fill: 'octave', fill2: 'stutter', answers: [0, 3, 0, 7], breakMode: 'tease', sn: 'Hollow FM',
      sound: sound({level: 0.57, osc: [{w: 'sine', oct: 1, det: 0, g: .7}, {w: 'square', oct: 0, det: 0, g: .12}], fm: {ratio: 3, amt: 3.2, dec: .11}, cut: 2600, res: 2, env: .8, dec: .12, drive: .45, sub: .8, pluck: .45, wowDepth: 1.2, hp: 70})},
    [['Pipe', ". . 0' . | . 0' . 12' | . . 0' . | . 10' 7' .", ". . 0' . | . 0' . 12' | . . 3' . | . 7' 12' 15'"],
     ['Tok tok', ". 0' 0' . | . . 12' . | . 0' 0' . | . . 7' 10'", ". 0' 0' . | . . 12' . | . 0' 0' . | . 15' 12' 7'"],
     ['Stair', ". . 0' 3' | . . 7' . | . . 0' 3' | . 12' . 7'", ". . 0' 3' | . . 7' . | . 10' . 12' | . 7' 3' 0'"]]),
    S({id: 'electro', name: 'Electro house saw', family: 'house', genre: 'Electro house', era: 'classic', year: '2006–10', bpm: 128, key: 5, kickFree: false,
      lane: 'Benny Benassi, deadmau5, Wolfgang Gartner',
      idea: 'One fat saw note held under the kick and pumped so hard by the sidechain that the compressor becomes the rhythm.',
      why: ['The pump is the groove: four huge breaths a bar.', 'A held note has nowhere to hide, so the sound has to be big. That is the point.', 'Short stutters at the end of the phrase reset the ear before the loop comes round.'],
      recipe: ['Three or more saws, detuned, plus a square an octave down. Lots of drive.', 'Low-pass around 900 Hz, little envelope. Ride the cutoff by hand.', 'Sidechain compressor: fast attack, release timed to just recover before the next kick.', 'Bit of chorus or unison width above 200 Hz, mono below.'],
      kit: {kick: 48, kd: .28, hat: 'house', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .97, rel: .8},
      fill: 'stutter', fill2: 'slide', answers: [0, 0, 0, 3], breakMode: 'pad', sn: 'Pumping saws',
      sound: sound({level: 0.34, osc: [{w: 'sawtooth', oct: 0, det: -14, g: .4}, {w: 'sawtooth', oct: 0, det: 14, g: .4}, {w: 'square', oct: -1, det: 0, g: .2}], cut: 900, res: 3, env: .8, dec: .3, drive: .85, sub: .8, width: .6, wowDepth: 2, hp: 60})},
    [['Pump', "0 - - - | 0 - - - | 0 - - - | 0 - 0' 0'", "0 - - - | 0 - - - | 0w - - - | 3 - 0' 0'"],
     ['Pump and stutter', "0 - - 0' | . 0' 0 - | 0 - - 0' | . 0' 3 -", "0 - - 0' | . 0' 0 - | 0 - - 0' | 5' 3' 0 -"],
     ['Grind', "0w - - - | - - 0' 0' | 0w - - - | - - 3' 0'", "0w - - - | - - 0' 0' | 3w - - - | 5 - 3' 0'"]]),
    S({id: 'prog', name: 'Progressive roller', family: 'house', genre: 'Progressive house', era: 'classic', year: '2001 → revival', bpm: 124, key: 9,
      lane: 'Sasha, Hernan Cattaneo, the prog revival',
      idea: 'Root and octave in constant 16ths, ducked under the kick, changing chord every two bars. It never stops and never shouts.',
      why: ['The octave on the third 16th gives a rolling, galloping feel with only one note name.', 'Constant motion means you can strip everything else away and the track still moves.', 'Slow chord changes over a busy bass: momentum and patience at once.'],
      recipe: ['Saw and square, low-pass 600 Hz, medium resonance, short envelope.', 'All notes the same short length. Velocity to filter, a little.', 'Open the cutoff very slowly over 16 or 32 bars.', 'Dotted-8th delay on a high-passed copy for the shimmer on top.'],
      kit: {kick: 48, kd: .26, hat: 'techno', clap: 1, perc: '. . . . . . x . . . . . . . x .', duck: .85, rel: .5},
      prog: [0, 0, -4, -2], fill: 'run', fill2: 'octave', breakMode: 'pad', evolve: .35, sn: 'Rolling saw',
      sound: sound({level: 0.46, osc: [{w: 'sawtooth', oct: 0, det: -6, g: .45}, {w: 'square', oct: 0, det: 6, g: .3}], cut: 600, res: 6, env: 1.6, dec: .09, drive: .35, sub: .8, echo: .22, width: .3, hp: 75})},
    [['Root and octave', ". 0' 12' 0' | . 0' 12' 0' | . 0' 12' 0' | . 0' 12' 0'", ". 0' 12' 0' | . 0' 12' 0' | . 0' 12' 0' | . 0' 12' 10'"],
     ['Gallop', ". 0' 0 12' | . 0' 0 12' | . 0' 0 12' | . 0' 0 7'", ". 0' 0 12' | . 0' 0 12' | . 0' 0 12' | . 10' 0 12'"],
     ['Weave', ". 0' 7' 12' | . 0' 7' 0' | . 0' 7' 12' | . 0' 10' 7'", ". 0' 7' 12' | . 0' 7' 0' | . 0' 7' 12' | . 15' 12' 10'"]]),
    S({id: 'french', name: 'French filter loop', family: 'house', genre: 'French / filter house', era: 'classic', year: '1997–2002', bpm: 123, key: 2, swing: .1, kickFree: false, evolve: 1,
      lane: 'Daft Punk, Stardust, Cassius',
      idea: 'A sampled disco bass riff, looped and run through a filter that somebody is riding the whole time.',
      why: ['The riff is busy and funky, but the filter keeps changing how much of it you hear.', 'Closed, it is a pulse. Open, it is a bass solo. The crowd goes with the filter.', 'It lands on the one and walks back up to it: a loop that feels like a circle.'],
      recipe: ['A plucky finger-bass tone: saw and square, fast envelope, medium resonance.', 'Resample it. Put the audio through a 24 dB low-pass and automate the cutoff by hand.', 'Compress the bass and drums together so they pump as one.', 'Phaser, very slow, on the whole loop.'],
      kit: {kick: 52, kd: .2, hat: 'house', clap: 1, perc: '. . x . . . . x . . x . . . . x', duck: .7, rel: .5},
      fill: 'run', fill2: 'octave', breakMode: 'tease', sn: 'Filtered finger bass',
      sound: sound({level: 0.48, osc: [{w: 'sawtooth', oct: 0, det: -4, g: .45}, {w: 'square', oct: 0, det: 4, g: .3}], cut: 750, res: 8, env: 2, dec: .11, drive: .4, sub: .6, pluck: .25, width: .25, hp: 65})},
    [['Circle walk', "0' . 0' 0' | . 3' . 5' | . 5' 7' . | 5' . 3' .", "0' . 0' 0' | . 3' . 5' | . 5' 7' . | 10' 7' 5' 3'"],
     ['Filter ride', "0 . . 0' | . 0' 7 . | . 5' . 7 | . . 10' 12'", "0 . . 0' | . 0' 7 . | . 5' . 3 | . 5' 7' ."],
     ['Loop de loop', "0' 0' . 12' | . 0' . 10' | 0' 0' . 7' | . 5' 7' .", "0' 0' . 12' | . 0' . 10' | 0' 0' . 7' | 10' . 12' ."]]),
    S({id: 'garage', name: '2-step sub', family: 'house', genre: 'UK garage', era: 'classic', year: '1999 → revival', bpm: 132, key: 5, swing: .18, kickFree: false,
      lane: 'MJ Cole, El-B, the UKG revival',
      idea: 'A warm sub that sings a short melody around a broken kick. The drums skip; the bass is what you nod to.',
      why: ['With no four-on-the-floor, the bass carries the pulse. It lands on the one and then syncopates.', 'Slides between notes make the sub feel like a voice.', 'Heavy swing on the 16ths. This is the lane where swing matters most.'],
      recipe: ['Sine or triangle, a touch of saturation, mono, glide 80 ms.', 'No filter movement. The melody and the slides are the interest.', 'Leave space: three or four notes a bar.', 'Kick on 1 and the "and" of 3. Snare on 2 and 4. Shuffle the hats hard.'],
      kit: {kick: 54, kd: .18, hat: 'garage', clap: 1, kicks: [0, 10], perc: '. . . x . . . . . . . . . x . .', duck: .6, rel: .4},
      fill: 'slide', fill2: 'run', answers: [0, 0, 3, 0], breakMode: 'pad', sn: 'Warm sine sub',
      sound: sound({level: 0.44, osc: [{w: 'sine', oct: 0, det: 0, g: .7}, {w: 'triangle', oct: 1, det: 0, g: .12}], cut: 900, res: 1, env: .4, dec: .15, drive: .4, sub: 1, glide: .08, atk: .006, rel: .03, wowDepth: 1.2, hp: 40})},
    [['Two step', "0 - - . | . . 0' . | . . 3 - | . 0' . .", "0 - - . | . . 0' . | . . 7 5~ | - . 3' ."],
     ['Sung sub', "0 - . 0' | . . . 7 | - . 5 - | . . 3' .", "0 - . 0' | . . . 7 | - . 10 - | 7~ - 5' ."],
     ['Skippy sub', ". . 0 - | . 0' . . | 0 - . 3' | . . 5 -", ". . 0 - | . 0' . . | 0 - . 12' | . 10 7~ -"]]),
    S({id: 'deep', name: 'Deep house sub', family: 'house', genre: 'Deep house', era: 'classic', year: '1986 → always', bpm: 120, key: 0, swing: .08, kickFree: false,
      lane: 'Larry Heard, Kerri Chandler, Moodymann',
      idea: 'A soft, round bass that plays a slow tune under jazz chords. Few notes, long notes, all the time in the world.',
      why: ['Long notes and a slow harmonic rhythm make the kick feel deeper.', 'It moves by step and by fifth, like a bass player would.', 'At 120 BPM the space between notes is what makes people sway.'],
      recipe: ['Sine with a little second harmonic, or a DX-style electric bass.', 'Soft attack, no filter movement.', 'Play it by hand and do not quantise fully.', 'Sidechain gently. The kick and bass should overlap, warmly.'],
      kit: {kick: 54, kd: .26, hat: 'shuffle', clap: 1, perc: '. . . x . . . . . . x . . . . .', duck: .55, rel: .5},
      prog: [0, 0, 5, 3], breakProg: [0, 0, 5, 3], fill: 'run', fill2: 'slide', breakMode: 'pad', sn: 'Round DX bass',
      sound: sound({level: 0.63, osc: [{w: 'sine', oct: 0, det: 0, g: .7}, {w: 'sine', oct: 1, det: 0, g: .25}], fm: {ratio: 1, amt: 1.2, dec: .2}, cut: 1500, res: 1, env: .3, dec: .2, drive: .25, sub: .8, glide: .07, atk: .008, rel: .05, wowDepth: 1.2, hp: 40})},
    [['Slow tune', "0 - - . | . . 0 - | . . . 0 | - . 3 -", "0 - - . | . . 0 - | . . 7 - | 5 - 3 -"],
     ['Sway', "0 - - - | . . . 7 | - . . . | 0 - 10' .", "0 - - - | . . . 7 | - . 5 - | . 3 - ."],
     ['Walk', "0 - . 0' | . . 3 - | 5 - . 5' | . . 7 -", "0 - . 0' | . . 3 - | 5 - . 7 | - 10 - 12'"]]),
    S({id: 'italo', name: 'Italo sixteenths', family: 'house', genre: 'Italo / nu-disco', era: 'classic', year: '1977 → always', bpm: 118, key: 9, kickFree: false,
      lane: 'Giorgio Moroder, Todd Terje, the Italo lineage',
      idea: 'A sequencer playing root and octave in straight 16ths. The first electronic dance bassline, and it still works.',
      why: ['Straight 16ths with an octave jump is a machine heartbeat. It is hypnotic by construction.', 'The chords change under it, the pattern does not.', 'Because it is so regular, a small filter move feels enormous.'],
      recipe: ['One saw (or saw plus square), low-pass with resonance, short decay.', 'Sequencer-tight: every note the same length and velocity.', 'A 16th or dotted-8th delay doubles the pattern.', 'Slow filter sweep over 16 bars.'],
      kit: {kick: 52, kd: .2, hat: 'house', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .6, rel: .4},
      prog: [0, 0, -4, -2], fill: 'octave', fill2: 'run', breakMode: 'tease', evolve: .5, sn: 'Sequencer saw',
      sound: sound({level: 0.49, osc: [{w: 'sawtooth', oct: 0, det: -3, g: .5}, {w: 'square', oct: 0, det: 3, g: .2}], cut: 650, res: 9, env: 2, dec: .08, drive: .3, sub: .55, echo: .2, hp: 60})},
    [['Machine heart', "0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 10'", "0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 0' | 0' 7' 10' 12'"],
     ['Chase', "0' 12' 0' 12' | 0' 0' 12' 0' | 0' 12' 0' 12' | 0' 0' 10' 12'", "0' 12' 0' 12' | 0' 0' 12' 0' | 0' 12' 0' 12' | 7' 7' 10' 12'"],
     ['Arp bass', "0' 7' 12' 7' | 0' 7' 12' 7' | 0' 7' 12' 7' | 0' 7' 10' 7'", "0' 7' 12' 7' | 0' 7' 12' 7' | 0' 7' 15' 12' | 10' 7' 3' 7'"]]),

    S({id: 'schranz', name: 'Industrial drive', family: 'techno', genre: 'Industrial / schranz', era: 'now', year: '2003 → 2026', bpm: 150, key: 4,
      lane: 'The schranz revival and the harder end of today',
      idea: 'A distorted roll between the kicks with an accent that moves. Three notes, one pitch, relentless.',
      why: ['The accent falls on a different 16th each beat, so a one-note line still has a shape.', 'It is distorted into the same space as the kick, so the two feel welded together.', 'No melody means nothing to get tired of. It can run all night.'],
      recipe: ['Saw into heavy distortion, then a low-pass, then more distortion.', 'Velocity to volume and to filter, strongly.', 'Group it with the kick and clip the group.', 'Automate the low-pass down in the break and back up in the build.'],
      kit: {kick: 47, kd: .2, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .95, rel: .3, kdrive: .9},
      fill: 'stutter', fill2: 'gap', breakMode: 'drone', sn: 'Distorted roll',
      sound: sound({level: 0.39, osc: [{w: 'sawtooth', oct: 0, det: -8, g: .5}, {w: 'sawtooth', oct: 0, det: 8, g: .4}], cut: 600, res: 4, env: 1.8, dec: .07, drive: 1, sub: .9, wowDepth: 1.5, hp: 45})},
    [['Moving accent', ". 0! 0' 0' | . 0' 0! 0' | . 0' 0' 0! | . 0! 0' 0'", ". 0! 0' 0' | . 0' 0! 0' | . 0' 0' 0! | . 0! 0! 0!"],
     ['Hammer', ". 0' 0! . | . 0' 0! . | . 0' 0! . | . 0' 0! 0'", ". 0' 0! . | . 0' 0! . | . 0' 0! 0' | . 0! 0' 0!"],
     ['Saw teeth', ". 0! 0' 3' | . 0! 0' 0' | . 0! 0' 3' | . 0! 0' 0'", ". 0! 0' 3' | . 0! 0' 0' | . 0! 0' 5' | . 3! 0' 0'"]]),
    S({id: 'ebm', name: 'EBM body bass', family: 'techno', genre: 'EBM / dark disco', era: 'classic', year: '1988 → revival', bpm: 124, key: 4, kickFree: false,
      lane: 'Nitzer Ebb, Front 242, the dark disco revival',
      idea: 'A hard sequenced saw in 16ths with the octave thrown in at odd places. Stiff, sweaty, and built for stomping.',
      why: ['Every 16th is filled, so the groove comes entirely from where the octaves fall.', 'It is the lead instrument. Vocals shout over it; nothing else is needed.', 'Slower than techno, heavier than disco: the tempo where people stamp.'],
      recipe: ['One or two saws, low-pass with resonance, envelope decay 70 ms.', 'Sequencer-tight. Accent the octaves.', 'Distortion after the filter, a short gated reverb for size.', 'Double it with a square an octave below for the sub.'],
      kit: {kick: 50, kd: .22, hat: 'techno', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .7, rel: .35, kdrive: .4},
      fill: 'run', fill2: 'stutter', answers: [0, 3, 0, -2], breakMode: 'tease', sn: 'Body saw',
      sound: sound({level: 0.43, osc: [{w: 'sawtooth', oct: 0, det: -5, g: .5}, {w: 'square', oct: 0, det: 5, g: .25}], cut: 520, res: 10, env: 2.4, dec: .07, drive: .7, sub: .6, width: .2, hp: 55})},
    [['Chant', "0' 0' 0' 12' | 0' 0' 10' 0' | 0' 0' 0' 12' | 0' 3' 0' 10'", "0' 0' 0' 12' | 0' 0' 10' 0' | 0' 0' 0' 12' | 0' 7' 10' 12'"],
     ['Stomp', "0! 0' 12' 0' | 0! 0' 12' 0' | 0! 0' 12' 0' | 0! 0' 10' 12'", "0! 0' 12' 0' | 0! 0' 12' 0' | 3! 0' 15' 0' | 0! 12' 10' 7'"],
     ['Muscle', "0' 0' 3' 0' | 0' 12' 0' 0' | 0' 0' 3' 0' | 0' 12' 10' 0'", "0' 0' 3' 0' | 0' 12' 0' 0' | 0' 0' 5' 0' | 7' 12' 10' 7'"]]),
    S({id: 'detroit', name: 'Detroit stab bass', family: 'techno', genre: 'Detroit techno', era: 'classic', year: '1988 → always', bpm: 130, key: 2, swing: .06, kickFree: false,
      lane: 'Underground Resistance, Robert Hood, Kevin Saunderson',
      idea: 'A dry FM bass that plays a short, funky figure and repeats it without apology. Machine soul.',
      why: ['The figure is three or four hits, placed like a funk bassline and then looped like a machine.', 'FM gives a hard, glassy attack that cuts through without being loud.', 'Minor third and fourth: just enough melody to be a tune.'],
      recipe: ['Two-operator FM, modulator at 1:1, quick modulation decay. Or a DX "bass 1" patch.', 'No filter. Amp decay around 150 ms.', 'A little chorus, no reverb.', 'Keep it at one level all track. Bring other things in around it.'],
      kit: {kick: 50, kd: .2, hat: 'techno', clap: 1, perc: '. . . x . . . . . . x . . . . .', duck: .6, rel: .35},
      fill: 'none', fill2: 'run', answers: [0, 0, 0, 0], breakMode: 'tease', sn: 'Glass FM bass',
      sound: sound({level: 0.75, osc: [{w: 'sine', oct: 0, det: 0, g: .8}, {w: 'sine', oct: 1, det: 4, g: .15}], fm: {ratio: 1, amt: 4, dec: .12}, cut: 2800, res: 1, env: .4, dec: .1, drive: .4, sub: .6, pluck: .4, width: .3, wowDepth: 1.2, hp: 45})},
    [['Three hits', "0' . . 0' | . . 0' . | 0' . . 3' | . 0' . .", "0' . . 0' | . . 0' . | 0' . . 3' | . 5' . 3'"],
     ['Machine funk', "0' . 0' . | . 3' . 0' | . . 5' . | 3' . 0' .", "0' . 0' . | . 3' . 0' | . . 5' . | 7' . 5' 3'"],
     ['Late figure', ". . 0' 0' | . . 3' . | . 0' . 0' | . . 5' 3'", ". . 0' 0' | . . 3' . | . 0' . 0' | 10' . 7' 5'"]]),
    S({id: 'dub', name: 'Dub techno depth', family: 'techno', genre: 'Dub techno', era: 'classic', year: '1993 → always', bpm: 124, key: 0,
      lane: 'Basic Channel, Deepchord, the dub techno lineage',
      idea: 'Two sub notes a bar and an echo that fills in the rest. The bassline is mostly the space after it.',
      why: ['So few notes that each one resets the room.', 'The delay tail does the syncopation, and it is different every time.', 'It sits under the kick, not between: a floor, not a rhythm.'],
      recipe: ['Sine or filtered triangle, soft attack, long release.', 'Send to a tape-style delay (dotted 8th, feedback 50%, high-passed) and a long reverb.', 'Low-pass the returns and let them drift.', 'Sidechain lightly. This lane wants overlap.'],
      kit: {kick: 46, kd: .3, hat: 'techno', clap: 0, perc: '. . . . . . x . . . . . . . . .', duck: .6, rel: .6},
      fill: 'none', fill2: 'none', breakMode: 'drone', evolve: .5, sn: 'Echo sub',
      sound: sound({level: 0.57, osc: [{w: 'triangle', oct: 0, det: 0, g: .6}, {w: 'sawtooth', oct: 1, det: 0, g: .1}], cut: 500, res: 3, env: .8, dec: .3, drive: .3, sub: 1, echo: .5, width: .4, atk: .01, rel: .08, wowDepth: 1.6, hp: 45})},
    [['Two a bar', ". . 0 - | - . . . | . . 0 - | . . . .", ". . 0 - | - . . . | . . 0 - | . . -2 -"],
     ['Echo answer', ". . . 0 | - - . . | . 0' . . | . . 0 -", ". . . 0 | - - . . | . 0' . . | . 3 - -"],
     ['Low tide', ". 0 - - | . . . . | . . . 0 | - . . .", ". 0 - - | . . . . | . . 7 - | . 5 - ."]]),
    S({id: 'minus', name: 'Minimal click', family: 'techno', genre: 'Minimal techno', era: 'classic', year: '2004–08', bpm: 127, key: 7, swing: .12,
      lane: 'Richie Hawtin, Ricardo Villalobos, the mnml years',
      idea: 'Tiny dry blips of sub with a pitch drop, placed where you least expect them. Mostly silence, perfectly timed.',
      why: ['Each note is a small event. Four of them in a bar feels busy.', 'Odd placements (the second and fourth 16th) make a simple kick sound funky.', 'So short that the swing is audible in the bass itself.'],
      recipe: ['Sine with a fast pitch envelope: +7 semitones, 30 ms.', 'Amp decay 80–120 ms, no sustain.', 'Bone dry. Maybe one note in eight gets a delay throw.', 'Mix it quieter than you think. It is felt.'],
      kit: {kick: 48, kd: .2, hat: 'shuffle', clap: 0, perc: '. x . . . . . x . . . x . . . .', duck: .6, rel: .35},
      fill: 'gap', fill2: 'octave', answers: [0, 0, 5, 0], breakMode: 'tease', sn: 'Sub blip',
      sound: sound({level: 0.60, osc: [{w: 'sine', oct: 0, det: 0, g: .8}, {w: 'triangle', oct: 1, det: 0, g: .1}], pitchEnv: {semi: 7, t: .03}, cut: 1100, res: 1, env: .5, dec: .08, drive: .3, sub: 1, pluck: .6, echo: .12, wowDepth: 1.2, hp: 40})},
    [['Blips', ". . 0' . | . . . 0' | . 12' . . | . . 0' .", ". . 0' . | . . . 0' | . 12' . . | . 0' . 10'"],
     ['Odd sixteenths', ". 0' . . | . . 0' . | . 0' . 0' | . . . 7'", ". 0' . . | . . 0' . | . 0' . 0' | . 12' . ."],
     ['Sparse', ". . . 0' | . 0' . . | . . 3' . | . 0' . .", ". . . 0' | . 0' . . | . . 5' . | . 3' 0' ."]]),
    S({id: 'hoover', name: 'Rave hoover', family: 'techno', genre: 'Rave / hardcore revival', era: 'classic', year: '1991 → revival', bpm: 145, key: 5, kickFree: false,
      lane: 'Joey Beltram, Human Resource, the rave revival',
      idea: 'A screaming detuned stack that swoops up into every note. It is a bassline, a lead and a siren at once.',
      why: ['The pitch swoop into each note is the hook. Everyone in the room makes the noise with their mouth.', 'Long notes over a fast kick: the contrast makes both feel bigger.', 'Two notes, a minor third apart. Menace does not need more.'],
      recipe: ['Three saws (one an octave down) heavily detuned, with PWM if you have it.', 'Pitch envelope: start an octave low, rise in 80 ms.', 'Chorus, then distortion. Low-pass fairly open.', 'Double with a plain sub so the swoop does not take the low end away.'],
      kit: {kick: 48, kd: .2, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .85, rel: .4, kdrive: .5},
      fill: 'slide', fill2: 'stutter', answers: [0, 3, 0, 5], breakMode: 'pad', sn: 'Hoover',
      sound: sound({level: 0.29, osc: [{w: 'sawtooth', oct: 1, det: -28, g: .35}, {w: 'sawtooth', oct: 1, det: 28, g: .35}, {w: 'sawtooth', oct: 0, det: 0, g: .3}, {w: 'square', oct: 1, det: 9, g: .15}], pitchEnv: {semi: -12, t: .08}, vowel: .25, word: ['o', 'a', 'e'], say: 'whoa', cut: 1400, res: 4, env: .8, dec: .3, drive: .8, sub: .8, width: .8, glide: .09, wowDepth: 1.8, hp: 70})},
    [['Swoop', "0w - - - | - - . . | 3w - - - | - - 0' 0'", "0w - - - | - - . . | 3w - - - | 5 - 3~ -"],
     ['Stab and swoop', "0 - - 0' | . 0' 3 - | 0 - - 0' | . 0' 5 -", "0 - - 0' | . 0' 3 - | 0w - - - | 7 - 5~ -"],
     ['Siren', "0w - - - | 3w - - - | 0w - - - | 3 - 5 -", "0w - - - | 3w - - - | 7w - - - | 5 - 3 -"]]),
    S({id: 'e808', name: 'Electro 808', family: 'techno', genre: 'Electro', era: 'classic', year: '1982 → revival', bpm: 132, key: 4, kickFree: false,
      lane: 'Drexciya, Dopplereffekt, the electro revival',
      idea: 'A long 808-style sub that slides between notes over a broken beat. Cold, funky, and from the future since 1982.',
      why: ['The kick is broken, so the bass holds the bar together with long notes.', 'Slides make a sine wave sound like it is speaking.', 'Leaving the second beat empty gives the snare the whole room.'],
      recipe: ['Sine with a short click, long decay, glide 80 ms. An 808 kick sample, tuned, also works.', 'Light saturation so it is audible on small speakers.', 'Mono, legato. Overlap notes to slide.', 'Program the kick first (1, the "and" of 2, the "and" of 3), then fit the bass around it.'],
      kit: {kick: 54, kd: .22, hat: 'techno', clap: 1, kicks: [0, 6, 10], perc: '. . . x . . . . . . . . . x . .', duck: .6, rel: .4},
      fill: 'slide', fill2: 'run', answers: [0, 0, 3, 0], breakMode: 'tease', sn: '808 glide',
      sound: sound({level: 0.40, osc: [{w: 'sine', oct: 0, det: 0, g: .8}, {w: 'triangle', oct: 1, det: 0, g: .1}], pitchEnv: {semi: 5, t: .03}, cut: 1000, res: 1, env: .5, dec: .12, drive: .5, sub: 1, glide: .08, rel: .04, wowDepth: 1.3, hp: 35})},
    [['Glide', "0 - - . | . . 0 - | . . 0 - | 3~ - 0~ -", "0 - - . | . . 0 - | . . 0 - | 7 - 5~ -"],
     ['Broken beat', "0 - . 0' | . . 0 - | - . 3 - | . . 0' .", "0 - . 0' | . . 0 - | - . 5 - | 3~ - 0' ."],
     ['Cold', ". . 0 - | - . 0' . | . . 0 - | - 12' . 10'", ". . 0 - | - . 0' . | . . 3 - | 5~ - 7~ -"]]),
    S({id: 'bleep', name: 'Bleep and bass', family: 'techno', genre: 'Bleep / UK techno', era: 'classic', year: '1990 → revival', bpm: 134, key: 5, kickFree: false,
      lane: 'LFO, Sweet Exorcist, today\'s UK techno',
      idea: 'A pure sine sub so low it is mostly felt, with a high bleep answering it. Sound-system music for a techno tempo.',
      why: ['The sub note is long and plain; the answer is short and high. Chest, then ears.', 'There is nothing in the middle, so the system sounds huge.', 'The answer changes; the sub does not. Stability below, play above.'],
      recipe: ['Sub: sine, no harmonics, soft attack. Check it on a system with real subs.', 'Bleep: sine or triangle two octaves up, short, with a little delay.', 'Keep both mono and dry.', 'Do not saturate the sub. This lane is about purity.'],
      kit: {kick: 50, kd: .2, hat: 'techno', clap: 1, perc: '. . . . . . x . . . . . . x . .', duck: .7, rel: .4},
      fill: 'octave', fill2: 'run', answers: [0, 3, 0, 7], breakMode: 'pad', sn: 'Pure sine',
      sound: sound({level: 0.45, osc: [{w: 'sine', oct: 0, det: 0, g: .8}, {w: 'sine', oct: 2, det: 0, g: .06}], cut: 2000, res: 1, env: .2, dec: .1, drive: .12, sub: 1, echo: .2, atk: .006, rel: .04, wowDepth: 1, hp: 30})},
    [['Chest and ears', "0 - - - | . . 12' . | 0 - - - | . 10' . 7'", "0 - - - | . . 12' . | 0 - - - | . 15' 12' ."],
     ['Double bleep', "0 - - . | . 12' . 12' | 0 - - . | . . 7' .", "0 - - . | . 12' . 12' | 3 - - . | . 10' . 12'"],
     ['System', ". . 0 - | - - . . | 12' . 0 - | - - . .", ". . 0 - | - - . . | 12' . 0 - | - 7' 10' 12'"]]),
    S({id: 'psy', name: 'Psy-techno roll', family: 'techno', genre: 'Psy techno / hard trance', era: 'now', year: '2024–26', bpm: 154, key: 4,
      lane: 'The psy-influenced end of hard techno and trance',
      idea: 'Kick and three: every 16th between the kicks, tight and identical, stepping up a semitone and back to wind the room up.',
      why: ['Three identical notes after every kick is the fastest-feeling groove there is at a given tempo.', 'The semitone step is all the melody it has. It creates tension without ever leaving the root.', 'The notes are so short the kick tail has room, which is what keeps it clean at 154 BPM.'],
      recipe: ['One saw (or two, barely detuned), low-pass 800 Hz, envelope 2 octaves, decay 50 ms.', 'Every note the same very short length and velocity.', 'A sine sub on the same MIDI, high-pass the saw at 100 Hz.', 'Sidechain hard and keep the kick tail short. If they overlap it turns to mud.'],
      kit: {kick: 50, kd: .16, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .95, rel: .25, kdrive: .5},
      fill: 'stutter', fill2: 'run', breakMode: 'drone', sn: 'Psy saw',
      sound: sound({level: 0.39, osc: [{w: 'sawtooth', oct: 0, det: -4, g: .5}, {w: 'sawtooth', oct: 0, det: 4, g: .4}], cut: 800, res: 5, env: 2, dec: .05, drive: .5, sub: .9, wowDepth: 1.5, hp: 70})},
    [['Chromatic roll', ". 0' 0' 0' | . 0' 0' 0' | . 1' 1' 1' | . 0' 0' 0'", ". 0' 0' 0' | . 0' 0' 0' | . 3' 3' 3' | . 1' 1' 1'"],
     ['Kick and three', ". 0' 0' 0' | . 0' 0' 0' | . 0' 0' 0' | . 0' 0' 0'", ". 0' 0' 0' | . 0' 0' 0' | . 0' 0' 0' | . 0' 12' 12'"],
     ['Step up', ". 0' 0' 0' | . 0' 0' 3' | . 0' 0' 0' | . 0' 1' 0'", ". 0' 0' 0' | . 0' 0' 3' | . 0' 0' 5' | . 3' 1' 0'"]]),

    // ------------------------------------------------------------- more techno
    S({id: 'warehouse', name: 'Warehouse roller', family: 'techno', genre: 'Berlin / warehouse techno', era: 'now', year: '2010 → 2026', bpm: 133, key: 4,
      lane: 'Ben Klock, Marcel Dettmann, the Berlin warehouse sound',
      idea: 'A low, dull, tom-like bass tucked in behind the kick, with the last 16th of the bar pushed hard into the next one.',
      why: ['It is felt as part of the kick drum, not as a bassline. The room just gets heavier.', 'The accent on the last 16th is a shove into the downbeat.', 'Dark and filtered, so the hats and the room reverb own the top.'],
      recipe: ['Saw or a pitched tom sample, low-pass at 200–250 Hz, some resonance.', 'Drive it, then low-pass again.', 'Short notes, velocity to volume. Accent the pickup.', 'A little of the kick reverb underneath, ducked hard.'],
      kit: {kick: 47, kd: .26, hat: 'techno', clap: 0, perc: '. . . . . . x . . . . . . . . .', duck: .9, rel: .4, kdrive: .4},
      fill: 'gap', fill2: 'stutter', breakMode: 'drone', evolve: .3, sn: 'Dull tom bass',
      sound: sound({level: 0.31, osc: [{w: 'sawtooth', oct: 0, det: 0, g: .5}, {w: 'sine', oct: 0, det: 0, g: .4}], cut: 230, res: 5, env: 1.2, dec: .08, drive: .7, sub: .9, rumble: .45, wowDepth: 1.5, hp: 35})},
    [['Push', ". . 0' 0 | . . 0' 0 | . . 0' 0 | . 0' 0' 0!", ". . 0' 0 | . . 0' 0 | . . 0' 0 | . 0! 0' 0!"],
     ['Concrete', ". 0 - 0' | . . 0' . | . 0 - 0' | . . 0' .", ". 0 - 0' | . . 0' . | . 0 - 0' | . 0' 0' 3'"],
     ['Late shift', ". . . 0! | . . 0' 0 | . . . 0! | . . 0' 0", ". . . 0! | . . 0' 0 | . . . 0! | . 0' 0' 0"]]),
    S({id: 'deept', name: 'Deep techno pulse', family: 'techno', genre: 'Deep / hypnotic techno', era: 'now', year: '2015 → 2026', bpm: 130, key: 2, evolve: .9,
      lane: 'Donato Dozzy, Wata Igarashi, Mike Parker',
      idea: 'A soft sub pulse at odd spacings, with an echo answering it and a filter that takes the whole phrase to open.',
      why: ['The notes are few and unevenly spaced, so the loop never quite resolves.', 'The echo fills the gaps differently each bar.', 'Change happens over minutes. That is what makes it a trip.'],
      recipe: ['Triangle or filtered saw, soft attack, low-pass 350 Hz with resonance.', 'Dotted-8th delay, feedback 40%, high-passed.', 'A very slow LFO or a hand on the cutoff across 16 bars.', 'Keep the sub plain and mono under it.'],
      kit: {kick: 46, kd: .24, hat: 'techno', clap: 0, perc: '. . . x . . . . . x . . . . . .', duck: .7, rel: .45},
      fill: 'none', fill2: 'none', breakMode: 'drone', sn: 'Soft echo pulse',
      sound: sound({level: 0.49, osc: [{w: 'triangle', oct: 0, det: 0, g: .6}, {w: 'sawtooth', oct: 0, det: 5, g: .15}], cut: 350, res: 7, env: .9, dec: .15, drive: .3, sub: .9, echo: .35, width: .35, atk: .006, rel: .04, wowDepth: 1.8, hp: 50})},
    [['Tide', ". . 0 . | . 0' . . | . . 0 . | . . . 0'", ". . 0 . | . 0' . . | . . 0 . | . 0' . 0'"],
     ['Drift', ". 0' . . | . . 0' . | . . . 0' | . . 0' .", ". 0' . . | . . 0' . | . 0' . . | . . 0' 0'"],
     ['Undertow', ". 0 - - | . . 0' . | . 0 - - | . . . 3'", ". 0 - - | . . 0' . | . 0 - - | . 0' . -2'"]]),
    S({id: 'broken', name: 'Broken techno', family: 'techno', genre: 'Broken / UK techno', era: 'now', year: '2018 → 2026', bpm: 136, key: 5, kickFree: false,
      lane: 'Batu, Pangaea, the Bristol end of techno',
      idea: 'No four-on-the-floor. The kick lurches, and a heavy sub leans on it and then away from it.',
      why: ['With the kick off the grid, the bass decides where "one" is.', 'Long sub notes against a stumbling kick feel like weight being thrown around.', 'Half the bar is empty. Sound-system pressure needs room.'],
      recipe: ['Sine sub with a square or FM layer for growl, mono.', 'Low-pass 400 Hz, drive for harmonics.', 'Glide 60 ms on overlaps.', 'Write the kick first: 1, the "a" of 2, the "and" of 3. Then place the sub in the holes.'],
      kit: {kick: 52, kd: .22, hat: 'techno', clap: 1, kicks: [0, 7, 10], perc: '. . . x . . . . . . . . . x . .', duck: .7, rel: .4, kdrive: .3},
      fill: 'slide', fill2: 'gap', answers: [0, 0, 3, 0], breakMode: 'drone', sn: 'Growl sub',
      sound: sound({level: 0.31, osc: [{w: 'sine', oct: 0, det: 0, g: .6}, {w: 'square', oct: 0, det: 0, g: .25}], cut: 400, res: 3, env: 1, dec: .15, drive: .65, sub: 1, glide: .06, rel: .03, wowDepth: 1.6, hp: 35})},
    [['Lurch', "0 - - . | . . . 0 | - . 0' . | . . 3 -", "0 - - . | . . . 0 | - . 0' . | 7' . 5 -"],
     ['Half step', "0 - - - | . . . . | . . 0 - | . 0' . .", "0 - - - | . . . . | . . 0 - | 3~ - 0' ."],
     ['Stagger', ". . 0' . | . 0 - 0' | . . 0 - | . . 0' 0'", ". . 0' . | . 0 - 0' | . . 0 - | . 12' 10' ."]]),
    S({id: 'reverse', name: 'Reverse bass', family: 'techno', genre: 'Hard techno / hardstyle crossover', era: 'now', year: '2023–26', bpm: 155, key: 5,
      lane: 'The hardstyle-leaning end of hard techno',
      idea: 'A distorted bass that swells up after every kick and is cut off by the next one. The groove is the suck and the slam.',
      why: ['Each note fades in, so the bar breathes in before every kick.', 'It fills the entire gap between kicks. Nothing is louder at 155 BPM.', 'One pitch for a long time, then a single root move that feels huge.'],
      recipe: ['Saw and square, hard distortion, low-pass around 1.2 kHz.', 'Slow attack (60–80 ms) or a volume shape that ramps up between kicks.', 'Or the classic way: reverse a distorted kick tail and place it after each kick.', 'Kick and bass on one bus, clipped together.'],
      kit: {kick: 48, kd: .2, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .98, rel: .3, kdrive: .9},
      fill: 'stutter', fill2: 'gap', breakMode: 'drone', sn: 'Reverse swell',
      sound: sound({level: 0.41, osc: [{w: 'sawtooth', oct: 0, det: -8, g: .5}, {w: 'square', oct: 0, det: 8, g: .4}], cut: 1200, res: 2, env: .3, dec: .2, drive: 1, sub: 1, atk: .09, wowDepth: 1.4, hp: 40})},
    [['Suck', ". 0 - - | . 0 - - | . 0 - - | . 0 - -", ". 0 - - | . 0 - - | . 0 - - | . 0 - 3'"],
     ['Swell and stab', ". 0 - - | . 0 - 0' | . 0 - - | . 0 - 0'", ". 0 - - | . 0 - 0' | . 3 - - | . 0 - 12'"],
     ['Melodic reverse', ". 0 - - | . 0 - - | . 3 - - | . 5 - -", ". 0 - - | . 0 - - | . 7 - - | . 5 - 3'"]]),
    S({id: 'acidcore', name: 'Hard acid', family: 'techno', genre: 'Acid techno / acidcore', era: 'now', year: '1995 → 2026', bpm: 150, key: 9,
      lane: 'The London acid techno lineage and today\'s acidcore',
      idea: 'A 303 at full speed and full distortion, squeezed into the gaps between kicks. Less melody, more squeal.',
      why: ['At 150 BPM the slides blur into a scream. That is the hook.', 'Accents on the offbeat make the filter bark against the kick.', 'It stays out of the kick\'s way, so both can be distorted to the limit.'],
      recipe: ['Square (or saw) 303, resonance near the top, envelope amount high.', 'Distortion after the filter, a lot of it.', 'Glide 50 ms. Accent raises volume and envelope together.', 'Sweep the cutoff by hand over 16 bars. That sweep is the track.'],
      kit: {kick: 48, kd: .2, hat: 'hard', clap: 1, perc: '. . . . . . . . . . . . . . . .', duck: .85, rel: .3, kdrive: .7},
      fill: 'slide', fill2: 'stutter', answers: [0, 3, 0, 5], breakMode: 'tease', evolve: .6, sn: 'Screaming 303',
      sound: sound({level: 0.29, osc: [{w: 'square', oct: 0, det: 0, g: .65}], cut: 380, res: 17, env: 3.4, dec: .1, drive: .95, sub: .5, glide: .05, echo: .12, wowDepth: 3, hp: 60})},
    [['Rinse', ". 0' 12 0~ | . 0' 0! 3' | . 0' 10 12~ | . 7! 0' 12'", ". 0' 12 0~ | . 0' 0! 3' | . 0' 15 12~ | . 10' 7! 0'"],
     ['Stutter acid', ". 0! 0' 0' | . 0! 0' 0' | . 3! 0' 0' | . 0! 12 0~", ". 0! 0' 0' | . 0! 0' 0' | . 5! 0' 0' | . 3! 12 10~"],
     ['Ladder', ". 0' 3' 0' | . 5' 0' 7' | . 0' 10' 0' | . 12 10~ 7~", ". 0' 3' 0' | . 5' 0' 7' | . 0' 10' 0' | . 15 12~ 0~"]]),
    S({id: 'arp', name: 'Melodic techno arp', family: 'techno', genre: 'Melodic techno', era: 'now', year: '2019 → 2026', bpm: 125, key: 9,
      lane: 'ARTBAT, Stephan Bodzin, Innellea',
      idea: 'The bass is an arpeggio: root, fifth, octave in the gaps, following four chords. Low enough to be the bass, busy enough to be the riff.',
      why: ['One part does two jobs, which leaves the whole mix for a big lead and a vocal.', 'It climbs after every kick, so the bar keeps lifting.', 'The chord change every two bars moves the whole pattern, not just a root note.'],
      recipe: ['Saw with a resonant low-pass, envelope 2 octaves, decay 100 ms. Analog-style, slightly detuned.', 'Open the filter and lengthen the decay through the build.', 'Dotted-8th delay on the top, mono sub underneath on the root only.', 'Sidechain so the first note after each kick swells.'],
      kit: {kick: 47, kd: .28, hat: 'techno', clap: 1, perc: '. . . . . . . . . . . . . . x .', duck: .9, rel: .55},
      prog: [0, -4, 3, -2], breakProg: [0, -4, 3, -2], fill: 'run', fill2: 'octave', breakMode: 'pad', sn: 'Analog arp',
      sound: sound({level: 0.41, osc: [{w: 'sawtooth', oct: 0, det: -7, g: .5}, {w: 'sawtooth', oct: 0, det: 7, g: .35}], cut: 600, res: 8, env: 2, dec: .1, drive: .45, sub: .8, echo: .28, width: .4, hp: 75})},
    [['Climb', ". 0' 7' 12' | . 0' 7' 15' | . 0' 7' 12' | . 0' 10' 7'", ". 0' 7' 12' | . 0' 7' 15' | . 0' 7' 12' | . 15' 12' 10'"],
     ['Pulse arp', ". . 0 12' | . 7' 0 . | . . 0 12' | . 7' 3 .", ". . 0 12' | . 7' 0 . | . . 0 15' | . 12' 10 7'"],
     ['Saw tide', ". 0 - 7' | . 0 - 12' | . 0 - 7' | . 0 - 10'", ". 0 - 7' | . 0 - 12' | . 0 - 15' | . 12' 10' 7'"]]),
    S({id: 'romin', name: 'Rominimal roller', family: 'techno', genre: 'Romanian minimal', era: 'now', year: '2012 → 2026', bpm: 127, key: 0, swing: .14,
      lane: 'Raresh, Rhadoo, Petre Inspirescu',
      idea: 'A round, quiet sub that rolls and never repeats quite the same way, full of ghost notes and small slides. Made for eight-hour sets.',
      why: ['Ghost notes keep it moving without ever getting loud.', 'It is swung hard, so it walks instead of marching.', 'Nothing in it demands attention. You notice it when it stops.'],
      recipe: ['Sine or triangle, soft pluck, mono, glide 80 ms.', 'Low-pass 700 Hz, barely any envelope.', 'Velocity does the work: half the notes at a third of the level.', 'Mix it low and long. No distortion.'],
      kit: {kick: 49, kd: .2, hat: 'shuffle', clap: 0, perc: '. x . . . . . x . . x . . . . x', duck: .6, rel: .4},
      fill: 'none', fill2: 'run', answers: [0, 0, 3, 0], breakMode: 'tease', sn: 'Round roller',
      sound: sound({level: 0.57, osc: [{w: 'sine', oct: 0, det: 0, g: .7}, {w: 'triangle', oct: 1, det: 0, g: .12}], cut: 700, res: 2, env: .8, dec: .09, drive: .2, sub: 1, glide: .08, pluck: .3, wowDepth: 1.3, hp: 40})},
    [['Endless', ". 0' 0 . | . 0g 0' 3' | . 0' 0 . | . 0g 0' .", ". 0' 0 . | . 0g 0' 3' | . 0' 0 . | . 5' 3 0g"],
     ['Liquid', ". . 0 3~ | - . 0' . | . 0g 0 . | . 7' . 5'", ". . 0 3~ | - . 0' . | . 0g 0 . | . 10' 7 5~"],
     ['After hours', ". 0g 0' . | . . 0 - | . 0g 0' . | . 0' . 12'", ". 0g 0' . | . . 0 - | . 0g 0' . | . 10' 7' ."]]),
    S({id: 'tribal', name: 'Tribal techno toms', family: 'techno', genre: 'Tribal techno', era: 'classic', year: '2000 → revival', bpm: 134, key: 7, swing: .06, kickFree: false,
      lane: 'Ben Sims, Cristian Varela, the tribal revival',
      idea: 'The bassline is a set of tuned toms: low on the beat, high in the gaps, like a drummer who never stops.',
      why: ['Two or three pitches played as drums give melody and rhythm in one part.', 'It doubles the kick on the one, then talks back.', 'Loops of this run for minutes while percussion comes and goes over the top.'],
      recipe: ['Sine with a pitch envelope (+7 semitones, 50 ms), or real tom samples tuned to the key.', 'Saturate. Short decay, no sustain.', 'Pan the higher toms slightly; keep the low one mono.', 'Bus with the percussion and compress together.'],
      kit: {kick: 50, kd: .2, hat: 'techno', clap: 0, perc: 'x . x . . x . x . . x . x . . x', duck: .55, rel: .3, kdrive: .3},
      fill: 'run', fill2: 'stutter', breakMode: 'tease', sn: 'Tuned toms',
      sound: sound({level: 0.62, osc: [{w: 'sine', oct: 0, det: 0, g: .75}, {w: 'triangle', oct: 1, det: 0, g: .2}], pitchEnv: {semi: 7, t: .05}, cut: 900, res: 2, env: .8, dec: .09, drive: .55, sub: .8, pluck: .55, wowDepth: 1.3, hp: 45})},
    [['Drum circle', "0' . . 0' | . 0' 7' . | 0' . . 0' | . 5' . 3'", "0' . . 0' | . 0' 7' . | 0' . 5' 0' | . 7' 5' 3'"],
     ['Low tom, high tom', ". 0' . 0' | 7' . 0' . | . 0' . 0' | 7' . 5' .", ". 0' . 0' | 7' . 0' . | . 0' 12' 0' | 7' . 5' 3'"],
     ['Talking drum', ". . 0' 0' | . 3' . 0' | . . 0' 0' | . 5 3~ .", ". . 0' 0' | . 3' . 0' | . 7' 0' 0' | . 5 3~ 0'"]]),
    S({id: 'ghetto', name: 'Ghetto tech 808', family: 'techno', genre: 'Ghetto house / ghetto tech', era: 'classic', year: '1996 → revival', bpm: 150, key: 2, kickFree: false,
      lane: 'DJ Assault, DJ Deeon, the Dance Mania lineage',
      idea: 'A booming 808 that jacks with the kick, raw and fast. Three sounds and a chant.',
      why: ['The 808 lands with the kick and rings past it, so every downbeat is twice as big.', 'Short jabs between the booms are the jack.', 'It is deliberately crude. Polish would ruin it.'],
      recipe: ['808 kick sample with a long tail, tuned, or a sine with a pitch drop.', 'Overdrive it into the mixer.', 'Short notes choke the long ones (mono).', 'Claps on every beat or 2 and 4, and nothing else in the low end.'],
      kit: {kick: 54, kd: .16, hat: 'hard', clap: 1, perc: '. . x . . . x . . . x . . . x .', duck: .5, rel: .3, kdrive: .5},
      fill: 'stutter', fill2: 'run', breakMode: 'tease', sn: 'Booming 808',
      sound: sound({level: 0.49, osc: [{w: 'sine', oct: 0, det: 0, g: .85}], pitchEnv: {semi: 9, t: .04}, cut: 800, res: 1, env: .4, dec: .1, drive: .8, sub: 1, rel: .04, wowDepth: 1.2, hp: 30})},
    [['Boom', "0 - - . | . . 0' . | 0 - . 0' | . . 0' .", "0 - - . | . . 0' . | 0 - . 0' | . 3' 0' ."],
     ['Jack', "0' . 0' . | . 0' . 0' | 0' . 0' . | . 0' 0' .", "0' . 0' . | . 0' . 0' | 0' . 0' . | 3' 0' . 0'"],
     ['Juke step', "0 - . 0' | . . 0 - | . 0' . . | 0' . 0' 0'", "0 - . 0' | . . 0 - | . 0' . . | 5' 3' 0' ."]]),
    S({id: 'tekno', name: 'Tekno kick-bass', family: 'techno', genre: 'Freetekno / tribe', era: 'classic', year: '1994 → always', bpm: 168, key: 4,
      lane: 'Spiral Tribe and the free party sound',
      idea: 'Kick, bass, kick, bass at 168. A short distorted note on every offbeat, built to be heard across a field.',
      why: ['At this tempo the offbeat is all the groove anyone needs.', 'The note is short and hard, so the kick keeps its punch.', 'A single root move every few bars is the whole arrangement.'],
      recipe: ['Square or saw into distortion, low-pass around 1 kHz.', 'Very short decay. No release tail.', 'Often it is simply a second, pitched kick on the offbeat.', 'Everything through one overdriven bus.'],
      kit: {kick: 52, kd: .15, hat: 'hard', clap: 0, perc: '. . . . . . . . . . . . . . . .', duck: .9, rel: .25, kdrive: .9},
      fill: 'stutter', fill2: 'run', breakMode: 'drone', sn: 'Field square',
      sound: sound({level: 0.45, osc: [{w: 'square', oct: 0, det: -5, g: .5}, {w: 'sawtooth', oct: 0, det: 5, g: .3}], pitchEnv: {semi: 5, t: .025}, cut: 1000, res: 3, env: 1.2, dec: .07, drive: 1, sub: .9, pluck: .4, wowDepth: 1.4, hp: 45})},
    [['Tribe', ". . 0 . | . . 0 . | . . 0 . | . . 0 0'", ". . 0 . | . . 0 . | . . 3 . | . . 0 0'"],
     ['Mental', ". 0' 0 . | . 0' 0 . | . 0' 0 . | . 0' 0 12'", ". 0' 0 . | . 0' 0 . | . 0' 3 . | . 0' 0 10'"],
     ['Sound system', ". . 0 0' | . . 0 . | . . 0 0' | . . 3 .", ". . 0 0' | . . 0 . | . . 5 3' | . . 0 12'"]]),
  ];
  // Names for the sixteen original voices, and a little space where it helps.
  const VOICE = {tech: ['Talking rubber', {width: .25}], stab: ['Bwomp', {}], minimal: ['Round pluck', {}], warp: ['Warp reese', {width: .5}], afro: ['Warm sub', {}], melodic: ['Wide saws', {width: .4}],
    organ: ['Organ', {width: .2}], disco: ['Finger pluck', {}], rumble: ['Kick rumble', {}], hypnotic: ['Resonant tick', {echo: .22}], groove: ['Tuned tom', {}], hard: ['Clipped saw', {}],
    trance: ['Trance saws', {width: .4}], donk: ['Donk', {}], acid: ['303', {echo: .18}], giant: ['Giant reese', {width: .6}]};
  for (const st of STYLES) { if (VOICE[st.id]) { st.sn = VOICE[st.id][0]; Object.assign(st.sound, VOICE[st.id][1]); } st.sound.id = st.id; st.sound.name = st.sn; }
  const styleById = id => STYLES.find(s => s.id === id) || STYLES[0];
  // Options: any lane can borrow another lane's voice, chord movement, break and fill.
  const MOVES = {auto: null, root: [0, 0, 0, 0], 'i-VII': [0, 0, -2, -2], 'i-iv': [0, 0, 5, 5], 'i-VI-VII': [0, 0, -4, -2], 'i-VI-III-VII': [0, -4, 3, -2], 'i-III-VI-VII': [0, 3, -4, -2]};
  const MOVE_NAMES = {auto: 'Lane default', root: 'Stay on the root', 'i-VII': 'i – ♭VII', 'i-iv': 'i – iv', 'i-VI-VII': 'i – i – ♭VI – ♭VII', 'i-VI-III-VII': 'i – ♭VI – ♭III – ♭VII', 'i-III-VI-VII': 'i – ♭III – ♭VI – ♭VII'};
  const BREAKS = {auto: 'Lane default', tease: 'Tease: top layer, no sub', pad: 'Pad: long notes on the chords', drone: 'Drone: one held root'};
  const FILL_NAMES = {auto: 'Lane default', gap: 'Gap', octave: 'Octave pops', run: 'Run up', stutter: 'Stutter', slide: 'Slide down', none: 'No fills'};
  // Velocity by 16th position in the beat: [on the beat, e, and, a].
  const ACCENTS = {auto: null, offbeat: {name: 'Offbeat push', v: [.7, .62, 1, .66]}, roll: {name: 'Rolling: beat, and, fillers', v: [1, .64, .84, .64]}, back: {name: 'Late push: the last 16th leads', v: [.72, .66, .8, 1]}, flat: {name: 'Flat: every note the same', v: [.8, .8, .8, .8]}};
  const ACCENT_NAMES = {auto: 'As written', ...Object.fromEntries(Object.entries(ACCENTS).filter(([, v]) => v).map(([k, v]) => [k, v.name]))};
  const soundById = id => SOUNDS.find(x => x.id === id);
  function withOptions(style, o = {}, idea) {
    const out = {...style}, key = [];
    if (o.sound && o.sound !== style.id && soundById(o.sound)) { out.sound = soundById(o.sound); key.push('s' + o.sound); }
    if (ACCENTS[o.accent]) { out.accent = o.accent; key.push('a' + o.accent); }
    // A loop you wrote may land on the kick on purpose; then the lane stops dodging it.
    if (idea && style.kickFree && idea.notes.some(n => n.s % 4 === 0)) { out.kickFree = false; key.push('onkick'); }
    if (MOVES[o.move]) { out.prog = MOVES[o.move]; out.breakProg = o.move === 'root' ? [0, 0, -4, -2] : MOVES[o.move]; key.push(o.move); }
    if (o.brk && o.brk !== 'auto' && BREAKS[o.brk]) { out.breakMode = o.brk; key.push(o.brk); }
    if (o.fill && o.fill !== 'auto' && FILL_NAMES[o.fill]) { out.fill = o.fill; if (o.fill === 'none') out.fill2 = 'none'; else if (out.fill2 === o.fill) out.fill2 = o.fill === 'run' ? 'octave' : 'run'; key.push('f' + o.fill); }
    out.vkey = key.join(','); out.rigKey = style.id + '/' + out.sound.id;
    return out;
  }

  // ------------------------------------------------------- more ideas, voices and the bank
  const addIdeas = (id, ideas) => styleById(id).ideas.push(...ideas.map(([name, a, b]) => ({name, text: a + ' | ' + b, notes: parse(a + ' ' + b)})));
  addIdeas('tech', [['Rolling three', ". 0' 0 0' | . 0' 0 0' | . 0' 0 0' | . 0' 3 0'", ". 0' 0 0' | . 0' 0 0' | . 0' 0 0' | . 7' 5 3'"],
    ['Stab and sustain', ". 0w - - | - - 0' . | . . 0' . | . 0' 0 .", ". 0w - - | - - 0' . | . . 0' . | . 12' 10 ."],
    ['Ghost roller', ". 0g 0 . | . 0g 0 0g | . 0g 0 . | . 0g 3w -", ". 0g 0 . | . 0g 0 0g | . 0g 0 . | . 0g 12w -"]]);
  addIdeas('stab', [['Call, silence', ". . 0! - | - . . . | . . . . | . 0g 0! -", ". . 0! - | - . . . | . . . 0g | . 3w - -"]]);
  addIdeas('minimal', [['Three note roll', ". 0' 0 3' | . 0' 0 . | . 0' 0 3' | . 0' 5 .", ". 0' 0 3' | . 0' 0 . | . 0' 0 3' | . 7' 5 3'"],
    ['Ghost bounce', ". 0g 0' . | . 0' 0g 12' | . 0g 0' . | . 0 10~ -", ". 0g 0' . | . 0' 0g 12' | . 0g 0' 3' | . 0 -2~ -"]]);
  addIdeas('warp', [['Ghost skip', ". 0g 0w - | - . 0' 0g | . 0g 3w - | - . 0' .", ". 0g 0w - | - . 0' 0g | . 0g 7w - | - 5~ 3~ -"]]);
  addIdeas('afro', [['Sub drop', "12 0~ - - | . . 0 - | . . 0 - | . 0 . 3", "0 - - . | . . 0 - | . . 0 - | . 7 - 5~"]]);
  addIdeas('melodic', [['Sustain and answer', ". 0 - - | - - 0' . | . 0 - - | - . 0' 12'", ". 0 - - | - - 0' . | . 0 - - | . 7' 5' 3'"]]);
  addIdeas('rumble', [['Ghost gallop', ". 0g 0 0' | . 0g 0 0' | . 0g 0 0' | . 0g 0 0'", ". 0g 0 0' | . 0g 0 0' | . 0g 0 0' | . 0! 0 0!"]]);
  addIdeas('groove', [['Ghost funk', "0' 0g 0' . | 0g 0' . 0' | 0' 0g 0' . | 0g 3' 0' .", "0' 0g 0' . | 0g 0' . 0' | 0' 0g 0' . | 0g 5' 3' 0'"]]);
  addIdeas('hard', [['Double slam', ". . 0! 0' | . . 0! 0' | . . 0! 0' | . . 0! 0!", ". . 0! 0' | . . 0! 0' | . . 0! 0' | . 0' 0! 0!"]]);
  addIdeas('trance', [['Low high', ". . 0 12' | . . 0 12' | . . 0 12' | . . 0 10'", ". . 0 12' | . . 0 12' | . . 0 12' | . 7' 0 12'"]]);
  addIdeas('donk', [['Double offbeat', ". . 0' 0' | . . 0' 0' | . . 0' 0' | . . 0' 0'", ". . 0' 0' | . . 0' 0' | . . 0' 0' | . . 12' 0'"]]);

  // Voices that belong to no lane. Any lane can borrow them.
  const X = (id, name, o) => ({...sound({level: .5, ...o}), id, name, extra: true});
  const SOUNDS = [...STYLES.map(s => s.sound),
    X('x-reese', 'Wide reese', {level: 0.30, osc: [{w: 'sawtooth', oct: 0, det: -30, g: .4}, {w: 'sawtooth', oct: 0, det: 30, g: .4}, {w: 'sawtooth', oct: 1, det: 7, g: .15}], cut: 520, res: 4, env: .8, dec: .5, drive: .6, sub: .9, width: .8, glide: .08, wowDepth: 2.4, hp: 85}),
    X('x-growl', 'FM growl', {level: 0.45, osc: [{w: 'sawtooth', oct: 0, det: 0, g: .6}, {w: 'square', oct: 0, det: 6, g: .2}], fm: {ratio: 1, amt: 5, dec: .25}, vowel: .35, word: ['a', 'e', 'a'], say: 'yeah', cut: 900, res: 5, env: 1.5, dec: .2, drive: .8, sub: .8, wowDepth: 2.2, hp: 90}),
    X('x-yoy', 'Yoy talker', {level: 0.42, osc: [{w: 'sawtooth', oct: 0, det: -6, g: .5}, {w: 'square', oct: 0, det: 6, g: .3}], vowel: .75, rest: 'u', word: ['i', 'o', 'i'], say: 'yoy', cut: 800, res: 5, env: 1.2, dec: .12, drive: .6, sub: .8, width: .2, hp: 95}),
    X('x-wub', 'Sixteenth wobble', {level: 0.34, osc: [{w: 'sawtooth', oct: 0, det: -12, g: .45}, {w: 'sawtooth', oct: 0, det: 12, g: .45}], lfo: {rate: 1, depth: 1.8}, cut: 350, res: 8, env: 1, dec: .15, drive: .6, sub: .85, wowDepth: 2.6, hp: 85}),
    X('x-square', 'Square sub', {level: 0.35, osc: [{w: 'square', oct: 0, det: 0, g: .5}], cut: 300, res: 1, env: .6, dec: .15, drive: .3, sub: .9, glide: .08, wowDepth: 1.8, hp: 40}),
    X('x-hollow', 'Hollow organ square', {level: 0.40, osc: [{w: 'square', oct: 0, det: 0, g: .45}, {w: 'square', oct: 1, det: 7, g: .2}], cut: 1100, res: 3, env: 1.2, dec: .12, drive: .35, sub: .7, pluck: .25, width: .2, wowDepth: 1.6, hp: 60}),
    X('x-pluck', 'Short pluck', {level: 0.50, osc: [{w: 'sawtooth', oct: 0, det: 0, g: .6}], cut: 500, res: 4, env: 3, dec: .05, drive: .4, sub: .7, pluck: .7, hp: 70}),
    X('x-tape', 'Tape sub', {level: 0.42, osc: [{w: 'sine', oct: 0, det: 0, g: .7}, {w: 'triangle', oct: 0, det: 0, g: .3}], cut: 700, res: 1, env: .2, dec: .2, drive: .9, sub: .8, atk: .008, rel: .04, glide: .07, wowDepth: 1.3, hp: 35}),
    X('x-metal', 'Metal knock', {level: 0.47, osc: [{w: 'sine', oct: 1, det: 0, g: .8}], fm: {ratio: 1.41, amt: 4, dec: .08}, cut: 3000, res: 1, env: .3, dec: .1, drive: .5, sub: .7, pluck: .5, wowDepth: 1, hp: 60}),
    X('x-stack', 'Bright saw stack', {level: 0.35, osc: [{w: 'sawtooth', oct: 1, det: -12, g: .35}, {w: 'sawtooth', oct: 1, det: 12, g: .35}, {w: 'sawtooth', oct: 0, det: 0, g: .3}], cut: 1800, res: 3, env: 1, dec: .15, drive: .5, sub: .8, width: .7, wowDepth: 1.8, hp: 80}),
    X('x-rubber', 'Rubber band', {level: 0.49, osc: [{w: 'triangle', oct: 0, det: 0, g: .7}, {w: 'sawtooth', oct: 0, det: 4, g: .2}], pitchEnv: {semi: 12, t: .03}, cut: 800, res: 6, env: 1.8, dec: .1, drive: .45, sub: .85, glide: .12, pluck: .3, wowDepth: 2, hp: 60}),
    X('x-drop', 'Sub drop', {level: 0.45, osc: [{w: 'sine', oct: 0, det: 0, g: .8}], pitchEnv: {semi: 12, t: .18}, cut: 600, res: 1, env: .3, dec: .2, drive: .5, sub: 1, rel: .05, wowDepth: 1.2, hp: 30}),
    X('x-acidsq', 'Square acid', {level: 0.30, osc: [{w: 'square', oct: 0, det: 0, g: .6}], cut: 300, res: 16, env: 3, dec: .18, drive: .65, sub: .4, glide: .07, echo: .18, wowDepth: 3, hp: 60}),
  ];

  // The pattern bank: the rhythms that producers and tutorials keep coming back to.
  // Written on the root (and its octave, fifth and ♭3) so any lane can take them.
  const B = (id, name, a, b, why, home) => ({id, name, text: a + ' | ' + b, notes: parse(a + ' ' + b), why, home});
  const BANK = [
    B('offbeat', 'Offbeat', ". . 0 . | . . 0 . | . . 0 . | . . 0 .", ". . 0 . | . . 0 . | . . 0 . | . . 0 0'", 'Kick, bass, kick, bass. The bass answers every kick, so the two never meet.', 'Everywhere'),
    B('double', 'Double offbeat', ". . 0' 0' | . . 0' 0' | . . 0' 0' | . . 0' 0'", ". . 0' 0' | . . 0' 0' | . . 0' 0' | . 0' 0' 0'", 'The offbeat at twice the density: more forward motion at the same tempo.', 'Hard house, bounce, trance'),
    B('offoct', 'Offbeat, octave and ghost', ". . 12 . | . 0g 0 . | . . 0 . | . 0g 0 .", ". . 12 . | . 0g 0 . | . . 0 . | . 0g 0 12'", 'The first hit of the bar is an octave up, and a quiet note fills between the hits.', 'Tech house'),
    B('eighths', 'Rolling eighths', "0' . 0' . | 0' . 0' . | 0' . 0' . | 0' . 0' .", "0' . 0' . | 0' . 0' . | 0' . 0' . | 0' . 0' 0'", 'Eight even hits a bar on one note. All the character comes from the sound and the sidechain.', 'Tech house, electro house'),
    B('roll', 'Rolling 16ths', ". 0' 0 0' | . 0' 0 0' | . 0' 0 0' | . 0' 0 0'", ". 0' 0 0' | . 0' 0 0' | . 0' 0 0' | . 0' 0 3'", 'Three notes between every kick, with the offbeat one longest and loudest.', 'Tech house, techno, trance'),
    B('full', 'Kick and three', ". 0' 0' 0' | . 0' 0' 0' | . 0' 0' 0' | . 0' 0' 0'", ". 0' 0' 0' | . 0' 0' 0' | . 0' 0' 0' | . 0' 12' 0'", 'Every 16th that is not a kick, all the same length. A machine gallop.', 'Trance, psy, peak time'),
    B('sustain', 'Stab and sustain', "0 - - - | - - . . | . . 0' . | . 0' 0' .", "0 - - - | - - . . | . . 0' . | . 12' 0' .", 'A long note on the one is the call; a short rhythm is the response.', 'Tech house, melodic'),
    B('legato', 'Gliding legato', ". . 0 - | 3~ - 0~ - | . . 0 - | 7~ - 5~ -", ". . 0 - | 3~ - 0~ - | . . 0 - | 12~ - 0~ -", 'Overlapping notes slide into each other, so a simple line sounds like a voice.', 'Deep tech, UKG, electro'),
    B('tresillo', 'Tresillo 3-3-2', "0 - . 0 | - . 0 - | 0 - . 0 | - . 0 -", "0 - . 0 | - . 0 - | 0 - . 0 | - . 7 5~", 'Three, three, two: the oldest syncopation in dance music, laid across the four-on-the-floor.', 'Afro house, Latin, reggaeton-leaning house'),
    B('tumbao', 'Tumbao', ". . . 0 | - . 7 - | . . . 0 | - . 7 -", ". . . 0 | - . 7 - | . . . 5 | - . 7 -", 'Every note arrives a 16th early and rings over the beat. The bar leans forward.', 'Latin tech'),
    B('octaves', 'Octave eighths', "0' . 12' . | 0' . 12' . | 0' . 12' . | 0' . 12' .", "0' . 12' . | 0' . 12' . | 0' . 12' . | 0' 10' 12' .", 'Low on the beat, high on the offbeat. The high notes lift the whole drop.', 'Disco, hard house, trance'),
    B('pop', 'Offbeat octave pop', ". . 0' . | . . 12' . | . . 0' . | . . 12' .", ". . 0' . | . . 12' . | . . 0' . | . 12' 10' .", 'The octave on alternate offbeats: a bounce without touching the kick.', 'Tech house, future house'),
    B('qa', 'Question and answer', ". . 0 . | . . 0 0' | . . 0 . | . 3 - .", ". . 0 . | . . 0 0' | . . 0 . | . 7 5~ -", 'Bar two repeats bar one and changes only the last beat.', 'Everywhere'),
    B('ghosts', 'Ghost pickups', ". 0g 0 . | . 0g 0 . | . 0g 0 . | . 0g 0 0g", ". 0g 0 . | . 0g 0 . | . 0g 0 . | 0g 0g 0 .", 'Quiet, short notes just before the main hits. Felt more than heard.', 'Tech house, minimal'),
    B('pedal', 'Pedal and ping', ". 0 - 0' | . 0 - 0' | . 0 - 12' | . 0 - 0'", ". 0 - 0' | . 0 - 10' | . 0 - 0' | . 0 - 12'", 'A low note that never moves and a high one that does.', 'Hypnotic techno, bleep'),
    B('push', 'Push into the one', ". . 0 . | . . 0 . | . . 0 . | . . 0 0", ". . 0 . | . . 0 . | . . 0 . | . 0' 0 0", 'The last 16th of the bar leads into the downbeat and pulls the loop round.', 'House, techno'),
    B('three', 'Three against four', "0' . . 0' | . . 0' . | . 0' . . | 0' . . 0'", ". . 0' . | . 0' . . | 0' . . 0' | . . 0' .", 'A hit every three 16ths. It only lines up with the bar every three bars.', 'Hypnotic, hard groove'),
    B('chroma', 'Chromatic roll', ". 0' 0' 0' | . 0' 0' 0' | . 1' 1' 1' | . 0' 0' 0'", ". 0' 0' 0' | . 0' 0' 0' | . 3' 3' 3' | . 1' 1' 1'", 'Rolling 16ths that step up a semitone and back. Tension without a chord change.', 'Psy techno, hard trance'),
    B('space', 'Two hits', ". . 0! - | . . . . | . . 0! - | . . . .", ". . 0! - | . . . . | . . . 0g | . 0! - .", 'Almost nothing. The gaps make each hit heavier.', 'Mainstage tech house, dub techno'),
    B('subdrop', 'Sub drop', "12 0~ - - | - - . . | . . 0' . | . . 0' .", ". . 0 - | - - . . | . . 0' . | . 0' 0' .", 'The first note of the phrase falls an octave into the root. A weight landing.', 'Afro tech, bass house'),
    B('hold', 'Hold and pump', "0 - - - | 0 - - - | 0 - - - | 0 - - -", "0 - - - | 0 - - - | 0 - - - | 0 - 0' 0'", 'One note retriggered on every kick. The sidechain is the rhythm.', 'Electro house, melodic techno'),
    B('skip', 'Two-step skip', "0 - - . | . . 0' . | . . 3 - | . 0' . .", "0 - - . | . . 0' . | . . 7 5~ | - . 3' .", 'Lands on the one, then dodges. Made for a broken or swung beat.', 'UK garage, breaks'),
    B('machine', 'Machine sixteenths', "0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 0'", "0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 0' | 0' 0' 12' 10'", 'A sequencer on root and octave. Hypnotic by construction.', 'Italo, EBM, nu-disco'),
    B('reverse', 'Reverse bass', ". 0 - - | . 0 - - | . 0 - - | . 0 - -", ". 0 - - | . 0 - - | . 0 - - | . 0 - 0'", 'A long note fills every gap and is cut off by the next kick. Give it a slow attack and it sucks.', 'Hard techno, hardstyle'),
    B('tail', 'Kick and tail', "0 - . . | 0 - . . | 0 - . . | 0 - . .", "0 - . . | 0 - . . | 0 - . . | 0 - 0' 0'", 'The bass is the kick\'s own tail: it starts with it and is gone before the next.', 'Hard techno, industrial'),
    B('late', 'Late sixteenth', ". . . 0 | . . . 0 | . . . 0 | . . . 0", ". . . 0 | . . . 0 | . . . 0 | . . 0' 0", 'Only the last 16th of each beat: the note that shoves you into the kick.', 'Warehouse and hypnotic techno'),
    B('five', 'Five against four', "0' . . . | . 0' . . | . . 0' . | . . . 0'", ". . . . | 0' . . . | . 0' . . | . . 0' .", 'A hit every five 16ths. It drifts across the bar and takes five bars to come home.', 'Hypnotic and deep techno'),
    B('hocket', 'Hocket with the kick', "0' . 0' 0' | . 0' . 0' | 0' . 0' 0' | . 0' . 0'", "0' . 0' 0' | . 0' . 0' | 0' . 0' 0' | . 0' 3' 0'", 'The bass plays like a second drummer, trading hits with the kick.', 'Hard groove, Detroit'),
  ];
  // Where the bank's vocabulary and the lane notes were cross-checked. Read as search results; see WOW.md.
  const SOURCES = [
    {title: 'The Producer School: 5 Tech House Bass Patterns Every Producer Needs to Master', url: 'https://theproducerschool.com/blogs/featured-blogs/5-tech-house-bass-patterns-every-producer-needs-to-master', used: 'syncopated offbeat, rolling eighths, ghost notes (quiet, short, duller), slides, stab-and-sustain'},
    {title: 'The Producer School: Master Modern Tech House Bass Lines', url: 'https://theproducerschool.com/blogs/featured-blogs/master-modern-tech-house-bass-lines-complete-tutorial-guide', used: 'offbeat variation with an octave on the first hit and a quieter note between hits'},
    {title: 'The Producer School: Building a Rolling Bassline Like Chris Stussy', url: 'https://theproducerschool.com/blogs/featured-blogs/building-a-rolling-bassline-like-chris-stussy-the-3-note-pattern-that-defines-modern-tech-house', used: 'rolling 16ths with the offbeat notes longest, and a velocity hierarchy'},
    {title: 'The Producer School: 5 Essential Bass Patterns That Define Hard House and Trance', url: 'https://theproducerschool.com/blogs/featured-blogs/5-essential-bass-patterns-that-define-hard-house-and-trance-music', used: 'offbeat donk, double offbeat, 16th roll, octave jump; sidechain a rolling line'},
    {title: 'Attack Magazine: Warehouse Rolling Techno Bass', url: 'https://www.attackmagazine.com/technique/tutorials/warehouse-rolling-techno-bass/', used: 'layered sub and rolling bass, fast envelopes, sidechain for separation'},
    {title: 'Attack Magazine: Low End Theory, eight common bassline styles', url: 'https://www.attackmagazine.com/technique/tutorials/low-end-theory-exploring-eight-common-bassline-styles/', used: 'the idea of a small shared vocabulary of bassline styles'},
    {title: 'Production Music Live: How to make afro tech', url: 'https://www.productionmusiclive.com/blogs/news/how-to-make-afro-tech', used: 'sub, mid bass and sub drop as three layers; tune the kick to the root'},
    {title: 'Native Instruments: Afro house production 101', url: 'https://www.native-instruments.com/blogs/blog/afro-house-production-101', used: 'syncopation against the four-on-the-floor'},
    {title: 'Wikipedia: Tresillo (rhythm) and Tumbao', url: 'https://en.wikipedia.org/wiki/Tresillo_(rhythm)', used: 'the 3-3-2 cell and the anticipated bass'},
    {title: 'Beatportal: The Top-Selling Tracks, Artists, and Labels of 2026 (Mid-Year Review)', url: 'https://www.beatportal.com/articles/1489584-the-top-selling-tracks-artists-and-labels-of-2026-mid-year-review', used: 'which lanes count as current: tech house leading, melodic house & techno climbing, hard and psy techno at peak time'},
  ];

  // ------------------------------------------------------------- generator
  // New ideas in the style's own grammar: its onset odds per 16th position, its
  // note pool and note lengths are measured from the three written ideas.
  function generate(style, seed) {
    const r = rng(seed * 7919 + style.id.length * 131 + style.bpm), src = style.ideas.flatMap(i => i.notes);
    const odds = [0, 0, 0, 0], pool = [], longs = [];
    for (const n of src) { odds[n.s % 4] += 1 / (style.ideas.length * 8); if (n.semi !== 0) pool.push(n.semi); longs.push(n.l); }
    const pick = a => a[Math.floor(r() * a.length)];
    const shortRate = src.filter(n => n.short).length / src.length, wowRate = src.filter(n => n.wow).length / src.length, accRate = src.filter(n => n.acc).length / src.length;
    const spice = .35 + r() * .35;
    const bar = () => {
      const out = []; let s = 0;
      while (s < SPB) {
        const p = clamp(odds[s % 4] * (.75 + r() * .5), 0, .95);
        if ((style.kickFree && s % 4 === 0) || r() > p) { s++; continue; }
        let l = pick(longs); l = Math.min(l, SPB - s);
        if (style.kickFree) while (l > 1 && Array.from({length: l - 1}, (_, i) => s + 1 + i).some(x => x % 4 === 0 && r() < .5)) l--;
        const late = s >= 10, semi = pool.length && r() < (late ? spice + .25 : spice * .35) ? pick(pool) : 0;
        out.push({s, l, semi, acc: r() < accRate, slide: false, wow: l > 1 && r() < Math.max(wowRate * 3, style.sound.vowel ? .35 : 0), short: l === 1 && r() < shortRate * 1.2});
        s += l;
      }
      return out;
    };
    let a = bar(), tries = 0;
    while ((a.length < 2 || a.length > 13) && tries++ < 20) a = bar();
    if (a.length < 2) a = style.ideas[0].notes.filter(n => n.s < SPB).map(n => ({...n}));
    // Bar two repeats bar one and changes its last beat: question, answer.
    const b = a.filter(n => n.s < 12).map(n => ({...n, l: Math.min(n.l, 12 - n.s)}));
    const tail = []; let s = 12;
    while (s < SPB) {
      if ((style.kickFree && s === 12) || r() < .3) { s++; continue; }
      const l = r() < .3 && s < 15 ? 2 : 1;
      tail.push({s, l, semi: pool.length && r() < .75 ? pick(pool) : 0, acc: false, slide: false, wow: l > 1 && r() < .5, short: l === 1 && r() < shortRate});
      s += l;
    }
    if (!tail.length) tail.push({s: 14, l: 1, semi: pool.length ? pick(pool) : 12, acc: false, slide: false, wow: false, short: true});
    const notes = [...a, ...[...b, ...tail].map(n => ({...n, s: n.s + SPB}))];
    // Slides only make sense between touching notes of different pitch.
    for (let i = 1; i < notes.length; i++) {
      const p = notes[i - 1], n = notes[i];
      if (p.s + p.l === n.s && !p.short && p.semi !== n.semi && style.sound.glide > .06 && r() < .5) n.slide = true;
    }
    return {name: 'Idea ' + seed, text: unparse(notes), notes, seed};
  }
  const ideaFor = (style, idea, seed, custom) => idea === -2 && custom ? {name: 'Your loop', text: custom, notes: parse(custom), custom: true} : idea >= 0 && idea < style.ideas.length ? style.ideas[idea] : generate(style, seed);
  // Make any edited note list legal: in range, monophonic, flags only where they mean something.
  function normalize(notes) {
    const out = [];
    for (const n of [...notes].sort((a, b) => a.s - b.s)) {
      const s = clamp(Math.round(n.s), 0, LOOP - 1), prev = out[out.length - 1];
      if (prev && prev.s === s) out.pop(); else if (prev && prev.s + prev.l > s) prev.l = s - prev.s;
      const short = !!(n.short || n.ghost);
      out.push({s, l: short ? 1 : clamp(Math.round(n.l) || 1, 1, LOOP - s), semi: clamp(Math.round(n.semi), -7, 19), acc: !!n.acc && !n.ghost, slide: !!n.slide, wow: !!n.wow && !n.ghost, short, ...(n.ghost ? {ghost: true} : {})});
    }
    out.forEach((n, i) => { const p = out[i - 1]; if (n.slide && !(p && p.s + p.l === n.s && !p.short)) n.slide = false; });
    return out;
  }

  // -------------------------------------------------------------- sections
  const SECTIONS = [
    {id: 'intro', name: 'Intro', reps: 1, role: 'Give the DJ something to mix. Hint at the rhythm, hide the notes.'},
    {id: 'drop1', name: 'Drop 1', reps: 2, role: 'The idea, stated plainly. Let it loop long enough to be learned.'},
    {id: 'break', name: 'Break', reps: 1, role: 'Take the floor away. Keep one thread of the bass so the drop is a return, not a surprise.'},
    {id: 'build', name: 'Build', reps: 1, role: 'Wind it up: flat, rising, faster, then nothing.'},
    {id: 'drop2', name: 'Drop 2', reps: 2, role: 'The same idea, developed. Everything the crowd already knows, plus the answers.'},
    {id: 'outro', name: 'Outro', reps: 1, role: 'Hand the low end to the next track without dropping the groove.'},
  ];
  const ok = (style, s) => !(style.kickFree && s % 4 === 0);
  const note = (t, l, semi, o = {}) => ({t, l, semi, vel: .8, slide: false, wow: false, short: false, ghost: false, ...o});
  const tile = (loop, style, prog) => {
    const out = [];
    for (let rep = 0; rep < BARS / 2; rep++) for (const n of loop) out.push(note(rep * LOOP + n.s, n.l, n.semi + (prog ? prog[rep] : 0), {vel: n.ghost ? .35 : n.acc ? 1 : .8, slide: n.slide, wow: n.wow, short: n.short, ghost: !!n.ghost, rep}));
    return out;
  };
  // The notes that carry the rhythm: accents first, then long notes, then the earliest in each bar.
  function skeleton(loop) {
    const rank = n => (n.ghost ? -5 : 0) + (n.acc ? 4 : 0) + (n.wow ? 2 : 0) + Math.min(n.l, 3) + (n.s % SPB < 8 ? .5 : 0) + (n.s % 4 === 2 ? .4 : 0);
    const keep = Math.max(2, Math.ceil(loop.length * .45));
    const chosen = new Set([...loop].sort((a, b) => rank(b) - rank(a) || a.s - b.s).slice(0, keep));
    return loop.filter(n => chosen.has(n)).map(n => ({...n, semi: 0, slide: false, wow: false, acc: false, ghost: false}));
  }
  const flat = loop => loop.map(n => ({...n, semi: 0, slide: false, wow: false}));
  const inBar = (notes, bar) => notes.filter(n => n.t >= bar * SPB && n.t < (bar + 1) * SPB);
  const without = (notes, from, to) => notes.filter(n => n.t < from || n.t >= to).map(n => n.t < from && n.t + n.l > from ? {...n, l: from - n.t} : n);
  // The last beat of a bar, rewritten.
  function fill(notes, style, bar, kind, prog) {
    const from = bar * SPB + 12, to = from + 4, tr = prog || 0;
    if (kind === 'none') return notes;
    if (kind === 'turn') return notes.some(n => n.t >= from && n.t < to)
      ? notes.map(n => n.t >= from && n.t < to && n.semi - tr < 8 ? {...n, semi: n.semi + 12} : n)
      : [...notes, note(from + 2, 1, 12 + tr, {short: true})];
    const out = without(notes, from, to);
    const add = (...ns) => out.push(...ns.filter(n => ok(style, n.t)));
    if (kind === 'gap') return out;
    if (kind === 'octave') add(note(from + 1, 1, 12 + tr, {short: true}), note(from + 2, 1, 12 + tr, {short: true}), note(from + 3, 1, 10 + tr, {short: true}));
    if (kind === 'run') add(note(from, 1, tr, {short: true}), note(from + 1, 1, 3 + tr, {short: true}), note(from + 2, 1, 5 + tr, {short: true}), note(from + 3, 1, 7 + tr, {short: true}));
    if (kind === 'stutter') add(note(from, 1, tr, {short: true}), note(from + 1, 1, tr, {short: true}), note(from + 2, 1, tr, {short: true, vel: 1}), note(from + 3, 1, tr, {short: true, vel: 1}));
    if (kind === 'slide') add(note(from + 1, 1, 12 + tr, {vel: 1}), note(from + 2, 2, tr, {slide: true, wow: true}));
    return out.sort((a, b) => a.t - b.t);
  }
  const FILLS = {gap: 'the bass drops out for the last beat', octave: 'octave pops in the last beat', run: 'a four-note run up into the next phrase',
    stutter: 'four 16ths on the root, the last two accented', slide: 'a slide from the octave down to the root', none: 'no fill: the loop is the point', turn: 'the last beat jumps an octave'};

  function section(style, loop, id) {
    const ramp = (a, b) => bar => a + (b - a) * bar / (BARS - 1);
    const evolve = bar => 1 + style.evolve * Math.sin(Math.PI * 2 * (bar + .5) / BARS) * .5;
    let notes, cut, sub = () => 1, wow = () => 1, drive = () => 1, what;
    const sk = skeleton(loop), n0 = loop.length;
    const drums = bar => ({kick: 1, clap: 1, hat: 1, oh: 1, perc: 1, ride: 0, roll: 0, cut: 16});
    let plan = drums;
    if (id === 'intro') {
      notes = tile(sk, style, null); cut = ramp(.32, .62); sub = bar => bar < 4 ? 0 : 1; wow = () => 0;
      plan = bar => ({kick: 1, clap: bar >= 4 ? 1 : 0, hat: 1, oh: bar >= 4 ? 1 : 0, perc: bar >= 6 ? 1 : 0, ride: 0, roll: 0, cut: 16});
      what = [`Rhythm skeleton only: ${sk.length} of the loop's ${n0} notes, all on the root.`, 'Filter mostly closed, opening slowly over eight bars.', 'No sub for four bars, so the outgoing track keeps the low end. Sub in at bar 5.', 'No slides, no wow. Save the personality.'];
    } else if (id === 'drop1') {
      notes = tile(loop, style, style.prog);
      notes = fill(notes, style, 3, style.fill === 'none' ? 'none' : 'turn', style.prog[1]); notes = fill(notes, style, 7, style.fill, style.prog[3]);
      cut = style.evolve ? evolve : () => 1;
      what = ['The loop exactly as written, four times.', style.prog.some(Boolean) ? 'It follows the chord roots: a new root every two bars.' : 'One root for all eight bars. The kick and bass are one instrument.',
        style.fill === 'none' ? 'No fills. The filter drifts slowly instead.' : `Bar 4: ${FILLS.turn}. Bar 8: ${FILLS[style.fill]}.`, 'Play these eight bars twice before changing anything.'];
    } else if (id === 'break') {
      const pr = style.breakProg;
      if (style.breakMode === 'pad') {
        notes = pr.map((p, i) => note(i * LOOP, LOOP, p, {vel: .55, slide: i > 0 && p !== pr[i - 1]}));
        notes[notes.length - 1].l = LOOP - 4;
        cut = ramp(.3, .6); sub = () => .5; wow = () => 0;
        what = ['Four long notes, two bars each, on the chord roots. The rhythm is gone.', 'Filter low, opening a little. Soft sub.', 'No kick. This is where the chords and the vocal get the room.', 'The last beat is silent.'];
      } else if (style.breakMode === 'drone') {
        notes = [note(0, BARS * SPB - 4, 0, {vel: .55})]; cut = bar => .28 + .3 * (.5 - .5 * Math.cos(Math.PI * 2 * bar / 4)) + bar * .03; sub = () => .45; wow = () => 0;
        what = ['One root note held for the whole break.', 'The filter opens and closes over four bars: slow breathing instead of rhythm.', 'No kick, so no rumble either. The room gets quiet without going empty.', 'The last beat is silent.'];
      } else {
        notes = [...tile(sk, style, null).filter(n => n.t < 4 * SPB), ...tile(flat(loop), style, null).filter(n => n.t >= 4 * SPB)];
        notes = without(notes, BARS * SPB - 4, BARS * SPB);
        cut = ramp(.25, .75); sub = () => 0; wow = bar => bar >= 4 ? .6 : 0;
        what = ['The bass keeps talking, but with no sub: top layer only, high-passed.', 'Skeleton for four bars, then the whole rhythm on one note.', 'Filter opens through the break. No kick underneath.', 'The last beat is silent.'];
      }
      plan = bar => ({kick: 0, clap: bar >= 4 ? 1 : 0, hat: bar >= 4 ? 1 : 0, oh: 0, perc: 1, ride: 0, roll: 0, cut: bar === 7 ? 12 : 16});
    } else if (id === 'build') {
      notes = [...tile(flat(loop), style, null).filter(n => n.t < 4 * SPB), ...tile(loop, style, null).filter(n => n.t >= 4 * SPB && n.t < 6 * SPB)];
      notes = without(notes, 6 * SPB, 8 * SPB);
      for (let s = 0; s < SPB; s++) if (ok(style, s)) notes.push(note(6 * SPB + s, 1, 0, {short: true, vel: .7 + .3 * s / 15}));
      const climb = [0, 0, 3, 3, 7, 7, 12, 12];
      for (let s = 0; s < 8; s++) notes.push(note(7 * SPB + s, 1, climb[s], {short: true, vel: 1}));
      cut = ramp(.4, 1.25); sub = bar => bar === 7 ? 0 : 1; wow = bar => bar >= 4 && bar < 6 ? 1 : 0; drive = ramp(1, 1.3);
      plan = bar => ({kick: bar < 7 ? 1 : 0, clap: bar < 6 ? 1 : 0, hat: 1, oh: bar < 6 ? 1 : 0, perc: bar < 4 ? 1 : 0, ride: 0, roll: bar < 4 ? 0 : bar < 6 ? 1 : bar === 6 ? 2 : 3, cut: bar === 7 ? 8 : 16});
      what = ['Bars 1–4: the full rhythm on one note. Bars 5–6: the real loop comes back.', 'Bar 7: every 16th' + (style.kickFree ? ' between the kicks' : '') + ', getting louder.', 'Bar 8: the notes climb root, ♭3, 5, octave with no sub, then two beats of nothing.', 'Filter opens the whole way. The silence before the drop is the loudest part.'];
    } else if (id === 'drop2') {
      const dev = [];
      for (let rep = 0; rep < BARS / 2; rep++) {
        const last = loop[loop.length - 1];
        for (const n of loop) {
          let semi = n.semi + style.prog[rep];
          if (n === last) semi += style.answers[rep];
          if (rep % 2 === 1 && n.s >= SPB + 8 && n.semi < 8 && n !== last) semi += 12;
          dev.push(note(rep * LOOP + n.s, n.l, semi, {vel: n.ghost ? .35 : n.acc ? 1 : .84, slide: n.slide, wow: n.wow || n.l >= 2, short: n.short, ghost: !!n.ghost, rep}));
        }
      }
      // Ghost 16ths lead into long or accented notes.
      const taken = new Set(); for (const n of dev) for (let i = 0; i < n.l; i++) taken.add(n.t + i);
      let ghosts = 0;
      for (const n of [...dev]) if (!n.ghost && (n.l >= 2 || n.vel === 1) && n.t > 0 && !taken.has(n.t - 1) && ok(style, n.t - 1) && !n.slide) { dev.push(note(n.t - 1, 1, n.semi, {short: true, vel: .35, ghost: true})); taken.add(n.t - 1); ghosts++; }
      notes = dev.sort((a, b) => a.t - b.t);
      notes = fill(notes, style, 3, style.fill === 'none' ? 'none' : style.fill, style.prog[1]); notes = fill(notes, style, 7, style.fill2, style.prog[3]);
      cut = style.evolve ? bar => 1.2 * evolve(bar) : () => 1.2; drive = () => 1.2; wow = () => 1.25;
      plan = bar => ({kick: 1, clap: 1, hat: 1, oh: 1, perc: 1, ride: 1, roll: 0, cut: 16});
      const ans = style.answers.some(Boolean);
      what = ['Same loop, same rhythm. Nobody has to relearn it.', (ans ? 'The last note answers differently each time round. ' : '') + 'In every second pass the end of the phrase jumps an octave.',
        ghosts ? `${ghosts} quiet ghost 16ths lead into the long and accented notes.` : 'No ghost notes fit: the loop is already full.', `Filter 20% more open, more drive, every long note opens up. Bar 4: ${FILLS[style.fill]}. Bar 8: ${FILLS[style.fill2]}.`];
    } else {
      notes = [...tile(flat(loop), style, null).filter(n => n.t < 4 * SPB), ...tile(sk, style, null).filter(n => n.t >= 4 * SPB)];
      cut = ramp(.85, .3); sub = bar => bar < 6 ? 1 : 0; wow = () => 0;
      plan = bar => ({kick: 1, clap: bar < 4 ? 1 : 0, hat: 1, oh: bar < 4 ? 1 : 0, perc: bar < 2 ? 1 : 0, ride: 0, roll: 0, cut: 16});
      what = ['Bars 1–4: the rhythm on one note. The melody leaves first.', 'Bars 5–8: skeleton only.', 'Filter closes. Sub out for the last two bars so the next track\'s bass can take over.', 'The kick stays to the end.'];
    }
    notes = notes.filter(n => n.t >= 0 && n.t < BARS * SPB).sort((a, b) => a.t - b.t);
    // Keep notes monophonic and inside the phrase and register.
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i], next = notes[i + 1];
      n.semi = clamp(n.semi, -7, 19);
      n.l = Math.min(n.l, (next ? next.t : BARS * SPB) - n.t);
      if (n.slide && (i === 0 || notes[i - 1].t + notes[i - 1].l !== n.t || notes[i - 1].short)) n.slide = false;
    }
    notes = notes.filter(n => n.l > 0);
    // Accent shape: a velocity hierarchy by position in the beat. Ghosts stay ghosts.
    const shape = ACCENTS[style.accent];
    if (shape) for (const n of notes) if (!n.ghost) n.vel = shape.v[n.t % 4];
    // legato: the next note slides out of this one, so this one is not released.
    notes.forEach((n, i) => { const next = notes[i + 1]; n.legato = !!(next && next.slide && next.t === n.t + n.l); });
    // A note held across bar lines leaves a "tie" in each later bar, so the sound can follow that bar's settings.
    const ties = Array.from({length: BARS}, () => []);
    for (const n of notes) for (let bar = Math.floor(n.t / SPB) + 1; bar * SPB < n.t + n.l; bar++) ties[bar].push({s: 0, l: Math.min(SPB, n.t + n.l - bar * SPB), semi: n.semi, wow: n.wow});
    const bars = Array.from({length: BARS}, (_, bar) => ({section: id, bar, notes: inBar(notes, bar).map(n => ({...n, s: n.t - bar * SPB})), ties: ties[bar],
      m: {cut: cut(bar), sub: sub(bar), wow: wow(bar), drive: drive(bar)}, d: plan(bar)}));
    return {id, notes, bars, what};
  }
  const cache = new Map();
  function sectionFor(style, idea, id) {
    const key = style.id + '|' + (style.vkey || '') + '|' + idea.text + '|' + id;
    if (!cache.has(key)) { if (cache.size > 400) cache.clear(); cache.set(key, section(style, idea.notes, id)); }
    return cache.get(key);
  }
  // The whole track: 64 bars, each drop played twice.
  function journey(style, idea) {
    const out = [];
    for (const s of SECTIONS) { const sec = sectionFor(style, idea, s.id); for (let r = 0; r < s.reps; r++) for (const b of sec.bars) out.push({...b, rep: r}); }
    return out;
  }

  // ----------------------------------------------------------------- drums
  const HATS = {
    house: {ch: [0, .5, 0, .35, 0, .5, 0, .3, 0, .5, 0, .35, 0, .5, 0, .4], oh: [2, 6, 10, 14]},
    shuffle: {ch: [0, .3, 0, .55, 0, .3, 0, .5, .2, .3, 0, .55, 0, .3, 0, .5], oh: [2, 6, 10, 14]},
    garage: {ch: [0, 0, .5, .3, 0, 0, .5, 0, 0, .3, .5, 0, 0, 0, .5, .35], oh: [6, 14]},
    afro: {ch: [.4, 0, .5, .3, .4, 0, .5, 0, .4, .3, .5, 0, .4, 0, .5, .3], oh: [6, 14]},
    techno: {ch: [0, .3, 0, .3, 0, .3, 0, .3, 0, .3, 0, .3, 0, .3, 0, .35], oh: [2, 6, 10, 14]},
    hard: {ch: [.3, .3, 0, .3, .3, .3, 0, .3, .3, .3, 0, .3, .3, .3, 0, .3], oh: [2, 6, 10, 14]},
  };
  // Drum hits for one bar: [{type, s (step, may be fractional), vel}]
  function drumBar(style, b) {
    const kit = style.kit, d = b.d, out = [], lim = d.cut;
    const add = (type, s, vel) => { if (s < lim) out.push({type, s, vel}); };
    if (d.kick) for (const s of kit.kicks || KICK) add('kick', s, 1);
    if (d.clap && kit.clap) { add('clap', 4, .9); add('clap', 12, .9); }
    const h = HATS[kit.hat];
    if (d.hat) h.ch.forEach((v, s) => v && add('ch', s, v));
    if (d.oh) for (const s of h.oh) add('oh', s, .6);
    if (d.perc) kit.perc.split(' ').forEach((c, s) => c === 'x' && add('perc', s, .6));
    if (d.ride) for (const s of [2, 6, 10, 14]) add('ride', s, .5);
    if (d.roll) { const every = d.roll === 1 ? 4 : d.roll === 2 ? 2 : 1; for (let s = 0; s < SPB; s += every) add('snare', s, .45 + .5 * s / 15 * (d.roll / 3)); }
    return out;
  }

  // -------------------------------------------------------------- measures
  function measure(style, sec, root) {
    const ns = sec.notes, on = ns.filter(n => n.t % 4 === 0).length, sounding = ns.reduce((a, n) => a + (n.short ? .5 : n.l), 0);
    const semis = ns.map(n => n.semi), lo = ns.length ? Math.min(...semis) : 0, hi = ns.length ? Math.max(...semis) : 0;
    const m = sec.bars.reduce((a, b) => a + b.m.cut, 0) / BARS, sub = sec.bars.reduce((a, b) => a + b.m.sub, 0) / BARS, kick = sec.bars.reduce((a, b) => a + b.d.kick, 0) / BARS;
    return {notes: ns.length, perBar: ns.length / BARS, onKick: on, onKickPct: ns.length ? on / ns.length : 0, gate: sounding / (BARS * SPB),
      offbeat: ns.length ? ns.filter(n => n.t % 2 === 1).length / ns.length : 0, lo: root + lo, hi: root + hi, loHz: hz(root + lo), rootHz: hz(root),
      wow: ns.filter(n => n.wow).length, slides: ns.filter(n => n.slide).length, pitches: new Set(semis).size,
      energy: clamp(.3 * Math.min(1, ns.length / BARS / 9) + .3 * Math.min(1, m / 1.2) + .2 * sub + .2 * kick, 0, 1)};
  }
  const subVerdict = f => f < 38 ? 'very low: most club systems roll off here, check it on a big rig' : f <= 58 ? 'in the sub sweet spot' : f <= 70 ? 'punchy; tighter than a deep sub' : 'high for a sub: consider the octave below for weight';

  // ------------------------------------------------------------------ MIDI
  const vlq = n => { const b = [n & 127]; while ((n >>= 7)) b.unshift(n & 127 | 128); return b; };
  const str = s => [...new TextEncoder().encode(s)];
  function track(events) {
    events.sort((a, b) => a.t - b.t || a.o - b.o);
    const body = []; let last = 0;
    for (const e of events) { body.push(...vlq(Math.max(0, Math.round(e.t - last))), ...e.d); last = Math.max(last, Math.round(e.t)); }
    body.push(0, 0xFF, 0x2F, 0);
    return [0x4D, 0x54, 0x72, 0x6B, body.length >>> 24 & 255, body.length >>> 16 & 255, body.length >>> 8 & 255, body.length & 255, ...body];
  }
  const DRUM_NOTE = {kick: 36, clap: 39, ch: 42, oh: 46, perc: 37, ride: 51, snare: 38};
  // bars: output of section().bars or journey(). Straight grid; add your own groove in the DAW.
  function midi(style, bars, {root, bpm, drums = true, name = 'Wow'} = {}) {
    const PPQ = 480, T = PPQ / 4, us = Math.round(6e7 / bpm);
    const meta = (t, type, bytes) => ({t, o: 0, d: [0xFF, type, ...vlq(bytes.length), ...bytes]});
    const cond = [meta(0, 0x03, str(name)), meta(0, 0x51, [us >>> 16 & 255, us >>> 8 & 255, us & 255]), meta(0, 0x58, [4, 2, 24, 8])];
    const bass = [meta(0, 0x03, str(style.name + ' bass'))], kit = [meta(0, 0x03, str('Drums'))];
    let prevSec = null;
    bars.forEach((b, i) => {
      const t0 = i * SPB * T;
      if (b.section !== prevSec || b.bar === 0) cond.push(meta(t0, 0x06, str(SECTIONS.find(s => s.id === b.section).name + (b.rep ? ' (again)' : ''))));
      prevSec = b.section;
      bass.push({t: t0, o: 1, d: [0xB0, 74, clamp(Math.round(b.m.cut / 1.3 * 127), 0, 127)]});
      b.notes.forEach((n, j) => {
        const legato = n.legato;
        const on = t0 + n.s * T, len = n.short ? T * .5 : n.l * T - (legato ? -T * .1 : T * .1), pitch = root + n.semi;
        bass.push({t: on, o: 3, d: [0x90, pitch, clamp(Math.round(n.vel * 110) + (n.wow ? 10 : 0), 1, 127)]}, {t: on + len, o: n.slide ? 4 : 2, d: [0x80, pitch, 0]});
        if (n.wow) { const steps = 6; for (let k = 0; k <= steps; k++) bass.push({t: on + len * k / steps, o: 1, d: [0xB0, 1, Math.round(127 * Math.sin(Math.PI * k / steps))]}); }
      });
      if (drums) for (const h of drumBar(style, b)) { const on = t0 + h.s * T; kit.push({t: on, o: 3, d: [0x99, DRUM_NOTE[h.type], clamp(Math.round(h.vel * 120), 1, 127)]}, {t: on + T * .5, o: 2, d: [0x89, DRUM_NOTE[h.type], 0]}); }
    });
    const tracks = [cond, bass, ...(drums ? [kit] : [])];
    return new Uint8Array([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, PPQ >> 8, PPQ & 255, ...tracks.flatMap(track)]);
  }
  // 16-bit stereo WAV from two Float32Arrays.
  function wav(l, r, sr) {
    const n = l.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.round(clamp(l[i], -1, 1) * 32767), true); v.setInt16(46 + i * 4, Math.round(clamp(r[i], -1, 1) * 32767), true); }
    return new Uint8Array(buf);
  }

  // ----------------------------------------------------------------- state
  const defaults = () => ({style: 'tech', idea: 0, seed: 1, section: 'drop1', bpm: 128, key: 7, wow: 70, drive: 50, sub: 70, tone: 50, drums: 80, family: 'all',
    sound: '', move: 'auto', brk: 'auto', fill: 'auto', accent: 'auto', swing: 10, gate: 100, pump: 100, space: 100, tune: 1, custom: ''});
  function validate(s) {
    const d = defaults(), out = {...d};
    if (!s || typeof s !== 'object') return d;
    if (STYLES.some(x => x.id === s.style)) out.style = s.style;
    if (SECTIONS.some(x => x.id === s.section)) out.section = s.section;
    if (['all', 'house', 'techno', 'now', 'classic'].includes(s.family)) out.family = s.family;
    if (s.sound === '' || soundById(s.sound)) out.sound = s.sound || '';
    if (ACCENT_NAMES[s.accent]) out.accent = s.accent;
    if (typeof s.custom === 'string' && s.custom.length < 400) { try { const n = normalize(parse(s.custom)); if (n.length) out.custom = unparse(n); } catch {} }
    if (MOVE_NAMES[s.move]) out.move = s.move; if (BREAKS[s.brk]) out.brk = s.brk; if (FILL_NAMES[s.fill]) out.fill = s.fill;
    const int = (k, a, b) => { if (Number.isFinite(+s[k])) out[k] = clamp(Math.round(+s[k]), a, b); };
    int('idea', -2, 9); int('tune', 0, 1); int('seed', 1, 99999); int('bpm', 100, 170); int('key', 0, 11); int('wow', 0, 100); int('drive', 0, 100); int('sub', 0, 100); int('tone', 0, 100); int('drums', 0, 100); int('swing', 0, 30); int('gate', 30, 100); int('pump', 0, 150); int('space', 0, 200);
    if (out.idea === -2 && !out.custom) out.idea = 0;
    if (out.idea >= styleById(out.style).ideas.length) out.idea = 0;
    return out;
  }

  return {SPB, LOOP, BARS, KICK, NAMES, VOWELS, STYLES, SOUNDS, BANK, SOURCES, ACCENTS, ACCENT_NAMES, soundById, normalize, SECTIONS, FILLS, MOVES, MOVE_NAMES, BREAKS, FILL_NAMES, withOptions, HATS, DRUM_NOTE, hz, rootMidi, noteName, rng, parse, unparse, checkLoop, styleById,
    generate, ideaFor, skeleton, tileCount: loop => loop.length * BARS / 2, section, sectionFor, journey, drumBar, measure, subVerdict, midi, wav, defaults, validate};
})();
if (typeof module !== 'undefined') module.exports = WOW;
