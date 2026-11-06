/* transplant-loop:start */
// Your loop: MIDI clips in, parts out. Each melodic track is one part; a drum clip (Drum Rack, channel 10 or GM
// drum notes) is split into one part per pad, so the kick, the clap and the open hat can each come in when the
// reference brings in its own. Every part gets a role, guessed from its name and its notes, which you can change.
// Pure JavaScript on top of Orbit's MIDI reader (OT.readMidi): transplant-src/test.mjs runs this exact code.
const TL = (() => {
'use strict';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ROLES = [
  {k: 'kick', name: 'Kick', group: 'drums', lane: 'kick', c: '#FF4B32'},
  {k: 'clap', name: 'Clap / snare', group: 'drums', lane: 'clap', c: '#FF8A2B'},
  {k: 'hats', name: 'Hats', group: 'drums', lane: 'hats', c: '#FFC531'},
  {k: 'perc', name: 'Percussion', group: 'drums', lane: 'hats', c: '#E8B04B'},
  {k: 'bass', name: 'Bass', group: 'bass', lane: 'bass', c: '#E07B39'},
  {k: 'lead', name: 'Lead / riff', group: 'synths', lane: 'pads', c: '#FF5FA2'},
  {k: 'chords', name: 'Chords / stabs', group: 'synths', lane: 'pads', c: '#3FD0C9'},
  {k: 'pad', name: 'Pad / atmos', group: 'synths', lane: 'pads', c: '#7C9CFF'},
  {k: 'vox', name: 'Vocal', group: 'synths', lane: 'pads', c: '#C792EA'},
  {k: 'fx', name: 'FX', group: 'synths', lane: 'fx', c: '#A78BFA'}];
const ROLE = Object.fromEntries(ROLES.map(r => [r.k, r]));
const DRUM_ROLES = new Set(['kick', 'clap', 'hats', 'perc']);

// General MIDI drum notes (and Ableton's Drum Rack, which starts at C1 = 36 in the same order)
const GM = {35: ['kick', 'Kick'], 36: ['kick', 'Kick'], 37: ['perc', 'Rim'], 38: ['clap', 'Snare'], 39: ['clap', 'Clap'], 40: ['clap', 'Snare 2'], 41: ['perc', 'Low tom'],
  42: ['hats', 'Closed hat'], 43: ['perc', 'Tom'], 44: ['hats', 'Pedal hat'], 45: ['perc', 'Mid tom'], 46: ['hats', 'Open hat'], 47: ['perc', 'Tom'], 48: ['perc', 'High tom'],
  49: ['fx', 'Crash'], 50: ['perc', 'High tom'], 51: ['hats', 'Ride'], 52: ['fx', 'China'], 53: ['hats', 'Ride bell'], 54: ['perc', 'Tambourine'], 55: ['fx', 'Splash'],
  56: ['perc', 'Cowbell'], 57: ['fx', 'Crash 2'], 59: ['hats', 'Ride 2'], 60: ['perc', 'Bongo'], 61: ['perc', 'Bongo'], 62: ['perc', 'Conga'], 63: ['perc', 'Conga'],
  64: ['perc', 'Low conga'], 65: ['perc', 'Timbale'], 66: ['perc', 'Timbale'], 67: ['perc', 'Agogo'], 68: ['perc', 'Agogo'], 69: ['perc', 'Cabasa'], 70: ['perc', 'Shaker'],
  75: ['perc', 'Claves'], 76: ['perc', 'Wood block'], 77: ['perc', 'Wood block']};
// the voice each drum note plays in the preview
const DRUM_VOICE = {35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 40: 'snare', 41: 'tom', 42: 'chh', 43: 'tom', 44: 'chh', 45: 'tom', 46: 'ohh', 47: 'tom', 48: 'tom', 49: 'crash', 50: 'tom',
  51: 'ride', 52: 'crash', 53: 'ride', 54: 'shaker', 55: 'crash', 56: 'cowbell', 57: 'crash', 59: 'ride', 60: 'conga', 61: 'conga', 62: 'conga', 63: 'conga', 64: 'conga', 65: 'conga', 66: 'conga',
  67: 'cowbell', 68: 'cowbell', 69: 'shaker', 70: 'shaker', 75: 'rim', 76: 'wood', 77: 'wood'};

const NAME_RULES = [
  [/\b(kick|kik|bd|bass ?drum)\b|kick/i, 'kick'], [/clap|snare|\bsd\b|\bsnr\b/i, 'clap'], [/hi.?hat|\bhh\b|\bhat|\bhats\b|\bride\b|cymbal|\bcym\b/i, 'hats'],
  [/perc|conga|bongo|\btom\b|toms|\brim\b|cowbell|clave|wood|block|shaker|shkr|tamb|tribal|clap ?perc/i, 'perc'],
  [/\b(drums?|beat|kit|groove|rack)\b|drum/i, 'drums'],
  [/bass|\bsub\b|808|reese|rumble|bassline/i, 'bass'], [/\bpad|string|atmo|drone|ambien|choir|texture|swell|wash/i, 'pad'],
  [/chord|stab|keys|piano|organ|rhodes|\bcomp\b|\bep\b/i, 'chords'], [/vox|vocal|voice|chop|acapella|\bvoc\b/i, 'vox'],
  [/\bfx\b|riser|sweep|noise|impact|uplift|downlift|whoosh/i, 'fx'],
  [/lead|arp|riff|synth|melod|hook|pluck|\bseq|acid|303|\bline\b|bleep|hoover/i, 'lead']];
const GENERIC_NAME = /^(track|midi|untitled|sequence|clip|\d+[- ]?midi|\d+|[- _]*)\s*\d*$/i;

function nameRole(name) { for (const [re, r] of NAME_RULES) if (re.test(name || '')) return r; return null; }
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; };
function polyphony(notes) {
  if (!notes.length) return 0;
  let s = 0;
  for (const a of notes) { let c = 0; for (const b of notes) if (b.t <= a.t + 0.01 && b.t + b.d > a.t + 0.01) c++; s += c; }
  return s / notes.length;
}
function stats(notes, loopBeats) {
  const ps = notes.map(n => n.n), ds = notes.map(n => n.d);
  return {median: median(ps), lo: Math.min(...ps), hi: Math.max(...ps), poly: polyphony(notes), dur: median(ds), distinct: new Set(ps).size, perBar: notes.length / Math.max(1, loopBeats / 4)};
}
// role from the notes when the name doesn't say
function melodicRole(st) {
  if (st.median <= 50 && st.poly < 1.6) return 'bass';
  if (st.poly >= 2.2) return st.dur >= 2 ? 'pad' : 'chords';
  if (st.dur >= 3 && st.poly >= 1.4) return 'pad';
  if (st.median <= 47) return 'bass';
  return 'lead';
}
// a clip that is really drums: GM channel, a drum name, or short notes on drum keys
function looksLikeDrums(tr, name) {
  if (tr.drums || tr.notes.every(n => n.ch === 9)) return true;
  if (nameRole(name) === 'drums') return true;
  const ns = tr.notes, keys = new Set(ns.map(n => n.n));
  if (keys.size < 2) return false;
  const shortShare = ns.filter(n => n.d <= 0.35).length / ns.length, gm = [...keys].filter(k => GM[k]).length / keys.size;
  return shortShare > 0.85 && gm > 0.8 && keys.has(36) && [38, 39, 40, 42, 44, 46].some(k => keys.has(k)) && ns.filter(n => n.n === 36 && n.d <= 0.5).length >= 2;
}

let uid = 0;
const newId = () => 'p' + (++uid).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
function part(o) {
  const r = ROLE[o.role] || ROLE.lead;
  return Object.assign({id: newId(), mute: false, solo: false, level: 1, entry: 'auto', follow: r.lane, color: r.c, sound: null}, o);
}

// Read MIDI files into parts. files: [{name, bytes}]
function fromMidi(files) {
  const parts = [], warnings = [];
  let bpm = null, maxBeats = 0, srcN = 0;
  for (const f of files) {
    let mid;
    try { mid = OT.readMidi(f.bytes); } catch (e) { warnings.push(`${f.name}: ${e.message}`); continue; }
    if (mid.bpm && !bpm) bpm = mid.bpm;
    const base = String(f.name || 'Clip').replace(/\.(mid|midi|smf)$/i, '').trim();
    const tracks = mid.tracks.filter(t => t.notes.length);
    if (!tracks.length) { warnings.push(`${f.name}: no notes in this file.`); continue; }
    for (const tr of tracks) {
      maxBeats = Math.max(maxBeats, tr.beats || 0, ...tr.notes.map(n => n.t + Math.min(n.d, 1)));
      // a Type 0 file can hold several channels: split them
      const byCh = new Map(); for (const n of tr.notes) { if (!byCh.has(n.ch)) byCh.set(n.ch, []); byCh.get(n.ch).push(n); }
      for (const [ch, notes] of byCh) {
        const own = tr.name && !GENERIC_NAME.test(tr.name.trim()) ? tr.name.trim() : '';
        const name = (tracks.length === 1 && byCh.size === 1 ? (own && own.toLowerCase() !== base.toLowerCase() && !nameRole(base) ? own : base) : own || `${base} ${ch + 1}`).slice(0, 48);
        const src = {id: 's' + (++srcN), name, file: f.name, ch};
        const t = {notes, drums: ch === 9 || tr.drums, beats: tr.beats};
        if (looksLikeDrums(t, name) && new Set(notes.map(n => n.n)).size >= 2) {
          // one part per pad
          const pads = new Map(); for (const n of notes) { if (!pads.has(n.n)) pads.set(n.n, []); pads.get(n.n).push(n); }
          for (const [p, ns] of [...pads].sort((a, b) => a[0] - b[0])) {
            const gm = GM[p];
            parts.push(part({name: gm ? gm[1] : `Pad ${OT.noteName(p)}`, role: gm ? gm[0] : 'perc', kind: 'drum', pitch: p, voice: DRUM_VOICE[p] || 'perc', src, notes: ns.map(clean)}));
          }
        } else if (looksLikeDrums(t, name) || (DRUM_ROLES.has(nameRole(name)) && notes.every(n => n.d <= 0.6))) {
          // a single drum sound on its own track
          const r = nameRole(name), p = notes[0].n, gm = GM[p], role = DRUM_ROLES.has(r) ? r : gm ? gm[0] : 'perc';
          parts.push(part({name, role, kind: 'drum', pitch: p, voice: role === 'kick' ? 'kick' : role === 'clap' ? 'clap' : role === 'hats' ? (/open|\boh\b/i.test(name) ? 'ohh' : /ride/i.test(name) ? 'ride' : 'chh') : DRUM_VOICE[p] || 'perc', src, notes: notes.map(clean)}));
        } else {
          parts.push(part({name, role: null, kind: 'melodic', src, notes: notes.map(clean)}));
        }
      }
    }
  }
  if (!parts.length) throw Error(warnings[0] || 'No notes found in those files.');
  const loop = shape(parts, maxBeats);
  for (const p of parts) if (p.kind === 'melodic') { const nr = nameRole(p.name), st = stats(p.notes, loop.beats); p.role = nr && nr !== 'drums' && !DRUM_ROLES.has(nr) ? nr : melodicRole(st); p.stats = st; }
  for (const p of parts) { const r = ROLE[p.role]; p.follow = r.lane; p.color = r.c; }
  return finish(parts, {bpm: bpm ? Math.round(bpm * 100) / 100 : null, warnings, ...loop});
}
const clean = n => ({t: Math.max(0, n.t), d: Math.max(0.02, n.d), n: clamp(Math.round(n.n), 0, 127), v: clamp(Math.round(n.v || 100), 1, 127)});

// Loop length: the clip length when it is a whole number of bars, otherwise the notes rounded up to 1, 2, 4, 8, 16 or 32
// bars. Whole empty bars in front of every part (an arrangement export) are removed.
function shape(parts, clipBeats) {
  const all = parts.flatMap(p => p.notes), first = Math.min(...all.map(n => n.t));
  let shift = 0;
  if (first >= 16) shift = Math.floor(first / 4) * 4;
  if (shift) for (const p of parts) for (const n of p.notes) n.t -= shift;
  const lastStart = Math.max(...all.map(n => n.t)), lastEnd = Math.max(...all.map(n => n.t + n.d));
  let beats = clipBeats - shift;
  const whole = Math.abs(beats / 4 - Math.round(beats / 4)) < 0.02 && beats >= 4 && beats > lastStart;
  if (!whole) { const need = Math.max(lastStart + 0.01, Math.min(lastEnd, lastStart + 1)); beats = [4, 8, 16, 32, 64, 128].find(b => b >= need - 0.02) || Math.ceil(need / 4) * 4; }
  beats = Math.round(beats / 4) * 4;
  const bars = clamp(beats / 4, 1, 64);
  return {bars, beats: bars * 4, shifted: shift / 4};
}

function finish(parts, loop) {
  const beats = loop.beats;
  for (const p of parts) { p.notes = p.notes.filter(n => n.t < beats - 1e-6).sort((a, b) => a.t - b.t || a.n - b.n); }
  parts = parts.filter(p => p.notes.length);
  // order: drums (kick, clap, hats, perc), bass, then the music
  const ord = ['kick', 'clap', 'hats', 'perc', 'bass', 'lead', 'chords', 'pad', 'vox', 'fx'];
  parts.sort((a, b) => ord.indexOf(a.role) - ord.indexOf(b.role) || (a.pitch || 0) - (b.pitch || 0));
  const mel = parts.filter(p => p.kind === 'melodic').flatMap(p => p.notes);
  const key = mel.length >= 4 ? OT.detectKey(mel) : null;
  for (const p of parts) if (!p.sound) p.sound = defaultSound(p);
  return Object.assign({parts, key: key ? {pc: key.key, scale: key.scale, name: OT.keyLabel(key.key, key.scale), camelot: OT.camelot(key.key, key.scale)} : null}, loop);
}
function defaultSound(p) {
  if (p.kind === 'drum') return p.voice;
  const st = p.stats || stats(p.notes, 16);
  switch (p.role) {
    case 'bass': return st.dur >= 1.5 ? 'tp-sub' : st.perBar >= 10 ? 'tp-rolling' : 'tp-house-bass';
    case 'chords': return st.dur >= 1.5 ? 'organ-sustain' : 'chord-stab';
    case 'pad': return 'warm-pad';
    case 'vox': return 'vox-chop';
    case 'fx': return 'laser-zap';
    default: return st.perBar >= 10 ? 'tech-pluck' : st.dur >= 1 ? 'mono-lead' : 'rubber-stab';
  }
}
// change a part's role: its lane and colour follow, and a drum keeps its pad
function setRole(p, role) { const r = ROLE[role]; if (!r) return p; p.role = role; p.follow = r.lane; p.color = r.c; if (p.kind !== 'drum') p.sound = defaultSound(p); return p; }

// ---------- demo loops ----------
// 16 steps per bar: x = 100, X = 122 (accent), o = 64 (ghost), . = rest
function steps(pattern, bars, pitch, len = 0.12, swing = 0) {
  const s = pattern.replace(/\s|\|/g, ''), out = [];
  for (let b = 0; b < bars; b++) for (let i = 0; i < 16; i++) {
    const c = s[(b * 16 + i) % s.length];
    if (c && c !== '.') out.push({t: b * 4 + i / 4 + (i % 2 ? swing : 0), d: len, n: pitch, v: c === 'X' ? 122 : c === 'o' ? 64 : 100});
  }
  return out;
}
// [[step, length in 16ths, note, velocity?], …] over the loop
const seq = (list, vel = 100) => list.map(([s, l, n, v]) => ({t: s / 4, d: l / 4 * 0.92, n, v: v || vel}));
const chordAt = (list) => list.flatMap(([s, l, ns, v]) => ns.map(n => ({t: s / 4, d: l / 4 * 0.94, n, v: v || 96})));
function drumParts(src, lines, bars, swing = 0) {
  return lines.map(([pitch, pat, len]) => part({name: GM[pitch][1], role: GM[pitch][0], kind: 'drum', pitch, voice: DRUM_VOICE[pitch], src, notes: steps(pat, bars, pitch, len || 0.12, swing)}));
}
const DEMOS = [
  {id: 'warehouse', name: 'Warehouse techno', key: 'F minor', bpm: 132, bars: 4, blurb: 'Rolling 16th hats, an offbeat rumble bass, a dub stab, an acid riff and a drone.',
    make() {
      const D = {id: 'sd', name: 'Drums', file: 'demo', ch: 9}, bars = 4;
      const drums = drumParts(D, [[36, 'X...x...x...x...'], [39, '....x.......x...', 0.2], [42, '.o.x.o.x.o.x.o.o', 0.06], [46, '..x...x...x...x.', 0.18], [37, '......x....o.x......x.....x..x...', 0.08]], bars);
      const F1 = 41, Ab1 = 44, C2 = 48, Eb2 = 51;
      const bass = []; for (let b = 0; b < bars; b++) for (let beat = 0; beat < 4; beat++) for (const s of [1, 2, 3]) { const last = b === 3 && beat === 3; bass.push({t: b * 4 + beat + s / 4, d: 0.2, n: last ? (s === 3 ? Eb2 : C2) : (b === 1 && beat === 3 && s === 3 ? Ab1 : F1), v: s === 2 ? 110 : 88}); }
      const stab = []; for (let b = 0; b < bars; b++) for (const s of (b === 3 ? [3, 6, 10, 14] : [3, 10])) stab.push(...[53, 56, 60, 63, 67].map(n => ({t: b * 4 + s / 4, d: 0.3, n, v: s === 3 ? 104 : 90})));
      const acid = seq([[0, 1, 53, 118], [2, 1, 53], [3, 1, 65, 112], [5, 1, 53], [6, 2, 56, 118], [8, 1, 53], [10, 1, 60, 112], [11, 1, 53], [13, 1, 63, 118], [14, 2, 53],
        [16, 1, 53, 118], [18, 1, 53], [19, 1, 65, 112], [21, 1, 53], [22, 2, 56, 118], [24, 1, 53], [26, 1, 58, 112], [27, 2, 56], [29, 1, 53, 118], [30, 1, 51]], 92);
      const riff = [...acid, ...acid.map(n => Object.assign({}, n, {t: n.t + 8}))];
      return [...drums,
        part({name: 'Rumble bass', role: 'bass', kind: 'melodic', sound: 'tp-rolling', src: {id: 'sb', name: 'Rumble bass', file: 'demo', ch: 1}, notes: bass}),
        part({name: 'Acid riff', role: 'lead', kind: 'melodic', sound: 'acid-303', src: {id: 'sl', name: 'Acid riff', file: 'demo', ch: 2}, notes: riff}),
        part({name: 'Dub stab', role: 'chords', kind: 'melodic', sound: 'chord-stab', src: {id: 'sc', name: 'Dub stab', file: 'demo', ch: 3}, notes: stab}),
        part({name: 'Drone', role: 'pad', kind: 'melodic', sound: 'drone', src: {id: 'sp', name: 'Drone', file: 'demo', ch: 4}, notes: [41, 53, 60, 63].map(n => ({t: 0, d: 15.8, n, v: 80}))})];
    }},
  {id: 'tech-house', name: 'Tech house groove', key: 'A minor', bpm: 126, bars: 2, blurb: 'Shaker, congas, a bass that never touches the kick and an M1-style organ riff.',
    make() {
      const D = {id: 'sd', name: 'Drums', file: 'demo', ch: 9}, bars = 2, A1 = 45, G1 = 43, E1 = 40, C2 = 48, A2 = 57;
      const drums = drumParts(D, [[36, 'X...x...x...x...'], [39, '....x.......x...', 0.2], [42, '..x...x...x...x.', 0.07], [70, 'oxoooxoooxoooxoX', 0.05], [63, '...x..x...x..x.....x..x....x.x..', 0.1], [64, '.......x.......x......x.......x.', 0.1]], bars, 0.035);
      const bass = seq([[2, 2, A1, 112], [7, 1, A1], [10, 2, G1, 108], [14, 1, A1], [15, 1, A2, 104], [18, 2, A1, 112], [22, 1, E1], [26, 3, G1, 108], [29, 1, A1], [30, 2, C2, 104]], 96);
      const am7 = [57, 60, 64, 67], dm9 = [57, 62, 65, 69];
      const organ = chordAt([[3, 1, am7, 110], [6, 1, am7], [11, 2, am7, 104], [18, 1, am7, 110], [22, 1, dm9], [25, 1, dm9], [28, 2, am7, 104]]);
      return [...drums,
        part({name: 'Talking bass', role: 'bass', kind: 'melodic', sound: 'tp-house-bass', src: {id: 'sb', name: 'Talking bass', file: 'demo', ch: 1}, notes: bass}),
        part({name: 'Organ riff', role: 'lead', kind: 'melodic', sound: 'organ-stab', src: {id: 'sl', name: 'Organ riff', file: 'demo', ch: 2}, notes: organ}),
        part({name: 'Vox chop', role: 'vox', kind: 'melodic', sound: 'vox-chop', src: {id: 'sv', name: 'Vox chop', file: 'demo', ch: 3}, notes: seq([[6, 2, 69, 100], [9, 1, 72], [26, 2, 69, 100], [29, 2, 67]])})];
    }},
  {id: 'melodic', name: 'Melodic techno', key: 'D minor', bpm: 123, bars: 8, blurb: 'A 16th arp through Dm, B♭, F and C, an offbeat bass that follows the roots, a ride and a warm pad.',
    make() {
      const D = {id: 'sd', name: 'Drums', file: 'demo', ch: 9}, bars = 8;
      const drums = drumParts(D, [[36, 'X...x...x...x...'], [39, '....x.......x...', 0.25], [42, '..x...x...x...x.', 0.06], [51, '..o...x...o...x.', 0.3], [37, '...........o..o.', 0.06]], bars);
      const roots = [38, 34, 41, 36], chords = [[50, 53, 57], [50, 53, 58], [48, 53, 57], [48, 52, 55]], arpNotes = [[62, 65, 69, 74], [62, 65, 70, 74], [60, 65, 69, 72], [60, 64, 67, 72]];
      const bass = [], pad = [], arp = [], order = [0, 1, 2, 3, 2, 1, 0, 2];
      for (let c = 0; c < 4; c++) {
        for (let b = 0; b < 2; b++) for (let beat = 0; beat < 4; beat++) bass.push({t: (c * 2 + b) * 4 + beat + 0.5, d: 0.4, n: roots[c], v: 100});
        for (const n of chords[c]) pad.push({t: c * 8, d: 7.9, n, v: 84});
        for (let s = 0; s < 32; s++) arp.push({t: c * 8 + s / 4, d: 0.2, n: arpNotes[c][order[s % 8]] + (s % 16 === 15 ? 12 : 0), v: s % 4 === 0 ? 112 : s % 2 ? 78 : 94});
      }
      return [...drums,
        part({name: 'Offbeat bass', role: 'bass', kind: 'melodic', sound: 'tp-rolling', src: {id: 'sb', name: 'Offbeat bass', file: 'demo', ch: 1}, notes: bass}),
        part({name: 'Arp', role: 'lead', kind: 'melodic', sound: 'tech-pluck', src: {id: 'sl', name: 'Arp', file: 'demo', ch: 2}, notes: arp}),
        part({name: 'Warm pad', role: 'pad', kind: 'melodic', sound: 'warm-pad', src: {id: 'sp', name: 'Warm pad', file: 'demo', ch: 3}, notes: pad})];
    }},
  {id: 'deep', name: 'Deep house', key: 'C minor', bpm: 122, bars: 4, blurb: 'Swung hats, a syncopated bass and minor-ninth chords that answer each other.',
    make() {
      const D = {id: 'sd', name: 'Drums', file: 'demo', ch: 9}, bars = 4;
      const drums = drumParts(D, [[36, 'X...x...x...x...'], [39, '....x.......x..o', 0.2], [42, 'o.x.o.x.o.x.o.xo', 0.07], [70, '.o.o.o.o.o.o.o.o', 0.05], [46, '..............x.', 0.2]], bars, 0.045);
      const C2 = 48, F1 = 41, G1 = 43, Bb1 = 46;
      const bass = seq([[0, 3, C2, 104], [3, 1, C2], [6, 2, C2, 110], [10, 2, Bb1], [14, 2, G1], [16, 3, F1, 104], [19, 1, F1], [22, 2, F1, 110], [26, 2, G1], [30, 2, Bb1],
        [32, 3, C2, 104], [35, 1, C2], [38, 2, C2, 110], [42, 2, Bb1], [46, 2, G1], [48, 3, F1, 104], [51, 1, F1], [54, 2, G1, 110], [58, 2, Bb1], [61, 3, C2]], 96);
      const cm9 = [51, 55, 58, 62], fm9 = [51, 56, 60, 63];
      const keys = chordAt([[0, 3, cm9, 100], [6, 2, cm9, 88], [11, 4, cm9, 94], [16, 3, fm9, 100], [22, 2, fm9, 88], [27, 4, fm9, 94],
        [32, 3, cm9, 100], [38, 2, cm9, 88], [43, 4, cm9, 94], [48, 3, fm9, 100], [54, 2, fm9, 88], [59, 4, fm9, 94]]);
      return [...drums,
        part({name: 'Deep bass', role: 'bass', kind: 'melodic', sound: 'tp-sub', src: {id: 'sb', name: 'Deep bass', file: 'demo', ch: 1}, notes: bass}),
        part({name: 'Rhodes chords', role: 'chords', kind: 'melodic', sound: 'rhodes', src: {id: 'sc', name: 'Rhodes chords', file: 'demo', ch: 2}, notes: keys}),
        part({name: 'Bell', role: 'lead', kind: 'melodic', sound: 'bell-tick', src: {id: 'sl', name: 'Bell', file: 'demo', ch: 3}, notes: seq([[7, 1, 79, 90], [10, 1, 74, 80], [23, 1, 80, 90], [26, 1, 75, 80], [39, 1, 79, 90], [42, 1, 74, 80], [55, 1, 77, 90], [58, 1, 72, 80]])})];
    }},
];
function demo(id) {
  const d = DEMOS.find(x => x.id === id) || DEMOS[0], parts = d.make();
  for (const p of parts) { if (!p.stats && p.kind === 'melodic') p.stats = stats(p.notes, d.bars * 4); }
  const out = finish(parts, {bars: d.bars, beats: d.bars * 4, bpm: d.bpm, warnings: [], shifted: 0});
  out.demo = d.id; out.name = d.name;
  return out;
}

// Save and restore a loop (plain objects already)
const serialize = loop => ({bars: loop.bars, bpm: loop.bpm, name: loop.name, demo: loop.demo, key: loop.key, parts: loop.parts.map(p => ({id: p.id, name: p.name, role: p.role, kind: p.kind, pitch: p.pitch, voice: p.voice, sound: p.sound, src: p.src, notes: p.notes, mute: p.mute, solo: p.solo, level: p.level, entry: p.entry, follow: p.follow}))});
function revive(j) {
  if (!j || !Array.isArray(j.parts) || !j.parts.length) throw Error('This saved loop is damaged.');
  const bars = clamp(Math.round(+j.bars) || 4, 1, 64);
  const parts = j.parts.filter(p => p && Array.isArray(p.notes) && ROLE[p.role]).map(p => part(Object.assign({}, p, {notes: p.notes.map(clean), color: ROLE[p.role].c})));
  return Object.assign(finish(parts, {bars, beats: bars * 4, bpm: +j.bpm || null, warnings: [], shifted: 0}), {name: j.name, demo: j.demo});
}

return {ROLES, ROLE, DRUM_ROLES, GM, DRUM_VOICE, DEMOS, fromMidi, demo, setRole, defaultSound, nameRole, melodicRole, stats, looksLikeDrums, serialize, revive, part};
})();
/* transplant-loop:end */
