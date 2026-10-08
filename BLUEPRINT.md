# Blueprint: notes

[`blueprint.html`](blueprint.html) draws the arrangement of a reference track and finds every move in its
transitions. Drop in an MP3, WAV, FLAC, AAC/M4A, OGG or Opus file (AIFF in Safari). Everything is measured in
the page: nothing is uploaded, and it works offline.

Where [X-Ray](XRAY.md) answers *what is this track* (tempo, key, groove, loudness, tonal balance), Blueprint
answers *how is it built*: where each part comes and goes, and what happens in each transition, with the
numbers to rebuild it.

The page is generated: edit `blueprint-src/`, then run `node blueprint-src/build.mjs`. The build lifts X-Ray's
engine out of `xray.html` (with three small, checked patches in `blueprint-src/xr-source.mjs`), so the two pages
always share the same tempo, grid and loudness code.

## What you get

| Section | What's in it |
|---|---|
| The plan | Tempo, key, length, sections, moves found, how often the arrangement changes, sidechain depth, loudness. The sections as a strip you can click to loop, and the signature moves. With the demo, a table of every planted move against what was found. |
| The drawing | The whole track as an arrangement: sections, every move drawn to length as a dimension line, eight element lanes, the filter cutoffs over time, a spectrogram (whole mix, music only or drums only) with the cutoffs drawn on it, and a tension curve. Click to play, drag to loop, click a move to inspect it. |
| Inspector | For the selected move: what was measured, how sure the page is, the steps to rebuild it in Live, and for filter sweeps a breakpoint table (bar, Hz, CC value) for Auto Filter's Frequency. |
| The transitions | One card per section change: a zoomed drawing, what comes in and goes out, the moves leading into it, and the rebuild steps in time order. |
| Every move | A filterable list by category (filter, riser, drums, space, impact, glitch, mix). Click to loop. |
| Phrase by phrase | Eight-bar phrases with what joins, what leaves and what happens. |
| Mix motion | The sidechain pump curve per section, the music's stereo width and the tension curve. |
| To Ableton | Blueprint MIDI (section locators, one track per element with clips where it plays, rolls hit for hit, filter sweeps as CC74), the plan as Markdown, the data as JSON. |

## The moves

| Move | How it's found |
|---|---|
| Low-pass / high-pass sweep | A spectral edge moving steadily proposes a run. Every beat around it is then compared with the same beat of a four-bar loop once the filter is open, and fitted with a filter skirt (cutoff, slope, floor) using a robust fit, so a part entering can't decide it. The cutoff is tracked with a five-beat median. The music and the drums are then checked separately against the same reference to say what was filtered. |
| Section held under a low-pass | A section whose music is darker than similar sections (same kick and bass) by a clean skirt that holds against at least a third of them. |
| Noise riser | A steady climb of 9 dB or more between 1.5 and 6 kHz in a layer that is noise (flat inside each band, measured from the raw FFT bins). |
| Reverse cymbal / swell | The top end climbing 15 dB or more into a bar line, where the same spot a bar earlier doesn't. |
| Pitch riser / downlifter | A tonal peak (harmonic salience on the unsteady part of the spectrum) that glides at least 9 semitones, moving almost every frame, one semitone at a time. A melody steps and holds, and is rejected. |
| Tape stop | In the last beats before a section change, the whole spectrum slides down frame after frame, faster and faster. |
| Snare / clap roll | Percussive hits in the clap band that fill a subdivision grid (8ths, triplets, 16ths, 32nds), with the rate climbing. |
| Kick drop-out | The kick missing for 1–8 beats inside a kick section, then coming back. |
| Silence before a drop | The level 25 dB or more under the bars before, up to the bar line, where the same spot a bar earlier was full. |
| Crash / sub boom | A jump on a downbeat that the next two bars don't repeat: noise in the top end for a crash, the sub between the kick's tail and an offbeat bass for a boom. |
| Delay throw | After the drums stop: a chain of at least two repeats at a tempo-synced spacing, each 2.5–9 dB quieter than the last, from a hit on the 16th grid before the cut. |
| Reverb tail | After a cut, the drums ringing out with an RT60 of 1.3 s or more. |
| Stutter / gate | Within a beat, the level chopping 10 dB deeper than the section normally moves, periodic at 1/16, 1/32 or a triplet. |
| Sidechain | The 500 Hz–2.5 kHz band folded over beats 1 and 3 of every kick bar: highest before the kick, 4.5 dB or more down within 75 ms, climbing back exponentially. The release is read from that fit. |
| Width | The side signal of the sustained parts against their mid, ramping 6 dB or more between element changes. |
| Fade | The level gliding 9 dB or more over four bars or more while the spectrum keeps its shape. |

## Sections: six types, one definition each

Sections are found again with Blueprint's own features: the element lanes, the shapes of the harmonic and
percussive spectra, and the moves (a gap, a reverse swell or the end of a riser marks the bar after it).

Every section then gets exactly one of six types. The rules are tried in this order and the first that fits wins:

| Rule | Type | Definition |
|---|---|---|
| 1 | Drop | The full arrangement (kick and bass) within 2 dB of the track's loudest full section, arriving after a section without a kick, a lead-in move (riser, roll, gap, pitch riser, reverse swell, sweep, tape stop, kick drop-out), or, after the first full section, the clap returning or a jump of 3 dB. |
| 2 | Build | 16 bars or less, climbing into a full section: a riser, roll, pitch riser or sweep, or a level rise of 2.5 dB. |
| 3 | Break | No kick (under 30% of beats), between the first and the last full section. |
| 4 | Intro | Before the first full section. |
| 5 | Outro | After the last full section. |
| 6 | Groove | Anything else: the kick plays but it isn't a drop. |

Neighbouring sections of the same type are merged into one, so there's never an "Intro 1 / Intro 2"; the
change between them still shows in the phrases. Numbers only count repeats: Drop 2 is the second drop. Each
section carries the measured reasons for its type (what plays, its level against the loudest section, what
leads into it), shown in the plan, on the drawing and on each transition.

## Validation

`node blueprint-src/test.mjs` (add `--mp3` to include the MP3 round trip; needs ffmpeg) runs 30 checks.

- **The demo:** a 96-bar track synthesized by `blueprint-src/synth.js` with 17 moves at known bars and settings.
  Every one is found at the right place. Measured against the truth: the intro low-pass traced within half an
  octave at every beat (254 Hz → open, true 300 Hz → 12 kHz), the delay throw at 355 ms (true 357 ms, 3/16),
  the roll's 8ths, 16ths and 32nds starting on the right beats, the gap as 1 beat, the downlifter at −22 semitones
  (true −24), the pitch riser at +22 (true +24), the sidechain at 8.4 dB (true 8).
- **The control:** the same song with no effects at all. Blueprint must find nothing, and does: zero moves, and
  its sections come out exactly right (bars 1, 17, 33, 49, 65, 73, 89).
- **No extras:** in the demo, every reported move matches a planted one.
- **Variants:** the same checks at 118, 122 and 132 BPM, in other keys, at 44.1 and 48 kHz, each with its own control.
- **MP3:** the demo at 320 and 128 kbps finds the same moves as the WAV.
- **Sections:** only the six types, no two neighbours alike, every section with its reasons; the demo's sections and names are exact.
- **Exports:** the MIDI parses as a Standard MIDI File with markers, lanes, the roll and CC74 cutoff points.

## Limits

- A lead and the chords under it can't be separated in a full mix, so they share one lane.
- Sidechain is read where nothing else hits on the beat. In the demo's drops a lead hits on every kick, which
  hides the pump; the page says "no clear pump" there rather than guessing.
- The spectrum is read up to 10.5 kHz, so a low-pass counts as open once it passes about 8 kHz.
- Cutoffs are expected within about half an octave. A high-pass under a busy build (rolls and risers getting
  louder) reads high.
- A section that's darker by arrangement can't be told from one under a filter unless similar sections exist.
- Constant tempo is assumed, as in X-Ray.
- The demo is synthetic: it proves the detectors measure what they claim on signals with known answers, and
  stay silent when nothing happens. Real tracks are messier; every move has a "how sure" label and a loop
  button so you can check it by ear.
