import type { ArmorTier } from '../../engine/armorClass'
import type { DamageRoll, DamageType } from '../../engine/damage'
import type { WeaponDamageProfile } from '../weaponModifications/types'

export const ITEM_TYPES = ['weapon', 'armor', 'potion', 'magicItem', 'misc'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const BODY_EQUIP_SLOTS = ['armor', 'mainHand', 'offHand'] as const
export type BodyEquipSlot = (typeof BODY_EQUIP_SLOTS)[number]

export const ACCESSORY_EQUIP_SLOTS = ['head', 'hands', 'feet', 'belt', 'neck', 'ring1', 'ring2'] as const
export type AccessoryEquipSlot = (typeof ACCESSORY_EQUIP_SLOTS)[number]

export const EQUIP_SLOTS = [...BODY_EQUIP_SLOTS, ...ACCESSORY_EQUIP_SLOTS] as const
export type EquipSlot = (typeof EQUIP_SLOTS)[number]

export const WEAPON_HANDEDNESS = ['oneHand', 'twoHand'] as const
export type WeaponHandedness = (typeof WEAPON_HANDEDNESS)[number]

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const
export type ItemRarity = (typeof ITEM_RARITIES)[number]

export type ItemSource = 'seed' | 'ai_proposed' | 'migrated'

export interface WeaponProperties {
  kind: 'weapon'
  damageRoll: DamageRoll
  damageType: DamageType
  handedness: WeaponHandedness
}

export interface ArmorProperties {
  kind: 'armor'
  armorTier: ArmorTier
}

export interface ShieldProperties {
  kind: 'shield'
  acBonus: number
}

export interface PotionProperties {
  kind: 'potion'
  healAmount: number
}

export interface MagicItemProperties {
  kind: 'magicItem'
  acBonus: number
  attackBonus: number
  accessorySlot?: AccessoryEquipSlot
}

export interface MiscProperties {
  kind: 'misc'
}

export type MechanicalProperties =
  | WeaponProperties
  | ArmorProperties
  | ShieldProperties
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
  weaponProfile?: WeaponDamageProfile
}

export function isAccessorySlot(slot: EquipSlot): slot is AccessoryEquipSlot {
  return (ACCESSORY_EQUIP_SLOTS as readonly string[]).includes(slot)
}
