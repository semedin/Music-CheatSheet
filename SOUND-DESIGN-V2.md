# Sound Design V2 — Make the sound in Serum 2

Open **[serum-v2.html](serum-v2.html)**. This is the second edition of the sound-design guide, separate from the Fieldwork composition studios. The original [serum.html](serum.html) remains available.

## Start here

1. Press **Start from zero** and follow the first-session walkthrough with Serum open.
2. Build **Round sub**, **Rolling techno bass**, then **Deep house chord stab**.
3. Use **Hear & learn** to compare amplitude and filter envelopes. Store A, change one setting and listen again.
4. Follow **Eight weeks** for 40 practice sessions. Each week ends with a skill check rather than an automatic promise of mastery.
5. Keep notes on your changes. Download a notebook backup before moving the HTML file or changing browsers.

## Included

- **Techno rumbles:** eight additional studies covering tight rolling, deep cavern, offbeat bounce, dotted-delay gallop, industrial grind, gated tails, reverse inhales and a tuned Serum sub-pulse alternative. Includes a beginner Ableton routing walkthrough, per-style settings and listening targets, a tempo-aware envelope-planning diagram, rendering/Serum playback advice, chapter export and print support. The original 48-recipe library and its notebook IDs stay intact.
- **48 original recipes:** 10 basses, 8 chords/keys, 8 leads, 6 pads, 10 drums/percussion and 6 transitions/textures.
- Six ordered build stages per recipe, numeric starting settings, oscillator/filter routing, an amplitude diagram, a listening checkpoint, diagnosis, two variations, mix advice and a recall challenge.
- Search by sound, style or descriptive word; role and difficulty filters; favourites; per-recipe built/recalled marks and notes.
- **42 simplified synthesized browser sketches** and raw-source comparisons. Six recipes involving recorded sources deliberately require the real source in Serum.
- One downloadable MIDI test per recipe, with tempo, velocity, note lengths, chord voicings and selected slide overlaps. Two bars each except the four-bar riser. MIDI contains notes, not a Serum preset.
- Beginner setup, clickable signal-path map, modulation instructions, a searchable **54-term dictionary**, **16 diagnostic entries**, tempo-to-millisecond calculator and an eight-week learning plan.
- Print the current recipe, download an individual Markdown recipe, or download the full handbook.
- **[Serum-2-Sound-Design-Handbook.md](Serum-2-Sound-Design-Handbook.md)** is also included as a standalone written companion.
- Local autosave when available, plus validated JSON notebook import/export. Import merges marks and preserves existing notes; excessively long merged notes are left unchanged.

## Scope and accuracy

The controls and routes were checked against available Xfer documentation, linked in the guide. Basic Shapes and the factory Keys/Choir categories were also checked against the installed library. Settings are original educational starting points. The 48 patches have **not** been built and auditioned inside the Serum plug-in for this release. No native Serum preset files are supplied.

Browser audio uses Web Audio, not Serum. It demonstrates broad source, envelope, pitch/FM and rhythmic ideas. It does not reproduce Serum filter models, exact FM scaling, wavetable scans, sync warp, glide, sample engines or full effects chains. Recorded-source recipes have no substitute preview. Rendered signal checks verify finite, non-silent output and peak headroom; they are not listening or plug-in validation.

The guide explicitly distinguishes sustain level from time, −∞ dB from 0 dB, mono voicing from mono audio, MIDI pitch from DAW octave labels, modulation base from depth, and kick-reactive sidechaining from a repeating LFO. Fixed oscillator chords and recorded chords use single-note test MIDI.

## Files and maintenance

The delivered HTML contains its own styles, scripts, catalog and audio engine. It has no runtime dependencies, external fonts, analytics or required network requests. Optional source links require internet. Notebook data remains in the browser or the user’s exported JSON file.

Authoring files are in `sound-design-src`:

- `template.html`, `style.css`: layout and responsive/print design.
- `lessons.html`, `learning.js`: written lessons, glossary, diagnosis and course.
- `catalog.js`: original recipe data.
- `rumble.html`, `rumble.js`: the rumble chapter, eight DAW/Serum workflows, character selector, timing diagram and chapter export. These do not add audio previews or native effect racks.
- `audio.js`: simplified synthesis, envelope scheduling, test patterns and MIDI writer.
- `app.js`: navigation, library, notebook, learning lab and exports.
- `build.mjs`: generates `serum-v2.html` with Node and no dependencies.
- `check.mjs`, `check-browser.js`: isolated Chromium validation and screenshots; reports in `qa`.

Build with `node sound-design-src/build.mjs`. Verify with `node sound-design-src/check.mjs`, `node sound-design-src/check.mjs --mobile`, and `node sound-design-src/check.mjs --file` for direct local-file loading. Capture with `--capture` (and optionally `--mobile`). The runner currently uses Chrome at its standard Windows installation path. It creates an isolated temporary profile and does not use personal browser sessions. The browser check also regenerates the Markdown companion.

## Verification

Desktop, 390px mobile and direct local-file runs cover recipe rendering, combined filters, favourites, safe note display, notebook round-trip/import merging, practice completion, section navigation, horizontal overflow, stored A/B values, MIDI event parsing and note closure, all 42 available audio sketches, playback stopping and full handbook completeness. The rumble update adds coverage for all eight selectors, bookmarked studies, timing calculations and chapter/full-handbook export; each run passes 770 assertions. Desktop and mobile screenshots are inspected separately; add `--rumble` to a capture command to capture that chapter. These checks do not test a DAW or native Serum sound output.
