# Sarvam voice — event map

Every trigger below is a real screen, phase or event in the current build. The
sources are `src/game/engine/machine.ts` (phases), `src/game/engine/events.ts`
(events), `src/App.tsx` (screens) and `src/game/engine/config.ts` (timings).
Nothing here is invented.

## Where narration can attach

| Surface | Hook that already exists | What it gives |
|---|---|---|
| Lesson screens | `screen` state in `src/App.tsx` | screen entry |
| Guided walkthrough | `GameplayFlow` prop `onStepChange(step, index)` | each of its 31 scripted frames |
| Live game | `LiveGameplay` prop `onEvent(event)` → `engine.bus` | every `GameEvent` |
| Live game | the per-frame `Snapshot` | phase, counts, `timeRemaining`, `feedback` |

The live game already passes engine events to the audio layer this way
(`useGameAudio`), so a voice layer can subscribe identically without touching
gameplay.

## Screens, in order

`src/App.tsx` → `SCREENS`:

| # | Screen | Voice |
|---|---|---|
| 1 | `signIn` | V01 |
| 2 | `carbonIntro` | V02 |
| 3 | `carbonValency` | V03 |
| 4 | `prefixIntro` | V04 |
| 5 | `alkane` | V05 |
| 6 | `alkene` | V06 |
| 7 | `alkyne` | V07 |
| 8 | `screen67` (ANE) | V08 |
| 9 | `screen68` (ENE) | V09 |
| 10 | `screen69` (YNE) | V10 |
| 11 | `gameplay` (walkthrough) | V11 on first frame, V12 on the last |
| 12 | `play` (live game) | everything below |

## Gameplay phases

`Phase` in `machine.ts`. Marked **held** where the engine deliberately stops on
the beat and **pauses the round clock** (`rules.teaching`).

| Phase | Held for | Voice |
|---|---|---|
| `INTRO_OBJECTIVE` | — (left immediately by `start()`) | none |
| `CARBON_SELECTION` | — | M02 / E02 / P02, S01 |
| `PAPER_FLIGHT` | — | none |
| `CARBON_IMPACT` | — | none |
| `CARBON_STRUCTURE_READY` | 1100 ms | M03 / E03 / P03 |
| `HYDROGEN_CALCULATION` | 2600 ms | M04 / E04 / P04 |
| `HYDROGEN_SELECTION` | — | S04 |
| `HYDROGEN_COLLECTION` | — | none (see S04) |
| `THROWING` | — | none |
| `COLLISION` | — | none |
| `MOLECULE_VALIDATION` | — (never drawn) | none |
| `COMPLETION` | 1400 ms | M05 / E05 / P05 |
| `TIMEOUT` | 1400 ms | T02 |
| `SUMMARY` | — | G01 / G02 / G03 |

Both held beats are **skippable by any click or key press**
(`engine.skipTeachingBeat()`), so a clip attached to one may outlive its beat.
See the playback rules in the design document.

## Events

`GameEvent` in `events.ts`. "Per round" counts are for one molecule.

| Event | How often | Voice |
|---|---|---|
| `GAME_STARTED` | once per molecule (a fresh engine is built for each) | M01 / E01 / P01 |
| `ATOM_SELECTED` | carbon: once per correct throw · hydrogen: **once per round only** | none |
| `WRONG_ATOM_SELECTED` | carbon: every wrong throw · hydrogen: **once per round only** | none — use `MISTAKE_EXPLAINED` |
| `WEB_STARTED` | every hydrogen pick (up to 8+) | none |
| `ATOM_COLLECTED` | every hydrogen collected | none |
| `PAPER_THROWN` | every throw | none |
| `ATOM_COLLISION` | every contact | none |
| `BOND_CREATED` | every bond (4–10 per round) | S09 on the first C–H bond only |
| `THROW_MISSED` | every miss | S08 |
| `HYDROGEN_TARGET_CALCULATED` | once per round | (see the phase table) |
| `TIME_WARNING` | **once per round**, at 20 s | T01 |
| `TIMEOUT` | once per round | T02 |
| `MOLECULE_COMPLETED` | once per round | M05 / E05 / P05 |
| `MISTAKE_EXPLAINED` | each mistake | S02, S03, S05, S06, S07 |
| `PHASE_CHANGED` | constantly | none directly |

### `MISTAKE_EXPLAINED` reasons

`MistakeReason` in `events.ts`:

| Reason | Fired from | Voice |
|---|---|---|
| `WRONG_CARBON_FAMILY` | `strikeGroup` — the set contains a non-blue carbon | S02 |
| `WRONG_CARBON_COUNT` | `strikeGroup` — right colours, wrong number | S03 |
| `WRONG_HYDROGEN_FAMILY` | on the pick (first of the round) **and** on each failed throw | S05 |
| `TRAY_FULL` | a pick refused because the tray is at its cap | S06 |
| `NO_FREE_BOND` | a throw that hit a carbon with no free bond | S07 |
| `THROW_MISSED` | a throw that reached nothing | S08 |

## Events that must NOT each get a clip

`WEB_STARTED`, `ATOM_COLLECTED`, `PAPER_THROWN`, `ATOM_COLLISION`,
`PHASE_CHANGED` and most `BOND_CREATED` fire many times per round — a propane
round emits roughly 40 of them. They already have sound effects
(`src/game/audio/eventSounds.ts`) and on-screen counters.

## Distinguishing a C–H bond from a C–C bond

`BOND_CREATED` carries `{ a, b, order }` — atom **ids**, not elements. A
listener that needs to know which kind of bond formed must look the ids up in
`snapshot.molecule.atoms`. Noted here because S09 depends on it.
