# Fieldwork — Music CheatSheet

Offline tools for writing electronic music (house, techno, trance, garage) in Ableton Live:
MIDI-writing studios, playable sound and drum labs, and field guides that measure what they
argue. Every page is **one self-contained `.html` file** with its own styles, data and Web Audio
synthesis. There is no server, account, install or package manager.

## Quick start

1. Keep every file in **one folder**. Pages link to each other by file name.
2. Open **[`index.html`](index.html)**, the home page. It lists every page, the notes and the MIDI packs, with search (<kbd>/</kbd>).
3. Every page has the same top bar: **Home · Motif Studio · V2 Studio · Trance · Drums · Rumble · Sound design · Field guides**.

Use headphones or monitors: several labs work below 150 Hz, where laptop speakers are silent.

## What's here

### Write ideas (MIDI studios)

| Page | What it is | Notes | Built from |
|---|---|---|---|
| [`fieldwork-v3.html`](fieldwork-v3.html) | **Motif Studio (V3, latest).** Write a two-bar motif, then grow it into an 8- or 16-bar phrase. 69 styles, 120 artist perspectives, 59 preview voices, 19 drum kits; MIDI and WAV export. | [VERSION-3.md](VERSION-3.md) | `v3-src/` |
| [`trance.html`](trance.html) | **Trance, beyond the ordinary.** All 12 supplied melodies plus 16 studies across eight trance styles, six treatments each (168 sketches) with chords, bass and drums; 24 artist perspectives, 16 sound recipes, arrangement maps, MIDI and ZIP export. | [TRANCE.md](TRANCE.md) | `trance-src/` |
| [`studio-v2.html`](studio-v2.html) | **V2 Studio.** 1,760 recipes across 24 genres and 32 artist profiles; five coordinated parts, 48 instruments, 16 drum kits. | [VERSION-2.md](VERSION-2.md), [ARTIST-STUDIES.md](ARTIST-STUDIES.md) | `v2-src/` |
| [`melody-v2.html`](melody-v2.html) · [`chords-v2.html`](chords-v2.html) · [`bass-v2.html`](bass-v2.html) | The V2 melody, harmony and bass workbenches. | [VERSION-2.md](VERSION-2.md) | `v2-src/` |

### Drums & low end

| Page | What it is | Notes | Built from |
|---|---|---|---|
| [`drum-library.html`](drum-library.html) | **The Kit, drum studio.** 48 style studies, 192 pattern takes, nine synthesized kits, morph lab, Splice search guidance, MIDI export. | [DRUM-STUDIO.md](DRUM-STUDIO.md) | `drum-library-src/` |
| [`rumble.html`](rumble.html) | **Rumble lab.** 24 sound studies, 10 motion modes, editable sub pattern, one-track Ableton racks, WAV stems. | [RUMBLE.md](RUMBLE.md) | hand-edited |
| [`low-end.html`](low-end.html) | Low End: kick and bass as one instrument. | [V1 guides](FIELD-GUIDES-V1.md) | hand-edited |
| [`groove-cheatsheet.html`](groove-cheatsheet.html) · [`groove-vol2.html`](groove-vol2.html) | Groove (placement, length, velocity) and the Pattern Bank. | [V1 guides](FIELD-GUIDES-V1.md) | hand-edited |

### Sound design

| Page | What it is | Notes | Built from |
|---|---|---|---|
| [`serum-v2.html`](serum-v2.html) | **Sound Design V2 for Serum 2.** 48 recipes, step-by-step builds, eight techno rumble studies, glossary, eight-week course. | [SOUND-DESIGN-V2.md](SOUND-DESIGN-V2.md), [handbook](Serum-2-Sound-Design-Handbook.md) | `sound-design-src/` |
| [`serum.html`](serum.html) | The original Serum 2 guide (the "90% path"). | [V1 guides](FIELD-GUIDES-V1.md) | hand-edited |
| [`patch-lab.html`](patch-lab.html) · [`sampling.html`](sampling.html) | Patch (synth from scratch) and The Cut (sampling and warping). | [V1 guides](FIELD-GUIDES-V1.md) | hand-edited |

### Field guides (V1)

Melody, harmony and playing: [`melody.html`](melody.html), [`chords.html`](chords.html),
[`between.html`](between.html), [`inkey.html`](inkey.html), [`keyboard.html`](keyboard.html).
Arrange and finish: [`arrangement.html`](arrangement.html), [`buildorder.html`](buildorder.html),
[`the-move.html`](the-move.html), [`disco-house-cheatsheet.html`](disco-house-cheatsheet.html).
The original V1 index, with its "I have a problem" table and reading paths, is
[`field-guides-v1.html`](field-guides-v1.html). Every guide is described in
**[FIELD-GUIDES-V1.md](FIELD-GUIDES-V1.md)**.

### MIDI packs

| File | Contents |
|---|---|
| [`Fieldwork-V3-1104-Style-Studies.zip`](Fieldwork-V3-1104-Style-Studies.zip) | 1,104 MIDI files: 552 original ideas, each as melody + full sketch |
| [`Fieldwork-V3-960-Artist-Studies.zip`](Fieldwork-V3-960-Artist-Studies.zip) | 960 MIDI files: 480 artist-perspective ideas, melody + full sketch |
| [`Fieldwork-Trance-168-Sketches.zip`](Fieldwork-Trance-168-Sketches.zip) | 168 four-part trance sketches |
| [`Fieldwork-V2-504-MIDI-Library.zip`](Fieldwork-V2-504-MIDI-Library.zip) | 480 genre clips + 24 five-part sketches |
| [`Fieldwork-V2-Artist-Studies-1312-MIDI.zip`](Fieldwork-V2-Artist-Studies-1312-MIDI.zip) | 1,280 clips + 32 five-part sketches |

## How the folder fits together

```
index.html              ← home page, generated from site/catalog.mjs
site/catalog.mjs        ← the list of every page, note and MIDI pack, plus the top-bar items
site/build.mjs          ← writes index.html and the shared top bar into every page and template
site/check.mjs          ← link check: fails on broken links or pages missing from the home page
site/hub.css            ← styles for index.html

*-src/                  ← sources for the generated pages (see table below)
material/               ← source MIDI for trance.html
*.md                    ← release notes and handbooks
```

**The home page and top bar come from one list.** `site/catalog.mjs` is the only place that
says which pages exist and how they're grouped. `node site/build.mjs` turns it into
`index.html` and writes the same top bar (between `<!-- site-nav:start -->` and
`<!-- site-nav:end -->`) into every root page and every build template. The bar highlights
the current page by itself, so the block is identical everywhere. Top-bar items whose file
isn't in the folder are left out, and home-page cards for missing files show as "not in this
folder yet".

**Some pages are generated. Edit their source, not the HTML:**

| Page(s) | Source | Build |
|---|---|---|
| `studio-v2.html`, `melody-v2.html`, `chords-v2.html`, `bass-v2.html` | `v2-src/` | `node v2-src/build.mjs` (`--pack` also rebuilds the V2 zips) |
| `fieldwork-v3.html` | `v3-src/` | `node v3-src/build.mjs` (`--pack` also rebuilds the V3 zips) |
| `serum-v2.html` | `sound-design-src/` | `node sound-design-src/build.mjs` |
| `drum-library.html` | `drum-library-src/` | `node drum-library-src/build.mjs` |
| `trance.html` | `trance-src/` + `material/` | `node trance-src/build.mjs` (`node trance-src/pack.mjs` rebuilds the zip) |
| `index.html` + top bar everywhere | `site/` | `node site/build.mjs` |

Every other `.html` file is edited directly.

## Adding or changing a page

1. Add the `.html` file to the root folder (or its source folder plus a build script that writes it there).
2. Add an entry to a section in `site/catalog.mjs`. Add it to `NAV` as well if it needs a top-bar slot, and add its notes file to `DOCS`.
3. Run `node site/build.mjs`, then `node site/check.mjs`.

After any other page build, run `node site/build.mjs` again. The templates already carry the
top bar, so it's usually a no-op, but it also picks up a page that has just appeared.

## Checks and tests

All of these run with plain Node (no install):

```
node site/check.mjs              # links, top bar, every page on the home page
node v2-src/test.mjs             # V2 studios
node v3-src/test.mjs             # V3 Motif Studio engine
node drum-library-src/test.mjs   # drum studio
node rumble-tests.mjs            # rumble lab
node trance-src/test.mjs         # trance room
```

`v3-src/browser-check.mjs`, `drum-library-src/browser-check.mjs`,
`sound-design-src/check.mjs` and `trance-src/check.mjs` drive a real browser and write reports into each `qa/` folder.

## Conventions

- **Offline and standalone.** Every page carries its own CSS, JavaScript and synthesis engine.
  There are no audio files: every sound is synthesized at runtime with the Web Audio API.
  Some pages request Google Fonts and fall back to system fonts when offline; Splice search
  links need a connection.
- **MIDI export** is written byte by byte in JavaScript and downloaded as a `Blob`, so it
  works from `file://`.
- **Saving.** The V2 Studio, drum studio, Rumble, Sound Design V2 and Trance keep sessions, notes or
  favourites in `localStorage`, and several studios export/import session files. The V1
  guides keep everything in memory only.
- **Browsers.** Everything works in current Chrome, Edge, Firefox and Safari. Audio starts
  after the first click or <kbd>space</kbd>. Web MIDI input (`keyboard.html`) needs Chrome or Edge.

## Release history

- **Trance**: a standalone trance writing room and a 168-sketch MIDI pack. See [TRANCE.md](TRANCE.md).
- **V3, Motif Studio**: motif-first phrase writing, 69 styles, 120 artist perspectives and two new MIDI packs. See [VERSION-3.md](VERSION-3.md).
- **Sound Design V2, drum studio, Rumble**: standalone labs with their own notes ([SOUND-DESIGN-V2.md](SOUND-DESIGN-V2.md), [DRUM-STUDIO.md](DRUM-STUDIO.md), [RUMBLE.md](RUMBLE.md)).
- **V2.1, Artist Studies**: 1,280 artist-inspired recipes, 48 instruments and 16 drum kits. See [ARTIST-STUDIES.md](ARTIST-STUDIES.md).
- **V2, the workbenches**: 480 recipes across 24 genres in four studios. See [VERSION-2.md](VERSION-2.md).
- **V1, field guides**: sixteen single-file reference guides with built-in labs. See [FIELD-GUIDES-V1.md](FIELD-GUIDES-V1.md).
