# EPIC: Attackable NPCs, civilian stat blocks, and defeat disposition

Every NPC in the world should be a **valid combat target** with real mechanical stats — not only catalog monsters. When the AI creates an NPC (campaign generation or runtime), assign the standard **villager** stat block by default: low HP, modest AC, weak attacks.

At creation, every speaking NPC gets a **light backstory** (a few sentences) persisted on the row. That backstory is the canonical identity record: it should inform how the model writes **disposition** at generation time and how the NPC **behaves in play** (reactions, tone, defeat choices). Runtime agents read the stored backstory — they do not invent a new past.

Immediately after a speaking NPC's backstory is persisted at creation, run a **retired adventurer review** that reads **only** that persisted backstory (plus alignment) — not at combat start. The review asks: did generation already establish a meaningful combative past? Upgrades must be **unlikely** — default `false` for almost everyone. A reformed bandit leader or retired guard captain *might* upgrade if that history is already in the generated backstory; a farmer never should. Deciding this at creation means combat start never makes an extra agent call for it — `combat_tier` is already settled by the time any encounter begins, which matters because a turn that starts combat can already trigger turn-review (029.2) and combat-intent (031.4) calls; stacking a third one behind those would add latency for no reason.

Speaking NPCs carry **alignment** (epic 028). When an NPC **defeats** the player, alignment and the same persisted backstory drive **defeat disposition** — imprison, bury out back, execute, etc. The engine owns life/death/imprisonment; agents propose disposition and narration only.

Complements epic **031** (encounter mode). Epic 031 owns turn structure; this epic owns **NPC identity at creation**, **who they are in combat**, and **what happens when they win**.

Broken down into sub-tickets 032.1–032.11. This epic is done when all of them are.

Definition of done:
- shared types document villager vs retired-adventurer tiers, defeat disposition, and death-mode rules
- speaking NPCs persist light backstory + alignment + villager combat stats at creation
- generation co-writes backstory and disposition so disposition reflects the past; combative histories are unlikely in prompts
- NPC reaction agents ground on persisted backstory for ongoing behavior
- any in-scene NPC is attackable; provoking shifts disposition
- creation-time review upgrades stats only when stored backstory already supports it (unlikely); combat start reads the decided tier and never calls the review agent
- NPC victor defeat disposition uses stored backstory + alignment
- defeat outcomes respect death mode; UI surfaces backstory and defeat beats
- smoke test covers mundane villager, unlikely veteran upgrade from pre-seeded backstory, and contrasting defeat dispositions

032.1 spec + shared types · 032.2 engine villager + retired-adventurer stat blocks · 032.3 NPC backstory field + villager hydration at create · 032.4 campaign generation backstory, alignment, and disposition · 032.5 NPC agent behavior grounding from persisted backstory · 032.6 attackable any-scene NPC + disposition shift on provoke · 032.7 retired-adventurer review at NPC creation (read stored backstory only) · 032.8 defeat disposition agent + schema · 032.9 defeat outcome persistence + death-mode wiring · 032.10 UI backstory in review + defeat banner · 032.11 end-to-end smoke test
