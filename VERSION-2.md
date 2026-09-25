# Fieldwork V2

**Update: V2.1 adds the Artist Studies + Sound Bank expansion.** The studio now includes 1,760 recipes, 32 artist profiles and 64 synthesized sounds/kits. See [ARTIST-STUDIES.md](ARTIST-STUDIES.md) for the additions. The original 480-recipe library and its 504-file pack described below remain available as the Genre collection. Each page defaults to the Artist Studies library; Reset filters shows both collections.

Open **studio-v2.html** to start (or pick it from the home page, `index.html`). Every V2 page is a complete offline application with its own styles, catalog, generator, piano roll, synthesis and exporters. You can copy any one of the four V2 HTML files elsewhere and keep making music; links to the other guides require those files beside it.

## What changed

V1 is a strong set of production lessons, with a rhythm-first approach, audible comparisons and focused labs. Its main limitation for writing new music was fragmentation: the melody guide had 25 era presets, the chord guide had 16 progressions, and the low-end guide had ten sound archetypes but no MIDI export. The 66-block groove bank supplied rhythmic vocabulary, but it did not provide a large connected melodic library. Most edits also disappeared on reload.

V2 adds four workbenches alongside all 16 existing reference pages:

| Page | Starting view |
| --- | --- |
| `studio-v2.html` | Complete five-part studio and all 480 recipes |
| `melody-v2.html` | Melody library, phrase development and riffs |
| `chords-v2.html` | Chord library, harmonic paths and voicing |
| `bass-v2.html` | Bass library, articulation and kick/bass context |

Each workbench has access to the entire catalog. These are focused entry points into the same tools, so you can compose a complete sketch from any page. `field-guides-v1.html` retains the previous guide index, with dead Ear Training links removed and the previously orphaned disco guide included. The V1 labs received navigation links; their synthesis and lesson logic remain intact.

## The library

**480 original recipe clips = 24 genres × 5 parts × 4 treatments.** The four treatments are Statement, Conversation, Release and After hours. They change rhythm, phrase response, articulation, register, voicing and space; they are not key transpositions presented as extra presets.

The five parts are melody, bass, chords, arpeggio and drums. Genre recipes draw on 24 original melodic vocabularies, 18 bass articulations, ten chord rhythms, ten arpeggio orders, twelve drum families and two harmonic paths per genre. Related genres intentionally share some vocabulary. The 48 harmonic-path assignments include recurring dance-music progressions; they are not a claim of 48 unique mathematical chord sequences. All patterns are procedural composition recipes, not hand-transcribed recordings.

Styles: deep house; disco/French house; piano house; tech house; minimal/microhouse; Afro house; organic house; melodic house; progressive house; melodic techno; Detroit techno; dub techno; hard/industrial techno; acid; uplifting trance; psytrance; UK garage; bass house; breakbeat/electronica; electro; liquid drum & bass; neurofunk; dubstep/halftime; future bass.

Search supports genres, artist listening references, emotions, techniques and part names. Filter by each independently and save favourites. Artist names describe creative starting points for original patterns; the library contains no song transcriptions, artist samples or claim of endorsement.

## Make a sketch

1. Choose a **Style** to load a matching melody, bass, harmony, arpeggio and drum arrangement. Each style supplies its native tempo, mode and swing. Your root key remains selected.
2. Set key, mode, 4/8/16 bars and a four-chord path. Chord selectors are scale degrees **1–7**; actual chord names appear beside them. Modes include major, natural minor, Dorian, Phrygian, Lydian, Mixolydian, harmonic minor and melodic minor.
3. **M** mutes a part; **S** solos it. Use the part name to choose the editor. Locks protect parts during new variations and performance-control regeneration.
4. Load a library recipe to replace only its corresponding part, in the current sketch's key and harmony. A locked part must be unlocked first.
5. Generate new material using emotion, density, gate, swing, humanisation, voicing, phrase arc and seed. Seeded generation is reproducible. Effects differ by musical role: for example, chord density drops whole hits, not random voices; drum density retains kick/snare anchors.
6. Edit pitches, positions, lengths and velocity in the piano roll. Click an empty cell to add; drag a note to move; double-click to erase. Numeric controls and the note selector provide an alternative to dragging. Arrow keys move pitch/time; Shift+vertical arrow moves an octave. Direct pitch editing can intentionally leave the scale.
7. Try reverse, contour inversion, a sixteenth shift, call-and-response, thinning, staccato or octave shifts. These transform only the selected part. Pitch transformations are disabled for drums.
8. Save a session JSON file to preserve notes, settings, recipes, locks, mutes and solos. Open it from any V2 page. Browser saves are optional and local; file-origin storage may differ across pages/browsers. File saves are the portable option.

Key, mode, bar length and harmony changes regenerate all parts, including locked ones, to rebuild coherent material. Changing Style starts a fresh matching sketch and clears its track flags. Other generation controls affect unlocked parts. Undo/redo retains up to 40 changes in the current session. Track locks protect generation; they do not prevent explicit note edits or transformations. Importing a saved session is undoable.

Space starts/stops preview unless a form control or button has focus. Escape stops audio. `/` focuses search. Playback stops when the page becomes hidden, when editing material, or when navigating away. Preview is intentionally lightweight Web Audio synthesis, with a gain stage and compressor; it is not intended to reproduce the referenced artists' sounds.

## MIDI export

| Export | Contents |
| --- | --- |
| Selected MIDI | Current notes of the selected part, including hand edits |
| Sketch MIDI | Audible parts, respecting mute/solo, in separate named tracks |
| Separate parts ZIP | Five individual current clips, including muted parts |
| 32 variations ZIP | Four recipe treatments × eight timing displacements, with new seeds and current settings; excludes hand edits |
| Matching recipes ZIP | All recipes matching the library filters, factory settings |
| Full library ZIP | 480 factory clips + 24 coordinated five-part sketches + catalog and instructions |

The full library is also already generated as **Fieldwork-V2-504-MIDI-Library.zip**. Extract it and browse by genre/part. Factory packs use **A in each native mode**, the native genre tempo and eight bars. Export from the workbench to use a different key, tempo, phrase length or your edits.

Individual clips use SMF0. Sketches with multiple audible parts use SMF1 and a conductor track. A sketch with one audible part uses SMF0. Timing resolution is 480 PPQ. Files include track names, tempo, 4/4 and a text description of key/harmony. Notes are quantised to MIDI ticks; swing and humanisation are written into note positions. Track ends preserve trailing silence to the exact selected bar boundary. Overlapping notes of the same pitch/channel are shortened at retrigger to avoid stuck or prematurely released notes.

MIDI is note data, not audio. It does not encode these preview patches, glide, slide, sidechain, filter automation, effects or an Ableton instrument rack. Add those in Live. Velocity supplies accent cues but must be mapped in the instrument to create timbral accents.

Ableton supports SMF0 and SMF1; drag files from Explorer/Finder or Live's browser onto MIDI tracks. SMF1 carries separate tracks. Load instruments yourself: Live does not automatically assign General MIDI sounds. Set Live's session tempo as desired and check the imported clip's loop bracket. These workflows are documented in [Ableton's MIDI guide](https://help.ableton.com/hc/en-us/articles/209068169-Understanding-MIDI-files).

Drum pitches: 36 kick, 37 rim, 38 snare, 39 clap, 42 closed hat, 45 low tom, 46 open hat, 63/64 conga, 70 shaker, 75 claves, 76 woodblock. Configure Drum Rack pads accordingly. Display names follow Live's convention: MIDI note 60 is C3.

## Validation and maintenance

The optional `v2-src` directory contains the authoring sources. No Node runtime, server, installation or build is needed to use the delivered HTML pages. To maintain all four consistently, edit the sources and run:

```powershell
node v2-src/build.mjs --pack
node v2-src/test.mjs
node v2-src/test-audio.mjs
```

The checks independently parse all 480 factory MIDI clips and all 24 sketches, verify event boundaries, channels, note-on/off matching, scale membership, deterministic generation, trailing silence and ZIP checksums/central directory. Additional checks cover extreme settings across modes/keys/phrase lengths, transforms, repeated pitches, empty clips, state history, track locks, session validation and standalone page structure. The app-state tests use a DOM stub; they are not real browser interaction tests.

Automated validation does not establish musical taste or replace auditioning in Live. No real-browser visual/audio QA or actual Ableton import was performed in this task. The delivered files were checked as MIDI data and static HTML, and the local preview was served successfully.

The V1 documentation remains below the V2 introduction in README.md as a historical technical inventory. Its original gaps and counts describe V1, not the current V2 studio.
