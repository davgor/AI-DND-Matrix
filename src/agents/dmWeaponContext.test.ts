import { describe, expect, it } from 'vitest'
import { assembleNarrationContext } from './dm'
import { createTestDb } from '../db/testUtils'
import { runMigrations } from '../db/migrations'
import { migrations } from '../db/schema'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { findCatalogItemByName } from '../db/repositories/items'
import { addItemToCharacter, equipCharacterItem } from '../db/repositories/characterItems'
import { seedStarterItemCatalog } from '../db/seedStarterItems'
import { listEventsByCampaign } from '../db/repositories/events'
import { persistValidatedModification } from '../main/modificationPipeline'

describe('assembleNarrationContext equipped weapon modifications', () => {
  it('includes equipped weapon modification summary after enchant', () => {
    const db = createTestDb()
    runMigrations(db, migrations)
    const campaign = createCampaign(db, { name: 'Enchant', premisePrompt: 'x', deathMode: 'standard' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Town', description: 'Quiet.' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      kind: 'player',
      characterClass: 'Fighter',
      level: 1,
      stats: { currentRegionId: region.id }
    })
    seedStarterItemCatalog(db)
    const row = addItemToCharacter(db, player.id, findCatalogItemByName(db, 'Longsword')!.id)
    equipCharacterItem(db, player.id, row.id, 'weapon')
    persistValidatedModification({
      db,
      campaignId: campaign.id,
      characterId: player.id,
      narrationText: 'Fire!',
      proposal: {
        targetCharacterItemId: row.id,
        kind: 'addDamageComponent',
        damageType: 'fire',
        diceCount: 1,
        diceSize: 6
      }
    })

    const context = assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id,
      playerInput: 'I attack'
    })
    expect(context.equippedWeaponSummary).toContain('fire')
    const events = listEventsByCampaign(db, campaign.id)
    expect(events.some((event) => event.type === 'item_modified')).toBe(true)
    db.close()
  })
})
