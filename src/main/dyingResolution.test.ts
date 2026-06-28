import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createSaveSnapshot } from '../db/repositories/saves'
import {
  applyDamageAndStartDyingIfNeeded,
  progressDyingSequence
} from './dyingResolution'

function alwaysSucceed(): number {
  return 0.5
}

function alwaysFail(): number {
  return 0
}

function seedPlayer(deathMode: 'legendary' | 'standard' | 'respawn', respawnRules?: {
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
    hp: 20,
    currency: 100,
    stats: { abilityScores: { body: 10, agility: 10, mind: 10, presence: 10 }, ac: 12 }
  })
  return { db, campaign, character }
}

describe('applyDamageAndStartDyingIfNeeded', () => {
  it('just lowers HP when the hit is not fatal', () => {
    const { db, character } = seedPlayer('legendary')
    const result = applyDamageAndStartDyingIfNeeded(db, character, 5)
    expect(result.hpAfter).toBe(15)
    expect(result.resolution).toBeUndefined()
  })

  it('starts a dying sequence when HP drops to 0', () => {
    const { db, character } = seedPlayer('legendary')
    const result = applyDamageAndStartDyingIfNeeded(db, character, 999)
    expect(result.hpAfter).toBe(0)
    expect(result.resolution?.status).toBe('unconscious')
    expect(getCharacterById(db, character.id)?.hp).toBe(0)
  })
})

function runUntilDyingResolved(
  db: ReturnType<typeof createTestDb>,
  campaignId: string,
  character: { id: string },
  rng: () => number
) {
  let result = null
  for (let i = 0; i < 3; i++) {
    const latest = getCharacterById(db, character.id)!
    result = progressDyingSequence(db, campaignId, latest, rng)
  }
  return result
}

describe('progressDyingSequence: no-op and stabilize cases', () => {
  it('returns null when the character is not in a dying sequence', () => {
    const { db, campaign, character } = seedPlayer('legendary')
    expect(progressDyingSequence(db, campaign.id, character, alwaysSucceed)).toBeNull()
  })

  it('stabilizes and revives at 1 HP after a streak of successful saves', () => {
    const { db, campaign, character } = seedPlayer('legendary')
    applyDamageAndStartDyingIfNeeded(db, character, 999)

    const result = runUntilDyingResolved(db, campaign.id, character, alwaysSucceed)

    expect(result?.status).toBe('stabilized_and_revived')
    expect(getCharacterById(db, character.id)?.hp).toBe(1)
  })
})

describe('progressDyingSequence: death mode resolution after a lost sequence', () => {
  it('permanently kills the character under legendary mode', () => {
    const { db, campaign, character } = seedPlayer('legendary')
    applyDamageAndStartDyingIfNeeded(db, character, 999)

    const result = runUntilDyingResolved(db, campaign.id, character, alwaysFail)

    expect(result?.status).toBe('permanently_dead')
  })

  it('reverts to the last save snapshot under standard mode', () => {
    const { db, campaign, character } = seedPlayer('standard')
    createSaveSnapshot(db, campaign.id)
    applyDamageAndStartDyingIfNeeded(db, character, 999)

    const result = runUntilDyingResolved(db, campaign.id, character, alwaysFail)

    expect(result?.status).toBe('reverted')
    expect(getCharacterById(db, character.id)?.hp).toBe(20)
  })

  it('respawns with the configured rules and decrements remaining uses', () => {
    const { db, campaign, character } = seedPlayer('respawn', {
      location: 'Last Shrine',
      cost: 20,
      limit: 1
    })
    applyDamageAndStartDyingIfNeeded(db, character, 999)

    const result = runUntilDyingResolved(db, campaign.id, character, alwaysFail)

    expect(result?.status).toBe('respawned')
    const reloaded = getCharacterById(db, character.id)
    expect(reloaded?.hp).toBe(1)
    expect(reloaded?.currency).toBe(80)
  })

  it('falls back to permanently dead once respawn uses are exhausted', () => {
    const { db, campaign, character } = seedPlayer('respawn', {
      location: 'Last Shrine',
      cost: 20,
      limit: 0
    })
    applyDamageAndStartDyingIfNeeded(db, character, 999)

    const result = runUntilDyingResolved(db, campaign.id, character, alwaysFail)

    expect(result?.status).toBe('permanently_dead')
  })
})
