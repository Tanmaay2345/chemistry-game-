# Sarvam voice — integration map

Where each of the 41 approved clips would attach in the build as it stands on
25 September 2026. Inspection only: no source file was modified, no
`VoiceManager` exists, no audio was generated and the Sarvam API was not called.

Every row below was read out of the code, not out of
[`sarvam-voice-event-map.md`](sarvam-voice-event-map.md). Where the earlier
documents named something that does not exist under that name, the correction
is in section 6.

Line numbers are for the current files and will drift; the function names are
the stable part.

---

## 1. The three seams that already exist

| Seam | Where | What it gives | Passed today? |
|---|---|---|---|
| Lesson screen entry | `screen` state, [`src/App.tsx:98`](../../src/App.tsx) | the current screen name, one of `SCREENS` (`src/App.tsx:33`) | it is state, so an effect on it needs no new prop |
| Walkthrough frame | `onStepChange?: (step, index)` on `GameplayFlow`, [`src/screens/gameplay/GameplayFlow.tsx:46`](../../src/screens/gameplay/GameplayFlow.tsx), fired from the effect at `:117` | each of the 31 `GAMEPLAY_STEPS` | **no** — `App.tsx:172` renders `<GameplayFlow onContinue={advance} />` only |
| Live game events | `engine.bus`, subscribed either by a hook beside `useGameAudio` ([`LiveGameplay.tsx:139`](../../src/screens/gameplay/live/LiveGameplay.tsx)) or through the existing `onEvent` prop (`LiveGameplay.tsx:72`, forwarded at `:143`) | every `GameEvent` | `onEvent` exists but **App.tsx does not pass it**; `useGameAudio` is wired |

**Every phase entry is already an event.** `GameEngine.go()`
(`src/game/engine/engine.ts:221`) emits `PHASE_CHANGED { from, to }` on each
accepted transition, and `finish()` (`:567`) emits an explicit
`PHASE_CHANGED → SUMMARY` for the one transition that bypasses `go()`. So the
phase-driven clips need no snapshot polling — one bus subscription covers
screens' worth of triggers.

---

## 2. The map

Policies are the ones assigned in [`sarvam-voice-design.md`](sarvam-voice-design.md) §2.

### A. Lesson screens (V01–V10)

All ten fire the same way: the `screen` state in `App.tsx` becomes that value.
There is no per-screen entry callback and none is needed — an effect keyed on
`screen` sees every entry, including one reached by Back, forward or a refresh
on `?step=`.

| Voice ID | Event | Current implementation file | Function/state | Exact trigger point | Molecule | Playback policy |
|---|---|---|---|---|---|---|
| V01 | welcome | `src/App.tsx` → `src/screens/onboarding/OnboardingScreen.tsx` | `screen === 'signIn'` (`App.tsx:189`) | screen state becomes `signIn` (initial value from `screenFromUrl()`, `App.tsx:98`) | — | QUEUE |
| V02 | carbon introduction | `src/App.tsx` → `src/screens/onboarding/CarbonIntroScreen.tsx` | `screen === 'carbonIntro'` (`App.tsx:190`) | `advance()` moves the state on | — | QUEUE |
| V03 | carbon valency | `src/App.tsx` → `src/screens/onboarding/CarbonValencyScreen.tsx` | `screen === 'carbonValency'` (`App.tsx:191`) | same | — | QUEUE |
| V04 | prefixes | `src/App.tsx` → `src/screens/prefixes/PrefixIntroScreen.tsx` | `screen === 'prefixIntro'` (`App.tsx:192`) | screen entry. The finer-grained seam `PrefixEvent` (`src/screens/prefixes/events.ts`) already reaches `handlePrefixEvent` (`App.tsx:162`); V04 uses `instructionStarted` **or** plain screen entry, and must ignore `prefixShown` / `prefixChanged` — ten chips at ~2.6 s each | — | QUEUE |
| V05 | alkanes | `src/App.tsx` → `src/screens/Alkane/AlkaneScreen.tsx` | `screen === 'alkane'` (`App.tsx:200`) | screen entry | — | QUEUE |
| V06 | alkenes | `src/App.tsx` → `src/screens/Alkene/AlkeneScreen.tsx` | `screen === 'alkene'` (`App.tsx:201`) | screen entry | — | QUEUE |
| V07 | alkynes | `src/App.tsx` → `src/screens/Alkyne/AlkyneScreen.tsx` | `screen === 'alkyne'` (`App.tsx:202`) | screen entry | — | QUEUE |
| V08 | suffix ANE | `src/App.tsx` → `src/screens/suffixes/SuffixScreen.tsx` (`Screen67`) | `screen === 'screen67'` (`App.tsx:203`) | screen entry | — | QUEUE |
| V09 | suffix ENE | `src/App.tsx` → `src/screens/suffixes/SuffixScreen.tsx` (`Screen68`) | `screen === 'screen68'` (`App.tsx:204`) | screen entry | — | QUEUE |
| V10 | suffix YNE | `src/App.tsx` → `src/screens/suffixes/SuffixScreen.tsx` (`Screen69`) | `screen === 'screen69'` (`App.tsx:205`) | screen entry | — | QUEUE |

### A2. Walkthrough (V11–V12)

| Voice ID | Event | Current implementation file | Function/state | Exact trigger point | Molecule | Playback policy |
|---|---|---|---|---|---|---|
| V11 | walkthrough opens | `src/screens/gameplay/GameplayFlow.tsx` | `onStepChange(step, index)` effect (`:117`); `index` state at `:57` | `index === 0`. **Needs the prop wiring at `App.tsx:172`** — `GameplayFlow` accepts `onStepChange` but nothing passes it | — (frames are methane then ethane) | QUEUE |
| V12 | walkthrough ends | `src/screens/gameplay/GameplayFlow.tsx` | same effect | last step: `index === GAMEPLAY_STEPS.length - 1` (`:70` already computes `atEnd`), scene `ethane-15` (`src/screens/gameplay/flow/steps.ts:59`) — 31 steps confirmed | — | QUEUE |

### B/C/D. Per-molecule (M01–M05, E01–E05, P01–P05)

The molecule comes from `GAME_STARTED.molecule` / `snapshot.spec.name`, both of
which are `this.spec.name`. A fresh `GameEngine` is built for every molecule and
every restart (`LiveGameplay.tsx:92`, `useMemo` on `[molecule, round]`), so
per-round state resets by itself if the voice layer is keyed to the engine.

| Voice ID | Event | Current implementation file | Function/state | Exact trigger point | Molecule | Playback policy |
|---|---|---|---|---|---|---|
| M01 | challenge start | `src/game/engine/engine.ts` | `start()` (`:284`) | `GAME_STARTED` emitted at `:286`, called from the frame-loop effect in `LiveGameplay.tsx:149` | methane | QUEUE |
| M02 | carbon requirement | `src/game/engine/engine.ts` | `go('CARBON_SELECTION')` from `start()` (`:287`) | `PHASE_CHANGED { from: 'INTRO_OBJECTIVE', to: 'CARBON_SELECTION' }`. Gate on `from` — a wrong throw re-enters `CARBON_SELECTION` from `PAPER_FLIGHT` via `strikeGroup` (`:725`) | methane | QUEUE |
| M03 | structure ready | `src/game/engine/engine.ts` | `stepImpact()` (`:765`), `go('CARBON_STRUCTURE_READY')` at `:795` | `PHASE_CHANGED → CARBON_STRUCTURE_READY`, immediately followed by `holdThen(teaching.structureReadyMs = 1100)` (`config.ts:206`) | methane — **no C–C bond**: the bond loop at `:779` skips `i === 0`, so a one-carbon molecule emits no `BOND_CREATED` here | QUEUE |
| M04 | hydrogen requirement | `src/game/engine/engine.ts` | `validate()` (`:1292`), `go('HYDROGEN_CALCULATION')` at `:1307` | `PHASE_CHANGED → HYDROGEN_CALCULATION`, or equivalently `HYDROGEN_TARGET_CALCULATED` (`:1309`). Held `teaching.calculationMs = 2600` | methane | QUEUE |
| M05 | completion | `src/game/engine/engine.ts` | `validate()` (`:1299`) | `MOLECULE_COMPLETED { molecule, score }` at `:1300`, then `holdThen(completionMs = 1400)` → `finish()` | methane | INTERRUPT |
| E01 | challenge start | `src/game/engine/engine.ts` | `start()` | `GAME_STARTED`, `molecule === 'ethane'` | ethane | QUEUE |
| E02 | carbon requirement | `src/game/engine/engine.ts` | `go('CARBON_SELECTION')` from `start()` | as M02 | ethane | QUEUE |
| E03 | carbons bonded | `src/game/engine/engine.ts` | `stepImpact()` | `PHASE_CHANGED → CARBON_STRUCTURE_READY`. The C–C bond itself is the `BOND_CREATED` at `:781` (one bond, order from `spec.chainBonds`) | ethane | QUEUE |
| E04 | hydrogen requirement | `src/game/engine/engine.ts` | `validate()` | `PHASE_CHANGED → HYDROGEN_CALCULATION` | ethane | QUEUE |
| E05 | completion | `src/game/engine/engine.ts` | `validate()` | `MOLECULE_COMPLETED` | ethane | INTERRUPT |
| P01 | challenge start | `src/game/engine/engine.ts` | `start()` | `GAME_STARTED`, `molecule === 'propane'` | propane | QUEUE |
| P02 | carbon requirement | `src/game/engine/engine.ts` | `go('CARBON_SELECTION')` from `start()` | as M02 | propane | QUEUE |
| P03 | chain bonded | `src/game/engine/engine.ts` | `stepImpact()` | `PHASE_CHANGED → CARBON_STRUCTURE_READY`; two `BOND_CREATED` at `:781` | propane | QUEUE |
| P04 | hydrogen requirement | `src/game/engine/engine.ts` | `validate()` | `PHASE_CHANGED → HYDROGEN_CALCULATION` | propane | QUEUE |
| P05 | completion | `src/game/engine/engine.ts` | `validate()` | `MOLECULE_COMPLETED` | propane | INTERRUPT |

### E. Shared gameplay feedback (S01–S09)

| Voice ID | Event | Current implementation file | Function/state | Exact trigger point | Molecule | Playback policy |
|---|---|---|---|---|---|---|
| S01 | how to choose | `src/game/engine/engine.ts` | `go('CARBON_SELECTION')` from `start()` | first `PHASE_CHANGED → CARBON_SELECTION` **of the session**. The engine is rebuilt per molecule, so "once per session" cannot live in engine state — see §5.3 | shared | QUEUE |
| S02 | wrong carbon family | `src/game/engine/engine.ts` | `strikeGroup()` (`:694`) → `note()` (`:266`) | `MISTAKE_EXPLAINED { kind: 'WRONG_CARBON_FAMILY', picked, expected }`, raised at `:721` when the set contains an atom whose `family !== spec.family` | shared | DROP |
| S03 | wrong carbon count | `src/game/engine/engine.ts` | `strikeGroup()` → `note()` | `MISTAKE_EXPLAINED { kind: 'WRONG_CARBON_COUNT' }` at `:722` — right colours, `atomIds.length !== spec.carbonCount` | shared | DROP |
| S04 | collect the hydrogens | `src/game/engine/engine.ts` | `validate()` hold callback (`:1311`) | `PHASE_CHANGED → HYDROGEN_SELECTION`, fired when the 2600 ms calculation beat ends. Also reachable from `MOLECULE_VALIDATION` (`:1324`) after an empty-handed miss, so gate on `from === 'HYDROGEN_CALCULATION'` for the once-per-round read | shared | QUEUE |
| S05 | wrong hydrogen family | `src/game/engine/engine.ts` | **two** sites: `noteHydrogenFamily()` (`:358`, guarded once per round by `hydrogenFamilyChosen`) and `missThrow()` (`:1240`, every failed throw of a wrong-family hydrogen) | `MISTAKE_EXPLAINED { kind: 'WRONG_HYDROGEN_FAMILY' }`. One wrong atom therefore produces **two** of these — the pick and the throw — see §5.1 | shared | DROP |
| S06 | tray full | `src/game/engine/engine.ts` | `fireWeb()` (`:447`) | `MISTAKE_EXPLAINED { kind: 'TRAY_FULL' }` at `:453`, when `hydrogenCollectionOpen()` is false, something is held, and the target is not yet met | shared | DROP |
| S07 | no free bond | `src/game/engine/engine.ts` | `missThrow()` | `MISTAKE_EXPLAINED { kind: 'NO_FREE_BOND' }` at `:1243`, chosen when `throwChain > 0` — the throw touched a molecule but found no slot | shared | DROP |
| S08 | missed throw | `src/game/engine/engine.ts` | `missThrow()` | `MISTAKE_EXPLAINED { kind: 'THROW_MISSED' }` at `:1243`, when `throwChain === 0`. Note this is the *mistake*, not the `THROW_MISSED` **event** at `:1248`, which also fires for a wrong-family return and for the paper leaving the table (`:672`) | shared | DROP |
| S09 | first hydrogen bonded | `src/game/engine/engine.ts` | `bondMover()` (`:979`) | first `BOND_CREATED` of the round emitted at `:994` (the thrown-atom bond) — as opposed to `:781`, which is the carbon chain. The event carries ids only, so the element comes from `snapshot.molecule.atoms` | shared | QUEUE |

### F. Timer (T01–T02)

| Voice ID | Event | Current implementation file | Function/state | Exact trigger point | Molecule | Playback policy |
|---|---|---|---|---|---|---|
| T01 | time warning | `src/game/engine/engine.ts` | `stepOnce()` (`:591`) | `TIME_WARNING { secondsLeft: 20 }` at `:620`. One-shot: `this.warned` is set before the emit, and `timer.warnAtSeconds = 20`, `noticeMs = 3500` (`config.ts:204`) | shared | INTERRUPT |
| T02 | timeout | `src/game/engine/engine.ts` | **two** sites: `stepOnce()` (`:624`) when the clock reaches 0, and `finish()` (`:528`) when a round is ended while still active | `TIMEOUT { molecule }`. Needs a once-per-round guard — see §5.2. The clock path then holds `teaching.timeoutMs = 1400` | shared | INTERRUPT |

### G. Summary and progression (G01–G03)

| Voice ID | Event | Current implementation file | Function/state | Exact trigger point | Molecule | Playback policy |
|---|---|---|---|---|---|---|
| G01 | summary, completed | `src/game/engine/engine.ts` + `src/screens/gameplay/live/LiveGameplay.tsx` | `finish()` (`:521`); `summary` built by `summarise()` (`src/game/engine/session.ts:163`) | `PHASE_CHANGED → SUMMARY` (`:567`) with `snapshot.summary.completion === 'completed'` **and** `nextMolecule` non-null (`LiveGameplay.tsx:238` computes exactly this as `goesOnTo`) | shared | QUEUE |
| G02 | summary, timed out | same | same | `PHASE_CHANGED → SUMMARY` with `snapshot.summary.completion === 'timeout'` | shared | QUEUE |
| G03 | end of progression | same + `src/game/engine/config.ts` | `nextAlkane(molecule)` (`config.ts:258`) returns `null` after propane | `PHASE_CHANGED → SUMMARY`, `completion === 'completed'`, `nextAlkane(molecule) === null`. Once per session | shared (after propane) | QUEUE |

---

## 3. The 25 requested trigger points, checked against the code

| # | Requested | Exists? | Where | Narrated by |
|---|---|---|---|---|
| 1 | lesson screen entry | yes | `screen` state, `App.tsx:98` | V01–V10 |
| 2 | carbon introduction | yes | `screen === 'carbonIntro'`, `App.tsx:190` | V02 |
| 3 | carbon valency | yes | `screen === 'carbonValency'`, `App.tsx:191`; copy in `CARBON_VALENCY_LESSON`, `src/content/chemistry.ts` | V03 |
| 4 | bond explanation | yes | `alkane` / `alkene` / `alkyne` screens, `App.tsx:200–202` | V05–V07 |
| 5 | prefix / suffix explanation | yes | `prefixIntro` (`:192`) and `screen67/68/69` (`:203–205`) | V04, V08–V10 |
| 6 | molecule challenge start | yes | `GAME_STARTED`, `engine.ts:286` | M01/E01/P01 |
| 7 | methane start | yes | `GAME_STARTED.molecule === 'methane'` | M01 |
| 8 | ethane start | yes | same, `'ethane'` | E01 |
| 9 | propane start | yes | same, `'propane'` | P01 |
| 10 | carbon targeting / aiming | **no event** | `aim()` (`engine.ts:373`) emits nothing; `aimedTarget()` (`:1187`) is recomputed per frame and surfaces only on the snapshot | nothing — and nothing should. Aiming changes on every pointer move |
| 11 | carbon projectile throw | yes | `throwPaperAt()` → `PAPER_THROWN { atomId: 'paper' }`, `engine.ts:353` (a hydrogen throw is `throwAt()` at `:506`, with the atom's own id) | deliberately silent — it already has an SFX and ~1.7 s of animation |
| 12 | carbon–carbon collision | yes | `strikeGroup()` → `ATOM_COLLISION { movingId: 'paper', bonded: true }`, `engine.ts:751`; the wrong-set version is the same event with `bonded: false` at `:723` | deliberately silent |
| 13 | C–C bond creation | yes, **except methane** | `stepImpact()` → `BOND_CREATED`, `engine.ts:781`; the loop skips the first atom, so one carbon means no bond | E03 / P03 describe it; M03 must not |
| 14 | hydrogen collection phase | yes | `PHASE_CHANGED → HYDROGEN_SELECTION` / `HYDROGEN_COLLECTION`; `hydrogenCollectionOpen()` at `:425` is the gate | S04 |
| 15 | hydrogen collection | yes | `stepWeb()` → `ATOM_COLLECTED`, `engine.ts:822` (fires per atom, 4–8 times) | deliberately silent |
| 16 | hydrogen throw | yes | `throwAt()` → `PAPER_THROWN`, `engine.ts:506` | deliberately silent |
| 17 | C–H bond creation | yes | `bondMover()` → `BOND_CREATED`, `engine.ts:994` | S09, first one only |
| 18 | wrong carbon-family selection | yes | `strikeGroup()` → `MISTAKE_EXPLAINED`, `engine.ts:721` (and `WRONG_ATOM_SELECTED` at `:707`) | S02, with S03 for the count |
| 19 | wrong hydrogen-family selection | yes, from two places | `noteHydrogenFamily()` `:368` and `missThrow()` `:1240` | S05 |
| 20 | missed throw | yes | `missThrow()` `:1243` / `:1248`; the paper's own out-of-bounds miss is at `:672` and raises **no** `MISTAKE_EXPLAINED` | S08 (hydrogen only — see §5.4) |
| 21 | 20-second warning | yes | `TIME_WARNING`, `engine.ts:620` | T01 |
| 22 | timeout | yes, from two places | `stepOnce()` `:624` and `finish()` `:528` | T02 |
| 23 | molecule completion | yes | `MOLECULE_COMPLETED`, `engine.ts:1300` | M05/E05/P05 |
| 24 | transition to next molecule | yes | `onSummary` (`LiveGameplay.tsx:239`) → `onAdvance(goesOnTo)` → `setMolecule` (`App.tsx:179`) → new engine → `GAME_STARTED` | G01 then E01/P01 |
| 25 | final completion / replay | yes | `goesOnTo === null` → `restart()` (`LiveGameplay.tsx:236`) bumps `round`, rebuilding the engine | G03 |

**No carbon-collection trigger was invented.** `collectablePool()`
(`engine.ts:411`) returns `hydrogenRowIds` only; the paper is the projectile in
the carbon phase (`throwPaperAt`, `:325`), and `machine.ts` has no
`CARBON_COLLECTION` phase.

---

## 4. Coverage

| | Count |
|---|---|
| Clips total | 41 |
| Directly connectable to an existing engine event or phase transition, with no new plumbing | **29** (M01–M05, E01–E05, P01–P05, S01–S09, T01–T02, G01–G03) |
| Connectable to existing React state with an effect, no new prop | **10** (V01–V10) |
| Needing one prop wired that already exists on the component | **2** (V11, V12 — `GameplayFlow`'s `onStepChange`, at `App.tsx:172`) |
| Needing a game-logic change | **0** |
| With no real trigger at all | **0** |

---

## 5. Ambiguities found during this pass

Recorded, not fixed. None is a gameplay bug and none needs a gameplay change.

**5.1 `WRONG_HYDROGEN_FAMILY` fires twice for one wrong atom.** Once at the pick
(`noteHydrogenFamily`, `engine.ts:368`) and again when the throw fails
(`missThrow`, `:1240`). The wording approved for S05 covers both moments
deliberately, but DROP alone will not suppress the second one if the first has
finished playing by then — the throw can be seconds later. A same-reason
cooldown (roughly `teaching.feedbackMs = 5000`, which is how long the card keeps
the explanation up) is the natural rule. Needs a decision at integration.

**5.2 `TIMEOUT` has two emit sites.** The clock reaching zero (`:624`) and
`finish()` ending an active round (`:528`). A round that times out normally hits
the first; both can be reached in one round only if `finish()` is called from
outside, which nothing currently does. T02 should still be guarded once per
round rather than assuming one emit.

**5.3 "Once per session" has nowhere to live.** S01, G03 and V01–V12 are
once-per-session, but a new `GameEngine` is constructed for every molecule and
every restart (`LiveGameplay.tsx:92`), so engine state resets under them. The
voice layer needs its own store outside the engine — App-level or module-level.
This is exactly why S01 cannot be attached to the engine the way S02 can.

**5.4 A paper thrown off the table gets no spoken line.** `stepPaper()` emits
`THROW_MISSED { atomId: 'paper', reason: 'out-of-bounds' }` at `:672` with no
`MISTAKE_EXPLAINED`, so S08 — attached to the mistake — stays silent. The
approved S08 wording ("aim at one of the free bond markers") is hydrogen-phase
wording and would be wrong there anyway. No clip covers it. Leaving it silent is
consistent with the card, which also says nothing.

**5.5 The held beats are still shorter than their lines.** 1100 ms for
`CARBON_STRUCTURE_READY` and 2600 ms for `HYDROGEN_CALCULATION`
(`config.ts:206`), and `skipTeachingBeat()` (`:259`) ends either on the first
click. M03/M04 and their siblings will outlive their beats. The design document
recommends letting the audio finish; that stands, and lengthening the beats
would change gameplay timing.

**5.6 Corrections to the earlier documents.** `sarvam-voice-script.md` gates
G01/G02 on `completionStatus`. That is the field on `SessionRecord`
(`session.ts:43`); what a listener actually reads is
`snapshot.summary.completion` (`session.ts:145`, used at `LiveGameplay.tsx:237`).
Same values, different path. Also, the event map lists `onStepChange` as an
existing hook without noting that `App.tsx` does not pass it.

---

## 6. Recommended integration architecture

Mirror the sound layer exactly. It is the precedent the codebase already sets,
and it kept audio out of gameplay entirely.

1. **`src/game/voice/voiceClips.ts`** — the 41 ids mapped to file paths and
   policies. Data only, no chemistry. The wording stays in the script document
   and in the generated audio; nothing re-derives copy from
   `src/content/chemistry.ts`.
2. **`src/game/voice/VoiceManager.ts`** — one channel. Load, play, stop,
   `INTERRUPT` / `QUEUE` / `DROP`, a same-clip guard and the §5.1 cooldown.
   Peer of `AudioManager.ts`, and it should not share its bus so speech and
   effects can be muted separately.
3. **`src/game/voice/voiceForEvent.ts`** — pure `(event, context) => clipId | null`,
   the peer of `eventSounds.ts` and testable with `node --test` the way
   `eventSounds.test.ts` is. `context` carries the molecule, the per-round flags
   and the session flags from §5.3, plus the atom lookup S09 needs.
4. **`src/game/voice/useGameVoice.ts`** — one hook in `LiveGameplay`, beside
   `useGameAudio` at `:139`, taking the engine so it can read
   `engine.snapshot()` for the S09 bond lookup. This is the smallest possible
   footprint in a screen file and touches nothing under `src/game/engine`.
5. **Lessons** — a small effect on `screen` in `App.tsx` for V01–V10, and
   `onStepChange` passed to `GameplayFlow` for V11/V12. Session-scoped flags
   live here, or in a module singleton beside the manager.
6. **Mute** — reuse `?mute=1` as the design document asks, and add a separate
   voice toggle rather than overloading it.

Nothing in this shape requires a change to `src/game/engine`, physics,
chemistry, scoring, the timer, routing or the Figma layout. Both held beats,
both mistake paths and every phase transition are already observable from the
bus.

---

## 7. State of the tree after this pass

- No file under `src/` was modified. Verified with a timestamp comparison
  against this document.
- `.env.local` created with an empty `SARVAM_API_KEY=` placeholder; it is
  ignored by git. The key appears nowhere in source, in documentation or in
  this file.
- `npm test` — **166 passing, 0 failing.**
