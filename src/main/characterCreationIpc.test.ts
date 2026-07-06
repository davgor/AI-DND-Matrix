import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCampaignRace } from '../db/repositories/campaignRaces'
import { listCampaignRaces } from '../db/repositories/campaignRaces'
import { abilityModifier } from '../engine/abilities'
import { HIT_DIE_SIZE } from '../engine/hp'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import type { RaceLore } from '../shared/raceSelection/types'

import {
  createPartyMembers,
  createPlayerCharacter,
  replaceSetupPartyMembers,
  updatePlayerCharacterSetup
} from './characterCreationIpc'
import { listCharactersByCampaign } from '../db/repositories/characters'

const SAMPLE_LORE: RaceLore = {
  summary: 'Elves in this land are reclusive.',
  appearance: 'Slender and pale.',
  culture: 'Forest-bound.',
  roleInThisLand: 'Keepers of old groves.',
  hooks: ['A grove is dying.']
}

function seedCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return { db, campaign }
}

function loreProvider() {
  return createScriptedProvider([
    JSON.stringify(SAMPLE_LORE),
    JSON.stringify(SAMPLE_LORE),
    JSON.stringify(SAMPLE_LORE)
  ])
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
    expect(character.guidedCreationPhase).toBe('race')
  })

  it('persists the ability score assignment method in stats', () => {
    const { db, campaign } = seedCampaign()
    const character = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores: { body: 16, agility: 14, mind: 15, presence: 13 },
      abilityScoreMethod: 'roll',
      alignment: 'lawful_good'
    })

    expect((character.stats as { abilityScoreMethod?: string }).abilityScoreMethod).toBe('roll')
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

describe('createPartyMembers (009.4, 049.8)', () => {
  it('creates ai_party_member rows with rolled HP and ability scores (fixes 0/0 bug)', async () => {
    const { db, campaign } = seedCampaign()
    const provider = loreProvider()

    const members = await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      members: [
        { name: 'Brom', characterClass: 'ranger', personality: 'gruff but loyal', raceKey: 'human' },
        { name: 'Lyra', characterClass: 'cleric', personality: 'cheerful optimist', raceKey: 'elf' }
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
      expect(member.raceKey).toBeTruthy()
    }
    expect((members[0]!.stats as { personality: string }).personality).toBe('gruff but loyal')
  })

  it('creates zero rows when no party members are added', async () => {
    const { db, campaign } = seedCampaign()
    const provider = loreProvider()
    const members = await createPartyMembers(db, provider, { campaignId: campaign.id, members: [] })
    expect(members).toHaveLength(0)
  })
})

describe('createPartyMembers race realization (049.8)', () => {
  it('realizes a new preset race and persists race_key on the member', async () => {
    const { db, campaign } = seedCampaign()
    const provider = loreProvider()

    const [member] = await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      members: [{ name: 'Brom', characterClass: 'ranger', personality: 'gruff', raceKey: 'dwarf' }]
    })

    expect(member?.raceKey).toBe('dwarf')
    expect(listCampaignRaces(db, campaign.id)).toHaveLength(1)
    expect(listCampaignRaces(db, campaign.id)[0]?.raceKey).toBe('dwarf')
    expect(provider.calls).toHaveLength(1)
  })

  it('reuses an already-locked race without a second LLM call', async () => {
    const { db, campaign } = seedCampaign()
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      lore: SAMPLE_LORE
    })
    const provider = loreProvider()

    const [member] = await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      members: [{ name: 'Lyra', characterClass: 'cleric', personality: 'kind', raceKey: 'elf' }]
    })

    expect(member?.raceKey).toBe('elf')
    expect(provider.calls).toHaveLength(0)
  })

  it('realizes the same new race once when two companions pick it', async () => {
    const { db, campaign } = seedCampaign()
    const provider = loreProvider()

    const members = await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      members: [
        { name: 'Brom', characterClass: 'ranger', personality: 'gruff', raceKey: 'halfling' },
        { name: 'Lyra', characterClass: 'cleric', personality: 'kind', raceKey: 'halfling' }
      ]
    })

    expect(members.every((m) => m.raceKey === 'halfling')).toBe(true)
    expect(listCampaignRaces(db, campaign.id)).toHaveLength(1)
    expect(provider.calls).toHaveLength(1)
  })
})

describe('updatePlayerCharacterSetup', () => {
  it('updates a race-phase player without creating a duplicate', () => {
    const { db, campaign } = seedCampaign()
    const player = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: 'lawful_good'
    })

    const updated = updatePlayerCharacterSetup(db, {
      characterId: player.id,
      name: 'Kael Thornwick',
      archetype: 'ranger',
      abilityScores: { body: 12, agility: 16, mind: 10, presence: 12 },
      abilityScoreMethod: 'standardArray',
      alignment: 'chaotic_good',
      portraitPath: '/new.png'
    })

    expect(updated.name).toBe('Kael Thornwick')
    expect(updated.characterClass).toBe('ranger')
    expect(updated.alignment).toBe('chaotic_good')
    expect(updated.portraitPath).toBe('/new.png')
    expect((updated.stats as { abilityScoreMethod?: string }).abilityScoreMethod).toBe('standardArray')
    expect(listCharactersByCampaign(db, campaign.id).filter((row) => row.kind === 'player')).toHaveLength(1)
  })
})

describe('replaceSetupPartyMembers', () => {
  it('replaces shared setup party members for a race-phase player', async () => {
    const { db, campaign } = seedCampaign()
    const provider = loreProvider()
    const player = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: 'lawful_good'
    })
    await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      members: [{ name: 'Brom', characterClass: 'ranger', personality: 'gruff', raceKey: 'human' }]
    })

    const replaced = await replaceSetupPartyMembers(db, provider, {
      campaignId: campaign.id,
      playerCharacterId: player.id,
      members: [{ name: 'Lyra', characterClass: 'cleric', personality: 'kind', raceKey: 'elf' }]
    })

    expect(replaced).toHaveLength(1)
    expect(replaced[0]?.name).toBe('Lyra')
    expect(replaced[0]?.raceKey).toBe('elf')
    const party = listCharactersByCampaign(db, campaign.id).filter((row) => row.kind === 'ai_party_member')
    expect(party).toHaveLength(1)
    expect(party[0]?.name).toBe('Lyra')
  })
})
