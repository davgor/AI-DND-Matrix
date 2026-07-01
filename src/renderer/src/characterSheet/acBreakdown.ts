import { abilityModifier } from '../../../engine/abilities'
import { ARMOR_BONUS, computeTotalAC, type ArmorTier } from '../../../engine/armorClass'
import type { CharacterItemView } from '../../../shared/items/types'

export interface AcBreakdown {
  base: number
  agilityMod: number
  armorTier: ArmorTier
  armorBonus: number
  shieldBonus: number
  accessoryBonus: number
  total: number
}

function readArmorTier(items: CharacterItemView[]): ArmorTier {
  const armorRow = items.find((row) => row.equippedSlot === 'armor')
  if (armorRow?.item.mechanicalProperties.kind === 'armor') {
    return armorRow.item.mechanicalProperties.armorTier
  }
  return 'none'
}

function readShieldBonus(items: CharacterItemView[]): number {
  const shieldRow = items.find((row) => row.equippedSlot === 'offHand')
  if (shieldRow?.item.mechanicalProperties.kind === 'shield') {
    return shieldRow.item.mechanicalProperties.acBonus
  }
  return 0
}

function readAccessoryBonus(items: CharacterItemView[]): number {
  let accessoryBonus = 0
  for (const row of items) {
    if (!row.equippedSlot || ['armor', 'mainHand', 'offHand'].includes(row.equippedSlot)) {
      continue
    }
    if (row.item.mechanicalProperties.kind === 'magicItem') {
      accessoryBonus += row.item.mechanicalProperties.acBonus
    }
  }
  return accessoryBonus
}

export function buildAcBreakdown(agilityScore: number, items: CharacterItemView[]): AcBreakdown {
  const agilityMod = abilityModifier(agilityScore)
  const armorTier = readArmorTier(items)
  const shieldBonus = readShieldBonus(items)
  const accessoryBonus = readAccessoryBonus(items)
  const armorBonus = ARMOR_BONUS[armorTier]
  const total = computeTotalAC({ agilityScore, armorTier, shieldBonus, accessoryAcBonus: accessoryBonus })
  return { base: 10, agilityMod, armorTier, armorBonus, shieldBonus, accessoryBonus, total }
}

export const SLOT_LABELS = {
  armor: 'Armor',
  mainHand: 'Main hand',
  offHand: 'Off hand',
  head: 'Head',
  hands: 'Hands',
  feet: 'Feet',
  belt: 'Belt',
  neck: 'Neck',
  ring1: 'Ring 1',
  ring2: 'Ring 2'
} as const

export function formatEquipFailure(reason: string): string {
  const messages: Record<string, string> = {
    not_owned: 'You do not own that item.',
    not_equippable: 'That item cannot be equipped.',
    slot_mismatch: 'That item does not fit the selected slot.',
    off_hand_blocked_by_two_hand: 'Both hands are occupied by a two-handed weapon.',
    two_hand_blocks_off_hand: 'A shield blocks equipping a two-handed weapon.',
    shield_blocks_two_hand: 'A two-handed weapon blocks equipping a shield.'
  }
  return messages[reason] ?? `Cannot equip: ${reason}`
}
