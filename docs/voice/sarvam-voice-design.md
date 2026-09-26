# Sarvam voice — style, timing and playback

Design recommendations only. Nothing here is implemented, no `VoiceManager`
exists, no audio has been generated and the Sarvam API has not been called.

## 1. Voice direction

| | |
|---|---|
| **Personality** | A game guide who happens to know chemistry — closer to a good demonstrator than a lecturer. Warm, unhurried, never arch. It explains the rule and then gets out of the way. |
| **Role** | Guide, not teacher and not mentor. The lessons already teach; in play the voice mostly points and confirms. |
| **Tone** | Plain and friendly. Encouraging on success without being congratulatory — "Good, that's one bond filled", not "Amazing work!". On a mistake, explain the rule; never scold and never say only "Wrong". |
| **Energy** | Medium and level. The game has a clock; the voice should not add urgency of its own. The one exception is T01, which may lift very slightly. |
| **Pace** | About 150 words per minute for in-play lines. The lesson lines (section A) can drop to ~135 — nothing is moving and the ideas are new. |
| **Language** | English only for version one. The on-screen copy is entirely English, so a code-mixed read would sit oddly against it. Sarvam's Indian-English voices are a good fit for the audience; that is a voice choice, not a language change. |

### Pronunciation

Give Sarvam these explicitly, since a general TTS voice often stresses them
wrongly:

| Term | Read as |
|---|---|
| methane | MEE-thayn |
| ethane | EH-thayn |
| propane | PROH-payn |
| alkane | AL-kayn |
| alkene | AL-keen |
| alkyne | AL-kyne (rhymes with "wine") |
| valency | VAY-len-see |
| covalent | koh-VAY-lent |
| carbon, hydrogen | ordinary |
| CH4 / C2H6 / C3H8 | Say the letters and numbers: "C H four", "C two H six", "C three H eight". The scripts already spell these out. |

## 2. Playback policy

Three policies. Every clip in the script carries one.

| Policy | Meaning | Used for |
|---|---|---|
| **INTERRUPT** | Stop whatever is speaking and play immediately. | T01, T02, and the molecule completions M05 / E05 / P05. These are time-critical or mark the end of a round. |
| **QUEUE** | Wait for the current clip, then play. Drop if it has been waiting more than ~2 s, because the moment will have passed. | The teaching lines: section A, M01–M04, E01–E04, P01–P04, S01, S04, G01–G03. |
| **DROP** | If anything is speaking, skip this one entirely. | The repeatable feedback: S02, S03, S05, S06, S07, S08, S09. A player making three mistakes quickly should not hear three stacked explanations. |

### Additional rules

1. **One voice at a time.** A single channel, separate from the existing SFX bus, so speech never competes with itself. The three sound effects are short and may overlap speech freely.
2. **Never re-trigger the same clip while it is playing.** Applies especially to S02 and S08, which can fire repeatedly.
3. **Let a held-beat clip finish.** `CARBON_STRUCTURE_READY` (1100 ms) and `HYDROGEN_CALCULATION` (2600 ms) pause the round clock, but **any click skips them** (`engine.skipTeachingBeat()`). M03/M04 and their siblings are longer than their beats. Let the audio run on rather than cutting a sentence mid-word — the clock has resumed by then, so the cost is a second or two of the player's time and the sentence survives.
4. **Cancel everything on a round change.** On `GAME_STARTED` (a new molecule) and on restart, stop all speech and clear the queue. The engine is rebuilt at that point; leftover narration would describe the previous round.
5. **Cancel on pause.** The game already pauses when the tab is hidden (`visibilitychange` in `LiveGameplay`). Speech should stop with it and not resume mid-sentence — re-play from the start or drop it.
6. **Respect the existing mute.** `?mute=1` silences the SFX; it should silence narration too. A separate voice toggle is worth having, because some players will want the effects without the talking.
7. **Never narrate the walkthrough's auto-advancing frames.** `GameplayFlow` advances several steps on timers of 450–800 ms. Only its first and last frames get a line (V11, V12).

## 3. Duration targets

| Group | Target | Ceiling |
|---|---|---|
| Lesson lines (A) | 4–8 s | 12 s |
| Challenge introductions (M01/E01/P01) | 3–4 s | 5 s |
| Requirement lines (M02–M04 and siblings) | 3–5 s | 6 s |
| Short feedback (S06, S09) | 1–2 s | 3 s |
| Rule explanations (S02, S03, S05, S07, S08) | 3–9 s | 10 s |
| Timer (T01) | 1 s | 2 s |
| Completion and summary | 3–5 s | 6 s |

Total speech per molecule, played perfectly, is roughly 25 s against a 120 s
round — about a fifth, concentrated in the held beats and the gaps between
throws.

## 4. Caching and delivery

- The script is **fully static**: no line interpolates a score, a count or a
  time. Every clip can be synthesised once, committed as an audio file beside
  the existing effects in `public/audio/`, and played with no network call at
  run time. That keeps narration working offline and removes any latency
  question.
- 41 clips at these lengths is on the order of 3–4 minutes of audio.
- If narration later needs live numbers, split the line so the varying part is
  its own clip rather than synthesising at run time.

## 5. Where the current game does not give enough to narrate safely

Recorded, not worked around. None of these were fixed, and none should be fixed
for the sake of narration alone.

1. **`BOND_CREATED` does not say what bonded.** It carries `{ a, b, order }` —
   atom ids only. S09 ("first hydrogen bonded") needs a lookup in
   `snapshot.molecule.atoms` to tell a C–H bond from a C–C one. Workable, but
   the event alone is not enough.
2. **There is no "hydrogen collected" count in the event.** `ATOM_COLLECTED`
   carries `collected` and `target`, but a wrong-family hydrogen does not raise
   `collected`, so the number can stay still while atoms are picked up. No clip
   depends on it; any future "halfway there" line would need the snapshot.
3. **The hydrogen family is announced only once per round.**
   `ATOM_SELECTED` / `WRONG_ATOM_SELECTED` for hydrogen fire once, guarded by
   `hydrogenFamilyChosen`. A second wrong pick emits no selection event —
   although `MISTAKE_EXPLAINED { WRONG_HYDROGEN_FAMILY }` does fire again from
   the failed throw. S05 is therefore attached to `MISTAKE_EXPLAINED`, not to
   the selection event.
4. **The held beats are skippable, and their lengths were chosen for reading,
   not for listening.** 1100 ms and 2600 ms are shorter than the lines they
   carry. Rule 3 above is the recommendation; the alternative — lengthening the
   beats — would change gameplay timing and is out of scope.
5. **There is no "carbon collection" state to narrate.** The brief's Phase 1
   list asks for it, but in the current build **carbons are never collected**.
   The paper itself is the projectile in the carbon phase and the web only ever
   picks up hydrogen (`collectablePool()` returns `hydrogenRowIds`). The removed
   `CARBON_COLLECTION` phase no longer exists in `machine.ts`. No narration was
   written for it.
6. **Methane has no carbon-to-carbon bond.** Its `CARBON_STRUCTURE_READY` beat
   shows a single carbon with four open bonds. M03 is worded for that and must
   not be merged with E03 / P03.
7. **The walkthrough is a scripted demonstration, not the engine.** Its 31
   frames are Figma states with their own cards and no chemistry behind them.
   Narrating them in detail would mean writing a second script against data
   that can drift from the real game; V11 and V12 bracket it instead.
8. **`INTRO_OBJECTIVE` is never seen.** `start()` leaves it in the same tick, so
   nothing can attach there. M01/E01/P01 use `GAME_STARTED` instead.
