import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { migrateLegacyCharacterInventory } from './migrateLegacyInventory'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { listCharacterItems } from './repositories/characterItems'

describe('migrateLegacyCharacterInventory', () => {
  it('moves string inventory rows into character_items without data loss', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Legacy',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Legacy Hero',
      characterClass: 'rogue',
      kind: 'player'
    })
    db.prepare('UPDATE characters SET inventory = ? WHERE id = ?').run(
      JSON.stringify(['shortbow', 'leather armor']),
      character.id
    )

    migrateLegacyCharacterInventory(db)

    const owned = listCharacterItems(db, character.id)
    expect(owned).toHaveLength(2)
    expect(owned.map((row) => row.item.name).sort()).toEqual(['leather armor', 'shortbow'])
    const row = db.prepare('SELECT inventory FROM characters WHERE id = ?').get(character.id) as {
      inventory: string
    }
    expect(JSON.parse(row.inventory)).toEqual([])
  })
})
