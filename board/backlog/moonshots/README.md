# Moonshots Backlog Area

This directory stores exploratory epics that are not yet part of the primary numbered backlog stream.

## Purpose
- Hold high-risk, high-upside, or speculative epic ideas.
- Keep experimental planning separate from vetted backlog work.
- Provide a staging area before promotion into `board/backlog`.

## Naming Convention
- Moonshot epic files must be prefixed with `mXXX-` where `XXX` is a 3-digit moonshot id.
- Example: `m001-local-multiplayer-prototype.md`
- Keep ids sequential and unique within this folder.

## Expected File Shape
Use the same structure as normal epic files whenever possible:
- Epic title line (`# EPIC: ...`)
- Brief scope/intent paragraph
- Sub-ticket range line (if already broken down)
- Definition of done or vetting criteria

## Vetting and Promotion
When a moonshot is approved:
1. Convert it into a normal backlog epic with the next standard epic id in `board/backlog`.
2. Rename/rewrite child tickets from `mXXX.Y` style (if used) to normal numeric tickets.
3. Move or recreate vetted files in `board/backlog` root.
4. Mark the original moonshot file as promoted, or remove it once migration is complete.

## Agent Instructions
- Do not mix moonshot ids (`mXXX`) with standard backlog ids.
- Do not treat moonshot epics as committed delivery scope unless explicitly requested.
- Prefer keeping acceptance criteria measurable, even for speculative ideas.
- If uncertain whether an item belongs here, ask whether it is exploratory (moonshot) or committed (main backlog).
