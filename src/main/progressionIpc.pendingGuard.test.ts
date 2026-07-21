import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById, updateCharacter } from '../db/repositories/characters'
import { getPendingLevelUpForCharacter } from './progressionIpc'
import { hasPendingLevelUp } from './progressionPendingState'
import type { PendingLevelUpCeremony } from '../shared/progression/types'

function seedCampaignCharacter(
  stats?: Record<string, unknown>
): { db: ReturnType<typeof createTestDb>; characterId: string } {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test',
    premisePrompt: 'p',
    deathMode: 'standard'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    ...(stats ? { stats } : {})
  })
  return { db, characterId: character.id }
}

const samplePerks: PendingLevelUpCeremony['perks'] = [
  {
    id: 'a',
    name: 'A',
    description: 'a',
    category: 'ac_bonus',
    flavorTags: []
  },
  {
    id: 'b',
    name: 'B',
    description: 'b',
    category: 'extra_attack',
    flavorTags: []
  },
  {
    id: 'c',
    name: 'C',
    description: 'c',
    category: 'hp_max_bonus',
    flavorTags: []
  }
]

describe('getPendingLevelUpForCharacter', () => {
  it('returns null when pending queue entry has no perks (avoids renderer crash)', () => {
    const { db, characterId } = seedCampaignCharacter({
      pendingLevelUpQueue: [
        {
          targetLevel: 2,
          spanStartXp: 0,
          narrationText: 'Broken ceremony',
          perks: undefined
        }
      ]
    })
    expect(getPendingLevelUpForCharacter(db, characterId)).toBeNull()
  })

  it('does not treat empty-perk queue rows as blocking pending level-up', () => {
    const { db, characterId } = seedCampaignCharacter({
      pendingLevelUpQueue: [
        {
          targetLevel: 2,
          spanStartXp: 0,
          narrationText: 'Broken ceremony',
          perks: undefined
        }
      ]
    })
    const loaded = getCharacterById(db, characterId)
    expect(loaded).not.toBeNull()
    expect(hasPendingLevelUp(loaded!)).toBe(false)
  })

  it('returns ceremony when perks are present', () => {
    const { db, characterId } = seedCampaignCharacter()
    updateCharacter(db, characterId, {
      stats: {
        pendingLevelUpQueue: [
          {
            targetLevel: 2,
            spanStartXp: 0,
            narrationText: 'You grow.',
            perks: samplePerks
          }
        ]
      }
    })
    const pending = getPendingLevelUpForCharacter(db, characterId)
    expect(pending?.targetLevel).toBe(2)
    expect(pending?.perks).toHaveLength(3)
  })
})
