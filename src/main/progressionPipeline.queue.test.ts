import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { submitPerkChoice, getPendingLevelUpCeremony } from './progressionPipeline'

describe('queued level-up ceremonies', () => {
  it('queues two ceremonies when two levels are pending', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 2,
      xp: 300,
      stats: {
        pendingLevelUpQueue: [
          {
            targetLevel: 2,
            spanStartXp: 0,
            narrationText: 'First pick.',
            perks: [
              { id: 'a1', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: [] },
              { id: 'a2', name: 'B', description: 'b', category: 'hp_max_bonus', flavorTags: [] },
              { id: 'a3', name: 'C', description: 'c', category: 'extra_attack', flavorTags: [] }
            ]
          },
          {
            targetLevel: 3,
            spanStartXp: 300,
            narrationText: 'Second pick.',
            perks: [
              { id: 'b1', name: 'D', description: 'd', category: 'ac_bonus', flavorTags: [] },
              { id: 'b2', name: 'E', description: 'e', category: 'hp_max_bonus', flavorTags: [] },
              { id: 'b3', name: 'F', description: 'f', category: 'extra_attack', flavorTags: [] }
            ]
          }
        ]
      }
    })
    submitPerkChoice(db, player.id, 'a1')
    expect(getPendingLevelUpCeremony(db, player.id)?.targetLevel).toBe(3)
    submitPerkChoice(db, player.id, 'b2')
    expect(getPendingLevelUpCeremony(db, player.id)).toBeNull()
    expect((getCharacterById(db, player.id)!.stats as { perks?: unknown[] }).perks).toHaveLength(2)
  })
})
