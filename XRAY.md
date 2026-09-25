# X-Ray: notes

[`xray.html`](xray.html) takes a reference track apart. Drop in an MP3, WAV, FLAC, AAC/M4A, OGG
or Opus file (AIFF works in Safari). Everything is measured in the page: nothing is uploaded, and
the page works offline. The page is one self-contained, hand-edited file. Its analysis engine sits
between the `/* xray-engine:start */` and `/* xray-engine:end */` markers, and
[`xray-tests.mjs`](xray-tests.mjs) runs that exact code in Node.

## What you get

| Section | What it measures |
|---|---|
| 01 The numbers | Tempo to 0.01 BPM, key and Camelot code (with alternatives), length in bars, where bar 1 starts, integrated / short-term / momentary LUFS, true peak, PLR, LRA, the kick's note, 16th swing, clap push/drag, and the file's codec, bitrate and encoder cutoff. Also a list of "what stands out". |
| 02 The map | Sections in bars, with labels (Intro, Groove, Break, Build, Drop, Outro) and letters for sections that sound alike. Below them: a spectrogram, five element lanes (kick, bass, hats, mids, air) measured per bar, and the short-term loudness curve. Click a bar to jump there, drag across bars to loop them, drag a section edge to move it. The table below the map renames, relabels, splits and merges sections. |
| 03 The grid | Tempo and bar-1 editing (½×, 2×, tap, ±1 beat, ±5 ms) and a plot of every kick against the grid, which shows how tight the track is. |
| 04 The groove | The drum pattern of any section as a 16-step heat map in three bands, with per-step timing in ms. Also 16th and 8th swing, clap push/drag, and hat accents. Exports a 4-bar pattern MIDI and a groove-template MIDI for Live's Groove Pool. |
| 05 Harmony | The key, the pitch-class evidence behind it, a drone to check it by ear, and a best-guess chord plus bass note for every bar, with the loop for each section. Exports harmony MIDI. |
| 06 Low end | The kick's note and cents, and how it relates to the key. How far the kick rises over the bass, the sub and bass stereo correlation, the low-end share of the mix, and the most common bass notes. |
| 07 Tonal balance | The 1/6-octave spectrum from 20 Hz to 20 kHz, normalised to loudness, for the whole track or one section, with the tilt in dB/oct. Seven bands with their stereo correlation. The curve can be overlaid with your mix and your crate's average. |
| 08 Compare | Load your own mix as B. Get a side-by-side table, a ranked list of "what to change first", a map of B, and a loudness-matched A/B switch that jumps to the same bar. |
| 09 To Ableton | Skeleton MIDI with five tracks (tempo and section markers, section blocks, detected drums, bass roots, chords), plus a Markdown report, JSON data, and step-by-step warp instructions for lining it all up in Live. |
| 10 Crate | Measurements (never audio) saved in this browser, with an average tonal-balance curve. You can export and import the crate as JSON. |

**Transport:** play, loop section, click on the grid, key drone, listen filters (sub, bass, mids,
highs, mid, side) and 0.75× / 0.5× speed. Keys: <kbd>Space</kbd>, <kbd>←</kbd>/<kbd>→</kbd>
(<kbd>Shift</kbd> for 8 bars), <kbd>[</kbd>/<kbd>]</kbd>, <kbd>L</kbd>, <kbd>M</kbd>, <kbd>D</kbd>,
<kbd>B</kbd>, <kbd>1</kbd>–<kbd>7</kbd>.

## MP3 and other lossy files

The browser decodes the file natively. X-Ray reads the sample rate, channels and bitrate from the
file header (MP3 frame headers and Xing/Info tags, FLAC STREAMINFO, WAV/AIFF chunks, Ogg identification
headers, MP4 sample entries), then decodes at the file's own rate. Tempo, key, sections, groove, chords
and loudness come out the same from a 320 kbps MP3 as from the WAV; see the validation below. Two things
differ:

- Encoders cut the top octave. The page detects a spectral cliff of 25 dB or more above 11 kHz and
  flags it when it sits below 19 kHz, for example 16.8 kHz on a 128 kbps LAME file.
- MP3 decoding adds the encoder delay (about 25 ms with LAME), so bar 1 sits that much later than in the
  WAV. It's the right answer for the decoded file, and the warp instructions use it.

## How it works

1. **Loudness:** BS.1770-4 K-weighting (coefficients re-derived for any sample rate), 400 ms gated
   blocks, 3 s short-term windows and EBU LRA. True peak uses 4× oversampling with a 16-tap windowed
   sinc, evaluated around local maxima.
2. **Three spectral passes:** a stereo STFT at about 22 kHz (mid and side band energy, spectrogram,
   centroid), a mono STFT at about 11 kHz (whitened chroma, bass chroma, the strongest low peak) and full-rate
   spectra every 0.25 s (1/6-octave bands, encoder cutoff).
3. **Drum-band onsets** at about 2 ms resolution: low (below 110 Hz), clap/snare (1–3.5 kHz) and hats
   (above 7 kHz). Each measures added amplitude relative to the band's usual level.
4. **Tempo:** onset autocorrelation with a tempo prior gives a rough tempo. Then a weighted straight
   line is fitted through the times of the strong kick and clap peaks against their beat numbers. The
   fit starts from a well-supported anchor and grows outward until it covers the track. The slope is
   the tempo and the scatter is the "grid holds ±ms" figure.
5. **Bar 1:** the beat phase where chroma and band energy change most.
6. **Bars → sections:** per-bar features go into a self-similarity novelty curve with 4- and 8-bar
   kernels, biased toward 8-bar phrase boundaries. Labels follow visible rules: a section without a kick
   is a break, or a build if it rises into a kick section. A drop is a loud kick-and-bass section that
   follows a break or jumps 3 LU or more.
7. **Groove:** per 16th step, the onset strength and timing are averaged over every bar of the section.
   Swing is measured MPC-style.
8. **Key and chords:** Krumhansl–Kessler and Temperley profiles combined, and triad templates per bar
   with the bass note as a tie-breaker. Names are spelled for the key (D♭ in F minor).
9. **Kick note:** power spectra from 90 ms after each beat, minus the same windows on the offbeats (which
   removes the bass), then the peak between 35 and 120 Hz.

Everything that depends on the grid is recomputed in about 100 ms whenever you edit the grid or the
sections.

## Validation

`node xray-tests.mjs` runs 11 checks against known answers:

- **Loudness:** a stereo 997 Hz sine at −23 dBFS reads −23.0 LUFS (±0.1) at 44.1 and 48 kHz, and a
  mono file matches dual mono.
- **True peak:** a quarter-sample-rate sine at 45° reads −9.03 dBFS sample peak and −6.02 dBTP true peak.
- **File headers:** WAV, MP3 (CBR, Xing VBR, ID3-tagged), FLAC and Ogg Vorbis sniffing.
- **Four synthesized demo tracks:** 124/128/140/174 BPM, keys A/F/C/D minor, swing 50–62%, at 44.1,
  48 and 96 kHz. In every one, tempo is within 0.02 BPM, bar 1 is within 10 ms, and the key is exact.
  All six section boundaries and labels are exact, and the repeated sections share letters. Swing is
  within 1.5%, and the kick note and tonic bass note are exact. The drop pattern has kicks on the four
  beats and claps on 2 and 4.
- **Edits:** the grid round-trips, and merged sections keep their labels.
- **Exports:** the MIDI files parse as Standard MIDI Files with the correct tempo, track names and note
  counts.
- **Compare:** a copy 6 dB quieter differs by −6.02 LU and nothing else.

In a real browser (headless Chromium), the demo encoded as a 320 kbps and a 128 kbps MP3 gave the same
tempo, key, sections, swing and kick as the WAV. The 128 kbps file's cutoff was flagged at 16.8 kHz. A
2-minute track takes 3–4 s to analyse; expect about 10 s for 7 minutes.

## Limits

- Constant tempo is assumed. Live-played or tempo-mapped tracks show a loose grid, and their groove
  figures are averages.
- The low-hits row includes punchy bass notes, and the clap row picks up snares and rimshots.
- Chords in dense drops are best guesses, since leads and pads blur the triads. The page says so where
  they're shown.
- The demo track is synthetic: it proves the measurements are right on signals with known answers, not
  that every genre's production tricks are handled. Check the grid with the click before trusting the
  rest.
