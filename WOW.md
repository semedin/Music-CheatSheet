# Wow — the bassline cheat sheet

Wow is a cheat sheet you can play. It holds 34 bassline lanes for house and techno, 19 from the floors of 2025–26 and 15 classics and revivals those ideas came from, with three written basslines in each (102 in all). It writes each one **six ways**, one for every section of a track. Open `wow.html`; everything runs locally in one standalone file.

The page is built on one claim: **a bassline that works in the drop should not be rewritten for the rest of the track, only edited.** The rhythm is what people dance to, so every section keeps the rhythm and changes one other thing.

## The 34 lanes

### Right now

| House | BPM | Techno | BPM |
|---|---|---|---|
| Rubber roller (tech house) | 128 | Peak-time rumble | 136 |
| Mainstage menace (tech house / mainstage) | 127 | Hypnotic loop | 138 |
| Deep tech bounce (minimal / deep tech) | 130 | Hard groove funk | 142 |
| Speed garage warp (bass house / UKG) | 134 | Hard techno slam | 152 |
| Afro house heartbeat | 122 | Trance-techno roller | 146 |
| Melodic house pulse | 124 | Bounce donk (hard bounce) | 150 |
| Organ house | 126 | Acid line | 140 |
| Jackin octaves (funky / jackin house) | 125 | Melodic techno giant | 126 |

Also current: **Latin tech tumbao** (126), **Log drum** (amapiano crossover, 113) and **Industrial drive** (schranz revival, 150).

### Classics and revivals

| House | Years | BPM | Techno | Years | BPM |
|---|---|---|---|---|---|
| Slap house bounce | 2019–22 | 124 | EBM body bass | 1988 → revival | 124 |
| Future house knock | 2014–17 | 126 | Detroit stab bass | 1988 → always | 130 |
| Electro house saw | 2006–10 | 128 | Dub techno depth | 1993 → always | 124 |
| Progressive roller | 2001 → revival | 124 | Minimal click | 2004–08 | 127 |
| French filter loop | 1997–2002 | 123 | Rave hoover | 1991 → revival | 145 |
| 2-step sub | 1999 → revival | 132 | Electro 808 | 1982 → revival | 132 |
| Deep house sub | 1986 → always | 120 | Bleep and bass | 1990 → revival | 134 |
| Italo sixteenths | 1977 → always | 118 | | | |

Filter the grid by family (house, techno) or by era (right now, classics and revivals). **Surprise me** picks a lane and an idea at random. The years are rough markers for when each idea was everywhere, not a discography. 2-step and Electro 808 play over a broken kick instead of four-on-the-floor.

Each lane has three written ideas, a one-line statement of the idea, three reasons it moves a floor, a four-step sound recipe for your own synth, and a few artists whose records sit in that lane. The artist names are a pointer to what to listen to; no pattern here is transcribed from a record.

### The loop

An idea is two bars of 16ths, written as 32 tokens: `.` rest, `-` hold, a number for semitones above the root, and the flags `!` accent, `~` slide into this note, `w` wow, `'` short. The page shows the tokens for the idea you are hearing.

Every loop obeys a grammar that the tests check: notes never overlap, a slide needs a touching note to slide from, the loop stays between a fifth below the root and an octave and a fifth above it, and in the eighteen **kick-free** lanes no note starts on a kick. The other sixteen land on the kick on purpose (afro, organ, deep house, Italo, acid, EBM and others), and the page counts the notes that do.

**New idea** writes a loop in the lane's own grammar: it measures where the three written ideas put their notes (per 16th position), their note lengths and their note pool, generates bar one from those odds, then repeats it as bar two with a new last beat. It is seeded, so idea #7 is always the same loop.

## Six versions, one idea

| Section | Bars | What happens to the loop |
|---|---|---|
| Intro | 8 | The rhythm skeleton (accents and long notes, a little under half the loop) on the root only. Filter mostly closed. No sub until bar 5, so the outgoing track keeps the low end. |
| Drop 1 | 16 | The loop as written, following the lane's chord roots if it has them. Bar 4 lifts its last beat an octave; bar 8 gets the lane's fill. Played twice. |
| Break | 8 | No kick. One of three treatments: the top layer alone with no sub (*tease*), four long notes on the chord roots (*pad*), or one held root with the filter breathing (*drone*). The last beat is silent. |
| Build | 8 | The full rhythm on one note for four bars, the real loop for two, every 16th for one, then a climb (root, ♭3, 5, octave) with no sub and no kick, and two beats of silence. The filter opens the whole way. |
| Drop 2 | 16 | The same rhythm, developed: the last note answers differently on each pass, the end of every second pass jumps an octave, ghost 16ths lead into long and accented notes, every long note opens up, and there are two different fills. Filter 20% more open, more drive, a ride. Played twice. |
| Outro | 8 | The rhythm on one note, then the skeleton. Filter closes, sub out for the last two bars, kick to the end. |

Together that is a 64-bar sketch of a track. Real arrangements are longer; double the sections in your DAW.

The fills are: a gap, octave pops, a four-note run, a stutter, and a slide from the octave to the root. Hypnotic loop has none on purpose, and drifts its filter over eight bars instead.

## Options

Every lane starts with its own settings, and all of them can be changed:

- **Sound**: any lane can play through any of the 34 voices (the acid 303 on the afro pattern, the hoover on tech house). The recipe on the page still describes the lane's original sound, and says so.
- **Chords**: the lane's own movement, stay on the root, or one of five two- and four-chord movements. The loop is transposed to each root for two bars.
- **Break**: tease, pad or drone, as in the table above.
- **Fill**: gap, octave pops, run, stutter, slide, or none.
- **Swing, Length, Pump, Space**: how late the off 16ths land, note length, sidechain depth relative to the lane's own, and the amount of stereo spread and echo.

The tests run every lane through every combination of chords, break and fill and check the result against the same rules.

## The preview synth

One mono voice per lane: up to three oscillators, optional two-operator FM (organ click, donk), optional pitch envelope (the mainstage "bwomp", the hard groove tom), drive, a 24 dB low-pass with its own envelope, a clean sine sub, and a sidechain that ducks under every kick. Peak-time rumble adds the kick's own reverb tail, low-passed at 105 Hz and ducked. Some voices add **space**: a short stereo spread and a dotted-8th echo, both fed only from above 300 Hz, so the low end stays mono and dry. With Space at zero the output is mono.

**The wow.** A note flagged `w` opens and closes the filter across its length and raises the resonance. In the five voices with a formant filter (rubber roller, mainstage menace, speed garage warp, melodic techno giant, rave hoover), three band-pass filters also move through vowel positions, so the note says *wow*, *ow*, *weow*, *waow* or *whoa*. Speed garage warp adds a filter wobble on 8ths under every long note. The **Wow** knob scales all of it.

Slides are real glides: the voice is legato, so a slid note bends from the previous pitch without retriggering the envelope.

This is a browser synth for judging notes, rhythm and movement. It is not a finished patch. The recipe on the page tells you what to build in Serum, Wavetable, Operator or whatever you use.

## Exports

- **MIDI, this section** (8 bars) or **the whole track** (64 bars). Format 1: a conductor with tempo and a marker at each section, the bass, and optionally the drums on channel 10 (GM notes). CC74 carries the section's filter setting bar by bar; CC1 rises and falls across each wow note. A slide is written as a note that overlaps the one before it, so use a mono, legato patch with glide. Ghost notes are low velocity, accents high.
- **WAV**, 16-bit stereo at 44.1 kHz, cut exactly on the bar line so a section loops. Untick *Include drums* for the bass alone (the sidechain pump stays in).
- MIDI is on a straight grid. The preview swings the 16ths in the lanes that need it; the page tells you by how much when you export.

Settings are remembered in this browser.

## What is checked, and what is not

`node wow-src/test.mjs` checks the engine with no browser: all 102 written ideas and 300 generated ideas per lane against the grammar; that no two written ideas are the same; every combination of the options; every section of every idea for overlaps, register and slides; that kick-free lanes never start a note on a kick that is actually playing; that each section does what the table above says (root-only intro, silent beats, the climb, sub and kick in and out); that the energy readout puts drop 2 at or above drop 1, and drop 1 above the intro, the break and the outro; and that the MIDI files are well formed with every note-on closed.

`node wow-src/browser-check.mjs` drives the page in Chromium: playback, switching lanes and sections while playing, the whole-track mode, exports, a reload and a phone-width layout. It renders the drop and the break of all 34 lanes offline and checks each is finite, audible and below full scale. It also checks that turning Wow up makes a talking lane measurably brighter, that the Sub knob adds level, that a swapped voice is playing within a beat, and that Space adds stereo width and is mono at zero.

Those are checks of rules and signal integrity. The readouts on the page (notes per bar, notes on a kick, how much of the time the bass sounds, gestures, the root in Hz) count things. **None of this measures whether a bassline is good, and nothing here can promise a chart position.** The lanes, the tempos and the reasons given are a producer's reading of current club music, not a statistical study of the charts. Trust your ears and a loud system.

### Limits

- No native Serum, Ableton or other presets are exported. The recipes are steps to follow.
- A borrowed voice keeps its own level and settings, so some combinations are louder or duller than others. Use Tone and Drive.
- Idea names are descriptions. No pattern is a transcription of a record.
- The preview has a compressor and a soft limiter so it is safe to listen to. It is not a master.
- The energy bar is a heuristic (note density, filter, sub, kick), there to show the shape of the track.
- Laptop speakers reproduce very little below 100 Hz. Use headphones or monitors.

## Source

`wow-src/`: `engine.js` (lanes, notation, generator, sections, drums, MIDI, WAV), `audio.js` (voice, drums, player, offline render), `app.js`, `style.css`, `template.html`. Build with `node wow-src/build.mjs`.
