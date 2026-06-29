# EPIC: NPC surrender, non-lethal victory, and yield outcomes

Epic 032 gave rich nuance when an **NPC defeats the player** (imprison, bury, ransom, mercy). Epic 031.6 currently ends player victories with defeated NPCs **marked dead** — the only outcome. A provoked villager farmer (032.6) who was never going to fight to the death has no surrender, flee, or mercy path once losing. That tonal asymmetry breaks the care put into the reverse case.

This epic adds **yield outcomes** when the **player is winning**:

1. **Non-lethal intent** — the player can attack to incapacitate, not kill. Engine caps or routes damage so 0 HP means unconscious/alive unless the player explicitly follows through lethally afterward.
2. **NPC yield review** — when an NPC drops below a yield threshold or reaches 0 HP, an agent reads **persisted backstory**, temperament, alignment, and combat tier (032) and proposes `surrender`, `flee`, `fight_on`, or `incapacitated` — not automatic death. Cowardly, skittish, or civilian NPCs should yield often; fanatics and mindless beasts may not.
3. **Encounter resolution** — replace 031.6's blanket `status.alive = false` with outcome-specific persistence: surrendered (alive, hostile → subdued), fled (removed from encounter, may return in fiction), incapacitated (0 HP, alive), or slain (lethal confirm).

Engine owns HP, alive/dead flags, and encounter membership; agents propose yield flavor and narration only. Yield review uses **stored backstory only** (032 policy) — no invented biography.

Complements **031** (combat loop), **032** (NPC identity), and **033** (player flee). 033 covers the player escaping; this epic covers **hostiles breaking off or yielding** when losing.

Broken down into sub-tickets 034.1–034.10. This epic is done when all of them are.

Definition of done:
- shared types document non-lethal intent, yield triggers, and NPC yield outcome enum
- engine supports non-lethal damage (incapacitation at 0 HP without death) and deterministic yield-threshold eligibility
- DM intent classifies non-lethal attacks and player acceptance of surrender
- yield review at threshold/0 HP reads persisted backstory; cowardly/civilian NPCs usually yield; fight-to-death is the exception
- encounter end applies yield outcome instead of always marking NPCs dead
- disposition and narration reflect surrender/flee/incapacitation
- UI distinguishes slain vs surrendered vs fled vs incapacitated combatants
- smoke test: provoked farmer surrenders, skittish NPC flees, non-lethal spare leaves NPC alive

034.1 yield + non-lethal spec + shared types · 034.2 engine non-lethal damage and incapacitation · 034.3 engine yield-threshold eligibility (temperament/tier) · 034.4 DM intent non-lethal + accept-surrender classification · 034.5 NPC yield review agent (stored backstory only) · 034.6 encounter end + NPC outcome persistence (replace always-dead) · 034.7 turnIpc yield branch on player attacks · 034.8 post-yield narration + disposition updates · 034.9 UI yield outcome indicators · 034.10 end-to-end smoke test
