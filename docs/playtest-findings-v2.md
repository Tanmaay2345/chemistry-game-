# Playtest findings, second pass

Date: **24 September 2026**. First pass: [`playtest-findings.md`](playtest-findings.md),
which is unchanged and remains the record of what the game did before this work.

Five lenses were re-run against the fixed build, using the same reproduction
scripts under `.playtest/`. Three ran as independent agents (learner,
adversary, chemistry); the game-feel and accessibility agents were cut off by
a session rate limit part-way through, so **those two lenses were re-run by
hand instead** — the same scripts, plus a keyboard and zoom pass in the browser.
That is stated here rather than glossed over: two of the five verdicts below
are mine, not an independent agent's.

Every script in `.playtest/` runs clean. `npm test` is 109 passing (was 79),
`npm run build` and `npm run lint` are unchanged.

---

## How to read the old scripts

Several first-pass scripts print a **hardcoded conclusion** underneath a live
measurement — e.g. `p7-softlock-minimal.ts` prints `=> a click there does
NOTHING, silently.` on the line after `engine.fireWeb(it)  true`. Those
sentences were written when the bug was live and are not re-evaluated. Where
that happens below, the *measured* line is quoted, not the narration.

`a8_confirm.ts` crashed on the fixed build (it dereferenced `flyingId`, which
is now null - which was the proof). It has been guarded so the rest of the
script still runs; nothing else in `.playtest/` was changed.

---

## The ten blockers

| # | Blocker | Result |
|---|---|---|
| 1 | Wrong-coloured hydrogen soft-locks the round | **Fixed** |
| 2 | Carbon fill order bricks the board | **Fixed** |
| 3 | Double-click retry is stolen and recorded as wrong | **Fixed** |
| 4 | Four phases render zero frames | **Fixed** |
| 5 | Live game unreachable / no exit | **Not addressed** (see below) |
| 6 | Zero keyboard and zero ARIA in the live game | **Fixed** for the live game |
| 7 | Colour is the only channel separating the families | **Fixed** |
| 8 | Eight false chemical statements | **Fixed**, and three more found |
| 9 | Scoring inversion: failure can out-score success | **Fixed** |
| 10 | Free-bond markers are decorative; aim does not decide the target | **Fixed** |

### 1. Wrong-coloured hydrogen soft-lock — Fixed

*Previous issue.* Collecting a red hydrogen made the round unwinnable with 108s
left. `validate()` only reopened collection when the tray was empty
(`engine.ts:894`), and `missThrow` refilled the tray with the atom that could
never bond (`:835`).

*Root cause.* Two rules that were individually reasonable and jointly a trap: a
wrong-family atom may be collected (`allowWrongFamilyCollection`) but can never
bond (`wrongFamilyBlocksBonding`), and a missed throw always returns to the
tray. Nothing ever emptied the tray, and an un-empty tray closed the row.

*Fix.* Three changes, none of which disable the wrong hydrogen:
- `hydrogenCollectionOpen()` replaces the two-phase check: the row is open for
  as long as the molecule is short of hydrogen, whatever is in hand.
- `returnToRow()` — a wrong-family atom that fails to bond goes back to the
  **row** it came from, not the tray, and the tray closes up behind it.
- The tray is capped at the molecule's hydrogen count; a full tray is emptied
  by throwing, and a throw always resolves, so it cannot deadlock.

*Verification.* `node .playtest/p7-softlock-minimal.ts` → `engine.fireWeb(it)
true` (was `false`). `node .playtest/p3-hydrogen-wrong.ts` → `>>> DEAD END:
false`. Regression tests: *a wrong-family hydrogen costs a throw, not the
round*; *a round spent on wrong-family hydrogens can still be finished*.

### 2. Carbon fill order bricks the board — Fixed

*Previous issue.* Filling the left carbon first left the right carbon
unreachable: 21 of 551 aim points (3.8%) could bond.

*Root cause.* Two separate faults.
- A free bond marker is drawn one bond length (104px) out from the carbon, but
  contact only happened at the carbon's own edge (~67px). **An atom aimed
  exactly at the marker flew through the slot and never touched anything.**
- A hydrogen already bonded on was a solid body, so it blocked the straight
  line from the paper's dock to the free bonds behind it.

*Fix.* `slotContact()` — a free bond catches an atom that reaches it, using the
same `bondTargets()` list the renderer draws, so a marker is a target. And a
flying atom passes through a **bonded hydrogen** (a cap, not a wall); it still
collides with carbons and with loose atoms, so a throw still shoves the
molecule and a loose atom still passes motion on.

*This is a change to what a projectile collides with* — the only gameplay-physics
change in this work, made deliberately and scoped to bonded hydrogens.

*Verification.* `node .playtest/p6-aim-at-free-bond.ts` → all 6 ethane and all 8
propane markers bond, and each bonds to **its own carbon**. `node
.playtest/v2-aim-at-markers.ts` → `bonded: 3/3, landed in the slot aimed at:
3/3` from the previously-bricked board. `node .playtest/p10-is-it-recoverable.ts`
→ 22.3% of the table (was 3.8%). Regression tests: *every free bond marker the
game draws can be thrown into*; *a hydrogen already bonded on does not shield
the bonds behind it*.

### 3. Double-click retry race — Fixed

*Previous issue.* A retry within ~300ms of a miss was stolen: the paper
teleported home at frame 18, the correct answer was recorded as
`WRONG_ATOM_SELECTED`, `wrongSelections` went to 2 and the score dropped 50.

*Root cause.* `throwPaperAt` did not cancel the 300ms return animation, so the
throw left from wherever the paper happened to be and was then snapped home
mid-flight. `setMode(paper, 'THROW')`'s return value was discarded, so an
illegal mode change passed silently.

*Fix.* A retry cancels the return first and always throws from the dock; the
mode change is checked and a refused one refuses the throw.

*Verification.* `node .playtest/a9_race.ts` → every delay from 0ms to 400ms now
gives `bonds=1 wrongPicks=1 score=275`, identical. `node .playtest/a10_oob.ts`
→ identical across all five delays. Five named regression tests:
*a retry during the paper's return is accepted*; *…hits the group it was aimed
at*; *…is not recorded as a second wrong answer*; *the outcome of a retry does
not depend on how fast the player clicked*; *the paper never teleports out from
under a throw in flight*.

### 4. Four phases render zero frames — Fixed

*Previous issue.* `HYDROGEN_CALCULATION`, `CARBON_STRUCTURE_READY`,
`COMPLETION` and `TIMEOUT` were entered and left inside a single tick. The
hydrogen count arrived as a number with no working behind it.

*Root cause.* Nothing held them. They were checkpoints in `validate()`, not
beats.

*Fix.* A hold mechanism (`holdThen` / `runHold`), configured in
`config.ts`'s new `teaching` block: 1100ms, 2600ms, 1400ms, 1400ms. **The round
clock stops while a beat is held**, so reading is never paid for out of the
player's time, and **any click or keypress skips it**.

*Verification.* `node .playtest/p5-dead.ts` → `CARBON_STRUCTURE_READY 201
frames`, `HYDROGEN_CALCULATION 121 frames`, `COMPLETION 134 frames`.
`node .playtest/v2-timeout-and-winnable.ts` → `TIMEOUT drew 84 frames (1.40s)`.
Regression tests: *the beats that teach are on screen long enough to read*;
*reading a teaching beat is not paid for out of the round clock*; *a teaching
beat can be clicked past rather than waited out*.

`MOLECULE_VALIDATION` still renders 0 frames. It is an internal checkpoint with
no content of its own — its card duplicates the throwing card — and it is left
as is deliberately.

### 5. Live game unreachable / no exit — Not addressed

`App.tsx:94` still renders `<GameplayFlow />` with no props, and the live game
is still only reachable at `?step=play`. The summary screen still has no
restart. This is a routing and shell question rather than a gameplay defect,
and it was left for a decision about how the game should be entered from the
lesson flow. **It is the one blocker from the first pass that is still open.**

### 6. Keyboard and screen reader — Fixed for the live game

*Fix.* `GameControls.tsx` puts a layer of real `<button>` elements over the
carbon sets, the hydrogen row and the free bond markers, and one over the card
while a teaching beat is held. They are drawn with `pointer-events: none`, so
mouse play goes straight through to the play surface unchanged, but they take
focus and activate from the keyboard. `announce.ts` supplies a live region; the
instruction card is a `role="status"` region, so the instruction and the reason
a throw failed are both read out.

*Verification, by hand.* Tab reaches every carbon set; the focus ring is drawn
(screenshotted); Enter throws; the explanation appears and is announced. The
accessible names are, verbatim: `Carbon set 1: 2 carbons - blue (alkane, single
bond), red (alkene, double bond). Throw the paper here.` / `Hydrogen 3: blue
(alkane, single bond). Collect it.` / `Free bond on carbon 2, top. Throw the
hydrogen here. 4 of 6.` The status line reads e.g. `Building ethane. 0 of 6
hydrogens bonded, 2 collected and waiting. One is loaded, ready to throw. 300
points, 1 minutes 35 seconds left.`

**Still open:** only the live game has this. The onboarding, prefix, suffix and
rail screens were not given keyboard or ARIA treatment in this pass.

### 7. Colour-only encoding — Fixed

*Previous issue.* The three atom SVGs differ only by hex, and blue `#0795ff`
and green `#69a13b` have identical relative luminance (1.00:1) — to a
colour-blind player two of the three sets were indistinguishable.

*Fix.* Every atom in a pool carries the bond its family stands for, written
above it as one, two or three strokes (`–`, `=`, `≡`) — the notation the bond
itself is drawn in. A legend sits under the pool: `blue: alkanes, single bond ·
red: alkenes, double bond · green: alkynes, triple bond`. Every keyboard
control names the family and what it means.

### 8. False chemical statements — Fixed, and three more found

All eight from the first pass are corrected, and every factual sentence now
comes from one module, `src/content/chemistry.ts`. **Figma remains the source of
truth for layout and is explicitly not the source of truth for chemistry** —
each correction names the Figma node it overrides in a comment.

The chemistry agent then found three more, two of them in the *corrections*:

- The first correction said "when the carbons in the chain are joined by a
  double covalent bond" for alkenes. That describes a cumulene — every bond
  double — not an alkene. Now: alkanes are defined by **every** C–C bond being
  single; alkenes and alkynes by **at least one** being double or triple.
- The hydrogen working said "each carbon-carbon bond uses two of them" while
  summing bond *orders*. Correct for alkanes, wrong for anything else. Now
  "each shared pair uses two of them".
- The suffix screen's job is teaching the ending, and its ANE card was the one
  card Figma got right. The ENE and YNE cards now match it rather than carrying
  a series definition.

Two further chemistry faults were found and fixed in the engine, not the copy:

- **`checkMolecule` never checked bond order or valency.** An ethene built with
  a *single* C–C counted as complete — the same atoms, a different compound —
  and a chain with three open valencies counted as a finished molecule. It now
  checks the chain's bond orders against the name and refuses anything with a
  bond still to give. Regression tests: *a molecule with the wrong bond order is
  not the molecule that was asked for*; *a chain with bonds still to give is not
  finished*.
- **The summary misdiagnosed mistakes.** A player who picked the right colour
  and the wrong *number* of carbons was lectured about colour — told to correct
  the one thing they got right. Mistake reasons are now recorded by kind and
  the summary says which rule was actually broken.

**Still open, design-level:** the hydrogen row is colour-coded by family, and
the copy says a red hydrogen belongs to the double-bond family. Hydrogen is
monovalent and can only ever form a single bond, so "a double-bond hydrogen" is
not a real thing. The mechanic is legible and the copy is consistent with the
game's own stated rule that colour *is* bond type, but a chemist will object.
Resolving it means either dropping families from hydrogen or re-wording the
colour to mean "which molecule this belongs to". **Not changed here, because it
is a design decision, not a typo.**

### 9. Scoring inversion — Fixed

*Root cause.* `session.ts:102` awarded `COLLISION_CHAIN_STEP` (+75) outside the
`bonded` branch, so bouncing atoms off the molecule paid as well as building
with it.

*Fix.* The chain bonus is paid only when the chain ends in a bond.

*Verification.* `node .playtest/07-farm.ts` → a whole round spent farming
wrong-family throws scores **105** (`chain-step awards: 1` — and that one
bonded); `node .playtest/09-chain.ts` → `chain-step awards from NON-bonding
bounces: 0`. Regression tests: *a round that runs out of time cannot out-score
one that finishes* (same molecule, best failure vs worst completion); *a contact
that forms no bond pays nothing*.

`08-scorebreak.ts` still prints `a FAILED propane scores 3545; a COMPLETED
methane scores 2275`. That line is stale narration: its own output two lines
above now reads `propane: completed`. The round it was built to fail now
succeeds, because of fix 2. Propane out-scoring methane is a bigger molecule
scoring more, not failure out-scoring success.

### 10. Aim and the free-bond markers — Fixed

Covered under 2. In addition: `bondPartnerFor` now ranks candidate carbons by
distance to the **point the player threw at**, not to the projectile, and
`freeSlotAngle` picks the slot nearest the aim rather than the approach. A
carbon only catches a throw that was aimed at it (within 1.5 bond lengths), so
a throw across the table no longer bonds to whatever it grazed. The marker the
pointer is over is ringed before the throw.

`freeSlotAngles` also had a real bug: it asked for the whole connected group,
so on a chain the far carbon's hydrogens blocked slots on this one. It now uses
direct bonds only — which is also what the renderer draws, so engine and
screen now agree about which bonds are free.

---

## Also fixed, from the first pass's "major" list

| Issue | Result | Evidence |
|---|---|---|
| `tick(NaN)` / large negative delta froze the engine permanently | Fixed | `a1_hostile.ts`: engine live after `tick(NaN)`, `tick(-1000)×10`, 200k `tick(0)` |
| `throwPaperAt({x: NaN})` locked the round | Fixed | `a2_freeze.ts` A2.4: refused, `phase after 5s = CARBON_SELECTION` |
| `finish()` emitted no `PHASE_CHANGED` | Fixed | `a4_events.ts`: `silent transition: false`, `PHASE_CHANGED chain breaks: 0` |
| `snapshot()` returned live engine references | Fixed | every mutable part is copied; a test that relied on a live reference had to be rewritten, which is the proof |
| SUMMARY left an atom in flight / a web out / a collision playing | Fixed | `a6_fuzz.ts` 400 runs `invariant failures: 0`; `a7_deep.ts` 1200 runs `failures=0` |
| The card said "Bonds made: N" with no total | Fixed | now `Bonds made: 3 of 7. Aim at a free bond marker.` |
| The time bonus arrived as a silent jump | Fixed | completion card: `Complete, with 52s to spare - that is 260 bonus points.` |
| The tray drew a permanent empty slot for the loaded atom | Fixed | the loaded atom is drawn on the paper, not counted as waiting |
| `HYDROGEN_SELECTION → THROWING` missing from the state machine | Fixed | latent; unreachable today, but it would have swallowed a winning throw |
| Browser zoom did nothing | Fixed | `DEFAULT_MIN_UNIT = 0.6`; at 200/300/400% the unit floors at `0.6000` and the host scrolls |

---

## Still reproducible, and not fixed

These are recorded as-is. None is a completion blocker.

1. **The live game is still only at `?step=play`, and there is no restart.**
   Blocker 5 above. The one first-pass blocker left open.
2. **Zoom needs two-dimensional scrolling.** At 200% and beyond the page
   scrolls both ways. A single fixed artboard cannot satisfy WCAG 1.4.10
   without reflowing the design, which is out of scope here. Zoom now magnifies,
   which it did not before; it is not yet compliant.
3. **Only the live game is keyboard-accessible.** The onboarding, prefix,
   suffix and rail screens were not touched.
4. **A failed throw takes ~4.1s to play out** (`p5-fail.ts`), with no sound and
   no card change while the atom rolls to a stop. It is dead time on the one
   action that most needs feedback.
5. **The clock still has a single warning**, one colour change at 20s
   (`p5-clock.ts`), and sits on `0:00` for 1.4s before the summary.
6. **A backgrounded tab is a free pause**: `30s of wall clock in a backgrounded
   tab costs the game clock: 0.25s` (`p5-clock.ts`). `requestAnimationFrame`
   stops; the engine has no wall-clock source.
7. **Hydrogen families are chemically questionable.** See 8 above.
8. **The back cards of the alkene and alkyne decks** were reading "Alkane".
   They are occluded by the front card, so nothing wrong was visible — they have
   been corrected anyway, but the decks remain three hardcoded copies of one
   layout.

## New regressions introduced by this work

One, found by the learner agent and fixed before this was written:

- Making slots catch atoms initially made **aim stop mattering** — a throw
  bonded to any free bond it flew past. Tightened: a slot only catches an atom
  thrown at that carbon. Ethane markers went from `c7@-90 -> BOND (onto c6)` to
  `c7@-90 -> BOND (onto c7)`.

And one behaviour change that is intended but worth naming: **a flying atom no
longer collides with a bonded hydrogen.** This is the only change to the
physics. Chain collisions through loose atoms are unaffected and still tested
(`one throw can set off more than one collision`).

## What held up, again

- 1200 deep-fuzz runs / 1,993,842 steps: `failures=0`.
- 400 hostile-input fuzz runs / 347,881 steps: `invariant failures: 0`.
- Rigid-body settling, the hydrogen formula across all 30 series × chain-length
  combinations, and the carbon-impact beat order are all unchanged and still
  pass.
