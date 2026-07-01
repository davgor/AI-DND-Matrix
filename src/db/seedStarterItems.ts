import type Database from 'better-sqlite3'
import { deriveMechanicalProperties } from '../engine/itemTemplate'
import type { EquipSlot, ItemRarity, ItemType } from '../shared/items/types'
import { upsertCatalogItemByName } from './repositories/items'

interface SeedSpec {
  name: string
  itemType: ItemType
  description: string
  rarity: ItemRarity
  equipSlot: EquipSlot | null
  mechanicalProperties?: ReturnType<typeof deriveMechanicalProperties>
}

const STARTER_ITEMS: SeedSpec[] = [
  {
    name: 'Dagger',
    itemType: 'weapon',
    description: 'A small blade for close work.',
    rarity: 'common',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 4, modifier: 0 },
      damageType: 'physical',
      handedness: 'oneHand'
    }
  },
  {
    name: 'Handaxe',
    itemType: 'weapon',
    description: 'A light axe for throwing or melee.',
    rarity: 'common',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 },
      damageType: 'physical',
      handedness: 'oneHand'
    }
  },
  {
    name: 'Shortsword',
    itemType: 'weapon',
    description: 'A balanced one-handed sword.',
    rarity: 'common',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 },
      damageType: 'physical',
      handedness: 'oneHand'
    }
  },
  {
    name: 'Longsword',
    itemType: 'weapon',
    description: 'A reliable steel longsword.',
    rarity: 'uncommon',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
      damageType: 'physical',
      handedness: 'oneHand'
    }
  },
  {
    name: 'Greataxe',
    itemType: 'weapon',
    description: 'A heavy axe that cleaves through armor.',
    rarity: 'rare',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 12, modifier: 0 },
      damageType: 'physical',
      handedness: 'twoHand'
    }
  },
  {
    name: 'Greatsword',
    itemType: 'weapon',
    description: 'A massive two-handed blade.',
    rarity: 'rare',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 2, diceSize: 6, modifier: 0 },
      damageType: 'physical',
      handedness: 'twoHand'
    }
  },
  {
    name: 'Hunting Bow',
    itemType: 'weapon',
    description: 'A strung bow for ranged attacks.',
    rarity: 'common',
    equipSlot: 'mainHand',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
      damageType: 'physical',
      handedness: 'twoHand'
    }
  },
  {
    name: 'Wooden Shield',
    itemType: 'misc',
    description: 'A sturdy wooden shield.',
    rarity: 'common',
    equipSlot: 'offHand',
    mechanicalProperties: { kind: 'shield', acBonus: 2 }
  },
  {
    name: 'Kite Shield',
    itemType: 'misc',
    description: 'A large kite-shaped shield.',
    rarity: 'uncommon',
    equipSlot: 'offHand',
    mechanicalProperties: { kind: 'shield', acBonus: 3 }
  },
  {
    name: 'Traveler\'s Leathers',
    itemType: 'armor',
    description: 'Light armor suited for scouts.',
    rarity: 'common',
    equipSlot: 'armor',
    mechanicalProperties: { kind: 'armor', armorTier: 'light' }
  },
  {
    name: 'Chain Hauberk',
    itemType: 'armor',
    description: 'Interlocked rings that turn blades.',
    rarity: 'uncommon',
    equipSlot: 'armor',
    mechanicalProperties: { kind: 'armor', armorTier: 'medium' }
  },
  {
    name: 'Plate Harness',
    itemType: 'armor',
    description: 'Heavy plate for front-line fighters.',
    rarity: 'rare',
    equipSlot: 'armor',
    mechanicalProperties: { kind: 'armor', armorTier: 'heavy' }
  },
  {
    name: 'Unarmored Garb',
    itemType: 'armor',
    description: 'Ordinary clothes offering no protection.',
    rarity: 'common',
    equipSlot: 'armor',
    mechanicalProperties: { kind: 'armor', armorTier: 'none' }
  },
  {
    name: 'Minor Healing Draught',
    itemType: 'potion',
    description: 'A bitter tonic that knits small wounds.',
    rarity: 'common',
    equipSlot: null,
    mechanicalProperties: { kind: 'potion', healAmount: 7 }
  },
  {
    name: 'Greater Restoration Flask',
    itemType: 'potion',
    description: 'A potent brew that restores vitality.',
    rarity: 'uncommon',
    equipSlot: null,
    mechanicalProperties: { kind: 'potion', healAmount: 14 }
  },
  {
    name: 'Boots of Speed',
    itemType: 'magicItem',
    description: 'Light boots that quicken your step.',
    rarity: 'uncommon',
    equipSlot: 'feet',
    mechanicalProperties: { kind: 'magicItem', acBonus: 0, attackBonus: 0, accessorySlot: 'feet' }
  },
  {
    name: 'Iron Greaves',
    itemType: 'magicItem',
    description: 'Reinforced leg guards.',
    rarity: 'common',
    equipSlot: 'feet',
    mechanicalProperties: { kind: 'magicItem', acBonus: 0, attackBonus: 0, accessorySlot: 'feet' }
  },
  {
    name: 'Leather Belt',
    itemType: 'magicItem',
    description: 'A sturdy leather belt.',
    rarity: 'common',
    equipSlot: 'belt',
    mechanicalProperties: { kind: 'magicItem', acBonus: 0, attackBonus: 0, accessorySlot: 'belt' }
  },
  {
    name: 'Ring of Warding',
    itemType: 'magicItem',
    description: 'A silver band that deflects harm.',
    rarity: 'uncommon',
    equipSlot: 'ring1',
    mechanicalProperties: { kind: 'magicItem', acBonus: 1, attackBonus: 0, accessorySlot: 'ring1' }
  }
]

export function seedStarterItemCatalog(db: Database.Database): void {
  for (const spec of STARTER_ITEMS) {
    upsertCatalogItemByName(db, {
      name: spec.name,
      itemType: spec.itemType,
      description: spec.description,
      rarity: spec.rarity,
      mechanicalProperties: spec.mechanicalProperties ?? deriveMechanicalProperties(spec.itemType, spec.rarity),
      equipSlot: spec.equipSlot,
      source: 'seed'
    })
  }
}
