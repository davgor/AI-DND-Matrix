# NPC face-token smoke (epic 122)

Manual checks after enabling the campaign toggle.

## Prerequisites

- Dev app builds (`npm run rebuild:electron` then `npm run dev` if exercising Electron paths).
- Local image painting (llamacpp) is **not** required — v1 uses a placeholder mock provider by default.

## Toggle OFF (default)

1. Create a campaign without checking **Generate NPC face tokens**.
2. Confirm Campaign Review toggle is unchecked.
3. Open Social and an NPC dossier — Social shows letter initials; dossier portrait slot is empty (no broken image).

## Toggle ON

1. Create a campaign with **Generate NPC face tokens** checked, or enable the toggle on Campaign Review.
2. After create (or after generating a speaking NPC on review), wait briefly (async, non-blocking).
3. Open play Social — speaking NPC lines should show a face-token image in the avatar circle when the asset has been written.
4. Open that NPC’s dossier — portrait slot right of Traits/Facts shows the same asset; Traits may include Hair / Age / Eyes when generation populated them.
5. Confirm create/play never blocked on image generation.

## Failure / missing asset

- Delete or corrupt a stored face-token file under `userData/npc-face-tokens/` and reopen Social/dossier — UI falls back to initial / empty slot without crashing.
