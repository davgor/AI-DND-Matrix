# NPC speaking style smoke (092)

Verifies that speaking NPCs get a durable voice specimen + example lines at generation time, and that in-play dialogue prompts inject that sample.

## Automated coverage

```bash
npx vitest run \
  src/db/migrateNpcSpeakingStyleV36.test.ts \
  src/agents/npcSpeakingStyle.test.ts \
  src/agents/campaignGeneration/speakingStylePersist.test.ts \
  src/agents/campaignGeneration/flaggedNpc.test.ts \
  src/agents/npc.test.ts \
  src/main/campaignCreateIpc.contract.test.ts
```

Expect:

- Migration round-trips `speakingStyleSpecimen` / `speakingStyleExamples`
- Post-pass generation produces person-sounding JSON (specimen + 2–3 examples)
- Bulk persist and flagged Generate NPC persist the fields (null for non-speakers)
- Fandom: when NPC name matches `knownCharacters`, the speaking-style prompt includes fandom-matching instructions
- Original: without a fandom hint, the prompt forbids imitating external franchises
- `generateNpcReaction` injects the voice block when samples exist, and omits it for legacy NPCs

## Manual play checks

### Original NPC (Campaign Review → Generate NPC)

1. Open Campaign Review for any campaign with a region.
2. Generate NPC with a generic seed (e.g. "a tired dock clerk who hates paperwork").
3. Confirm create succeeds (no schema failure).
4. In play, talk to that NPC — replies should feel like a person (contractions, uneven rhythm), not a quest-giver template.

### Fandom-named NPC

1. Create a campaign whose premise is a known setting (e.g. Shield Hero), or Generate NPC with a seed that clearly names a canon character **and** pass known characters when testing via harness.
2. Prefer a preferred-canon / known-character name during create when the premise is recognized.
3. Confirm the NPC persists with non-null speaking style fields (dev DB/repo check or temporary log).
4. In dialogue, voice should lean toward that character's recognizable speech when the seed/name matched canon.

### Legacy / non-speaking

- Pre-epic NPCs with null speaking style still respond (prompt has no empty "Speaking style:" stub).
- Non-speaking creatures never get specimen/examples and never use dialogue prompts.
