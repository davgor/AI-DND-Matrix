import type { ArmorTier } from '../../engine/armorClass'
import type { DamageRoll, DamageType } from '../../engine/damage'

export const ITEM_TYPES = ['weapon', 'armor', 'potion', 'magicItem', 'misc'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const EQUIP_SLOTS = ['weapon', 'armor', 'trinket'] as const
export type EquipSlot = (typeof EQUIP_SLOTS)[number]

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const
export type ItemRarity = (typeof ITEM_RARITIES)[number]

export type ItemSource = 'seed' | 'ai_proposed' | 'migrated'

export interface WeaponProperties {
  kind: 'weapon'
  damageRoll: DamageRoll
  damageType: DamageType
}

export interface ArmorProperties {
  kind: 'armor'
  armorTier: ArmorTier
}

export interface PotionProperties {
  kind: 'potion'
  healAmount: number
}

export interface MagicItemProperties {
  kind: 'magicItem'
  acBonus: number
  attackBonus: number
}

export interface MiscProperties {
  kind: 'misc'
}

export type MechanicalProperties =
  | WeaponProperties
  | ArmorProperties
  | PotionProperties
  | MagicItemProperties
  | MiscProperties

export interface CatalogItem {
  id: string
  name: string
  itemType: ItemType
  description: string
  rarity: ItemRarity
  mechanicalProperties: MechanicalProperties
  equipSlot: EquipSlot | null
  source: ItemSource
}

export interface CharacterItemRow {
  id: string
  characterId: string
  itemId: string
  quantity: number
  equippedSlot: EquipSlot | null
}

export interface CharacterItemView extends CharacterItemRow {
  item: CatalogItem
}
