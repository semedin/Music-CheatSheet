# Outside — hear your track everywhere but the studio

Outside takes a finished mix and plays it in twelve places that are not your studio: four inside a club, three behind its walls, five out in the world. You walk between them while the track plays, and a report says what broke in each place and what to change in the project. Open `outside.html`; everything runs locally in one standalone file, and the audio never leaves your computer.

The page is built on one claim: **a mix is finished when it survives the places people will hear it, and most of what goes wrong there can be measured before you leave the room.**

## Start here

1. Bounce your mix and drop the file on the page (WAV, MP3, FLAC, AAC). No track to hand? **Play the demo mix**, which has seven problems planted in it.
2. Press <kbd>→</kbd> to walk the night. In any place, press <kbd>S</kbd> to flip to the studio and back.
3. Read **The morning after**: a score out of 100, the fixes ranked by how much they buy, and a row per place.
4. Fix the first thing on the list in Live, bounce again, drop it in again.
5. Add a reference track you trust. Where the reference breaks too, the place is hard on everybody.

Use headphones or monitors. On laptop speakers you cannot hear what the sub stack does.

## The twelve places

| | Place | What is modelled | What it checks |
|---|---|---|---|
| Inside | The booth | Loud monitors, the floor's low end arriving 45 ms late, a small room | Gaps in the low end, 2–5 kHz |
| | Middle of the floor | Mono subs below 100 Hz, a rig tuned +7 dB under 85 Hz and high-passed at 32 Hz, a room of 1.7 s in the lows | Gaps in the low end, mono, energy under 30 Hz, weight under 120 Hz, 2–5 kHz |
| | At the sub stack | +14 dB under 95 Hz, the tops shadowed above 3.5 kHz, soft saturation | Weight under 120 Hz, energy under 30 Hz, mono |
| | The back bar | More reverb than direct sound, a room mode at 140 Hz, the top rolled off, a bar crowd | Gaps in the low end, low-mid build-up, mono |
| Through the wall | The toilets | The club room, a wall (everything above ~200 Hz gone), a tiled room, a hand dryer, a door | The groove through the wall |
| | The smoking area | The club room, a wall, open air, a crowd talking, a door that swings often | The groove through the wall |
| | The queue | The club room, a building that resonates at 48 Hz, an echo off the street, traffic | The groove through the wall |
| Out in the world | Festival field | 60 m of air (−9 dB above 6 kHz), a ground dip at 250 Hz, a late echo, wind | The top end, mono, weight under 120 Hz |
| | The car home | Cabin gain under 70 Hz, door speakers that boom at 130 Hz, the driver's seat, road noise | Low-mid build-up, weight under 120 Hz |
| | Bluetooth speaker | Mono, a port tuned to 62 Hz, a limiter | The bass note, mono |
| | Laptop speakers | Nothing under 190 Hz, a honk at 900 Hz | The bass note, the kick, mono |
| | Phone speaker | Mono, nothing under 430 Hz, a spike at 2.8 kHz, clipping | The bass note, the kick, mono |

The thirteenth place is **Studio**: your file, untouched. Every exact figure is on the page under *How this place is modelled* and in the table at the bottom.

## How a place is built

A place is a list of stages in `outside-src/engine.js`: filters, a stereo width, a room, a wall with a door, an echo, a saturator, a limiter. The same list is used twice:

- `audio.js` turns it into Web Audio nodes. The filters are `IIRFilterNode`s fed with coefficients computed by the engine, so the filter you hear is the filter that was measured.
- The engine turns it into a **power response**: for any frequency, how much energy gets through and how much of the stereo difference survives. The report is computed from that.

**Rooms** are impulse responses synthesised in the page: a few early reflections, then three bands of noise that each decay at their own rate (the club takes 1.7 s to lose 60 dB in the lows and 0.6 s in the highs). The response is scaled so that it adds a known amount of energy per band, and the tests check the synthesised response against that figure.

**Walls** are low-pass filters with one resonance. **Doors** are a second, more open path that fades in: on their own every few seconds, or while you hold <kbd>D</kbd>.

**Backgrounds** (bar crowd, smokers, street, road, hand dryer, wind) are synthesised too. The voices are a few dozen pulse trains through moving formant filters, with syllable timing. Their level is set against the level of your track in that place, so the crowd outside is louder than the thump and the road is quieter than the car stereo.

## What the report measures

The report reads the **loudest 32 seconds** of the file, which is usually the drop. From that stretch it takes the average spectrum of the mid and the side signal, the envelope of five bands at 5 ms, the kick positions (a tracked beat grid) and the bass note.

| Check | What is measured | Where |
|---|---|---|
| **The bass note** | The energy on the low note's harmonic series that this place still plays, against the rest of the mix here. A sine has none above its own pitch. | Phone, laptop, Bluetooth speaker |
| **The kick** | How far the kick rises above what is around it, in the bands this speaker plays | Phone, laptop |
| **Mono** | How many dB a band loses when left and right are folded together, for the bass and for the mids | Floor, sub stack, bar, festival, speaker, laptop, phone |
| **Gaps in the low end** | How far the 35–120 Hz envelope falls between hits after the room has added its tail, against the tightest kick that room allows | Booth, floor, bar |
| **The groove through the wall** | The same, behind a wall | Toilets, smoking area, queue |
| **Energy under 30 Hz** | The share of the track's energy that no speaker here reproduces | Floor, sub stack |
| **Weight under 120 Hz** | The share of energy in the bottom two octaves | Floor, sub stack, festival, car |
| **Low-mid build-up** | 110–260 Hz against the mids | Bar, car |
| **2–5 kHz when loud** | 2–5 kHz against the mids | Booth, floor |
| **The top end** | Above 5 kHz against the mids | Festival |

Each failed check costs the place points and names one of eleven fixes, written as steps in Ableton Live. The **Fix first** list adds up what each fix would buy across all twelve places.

The page also shows, for each place, what the mix is made of there (the share of six bands), the level change before loudness matching, and a live spectrum of the studio signal against the place.

## Controls

| | |
|---|---|
| <kbd>Space</kbd> | Play and pause |
| <kbd>←</kbd> <kbd>→</kbd> | Walk to the previous or next place |
| <kbd>S</kbd> | Flip to the studio and back |
| <kbd>D</kbd> (hold) | Hold the door open |
| <kbd>R</kbd> | Switch between your track and the reference, at the same point in the drop, loudness-matched |
| <kbd>M</kbd> | Match loudness on and off. Off, each place plays at roughly its real level against the others |
| <kbd>L</kbd> | Loop the drop, or play the whole file |

**Take it away:** the report as Markdown (download or copy), and a WAV of the drop as heard in the current place.

## How it was validated

There are no real rooms to measure in a browser, so the page is tested the way Blueprint is: against a signal with known faults.

- **The demo mix is written twice** by the engine: sixteen bars of house with seven planted problems (a pure-sine bass, a widened bass, a ringing kick with no ducking, a kick with no click, a 21 Hz rumble, an out-of-phase stab, a low-mid pad), and the same sixteen bars with each one fixed. `node outside-src/test.mjs` requires the report to find **all seven in the first mix and none in the second**, and each one in the places it belongs to.
- **Filters:** the response formula is checked against the filter run on a sine, for every filter type.
- **Rooms:** the synthesised impulse response is checked for its energy per band and its decay rate.
- **Loudness:** a 1 kHz sine at −20 dBFS reads −20 LUFS.
- **Mono loss:** two channels 120° apart lose 6 dB; an out-of-phase mid vanishes on the phone and survives on a stereo rig.
- **Each check** is tripped by a signal built for it, and left alone by one that should pass.
- `node outside-src/browser-check.mjs` drives the page in Chromium: every place is played and measured from the analysers (the phone loses the lows, the walls lose everything else, the sub stack is heavier than the floor), the door is held and measured, every place is rendered offline, a file is uploaded, a reference is added, and every download is opened.

## Limits

- **These are models, not measurements.** Every room, wall and speaker is built from typical figures. A real club will differ from this one. The direction of each change is reliable; the exact number of dB is not.
- **The thresholds are rules of thumb.** “Club records usually sit between 55 and 80% under 120 Hz” is an estimate, not a survey. A reference track is a better yardstick than any threshold on the page, which is why you can load one.
- **“The bass note” is whatever sits on the low note's harmonic series.** A chord that doubles the root counts as carrying the note, because to the ear it does. If the kick's tail is louder than the bass, the low note reported is the kick's.
- **The kick is found on a steady beat.** The tracked grid suits house and techno. On broken beats the page falls back to the strongest low-end hits.
- **Saturation, limiting and doors are not in the report.** They are in the sound. The report uses the linear part of each chain with the door shut.
- **Loudness changes how you hear bass.** At phone level the ear is less sensitive to low end than at club level. The page does not model that, since it cannot know how loud your headphones are.
- **Your own playback is in the chain.** If your headphones have no sub, neither does the sub stack.
- Very long files are decoded whole by the browser, which takes memory: a ten-minute track needs a few hundred megabytes while it is open.
