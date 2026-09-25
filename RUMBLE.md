# Rumble / Expanded edition

Open [rumble.html](rumble.html) directly in a browser. The guide, audio engine, session files and WAV exports are self-contained. Fonts optionally load from Google; system fonts work offline.

- 24 sound studies, including the original nine, with searchable families and synthesis settings.
- 10 motion modes: reverb tail, rolling, offbeat sub, grind, gated room, rising swell, triplet replies, broken pulse, FM pressure and an editable pattern.
- A 16-step sub pattern with three velocity states, swing, note length and pitch interval. Select Pattern mode to hear the editor. Other modes have their own motion; the kick stays four-on-the-floor.
- A/B snapshots, variations that keep the kick/tempo/key, portable JSON sessions and Markdown build notes. A/B memory is temporary and not included in session files. Session files do not save output volume or solo state.
- Four complete Ableton one-track approaches: a parallel Audio Effect Rack, a layered Instrument Rack, an instrument nested on a Drum Rack pad, and an internal Drum Rack return. Includes tuning, internal sidechain routing and eight macro suggestions.
- Eight original DAW experiments plus six rotating creative constraints. Linked browser sounds are starting moods, not reproductions of those effects.
- The existing tuning, timing, Ableton, Serum, sample selection, troubleshooting and arrangement material remains, with corrections to overly rigid tuning advice and MIDI-track sidechain instructions.

## Exports

WAV files contain four bars at 44.1 kHz, stereo 16-bit PCM. Rendering warms the reverb up for multiple complete bars, using a frozen copy of the current sound. One shared attenuation factor protects the mix and both stems. With unchanged settings, the stems sum to the mix within integer rounding. A cache reuses the most recent render when downloading another stem. Check the join in your DAW and use small fades if needed.

The browser uses a synthetic kick, generated convolution reverb, filtered waveshaping, sine/FM sub voices and scheduled gain envelopes. Live playback has output compression; exports omit that compressor and use the shared attenuation instead. The diagrams are schematics, not measured waveforms. “Reverse-like swell” is a rising volume shape; actual reversed audio is taught in the experiment section.

## Checks

Run `node rumble-tests.mjs` for dependency-free checks of the inline source: preset/session validation, pattern timing, envelopes, deterministic impulse generation, WAV encoding, library filtering, recipe generation, graph scheduling contracts, offline frame counts, initialization and A/B/control callbacks.

These checks use DOM and Web Audio API stubs where needed. They do not verify actual browser layout, audible quality or a real OfflineAudioContext render. A browser connection was unavailable during this update, so desktop/mobile visual QA and listening remain unverified. No Ableton `.adg` rack is supplied; the recipes are instructions to build and audition in Live.

Routing references are linked alongside the rack guide in the page.
