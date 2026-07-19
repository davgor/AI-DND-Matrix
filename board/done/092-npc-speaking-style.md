# EPIC: NPC speaking style (sample text + dialogue grounding)

Speaking NPCs already get a rich identity bundle (race, gender, alignment, class, background — epics **049** / **052** / **051**) and a backstory, but in-play dialogue (`generateNpcReaction` → `buildSpeakingPrompt` in `src/agents/npc.ts`) only injects name, role, disposition, temperament, alignment, and backstory. There is no durable **voice specimen** for the model to match, so dialogue drifts toward generic fantasy speech and fandom-canon characters rarely sound like their source material.

This epic adds a **speaking-style sample** generated when the NPC is created: a short voice specimen plus a few example utterances. At dialogue time that sample is injected as established-fact voice grounding so replies stay person-sounding and consistent. If the NPC is a known fandom character (canon recall **070** / preferred `knownCharacters`), generation must try to match that character's recognizable speech; otherwise the sample is grounded only in the rest of the NPC's identity.

Broken down into sub-tickets **092.1–092.7**. This epic is done when all are complete and `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass. Campaign-create pipeline changes must also follow `docs/runbooks/campaign-create-change-checklist.md`.

## Sample shape (v1)

For every speaking NPC (`canSpeak: true`):

| Field | Shape | Purpose |
|---|---|---|
| `speakingStyleSpecimen` | One short paragraph (2–4 sentences) written **in the NPC's first-person voice** | Style guide the model can imitate (rhythm, diction, attitude, catchphrases) |
| `speakingStyleExamples` | 2–3 short spoken lines the NPC might say | Concrete exemplars of person-sounding dialogue |

Non-speaking creatures omit both (`null` / empty).

**Person-sounding bar (binding):** samples must read like a real person talking — contractions, uneven rhythm, concrete phrasing — not encyclopedia narration, not purple prose monologues, not quest-giver template lines ("Ah, traveler, seek thee the..."). Generation prompts must state this bar explicitly.

## Target flow

```
NPC identity exists (name, role, disposition, temperament, alignment,
  race/gender/class/background, backstory — and optionally a canon match)
       │
       ▼
Speaking-style generation (speaking NPCs only)
  IF NPC matches a known fandom / canon character
    → sample styled to that character's recognizable speech
  ELSE
    → sample grounded in the NPC's identity + backstory only
       │
       ▼
  { speakingStyleSpecimen, speakingStyleExamples[2–3] }
       │
       ▼
Persisted on the NPC row
       │
       ▼
In-play dialogue (buildSpeakingPrompt)
  inject specimen + examples as voice grounding
  (alongside existing persona / backstory lines)
```

Bulk campaign generation, additional-region generation, shortfall top-up, and the flagged "Generate NPC" path all produce and persist the sample for speaking NPCs. Dialogue wiring is shared: any speaking NPC with a stored sample gets it injected; pre-epic NPCs with no sample behave as today.

## Schema

Purely additive (same `addColumnIfMissing` precedent as `gender_key` / `background_key`):

- `npcs.speaking_style_specimen TEXT` — nullable; set for speaking NPCs going forward
- `npcs.speaking_style_examples_json TEXT` — nullable JSON array of 2–3 non-empty strings; set for speaking NPCs going forward

Mapped on `Npc` / `CreateNpcInput` / `NpcRow` as `speakingStyleSpecimen: string | null` and `speakingStyleExamples: string[] | null`.

## Definition of done

- Every newly generated speaking NPC has a non-empty specimen paragraph and 2–3 example lines persisted
- Non-speaking creatures leave both fields null/empty
- When generation is told the NPC matches a known fandom/canon character, the speaking-style prompt instructs fandom-faithful voice matching; otherwise it grounds only in the NPC's own identity/backstory
- In-play speaking reactions inject the stored sample as voice grounding; missing samples (legacy NPCs) keep current prompt shape
- Campaign-create contract/fixtures updated where NPC JSON gains these fields; checklist requirements met
- Smoke/runbook covers original-vs-fandom generation and that dialogue prompts include the sample

092.1 schema + repository mapping · 092.2 speaking-style generation agent + person-sounding / fandom rules · 092.3 bulk & additional-region generation request + validate + persist · 092.4 flagged single-NPC path generates speaking style · 092.5 inject sample into `buildSpeakingPrompt` · 092.6 campaign-create fixtures + contract · 092.7 smoke + runbook

## Relationship to other epics

- **051 / 052 / 049**: identity + backstory already exist; this epic adds a voice layer on top and feeds it into dialogue, not into Campaign Review traits UI (UI display is out of scope for v1).
- **070** (fandom canon-recall): preferred `knownCharacters` and seed prompts that name a known character are the signal for "match fandom speech." This epic does not change canon recall itself; it consumes the match signal when generating style (name match against `knownCharacters`, and/or seed/canon context passed into flagged/bulk prompts).
- **028** (non-speaking creatures): unchanged — non-speakers never get samples and never use dialogue prompts.
- **040** (token efficiency): specimen + examples must stay short (one paragraph + ≤3 lines) so dialogue prompts do not balloon; document a soft character budget in 092.2.
- Campaign create pipeline: touches `prompts.ts` / `normalize.ts` / `persist.ts` / fixtures — follow the create-change checklist.

## Out of scope

- Campaign Review traits UI / editing the sample after generation (candidate follow-up)
- Regenerating speaking style for pre-epic NPCs (no backfill required)
- Voice samples for AI party members / player characters
- TTS, audio, or accent phonetics — this is text-only voice style
- Changing selective-NPC / social-stream UI from **090** / **091**
- Storing a separate "fandom key" column — v1 detects fandom via known-character / seed context at generation time only

## Sub-tickets

### 092.1 Schema: speaking-style columns + repository mapping

Depends on: none

#### Description

Add nullable columns and thread them through the NPC repository types, exactly like `background_key`.

#### Acceptance criteria

- [x] Migration adds `speaking_style_specimen TEXT` and `speaking_style_examples_json TEXT` via `addColumnIfMissing` in `src/db/schema.ts`
- [x] `Npc` / `CreateNpcInput` / `NpcRow` expose `speakingStyleSpecimen: string | null` and `speakingStyleExamples: string[] | null`, mapped to/from the columns (JSON parse/stringify for examples; invalid/empty JSON → `null`)
- [x] Repository/migration tests cover round-trip of both fields and the null default for pre-existing rows

### 092.2 Speaking-style generation agent + person-sounding / fandom rules

Depends on: none (can land before or with 092.1; no DB writes here)

#### Description

Pure agent module that, given an NPC identity snapshot and optional fandom/canon hint, returns validated specimen + examples. Prefer a dedicated helper under `src/agents/campaignGeneration/` (or `src/agents/npcSpeakingStyle.ts`) so bulk and flagged paths share one prompt + parse path.

#### Acceptance criteria

- [x] `buildNpcSpeakingStylePrompt(input)` instructs the model to return JSON shaped like `{"specimen":string,"examples":[string,string]|[string,string,string]}`
- [x] Prompt requires **person-sounding** first-person specimen prose and example lines (contractions/natural rhythm; forbid quest-giver templates and purple monologue)
- [x] When `fandomCharacterHint` (or equivalent) is present, prompt instructs matching that character's recognizable speech from the named fandom/setting; when absent, prompt grounds only in supplied name/role/disposition/temperament/alignment/race/class/background/backstory
- [x] Soft length budget documented in prompt (specimen ≤ ~400 chars; each example ≤ ~160 chars) so dialogue injection stays cheap under **040**
- [x] `generateNpcSpeakingStyle(provider, input)` parses via `tryParseJson`, validates non-empty specimen + 2–3 non-empty example strings, retries up to the campaign-generation attempt cap
- [x] Unit tests: prompt includes person-sounding rules; fandom hint path vs original-only path; malformed-output retry; validation rejects 0/1/4+ examples

### 092.3 Bulk & additional-region generation: request, validate, persist

Depends on: 092.1, 092.2

#### Description

Extend one-shot NPC generation (`buildGenerationPrompt`, `buildAdditionalRegionPrompt`, `buildSingleNpcPrompt`, `normalize.ts`, `persist.ts`) so speaking NPCs include speaking-style fields. Prefer either (a) including specimen/examples in the same NPC JSON object, or (b) a post-pass calling `generateNpcSpeakingStyle` per speaking NPC — pick the option that best preserves existing create contract stability and document the choice in the ticket notes when implementing. Non-speakers omit the fields.

**Design choice (implemented):** post-pass (b) via `enrichNpcWithSpeakingStyle` at persist / `generateSingleNpc` � speaking style is not part of one-shot NPC JSON, so create-contract seed fixtures stay stable.

For fandom matching in bulk create: when an NPC name is drawn from `canon.knownCharacters` (or the preferred-canon-name path), pass that character name (and premise/setting context already available to the stage) into the speaking-style generation as the fandom hint.

#### Acceptance criteria

- [x] Speaking `GeneratedNpc` values carry `speakingStyleSpecimen` + `speakingStyleExamples` (or an equivalent that persist maps into `CreateNpcInput`)
- [x] Normalize/validation requires both fields for `canSpeak: true` and omits/clears them for `canSpeak: false`
- [x] `persistRegionWithNpcs` / `persistCampaignNpcsFromGeneration` persist the new fields
- [x] Unit/integration tests: speaking NPC persists specimen + 2–3 examples; non-speaking persists nulls; a `knownCharacters`-matched NPC generation path receives a fandom hint in the speaking-style prompt (fake/capturing provider)

### 092.4 Flagged single-NPC path generates speaking style

Depends on: 092.1, 092.2

#### Description

After phase-2 details (`generateFlaggedNpcDetails` / `generateFlaggedNpc`), generate speaking style for speaking NPCs and persist via `generateNpcForCampaign` / `createNpcWithCombatReview`. If the seed prompt or preferred name clearly targets a `knownCharacters` entry (when canon context is available to the flagged path), pass the fandom hint; otherwise generate from identity + backstory only.

#### Acceptance criteria

- [x] Flagged speaking NPC ends with non-null specimen + 2–3 examples on the created row
- [x] Flagged non-speaking creature leaves both null
- [x] Fake/capturing-provider test: seed that names a known fandom character includes fandom-matching instructions in the speaking-style prompt; generic seed uses identity-only grounding
- [x] Existing race-reuse / background grounding tests still pass

### 092.5 Inject sample into in-play dialogue prompts

Depends on: 092.1

#### Description

Update `buildSpeakingPrompt` (`src/agents/npc.ts`) so stored speaking style is established-fact voice grounding. Do not change non-speaking action prompts.

#### Acceptance criteria

- [x] When `speakingStyleSpecimen` / `speakingStyleExamples` are present, the user prompt includes them and instructs the model to match that voice for this reply (without quoting the samples verbatim as the whole reply unless natural)
- [x] When both are null/empty (legacy NPCs), prompt shape matches today's fields (no empty "Speaking style:" stubs)
- [x] Unit tests assert presence/absence of the voice block for NPCs with and without samples
- [x] Soft assertion that the injected block stays bounded (examples capped to stored 2–3 lines)

### 092.6 Campaign-create fixtures + contract

Depends on: 092.3

#### Description

Keep the create pipeline green per `docs/runbooks/campaign-create-change-checklist.md`.

#### Acceptance criteria

- [x] Cascading seed fixtures (`fixtures.ts`) include speaking-style fields for speaking NPCs where the new normalize rules require them
- [x] `campaignCreateIpc.contract.test.ts` passes with updated fixtures
- [x] Checklist items for prompt/normalize/persist changes are satisfied (realistic LLM fixture coverage if JSON shape changed)

### 092.7 Smoke + runbook

Depends on: 092.1–092.6

#### Description

Document and automate the happy path: generate a speaking NPC (original + fandom-flavored), confirm persistence, confirm dialogue prompt grounding.

#### Acceptance criteria

- [x] Integration/smoke coverage: speaking NPC persists specimen + examples; dialogue prompt assembly includes them
- [x] Runbook notes (new doc or short section under an existing NPC/campaign-create runbook) cover verifying a fandom-named NPC vs an original NPC after create / Generate NPC
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
