import type { Bucket } from '../shared/catalogTaxonomy'
import type { ItemType, ItemRarity } from '../shared/items/types'
import type { LootContext, LootPolicy, FoeSummary } from '../shared/loot/types'

interface BucketProfile {
  allowedItemTypes: ItemType[]
  maxRarity: ItemRarity
}

const RARITY_ORDER: readonly ItemRarity[] = ['common', 'uncommon', 'rare', 'epic']

const BUCKET_PROFILES: Record<Bucket, BucketProfile> = {
  beast: { allowedItemTypes: ['misc'], maxRarity: 'common' },
  elemental: { allowedItemTypes: ['misc'], maxRarity: 'common' },
  construct: { allowedItemTypes: ['misc'], maxRarity: 'common' },
  humanoid: { allowedItemTypes: ['misc', 'weapon', 'armor', 'potion'], maxRarity: 'uncommon' },
  goblinoid: { allowedItemTypes: ['misc', 'weapon', 'armor', 'potion'], maxRarity: 'uncommon' },
  undead: { allowedItemTypes: ['misc', 'potion'], maxRarity: 'uncommon' },
  dragonkin: { allowedItemTypes: ['misc', 'potion'], maxRarity: 'uncommon' },
  fiend: { allowedItemTypes: ['misc', 'potion'], maxRarity: 'uncommon' }
}

const LOOTABLE_OUTCOMES = new Set(['slain', 'incapacitated', 'surrender'])

function lootableFoes(foes: FoeSummary[]): FoeSummary[] {
  return foes.filter((f) => LOOTABLE_OUTCOMES.has(f.outcome))
}

function lowerRarity(a: ItemRarity, b: ItemRarity): ItemRarity {
  return RARITY_ORDER.indexOf(a) <= RARITY_ORDER.indexOf(b) ? a : b
}

function profileForBuckets(buckets: Bucket[]): BucketProfile {
  const profiles = buckets.map((b) => BUCKET_PROFILES[b])
  const first = profiles[0]
  if (!first) return { allowedItemTypes: ['misc'], maxRarity: 'common' }

  return profiles.slice(1).reduce<BucketProfile>((acc, p) => {
    const typeSet = new Set(p.allowedItemTypes)
    return {
      allowedItemTypes: acc.allowedItemTypes.filter((t) => typeSet.has(t)),
      maxRarity: lowerRarity(acc.maxRarity, p.maxRarity)
    }
  }, first)
}

function mergeProfiles(profiles: BucketProfile[]): BucketProfile {
  const first = profiles[0]
  if (!first) return { allowedItemTypes: ['misc'], maxRarity: 'common' }

  return profiles.slice(1).reduce<BucketProfile>((acc, p) => {
    const typeSet = new Set(p.allowedItemTypes)
    return {
      allowedItemTypes: acc.allowedItemTypes.filter((t) => typeSet.has(t)),
      maxRarity: lowerRarity(acc.maxRarity, p.maxRarity)
    }
  }, { allowedItemTypes: [...first.allowedItemTypes], maxRarity: first.maxRarity })
}

function resolveEncounterPolicy(foes: FoeSummary[]): LootPolicy {
  const active = lootableFoes(foes)
  if (active.length === 0) {
    return { allowedItemTypes: ['misc'], maxRarity: 'common', maxGrantCount: 0, catalogRetrieveFirst: true }
  }

  const profiles = active.map((f) => profileForBuckets(f.buckets))
  const merged = mergeProfiles(profiles)

  const isBeastMajority =
    profiles.every((p) => p.allowedItemTypes.length === 1 && p.allowedItemTypes[0] === 'misc')

  const maxGrantCount = isBeastMajority ? 2 : 3

  return {
    allowedItemTypes: merged.allowedItemTypes,
    maxRarity: merged.maxRarity,
    maxGrantCount,
    catalogRetrieveFirst: true
  }
}

function resolveQuestPolicy(ctx: LootContext): LootPolicy {
  if (ctx.questScale === 'major') {
    return {
      allowedItemTypes: ['misc', 'potion', 'weapon', 'armor'],
      maxRarity: 'rare',
      maxGrantCount: 2,
      catalogRetrieveFirst: true
    }
  }
  // minor (default for quest_complete)
  return {
    allowedItemTypes: ['misc', 'potion'],
    maxRarity: 'common',
    maxGrantCount: 1,
    catalogRetrieveFirst: true
  }
}

/** Pure engine function — no DB or LLM imports. */
export function resolveLootPolicy(ctx: LootContext): LootPolicy {
  if (ctx.source === 'quest_complete') {
    return resolveQuestPolicy(ctx)
  }
  return resolveEncounterPolicy(ctx.foes)
}
