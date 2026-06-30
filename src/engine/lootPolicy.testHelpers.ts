import type { LootContext, FoeSummary } from '../shared/loot/types'

export function makeCtx(overrides: Partial<LootContext>): LootContext {
  return {
    source: 'encounter_end',
    foes: [],
    regionId: 'region-1',
    playerLevel: 3,
    playerCharacterId: 'char-1',
    campaignId: 'camp-1',
    ...overrides
  }
}

export function makeFoe(overrides: Partial<FoeSummary>): FoeSummary {
  return {
    npcId: 'npc-1',
    npcRole: 'wolf',
    combatTier: 'catalog',
    buckets: ['beast'],
    outcome: 'slain',
    ...overrides
  }
}
