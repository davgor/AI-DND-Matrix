import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { abilityModifier } from '../engine/abilities'
import { HIT_DIE_SIZE } from '../engine/hp'

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
  it('rolls L1 HP, persists stats.maxHp, and sets starting currency', () => {
    const { db, campaign } = seedCampaign()
    const abilityScores = { body: 14, agility: 16, mind: 10, presence: 12 }

    const character = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores,
      alignment: 'lawful_good'
    })

    const stats = character.stats as { ac: number; maxHp: number; hitDieRolls: number[] }
    const mod = abilityModifier(abilityScores.body)

    expect(character.kind).toBe('player')
    expect(character.hp).toBe(stats.maxHp)
    expect(character.hp).toBeGreaterThanOrEqual(1 + mod)
    expect(character.hp).toBeLessThanOrEqual(HIT_DIE_SIZE.fighter + mod)
    expect(stats.hitDieRolls).toHaveLength(1)
    expect(stats.ac).toBe(10 + abilityModifier(abilityScores.agility))
    expect(character.currency).toBeGreaterThan(0)
  })

  it('persists portrait and sheet-background paths when provided', () => {
    const { db, campaign } = seedCampaign()
    const character = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'mage',
      abilityScores: { body: 8, agility: 12, mind: 16, presence: 10 },
      alignment: 'chaotic_neutral',
      portraitPath: '/path/to/portrait.png',
      sheetBackgroundPath: '/path/to/background.jpg'
    })

    expect(character.portraitPath).toBe('/path/to/portrait.png')
    expect(character.sheetBackgroundPath).toBe('/path/to/background.jpg')
  })
})

describe('createPartyMembers (009.4)', () => {
  it('creates ai_party_member rows with rolled HP and ability scores (fixes 0/0 bug)', () => {
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
    expect(members.every((m) => m.ownerPlayerCharacterId === null)).toBe(true)
    for (const member of members) {
      const stats = member.stats as {
        personality: string
        maxHp: number
        hitDieRolls: number[]
        abilityScores: { body: number }
      }
      expect(member.hp).toBe(stats.maxHp)
      expect(member.hp).toBeGreaterThan(0)
      expect(stats.hitDieRolls).toHaveLength(1)
      expect(stats.abilityScores.body).toBeGreaterThanOrEqual(3)
    }
    expect((members[0]!.stats as { personality: string }).personality).toBe('gruff but loyal')
  })

  it('creates zero rows when no party members are added', () => {
    const { db, campaign } = seedCampaign()
    const members = createPartyMembers(db, { campaignId: campaign.id, members: [] })
    expect(members).toHaveLength(0)
  })
})
