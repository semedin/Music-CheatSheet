# Sound Design 02 — Make the sound in Serum 2

48 original house and techno recipes plus eight rumble studies, a beginner workflow, dictionary and eight-week practice plan.

## Start here

02 / YOUR FIRST SESSION

## You only need a few controls.

Keep Serum 2 open beside this guide.
Build, listen, then read the next step.

BEFORE TOUCHING A KNOB / 3 MINUTES

### Get one plain note working.

- In your DAW (the music program, such as Ableton Live), create a MIDI track and load the Serum 2 instrument. A MIDI note tells the instrument what to play; it contains no recorded sound.

- Click Serum’s MENU → Init Preset. “Init” means a plain starting patch. Save an existing sound first if you want to keep it. Begin every recipe from Init so old modulation does not change the result.

- Turn the Serum master output down to a comfortable level. Play the keyboard at the bottom of Serum. Then draw one MIDI note in the DAW and play the clip. If the keyboard works but the clip does not, check that the clip is on the Serum track and the track is audible.

- For these recipes keep OSC A on, OSC B/C, SUB and NOISE off until told otherwise. Keep Filter 2, FX, bus sends, ARP and CLIP playback off. Leave oscillator OCT and SEM at 0 unless a recipe specifies a transpose. Keep normal pitch tracking on.

- Double-click a knob to type its value. Use Shift while dragging for fine adjustments. Watch the readout and units: 100 ms is 0.1 seconds, and 1 kHz is 1000 Hz. Exact units matter more than the angle of a knob. [Control reference ↗](https://xferrecords.com/web-manual/serum-2/using-knobs-and-sliders)

Recipe ground rules. Values are original starting points. Keep unmentioned settings at Init. Basic waveforms come from Analog → Basic Shapes; choose the drawn sine, triangle, saw or square with WT POS. Match the picture of the wave, not a frame number copied from another wavetable. DETUNE values such as 0.08 are Serum’s knob readings, not cents.

THE MAP / CLICK EACH STAGE

### Sound flows. Modulation moves controls.

This is a simplified learning map, not a screenshot of Serum. “Routing” means choosing where audio goes next.

The oscillator (OSC) makes the raw material. On the OSC page, start with A only. Sine is round; triangle is gently buzzy; saw is dense and bright; square is hollow. NOISE has no single stable pitch. A wavetable is a collection of wave shapes, selected by WT POS.

The filter changes the spectrum: which frequencies survive. A low-pass removes highs above the cutoff; a high-pass removes lows below it. Resonance emphasizes the cutoff area. It only affects sources routed through it. Turn it on and test it with a bright saw.

ENV 1 normally makes the note start, sustain and stop. In this simplified map it follows the filter, with effects after it. Serum’s Mixer permits more elaborate envelope routing, but leave that at Init for these recipes. Envelopes are control signals, not extra sound sources.

On FX, distortion adds harmonics; chorus adds moving width; delay adds separate repeats; reverb adds a room-like tail. Order matters: distortion before reverb leaves a cleaner room; distortion after reverb also distorts the tail. Use one effect, then compare bypassed at similar loudness.

Master output sets how much level reaches the DAW. Check the patch with its neighbours, not only solo. A lead can be thin alone and right in the track. Save the native Serum preset with a useful name and notes after checking the loudest macro settings.

#### The small routing button matters

Near the top-right of an oscillator, open its routing button. Choose Filter and turn the balance fully toward Filter 1. Enable Filter 1, set its MIX to 100%, and route the filter to Main. Repeat for every audible source the recipe says to filter. New oscillators can route differently; switching on B does not guarantee B passes through A’s filter.

Main goes through the effects section. Direct bypasses filters and effects. None removes the audible output path, useful for a modulation-only source. Leave the normal ENV 1 amplitude control enabled in the Mixer. [Xfer routing reference ↗](https://xferrecords.com/web-manual/serum-2/routing-an-oscillator-or-filter)

YOUR FIRST BUILD / 10 MINUTES

### Turn the Init buzz into a rolling bass.

- Give it a low note. Init, then choose the saw in Basic Shapes. A LEVEL 60%, UNISON 1, OCT 0. In the DAW draw MIDI note 33 (A at 55 Hz) with a length of one eighth note. Set tempo to 128 BPM. Note names can differ by an octave between DAWs; MIDI numbers are unambiguous.

- Make it stop. ENV 1: ATK 2 ms, HOLD 0 ms, DEC 175 ms, SUS at the very bottom, REL 35 ms. Hold the key: the sound should fade even while you hold it. The bottom sustain value may display −∞ dB; that means silence, not “0 dB”.

- Make it dark. Route A to Filter 1, enable the filter and choose MG Low 24. Set cutoff 180 Hz, RES 15%, MIX 100%, DRIVE 0 initially. Play the note. It should become a quiet, dark buzz.

- Give the front a bite. ENV 2: ATK 0 ms, HOLD 0, DEC 110 ms, SUS minimum, REL 35 ms. Drag the small ENV 2 source handle onto Filter 1 Cutoff. Set the modulation to unipolar, positive: cutoff rests at 180 Hz and briefly opens to roughly 1400 Hz. Adjust the coloured modulation arc, not the base knob. The Matrix shows source, destination, amount and polarity if you need to check the connection.

- Listen before adding anything. It should say “dug”: bright front, dark body, silence. Remove the ENV 2 assignment temporarily: only the dark body remains. Restore it. That comparison teaches you what the envelope contributes.

- Put it in a groove. Open the Rolling techno bass recipe and download its test MIDI. Drag it onto the Serum track in your DAW. Keep the internal arp off. A few gaps will help more than a new effect.

ENVELOPES / ONE NOTE’S JOURNEY

### Volume shape comes first.

ENV 1 normally controls how loud the sound is over time. Other envelopes move the controls you assign them to.

- ATK / Attack: how long it takes to rise. 2 ms is nearly instant; 700 ms fades in.

- HOLD: time spent at the peak before decay. Use 0 for these basic patches.

- DEC / Decay: time to fall from peak to sustain while the note is held.

- SUS / Sustain: a level, not a time. Minimum = silence. Maximum = full held level.

- REL / Release: fade time after note-off, from whatever level the envelope has reached.

Releasing the MIDI note early starts release early. A 500 ms decay does not guarantee a 500 ms sound when the note lasts only 80 ms.

When this guide says 50% sustain, it means half the full linear level (about −6 dB for ENV 1). 25% ≈ −12 dB; 70% ≈ −3.1 dB. Use the provided dB value for ENV 1 if Serum displays dB. For other envelopes, use the displayed percentage or match the vertical level.

MODULATION / A HAND THAT MOVES A KNOB

### Source → destination → amount.

- Source: the thing doing the moving, such as ENV 2 or LFO 1.

- Destination: the knob being moved, such as cutoff.

- Amount: how far the movement goes. The coloured ring shows the travel around the base setting.

- Polarity: unipolar moves one way from the base; bipolar moves above and below it. Use the Matrix polarity control to check it.

A positive envelope on a low cutoff gives a bright attack that falls darker. A negative envelope on a high cutoff can start dark and open as the envelope falls.

An LFO is a repeating drawn movement. RETRIG restarts with each note; FREE continues; ENVELOPE runs the shape once. BPM sync expresses rate as note divisions. A rate of 1/4 means one cycle per quarter note, not one cycle per bar.

A macro is a knob you perform with. Drag Macro 1 to a target, set a useful range and name it Tone, Bite or Space. Start with one destination. Try both extremes before saving.

THE FINISH / 5 MINUTES

### Turn a successful experiment into a usable patch.

- Test register and articulation. Play low, middle and high notes; short and long gates; quiet and hard velocities. A patch can be excellent in one range without working everywhere.

- Match loudness when comparing. Lower the output of the brighter or distorted version so “better” is not simply “louder”. Keep individual tracks below clipping; there is no universal preset peak target.

- Check with a kick, then in mono. MONO voicing means one note at a time. It does not guarantee mono audio. Stereo widening and detuned sources still need a mono listening check.

- Make four useful controls. Tone = brightness; Bite = envelope or warp; Length = decay/release; Space = wet mix. Set modest ranges and check all four at maximum together. A macro moving cutoff can stack with ENV 2 and overshoot your intended peak.

- Save in Serum. Click the disk icon by the preset name. Use a name such as BS_Roll_Dark_v01. In DESC, write the register, key movement and macro meanings. Save a new version before a major change. [Saving reference ↗](https://xferrecords.com/web-manual/serum-2/saving-changes)

- Keep your source material. For your own imported audio, use the sample/wavetable name menu’s Embed in Preset option before moving the patch; factory content is not embeddable this way. Keep a source WAV backup too. [Embedding reference ↗](https://xferrecords.com/web-manual/serum-2/embedding-content-when-saving-a-preset)

The guide’s notebook is separate: it remembers your learning notes. It does not read, control or save the Serum plug-in. MIDI downloads contain notes, not Serum presets.

## Hear & learn

03 / EAR BEFORE EYE

## Hear what the controls do.

Predict the change. Move one control.
Compare at a comfortable level.

### One saw. Five decisions.

This little browser synth demonstrates amplitude and filter envelopes. Its sound is an approximation; it does not run Serum or copy its filter models.

Controls apply on the next note. A stores all six settings. Set an obvious contrast, then compare using the same note and output level; perceived loudness may still differ.

AMPLITUDE / SCHEMATIC, NOT TO TIME SCALE

The note stays held for two seconds. Release begins at note-off, wherever the envelope has reached.

#### 01 / Pluck becomes pad

Start with sustain 0%. Raise decay: does it keep sounding forever? Now set sustain to 70%, attack to 650 ms and release to 1200 ms. You have changed the role of the sound without changing the oscillator.

#### 02 / Dark is not the same as short

Hold the volume settings still. Lower cutoff, then raise Filter opening. The tail stays dark while the attack brightens. Compare with raising cutoff alone: that also brightens the tail.

#### 03 / Recall the cause

Store A as a short pluck. Change only release to 1500 ms and play again. With sustain at zero and decay complete before note-off, the long release adds almost nothing. Raise sustain and repeat: now release matters.

### A simple way to decode a reference sound

- Hum the body. Is there a stable note, a chord, or mostly noise?

- Tap its shape. Instant hit, pluck, sustained tone or slow swell?

- Listen to brightness over time. Does it close, open, wobble or stay still?

- Find the extra character. Beating saws, a metallic FM strike, distortion, or a recorded texture?

- Separate the room. Imagine the dry sound with echoes removed. Build that first.

#### Choose the smallest useful starting point

Round + low → sine or triangle.
Bright + buzzy → saw or square through a filter.
Bell / wood / metal → sine with FM.
Air / hiss / clap → noise through a filter.
Piano / choir → multisample.
A recognizable syllable → sample.
An evolving cloud → granular or spectral.

These are starting hypotheses. Test one, listen, and change your hypothesis if the sound asks for it.

---

# Round sub — Serum 2

Sound Design V2 · Bass · Level 1 · Wavetable

Deep house · minimal · techno

The foundation: a low, clean note that stops exactly when you need it to.

## Why it works

A sine has no upper harmonics. The note length and release define the groove more than a filter does.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Analog → Basic Shapes; WT POS on the sine (one smooth wave). LEVEL 65%; UNISON 1. Leave OCT at 0; the MIDI note provides the low register.
- ENV 1: ATK 4 ms · HOLD 0 ms · DEC 200 ms · SUS 100% / 0 dB · REL 65 ms
- Filter: Filter off; no filter-envelope assignment.
- MIDI first trigger: MIDI 33 (55.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Analog → Basic Shapes; WT POS on the sine (one smooth wave). LEVEL 65%; UNISON 1. Leave OCT at 0; the MIDI note provides the low register.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 4 ms · HOLD 0 ms · DEC 200 ms · SUS 100% / 0 dB · REL 65 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Leave Filter 1 and Filter 2 off. Route the audible source to Main so it can reach the output and any effects.

   Listen / check: The source supplies the tone; the filter is not needed for this core recipe.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: A soft, steady low note with no buzz or click. Laptop speakers may barely reproduce it.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 REL: 30 → 120 ms. Keep notes short enough to leave space. Name it “Length”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A soft, steady low note with no buzz or click. Laptop speakers may barely reproduce it.

## If it sounds wrong

Clicks: raise ATK to 6 ms and REL to 80 ms. Too weak on small speakers: try the Warm sub recipe; a filter cannot add missing harmonics.

## Variations

- Change sine to triangle for quiet upper harmonics.
- Lower SUS to 0% and use DEC 300 ms for a falling pulse.

## In the track

Use one sub layer at a time. Audition MIDI 29–41 (about 44–87 Hz) against the kick; lower is not automatically heavier.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Warm sub — Serum 2

Sound Design V2 · Bass · Level 1 · Wavetable

House · dub techno

A small amount of buzz makes a sub readable on smaller speakers.

## Why it works

Triangle harmonics and gentle clipping make the pitch easier to hear without needing another bass oscillator.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → triangle. LEVEL 60%; UNISON 1. Route A to Filter 1.
- ENV 1: ATK 4 ms · HOLD 0 ms · DEC 350 ms · SUS 65% / -3.7 dB · REL 70 ms
- Filter: MG Low 12 · cutoff 650 Hz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 33 (55.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → triangle. LEVEL 60%; UNISON 1. Route A to Filter 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 4 ms · HOLD 0 ms · DEC 350 ms · SUS 65% / -3.7 dB · REL 70 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 650 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: A rounded low note with a small, audible middle; the pitch stays stable.

6. **Finish, perform and save.** Add Distortion → Soft Clip after the filter. Start DRIVE 15%, MIX 25%; lower the output to match the bypassed loudness. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A rounded low note with a small, audible middle; the pitch stays stable.

## If it sounds wrong

Fuzz dominates: reduce distortion mix first, then drive. Do not compensate with a huge sub boost.

## Variations

- Remove distortion and compare the pitch on quiet speakers.
- Swap triangle for sine and increase drive gradually.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Rolling techno bass — Serum 2

Sound Design V2 · Bass · Level 1 · Wavetable

Rolling techno · hardgroove · deep tech

Short, dark pulses that lock between the kick drums.

## Why it works

The filter closes before the volume ends. You hear a bite, then a dark body, then room for the next event.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → saw. LEVEL 60%; UNISON 1; RAND 0% for a repeatable start. Try PHASE 90° if the attack clicks.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 175 ms · SUS minimum / −∞ dB · REL 35 ms
- Filter: MG Low 24 · cutoff 180 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 1.4 kHz, then closes over 110 ms.
- MIDI first trigger: MIDI 33 (55.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → saw. LEVEL 60%; UNISON 1; RAND 0% for a repeatable start. Try PHASE 90° if the attack clicks.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 175 ms · SUS minimum / −∞ dB · REL 35 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 180 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 110 ms, SUS 0%, REL 35 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 180 Hz, peak about 1.4 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** No LFO needed. Program short sixteenth notes with gaps. Set MIDI velocities to 95 / 65 / 80 for a repeating accent idea; add VELO → Filter 1 Cutoff, a small positive amount, only after the basic patch works.

   Listen / check: A small “dug” on each note, with silence between hits. It should still groove without effects.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A small “dug” on each note, with silence between hits. It should still groove without effects.

## If it sounds wrong

A continuous drone means SUS or release is too high, or notes overlap. A sharp click needs 3–5 ms attack, not more reverb.

## Variations

- DEC 260 ms and ENV 2 DEC 180 ms: a lazier deep-tech roll.
- Change saw to square and reduce resonance to 5%: a hollow jack.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Build it from Init in five minutes. Explain why turning ENV 1 SUS up destroys the gaps.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Offbeat house bass — Serum 2

Sound Design V2 · Bass · Level 1 · Wavetable

Classic house · progressive house

A buoyant bass note on each “and” between the kicks.

## Why it works

The silence before the note makes the bounce. The filter envelope gives a square wave a rounder front.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → square. LEVEL 55%; UNISON 1. Route A to Filter 1.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 260 ms · SUS 15% / -16.5 dB · REL 45 ms
- Filter: MG Low 24 · cutoff 260 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 1.9 kHz, then closes over 170 ms.
- MIDI first trigger: MIDI 33 (55.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → square. LEVEL 55%; UNISON 1. Route A to Filter 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 260 ms · SUS 15% / -16.5 dB · REL 45 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 260 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 170 ms, SUS 0%, REL 45 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 260 Hz, peak about 1.9 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Place four eighth notes halfway between quarter-note kicks. Keep their lengths below half a beat. Try VELO → Cutoff so one offbeat can answer another.

   Listen / check: A hollow “bup” after each kick, with no continuous high buzz.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A hollow “bup” after each kick, with no continuous high buzz.

## If it sounds wrong

If it stays bright, confirm OSC A routes to Filter 1 and that the filter is on. If it is silent, temporarily open the cutoff.

## Variations

- Change to saw for a denser, more modern bass.
- ENV 1 SUS 0% and DEC 150 ms: a more clipped minimal-house version.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Rubber FM bass — Serum 2

Sound Design V2 · Bass · Level 2 · Wavetable

Tech house · minimal house

A springy, vowel-like “donk” that settles into a rounded note.

## Why it works

An oscillator moving another oscillator at audio speed adds harmonics. A fast envelope removes those harmonics as the note settles.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → sine, LEVEL 65%. Enable OSC B: sine, OCT +1, LEVEL 0%. B must remain powered on. On A choose WARP → FM (B), start at 12%.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 250 ms · SUS minimum / −∞ dB · REL 50 ms
- Filter: MG Low 24 · cutoff 500 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 3.8 kHz, then closes over 160 ms.
- MIDI first trigger: MIDI 36 (65.4 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → sine, LEVEL 65%. Enable OSC B: sine, OCT +1, LEVEL 0%. B must remain powered on. On A choose WARP → FM (B), start at 12%.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 250 ms · SUS minimum / −∞ dB · REL 50 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 500 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 160 ms, SUS 0%, REL 50 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 500 Hz, peak about 3.8 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 3: ATK 0 ms, HOLD 0, DEC 120 ms, SUS minimum, REL 30 ms. Drag ENV 3 to A WARP amount: unipolar upward, roughly 12% → 30% at the attack. B is the modulator; it need not be audible.

   Listen / check: A rounded “yow” front, not a separate high sine from B.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to A WARP FM (B): 8% → 28%. Check the loudest end and lower output if needed. Name it “Bite”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A rounded “yow” front, not a separate high sine from B.

## If it sounds wrong

Only a sine: check B power and A’s FM (B) selection. A shriek: lower A Warp amount before closing the filter.

## Variations

- B OCT 0: more hollow; B OCT +2: more metallic.
- ENV 3 DEC 60 ms: shorter, woodier attack.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Dark Reese — Serum 2

Sound Design V2 · Bass · Level 2 · Wavetable

Raw techno · breaks · warehouse

Slow beating between two detuned saws; a moving middle above your low foundation.

## Why it works

Slightly different pitches beat against each other. The motion is inside the source, so it survives with all FX bypassed.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A and OSC B: Basic Shapes → saw; UNISON 1 each; LEVEL 40% each. A FIN −7 cents, B FIN +7 cents. Route both to Filter 1. SUB off.
- ENV 1: ATK 12 ms · HOLD 0 ms · DEC 400 ms · SUS 85% / -1.4 dB · REL 120 ms
- Filter: MG Low 24 · cutoff 1.1 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 36 (65.4 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A and OSC B: Basic Shapes → saw; UNISON 1 each; LEVEL 40% each. A FIN −7 cents, B FIN +7 cents. Route both to Filter 1. SUB off.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 12 ms · HOLD 0 ms · DEC 400 ms · SUS 85% / -1.4 dB · REL 120 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 1.1 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** LFO 1: triangle, BPM on, RATE 2 bars, FREE. Route to Filter 1 Cutoff for a gentle 700–1600 Hz sweep. Use unipolar modulation from 700 Hz; do not sweep down into silence.

   Listen / check: A slow, restless buzz with a moving centre. The very lowest energy may fluctuate.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to B FIN: +3 → +12 cents; leave A FIN at −7 cents. Name it “Motion”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A slow, restless buzz with a moving centre. The very lowest energy may fluctuate.

## If it sounds wrong

Weak in mono: reduce detune, centre both pans and check without chorus. For a reliable sub, high-pass this layer in the DAW and add a separate mono sine.

## Variations

- Cutoff 450 Hz: distant, woolly bass.
- OCT +1 on both oscillators: a mid-bass answer above a separate sub.

## In the track

Treat a wide Reese as a middle layer. Check the full bass in mono; detuned oscillators can cancel even without stereo effects.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Acid house line — Serum 2

Sound Design V2 · Bass · Level 2 · Wavetable

Acid house · Chicago

A resonant squelch whose accents and slides are part of the instrument.

## Why it works

Resonance highlights the moving cutoff. Pitch slides connect notes while velocity changes how hard the filter opens.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → saw; LEVEL 55%; UNISON 1. Filter 1: choose Acid Ladder. This is a 303-inspired study, not an exact 303 circuit or sequencer reproduction.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 300 ms · SUS 35% / -9.1 dB · REL 40 ms
- Filter: Acid Ladder · cutoff 220 Hz · RES 55% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 2.6 kHz, then closes over 190 ms.
- MIDI first trigger: MIDI 36 (65.4 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → saw; LEVEL 55%; UNISON 1. Filter 1: choose Acid Ladder. This is a 303-inspired study, not an exact 303 circuit or sequencer reproduction.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 300 ms · SUS 35% / -9.1 dB · REL 40 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose Acid Ladder. Set cutoff 220 Hz, RES 55%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 190 ms, SUS 0%, REL 40 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 220 Hz, peak about 2.6 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Enable MONO and LEGATO in voicing. Set PORTA to about 80 ms and enable its legato-only option. Overlap only the notes you want to slide. Add VELO → Filter 1 Cutoff, a small positive amount; use high velocity on selected accents.

   Listen / check: “Ow” accents and a few connected slides; most notes remain distinct.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Filter 1 Cutoff: 180 → 1800 Hz. Keep the ENV 2 opening above that base modest at the high end. Name it “Open”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

“Ow” accents and a few connected slides; most notes remain distinct.

## If it sounds wrong

Every note slides: check the legato-only portamento option and shorten the non-slide notes. No envelope on overlapped notes can be expected with legato; leave gaps for fresh attacks.

## Variations

- Square wave: hollower, more nasal acid.
- ENV 2 DEC 80 ms: tiny rubber accents.

## In the track

Resonance can change both loudness and perceived bass. Match level while sweeping and check the line with the kick.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Driven acid techno — Serum 2

Sound Design V2 · Bass · Level 2 · Wavetable

Acid techno · peak time

The acid recipe pushed through a rougher, more forward middle.

## Why it works

Distortion after a resonant filter reshapes its moving peak. The sweep remains the identity; gain supplies the aggression.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → saw; LEVEL 45%; UNISON 1. Filter 1: Acid Ladder. Keep SUB off while finding the drive.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 210 ms · SUS minimum / −∞ dB · REL 35 ms
- Filter: Acid Ladder · cutoff 340 Hz · RES 65% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 3.8 kHz, then closes over 130 ms.
- MIDI first trigger: MIDI 36 (65.4 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → saw; LEVEL 45%; UNISON 1. Filter 1: Acid Ladder. Keep SUB off while finding the drive.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 210 ms · SUS minimum / −∞ dB · REL 35 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose Acid Ladder. Set cutoff 340 Hz, RES 65%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 130 ms, SUS 0%, REL 35 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 340 Hz, peak about 3.8 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** MONO on; start LEGATO off to hear every filter attack. Later enable legato-only PORTA at 60 ms and overlap two notes. Automate cutoff slowly over eight bars in your DAW.

   Listen / check: A sharper bark than the house version, with the note still identifiable.

6. **Finish, perform and save.** After Filter 1, add Distortion → Tube. Start DRIVE 30%, MIX 40%. Add an EQ high shelf cut only if the top becomes abrasive; reduce drive before relying on EQ. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A sharper bark than the house version, with the note still identifiable.

## If it sounds wrong

Fizzy wall: halve DRIVE and lower ENV 2 peak. Bass vanishes: reduce resonance and compare at the same loudness.

## Variations

- Move distortion before a filter in the FX rack to hear a smoother result.
- Square source and 30% resonance: less screaming, more groove.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Talking bass wobble — Serum 2

Sound Design V2 · Bass · Level 2 · Wavetable

Bass house · UK-influenced house

A held bass note articulated by a repeating filter movement.

## Why it works

The note stays held while a repeating modulation creates new syllables. ENV 2 is unnecessary here.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → square. LEVEL 55%; UNISON 1. Filter 1: MG Low 24, RES 30%.
- ENV 1: ATK 4 ms · HOLD 0 ms · DEC 250 ms · SUS 100% / 0 dB · REL 70 ms
- Filter: MG Low 24 · cutoff 250 Hz · RES 30% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 36 (65.4 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → square. LEVEL 55%; UNISON 1. Filter 1: MG Low 24, RES 30%.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 4 ms · HOLD 0 ms · DEC 250 ms · SUS 100% / 0 dB · REL 70 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 250 Hz, RES 30%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** LFO 1: draw a triangle, BPM on, RATE 1/8, RETRIG on. Assign to Filter 1 Cutoff, unipolar upward: base 250 Hz, top about 2200 Hz. Hold one note to hear two openings per beat.

   Listen / check: A regular “wah-wah” during one held MIDI note.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to LFO 1 modulation depth to Filter 1 Cutoff: about 1 → 3 octaves. Use Matrix Aux Macro 1 for depth control. Name it “Talk”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A regular “wah-wah” during one held MIDI note.

## If it sounds wrong

One wah only: LFO is in ENVELOPE mode. Erratic starts: choose RETRIG. Too busy: change rate to 1/4.

## Variations

- Rate 1/4: a slower head nod.
- Draw a falling ramp instead of triangle: repeated plucks within one note.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# EBM octave bass — Serum 2

Sound Design V2 · Bass · Level 2 · Wavetable

Industrial · EBM · dark techno

A hard, mechanical bass with a bright octave in the attack.

## Why it works

The octave layer and clipped envelope make a rigid, bright front. The short decay leaves room for a fast rhythm.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, LEVEL 50%. OSC B: square, OCT +1, LEVEL 18%. UNISON 1 on both; route both to Filter 1.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 150 ms · SUS minimum / −∞ dB · REL 25 ms
- Filter: MG Low 24 · cutoff 380 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 2.5 kHz, then closes over 80 ms.
- MIDI first trigger: MIDI 36 (65.4 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, LEVEL 50%. OSC B: square, OCT +1, LEVEL 18%. UNISON 1 on both; route both to Filter 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 150 ms · SUS minimum / −∞ dB · REL 25 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 380 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 80 ms, SUS 0%, REL 25 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 380 Hz, peak about 2.5 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Use alternating root and octave MIDI notes. ENV 2 decay stays shorter than ENV 1 decay. Keep phase randomization low for repeatable hits.

   Listen / check: A terse, barking sequence with a clear low root.

6. **Finish, perform and save.** Distortion → Soft Clip, DRIVE 25%, MIX 40%. No reverb on the main bass. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A terse, barking sequence with a clear low root.

## If it sounds wrong

If it stays bright, confirm OSC A routes to Filter 1 and that the filter is on. If it is silent, temporarily open the cutoff.

## Variations

- Mute B: drier and more minimal.
- B SEM +7 instead of OCT +1: a clangorous fifth; use sparingly in a busy mix.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Deep house chord stab — Serum 2

Sound Design V2 · Chords · Level 1 · Wavetable

Deep house · garage

A soft-edged minor seventh chord with a short, warm tail.

## Why it works

The MIDI voicing supplies the harmony; the filter envelope supplies the soft “chuh” articulation.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → saw; LEVEL 45%; UNISON 1. MONO off; set polyphony to at least 8. Play A–C–E–G as four MIDI notes (57, 60, 64, 67); do not tune oscillators to a chord as well.
- ENV 1: ATK 5 ms · HOLD 0 ms · DEC 480 ms · SUS minimum / −∞ dB · REL 120 ms
- Filter: MG Low 12 · cutoff 900 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 4.6 kHz, then closes over 260 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → saw; LEVEL 45%; UNISON 1. MONO off; set polyphony to at least 8. Play A–C–E–G as four MIDI notes (57, 60, 64, 67); do not tune oscillators to a chord as well.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 5 ms · HOLD 0 ms · DEC 480 ms · SUS minimum / −∞ dB · REL 120 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 900 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 260 ms, SUS 0%, REL 120 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 900 Hz, peak about 4.6 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: Four pitches arrive together, then darken as they fade.

6. **Finish, perform and save.** Chorus MIX 12%, then Reverb MIX 12%, DECAY about 1.2 s. Keep the dry chord clearly louder than its tail. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

Four pitches arrive together, then darken as they fade.

## If it sounds wrong

Only one note sounds: turn MONO off. Too thick: remove the lowest chord note or move the whole voicing up an octave.

## Variations

- Use MIDI 57, 60, 64, 71 for a minor add9 colour.
- DEC 220 ms and reverb off: tighter garage chop.

## In the track

Keep the bass root on its own track. Chord roots need not sit in the sub register.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Dub techno chord — Serum 2

Sound Design V2 · Chords · Level 2 · Wavetable

Dub techno · deep techno

A dark chord whose filtered echoes become the rhythm.

## Why it works

Space between dry hits lets the echoes form a second pattern. Filtering the repeats separates them from the next chord.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, LEVEL 45%, UNISON 1. Polyphony 8+. Play MIDI 57, 60, 64, 67 together. Route A to Filter 1.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 230 ms · SUS minimum / −∞ dB · REL 80 ms
- Filter: MG Low 12 · cutoff 650 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 2.7 kHz, then closes over 130 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, LEVEL 45%, UNISON 1. Polyphony 8+. Play MIDI 57, 60, 64, 67 together. Route A to Filter 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 230 ms · SUS minimum / −∞ dB · REL 80 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 650 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 130 ms, SUS 0%, REL 80 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 650 Hz, peak about 2.7 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Macro 1 moves Filter 1 Cutoff 450 → 2200 Hz. For one “throw”, briefly raise delay MIX to 40% on the last chord, then return to 25%. Leave FEEDBACK below 55% while learning.

   Listen / check: A short chord, then quieter, darker replies that die away.

6. **Finish, perform and save.** Delay: BPM sync, dotted 1/8, FEEDBACK 35%, MIX 25%; darken its repeats with its filter controls. Reverb after Delay: DECAY 2.5 s, MIX 15%. Start with all bus sends at zero. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A short chord, then quieter, darker replies that die away.

## If it sounds wrong

Endless wash: reduce feedback first, then reverb decay. Dry chord too long: reduce ENV 1 decay before reducing delay.

## Variations

- Delay straight 1/4: a more spacious pulse.
- Change the chord to 57, 60, 67: an open minor voicing.

## In the track

Keep the wet low end out of the kick’s way. Listen to eight bars so you judge the accumulated echoes, not only the first hit.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Rave chord stab — Serum 2

Sound Design V2 · Chords · Level 2 · Wavetable

Rave techno · warehouse house

A bright, blunt chord hit made with oscillator intervals.

## Why it works

Fixed oscillator intervals turn one key into a minor chord. Transposing that whole shape creates the parallel-chord rave sound.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A, B and C: Basic Shapes → saw, LEVEL 30% each, UNISON 1. A SEM 0, B SEM +3, C SEM +7. Route all three to Filter 1. Play single MIDI notes; the oscillators already make a minor triad.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 200 ms · SUS minimum / −∞ dB · REL 65 ms
- Filter: MG Low 24 · cutoff 2.3 kHz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 7 kHz, then closes over 100 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A, B and C: Basic Shapes → saw, LEVEL 30% each, UNISON 1. A SEM 0, B SEM +3, C SEM +7. Route all three to Filter 1. Play single MIDI notes; the oscillators already make a minor triad.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 200 ms · SUS minimum / −∞ dB · REL 65 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 2.3 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 100 ms, SUS 0%, REL 65 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 2.3 kHz, peak about 7 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: A solid minor triad on a single key; a sharp start with a short tail.

6. **Finish, perform and save.** Distortion → Soft Clip, DRIVE 15%, MIX 30%. Optional Reverb MIX 8%, DECAY 0.8 s. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A solid minor triad on a single key; a sharp start with a short tail.

## If it sounds wrong

Too many notes: use single MIDI notes, not the four-note chord pattern from Deep house stab. Fixed minor shapes will not follow every chord progression diatonically.

## Variations

- B SEM +4: major instead of minor.
- B SEM +7, C SEM +12: an open fifth/octave stack.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# House organ — Serum 2

Sound Design V2 · Chords · Level 1 · Wavetable

90s house · garage

A hollow, steady organ made by adding sine-wave harmonics.

## Why it works

The second and approximately third harmonics act like organ drawbars. There is no hammer decay while you hold a note.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: A, B and C: Basic Shapes → sine, UNISON 1. A LEVEL 50%, OCT 0; B LEVEL 25%, OCT +1; C LEVEL 15%, OCT +1 and SEM +7 (19 semitones above A). All route Main. MONO off; polyphony 8+.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 180 ms · SUS 85% / -1.4 dB · REL 55 ms
- Filter: Filter off; no filter-envelope assignment.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** A, B and C: Basic Shapes → sine, UNISON 1. A LEVEL 50%, OCT 0; B LEVEL 25%, OCT +1; C LEVEL 15%, OCT +1 and SEM +7 (19 semitones above A). All route Main. MONO off; polyphony 8+.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 180 ms · SUS 85% / -1.4 dB · REL 55 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Leave Filter 1 and Filter 2 off. Route the audible source to Main so it can reach the output and any effects.

   Listen / check: The source supplies the tone; the filter is not needed for this core recipe.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: A hollow sustained note that cuts off quickly when released. This is a synthesized organ, not the sampled M1 organ.

6. **Finish, perform and save.** Optional Chorus MIX 10%. Keep Reverb MIX below 10%, DECAY about 0.7 s. Map Macro 1 to OSC C LEVEL: 0% → 25%. Name it “Drawbar”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A hollow sustained note that cuts off quickly when released. This is a synthesized organ, not the sampled M1 organ.

## If it sounds wrong

Sounds like a separate high whistle: lower C. Sounds like a pluck: raise ENV 1 SUS to 85%.

## Variations

- Mute C and raise B: rounder and simpler.
- ENV 1 DEC 180 ms, SUS 0%: organ bass; play MIDI 36–48.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Piano house keys — Serum 2

Sound Design V2 · Chords · Level 1 · Multisample

Piano house · soulful house

Start with a piano multisample, then shape it to leave room for the groove.

## Why it works

A real piano attack contains many interacting partials. Multisamples supply that complexity; envelopes and performance place it in the track.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A header → Multisample. Open the content selector → Factory → Keys; choose an acoustic piano by auditioning the installed choices. LEVEL 55%, UNISON 1, pitch tracking on. MONO off, polyphony at least 12. Content names vary by library version.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 1.30 s · SUS 50% / -6.0 dB · REL 170 ms
- Filter: MG Low 12 · cutoff 9 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60; the recorded source's tuning depends on its root-note mapping.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A header → Multisample. Open the content selector → Factory → Keys; choose an acoustic piano by auditioning the installed choices. LEVEL 55%, UNISON 1, pitch tracking on. MONO off, polyphony at least 12. Content names vary by library version.

   Listen / check: Audition the source at its root note before changing the envelope.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 1.30 s · SUS 50% / -6.0 dB · REL 170 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 9 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Play chord hits with different MIDI velocities. Audition 50 versus 110: the multisample may change timbre as well as level. Use short MIDI gates to keep the hook percussive.

   Listen / check: A recognisable hammer attack and a ringing tail. This guide does not provide the source piano audio.

6. **Finish, perform and save.** Reverb MIX 10%, DECAY 1 s. Avoid large chorus until the dry piano rhythm works. Map Macro 1 to Filter 1 Cutoff: 2500 → 12000 Hz. Name it “Shade”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A recognisable hammer attack and a ringing tail. This guide does not provide the source piano audio.

## If it sounds wrong

Sound stops unnaturally: increase REL slightly. Mud: move the voicing up and reduce release before EQ.

## Variations

- Choose an electric piano from Keys for a softer reply.
- Shorten DEC to 450 ms and SUS to 0% for a clipped house stab.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Glass electric keys — Serum 2

Sound Design V2 · Chords · Level 2 · Wavetable

Deep house · lo-fi house

A bell-like attack that softens into a simple, musical body.

## Why it works

A near-integer frequency ratio gives a pitched bell colour. The modulation decays faster than the note, like the hard strike on a tine.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: A: sine LEVEL 55%. B: sine, OCT +1 and SEM +7 (about 3:1), LEVEL 0%, power on. A WARP → FM (B), amount 8%. Polyphony 12+.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 1.20 s · SUS 12% / -18.4 dB · REL 260 ms
- Filter: MG Low 24 · cutoff 6 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 (261.6 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** A: sine LEVEL 55%. B: sine, OCT +1 and SEM +7 (about 3:1), LEVEL 0%, power on. A WARP → FM (B), amount 8%. Polyphony 12+.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 1.20 s · SUS 12% / -18.4 dB · REL 260 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 6 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 3: ATK 0, HOLD 0, DEC 240 ms, SUS minimum, REL 80 ms. Route upward to A WARP for about 8% → 22% on attack. Add a small positive VELO → A WARP assignment so harder notes brighten.

   Listen / check: A little “ting” followed by a softer, rounded sustain.

6. **Finish, perform and save.** Chorus MIX 8%, then Reverb MIX 12%, DECAY 1.4 s. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A little “ting” followed by a softer, rounded sustain.

## If it sounds wrong

Clangy and dissonant: lower Warp amount or set B OCT +1, SEM 0 for an exact 2:1 ratio.

## Variations

- B OCT +2, SEM 0: brighter, higher partials.
- ENV 3 DEC 80 ms: a tiny mallet front.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Disco synth brass — Serum 2

Sound Design V2 · Chords · Level 2 · Wavetable

Disco house · classic house

A short upward bloom before the chord barks and settles.

## Why it works

A brief filter opening after the note starts imitates the way a brass section swells into its attack.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, UNISON 2, DETUNE 0.05, LEVEL 45%. MONO off, polyphony 12+. Route A to Filter 1.
- ENV 1: ATK 18 ms · HOLD 0 ms · DEC 420 ms · SUS 45% / -6.9 dB · REL 110 ms
- Filter: MG Low 24 · cutoff 650 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 4.3 kHz, then closes over 280 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, UNISON 2, DETUNE 0.05, LEVEL 45%. MONO off, polyphony 12+. Route A to Filter 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 18 ms · HOLD 0 ms · DEC 420 ms · SUS 45% / -6.9 dB · REL 110 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 650 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 35 ms, HOLD 0, DEC 280 ms, SUS 25%, REL 90 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 650 Hz, peak about 4.3 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 2 ATK 35 ms gives the brass “bwah”; HOLD 0, DEC 280 ms, SUS 25%, REL 90 ms. Set upward cutoff movement from 650 Hz to roughly 4300 Hz. Play staccato minor seventh or major sixth chords.

   Listen / check: A little bloom rather than an instant pluck. The held chord still has a body.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A little bloom rather than an instant pluck. The held chord still has a body.

## If it sounds wrong

Sounds like a pad: reduce both attack times. Sounds too plucky: raise ENV 2 sustain slightly.

## Variations

- ATK 70 ms: softer, funkier swell.
- UNISON 1: focused old-school brass.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# One-key minor ninth — Serum 2

Sound Design V2 · Chords · Level 2 · Wavetable

Deep techno · microhouse

A compact, floating chord texture from three deliberately chosen intervals.

## Why it works

Leaving out the fifth makes the shape less dense. The high ninth supplies colour while the root and third define minor.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: A, B and C: triangle, LEVEL 35% each, UNISON 1. A SEM 0; B SEM +3; C OCT +1, SEM +2 (+14 total). Route all to Filter 1. Play one MIDI note at a time. The root, minor third and ninth omit the fifth.
- ENV 1: ATK 8 ms · HOLD 0 ms · DEC 650 ms · SUS minimum / −∞ dB · REL 190 ms
- Filter: MG Low 24 · cutoff 1.1 kHz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 4 kHz, then closes over 300 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** A, B and C: triangle, LEVEL 35% each, UNISON 1. A SEM 0; B SEM +3; C OCT +1, SEM +2 (+14 total). Route all to Filter 1. Play one MIDI note at a time. The root, minor third and ninth omit the fifth.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 8 ms · HOLD 0 ms · DEC 650 ms · SUS minimum / −∞ dB · REL 190 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 1.1 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 300 ms, SUS 0%, REL 150 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 1.1 kHz, peak about 4 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: A soft, slightly unresolved chord from a single key.

6. **Finish, perform and save.** Delay straight 1/8, FEEDBACK 22%, MIX 15%. Reverb MIX 10%, DECAY 1.5 s. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A soft, slightly unresolved chord from a single key.

## If it sounds wrong

Clashing with a progression: check the actual pitches after transposing. A fixed shape does not know the key of your song.

## Variations

- C +10 semitones: root/third/minor seventh.
- B +4 and C +14: a major add9 colour.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Melodic techno pluck — Serum 2

Sound Design V2 · Leads · Level 1 · Wavetable

Melodic techno · progressive house

The essential bright-to-dark pluck that carries a repeating motif.

## Why it works

A large filter sweep gives an expressive attack. The dark tail leaves room for the next note without losing the note’s pitch.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → saw, UNISON 3, DETUNE 0.08, LEVEL 45%. MONO off; polyphony 8+. Filter 1: MG Low 24.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 480 ms · SUS minimum / −∞ dB · REL 100 ms
- Filter: MG Low 24 · cutoff 650 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 6.5 kHz, then closes over 230 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → saw, UNISON 3, DETUNE 0.08, LEVEL 45%. MONO off; polyphony 8+. Filter 1: MG Low 24.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 480 ms · SUS minimum / −∞ dB · REL 100 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 650 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 230 ms, SUS 0%, REL 100 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 650 Hz, peak about 6.5 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Keep modulation off apart from the envelope described above. Make the rhythm with MIDI notes.

   Listen / check: A definite “tah” that softens; delay answers rather than masking the next note.

6. **Finish, perform and save.** Delay dotted 1/8, FEEDBACK 25%, MIX 18%. Reverb MIX 12%, DECAY 1.8 s. Get the dry pluck working first. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A definite “tah” that softens; delay answers rather than masking the next note.

## If it sounds wrong

If it stays bright, confirm OSC A routes to Filter 1 and that the filter is on. If it is silent, temporarily open the cutoff.

## Variations

- ENV 2 DEC 90 ms: a small, glassy tick.
- ENV 2 DEC 500 ms: an opening, more emotional phrase.

## In the track

Use the MIDI from a Fieldwork V3 melody here. If every note feels too busy, shorten the patch before rewriting the motif.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Hypnotic bleep — Serum 2

Sound Design V2 · Leads · Level 1 · Wavetable

Minimal techno · bleep · hypnotic

A narrow, repetitive tone whose small changes stay audible.

## Why it works

A sparse source and short envelope make rhythm and subtle tone changes easy to hear.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → triangle, LEVEL 60%; UNISON 1. Filter 1 on. Polyphony 4 is enough for short tails.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 120 ms · SUS minimum / −∞ dB · REL 35 ms
- Filter: MG Low 12 · cutoff 1.2 kHz · RES 25% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 4 kHz, then closes over 70 ms.
- MIDI first trigger: MIDI 69 (440.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → triangle, LEVEL 60%; UNISON 1. Filter 1 on. Polyphony 4 is enough for short tails.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 120 ms · SUS minimum / −∞ dB · REL 35 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 1.2 kHz, RES 25%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 70 ms, SUS 0%, REL 35 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 1.2 kHz, peak about 4 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Use only three MIDI pitches: A, C and E. Keep the first five notes identical, then change the last. Map a macro to cutoff so you can make one small change per four bars.

   Listen / check: A small “pip”, not a huge lead. The repetition should be hypnotic at low volume.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A small “pip”, not a huge lead. The repetition should be hypnotic at low volume.

## If it sounds wrong

If it stays bright, confirm OSC A routes to Filter 1 and that the filter is on. If it is silent, temporarily open the cutoff.

## Variations

- Sine instead of triangle: purer bleeps.
- Add delay MIX 20%, time 3/16, feedback 30% for interlocking replies.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Open supersaw lead — Serum 2

Sound Design V2 · Leads · Level 2 · Wavetable

Melodic house · trance techno

A wide saw stack with a clear central pitch and room to open.

## Why it works

Several detuned voices spread the same pitch. Too much detune makes the pitch centre vague; more voices is not always better.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, UNISON 7, DETUNE 0.14, BLEND about 65%, LEVEL 40%. Leave other oscillators off. MONO off; polyphony 8+.
- ENV 1: ATK 8 ms · HOLD 0 ms · DEC 650 ms · SUS 70% / -3.1 dB · REL 160 ms
- Filter: MG Low 24 · cutoff 1.5 kHz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 6.5 kHz, then closes over 350 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, UNISON 7, DETUNE 0.14, BLEND about 65%, LEVEL 40%. Leave other oscillators off. MONO off; polyphony 8+.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 8 ms · HOLD 0 ms · DEC 650 ms · SUS 70% / -3.1 dB · REL 160 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 1.5 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 350 ms, SUS 0%, REL 150 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 1.5 kHz, peak about 6.5 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Macro 1 opens Filter 1 Cutoff 1500 → 10000 Hz. Make a held note work first, then use a melody with longer notes than the pluck recipe.

   Listen / check: A broad, stable pitch with shimmer at the sides, even at moderate level.

6. **Finish, perform and save.** Reverb MIX 15%, DECAY 2 s. Delay straight 1/4, feedback 20%, MIX 12%. Avoid stacking extra widening before checking mono. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A broad, stable pitch with shimmer at the sides, even at moderate level.

## If it sounds wrong

Seasick: lower DETUNE to 0.08. CPU spikes: reduce UNISON to 4 before adding more layers.

## Variations

- UNISON 3, DETUNE 0.06: intimate progressive lead.
- SUS 0%, DEC 250 ms: a wide rave pluck.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Singing glide lead — Serum 2

Sound Design V2 · Leads · Level 2 · Wavetable

Progressive · melodic techno

A focused, vocal-like mono line with intentional connections.

## Why it works

Legato preserves continuity across overlapping notes. The musical connection comes from MIDI length as well as the synth setting.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: square, LEVEL 55%, UNISON 1. MONO on; LEGATO on. PORTA about 100 ms; enable legato-only portamento.
- ENV 1: ATK 8 ms · HOLD 0 ms · DEC 450 ms · SUS 75% / -2.5 dB · REL 90 ms
- Filter: MG Low 24 · cutoff 900 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 3.3 kHz, then closes over 300 ms.
- MIDI first trigger: MIDI 60 (261.6 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: square, LEVEL 55%, UNISON 1. MONO on; LEGATO on. PORTA about 100 ms; enable legato-only portamento.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 8 ms · HOLD 0 ms · DEC 450 ms · SUS 75% / -2.5 dB · REL 90 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 900 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 300 ms, SUS 0%, REL 90 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 900 Hz, peak about 3.3 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Make a four-note phrase. Leave the first note separate, then overlap notes two and three by a sixteenth. The overlap creates the slide; ordinary separated notes should jump cleanly.

   Listen / check: One clean attack followed by a smooth pitch transition only where notes overlap.

6. **Finish, perform and save.** Delay straight 1/8, FEEDBACK 20%, MIX 15%. Reverb MIX 10%, DECAY 1.3 s. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

One clean attack followed by a smooth pitch transition only where notes overlap.

## If it sounds wrong

No slide: verify MONO, PORTA time and actual note overlap. Every note smears: shorten your gates.

## Variations

- Saw source: brighter, more urgent.
- PORTA 35 ms: a subtle glide rather than a big slide.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# FM bell sequence — Serum 2

Sound Design V2 · Leads · Level 2 · Wavetable

Minimal · melodic techno · afro house

A bright pitched strike with a long, fading ring.

## Why it works

The almost-3:1 modulator ratio creates a bell-like harmonic pattern with a slight beating edge.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: sine, LEVEL 55%. OSC B: sine, OCT +1, SEM +7, FIN +4 cents, LEVEL 0%, power on. A WARP → FM (B), start 20%. Polyphony 8+.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 1.70 s · SUS minimum / −∞ dB · REL 380 ms
- Filter: MG Low 24 · cutoff 9 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 69 (440.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: sine, LEVEL 55%. OSC B: sine, OCT +1, SEM +7, FIN +4 cents, LEVEL 0%, power on. A WARP → FM (B), start 20%. Polyphony 8+.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 1.70 s · SUS minimum / −∞ dB · REL 380 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 9 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 3: ATK 0, HOLD 0, DEC 550 ms, SUS minimum, REL 150 ms. Assign upward to A Warp so the strike rises from 20% to about 35%.

   Listen / check: A pitched strike that keeps ringing. It should not need huge reverb to sound bell-like.

6. **Finish, perform and save.** Reverb MIX 18%, DECAY 2.5 s. Let the dry bell ring before adding delay. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A pitched strike that keeps ringing. It should not need huge reverb to sound bell-like.

## If it sounds wrong

Too clangy for the chord: remove B FIN offset and reduce Warp. Too sharp: lower cutoff to 5000 Hz.

## Variations

- B SEM 0, OCT +1: rounder exact 2:1 tone.
- ENV 1 DEC 350 ms: a short bell pluck.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Wooden afro-house mallet — Serum 2

Sound Design V2 · Leads · Level 2 · Wavetable

Afro house · organic house

A dry wooden knock with just enough pitch to carry a hook.

## Why it works

A very fast burst of modulation supplies the wooden hit; the simple body keeps the pitch clear.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: A: sine LEVEL 60%. B: sine OCT +2, LEVEL 0%, power on. A WARP FM (B), base 3%. Polyphony 8.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 320 ms · SUS minimum / −∞ dB · REL 75 ms
- Filter: MG Low 24 · cutoff 3.3 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 (261.6 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** A: sine LEVEL 60%. B: sine OCT +2, LEVEL 0%, power on. A WARP FM (B), base 3%. Polyphony 8.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 320 ms · SUS minimum / −∞ dB · REL 75 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 3.3 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 3: ATK 0, HOLD 0, DEC 55 ms, SUS minimum, REL 20 ms. Assign upward to A Warp so its attack reaches about 25%.

   Listen / check: A “tok” at the front with a brief rounded ring.

6. **Finish, perform and save.** Reverb MIX 10%, DECAY 0.9 s. Optional Delay dotted 1/8, FEEDBACK 18%, MIX 12%. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A “tok” at the front with a brief rounded ring.

## If it sounds wrong

Sounds like a long bell: shorten ENV 3 first, then ENV 1. Too dull: raise the modulation peak a little.

## Variations

- B OCT +1: softer, rounder wood.
- ENV 3 DEC 100 ms: more metallic, less woody.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Tearing sync lead — Serum 2

Sound Design V2 · Leads · Level 2 · Wavetable

Peak-time techno · electro house

A bright, tearing edge that moves without changing the played note.

## Why it works

Sync changes the harmonic pattern by forcing extra waveform resets. The fundamental can stay anchored while the tone rips upward.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: Basic Shapes → saw, LEVEL 45%, UNISON 1. A WARP → Sync, amount about 15%. Leave OSC B off.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 450 ms · SUS 50% / -6.0 dB · REL 100 ms
- Filter: MG Low 24 · cutoff 1.7 kHz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 6 kHz, then closes over 250 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: Basic Shapes → saw, LEVEL 45%, UNISON 1. A WARP → Sync, amount about 15%. Leave OSC B off.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 450 ms · SUS 50% / -6.0 dB · REL 100 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 1.7 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 250 ms, SUS 0%, REL 100 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 1.7 kHz, peak about 6 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 3: ATK 0, HOLD 0, DEC 240 ms, SUS minimum, REL 80 ms. Assign upward to A Warp, from about 15% to 40%. The waveform resets faster internally; keep OSC pitch unchanged.

   Listen / check: A bright “yaa” with a fixed musical pitch underneath.

6. **Finish, perform and save.** Distortion Soft Clip, DRIVE 15%, MIX 20%. Delay straight 1/8, feedback 18%, MIX 15%. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A bright “yaa” with a fixed musical pitch underneath.

## If it sounds wrong

Too thin or sharp: reduce Sync amount and cutoff peak. Verify you moved Warp, not oscillator semitone.

## Variations

- ENV 3 ATK 100 ms: a rising bite.
- Hold Warp still and modulate only cutoff: simpler, steadier lead.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Wavetable sequence — Serum 2

Sound Design V2 · Leads · Level 2 · Wavetable

Hypnotic · melodic techno

A sequence whose source shape changes slowly across repeated notes.

## Why it works

The oscillator changes its harmonic recipe before it reaches the filter. A narrow scan often feels more coherent than sweeping the whole table.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: choose any factory wavetable with visibly different neighbouring frames. UNISON 1, LEVEL 50%. Find a pleasant starting frame with WT POS before adding movement. Avoid scanning Basic Shapes between unrelated shapes for this first exercise.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 260 ms · SUS minimum / −∞ dB · REL 60 ms
- Filter: MG Low 24 · cutoff 1.3 kHz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 4.2 kHz, then closes over 140 ms.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: choose any factory wavetable with visibly different neighbouring frames. UNISON 1, LEVEL 50%. Find a pleasant starting frame with WT POS before adding movement. Avoid scanning Basic Shapes between unrelated shapes for this first exercise.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 260 ms · SUS minimum / −∞ dB · REL 60 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 1.3 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 140 ms, SUS 0%, REL 60 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 1.3 kHz, peak about 4.2 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** LFO 1: triangle, BPM on, RATE 2 bars, FREE. Assign unipolar to WT POS across only 15–25% of the table. Keep Warp off to hear the table itself.

   Listen / check: The same notes slowly change colour; their loudness should not jump dramatically.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

The same notes slowly change colour; their loudness should not jump dramatically.

## If it sounds wrong

Jumps or harsh frames: reduce the scan range and choose a smoother part of the table. Each table is different, so no WT POS number works universally.

## Variations

- RETRIG on: every note begins at the same timbre.
- ENV 3 rather than LFO: a bright frame on attack, softer frame in the tail.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Warm analogue pad — Serum 2

Sound Design V2 · Pads · Level 1 · Wavetable

Deep house · ambient techno

A slowly opening chord bed with a soft edge.

## Why it works

Slow amplitude and filter attacks hide the transient. Long release connects chord changes, but also adds overlapping voices.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, LEVEL 35%, UNISON 4, DETUNE 0.08. MONO off, polyphony at least 12. Play a chord and hold it for two bars.
- ENV 1: ATK 700 ms · HOLD 0 ms · DEC 1.80 s · SUS 70% / -3.1 dB · REL 1.80 s
- Filter: MG Low 24 · cutoff 1.2 kHz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 3.2 kHz, then closes over 1.80 s.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, LEVEL 35%, UNISON 4, DETUNE 0.08. MONO off, polyphony at least 12. Play a chord and hold it for two bars.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 700 ms · HOLD 0 ms · DEC 1.80 s · SUS 70% / -3.1 dB · REL 1.80 s. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 1.2 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 900 ms, HOLD 0, DEC 1.80 s, SUS 50%, REL 1.50 s. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 1.2 kHz, peak about 3.2 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 2: ATK 900 ms, HOLD 0, DEC 1800 ms, SUS 50%, REL 1500 ms. Open cutoff from 1200 to about 3200 Hz. Let the chord develop before judging it.

   Listen / check: A gradual bloom with no obvious click; the chord is still intelligible when the reverb is bypassed.

6. **Finish, perform and save.** Reverb MIX 20%, DECAY 3 s. If the source already feels wide, leave chorus off. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A gradual bloom with no obvious click; the chord is still intelligible when the reverb is bypassed.

## If it sounds wrong

First chord seems silent: hold it for two seconds. Chord changes turn muddy: shorten REL and use closer voicings.

## Variations

- Triangle instead of saw: gentler bed.
- ATK 100 ms, REL 600 ms: more rhythmic chord swells.

## In the track

Keep the pad quieter than you think when the hook enters. Remove low chord notes before using a steep high-pass filter.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Airy string machine — Serum 2

Sound Design V2 · Pads · Level 2 · Wavetable

Classic house · Detroit

A lightly detuned, sustained ensemble with a clear upper register.

## Why it works

Unison makes an ensemble; a little chorus and pitch drift soften the static digital edge.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, UNISON 6, DETUNE 0.10, LEVEL 35%. MONO off, polyphony 16. Keep chords around MIDI 60–79.
- ENV 1: ATK 280 ms · HOLD 0 ms · DEC 1 s · SUS 85% / -1.4 dB · REL 1 s
- Filter: MG Low 24 · cutoff 4.5 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 (261.6 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, UNISON 6, DETUNE 0.10, LEVEL 35%. MONO off, polyphony 16. Keep chords around MIDI 60–79.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 280 ms · HOLD 0 ms · DEC 1 s · SUS 85% / -1.4 dB · REL 1 s. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 4.5 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** LFO 1 sine, Hz mode 0.2 Hz, FREE; assign a very small bipolar amount to A FIN, about ±3 cents. This is slow vibrato, not a pitch-bend effect.

   Listen / check: A smooth, sustained string-like layer. This is a synth ensemble, not a realistic bowed-string multisample.

6. **Finish, perform and save.** Chorus MIX 20%, slow RATE around 0.3 Hz and moderate depth. Reverb MIX 15%, DECAY 2.5 s. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A smooth, sustained string-like layer. This is a synth ensemble, not a realistic bowed-string multisample.

## If it sounds wrong

Out of tune: remove FIN modulation before changing the chord. Washed out: reduce chorus mix.

## Variations

- UNISON 3: leaner and more intimate.
- ATK 20 ms and DEC 400 ms, SUS 0%: string stab.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Breathing rhythm pad — Serum 2

Sound Design V2 · Pads · Level 2 · Wavetable

Progressive house · melodic techno

A held chord that opens in time with the track.

## Why it works

Periodic brightness makes a held chord pulse without retriggering its amplitude envelope.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: saw, UNISON 3, DETUNE 0.07, LEVEL 40%. Polyphony 12+. Hold a chord for two bars.
- ENV 1: ATK 150 ms · HOLD 0 ms · DEC 800 ms · SUS 100% / 0 dB · REL 500 ms
- Filter: MG Low 24 · cutoff 600 Hz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: saw, UNISON 3, DETUNE 0.07, LEVEL 40%. Polyphony 12+. Hold a chord for two bars.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 150 ms · HOLD 0 ms · DEC 800 ms · SUS 100% / 0 dB · REL 500 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 600 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** LFO 1: draw a smooth rise and fall, BPM on, RATE 1/4, RETRIG. Route unipolar to Filter 1 Cutoff: 600 → 4000 Hz. Start every chord on a beat. For transport-aligned motion across notes, explore HOST synchronization after this works.

   Listen / check: A chord breathing once per beat. This does not react to the actual kick signal.

6. **Finish, perform and save.** Reverb MIX 15%, DECAY 2 s, after the movement. It will soften the gaps. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A chord breathing once per beat. This does not react to the actual kick signal.

## If it sounds wrong

Pulse restarts awkwardly: align note starts or use a host-synced LFO. For real kick ducking, use a DAW sidechain compressor.

## Variations

- Rate 1/8: quicker movement.
- Assign the LFO to level instead for a more pronounced gate; use smooth edges to avoid clicks.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Granular voice cloud — Serum 2

Sound Design V2 · Pads · Level 3 · Granular

Ambient techno · organic house

Turn one recorded vowel into a slow, drifting atmosphere.

## Why it works

Overlapping fragments stretch a moment into a texture. Source quality and position matter more than filling every modulation slot.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: Record a steady 2–4 second “ah” yourself in the DAW. Export WAV. OSC A header → Granular, then load your WAV into the sample display. UNISON 1, LEVEL 45%. Start with one held note at the sample’s root pitch; establish that pitch with your DAW tuner.
- ENV 1: ATK 900 ms · HOLD 0 ms · DEC 1.50 s · SUS 80% / -1.9 dB · REL 2.20 s
- Filter: MG Low 24 · cutoff 5.5 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60; the recorded source's tuning depends on its root-note mapping.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** Record a steady 2–4 second “ah” yourself in the DAW. Export WAV. OSC A header → Granular, then load your WAV into the sample display. UNISON 1, LEVEL 45%. Start with one held note at the sample’s root pitch; establish that pitch with your DAW tuner.

   Listen / check: Audition the source at its root note before changing the envelope.

3. **Shape the volume.** On ENV 1 set ATK 900 ms · HOLD 0 ms · DEC 1.50 s · SUS 80% / -1.9 dB · REL 2.20 s. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 5.5 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Open the granular parameters. Start with grains around 80–150 ms and enough overlapping grains for a continuous tone. Move the playback position into the steady vowel, away from the breath. Add only a small random position spread, then slowly modulate position over two bars. Parameter scales vary; use the tooltip and overlap by ear.

   Listen / check: A sustained vowel cloud rather than intelligible speech. Your recording determines the result.

6. **Finish, perform and save.** Reverb MIX 20%, DECAY 3.5 s. Add this only after the dry grains join smoothly. Map Macro 1 to Sample playback position: limit movement to the steady portion of your recording. Name it “Travel”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A sustained vowel cloud rather than intelligible speech. Your recording determines the result.

## If it sounds wrong

Tiny machine-gun chatter: lengthen grains and increase overlap. Blurry consonants: move deeper into the vowel.

## Variations

- Record a bowed or scraped household object for an unpitched texture.
- Use shorter grains for a rougher digital surface.

## In the track

Keep the dry cloud audible while designing. Save your own source alongside the patch and embed it before moving the preset.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Spectral frozen chord — Serum 2

Sound Design V2 · Pads · Level 3 · Spectral

Dub techno · cinematic techno

Suspend a moment from your own chord recording and play its harmonics.

## Why it works

Spectral resynthesis lets time move very slowly while you still play pitched material.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: Render a sustained chord you made with Deep house stab, with no delay or reverb. OSC A header → Spectral; load the WAV. UNISON 1, LEVEL 40%. The file already contains a chord: play one MIDI note at its untransposed root.
- ENV 1: ATK 600 ms · HOLD 0 ms · DEC 1.80 s · SUS 90% / -0.9 dB · REL 2 s
- Filter: MG Low 24 · cutoff 7 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60; the recorded source's tuning depends on its root-note mapping.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** Render a sustained chord you made with Deep house stab, with no delay or reverb. OSC A header → Spectral; load the WAV. UNISON 1, LEVEL 40%. The file already contains a chord: play one MIDI note at its untransposed root.

   Listen / check: Audition the source at its root note before changing the envelope.

3. **Shape the volume.** On ENV 1 set ATK 600 ms · HOLD 0 ms · DEC 1.80 s · SUS 90% / -0.9 dB · REL 2 s. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 7 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Find a stable point after the attack. Start SCAN at 0% to hold that point; increase to 5–15% for a very slow evolution. Leave scan Key Track off so different played pitches do not change the scan speed.

   Listen / check: A suspended, slightly otherworldly version of your source chord. The source harmony remains baked in.

6. **Finish, perform and save.** Reverb MIX 15%, DECAY 3 s. Avoid masking the spectral source with a huge wet signal. Map Macro 1 to SCAN: 0% → 25%; stay near zero for a suspended sound. Name it “Time”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A suspended, slightly otherworldly version of your source chord. The source harmony remains baked in.

## If it sounds wrong

Silence at zero scan: move the start away from a silent region. Wrong harmony: remember that transposing a recorded chord moves every note together.

## Variations

- Negative SCAN: unfold the source backward.
- Record one note instead of a chord for a texture you can play polyphonically.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Distant choir — Serum 2

Sound Design V2 · Pads · Level 1 · Multisample

Melodic techno · deep house

A human harmonic layer from Serum 2’s factory multisamples.

## Why it works

The recording supplies vocal resonances and natural variation. A soft envelope turns it into a supporting layer.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A header → Multisample → Factory → Choir. Audition a sustained vowel, UNISON 1, LEVEL 40%. MONO off, polyphony 12+. Play a three-note chord in the middle register.
- ENV 1: ATK 450 ms · HOLD 0 ms · DEC 1.80 s · SUS 75% / -2.5 dB · REL 1.30 s
- Filter: MG Low 24 · cutoff 3.5 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60; the recorded source's tuning depends on its root-note mapping.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A header → Multisample → Factory → Choir. Audition a sustained vowel, UNISON 1, LEVEL 40%. MONO off, polyphony 12+. Play a three-note chord in the middle register.

   Listen / check: Audition the source at its root note before changing the envelope.

3. **Shape the volume.** On ENV 1 set ATK 450 ms · HOLD 0 ms · DEC 1.80 s · SUS 75% / -2.5 dB · REL 1.30 s. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 3.5 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Macro 1 opens cutoff from 1800 → 6000 Hz. Keep pitch modulation off initially; recorded voices already have motion.

   Listen / check: A recognisably human bed behind the lead, without an exaggerated new attack on every note.

6. **Finish, perform and save.** Reverb MIX 22%, DECAY 3 s. If the words or breath are too prominent, choose a different source before adding more effects. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A recognisably human bed behind the lead, without an exaggerated new attack on every note.

## If it sounds wrong

Muffled rather than distant: open cutoff and lower level. Chords cut out: raise polyphony or shorten release.

## Variations

- ATK 15 ms, DEC 350 ms, SUS 0%: a choral stab.
- Single-note line in a lower register: a dark vocal drone.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Short synth kick — Serum 2

Sound Design V2 · Drums · Level 2 · Wavetable

House · minimal techno

A sine-wave thump with a fast drop into a stable body.

## Why it works

The rapidly falling pitch supplies the punch. A separate, slower volume decay supplies the body.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: sine, LEVEL 60%, UNISON 1, RAND 0%. Use PHASE 0° as a starting point and listen for a clean start. Play MIDI 33 (55 Hz at OCT 0); no oscillator transpose.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 220 ms · SUS minimum / −∞ dB · REL 35 ms
- Filter: Filter off; no filter-envelope assignment.
- MIDI first trigger: MIDI 33 (55.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: sine, LEVEL 60%, UNISON 1, RAND 0%. Use PHASE 0° as a starting point and listen for a clean start. Play MIDI 33 (55 Hz at OCT 0); no oscillator transpose.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 220 ms · SUS minimum / −∞ dB · REL 35 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Leave Filter 1 and Filter 2 off. Route the audible source to Main so it can reach the output and any effects.

   Listen / check: The source supplies the tone; the filter is not needed for this core recipe.

5. **Add the defining movement.** ENV 2: ATK 0 ms, HOLD 0, DEC 30 ms, SUS minimum, REL 15 ms. Route to A CRS (coarse pitch) or the oscillator pitch destination in Matrix: unipolar +24 semitones at the peak, returning to the played note. Use tooltip pitch units to set the range.

   Listen / check: A quick knock settling into a low thump, not a long laser swoop.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 DEC: 140 → 350 ms. Name it “Body”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A quick knock settling into a low thump, not a long laser swoop.

## If it sounds wrong

Laser: shorten pitch decay to 15 ms. Click: increase amp ATK to 2–3 ms. Weak body: lower pitch depth before turning up the level.

## Variations

- Pitch depth +12 semitones: rounder house kick.
- Pitch decay 45 ms: more obvious electronic knock.

## In the track

Tune the settled body by ear with the track; the fast attack has no single stable pitch. Use one kick voice and leave room for the bass.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Driven warehouse kick — Serum 2

Sound Design V2 · Drums · Level 2 · Wavetable

Raw techno · hard techno

A longer kick body with a controlled distorted edge.

## Why it works

A longer pitch fall and clipped body create aggression. Distortion changes the envelope as well as the tone.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: sine, LEVEL 45%, UNISON 1, RAND 0%. Play MIDI 31 (about 49 Hz). Leave SUB and NOISE off initially.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 420 ms · SUS minimum / −∞ dB · REL 45 ms
- Filter: Filter off; no filter-envelope assignment.
- MIDI first trigger: MIDI 31 (49.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: sine, LEVEL 45%, UNISON 1, RAND 0%. Play MIDI 31 (about 49 Hz). Leave SUB and NOISE off initially.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 420 ms · SUS minimum / −∞ dB · REL 45 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Leave Filter 1 and Filter 2 off. Route the audible source to Main so it can reach the output and any effects.

   Listen / check: The source supplies the tone; the filter is not needed for this core recipe.

5. **Add the defining movement.** ENV 2: ATK 0, HOLD 0, DEC 45 ms, SUS minimum, REL 15 ms. Assign to A coarse pitch for a +30 semitone attack returning to the played pitch. Keep the movement unipolar.

   Listen / check: A defined strike followed by a rough low body that dies before the next kick.

6. **Finish, perform and save.** Distortion Soft Clip, DRIVE 35%, MIX 50%. Match the output to bypass. Reduce distortion if the low body collapses into a buzz. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A defined strike followed by a rough low body that dies before the next kick.

## If it sounds wrong

Tail eats the groove: shorten ENV 1 decay. Thin and loud: reduce drive and listen at matched level.

## Variations

- Pitch decay 20 ms: faster and more focused.
- Play two semitones higher: a tighter, more mid-forward kick.

## In the track

At 140 BPM, quarter notes are about 429 ms apart. A 420 ms decay plus release can be too long; shorten by ear with bass playing.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Tight closed hat — Serum 2

Sound Design V2 · Drums · Level 1 · Noise

House · techno · minimal

A short filtered burst of noise that marks the subdivisions.

## Why it works

Noise supplies a broad spectrum. A high-pass filter removes the low body; a short amplitude envelope makes a hat.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: Turn OSC A off. Enable NOISE and choose a steady white-noise-like factory noise by auditioning. LEVEL 35%. Route NOISE to Filter 1; choose High 12 (high-pass). Leave one-shot playback off for a continuous noise source shaped by ENV 1.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 45 ms · SUS minimum / −∞ dB · REL 12 ms
- Filter: High 12 · cutoff 6.5 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 triggers the envelope; noise has no single stable pitch.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** Turn OSC A off. Enable NOISE and choose a steady white-noise-like factory noise by auditioning. LEVEL 35%. Route NOISE to Filter 1; choose High 12 (high-pass). Leave one-shot playback off for a continuous noise source shaped by ENV 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 45 ms · SUS minimum / −∞ dB · REL 12 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose High 12. Set cutoff 6.5 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Write eighth or sixteenth notes. Assign VELO → Noise LEVEL a small positive amount, then alternate velocities 90 and 55. Confirm quieter notes are actually quieter.

   Listen / check: A crisp “ts” without a low thud.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 DEC: 25 → 100 ms. Name it “Tight”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A crisp “ts” without a low thud.

## If it sounds wrong

Only a click: increase DEC to 65 ms. Too sandy: lower cutoff to 4500 Hz and reduce level.

## Variations

- DEC 90 ms: looser hat.
- High-pass 9000 Hz: thinner air layer; may disappear on some speakers.

## In the track

Set the hat level with the whole groove playing. A bright hat can feel much louder than its meter suggests.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Offbeat open hat — Serum 2

Sound Design V2 · Drums · Level 1 · Noise

House · disco · techno

The longer splash between the kick beats.

## Why it works

The source can be identical to a closed hat. The longer decay and placement create a different role.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A off. NOISE on: use a steady bright noise. LEVEL 30%, route to Filter 1, High 12. MONO on so the next note can interrupt the previous voice.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 330 ms · SUS minimum / −∞ dB · REL 40 ms
- Filter: High 12 · cutoff 5.2 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 triggers the envelope; noise has no single stable pitch.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A off. NOISE on: use a steady bright noise. LEVEL 30%, route to Filter 1, High 12. MONO on so the next note can interrupt the previous voice.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 330 ms · SUS minimum / −∞ dB · REL 40 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose High 12. Set cutoff 5.2 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Place one short note on each offbeat. First use notes long enough to hear the 330 ms decay. Then shorten gates to fit the groove. For open/closed-hat choke across two separate patches, use a DAW drum rack choke group.

   Listen / check: A splash that falls away before the next kick, with some room around it.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 DEC: 150 → 500 ms. Name it “Open”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A splash that falls away before the next kick, with some room around it.

## If it sounds wrong

Uncontrolled overlap: check note gates and MONO; a separate closed-hat track will not automatically choke this instance.

## Variations

- DEC 180 ms: short open-hat shuffle.
- ATK 10 ms: softer shaker-like splash.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Synthetic handclap — Serum 2

Sound Design V2 · Drums · Level 2 · Noise

House · raw techno

A cluster of three little bursts followed by a noisy tail.

## Why it works

Several close attacks suggest hands arriving slightly apart. A single envelope burst sounds more like a snare.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A off. NOISE on, steady white-noise-like source, route Filter 1. Filter type Band 12, cutoff 1700 Hz, RES 20%. Set Noise LEVEL to 0% before the next modulation assignment.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 260 ms · SUS 100% / 0 dB · REL 45 ms
- Filter: Band 12 · cutoff 1.7 kHz · RES 20% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 triggers the envelope; noise has no single stable pitch.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A off. NOISE on, steady white-noise-like source, route Filter 1. Filter type Band 12, cutoff 1700 Hz, RES 20%. Set Noise LEVEL to 0% before the next modulation assignment.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 260 ms · SUS 100% / 0 dB · REL 45 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose Band 12. Set cutoff 1.7 kHz, RES 20%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** LFO 1 in ENVELOPE mode, BPM off; make its full cycle about 250 ms (roughly 4 Hz). Draw three short peaks near 0, 15 and 30 ms, then a declining tail reaching zero at 220 ms. Give every peak a small ramp. Assign upward to Noise LEVEL, 0 → 50%. Hold the MIDI note about 300 ms so ENV 1 does not cut off the cluster.

   Listen / check: “P-p-pah” packed into one clap, followed by a small tail.

6. **Finish, perform and save.** Reverb MIX 10%, DECAY 0.7 s after the dry clap is convincing. Map Macro 1 to Reverb MIX: 0% → 20%. Name it “Room”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

“P-p-pah” packed into one clap, followed by a small tail.

## If it sounds wrong

A repeating clap machine: choose ENVELOPE, not looping LFO mode. No sound: check modulation depth from the zero base level.

## Variations

- Bring peaks closer: tighter electronic clap.
- Band-pass at 2400 Hz: lighter, more cutting clap.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Body-and-noise snare — Serum 2

Sound Design V2 · Drums · Level 2 · Wavetable

Techno · electro · house

A pitched knock plus a short noise tail, independently shaped.

## Why it works

The triangle supplies the drum body and the noise suggests the snare wires. Separate routing prevents the high-pass filter from removing the body.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: triangle, LEVEL 30%, route Main (bypasses Filter 1). Play MIDI 55, about 196 Hz. NOISE: steady bright source, LEVEL 0%, route Filter 1 High 12 at 1100 Hz. UNISON 1.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 240 ms · SUS minimum / −∞ dB · REL 30 ms
- Filter: High 12 · cutoff 1.1 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 55 (196.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: triangle, LEVEL 30%, route Main (bypasses Filter 1). Play MIDI 55, about 196 Hz. NOISE: steady bright source, LEVEL 0%, route Filter 1 High 12 at 1100 Hz. UNISON 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 240 ms · SUS minimum / −∞ dB · REL 30 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose High 12. Set cutoff 1.1 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 2 ATK 0, HOLD 0, DEC 160 ms, SUS minimum, REL 20 ms → Noise LEVEL, upward 0 → 45%. A gets ENV 1; noise gets ENV 2 multiplied by the normal amp envelope. No filter-envelope assignment here.

   Listen / check: A definite mid-low knock followed by “shh”.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to Noise ENV 2 modulation depth: 20% → 55%. Name it “Snap”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A definite mid-low knock followed by “shh”.

## If it sounds wrong

Thin: verify A routes Main, not the noise high-pass filter. Too tonal: shorten A’s amp decay or lower A LEVEL.

## Variations

- A sine: smoother body.
- Noise ENV 2 DEC 90 ms: tight, dry snare.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Soft shaker — Serum 2

Sound Design V2 · Drums · Level 1 · Noise

Organic house · afro house · microhouse

A soft noise gesture whose accents create the hand movement.

## Why it works

A little attack time removes the hard electronic tick. Velocity and timing make the friction feel performed.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A off. NOISE on: choose continuous bright noise, LEVEL 25%, route Filter 1 High 12. RES 0%.
- ENV 1: ATK 12 ms · HOLD 0 ms · DEC 65 ms · SUS minimum / −∞ dB · REL 20 ms
- Filter: High 12 · cutoff 3.8 kHz · RES 0% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 triggers the envelope; noise has no single stable pitch.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A off. NOISE on: choose continuous bright noise, LEVEL 25%, route Filter 1 High 12. RES 0%.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 12 ms · HOLD 0 ms · DEC 65 ms · SUS minimum / −∞ dB · REL 20 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose High 12. Set cutoff 3.8 kHz, RES 0%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Use sixteenth notes. Add a small VELO → Noise LEVEL route; alternate 45, 75, 55, 95 velocities. Apply a little DAW swing to the second sixteenth of each pair after the straight pattern works.

   Listen / check: “Sha-ka” gestures rather than identical machine ticks.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 ATK: 3 → 22 ms. Name it “Grain”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

“Sha-ka” gestures rather than identical machine ticks.

## If it sounds wrong

Sounds like a hat: increase ATK to 18 ms and lower filter cutoff to 3000 Hz. Too smeared: shorten DEC.

## Variations

- ATK 3 ms: sharper grain.
- Remove every fourth hit: more air and forward motion.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Tuned tom / conga — Serum 2

Sound Design V2 · Drums · Level 2 · Wavetable

Tribal techno · afro house

A brief falling pitch and rounded resonant body.

## Why it works

A modest pitch drop feels like a drum skin relaxing; a huge pitch drop sounds more like a kick or laser.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: sine, LEVEL 60%, UNISON 1, RAND 0%. Start at MIDI 45 (110 Hz). Leave FX off.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 260 ms · SUS minimum / −∞ dB · REL 40 ms
- Filter: Filter off; no filter-envelope assignment.
- MIDI first trigger: MIDI 45 (110.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: sine, LEVEL 60%, UNISON 1, RAND 0%. Start at MIDI 45 (110 Hz). Leave FX off.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 260 ms · SUS minimum / −∞ dB · REL 40 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Leave Filter 1 and Filter 2 off. Route the audible source to Main so it can reach the output and any effects.

   Listen / check: The source supplies the tone; the filter is not needed for this core recipe.

5. **Add the defining movement.** ENV 2: ATK 0, HOLD 0, DEC 25 ms, SUS minimum, REL 10 ms. Assign to A coarse pitch, unipolar +7 semitones at the start, returning to the MIDI pitch.

   Listen / check: A rounded “dum” with a clearly tunable body.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 DEC: 100 → 450 ms. Name it “Skin”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A rounded “dum” with a clearly tunable body.

## If it sounds wrong

Kick-like: raise MIDI by an octave and shorten DEC. Too laser-like: reduce pitch modulation to +3 semitones.

## Variations

- Triangle source: a woody conga-like edge.
- Pitch depth +3, DEC 140 ms: tight high tom.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Metallic FM percussion — Serum 2

Sound Design V2 · Drums · Level 2 · Wavetable

Industrial · hardgroove · minimal

An inharmonic hit that cuts through without becoming a lead.

## Why it works

A non-integer frequency ratio produces partials that do not line up as a simple musical harmonic series.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: A: sine LEVEL 50%. B: sine, OCT +1, SEM +5, FIN +35 cents, LEVEL 0%, power on. A WARP → FM (B), amount about 35%. Route A through Filter 1 High 12.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 180 ms · SUS minimum / −∞ dB · REL 45 ms
- Filter: High 12 · cutoff 700 Hz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 57 (220.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** A: sine LEVEL 50%. B: sine, OCT +1, SEM +5, FIN +35 cents, LEVEL 0%, power on. A WARP → FM (B), amount about 35%. Route A through Filter 1 High 12.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 180 ms · SUS minimum / −∞ dB · REL 45 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose High 12. Set cutoff 700 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 3: ATK 0, HOLD 0, DEC 90 ms, SUS minimum, REL 25 ms. Assign upward to Warp, base 15% and peak about 40%.

   Listen / check: A small metal “kling”, with a shorter tail than the FM bell.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to A FM (B) amount: 10% → 40%. Name it “Metal”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A small metal “kling”, with a shorter tail than the FM bell.

## If it sounds wrong

Too much pitch: alter B FIN or SEM slightly. Too piercing: lower Warp amount and output before EQ.

## Variations

- DEC 70 ms: tiny metal tick.
- DEC 500 ms: resonant bowl; use fewer notes.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Rim / clave tick — Serum 2

Sound Design V2 · Drums · Level 1 · Wavetable

Minimal · house · hardgroove

A tiny tuned knock that stays out of the low end.

## Why it works

A high pitch and very short body create a wooden tick. Where you place it gives the pattern its identity.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: triangle, LEVEL 55%, UNISON 1. Play MIDI 81 (880 Hz). Filter 1 Band 12 at 2100 Hz, RES 15%.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 35 ms · SUS minimum / −∞ dB · REL 12 ms
- Filter: Band 12 · cutoff 2.1 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 81 (880.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: triangle, LEVEL 55%, UNISON 1. Play MIDI 81 (880 Hz). Filter 1 Band 12 at 2100 Hz, RES 15%.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 35 ms · SUS minimum / −∞ dB · REL 12 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose Band 12. Set cutoff 2.1 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Start with a sparse pattern: hits on sixteenth steps 1, 7 and 12. Add a quieter pickup near the end of every second bar. No LFO required.

   Listen / check: A dry “tok” with a little tone, not a wide noise burst.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 1 DEC: 20 → 85 ms. Name it “Knock”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A dry “tok” with a little tone, not a wide noise burst.

## If it sounds wrong

Just a click: DEC 50–70 ms. Too thin: bypass the band-pass and lower A LEVEL.

## Variations

- Square source: harder rim edge.
- MIDI 74: lower, woodier clave.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Noise riser — Serum 2

Sound Design V2 · FX · Level 1 · Noise

House · techno · transitions

A controlled opening of brightness over four bars.

## Why it works

An opening filter reveals more high-frequency energy. The automation duration makes it a transition.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A off. NOISE on: steady white-noise-like source, LEVEL 25%, route Filter 1. RES 10%.
- ENV 1: ATK 30 ms · HOLD 0 ms · DEC 500 ms · SUS 100% / 0 dB · REL 150 ms
- Filter: MG Low 12 · cutoff 300 Hz · RES 10% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60 triggers the envelope; noise has no single stable pitch.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A off. NOISE on: steady white-noise-like source, LEVEL 25%, route Filter 1. RES 10%.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 30 ms · HOLD 0 ms · DEC 500 ms · SUS 100% / 0 dB · REL 150 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 300 Hz, RES 10%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Assign Macro 1 to Filter 1 Cutoff: base 300 Hz → top 12000 Hz. In your DAW, hold one note for four bars and draw Macro 1 automation rising from minimum to maximum. Put the end exactly on the next section; release the note there.

   Listen / check: A smooth growth from low hush to bright rush, with no repeated restart.

6. **Finish, perform and save.** Reverb MIX 15%, DECAY 1.5 s. Shorten or automate the tail if you want a clean drop. Map Macro 1 to Filter 1 Cutoff: 300 → 12000 Hz. Name it “Rise”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A smooth growth from low hush to bright rush, with no repeated restart.

## If it sounds wrong

Abrupt start: increase ENV 1 attack. Rise feels too loud at the top: reduce Noise LEVEL or draw compensating level automation.

## Variations

- Automate a high-pass upward as well: a thinner final sweep.
- Use two bars for a short fill instead of four.

## In the track

Finish the rise where the next section begins. A quieter final beat or an intentional gap can make the drop clearer than a louder riser.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Noise downlifter — Serum 2

Sound Design V2 · FX · Level 1 · Noise

House · techno · transitions

A short bright wash that darkens behind the first beat of a new section.

## Why it works

A descending brightness curve releases tension while the amplitude falls away.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A off. NOISE on: continuous bright noise, LEVEL 25%, route Filter 1.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 1.90 s · SUS minimum / −∞ dB · REL 150 ms
- Filter: MG Low 12 · cutoff 400 Hz · RES 15% · MIX 100% · DRIVE 0% initially. ENV 2 opens to approximately 11 kHz, then closes over 1.50 s.
- MIDI first trigger: MIDI 60 triggers the envelope; noise has no single stable pitch.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A off. NOISE on: continuous bright noise, LEVEL 25%, route Filter 1.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 1.90 s · SUS minimum / −∞ dB · REL 150 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 400 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. ENV 2: ATK 0 ms, HOLD 0, DEC 1.50 s, SUS 0%, REL 150 ms. Drag ENV 2 onto Filter 1 Cutoff. Use positive, unipolar depth: base 400 Hz, peak about 11 kHz. Set the depth by the target travel; the Matrix amount is not a number of Hz.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 2 ATK 0, HOLD 0, DEC 1500 ms, SUS minimum, REL 100 ms. Assign upward to Filter 1 Cutoff: 400 → 11000 Hz at the start, falling back to 400. Hold the MIDI trigger two seconds to hear the decay.

   Listen / check: An initial “shhh” moving backward into the track, not a new rising build.

6. **Finish, perform and save.** Reverb MIX 18%, DECAY 2 s. Keep the wet signal below the new section’s main percussion. Map Macro 1 to Filter 1 Cutoff: keep the low end at the recipe setting; raise the high end by one octave. Name it “Tone”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

An initial “shhh” moving backward into the track, not a new rising build.

## If it sounds wrong

It swells instead of falls: check ENV 2 attack and modulation polarity. Cutoff base should be dark, with the envelope opening it.

## Variations

- Both decays 700 ms: compact fill.
- Cutoff peak 4000 Hz: dark, low-key transition.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Cinematic low impact — Serum 2

Sound Design V2 · FX · Level 2 · Wavetable

Melodic techno · warehouse

A falling low tone under a short noise burst and a larger room.

## Why it works

The pitched fall conveys weight, noise supplies the strike, and the room makes the event feel larger.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: sine LEVEL 50%, UNISON 1. NOISE on, LEVEL 0%, route Filter 1. A routes Main. MIDI 33 is the settled low pitch.
- ENV 1: ATK 2 ms · HOLD 0 ms · DEC 1.50 s · SUS minimum / −∞ dB · REL 200 ms
- Filter: MG Low 12 · cutoff 4.5 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 33 (55.0 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: sine LEVEL 50%, UNISON 1. NOISE on, LEVEL 0%, route Filter 1. A routes Main. MIDI 33 is the settled low pitch.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 2 ms · HOLD 0 ms · DEC 1.50 s · SUS minimum / −∞ dB · REL 200 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 4.5 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** ENV 2: ATK 0, HOLD 0, DEC 120 ms, SUS minimum, REL 30 ms → A coarse pitch, +19 semitones downward to the played note. ENV 3: ATK 0, HOLD 0, DEC 300 ms, SUS minimum, REL 80 ms → Noise LEVEL, upward 0 → 25%.

   Listen / check: One impact with a low body and fading air, rather than a continuous bass note.

6. **Finish, perform and save.** Reverb MIX 22%, DECAY 3 s. If the low end blurs, send a high-passed copy to reverb in your DAW and reduce Serum’s wet mix. Map Macro 1 to Reverb MIX: 5% → 30%. Name it “Scale”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

One impact with a low body and fading air, rather than a continuous bass note.

## If it sounds wrong

Low end swamps the next bar: shorten ENV 1 DEC and reduce wet mix. Noise masks the transient: shorten ENV 3.

## Variations

- MIDI +12 semitones: smaller, tighter impact.
- Remove noise: pure sub drop.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Pitch laser / zap — Serum 2

Sound Design V2 · FX · Level 2 · Wavetable

Electro · minimal · techno

A quick pitch sweep for fills, punctuation and playful percussion.

## Why it works

A large, audible pitch fall is the effect itself. This is the same principle as a kick, with a higher base and a longer sweep.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: OSC A: sine LEVEL 50%, UNISON 1. Play MIDI 60. Keep other sources off.
- ENV 1: ATK 1 ms · HOLD 0 ms · DEC 180 ms · SUS minimum / −∞ dB · REL 30 ms
- Filter: Filter off; no filter-envelope assignment.
- MIDI first trigger: MIDI 60 (261.6 Hz before oscillator transposition).
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** OSC A: sine LEVEL 50%, UNISON 1. Play MIDI 60. Keep other sources off.

   Listen / check: You should hear a plain tone or noise before the envelope and effects make it musical.

3. **Shape the volume.** On ENV 1 set ATK 1 ms · HOLD 0 ms · DEC 180 ms · SUS minimum / −∞ dB · REL 30 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, the dry sound should fall to silence.

4. **Shape the brightness.** Leave Filter 1 and Filter 2 off. Route the audible source to Main so it can reach the output and any effects.

   Listen / check: The source supplies the tone; the filter is not needed for this core recipe.

5. **Add the defining movement.** ENV 2: ATK 0, HOLD 0, DEC 100 ms, SUS minimum, REL 20 ms. Assign unipolar to A coarse pitch: +36 semitones at the start, returning to the played note. Verify the destination range in semitones.

   Listen / check: A definite downward “pew”.

6. **Finish, perform and save.** Leave the FX rack empty while learning the core sound. Map Macro 1 to ENV 2 DEC: 30 → 300 ms. Name it “Fall”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A definite downward “pew”.

## If it sounds wrong

Only a click: lengthen pitch decay. Wrong direction: use positive depth from a low base, not negative depth.

## Variations

- Pitch depth +12, DEC 40 ms: small zap percussion.
- ENV 2 ATK 150 ms, DEC 0, SUS maximum: rising science-fiction chirp.

## In the track

Play it with your kick. Shorten the release if the next kick loses definition.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Your own vocal chop — Serum 2

Sound Design V2 · FX · Level 2 · Sample

Vocal house · stutter house

Turn a short recorded syllable into a playable, tightly gated hook.

## Why it works

A recognizable attack and a controllable gate let a recorded voice act like an instrument.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: Record a steady pitched “ah” or “hey”, export WAV, and trim extra silence. OSC A header → Sample; load the file. LEVEL 50%, UNISON 1; loop off. Find the original pitch with a tuner and set the sample’s root note accordingly so MIDI transposes it predictably.
- ENV 1: ATK 3 ms · HOLD 0 ms · DEC 400 ms · SUS 100% / 0 dB · REL 35 ms
- Filter: MG Low 12 · cutoff 8 kHz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 60; the recorded source's tuning depends on its root-note mapping.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** Record a steady pitched “ah” or “hey”, export WAV, and trim extra silence. OSC A header → Sample; load the file. LEVEL 50%, UNISON 1; loop off. Find the original pitch with a tuner and set the sample’s root note accordingly so MIDI transposes it predictably.

   Listen / check: Audition the source at its root note before changing the envelope.

3. **Shape the volume.** On ENV 1 set ATK 3 ms · HOLD 0 ms · DEC 400 ms · SUS 100% / 0 dB · REL 35 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 12. Set cutoff 8 kHz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Select a clean syllable with sample start/end points. Use short MIDI gates with ENV 1 release 35 ms. Choose playback that responds to note length (not a tails/one-shot mode that deliberately runs on). Audition one note before writing a melody.

   Listen / check: A clean, repeatable syllable on each note, without a click at the crop point.

6. **Finish, perform and save.** Delay straight 1/8, FEEDBACK 20%, MIX 15%. Keep reverb MIX under 12% so consonants stay clear. Map Macro 1 to Filter 1 Cutoff: 1800 → 10000 Hz. Name it “Shade”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

A clean, repeatable syllable on each note, without a click at the crop point.

## If it sounds wrong

Wrong pitch: check root mapping with a tuner. Clicks: adjust start to a quiet crossing and raise ATK/REL slightly. Sample still plays on: check playback mode.

## Variations

- Use just the vowel for a smoother melodic chop.
- Move the start later for a short rhythmic consonant hit.

## In the track

Write the rhythm dry. Leave space for a lead vocal if the track already has one. Embed your own sample when saving.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


---

# Resampled techno rumble — Serum 2

Sound Design V2 · FX · Level 3 · Sample

Warehouse · deep techno

Build the rumble as an audio texture, then make it leave room for the kick.

## Why it works

Reverb provides a dense tail; filtering isolates the low texture; kick-triggered ducking creates the pumping space.

## Setup

Start from MENU → Init Preset. Unmentioned settings stay at Init. OCT/SEM 0 unless specified. Basic waves: Analog → Basic Shapes; select by the waveform picture, not an assumed frame number. Leave ARP/CLIP off. Modulation ranges are approximate target endpoints. Sustain percentages describe linear level; for ENV 1 use the dB equivalent shown.

## Starting settings

- Source: First make the Short synth kick. In the DAW, record one hit through 100% wet reverb with about 2 s decay. Render that wet tail to WAV. In a new Init patch choose OSC A → Sample and load the tail; LEVEL 40%, UNISON 1, loop off. Play its untransposed root initially.
- ENV 1: ATK 8 ms · HOLD 0 ms · DEC 900 ms · SUS 85% / -1.4 dB · REL 90 ms
- Filter: MG Low 24 · cutoff 180 Hz · RES 15% · MIX 100% · DRIVE 0% initially. No filter-envelope movement.
- MIDI first trigger: MIDI 33; the recorded source's tuning depends on its root-note mapping.
- Test tempo: 128 BPM. Download test MIDI separately from the HTML guide.

## Build it

1. **Start with an empty patch.** MENU → Init Preset. Keep Filter 2, FX, ARP, CLIP, unused oscillators and bus sends off. Leave OCT/SEM at 0 unless this recipe specifies otherwise. Start with a comfortable master output.

   Listen / check: Play the Serum keyboard once before editing; you should hear the Init tone.

2. **Choose the source.** First make the Short synth kick. In the DAW, record one hit through 100% wet reverb with about 2 s decay. Render that wet tail to WAV. In a new Init patch choose OSC A → Sample and load the tail; LEVEL 40%, UNISON 1, loop off. Play its untransposed root initially.

   Listen / check: Audition the source at its root note before changing the envelope.

3. **Shape the volume.** On ENV 1 set ATK 8 ms · HOLD 0 ms · DEC 900 ms · SUS 85% / -1.4 dB · REL 90 ms. Keep the normal ENV 1 amplitude control enabled. Use a long held note to hear the whole decay; then try the recipe MIDI gates.

   Listen / check: With the key held, a body should remain after the decay.

4. **Shape the brightness.** Enable Filter 1 and choose MG Low 24. Set cutoff 180 Hz, RES 15%, MIX 100% and DRIVE 0% initially. Route the sources named in the source step to Filter 1; route Filter 1 to Main. Leave ENV 2 unassigned to cutoff; this recipe uses a static filter.

   Listen / check: Temporarily sweep cutoff to confirm the intended source really passes through this filter.

5. **Add the defining movement.** Set sample start just after the original transient so the rumble does not become another kick. Draw repeating MIDI notes aligned to your groove. In the DAW put a compressor after Serum, enable external sidechain from the dry kick, and lower threshold until each kick visibly ducks the tail. Start attack 1–5 ms, release 100–200 ms, then tune to tempo.

   Listen / check: Low movement between the kicks, with a clearly audible dip whenever the dry kick hits.

6. **Finish, perform and save.** Optional gentle distortion before a low-pass in the DAW, or Serum FX if routed appropriately. The recipe filter at 180 Hz trims the noisy reverb tail. No additional reverb needed. Map Macro 1 to Filter 1 Cutoff: 100 → 280 Hz. Name it “Weight”. Set its low and high ends by watching the destination readout. Save using the disk icon by Serum’s preset name.

   Listen / check: Compare FX bypassed at similar output level, then test the patch in your track.

## Listening checkpoint

Low movement between the kicks, with a clearly audible dip whenever the dry kick hits.

## If it sounds wrong

A constant swamp: shorten the source, lower the rumble level, then increase ducking. Tuning sounds wrong: transpose the rendered tail by ear; it is not a pure sine with one exact pitch.

## Variations

- Render a shorter room for a tighter rumble.
- High-pass the source gently before the final low-pass to reduce unusable sub energy.

## In the track

The browser does not model this rendered chain. Judge it in your DAW with the dry kick. Save the source WAV and embed your custom sample.

## Recall challenge

Rebuild the amplitude and filter envelopes without reading the numbers.

## Scope

Original starting-point recipe, not a factory preset or a patch auditioned in Serum for this release. Browser audio is a simplified sketch; sample-based recipes depend on your selected source. Official control reference: https://xferrecords.com/manual/serum-2/docs


# Techno rumbles — Eight ways to shape the low end

THE FIRST WORKING CHAIN / ABLETON LIVE EXAMPLE

### Build this once. Then choose its character.

Use ordinary Reverb, Saturator, an EQ with low/high cuts, Utility and a sidechain-capable Compressor. Device availability varies by Live edition; equivalent effects in another DAW do the same jobs. These are original starting settings, not a supplied effect rack or an auditioned preset.

- Make a clean kick lane. Name the track KICK, route it to Main, and put a kick on beats 1, 2, 3 and 4. Begin at 135 BPM with a compact 150–250 ms kick body. Use the Short synth kick recipe or a sample you already like. Listen for an attack and a settled low body; a long distorted kick can already occupy the space you want to fill.

- Make a separate tail lane. Create an audio track named RUMBLE. Show its I/O controls. Set Audio From to KICK, choose Post FX, and set Monitor to In. Its output goes to Main. Pull the RUMBLE fader right down while assembling the effects. This is a live copy of the kick’s audio; keep KICK audible. Leave the rumble track’s sends at zero. [Live routing reference ↗](https://www.ableton.com/en/live-manual/12/routing-and-i-o/)

- Make the copied kick into a tail. On RUMBLE, add Reverb → Saturator → EQ → Utility → Compressor, in that order. Reverb Dry/Wet 100%, Decay 1.2 s, Predelay 10 ms; leave Freeze off. If its input low-cut is removing the kick’s low body, disable that low-cut initially. Leave modulation subtle. You should hear a room tail when you slowly raise the RUMBLE fader, not a second dry attack.

- Darken and centre it. Start Saturator Drive at +3 dB; lower its Output to roughly match bypass loudness (−3 dB is a first approximation). On EQ, enable a high-pass at 30 Hz and a low-pass at 180 Hz, both at 12 dB/octave, with no resonant boost. High-pass removes frequencies below its setting; low-pass removes those above. Set Utility Mono on. These are starting boundaries, not a rule to cut every track at 30/180 Hz. Adapt them to the kick and the result.

- Let the kick make a gap. In the final Compressor, open the Sidechain panel, enable its external input and choose KICK → Post FX. Start Ratio 4:1, Attack 2 ms, Release 140 ms, Auto Release off, automatic makeup off, Dry/Wet 100%. Lower Threshold until the gain-reduction meter dips about 6–10 dB with each kick. Threshold depends on source level: copying a fixed threshold from someone else rarely gives the same duck. Raise it again if the rumble never recovers.

- Blend in context. Bring RUMBLE up from silence with KICK playing. Stop when you hear useful movement between hits. Then pull it down slightly and compare. If the kick feels smaller, first lower the rumble, then adjust its return timing or shorten its tail. Keep their group below clipping. A limiter cannot reliably repair an overcrowded envelope.

Post FX versus Post Mixer. With the Post FX tap, changing the dry kick’s fader does not proportionally change the audio feeding the rumble or its detector. Balance the two deliberately. If you switch to Post Mixer, kick-fader changes also affect those feeds. Return-track alternative: send the kick to a return with the same wet chain. Use either that send or the dedicated audio-track route for this first build, not both.

#### What the compressor does to the feeling

Attack sets how quickly it pushes the tail down. Release sets how quickly it lets the tail recover after the detector falls below threshold. A fast recovery can chatter or crowd the kick; a slow one can create a broad inhale or keep the rumble down for the entire beat. Release is not an exact delay or a hold time: the kick length, threshold, ratio and detector also determine the gap. If you need a precisely timed hole, render the tail and draw a volume envelope. A repeating envelope will not follow missing or displaced kicks automatically.

#### Use a separate bassline deliberately

A full rumble often performs the bass role. First test kick + rumble alone. If a melodic bass must join, shorten the rumble, move some of its energy above the bass’s fundamental, or alternate their notes. Avoid stacking three sustained low parts and hoping sidechain will separate them. Check in mono after changing filters: filtering can change phase as well as tone.

The device behavior is documented in [Live’s audio-effect reference](https://www.ableton.com/en/live-manual/12/live-audio-effect-reference/); the processing choices and listening targets here are original exercises. [Ableton’s sidechain examples](https://www.ableton.com/en/blog/sidechain-compression-part-2-common-and-uncommon-uses/) explain how ducking can separate drums from sustained or reverberant parts.

## Tight rolling rumble

Agile · grounded · forward · Short reverb

A compact tail recovers quickly enough to suggest motion without making the groove feel huge and slow.

**Source:** Use a clean, short kick with a settled low body. Start around 135–142 BPM; shorten the source before shortening every effect.

**Chain:** KICK copy → Reverb → Saturator → EQ → Utility Mono → sidechain Compressor

- **Reverb:** 100% wet; Decay 0.6–1.0 s; Predelay 5–15 ms; moderate room Size.
- **Colour:** Saturator Drive +2 to +4 dB, output reduced for a fair comparison.
- **EQ:** High-pass 28–35 Hz; low-pass 150–220 Hz; 12 dB/octave initially.
- **Duck:** 4:1; Attack 1–3 ms; Release 90–150 ms; aim for 6–10 dB reduction on each kick.

### Build

1. Build the common chain above. Set Reverb decay to 0.8 s and Predelay to 10 ms. Keep the dry kick unchanged.

2. Start the low-pass at 180 Hz. Open it only until you hear the tail move on small speakers; close it if it starts sounding like a second drum.

3. Set compressor release to 120 ms and adjust threshold to create the dip. Listen for recovery between hits; release is a response control, not a fixed silence length.

4. If the loop still feels crowded, shorten the kick or the reverb decay before increasing duck depth. Compare with rumble 2–3 dB quieter.

**Listen:** “Thump–rr, thump–rr”: a distinct kick and a short rolling body, with no continuous roar.

**Watch for:** A fast compressor release can distort very low waveforms or make the tail jump up too early. Smooth the recovery before blaming the source.

**Change the feeling:** More nimble: reduce decay toward 0.6 s. More weight: extend to 1.0 s and recover slightly later. Do not automatically lower the pitch.

**Exercise:** Make two versions using only 90 ms versus 160 ms compressor release. Match level and describe the groove change.

---

## Deep cavern rumble

Immense · patient · subterranean · Long dark reverb

A long tail carries across several kicks, while repeated ducking makes that sustained space breathe.

**Source:** Choose a round kick with controlled length, not an already enormous distorted tail. Try 125–136 BPM first.

**Chain:** KICK copy → dark Reverb → gentle Saturator → EQ → Utility Mono → sidechain Compressor

- **Reverb:** 100% wet; Decay 2.0–3.5 s; Predelay 15–30 ms; a larger Size than the tight recipe.
- **Colour:** Drive +1 to +3 dB; keep it smooth and level matched.
- **EQ:** High-pass 25–35 Hz as needed; low-pass 100–160 Hz. Do not cut away the useful root merely to hit a number.
- **Duck:** 4:1 to 6:1; Attack 1–3 ms; Release 180–280 ms; roughly 8–12 dB reduction.

### Build

1. Build the baseline chain, then extend Reverb decay to 2.5 s. Leave Freeze off; you want a decaying room, not infinite buildup.

2. Darken the low-pass to about 140 Hz and use only a little saturation. Let the source’s fundamental guide the lower boundary.

3. Start release at 220 ms. If the tail never reappears, raise the threshold or shorten release rather than turning the rumble channel up endlessly.

4. Listen for at least eight bars and after playback stops. Judge the accumulated tail and its exit. Automate the wet layer down or print a controlled ending at a breakdown.

**Listen:** The kick remains in front of a deep, continuous space that dips and returns around each hit.

**Watch for:** A long, loud tail masks bass notes and makes the groove slower than intended. Keep a separate bassline sparse, or use a shorter rumble.

**Change the feeling:** More distant: darker cutoff and less upper grit. More physical: open the low-pass slightly and use a shorter room. Long reverb at low level can feel larger than loud reverb.

**Exercise:** Keep the same kick and match the level of Tight rolling and Deep cavern. Which creates more space around the hook?

---

## Offbeat bounce

Springy · swinging · danceable · Eighth-note delay

A low reply halfway between kicks gives a definite second step. The space is rhythmic rather than a constant wash.

**Source:** Use a short kick with a clear tonal tail. Try 128–138 BPM and keep the original four-on-the-floor kick.

**Chain:** KICK copy → Delay (wet only) → small Reverb → Saturator → EQ → Utility Mono → sidechain Compressor

- **Delay:** Straight 1/8 on both sides; 100% wet; Feedback 0% initially. In a 16th-based sync selector, choose 2.
- **Reverb:** After Delay: 20–30% wet; Decay 0.4–0.7 s; Predelay 0–5 ms. This dry portion is already a delayed hit.
- **EQ / grit:** High-pass 30 Hz, low-pass 170–240 Hz; Drive +2 to +4 dB, output matched.
- **Duck:** 4:1; Attack 1–3 ms; Release 70–130 ms; adjust so the offbeat reply can emerge.

### Build

1. Insert Delay before the baseline Reverb. Set Delay to 100% wet, one straight eighth note, feedback zero. Keep its left/right timing equal to start.

2. At 135 BPM, the delayed reply arrives about 222 ms after each kick. Bypass later effects briefly and confirm there is one reply between kicks.

3. Use Reverb at only 25% wet here: it softens an already delayed signal, so it does not reintroduce the original on-beat dry kick. Add the final EQ and mild drive.

4. Re-enable kick ducking and tune the recovery so the reply is audible. Add feedback only if you deliberately want further repeats; repeats on the next kick can crowd it.

**Listen:** A readable “boom–woom, boom–woom”, closer to a bouncing bass rhythm than a long room.

**Watch for:** Putting Reverb back to 100% wet may blur away the offbeat hit. Too much delay feedback creates extra on-beat energy.

**Change the feeling:** Rounder: low-pass around 150 Hz and shorten the source. More swagger: render the reply and move selected offbeats slightly late; compare small changes before applying global swing.

**Exercise:** Mute every second offbeat in a rendered version. Notice how removing rumble notes changes the pocket.

---

## Dotted-delay gallop

Restless · rolling · hypnotic · Three-sixteenth delay

Repeats spaced three sixteenths apart rub against kicks spaced four sixteenths apart, creating a busier pattern.

**Source:** A compact kick or a cropped kick tail works better than a long sub drop. Start 132–142 BPM.

**Chain:** KICK copy → Delay → short Reverb → EQ → Saturator → corrective EQ → Mono → sidechain Compressor

- **Delay:** Dotted 1/8 = 3/16; 100% wet; Feedback 15–25%. In a 16th-based sync selector, choose 3, not 1/8 triplet.
- **Reverb:** 15–25% wet after Delay; Decay 0.3–0.6 s.
- **Tone:** High-pass 35–45 Hz; low-pass 200–300 Hz. Try Drive +2 to +4 dB and tame any new upper grit with the final EQ.
- **Duck:** 4:1; Attack 1–3 ms; Release 70–120 ms; start around 6–9 dB reduction.

### Build

1. Start with Delay feedback at zero, dotted eighth timing. Verify the first reply falls three sixteenths after the kick.

2. Raise feedback to 20%. The second repeat lands six sixteenths after its source; with every kick feeding the chain, these repeats combine into a denser cycle.

3. Keep the room short and the tail a little more mid-focused than a sub-heavy cavern. Remove energy that competes with the kick’s low body.

4. Print two bars and audition the actual pattern. Remove or fade individual hits if the summed feedback feels like a continuous carpet. Keep ducking on any playback that overlaps the dry kick.

**Listen:** A low rolling pattern with small answers around the straight kick pulse, rather than four identical offbeat hits.

**Watch for:** Dotted and triplet are different timings. High feedback plus a long reverb can erase the very rhythm you are trying to create.

**Change the feeling:** More hypnotic: darker tone and fewer repeats. More urgent: slightly brighter tone and a shorter, more pronounced tail.

**Exercise:** Print the tail, remove a third of the events, and compare its groove with the unedited feedback pattern.

---

## Industrial grind

Abrasive · tense · mechanical · Distorted room tail

Distortion after reverb roughens the entire tail and adds an audible middle. The sense of aggression can come from that middle while the sub stays controlled.

**Source:** Use a restrained kick with some midrange knock. It need not already be heavily distorted. Start 138–150 BPM.

**Chain:** KICK copy → Reverb → Saturator → EQ → Utility Mono → sidechain Compressor

- **Reverb:** 100% wet; Decay 0.8–1.5 s; Predelay 5–15 ms.
- **Distortion:** Saturator Analog Clip starting at +6 dB Drive, exploring up to +10 dB; reduce Output and compare at matched level.
- **EQ:** High-pass 35–50 Hz; low-pass 300–600 Hz. If a nasal band dominates, make a modest narrow cut after listening.
- **Duck:** 6:1; Attack 1–3 ms; Release 100–180 ms; about 8–12 dB reduction, adjusted to the kick.

### Build

1. Build a short room first, then put the main distortion after it. Bypass the compressor only briefly to identify the dry texture at low level.

2. Raise Drive from +3 toward +6 dB while reducing output. Stop when the tail has grit; a flattened wall can sound less forceful than a smaller amount of distortion.

3. Start low-pass around 400 Hz and high-pass around 40 Hz. Let the original kick own the deepest weight; this rumble adds abrasive movement above it.

4. Restore ducking and check the combined group without a master limiter hiding level changes. Compare distortion before versus after reverb in a duplicate chain to hear the difference.

**Listen:** A controlled low growl behind the kick, with a clearly separate strike in front.

**Watch for:** EQ before distortion cannot remove harmonics that the distortion generates afterward. Put a cleanup EQ after the distortion when those highs are unwanted.

**Change the feeling:** More brutal: slightly brighter upper cutoff and harder saturation. More ominous: darker filtering with less drive and a longer tail.

**Exercise:** Make a clean and a gritty version at matched loudness. Keep whichever makes the actual drum pattern feel stronger, not simply busier.

---

## Short gated rumble

Punchy · clipped · spacious · Rendered tail with a volume window

A deliberate end creates silence. A rumble can feel hard and physical without filling every millisecond.

**Source:** Print an unducked 0.8–1.2 s reverb tail from a single kick. Use an isolated wet tail, with the original kick transient absent.

**Chain:** Unducked wet-tail audio → trim / gain envelope → EQ → gentle saturation → optional kick sidechain

- **Timing:** Start the audible tail roughly 20–30% into each beat. Fade it out by 65–80% of the beat.
- **Fades:** 3–10 ms at clip edges; longer musical fades for the body. Avoid hard cuts through a large waveform.
- **Tone:** High-pass 30–40 Hz; low-pass 160–250 Hz; mild drive if needed.
- **Extra ducking:** Only if there is still overlap with the kick; do not automatically add a deep compressor dip to an already empty gap.

### Build

1. Follow the rendering instructions below with the final ducking compressor bypassed. Record only RUMBLE, not the combined kick and rumble group.

2. Take one small piece of the wet tail. At 135 BPM try an audible window from about 110 to 330 ms within each 444 ms beat. These are trial placements, not compressor settings.

3. Use clip fades or a gain envelope for a quick rise, a short body and a smooth fall. Leave the end of the beat genuinely quiet, then repeat that shape under the kick.

4. Compare two-, three- and four-hit versions per bar. If you hear a buzz at the cut, lengthen the fades rather than adding reverb to hide it.

**Listen:** Kick, compact tail, clear silence. The next kick arrives into space.

**Watch for:** A noise gate with the wrong detector can flutter or miss the tail. Draw the envelope first so you know the intended rhythm before trying to automate it with a gate.

**Change the feeling:** More stomping: shorten the tail and leave a larger end gap. More rolling: lengthen the window while retaining a clear dip on every kick.

**Exercise:** Keep the sample identical and make the audible window half as long. Describe the change in perceived speed and weight.

---

## Reverse inhale

Pulling · suspenseful · elastic · Reversed wet-tail audio

A tail that grows toward the next beat pulls attention forward. The drop in level at the kick turns that swell into an inhale.

**Source:** Render a single unducked wet kick tail around 1–2 s. Use the wet lane alone; remove any original dry kick attack.

**Chain:** Wet tail → reverse / crop → gain envelope → EQ → Mono → optional final ducking

- **Placement:** Fit a rising fragment into roughly the last 50–75% of a beat; strongest near the next kick, then fade out just before it.
- **Fades:** Start softly; finish with a 5–15 ms fade. Do not let a reversed transient slam into the next dry kick.
- **Tone:** High-pass 30–45 Hz; low-pass 150–250 Hz. Keep the swell quieter than the dry kick.
- **Duck:** If needed: 4:1, Attack 1–3 ms, Release 100–170 ms. First check whether the drawn gap already solves the overlap.

### Build

1. Record the wet tail with the compressor bypassed. Reverse the resulting audio clip using the DAW’s reverse command.

2. Choose a part that swells smoothly; trim the loudest abrupt edge if it contains a reverse click or reflected kick attack.

3. Place the swell before the next kick, with its final fade ending at the kick boundary. At 135 BPM, try a fragment from about 170 to 440 ms within a 444 ms beat, fading during the final 10 ms.

4. Repeat it every beat for an inhaling groove, or only before beats 1 and 3 for more space. At a section ending, deliberately decide whether the final swell is cut, allowed to ring or removed.

**Listen:** A low “whoom” drawing you into each chosen kick, without blunting its attack.

**Watch for:** Reversing the full kick instead of its wet tail often produces a pronounced reversed transient. That can be useful, but is a different effect from a soft rumble inhale.

**Change the feeling:** More suspense: use the swell only before phrase endings. More physical: retain a short forward tail after the kick and lower both layers to avoid doubling the bass.

**Exercise:** Use the same reversed fragment before every beat, then only before the last beat of a two-bar phrase. Which creates more anticipation?

---

## Tuned sub-pulse alternative

Clean · controlled · intentional · Serum synth bass, no reverb required

A deliberate bass envelope can perform the between-kick role with clearer pitch. It is a rumble-role alternative, not a reverberant rumble texture.

**Source:** Serum 2 Init: OSC A Basic Shapes sine or triangle, LEVEL 55%, UNISON 1, other sources off. OCT/SEM 0. Start MIDI 33 (55 Hz) only as a test; choose the root that fits your track.

**Chain:** Serum 2 sub pulse → optional gentle saturation → Utility Mono → kick sidechain if needed

- **ENV 1:** ATK 4 ms; HOLD 0; DEC 220 ms; SUS minimum (−∞ dB); REL 45 ms.
- **Notes:** Four offbeat notes per bar, halfway between kicks. Start each note about 0.6 beat long so the decay can unfold; shorten if needed.
- **Tone:** Sine for clean depth, triangle for a little more audible middle. No reverb. No oscillator detune.
- **Duck:** If the tail crowds the next kick: 4:1; Attack 1–3 ms; Release 80–140 ms; start with 3–6 dB reduction.

### Build

1. Build the source and amplitude envelope above. Leave filters and FX off initially. Hold a key: the sound should decay to silence, even while held.

2. Place the notes between the kicks. At 135 BPM their starts are roughly 222 ms after each kick. Select an actual root note that works with the song instead of tuning by the word “rumble”.

3. Change sine to triangle if the pitch is hard to hear on small speakers. Alternatively add gentle saturation at matched output, keeping the fundamental dominant.

4. Check the note ending near the following kick. Use shorter decay or a smaller note gate first; add sidechain only as much as the overlap needs.

**Listen:** A clear low bounce with stable pitch and far less room texture than the reverb recipes.

**Watch for:** Adding this under a full-strength low rumble can create two competing bass parts. Choose one as the foundation; reduce or remove the other.

**Change the feeling:** More underground: dark triangle with a little saturation. More urgent: shorter decay and an occasional extra sixteenth pulse. More atmospheric: add a separate quiet filtered texture above it.

**Exercise:** Replace a wet rumble with this pulse at matched level under the same drums. Decide whether the track wants pitch clarity or a diffuse space.

## Timing

Quarter note = 60000 / BPM ms. Offbeat = one half of that; dotted eighth = three quarters. For a drawn ducking envelope, try a near-silent gap for 20% of each beat and fade up over the next 35%, with smoothed edges. This is an editable gain-envelope plan, not a compressor model. Compressor recovery also depends on detector, threshold, ratio and kick duration.

COMMIT THE SOUND / KEEP ITS GROOVE

### Render it, move it, make it yours.

- Record the wet lane alone. Create another audio track, Audio From RUMBLE → Post FX, Monitor Off, arm and record. For a four-bar loop, let the reverb run for at least four bars first, then record several more. Starting from silence gives a different first beat than a settled loop.

- Pick one ducking method to print. For audio locked to this kick pattern, record the final ducked chain. For a portable texture, bypass the final sidechain compressor before recording, then duck the playback track with the actual kick in its destination project. This avoids baking in one rhythm and unknowingly ducking it a second time.

- Make the edit clean. Select a stable one-, two- or four-bar region; check the beginning and end at the chosen tempo. Add short edge fades and, if necessary, crossfade a join. Bypass time-stretching initially for a one-shot. For a loop moved to a new tempo, verify the source tempo and use your DAW’s warp controls, then listen for changed low-end texture.

- Optional: play it through Serum 2. Use the existing Resampled techno rumble recipe: Sample mode, your WAV, UNISON 1, no added reverb, a short amplitude attack and release. Preserve the source at its untransposed root for the first test. A loop has baked-in rhythm: do not retrigger a whole two-bar recording on every quarter note. Use one long MIDI trigger or load a short isolated tail for repeated notes. A single root label does not make a diffuse rumble perfectly tuned.

- Save three variants. Keep one short/dry, one deep/long and one gritty version from the same kick. Match perceived level before comparing, then use each under the same drum loop. Write whether the track feels more agile, spacious or tense, and name the specific timing or tone change responsible.

Fast diagnosis. Swamp → less wet level, shorter decay or less low-frequency overlap. Vanishing tail → check Reverb’s input low-cut, the final high-pass and excessive ducking. Double kick → check 100% wet routing and remove the original transient from a rendered tail. Grainy buzz → lengthen compressor release or soften a drawn envelope. Hollow in mono → reduce width and reassess the source. Boring constant carpet → change the tail’s timing before adding distortion.

No new rumble audio previews are presented: these chains depend on your kick, reverb and DAW. The diagram teaches timing; build and audition the chain to judge its actual sound.


# Diagnosis

## No sound at all

Play Serum’s own keyboard. If that works, check the DAW MIDI clip, track, mute and monitoring. If it does not, Init and enable A; check master and oscillator level, output route and ENV 1 sustain. Open cutoff temporarily.

Try one note with FX bypassed. Restore one module at a time until you find the interruption.

## The filter knob does nothing

Check that the filter is enabled, MIX is 100% and the oscillator routes to that filter. A second oscillator may route Main or Direct and bypass it. A low-pass may be hard to hear on a pure sine because there are no highs to remove.

Use a saw temporarily. Sweep 200 Hz to 8000 Hz: the brightness should change clearly.

## My pluck keeps sustaining

ENV 1 SUS may still be above minimum. For a decaying hit set it to silence (−∞ dB when displayed in dB), then set decay. Check if FX are creating the apparent sustain.

Hold a key for two seconds with FX off. The dry sound should die before you release it.

## The patch clicks

An abrupt jump in amplitude, sample crop or LFO shape can click. Try amp ATK 3–6 ms and REL 30–60 ms. Smooth LFO corners. For a sample, move the crop to a quieter waveform crossing.

If the attack is meant to be percussive, keep a little transient. Fix the unwanted discontinuity without removing all impact.

## Bass feels large solo but vanishes with the kick

The notes may overlap the kick’s body, compete in the same region, or cancel because of their waveforms. First lower one part and shorten bass notes/release. Try shifting the bass timing slightly. Compare phase/retrigger settings by listening in the full loop.

Use one mono sub source and inspect any stereo processing. A fixed phase does not automatically align two different instruments.

## Bass is missing on laptop speakers

A pure low sine may sit below the speakers’ useful range. Add gentle saturation or a quiet harmonic layer; keep the original low foundation controlled.

Do not solve it by turning the sub up until it overloads full-range speakers. Compare warm triangle and sine sources at similar level.

## It is loud, harsh and still not powerful

Bypass distortion and extra compression. Reduce filter resonance, FM depth or unison detune one at a time. Restore only the stage that adds a useful quality. Match output after every bypass comparison.

Check the sound quieter and in context. More high-frequency energy can hide the important body.

## FM makes no difference / FM sounds wildly wrong

B must be powered on and A must use FM (B). B can have LEVEL 0%. Start with both oscillators on sine and a simple ratio, such as B one octave up. Then increase Warp slowly.

Remove other modulation while diagnosing. A non-integer ratio intentionally produces a less harmonic sound.

## My chord only plays one note

Turn MONO off and increase polyphony. If a recipe tunes A/B/C to a chord, play single MIDI notes; adding another chord can make a much denser, unintended stack.

Watch note releases: long tails can consume voices and cause stealing even after your hands move to a new chord.

## Slide / legato does not behave

Use MONO, a nonzero PORTA time and the intended legato-only option. Overlap the MIDI notes that should connect. Leave a gap where you want a fresh envelope attack.

Listen to two isolated notes before testing a complicated sequence. Legato may suppress envelope retriggering on overlaps.

## The reverb or delay eats the groove

Bypass the effects and check if the dry envelope is already too long. Then reduce delay feedback, reverb decay and wet mix. Darken or high-pass the wet signal when available.

Listen through several bars. Echo buildup can be fine on the first hit and crowded by the fourth.

## Every repeated note starts differently

RAND, free-running LFOs, detune beating, random modulation or the source sample can vary the attack. Lower RAND and choose RETRIG where repeatability matters.

Do not remove all variation by default. Decide whether the role needs identical low-end hits or an evolving texture.

## The patch falls apart in mono

Unison, detuned layers, chorus or widening may cancel. Reduce one at a time and centre the sources. For bass, keep a simple low layer and make width above it.

MONO in Serum’s voicing is not the stereo-to-mono listening test. Use a mono utility in your DAW.

## CPU spikes / notes are cut off

Reduce unison first, then shorten long releases or reduce polyphony only as far as the part allows. Granular and spectral textures may be heavier; render a successful passage to audio.

Do not lower polyphony below your chord size plus required tails and expect the same musical result.

## It sounds wrong when transposed

A sample may have the wrong root note; a recorded chord contains fixed intervals; FM or a filter cutoff can change character across register. Check the actual MIDI number and octave transpose.

Test the recipe in its stated register first, then adapt cutoff, decay or source for your song.

## I keep changing things and get lost

Return to the last saved version. Describe the goal in one sentence: “shorter tail”, “more wooden attack” or “less wide”. Predict which single control addresses it and save a new version after a useful change.

A finished patch has a role, a usable register, controlled level, clear macros and a saved source. It does not need every module enabled.

# Eight-week practice

## Week 1: Hear the building blocks

Wave shape, register and the amplitude envelope.

1. Build Round sub and compare sine with triangle at equal output. Write what becomes more audible.
2. Build Rolling bass. Set sustain to full, then to zero; explain the change in your own words.
3. Use Hear & learn. Predict attack, decay and release changes before pressing Play.
4. Close the recipe and rebuild Round sub and Rolling bass from Init. Check only after listening.
5. Write an eight-bar kick/bass loop. Save a short and a long version of the bass.

Pass check: You can make a held tone, a short pluck and a fade-in from one oscillator, and explain sustain versus release.

## Week 2: Make brightness speak

Routing, filter types, resonance and ENV 2.

1. Build Offbeat house bass. Bypass ENV 2, then restore it; describe the attack difference.
2. Build Deep house stab with the provided MIDI chord. Check MONO is off.
3. Try low-pass 12 versus 24 and a resonance sweep at a comfortable matched level.
4. Rebuild Melodic techno pluck without the recipe. Adjust the filter peak by ear.
5. Use bass, chord and pluck in one loop. Shorten whichever part masks the next hit.

Pass check: You can give a note a bright attack and a dark tail, and find a source that bypasses the filter.

## Week 3: Control motion and connection

LFO modes, MIDI gate, velocity and glide.

1. Build Acid house. Write two separate notes, then overlap them; listen for a slide.
2. Build Wobble. Compare 1/4 and 1/8 rate on one held note.
3. Switch RETRIG, FREE and ENVELOPE and write when each is useful.
4. Map velocity to a little cutoff movement. Make two intentional accents in an acid phrase.
5. Record eight bars of a cutoff macro performance and keep the best two bars.

Pass check: You can choose where a phrase slides and explain why an LFO pulse is not kick-reactive sidechaining.

## Week 4: Build harmonics on purpose

FM carrier, modulator, ratios and fast timbre envelopes.

1. Build Rubber FM bass. Mute B’s audible output while keeping its modulation working.
2. Compare B at the same octave, +1 and +2 with the same FM amount.
3. Build Wooden mallet. Lengthen ENV 3 decay until it becomes a bell; save both.
4. Build Metallic percussion and compare its ratio with exact 2:1 FM.
5. Rebuild one FM sound from memory. Use it in a loop without reverb first.

Pass check: You can explain the modulator’s job and turn a sine into a wood-like or metal-like strike intentionally.

## Week 5: Design a small drum kit

Pitch envelopes, filtered noise and separate body/attack shaping.

1. Build Short kick. Compare +12 and +24 semitone pitch drops.
2. Build Closed hat and Open hat from the same noise; change only the envelope first.
3. Build Clap. Draw three bursts and confirm LFO ENVELOPE mode plays once.
4. Build Snare and Tom. Balance tonal body and noise separately.
5. Create a groove with four original kit pieces; add velocity accents and remove unnecessary hits.

Pass check: You can distinguish a kick pitch envelope from an amplitude envelope and create two percussion roles from one source.

## Week 6: Use space and stereo deliberately

Effect order, feedback, width and mix placement.

1. Build Dub chord dry, then add delay; listen to four bars of echo accumulation.
2. Build Reese. Compare stereo and mono; reduce detune until the centre holds together.
3. Build Warm pad and try long versus short release over changing chords.
4. Try distortion before and after a reverb in a duplicate patch; match loudness and describe the difference.
5. Finish a 16-bar loop. Use one roomy part and keep the competing parts drier.

Pass check: You can hear when a tail masks the next event and make a wide layer survive a mono check.

## Week 7: Turn recordings into instruments

Root mapping, crop points, resampling and source portability.

1. Record your own short vowel and build Vocal chop. Verify its root note with a tuner.
2. Use the same vowel for Granular cloud; compare short and long grains.
3. Render a dry chord you built and make Spectral frozen chord. Compare SCAN 0 and a slow positive scan.
4. Build Rumble from your own kick tail. Make the actual kick duck it in the DAW.
5. Save the four patches with their custom content and reopen them in a new project.

Pass check: You can choose Sample, Granular or Spectral for a reason and reopen your patch without losing its source.

## Week 8: Build a personal mini-bank

Recall, reference listening, useful macros and finishing.

1. Pick three sounds from a reference track. Describe source, envelope, brightness, motion and space before opening Serum.
2. Build one interpretation from Init with the guide closed. Check the relevant recipe only after your first attempt.
3. Create three variations of one patch: dark/short, bright/short, dark/long. Name the changed control in each description.
4. Finish eight original patches: two basses, two chords/leads, one pad, two percussion sounds and one transition. Give each useful macros.
5. Use at least four of your patches in a 32-bar sketch. Reopen the project, audit levels and source files, then write your next learning goal.

Pass check: You can start from a sound intention, build a useful patch without a recipe, diagnose one weakness and save a reusable result.

# Dictionary

## Init

The initialized, plain starting preset. It removes the previous patch’s sound-design choices.

Where: MENU → Init Preset

## Patch / preset

A saved set of instrument settings. A patch is the sound design; a preset is its saved recallable form.

Where: Disk icon by the preset name

## DAW

Digital audio workstation: the program where you arrange and mix music, such as Ableton Live.

Where: The host program around Serum

## MIDI

Instructions for pitch, timing and velocity. MIDI contains no recorded sound and no Serum patch.

Where: Your DAW piano roll

## Oscillator / OSC

A generator of repeating waves or sample playback. It supplies the raw sound.

Where: OSC page → A, B, C

## Waveform

The shape of one repeating cycle. Different shapes contain different balances of harmonics.

Where: Oscillator display

## Sine

A smooth wave containing only the fundamental in ideal synthesis. Useful for sub, kicks and FM carriers.

Where: Basic Shapes → smooth curved wave

## Triangle

A wave with gentle odd harmonics. Rounder than saw or square, but more audible in the mids than a sine.

Where: Basic Shapes → triangular wave

## Saw

A ramp-shaped wave with both odd and even harmonics. Useful for bass, brass, stabs and broad leads.

Where: Basic Shapes → ramp with a vertical reset

## Square / pulse

A wave that switches between high and low. A balanced square has a hollow odd-harmonic tone; unequal pulse widths change that tone.

Where: Basic Shapes → rectangular wave

## Wavetable / WT POS

A set of wave shapes and the control that chooses where you are in the set. Moving position changes tone before the filter.

Where: Wavetable oscillator → WT POS

## Harmonics / partials

Frequency components within a sound. Harmonics are integer multiples of the fundamental; partials can also be inharmonic.

Where: Heard as brightness and tone colour

## Fundamental

The basic repeating frequency associated with a pitched sound. Its harmonics lie above it.

Where: Played note and oscillator tuning

## Hz / kHz

Cycles per second. 1000 Hz = 1 kHz. For a filter it describes a frequency boundary, not a musical note number.

Where: Cutoff, tuning, unsynced LFO rate

## Semitone / octave / cents

A semitone is one piano-key step. Twelve semitones make an octave. One hundred cents make a semitone.

Where: OCT / SEM / FIN pitch controls

## Unison

Several voices of the same played note. It can make a wide ensemble but increases CPU use and can weaken a clear low end.

Where: Oscillator → UNISON

## Detune

A small pitch difference between voices. It creates beating and width; large differences sound out of tune. Serum’s unison knob value is not a cents readout.

Where: DETUNE; FIN uses cents

## Phase / RAND

Phase is where in the waveform a note starts. RAND varies that starting position. Low randomization helps repeatable bass hits, but does not guarantee they align with your kick.

Where: Oscillator phase controls

## Filter

A processor that removes or emphasizes frequency regions. It only changes audio routed through it.

Where: Filter 1 / Filter 2

## Cutoff

The frequency around which a filter starts changing the spectrum. Lower a low-pass cutoff to darken a sound.

Where: Filter → CUTOFF

## Low-pass / high-pass / band-pass

Low-pass keeps lows; high-pass keeps highs; band-pass keeps a band around a centre frequency. Real filters have gradual slopes.

Where: MG Low / High / Band filter types

## Slope: 12 / 24 dB

How steeply a filter attenuates beyond its cutoff, approximately per octave in its roll-off region. 24 is generally steeper than 12.

Where: Numbers in filter type names

## Resonance / RES

Emphasis around the cutoff. It can create a ringing, vowel-like or whistling tone and change apparent bass and loudness.

Where: Filter → RES

## Drive / saturation

Pushing a nonlinear stage adds harmonics and compresses peaks. Compare at matched output so louder does not fool you.

Where: Filter DRIVE or Distortion effect

## Envelope / ADSR / AHDSR

A one-note movement with attack, optional hold, decay, sustain and release. It can control volume, brightness or pitch.

Where: ENV 1–4

## Attack / ATK

Time to rise after note-on. A few milliseconds makes a hit; hundreds of milliseconds makes a swell.

Where: Envelope → ATK

## Hold

Time at the peak before the decay starts. At zero the envelope immediately begins decay after attack.

Where: Envelope → HOLD

## Decay / DEC

Time to fall from the peak toward the sustain level while the note is held. It is not the same as release.

Where: Envelope → DEC

## Sustain / SUS

The held level after decay. It is a level, not a duration. ENV 1 minimum is silence; 0 dB means full level, not zero sound.

Where: Envelope → SUS

## Release / REL

Fade time after note-off, starting at the current level. Long release has little effect if the envelope has already reached silence.

Where: Envelope → REL

## Modulation / Matrix

A source moves a destination by an amount. The Matrix lists those connections so you can inspect depth and polarity.

Where: Drag a source handle; inspect MATRIX

## Unipolar / bipolar

Unipolar travels one way from a base. Bipolar travels on both sides of a base. Positive versus negative amount chooses direction.

Where: Modulation Matrix polarity and amount

## LFO

Low-frequency oscillator: a repeating control shape. It moves another control; it is not normally an audible tone itself.

Where: LFO section

## Retrigger / free / envelope mode

Retrigger starts an LFO again on each note; free lets it continue; envelope mode plays its shape once.

Where: LFO mode choices

## BPM sync / dotted / triplet

Sync follows tempo. Dotted means 1.5 times the normal duration; a triplet value is two-thirds of that normal duration.

Where: LFO and Delay time controls

## Macro

One named performance control mapped to one or more destinations. Its useful range is designed by you.

Where: MACRO source knobs

## FM / carrier / modulator

In frequency modulation, one fast oscillator changes another’s frequency. The carrier is heard; the modulator can stay silent. Ratios and depth determine the harmonic character.

Where: A WARP → FM (B); B powered on

## Warp / sync

Warp reshapes oscillator playback. Sync forces extra waveform resets for a tearing harmonic sound. Different warp types are different processes.

Where: Oscillator WARP menu and amount

## Mono / polyphony

Mono voicing allows one played note at a time; polyphony allows several. Mono voicing is distinct from mono audio (one channel).

Where: Voicing controls; DAW mono utility

## Legato / portamento / glide

Legato connects overlapping notes without the usual fresh articulation. Portamento slides pitch. Legato-only glide needs actual MIDI overlap.

Where: MONO, LEGATO and PORTA

## Velocity

How hard a MIDI note is played, from 1 to 127. It changes sound only where the patch or sample program responds to it.

Where: Piano-roll velocity; VELO source

## Gate / note-off

Gate is how long a MIDI note stays held. Note-off starts release, even if the decay stage is unfinished.

Where: Length of a MIDI note

## Dry / wet / mix

Dry is the unprocessed signal; wet is the processed signal. Mix blends them. A reverb send usually uses a fully wet effect.

Where: Effect MIX; DAW send/return

## Delay / feedback

Delay repeats the signal. Feedback sends some of the repeat back through the delay, creating more repeats. Excess feedback can build up.

Where: FX → Delay

## Reverb / pre-delay

Reverb makes a room-like tail. Pre-delay is the gap before that tail, helping the dry attack remain distinct.

Where: FX → Reverb

## Routing / bus / Direct

Routing chooses the next audio destination. A bus is an additional shared path. Direct bypasses filters and effects. Keep unused sends at zero.

Where: Module route button / MIX page

## Sidechain / ducking

A signal, often the kick, controls reduction of another signal’s level. A drawn LFO pump repeats a shape but does not listen to your kick.

Where: DAW compressor external sidechain

## Sample / multisample

A sample is a recording. A multisample maps several recordings across pitches or velocities for more natural instrument playback.

Where: Oscillator engine selector

## Root note / key tracking

Root note tells a sampler which note plays a file untransposed. Key tracking makes pitch or another setting follow the MIDI note.

Where: Sample mapping and oscillator tracking

## Granular / grain

Granular playback overlaps small fragments of audio. Grain length, position and overlap turn a recording into a texture.

Where: Granular oscillator mode

## Spectral / scan

Spectral resynthesis manipulates frequency components of a recording. SCAN sets how quickly and in which direction its content develops.

Where: Spectral oscillator → SCAN

## Resample / render / bounce

Record the output as new audio. This commits a processing chain and lets you treat its result as a new source.

Where: DAW audio recording/export

## Voicing / inversion

Which chord notes you choose and their octave placement. An inversion puts a chord note other than the root at the bottom.

Where: MIDI notes, not a filter setting

## Stab / pluck / pad

Stab: a short chord hit. Pluck: a note with a quick attack and falling body. Pad: a sustained supporting texture.

Where: Amplitude envelope and playing style

# Sources and scope

REFERENCE / WHAT THIS GUIDE IS

## Original recipes. Documented controls.

### How to use the numbers

These are original educational starting points for Serum 2, authored for this guide. They are not factory presets, artist transcriptions, verified recreations of records or a promise of a particular professional result. Recipe settings have been reviewed against the documentation where accessible, but the 48 patches have not been built and auditioned inside the Serum plug-in as part of this release. Refine the ranges using each recipe’s listening checkpoint.

Browser previews are simplified Web Audio sketches. They demonstrate rhythm, envelope and broad source character. They do not reproduce Serum’s wavetables, filter models, unison, exact FM response, sample engines or full FX chains. Sample, multisample, granular and spectral recipes intentionally have no synthetic stand-in preview. The actual sound depends on the audio you load.

The handbook works offline. Online links below are optional references. No plug-in connection, account or network request is required to use the guide. Progress is local to your browser; notebook exports preserve it. Printing prints the currently selected recipe. Download the full Markdown handbook for all recipes and supporting text.

#### Primary references checked 13 September 2026

- [Xfer: Serum 2 product overview](https://xferrecords.com/products/serum-2) — available oscillator engines and the broad sound-design capabilities.

- [Xfer: Serum 2 User Guide](https://xferrecords.com/manual/serum-2/docs) — oscillator warp modes (FM (B), pp. 49–55), granular mode (p. 85 onward), spectral SCAN (p. 116), filters (p. 139), envelopes (p. 186), modulation (p. 200), and Init Preset (p. 324). Page numbers refer to the indexed 2025 manual and may change in later editions. In Serum use MENU → Read the manual for your installed version.

- [Xfer: Using Knobs and Sliders](https://xferrecords.com/web-manual/serum-2/using-knobs-and-sliders) — precise input and context menus.

- [Xfer: Routing an Oscillator or Filter](https://xferrecords.com/web-manual/serum-2/routing-an-oscillator-or-filter) — Filter, Main, Direct and None routes.

- [Xfer: Saving Changes](https://xferrecords.com/web-manual/serum-2/saving-changes) and [Embedding Content](https://xferrecords.com/web-manual/serum-2/embedding-content-when-saving-a-preset) — native preset saving and custom sample portability.

Factory categories Tables/Analog/Basic Shapes and Multisamples/Factory/Keys and Choir were checked against the content installed in this workspace’s environment. Exact sample names and the controls exposed by each engine can vary by version. The guide tells you what to audition instead of inventing a universal factory filename.

- [Xfer: Serum 2 product overview](https://xferrecords.com/products/serum-2)
- [Xfer: Serum 2 User Guide](https://xferrecords.com/manual/serum-2/docs)
- [Xfer: Using Knobs and Sliders](https://xferrecords.com/web-manual/serum-2/using-knobs-and-sliders)
- [Xfer: Routing an Oscillator or Filter](https://xferrecords.com/web-manual/serum-2/routing-an-oscillator-or-filter)
- [Xfer: Saving Changes](https://xferrecords.com/web-manual/serum-2/saving-changes)
- [Embedding Content](https://xferrecords.com/web-manual/serum-2/embedding-content-when-saving-a-preset)
