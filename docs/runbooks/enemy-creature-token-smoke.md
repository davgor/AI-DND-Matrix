# Enemy creature-token smoke (epic 123)

Manual checks after enabling the campaign toggle for **enemy / combat creature tokens** (distinct from NPC face tokens in epic 122).

## Prerequisites

- Dev app builds (`npm run rebuild:electron` then `npm run dev` if exercising Electron paths).
- Local image painting (llamacpp) is **not** required — v1 uses a placeholder mock provider by default.

## Toggle OFF (default)

1. Create a campaign without checking **Generate enemy tokens**.
2. Confirm Campaign Review toggle is unchecked (separate from **Generate NPC face tokens**).
3. Generate or spawn a hostile foe (campaign create with bestiary, quest foe, or on-demand hostile encounter).
4. Open play Social — enemy **action** rows show letter initials in the avatar circle (no creature token).
5. Open that enemy's dossier — portrait slot is empty (no broken image).

## Toggle ON

1. Create a campaign with **Generate enemy tokens** checked, or enable the toggle on Campaign Review.
2. Generate or spawn a hostile foe (campaign create, quest assignment, or on-demand encounter).
3. After species create / spawn, wait briefly (async, non-blocking).
4. Open play Social — enemy action rows should show a creature-token image in the avatar circle when the asset has been written.
5. Open that enemy's dossier — portrait slot shows the same species-stable token as Social.
6. Confirm create/spawn/combat never blocked on image generation.

## Failure / missing asset

- Delete or corrupt a stored creature-token file under `userData/creature-tokens/` and reopen Social/dossier — UI falls back to letter initial / empty portrait slot without crashing.
