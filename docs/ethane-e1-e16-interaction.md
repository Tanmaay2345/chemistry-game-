# Ethane E1 → E16: interaction and animation spec

**Decided mechanism: the paper is the projectile.** The player aims and throws
the paper at the two-carbon group; the impact makes the pair react and bond.
The carbons are never thrown. This is the reference's mechanism and it is now
the one the game implements.

Source of truth: Figma `5wNKojOL80MAcSy4aYVL9q`, the "Game play for alkane" row
starting at node `4589:21512`. Every position below is in **frame coordinates**
(the 1185-wide ruled frame, the same coordinates `src/screens/gameplay` and the
game engine already use), so the whole interaction scales with the existing
responsive system and needs no resolution-specific values.

This document specifies interaction and motion only. No colour, type, layout,
component or asset changes.

---

## 0. The mechanism

The physical event is **paper → carbon pair**. The chemical consequence is
**carbon pair → C-C bonded structure**. Those two are deliberately separate
beats so the player reads one as the cause of the other.

The carbon-carbon bond is **not** made by throwing one carbon into another.
The reference shows:

1. Four carbon groups are offered (E2).
2. The player aims the **paper** at the group whose size and colour match the
   name — for ethane, the pair of blue carbons (E3, E4).
3. The **paper itself** is thrown and travels across the table (E5).
4. The paper strikes that group. A burst fires over **both** carbons of the
   pair (E6).
5. The pair emerges from the burst enlarged, centred and joined by a single
   covalent bond (E7).

So the projectile is the paper, the target is the two-carbon group, and the
collision converts the group into the molecule. The two carbons do not travel
toward each other at any point in the reference.

The hydrogen half (E13 → E16) *is* a thrown-atom collision: a hydrogen rides
the paper, travels a dotted trajectory, and lands on a free slot.

### Frame map

| E | Figma node | Scene id in code | Content |
|---|---|---|---|
| E1 | 4589:21512 | `methane-01` | "Alkane - Methane" card, one carbon, four dotted slots |
| E2 | 4589:22021 | `ethane-01` | "Make Ethane", four carbon groups, paper docked at (142, 747) |
| E3 | 4589:21757 | `ethane-02` | Aim trajectory to the blue pair |
| E4 | 4589:22284 | `ethane-03` | Trajectory + two swooshes at the paper (release) |
| E5 | 4589:22550 | `ethane-04` | Paper airborne at (325, 667); "Select the carbon" |
| E6 | 4589:22817 | `ethane-05` | **Impact**: paper at (427, 620), burst 190×230 at page (690, 438) |
| E7 | 4589:23083 | `ethane-06` | Two large carbons at (320, 490) and (550, 490), bond line w138 |
| E8 | 4589:23325 | `ethane-07` | Molecule rises to page y 353; H row; paper reloaded at (231, 754) |
| E9 | 4589:23609 | `ethane-08` | Two web lines from the paper into the H row |
| E10 | 4589:23895 | `ethane-09` | Web converges on one blue H |
| E11 | 4589:24181 | `ethane-10` | H reeled to the paper; row becomes a tray |
| E12 | 4589:24464 | `ethane-11` | Carbons show free slots; four blue H in the tray at (·, 719) |
| E13 | 4589:24727 | `ethane-12` | H loaded at (247, 713); trajectory to the south slot |
| E14 | 4589:24991 | `ethane-13` | Paper drawn back; two aim lines |
| E15 | 4589:25257 | `ethane-14` | H in flight at (423, 580) |
| E16 | 4589:25523 | `ethane-15` | H bonded at (468, 541); three H left |

One uncertainty: E2 and E3 are the same frame with and without the aim line. I
have ordered them ready → aiming, which is the only order that reads causally.
If the Figma row has them the other way, swap the two labels; nothing else in
this spec changes.

---

## 1. Motion vocabulary

Four curves, used consistently so that each kind of event reads the same way
every time it happens.

| Name | Curve | Used for |
|---|---|---|
| `anticipate` | `cubic-bezier(0.55, 0.085, 0.68, 0.53)` (ease-in) | pull-back before a throw |
| `launch` | `cubic-bezier(0.12, 0.62, 0.32, 1)` | the fast part of a flight |
| `settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | anything coming to rest (already `FLOW_MOTION.easing`) |
| `recoil` | `cubic-bezier(0.34, 1.4, 0.64, 1)` (slight overshoot) | a struck object springing back |

Flight timing is derived from distance, not fixed: `duration = clamp(distance /
1.6 px-per-ms, 260, 620)`. At the reference distance the paper's flight is
~430ms, which is the figure quoted below.

---

## 2. Transitions

Each block lists: player action · trigger · moving object · movement · easing ·
duration · interaction event · feedback · resulting state.

### E1 → E2 — from the concept card to the task
- **Player action** — clicks the instruction card.
- **Trigger** — card click (existing `onContinue`).
- **Moving object** — the single carbon and its four slots; the four carbon groups.
- **Movement** — carbon and slots fade and contract to 0.92 toward their own centre; the four groups rise 16px into place at y 549, staggered 40ms apart left to right; rail highlight slides Meth → Eth.
- **Easing** — `settle`.
- **Duration** — 260ms out, 320ms in, overlapping by 120ms; rail slide 300ms.
- **Interaction event** — objective changes to "Make Ethane".
- **Feedback** — the card copy crossfades (existing `.cardCopy`).
- **Resulting state** — E2: four groups offered, paper docked, nothing selected.

### E2 → E3 — the player aims
- **Player action** — moves the pointer over the play area (or hovers a group).
- **Trigger** — pointer move while the paper is docked and no group is chosen.
- **Moving object** — the aim trajectory; the paper's nose.
- **Movement** — the dotted trajectory draws from the paper's nose toward the pointer (stroke-dashoffset 100%→0); the paper rotates to the aim angle, clamped to ±25° from rest so it never spins; the arrowhead appears at the far end only when the pointer is inside a group's bounds.
- **Easing** — `settle` for the rotation; the trajectory tracks the pointer 1:1 with no easing.
- **Duration** — trajectory draw 180ms on first appearance, then live; rotation 140ms.
- **Interaction event** — none yet; this is pure aiming.
- **Feedback** — the group under the aim lifts 2px and its border brightens, so the target is unambiguous before committing.
- **Resulting state** — E3: trajectory live, one group targeted.

### E3 → E4 — commit and release
- **Player action** — presses to throw.
- **Trigger** — pointer down on a group (or release of a drag).
- **Moving object** — the paper.
- **Movement** — **anticipation**: the paper slides 14px back along the aim axis and tips 6° away from it. Then **release**: it returns through its rest position and the two swoosh lines (`459e7`, `ff4c5`, at (293, 753) and (239, 745)) appear behind it at 0 → 100% opacity.
- **Easing** — `anticipate` for the pull-back, `launch` for the release.
- **Duration** — 150ms pull-back, 90ms release; swooshes fade in over 80ms.
- **Interaction event** — `PAPER_THROWN`; the target group is locked in.
- **Feedback** — the swoosh streaks; the chosen group's border stays lit.
- **Resulting state** — E4: paper leaving the dock, trajectory fixed to the chosen group.

### E4 → E5 — the paper travels
- **Player action** — none; the throw resolves.
- **Trigger** — release completed.
- **Moving object** — the paper, from (142, 747) to (325, 667) and onward.
- **Movement** — travel along the fixed trajectory (`d417c`, rotate 155.41, length 290.9). The paper holds the path's tangent angle. The swooshes stretch and fade as speed drops. "Select the carbon" fades in at (141, 475).
- **Easing** — `launch` — fast off the hand, decelerating, matching the engine's drag model.
- **Duration** — ~430ms at the reference distance (distance-derived, see §1).
- **Interaction event** — none; travel only. The paper must be visibly in flight for at least 6 frames, never a jump.
- **Feedback** — the trajectory behind the paper dims to 40% as it is consumed; the part ahead stays bright.
- **Resulting state** — E5: paper mid-flight, target committed.

### E5 → E5.1 — approach *(new frame — see §A)*
- **Player action** — none.
- **Moving object** — the paper; the target group's border.
- **Movement** — the last ~40px of travel slows to roughly half speed; the group's border thickens by 1px and brightens.
- **Easing** — `launch` (tail).
- **Duration** — 90ms.
- **Interaction event** — pre-contact. This is the beat that tells the player a hit is about to happen.
- **Feedback** — border brighten only; no burst yet.
- **Resulting state** — nose one atom-radius from the pair.

### E5.1 → E6 — **contact**
- **Player action** — none.
- **Trigger** — the paper's nose reaches the pair's bounding box.
- **Moving object** — paper (stops), burst (appears), both carbons of the pair.
- **Movement** — the paper halts at (427, 620) within 40ms, tipping 4° nose-up from the sudden stop. The burst (`ethane-05-splash`, 190×230 at page (690, 438)) scales 0.4 → 1.0 from the contact point, anchored at the paper's nose, not at the group's centre. Both carbons compress ~6% along the impact axis.
- **Easing** — burst on `launch`; compression on `anticipate`.
- **Duration** — 120ms contact, burst in 140ms.
- **Interaction event** — **the collision**. `ATOM_COLLISION`.
- **Feedback** — burst; compression; the speed swooshes collapse into the impact.
- **Resulting state** — E6: impact frame as drawn.

### E6 → E6.1 — impact response *(new)*
- **Moving object** — the two struck carbons.
- **Movement** — both are pushed **along the throw direction** (up and to the right, the axis of `d417c`): the near carbon by 14px, the far one by 9px, so the pair also separates slightly. They release the 6% compression and overshoot to 103%.
- **Easing** — `recoil`.
- **Duration** — 140ms.
- **Interaction event** — the receiving carbons react to the incoming momentum; this is the cause-and-effect beat.
- **Feedback** — burst holds at full opacity and begins to break up.
- **Resulting state** — pair displaced and separated, burst peaking.

### E6.1 → E6.2 — the bond begins *(new)*
- **Moving object** — the two carbons; the new bond.
- **Movement** — the carbons stop drifting apart and draw together to bond distance. The bond line grows from the midpoint outward, 0 → 60% of its 138px length. The carbons begin scaling from the small pill (54×50) to the play-area pill (88.56×82).
- **Easing** — `settle` for the approach, linear for the bond growth.
- **Duration** — 200ms.
- **Interaction event** — `BOND_CREATED` fires at the **start** of this step, so the bond is a consequence of the collision, never earlier.
- **Feedback** — the burst fades 100% → 35%; the bond is the brightest thing on screen.
- **Resulting state** — bond partially drawn, carbons growing.

### E6.2 → E6.3 — the bond completes *(new)*
- **Moving object** — bond, carbons, burst.
- **Movement** — bond reaches 100% of 138px; the carbons finish scaling to 88.56×82 and settle to their final spacing with a 2% overshoot; the burst fades out entirely.
- **Easing** — `recoil` on the carbons, `settle` on the bond.
- **Duration** — 260ms.
- **Interaction event** — bond complete.
- **Feedback** — burst gone; only the molecule remains lit.
- **Resulting state** — bonded pair, still at the group's old position.

### E6.3 → E7 — the molecule settles
- **Moving object** — the bonded pair as one object; the paper.
- **Movement** — the pair travels from the group position to the play area, landing at (320, 490) and (550, 490) — it moves as a rigid unit, never as two independent atoms. In parallel the spent paper drops 20px, fades to 0 behind the burst remnant, and is removed.
- **Easing** — `settle`.
- **Duration** — 380ms; paper fade 160ms, starting 80ms earlier.
- **Interaction event** — none; consequence only.
- **Feedback** — the card crossfades to "Make the spiderweb .".
- **Resulting state** — E7: C–C molecule centred, paper off-stage.

### E7 → E8 — hand off to the hydrogen phase
- **Player action** — none (auto) or a card click.
- **Moving object** — the molecule; the H selection row; the paper.
- **Movement** — the molecule rises as a unit to its E8 position (page y 353) and tightens from 230px to 200px spacing; the mixed H row fades up at y 561 with a 25ms stagger per atom; the paper re-enters docked at (231, 754), sliding 24px up into place.
- **Easing** — `settle` throughout.
- **Duration** — molecule 320ms; row 260ms starting 120ms in; paper 240ms.
- **Interaction event** — the hydrogen requirement is announced (6 for ethane, from valency).
- **Feedback** — staggered row entry draws the eye to the new choice.
- **Resulting state** — E8.

### E8 → E9 — the web is aimed
- **Player action** — moves the pointer over the H row.
- **Trigger** — pointer move in the collection phase.
- **Moving object** — the two web lines (`e9cbf` len 271, `fbee8` len 405) from the paper's edges.
- **Movement** — both lines draw outward from the paper toward the pointer, forming the narrow cone the reference draws.
- **Easing** — draw 160ms then live tracking.
- **Duration** — 160ms.
- **Interaction event** — none; targeting.
- **Feedback** — the H under the cone lifts 2px.
- **Resulting state** — E9.

### E9 → E10 — the web latches
- **Player action** — clicks an H.
- **Trigger** — pointer down on an atom in the row.
- **Moving object** — the web cone.
- **Movement** — the two lines converge from the cone onto the chosen atom, shortening to exactly the paper→atom distance.
- **Easing** — `launch`.
- **Duration** — 180ms.
- **Interaction event** — `WEB_STARTED`; family recorded (blue is correct; a red or green pick is allowed and recorded).
- **Feedback** — the chosen H brightens; its neighbours dim 10%.
- **Resulting state** — E10.

### E10 → E11 — the atom is reeled in
- **Moving object** — the chosen H; the row.
- **Movement** — the H rides the web back to the paper, arriving at the paper's nose; the web shortens with it; the remaining row closes up into the tray.
- **Easing** — `launch` out of the row, `settle` into the paper.
- **Duration** — 280ms (distance-derived), tray reflow 200ms.
- **Interaction event** — `ATOM_COLLECTED`.
- **Feedback** — the atom scales 1.0 → 1.08 → 1.0 as it lands on the paper.
- **Resulting state** — E11: one H on the paper, row reduced.

### E11 → E12 — the collection completes and the targets appear
- **Player action** — repeats the web for the remaining hydrogens.
- **Moving object** — collected H atoms; the carbons' free-bond slots.
- **Movement** — each collected H takes its place in the tray at y 719, 16px apart. Once the set is collected, the free-bond slots fade in around both carbons, drawn outward from each carbon centre.
- **Easing** — `settle`; slots draw with a 60ms stagger.
- **Duration** — per atom as E10 → E11; slots 240ms.
- **Interaction event** — collection satisfied.
- **Feedback** — the slots are the affordance: they say exactly where a throw may land.
- **Resulting state** — E12.

### E12 → E13 — load and aim the hydrogen
- **Player action** — aims at a free slot.
- **Moving object** — one H from the tray to the paper; the trajectory (`63bca`, rotate 138.18, length 283).
- **Movement** — the H slides from the tray to (247, 713) on the paper; the trajectory draws from the paper to the targeted slot, its arrowhead landing on the slot.
- **Easing** — `settle` for the load, 180ms draw for the trajectory.
- **Duration** — load 220ms, trajectory 180ms.
- **Interaction event** — none; aiming.
- **Feedback** — the targeted slot brightens; other slots dim.
- **Resulting state** — E13.

### E13 → E14 — anticipation
- **Player action** — commits the throw.
- **Moving object** — the paper with the H aboard.
- **Movement** — the paper draws back 12px along the aim axis; the two aim lines (`f5dea`, `5c6af`) appear at its edges.
- **Easing** — `anticipate`.
- **Duration** — 150ms.
- **Interaction event** — throw committed.
- **Feedback** — aim lines.
- **Resulting state** — E14.

### E14 → E15 — the hydrogen travels
- **Moving object** — the H, from (247, 713) to (423, 580) and on toward the slot.
- **Movement** — travel along the trajectory (`d9b75`, rotate 139.09, length 297.7); the paper recoils 8px backward and rotates 5°, then returns to rest.
- **Easing** — `launch` for the atom; `recoil` then `settle` for the paper.
- **Duration** — atom ~330ms (distance-derived); paper recoil 120ms, return 260ms.
- **Interaction event** — `PAPER_THROWN`.
- **Feedback** — the consumed part of the trajectory dims behind the atom.
- **Resulting state** — E15: H in flight.

### E15 → E15.1 — contact at the slot *(new)*
- **Moving object** — the H; the receiving carbon.
- **Movement** — the last 30px slow; on contact the H compresses 6% along the approach axis and the **carbon shifts 6px along the throw direction** — the same cause-and-effect rule as the carbon impact, at smaller scale.
- **Easing** — `anticipate` into contact, `recoil` out.
- **Duration** — 110ms contact, 130ms carbon reaction.
- **Interaction event** — `ATOM_COLLISION`, then `BOND_CREATED`.
- **Feedback** — the targeted slot flashes once as the bond takes it.
- **Resulting state** — contact made.

### E15.1 → E16 — the hydrogen bonds and the molecule settles
- **Moving object** — the H; the whole molecule.
- **Movement** — the H snaps to the slot end at (468, 541) and swaps to the bonded disc art; the molecule (both carbons and everything bonded to them) absorbs the impulse as one rigid body — it drifts ~6px along the throw direction and returns.
- **Easing** — `settle`.
- **Duration** — bond 200ms, molecule settle 300ms.
- **Interaction event** — bond counted; 1 of 6 hydrogens placed.
- **Feedback** — the tray narrows from 283px to 208px as an atom leaves it.
- **Resulting state** — E16. The loop returns to E12 for the remaining five hydrogens; ethane is complete when all six are placed.

---

## 3. Deliverable answers

### A. Additional intermediate frames created
| Frame | Between | Content |
|---|---|---|
| E5.1 | E5, E6 | Approach: final 40px slowed, target border brightens |
| E6.1 | E6, E7 | Impact response: both carbons pushed along the throw axis, released from compression |
| E6.2 | E6, E7 | Bond begins: carbons draw together, bond 0 → 60%, pills start scaling up |
| E6.3 | E6, E7 | Bond completes: bond 100%, pills at full size, burst gone |
| E15.1 | E15, E16 | Hydrogen contact: compression and the receiving carbon's 6px reaction |

Five frames. Four of them sit in the E6 → E7 gap, because that single gap is
where the reference jumps from "burst" to "finished molecule" — the whole
causal chain the brief asks for lives in that jump.

### B. Why each was necessary
- **E5.1** — without a deceleration beat the impact has no anticipation and reads as a cut.
- **E6.1** — this is the only frame where the struck carbons *respond*. Remove it and the collision has no effect, only an effect-less flash.
- **E6.2** — separates "they were hit" from "they are bonding", so the bond is legible as a consequence rather than a state change.
- **E6.3** — the reference's carbons are small in E6 and large in E7; that change of size needs a frame of its own or the molecule appears to pop.
- **E15.1** — gives the hydrogen the same cause-and-effect treatment as the carbon impact, so the two collisions teach the same lesson.

### C. Where the collision occurs
**E6** (`4589:22817`), at the moment the paper's nose reaches the pair's bounding box — contact point at the paper nose, roughly page (700, 560), not at the group centre. The burst is anchored there.

### D. Where the bond begins forming
**E6.2**, 260ms after contact (120ms contact + 140ms impact response). The bond line starts at 0 length. Nothing about the bond is visible before this.

### E. Where the bond is complete
**E6.3**, 460ms after contact: bond at its full 138px, carbons at full size and final spacing. The molecule then *moves* into place (E7) — completion and placement are deliberately separate so the bond is not competing with travel for attention.

### F. How the receiving carbon reacts
In three steps: **compress** 6% along the impact axis on contact (E6); **displace** along the throw direction — 14px for the near carbon, 9px for the far one, which also separates the pair slightly (E6.1); **return** with a 103% overshoot as they draw together into bond distance (E6.2). The displacement direction is always the throw's direction, so the player can read their own aim in the reaction.

### G. How the molecule settles
Once bonded, the two carbons stop being independent: they move as one rigid body for the rest of the sequence. The pair travels from the group's position to the play area over 380ms on `settle` (E6.3 → E7), then rises to its molecule position and tightens from 230px to 200px spacing (E7 → E8). Later impacts move the whole molecule and it returns — it never stretches, and the C–C distance never changes after E6.3.

---

## 4. Attention order

One thing moves at a time, in this order: paper anticipation → paper flight →
(everything else static) → impact burst → carbon reaction → bond → molecule
travel → new UI (H row) last. The burst is the only moment where two things
animate at once, and it is the climax. The instruction card never animates
during a throw; it changes only after the molecule has settled.

## 5. Responsive behaviour

Every value here is in frame coordinates and every motion is expressed as a
transform of those coordinates, so the interaction is resolution-independent
and continues to work through the existing `layout/designFit` scaling. Two
rules: durations are **not** scaled with the viewport (a throw takes the same
time on every screen), and distance-derived durations use design-pixel
distance, not CSS-pixel distance, so the timing is identical at every size.

## 6. The model that was rejected

An earlier engine build threw the carbons themselves: collect carbon 1, place
it, then throw carbon 2 into it. That is **not** this interaction and has been
replaced. In the implemented version:

- the carbons are never a projectile;
- there is no web collection step for carbon (the web is for hydrogen only, E9 - E11);
- the carbon groups in E2 are throw *targets*, not a pool to collect from;
- the only thing the player throws during the carbon phase is the paper.

## 7. What the engine does

`PAPER_FLIGHT` carries the paper from its dock along the aim direction.
`carbonImpact` in the rules config holds every number in section 2: contact,
response, bond-start, bond-complete and settle timings, the displacement of the
near and far carbon, and the compression amount. The reaction runs on the same
fixed timestep as the rest of the physics, so it is deterministic and testable.
Chemistry, scoring, the summary and the responsive system are untouched.
