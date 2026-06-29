# Moonshot M003 - Mod-driven content seeding and homebrew catalog

## Why this is a moonshot
Enable community and GM-created mod packs that seed the local database from plain text files, making homebrew spells, monsters, NPCs, gear, and related content first-class game inputs without requiring direct DB edits.

## Problem statement
Today, adding large amounts of custom content requires manual entry or code/database knowledge. This creates friction for creative worldbuilding and limits replayability.

## Moonshot outcome
A mod ingestion system that reads structured text bundles, validates and normalizes entries, seeds them into catalog tables, and makes them retrievable in gameplay flows with clear source attribution and safety guardrails.

## Success signals
- [ ] GM can drop a mod folder and import hundreds of entries from text files in one flow
- [ ] Imported homebrew content is queryable by taxonomy and used by retrieve-first AI policies
- [ ] Import errors are actionable with file and line-level diagnostics
- [ ] Conflicts/version upgrades are deterministic and reversible

## Guardrails
- [ ] Local-first; no cloud dependency required for import
- [ ] Import never corrupts existing saves/campaigns
- [ ] User-generated content is sandboxed with explicit trust model and limits
- [ ] Canonical and modded sources remain distinguishable at runtime

## Out of scope
- Real-time mod marketplace
- Executable scripting inside mods
- Auto-sharing mods across machines
