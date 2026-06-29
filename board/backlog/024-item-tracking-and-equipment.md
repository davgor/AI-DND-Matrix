# EPIC: Item tracking, equipment, and AI-driven item creation

Replace the untyped `inventory: unknown[]` blob on characters with a real item system: a starter catalog of basic weapons/armor/potions/magic items the DM agent can pull from, equip slots that actually feed the AC/damage formulas, and a retrieve-first-then-create flow (mirroring the preseeded-catalog pattern in epic 023) so the DM agent can also invent a brand-new item on the fly when the story calls for it — with the engine, not the agent, always deriving the item's actual mechanical numbers from a fixed template, the same guardrail already used for homebrew features and DC clamping.

Broken down into sub-tickets 024.1-024.11. This epic is done when all of them are.

024.1 item + ownership DB schema · 024.2 starter item catalog seed · 024.3 item mechanical templates by type/rarity · 024.4 equip/unequip engine logic + slot rules · 024.5 wire equipped armor into AC · 024.6 wire equipped weapon into damage resolution · 024.7 DM agent item proposal flow (retrieve or propose new) · 024.8 AI-proposed item canonicalization · 024.9 grant/consume/remove item flows · 024.10 character sheet inventory + equip UI · 024.11 end-to-end item system smoke test
