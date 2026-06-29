import type Database from 'better-sqlite3'
import { listAllCreatures, upsertCreature } from './creatures'
import type { CatalogCreature, CreateCatalogCreatureInput } from './types'

export interface CanonicalizationResult {
  promoted: boolean
  creature: CatalogCreature
  reason?: string
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function findNearDuplicate(
  db: Database.Database,
  draft: CreateCatalogCreatureInput
): CatalogCreature | undefined {
  const draftName = normalizeName(draft.name)
  return listAllCreatures(db).find((existing) => {
    if (existing.key === draft.key) return false
    const sameName = normalizeName(existing.name) === draftName
    const sharesBucket = existing.buckets.some((bucket) => draft.buckets.includes(bucket))
    return sameName && sharesBucket
  })
}

export function canonicalizeGeneratedCreature(
  db: Database.Database,
  draft: CreateCatalogCreatureInput
): CanonicalizationResult {
  const duplicate = findNearDuplicate(db, draft)
  if (duplicate) {
    return {
      promoted: false,
      creature: duplicate,
      reason: `near-duplicate of existing canonical entry "${duplicate.key}"`
    }
  }

  const promoted = upsertCreature(db, {
    ...draft,
    source: 'generated-promoted',
    provenance: { ...draft.provenance, promotedAt: new Date().toISOString() }
  })

  return { promoted: true, creature: promoted }
}
