import type Database from 'better-sqlite3'
import type { ItemGrantProposal } from '../../agents/dm'
import { grantItemToCharacter } from './itemFlows'
import {
  canonicalizeProposedItem,
  resolveCatalogItemReference
} from './itemCanonicalization'
import { ITEM_TYPES } from '../../shared/items/types'

function isValidItemType(value: string): value is (typeof ITEM_TYPES)[number] {
  return (ITEM_TYPES as readonly string[]).includes(value)
}

export function persistItemGrants(
  db: Database.Database,
  characterId: string,
  grants: ItemGrantProposal[] | undefined
): void {
  if (!grants?.length) {
    return
  }
  for (const grant of grants) {
    if ('catalogItemId' in grant) {
      const item = resolveCatalogItemReference(db, grant.catalogItemId)
      if (item) {
        grantItemToCharacter(db, characterId, item.id)
      }
      continue
    }
    if (!isValidItemType(grant.proposeNew.itemType)) {
      continue
    }
    const item = canonicalizeProposedItem(db, {
      name: grant.proposeNew.name,
      description: grant.proposeNew.description,
      itemType: grant.proposeNew.itemType,
      rarityTier: grant.proposeNew.rarityTier
    })
    grantItemToCharacter(db, characterId, item.id)
  }
}
