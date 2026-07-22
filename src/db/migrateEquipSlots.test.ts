import { describe, expect, it } from 'vitest'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { listCharacterItems } from './repositories/characterItems'
import { createLegacyEquipDatabase, seedLegacyEquippedItems } from './migrateEquipSlotsLegacyFixture'
import { migrateEquipSlotValue } from './migrateEquipSlots'
import { inferAccessorySlotFromName } from './migrateEquipSlotsAccessory'
import { ensureLegacyRaceKeyColumns } from './testUtils'

describe('migrateEquipSlotValue', () => {
  it('maps legacy weapon and trinket slots', () => {
    expect(migrateEquipSlotValue('weapon', 'Longsword')).toBe('mainHand')
    expect(migrateEquipSlotValue('armor', 'Chain')).toBe('armor')
    expect(migrateEquipSlotValue('trinket', 'Ring of Warding')).toBe('ring1')
    expect(migrateEquipSlotValue('trinket', 'Boots of Speed')).toBe('feet')
  })

  it('infers accessory slots from item names', () => {
    expect(inferAccessorySlotFromName('Leather Belt')).toBe('belt')
    expect(inferAccessorySlotFromName('Iron Greaves')).toBe('feet')
  })
})

describe('migration v24 round-trip', () => {
  it('migrates legacy equipped items on fixture database', () => {
    const db = createLegacyEquipDatabase()
    ensureLegacyRaceKeyColumns(db)
    const campaign = createCampaign(db, { name: 'Legacy', premisePrompt: 'x', deathMode: 'legendary' })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })

    seedLegacyEquippedItems(db, {
      characterId: character.id,
      swordId: 'legacy-sword',
      ringId: 'legacy-ring',
      swordRowId: 'row-sword',
      ringRowId: 'row-ring'
    })

    const items = listCharacterItems(db, character.id)
    const swordRow = items.find((row) => row.id === 'row-sword')
    const ringRow = items.find((row) => row.id === 'row-ring')
    expect(swordRow?.equippedSlot).toBe('mainHand')
    expect(ringRow?.equippedSlot).toBe('ring1')
    const swordProps = swordRow?.item.mechanicalProperties
    expect(swordProps && 'handedness' in swordProps ? swordProps.handedness : undefined).toBe('oneHand')
  })
})
