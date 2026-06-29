import type { ArmorTier } from './armorClass'
import type { DamageRoll } from './damage'
import type { ItemRarity, ItemType, MechanicalProperties } from '../shared/items/types'
import { ITEM_RARITIES } from '../shared/items/types'

const RARITY_INDEX: Record<ItemRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3
}

export const UNARMED_DAMAGE_ROLL: DamageRoll = { diceCount: 1, diceSize: 4, modifier: 0 }

export function clampItemRarity(value: string): ItemRarity {
  const normalized = value.toLowerCase()
  if ((ITEM_RARITIES as readonly string[]).includes(normalized)) {
    return normalized as ItemRarity
  }
  if (normalized === 'legendary' || normalized === 'mythic') {
    return 'epic'
  }
  return 'common'
}

function rarityScale(rarity: ItemRarity): number {
  return RARITY_INDEX[rarity] + 1
}

function weaponDamageForRarity(rarity: ItemRarity): DamageRoll {
  const tier = rarityScale(rarity)
  return { diceCount: 1, diceSize: Math.min(4 + tier * 2, 12), modifier: tier - 1 }
}

function armorTierForRarity(rarity: ItemRarity): ArmorTier {
  if (rarity === 'common') {
    return 'light'
  }
  if (rarity === 'uncommon') {
    return 'medium'
  }
  return 'heavy'
}

function potionHealForRarity(rarity: ItemRarity): number {
  return 4 + rarityScale(rarity) * 3
}

function magicBonusesForRarity(rarity: ItemRarity): { acBonus: number; attackBonus: number } {
  const tier = rarityScale(rarity)
  return { acBonus: tier >= 2 ? 1 : 0, attackBonus: tier >= 3 ? 1 : 0 }
}

export function deriveMechanicalProperties(itemType: ItemType, rarity: ItemRarity): MechanicalProperties {
  switch (itemType) {
    case 'weapon':
      return { kind: 'weapon', damageRoll: weaponDamageForRarity(rarity), damageType: 'physical' }
    case 'armor':
      return { kind: 'armor', armorTier: armorTierForRarity(rarity) }
    case 'potion':
      return { kind: 'potion', healAmount: potionHealForRarity(rarity) }
    case 'magicItem':
      return { kind: 'magicItem', ...magicBonusesForRarity(rarity) }
    default:
      return { kind: 'misc' }
  }
}
