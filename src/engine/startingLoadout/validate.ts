import type { Archetype } from '../hp'
import { isTwoHandWeapon } from '../equipment'
import type { CatalogItem } from '../../shared/items/types'
import {
  getStartingLoadoutPackage,
  STARTING_OFF_HAND_EMPTY,
  type StartingLoadoutPackage
} from './packages'

export type LoadoutValidationReason =
  | 'unknown_archetype'
  | 'invalid_weapon'
  | 'invalid_armor'
  | 'invalid_off_hand'
  | 'off_hand_not_applicable'
  | 'two_hand_blocks_off_hand'
  | 'invalid_spell_count'
  | 'invalid_spell_key'
  | 'spell_archetype_mismatch'
  | 'spell_level_too_high'

export interface LoadoutSpellConstraint {
  key: string
  requiresArchetype?: Archetype[]
  minLevel?: number
}

export interface StartingLoadoutInput {
  weaponName: string
  armorName: string
  offHandChoice: string
  spellKeys: string[]
}

export interface ValidatedStartingLoadout {
  weaponName: string
  armorName: string
  offHandItemName: string | null
  spellKeys: string[]
}

export type ValidateLoadoutResult =
  | { ok: true; plan: ValidatedStartingLoadout }
  | { ok: false; reason: LoadoutValidationReason }

function uniqueSpellKeys(keys: string[]): string[] {
  return [...new Set(keys)]
}

function validateSpells(
  pkg: StartingLoadoutPackage,
  spellKeys: string[],
  spellMeta: LoadoutSpellConstraint[]
): ValidateLoadoutResult | null {
  const unique = uniqueSpellKeys(spellKeys)
  if (unique.length !== pkg.spellPickCount) {
    return { ok: false, reason: 'invalid_spell_count' }
  }
  for (const key of unique) {
    if (!pkg.spellKeys.includes(key)) {
      return { ok: false, reason: 'invalid_spell_key' }
    }
    const meta = spellMeta.find((entry) => entry.key === key)
    if (!meta) {
      return { ok: false, reason: 'invalid_spell_key' }
    }
    if (meta.requiresArchetype && !meta.requiresArchetype.includes(pkg.archetype)) {
      return { ok: false, reason: 'spell_archetype_mismatch' }
    }
    if ((meta.minLevel ?? 1) > 1) {
      return { ok: false, reason: 'spell_level_too_high' }
    }
  }
  return null
}

function resolveOffHandItemName(
  pkg: StartingLoadoutPackage,
  offHandChoice: string
): ValidateLoadoutResult | string | null {
  if (pkg.offHand.length === 0) {
    if (offHandChoice !== STARTING_OFF_HAND_EMPTY) {
      return { ok: false, reason: 'off_hand_not_applicable' }
    }
    return null
  }
  if (!pkg.offHand.includes(offHandChoice)) {
    return { ok: false, reason: 'invalid_off_hand' }
  }
  if (offHandChoice === STARTING_OFF_HAND_EMPTY) {
    return null
  }
  return offHandChoice
}

function offHandBlockedByTwoHand(
  weaponItem: CatalogItem,
  offHandItemName: string | null
): boolean {
  if (!offHandItemName) {
    return false
  }
  return isTwoHandWeapon(weaponItem)
}

export function validateStartingLoadout(
  archetype: Archetype,
  input: StartingLoadoutInput,
  weaponItem: CatalogItem,
  spellMeta: LoadoutSpellConstraint[]
): ValidateLoadoutResult {
  const pkg = getStartingLoadoutPackage(archetype)
  if (pkg.archetype !== archetype) {
    return { ok: false, reason: 'unknown_archetype' }
  }
  if (!pkg.weapons.includes(input.weaponName)) {
    return { ok: false, reason: 'invalid_weapon' }
  }
  if (!pkg.armors.includes(input.armorName)) {
    return { ok: false, reason: 'invalid_armor' }
  }

  const offHandResolved = resolveOffHandItemName(pkg, input.offHandChoice)
  if (offHandResolved !== null && typeof offHandResolved !== 'string') {
    return offHandResolved
  }
  const offHandItemName = typeof offHandResolved === 'string' ? offHandResolved : null

  if (offHandBlockedByTwoHand(weaponItem, offHandItemName)) {
    return { ok: false, reason: 'two_hand_blocks_off_hand' }
  }

  const spellError = validateSpells(pkg, input.spellKeys, spellMeta)
  if (spellError) {
    return spellError
  }

  return {
    ok: true,
    plan: {
      weaponName: input.weaponName,
      armorName: input.armorName,
      offHandItemName,
      spellKeys: uniqueSpellKeys(input.spellKeys)
    }
  }
}

export function isOffHandDisabledForWeapon(weaponItem: CatalogItem | undefined): boolean {
  return weaponItem !== undefined && isTwoHandWeapon(weaponItem)
}
