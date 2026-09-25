# Fieldwork V2.1 — Artist Studies + Sound Bank

Open **studio-v2.html**, or refresh the existing studio tab, to use the expansion. The four V2 workbenches remain independent offline HTML files. Each now embeds the full catalog, generators and sound engine; no samples, external scripts or installation are needed.

## What is new

- **1,280 artist-inspired clips**: 32 profiles × five parts × eight treatments.
- **32 coordinated five-part sketches** in the second MIDI pack.
- **1,760 recipes total**, including all 480 original genre recipes.
- **48 tonal synthesizer patches and 16 drum kits** with separate selections for every track.
- Per-part level, tone, tempo-synced delay space and stereo pan.
- Instrument and mixer choices saved in portable session files. Older V2 sessions gain defaults when opened.

The ready-made second pack is **Fieldwork-V2-Artist-Studies-1312-MIDI.zip**. The original **Fieldwork-V2-504-MIDI-Library.zip** remains a separate genre collection.

## Artist profiles

There are **31 artist names and 32 profiles**: Tiësto has separate classic-trance and modern-club directions. Every row has melody, bass, chords, arpeggio and drums, with eight treatments per part.

| Artist | Study direction |
| --- | --- |
| deadmau5 | Progressive tension |
| Tiësto | Classic trance |
| Tiësto | Modern club |
| Karla Blum | Driving / rolling techno |
| Eric Prydz | Progressive lift |
| Boris Brejcha | Minimal melodic play |
| Charlotte de Witte | Acid pressure |
| Amelie Lens | Fast hypnotic drive |
| Adam Beyer | Groove-driven techno |
| Enrico Sangiuliano | Cinematic techno |
| Stephan Bodzin | Expressive mono line |
| Anyma | Melodic techno contrast |
| Tale Of Us | Nocturnal melodic space |
| ARTBAT | Peak melodic drive |
| CamelPhat | Deep melodic club |
| Lane 8 | Patient melodic warmth |
| Ben Böhmer | Flowing melodic house |
| Yotto | Progressive low-end pull |
| Bicep | Melancholic broken motion |
| Overmono | Broken club fragments |
| Fred again.. | Intimate club dialogue |
| Four Tet | Organic sequence play |
| Bonobo | Organic harmonic detail |
| Disclosure | Garage harmony |
| Daft Punk | French-house loops |
| Kerri Chandler | Deep house soul |
| Chris Lake | Bass-led club groove |
| FISHER | Direct tech-house bounce |
| Skrillex | Broken bass conversation |
| Noisia | Neurofunk fragmentation |
| Astrix | Psychedelic rolling motion |
| Peggy Gou | Bright house / electro |

These directions are creative interpretations for original composition exercises. The profiles supply their own melodic contours, bass rhythms and degrees, chord attacks, harmonic paths, arpeggio orders and drum placements. They are not exact song transcriptions, proprietary artist presets or claims that the artist uses these particular settings. No recordings or samples from artists are included.

Each profile has an explanation for each of its five parts and a suggested browser instrument. Eight treatments develop the profile: **Core motion, Offbeat dialogue, Wide release, Low lights, Broken mirror, Pedal tension, Climbing answer and Half-time space**. Changes include displaced replies, wider voicings, sparse chord tones, melodic inversion, pedal figures, altered kick/snare placement, tom turnarounds and sustained low notes. The tests verify eight different quantised note/rhythm/duration structures for each profile/part combination. Related artist profiles can share musical vocabulary; the count describes recipe entries rather than a claim of 1,280 entirely unrelated musical ideas.

## Browse, combine and export

1. Use **Artist / direction** in the library to browse a particular profile, or search names without worrying about accents: “Tiesto” finds “Tiësto”. The Library filter switches between artist studies, genre recipes and everything.
2. The **Start a complete artist study** selector above the sketch loads all five coordinated parts and suggested sounds. It keeps your root key and bar length, and uses the profile's native tempo, mode, harmonic path and groove settings. As with the Style selector, this replaces the sketch; Undo restores it.
3. Load an individual library entry to replace just that part. It uses your current key, harmony and sound choice. Locked parts must be unlocked before their recipe can be replaced.
4. Mix artist sources freely: for example, a deadmau5 melodic figure, a Disclosure bass pocket and Karla Blum drum study can all follow the same selected key and harmony.
5. Use **Suggested palette** to assign sounds suited to the five currently loaded recipes. It changes instruments without rewriting notes or mixer settings.
6. Export the selected part, audible sketch, separate parts or a 32-variation pack as before. Artist variation packs use eight treatments × four displacements with new seeds. Genre variation packs retain four treatments × eight displacements. These generated packs do not include hand edits; ordinary clip/sketch exports do.

The artist pack contains **1,312 MIDI files**, plus `catalog.json`, `START-HERE.txt` and `ARTIST-STUDIES.txt`. It is organised as `artists/<profile>/<part>/…` with a multitrack sketch in each profile folder. All factory files are eight bars, in A in the profile's native mode, at its native tempo. The catalog records the study description and suggested sound for every clip.

MIDI carries note events, timing, durations, velocity and metadata. Browser instruments and mixer effects are saved in session JSON, not in the MIDI. Load instruments in Ableton after importing the clips, as explained in [Ableton's MIDI guide](https://help.ableton.com/hc/en-us/articles/209068169-Understanding-MIDI-files).

## The sound bank

Every tonal track can select any of the **48 tonal sounds**, regardless of the recipe’s part. The drum track has its own **16 kits**. Sound selections can be changed while the sketch is playing. New notes use the new patch; existing releases and the short scheduling buffer can carry the previous sound briefly.

| Group | Sounds |
| --- | --- |
| Plucks & mallets — 10 | Analog pluck; wide detuned pluck; soft triangle pluck; glass pluck; FM tine pluck; digital pin pluck; dry saw sequence; kalimba-like tine; marimba-like mallet; crystal bell |
| Leads — 12 | Resonant lead; three-voice supersaw; twin saw lead; hollow square; brass stab; vowel-shaped lead; drawbar lead; vocal-colour pluck; talkbox-colour lead; digital FM lead; acid sequence; breathy triangle |
| Bass — 14 | Rounded saw; offbeat pluck; soft triangle sub; pure sine sub; rubber bass; acid bass; driven bass; organ bass; plucked string; picked disco; FM donk; FM growl; tight psy; twin Reese |
| Keys & pads — 12 | Slow synthetic strings; anthem chord stack; dark techno stab; house organ stab; cinematic pad; warm triangle pad; detuned square pad; felt-like keys; FM electric keys; synthetic piano; clav-like keys; metal FM bell |
| Drum kits — 16 | Club 909 study; trance 909 study; punchy house; warehouse; minimal clicks; hard 909 study; deep house; soft organic; break machine; UK garage; organic percussion; disco 707 study; bass breaks; neuro breaks; psy kit; long 808 study |

These are synthesized approximations and sketching timbres, including the piano, mallet and vintage-drum names. They use different combinations of subtractive synthesis, detuned voices, additive partials, frequency modulation, formant filtering, noise, distortion and amplitude/filter envelopes. The drum kits vary kick pitch and decay, snare body, clap bursts, noise colour, metallic hats and saturation. They are not sampled emulations of specific hardware.

The selected part's sound panel provides:

- **Part level:** gain for that part, independent of MIDI velocity.
- **Tone:** filter brightness. Tonal patches shift cutoff by semitones; drums use a gentler colour shift. Changes affect newly scheduled notes.
- **Delay space:** the amount sent to a filtered dotted-eighth delay. Feedback is bounded and shared by the selected part's notes.
- **Pan:** left/right placement. Bass defaults to the centre.

Sound changes and mixer adjustments are undoable and do not regenerate notes. Session JSON preserves sound IDs and mixer settings. The file remains version 2 compatible: older sessions without these fields receive suggested instruments and default mixer values. Unknown sound IDs or out-of-range mixer values are rejected on import.

The preview engine has a master gain, compressor, bounded feedback and a 160-note-group cap. Stop, page hide and navigation stop scheduled sources and disconnect effects. Long releases and delay tails are characteristics of the sound; they are not extra MIDI notes. For detailed portamento, sidechain and automation, finish the sound in Live.

## Reference and interpretation

The specifically requested deadmau5 direction draws on the broad idea of resolving melodic loops and drone-note references described in his [melodic-structures lesson](https://www.masterclass.com/classes/deadmau5-teaches-electronic-music-production/chapters/developing-melodic-structures). The actual pitches and rhythms here are newly authored.

Tiësto's two study directions are our interpretation of different areas of his dance-music career; his label's [artist page](https://www.blackholerecordings.com/artists/tiesto/) provides career context. Karla Blum's artist-operated [Never Be The Same page](https://karlablum.bandcamp.com/album/never-be-the-same) describes a rolling, driving techno direction, which informed the study's rhythmic focus. Four Tet's [Ableton composition demonstration](https://www.ableton.com/en/blog/four-tet-makes-track-10-minutes/) provides context for exploring small sequenced fragments. No source audio or melodies were extracted from these pages.

## Validation

Run the optional maintenance checks with:

```powershell
node v2-src/build.mjs --pack
node v2-src/test.mjs
node v2-src/test-audio.mjs
```

The MIDI/state checks cover all **1,760 recipes**, both ZIP packs, scale membership, determinism, tick boundaries, note-on/off pairing, channel assignment, eight-bar ends, the 32 artist sketches, eight structurally distinct treatments per artist/part, sound IDs, old-session migration, sound changes preserving notes, undo/redo and artist filters. The generated second pack is also checked byte-for-byte against the delivered archive.

The sound-engine checks exercise **576 tonal scheduling cases** across 48 patches and four roles, plus **192 drum cases** across 16 kits and all mapped percussion notes. They validate finite parameters, envelopes, source lifetimes, natural cleanup, stopping, mixer silence and the voice cap using a strict Web Audio graph double.

These checks do **not** measure the audible timbre, real-browser performance or actual Ableton import. No browser interaction or listening QA was performed for this update. The local preview is served from the same standalone files.
