# Paper throw — candidates

**Engine event:** `PAPER_THROWN`.
**Wanted feel:** aim → release → whoosh → travel. Paper movement, lightweight throw, air, controlled release.
**Excluded by brief:** cinematic whooshes, sword/weapon swings, bullets, cartoon zips, franchise audio.

**Timing that constrains every pick:** `PAPER_THROWN` fires at *release*, after a
150ms anticipation that emits no event of its own. Flight is ~430ms for the
paper and ~330ms for a hydrogen. So a candidate with a wind-up baked into its
head will play that wind-up *after* the visual pull-back has already finished.
**Every pick here must be trimmed so its transient sits at sample 0.**

Nobody listened to these; character notes are inferred from page metadata.

---

## Verified candidates

### fh_Paper_Swipe set — Frank1100
- **Sound URL:** https://freesound.org/people/Frank1100/sounds/147282/ (siblings 147281–147286)
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** WAV 44.1kHz 32-bit stereo · **Duration:** 0.958s · **Confidence:** HIGH
- **Character:** more tactile, more material-correct, drier.
- **Why it fits:** The thrown object is literally paper, and this is literally paper. Six variants in one CC0 set means true round-robin with no repetition tell — the single most valuable property for a cue this frequent.
- **Editing:** trim each file to its transient and normalise the set to each other, or the round-robin will audibly jump in level.

### PaperSlide — eyesonlegs
- **Sound URL:** https://freesound.org/people/eyesonlegs/sounds/464302/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** WAV 44.1kHz · **Duration:** 1.643s · **Confidence:** HIGH
- **Character:** longer, more physical, more surface.
- **Why it fits:** Real paper on a table with more body than the Frank1100 short.
- **Caveat:** at 1.64s it outlasts the 330–430ms flight — the tail would still be sounding when the collision lands. Needs hard trimming.

### FX – Swoosh Swirl — Breviceps
- **Sound URL:** https://freesound.org/people/Breviceps/sounds/445963/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** WAV 44.1kHz · **Duration:** 0.655s · **Confidence:** MEDIUM
- **Character:** more designed, more energetic, more air.
- **Why it fits:** Length sits almost exactly on the 430ms paper flight with a short tail, from a well-regarded contributor, with no weapon or cinematic tags.
- **Caveat:** "swirl" implies rotation, but the paper holds a fixed tangent angle in flight — the sound would describe motion the screen does not show.

### Quick Swoosh — D4XX
- **Sound URL:** https://freesound.org/people/D4XX/sounds/658859/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** WAV 44.1kHz · **Duration:** 0.187s · **Confidence:** MEDIUM
- **Character:** shorter, more minimal, more synthetic.
- **Why it fits:** An accent that says "released" and then leaves the flight silent. That silence is worth more than it looks — it is the player's only rest in the cycle.

### paper-slide — brokenmachinery
- **Sound URL:** https://freesound.org/people/brokenmachinery/sounds/730078/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** WAV 44.1kHz 16-bit stereo · **Duration:** 0.776s · **Confidence:** HIGH
- **Character:** softer, brushier, shorter.
- **Why it fits:** "A gentle brushing type sound" under 800ms — close to "controlled physical release" and already near event scale.
- **Caveat:** may be too soft to read as a throw without a small pitch/level lift.

### Swoosh 001 — scriptshack
- **Sound URL:** https://freesound.org/people/scriptshack/sounds/720239/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** MP3 44.1kHz · **Duration:** 0.251s · **Confidence:** MEDIUM
- **Character:** shorter, neutral, game-tagged.
- **Caveat:** MP3-only — see the MP3 timing warning below.

### light slow swoosh — Mikes-MultiMedia
- **Sound URL:** https://freesound.org/people/Mikes-MultiMedia/sounds/349698/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** MP3 44.1kHz · **Duration:** 2.031s · **Confidence:** MEDIUM
- **Character:** softer, gentler, slower.
- **Why it fits:** Pure air (a recorded breath), no mechanical or metallic edge.
- **Caveat:** weak attack is disqualifying for an event that fires on release — it will feel late even when sample-accurate. Also risks reading as a breath.

### Paper Throw Into Air; 3 — RossBell
- **Sound URL:** https://freesound.org/people/RossBell/sounds/389441/
- **Source:** Freesound · **Licence:** Creative Commons 0 · **Licence URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** WAV 44.1kHz · **Duration:** 2.366s · **Confidence:** MEDIUM
- **Character:** longer, more complete gesture.
- **Caveat:** tagged dropping/fall/falling — it almost certainly includes the paper settling afterwards. Trim to the first ~1s or it fires a phantom landing.

### Thin Swoosh — Universfield (Pixabay)
- **Sound URL:** https://pixabay.com/sound-effects/film-special-effects-thin-swoosh-352756/
- **Source:** Pixabay · **Licence:** Pixabay Content License · **Licence URL:** https://pixabay.com/service/license-summary/
- **Commercial:** YES · **Attribution:** NOT REQUIRED · **Format:** MP3 · **Duration:** ~2s (Pixabay rounds) · **Confidence:** MEDIUM
- **Character:** thin, smooth, light.
- **Notes:** Named uploader, 34k downloads. Pixabay forbids redistributing the file standalone — embedding in the game is the intended use.

---

## Not approved

### UI_Menu_Whosh — Valenspire · **REJECTED (technical)**
- **URL:** https://freesound.org/people/Valenspire/sounds/699494/ · Licence verified CC0, commercial use fine.
- **Why rejected:** **16kHz sample rate**, so an 8kHz ceiling. A whoosh *is* its top octave; strip that and what remains is a muffled hiss, and no upsampling restores content never captured. Conceptually it was the best match in the set — the uploader made it by wobbling a paper and processing it — which makes this genuinely annoying, but the throw is the one event that needs air.

### 014_throw_paper — Lau7 · **REJECTED (content)**
- **URL:** https://freesound.org/people/Lau7/sounds/153341/ · Licence verified CC0.
- **Why rejected:** recorded as paper thrown *into a bin*, so it carries a landing tail. That would fire a phantom impact at a moment the engine did not choose, colliding with the real `ATOM_COLLISION` and destroying the cause-and-effect separation the interaction spec builds four extra frames to protect. Salvageable only by trimming before the tail — at which point Frank1100 gives you the same thing with variants.

### Minimalist Light Whoosh FX — Chrysalyn (Pixabay) · **LICENSE UNCERTAIN**
- **URL:** https://pixabay.com/sound-effects/film-special-effects-minimalist-light-whoosh-fx-547374/
- **Why:** page carries an **"AI generated"** badge. Also whip-tagged. Flagged for your policy call.

### fh_Paper_Swipe_Surface2_Mid_01 (Pixabay) · **use the original instead**
- **URL:** https://pixabay.com/sound-effects/film-special-effects-fh-paper-swipe-surface2-mid-01-90289/
- **Why:** verification established this is a re-upload of Frank1100's Freesound sound, credited to "freesound_community". Same audio, longer licence chain. Take it from Freesound.

---

## MP3 warning (applies to several candidates above)

MP3 carries encoder delay and padding, so the transient does **not** begin at
sample 0, and the decoded offset varies between browsers. For a cue that must
land on a specific animation frame this is a 10–50ms timing lottery, and MP3
pre-echoes on sharp transients. If an MP3-only candidate is chosen
(scriptshack, Mikes-MultiMedia, both Pixabay items), trim and re-encode to WAV
as a build step and verify the onset position. Do not ship the MP3 as-is.
