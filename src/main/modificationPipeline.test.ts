import { describe, expect, it } from 'vitest'
import { findCatalogItemByName, getCatalogItemById } from '../db/repositories/items'
import { equipCharacterItem } from '../db/repositories/characterItems'
import { listModifications } from '../db/repositories/characterItemModifications'
import { catalogItemMechanicalEquals, persistValidatedModification } from './modificationPipeline'
import { seedPipelineCampaign } from './modificationPipelineFixtures'

describe('modification persist success', () => {
  it('persists modification and leaves catalog unchanged', () => {
    const { db, campaign, character, row } = seedPipelineCampaign()
    const longsword = findCatalogItemByName(db, 'Longsword')!
    const catalogSnapshot = getCatalogItemById(db, longsword.id)!.mechanicalProperties
    equipCharacterItem(db, character.id, row.id, 'mainHand')
    const result = persistValidatedModification({
      db,
      campaignId: campaign.id,
      characterId: character.id,
      narrationText: 'Fire dances on the blade.',
      proposal: {
        targetCharacterItemId: row.id,
        kind: 'addDamageComponent',
        damageType: 'fire',
        diceCount: 1,
        diceSize: 6
      }
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(listModifications(db, row.id)).toHaveLength(1)
      expect(catalogItemMechanicalEquals(db, longsword.id, catalogSnapshot)).toBe(true)
    }
    db.close()
  })
})

describe('modification persist rejection', () => {
  it('rejects invalid proposals without writing rows', () => {
    const { db, campaign, character, row } = seedPipelineCampaign()
    const result = persistValidatedModification({
      db,
      campaignId: campaign.id,
      characterId: character.id,
      narrationText: 'Too much power.',
      proposal: {
        targetCharacterItemId: row.id,
        kind: 'addDamageComponent',
        damageType: 'fire',
        diceCount: 3,
        diceSize: 12
      }
    })
    expect(result).toEqual({ ok: false, reason: 'Dice count out of range' })
    expect(listModifications(db, row.id)).toHaveLength(0)
    db.close()
  })
})
