# Licence reference

Every licence below was read from the licence page itself during this research,
not inferred from a download button or a "free" badge. Dates are when the page
was checked: **23 September 2026**.

The rule this research follows: **a site does not have one licence — an asset
does.** Freesound in particular mixes CC0, CC BY and CC BY-NC on the same page
of search results, and only the individual sound page is authoritative.

---

## CC0 1.0 Universal (Public Domain Dedication)

- Licence text: https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial use:** yes. The deed states you may "copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission."
- **Attribution:** not required. The deed asks only that you do not imply endorsement by the author.
- **Caveat:** CC0 does not waive patent or trademark rights, and carries no warranty. A CC0 dedication is only as good as the uploader's right to make it (see "Uploader risk" below).

**This is the preferred licence for this project.** It is the only category that
needs no credit line, no per-sound bookkeeping and no re-checking if the game is
ever sold or bundled.

## CC BY 4.0 (Attribution)

- Licence text: https://creativecommons.org/licenses/by/4.0/
- **Commercial use:** yes.
- **Attribution:** **required.** Freesound's own guidance is to credit as "sound name by username" with a link to the sound page and the licence type.
- **Consequence for us:** usable, but every CC BY sound adds a permanent obligation. If we ship any, the game needs a visible credits screen or an in-repo `CREDITS.md` that ships with the build.

## CC BY-NC (Attribution — NonCommercial)

- Licence text: https://creativecommons.org/licenses/by-nc/4.0/
- **Commercial use:** **no.** Freesound states you "can't earn any money with the piece of work you create."
- **Consequence for us:** rejected outright. An educational product that may be sold, licensed to a school, or monetised in any way cannot carry NC assets. These are excluded from the approved list even when they sound ideal.

## Freesound (per-sound)

- Licensing FAQ: https://freesound.org/help/faq/
- Freesound sounds carry **one of three licences, which varies per sound**: CC0, CC BY, or CC BY-NC.
- The licence is printed on each sound's own page. Search-result pages and embedded players do not reliably show it.
- **Therefore:** no Freesound URL enters the approved list without its individual sound page having been opened and its licence line read.

## Pixabay Content License

- Licence summary: https://pixabay.com/service/license-summary/
- **Commercial use:** permitted, with restrictions.
- **Attribution:** not required — "without having to attribute the author (although giving credit is always appreciated)".
- **Prohibited, and relevant to us:** "You cannot sell or distribute Content (either in digital or physical form) on a Standalone basis. Standalone means where no creative effort has been applied."
- **What that means here:** embedding a sound in the game is fine — the game is the creative work. Shipping the raw audio files as a downloadable asset pack, or re-uploading them, is not.
- Also prohibited: content containing recognisable trademarks or logos used commercially; use in a misleading or deceptive way; use as part of a trade mark.

## Mixkit Free Sound Effects License

- Licence page: https://mixkit.co/license/
- **Commercial use:** yes — usable in commercial and personal projects.
- **Attribution:** not required.
- **Prohibited, and relevant to us:** you receive a non-exclusive licence only, acquire no ownership, and may not "rent, license, sublicense, sell, resell or otherwise commercially exploit or make Mixkit items available to any third party."
- **What that means here:** same shape as Pixabay — embedding in the game is the intended use; redistributing the sound files themselves is not.

## Kenney (kenney.nl)

- Example pack checked: https://kenney.nl/assets/interface-sounds — licence line reads "Creative Commons CC0".
- Kenney's packs are dedicated CC0 and are authored by a single known creator, which makes them the lowest-risk option available for UI-adjacent sounds.
- Packs download as a zip of many sounds; individual sounds do not have their own pages, so the pack URL is the citation.

## OpenGameArt (per-asset)

- Licences vary per submission: CC0, CC BY, CC BY-SA, GPL and others, and a submission may list several.
- Treated like Freesound: the asset page is authoritative, and anything not clearly CC0 or CC BY is excluded.

---

## Uploader risk (applies to every source above)

A licence tag states what the *uploader* claims. It does not prove the uploader
had the right to make that claim. The practical mitigations used in this
research:

1. Prefer named, established creators with a body of work (e.g. Kenney) over
   one-off anonymous uploads.
2. Reject anything whose description suggests it was extracted from a film,
   TV show, or another game, regardless of the licence tag on it.
3. Reject re-uploads — a sound that appears on several sites under different
   uploaders with no common origin is a warning sign, not a convenience.
4. Record the uploader name with every candidate so the claim is traceable.

## What "approved" means in this research

A sound reaches `approved-sounds.md` only if **all** of these hold:

- its own asset page was opened and the licence read there;
- the licence permits commercial use (CC0, CC BY, Pixabay, Mixkit);
- the attribution obligation, if any, is recorded;
- the source and uploader are identifiable;
- nothing about it suggests franchise or extracted audio.

Anything failing any of these is listed with **LICENSE UNCERTAIN** in the
per-interaction files and is deliberately kept out of the approved list.
