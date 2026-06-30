import type { DamageType } from './damage'
import type {
  DamageComponent,
  ItemModification,
  ItemModificationProposal,
  WeaponDamageProfile
} from '../shared/weaponModifications/types'

export const ENCHANT_MAX_COMPONENTS = 2
export const ENCHANT_MAX_DICE_COUNT = 2
export const ENCHANT_MAX_DICE_SIZE = 8
export const ENCHANT_MIN_DICE_COUNT = 1
export const FLAVOR_TEXT_MAX_LENGTH = 240

const ALLOWED_DAMAGE_TYPES: DamageType[] = ['physical', 'fire', 'cold', 'poison', 'arcane']

export type ValidationRejection = { ok: false; reason: string }
export type ValidatedModification = { ok: true; proposal: ItemModificationProposal }

export function validateModification(
  weaponBaseProfile: WeaponDamageProfile,
  existingMods: ItemModification[],
  proposal: ItemModificationProposal
): ValidatedModification | ValidationRejection {
  if (weaponBaseProfile.characterItemId !== proposal.targetCharacterItemId) {
    return { ok: false, reason: 'Target does not match weapon profile' }
  }
  if (proposal.kind === 'addDamageComponent') {
    return validateAddDamageComponent(weaponBaseProfile, existingMods, proposal)
  }
  if (proposal.kind === 'setDescription') {
    return validateFlavorText(proposal, proposal.description, 'description')
  }
  if (proposal.kind === 'setDisplayName') {
    return validateFlavorText(proposal, proposal.displayName, 'displayName')
  }
  return { ok: false, reason: 'Unknown modification kind' }
}

function validateAddDamageComponent(
  profile: WeaponDamageProfile,
  existingMods: ItemModification[],
  proposal: ItemModificationProposal
): ValidatedModification | ValidationRejection {
  const addCount = existingMods.filter((mod) => mod.kind === 'addDamageComponent').length
  const projectedComponents = profile.components.length + addCount + 1
  if (projectedComponents > ENCHANT_MAX_COMPONENTS) {
    return { ok: false, reason: 'Weapon already has maximum damage components' }
  }
  const damageType = proposal.damageType
  const diceCount = proposal.diceCount
  const diceSize = proposal.diceSize
  if (!damageType || !ALLOWED_DAMAGE_TYPES.includes(damageType)) {
    return { ok: false, reason: 'Invalid damage type' }
  }
  if (diceCount === undefined || diceSize === undefined) {
    return { ok: false, reason: 'Missing dice parameters' }
  }
  if (diceCount < ENCHANT_MIN_DICE_COUNT || diceCount > ENCHANT_MAX_DICE_COUNT) {
    return { ok: false, reason: 'Dice count out of range' }
  }
  if (diceSize < 2 || diceSize > ENCHANT_MAX_DICE_SIZE) {
    return { ok: false, reason: 'Dice size out of range' }
  }
  return { ok: true, proposal }
}

function validateFlavorText(
  proposal: ItemModificationProposal,
  value: string | undefined,
  field: 'description' | 'displayName'
): ValidatedModification | ValidationRejection {
  if (!value || value.trim().length === 0) {
    return { ok: false, reason: `Missing ${field}` }
  }
  if (value.length > FLAVOR_TEXT_MAX_LENGTH) {
    return { ok: false, reason: `${field} too long` }
  }
  return { ok: true, proposal }
}

export function mergeWeaponComponents(
  baseComponents: DamageComponent[],
  existingMods: ItemModification[]
): DamageComponent[] {
  const merged = [...baseComponents]
  for (const mod of existingMods) {
    if (mod.kind !== 'addDamageComponent') {
      continue
    }
    const payload = mod.payload as { damageType: DamageType; diceCount: number; diceSize: number }
    merged.push({
      damageRoll: { diceCount: payload.diceCount, diceSize: payload.diceSize, modifier: 0 },
      damageType: payload.damageType
    })
  }
  return merged
}
