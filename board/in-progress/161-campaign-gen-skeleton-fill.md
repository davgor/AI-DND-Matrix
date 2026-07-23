# EPIC: Campaign gen — skeleton fill (engine JSON + LLM blocks)

Campaign create still asks the LLM to emit a **full JSON object** at every stage (`Respond ONLY with a single JSON object…` in `src/agents/campaignGeneration/prompts.ts`). Local models (especially llama.cpp) flake on braces, missing commas, mashed array objects, and split dumps. We keep papering over drift in `tryParseJson` (**020.32**, **160**, etc.) — reactive and ticket-driven.

This epic replaces that contract with **skeleton fill**:

1. **Engine owns the JSON structure** — builds a skeleton with stable placeholder tokens for every LLM-owned field.
2. **Prompt shows the skeleton** and asks the model to fill placeholders only — **not** emit JSON.
3. **LLM returns labeled blocks** (`<<<TOKEN>>>…<<</TOKEN>>>`).
4. **Engine substitutes** → `JSON.parse` on an engine-authored string → existing `normalize*` / `isValid*` paths unchanged.

Builds on **054** / **059** / **125** (staged create pipeline), **020.30–020.33** / **160** (JSON reliability lineage). **Changes the campaign create pipeline** — `docs/runbooks/campaign-create-change-checklist.md` applies to create-touching sub-tickets.

**Relation to 160:** keep **160** (`tryParseJson` missing-comma / mashed-relations repair) as an **interim** fix for current JSON stages. Skeleton fill is the structural fix; after migrated stages ship, those repairs are no longer required for campaign-create stages (parser may keep defensive repairs for non-campaign agents that still return JSON).

Broken down into sub-tickets **161.1–161.8**. Done when all are complete. Implement when the surrounding create-pipeline body of code is in the right state — do not start until ready.

## Locked design: skeleton fill

```
Stage prompt + JSON skeleton with {{PLACEHOLDERS}}
  → LLM labeled blocks (<<<TOKEN>>>…<<</TOKEN>>>)
  → fillSkeleton (engine)
  → JSON.parse (engine-authored string)
  → normalize + isValid (existing)
```

Example LLM response shape:

```text
<<<WORLD_NAME>>>
Eldergloom
<<</WORLD_NAME>>>
<<<WORLD_SUMMARY>>>
...prose...
<<</WORLD_SUMMARY>>>
```

### Engine-owned vs LLM-owned (default policy)

| Owned by | Examples |
|----------|----------|
| Engine | Object shape, array slot count, `factionPressure` when derived from form, `kind` / `stance` / `alignment` when chosen from rosters or coerced, `key` / `sortOrder`, relation pair keys |
| LLM | Names, summaries, histories, quest lines, deity blurbs, free-text membership roles |

Where the model must pick from a closed set (e.g. `kind`, `stance`), prefer **engine assigns** or a **single-token block** validated against a roster — never freeform JSON enums embedded in a blob.

### Out of scope for this epic

- Play-loop agents (`AGENT_JSON_CONTRACT_SYSTEM`) — unless a later ticket extends the protocol
- Guided decoding / llama.cpp JSON-schema mode
- Completing or closing **160** as part of this epic (independent interim track)

## Target flow (unchanged stage order)

```
canon → pantheon → world → factions → regions → per-slot NPCs → bestiary → story → persist
```

Only the **prompt + parse path** changes; stage order, normalize validators, persist, and create progress stages stay unless a sub-ticket explicitly changes them.

## Files to touch (by area)

| Area | Key files |
|------|-----------|
| Protocol | New module under `src/agents/` (e.g. `skeletonFill.ts`) + tests |
| Stage loop | `src/agents/campaignGeneration/index.ts` (`generateWithRetries`) |
| Prompts | `src/agents/campaignGeneration/prompts.ts` (+ `bestiaryStage.ts` as needed) |
| Fixtures / contract | `src/test/fixtures/campaignGenerationFixtures.ts`, `src/main/campaignCreateIpc.contract.test.ts`, `campaignGeneration.test.ts` |
| Docs | `docs/runbooks/campaign-create-change-checklist.md`, `docs/runbooks/llm-usage-call-site-inventory.md` |

## Sub-tickets

| Id | Title |
|----|-------|
| **161.1** | Shared skeleton protocol (`fillSkeleton` + tagged-block extract) |
| **161.2** | Wire `generateWithRetries` alternate `parseMode: 'skeleton'` |
| **161.3** | Migrate factions stage (pilot) |
| **161.4** | Migrate world + pantheon |
| **161.5** | Migrate regions + NPC + story + bestiary + canon |
| **161.6** | Fixtures + contract tests for skeleton dumps |
| **161.7** | Docs / checklist / LLM inventory |
| **161.8** | Delivery gate + local-provider smoke note |

## Definition of done

- Shared skeleton protocol shipped and unit-tested
- All campaign-create stages use skeleton fill (no stage still requires the model to emit raw JSON)
- Contract + generation unit tests cover realistic labeled-block dumps
- Campaign-create checklist + LLM inventory updated
- Full delivery gate + act pass; manual real-provider create smoke noted per checklist
- **160**-style JSON repairs no longer required for migrated campaign stages

## Acceptance criteria

- [ ] Epic index lists **161.1–161.8**; each sub-ticket has Description + checkable ACs
- [ ] Locked design (skeleton + labeled blocks + engine-owned structure) documented above and unchanged without a new decision
- [ ] All sub-tickets complete and moved to `done/`
- [ ] Create checklist satisfied for the pipeline change
