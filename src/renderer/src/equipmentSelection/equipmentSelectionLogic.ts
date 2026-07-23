import type {
  AppliedStartingLoadoutSnapshot,
  StartingLoadoutOffer
} from '../../../shared/startingLoadout/types'
import { STARTING_OFF_HAND_EMPTY } from '../../../engine/startingLoadout/packages'

export interface EquipmentSelectionState {
  weaponName: string | null
  armorName: string | null
  offHandChoice: string | null
  spellKeys: string[]
}

export function initialEquipmentSelectionState(offer: StartingLoadoutOffer): EquipmentSelectionState {
  return {
    weaponName: null,
    armorName: null,
    offHandChoice: offer.offHand.length > 0 ? null : STARTING_OFF_HAND_EMPTY,
    spellKeys: []
  }
}

function matchNamedOption(name: string | null, options: ReadonlyArray<{ name: string }>): string | null {
  if (!name || !options.some((entry) => entry.name === name)) {
    return null
  }
  return name
}

function resolveHydratedOffHand(
  offer: StartingLoadoutOffer,
  offHandItemName: string | null
): string {
  if (!offHandOptionsVisible(offer)) {
    return STARTING_OFF_HAND_EMPTY
  }
  if (offHandItemName && offer.offHand.some((entry) => entry.id === offHandItemName)) {
    return offHandItemName
  }
  return STARTING_OFF_HAND_EMPTY
}

export function hydrateEquipmentSelectionState(
  offer: StartingLoadoutOffer,
  applied: AppliedStartingLoadoutSnapshot | null
): EquipmentSelectionState | null {
  if (!applied) {
    return null
  }
  const weaponName = matchNamedOption(applied.weaponName, offer.weapons)
  const armorName = matchNamedOption(applied.armorName, offer.armors)
  const spellKeys = applied.spellKeys
    .filter((key) => offer.spells.some((spell) => spell.key === key))
    .slice(0, offer.spellPickCount)

  if (!weaponName && !armorName && spellKeys.length === 0) {
    return null
  }

  return {
    weaponName,
    armorName,
    offHandChoice: resolveHydratedOffHand(offer, applied.offHandItemName),
    spellKeys
  }
}

export function resolveInitialEquipmentSelectionState(
  offer: StartingLoadoutOffer,
  applied: AppliedStartingLoadoutSnapshot | null,
  draft: EquipmentSelectionState | null
): EquipmentSelectionState {
  const hydrated = hydrateEquipmentSelectionState(offer, applied)
  if (hydrated) {
    return hydrated
  }
  return draft ?? initialEquipmentSelectionState(offer)
}

export function isTwoHandWeaponSelected(
  offer: StartingLoadoutOffer,
  weaponName: string | null
): boolean {
  if (!weaponName) {
    return false
  }
  const weapon = offer.weapons.find((entry) => entry.name === weaponName)
  return weapon?.handedness === 'twoHand'
}

export function offHandOptionsVisible(offer: StartingLoadoutOffer): boolean {
  return offer.offHand.length > 0
}

export function offHandOptionDisabled(
  offer: StartingLoadoutOffer,
  weaponName: string | null,
  optionId: string
): boolean {
  if (optionId === STARTING_OFF_HAND_EMPTY) {
    return false
  }
  return isTwoHandWeaponSelected(offer, weaponName)
}

export function resolveOffHandAfterWeaponChange(
  offer: StartingLoadoutOffer,
  weaponName: string | null,
  currentOffHand: string | null
): string | null {
  if (!offHandOptionsVisible(offer)) {
    return STARTING_OFF_HAND_EMPTY
  }
  if (isTwoHandWeaponSelected(offer, weaponName)) {
    return STARTING_OFF_HAND_EMPTY
  }
  if (currentOffHand && offHandOptionDisabled(offer, weaponName, currentOffHand)) {
    return STARTING_OFF_HAND_EMPTY
  }
  return currentOffHand
}

export function toggleSpellSelection(
  selected: string[],
  key: string,
  pickCount: number
): string[] {
  if (selected.includes(key)) {
    return selected.filter((entry) => entry !== key)
  }
  if (selected.length >= pickCount) {
    return selected
  }
  return [...selected, key]
}

export function canConfirmEquipmentSelection(
  offer: StartingLoadoutOffer,
  state: EquipmentSelectionState
): boolean {
  if (!state.weaponName || !state.armorName) {
    return false
  }
  if (offer.offHand.length > 0 && !state.offHandChoice) {
    return false
  }
  if (state.spellKeys.length !== offer.spellPickCount) {
    return false
  }
  return true
}
