import type { Archetype } from '../../engine/hp'
import type { WeaponHandedness } from '../items/types'

export const STARTING_OFF_HAND_EMPTY = '__empty__' as const
export type StartingOffHandChoice = typeof STARTING_OFF_HAND_EMPTY | string

export interface StartingLoadoutOffHandOption {
  id: StartingOffHandChoice
  label: string
}

export interface StartingLoadoutItemOption {
  name: string
  description: string
  handedness?: WeaponHandedness
}

export interface StartingLoadoutSpellOption {
  key: string
  name: string
  effectType: string
  range: string
  cost: number
  tags: string[]
}

export interface StartingLoadoutOffer {
  archetype: Archetype
  weapons: StartingLoadoutItemOption[]
  armors: StartingLoadoutItemOption[]
  offHand: StartingLoadoutOffHandOption[]
  spells: StartingLoadoutSpellOption[]
  spellPickCount: number
}

export interface StartingLoadoutSelections {
  weaponName: string
  armorName: string
  offHandChoice: StartingOffHandChoice
  spellKeys: string[]
}

/** Equipped starting gear already on the character (e.g. after companions → equipment back). */
export interface AppliedStartingLoadoutSnapshot {
  weaponName: string | null
  armorName: string | null
  offHandItemName: string | null
  spellKeys: string[]
}

export type ApplyStartingLoadoutResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not_found'
        | 'invalid_phase'
        | 'validation_failed'
        | 'equip_failed'
        | 'item_not_found'
    }
