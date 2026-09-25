# TODO: pages that don't exist yet

A wish list of new pages and folder-wide features for Fieldwork. The ideas are ranked, and each one is specific enough to start from.

These are ideas, not promises. Each one follows the house rules: **one self-contained `.html` file**,
every sound synthesized with Web Audio, offline, and **labs that measure what they argue**. If a
page can't show its claim with a meter, a counter or an A/B, it isn't ready yet.

## Where the gaps are

Today the folder covers **writing parts** (V2, V3, Trance), **drums and low end** (The Kit, Rumble,
Low End, Groove), **sound design** (Serum, Patch, The Cut) and **arranging** (Arc, Build Order,
The Move). It has almost nothing on:

| Missing | Why it hurts |
|---|---|
| Mixing, space (reverb/delay), loudness | Users can write an idea here but can't finish it. |
| Ear training | Every guide says "listen for it" but nothing teaches you to hear it. |
| Performance and jamming | Everything is step-edited; nothing is played live. |
| Vocals | Mentioned in The Cut, never taught. |
| Genre rooms beyond trance and disco house | Garage, breaks, acid, dub techno and amapiano appear only as rows in the Pattern Bank. |

---

## Tier 1: finish the chain

### 1. `space.html` — **Room** · reverb and delay as arrangement
The argument: space is a part you write, not a coat of paint.
- **Tail-vs-kick meter.** A reverb on the clap, with a live readout of how much tail energy below
  250 Hz overlaps the next kick. Sweep decay and pre-delay and watch the kick lose its punch as a number.
- **Pre-delay as groove.** Pre-delay snapped to 1/64 … 1/8 at the current BPM, so you hear the
  tail land *on* a 16th instead of smearing between them.
- **Dub throw performer.** Hold a key to open the send to a filtered feedback delay and let go
  to hear it tail out. Record the throws and export them as a MIDI CC lane.
- **Ducked reverb, gated reverb, reverse swell and freeze** as four A/B demos.
- **Haas and width lab** with a mono-fold button and a correlation meter, so you hear width
  vanish in a club.
- The impulse responses are generated algorithmically (decaying noise with filtered early
  reflections), so there are still no audio files.
- A **delay-time table** in ms and Hz for every note value at any BPM (straight, dotted and triplet),
  ready for Live's Delay and Echo.

### 2. `mixdown.html` — **The Balance** · mixing as a game you can lose
- **Broken mix.** A synthesized eight-stem track (kick, bass, hats, clap, chords, lead, pad, FX)
  loads with its faders deliberately wrong. You fix it by ear, then press **Reveal**: the page
  scores your balance against the reference, stem by stem, in dB.
- **Masking map.** A live heat map of how much each pair of stems collides in each frequency band.
  Click a hot cell to solo the two stems and hear the collision.
- **Pink-noise balancing.** The classic trick, done live, with the page measuring how close you got.
- **Mute-one-thing.** The page drops one stem by 3 dB and you name which one. Levels get harder as
  you score.
- **Mono, phone speaker and club** monitoring simulations (band-limited and summed), switchable in
  the transport.
- Export: fader positions as a text recipe, plus stems as WAV.

### 3. `loudness.html` — **Headroom** · mastering without superstition
- **Real meters in JavaScript**: K-weighted integrated, short-term and momentary LUFS, true peak
  (4× oversampled), crest factor and PLR.
- **Normalization simulator.** Push a master hard, then hear it turned down to −14 LUFS (Spotify),
  −16 LUFS (Apple) and "club": the loud version loses. The penalty is shown in dB.
- **Clipper vs limiter vs soft-clip.** Three A/Bs at matched loudness, with the added harmonic
  distortion measured.
- **Drop your own WAV/MP3** (File API, stays on your machine) to get the same meters on your
  bounce, plus an "is it ready for a DJ" checklist.

### 4. `tension.html` — **Tension** · the sound of a transition
Arc's Transitions lab covers *where* transitions go. This page covers the sounds that make them.
- **Riser forge.** Noise sweep, pitch riser, **Shepard tone** (a riser that climbs forever) and a
  filtered supersaw build, each with length snapped to 4/8/16 bars.
- **Snare roll generator.** Accelerating rolls (8ths to 16ths to 32nds to 64ths) with velocity
  and pitch curves, exported as MIDI.
- **Downlifters, impacts, reverse crashes, tape stops and "the silence before the drop"**, with
  the length of that silence measured in beats.
- **Tension meter.** A composite of spectral centroid, density and loudness drawn across the
  build. Remove one layer and watch the curve go flat.
- Export: rolls as MIDI, risers as WAV, filter sweeps as MIDI CC.

---

## Tier 2: train the ear

### 5. `ear.html` — **Ear Gym** · five minutes a day, electronic music only
Ear training built for this genre, not for conservatory interval drills.
- **Drills:** which band was boosted (EQ), which 16th is the ghost note, swing % (50/54/58/62),
  compressor attack fast vs slow, stab quality (min7 / sus / add9), which part is out of key,
  kick-bass phase in or out, tap the BPM, 909 vs 808 vs 707.
- **Spaced repetition** in `localStorage`, a streak, and a **weakness heat map**.
- **Missed a drill? Go read it.** Every drill links to the guide section that teaches it (Low End's
  phase lab, Groove's swing section, Voicing's chord shapes).
- **Level exams** (Bronze to Club-ready), unlocked by accuracy over the last 50 answers.

### 6. `xray.html` — **X-Ray** · look inside a reference track ✅ built
Shipped: see [XRAY.md](XRAY.md). The next steps for it: tempo maps for live-played tracks, a
per-section key-change detector, and `.als` export once the folder-wide Live Set exporter exists.

---

## Tier 3: play it, don't program it

### 7. `jam.html` — **Live Rig** · a performance instrument
- An eight-channel groovebox built from the existing engines: drums from The Kit, basses from
  Rumble, stabs from Voicing. It has scenes, mutes, solos, per-channel filter and send throws,
  and one **big macro**.
- **Web MIDI in**, so any controller can be mapped with MIDI-learn. It is fully playable from the
  computer keyboard too.
- **Record the performance.** Export it as a multi-track MIDI arrangement, with filter and send
  moves as CC lanes. A 20-minute jam becomes an Ableton arrangement.
- **Challenges:** "keep the floor for 64 bars using only mutes", "build a drop with nothing
  but one filter", "the three-deck 909 routine".

### 8. `blend.html` — **Blend** · write tracks DJs can actually mix
- Two decks with synthesized tracks and a **bass-swap lab**. Hear what happens when two sub lines
  play at once, measured by the meter from Low End.
- **Phrase check.** Does your intro give 16 or 32 bars of clean kick? The page flags the bars
  that trip a mix.
- **Harmonic mixing** across the Camelot wheel (linking In Key), with a "mix into this key"
  suggestion.
- **DJ-friendly intro and outro templates** exported as MIDI.

---

## Tier 4: genre rooms (the `trance.html` treatment)

Each room gets studies, treatments, sound recipes, artist *perspectives* (principles, never
copies), arrangement maps and a MIDI pack.

| File | Name | What makes it more than a preset list |
|---|---|---|
| `acid.html` | **303** | A sequencer with real TB-303 semantics: accent drives cutoff-envelope depth *and* volume, slide ties notes with an exponential glide, and the accent sweep circuit is modelled. A "musically constrained" randomizer. Cutoff and resonance export as CC. |
| `dub-techno.html` | **Chord & Echo** | A chord stab feeding a delay network with a filter *inside* the feedback loop, plus tape wow and flutter and hiss. Shows how one chord becomes eight minutes. |
| `garage.html` | **2-Step** | The skipped-kick shuffle lab, organ and bassline wobble bass, vocal-chop rhythm generator, and speed garage and UK bassline variants. |
| `breaks.html` | **Break Surgery** | Synthesized breakbeats you chop, re-sequence and ghost at 160–175 BPM. The jungle edit grid, Reese at speed, and a "time-stretch vs repitch" A/B. |
| `amapiano.html` | **Log Drum** | Log drum synthesis (the pitch-bent, filtered decay), shaker grids, 3:2 and 6:8-over-4/4 polyrhythm lab, and the "slow build that never drops". |
| `melodic.html` | **Afterglow** | Melodic techno and progressive house: arps that evolve for 64 bars (gate, octave and note-count drift), long-form energy curves, and the 7-minute build. |

---

## Tier 5: go somewhere new

### 9. `voice.html` — **Voice** · vocals without a singer
- A **formant synthesizer** that speaks vowels and simple syllables, so chops, "oh-ah" pads and
  one-word hooks work with no samples.
- **Chop-to-hook.** Slice a synthesized phrase, re-sequence it rhythmically and export a Simpler
  slice map as MIDI.
- A **vocoder**, a **talk box** and **hard-tuned pitch as an instrument**, each as an A/B.
- Sections on writing a four-word hook and on where a vocal sits against the lead.

### 10. `off-grid.html` — **Off-Grid** · tunings beyond 12-TET
- Just intonation, maqam (Rast, Bayati), gamelan pelog and slendro, Bohlen–Pierce and 31-EDO. Each
  plays through a synth and a drone, so you hear what the 12-note grid rounds off.
- **Exports `.ascl` tuning files** for Live 12's tuning system, plus MIDI written in that tuning.
- A **beat-frequency lab**: two sines at equal-tempered vs just intervals, with the beating counted
  in Hz.

### 11. `garden.html` — **Garden** · generative and ambient long-form
- Probability sequencing, Eno-style loops of co-prime lengths (17 : 23 : 29 bars), and "never
  repeats for 3 hours" arithmetic shown on screen.
- **Render an hour** to WAV offline. Export seeded MIDI variations.
- The "one rule per part" composition method.

### 12. `lineage.html` — **Lineage** · the family tree, playable
- An interactive map of electronic dance music from 1977 to today: disco → Chicago → Detroit →
  acid → rave → jungle → garage → minimal → dubstep → amapiano → …
- Each node plays a **synthesized four-bar signature** (the defining drum pattern, bass and stab)
  and links to the room or study that teaches it.
- A **"what changed"** diff between a parent and a child genre, reusing The Kit's morph-lab
  structure/texture idea across genres.

### 13. `daily.html` — **Daily Seed** · one prompt, every day
- The date seeds a **key, tempo, motif (from the V3 engine), constraint and deadline**.
  Everyone who opens it on the same day gets the same seed.
- A 20-minute timer, an archive of past seeds in `localStorage`, and a streak.
- Constraints like "no chords", "only one synth", "the bass is the lead" and "write the break
  first".

### 14. `unstuck.html` — **Oblique** · escape the 8-bar loop
- Tick what's true about your loop (it's full, it's flat, the drop is weak, it's too busy…).
  The page deals **three concrete moves** from a deck of about 100, each an exact Ableton action
  that links to the page section that teaches it.
- **Timer mode:** "30-minute arrangement" deals a move every five minutes.
- It gathers the fixes the diagnosis tables in Low End, Serum, The Cut and Patch already give.

---

## Folder-wide features

- **Global "I have a problem" search.** One index built by `site/build.mjs` from every page's
  headings and diagnosis tables, searchable from the home page.
- **Send between pages.** Encode a motif, pattern or patch in the URL hash so a V3 motif opens in
  Tension, a Kit pattern opens in Live Rig, and so on. There is no server, and it works from `file://`.
- **Web MIDI out** from every studio, so you can play straight into Ableton over IAC or loopMIDI
  while you audition.
- **Ableton Live Set export (`.als`).** A Live Set is gzipped XML, which `CompressionStream` can
  write. A skeleton set with named tracks, locators from the arrangement map, and the MIDI clips
  already in place would be a big step up from separate MIDI files. The format is undocumented, so
  version it and test it against Live 11 and 12.
- **Printable cheat cards.** A print stylesheet so every guide prints as one A4 card for the
  studio wall.
- **Shortcut overlay.** Press <kbd>?</kbd> on any page to see its keys.

---

## Picking up an item

1. Build it as one `.html` file in the root, or as a `*-src/` folder with a `build.mjs` if it is
   data-heavy.
2. Add it to a section in `site/catalog.mjs`, and to `NAV` if it earns a top-bar slot.
3. Run `node site/build.mjs`, then `node site/check.mjs`.
4. Write its notes file (`NAME.md`) and add it to `DOCS`.
5. Move the item from this list into the README's release history.
