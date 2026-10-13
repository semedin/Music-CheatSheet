# Pocket — a foundation for your riff

Pocket keeps the riff as the main musical idea. Open `pocket.html` and try an actual Orbit pattern, or choose **Open in Pocket** in Orbit. Everything runs locally in one standalone HTML file.

## Start with the complete source

- **Orbit handoff or share link:** preserves the rendered notes, patch, effects, event modulation, original timing and source chord path. Links carry the state in their URL fragment, with no upload or shared-storage dependency. Up to 16 bars and 2,048 notes are accepted. The synth and effects are Orbit’s own engine; Pocket adds its foundation and final mix bus. The resulting mix is not sample-identical to Orbit’s output.
- **MIDI:** select the melodic track from a clip. Leading/trailing silence, notes and velocities are preserved. A separate Chords/Harmony track is used when present. Otherwise a harmonic proposal is derived from accented/sustained notes over whole bars, with a cost for unnecessary chord changes. This is a suggested accompaniment, not a unique solution to the melody.
- MIDI has no patch information. A recognised Orbit pattern filename suggests its bank voice and genre, but cannot recover custom patch/effect edits. Choose a voice explicitly or use the Orbit link for the actual source sound.
- **My chord path:** overrides source harmony with roman numerals or symbols. One slot is one bar; `:2` lasts two bars. Changing the key or harmony never transposes the original riff.

Four demos use actual Orbit patterns: Euphoric hard arp, Organ bounce, Two-bar walk and Rubber minimal. The first is the explicit regression case for a dense 150 BPM neo-rave arp.

## Foundations, rather than an extra tune

The automatic foundation distinguishes dense/fast arps from sparse riffs. Override it with **Rave / dense arp** or **House / sparse riff**.

For sparse riffs, eight relationships derive their bass motifs from source accents, actual rests, phrase endings and melodic contour: anchors, a low shadow, replies, interlocking rests, a sparse floor, accent echoes, contrary motion and pickups. The written motif repeats rather than randomly rewriting each bar. Secondary dynamics vary with the seed.

Dense/rave arps use simpler root-led support: offbeat roots, locked pulses, late notes, quiet rolling pulses, a sustained floor, octave rebounds, restrained pulses and bar-end pickups. They follow the current chord while leaving the main melody to the arp. Extra answers are suppressed in this mode. This is a deliberate genre grammar, not a universal rule for fast music.

The sub and character play the same pitch classes and articulation, one octave apart. Character voices are high-passed to leave the fundamental to the sub. Kick/sub tails are shorter than the first implementation; ducking also follows Orbit’s source settings for the lead. Supporting voices stay dry instead of adding another unrelated delay rhythm.

Riff answers are off by default. For sparse riffs, turning up Conversation can add a quiet, single-note fragment drawn from the source in a real pause. Density controls supporting activity; swing warps generated grid events while source attacks keep their exact timing. Bass timing is in milliseconds. Note length and kick duck are separate controls.

## Work and export

Use 4, 8 or 16 bars. A 16-bar phrase repeats the relationship, reduces secondary bass/hats in bars 9–12, then returns. The source hook is never rewritten. Hooks longer than the selected phrase are truncated at the export boundary.

The two-bar step editor cycles root → fifth → octave → rest. Locked cells survive generation and phrase thinning. Reset edits and Undo are available. Part buttons mute independently; Riff alone is a temporary audition mode. Space starts/stops, Escape stops, and Ctrl/Cmd+Z undoes outside text fields. Playback stops when the page is hidden. Selecting/changing a foundation restarts at the phrase beginning.

Save up to 24 browser ideas or download a validated JSON session. Existing version-1 sessions remain readable, although the new composition engine regenerates their accompaniment.

Phrase MIDI contains a conductor with tempo/markers and separate riff, kick, sub, character, answer and hat tracks. Drum tracks use GM channel 10. Mutes affect phrase MIDI and mix WAV; character-only MIDI exports that part. Effects and ducking must be rebuilt in the DAW for MIDI playback.

WAV is stereo 44.1 kHz / signed 16-bit PCM with two seconds of tail. Stems ZIP includes nonempty active parts, MIDI, session JSON and a README. Ducking is baked into sub/character stems when the kick is active. Each stem uses the preview bus independently, so summing stems is not identical to the compressed mix. Leave headroom.

## What is measured

Readouts describe note count, kick attacks within 0.1 beats, bass spans overlapping riff spans, and answer onsets. They do not measure taste, audio masking, phase cancellation or chart potential. Some overlap is desirable. Browser rendering verifies signal integrity; musical judgement still requires listening.

MIDI tempo maps and non-4/4 meters are not followed. Native Serum/Live presets are not exported. The preview recipes are starting points. Only the original source state can preserve a custom Orbit sound; MIDI alone cannot.

## Build and verification

```
node pocket-src/build.mjs
node arp-src/build.mjs
node site/build.mjs
node pocket-src/test.mjs
node arp-src/test.mjs
node site/check.mjs
node pocket-src/browser-check.mjs
```

Pocket embeds Orbit’s theory, bank, composition and synthesis helpers plus its own engine/UI. Chromium checks use a temporary local HTTP server because this managed browser blocks file URLs. Artifacts are written under `/tmp/pocket-qa` by default.

Validation: 20 engine groups, 40 browser checks, 41 Orbit regression checks, and the site link check passed. The exact Euphoric hard arp was tested through both the direct handoff and melody-only MIDI import: 150 BPM, supersaw, and F♯m → D → A → E harmony. All eight foundations rendered finite, non-silent, unclipped mixes. These checks do not establish subjective sound quality or a manual Ableton audition.
