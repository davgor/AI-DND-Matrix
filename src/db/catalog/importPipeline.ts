import type Database from 'better-sqlite3'
import { validateBucketSet } from '../../shared/catalogTaxonomy'
import { upsertCreature } from './creatures'
import { upsertSpell } from './spells'
import type { CreateCatalogCreatureInput, CreateCatalogSpellInput } from './types'

export interface SeedImportError {
  index: number
  key: string
  reason: string
}

export interface SeedImportResult {
  imported: string[]
  errors: SeedImportError[]
}

function validateCreatureSeed(seed: CreateCatalogCreatureInput): string | undefined {
  const bucketResult = validateBucketSet(seed.buckets)
  if (!bucketResult.valid) return `bucket error: ${bucketResult.reason}`
  if (!seed.name.trim()) return 'name is required'
  if (seed.hp <= 0) return 'hp must be greater than 0'
  if (seed.ac <= 0) return 'ac must be greater than 0'
  if (seed.levelMin <= 0 || seed.levelMax < seed.levelMin) {
    return 'levelMin must be positive and levelMax must be >= levelMin'
  }
  if (!seed.temperament?.trim()) return 'temperament is required'
  if (typeof seed.canSpeak !== 'boolean') return 'canSpeak is required'
  return undefined
}

function validateSpellSeed(seed: CreateCatalogSpellInput): string | undefined {
  const bucketResult = validateBucketSet(seed.buckets)
  if (!bucketResult.valid) return `bucket error: ${bucketResult.reason}`
  if (!seed.name.trim()) return 'name is required'
  if (!seed.effectType.trim()) return 'effectType is required'
  if (!seed.range.trim()) return 'range is required'
  if (seed.cost < 0) return 'cost must not be negative'
  return undefined
}

export function importCreatureSeeds(
  db: Database.Database,
  seeds: CreateCatalogCreatureInput[]
): SeedImportResult {
  const imported: string[] = []
  const errors: SeedImportError[] = []

  seeds.forEach((seed, index) => {
    const reason = validateCreatureSeed(seed)
    if (reason) {
      errors.push({ index, key: seed.key, reason })
      return
    }
    upsertCreature(db, seed)
    imported.push(seed.key)
  })

  return { imported, errors }
}

export function importSpellSeeds(
  db: Database.Database,
  seeds: CreateCatalogSpellInput[]
): SeedImportResult {
  const imported: string[] = []
  const errors: SeedImportError[] = []

  seeds.forEach((seed, index) => {
    const reason = validateSpellSeed(seed)
    if (reason) {
      errors.push({ index, key: seed.key, reason })
      return
    }
    upsertSpell(db, seed)
    imported.push(seed.key)
  })

  return { imported, errors }
}
