# Fix Pass Report

Date: **24 September 2026**. Scope: the verified issues left open by
[`../playtest-findings-v2.md`](../playtest-findings-v2.md). No redesign, no new
mechanics, no visual changes beyond what a verified issue required.

Nine issues fixed, four deferred. `npm test` 122 passing (was 116),
`npm run build` clean, lint unchanged. All 50 reproduction scripts run.

---

## 1. Issues Addressed

### P0-1 — The game was only reachable by typing `?step=play`, and could not be restarted

**Original issue.** `App.tsx` rendered `<GameplayFlow />` with no props, so the
Figma walkthrough was a dead end; the live game existed only at `?step=play`;
the summary had no way out.

**Root cause.** Three separate gaps: the walkthrough's last step was
`{ kind: 'click', target: 'none' }` with nothing wired to it; the router's
`advance()` never reached `play` because nothing could leave `gameplay`; and
`LiveGameplay` had no restart path at all.

**Change made.**
- The walkthrough's last frame is now the continue control (the same
  card-as-button the rest of the flow uses) and leads to the game. Its card
  reads "… Now play it yourself."
- `LiveGameplay` takes `onExit`, and restarts by **building a new engine**
  rather than resetting the old one.
- On the summary the instruction card becomes the restart control, and two
  keyboard controls appear: "Molecule complete. Play again." and "Back to the
  walkthrough".

**Verification.** A scripted click-through from `/` reached
`signIn → carbonIntro → carbonValency → prefixIntro → alkane → alkene → alkyne
→ screen67 → screen68 → screen69 → gameplay → play` using only the on-screen
controls. Restart from the summary produced a new engine
(`sameEngine: false`) with `phase CARBON_SELECTION, bonds 0, score 0,
time 119, held 0, chosen 0, summary null, throws 0`.

**Tests.** `restart.test.ts` — 6 tests, including a deep-equal of every field
in the reset checklist.

### P0-2 — Refresh, Back and Forward did nothing

**Original issue.** The screen lived only in React state. A refresh went back to
sign-in; Back left the application.

**Root cause.** `?step=` was read once at mount and never written.

**Change made.** The URL is the route. A `useEffect` keyed on the screen pushes
a history entry (and `replaceState`s the first one, so Back from the second
screen lands on the first rather than leaving); a `popstate` listener reads the
URL back.

**Bug found while doing it:** the push was first written inside the `setScreen`
updater. React calls an updater twice in development, so **every move pushed two
entries** and one Back press looked like it had done nothing — measured as
`back->gameplay` from `gameplay`. Moving it into an effect that compares against
`history.state` fixed it: Back/Forward now walk one screen at a time
(`gameplay → screen69 → screen68 → screen67 → screen68 → screen69 → gameplay`).

**Verification.** Browser, at 1440x900. A refresh at `?step=play` lands on a
fresh playable game: `phase CARBON_SELECTION, score 0, bonds 0, throws 0`.

### P0-3 — A round ended early was recorded as still in progress

**Found during this pass.** `engine.finish()` moved the phase to `TIMEOUT` but
never emitted the `TIMEOUT` **event**, which is what writes
`completionStatus`. A round ended any way other than the clock reaching zero
summarised as `in-progress` — neither of the two things the summary screen
knows how to say.

**Change made.** `finish()` emits `TIMEOUT` when it ends a round that was still
being played. The clock-expiry path is unchanged and still emits exactly once.

**Tests.** *a round ended while it was still being played is recorded as out of
time*; *a round that really ran out of time still records it once*.

### P1-1 — Chemistry: verified, and the completion gate re-checked

Every fact the brief listed was checked directly
(`.playtest/v3-verify-chemistry.ts`, `ALL CHECKS PASSED`):

| | |
|---|---|
| methane / ethane / propane | 1C 4H · 2C 6H · 3C 8H, all chain bonds single |
| carbon valency / hydrogen valency | 4 · 1 |
| alkane / alkene / alkyne bond order | 1 · 2 · 3 |
| general formulas | CnH2n+2 · CnH2n · CnH2n-2 |
| family mapping | blue alkane · red alkene · green alkyne (matches `elements.ts`) |
| prefixes 1–10 | one … ten, each with the right number |
| hydrogen working | correct for CH4, C2H6, C3H8, C2H4, C2H2 |

`checkMolecule` still refuses an ethene built with a single C–C
(`ethene built with a SINGLE C-C is refused: false`), still accepts a correctly
double-bonded one, and still refuses a chain with an open valency or a
wrong-family atom. This is the fix the v2 report flagged; it holds.

### P1-2 — Hydrogen colour terminology (brief section 9)

**Audit.** Four places implied a hydrogen belongs to a bond-type family:
`describeFamily()` (used in the keyboard label "Hydrogen 3: red (alkene, double
bond)"), `explainMistake()`'s wrong-hydrogen sentence, the summary note in
`session.ts`, and the badge drawn above each hydrogen (`=` above a red one,
literally "this makes a double bond").

**Determination.** The mechanic uses colour for **set membership** — match the
carbons' set — not for the hydrogen's own bond order. So the mechanic is sound
and the wording was wrong.

**Change made — mechanic untouched, claims corrected.**
- `describeFamily(family, 'H')` → `"red - from the alkene set"`. For carbon it
  still says `"red (alkene, double bond)"`, which is true of a carbon.
- The badge above a hydrogen is now the set name — `ane` / `ene` / `yne` —
  instead of the bond strokes. Carbons keep `–` / `=` / `≡`.
- One sentence, `HYDROGEN_COLOUR_NOTE`, appears on the hydrogen-selection card
  and inside the wrong-pick explanation: *"A colour says which set an atom
  belongs to. Hydrogen always makes a single bond, whatever colour it is."*
- The summary note says the same thing.

**Tests.** *nothing claims a hydrogen makes a double or triple bond*; *the
hydrogen badges are the set names, the carbon badges are the bonds*.

### P2 — Core interaction regression

All three re-verified with the original scripts, unchanged:

| | Evidence |
|---|---|
| Wrong-family soft lock | `p3-hydrogen-wrong.ts`: `>>> DEAD END: false`, `fireWeb -> true`; the rejected atom is `state = free`, back in the row |
| Aiming | `p6-aim-at-free-bond.ts`: all 6 ethane and all 8 propane markers bond, **each to its own carbon**, at both the near (r=46) and far (r=110) end of the marker |
| Retry race | `a9_race.ts`: `bonds=1 wrongPicks=1 score=275` identical at 0, 50, 100, 150, 200, 250, 300, 350 and 400 ms |

The wrong-family rule is unchanged: a wrong atom can still be picked, still
costs a throw, still fails to bond, and still returns to the row with an
explanation.

### P3 — Lesson-screen accessibility

**Original issue.** v2 recorded "only the live game is keyboard-accessible".
Inspection showed that was half right: every lesson screen already had a
focusable continue control with Enter/Space and a `:focus-visible` ring. What
was missing was a usable **name**.

**Root cause.** The `CogBadge` illustration inside every instruction card
renders the text "c-c", and it is the first thing in the card. Every continue
control on every lesson screen was announced as **"c-c"**.

**Change made.** The badge is `aria-hidden` (it is decoration), and each
continue control carries an `aria-label` of its own lesson text followed by
"Continue." — so activating it is discoverable rather than guessable.

**Verification.** Browser: the suffix ENE card now announces
`"ENE In double bond carbon chain , the surname we used called ENE . Continue."`;
the carbon-valency card announces its own heading and body then `"Continue."`.

No ARIA was added where it would not be used, and no gameplay interaction was
forced into a keyboard model it does not suit — aiming and throwing remain a
pointer gesture, with the discrete choices (sets, hydrogens, free bonds)
offered as buttons alongside.

### Zoom / responsive — a regression from the previous pass, fixed

**Found during this pass.** The `minUnit` floor added last pass decided whether
to scroll by comparing the **whole artboard** against the window. The gameplay
artboard is 1024 tall and its content band is 805, so a 1440x900 laptop — which
fits the design exactly at unit 1.0 — was marked as clamped and given
`overflow: auto`. Measured: `unit 1.0000, overflow auto, scrolled 145px`.

**Change made.** Clamping now means *the scale was stopped from shrinking*
(`unit > fitted`), which is the only case that needs scrolling.

**Verification.** `designFit.test.ts`, 4 tests: 1280x800, 1366x768, 1440x900,
1440x1024, 1536x864, 1728x1117 and 1920x1080 all report `clamped: false` with
the expected units; 720x450, 480x300 and 360x225 (200 %, 300 % and 400 % zoom of
a 1440x900 window) all floor at 0.6 and scroll. Browser at 1440x900:
`overflow: hidden`, and focusing each keyboard control moves the layout by
`0,0`.

### Audio

No sounds replaced. Mapping verified unchanged in `eventSounds.ts` and the
14 audio tests pass:

| Event | Sound |
|---|---|
| `WEB_STARTED` | Whoosh #1 — Kinoton |
| `PAPER_THROWN` (paper and hydrogen) | Thin Swoosh — Universfield |
| `ATOM_COLLISION` where `movingId === 'paper' && bonded` | Bottle_Clink_5 — wjb_88 |

A paper that strikes the wrong group stays silent; a hydrogen landing is
silent; phase changes are silent. Restart disposes the `AudioManager` (which
stops every voice and closes the context) and builds a new one, because
`useGameAudio` is keyed on the engine and the engine is rebuilt.

---

## 2. Issues Not Addressed

| Issue | Why | Needs your decision? | Safe to defer? |
|---|---|---|---|
| Full WCAG 1.4.10 reflow at 400 % zoom | The whole app is one fixed Figma artboard. Zoom now magnifies and scrolls, but satisfying "no two-dimensional scrolling" means reflowing the design, which is the architectural redesign the brief said to document rather than start. | Yes — it is a design change, not a bug fix | Yes |
| A failed throw takes ~4.1 s to roll to a stop, silently | Tuning friction changes the feel of every throw. It is a physics change for a comfort problem. | Yes | Yes |
| The clock has one warning, a colour change at 20 s | Adding a warning ladder is new feedback design, not a bug fix. | Yes | Yes |
| A backgrounded tab pauses the clock (30 s of wall time costs 0.25 s) | `requestAnimationFrame` stops when the tab is hidden and the engine has no wall-clock source. Fixing it means deciding what *should* happen — pause visibly, or keep counting. | Yes | Yes |

---

## 3. Files Changed

| File | Why |
|---|---|
| `src/App.tsx` | URL-backed routing, Back/Forward, the walkthrough-to-game handoff |
| `src/screens/gameplay/GameplayFlow.tsx` | `onContinue` on the last frame |
| `src/screens/gameplay/live/LiveGameplay.tsx` | restart by rebuilding the engine; `onExit` |
| `src/screens/gameplay/live/GameControls.tsx` | summary controls; hydrogen labels say "set", not "bond" |
| `src/screens/gameplay/live/projectScene.ts` | set badges on hydrogens; the colour note on the selection card |
| `src/content/chemistry.ts` | `describeFamily(family, element)`, `FAMILY_SET_LABEL`, `HYDROGEN_COLOUR_NOTE`, corrected wrong-hydrogen wording |
| `src/game/engine/engine.ts` | `finish()` emits `TIMEOUT` for a round ended early |
| `src/game/engine/session.ts` | summary note no longer implies a hydrogen has a bond order |
| `src/layout/designFit.ts` | `clamped` means the scale was floored, not that the artboard is tall |
| `src/components/CogBadge.tsx` | `aria-hidden` on the decoration |
| `src/components/InstructionCard.tsx` | accessible name for the card-as-button |
| `src/screens/{Alkane,Alkene,Alkyne}/components/InstructionPanel.tsx`, `src/screens/suffixes/components/SuffixInstructionPanel.tsx` | the same, for the panel controls |
| `src/game/engine/restart.test.ts`, `src/layout/designFit.test.ts` | new |
| `src/screens/gameplay/live/teaching.test.ts` | two hydrogen-terminology tests |
| `.playtest/v3-verify-chemistry.ts` | new, outside `src/` |

Untouched: physics, the collision timeline, the carbon-impact animation, the
Figma coordinate system, typography, colours, illustrations, the scene
renderer, the sound files and the sound mapping.

---

## 10. Regression Testing

- `npm test` — **122 passing, 0 failing** (was 116).
- `npm run build` — clean.
- `npm run lint` — one pre-existing warning in `GameplayFlow.tsx`, unchanged.
- 50 reproduction scripts — all run clean.
- `a6_fuzz.ts` — 400 runs, `invariant failures: 0`.
- `a7_deep.ts` — 1200 runs, 1,993,842 steps, `failures=0`.
- Browser, 1366x768 / 1440x900 / 1920x1080 — units 0.8944 / 1.0000 / 1.2500,
  no scrolling, keyboard controls present at every stage.
- Browser playthrough: entry → onboarding → three lessons → prefix rail →
  three bond screens → three suffix screens → walkthrough → game → carbon
  throw → collision → hydrogens → completion (2890 points) → restart →
  early-finish → restart → refresh. Back and Forward step one screen each.

### The physics change, regression-tested

A flying atom still does not collide with a bonded hydrogen. Confirmed still
correct and still necessary: all 14 markers across ethane and propane bond,
each to its own carbon; the board that used to be unreachable is reachable
(`bonded: 3/3, landed in the slot aimed at: 3/3`); chain collisions through
loose atoms still work (`one throw can set off more than one collision` passes);
and 1,993,842 fuzz steps found no unreachable state.

---

## 11. Remaining Issues

Four, all listed in section 2, all deferred deliberately and all needing a
decision from you rather than more code:

1. Full reflow for WCAG 1.4.10 at high zoom — architectural.
2. The ~4.1 s silent roll after a failed throw — physics tuning.
3. The clock's single warning — feedback design.
4. The backgrounded-tab pause — a rule decision.

No new regressions. Two defects were found *in the previous pass's own work*
during this one (the double history entry, and the 1440x900 scroll) and both
are fixed.

---

# Final Gameplay Feedback Pass

Date: **24 September 2026**. Three deferred decisions, taken. No redesign, no
new mechanics, no new sounds, no layout changes.

`npm test` **135 passing** (was 122), build clean, lint unchanged, 51
reproduction scripts run, 1200-run deep fuzz `failures=0`.

## 1. The ~4.1 second miss

**Problem.** A missed throw could leave the player locked out for 4.1 seconds
with nothing on the card.

**Investigation first.** `.playtest/v4-miss-anatomy.ts` and
`v4-tail-experiment.ts`, 273 throws swept across the table:

- The delay is **a side effect of the drag model, not a decision.** `integrate`
  multiplies velocity by `1 - friction/60` every frame, so speed decays
  exponentially towards a fixed rest threshold of 12 px/s. From a typical
  736 px/s that takes 222 frames - 3.7s - and nearly all of it is the atom
  crawling below 100 px/s.
- **Input was genuinely blocked** for 99-100% of it: `canThrow()` is false
  while `flyingId` is set.
- **The card said nothing** for the whole flight; the explanation only appeared
  at the end.
- Slow throws are the worst: aimed near the paper or into open space below the
  chain. A throw that leaves the table resolves in 0.9s.

**The measurement that decided it.** Across 273 throws, the latest any throw
ever *bonded* was frame 110 (**1.83s**), and only two bonds happened after
1.5s. But **74 of 182 misses took longer than 2s**, worst 4.10s. The tail
carries no outcome - only dead time.

**Change.** `physics.maxFlightMs = 2000`: a thrown atom still in the air after
two seconds has missed, and goes through the existing miss path. The
trajectory, the drag model, the collision rules and the rest threshold are all
untouched - the ceiling only ends a flight that was already over.

Plus the feedback half: while an atom is in the air the card says *"The
hydrogen is in the air …"*, so a travelling throw cannot read as a freeze.

**Result.** Re-running the same sweep: **91 bonds before, 91 bonds after** -
including both late ones at 1.62s and 1.83s. Worst miss 4.10s → **2.00s**.
Misses over 2s: 74 → **0**.

**Tests.** `feedback.test.ts` - *a throw that is going nowhere gives the table
back inside the ceiling* (three slowest aims); *the ceiling never cuts a throw
that was still going somewhere* (every free bond marker still bonds); *a miss
says what happened and hands the atom back*; *a throw in the air says so*;
*misses in a row each resolve on their own*.

**Remaining limitation.** Two seconds is still two seconds. It is the smallest
ceiling that provably changes no outcome; going lower would start cutting real
throws, and going lower safely would mean changing the drag model, which is a
change to how every throw feels.

## 2. The 20-second warning

**Problem.** The only warning was the clock turning red, which is easy to miss
while looking at the molecule.

**Root cause.** There was no warning *event* - just a colour computed from
`timeRemaining` in the renderer. Nothing could react to it, and nothing said it
in words.

**Change.** The smallest thing that uses what is already there:
`timer: { warnAtSeconds: 20, noticeMs: 3500 }` in the rules; the engine emits
`TIME_WARNING` once as the clock crosses the mark and exposes
`snapshot.timeWarning` for 3.5s; the instruction card shows **"20 seconds
left."** on its existing note line, and the clock still turns red. No sound was
added. The card is a `role="status"` region, so it is announced too.

The once-per-round guarantee is engine state, not a render effect: `warned` is
set before the event is emitted, so re-renders cannot produce a second one, and
a restart builds a new engine and so a new warning.

**Tests.** *the clock warns once, at the mark, and never again*; *the warning is
on the card, then gets out of the way*; *the warning does not stop the clock,
the round or the player*; *time still runs out after the warning*; *a round
finished before the mark is never warned*; *restarting clears the warning with
everything else*.

**Browser.** Screenshotted at 0:16 with the clock red and "20 seconds left." on
the card, alongside normal play.

**Remaining limitation.** One warning, at one mark. No 60s/30s/10s ladder and
no audio - both were out of scope for this pass.

## 3. The background tab

**Problem.** The clock stopped when the tab was hidden, silently. Coming back to
an unchanged clock looked like the game had broken.

**Root cause.** The browser stops calling `requestAnimationFrame` in a hidden
tab, so the engine simply was not ticked. The pause was real but accidental,
and unmanaged: the first frame after returning carried the whole absence, and
the engine advanced by its 250ms clamp on every frame until the backlog cleared.
Measured in the browser: a reload that spent two seconds hidden came back
having run **12.25 seconds** of game time.

**Change.** The pause is now deliberate and stated.

- The frame loop advances the engine only while `document.visibilityState` is
  `visible`, and its clock keeps up with real time either way.
- A `visibilitychange` back to visible resets the frame clock, so **no time
  passes while the tab is away**.
- A frame worth more than `MAX_FRAME_MS` (1s) is treated as a gap and skipped -
  the same rule for the cases `visibilitychange` does not cover: an occluded
  window, a throttled tab, a machine that slept.
- While hidden the instruction card reads **"Paused — This tab is in the
  background, so the clock has stopped. Come back to carry on."** and pointer
  input is ignored. On the way back the card shows **"Resumed."** for 1.8s.
  It is the same card in the same place; no overlay and no new pattern.

Nothing is reset: the engine is not touched at all while paused, so the timer,
atoms, paper, web, projectile, collision and audio all simply stop and continue.
No events fire while paused, so no sound can double.

**Tests.** *an engine that is not ticked loses no time and no state* (paused
mid-flight, resumes into a valid state and the round survives); *a frame
carrying the whole time a tab was away is refused*.

**Browser.** The browser pane reports `visibilityState: hidden`, which made it a
live test. Paused card screenshotted. Held hidden for three seconds: phase,
score and clock unchanged, **clock drift 0.000s**. Forced visible: the clock
advanced 1.20s over a 1200ms wait - real time, no catch-up. After the gap guard,
a reload that spent two seconds hidden came back at exactly **120.0s** instead
of 107.75s.

**Remaining limitation.** The pause follows the tab, not the window. A visible
but unfocused window keeps playing, which is the correct reading of
`visibilityState` but may not match every expectation.

## 400 % zoom

**DEFERRED — requires a future accessibility/layout redesign.**

Not attempted, as instructed. Zoom magnifies and the page scrolls; full WCAG
1.4.10 reflow needs the fixed Figma artboard to reflow, which is an
architectural change. The responsive coordinate system was not touched in this
pass.

## Files changed in this pass

| File | Why |
|---|---|
| `src/game/engine/config.ts` | `physics.maxFlightMs`, `timer` |
| `src/game/engine/events.ts` | `TIME_WARNING` |
| `src/game/engine/engine.ts` | flight ceiling, the one-shot warning, `snapshot.timeWarning` |
| `src/content/chemistry.ts` | `timeWarningCopy` |
| `src/screens/gameplay/live/projectScene.ts` | in-flight card, warning on the note line |
| `src/screens/gameplay/live/LiveGameplay.tsx` | visibility pause, frame-gap guard, paused/resumed card |
| `src/game/engine/feedback.test.ts` | new, 13 tests |

Untouched: Figma layout, atom positions, chemistry rules, carbon and hydrogen
collision, bond formation, the audio mapping, the responsive coordinate system,
routing, the restart architecture, the lesson UI and the game mechanics.

## Regression testing

- `npm test` — **135 passing, 0 failing**.
- `npm run build` — clean. `npm run lint` — one pre-existing warning, unchanged.
- 51 reproduction scripts — all run clean.
- `a6_fuzz.ts` 400 runs `invariant failures: 0`; `a7_deep.ts` 1200 runs,
  1,627,389 steps, `failures=0`.
- Browser at 1366x768 / 1440x900 / 1920x1080: units 0.8944 / 1.0000 / 1.2500,
  `overflow: hidden` at all three, 13 keyboard controls present at all three.
- Browser: normal gameplay, successful throw, timer warning, pause, resume,
  refresh, completion and restart all verified.

## Still deferred after this pass

1. **400 % zoom reflow** — architectural, as above.
2. **The clock's warning ladder and audio** — one warning now exists; more is
   feedback design.
