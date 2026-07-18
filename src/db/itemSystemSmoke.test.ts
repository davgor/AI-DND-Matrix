import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { computeAC } from '../engine/armorClass'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from './fileDbTestUtils'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'
import {
  addItemToCharacter,
  equipCharacterItem,
  getEquippedArmorTier,
  getEquippedWeaponDamageRoll,
  listCharacterItems
} from './repositories/characterItems'
import { consumePotion, grantItemToCharacter, purchaseItemForCharacter } from './repositories/itemFlows'
import { persistItemGrants } from './repositories/itemGrants'
import { findCatalogItemByName } from './repositories/items'
import { runMigrations } from './migrations'
import { migrations } from './schema'

function seedPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Loot Run',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Scout',
    characterClass: 'rogue',
    kind: 'player',
    hp: 8,
    currency: 50,
    stats: { abilityScores: { body: 10, agility: 14, mind: 12, presence: 10 } }
  })
  return character
}

describe('item system end-to-end smoke', () => {
  it('grants AI loot, equips gear, consumes potion, and purchases', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    const agility = 14

    persistItemGrants(db, character.id, [
      {
        proposeNew: {
          name: 'Glimmering Shortbow',
          description: 'A bow that hums with faint magic.',
          itemType: 'weapon',
          rarityTier: 'uncommon'
        }
      }
    ])
    const bow = findCatalogItemByName(db, 'Glimmering Shortbow')!
    const bowRow = listCharacterItems(db, character.id).find((row) => row.itemId === bow.id)!
    equipCharacterItem(db, character.id, bowRow.id, 'mainHand')
    expect(getEquippedWeaponDamageRoll(db, character.id)).not.toBeNull()

    const chain = findCatalogItemByName(db, 'Chain Hauberk')!
    equipCharacterItem(db, character.id, addItemToCharacter(db, character.id, chain.id).id, 'armor')
    expect(computeAC(agility, getEquippedArmorTier(db, character.id))).toBe(computeAC(agility, 'medium'))

    const potion = findCatalogItemByName(db, 'Minor Healing Draught')!
    grantItemToCharacter(db, character.id, potion.id)
    expect(consumePotion(db, character.id, potion.id)).toEqual({ ok: true, hpAfter: 15 })

    expect(purchaseItemForCharacter(db, character.id, findCatalogItemByName(db, 'Dagger')!.id, 999)).toEqual({
      ok: false,
      reason: 'insufficient_funds'
    })
    expect(purchaseItemForCharacter(db, character.id, findCatalogItemByName(db, 'Dagger')!.id, 5).ok).toBe(true)
    expect(getCharacterById(db, character.id)?.currency).toBe(45)
  })

  it('switches equipped weapons and changes the damage roll', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const longsword = findCatalogItemByName(db, 'Longsword')!
    const daggerRow = addItemToCharacter(db, character.id, dagger.id)
    const swordRow = addItemToCharacter(db, character.id, longsword.id)
    equipCharacterItem(db, character.id, daggerRow.id, 'mainHand')
    const daggerRoll = getEquippedWeaponDamageRoll(db, character.id)
    equipCharacterItem(db, character.id, swordRow.id, 'mainHand')
    expect(getEquippedWeaponDamageRoll(db, character.id).diceSize).toBeGreaterThan(daggerRoll.diceSize)
  })
})

describe('item system persistence smoke', () => {
  let dir: string | undefined
  let db: Database.Database | undefined

  afterEach(() => {
    closeFileTestDb(db)
    db = undefined
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('preserves equipped state after reopening the database file', () => {
    dir = mkdtempSync(join(tmpdir(), 'item-smoke-'))
    db = openFileTestDb(join(dir, 'save.sqlite'))
    runMigrations(db, migrations)
    const character = seedPlayer(db)
    const bow = findCatalogItemByName(db, 'Hunting Bow')!
    const row = addItemToCharacter(db, character.id, bow.id)
    equipCharacterItem(db, character.id, row.id, 'mainHand')
    const equippedId = listCharacterItems(db, character.id).find((r) => r.equippedSlot === 'mainHand')?.id

    db = reopenFileTestDb(db)
    expect(
      listCharacterItems(db, character.id).find((row) => row.id === equippedId)?.equippedSlot
    ).toBe('mainHand')
  })
})
