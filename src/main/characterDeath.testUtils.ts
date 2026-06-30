import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { applyDamageAndStartDyingIfNeeded, progressDyingSequence } from './dyingResolution'

export function alwaysFail(): number {
  return 0
}

export function runUntilDyingResolved(
  db: ReturnType<typeof createTestDb>,
  campaignId: string,
  characterId: string
) {
  for (let i = 0; i < 3; i++) {
    const latest = getCharacterById(db, characterId)!
    const result = progressDyingSequence(db, campaignId, latest, alwaysFail)
    if (result?.status === 'permanently_dead' || result?.status === 'reverted') {
      return result
    }
  }
  return null
}

export function seedDeathCampaign(deathMode: 'legendary' | 'standard' | 'respawn', respawnRules?: {
  location: string
  cost: number
  limit: number | null
}) {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test',
    premisePrompt: '...',
    deathMode,
    respawnRules: respawnRules ?? null
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 20
  })
  return { db, campaign, character }
}

export function killViaDying(db: ReturnType<typeof createTestDb>, campaignId: string, characterId: string) {
  const character = getCharacterById(db, characterId)!
  applyDamageAndStartDyingIfNeeded(db, character, 999)
  runUntilDyingResolved(db, campaignId, characterId)
}
