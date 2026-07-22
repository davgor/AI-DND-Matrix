import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from './turnIpc'
import { createTestDb } from '../db/testUtils'
import { runMigrations } from '../db/migrations'
import { migrations } from '../db/schema'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { findCatalogItemByName, getCatalogItemById } from '../db/repositories/items'
import { addItemToCharacter, equipCharacterItem, getEquippedWeaponDamageProfile, listCharacterItems } from '../db/repositories/characterItems'
import { seedStarterItemCatalog } from '../db/seedStarterItems'

describe('turnIpc modification + enchanted attack', () => {
  it('persists enchant via modifyItem intent then attack uses both components', async () => {
    const db = createTestDb()
    runMigrations(db, migrations)
    const campaign = createCampaign(db, { name: 'Turn', premisePrompt: 'x', deathMode: 'standard' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Town', description: 'Quiet.' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      kind: 'player',
      characterClass: 'Fighter',
      level: 1,
      stats: { currentRegionId: region.id, abilityScores: { body: 16, agility: 14, mind: 10, presence: 10 } }
    })
    seedStarterItemCatalog(db)
    const longsword = findCatalogItemByName(db, 'Longsword')!
    const catalogBefore = getCatalogItemById(db, longsword.id)!.mechanicalProperties
    const row = addItemToCharacter(db, player.id, longsword.id)
    equipCharacterItem(db, player.id, row.id, 'mainHand')

    const provider = createScriptedProvider([
      '{"intent":{"checkNeeded":false,"actionType":"modifyItem"}}',
      JSON.stringify({
        narrationText: 'Embers wreath the blade.',
        modification: {
          targetCharacterItemId: row.id,
          kind: 'addDamageComponent',
          damageType: 'fire',
          diceCount: 1,
          diceSize: 6
        }
      })
    ])

    const enchantTurn = await resolvePlayerTurn(db,  provider,  {
      campaignId: campaign.id,
      characterId: player.id,
      playerInput: 'I enchant my longsword with fire'
    }, { rng: Math.random })
    expect(enchantTurn.itemModification?.summary).toContain('fire')
    expect(getEquippedWeaponDamageProfile(db, player.id).components).toHaveLength(2)
    expect(getCatalogItemById(db, longsword.id)!.mechanicalProperties).toEqual(catalogBefore)

    const enriched = listCharacterItems(db, player.id).find((item) => item.id === row.id)
    expect(enriched?.weaponProfile?.components).toHaveLength(2)

    db.close()
  })
})
