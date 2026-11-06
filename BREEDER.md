# Breeder: grow a groove

[`breeder.html`](breeder.html) is for writing by ear instead of by hand. It shows eight grooves, each a whole loop:
**drums, bassline, riff and chords**. You listen, **star** the ones that move you and press **Breed**. Their
children take the kick from one parent and the hats from the other, and the riff's rhythm from one and its notes from
the other. Then they mutate inside the genre's grammar. Every child is measured against the genre and says exactly
how it was made. A few generations later you have a groove nobody wrote: interactive evolution, with your ears as the
fitness function and the genre as the guard rail.

It stands on [Orbit](ORBIT.md): its 14 genres, their drum grooves and basslines, 333 patterns, the generator, Orbit's
own variations and the genre fingerprint. The preview is [Transplant](TRANSPLANT.md)'s audio engine. Like every Fieldwork
page it is one self-contained file that works offline.

The page is generated: edit `breeder-src/`, then run `node breeder-src/build.mjs`.

## 01 Start a family

- **Pick a genre.** The first eight grooves come from Orbit's patterns for that genre and from its generator,
  each on the genre's own drum groove and bassline with a small twist. Each slot tries up to six candidates and keeps
  the first that sits in the genre's fingerprint, so a family starts in its genre (across 672 seeded grooves the lowest
  fit is 87).
- **Or breed from your own loop.** Drop its MIDI: several files, or one with several tracks; Drum Rack clips are
  split by pad, as in Transplant. Your drums land on their lanes on the 16th grid, your bassline becomes degrees of the
  key (root, fifth, octave, third, seventh), and your lead becomes an Orbit riff that plays your rhythm and your notes.
  Your loop is the first parent, with seven children of it.

## 02 Breed

**The genes.** A groove is ten gene groups:

| Group | What it holds |
|---|---|
| Kick, Clap, Hats, Percussion | Two-bar lines of 16ths (accent, normal, ghost): kick; clap; closed and open hats; shaker, rim, conga, cowbell |
| Bassline | Per 16th: rest, tie, or the root, fifth, octave, third or seventh of the chord playing |
| Riff rhythm | Orbit's rate, step pattern and gate |
| Riff notes | Orbit's pool, order and written sequence, octaves and register. These are positions in a pool, so they fit any harmony |
| Sounds | The riff's patch (Orbit's 37), the bass (rolling, house, sub, Reese, acid), the chords |
| Key and chords | Key, scale, progression, and chords as a held pad, off-beat stabs or none |
| Tempo and swing | BPM and swing |

**Crossover.** With two or more stars, every child takes each group from one parent or the other, and sometimes bar 1
from one and bar 2 from the other. Its log lists where each group came from.

**Mutation, inside the grammar.**

- Hats move a 16th, gain or lose ghosts, get a roll into the next bar, or swap their open-hat placement.
- Percussion is rewritten as a Euclidean rhythm or borrowed from another genre's groove.
- The kick only gains or loses ghost kicks and pickups: the genre's kick anchors always play.
- The bass gains or loses notes (never on the kick where the genre's bass avoids it), changes degree, moves a 16th,
  holds longer or shorter, or borrows another bassline.
- The riff changes through Orbit's own variations (rotated, new order, accents moved, thinned, filled, new pool,
  polymeter, a written riff, ratchets, half time; with Wild, echo cascades, Turing drift and feels), or one note moves a
  scale step, or the gate or register moves.
- Sounds, chords, key, swing and tempo change within the genre's ranges.

**Selection.** For every slot Breeder draws six candidates (a crossover of two stars, or a copy of one, then mutated)
and keeps the one with the best mix of **genre fit** and **difference from the siblings already chosen**. So a
generation is good and varied, never eight near-copies. With one parent the strength rises slot by slot, so the eight
run from "a little different" to "far out". Children are always listed nearest-first.

**Your controls.**

- **Mutation**: Gentle, Bold or Wild (more moves, and Orbit's wild tools).
- **Drift**: how much genre fit counts. Past halfway a child can **migrate**: it takes another genre's kick, tempo and
  swing (sometimes its hats) and from then on mutates in that genre's grammar. Held in the genre, ten generations
  stayed there in the tests (0 of 80 children read as another genre); fully free, 27 of 80 walked out.
- **Keep from the first star**: lock any gene group to the first starred groove, so only the rest evolves.
- **Keep the parents** in the next generation, **Fresh blood** (new grooves next to the ones you starred), and back and
  forward through the generations.

## 03 Every groove, measured

- **Genre fit** (0–100): half Orbit's fingerprint of the riff against the genre (notes a bar, syncopation, notes on
  the kick, range, leap, note length, swing; each axis is shown against the genre's range), a third the drums (the
  genre's kick anchors, its backbeat, how busy the hats are), a fifth the bass (how often it hits the kick against the
  genre's own bassline, and its density), less a penalty when the riff sinks into the bass register.
- **Reads as**: the riff's fingerprint, the drums and the tempo compared with all 14 genres. The top three are shown,
  and the family tree is coloured by the first.
- **New against its parent**: how different it sounds from its first parent (0–100%), from what plays where, which
  notes, the key and the sounds.
- **How it was made**: the origin, which parent each group came from, and every mutation in words.

These numbers measure grammar and difference, not whether it's a hit. That's what your stars are for.

## 04–05 The family tree and keepers

Every groove you've bred, generation by generation, with lines to its parents, coloured by the genre it reads as.
Starred parents are ringed, and a parent kept into the next generation is joined by a dashed line. Click any groove to
hear it again. Heart a groove to keep it; star a keeper to bring it back as a parent. The family and the keepers are
kept in this browser, and the whole family saves to a `.json` file and opens again.

## Hear it, take it out

- Click a groove to hear it. While playing, the next one starts on the **next bar line**, even at another tempo (the
  clock is re-anchored on the bar), so you compare grooves without a gap. Mute any part of the groove you're hearing.
- **MIDI loop**: four bars, drums on channel 10 (GM pads: kick 36, clap 39, closed hat 42, open hat 46, shaker 70,
  rim 37, conga 64, cowbell 56), bass, riff and chords.
- **Lineage as MIDI**: the groove's family line, oldest first, 8 bars each, with a marker per generation: the evolution
  as an arrangement.
- **WAV loop**: four bars at 44.1 kHz with the tail folded over the start, so it loops seamlessly.
- **Transplant it into a track →**: the groove goes to [Transplant](transplant.html) as your loop (through the browser's
  storage on this site), in the arrangement you had there last time.

## Limits

- Drums and bass are two-bar lines on a 16th grid; the riff can run to Orbit's four bars. Triplet and 32nd drum detail
  belong in Live.
- "Reads as" compares with Orbit's 14 genres. Acid and techno share a groove, so an acid line can read as techno.
- The preview plays Orbit's synths and a synthesized kit. Your own instruments in Live are the real thing.
- The hand-off to Transplant needs the two pages on the same site (GitHub Pages or localhost). Opened as files, some
  browsers keep them apart; download the MIDI loop and drop it into Transplant.

## Build and verification

```
node breeder-src/build.mjs          # writes breeder.html (Orbit's theory, patches, bank and engine, Transplant's loop reader and audio, Breeder)
node site/build.mjs
node breeder-src/test.mjs           # 13 engine groups
node site/check.mjs
node breeder-src/browser-check.mjs  # Playwright: 20 checks, artifacts in /tmp/breeder-qa
```

`test.mjs` checks the following:

- Every genre seeds eight valid, different grooves that fit it (at least 80) and read as it.
- 2,800 random mutations across all 14 genres never drop a kick anchor, never put the bass on the kick where the genre
  avoids it, and never leave an invalid groove; every logged mutation changed something.
- In 200 crossovers every gene group comes from a real parent.
- Locks hold through wild breeding.
- A generation has eight members, the parents first when kept, no copies, children nearest-first and every one
  measured.
- Distance is zero to itself, symmetric and grows with wilder mutation.
- Drift holds a family in its genre or lets it walk out, as described above.
- Rendering keeps every note in the loop and every drum on its pad.
- The MIDI loop and a lineage read back note for note, and the Transplant hand-off revives as a loop.
- A MIDI loop becomes a groove that plays your rhythm and your notes.
- A generation from three parents takes about 55 ms.

The browser check plays the page and swaps grooves on the bar while playing, across a tempo change. It breeds,
checks locks in the page, renders grooves from four genres offline (finite, audible, unclipped), downloads every export,
breeds from a MIDI file, survives a reload, hands a groove to Transplant and finds it arranged there, and checks the
phone layout. How it sounds, and whether the tenth generation is a hit, still needs your ears.
