# Sources searched

Research date: **23 September 2026**. Three research agents searched in
parallel, one per gameplay interaction, followed by an independent licence
verification pass over every shortlisted URL.

## Sources used (candidates drawn from these)

| Source | Licence model | Per-asset pages? | Used for |
|---|---|---|---|
| [Freesound](https://freesound.org) | Per sound: CC0, CC BY, or CC BY-NC | Yes — authoritative | All three interactions; most candidates |
| [Kenney](https://kenney.nl) | CC0, whole packs | Pack-level only | Collision / bond (UI-grade clicks and snaps) |
| [Pixabay](https://pixabay.com/sound-effects/) | Pixabay Content License | Yes | Paper/web, throw, collision |
| [OpenGameArt](https://opengameart.org) | Per asset; varies | Yes | Collision (one OGA-BY pack) |
| [BigSoundBank](https://bigsoundbank.com) | CC0 / royalty-free, author Joseph SARDIN | Yes | Paper/web (reel texture) |

## Sources checked and deliberately not used

| Source | Why not |
|---|---|
| [Mixkit](https://mixkit.co) | **Unresolved.** Both the throw and collision agents found tonally promising sounds, but Mixkit's actual sound-effect licence text renders in a JavaScript modal that neither WebFetch nor raw curl could read, and Mixkit gives individual sounds no citable per-asset URL. Reporting terms we could not read would breach the brief's own rule. The site-level summary (commercial use allowed, no attribution) was readable and is recorded in `LICENSES.md`, but **no Mixkit sound is in the approved list.** Worth a human opening the modal by hand. |
| [Zapsplat](https://zapsplat.com) | Free tier requires attribution and carries account-bound terms that vary per asset; could not be verified per-sound without an account. |
| Pond5, Motion Array, Soundsnap, Storyblocks, Envato Elements | Paid or subscription stock; not open-licence sources. |
| orangefreesounds.com, soundbible.com, soundjay.com, freesoundeffects.com, gfxsounds.com, audio.com | Licensing stated per-post at best, authorship frequently unclear. Not a safe basis for a commercial product. |
| YouTube audio rips, "free SFX" aggregator blogs | Excluded by policy — unclear provenance and redistribution rights. |

## Search queries run

**Paper / web (WEB_STARTED):** elastic stretch release CC0 · rubber band stretch snap · paper whoosh swoosh short CC0 · grappling hook rope retract zip line · paper flick rustle short CC0 · bow string release arrow · sling/slingshot/catapult soft launch · mixkit swoosh licence · fishing reel / reel in / winch mechanical retract · cloth swish / fabric swoosh soft movement. Plus Freesound faceted searches (CC0 filter, duration filters) for: elastic stretch, whoosh short swish, paper whoosh swipe, paper swipe, spring twang boing.

**Paper throw (PAPER_THROWN):** paper plane throw whoosh CC0 · light paper whoosh swish short · kenney CC0 sfx pack ui whoosh impact. Plus Freesound faceted searches for: paper whoosh, paper throw, swoosh (0–2s), throw swish light, swish light air, cloth swish short. Plus Pixabay searches for paper swipe and soft whoosh.

**Collision (ATOM_COLLISION → BOND_CREATED):** magnetic snap click CC0 · kenney interface sounds · glass tap crystalline impact CC0 short · marble click wood block soft impact · pixabay magnetic snap lock interface · mixkit sci-fi interface click · opengameart CC0 sci-fi UI blip · sci-fi UI confirm blip CC0 · soft impact thud muted low CC0. Plus Freesound faceted searches (CC0 + 0–2s) for: magnet snap, magnetic click, crystal tap, ui snap lock (0 results), energy pulse ui (0 results), sci fi click, latch, soft impact.

## Coverage gaps, stated honestly

- **No verified "soft energy pulse" candidate.** Freesound's CC0 + short-duration filter returned nothing usable for that character. If the curated palette wants an energy shimmer on `BOND_CREATED`, it will likely have to be synthesised or sourced from a paid library.
- **Mixkit is unresolved**, as above — a real gap, since its catalogue looked well matched to the brief's "modern, designed, not cinematic" register.
- **Nothing was auditioned.** No agent could listen to audio. Every character judgement in these documents is inferred from the asset page's title, tags, description, duration and sample rate, and is explicitly labelled as such. The shortlists are audition lists, not final selections.
