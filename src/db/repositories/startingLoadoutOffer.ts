import type Database from 'better-sqlite3'
import type { Archetype } from '../../engine/hp'
import type { StartingLoadoutOffer } from '../../shared/startingLoadout/types'
import {
  getStartingLoadoutPackage,
  STARTING_OFF_HAND_EMPTY,
  type StartingLoadoutPackage
} from '../../engine/startingLoadout/packages'
import { getSpellByKey } from '../catalog/spells'
import { findCatalogItemByName } from './items'

function itemOption(db: Database.Database, name: string) {
  const item = findCatalogItemByName(db, name)
  if (!item) {
    return undefined
  }
  const handedness =
    item.mechanicalProperties.kind === 'weapon' ? item.mechanicalProperties.handedness : undefined
  return { name: item.name, description: item.description, handedness }
}

function offHandLabel(id: string): string {
  return id === STARTING_OFF_HAND_EMPTY ? 'Empty' : id
}

function listMissingNames(db: Database.Database, names: readonly string[]): string[] {
  return names.filter((name) => !findCatalogItemByName(db, name))
}

function listMissingSpellKeys(db: Database.Database, keys: readonly string[]): string[] {
  return keys.filter((key) => !getSpellByKey(db, key))
}

export interface BuildStartingLoadoutOfferResult {
  offer?: StartingLoadoutOffer
  missingItems: string[]
  missingSpells: string[]
}

export function buildStartingLoadoutOfferWithDiagnostics(
  db: Database.Database,
  archetype: Archetype
): BuildStartingLoadoutOfferResult {
  const pkg = getStartingLoadoutPackage(archetype)
  const missingItems = [
    ...listMissingNames(db, pkg.weapons),
    ...listMissingNames(db, pkg.armors),
    ...listMissingOffHandItems(db, pkg)
  ]
  const missingSpells = listMissingSpellKeys(db, pkg.spellKeys)

  if (missingItems.length > 0 || missingSpells.length > 0) {
    return { missingItems, missingSpells }
  }

  return { offer: buildOfferFromPackage(db, archetype, pkg), missingItems: [], missingSpells: [] }
}

function listMissingOffHandItems(db: Database.Database, pkg: StartingLoadoutPackage): string[] {
  return pkg.offHand.filter((id) => id !== STARTING_OFF_HAND_EMPTY && !findCatalogItemByName(db, id))
}

function buildOfferFromPackage(
  db: Database.Database,
  archetype: Archetype,
  pkg: StartingLoadoutPackage
): StartingLoadoutOffer {
  const weapons = pkg.weapons.map((name) => itemOption(db, name)!)
  const armors = pkg.armors.map((name) => itemOption(db, name)!)
  const spells = pkg.spellKeys.map((key) => {
    const spell = getSpellByKey(db, key)!
    return {
      key: spell.key,
      name: spell.name,
      effectType: spell.effectType,
      range: spell.range,
      cost: spell.cost,
      tags: spell.tags
    }
  })

  return {
    archetype,
    weapons,
    armors,
    offHand: pkg.offHand.map((id) => ({ id, label: offHandLabel(id) })),
    spells,
    spellPickCount: pkg.spellPickCount
  }
}

export function buildStartingLoadoutOffer(
  db: Database.Database,
  archetype: Archetype
): StartingLoadoutOffer | undefined {
  const result = buildStartingLoadoutOfferWithDiagnostics(db, archetype)
  return result.offer
}
