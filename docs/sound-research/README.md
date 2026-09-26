# Sound research

Research date: **23 September 2026**.

## Status

### ✅ APPROVED and integrated

| Interaction | Engine event | Sound | Source | Licence |
|---|---|---|---|---|
| Web throw | `WEB_STARTED` | **Whoosh #1 — Kinoton** | [Freesound 427823](https://freesound.org/people/Kinoton/sounds/427823/) | CC0 |
| Hydrogen throw | `PAPER_THROWN` (atom) | **Thin Swoosh — Universfield** | [Pixabay 352756](https://pixabay.com/sound-effects/film-special-effects-thin-swoosh-352756/) | Pixabay Content License |
| Carbon-phase paper throw | `PAPER_THROWN` (paper) | **Thin Swoosh — Universfield** | same file | same |
| Carbon-carbon collision | `ATOM_COLLISION` (paper strike that bonds) | **Bottle_Clink_5 — wjb_88** | [Freesound 828852](https://freesound.org/people/wjb_88/sounds/828852/) | CC0 |

Both throws share one sound (`PAPER_THROW` in the library): the player performs
the same physical gesture whatever the target, so it gets the same audio
language.

The collision fires **only for the paper strike that forms the molecule**. A
paper that hits the wrong carbon group is a real physical contact but a failed
one, and it stays silent - the absence of the clink is the feedback. A hydrogen
landing on a bond slot is a separate, quieter moment and has no sound yet.

Both are wired to real gameplay events through `src/game/audio/`. See
"Integration" below.

All three priority sounds are now chosen and wired. The collision was picked
from the twelve candidates in [`collision-shortlist.md`](collision-shortlist.md),
which is kept as the record of what was considered.

### ⏳ Not researched yet

`ATOM_COLLECTED`, `BOND_CREATED`, `WRONG_ATOM_SELECTED`, `THROW_MISSED`,
`MOLECULE_COMPLETED`, `TIMEOUT` and the menu/rail sounds are still silent.

## Files

| File | What it holds |
|---|---|
| `collision-shortlist.md` | The 12 glass/crystal collision candidates, with **Candidate 09 marked as selected**. |
| `approved-sounds.md` | The master table, the two proposed palettes, and everything excluded with reasons. **Start here.** |
| `paper-web-sounds.md` | `WEB_STARTED` / `ATOM_COLLECTED` candidates |
| `hydrogen-throw-sounds.md` | `PAPER_THROWN` candidates |
| `atom-collision-sounds.md` | `ATOM_COLLISION` / `BOND_CREATED` candidates, plus the two-part collision design |
| `SOURCES.md` | Every source searched, every query run, and the coverage gaps |
| `LICENSES.md` | Each licence read from its own page, and what "approved" required |

## How this was produced

Six agents, each with one responsibility:

1. **Orchestrator** — defined the goals from the game's real engine events, delegated, and assembled the result.
2. **Paper/web agent** — 13 candidates.
3. **Paper throw agent** — 12 candidates.
4. **Collision agent** — 16 candidates.
5. **Licence verification agent** — independently re-opened all 40 shortlisted URLs and re-read every licence. Assumed nothing the research agents claimed.
6. **Curation agent** — judged coherence, frequency separation and fatigue, and proposed the palettes.

The verification pass was not a formality. It changed three conclusions:

- the OpenGameArt pack is **OGA-BY 4.0, not CC0** — attribution is mandatory;
- one Pixabay item has an **anonymous numeric uploader** with no authorship chain;
- `qubodup` asks for **CC BY-style credit on his profile** despite the CC0 licence field.

## Two caveats that govern how to read all of this

**1. Nothing was auditioned.** No agent could listen to audio. Every character
judgement here is inferred from each asset page's title, tags, description,
duration and sample rate, and is labelled as such. Treat these as audition
lists, not selections. The next step is a human listening session against the
shortlists in `approved-sounds.md`.

**2. A licence tag states what an uploader claims**, not what they had the right
to claim. The mitigations used are listed in `LICENSES.md`; the residual risk
is real and is lowest for Kenney (named creator, whole CC0 packs) and highest
for anonymous single uploads.

## Mapping to real engine events

These are the actual event names in `src/game/engine/events.ts`, not invented
ones. The brief's `PAPER_WEB_THROW` and `HYDROGEN_THROW` correspond to
`WEB_STARTED` and `PAPER_THROWN`.

| Event | Researched | Notes |
|---|---|---|
| `WEB_STARTED` | ✅ priority 1 | Tether shoots out; 180ms latch |
| `ATOM_COLLECTED` | ✅ priority 1 | Fires ~460ms after `WEB_STARTED` |
| `PAPER_THROWN` | ✅ priority 2 | Fires at *release* — anticipation is already over |
| `ATOM_COLLISION` | ✅ priority 3 | Carries `bonded: false` on a miss and `chainDepth` |
| `BOND_CREATED` | ✅ priority 3 | Carries `order` (1/2/3) — maps to pitch for alkene/alkyne later |
| `ATOM_SELECTED` / `WRONG_ATOM_SELECTED` | ⬜ later | |
| `THROW_MISSED` | ⬜ later | May need no sound — see below |
| `MOLECULE_COMPLETED` | ⬜ later | |
| `TIMEOUT`, timer warning | ⬜ later | No timer-warning event exists yet |
| `GAME_STARTED`, `PHASE_CHANGED`, `HYDROGEN_TARGET_CALCULATED` | ⬜ later | |

## Three findings from the engine that shape the audio work

Verified in the code, not assumed from the brief.

**All five priority events fire equally often.** Per hydrogen placed, each fires
exactly once — ethane is 6 hydrogens ≈ 30 sound events, decane would be ≈ 110.
The collision is the most *important* sound but not the most frequent, so the
web sound's fatigue budget is exactly as tight as the collision's.

**The 260ms contact→bond gap is real for the carbon collision and absent for the
hydrogen bond.** `ATOM_COLLISION` is emitted at contact (`engine.ts:511`) and
`BOND_CREATED` 260ms later from the reaction timeline (`engine.ts:541`) — a real
gap. But in the hydrogen path both are emitted back-to-back in the same
synchronous tick (`engine.ts:713-714`). An audio layer that subscribes naively
would get correct timing on carbon and a collapsed mush on hydrogen. **Schedule
the bond sound off `ATOM_COLLISION` using `bondStartMs()` from
`carbonImpact.ts`**, with Web Audio scheduling rather than `setTimeout`.

**Correctness is already encoded in the events, for free.** `ATOM_COLLISION`
carries `bonded: false` when the paper hits the wrong carbon group or a hydrogen
bounces off. So a miss can be *contact with no resolution* — an unanswered
question — while a hit is contact then connection. That teaches the difference
without a failure buzzer, and it means `THROW_MISSED` may need no sound of its
own.

## Integration (the two approved sounds only)

```
player action -> engine event -> soundForEvent() -> AudioManager -> Web Audio
```

| File | Role |
|---|---|
| `src/game/audio/sounds.ts` | The library: file, gain, voice cap and full licence provenance per sound |
| `src/game/audio/eventSounds.ts` | The only trigger rule, as one pure function — unit tested |
| `src/game/audio/AudioManager.ts` | Web Audio playback: decode once, cap voices, one-shot sources |
| `src/game/audio/useGameAudio.ts` | One subscription to the engine bus; the whole attachment point |

Audio files live in `public/audio/`. `?mute=1` silences the game for visual
checks.

Gameplay, chemistry, physics, scoring, the timer, layout and animations were not
touched. The engine does not know the audio layer exists — deleting
`useGameAudio` removes sound and nothing else.

Both of the game's throws map to the same `PAPER_THROW` sound. To split them
later, branch on `event.atomId` in `eventSounds.ts` and add a second library
entry; nothing else changes.

## Still not done

The collision sound is not integrated and no candidate is marked approved.
