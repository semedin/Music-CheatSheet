# Orbit: notes

[`orbit.html`](orbit.html) is the arpeggio studio: arps, riffs and sequences for twelve genres, from deep tech
house to trance. Pick a key and a progression (or drop in your own chord MIDI), start from one of 154
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

## Off the beaten track

- **More scales**: melodic minor, Phrygian dominant, Hungarian minor, double harmonic and Locrian, alongside
  minor, Dorian, Phrygian, harmonic minor, major, Mixolydian and Lydian.
- **More pools**: *stacked 4ths* (scale notes a fourth apart: open, modern, fits anywhere in the key), *open
  voicing* (every other chord tone up an octave) and *cluster* (root, 2nd, 3rd and 5th: notes that rub).
- **Turing order**, after the Music Thing Modular module: a loop of 2–16 pool notes where, each time it comes
  round, every note has a (100% − lock) chance of changing. Fully locked it is a fixed loop; loosened, it drifts
  forever. Deterministic per seed, so the same settings give the same drift.
- **Echo cascade**: MIDI echoes written into the notes, at 1/16 to dotted 1/4, quieter on each repeat and
  optionally climbing or falling (octaves, fifths, fourths, or scale steps). One note becomes a run. Echoes wrap
  round the loop and go into the MIDI export; the fingerprint ignores them and measures what you wrote.
- **Feel**: microtiming per 16th of the beat, on the arp, bass and hats: *Drunk* (Dilla: the "e" and "a" late,
  the "and" early), *Afro lean*, *Ahead* and *Laid back*. **Strum** spreads chord hits over up to 80 ms, up, down
  or alternating.
- **Bouncing-ball fill**: the last beat speeds up 1, 2, 3, 4 notes per step and falls in level.
- **Text → rhythm**: any word or track name as Morse code (a dot is a note, a dash an accent held two steps).
- **Write it out** turns any order into a written sequence, then reverse, mirror, step up or down, or rotate it.
- **Draw** on the orbit: click the pool notes on the inner ring in the order they should play.
- **Riff import**: drop a single-line MIDI clip (a riff or a melody) and it becomes the step pattern and a
  written sequence over the key's scale, with its accents, ties and swing. It plays back exactly (notes outside
  the scale snap to it), and from there you can vary it, fingerprint it or play it on any patch.
- **Play chords from a MIDI keyboard** (Web MIDI, Chrome and Edge): hold a chord and the arp plays it, with
  latch; release without latch and the progression comes back.
- **Autopilot**: while it plays, Orbit moves to its best-fitting variation every 4, 8 or 16 bars. Undo goes back.
- **Wild card**: lets the generator and the variations reach for all of the above.

## Sections: intro, build, break, drop

Every combo, from the bank, the generator or your own edits, is measured for what it is good for:

| Section | Points for |
|---|---|
| Drop | short notes, four or more notes a bar, accents or syncopation, a punchy sound |
| Build | build automation (Build to the drop, Riser in the last quarter, Thin to full, Add a note), roll / ratchet / climb / bouncing-ball fills, every step filled, climbing echoes, a filter that opens, a swelling sound |
| Break | long notes, a long held sound, the chords on show (9ths, open voicings, chord hits), space between the notes, Pluck to pad or Breathe |
| Intro & outro | few notes, a gentle sound, a filter that opens or a dark one, one to three pitches |

The best section is the primary one; any other within 60% of it is listed too. The stage shows them as
"Use it for", with the reasons, and an **energy** from 0 to 100 (density, syncopation, accents, short notes and
how punchy the sound is). The bank has section tabs, an energy sort and tags on every pattern, and its search
understands sections and lengths: "good for build", "break material", "drop material for sure", "short plucks
for the intro" and "long pads for the breakdown" all work (the filler words are ignored). *Find me one* can
write for a section: drops keep accents and short gates, builds get build automation and rolling fills,
breaks get longer notes, 9ths and long sounds, intros thin out and start dark.

The fingerprint follows the section. A drop is measured against the genre's own ranges; outside the drop
nothing has to dodge the kick and notes may last up to a bar, builds may fill every step, and breaks may leap
and spread further.

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
of the 154 patterns sits inside its own genre, for the section it is written for, on all seven axes, and `test.mjs` fails if one drifts out. Fit
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

Thirty-seven patches, each tagged with its **length** and the **sections** it suits:

| Length | Patches |
|---|---|
| Short (hits and plucks) | house organ, tech pluck, rubber bleep, percussive blip, marimba, log drum, disco saw, mid pulse, micro pluck, wood knock, laser zap, bell tick, funk clav |
| Medium (notes that ring) | Detroit chord stab, acid line, hollow square, gated supersaw, glass pluck, dark wide saw, kalimba, house piano, vox chop, rave stab, harp pluck, mono lead |
| Long (pads, swells, held leads) | electric piano, warm pad, glass pad, string swell, choir aah, dark drone, noise swell, Reese, euphoric lead, hoover, gospel organ, shimmer pad |

The sound browser in the Sound panel filters them by length and section, searches them ("short drop", "long
pads"), and plays one note of any patch before you choose it.

Each has a preview voice (oscillators and periodic waves, unison and spread, FM, noise transients and held
noise, pitch envelopes, a slow filter LFO, formant filters, tremolo, vibrato, mono glide; at most 40 voices
overlap, the oldest fading first), a **Serum 2 recipe** (oscillators, unison, filter, envelopes, FX, and which macro to
MIDI-learn to the exported CC) and an **Ableton recipe** with Live's own instruments. The preview is a sketch
of the patch; the recipes are the real sound.

The mix bus has a high-pass, drive, a width chorus, a sidechain duck from the kick, a ping-pong delay with a
filtered feedback loop, a reverb with a generated impulse, a bus compressor and a limiter. Drums, a
genre bassline and an optional chord pad play under the arp, with their own grooves and patterns.

## Into Pocket

**Open in Pocket** carries this combo to `pocket.html` in a local URL fragment: the rendered riff, original patch/effects, timing, evolution and source chord path are retained. Pocket adds a foundation beneath it. No upload or shared browser storage is required. A plain MIDI export does not contain the synth patch; use this handoff or paste an Orbit share link into Pocket for the complete source.

## Sounds out

The patches as WAV files for Simpler, Sampler and Drum Rack, rendered offline from the same synth, at the
current knobs, without the mix bus (no compressor, limiter, sidechain or high-pass):

- **One note**: any patch, any note from C0 to C6, held from 80 ms to 4 s, soft/medium/hard, dry or with the
  delay and reverb. Silence at the end is trimmed, the last 5 ms faded and the peak normalised to −1 dBFS.
  24-bit or 16-bit, 44.1 or 48 kHz. Each file carries its root note in a `smpl` chunk.
- **Multisample**: the patch every octave, 6, 3 or 1 semitones across C0–C6, C1–C5 or C2–C4, optionally in two
  velocity layers, named `patch_MIDInote_Note(_layer).wav` for mapping in Sampler.
- **Chord stabs**: the chords of the progression (its voicings) or every chord of the key as triads, 7ths or
  9ths, one file each, with a README of the voicings. For Drum Rack pads, or Simpler's chord-memory trick.
- **Patch pack**: all 37 patches as C3 one-shots at their own settings, with every Serum 2 and Ableton recipe.
- **Seamless loops and stems**: the phrase exactly its length to the sample, rendered with the previous pass
  first so the tail of the last bar is already at the start; arp alone, full mix, or four stems (arp, bass,
  drums, pad) in one ZIP.

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
node arp-src/test.mjs            # 41 engine checks
node arp-src/browser-check.mjs   # 38 checks in headless Chromium (needs Playwright); writes arp-src/qa/
```

`test.mjs` checks the engine against answers worked out by hand: roman numerals and chord symbols, Camelot
codes, voice leading against root position, key detection (including the relative-minor case), chord import
of a known progression with its lengths and voicings, MIDI write/read, the cycle counter (3, 15, 5 and 1
bars on known patterns), every step type, swing offsets, the syncopation and kick definitions, evolution
lanes and their CC export, fills and mutation. Then the bank: unique ids, valid steps, sounds and
progressions; every pattern inside its genre on all seven axes; every note in the scale or the chord under
it; nothing outside the piano and nothing under 165 Hz outside the acid genre. Then the generator (eight
fitting, distinct, deterministic combos per genre, no chords on mono sounds), variations, fixes, the
Arpeggiator translation and the full five-track export, byte for byte. The newer tools are checked the same
way: the new scales stay in key, stacked 4ths are a fourth apart, a fully locked Turing loop repeats exactly and
a loose one drifts the same way every time, echoes land at the echo time with the right levels and scale steps
and wrap round the loop, strum and feel offsets in milliseconds, the bouncing-ball fill's 1-2-3-4, Morse code,
a riff that comes back note for note with its swing, written-out orders that play the same notes, the chords of
the key, and wild card mode used only when asked.

`browser-check.mjs` drives the built page: playback and the orbit following it, one pattern per genre, the
generator and variations, the MIDI export note for note, the crate ZIP, chord import through the file input,
a WAV render measured for level and clipping, every sound rendering audible audio, a rule A/B and back, a fix
and its undo, A/B switching, share links, and on a 390 px phone no horizontal scroll and the floating play
button. For the samples: a 24-bit one-shot read back from its bytes (peak −1.0 dBFS, trimmed, root key in the
`smpl` chunk), the stab, multisample and patch-pack ZIPs file by file, a seamless loop exactly two bars long to
the sample and already sounding at sample 0, and the four stems. For the tools: Turing, write-out and mirror,
Morse, echoes, the live keyboard with and without latch, drawing a sequence by clicking the orbit, riff import
through the file input, autopilot and its undo, and wild card.

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
