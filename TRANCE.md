# TRANCE / Beyond the ordinary

Open [trance.html](trance.html) directly in a browser. This is a self-contained offline page, with a red-and-black design, inline vector artwork, embedded MIDI data and local Web Audio synthesis. No setup, dependencies, fonts, samples or server are required. Links to artist/label references need the internet.

## What is included

- All 12 `material/Trance_melody_*.mid` files, embedded byte-for-byte and individually downloadable unchanged. Each contains 64 notes over four bars; none specifies a tempo.
- 16 original eight-bar studies across uplifting, classic, progressive, Balearic, tech, hard, Goa and psytrance.
- Six treatments per study: original, octave lift, call and response, triplet orbit, slow burn and chord weave. This gives 168 arranged sketches.
- A melody/chord/bass piano roll, suggested chord names and actual octave-specific voicings, a written chord-top melody, sustained/pulsed/arpeggiated chord motion, root-following bass, simple drums, key transposition and tempo controls.
- Independent audible-part toggles, 16 synthesized voices, volume, a moving playback cursor, Space to play/stop and Escape to stop. Playback stops when the page is hidden.
- 24 artist perspectives with reference tracks, descriptions and writing exercises. Selecting an artist loads a matching original study and voice, and keeps the exercise visible in the studio.
- 16 sound-design recipes with starting settings, modulation ideas, troubleshooting and sound auditions.
- Three interactive arrangement templates, writing exercises and DAW/mixing guidance.
- Locally saved favourites and studio settings, when browser storage is available. Storage failure does not prevent use.

## Exports

The page exports a single melody, chord or bass track, or a complete four-part Type 1 Standard MIDI File. Files contain tempo and 4/4 metadata at 480 PPQ. Full exports always include all four parts; mute buttons affect preview listening only.

“Untouched source” downloads the embedded original bytes. “Original” in the studio retains source pitches, start times, durations and velocities before any requested transposition. Added harmony is explicitly a suggested interpretation. Sparse pitch sets do not identify a unique key or chord progression.

“Download all 168 sketches” builds a ZIP using each study's default tempo, original key and sustained chords, independent of current studio controls. A ready-made copy is also available as [Fieldwork-Trance-168-Sketches.zip](Fieldwork-Trance-168-Sketches.zip).

Import MIDI into separate DAW tracks and assign instruments. The drum map uses kick 36, clap 39 and closed hat 42. Octave labels use C4 = MIDI 60; some DAWs display a different octave number for the same note.

## Content boundaries

Artist descriptions are listening interpretations of selected records/eras. Exercises are original and do not transcribe or recreate the reference recordings. Multiple artist perspectives intentionally share the underlying style studies, with their own exercise and suggested voice.

Browser voices are simplified sketches, not native synth patches. Recipe instructions include layering, reverb, sidechain, oscillator reset, pulse-width movement and slide techniques that are not all modelled by the preview. Sound-design values and tempo ranges are starting points rather than universal rules. Arrangement energy is a creative density/intensity guide, not a loudness measurement.

Primary listening references linked in the page include Armada's trance history, Anjunabeats' artist roster, Ferry Corsten's site and Armin van Buuren's Communication release page. Reference descriptions and practical exercises are original editorial text.

## Authoring and verification

Sources are in `trance-src/`. Rebuild after editing:

```text
node trance-src/build.mjs
node trance-src/pack.mjs
node trance-src/test.mjs
node trance-src/check.mjs
node trance-src/check.mjs --width=390
node trance-src/check.mjs --width=320
node trance-src/check.mjs --width=768
node trance-src/check.mjs --file
```

The browser checker uses installed Chrome with an isolated temporary profile, a loopback-only server, and synthesized audio. It never connects to a personal browser profile. Reports and screenshots are stored in `trance-src/qa/`. Capture with `--capture`, optionally `--width=390` and `--section=studio`, `--section=pianoRoll`, `--section=sounds` or `--section=arrangement`.

Validation covers:

- Eight dependency-free test suites, including exact original-file preservation; every treatment, chord motion and available key transposition; 504 MIDI combinations parsed back into notes with paired note-offs, correct tempo and complete loop lengths; individual exports; and all 168 ZIP entries with validated CRCs and central-directory offsets.
- Desktop, 768px, 390px, 320px and direct-file browser runs: 892 interaction assertions each, including every study/treatment, filters, empty states, key/tempo controls, piano-roll layers, chord motion, favourites, artist exercises, sounds, arrangement stages, exports, live audio start/stop, mute toggles, keyboard shortcuts and page overflow.
- 24 offline audio renders per browser run: all 16 sound voices and eight full style mixes, checking finite, audible output without sample clipping. The full mixes are rendered at maximum preview volume and 170 BPM.
- Visual inspection of desktop and mobile layouts. These automated checks do not establish subjective sound quality, test every browser, or replace importing MIDI into an actual DAW.

The home page (`index.html`), the shared top bar and the Rumble page link to the trance room. The V2 source template also carries the link so it survives future V2 builds.
