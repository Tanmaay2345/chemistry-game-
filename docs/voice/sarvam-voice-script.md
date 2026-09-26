# Sarvam voice — narration script

Script only. No audio was generated, no API was called, and no game code was
changed. Every trigger is a real screen, phase or event — see
[`sarvam-voice-event-map.md`](sarvam-voice-event-map.md).

**41 clips**: 15 molecule-specific, 26 shared.

Durations are targets for a clear English read at roughly 150 words per minute.
"Repeat" says how often a clip may play; "Interrupt" is its playback policy
(defined in [`sarvam-voice-design.md`](sarvam-voice-design.md)).

---

## A. Educational introduction

Lesson screens. Triggered by screen entry in `src/App.tsx`, not by engine
events. These are the only places where a longer line is safe, because nothing
is moving and there is no clock.

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| V01 | Welcome | — | `signIn` enters | "Welcome. You're going to build carbon molecules, and learn how chemists name them while you do it." | Once |
| V02 | Carbon introduction | — | `carbonIntro` enters | "Everything here is built from carbon. Carbon is the atom that joins to other atoms to make whole compounds." | Once |
| V03 | Carbon valency | — | `carbonValency` enters | "Carbon has six electrons, and four of them sit in its outer shell. That gives it four places to bond. Valency four. Remember that number — the whole game runs on it." | Once |
| V04 | Prefixes | — | `prefixIntro` enters | "The first part of a molecule's name tells you how many carbons it has. Meth is one. Eth is two. Prop is three. Watch the rail." | Once |
| V05 | Alkanes | — | `alkane` enters | "When every carbon-to-carbon bond in a chain is a single bond, the chain is an alkane. In this game, alkanes are blue." | Once |
| V06 | Alkenes | — | `alkene` enters | "If one pair of carbons is joined by a double bond, it's an alkene. Alkenes are red." | Once |
| V07 | Alkynes | — | `alkyne` enters | "A triple bond between a pair of carbons makes an alkyne. Alkynes are green." | Once |
| V08 | Suffix ANE | — | `screen67` enters | "The ending of the name carries the bond. Single bonds end in ane." | Once |
| V09 | Suffix ENE | — | `screen68` enters | "A double bond ends in ene." | Once |
| V10 | Suffix YNE | — | `screen69` enters | "And a triple bond ends in yne. Prefix for the carbons, ending for the bond — that's the whole naming rule." | Once |
| V11 | Walkthrough opens | — | `gameplay` screen, `onStepChange` index 0 | "Here's how a round is played. Follow along — you'll do it yourself in a moment." | Once |
| V12 | Walkthrough ends | — | `onStepChange` on the last step (`ethane-15`) | "That's the whole loop. Now it's your turn." | Once |

*Implementation note.* V04's rail auto-plays ten prefixes at about 2.6 seconds
each. One line at the start is enough; do not narrate each chip.

---

## B. Methane

Methane has **one** carbon, so there is **no carbon-to-carbon bond**. Nothing in
this section may say the carbons bond — the on-screen card is careful about this
and the narration must match it.

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| M01 | Challenge introduction | Methane | `GAME_STARTED`, `molecule === 'methane'` | "First molecule: methane. C H four — one carbon, four hydrogens." | Once per round |
| M02 | Carbon requirement | Methane | phase → `CARBON_SELECTION`, first entry of the round | "Meth means one carbon. Throw the paper at a single blue carbon." | Once per round |
| M03 | Structure ready | Methane | phase → `CARBON_STRUCTURE_READY` | "There's your carbon, with four bonds waiting to be filled." | Once per round |
| M04 | Hydrogen requirement | Methane | phase → `HYDROGEN_CALCULATION` | "Four bonds, nothing else using them. So methane takes four hydrogens." | Once per round |
| M05 | Completion | Methane | `MOLECULE_COMPLETED`, methane | "That's methane. One carbon, four hydrogens, every bond single." | Once per round |

---

## C. Ethane

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| E01 | Challenge introduction and transition | Ethane | `GAME_STARTED`, `molecule === 'ethane'` | "Next: ethane. Eth means two carbons. C two H six." | Once per round |
| E02 | Carbon requirement | Ethane | phase → `CARBON_SELECTION`, first entry | "This time you need a set of two blue carbons." | Once per round |
| E03 | Carbons bonded | Ethane | phase → `CARBON_STRUCTURE_READY` | "Good. The two carbons are joined by a single bond — that's what the ane ending means." | Once per round |
| E04 | Hydrogen requirement | Ethane | phase → `HYDROGEN_CALCULATION` | "Two carbons, four bonds each, makes eight. The bond between them uses two. Six left for hydrogen." | Once per round |
| E05 | Completion | Ethane | `MOLECULE_COMPLETED`, ethane | "Ethane, complete. Two carbons and six hydrogens." | Once per round |

---

## D. Propane

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| P01 | Challenge introduction and transition | Propane | `GAME_STARTED`, `molecule === 'propane'` | "Last one: propane. Prop means three carbons. C three H eight." | Once per round |
| P02 | Carbon requirement | Propane | phase → `CARBON_SELECTION`, first entry | "Find the set of three blue carbons." | Once per round |
| P03 | Chain bonded | Propane | phase → `CARBON_STRUCTURE_READY` | "A chain of three, all single bonds." | Once per round |
| P04 | Hydrogen requirement | Propane | phase → `HYDROGEN_CALCULATION` | "Three carbons give twelve bonds. Two carbon-to-carbon bonds use four. Eight left for hydrogen." | Once per round |
| P05 | Completion | Propane | `MOLECULE_COMPLETED`, propane | "Propane, complete. Three carbons and eight hydrogens." | Once per round |

---

## E. Shared gameplay feedback

Used by all three molecules. Error lines explain the rule that was broken — they
mirror `explainMistake()` in `src/content/chemistry.ts` without reading the card
aloud word for word.

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| S01 | How to choose | Shared | first `CARBON_SELECTION` of the **session** only | "The colour of a carbon set is the bond it makes. Blue is single bonds, so blue is what an alkane is built from." | Once per session |
| S02 | Wrong carbon family | Shared | `MISTAKE_EXPLAINED` · `WRONG_CARBON_FAMILY` | "That set has a carbon from another family in it. An alkane is built from blue carbons only. Throw again." | Every time |
| S03 | Wrong carbon count | Shared | `MISTAKE_EXPLAINED` · `WRONG_CARBON_COUNT` | "Right colour, wrong number. The prefix in the name tells you how many carbons to take." | Every time |
| S04 | Collect the hydrogens | Shared | phase → `HYDROGEN_SELECTION` | "Now the hydrogens. Click one in the row to pick it up, then throw it at a free bond." | Once per round |
| S05 | Wrong hydrogen family | Shared | `MISTAKE_EXPLAINED` · `WRONG_HYDROGEN_FAMILY` | "That hydrogen is from another set. Hydrogen always makes a single bond whatever colour it is — the colour just says which molecule it belongs to. This alkane needs a blue one." | Every time |
| S06 | Tray full | Shared | `MISTAKE_EXPLAINED` · `TRAY_FULL` | "You're already holding one. Throw it first." | Every time |
| S07 | No free bond | Shared | `MISTAKE_EXPLAINED` · `NO_FREE_BOND` | "That carbon already has all four bonds. Aim at one that still shows a free bond marker." | Every time |
| S08 | Missed throw | Shared | `MISTAKE_EXPLAINED` · `THROW_MISSED` | "That one didn't land. Aim at one of the free bond markers." | Every time |
| S09 | First hydrogen bonded | Shared | first `BOND_CREATED` of the round where one end is a hydrogen | "Good — that's one bond filled." | Once per round |

---

## F. Timer and timeout

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| T01 | Time warning | Shared | `TIME_WARNING` (fires once, at 20 s) | "Twenty seconds left." | Once per round |
| T02 | Timeout | Shared | `TIMEOUT` | "Time's up. Let's look at what you built." | Once per round |

---

## G. Completion, summary and progression

M05 / E05 / P05 play on the `COMPLETION` beat, while the finished molecule is
still on screen. These play afterwards, on the `SUMMARY` screen.

| ID | Event | Molecule | Trigger | Script | Repeat |
|----|-------|----------|---------|--------|--------|
| G01 | Summary, completed | Shared | phase → `SUMMARY`, `completionStatus === 'completed'`, and a next molecule exists | "Nicely done. Press the card when you're ready for the next one." | Once per round |
| G02 | Summary, timed out | Shared | phase → `SUMMARY`, `completionStatus === 'timeout'` | "Have a look at the notes on the card, then press it to try again." | Once per round |
| G03 | End of the progression | Shared | phase → `SUMMARY`, completed, **no** next molecule (after propane) | "Methane, ethane and propane — you've built all three. Same rule every time: the prefix counts the carbons, and every carbon ends up with four bonds." | Once per session |

---

## Phase 8 — script review

Every line checked against the build.

| Check | Result |
|---|---|
| 1. Chemically correct per `src/content/chemistry.ts` | Yes. Valency 4, CH4 / C2H6 / C3H8, and the alkane definition ("every carbon-to-carbon bond is single") all match `SERIES_COPY`, `CARBON_VALENCY_LESSON` and `parseName`. The sums in E04 and P04 match `hydrogenWorking()`: 8 − 2 = 6 and 12 − 4 = 8. |
| 2. The described action really happens there | Yes. Each trigger is a phase or event listed in the event map. |
| 3. Matches what the student sees | Yes. M02/E02/P02 name the colour and count the card and legend already show; no line names a set by position. |
| 4. Never describes an action before it happens | Yes. M03/E03/P03 fire on `CARBON_STRUCTURE_READY`, *after* the bond exists. S09 fires on `BOND_CREATED`. |
| 5. Never says an atom has returned while it is still on the paper | Yes. S05 states the rule and what the hydrogen will do; it makes no past-tense claim. This is the same correction already made to the on-screen text. |
| 6. Never calls hydrogen colour a bond order | Yes. S05 says explicitly that hydrogen always makes a single bond and the colour marks the set. No other line attaches a bond order to a hydrogen. |
| 7. Short enough for play | Yes. In-play lines are 2–5 s; the longest (S05, ~9 s) plays on a mistake, when the player has stopped to read anyway. |
| 8. Avoids repetition | Yes. Per-atom events carry no narration; S01 is once per session; S04 and S09 are once per round. |
| 9. Correct molecule | Yes. B, C and D are gated on `GAME_STARTED.molecule` / `spec.name`. |
| 10. Trigger is a real state or event | Yes — all verified against `machine.ts` and `events.ts`. |

### Deliberately not narrated

- **Individual carbon and hydrogen collections, throws, collisions and bonds.** They fire dozens of times per round, already have sound effects, and have on-screen counters.
- **`MOLECULE_VALIDATION`.** A real phase that never draws a frame.
- **`PAPER_FLIGHT` and `CARBON_IMPACT`.** About 1.7 s of animation the player is watching; a line here would talk over the best moment in the game.
- **Alkene and alkyne gameplay.** Taught in the lessons (V06, V07, V09, V10) but not playable — `ALKANE_PROGRESSION` is methane, ethane, propane only.
