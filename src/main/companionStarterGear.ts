import type Database from 'better-sqlite3'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import { getStartingLoadoutPackage } from '../engine/startingLoadout/packages'
import { addItemToCharacter, equipCharacterItem } from '../db/repositories/characterItems'
import { getCatalogItemById, findCatalogItemByName } from '../db/repositories/items'
import { grantItemToCharacter } from '../db/repositories/itemFlows'

export function resolveCompanionStarterWeaponName(characterClass: string, role: string): string | null {
  const archetype = inferArchetypeFromClassOrRole(role.trim() || characterClass)
  const weapons = getStartingLoadoutPackage(archetype).weapons
  return weapons[0] ?? null
}

function grantPreviewCatalogItems(
  db: Database.Database,
  memberId: string,
  inventoryItemIds: readonly string[]
): void {
  for (const itemId of inventoryItemIds) {
    if (getCatalogItemById(db, itemId)) {
      grantItemToCharacter(db, memberId, itemId)
    }
  }
}

function grantArchetypeStarterWeapon(
  db: Database.Database,
  memberId: string,
  characterClass: string,
  role: string
): void {
  const weaponName = resolveCompanionStarterWeaponName(characterClass, role)
  if (!weaponName) {
    return
  }
  const catalog = findCatalogItemByName(db, weaponName)
  if (!catalog) {
    return
  }
  const owned = addItemToCharacter(db, memberId, catalog.id)
  equipCharacterItem(db, memberId, owned.id, 'mainHand')
}

export interface GrantCompanionInventoryInput {
  memberId: string
  characterClass: string
  role: string
  previewInventoryIds: readonly string[]
}

export function grantCompanionInventoryOnAccept(
  db: Database.Database,
  input: GrantCompanionInventoryInput
): void {
  if (input.previewInventoryIds.length > 0) {
    grantPreviewCatalogItems(db, input.memberId, input.previewInventoryIds)
    return
  }
  grantArchetypeStarterWeapon(db, input.memberId, input.characterClass, input.role)
}
