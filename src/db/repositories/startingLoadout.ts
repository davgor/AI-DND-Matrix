import type Database from 'better-sqlite3'
import { inferArchetypeFromClassOrRole } from '../../engine/archetypeInference'
import { isTwoHandWeapon } from '../../engine/equipment'
import { getStartingLoadoutPackage } from '../../engine/startingLoadout/packages'
import {
  validateStartingLoadout,
  type LoadoutSpellConstraint,
  type StartingLoadoutInput
} from '../../engine/startingLoadout/validate'
import type { ApplyStartingLoadoutResult } from '../../shared/startingLoadout/types'
import { getSpellByKey } from '../catalog/spells'
import { listCharacterItems } from './characterItems'
import { findCatalogItemByName } from './items'
import { getCharacterById } from './characters'
import { readGuidedCreationFields } from './guidedCreation'
import {
  applyValidatedLoadoutInTransaction,
  mapLoadoutTransactionError
} from './startingLoadoutApply'
import {
  buildStartingLoadoutOffer,
  buildStartingLoadoutOfferWithDiagnostics
} from './startingLoadoutOffer'

export { buildStartingLoadoutOffer, buildStartingLoadoutOfferWithDiagnostics }

function spellConstraintsFromDb(db: Database.Database, pkg: ReturnType<typeof getStartingLoadoutPackage>): LoadoutSpellConstraint[] {
  return pkg.spellKeys.map((key) => {
    const spell = getSpellByKey(db, key)
    return {
      key,
      requiresArchetype: spell?.constraints.requiresArchetype,
      minLevel: spell?.constraints.minLevel
    }
  })
}

export function applyStartingLoadout(
  db: Database.Database,
  characterId: string,
  selections: StartingLoadoutInput
): ApplyStartingLoadoutResult {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return { ok: false, reason: 'not_found' }
  }
  const fields = readGuidedCreationFields(db, characterId)
  if (!fields || fields.guidedCreationPhase !== 'equipment') {
    return { ok: false, reason: 'invalid_phase' }
  }

  const archetype = inferArchetypeFromClassOrRole(character.characterClass)
  const weaponCatalog = findCatalogItemByName(db, selections.weaponName)
  if (!weaponCatalog) {
    return { ok: false, reason: 'item_not_found' }
  }

  const validation = validateStartingLoadout(
    archetype,
    selections,
    weaponCatalog,
    spellConstraintsFromDb(db, getStartingLoadoutPackage(archetype))
  )
  if (!validation.ok) {
    return { ok: false, reason: 'validation_failed' }
  }

  try {
    applyValidatedLoadoutInTransaction(db, character, validation.plan)
    return { ok: true }
  } catch (error) {
    const reason = mapLoadoutTransactionError(error)
    if (reason) {
      return { ok: false, reason }
    }
    throw error
  }
}

export function isWeaponTwoHandedByName(db: Database.Database, weaponName: string): boolean {
  const item = findCatalogItemByName(db, weaponName)
  return item !== undefined && isTwoHandWeapon(item)
}

export function listEquippedAfterLoadout(db: Database.Database, characterId: string) {
  return listCharacterItems(db, characterId).filter((row) => row.equippedSlot !== null)
}
