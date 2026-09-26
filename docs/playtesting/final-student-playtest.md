# Final Student Playtest

Date: **24 September 2026**. No code was changed during this pass.

## 0. How this was played, and one honest caveat

Played by clicking what is on screen, from `http://localhost:5173/`, without
using engine handles to solve anything. Two things had to be worked around, and
both are recorded as findings rather than hidden:

1. **I could not reach the game the intended way.** The guided walkthrough
   dead-ends (Finding B1). To carry on I typed `?step=play`, which a student
   would not know. Everything from section 6 onwards was only reachable that way.
2. **The host reports the page as hidden.** This desktop app's browser pane
   returns `document.visibilityState === 'hidden'` while focused and accepting
   clicks, so the game sat on its "Paused" card and never ran. I overrode
   `visibilityState` to play. That override also made `requestAnimationFrame`
   deliver large backlogged frames, so **game time ran roughly ten to twenty
   times faster than wall time** in parts of this session. Anything that depends
   on real elapsed time - chiefly the 20-second warning - could not be judged
   here, and is marked UNVERIFIED rather than passed or failed.

---

## 1. Student Profile

First-time student, no developer knowledge. Has been told the game teaches
naming carbon compounds. Reads what is on screen, clicks what looks clickable,
and guesses when nothing says otherwise.

## 2. Complete Journey

**Entry.** A ruled-paper page, a ghosted outline title "Learn Nomenclature BY
playing" with what look like selection handles at its corners, a molecule
labelled "C2H4 - Ethene", and one card: **"Sign OFF with Google"**. Nothing says
"Start". I clicked the only card.

**Carbon intro.** "WHAT IF YOU ARE CARBON? / You have a responsibility to make
the meaningfully bond with the other carbon atoms to form the carbon compounds ."
No Next button, no arrow, nothing marked as a control. I clicked empty space
first - nothing. Then the card - which advanced. From here on I assumed "the
card is Next", and that assumption held for the rest of the lessons.

**Valency.** A carbon with four hydrogens, a chip "Atomic No - 6", and the
heading **"How many bond can carbon make ?"** - whose body is the previous
screen's sentence repeated word for word. The question is never answered in
text. I inferred "four" from the picture.

**Prefixes.** A rail of Meth…oct with a badge showing "1c", "2c" and so on, auto
-playing one prefix per ~2.5s with a card: "METH / when you see one carbon making
love with another carbon or hydrogen ." This was the clearest thing so far - the
badge makes prefix-to-carbon-count unambiguous. It ran to "DEC / 10c" and then
stopped. I waited about ten seconds with no prompt before guessing the card again.

**Bonds.** Three screens - Alkane (blue, "Single carbon To Carbon bond"), Alkene
(red, double), Alkyne (green, triple). Clear and consistent.

**Suffixes.** Three screens - ANE / ENE / YNE - each with a "Single bond" /
"Double Bond" / "Triple bond" tag and a carbon pair drawn with literally one,
two or three lines between them. **This is the best teaching in the app.**

**Walkthrough.** Clicking on from the YNE screen landed me in a guided methane
demonstration. Three steps in, it stopped and I could not get out of it (section 5).

**Game (reached only by typing a URL).** "Make Ethane / Throw the paper at the
carbon set of the same family of colour", four carbon sets, a clock at 2:00, and
a colour legend. I deliberately picked wrong first, got a genuinely good
explanation, then picked right, watched the pair bond, saw the hydrogen sum,
collected hydrogens, threw them, and finished the molecule. I also ran a round
to timeout and restarted from both endings.

## 3. What Was Immediately Understandable

- **The objective.** "Make Ethane" with "Eth" lit in the rail, and the prefix
  lesson still fresh, is unambiguous.
- **Which carbon set to choose.** "Eth" = 2 carbons, "-ane" = single = blue,
  and exactly one set is two blue carbons. Good puzzle, all the information on
  screen.
- **The colour legend** under the sets: "blue: alkanes, single bond · red:
  alkenes, double bond · green: alkynes, triple bond".
- **The `–` / `=` / `≡` marks over carbons** and **`ane` / `ene` / `yne` over
  hydrogens** - a second way to tell the sets apart.
- **Throwing the paper.** After clicking a set, the paper visibly flies from its
  dock to the target. There is no doubt about what just happened.
- **The collision and bond.** The two carbons are struck, pushed, and joined,
  then laid out as a chain. Legible.
- **"Bonds made: 3 of 7"** - the denominator makes progress meaningful.
- **Both endings.** "ethane complete - 2820 points" and "Time up - 1560 points",
  each ending "Click this card to play again."
- **Pause and resume.** "Paused / This tab is in the background, so the clock has
  stopped. Come back to carry on." then "Resumed." on return. Clear, and the
  clock was exactly where I left it.

## 4. What Required Guessing

| Guess | What the screen said |
|---|---|
| That the instruction card is the Next button | Nothing. No arrow, no label, no hover cue. Learned by trial on screen 1. |
| That carbon makes four bonds | The screen asks and does not answer. |
| That the prefix rail had finished | It simply stops on DEC with no prompt. |
| That "family" means the colour set | "family" appears in the gameplay card; the lessons only ever say alkane/alkene/alkyne and show colours. The legend is the only bridge, in ~10px type. |
| How to throw - click, or drag? | Never stated. I guessed a click. |
| That collecting a hydrogen arms a throw | Nothing says the mode changed. |
| Which slot a hydrogen would land in | The ring highlights a marker, but one throw landed in a different slot (§9). |

## 5. Where the Student Could Get Stuck

**The walkthrough, permanently.** This is the one place the student cannot get
out of. Detail in §6, B1.

**The hydrogen phase, briefly.** After collecting one hydrogen the card changes
to "Throw the hydrogen ." while the row still looks fully interactive. I clicked
a row hydrogen expecting to collect a second one; nothing visible happened. It
reads as an unresponsive game for a moment.

## 6. Gameplay Interaction Findings

**B1 — BLOCKER. The guided walkthrough dead-ends, and it is the only route from
the lessons into the game.**

Reproduced twice, once from a clean load of `?step=gameplay`:

| Step | Card | What advanced it |
|---|---|---|
| 1 | "Alkane - Methane / when every carbon-carbon bond…" | the card |
| 2 | "Select the hydrogen of same family and throw the paper" | a hydrogen in the row |
| 3 | "Select the hydrogen of same colour by using the paper arrow ." | a hydrogen in the row |
| 4 | *(no instruction - only "Alkanes / when every carbon-carbon bond in the chain is a single covalent bond .")* | **nothing** |

At step 4 the board shows a carbon with two hydrogens bonded and two waiting by
the paper. I clicked, by hand: the card, the carbon, the paper, the hydrogen
row, and the waiting hydrogens. Then I swept roughly 500 click points across the
whole play area. Nothing advanced it. After activating the one remaining
focusable element, the page had **zero** buttons or focusable elements left.

There is no skip, no "next", and no menu. Browser Back returns to the suffix
screen, whose only forward path is the same dead end. A first-time student
cannot reach the game.

**B2 — BLOCKER in embedded contexts. The pause depends on
`document.visibilityState` alone.** In this host the document reports `hidden`
while the page is focused and receiving clicks, so the game shows "Paused" and
never advances. Any embedding that behaves this way - a webview, some kiosk or
iframe setups - leaves the game permanently paused and unplayable. In an
ordinary browser tab the same logic is correct.

**C1 — CORE GAMEPLAY CONFUSION. Web mode and throw mode look identical.**
Collecting a hydrogen silently loads it onto the paper and arms a throw. The
next click anywhere throws it. I intended to collect a second hydrogen and
instead threw the one I was holding at the hydrogen row - while the card still
read "Make the spiderweb . / Collect the hydrogen. 1 / 6". The only indicator
that the mode changed is a small disc resting on the paper.

**C2 — CORE GAMEPLAY CONFUSION. The hydrogen row overlaps the carbons' free
bond markers.** Observed at all three viewports. The carbons' lower markers run
down through the band the hydrogen row occupies. The markers are throw targets
and the row atoms are collect targets, so one click in that band is ambiguous.
This is the direct cause of C1 biting.

**C3 — MINOR UX. The final tally said "Throws that did not land: 4"** when I was
aware of making about two. Consistent with C1 and C2: some of my collect clicks
were throws.

**C4 — MINOR UX. Nothing says how to throw.** "Throw the paper at the carbon
set" does not say whether to click, drag or flick.

**C5 — MINOR UX. The web has an unsignalled delay.** Between clicking a hydrogen
and it arriving, further clicks are dropped. One of my clicks appeared to do
nothing and then took effect seconds later.

## 7. Chemistry Learning Findings

**L1 — LEARNING CONFUSION. "How many bond can carbon make ?" is asked and never
answered.** The body is the previous screen's sentence repeated verbatim. The
chip on the same screen reads "Atomic No - 6", so the only number offered is 6,
which is not the answer. Everything later - the hydrogen sum, the free-bond
markers - depends on the student knowing it is 4.

**L2 — LEARNING CONFUSION. The walkthrough tells the student something untrue
about methane.** Its card reads "Alkane - Methane / when every carbon-carbon
bond in the chain is a single covalent bond ." Methane has one carbon and no
carbon-carbon bond. The live game words the same moment correctly ("One carbon,
with four bonds to fill"), so the two halves of the app disagree.

**L3 — LEARNING CONFUSION. "family" is never taught.** The gameplay card says
"the same family of colour"; the lessons say alkane, alkene, alkyne and show
colours. The legend under the sets is the only place the two vocabularies meet,
and it is the smallest text on screen.

**L4 — VISUAL POLISH with a learning cost. The first line of the hydrogen sum is
clipped.** At 1440×900 the working renders under the prefix rail and its first
label, "2 carbons, 4 bonds each", is cut off behind it. The sum therefore opens
with a bare "4 × 2 = 8" - and the 4 and the 2 are exactly the two numbers that
label was there to explain. The remaining lines render cleanly.

**L5 — MINOR UX. "making love with another carbon or hydrogen"** appears on all
ten prefix cards. A student will notice it; a teacher will notice it harder.

**What the chemistry got right.** The three bond screens and the three suffix
screens teach the colour-to-bond-order mapping three times over, and the suffix
screens draw one, two and three lines between the carbons. By the time the game
asks for "the same family of colour", a student who read them has what they need.
The propane card - "3 carbons, joined by single covalent bonds - that is what the
"-ane" ending means" - ties structure back to the name at exactly the right moment.

## 8. Paper / Web Interaction Findings

- The paper's two jobs are never named. It is a paper plane that sometimes
  shoots a dotted line at the row and sometimes launches a disc. Both are
  visible when they happen; neither is announced before.
- The web itself reads well once fired - the dotted line to the atom and the
  atom travelling back are unambiguous.
- There is no resting-state cue for which mode the paper is in beyond whether a
  disc is sitting on it (C1).

## 9. Collision / Throw Findings

- **The carbon collision is the best moment in the game.** Paper flies, strikes,
  the pair is pushed, compresses, then bonds and settles into a chain. Cause and
  effect are completely legible.
- **The aimed-marker ring works.** Pointing near a free bond draws a ring on it,
  so you know what you are aiming at before you commit.
- **One throw did not land where the ring said.** I aimed at the left carbon's
  top marker, the ring highlighted that marker, and the hydrogen bonded into the
  left slot instead. **UNVERIFIED** - I could not re-test cleanly because of the
  timing problem in §0, and I saw only this one instance. Recorded so it can be
  checked deliberately, not asserted as a defect.
- Misses return the atom and the card explains ("That throw landed on nothing.
  Aim along the line to one of the free bond markers."). The round never felt
  lost after a miss.

## 10. Hydrogen Interaction Findings

- "ethane needs 6 hydrogen atoms, from the same set as its carbons. A colour
  says which set an atom belongs to. Hydrogen always makes a single bond,
  whatever colour it is." - accurate and answers the obvious objection before a
  student raises it.
- The `ane` / `ene` / `yne` badges over the row are clear.
- The collect counter "Collect the hydrogen. 1 / 6" is clear.
- C1 and C2 both land in this phase, and it is where the only real in-game
  confusion happened.
- A completed ethane draws correctly: three hydrogens on each carbon plus the
  carbon-carbon bond.

## 11. Timer Findings

- The clock is visible, top right, in minutes:seconds, and turns **red** near
  the end. I saw it red at 0:16 and 0:01.
- **The 20-second warning is UNVERIFIED in this run.** Because of the timing
  problem in §0 the clock jumped from 1:12 to 0:01 between two screenshots, so I
  never saw the notice in live play. It is not reported as working or broken.
- **Timeout is understandable.** "Time up - 1560 points", the reason ("Throws
  that did not land: 4. Aim at one of the free bond markers on a carbon."), and
  the unfinished molecule left on screen so you can see what you were short of.
- **Restart works from both endings** and the next round starts at 2:00 with a
  clean board and zero score.
- The clock correctly **stops** during the teaching beats and while paused.

## 12. Responsive Findings

Played a carbon selection and a carbon throw at all three sizes, and a hydrogen
collect and throw at two of them.

| Viewport | Result |
|---|---|
| 1366 × 768 | Everything on screen, nothing clipped. Clicked the 2-blue set; **that** set was struck. Collected a hydrogen and threw it; round completed. |
| 1440 × 900 | As above. The one clipping problem is L4, the first line of the hydrogen sum behind the rail. |
| 1920 × 1080 | Played propane. Clicked the 3-blue set; **that** set was struck, chain of three formed. |

**The visual target matched the actual target for carbon-set selection at all
three sizes.** No misaligned clicks were observed anywhere.

The hydrogen-row / bond-marker overlap (C2) is present at all three, and is
tightest at 1366 × 768.

## 13. Audio Findings

Not assessed. This session ran without usable audio output, so no claim is made
about the sounds either way.

## 14. Remaining Problems

**BLOCKER**
- B1 The guided walkthrough dead-ends; the game is unreachable through the
  intended flow.
- B2 The pause keys on `visibilityState` alone, so any host reporting
  hidden-while-visible leaves the game permanently paused.

**CORE GAMEPLAY CONFUSION**
- C1 Web mode and throw mode are indistinguishable.
- C2 The hydrogen row overlaps the free-bond markers.

**LEARNING CONFUSION**
- L1 "How many bond can carbon make?" is never answered.
- L2 The walkthrough's methane card describes a bond methane does not have.
- L3 "family" is used in the game but never taught.
- L4 The first line of the hydrogen sum is clipped behind the rail.

**MINOR UX**
- C3 The miss tally exceeds what the student thinks they did.
- C4 How to throw is never stated.
- C5 The web's reel delay silently drops clicks.
- U1 No affordance marks the instruction card as the Next control.
- U2 The prefix rail ends with no prompt.
- U3 "Sign OFF with Google" on the entry screen, before signing in.
- L5 "making love with another carbon" on all ten prefix cards.

**VISUAL POLISH**
- U4 The title renders as ghosted outline text with what look like selection
  handles.
- U5 "oct" is lower case among otherwise capitalised rail chips.

**UNVERIFIED — needs a deliberate check**
- The 20-second warning in live play.
- One hydrogen throw landing in a slot other than the highlighted one.

## 15. Recommended Fix Queue

1. **B1** - the walkthrough dead end. Nothing else matters until a student can
   reach the game.
2. **B2** - decide what "paused" should key on, so the game is not bricked in an
   embedded host.
3. **C1 + C2** - the collect/throw ambiguity and the overlap that causes it.
   These are one problem wearing two hats.
4. **L1** - answer the valency question on the screen that asks it.
5. **L2** - make the walkthrough's methane card agree with the live game's.
6. **L4** - stop the first line of the hydrogen sum being clipped.
7. **L3** - introduce the word "family", or use the lessons' vocabulary in the game.
8. **Verify** the 20-second warning and the aim-versus-slot observation in a
   browser without the timing problem described in §0.
9. Everything under MINOR UX and VISUAL POLISH.

---

# Final Verdict

**1. Can a first-time student understand what they are supposed to do?**

In the lessons and in the game itself, yes. The prefix rail, the three bond
screens and the three suffix screens teach the two things the game asks for -
how many carbons, and which colour - and the game's own cards restate them at
the moment they are needed. The gap is between screens, not inside them: nothing
tells the student that the instruction card is how you move on.

**2. Can they complete the gameplay without developer assistance?**

**No - they cannot reach it.** The walkthrough that sits between the lessons and
the game cannot be completed, and there is no way past it. Once inside the game,
yes: I completed ethane and propane, recovered from wrong picks and misses, hit
a timeout, and restarted, all from on-screen information.

**3. Where do they most likely hesitate?**

At the end of each lesson screen, looking for a Next button. At the end of the
prefix rail, which stops with no prompt. And on first arriving at the carbon
sets, working out that "same family of colour" means the blue ones.

**4. Where can they get stuck?**

Permanently at walkthrough step 4. Briefly in the hydrogen phase, when the row
stops responding because the paper is already loaded.

**5. Are there any actual blockers?**

Two. The walkthrough dead end (B1), which stops every student on the intended
path. And the visibility-based pause (B2), which stops every student in a host
that reports the page as hidden - including the one this playtest ran in.

**6. What should be fixed before deployment?**

B1, B2, and the C1/C2 pair. B1 and B2 make the game unreachable or unplayable;
C1/C2 is the only confusion that actually cost me progress while playing. L1,
L2 and L4 are cheap and directly affect what the student learns.

**7. What can safely be deferred?**

All MINOR UX and VISUAL POLISH items - the sign-in wording, the missing Next
affordance, the prefix rail's silent ending, the reel delay, the ghosted title,
the lower-case "oct", and the prefix-card phrasing. None of them stopped or
misled me once I was playing. The two UNVERIFIED items should be checked before
being either fixed or dismissed.


---

# Critical UX Fix Pass

Date: **24 September 2026**. Three student-facing issues from the playtest
above, fixed and re-verified. Nothing else was changed.

`npm test` **145 passing** (was 135), build clean, lint unchanged, 55
reproduction scripts run, fuzz `invariant failures: 0`.

## 1. Lesson to gameplay dead end

**Original observation.** The guided walkthrough stopped part-way. The card
gave no instruction, clicks on the card, the carbon, the paper, the hydrogen
row and the collected hydrogens all did nothing, and eventually the page had
zero clickable or focusable elements. It is the only route from the lessons
into the game, so a first-time student could not reach gameplay at all.

**Root cause.** Found by instrumenting the live DOM, not by reading the step
list. Each step names one scene element as its hotspot, and
`GameplayScene` wraps that element in

```
<div className="sceneHotspot" role="button" tabIndex={0} style={{ display: 'contents' }}>
```

`display: contents` generates **no box**. Measured at the stuck step:

```
scene:            methane-10
hotspot wrapper:  rect 0x0            <- no hit area of its own
hotspot child:    the paper, 129x67 at (191,562)
element on top at the child's centre: a 54x50 disc
insideHotspot:    false               <- the click never reaches the wrapper
```

At `methane-10` the loaded hydrogen is drawn **on top of** the paper as a later
sibling. A click at the paper's centre lands on the hydrogen, which is outside
the hotspot, so nothing bubbles to the handler and the step never advances. The
same `display: contents` is why the step also reported no focusable element.

**Change made.** One prop, `onCardAdvance`, on `GameplayScene`, passed by
`GameplayFlow`. The instruction card now advances **every** walkthrough step,
not only the steps that name the card. The element hotspots are untouched and
still work; they are simply no longer the only way on. The card is the control
every lesson screen before this one already uses, so it is the thing a learner
has been trained for six screens to reach for - no new UI was added.

**Browser verification.** From a clean load of the walkthrough, clicking the
card repeatedly:

```
methane-01 ... methane-10 ... methane-16, ethane-01 ... ethane-15 => ?step=play
final: step=play, scene=live-CARBON_SELECTION
```

18 card clicks, no stall, `methane-10` included. Then again as part of the full
first-time-student run below.

**Regression tests.** *the walkthrough ends on a step that hands over to the
game*; *every walkthrough step is one the learner can be moved off*.

**Final result.** Fixed. The walkthrough runs to its end and hands over.

## 2. Hydrogen collect versus throw

**Original observation.** The card said "Collect the hydrogen. 1/6". Clicking a
second hydrogen threw the one already held instead of collecting. The end-of
-round tally reported four throws the student had not knowingly made.

**Root cause — two parts.**

*Behavioural, and the one that did the damage.* `LiveGameplay`'s pointer handler
read a refused pick as a throw:

```
const collectable = engine.collectableAt(point);
if (collectable && engine.fireWeb(collectable.id)) return;   // pick failed ->
if (engine.canThrow()) engine.throwAt(point);                // ... fall through
```

`fireWeb` refuses while a web is still reeling and when the tray is at its cap,
so a click squarely on a hydrogen became a throw **at the hydrogen row**.

*Geometric, which hid the consequence.* The row box is y 561-648; the carbons'
lower bond markers run to y 577 with their capture point at y 571. The two
overlap by about 16 design pixels, so an errant throw at the row often bonded
straight away and the student never saw a mistake.

*Wording.* The card kept saying "Collect" while a hydrogen was already on the
paper armed to throw, so the screen described the previous step.

**Change made.**
- A click inside the hydrogen row is a pick from the row and is **never** re-read
  as a throw. New engine query `isCollectionArea(point)`; the handler returns
  after a pick whether or not the pick succeeded.
- The drawn row box and the clickable row box now come from one function,
  `hydrogenRowBox()`, so they cannot drift apart.
- A pick refused because the tray is full now says so, through the existing
  explanation line: *"Your paper is already holding a hydrogen. Throw that one
  at a free bond first, then collect the next."*
- The card names the state it is actually in:
  - nothing held: **"Make the spiderweb . / Click a hydrogen in the row to collect it. 0 / 6"**
  - one held: **"Throw the hydrogen . / Collected 1 of 6. One is on the paper - click a free bond marker to throw it."**

The mechanic is unchanged: collect, arm, aim, throw, bond.

**Browser verification — the exact sequence that broke, at each viewport.**
Collect one hydrogen, then click another hydrogen in the row:

| Viewport | Result |
|---|---|
| 1440 x 900 | Nothing thrown, score unchanged at 350, card reads "Collected 1 of 6. One is on the paper - click a free bond marker to throw it." |
| 1366 x 768 | Same - nothing thrown, score 350, same card. |
| 1920 x 1080 | Same - nothing thrown, card reads "Click a hydrogen in the row to collect it." |

Then a normal throw at a free bond marker bonded and the counter advanced
("Bonds made: 2 of 7", score 600).

**Regression tests.** *the hydrogen row is a collection area, and the molecule
is not*; *a click on the row while one is already loaded does not throw it*;
*a pick refused because the tray is full says why*; *rapid clicking the row
never throws and never corrupts the round*; *a wrong-family pick is still
allowed, and still explains itself*; *the row sits clear of the carbons*.

**Final result.** Fixed. The two states are distinguishable and a row click can
no longer cost the student a hydrogen.

## 3. Carbon has valency 4

**Original observation.** The screen headed "How many bond can carbon make ?"
never answers it - the body repeated the previous screen's sentence, and the
only number shown was "Atomic No - 6".

**Root cause.** The answer was already on the screen and **drawn behind another
element**. `FactChipStack` stacks a "Valency - 4" chip at `top: 0`, height 68,
and an opaque white "Atomic No - 6" chip at `top: 13`, height 73, same width.
Only a 13px sliver of the Valency chip was ever visible. Confirmed in the DOM
("Valency -" and " 4" present at top 451) against a screenshot showing only
"Atomic No - 6".

**Change made.** Two small things, both reusing what was there:
- The front chip drops from `top: 13` to `top: 60` (stack height 86 -> 133), so
  both facts read while keeping the overlapping deck look and its hatched strip.
- The card body now answers its own heading, from `src/content/chemistry.ts`
  (the single source of truth for chemical facts):

  > "Carbon has six electrons, and four of them sit in its outer shell - so it
  > has four places to bond . That is what valency 4 means . Every carbon has to
  > end up with four bonds , and the hydrogens are what fill the ones a carbon
  > chain does not use ."

That is the chain the brief asked for - atomic number, outer shell, valency,
four bonding positions - and it ends on why hydrogens exist in the game. The
existing diagram already draws the four positions and is reused unchanged. No
new screen was added.

**Browser verification.** The screen now shows the carbon with four hydrogens,
**Valency - 4** and **Atomic No - 6** both legible, and the answer on the card.

**Regression tests.** *the valency lesson answers the question its heading
asks*; *the lesson agrees with the rule the engine actually applies* (4n - 2 x
chain bonds gives methane 4H, ethane 6H, propane 8H).

**Final result.** Fixed.

## Fresh first-time-student playthrough

From `/`, visible UI only, no typed routes, no `?step=play`.

```
/ -> Sign in card
  -> "WHAT IF YOU ARE CARBON?"            (card)
  -> "How many bond can carbon make ?"    (card)  <- now answered
  -> prefix rail (auto) -> Dec            (card)
  -> Alkane -> Alkene -> Alkyne           (card x3)
  -> ANE -> ENE -> YNE                    (card x3)
  -> guided walkthrough, 18 card clicks   <- previously the dead end
  -> ?step=play, live-CARBON_SELECTION
  -> chose the two-blue set -> pair bonded, 300 points
  -> hydrogen sum shown -> collected -> threw -> bonded, "Bonds made: 2 of 7"
```

| Question | Answer |
|---|---|
| **A. Can the student reach gameplay?** | Yes, entirely through the visible UI. |
| **B. Does the student understand the final walkthrough?** | Yes - the last frame's card reads "... Now play it yourself." |
| **C. Collecting versus throwing?** | Yes - the card names which state it is in, and a row click can no longer throw. |
| **D. Carbon valency 4?** | Yes - stated on the chip, in the diagram, and in the card that asks the question. |
| **E. Can the student complete the molecule?** | Yes - carbons, hydrogens, bonds and the summary all reached by clicking. |

## Status of the deferred items

**400% zoom: DEFERRED.** Not touched. Still requires a future accessibility and
layout redesign of the fixed Figma artboard.

**Background-tab behaviour: KEPT / VERIFIED AS INTENDED.** Unchanged. The pause
and resume cards both appeared during this pass. The browser pane still reports
`visibilityState: hidden` while focused, so the game correctly pauses there;
that remains an artefact of this automated host, and the same logic is right in
a normal tab. As in the previous pass, visibility was overridden to play on, and
that is disclosed rather than treated as a product state.

**20-second warning: KEPT / REQUIRES REAL-TIME BROWSER VERIFICATION.** Unchanged,
no ladder and no audio added. Still not verifiable here: the visibility override
makes game time run far faster than wall time.

## Newly confirmed, then fixed in the targeting pass below

*(The section that follows this one records the fix. The description here is
what was observed before it.)*

**Aim versus slot.** The previous report listed this as UNVERIFIED after one
sighting. It reproduced cleanly twice more this pass: aiming at the left
carbon's **top** marker, with the ring highlighting that marker, put the
hydrogen in the **left** slot. The throw travels up-right from the dock and
passes the left slot before reaching the top one, so the first free slot along
the path catches it. It is now a **confirmed** finding rather than a suspicion.
It costs nothing - the atom still bonds - but the highlighted marker is not
always the slot that receives it. Recorded for a future pass; not changed here,
because aiming was not one of the three issues in scope.

## Files changed in this pass

| File | Why |
|---|---|
| `src/screens/gameplay/GameplayScene.tsx` | `onCardAdvance` |
| `src/screens/gameplay/GameplayFlow.tsx` | pass it |
| `src/screens/gameplay/live/LiveGameplay.tsx` | a row click is a pick, never a throw |
| `src/game/engine/engine.ts` | `isCollectionArea()`, the tray-full reason |
| `src/game/engine/layout.ts` | `hydrogenRowBox()` - one box for drawing and clicking |
| `src/game/engine/events.ts`, `session.ts` | the `TRAY_FULL` reason |
| `src/content/chemistry.ts` | tray-full copy, `CARBON_VALENCY_LESSON` |
| `src/screens/gameplay/live/projectScene.ts` | armed-state card, shared row box |
| `src/screens/onboarding/CarbonValencyScreen.tsx` | the card answers its heading |
| `src/screens/onboarding/components/FactChipStack.tsx` | the Valency chip is no longer covered |
| `src/game/engine/studentflow.test.ts` | new, 10 tests |
| `src/game/engine/restart.test.ts` | the reset checklist gained `TRAY_FULL` |

Untouched: the chemistry engine, carbon valency logic, molecule validation,
carbon and hydrogen collision, bond formation, paper physics, the sound mapping,
the timer, restart, routing, the responsive coordinate system, animation timing,
and the Figma visual design apart from the two chip positions named above.

---

# Aim-versus-slot Targeting Fix

Date: **25 September 2026**. One issue: the marker the player aims at was not
always the slot that received the throw. Nothing else was changed.

`npm test` **150 passing** (was 145), build clean, lint unchanged, 57
reproduction scripts run, deep fuzz 1200 runs / 1,627,699 steps `failures=0`.

## 1. Root cause

Reproduced first, deterministically, before any code changed
(`.playtest/v5-aim-vs-slot.ts` - aims at every drawn marker in turn and reports
which slot actually received the atom):

```
capture radius = hydrogen radius 23.5 + slotCapture 12 = 35.5px

ethane
  aim c6 top    -> landed c6 left   ** WRONG SLOT **  (path passes c6 left at 31.4px)
  ...                                                  5/6 correct
propane
  aim c7 top    -> landed c6 top    ** WRONG SLOT **  (path passes c6 bottom at 50.3px)
  ...                                                  7/8 correct
```

`slotContact()` caught the atom in **whichever free slot it first came within
35.5px of**, with no reference to the marker the player pointed at. Flying from
the dock at the lower left to a carbon's *top* marker means passing its *left*
marker at 31.4px - inside catching distance - so the left slot took the atom
first.

There was already an aim guard, but it compared the aim to the **carbon**:

```
if (this.throwAim && distance(this.throwAim, carbon.position) > bondLength * 1.5) continue;
```

Both slots belong to the same carbon, so that test could not tell them apart.
It was the right idea at the wrong resolution.

A second, separate path produced the propane case: the flight to `c7 top`
passes 33.8px from the middle carbon's centre, inside its 67.5px contact
distance, so the atom struck that carbon's **body** and `bondPartnerFor()`
bonded it there instead.

## 2. Exact fix

**One function decides which marker is being aimed at, and both the ring and
the capture ask it.**

- `engine.aimedTarget(aim)` returns the free bond marker nearest the aim point
  within `physics.slotAimRadius` (59px), or null. It is exposed on the
  snapshot, and `projectScene`'s ring now reads `snapshot.aimedTarget` instead
  of recomputing its own nearest-marker test. The marker that lights up and the
  marker that catches the atom are the same object by construction.
- `slotContact()` - while a marker is aimed at, **only that marker may capture**.
  Other markers along the flight path can no longer intercept.
- `bondPartnerFor()` - while a marker is aimed at, only that marker's carbon may
  become the partner. Running into a different carbon is a blocked throw, not a
  reason to bond somewhere the player did not point.
- Aiming at a carbon body or at open table gives no aimed marker, and the throw
  behaves exactly as before: the previous carbon-proximity guard still applies
  there.

`slotAimRadius: 59` replaces the renderer's former inline `47 + slotCapture`.

## 3. Tests run

| | |
|---|---|
| `npm test` | **150 passing, 0 failing** (5 new) |
| `npm run build` | clean |
| `npm run lint` | unchanged (10 pre-existing warnings) |
| reproduction scripts | all 57 run clean |
| `a6_fuzz` / `a7_deep` | 400 + 1200 runs, `invariant failures: 0` |

New tests: *a throw lands in the marker it was aimed at, not one it flew past*
(every marker on ethane); *the marker the game rings is the marker the engine
will use*; *aiming away from every marker rings nothing and still lets a throw
fly*; *a throw is not magnetised to the marker from anywhere on the table*;
*every molecule can still be finished with the stricter targeting*.

After the fix, the repro script reports **ethane 6/6** and **propane 7/8 with
the eighth an honest MISS** - zero wrong-slot outcomes on either.

## 4. Viewport results

`.playtest/v5-viewport-aim.ts` takes each marker's on-screen pixel, converts it
back through the transform `LiveGameplay` uses, and asks the game which marker
that is:

| Viewport | unit | Result |
|---|---|---|
| 1366 x 768 | 0.8944 | all 6 markers resolve to themselves, round-trip drift **0.000px** |
| 1440 x 900 | 1.0000 | all 6, drift **0.000px** |
| 1920 x 1080 | 1.2500 | all 6, drift **0.000px** |

A point on open table rings nothing at all three sizes.

In the live browser at 1440 x 900, the exact case that failed twice before:

```
aimed c6 top  ->  ring c6 top  ->  bonded to the aimed carbon, 1px from the marker
```

(previously it landed in `c6 left`). Also verified live: `c7 right` 7px,
`c7 bottom` 2px. Further live play was not possible in this host - the browser
pane stops calling `requestAnimationFrame`, so the engine does not tick; the
deterministic runs above cover the same ground and are reproducible.

## 5. Did any existing behaviour change?

**Physics: no.** Trajectory, drag, speed, the capture radius, the collision
animation, the carbon impact timeline, chemistry, scoring, audio events, the
timer and the lesson-to-gameplay flow are all untouched. Only *which* free slot
is allowed to claim a throw changed.

**One deliberate behaviour change.** A throw aimed at a marker that the atom
cannot reach - because another carbon's body blocks the path - is now a miss,
recorded and explained, instead of silently bonding to the carbon in the way.
That is the point of the fix: the highlighted marker is the one that receives
the throw, or nothing does.

**Aiming skill is unchanged.** A sweep of 551 aim points across the whole table
produces a bond at **22.1%** of them, against 22.3% before the fix - the atom
still has to reach the slot, and nothing is magnetised to the ring.

**No molecule became unfinishable.** Methane, ethane and propane all complete
with zero missed throws under four different marker-choice strategies (first,
last, middle, and leftmost-on-screen), verified in
`.playtest/v5-still-winnable.ts`.
