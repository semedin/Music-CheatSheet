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
  // (the filter opens and closes across the note), ' short. "|" is decoration.
  function parse(text) {
    const tok = text.replace(/\|/g, ' ').trim().split(/\s+/);
    if (tok.length !== LOOP) throw Error('A loop needs 32 steps, got ' + tok.length + ': ' + text);
    const notes = [];
    tok.forEach((t, s) => {
      if (t === '.') return;
      if (t === '-') { const last = notes[notes.length - 1]; if (!last || last.s + last.l !== s || last.short) throw Error('Nothing to hold at step ' + s + ': ' + text); last.l++; return; }
      const m = /^(-?\d+)([!~w']*)$/.exec(t);
      if (!m) throw Error('Bad token "' + t + '" in: ' + text);
      const f = m[2];
      notes.push({s, l: 1, semi: +m[1], acc: f.includes('!'), slide: f.includes('~'), wow: f.includes('w'), short: f.includes("'")});
    });
    return notes;
  }
  const unparse = notes => {
    const out = Array(LOOP).fill('.');
    for (const n of notes) { out[n.s] = n.semi + (n.acc ? '!' : '') + (n.slide ? '~' : '') + (n.wow ? 'w' : '') + (n.short ? "'" : ''); for (let i = 1; i < n.l; i++) out[n.s + i] = '-'; }
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
    drive: .4, hp: 80, vowel: 0, rest: 'o', word: ['u', 'a', 'u'], say: 'wow', wowDepth: 2.2, lfo: null, glide: .05, rel: .02, atk: .003, pluck: 0, level: .8, rumble: 0};
  const sound = o => ({...SOUND0, ...o});
  // Formant centres (Hz). They do not follow the note, which is why a bass through them sounds like a mouth.
  const VOWELS = {a: [800, 1150, 2900], e: [450, 1750, 2600], i: [300, 2200, 3000], o: [480, 820, 2800], u: [330, 680, 2500]};

  // ---------------------------------------------------------------- styles
  const S = (o, ideas) => ({prog: [0, 0, 0, 0], breakProg: [0, 0, -4, -2], breakMode: 'tease', fill: 'octave', fill2: 'run', answers: [0, 0, 0, 0],
    kickFree: true, swing: 0, evolve: 0, ...o, ideas: ideas.map(([name, a, b]) => ({name, text: a + ' | ' + b, notes: parse(a + ' ' + b)}))});
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
  ];
  const styleById = id => STYLES.find(s => s.id === id) || STYLES[0];

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
  const ideaFor = (style, idea, seed) => idea >= 0 && idea < style.ideas.length ? style.ideas[idea] : generate(style, seed);

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
    for (let rep = 0; rep < BARS / 2; rep++) for (const n of loop) out.push(note(rep * LOOP + n.s, n.l, n.semi + (prog ? prog[rep] : 0), {vel: n.acc ? 1 : .8, slide: n.slide, wow: n.wow, short: n.short, rep}));
    return out;
  };
  // The notes that carry the rhythm: accents first, then long notes, then the earliest in each bar.
  function skeleton(loop) {
    const rank = n => (n.acc ? 4 : 0) + (n.wow ? 2 : 0) + Math.min(n.l, 3) + (n.s % SPB < 8 ? .5 : 0) + (n.s % 4 === 2 ? .4 : 0);
    const keep = Math.max(2, Math.ceil(loop.length * .45));
    const chosen = new Set([...loop].sort((a, b) => rank(b) - rank(a) || a.s - b.s).slice(0, keep));
    return loop.filter(n => chosen.has(n)).map(n => ({...n, semi: 0, slide: false, wow: false, acc: false}));
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
          dev.push(note(rep * LOOP + n.s, n.l, semi, {vel: n.acc ? 1 : .84, slide: n.slide, wow: n.wow || n.l >= 2, short: n.short, rep}));
        }
      }
      // Ghost 16ths lead into long or accented notes.
      const taken = new Set(); for (const n of dev) for (let i = 0; i < n.l; i++) taken.add(n.t + i);
      let ghosts = 0;
      for (const n of [...dev]) if ((n.l >= 2 || n.vel === 1) && n.t > 0 && !taken.has(n.t - 1) && ok(style, n.t - 1) && !n.slide) { dev.push(note(n.t - 1, 1, n.semi, {short: true, vel: .5, ghost: true})); taken.add(n.t - 1); ghosts++; }
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
    const key = style.id + '|' + idea.text + '|' + id;
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
    if (d.kick) for (const s of KICK) add('kick', s, 1);
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
  const defaults = () => ({style: 'tech', idea: 0, seed: 1, section: 'drop1', bpm: 128, key: 7, wow: 70, drive: 50, sub: 70, tone: 50, drums: 80, family: 'all'});
  function validate(s) {
    const d = defaults(), out = {...d};
    if (!s || typeof s !== 'object') return d;
    if (STYLES.some(x => x.id === s.style)) out.style = s.style;
    if (SECTIONS.some(x => x.id === s.section)) out.section = s.section;
    if (['all', 'house', 'techno'].includes(s.family)) out.family = s.family;
    const int = (k, a, b) => { if (Number.isFinite(+s[k])) out[k] = clamp(Math.round(+s[k]), a, b); };
    int('idea', -1, 2); int('seed', 1, 99999); int('bpm', 100, 170); int('key', 0, 11); int('wow', 0, 100); int('drive', 0, 100); int('sub', 0, 100); int('tone', 0, 100); int('drums', 0, 100);
    return out;
  }

  return {SPB, LOOP, BARS, KICK, NAMES, VOWELS, STYLES, SECTIONS, FILLS, HATS, DRUM_NOTE, hz, rootMidi, noteName, rng, parse, unparse, checkLoop, styleById,
    generate, ideaFor, skeleton, tileCount: loop => loop.length * BARS / 2, section, sectionFor, journey, drumBar, measure, subVerdict, midi, wav, defaults, validate};
})();
if (typeof module !== 'undefined') module.exports = WOW;
