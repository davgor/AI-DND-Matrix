# EPIC: Configurable generation counts + review/play validation

Let the player choose how much content the initial campaign generation produces — **region count** (0–5, default **2**) and **NPCs per region** (0–10, default **3**) — on the new-campaign setup modal. Thread those counts through the generation agent instead of today's hardcoded 2–4 regions and exactly 3 NPCs per region.

On the onboarding **CampaignReview** screen, tighten validation and add generation affordances:

- **Continue** requires at least **1 region** and **1 NPC** total (campaign-wide).
- **Generate another region** keeps the seed-prompt modal but adds a configurable **NPC count** (0–10) for the new region.
- Each region card gets a **Generate NPC** action that opens a seed-prompt modal (same pattern as region generation) to add NPCs to that region on demand.

Block **play entry** when **any region has zero NPCs** — applies on the path from character creation into `PlayView` and, when **038** lands, hub resume into play as well.

Builds on **007** (campaign generation), **017** (campaign start modal), **009.7** (campaign review). **038.16** should consume the configurable NPC-count region modal from **039.6** once both are done.

Broken down into sub-tickets **039.1–039.9**. This epic is done when all of them are.

Definition of done:
- campaign start modal captures region count (0–5, default 2) and NPCs per region (0–10, default 3)
- initial generation honors requested counts end-to-end (prompt, parse validation, persistence)
- campaign review blocks continue until ≥1 region and ≥1 NPC exist; surfaces clear messaging
- generate-region flow accepts per-request NPC count (0–10)
- each region on review can generate additional NPCs via seed modal
- play cannot start while any region has zero NPCs
- tests cover counts, review gates, NPC/region generation, and play gate

039.1 shared types + validation · 039.2 campaign start modal fields · 039.3 create-campaign IPC wiring · 039.4 initial generation agent parameterization · 039.5 campaign review continue validation · 039.6 generate-region modal NPC count + additional-region pipeline · 039.7 per-region generate NPC modal + pipeline · 039.8 play entry gate (regions must have NPCs) · 039.9 integration tests + smoke coverage
