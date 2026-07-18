import type Database from 'better-sqlite3'
import { resolveLoot, type LootAgentResponse } from '../agents/loot'
import type { Provider } from '../agents/providers/types'
import { resolveLootPolicy } from '../engine/lootPolicy'
import { appendEvent, listEventsByCampaign } from '../db/repositories/events'
import type { CombatEncounter } from '../shared/combat/types'
import type { CatalogItem } from '../shared/items/types'
import type { LootContext, LootPolicy, LootResolutionResult } from '../shared/loot/types'
import { assembleEncounterLootContext } from './encounterLootContext'
import { assembleQuestLootContext } from './questLootContext'
import { filterCatalogCandidatesForPolicy, validateAndPersistLootGrants } from './lootGrants'
import { buildLootSeedKey, selectLootDeterministic } from './lootSelector'
import { isRewardNarrationEnrichmentEnabled } from './rewardEnrichment'
import { lootNarrationTemplate } from './rewardNarrationTemplates'
import { encounterEligibleForRewards } from './encounterRewards'
import type { TurnResult } from './turnIpc'

/** How many recent loot_resolved events feed the variety guard's recent-item set. */
const RECENT_LOOT_EVENT_WINDOW = 5

function collectRecentLootItemIds(db: Database.Database, campaignId: string): string[] {
  const events = listEventsByCampaign(db, campaignId, {
    type: 'loot_resolved',
    limit: RECENT_LOOT_EVENT_WINDOW
  })
  return events.flatMap((event) => {
    const ids = event.payload.acceptedItemIds
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  })
}

/**
 * Default zero-LLM loot path (040.7): deterministic catalog selection with
 * template narration. Accepted, intended behavior change: `proposeNew`
 * homebrew catalog growth stops while enrichment is off — the selector only
 * grants existing catalog items. `ENRICH_REWARD_NARRATION=true` restores the
 * prior LLM selection (including proposeNew).
 */
function buildTemplateLootResponse(
  db: Database.Database,
  context: LootContext,
  policy: LootPolicy,
  candidates: CatalogItem[]
): LootAgentResponse {
  const selection = selectLootDeterministic({
    candidates,
    policy,
    seedKey: buildLootSeedKey(context),
    recentItemIds: collectRecentLootItemIds(db, context.campaignId)
  })
  return {
    narrationText: lootNarrationTemplate(context.source, selection.map((item) => item.name)),
    itemGrants: selection.map((item) => ({ catalogItemId: item.id })),
    nothingToFind: selection.length === 0
  }
}
async function executeLootPass(input: {
  db: Database.Database
  provider: Provider
  context: LootContext
  linkedEventId?: string
}): Promise<LootResolutionResult | null> {
  const { db, provider, context, linkedEventId } = input
  const policy = resolveLootPolicy(context)
  if (policy.maxGrantCount === 0) {
    return null
  }

  const candidates = filterCatalogCandidatesForPolicy(db, policy)
  const agentResult = isRewardNarrationEnrichmentEnabled()
    ? await resolveLoot(provider, context, policy, candidates)
    : buildTemplateLootResponse(db, context, policy, candidates)
  if (agentResult.nothingToFind && agentResult.itemGrants.length === 0) {
    appendLootResolvedEvent(db, {
      campaignId: context.campaignId,
      source: context.source,
      policy,
      grantResult: { accepted: [], rejected: [] },
      narrationText: agentResult.narrationText,
      linkedEventId
    })
    return {
      narrationText: agentResult.narrationText,
      grantResult: { accepted: [], rejected: [] },
      nothingToFind: true
    }
  }

  const grantResult = validateAndPersistLootGrants(
    db,
    context.playerCharacterId,
    policy,
    agentResult.itemGrants
  )
  appendLootResolvedEvent(db, {
    campaignId: context.campaignId,
    source: context.source,
    policy,
    grantResult,
    narrationText: agentResult.narrationText,
    linkedEventId
  })
  return {
    narrationText: agentResult.narrationText,
    grantResult,
    nothingToFind: agentResult.nothingToFind
  }
}

export function appendLootResolvedEvent(
  db: Database.Database,
  input: {
    campaignId: string
    source: LootContext['source']
    policy: ReturnType<typeof resolveLootPolicy>
    grantResult: LootResolutionResult['grantResult']
    narrationText: string
    linkedEventId?: string
  }
): void {
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'loot_resolved',
    payload: {
      source: input.source,
      policySummary: {
        allowedItemTypes: input.policy.allowedItemTypes,
        maxRarity: input.policy.maxRarity,
        maxGrantCount: input.policy.maxGrantCount
      },
      acceptedItemIds: input.grantResult.accepted.map((g) => g.itemId),
      rejectedCount: input.grantResult.rejected.length,
      narrationText: input.narrationText,
      linkedEventId: input.linkedEventId ?? null
    }
  })
}

function lootTurnExtras(result: LootResolutionResult): Pick<TurnResult, 'lootNarration' | 'lootGrants'> {
  return {
    lootNarration: result.narrationText,
    lootGrants: result.grantResult.accepted
  }
}

export async function runEncounterLootPass(input: {
  db: Database.Database
  provider: Provider
  encounter: CombatEncounter
  campaignId: string
  playerCharacterId: string
  regionId: string
}): Promise<Pick<TurnResult, 'lootNarration' | 'lootGrants'> | null> {
  if (!encounterEligibleForRewards(input.encounter)) {
    return null
  }
  const context = assembleEncounterLootContext(input.db, {
    encounter: input.encounter,
    campaignId: input.campaignId,
    playerCharacterId: input.playerCharacterId,
    regionId: input.regionId
  })
  const result = await executeLootPass({ db: input.db, provider: input.provider, context })
  return result ? lootTurnExtras(result) : null
}

export async function runQuestLootPass(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  threadId?: string
  questId?: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
  encounterLootRanThisTurn?: boolean
}): Promise<Pick<TurnResult, 'lootNarration' | 'lootGrants'> | null> {
  if (input.encounterLootRanThisTurn === true) {
    return null
  }
  const context = assembleQuestLootContext({
    db: input.db,
    campaignId: input.campaignId,
    threadId: input.threadId,
    questId: input.questId,
    regionId: input.regionId,
    playerCharacterId: input.playerCharacterId,
    playerLevel: input.playerLevel
  })
  if (!context) {
    return null
  }
  const result = await executeLootPass({ db: input.db, provider: input.provider, context })
  return result ? lootTurnExtras(result) : null
}

export async function enrichTurnWithEncounterLoot(input: {
  db: Database.Database
  provider: Provider
  encounter: CombatEncounter
  campaignId: string
  playerCharacterId: string
  regionId: string
  base: TurnResult
}): Promise<TurnResult> {
  const loot = await runEncounterLootPass({
    db: input.db,
    provider: input.provider,
    encounter: input.encounter,
    campaignId: input.campaignId,
    playerCharacterId: input.playerCharacterId,
    regionId: input.regionId
  })
  if (!loot) {
    return input.base
  }
  return { ...input.base, ...loot }
}
