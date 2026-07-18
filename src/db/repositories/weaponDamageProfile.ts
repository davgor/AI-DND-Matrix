import type Database from 'better-sqlite3'
import type { DamageRoll } from '../../engine/damage'
import { UNARMED_DAMAGE_ROLL } from '../../engine/itemTemplate'
import { mergeWeaponComponents } from '../../engine/modificationValidation'
import type { CharacterItemView, EquipSlot, WeaponProperties } from '../../shared/items/types'
import type { DamageComponent, ItemModification, WeaponDamageProfile } from '../../shared/weaponModifications/types'
import { listModifications } from './characterItemModifications'
import { getCatalogItemById } from './items'

interface CharacterItemRow {
  id: string
  character_id: string
  item_id: string
  quantity: number
  equipped_slot: EquipSlot | null
}

function rowToView(db: Database.Database, row: CharacterItemRow): CharacterItemView | undefined {
  const item = getCatalogItemById(db, row.item_id)
  if (!item) {
    return undefined
  }
  return {
    id: row.id,
    characterId: row.character_id,
    itemId: row.item_id,
    quantity: row.quantity,
    equippedSlot: row.equipped_slot,
    item
  }
}

function listCharacterItemRows(db: Database.Database, characterId: string): CharacterItemView[] {
  const rows = db
    .prepare('SELECT * FROM character_items WHERE character_id = ? ORDER BY rowid')
    .all(characterId) as CharacterItemRow[]
  return rows
    .map((row) => rowToView(db, row))
    .filter((row): row is CharacterItemView => row !== undefined)
}

export function weaponPropertiesToComponents(props: WeaponProperties): DamageComponent[] {
  return [{ damageRoll: props.damageRoll, damageType: props.damageType }]
}

function applyFlavorOverlays(
  profile: WeaponDamageProfile,
  mods: ItemModification[]
): WeaponDamageProfile {
  let displayName = profile.displayName
  let description = profile.description
  for (const mod of mods) {
    if (mod.kind === 'setDisplayName' && 'displayName' in mod.payload) {
      displayName = mod.payload.displayName
    }
    if (mod.kind === 'setDescription' && 'description' in mod.payload) {
      description = mod.payload.description
    }
  }
  return { ...profile, displayName, description }
}

export function buildWeaponDamageProfile(
  db: Database.Database,
  row: CharacterItemView
): WeaponDamageProfile | undefined {
  if (row.item.mechanicalProperties.kind !== 'weapon') {
    return undefined
  }
  const mods = listModifications(db, row.id)
  const base = weaponPropertiesToComponents(row.item.mechanicalProperties)
  const profile: WeaponDamageProfile = {
    characterItemId: row.id,
    catalogName: row.item.name,
    description: row.item.description,
    components: mergeWeaponComponents(base, mods)
  }
  return applyFlavorOverlays(profile, mods)
}

export function getEquippedWeaponDamageProfile(
  db: Database.Database,
  characterId: string
): WeaponDamageProfile {
  const equipped = listCharacterItemRows(db, characterId).find((row) => row.equippedSlot === 'mainHand')
  if (!equipped || equipped.item.mechanicalProperties.kind !== 'weapon') {
    return unarmedProfile()
  }
  return buildWeaponDamageProfile(db, equipped) ?? unarmedProfile()
}

export function getEquippedWeaponDamageRoll(
  db: Database.Database,
  characterId: string
): DamageRoll {
  const profile = getEquippedWeaponDamageProfile(db, characterId)
  const [first] = profile.components
  return first?.damageRoll ?? UNARMED_DAMAGE_ROLL
}

function unarmedProfile(): WeaponDamageProfile {
  return {
    characterItemId: null,
    catalogName: 'Unarmed',
    components: [{ damageRoll: UNARMED_DAMAGE_ROLL, damageType: 'physical' }]
  }
}

export function enrichCharacterItemViews(
  db: Database.Database,
  rows: CharacterItemView[]
): CharacterItemView[] {
  return rows.map((row) => {
    if (row.item.mechanicalProperties.kind !== 'weapon') {
      return row
    }
    const weaponProfile = buildWeaponDamageProfile(db, row)
    return weaponProfile ? { ...row, weaponProfile } : row
  })
}

export function findOwnedCharacterItem(
  db: Database.Database,
  characterId: string,
  characterItemId: string
): CharacterItemView | undefined {
  return listCharacterItemRows(db, characterId).find((row) => row.id === characterItemId)
}

export function summarizeWeaponProfile(profile: WeaponDamageProfile): string {
  const name = profile.displayName ?? profile.catalogName
  const parts = profile.components.map(
    (component) => `${component.damageRoll.diceCount}d${component.damageRoll.diceSize} ${component.damageType}`
  )
  return `${name}: ${parts.join(' + ')}`
}
