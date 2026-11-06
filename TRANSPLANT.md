# Transplant: your loop in someone else's arrangement

[`transplant.html`](transplant.html) is for the moment every producer knows: eight great bars and no track. Drop in a
reference track you love (or pick one of six built-in shapes) and your loop's MIDI. Transplant measures the
reference's arrangement, **where each part comes in and out and every move in its transitions**, and rebuilds all
of it on **your own parts**. Then it measures how close the shape is, lets you A/B it against the reference at the same
bar, and hands it to Ableton as arranged MIDI, FX audio and stems.

Like every Fieldwork page it is one self-contained file. The reference is decoded and measured in the page; nothing is
uploaded. It works offline, and on the GitHub Pages site.

The page is generated: edit `transplant-src/`, then run `node transplant-src/build.mjs`.

## 01 The arrangement to borrow

| Source | What you get |
|---|---|
| **A reference track** (MP3, WAV, FLAC, AAC, OGG, Opus; AIFF in Safari) | Measured in the page by X-Ray's and Blueprint's own engines: tempo, sections, seven element lanes per beat, every move (filter sweeps with their cutoff traced, risers, reverse swells, pitch risers and downlifters, rolls hit for hit, kick drop-outs, gaps, delay throws, reverb tails, stutters, tape stops, crashes, booms, width, fades), sidechain depth and release per section, tension. The audio is kept for the A/B. |
| **Blueprint → "Transplant my loop into this"** | The analysis and the audio file are handed over in the browser (IndexedDB, same origin), so nothing is measured twice and the A/B is ready. |
| **A Blueprint `.json`** | Version 2 (from this release) carries every move's exact beats and numbers and the lanes per beat. Version 1 files still work: positions are read from their bar.beat text and the lanes from their spans. A JSON file has no audio, so no A/B. |
| **A built-in shape** | Six original archetypes: peak-time techno, tech house club mix, melodic techno journey, hypnotic techno, deep house roller, hard techno / neo-rave. They are common conventions of each style, written as sections, lanes, how full each lane is and every move to the beat. They are not transcriptions of any record. |

### Reading the lanes

Blueprint gives a value per beat for kick, clap, hats, sustained highs, bass, chords/synths and noise. Transplant reads
each lane per bar (a drum lane by its two strongest beats, since a clap on 2 and 4 is 0, 1, 0, 1; a sustained lane by
its mean), then finds the cheapest on/off path through the bars with a two-state Viterbi segmentation. Switching
costs least on an 8-bar line, more on a 4-bar line and most on an odd bar, and less again on a section line or where a
lead-in move ends. The result is the lane as an arranger would draw it: a one-bar blip on bar 6 is ignored, a one-bar
drop at the end of a phrase is kept.

Filter curves are smoothed with isotonic regression (a sweep moves one way; the jitter of the measurement doesn't), and
reduced with Ramer–Douglas–Peucker to the fewest breakpoints that redraw the curve within a sixth of an octave. Those
are the breakpoints the plan gives you for Auto Filter.

## 02 Your loop

Drop several MIDI files at once (one per part, as Live's **Export MIDI Clip** writes them), or one file with several
tracks. Up to 32 files and 64 bars.

- **Drum Rack clips are split by pad**: channel 10, a drum name, or short notes on General MIDI drum keys with a kick on
  36. Each pad becomes its own part (kick, clap, closed hat, open hat, rim…) so each can enter when the reference
  brings in its own, and they are put back together on one track when exported.
- **Roles** come from the name first (kick, clap, hat, perc, bass, sub, chord, stab, pad, lead, arp, vox, fx and their
  usual spellings), then from the notes: a low monophonic line is a bass, three or more notes at once are chords (a pad
  when they are long), anything else is a lead. Change any of them.
- **Loop length** is the clip length when the file says it (Live writes the clip end), otherwise the notes rounded up
  to 1, 2, 4, 8, 16 or 32 bars. Four or more empty bars in front of every part (an arrangement export) are removed.
- The key comes from the notes (Krumhansl–Kessler); the preview kick is tuned to the key's root nearest 52 Hz.
- Pocket's, Orbit's and Talk's MIDI exports read with the right roles.

Four demo loops are built in: warehouse techno (F minor, 132), tech house groove (A minor, 126), melodic techno
(D minor, 123) and deep house (C minor, 122).

## 03 The transplant

**Which bars each part plays.** Every part follows one lane: kick → kick, clap → clap, hats and percussion → hats,
bass → bass, lead, chords, pad and vocal → chords/synths, FX → noise. When several parts follow one lane they are
**stacked**:

- The main layer plays wherever the lane plays. In grooves and drops that is the hook (lead), then the chords, then
  the pad; in breaks, intros and outros the pad leads. On the hats lane the closed hat leads, then the percussion, then
  the open hat and ride.
- Every other layer is decided per **phrase** (8 bars from each section start). The lane's fullness in a phrase is its
  measured level (for shapes, how full the lane is written) and the reference's tension, ranked across the lane's
  phrases. With R layers, layer r plays in phrases whose fullness rank is at least r/R: the second of three plays in
  the fuller two thirds, the third in the fullest third. A layer only plays where every layer below it does.
- So layers always arrive on a phrase line, one at a time, where the reference gets fuller. Switch stacking off, or set
  any part to *with the lane*, *second layer*, *third layer*, *drops only*, *breaks only*, *every bar* or *never*.

Click or drag on a part's row to switch bars on or off yourself; Alt-click gives a bar back to the reference,
Shift-click does a whole phrase. Undo (Ctrl+Z) covers every change.

**Your notes, laid out.** The loop is tiled across the arrangement; with *start each section on bar 1 of the loop*
every section begins at the top of your loop, so an 8-bar progression always starts on its first chord, and notes stop
at the section line. A part entering mid-loop re-strikes a held note that started earlier in the loop, so a pad doesn't
arrive silent.

**Every move, rebuilt on your parts.**

| Move | What happens to your loop |
|---|---|
| Low-pass / high-pass sweep | The curve, per 16th, on the group it was measured on (drums, music, or the whole mix; the shapes can also target the synths without the bass). In the preview a 24 dB/oct filter follows it; in the MIDI it is CC74 on every track of that group. |
| Section under a filter | The same, held for the section. |
| Snare / clap roll | Written on your clap (or a Roll track if you have none), hit for hit. From audio, the reference's own hits are snapped to the subdivision its roll plays at that moment (8ths, 16ths, 32nds…); from a shape, every step of each subdivision, getting louder. |
| Kick drops out | Your kick cut for those beats. |
| Silence before the drop | Every note cut and every send gated, for exactly that long. Silences are applied last, so a roll or a throw can't break one. |
| Delay throw | The hit that is really there (your clap, vocal, lead or chords, in that order) echoed at the measured note value, quieter each time by the measured step; the throw stops where your part comes back. |
| Stutter / gate | Your own first slice repeated at the measured grid on every part playing there. |
| Tape stop | In the preview, the whole mix slows down: a delay line whose delay grows quadratically, which lowers the pitch the way a slowing tape does, with a closing low-pass. In the MIDI, the synths bend down and the drums stop halfway. |
| Riser, reverse cymbal, pitch riser, downlifter, crash, sub boom | Synthesized to length at your tempo: noise through a rising band-pass, a swelling metallic noise, detuned saws gliding the measured number of semitones, a long metallic crash, a falling sine. FX MIDI tracks too, and an FX audio pack named by bar. |
| Sidechain | Your kick ducks the bass and synths by the reference's measured depth and release in each section. |
| Fade, reverb tail | Played in the preview; written in the plan. |
| Width | Written in the plan (Utility's Width in Live). |

**Producer touches** are the things a producer would do that the reference can't show. Each is counted and each can be
switched off for a strictly faithful transplant: stacking layers by fullness, starting each section on bar 1 of the loop,
holding chord stabs through breaks (each chord rings until the next), phrase-end fills from your own drums in grooves and
drops (the kick leaves beat 4, or the clap adds a pickup; skipped wherever the reference does something itself), and
landing every drop with a crash and a sub boom where the reference has none.

### Hear it

The preview plays your parts through Orbit's 37 patches plus three bass patches, a synthesized drum kit (a sine kick with a
pitch drop and a click, tuned to your key, layered clap, six-oscillator metallic hats, ride, shaker, rim, toms and congas pitched by note,
cowbell, crash), the group filters, sidechain, reverb and delay. **R** switches to the reference at the same bar, each
at its own tempo, loudness-matched: the page renders your loudest 8 bars offline, measures them with X-Ray's BS.1770
meter and turns the reference down (or up) to match.

## 04–06 Measured

- **Shape match**: the rank correlation (Spearman) between the reference's tension and your arrangement's energy, bar by
  bar. Your energy counts what plays in each bar, each part weighted by role (kick 3, bass and clap 2.5, hats and synths
  1.5, percussion 1…), how open its group's filter is and how hard it is played, plus the risers. Rank correlation, so a
  louder or quieter mix doesn't move it. From audio, the reference's tension is Blueprint's (loudness, brightness, how many
  parts play, rising noise); for shapes and old JSON it comes from the lanes and the risers.
- **How often something changes**: bar lines where the set of playing parts changes or something happens (a move, a fill,
  an FX), against the same count for the reference; and the longest stretch with no change. Your loop alone never
  changes.
- **Lanes followed**: the share of bars where the main part of each lane plays exactly where the reference's lane does,
  and which lanes have no part of yours.
- **Moves rebuilt**: on your own parts or as FX at your tempo; the rest play in the preview and are written in the plan.

These numbers count bars, notes and lanes. They show whether the transplant holds the reference's shape. They don't
measure taste, the mix, or whether the drop is any good.

## 07 Into Live

- **Parts (.zip)**: one MIDI file per track of your loop (a Drum Rack clip comes back as one file, every pad on its own
  note), each starting at bar 1 with the section markers, the filter sweeps as CC74 and, for a tape stop, pitch bend.
  Plus the FX MIDI tracks, the plan and a README. Drop each file on the track that already holds its instrument.
- **One arranged MIDI**: the same tracks in one file, to drop into an empty arrangement.
- **FX audio (.zip)**: every riser, swell, pitch riser, crash and boom rendered to length at your tempo, named by the bar
  where it starts.
- **Mix (.wav)** and **Stems (.zip)**: the preview rendered offline, 44.1 kHz stereo 16-bit, a stem per track plus FX.
  Long tracks are rendered in 16-bar chunks with two bars of warm-up each, so held notes and reverb tails carry across
  the joins.
- **Plan (.md)**: every section and what plays in it, every move with what happened to your loop and its recipe for
  Live, the filter breakpoints (bar, Hz, CC74), the sidechain per section and the numbers.
- **Session**: everything (the arrangement, your loop, your choices and painted bars) saved to a file, and kept in this
  browser between visits. The reference's audio is not saved: drop the track again for the A/B.

## Limits

- A lead and the chords under it can't be told apart in a full mix, so the reference has one lane for both. Which of your
  parts comes first in that lane is a convention you can change per part.
- The reference's lanes come from audio. A part that plays quietly under a busy mix can read as absent. Check the lanes
  against your ears, and paint bars on or off.
- Constant tempo and 4/4 are assumed, as in X-Ray and Blueprint.
- MIDI CC74 reaches a synth that has learned it; Auto Filter on a group in Live needs the breakpoints drawn as automation.
  No Live Set (`.als`) is written.
- The preview is a sketch of your parts on Orbit's synths, not your instruments. The A/B compares arrangements, not
  sounds, and a reference in another key or tempo still plays in its own.
- The hand-off from Blueprint uses the browser's storage for this site. Some browsers keep `file://` pages apart; then
  download Data (.json) in Blueprint and drop it here.

## Build and verification

```
node transplant-src/build.mjs          # writes transplant.html (X-Ray's and Blueprint's engines, Orbit's theory and patches, Transplant)
node site/build.mjs
node transplant-src/test.mjs           # 20 engine groups, including the analysed Blueprint demo track
node site/check.mjs
node transplant-src/browser-check.mjs  # Playwright: 28 checks, artifacts in /tmp/transplant-qa
```

`test.mjs` checks the segmentation, smoothing and breakpoint maths; every shape against what it says; Blueprint JSON
version 2 round-tripping exactly and version 1 giving the same sections and moves; MIDI loops in every layout (a Live
multitrack export with a Drum Rack, one file per part, an arrangement export with empty bars in front, Pocket's
export); and every shape × every demo loop against the arrangement grammar: no note in a gap, no kick in a kick-out,
layers only where their lane plays and entering on phrase lines, rolls on the grid of their subdivision, throws decaying,
every move rebuilt, the main layers following their lanes in every bar, and the arranged MIDI reading back note for note.
Over the 24 shape × loop combinations the shape match is at least 0.76 and 0.91 on average. The analysed demo track is
transplanted onto every demo loop with every measured move handled.

The browser check plays the page, switches shapes while playing, loads three MIDI files, paints and undoes a bar,
switches off a family of moves, renders the drop, the build, the break and each FX offline (finite, audible, peak at
or below full scale), checks that the gap before the drop renders silent, downloads every export, analyses the demo
track in the page and A/Bs it loudness-matched, follows the hand-off from Blueprint with its audio, and checks the phone
layout. These checks are about correctness and signal integrity; how it sounds still needs your ears, and the MIDI a manual
Ableton audition.
