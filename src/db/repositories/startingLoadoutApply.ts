import type Database from 'better-sqlite3'
import type { Character } from './characters'
import type { ValidatedStartingLoadout } from '../../engine/startingLoadout/validate'
import { addItemToCharacter, equipCharacterItem } from './characterItems'
import { computeCharacterTotalAc } from './itemCommerce'
import { findCatalogItemByName } from './items'
import { updateCharacter } from './characters'
import { setGuidedCreationPhase } from './guidedCreation'

type EquipRow = { name: string; slot: 'mainHand' | 'armor' | 'offHand' }

function equipRowsFromPlan(plan: ValidatedStartingLoadout): EquipRow[] {
  const rows: EquipRow[] = [
    { name: plan.weaponName, slot: 'mainHand' },
    { name: plan.armorName, slot: 'armor' }
  ]
  if (plan.offHandItemName) {
    rows.push({ name: plan.offHandItemName, slot: 'offHand' })
  }
  return rows
}

function grantAndEquipRow(
  db: Database.Database,
  characterId: string,
  entry: EquipRow
): void {
  const catalog = findCatalogItemByName(db, entry.name)
  if (!catalog) {
    throw new Error('item_not_found')
  }
  const owned = addItemToCharacter(db, characterId, catalog.id)
  const equip = equipCharacterItem(db, characterId, owned.id, entry.slot)
  if (!equip.ok) {
    throw new Error('equip_failed')
  }
}

export function commitStartingLoadout(
  db: Database.Database,
  character: Character,
  plan: ValidatedStartingLoadout
): void {
  const characterId = character.id
  const agility = (character.stats.abilityScores as { agility?: number } | undefined)?.agility ?? 10
  const ac = computeCharacterTotalAc(db, characterId, agility)
  updateCharacter(db, characterId, {
    stats: { ...character.stats, ac, knownSpellKeys: plan.spellKeys }
  })
  setGuidedCreationPhase(db, characterId, 'companions')
}

export function applyValidatedLoadoutInTransaction(
  db: Database.Database,
  character: Character,
  plan: ValidatedStartingLoadout
): void {
  const transaction = db.transaction(() => {
    for (const entry of equipRowsFromPlan(plan)) {
      grantAndEquipRow(db, character.id, entry)
    }
    commitStartingLoadout(db, character, plan)
  })
  transaction()
}

export function mapLoadoutTransactionError(error: unknown): 'equip_failed' | 'item_not_found' | null {
  if (!(error instanceof Error)) {
    return null
  }
  if (error.message === 'equip_failed' || error.message === 'item_not_found') {
    return error.message
  }
  return null
}
