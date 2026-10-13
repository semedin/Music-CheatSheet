# Talk — tech house bass and hooks

Talk is the tech house room. It works from one idea about the genre: **the bassline is the lead and the vocal is one line said with attitude**, and the two take turns. Open `talk.html`; everything runs locally in one standalone file, and your voice never leaves the page.

## 01 The talking bass

A bass becomes a voice when it passes through **formants**: resonances at fixed frequencies that don't follow the note. Talk's bass is two detuned saws and a square an octave down, driven, then shaped by a low-pass that follows the second formant (so closed vowels are dark) and three resonant peaks at the vowel's formants. A clean sine sub sits underneath; the character is high-passed at 95 Hz.

Each note carries a **shape**, a path through the vowels a, e, i, o and u: `wah` (u→a), `wow` (u→a→u), `yeah` (i→e→a), `ow` (a→o→u), `oi`, `you`, `we`, and the single vowels `aah`, `ooh` and `eee`. Click a word under **Hear it say** to hear the current sound say it.

### Fourteen loops, one grammar

Every loop is two bars of 16ths, and every one obeys the same rules: **no note starts on a kick**, notes never overlap, and each loop has at least one talking note, usually where the phrase answers itself at the end of bar two. The tests check all fourteen studies, and 2,000 generated loops, against the grammar. The generator writes new loops in five rhythmic grammars (offbeat, late, gallop, wonky 3-3-2, rolling) and changes the last note of the phrase.

### Keep it alive

One loop has to carry a whole drop. Eight moves change it across an 8-, 16- or 32-bar phrase without writing a new idea: open the mouth (CC74 rises across the phrase), note swap every fourth bar, leave a gap, ghost 16ths, a pitch-drop fill every eighth bar, an octave lift in the second half, a new word every second eight bars, and double talk at the end. **Bars that differ from the loop** counts how much of the phrase the moves actually changed.

## 02 Say the hook

Record up to five seconds from your mic, load an audio file, or let a robot say one of three demo lines. The take is trimmed, normalized and cut into syllables: voiced regions above an adaptive threshold, split at dips. **Split** sets how deep a dip has to be. Each syllable gets a pitch estimate by autocorrelation (70–600 Hz).

Eight treatments place the syllables into a two-bar loop in time with the bass:

| Treatment | What it does |
|---|---|
| Straight up | Your rhythm, each syllable snapped to the nearest 16th, entering on the first offbeat |
| Mantra low | The whole phrase −5 semitones at the same length, driven, every bar |
| Chipmunk chop | +7 semitones, 16th slices cycling through the syllables on a syncopated grid |
| Stutter in | The first syllable three times on 16ths, then the phrase |
| Tuned chop | Each syllable pitched to root, ♭7, 5, octave or ♭3 of the key, on dotted 8ths |
| Phone throw | Band-passed and driven, with the last syllable thrown into three fading echoes |
| Call & response | The phrase in bar one only, so the bass answers in bar two |
| Reverse swell | The last syllable reversed into the downbeat, then the phrase |

Pitch shifting keeps the length: a WSOLA time stretch by the pitch ratio, then a resample back. It is clean on sustained vowels and grainy on consonants, which suits a chopped vocal but is not a studio pitch shifter.

**Bass makes room for the vocal.** With this on, talking bass notes under a syllable go silent, long notes are cut where a syllable starts or shortened to a hit, and short notes stay because they are the groove. The readout shows long and talking bass under the vocal before and after.

## Exports

- **MIDI:** a conductor with tempo and 4-bar markers; *Talk bass* with pitch bend (range ±12 semitones; the drop stabs are written as bend), CC74 for the mouth and CC1 for the vowel (a=0, e=32, i=64, o=96, u=127); one track per drum on channel 10 (GM notes); and *Vocal syllables*, where syllable 1 is C1.
- **WAV:** the full mix, stems (bass with the sidechain pump baked in, drums, vocal) with MIDI, session and a README in a ZIP, the current hook as a two-bar WAV, or all eight hooks plus each syllable as its own WAV.
- **Drum Rack:** drag the `syllable-*.wav` files together onto the C1 pad. They fill C1, C♯1, D1… in order, so the vocal MIDI plays your hook. Pitched treatments need their rendered WAV.

Settings are remembered in this browser. Recordings are not stored anywhere; export what you want to keep.

## What is measured, and what is not

Readouts count notes and time on the phrase you are hearing: talking notes, bars that differ from the loop, bass notes on a kick, long or talking bass under the vocal, syllables, phrase length in beats, the average 16th snap in milliseconds and the pitch of each syllable. They show whether the rules held. They do not measure taste, masking, or whether a track will chart.

The browser check renders the mix, each part alone and all eight hooks offline, and checks that each is finite, audible and below 0 dBFS. It also checks that an "ee" renders measurably brighter than an "oo" with the same note, so the formants are doing real work. Those checks are about signal integrity; how it sounds still needs your ears and a manual Ableton audition.

### Limits

- The syllable detector is built for spoken phrases with small gaps. Fast, slurred or sung lines may merge syllables; use **Split**, or record with clearer gaps.
- Recording needs a browser with `MediaRecorder` and microphone permission. GitHub Pages serves over HTTPS, which browsers require for the mic. Opened as a local file, some browsers block it; load a file instead.
- The preview bus has a compressor and limiter so the room is safe to listen to. It is not a master; stems leave headroom.
- Native Serum or Live presets are not exported. The Serum 2 recipe is a starting point, and parameter names differ between filter types, so the page says "MIDI-learn" rather than naming knobs.
- Release only vocals you have the rights to. Your own voice is the safe default.

## Build and verification

```
node talk-src/build.mjs          # writes talk.html (engine, audio, app, Orbit's theory helpers)
node site/build.mjs
node talk-src/test.mjs           # 18 engine groups
node site/check.mjs
node talk-src/browser-check.mjs  # Playwright: playback, loops, treatments, offline renders, phone layout
```

Talk embeds Orbit's theory helpers (`arp-src/theory.js`) for MIDI and ZIP. That file now writes and reads MIDI pitch bend (`pb` on a track); Orbit's and Pocket's tests still pass.
