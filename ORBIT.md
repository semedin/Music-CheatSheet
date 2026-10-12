# Orbit: notes

[`orbit.html`](orbit.html) is the arpeggio studio: arps, riffs and sequences for twelve genres, from deep tech
house to trance. Pick a key and a progression (or drop in your own chord MIDI), start from one of 129
patterns or let the generator write some, hear them on a synthesized sound with drums and a bassline
under them, check them against the genre's measured fingerprint, and take the MIDI to Ableton.

Like every Fieldwork page it is one self-contained file: every sound is synthesized in the page, nothing is
uploaded, and it works offline (Google Fonts fall back to system fonts).

The page is generated: edit `arp-src/`, then run `node arp-src/build.mjs`.

## The model: two cycles

An arp here is two cycles turning against each other.

- **The note cycle** is the *pool* (chord tones, triad, chord + 9th, scale from the root, pentatonic, root +
  5th, octaves, root only) extended over 1–4 octaves and put in an *order*: up, down, up-down, down-up, up &
  down, converge, diverge, pinky (top-note pedal), thumb (bottom-note pedal), shuffle, random, or a
  **written sequence** of pool indices (`0 0 2 0 4 0`: 0 is the lowest note, 7 in a 7-note pool is the octave).
- **The step pattern** says which steps play, at 1/4, 1/8, 1/8 dotted, 1/8 triplet, 1/16, 1/16 triplet or
  1/32. Each step is a rest, a note, an accent, a chord hit (the whole voicing), a pedal note (the lowest or
  highest pool note, without moving the cycle), a tie, or a note with an octave jump, a ratchet (×2, ×3), a
  slide or a chance below 100%.

The cycle moves on **each note** (as Ableton's Arpeggiator does) or on **each step** (as a hardware step
sequencer does), and restarts every bar, every 2 or 4 bars, on each chord or never. When the two lengths
differ, the pattern rotates against the bar line: three notes over eight hits a bar take three bars to come
back; a five-step pattern with three notes takes fifteen. The **cycle counter** says how long, and the orbit
shows it: steps on the outer ring, the note cycle on the middle ring, and inside it the pool with the figure
the order draws (up is a polygon, converge a star, pinky a fan).

**Harmony.** Progressions are typed as roman numerals or chord symbols, mixed freely: `i VI III VII`,
`Am7 Fmaj7 C G`, `i7 iv9`, `G:2` for a chord that lasts two slots. Plain numerals are degrees of the chosen
scale (in A minor, `VI` is F); numerals with an accidental are read against the major scale, as borrowed
chords usually are (`bVII` in A is G). Chords are voiced near the register and **voice-led**: each one takes
the inversion closest to the last. "Root position" is there to hear the difference. With *Follow chords*
off, the pool stays on the tonic while the chords move under it.

**Chord import.** Drop a `.mid` anywhere on the page. The most polyphonic track is used (choose another if
the file has several), its pitch sets are read beat by beat and merged while they stay the same, each
segment is named against 20 chord templates, and the key comes from Krumhansl–Kessler profiles with the
first chord deciding between relative keys. **The imported voicings are kept**, shifted whole octaves to
the register, so the arp plays your exact chords. *Edit as text* turns them into a progression you can edit.

**Evolution.** Ten presets move cutoff, resonance, decay, the reverb send, the gate, the density,
the octave range and the note count across the phrase (or on a 2-, 4- or 16-bar period): Slow open,
Breathe, Build to the drop, the 64-bar journey, Add a note every quarter, Gate pump, Pluck to pad, Dark
ride, Riser in the last quarter, Thin to full. **Fills** change the last bar of every 2/4/8/16 (drop the
last beat, octave climb, ratchet, roll in, answer in reverse, stutter) and **Change a note** swaps one note
of the cycle in every other block of 2, 4 or 8 bars.

## The fingerprint

Seven numbers measured from the notes, on a still four-bar loop and the unswung grid:

| Axis | Definition |
|---|---|
| Density | Note starts per bar (a chord hit is one). |
| Syncopation | Share of notes whose next stronger metrical position has no note of its own. Full 16ths score 0; off-beat 8ths score 100%. |
| Kick clash | Share of notes that start on a quarter note, where a four-on-the-floor kick sits. |
| Range | Semitones from the lowest to the highest note. |
| Leap | Average jump between consecutive notes (top note of a chord hit). Not counted when most notes are chord hits. |
| Length | Average note length in 16ths. |
| Swing | Swing of the off-16ths (50% straight). Only counted when notes land there. |

Each genre has a range on every axis, set from its conventions and then checked against the bank: every one
of the 129 patterns sits inside its own genre on all seven axes, and `test.mjs` fails if one drifts out. Fit
is 100 inside every range and drops with the distance outside. **Fixes** are candidate edits (rotations,
thinning, Euclidean fills, gate, swing, octaves, order) that are each measured before they are offered, and
only shown when they raise the fit.

A separate meter shows how many notes sit under 165 Hz (E2 in Live), where the bass lives, and while the
page plays it reads the arp's actual output after its high-pass from an analyser.

## The generator

*New ideas* writes 140 combos from the genre's grammar: weighted rates, pattern lengths, pattern shapes
(Euclidean, off-beat, gallop, full, tresillo, 2-step, sparse), pools, orders, accents (on a cycle or on a
motif position), a few octave jumps, ratchets and slides, chord-stab or pedal patterns as whole decisions,
gate, swing and sound. Each one is measured. Eight are kept by fit plus *typicality* (how close each axis
is to the middle of its range), picked greedily for variety (sound, kind, pool) with no two rhythms alike,
and marked down if they sit in the bass's register. Chord hits never go to mono, percussive or vocal patches.
*Keep my key, tempo and chords* and *Keep my sound* hold those fixed. *Variations* moves the combo you have
(rotate, new order, accents, octaves, thin, fill, new pool, polymeter, written riff, pedal, ratchets,
halftime) without touching its harmony or sound.

## Sounds and recipes

Nineteen patches: house organ, tech pluck, rubber bleep, Detroit chord stab, percussive blip, acid line,
hollow square, gated supersaw, glass pluck, dark wide saw, marimba, kalimba, log drum, electric piano,
house piano, disco saw, vox chop, rave stab and mid pulse. Each has a preview voice (oscillators and
periodic waves, unison and spread, FM, noise transients, pitch envelopes, formant filters, tremolo,
vibrato, mono glide), a **Serum 2 recipe** (oscillators, unison, filter, envelopes, FX, and which macro to
MIDI-learn to the exported CC) and an **Ableton recipe** with Live's own instruments. The preview is a sketch
of the patch; the recipes are the real sound.

The mix bus has a high-pass, drive, a width chorus, a sidechain duck from the kick, a ping-pong delay with a
filtered feedback loop, a reverb with a generated impulse, a bus compressor and a limiter. Drums, a
genre bassline and an optional chord pad play under the arp, with their own grooves and patterns.

## Into Pocket

**Open in Pocket** carries this combo to `pocket.html` in a local URL fragment: the rendered riff, original patch/effects, timing, evolution and source chord path are retained. Pocket adds a foundation beneath it. No upload or shared browser storage is required. A plain MIDI export does not contain the synth patch; use this handoff or paste an Orbit share link into Pocket for the complete source.

## Into Ableton

- **MIDI**: 4–64 bars at the session tempo, with swing, accents, ratchets and slides (a slid note overlaps
  the next, as a legato synth or Serum's portamento expects). Optional tracks: the chords held per chord, the
  **Arpeggiator input** (the pool held per chord), the bassline and the drums (GM map on channel 10).
  Evolution lanes are written as **CC74** (cutoff), **CC71** (resonance), **CC75** (decay) and **CC91**
  (reverb), which Live imports as clip envelopes. Chord names are written as markers. C3 = MIDI 60.
- **Drag**: in Chrome and Edge the drag chip drops the MIDI file on the desktop (or a Live track).
- **WAV**: two loops plus the tail rendered offline from the same synth, arp alone or with drums and bass.
- **Live's Arpeggiator card**: Style, Rate, Gate, Steps/Distance, Retrigger, Repeats and swing for the
  current combo, with a verdict: *exact*, *close* or *use the MIDI export*, and why.
- **Mix card**: sidechain and high-pass settings and a delay-time table at the session tempo.
- **Crate**: ★ saves a combo in the browser; *Download all* makes a ZIP with one MIDI per combo (arp,
  chords and Arpeggiator input), a README with every setting and Serum recipe, and a JSON copy. Sessions
  save and open as JSON. *Copy a link* puts the whole combo in the URL.

## The 12 rules

Fewer notes, more rhythm · leave the downbeat to the kick · odd against even · accents are the groove ·
short notes, long tails · swing the 16ths 54–58% · a pedal note anchors the line · move the filter, not
the notes · stay above the bass · voice-lead the chord changes · change one note every 4 bars · let the
delay finish the rhythm. Each one plays as an A/B in the studio (A breaks the rule, B keeps it), with the
number that changes measured on both.

## Validation

```
node arp-src/test.mjs            # 25 engine checks
node arp-src/browser-check.mjs   # 17 checks in headless Chromium (needs Playwright); writes arp-src/qa/
```

`test.mjs` checks the engine against answers worked out by hand: roman numerals and chord symbols, Camelot
codes, voice leading against root position, key detection (including the relative-minor case), chord import
of a known progression with its lengths and voicings, MIDI write/read, the cycle counter (3, 15, 5 and 1
bars on known patterns), every step type, swing offsets, the syncopation and kick definitions, evolution
lanes and their CC export, fills and mutation. Then the bank: unique ids, valid steps, sounds and
progressions; every pattern inside its genre on all seven axes; every note in the scale or the chord under
it; nothing outside the piano and nothing under 165 Hz outside the acid genre. Then the generator (eight
fitting, distinct, deterministic combos per genre, no chords on mono sounds), variations, fixes, the
Arpeggiator translation and the full five-track export, byte for byte.

`browser-check.mjs` drives the built page: playback and the orbit following it, one pattern per genre, the
generator and variations, the MIDI export note for note, the crate ZIP, chord import through the file input,
a WAV render measured for level and clipping, every sound rendering audible audio, a rule A/B and back, a fix
and its undo, A/B switching, share links, and on a 390 px phone no horizontal scroll and the floating play
button.

## Limits

- The preview synth is a sketch of each patch. Build the Serum 2 recipe for the real sound.
- Fit says a combo belongs to the genre, not that it is good. Two combos with a fit of 100 can be a hit and a
  bore; your ears decide.
- The genre ranges describe the conventions of each genre as written into the bank, not a measurement of
  commercial records.
- Chord import merges passing notes and melodies on the same track into the chords; pick the chord track.
- Ableton's Arpeggiator plays every step at one velocity with no rests, so most patterns need the MIDI export.
- Bank patterns are original studies of each genre's conventions. They are not transcriptions of anyone's
  record; the artist names describe a direction, not a source.
