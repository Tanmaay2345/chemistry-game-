# Generated narration clips — manifest

Produced in Phase 2 from the approved wording in
[`sarvam-voice-script.md`](sarvam-voice-script.md). The generator
(`tools/voice/sarvam-tts.mjs`, development only) parses the text out of that
document rather than holding a copy, so the audio cannot drift from the
approved script. No narration was rewritten, shortened or paraphrased.

The API key was read only from `.env.local` via `node --env-file` and appears
nowhere in this document, in the generator, in any log or in any source file.

## Configuration

| | |
|---|---|
| Model | `bulbul:v3` |
| Speaker | `ishita` |
| Language | `en-IN` |
| Pace | 0.9 for 40 clips; **1.0 for S05** (approved separately) |
| Format | MP3, 24 000 Hz, mono, 128 kbps |
| Location | `public/audio/voice/<VoiceID>.mp3` |
| Runtime API calls | none — every clip is static and pre-generated |

## Audit

| | |
|---|---|
| Total expected clips | **41** |
| Total generated production clips | **41** |
| Missing clips | **0** |
| Duplicate Voice IDs | **0** |
| Failed generations | **0** |
| Script mismatches | **0** |
| Unexpected files in the voice directory | **0** |
| Total narration | 230.6 s (3.8 min) |
| Total size | 3.52 MB |
| Longest / shortest | V03 12.55 s / T01 1.75 s |

Script match was verified two ways: the generator hashes the text it sends,
and the approved cell was re-extracted independently with `awk`. All 41
hashes agree.

## Clips

### A. Lesson screens and walkthrough

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| V01 | `V01.mp3` | Welcome | 6.86 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V02 | `V02.mp3` | Carbon introduction | 8.09 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V03 | `V03.mp3` | Carbon valency | 12.55 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| V04 | `V04.mp3` | Prefixes | 9.70 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V05 | `V05.mp3` | Alkanes | 8.86 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V06 | `V06.mp3` | Alkenes | 6.19 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V07 | `V07.mp3` | Alkynes | 6.10 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V08 | `V08.mp3` | Suffix ANE | 4.78 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V09 | `V09.mp3` | Suffix ENE | 2.30 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V10 | `V10.mp3` | Suffix YNE | 7.51 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V11 | `V11.mp3` | Walkthrough opens | 4.87 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| V12 | `V12.mp3` | Walkthrough ends | 3.07 s | `bulbul:v3` | `ishita` | 0.9 | OK |

### B. Methane

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| M01 | `M01.mp3` | Challenge introduction | 5.06 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| M02 | `M02.mp3` | Carbon requirement | 4.30 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| M03 | `M03.mp3` | Structure ready | 3.55 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| M04 | `M04.mp3` | Hydrogen requirement | 5.09 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| M05 | `M05.mp3` | Completion | 4.94 s | `bulbul:v3` | `ishita` | 0.9 | OK |

### C. Ethane

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| E01 | `E01.mp3` | Challenge introduction and transition | 5.45 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| E02 | `E02.mp3` | Carbon requirement | 2.98 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| E03 | `E03.mp3` | Carbons bonded | 5.81 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| E04 | `E04.mp3` | Hydrogen requirement | 7.90 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| E05 | `E05.mp3` | Completion | 3.84 s | `bulbul:v3` | `ishita` | 0.9 | OK |

### D. Propane

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| P01 | `P01.mp3` | Challenge introduction and transition | 5.35 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| P02 | `P02.mp3` | Carbon requirement | 2.52 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| P03 | `P03.mp3` | Chain bonded | 2.71 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| P04 | `P04.mp3` | Hydrogen requirement | 7.44 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| P05 | `P05.mp3` | Completion | 4.58 s | `bulbul:v3` | `ishita` | 0.9 | OK |

### E. Shared gameplay feedback

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| S01 | `S01.mp3` | How to choose | 7.70 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| S02 | `S02.mp3` | Wrong carbon family | 7.34 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| S03 | `S03.mp3` | Wrong carbon count | 5.64 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| S04 | `S04.mp3` | Collect the hydrogens | 5.54 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| S05 | `S05.mp3` | Wrong hydrogen family | 11.40 s ⚠ | `bulbul:v3` | `ishita` | 1.0 | OK |
| S06 | `S06.mp3` | Tray full | 3.46 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |
| S07 | `S07.mp3` | No free bond | 6.77 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| S08 | `S08.mp3` | Missed throw | 4.03 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| S09 | `S09.mp3` | First hydrogen bonded | 2.21 s | `bulbul:v3` | `ishita` | 0.9 | OK |

### F. Timer

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| T01 | `T01.mp3` | Time warning | 1.75 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| T02 | `T02.mp3` | Timeout | 2.88 s | `bulbul:v3` | `ishita` | 0.9 | OK |

### G. Summary and progression

| Voice ID | File | Category | Duration | Model | Speaker | Pace | Status |
|---|---|---|---|---|---|---|---|
| G01 | `G01.mp3` | Summary, completed | 4.01 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| G02 | `G02.mp3` | Summary, timed out | 4.01 s | `bulbul:v3` | `ishita` | 0.9 | OK |
| G03 | `G03.mp3` | End of the progression | 11.42 s ⚠ | `bulbul:v3` | `ishita` | 0.9 | OK |

⚠ = longer than the ceiling estimated in
[`sarvam-voice-design.md`](sarvam-voice-design.md) §3. See below.

## Nine clips exceed their estimated ceiling

The ceilings in the design document were calculated at 150 words per minute.
Real synthesis at pace 0.9 is slower than that, mostly because the model
places longer pauses at sentence breaks and em dashes. **No approved text was
changed.** Recorded here so Phase 3 can plan around the real lengths.

| ID | Actual | Ceiling | Over by | Why it matters |
|---|---|---|---|---|
| V03 | 12.55 s | 12 s | 0.55 s | Lesson screen, nothing waiting on it. Harmless. |
| M01 | 5.06 s | 5 s | 0.06 s | Within noise. |
| E01 | 5.45 s | 5 s | 0.45 s | Harmless. |
| **E04** | **7.90 s** | 6 s | **1.90 s** | Plays on the `HYDROGEN_CALCULATION` beat, which is held for only **2600 ms** — so it runs ~5.3 s past the beat, into live play. |
| P01 | 5.35 s | 5 s | 0.35 s | Harmless. |
| **P04** | **7.44 s** | 6 s | **1.44 s** | Same beat as E04; ~4.8 s past it. |
| S05 | 11.40 s | 10 s | 1.40 s | Approved at this length. Fires on a mistake, policy DROP, nothing queues behind it. |
| S06 | 3.46 s | 3 s | 0.46 s | Harmless. |
| **G03** | **11.42 s** | 6 s | **5.42 s** | End-of-progression line on the summary screen. The player can press the card and restart mid-sentence; design rule 4 would then cut it. |

The held beats are the only real consequence, and it is the one already
recorded as ambiguity 5.5: M03 (3.55 s) runs past its 1100 ms beat too. The
design decision stands — let the clip finish rather than lengthen the beat,
which would change gameplay timing.

## Approved clips carried over, not regenerated

V02, M04 and S05 were generated and approved in Phase 1. Their production
files are byte-identical copies of those approved files, so no approved audio
was silently replaced:

| Production file | Source | SHA-256 (first 16) |
|---|---|---|
| `V02.mp3` | `test/test-lesson.mp3` | `ec85e537c5496b71` |
| `M04.mp3` | `test/test-gameplay.mp3` | `3b28de9c13b11604` |
| `S05.mp3` | `test/test-feedback-pace1.0.mp3` | `3463f8ea1ff6656c` |

The three Phase 1 proof-of-concept files remain in
`public/audio/voice/test/` and are not part of the 41.

## Not done in this phase

No `VoiceManager`, no gameplay wiring, no voice triggers, and no change to
the lesson flow, chemistry engine, physics, timer, SFX or UI. Nothing under
`src/` was modified.
