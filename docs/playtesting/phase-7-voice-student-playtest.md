# Phase 7 — student playtest with narration

A first-time student's run through the whole game with the Sarvam narration on.
No source file was modified during this pass.

## 1. Test environment

| | |
|---|---|
| Date | 26 September 2026 |
| Build | working tree at the end of Phase 6, plus the 6000 ms queue threshold |
| Server | `npm run dev`, Vite 8, `http://localhost:5173` |
| Browser | the desktop app's browser pane |
| Entry point | `http://localhost:5173/` — no `?step=`, no `?molecule=` |
| Narration | 41 pre-generated clips from `public/audio/voice/`; no Sarvam call at run time |

**What I used, and what I did not.** The journey was walked with real pointer
clicks. Nothing was advanced with a developer handle, no `visibilityState` was
overridden, `engine.tick()` was never called by hand, and no DOM node was
clicked programmatically to move the game on.

Two read-only uses of the development handles, neither of which advances
anything, and both disclosed because they shaped the evidence:

1. A listener on the voice channel (`window.__voice.onState`) recorded which
   clip started, played, ended or was cancelled, with a millisecond timestamp
   and the screen it happened on. Every timing in this report comes from it.
2. `window.__live.engine.snapshot()` was read to convert gameplay coordinates
   into screen coordinates, so that my clicks landed where a student's would
   rather than where I guessed. The clicks themselves were real.

`requestAnimationFrame` ran at **62 fps** in the pane at the start of this
session, so the game genuinely played in real time - unlike the Phase 6 pass,
where it was stopped. That is what made this playtest possible.

## 2. Viewports

| Viewport | What was done | Layout unit |
|---|---|---|
| **1366 × 768** | the full journey, including a complete methane round played by hand and most of an ethane round | 0.894 |
| **1440 × 900** | propane loaded, narration and layout checked | 1.000 |
| **1920 × 1080** | methane loaded, narration and layout checked | 1.250 |

No horizontal or vertical scrollbars at any of the three. No console errors at
any point in the session.

At 1440 and 1920 the pane reported the page as hidden, so the game paused itself
and said so on the card. The round could not be played at those sizes; the
1366 × 768 pass is the one where gameplay was exercised.

## 3. The journey

Sign-in → carbon introduction → carbon valency → prefixes → alkane → alkene →
alkyne → ANE → ENE → YNE → walkthrough (31 frames) → methane (played to
completion) → ethane (played through the carbon phase) → summary.

## 4. Clips observed

Every clip that played, with its measured length. Each played **once**, in the
order below, at the moment it describes.

| Clip | Where | Measured |
|---|---|---|
| V01 | sign-in, on load | played to the end before the first click |
| V02–V10 | one per lesson screen, on entry | each once, in flow order |
| V11 | walkthrough frame 1 | 5.0 s, to the end |
| V12 | walkthrough last frame | **0.7 s of 3.07 s — cut off.** See F1 |
| M01 | methane `GAME_STARTED` | **started and cancelled in the same millisecond — never heard.** See F2 |
| M02 | methane carbon phase | 4.4 s, to the end |
| S01 | first carbon phase of the session | 7.8 s, to the end |
| M03 | structure ready | 3.60 s, to the end (beat is 1100 ms) |
| M04 | hydrogen calculation | 5.14 s, to the end (beat is 2600 ms) |
| S04 | hydrogen selection | 5.63 s, to the end |
| S05 | wrong-family hydrogen | 11.5 s, twice, for two separate mistakes 23 s apart |
| S09 | first hydrogen bond | 2.2 s, once |
| M05 | methane complete | 5.1 s, to the end |
| G01 | summary, next molecule exists | 4.2 s, to the end |
| E01 | ethane `GAME_STARTED` | 5.8 s, to the end |
| E02 | ethane carbon phase | 3.2 s, to the end |
| S02 | wrong carbon family | 7.5 s, to the end |
| E03 | ethane carbons bonded | 6.0 s, to the end |
| E04 | ethane hydrogen calculation | 8.1 s, to the end |

Play counts for the whole session: every clip **1**, except S05 at **2** — two
distinct mistakes, 23 s apart, each explained once. The 5 s cooldown was never
breached.

## 5. Clips unexpectedly missing

**None missing outright.** Two were lost to cancellation at one seam (F1, F2).

The queue held nothing back this time: M04, G01 and E02 - the three the 2000 ms
threshold used to drop - all played to the end, which is what the 6000 ms
threshold was raised for.

## 6. Clips that played too late

None. Every clip started within ~100 ms of the state it describes.

The two held beats are outrun by their clips, as designed and as decided in
earlier phases: M03 ran 2.5 s past its 1100 ms beat and E04 ran 5.5 s past its
2600 ms beat. Neither delayed the game, and neither talked about something that
had already passed - the molecule is still on screen.

## 7. Clips that played too early

None.

## 8. Narration in the wrong context

None. Specifically:

- **Methane said methane, ethane said ethane, propane said propane.** M01–M05
  only on methane, E01–E04 only on ethane, P01 only on propane.
- **A carbon-to-carbon bond was never announced as a hydrogen bond.** Ethane's
  C–C bond formed with `bonds: 1` on the snapshot and E03 playing; S09 did not
  fire. S09 fired later, on the first C–H bond, exactly once.
- **The mistake explanation always matched the mistake the engine recorded.**
  The clearest case: I aimed at a three-carbon blue set, the paper landed on a
  set containing a green carbon, the engine recorded
  `WRONG_CARBON_FAMILY {picked: green, expected: blue}`, and S02 - the wrong
  family line, not the wrong count line - played. The narration follows the real
  atoms, not the set's label and not what I intended.
- **The card and the voice agreed.** On the wrong hydrogen, the card showed "That
  hydrogen is from the red set, which belongs to the alkenes…" in red while S05
  said the same thing.

## 9. Duplicate narration

None. No clip overlapped another: the channel played one line at a time
throughout, and the only interruptions were the intended ones (a completion
line cutting a feedback line).

## 10. Mistake narration

| Mistake made | Engine recorded | Clip | Correct? |
|---|---|---|---|
| Picked a red hydrogen for an alkane | `WRONG_HYDROGEN_FAMILY` at the pick | S05 | yes |
| Threw a wrong-family hydrogen | `WRONG_HYDROGEN_FAMILY` at the failed throw | S05, 23 s after the first | yes — separate mistake, outside the cooldown |
| Threw the paper at a mixed carbon set | `WRONG_CARBON_FAMILY {green}` | S02 | yes |
| Threw a hydrogen at nothing | `THROW_MISSED` | none heard | see F4 |

The wrong-hydrogen case is the one that was most at risk of being said twice for
one mistake. It was not: the pick was explained once, and the later failed throw
was a genuinely separate mistake.

## 11. Molecule-specific narration

Confirmed for all three. The methane → ethane hand-off through the real summary
card was clean: G01 finished, the card was pressed, a fresh ethane round began
and E01 → E02 played in full. No methane line leaked into the ethane round.

## 12. Back / forward / refresh

| Action | Result |
|---|---|
| Back from the game | → walkthrough, silent (V11 not replayed) |
| Back again | → YNE screen, silent (V10 not replayed) |
| Forward | → walkthrough, silent |
| Forward again | → the game; a **new** ethane round began and E01 played again |
| Refresh onto a lesson | that lesson's line plays once (verified in Phase 4 and unchanged) |
| `history.length` | constant at 18 across all six moves — **no duplicate entries** |

No clip from an old screen ever continued over a new screen, with the single
exception at the walkthrough seam (F1).

## 13. Mute

`?mute=1` on a fresh load: channel muted, nothing spoken, and **zero narration
files fetched** — the manager does not even request the audio. The lessons and
the game were both still fully usable. SFX behaviour is unchanged; it is
controlled by the same pre-existing flag.

## 14. Console and network

No console errors or warnings during the entire session. Every narration request
returned 206/200 from `public/audio/voice/`. **No request to any Sarvam endpoint
at run time.**

## 15. Gameplay issues

None attributable to narration. The round played normally throughout: the clock
ran, the paper flew, carbons bonded, the web collected, throws landed or missed,
scoring moved (0 → 1945 on methane), and the molecule completed with 66 s to
spare. Narration never blocked a click, never advanced a state, and never
changed the clock: M03 and E04 both ran on over resumed play without the game
waiting for them.

## 16. Voice issues

See the findings below.

## 17–18. Findings, with reproduction steps

### F1 — V12 is cut off after 0.7 s of 3.07 s · **P2**

- **Screen/state**: walkthrough final frame (`ethane-15`) → live game
- **Molecule**: methane (the first round)
- **Action**: press the card on the walkthrough's last frame
- **Clip**: V12, "That's the whole loop. Now it's your turn."
- **Expected**: V12 finishes, or is at least mostly heard
- **Actual**: `V12 started 247546 → playing 247594 → cancelled 248279`. The
  student hears roughly "That's the whole—" and then it stops.
- **Viewport**: 1366 × 768
- **Reproducible**: yes; the mechanism is deterministic (see F2)

### F2 — M01 is never heard on the normal path · **P2**

- **Screen/state**: the first moment of the live game, arriving from the walkthrough
- **Molecule**: methane
- **Action**: press the card on the walkthrough's last frame
- **Clip**: M01, "First molecule: methane. C H four — one carbon, four hydrogens."
- **Expected**: M01 plays; it is the round's introduction and names the formula
- **Actual**: `M01 started 248280 → cancelled 248280`. Started and cancelled in
  the same millisecond; the student hears nothing of it. M02 then plays.
- **Viewport**: 1366 × 768
- **Reproducible**: yes, by construction

**Mechanism.** Two layers act on the one shared channel in the same commit.
`useGameVoice` sees a new engine and calls `cancelAll()` - that is what cuts V12
(F1). The new engine then emits `GAME_STARTED` and M01 starts. Immediately
after, App's lesson effect runs `enter('play')`; `play` has no clip of its own,
and the rule for a silent cue is to stop the voice when the cue comes from a
different screen than the line now speaking. The line now speaking is M01, but
the controller still has the *walkthrough's* cue recorded as what it started, so
it reads "different screen" and stops the channel — killing the game's first
line instead of the walkthrough's.

Arriving at the game any other way is unaffected: the methane → ethane hand-off
kept E01 intact, because the screen does not change.

**Note for whoever fixes this.** M01 being cancelled is currently what lets S01
through. With M01 restored, S01 would queue behind M01 (5.06 s) and M02 (4.30 s)
and wait ~9.4 s, past the 6 s threshold, so it would be dropped instead. The two
should be looked at together.

### F3 — narration plays while the game is paused, when the tab starts hidden · **P4**

- **Screen/state**: live game, loaded while the pane reported the page hidden
- **Action**: load the game with the tab not visible
- **Expected**: no narration while the round is paused
- **Actual**: the card correctly said "Paused — this tab is in the background,
  so the clock has stopped", the clock held at 2:00, and P01 played anyway
- **Viewport**: 1440 × 900 and 1920 × 1080
- **Reproducible**: yes, whenever the page is hidden at load
- **Why**: narration is cancelled on the `visibilitychange` event. A page that
  is *already* hidden never fires one, so nothing cancels. Unlikely to affect a
  real student, whose tab is in front when they open the game.

### F4 — a missed throw was not explained aloud in this run · **P4**

- **Screen/state**: methane, hydrogen phase
- **Action**: threw a hydrogen and missed
- **Expected**: S08, "That one didn't land. Aim at one of the free bond markers."
- **Actual**: the engine recorded `missedThrows: 1`, but no S08 was heard
- **Reproducible**: not established in this pass
- **Most likely not a defect**: S08 is DROP, and a long S05 was speaking across
  that moment, so skipping it is the policy working as designed. Recorded
  because I could not prove which of the two it was.

### F5 — Back out of the game and forward again restarts the round · **P4**

- **Action**: Back twice from the game, then Forward twice
- **Actual**: a fresh ethane round begins, the clock resets and E01 plays again
- **Not a narration defect**: the engine is rebuilt on return, so the round
  really is new and re-introducing the molecule is correct. Recorded because a
  student who presses Back loses their progress, which is pre-existing gameplay
  behaviour rather than anything voice introduced.

### Severity summary

| | Count | |
|---|---|---|
| **P0** blocks progression | **0** | |
| **P1** wrong or misleading teaching | **0** | |
| **P2** narration/gameplay mismatch | **2** | F1, F2 — both at the walkthrough → game seam |
| **P3** interaction friction | **0** | |
| **P4** minor polish | **3** | F3, F4, F5 |

## 19. Evidence

Timings in sections 4 and 17 are from the voice channel's own state events,
recorded live. The mistake cases were cross-checked against
`snapshot.feedback` and the session record, so each clip is matched to the
mistake the engine actually recorded rather than the one I meant to make.

## 20. Student experience

Written as the student, from the run.

**Do I know what the game wants?** Yes. The voice says what the screen is for
and then stops. In the round, M02 ("Meth means one carbon. Throw the paper at a
single blue carbon") told me what to do before I had to guess, and S04 told me
how to pick up hydrogens.

**Does it explain why I was wrong?** Yes, and this was the strongest part. I
picked a red hydrogen and heard that it belongs to the alkenes and that colour
marks the set rather than the bond - the rule, not a scolding. When my throw hit
a set with a green carbon in it, the voice explained *that*, not something
generic.

**Is it too frequent, or too quiet?** Neither, in a clean round. Roughly 30 s of
speech across a 2-minute round, clustered at the start and at the teaching
beats, with the middle of the round - collecting and throwing - left alone
except when something goes wrong. That is the right shape.

**Guidance or lecture?** Guidance. Nothing repeated itself, and no per-atom
chatter.

**Did I ever wait, thinking I had to listen first?** No. The cards stayed
clickable, and clicking through a line simply moved on. I clicked past V03 with
half a second left and nothing objected.

**Did anything confuse me?** One thing. Coming out of the walkthrough, the voice
started "That's the whole—" and stopped dead, and then the round began without
introducing itself. The first thing I heard about methane was "Meth means one
carbon", never "First molecule: methane, C H four". For a student who does not
know the formula yet, that is the one line I would most want back (F1, F2).

**One observation not about the voice.** Aiming is genuinely hard: I aimed at a
carbon set and hit a different one twice. The voice handled it correctly every
time, which made the difficulty feel like part of the game rather than a fault.

## Recommendation

The narration is in good shape. No P0 and no P1: nothing blocks a student, and
nothing taught them anything false. Both P2 findings are the same defect at one
seam - the hand-off from the walkthrough into the first round - and they cost
the student the end of V12 and the whole of M01.

**Recommended: fix F1 and F2 together before release, and look at the S01
knock-on at the same time.** Everything else can wait: F3 and F5 are edge cases
a real student is unlikely to meet, and F4 may not be a defect at all.
