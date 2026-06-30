/**
 * Loot exemplar/profile tables for the loot resolver and agent prompt.
 *
 * IMPORTANT: Exemplars are **suggestions** only. Actual item grants must still
 * go through catalog retrieve or validated proposeNew — never bypass that pipeline.
 */
import type { ItemRarity, ItemType } from '../shared/items/types'
import { ITEM_RARITIES } from '../shared/items/types'
import type { LootPolicy } from '../shared/loot/types'

export interface LootExemplar {
  name: string
  itemType: ItemType
  rarity: ItemRarity
  flavorHint: string
}

export type LootBucket = 'beast' | 'humanoid' | 'undead' | 'quest_reward_minor' | 'quest_reward_major'

// Rarity order for range comparisons
const RARITY_INDEX: Record<ItemRarity, number> = Object.fromEntries(
  ITEM_RARITIES.map((r, i) => [r, i]),
) as Record<ItemRarity, number>

function isRarityAtOrBelow(rarity: ItemRarity, max: ItemRarity): boolean {
  return RARITY_INDEX[rarity] <= RARITY_INDEX[max]
}

export const LOOT_EXEMPLAR_TABLE: Record<LootBucket, LootExemplar[]> = {
  beast: [
    { name: 'Beast Hide', itemType: 'misc', rarity: 'common', flavorHint: 'Rough, tanned hide stripped from the creature.' },
    { name: 'Fang', itemType: 'misc', rarity: 'common', flavorHint: 'A sharp fang, useful as a trophy or trade good.' },
    { name: 'Claw', itemType: 'misc', rarity: 'common', flavorHint: 'A hooked claw — valued by crafters and collectors.' },
    { name: 'Trophy Bone', itemType: 'misc', rarity: 'uncommon', flavorHint: 'An unusual bone, polished by predatory wear.' },
  ],

  humanoid: [
    { name: 'Worn Short Sword', itemType: 'weapon', rarity: 'common', flavorHint: 'A battered blade still serviceable in a pinch.' },
    { name: 'Coin Pouch', itemType: 'misc', rarity: 'common', flavorHint: 'A small leather pouch with a handful of copper and silver.' },
    { name: 'Travel Rations', itemType: 'misc', rarity: 'common', flavorHint: 'Hard tack and dried meat — enough for a day.' },
    { name: 'Leather Armor', itemType: 'armor', rarity: 'common', flavorHint: 'Scuffed light armor, still wearable.' },
    { name: 'Hand Axe', itemType: 'weapon', rarity: 'common', flavorHint: 'A utilitarian axe, dented but functional.' },
    { name: 'Studded Leather', itemType: 'armor', rarity: 'uncommon', flavorHint: 'Better-kept armor with metal studs.' },
  ],

  undead: [
    {
      name: 'Bone Fragment',
      itemType: 'misc',
      rarity: 'common',
      flavorHint: 'A shard of animated bone — salvage value only. (Intelligent undead may carry humanoid loot instead.)',
    },
    { name: 'Tattered Cloth', itemType: 'misc', rarity: 'common', flavorHint: 'Rotting cloth strips, barely worth gathering.' },
    { name: 'Grave Dust Vial', itemType: 'misc', rarity: 'uncommon', flavorHint: 'A small vial of necromantic residue — some mages pay well.' },
  ],

  quest_reward_minor: [
    { name: 'Silver Coins', itemType: 'misc', rarity: 'common', flavorHint: 'A modest coin reward for a job done.' },
    { name: 'Common Trinket', itemType: 'misc', rarity: 'common', flavorHint: 'A small keepsake — a carved charm or polished stone.' },
    { name: 'Healing Potion', itemType: 'potion', rarity: 'common', flavorHint: 'A standard healing draught in a corked bottle.' },
  ],

  quest_reward_major: [
    { name: 'Fine Longsword', itemType: 'weapon', rarity: 'uncommon', flavorHint: 'A well-crafted sword, a worthy reward for a perilous quest.' },
    { name: 'Chain Mail', itemType: 'armor', rarity: 'uncommon', flavorHint: 'Reliable medium armor gifted for exemplary service.' },
    { name: 'Relic Shard', itemType: 'misc', rarity: 'rare', flavorHint: 'A glimmering fragment of an ancient artifact — purpose unknown.' },
    { name: 'Greater Healing Potion', itemType: 'potion', rarity: 'uncommon', flavorHint: 'A more potent healing draught for seasoned adventurers.' },
  ],
}

// Flatten all exemplars in insertion order
const ALL_EXEMPLARS: LootExemplar[] = Object.values(LOOT_EXEMPLAR_TABLE).flat()

function matchesPolicy(exemplar: LootExemplar, policy: LootPolicy): boolean {
  const typeAllowed = (policy.allowedItemTypes as string[]).includes(exemplar.itemType)
  const rarityAllowed = isRarityAtOrBelow(exemplar.rarity, policy.maxRarity)
  return typeAllowed && rarityAllowed
}

/**
 * Returns flavor hints for the agent prompt filtered to the given policy.
 * Results are sorted deterministically by name, then itemType.
 *
 * NOTE: These are suggestions only. Actual item grants must go through the
 * catalog retrieve pipeline or validated proposeNew — never short-circuit that.
 */
export function listLootExemplarsForPolicy(policy: LootPolicy): LootExemplar[] {
  const filtered = ALL_EXEMPLARS.filter((e) => matchesPolicy(e, policy))
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name) || a.itemType.localeCompare(b.itemType))
}
