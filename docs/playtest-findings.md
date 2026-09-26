# Playtest findings

Five agents played the game on 24 September 2026, each with one lens: a
confused learner, an adversary, a chemistry teacher, an accessibility tester
and a game-feel critic. All worked headlessly against the real engine. Nothing
in the game was changed — this is a defect report.

Repro scripts are in `.playtest/` (44 of them). Every finding marked
**[verified]** was reproduced independently after the agent reported it.

**Health of the foundation, first, because it matters:** 1,200 randomised runs
over 8.2M simulated steps produced **zero** corrupt states — no negative
valency, no duplicate or self bonds, no NaN positions, no atom both held and
bonded. The rigid-body invariant is exact to 0.000px. Event integrity is clean.
Rapid input is correctly idempotent. The chemistry *engine* is provably right:
all 30 combinations of series × chain length match textbook formulae. The
problems below are in the layers above it.

---

## Blockers

### 1. One wrong-coloured hydrogen ends the round, with 108 seconds left **[verified]**
Pick the right carbons, click a red hydrogen (nothing says which colour is
right), throw it as instructed. It cannot bond, so it returns to your hand. And
because `validate()` only re-opens collection when your hands are empty
(`engine.ts:894`), every blue hydrogen in the row is now unclickable — while
still being drawn. The card keeps saying *"Aim at a free bond"* for the
remaining 108 seconds.

Three innocent actions. `node .playtest/p7-softlock-minimal.ts`. The more
common form is worse: collect 5 blue + 1 red, and you dead-end at 4/6.

This directly contradicts the design rule in `config.ts:107-112` — *"mistakes
are allowed and recorded, never blocked"*.

### 2. Filling one carbon first makes the other one unreachable **[verified]**
The obvious strategy — finish the left carbon, then the right — bricks the
round. A hydrogen bonded below-right of the left carbon sits in the firing line
from the fixed paper position, and `bondPartnerFor` only looks 187px behind it
(`engine.ts:730-744`), so it always finds the *full* left carbon, never the
free right one. Every throw bounces, forever.

A sweep of 551 aim points found only **21 that work — 3.8% of the table**, all
on one thin diagonal corridor that nothing on screen indicates.
`node .playtest/p10-is-it-recoverable.ts`.

### 3. Retrying quickly after a miss records your *correct* answer as wrong **[verified]**
Throw at the wrong group, then immediately throw at the right one — a
double-click, or simple impatience. Within ~300ms the pending paper-return
timer fires mid-flight, teleports the paper 166px home (`engine.ts:420-428`),
and the throw continues from the new origin into a different group.

Result: `wrongSelections = 2`, score −50, and the learning summary tells the
student *"The carbon family is the bond type… Wrong picks: 2"* — when their
second answer was right. For a teaching product this is the worst available
failure. `node .playtest/a9_race.ts`.

Root cause: `throwPaperAt` doesn't cancel `paperReturnMs`, and the rejected
`setMode(THROW)` return value is discarded (`engine.ts:260`).

### 4. The game's only chemistry lesson has never been on screen **[verified]**
Five phases render **0 frames**, because the engine passes through them inside
a single tick:

- `HYDROGEN_CALCULATION` — *"Each carbon holds four bonds; what is left is for hydrogen."*
- `CARBON_STRUCTURE_READY` — *"The carbon chain is built. Now the hydrogens."*
- `COMPLETION` — *"The molecule is complete."*
- `TIMEOUT` — *"Time up."*
- `MOLECULE_VALIDATION`

The one sentence that explains *why* ethane needs six hydrogens is dead code.
So are both endings: a round finishes by the card text silently swapping
mid-sentence. `node .playtest/p5-dead.ts`.

### 5. The real game is unreachable, and has no exit **[verified]**
`<GameplayFlow />` is rendered with no props (`App.tsx:94`), so the lesson flow
dead-ends at the last frame of the old prototype. The live game exists only at
`?step=play`. Once there: no restart, no "play again", no molecule picker, no
way back to the lessons — the summary is a terminal screen that rejects all
input. Replaying means reloading the tab.

### 6. Unplayable without a mouse **[verified]**
**Zero** keyboard or ARIA attributes across the entire live game and engine.
`LiveGameplay` renders one `<div>` with pointer handlers only, and passes no
`hotspot`, so the single focusable wrapper in the codebase is never created.
Tab does nothing. WCAG 2.1.1 (Level A), total failure.

### 7. The one rule is encoded in colour alone **[verified]**
The three atom SVGs are byte-identical except for one hex value. `elements.ts:11`
states it outright: *"the colour IS the bond type"*. No shape, label, pattern or
text ever backs it up, and no instruction names a colour.

Blue `#0795ff` and green `#69a13b` have **identical relative luminance** (1.00:1)
— on a greyscale display, a washed-out projector, or for an achromatopsic
student they are the same grey disc with the same letter. Under deuteranopia,
red and green both simulate to olive (ΔE 19.1). WCAG 1.4.1 (Level A).

### 8. Unusable with a screen reader
No `aria-live`, `role`, heading, landmark or alt text anywhere. A blind student
hears *"C C C C C H H H H H … 1 colon 5 8 4 5 0 points Meth Eth Prop…"* — no
indication of family, position, time, or that anything changed.

### 9. A 120-second timer with no pause, extension or restart **[verified]**
`config.ts:172`, decremented unconditionally. No pause method exists, no UI
control, no keyboard. WCAG 2.2.1 (Level A) — none of its exceptions apply.
Students who need more time simply run out, every round.

### 10. Three screens teach false chemistry **[verified]**
All traced to Figma copy, faithfully transcribed:

| Screen | Says | Truth |
|---|---|---|
| Ene / Alkene (`suffixFrames.ts:158`, `Alkene/InstructionPanel.tsx:87`) | "**Alkanes** … formed by a **Triple** covalent bond" | Alkene = **double** bond. The same screen's tag says "Double Bond" and draws two lines. |
| Methane, every frame (`common.ts:35`) | "when the **two carbon chain** are formed by a single covalent bond" | Methane is CH₄ — **one** carbon, **zero** C–C bonds. |
| Alkyne card (`Alkyne/BondCardDeck.tsx:291`) | "**Alkyl**" | **Alkyne**. An alkyl is a substituent group — a classic confusion pair, actively created here. |
| Prefix cards "Non" and "Dec" (`prefixes.ts:53,61`) | "when you see **three** carbon…" | non- = 9, dec- = 10. |

---

## Major

**Aiming**
- *"Aim at a free bond"* is wrong advice. The free-bond markers are decorative — `snapIntoPlace`/`freeSlotAngle` pick a slot from the approach angle and never read what you aimed at. Aiming at the markers: 2 of 6 produce no bond and two land on the *other* carbon. Aiming at the carbon body, which has no marker: 5/5. One propane run aiming faithfully at a marker: **34 throws, 0 bonds, timeout**.
- Carbon "selection" is a straight line through the group row, so throwing at the **score display** or at empty sky correctly builds ethane and scores 300. The game's one educational decision can be made right by accident.
- Every failed throw nudges the molecule further away (`transferImpulse` fires on non-bonding hits too). The more you struggle, the harder it gets.

**Feedback**
- A wrong carbon group produces *no* on-screen change at all. The complete scene diff is the clock and a grey score number. The blue "chosen" highlight is cleared in the same tick it's set (`engine.ts:470,485`), so it never renders.
- A missed throw: no sound, no visual, no text. Propane measured 34 of them in one round.
- The word "blue" appears exactly once in the whole player experience — in the summary, after the timer has expired.
- Three of thirteen events make a sound, and two of those are the player's own gesture. The three events meaning *you made a mistake* are all silent and invisible.

**Scoring and the summary**
- Failure can outscore success: `COLLISION_CHAIN_STEP` (+75) is awarded outside the `bonded` check (`session.ts:102`). A timed-out propane run scored **5580**, of which 3900 came from non-bonding bounces — beating a perfect methane at 2200. The summary then *praised* it.
- Wrong-family hydrogen picks are counted **once per round** (`engine.ts:267`), so four identical mistakes report as one.
- The summary misdiagnoses: picking the right colour but wrong carbon count is explained as a colour error. It also blames aim for bounces that were colour errors, because `THROW_MISSED` has no wrong-family reason code.

**Pacing**
- **87% of a clean 17-second round is non-interactive** (14.8s of watching). Propane: 88% of the full 120s. A timer implies urgency; the game spends nine-tenths of it refusing input.
- Ethane demands 13–17 identical two-click actions; propane 17–43.

**Accessibility (beyond the blockers)**
- Browser zoom does nothing: `unit` scales with the CSS viewport, so 200% zoom cancels exactly. At 400% text is *smaller* than at 100%. `touchAction: 'none'` also kills pinch-zoom. WCAG 1.4.4.
- Every atom label fails contrast (white on blue/green = 3.11:1, red 3.88:1, against a 4.5:1 requirement). The score is 3.45:1. Group-box borders are 1.25:1 against a 3:1 requirement.
- The clock's only urgency cue is a hue change at 20s — invisible to the exact people who can't see it, with no size, flash, sound or text change.
- `prefers-reduced-motion` is ignored by the live game entirely.
- No in-game mute. `AudioManager.setMuted()` exists and is never called; `?mute=1` is a dev switch requiring a reload.

**Robustness**
- `tick(NaN)` or one large negative delta freezes the engine permanently — `Math.min(deltaMs, 250)` clamps only the top (`engine.ts:386`). Fuzzer-only in practice (rAF is monotonic), but unrecoverable.
- `throwPaperAt({x: NaN})` passes the zero-vector guard and locks the round for its full two minutes: `outOfBounds` can never be true for NaN.
- `finish()` sets `phase = 'SUMMARY'` directly, bypassing `go()`, so the two transitions that *end the round* emit no `PHASE_CHANGED`. The renderer polls, so it's unaffected — but the audio layer is event-driven, and the next consumer will be caught.

**Chemistry validation**
- `checkMolecule` never checks bond order, saturation or connectivity. It declares C₂H₆-with-a-single-bond a complete *ethene*, accepts carbons with free valencies as a finished propyne, and accepts isobutane as butane. Unreachable today (all three shipped rounds are alkanes) — but `config.ts:176` explicitly invites adding butane, and `elements.ts:21` claims alkenes already work. Both invitations land on this hole.
- The colour-series mapping is an invention that collides with CPK convention (where red = oxygen, blue = nitrogen), and it colours *hydrogen* atoms by series — there is no such thing as an "alkane hydrogen". Defensible as a game device; needs one sentence of honesty on screen.

---

## Minor and polish

- "Bonds made: N" counts the C–C bond, so ethane starts at 1 and finishes at 7 for six hydrogens. No denominator, and the molecule name vanishes from the card for 126 of 167 measured seconds.
- Backgrounding the tab freezes the clock (`Math.min(deltaMs, 250)`), so alt-tabbing to think preserves the whole time bonus — the first student to notice has the best score in the class.
- The summary computes 11 numbers and renders 3, as one run-on paragraph.
- The clock sits on "0:00" for a full second before the round ends.
- The prefix rail never moves during a round — it occupies the position a progress indicator would.
- The loaded atom is still counted in `heldIds`, so the tray is drawn one slot too wide with a hole in it.
- `snapshot()` returns live engine references, not a snapshot: a caller can write `remainingValency = -99` straight into the engine, and every nested object is reference-identical between frames (so any `React.memo` keyed on them silently never updates).
- Timing out mid-action leaves a frozen atom in flight, a half-drawn bond, or a stretched web on the summary screen.
- "Sign OFF with Google" on the sign-in screen (Figma copy).
- "making love" appears on all ten prefix cards (Figma copy). This is a school product.
- Space before the full stop in five shipped strings; "th same family" typo on six frames.
- Completion always says "Alkane -", regardless of series.
- The molecular formula (CH₄, C₂H₆, C₃H₈) is never shown anywhere.

---

## The pattern worth noticing

Most of the worst findings trace to two standing instructions, both of which
were followed faithfully:

1. **"Figma is the source of truth, pixel-perfect."** Every false chemistry
   string above was transcribed accurately from the design. Pixel fidelity
   propagated factual errors into the product, and the transcription comments
   prove it was deliberate. This rule needs an exception for factual content.

2. **"Don't change gameplay."** The aiming model, the free-bond markers that
   can't be aimed at, the soft-locks and the 87% dead air were never
   playtested by a human — they were built to spec and verified against
   *mechanics* tests that always did the right thing. The engine tests pass
   because they collect the correct-family atoms every time.

The two blockers a real student hits first (1 and 2) are both invisible to the
existing 79 tests for exactly that reason.
