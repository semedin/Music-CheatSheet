// The single list of everything in this folder that a person can open.
// index.html and the shared top bar on every page are generated from it by
// `node site/build.mjs`; `node site/check.mjs` fails when a page is missing here.
//
// To add a page: drop the .html file in the root folder, add an entry to one of
// the SECTIONS below (and to NAV if it deserves a top-bar slot), then run
// `node site/build.mjs && node site/check.mjs`.

export const SECTIONS = [
  {
    id: 'write',
    title: 'Write ideas',
    blurb: 'Studios that generate, edit and export MIDI. Start here when you want notes to drag into Ableton.',
    pages: [
      {file: 'fieldwork-v3.html', title: 'Motif Studio', edition: 'V3', badge: 'Latest',
        text: 'Write a two-bar motif, then grow it into an 8- or 16-bar phrase. 69 styles, 120 artist perspectives, 59 preview voices and 19 drum kits.',
        doc: 'VERSION-3.md', src: 'v3-src'},
      {file: 'trance.html', title: 'Trance — beyond the ordinary', edition: 'New',
        text: '12 supplied melodies plus 16 studies across eight trance styles: 168 arranged sketches with chords, bass and drums, 24 artist perspectives and 16 sound recipes.',
        doc: 'TRANCE.md', src: 'trance-src'},
      {file: 'studio-v2.html', title: 'V2 Studio', edition: 'V2',
        text: '1,760 MIDI recipes across 24 genres and 32 artist profiles, with five coordinated parts, 48 instruments and 16 drum kits.',
        doc: 'VERSION-2.md', src: 'v2-src'},
      {file: 'melody-v2.html', title: 'Melody lab', edition: 'V2',
        text: 'Hooks, riffs and arpeggios. Shape the rhythm first, then develop the phrase.', src: 'v2-src'},
      {file: 'chords-v2.html', title: 'Harmony lab', edition: 'V2',
        text: '48 harmonic paths across 24 styles, with bass and melody in context.', src: 'v2-src'},
      {file: 'bass-v2.html', title: 'Bass lab', edition: 'V2',
        text: '18 bass articulations and 96 starting recipes, from sub to acid.', src: 'v2-src'},
    ],
  },
  {
    id: 'drums',
    title: 'Drums & low end',
    blurb: 'Rhythm, kick and bass.',
    pages: [
      {file: 'drum-library.html', title: 'The Kit — drum studio', edition: 'Studio',
        text: '48 style studies, 192 pattern takes, nine synthesized kits, a morph lab and Splice search guidance.',
        doc: 'DRUM-STUDIO.md', src: 'drum-library-src'},
      {file: 'rumble.html', title: 'Rumble', edition: 'Lab',
        text: 'Techno rumble laboratory: 24 sound studies, 10 motion modes, one-track Ableton racks and WAV stems.',
        doc: 'RUMBLE.md'},
      {file: 'low-end.html', title: 'Low End', edition: 'Guide',
        text: 'Kick and bass as one instrument: tuning, sidechain and phase, measured.'},
      {file: 'groove-cheatsheet.html', title: 'Groove', edition: 'Guide',
        text: 'Placement, length and velocity. 25 playable patterns and a 32nd-note workbench.'},
      {file: 'groove-vol2.html', title: 'Pattern Bank', edition: 'Guide',
        text: '66 rhythmic building blocks across 29 genres, with a four-slot melting pot.'},
    ],
  },
  {
    id: 'sound',
    title: 'Sound design',
    blurb: 'Build the sounds themselves.',
    pages: [
      {file: 'serum-v2.html', title: 'Sound Design V2 — Serum 2', edition: 'V2',
        text: '48 house and techno recipes, step-by-step builds, eight techno rumble studies and an eight-week course.',
        doc: 'SOUND-DESIGN-V2.md', src: 'sound-design-src'},
      {file: 'serum.html', title: 'Serum 2 — the 90% path', edition: 'Guide',
        text: 'The original Serum guide: a six-move build order, 22 recipes and six A/B demos.'},
      {file: 'patch-lab.html', title: 'Patch', edition: 'Guide',
        text: 'A subtractive + FM synth with ten patches that build themselves one stage at a time.'},
      {file: 'sampling.html', title: 'The Cut', edition: 'Guide',
        text: 'Chopping, warping and slicing, with real onset detection and a granular stretcher.'},
    ],
  },
  {
    id: 'harmony',
    title: 'Melody, harmony & playing',
    blurb: 'How notes relate, and getting them under your fingers.',
    pages: [
      {file: 'melody.html', title: 'Melody', edition: 'Guide',
        text: 'Rhythm, contour and development, with 25 rhythm cells and a phrase builder.'},
      {file: 'chords.html', title: 'Voicing', edition: 'Guide',
        text: 'Progressions and voice leading. Same four chords, 68 semitones of movement down to 12.'},
      {file: 'between.html', title: 'Between', edition: 'Guide',
        text: 'How two parts relate: one melody against 12 harmonies, collisions, motion and register.'},
      {file: 'inkey.html', title: 'In Key', edition: 'Guide',
        text: 'Transposing samples: the exact Transpose value, a clash meter and the Camelot wheel.'},
      {file: 'keyboard.html', title: 'Keyboard', edition: 'Guide',
        text: 'Play from zero on a two-octave controller. Web MIDI input, 30 progressions and scored drills.'},
    ],
  },
  {
    id: 'arrange',
    title: 'Arrange & finish',
    blurb: 'Structure, order of work and development.',
    pages: [
      {file: 'arrangement.html', title: 'Arc', edition: 'Guide',
        text: 'Arrangement and transitions: a section map, eight templates and twelve transitions.'},
      {file: 'buildorder.html', title: 'Build Order', edition: 'Guide',
        text: 'What to touch first, and why, with A/B labs, a session timer and a constraint spinner.'},
      {file: 'the-move.html', title: 'The Move', edition: 'Guide',
        text: '24 rhythm and harmony transformations, each heard as a strict A/B.'},
      {file: 'disco-house-cheatsheet.html', title: 'Disco house', edition: 'Sheet',
        text: 'The original one-page disco house reference sheet.'},
      {file: 'field-guides-v1.html', title: 'Field guide index', edition: 'V1',
        text: 'The original V1 index: search the guides, the "I have a problem" table and reading paths.'},
    ],
  },
];

export const DOCS = [
  {file: 'README.md', title: 'README', text: 'What is in this folder and how it fits together.'},
  {file: 'VERSION-3.md', title: 'Fieldwork V3 notes', text: 'Motif Studio workflow, design decisions and limits.'},
  {file: 'VERSION-2.md', title: 'Fieldwork V2 notes', text: 'V2 workflow, catalog structure and Ableton setup.'},
  {file: 'ARTIST-STUDIES.md', title: 'Artist studies', text: 'The V2 artist roster, sound bank and MIDI pack.'},
  {file: 'TRANCE.md', title: 'Trance notes', text: 'Trance room contents, exports and validation.'},
  {file: 'DRUM-STUDIO.md', title: 'Drum studio notes', text: 'The Kit: workflow and validation.'},
  {file: 'RUMBLE.md', title: 'Rumble notes', text: 'Rumble lab workflow and validation limits.'},
  {file: 'SOUND-DESIGN-V2.md', title: 'Sound Design V2 notes', text: 'Scope, start-here steps and validation.'},
  {file: 'FIELD-GUIDES-V1.md', title: 'V1 field guides', text: 'Every original guide described in detail.'},
  {file: 'Serum-2-Sound-Design-Handbook.md', title: 'Serum 2 handbook', text: 'The full written sound-design handbook.'},
];

export const DOWNLOADS = [
  {file: 'Fieldwork-V3-1104-Style-Studies.zip', title: 'V3 style studies', text: '1,104 MIDI files: 552 ideas, melody + full sketch.'},
  {file: 'Fieldwork-V3-960-Artist-Studies.zip', title: 'V3 artist studies', text: '960 MIDI files: 480 ideas, melody + full sketch.'},
  {file: 'Fieldwork-Trance-168-Sketches.zip', title: 'Trance sketches', text: '168 four-part trance sketches: 16 studies × six treatments + 12 sources.'},
  {file: 'Fieldwork-V2-504-MIDI-Library.zip', title: 'V2 MIDI library', text: '480 genre clips + 24 five-part sketches.'},
  {file: 'Fieldwork-V2-Artist-Studies-1312-MIDI.zip', title: 'V2 artist studies', text: '1,280 clips + 32 five-part sketches.'},
];

// The shared top bar. `match` lists extra pages that highlight this item.
export const NAV = [
  {file: 'index.html', label: 'Home'},
  {file: 'fieldwork-v3.html', label: 'Motif Studio'},
  {file: 'studio-v2.html', label: 'V2 Studio', match: ['melody-v2.html', 'chords-v2.html', 'bass-v2.html']},
  {file: 'trance.html', label: 'Trance'},
  {file: 'drum-library.html', label: 'Drums'},
  {file: 'rumble.html', label: 'Rumble'},
  {file: 'serum-v2.html', label: 'Sound design', match: ['serum.html', 'patch-lab.html', 'sampling.html']},
  {file: 'field-guides-v1.html', label: 'Field guides',
    match: ['groove-cheatsheet.html', 'groove-vol2.html', 'low-end.html', 'melody.html', 'chords.html', 'between.html',
      'inkey.html', 'keyboard.html', 'arrangement.html', 'buildorder.html', 'the-move.html', 'disco-house-cheatsheet.html']},
];

// HTML files in the root that are deliberately not listed on the home page.
export const UNLISTED = ['index.html'];

// Build templates that should carry the shared top bar, so a rebuild keeps it.
export const TEMPLATES = [
  'v2-src/template.html',
  'v3-src/template.html',
  'sound-design-src/template.html',
  'drum-library-src/template.html',
  'trance-src/template.html',
];
