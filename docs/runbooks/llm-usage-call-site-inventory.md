# LLM usage call-site inventory (112.4)

Production `provider.generate` / agent entry points and their metering `purpose` tags.
Caps and escalation behavior are unchanged from 040.x; this doc tracks **112.4 purpose classification only**.

## Campaign setup (`campaign.*`)

| Call site | Module | Purpose |
|-----------|--------|---------|
| Pantheon generation | `src/agents/campaignGeneration/index.ts` → `generateCampaignPantheon` | `campaign.pantheon` |
| World generation | `generateCampaignWorld` | `campaign.world` |
| Canon recall (soft stage) | `generateCanonRecall` | `campaign.world` |
| Regions bulk generation | `generateCampaignRegions` | `campaign.region` |
| Additional region | `generateAdditionalRegion` | `campaign.region` |
| Story thread | `generateCampaignStoryThread` | `campaign.story` |
| Campaign bestiary roster stage | `generateCampaignBestiary` | `campaign.npc` |
| Single NPC shortfall fill | `attemptGenerateSingleNpc` / `generateSingleNpc` | `campaign.npc` |
| Flagged NPC core bundle | `src/agents/campaignGeneration/flaggedNpc.ts` → `generateNpcCoreBundle` | `campaign.npc` |
| Flagged NPC final details (speaking / non-speaking) | `generateFlaggedNpcDetails` | `campaign.npc` |
| NPC speaking style | `src/agents/npcSpeakingStyle.ts` → `generateNpcSpeakingStyle` | `campaign.npc` |
| World summary regen from history | `src/agents/campaignGeneration/worldSummaryRegen.ts` | `campaign.world` |
| Bestiary species lore (homebrew) | `src/agents/bestiary/generateSpecies.ts` → `resolveBaseLore` | `campaign.npc` |

## Onboarding (`onboarding.*`)

| Call site | Module | Purpose |
|-----------|--------|---------|
| Race lore | `src/agents/raceLore.ts` → `generateRaceLore` | `onboarding.race_lore` |
| Background story | `src/agents/backgroundStory.ts` | `onboarding.background` |
| Guided identity kickoff / turns | `src/agents/guidedIdentity.ts` | `onboarding.guided_identity` |
| Guided player reply (identity / opening) | `src/agents/guidedPlayerReply.ts` | `onboarding.guided_identity` |
| Opening scene kickoff / turns | `src/agents/guidedOpeningScene.ts` | `onboarding.opening_scene` |

## Play loop (`play.*`)

| Call site | Module | Purpose |
|-----------|--------|---------|
| Standalone intent | `src/agents/dm.ts` → `interpretIntent` | `play.intent_route` |
| Merged intent + routing | `src/agents/intentAndRoute.ts` → `interpretIntentAndRoute` | `play.intent_route` |
| DM narration | `src/agents/dm.ts` → `narrate` | `play.narration` |
| NPC reaction (dialogue / action) | `src/agents/npc.ts` → `generateNpcReaction` | `play.npc_reaction` |
| NPC dossier opinion summary | `src/agents/npcOpinion.ts` → `generateNpcOpinionSummary` | `play.npc_reaction` |
| Party member action | `src/agents/partyMember.ts` → `decidePartyMemberAction` | `play.party_member` |
| Inactive player proxy | `src/agents/inactivePlayer.ts` → `decideInactivePlayerAction` | `play.inactive_proxy` |
| Yield review (LLM fallback) | `src/agents/yieldReview.ts` → `proposeYieldOutcome` | `play.combat` |
| Defeat disposition (LLM fallback) | `src/agents/defeatDisposition.ts` → `proposeDefeatDisposition` | `play.combat` |
| Flee / escape narration | `src/agents/fleeNarration.ts` → `judgeEscapeNarration` | `play.combat` |
| Retired adventurer combat review | `src/agents/retiredAdventurerReview.ts` | `play.combat` |
| Loot resolution | `src/agents/loot.ts` → `resolveLoot` | `play.loot_xp` |
| XP difficulty rating | `src/agents/xp.ts` → `resolveXpAward` | `play.loot_xp` |
| Level-up perks | `src/agents/levelUp.ts` → `resolveLevelUpPerks` | `play.loot_xp` |
| Item modification | `src/agents/itemModification.ts` → `resolveItemModification` | `play.loot_xp` |
| Session recap | `src/main/recapIpc.ts` → `generateSessionRecap` | `play.recap` |
| Ask the DM (OOC) | `src/agents/askDm.ts` → `generateAskDmReply` | `play.ooc_dm` |
| Character obituary | `src/agents/obituary.ts` → `generateObituary` | `play.narration` |

## Meta / system (`system.*`)

| Call site | Module | Purpose |
|-----------|--------|---------|
| Player2 connectivity ping | `src/main/settingsIpc.ts` → `testPlayer2Connection` | `system.ping` |

## Guard

`src/agents/providers/purposeGuard.test.ts` scans `src/agents/**/*.ts` (excluding provider adapters) plus `recapIpc.ts` and `settingsIpc.ts` for `maxTokens:` literals missing a nearby `purpose:` within ±8 lines.

## Temporary `other.unclassified` exceptions

None. Every listed production call site passes an explicit classified purpose.

## Notes

- `campaignId` / `characterId` are passed on the `GenerateContext` when already in scope at the call site (e.g. play-loop agents, recap, ask-DM, loot/XP/level-up).
- Campaign-generation bulk helpers thread `purpose` through `generateWithRetries` in `campaignGeneration/index.ts`.
- Provider adapters (`claude`, `player2`, `tokenEscalation`, `withUsageRecording`) are excluded from the guard scan; they forward context unchanged.
