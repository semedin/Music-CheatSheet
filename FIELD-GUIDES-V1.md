# Field guides (V1) — reference

The sixteen original field guides, as first released. Open them from the home page (`index.html`) or from the V1 index, `field-guides-v1.html`. Every guide is one self-contained HTML file with its own CSS, JavaScript and Web Audio synthesis.

> **Since V1:** `drum-library.html` has been rebuilt as the drum studio (see [DRUM-STUDIO.md](DRUM-STUDIO.md)), `serum.html` has a second edition in `serum-v2.html` (see [SOUND-DESIGN-V2.md](SOUND-DESIGN-V2.md)), the missing Ear Training guide was removed from the index, and every guide now carries the shared top bar. The descriptions below cover the V1 content; sizes and counts are from the V1 release.

## How a V1 guide is built

Every guide file follows the same shape:

```
<meta charset> + <title>
Google Fonts <link>            → Bricolage Grotesque / Inter Tight / JetBrains Mono
<style>  …one full design system, ~180 lines, CSS custom properties…
<div class="hero">             → title, standfirst, colour strip
<nav class="nav">              → "← Index" back-link + in-page section anchors
<main class="wrap">            → numbered <section class="sec"> blocks
<script>  …data tables + Web Audio engine + lab wiring…
```

**Shared technical conventions**

- **Audio** — Web Audio API only. Every sound (kicks, basses, chords, hats, vocals,
  the sampled "records" in `sampling.html`) is *synthesised at runtime*. There are no
  audio assets in the folder. Files are 21–114 KB precisely because they carry no media.
- **MIDI export** — the guides that export write Standard MIDI Files **byte by byte in
  JavaScript** (`MThd`/`MTrk` headers, variable-length delta times), wrap them in a
  `Blob` of type `audio/midi`, and trigger a download via an object URL. Multi-track
  (Type 1) exports are used where a lab produces several parts at once.
- **No persistence** — the V1 guides use no `localStorage`, no cookies, no network calls and no
  analytics. (The later studios do save sessions and notes locally.) Scores, edits and patterns live in memory only;
  reloading a page starts fresh.
- **No dependencies** — zero external scripts. The only outbound requests are the
  Google Fonts stylesheets, and every font stack has a system fallback, so the pages
  render and function correctly with no internet connection.
- **Transport** — pages with playback share a sticky transport bar and a
  <kbd>space</kbd> play/stop handler.
- **Design system** — all 16 field guides share one palette (`--bg:#E2DED2` warm paper,
  `--ink:#191713`, accent ramp red `#FF4B32` → orange → yellow → green → cyan → violet)
  and one type system. `disco-house-cheatsheet.html` is the exception (see below).


## The guides in detail

### Make the parts

#### `groove-cheatsheet.html` — Groove 2.0
*Placement, length & velocity — why a loop bounces or sits there.*

- **25 playable patterns** across four sections: Placement, Note length, Velocity,
  Melody & hooks. Includes straight 16ths, offbeat 8ths, "the e and the a",
  dotted-8th rolls, 2.5-step and 5-step polymeters, anticipation, skip figures,
  triplets over straight, Euclidean E(7,16), gate/overlap demos, flat velocity vs
  accent maps, ghost notes, three-note hooks, octave displacement, call and response,
  pedal tones and tension notes.
- **Workbench** — an editable grid at **32nd-note resolution** with KICK/HATS reference
  layers, note add/erase, invert pitch, reverse, nudge later, accent, ghost, Euclid 7/16
  and a MIDI download.
- **FLATTEN** — strips velocity and gate performance so you hear what the pattern is
  without the playing.
- **Syncopation meter** — scores patterns in weighted metric units (straight 16ths = 0).
- Sections on swing that isn't on/off, stealing a real drummer's timing, push and drag in
  milliseconds, transformations worth knowing, and Ableton editing speed.

#### `groove-vol2.html` — Groove II · The Pattern Bank
*66 building blocks across 29 genres.*

- **`BANK` of 66 blocks** covering bass, sequences & arps, stabs & chord rhythms,
  energy shapes, and fills & turnarounds — filterable by genre and by *motion type*.
- **Melting pot** — four slots you fill from the bank, played together, exported as
  **multi-track MIDI**. Includes 8va/8vb per slot, KICK/CLAP/HATS reference layers,
  genre presets (house, techno, trance, garage), *Surprise me* (deliberately picks four
  blocks with four different motion types), and *Empty all slots*.
- **Three generators** — phasing, Euclidean, additive.
- Covers trance, psytrance, garage, amapiano, breaks and Afro alongside the house/techno
  core, plus a section on making energy fluctuate.

#### `drum-library.html` — The Kit
*A drum pattern encyclopedia with a real sequencer.*

- **18 genre patterns** (`LIB`) from disco house to jungle.
- **Sequencer** — 32 steps × 12 drum lanes, fully editable, with per-lane swing,
  Euclidean fills, *Copy bar 1 → 2*, *Vary*, *Add fill*, *Clear all* and MIDI download.
- **Three synthesised kits** — 909, 808, 707. No samples; every drum is generated.
- **Morph lab** — computes every cell where two genres disagree and applies the
  differences one at a time, with a **structure/texture boundary** marker and a
  *Jump to structure boundary* control, so you can hear which changes are the genre and
  which are only decoration.
- Reference sections: what each drum is for (the floor: kick / the answer: snare & clap /
  the engine: hats / the colour: percussion), hat & clap vocabulary, structure vs texture,
  density discipline, and a numbers table.

#### `low-end.html` — Low End
*Kick & bass as one instrument. The only "make the parts" guide with no MIDI export — it is about sound, not notes.*

- **Kick lab** — design a kick from six live parameters with eight genre presets.
- **Tuning lab** — a kick played against an A-minor bassline so you hear the beating
  when the pitches disagree.
- **Sidechain lab** — duck shape against a rolling bass.
- **Phase lab** — kick and sub both at 55 Hz, with buttons for **in phase · 0°**,
  **quadrature · 90°** and **flip polarity · 180°**, and a peak meter that falls 6–10 dB
  as you sweep. Cancellation is measured, not described.
- **10 bass archetypes** (`BASSES`): pure sine sub, rolling offbeat, Reese, 303 acid,
  plucked disco, FM growl, organ stab, distorted saw, gliding 808, hoover.
- Reference: kick anatomy, carving space, deciding who owns the sub, nothing wide below
  120 Hz, peak vs sustained, timing solving what EQ can't, a numbers section, and a
  **diagnosis table** ("it's muddy", "it's weak / thin", "no punch",
  "great at home, gone in the club").

#### `patch-lab.html` — Patch
*Sound design from scratch.*

- A working **subtractive + FM synth** with **27 parameters** and three live displays.
- **10 patches** that *build themselves* one stage at a time while the controls visibly
  move: Rolling techno bass, Acid 303, Disco house stab, Supersaw lead, Deep house organ,
  FM growl bass, Pluck, Hoover, Kick from a synth, Noise riser.
- **▶ BUILD IT / Next stage → / ↺ Stage 1** — step through the construction so you see
  the decisions instead of arriving at a finished preset.
- **Store A / Recall A** for A/B comparison, plus *Init patch*, *Randomise*, *DRUMS OFF*.
- **Ableton translation** — renders the current patch as device instructions.
- Reference: oscillators as raw material, the filter as subtraction ("remove, don't add"),
  where the character actually is (envelopes), movement as the fifth decision, build order,
  things that are not synthesis, where these live in Live, and a diagnosis section.

#### `serum.html` — Serum 2 · The ninety per cent path
*The largest V1 reference guide (86 KB).*

Premise: `patch-lab.html` argues every sound is five decisions; Serum 2 adds a sixth
*in front* — which of its five engines to be.

- **The map** — the five engines and when each one earns its place; what to ignore until
  it asks for you.
- **The 90% path** — a fixed **six-move build order**: choose the engine then the
  material → one timbre device per oscillator → unison and the octave below → filter,
  then envelope the filter → amp envelope and one movement → FX in shape/dirt/space
  order, then a macro.
- **22 recipes** (`REC`) with exact settings, filterable by category:
  Bass · Chords & stabs · Leads & plucks · Pads & texture · Drums & FX.
- **6 A/B demos** (`DEMOS`) with **A · without** / **B · with** buttons, isolating one
  move each: unison, the pluck, FM bark, noise click, drift, fake sidechain.
- Reference: what a wavetable actually is, warp modes worth knowing by name, unison
  numbers, the other engines in one paragraph each, a modulation cookbook, a diagnosis
  table, gain staging inside the synth, Serum 2 inside a Live set, building a preset
  library that teaches instead of accumulating, and a note on versions and honesty.

#### `sampling.html` — The Cut
*Chopping, warping & slicing — and the guide that does the most real DSP.*

The page **renders its own source loops into memory** (`OfflineAudioContext`,
`createBuffer`, `getChannelData`) and then performs genuine signal processing on them.
The sources are synthesised; the sampling is not.

- **8 sources** (`SOURCES`) including a funk break, soul chords, a percussion loop and
  a vocal phrase — loaded via **◉ LOAD THE RECORD**.
- **Chop lab** — real **transient/onset detection**, grid options 8/16/32, a
  re-sequencer (*Original order*, *Shuffle*, *Reverse*, *Slice & retrigger*,
  *Stutter the first beat*), and a **Simpler-layout MIDI export**.
- **Pitch & time** — four ways to change tempo, with a working **granular stretcher**
  (drag grain size from 15 ms to 200 ms), **Repitch**, **Repitch + formant fix**, and
  true **bit reduction**.
- **One slice, whole loop** — eight bars built from a single hit.
- Reference: warp markers practically, the tempo decision, warp modes, Sampler versus
  Simpler, making a sample sit in a mix, sourcing, chopping strategy, resampling,
  working rules, and a diagnosis table.

#### `melody.html` — Melody
*Rhythm, contour, development. Argues that weak melodies are usually right notes landing on wrong sixteenths.*

Splits melody writing into four separate jobs: **rhythm → contour → harmony → development.**

- **Rhythm lab** — the sixteenth grid with a live **syncopation-weight readout** and a
  metric-weight explainer ("why some steps feel wrong"). **25 rhythm cells** (`CELLS`),
  plus *Load 5-step polymeter*, *Load 7-step polymeter*, *Load Euclidean*, displace
  left/right, *Invert (rests ↔ hits)*, and Kick/Hat reference layers so you hear the
  syncopation against a pulse.
- **Melody lab** — pour one of **15 contours** (`SHAPES`) into the locked rhythm and
  snap to scale; *Reroll pitches*, *Reroll rhythm too*.
- **25 era presets** (`PRESETS`) — feel rather than notes (straight-eighths era,
  progressive, peak time…).
- **Syncopation cookbook** — 15 entries (`COOK`).
- **Transform lab** — **13 transforms** (`TX`): mutate rather than rewrite.
  *Make result the new melody* feeds the output back in as the new source.
- **Phrase builder** — one 2-bar motif expanded to a full 8-bar phrase across
  **7 arcs** (`ARCS`), with *Mirror bar 2* and *Echo ⅛·*.
- Four separate MIDI exports: one note, melody, both, phrase.
- Closes with a numbers section and an Ableton workflow from exported MIDI to finished
  line.

### Put them together

#### `inkey.html` — In Key
*Transposing samples, and by how much. Answers "is it +3 or −9?" — and asks first whether you need to transpose at all.*

- **The answer** — enter the sample's key and the track's key, get the value for
  Ableton's Transpose field, with a **hear-it-wrong-then-right** demo
  (*▶ HEAR IT RAW* / *▶ HEAR IT SHIFTED*).
- **Clash meter** — counts how many notes of the sample fall outside your key. Set the
  sample to C major and the track to A minor and the answer is zero: same seven notes.
- **12 × 12 lookup grid** and the **Camelot wheel** for harmonic mixing.
- **Find the key of a sample** — chromatic drones (*Drone on the root*, *Stop the drone*)
  plus *Test major triad* / *Test minor triad* against a loaded demo loop
  (*Vocal phrase* / *Melodic loop*).
- Reference: why vocals are the hard case, formant correction, what transposing costs,
  how repitching changes tempo, cheaper alternatives to transposing, where the controls
  actually are, Live 12 specifically, a workflow that avoids the problem, and a
  diagnosis table.

#### `chords.html` — Voicing
*Progressions & voice leading. Premise: almost nobody's progression is wrong — what sounds amateur is the voicing.*

- **16 progressions** (`LIB`) loadable and playable, with DRUMS and BASS reference layers.
- **MAKE IT CHEAP / MAKE IT EXPENSIVE** — the headline demo. Same four chords, same
  rhythm; total voice movement drops from **68 semitones to 12**.
- **Voice-leading diagram** with per-voice movement lines and a live semitone total.
- **Chord editor** — add, remove and substitute chords; *Suggest a progression*;
  *Substitute chord 2*; MIDI download.
- **One chord, eight ways** — the same harmony in eight voicings.
- Reference: the vocabulary, extensions (9ths, 11ths, rootless, drop 2, quartal), the
  modes, all twelve keys, the rules that actually bite, substitutions worth knowing,
  the order to work in, "rhythm beats harmony", a diagnosis table, and notes for Live.

#### `between.html` — Between
*How two parts relate. The only guide about relationships rather than parts.*

- **Reharmonisation lab** — one melody against **12 harmonies** (`PROGS`: Home, Gospel,
  Cinematic, Descending bass, Jazz cadence, Dorian, Phrygian, Pedal point, Chromatic
  mediant, Suspended, Tritone turn, Quartal) with **live function labels** on every
  melody note (chord tone / colour tone / clash) that change as you cycle harmonies.
  *Cycle all 12 harmonies* plays the whole sweep. **4 melodies** (`MELODIES`) to try it
  on: Stepwise, Hooky, Held, Descending.
- **Part & part** — collision counting between two busy parts, with *Interlocked* vs
  *As written* comparison.
- **Direction** — motion classification, with *Parallel version* vs *Contrary version*.
- **Register** — spacing and the low-interval limit.
- MIDI exports: melody alone, melody + chords, both parts.
- Reference: the four questions, reharmonisation as a writing method, making two parts
  interlock, working rules, and a diagnosis table.

### Shape the track

#### `buildorder.html` — Build Order
*What to touch first, and why. Built from one producer's workflow notes, with established technique kept separate from personal opinion throughout.*

- **Build order simulator** — reorder eight elements and hear the track assemble.
  Presets: **Low end first**, **Atmosphere first**, **Melody first (bad order)** — the
  same eight parts, audibly weakest in the third. Exports **MIDI · final mix**.
- **Measured labs**: ghost kicks (`GHOST_STEPS`), warmth (*Warm* / *Bright* / *Off*),
  automation vs new parts (*A · new part every 4 bars* vs *B · automation only*), and
  drums vs melody for energy (*A · add percussion* vs *B · add a second melody*).
- **Session timer** — *▶ START SESSION*, *Pause*, *Reset*: pick a length and finish that
  draft, however rough.
- **Reference track worksheet** — fill it in and *⬇ Save as text* (a plain-text export,
  the only non-MIDI download in the set).
- **Constraint spinner** (*↻ SPIN*) — for finding your own voice.
- Sections: where do I start, movement not clutter, drums vs melody for energy,
  arrangement discipline, the listening habit, finish fast finish often, voice.

#### `arrangement.html` — Arc
*Structure & transitions. A track as a shape over time.*

- **The map** — a section grid you build and edit, with *+ 16 bars here* /
  *− 16 bars here*, *Fill this section like a drop*, *Thin this section*, and
  |◀ / ▶| section navigation. **10 elements** (`EL`): kick, bass, clap, hats, percussion,
  chords, lead, vox/sample, atmosphere, FX/risers.
- **◇ TOUR** — four bars from every section in order: a seven-minute arc heard in ninety
  seconds, fast enough to actually judge the shape.
- **8 templates** (`T`): Club techno, Peak-time techno, Tech house club edit, Deep house,
  Disco house, Melodic techno, Streaming edit, Afro house.
- **Transitions lab** — **12 transitions** (`FX`) that fire on the next bar line:
  low-pass sweep (8 bars), high-pass build (8), noise riser (4), pitch riser (2),
  clap roll (2), cut to silence (1 beat), impact (1 hit), delay throw (2),
  reverb wash (4), tape stop (1 beat), drum dropout (2), reverse swell (2).
- **Energy curve** readout showing where the peak falls.
- **Multi-track MIDI export** of the whole arrangement as a scaffold to drag into Live.
- Reference: the transition toolkit, layer three not one, subtraction beats addition,
  phrasing and the counting rules, getting out of loop hell, length and audience,
  working rules, a diagnosis table, and notes for Live.

#### `the-move.html` — The Move
*24 transformations, strict A/B.*

Twenty-four single decisions applied to identical material, so the only variable is the
move itself: four bars of the original, four bars of the transformation, forever.

- **12 rhythm moves** — beat displacement, metric modulation, hemiola, phasing,
  half-time, double-time, turnarounds and others.
- **12 harmony moves** — negative harmony, tritone substitution, chromatic mediant,
  parallel major, Dorian lift, Phrygian, pedal point, quartal, suspension and others.
- **The stage** — *AUTO A/B*, *HOLD A*, *HOLD B*, *← Previous* / *Next move →*.
- **Exact deltas** printed against the identical bed, so the numbers are real.
- Separate **⬇ MIDI · A** and **⬇ MIDI · B** exports for every move.
- Reference: where a move belongs, the reversal rule, and notes specific to the rhythm
  and harmony sets.

### Sharpen yourself

#### `keyboard.html` — Keyboard
*Play the thing, from zero. The largest file in the set (114 KB) and the only one that reads your hardware.*

For anyone with a two-octave controller and no lessons.

- **Web MIDI input** — *Connect MIDI* binds `navigator.requestMIDIAccess()`, names the
  connected device, and handles note-on/note-off with velocity and timestamp-corrected
  scheduling. **Chrome or Edge only**; the page says so and degrades gracefully.
- **The keyboard** — two octaves matching a real controller, with live chord naming,
  in-key flagging and a **NAMES** toggle so you can train without labels.
- **White keys only** — three facts and no more; which keys are in the key; what the
  numbers on your controller mean.
- **Chord shapes** — the one hand shape that makes every chord in a key, on every note of
  the key; inversions and sevenths in hand terms; *Play all seven in order*;
  *Play it one note at a time*; how to read the families; the two borrowed chords worth
  knowing.
- **30 progressions** (`PROGS`) you can play tonight, grouped into families.
- **Voicing switch** — *Root pos.* vs *Auto · nearest inversion*, with total travel
  measured in semitones (the demo drops 47 → 7).
- **Two hands, twenty-five keys** — a fit checker ("does it fit?"), the two-pass method,
  and the left hand's whole job description.
- **Freestyle** — a no-wrong-notes bed that listens to your controller and **scores what
  you actually play** against three rules: *stay on the lit keys*, *chord tones on the
  beat*, *say it twice*. 4 / 6 / 8-bar lengths, with drone, drums and bass layers.
- **5 timed drills** (`DRILLS`) with score and count resets, plus a ten-minute routine.
- Reference: Ableton setup, the three safety nets, and a numbers section.
- Exports MIDI.

### Unlisted in V1

#### `disco-house-cheatsheet.html` — Disco house reference sheet

The odd one out, and evidently the earliest file here (16 Aug; everything else is 22 Aug
or later). A **static, non-interactive** one-page reference: no audio, no JavaScript
behaviour, and a completely different design system
(Archivo / IBM Plex Sans / IBM Plex Mono, with its own palette).

Sections: Set these first (tempo 122, A minor, 16% MPC swing, 8-bar loop) · The one-bar
grid · Drum layer rules · Working with a sampled loop · Chords — sevenths, always ·
Device chains · Arrangement — count in eights.


## Feature matrix

| Guide | MIDI out | Web MIDI in | Editable sequencer | Live synth engine | A/B compare | Measurement it prints |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Groove | ✓ | | ✓ | ✓ | ✓ (FLATTEN) | Syncopation, weighted metric units |
| Pattern Bank | ✓ | | ✓ | ✓ | | Cycle length, motion contrast across slots |
| Drums | ✓ | | ✓ | ✓ | ✓ (morph) | Cells of disagreement between two genres |
| Kick & Bass | | | | ✓ | ✓ (phase) | Summed peak level as phase changes |
| Synthesis | | | | ✓ | ✓ (Store A) | — shows rather than measures |
| Serum 2 | | | | ✓ | ✓ (6 demos) | — six A/B demos isolate one move each |
| Sampling | ✓ | | ✓ | ✓ (+ DSP) | ✓ | Slice lengths, tempo-to-semitone conversion |
| Melody & Syncopation | ✓ | | ✓ | ✓ | | Syncopation weight; chord vs colour tone placement |
| Keys & Transposing | | | | ✓ | ✓ (raw/shifted) | Notes of the sample outside your key |
| Chords | ✓ | | ✓ | ✓ | ✓ (cheap/exp.) | Total voice movement, in semitones |
| Melody & Harmony | ✓ | | | ✓ | ✓ | Chord/colour/clash; collisions; motion; intervals |
| Build Order | ✓ | | ✓ | ✓ | ✓ (A/B labs) | *(absent from the index MEASURES table)* |
| Arrangement | ✓ | | ✓ | ✓ | | Energy across the timeline, where the peak falls |
| Transformations | ✓ | | | ✓ | ✓ (core idea) | Exact deltas against an identical bed |
| Keyboard | ✓ | ✓ | | ✓ | ✓ (voicing) | Voice travel; in-key, chord-tone and timing scores |
| Disco house | | | | | | *(static sheet)* |
