import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { abilityModifier } from '../engine/abilities'
import { computeHP } from '../engine/hp'
import { createPartyMembers, createPlayerCharacter } from './characterCreationIpc'

function seedCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return { db, campaign }
}

describe('createPlayerCharacter (009.3)', () => {
  it('computes HP and AC via the engine functions and sets a starting currency value', () => {
    const { db, campaign } = seedCampaign()
    const abilityScores = { body: 14, agility: 16, mind: 10, presence: 12 }

    const character = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores
    })

    expect(character.kind).toBe('player')
    expect(character.hp).toBe(computeHP('fighter', 1, abilityScores.body))
    expect((character.stats as { ac: number }).ac).toBe(10 + abilityModifier(abilityScores.agility))
    expect(character.currency).toBeGreaterThan(0)
  })

  it('persists portrait and sheet-background paths when provided', () => {
    const { db, campaign } = seedCampaign()
    const character = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'mage',
      abilityScores: { body: 8, agility: 12, mind: 16, presence: 10 },
      portraitPath: '/path/to/portrait.png',
      sheetBackgroundPath: '/path/to/background.jpg'
    })

    expect(character.portraitPath).toBe('/path/to/portrait.png')
    expect(character.sheetBackgroundPath).toBe('/path/to/background.jpg')
  })
})

describe('createPartyMembers (009.4)', () => {
  it('creates one ai_party_member row per member with name/class/personality', () => {
    const { db, campaign } = seedCampaign()

    const members = createPartyMembers(db, {
      campaignId: campaign.id,
      members: [
        { name: 'Brom', characterClass: 'ranger', personality: 'gruff but loyal' },
        { name: 'Lyra', characterClass: 'cleric', personality: 'cheerful optimist' }
      ]
    })

    expect(members).toHaveLength(2)
    expect(members.every((m) => m.kind === 'ai_party_member')).toBe(true)
    const firstMember = members[0]
    expect(firstMember).toBeDefined()
    expect((firstMember!.stats as { personality: string }).personality).toBe('gruff but loyal')
  })

  it('creates zero rows when no party members are added', () => {
    const { db, campaign } = seedCampaign()
    const members = createPartyMembers(db, { campaignId: campaign.id, members: [] })
    expect(members).toHaveLength(0)
  })
})
