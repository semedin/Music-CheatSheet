# The Kit — drum studio

Open **[drum-library.html](drum-library.html)** directly in a browser. It is a standalone, offline-capable page with no fonts, audio files, scripts or other runtime dependencies to download. Splice links require an internet connection.

The expanded studio includes:

- **48 original style studies** across seven families: House (15), Techno (11), Garage (5), Breaks (7), Afro / Latin (6), Trance (2), Hip-hop (2).
- **Four takes per study, 192 combinations:** Foundation, Stripped, Displaced and Turnaround. The latter three are deterministic edits of each foundation, not separate transcriptions of records. Some styles share a stripped rhythm; tempo, swing and kit distinguish their settings.
- **12 drum lanes**, a two-bar sixteenth-note grid, 65–190 BPM, per-lane swing, mute, solo and level, plus preview-only human timing.
- **Nine synthesized kit characters:** 909, 808, 707, Warm, Dust, Punch, Click, Grit and Break. These illustrate rhythms and broad timbres; they are not sampled hardware kits.
- Per-part **Splice search phrases**, direct search links, copy-one/copy-all controls and sound-selection advice. Queries follow the study's suggested palette, including newly activated lanes. Changing the browser kit does not change that recommendation. No commercial samples are included or downloaded automatically.
- Search, combined family/favourite filters, tempo/name/density sorting, and progressive loading of all 48 cards.
- Undo/redo, texture variations, fills, bar copy, lane rotation and Euclidean rhythms.
- Explicit local saving, portable JSON sessions and MIDI export.
- A morph lab that changes the workbench only when **Send to playground** is pressed.

## Workflow

Choose **Open in playground** to edit a study or **Preview** to load and play it. Playback continues through subsequent loads if it was already running. Each load is undoable. Preview and Open both replace the current working pattern; Undo restores previous edits.

Click a cell to cycle **hit → accent → ghost → off**. Drag to paint the selected value. Focus a grid cell and use arrow keys to navigate; Enter or Space edits it. Space outside a control toggles transport, `/` focuses library search, and Ctrl/Cmd+Z outside a form control undoes an edit. Use the visible Undo/Redo buttons while focusing a control.

The two ruler prefixes **A** and **B** indicate bars 1 and 2. On small screens, scroll the grid sideways; lane labels remain visible. **More tools** reveals lane selection, Euclidean fill, rotation and level.

**Save session** replaces this page's one saved browser slot. **Restore saved** is undoable. Favourites save separately. Browser storage can be unavailable or behave differently for local files, so **Session file** is the portable backup. Opened files are size-limited and validated before replacing state. Audio never starts on initial page load or on restoring a stopped session.

## Export and sound-finding details

MIDI is a two-bar 4/4 Type-0 file, 480 PPQ, drum channel 10, with tempo and time-signature metadata. It uses the standard General MIDI percussion pitches. Swing, cell velocity, mute, solo and lane levels affect export. Mute takes precedence over solo; a zero-level lane exports no notes. Master volume, randomized human timing and synthesized kit timbre are not MIDI events. Import onto a suitable drum rack and assign your chosen sounds.

Search phrases are starting points, not verified sample recommendations. Use Splice's One-Shots filter, try fewer terms if a query is too narrow, and audition a sample against the whole loop. Copy controls fall back to a selectable text dialog when clipboard access is unavailable. The UI links to [Splice's own searching and filtering guide](https://support.splice.com/en/articles/8652594-finding-sounds).

Patterns describe particular examples, not universal genre definitions. Amapiano uses the tom lane as a log-drum rhythm placeholder; use a tuned log-drum instrument in your DAW. Jungle and trap sketches are restricted to the sixteenth grid; finer subdivisions and sample articulation belong in the DAW.

## Authoring and checks

`drum-library-src/` contains the template, styles, synthesis/catalog source, expanded catalog and application code. Rebuild the distributable HTML after editing sources:

```text
node drum-library-src/build.mjs
node drum-library-src/test.mjs
node drum-library-src/browser-check.mjs
```

The browser check uses installed Windows Chrome in headless mode with an isolated temporary profile. It may require permission to run outside the execution sandbox. No running personal browser session is used.

Validation completed:

- Nine dependency-free test groups, including all 192 MIDI exports and all 2,304 ordered morph pairs.
- Session round-trips and malformed-input rejection, Euclidean hit counts, search/sorting and variation independence.
- 19 browser checks covering playback, editing, undo/redo, saves, favourites, filters, morph, active cell colours and overflow at 320, 390, 768, 1024 and 1440 pixels.
- All nine kits rendered through OfflineAudioContext with finite, non-silent output and peaks below full scale in the test configuration.
- Desktop, library, playground and mobile screenshots visually inspected; saved in `drum-library-src/qa/` with the browser result log.

Audio checks validate engine output, not subjective mix quality. Manual DAW import, external Splice result relevance, and browsers other than Chromium were not tested.
