# Fieldwork V3 — Motif Studio / expanded edition

Open **[fieldwork-v3.html](fieldwork-v3.html)**. It runs by itself, offline, including its sound bank and both MIDI collection generators. V1 and V2 HTML files and their MIDI archives have not been replaced.

**Expanded edition:** 69 styles (up from 36) and 120 artist perspectives (up from 43), focused on house and techno. There are six new writing approaches, seven new preview voices and three new drum kits. The original 36 styles and 43 perspectives still generate exactly the same ideas from the same seeds.

## Start with a hook

1. Choose a style or an artist perspective. Filter the list by family, search by artist name, or use the **perspective chips** under the style name to switch artists within a style. Press **Play** to hear the two-bar motif with bass and drums.
2. Press **New idea** until a starting point interests you. The seed reproduces an unedited generated idea; a session file preserves your edits.
3. Click notes to edit pitch, position, duration and velocity. Drag notes to move them. Shift-click or use **Protect** to preserve a note through generation and development. Explicit manual editing, transposition and scale changes still change protected notes.
4. Compare **A different pocket**, **A melodic turn** and **A new way home**. These target rhythm, selected pitches or the ending. **Use this** adopts a version; Undo restores the previous one.
5. Listen to the **Full phrase**. A repeats the original motif, A′ changes articulation, and B develops the ending. Choose a harmonic path underneath. “Adapt unprotected landing notes” deliberately changes phrase landings; the source motif remains intact.
6. Keep promising branches on the shelf. Download a **session JSON** before closing the page to preserve them between visits.
7. Export into Ableton, choose your instruments, and develop the idea further.

The piano roll edits the two-bar source. The full phrase view shows its development. Supporting parts are generated from the motif and harmonic path; their preview sounds, levels, enable switches and solos are independently adjustable. They are not full piano-roll editors in this release.

## What changed musically

V3 has a new composition engine in `v3-src/engine.js`. It does not call the V2 genre or artist melody generators.

- A persistent motif replaces the previous per-chord moving note pool. Changing the underlying chord does not automatically transpose the hook.
- Fourteen writing approaches. The first eight cover singable hooks, rave leads, hypnotic riffs, percussive motifs, cinematic phrases, rolling sequences, broken rhythms and disco figures. The expanded edition adds six:
  - **Stab:** clipped offbeat hits, where the silence after each hit is part of the hook.
  - **Piano:** 3-3-2 house riffs that rock between brighter chord tones.
  - **Vocal chop:** quick repeated syllables answered by one longer note.
  - **Sequence:** chord-tone arpeggios that cycle across the bars.
  - **Acid:** 303-style lines with accents, octave jumps and legato slides. Slides are written as notes that reach the next attack; set glide on your mono synth in Live.
  - **Jack:** swung, bass-register riffs with octave jumps.
- Pitch contours now include zigzag, pedal (a fixed anchor alternating with a moving upper voice), climb and answer, alongside arch, fall and rise.
- Pitch shapes combine recurring anchors, small connecting moves and selected larger intervals. A pitch-reach control constrains the vocabulary.
- Rhythm cells span two bars. Space, held notes, short attacks and phrase-ending contrast are explicit musical choices.
- Phrasing happens after composition: A / A / A′ / B, A / A / A / A, A / A / B / A, or A / B / A / B. Eight- and sixteen-bar outputs are supported.
- Velocity follows rhythmic accents; subtle performance timing is repeatable. Swing and human touch are included in MIDI exports, with the same performance settings used in preview.
- Bass preferentially uses rhythmic gaps and respects upcoming kick attacks. Chords use nearby inversions and two-bar harmonic changes. Arps enter where the melody leaves space. Some support parts can be intentionally sparse or silent.
- New styles also bring their own groove: offbeat open hats for house, rolling hats, broken UK-bass kicks, a three-step afro-tech kick, rolling/octave/syncopated basslines, and sustained, piano (3-3-2) or offbeat chord rhythms.

Artist perspectives are original, broad writing studies. They adjust the style, contour and repetition behaviour. The expanded perspectives also have writing traits:

- Call and answer: bar two repeats bar one, then only the last two notes answer.
- Octave-jump chance, register shift, articulation (short or legato) and attack density.
- Largest leap, pitch reach, tempo, scale, swing and preview sound.

They are not artist-trained models, song transcriptions, endorsements or exact sound reproductions. Emotion controls are creative directions, not universal emotional formulas.

## Styles and sound

69 styles cover techno (31), house (25), disco (3), trance (5) and broken beats (5).

**Original 36:** big melodic hooks, rave/trance techno, cinematic melodic, peak-time, hypnotic/raw, minimal techno, hardgroove, industrial/EBM, hard techno, psy-techno, acid/live sequences, schranz, bleep, tribal, ambient, Detroit, dub techno; progressive, melodic, deep, minimal/microhouse, tech house, afro house, stutter house, disco/French house; indie/dark disco, Italo; classic trance, hard trance, future rave, psytrance; melodic breaks, UK garage, electro, liquid drum & bass, amapiano.

**New techno (14):** melodic techno sequences, acid techno/303, dark stab techno, big-room techno, Swedish loop techno, Birmingham/raw loop, UK bass techno, groovy/Latin techno, modular/hypnotic sequences, deep/atmospheric techno, trance-techno, neo-rave/euro bounce, ghettotech, gabber/hardcore.

**New house (17):** Chicago jack, acid house, 90s piano house, soulful/NY garage house, 90s organ house, vocal/diva house, lo-fi house, deep tech, rominimal, bass house, speed garage, future house, electro house, hard house, organic house, afro tech/3-step, progressive sequences.

**Also new:** nu-disco/cosmic and uplifting trance.

**120 artist perspectives.** The original 43: Kölsch, Paul Kalkbrenner, I Hate Models, Marlon Hoffstadt, Klangkuenstler, Innellea, Kevin de Vries, Mind Against, Massano, Adam Beyer, Karla Blum, Ben Klock, Rødhåd, Oscar Mulero, Hawtin/Plastikman, Ben Sims, Chlär, DJ Rush, Perc, VTSS, SNTS, Indira Paganotto, Reinier Zonneveld, deadmau5, Eric Prydz, Lane 8, Ben Böhmer, two Tiësto perspectives, Paul van Dyk, Chicane, Bicep, Bonobo, Disclosure, Fred again.., Daft Punk, Peggy Gou, Kerri Chandler, Black Coffee, Boris Brejcha, Stephan Bodzin, Charlotte de Witte and Astrix.

**77 new perspectives:**

- **Techno (30):** Amelie Lens, Emmanuel Top, Enrico Sangiuliano, Dax J, Tale Of Us, Anyma, ARTBAT, Mathame, Colyn, Donato Dozzy, Lucy, Trym, SPFDJ, DJ Heartstring, DJ Godfather, Sara Landry, Blawan, Surgeon, Regis, Chris Liebing, Cari Lekebusch, Joel Mull, Joseph Capriati, Paco Osuna, Jeff Mills, Derrick May, Carl Craig, Robert Hood, Anfisa Letyago, Adriatique.
- **House (42):** Solomun, Âme, Joris Voorn, Sasha, John Digweed, Hernán Cattáneo, Frankie Knuckles, Green Velvet, Marshall Jefferson, DJ Pierre, Hardfloor, Masters At Work, Larry Heard, Moodymann, Todd Terry, MK, Honey Dijon, Armand Van Helden, Chris Lake, FISHER, John Summit, Hot Since 82, Jamie Jones, Oliver Heldens, Tchami, AC Slater, Justice, Boys Noize, DJ Seinfeld, Ross From Friends, Rhadoo, Petre Inspirescu, Ricardo Villalobos, &ME, Rampa, Adam Port, Caiiro, Enoo Napa, Bedouin, Monolink, BK, Purple Disco Machine.
- **Disco, trance and garage (5):** Todd Terje, Lindstrøm, Armin van Buuren, Above & Beyond, Todd Edwards.

59 tonal voices and 19 synthesized kits are embedded.

- **Earlier V3 additions:** a log-drum study, a neutral triangle writing voice, a sustained soft mono lead and a rave organ.
- **New voices:** hoover, 90s house piano, acid squelch/303, vocal chop (formant, not a sampled voice), jacking square bass, minor chord stab and dub chord.
- **New kits:** Chicago drum machine, rumble techno and tight tech house.

These are preview synthesizers, not sampled recordings or Ableton presets. Changing them does not change the notes.

## Take it into Ableton

- **Melody MIDI:** the complete eight- or sixteen-bar developed melody.
- **Enabled parts MIDI:** the enabled tracks in one format-1 file. Preview solo state does not remove enabled tracks from this export.
- **Idea family ZIP:** the original two-bar motif, five individual full-length parts and a complete five-part sketch. All parts are included, regardless of preview enable/solo state.
- **Preview WAV:** the complete phrase using the current listening mode and preview mix, stereo 44.1 kHz / 16-bit PCM, with a two-second effect tail.

MIDI uses 480 PPQ, explicit tempo, a 4/4 time signature, track names and complete note-offs. Individual clips use format 0; multitrack sketches use format 1. Each track ends at the intended phrase length, including trailing silence. Check Live’s tempo and clip loop brackets after import. MIDI pitch 60 is labelled C3 in the interface.

Drum map: 36 kick, 37 rim, 38 snare, 39 clap, 42 closed hat, 46 open hat, 45 tom, 63/64 percussion. Use or map these pitches in your Drum Rack. Open hats (46) appear in the house-style grooves of the expanded edition.

MIDI includes notes, durations, velocity and performance timing. It does not contain browser audio, synth patches, slides or effect automation. WAV captures the browser sound. Choose your final instruments in Live.

## Import and sessions

MIDI import accepts beat-timed Standard MIDI Files in format 0 or 1, up to 4 MB. Select a track and identify its key and scale. The first two bars containing notes become the source motif; initial empty bars are removed. Simultaneous notes reduce to the highest pitch, and overlapping melodic notes are trimmed into a single line. Import ignores drum-channel notes, controllers and pitch bends. Key and scale settings guide accompaniment without transposing the imported pitches.

Session JSON preserves the complete motif, protected notes, configuration, preview mix and up to 30 saved ideas. File contents are validated before replacing the current session; Undo also restores the previous session. V2 session files remain usable in V2 and are not automatically converted here.

## Ready-made collections

- [Fieldwork-V3-1104-Style-Studies.zip](Fieldwork-V3-1104-Style-Studies.zip): 69 styles × 8 seeds × melody + sketch = **1,104 MIDI files**.
- [Fieldwork-V3-960-Artist-Studies.zip](Fieldwork-V3-960-Artist-Studies.zip): 120 artist perspectives × 4 seeds × melody + sketch = **960 MIDI files**.

These replace the first-edition 576 and 344 archives. They are strict supersets: every first-edition MIDI file is included byte for byte, and the first-edition recipes appear unchanged at the start of each `recipes.json`.

Each archive includes reproducible configurations and source motifs in `recipes.json`, plus Ableton import notes. These are generated study collections; they have not all been individually auditioned or hand-curated.

## Verification

`node v3-src/build.mjs --pack` rebuilds the standalone page and both archives, without rewriting V1 or V2.

`node v3-src/test.mjs` verifies:

- **Backward compatibility:** the original 36 styles and 43 perspectives reproduce stored fingerprints (`v3-src/legacy-fingerprints.json`). These cover melody, all five parts, all three development tools, performed timing and harmony, across 75 seeded configurations per style and 25 per perspective.
- **Styles:** 4,140 combinations of style and seed, deterministic generation and exact A-section repetition.
- **Development tools:** protected notes survive rhythm, pitch and ending changes. Rhythm edits preserve pitch order, pitch edits preserve timing and lengths, and ending edits preserve the opening.
- **Artists:** 2,880 perspective/seed cases. The tests check the tempo, scale, swing and reach overrides, exact call-and-answer repetition, and that every preview sound exists.
- **Distinct writing:** new perspectives never wrote the same motif as a sibling perspective or the plain style at the same seed (0 of 1,692 comparisons). New styles do not share rhythms with styles using the same approach.
- **Audible traits:** octave perspectives produce octave leaps, acid lines contain slides, melodic sequences use a wider range, house styles use open hats and piano chords, and afro tech uses a three-step kick.
- **MIDI:** valid note bounds and MIDI at all supported modes, representative root extremes, both phrase lengths and extreme performance settings.
- **Archives:** correct format, note-offs and phrase-end timing for all **2,064 delivered MIDI files**, and byte-for-byte reproducibility of both archives.
- **Import:** MIDI running status, multitrack imports, polyphonic reduction and malformed-file rejection.
- **App:** bootstrap, undo/redo, shelf/session recovery and separation of sound choices from MIDI notes. Every style and perspective is opened through the UI, along with the family filter and accent-insensitive artist search.

In the 60-seed test for every style, all 60 motifs were structurally distinct. Across the full style mix, the tested two-bar motifs averaged about 6.8 semitones of range and 50% adjacent repeated pitches. `validation.json` breaks these down by writing approach; for example, sequences average about 12 semitones with 20% repeats, while hypnotic riffs average 3 semitones with 73%. These are diagnostics, not musical-quality targets or comparisons between identical musical corpora.

The expanded edition also fixes a rhythm-tool edge case. When a protected note was still sounding, or three attacks sat within half a beat, **A different pocket** could reorder or drop an unprotected note. Those notes now stay in place.

Real Chrome integration checks run with:

```text
node v3-src/browser-check.mjs
node v3-src/browser-run.mjs
node v3-src/browser-run.mjs --mobile
```

The dependency-free runner starts an isolated headless browser and a temporary localhost test server. It verifies actual rendered controls, MIDI and session file inputs, exports, playback startup/stop, and PCM rendered through Web Audio.

- All 59 tonal preview patches render audible audio.
- All 19 kits render kick, clap and open hat.
- Solo and five-part WAV renders are checked for non-silence and hard clipping.
- Every style and all 120 perspectives open in the real page, along with the family filter, perspective chips and artist search.

Desktop and an actual 390-pixel iframe viewport each pass 172 browser assertions. Screenshots are in `v3-src/qa`.

The browser connection supplied by the app was unavailable; these checks used a separate local Chrome process. No actual Ableton import or human listening review was performed. Musical usefulness remains a listening decision.

## Current boundaries

This release concentrates on motif writing and development. It does not yet provide arbitrary section arrangement, independent polymetric lane lengths, per-chord duration/quality editing, sample import, sound automation or a complete production curriculum. Phrase harmony currently changes in two-bar blocks. Artist influence is strongest in melody writing; it does not model every artist’s full production process.

Some of the original 43 perspectives write the same motif at the same seed as a sibling in their style (107 of 876 same-seed comparisons). Examples are Ben Klock and Oscar Mulero, Innellea and Stephan Bodzin, and Perc and SNTS. The app keeps the seed when you switch perspective, so switching between such a pair may not change the notes; press **New idea**. They are kept seed-stable here so first-edition seeds and recipes still reproduce. The 77 new perspectives do not have this issue.

The HTML remains entirely local. The optional source directory supports authoring and tests. V3 reuses the established MIDI/ZIP writers and sound-bank foundation, with its own audio engine copy for advance-scheduled WAV rendering and its own composition engine.
