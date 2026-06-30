import type Database from 'better-sqlite3'
import type { ItemGrantProposal } from '../agents/dm'
import { clampItemRarity } from '../engine/itemTemplate'
import {
  canonicalizeProposedItem,
  resolveCatalogItemReference
} from '../db/repositories/itemCanonicalization'
import { grantItemToCharacter } from '../db/repositories/itemFlows'
import { listCatalogItems } from '../db/repositories/items'
import type { CatalogItem, ItemRarity } from '../shared/items/types'
import { ITEM_RARITIES } from '../shared/items/types'
import type { LootGrantResult, LootPolicy } from '../shared/loot/types'

const RARITY_INDEX: Record<ItemRarity, number> = Object.fromEntries(
  ITEM_RARITIES.map((r, i) => [r, i])
) as Record<ItemRarity, number>

function isRarityAtOrBelow(rarity: ItemRarity, max: ItemRarity): boolean {
  return RARITY_INDEX[rarity] <= RARITY_INDEX[max]
}

export function filterCatalogCandidatesForPolicy(
  db: Database.Database,
  policy: LootPolicy
): CatalogItem[] {
  return listCatalogItems(db).filter(
    (item) =>
      policy.allowedItemTypes.includes(item.itemType) &&
      isRarityAtOrBelow(item.rarity, policy.maxRarity)
  )
}

function rejectGrant(reason: string, raw: unknown, rejected: LootGrantResult['rejected']): void {
  rejected.push({ reason, raw })
}

function validateCatalogGrant(
  db: Database.Database,
  grant: { catalogItemId: string },
  policy: LootPolicy,
  rejected: LootGrantResult['rejected']
): CatalogItem | null {
  const item = resolveCatalogItemReference(db, grant.catalogItemId)
  if (!item) {
    rejectGrant('unknown_catalog_id', grant, rejected)
    return null
  }
  if (!policy.allowedItemTypes.includes(item.itemType)) {
    rejectGrant('forbidden_item_type', grant, rejected)
    return null
  }
  if (!isRarityAtOrBelow(item.rarity, policy.maxRarity)) {
    rejectGrant('rarity_above_cap', grant, rejected)
    return null
  }
  return item
}

function validateProposedGrant(
  grant: { proposeNew: { name: string; description: string; itemType: string; rarityTier: string } },
  policy: LootPolicy,
  rejected: LootGrantResult['rejected']
): { name: string; description: string; itemType: import('../shared/items/types').ItemType; rarityTier: string } | null {
  const proposal = grant.proposeNew
  if (!policy.allowedItemTypes.includes(proposal.itemType as never)) {
    rejectGrant('forbidden_item_type', grant, rejected)
    return null
  }
  const clamped = clampItemRarity(proposal.rarityTier)
  if (!isRarityAtOrBelow(clamped, policy.maxRarity)) {
    rejectGrant('rarity_above_cap', grant, rejected)
    return null
  }
  return { ...proposal, itemType: proposal.itemType as import('../shared/items/types').ItemType, rarityTier: clamped }
}

export function validateAndPersistLootGrants(
  db: Database.Database,
  characterId: string,
  policy: LootPolicy,
  grants: ItemGrantProposal[] | undefined
): LootGrantResult {
  const result: LootGrantResult = { accepted: [], rejected: [] }
  if (!grants?.length) {
    return result
  }

  const capped = grants.slice(0, policy.maxGrantCount)
  for (const grant of capped) {
    if ('catalogItemId' in grant) {
      const item = validateCatalogGrant(db, grant, policy, result.rejected)
      if (!item) {
        continue
      }
      grantItemToCharacter(db, characterId, item.id)
      result.accepted.push({ itemId: item.id, itemName: item.name })
      continue
    }
    const valid = validateProposedGrant(grant, policy, result.rejected)
    if (!valid) {
      continue
    }
    const item = canonicalizeProposedItem(db, valid)
    grantItemToCharacter(db, characterId, item.id)
    result.accepted.push({ itemId: item.id, itemName: item.name })
  }
  return result
}
