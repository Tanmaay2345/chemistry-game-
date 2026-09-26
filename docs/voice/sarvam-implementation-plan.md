# Sarvam narration — Phase 0 analysis and implementation plan

Analysis only. No source file was modified, no audio was generated, the Sarvam
API was not called and no `VoiceManager` exists. The API key is in `.env.local`
and is referenced nowhere in this document.

Read alongside [`sarvam-voice-script.md`](sarvam-voice-script.md),
[`sarvam-voice-event-map.md`](sarvam-voice-event-map.md),
[`sarvam-voice-design.md`](sarvam-voice-design.md) and
[`sarvam-integration-map.md`](sarvam-integration-map.md).

---

## The finding that shapes everything below

**No instructional screen in this game advances by itself.** Every lesson
transition is a deliberate press on the instruction card, which
`InstructionCard` renders as a real `<button>` when `onContinue` is supplied
(`src/components/InstructionCard.tsx:56`). The gameplay transitions are driven
by the engine and by the round clock.

So the requested pattern —

> when narration finishes, advance to the next screen

— has **no transition to trigger** on the lesson screens. Narration ending can
only *unlock* a control the student then presses. Making narration end advance
the screen by itself would convert ten click-through lessons into an
auto-playing slideshow, which is the lesson-flow redesign the brief forbids.

Section D therefore reads "block" as **gate the existing control**, never
"auto-advance", and section G explains that this is what removes the
double-advance risk in requirement 8 entirely: if audio completion never causes
a transition, audio completion and a click can never both cause one.

---

## A. The 41 clips to generate

| Group | IDs | Count |
|---|---|---|
| Lesson screens | V01–V10 | 10 |
| Walkthrough bookends | V11–V12 | 2 |
| Methane | M01–M05 | 5 |
| Ethane | E01–E05 | 5 |
| Propane | P01–P05 | 5 |
| Shared gameplay feedback | S01–S09 | 9 |
| Timer | T01–T02 | 2 |
| Summary and progression | G01–G03 | 3 |
| **Total** | | **41** |

15 are molecule-specific (M/E/P), 26 shared.

---

## B–E. Exact text, trigger, blocking and kind

`Kind`: **I** instructional · **F** feedback or error · **T** timer ·
**C** completion or summary.
`Blocks`: whether narration completion gates a transition (see section D notes).

### Lesson screens — `screen` state, `src/App.tsx:98`

| ID | Exact text | Trigger | Kind | Blocks |
|---|---|---|---|---|
| V01 | "Welcome. You're going to build carbon molecules, and learn how chemists name them while you do it." | `screen === 'signIn'` | I | **no** — see D.3, autoplay |
| V02 | "Everything here is built from carbon. Carbon is the atom that joins to other atoms to make whole compounds." | `screen === 'carbonIntro'` | I | yes (gate) |
| V03 | "Carbon has six electrons, and four of them sit in its outer shell. That gives it four places to bond. Valency four. Remember that number — the whole game runs on it." | `screen === 'carbonValency'` | I | yes (gate) |
| V04 | "The first part of a molecule's name tells you how many carbons it has. Meth is one. Eth is two. Prop is three. Watch the rail." | `screen === 'prefixIntro'` | I | yes (gate) |
| V05 | "When every carbon-to-carbon bond in a chain is a single bond, the chain is an alkane. In this game, alkanes are blue." | `screen === 'alkane'` | I | yes (gate) |
| V06 | "If one pair of carbons is joined by a double bond, it's an alkene. Alkenes are red." | `screen === 'alkene'` | I | yes (gate) |
| V07 | "A triple bond between a pair of carbons makes an alkyne. Alkynes are green." | `screen === 'alkyne'` | I | yes (gate) |
| V08 | "The ending of the name carries the bond. Single bonds end in ane." | `screen === 'screen67'` | I | yes (gate) |
| V09 | "A double bond ends in ene." | `screen === 'screen68'` | I | yes (gate) |
| V10 | "And a triple bond ends in yne. Prefix for the carbons, ending for the bond — that's the whole naming rule." | `screen === 'screen69'` | I | yes (gate) |
| V11 | "Here's how a round is played. Follow along — you'll do it yourself in a moment." | `onStepChange` index 0, `GameplayFlow.tsx:117` | I | yes (gate) |
| V12 | "That's the whole loop. Now it's your turn." | `onStepChange` last index, scene `ethane-15` | I | yes (gate) |

### Methane — engine events

| ID | Exact text | Trigger | Kind | Blocks |
|---|---|---|---|---|
| M01 | "First molecule: methane. C H four — one carbon, four hydrogens." | `GAME_STARTED`, methane | I | no |
| M02 | "Meth means one carbon. Throw the paper at a single blue carbon." | `PHASE_CHANGED → CARBON_SELECTION`, `from === 'INTRO_OBJECTIVE'` | I | no |
| M03 | "There's your carbon, with four bonds waiting to be filled." | `PHASE_CHANGED → CARBON_STRUCTURE_READY` | I | **no** — held beat, D.2 |
| M04 | "Four bonds, nothing else using them. So methane takes four hydrogens." | `PHASE_CHANGED → HYDROGEN_CALCULATION` | I | **no** — held beat, D.2 |
| M05 | "That's methane. One carbon, four hydrogens, every bond single." | `MOLECULE_COMPLETED`, methane | C | no |

### Ethane

| ID | Exact text | Trigger | Kind | Blocks |
|---|---|---|---|---|
| E01 | "Next: ethane. Eth means two carbons. C two H six." | `GAME_STARTED`, ethane | I | no |
| E02 | "This time you need a set of two blue carbons." | `PHASE_CHANGED → CARBON_SELECTION`, first entry | I | no |
| E03 | "Good. The two carbons are joined by a single bond — that's what the ane ending means." | `PHASE_CHANGED → CARBON_STRUCTURE_READY` | I | no — held beat |
| E04 | "Two carbons, four bonds each, makes eight. The bond between them uses two. Six left for hydrogen." | `PHASE_CHANGED → HYDROGEN_CALCULATION` | I | no — held beat |
| E05 | "Ethane, complete. Two carbons and six hydrogens." | `MOLECULE_COMPLETED`, ethane | C | no |

### Propane

| ID | Exact text | Trigger | Kind | Blocks |
|---|---|---|---|---|
| P01 | "Last one: propane. Prop means three carbons. C three H eight." | `GAME_STARTED`, propane | I | no |
| P02 | "Find the set of three blue carbons." | `PHASE_CHANGED → CARBON_SELECTION`, first entry | I | no |
| P03 | "A chain of three, all single bonds." | `PHASE_CHANGED → CARBON_STRUCTURE_READY` | I | no — held beat |
| P04 | "Three carbons give twelve bonds. Two carbon-to-carbon bonds use four. Eight left for hydrogen." | `PHASE_CHANGED → HYDROGEN_CALCULATION` | I | no — held beat |
| P05 | "Propane, complete. Three carbons and eight hydrogens." | `MOLECULE_COMPLETED`, propane | C | no |

### Shared feedback

| ID | Exact text | Trigger | Kind | Blocks |
|---|---|---|---|---|
| S01 | "The colour of a carbon set is the bond it makes. Blue is single bonds, so blue is what an alkane is built from." | first `CARBON_SELECTION` of the session | I | no |
| S02 | "That set has a carbon from another family in it. An alkane is built from blue carbons only. Throw again." | `MISTAKE_EXPLAINED · WRONG_CARBON_FAMILY` | F | no |
| S03 | "Right colour, wrong number. The prefix in the name tells you how many carbons to take." | `MISTAKE_EXPLAINED · WRONG_CARBON_COUNT` | F | no |
| S04 | "Now the hydrogens. Click one in the row to pick it up, then throw it at a free bond." | `PHASE_CHANGED → HYDROGEN_SELECTION`, `from === 'HYDROGEN_CALCULATION'` | I | no |
| S05 | "That hydrogen is from another set. Hydrogen always makes a single bond whatever colour it is — the colour just says which molecule it belongs to. This alkane needs a blue one." | `MISTAKE_EXPLAINED · WRONG_HYDROGEN_FAMILY` | F | no |
| S06 | "You're already holding one. Throw it first." | `MISTAKE_EXPLAINED · TRAY_FULL` | F | no |
| S07 | "That carbon already has all four bonds. Aim at one that still shows a free bond marker." | `MISTAKE_EXPLAINED · NO_FREE_BOND` | F | no |
| S08 | "That one didn't land. Aim at one of the free bond markers." | `MISTAKE_EXPLAINED · THROW_MISSED` | F | no |
| S09 | "Good — that's one bond filled." | first `BOND_CREATED` of the round with a hydrogen end | F | no |
| T01 | "Twenty seconds left." | `TIME_WARNING` | T | no |
| T02 | "Time's up. Let's look at what you built." | `TIMEOUT` | T | no |
| G01 | "Nicely done. Press the card when you're ready for the next one." | `PHASE_CHANGED → SUMMARY`, `summary.completion === 'completed'`, next molecule exists | C | no |
| G02 | "Have a look at the notes on the card, then press it to try again." | `PHASE_CHANGED → SUMMARY`, `completion === 'timeout'` | C | no |
| G03 | "Methane, ethane and propane — you've built all three. Same rule every time: the prefix counts the carbons, and every carbon ends up with four bonds." | `PHASE_CHANGED → SUMMARY`, completed, `nextAlkane() === null` | C | no |

### Counts

| Kind | IDs | Count |
|---|---|---|
| Instructional (I) | V01–V12, M01–M04, E01–E04, P01–P04, S01, S04 | 26 |
| Feedback / error (F) | S02, S03, S05–S09 | 7 |
| Timer (T) | T01, T02 | 2 |
| Completion / summary (C) | M05, E05, P05, G01–G03 | 6 |
| Gate a transition | V02–V12 | **11** |

---

## D. Notes on blocking

**D.1 Only the lesson screens can be gated.** 11 of 41. Everything in play is
driven by the engine or the clock.

**D.2 The held beats must not be gated.** `CARBON_STRUCTURE_READY` (1100 ms) and
`HYDROGEN_CALCULATION` (2600 ms) pause the round clock, and
`skipTeachingBeat()` (`engine.ts:259`) ends either on the first click —
deliberately, because a beat that ignores the player reads as a freeze. Holding
a beat open until a 5-second clip ends would lengthen gameplay timing, which the
brief forbids, and would break the skip the game already promises. The design
document's rule 3 already resolves this: let the clip play on over the resumed
game rather than extending the beat. These clips are `INTERRUPT`/`QUEUE`, so a
new beat cuts or queues them correctly.

**D.3 V01 probably cannot play at all, and must never gate anything.** Browsers
refuse audio before a user gesture; `AudioManager.unlock()` exists for exactly
this and is called from the first `pointerdown`
(`src/game/audio/useGameAudio.ts:22`). `signIn` is the first screen, so
`HTMLAudioElement.play()` there will reject with `NotAllowedError`. If V01 also
gated the sign-in card, the student would be **locked out of the game
permanently** — the clip cannot finish because it cannot start. V01 must
therefore be fire-and-forget, and every gate needs the failure path in D.4
regardless.

**D.4 A gate must fail open.** A clip that 404s, fails to decode, or is blocked
by policy must unlock the control immediately. Concretely: gate on
`ended` **or** `error` **or** a rejected `play()` promise, and treat "no clip
for this screen" as unlocked. A narration bug must never be able to stop a
student progressing.

**D.5 What the gate should do to the control.** Two options; my recommendation is
the second.

| | Hard gate | Soft gate *(recommended)* |
|---|---|---|
| Card while speaking | `disabled` | stays a live `<button>`, `aria-busy="true"`, subdued |
| A press while speaking | ignored | stops narration **and** advances, in that one press |
| Requirement 3 ("prevent advancing") | satisfied literally | satisfied by the brief's own carve-out: "unless the existing design explicitly allows an interruption" — it does, via `skipTeachingBeat` and an always-live card |
| Requirement 7 ("preserve existing interactions") | **violated** — the card is clickable today | satisfied |
| Requirement 8 (no double advance) | satisfied | satisfied — one press, one advance; `ended` never advances |
| Accessibility | disabling a focused button moves focus and is announced as unavailable | no focus change |
| Risk | a 12-second V03 traps an impatient student; a broken clip traps everyone | none identified |

The soft gate also keeps the codebase's existing idiom: the game already treats
"the first click ends the teaching beat" as the correct answer to this exact
problem.

---

## F. How every transition happens today

| Transition | Mechanism | Code |
|---|---|---|
| `signIn` → `carbonIntro` | click, then a 400 ms busy state | `handleSignIn`, `App.tsx:154` |
| `carbonIntro` → … → `screen69` → `gameplay` | **click** on the instruction card (a `<button>`) | `advance()`, `App.tsx:107`; card at `InstructionCard.tsx:56` |
| Prefix rail chips | **timer**, 2.6 s per chip, one pass, stops on the last | `PrefixIntroScreen.tsx:63–70` — does **not** advance the screen |
| `gameplay` walkthrough, frame to frame | **click** on a named element, or a **timer** for the in-flight frames | `steps.ts`, `advance: {kind:'click'\|'auto'}` |
| `gameplay` → `play` | **click** on the last frame | `onContinue` → `advance()`, `App.tsx:172` |
| Screen ↔ URL, Back/forward | `pushState` / `replaceState` effect and `popstate` | `App.tsx:117–152` |
| Round start | engine event | `start()` → `GAME_STARTED`, `engine.ts:286` |
| Every gameplay phase | `PHASE_CHANGED` from `go()`, plus an explicit one for `→ SUMMARY` | `engine.ts:221`, `:567` |
| Carbon chosen / rejected | throw resolution | `strikeGroup()`, `engine.ts:694` |
| Teaching beats | held timers that pause the round clock, skippable | `holdThen()`, `engine.ts:233`; `config.ts:206` |
| Round end | clock reaching zero, or completion | `stepOnce()` `:624`; `validate()` `:1300` |
| Summary → next molecule | **click** on the summary card | `onSummary`, `LiveGameplay.tsx:239` → `onAdvance` → `setMolecule` |
| Replay at the end | **click**, rebuilds the engine | `restart()`, `LiveGameplay.tsx:236` |

---

## G. Where narration completion connects to a transition

**Eleven places, all the same place.** V02–V12 gate the instruction card that
already exists on their screen. There is no other point in the game where a
transition should wait for audio:

- Gameplay phases advance on engine state and the round clock (D.2).
- The summary card is the next-molecule and replay control; gating it would add
  a new wait inside gameplay.
- The walkthrough's auto frames (450–800 ms) are explicitly never narrated.

Because narration completion only ever *unlocks*, it never *causes* a
transition, so requirement 8 is satisfied structurally rather than by
coordination between two handlers.

---

## H. Duplicate-trigger problems

| # | Problem | Why | Smallest fix |
|---|---|---|---|
| H1 | `WRONG_HYDROGEN_FAMILY` fires twice per wrong atom | pick (`engine.ts:368`) and failed throw (`:1240`) | same-reason cooldown, 5000 ms, matching `teaching.feedbackMs` |
| H2 | `TIMEOUT` has two emit sites | `stepOnce():624` and `finish():528` | once-per-round flag on T02 |
| H3 | M02/E02/P02 would repeat on every wrong carbon throw | `strikeGroup()` returns to `CARBON_SELECTION` (`:725`) | require `from === 'INTRO_OBJECTIVE'` |
| H4 | S04 would repeat | `HYDROGEN_SELECTION` is also entered from `MOLECULE_VALIDATION` (`:1324`) | require `from === 'HYDROGEN_CALCULATION'` |
| H5 | S09 would fire on all 4–10 bonds | `BOND_CREATED` per bond | once-per-round flag, plus a hydrogen-end check via `snapshot.molecule.atoms` |
| H6 | **React StrictMode double-invokes effects** — V01–V10 would each speak twice in dev | already bit this codebase: the history `pushState` double-push, `App.tsx:112–125` | a played-clip set in a ref or module singleton, checked before `play()`, never a bare effect |
| H7 | `onStepChange` re-fires when the callback identity changes | effect deps `[step, index, onStepChange]`, `GameplayFlow.tsx:118` | wrap the handler in `useCallback` at the call site |
| H8 | Restart replays M01 and re-gates nothing | `restart()` rebuilds the engine → new `GAME_STARTED` | intended for a replayed round; decide explicitly and record it |
| H9 | Back/forward re-enters a lesson screen and re-speaks it | `popstate` → `setScreen` (`App.tsx:146`) | the played-clip set is session-scoped, so a revisit is silent; offer a deliberate replay control later if wanted |
| H10 | Two engines briefly alive across a molecule change | `useMemo` rebuild (`LiveGameplay.tsx:92`) | cancel all speech on engine change, per design rule 4 |

---

## I. The six documented ambiguities, with the smallest safe resolution

| | Ambiguity | Smallest safe resolution | Touches gameplay? |
|---|---|---|---|
| 5.1 | `WRONG_HYDROGEN_FAMILY` fires twice (pick, then failed throw) | 5000 ms same-reason cooldown in the voice layer, matching how long the card keeps the explanation up. The event keeps firing; only the clip is suppressed | no |
| 5.2 | `TIMEOUT` has two emit sites | once-per-round flag on T02, keyed to the engine instance | no |
| 5.3 | "Once per session" has nowhere to live (engine is rebuilt per molecule and per restart) | one module-level `Set<VoiceId>` beside the manager, cleared only on a full reload. Covers S01, G03, V01–V12 and fixes H6 at the same time | no |
| 5.4 | A paper thrown off the table gets no spoken line | leave silent. `stepPaper():672` raises no `MISTAKE_EXPLAINED`, the card also says nothing, and S08's wording is hydrogen-phase wording. Record it; do not add a clip | no |
| 5.5 | Held beats (1100 / 2600 ms) are shorter than their clips and skippable | let the clip play on past the beat (design rule 3). Do not lengthen the beats, do not cut the sentence | no |
| 5.6 | Script gates G01/G02 on `completionStatus`, which is the `SessionRecord` field | read `snapshot.summary.completion` (`session.ts:145`), as `LiveGameplay.tsx:237` already does. Correct the script document's wording only | no |

None of the six needs an engine change.

---

## Implementation plan

Seven phases. Each ends somewhere the game still runs and the tests still pass.
Phases 1–2 touch no existing file at all.

### Phase 1 — generate the audio *(new files only)*

- A dev-only Node script under `tools/voice/`, outside `src/`, reading
  `process.env.SARVAM_API_KEY` via `node --env-file=.env.local`. Never printed,
  never bundled, never sent anywhere but the Sarvam request.
- It parses the clip table out of `sarvam-voice-script.md` rather than holding a
  second copy of the text, so the approved script stays the single source and
  cannot drift.
- One test clip first — recommend **M04** (a held beat, a number-heavy line, and
  it exercises the pronunciation risks): verify the file plays, the transcript
  matches, and report speaker, model, format, sample rate and duration.
- Then the remaining 40 into `public/audio/voice/`, named `<VoiceID>-<slug>.mp3`.
- Writes `docs/voice/sarvam-generation-manifest.md`.
- **Open decision:** the design document specifies a voice style but no speaker
  or model. Needs your choice of `bulbul:v3` (37 voices, temperature, 24 kHz) or
  `bulbul:v2` (7 voices, pitch/loudness) and a speaker before this phase can run.

### Phase 2 — the voice layer, not yet connected *(new files only)*

- `src/game/voice/voiceClips.ts` — the 41 ids, file paths and policies. Data only.
- `src/game/voice/VoiceManager.ts` — one `HTMLAudioElement` channel:
  `play(id)`, `stop()`, `cancelAll()`, `INTERRUPT`/`QUEUE`/`DROP`, the H1
  cooldown, a same-clip guard, and a `whenEnded(id): Promise<void>` resolved by
  the element's **`ended` event** and also by `error` and by a rejected
  `play()` (D.4). `HTMLAudioElement` rather than Web Audio: narration is long,
  streams, and needs no scheduling — and `AudioManager` stays untouched.
- `src/game/voice/voiceForEvent.ts` — pure `(event, context) => VoiceId | null`,
  the peer of `eventSounds.ts`.
- `src/game/voice/voiceSession.ts` — the module-level played set (5.3, H6).
- Unit tests under `node --test`, the way `eventSounds.test.ts` works: every
  event maps to at most one clip, H1–H5 guards hold, a gate opens on `error`.

### Phase 3 — connect the live game *(one hook call added)*

- `useGameVoice(engine, enabled)` beside `useGameAudio` at
  `LiveGameplay.tsx:139`, taking the engine so it can read `engine.snapshot()`
  for the S09 bond lookup. Cancel all speech when the engine changes (H10) and
  on `visibilitychange` (requirement 10).
- 29 clips live. **No gating anywhere** — nothing in play waits for audio.
- Regression check: 166 tests, plus the full methane → ethane → propane run.

### Phase 4 — lesson narration, ungated

- An effect on `screen` in `App.tsx` plays V01–V10 through the played set.
- Still no gating, so if anything here is wrong the flow is unchanged.

### Phase 5 — the gate

- A small `useNarrationGate(screen)` returning `speaking`, consumed by the
  screens that already take `onContinue`, wired as the soft gate in D.5.
- V01 excluded (D.3). Fails open (D.4).
- `onStepChange` wired for V11/V12, `useCallback` per H7.

### Phase 6 — tab pause, mute, replay

- Pause or cancel narration on `visibilitychange`, matching
  `LiveGameplay.tsx:112`; never let a gate open while the tab is hidden.
- `?mute=1` silences narration too, plus a separate voice toggle as the design
  document recommends.
- Back, forward, restart and molecule change verified against H8 and H9.

### Phase 7 — verification

- Full playthrough from `/`; the 166 tests plus the new voice tests; confirm no
  runtime Sarvam call (network panel clean); confirm the key is absent from
  `dist/`; confirm `public/audio/*.mp3` SFX are untouched.

### Not in any phase

Gameplay, physics, collision, chemistry, scoring, timer, SFX, Figma layout,
responsive system, molecule progression, routing. Nothing under
`src/game/engine` is written to in any phase above.
