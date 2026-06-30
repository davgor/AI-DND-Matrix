import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import type { CombatEncounter } from '../shared/combat/types'

export function seedEncounterLootBase() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: 'A test',
    deathMode: 'standard'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Test Region',
    description: 'A test region'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player',
    level: 3
  })
  return { db, campaign, region, player }
}

export function makeEncounter(
  campaignId: string,
  participantIds: CombatEncounter['participantIds']
): CombatEncounter {
  return {
    id: 'enc-test',
    campaignId,
    phase: 'resolved',
    outcome: 'defeated',
    initiativeOrder: [],
    activeTurnIndex: 0,
    round: 2,
    participantIds,
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt: new Date().toISOString()
  }
}
