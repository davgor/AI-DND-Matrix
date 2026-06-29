import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Archetype } from '../../engine/hp'
import type { Bucket } from '../../shared/catalogTaxonomy'
import { getBucketTags, listEntityIdsByBucket, replaceBucketTags } from './bucketTags'
import type { CatalogProvenance, CatalogSpell, CreateCatalogSpellInput, SpellConstraints } from './types'

interface SpellRow {
  id: string
  key: string
  name: string
  effect_type: string
  range: string
  cost: number
  archetype_hint: string | null
  tags: string
  constraints: string
  source: string
  provenance: string | null
  version: number
  created_at: string
}

function rowToSpell(db: Database.Database, row: SpellRow): CatalogSpell {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    effectType: row.effect_type,
    range: row.range,
    cost: row.cost,
    archetypeHint: (row.archetype_hint ?? undefined) as Archetype | undefined,
    tags: JSON.parse(row.tags) as string[],
    buckets: getBucketTags(db, 'spell', row.id),
    constraints: JSON.parse(row.constraints) as SpellConstraints,
    source: row.source as CatalogSpell['source'],
    provenance: row.provenance ? (JSON.parse(row.provenance) as CatalogProvenance) : undefined,
    version: row.version,
    createdAt: row.created_at
  }
}

export function upsertSpell(db: Database.Database, input: CreateCatalogSpellInput): CatalogSpell {
  const existing = db.prepare('SELECT id FROM catalog_spells WHERE key = ?').get(input.key) as
    | { id: string }
    | undefined
  const id = existing?.id ?? randomUUID()
  const createdAt = new Date().toISOString()

  db.prepare(
    `INSERT INTO catalog_spells
       (id, key, name, effect_type, range, cost, archetype_hint, tags, constraints, source,
        provenance, version, created_at)
     VALUES (@id, @key, @name, @effectType, @range, @cost, @archetypeHint, @tags, @constraints,
             @source, @provenance, @version, @createdAt)
     ON CONFLICT(key) DO UPDATE SET
       name = @name, effect_type = @effectType, range = @range, cost = @cost,
       archetype_hint = @archetypeHint, tags = @tags, constraints = @constraints,
       source = @source, provenance = @provenance, version = @version`
  ).run({
    id,
    key: input.key,
    name: input.name,
    effectType: input.effectType,
    range: input.range,
    cost: input.cost,
    archetypeHint: input.archetypeHint ?? null,
    tags: JSON.stringify(input.tags),
    constraints: JSON.stringify(input.constraints),
    source: input.source,
    provenance: input.provenance ? JSON.stringify(input.provenance) : null,
    version: input.version,
    createdAt
  })

  replaceBucketTags(db, 'spell', id, input.buckets)

  const row = db.prepare('SELECT * FROM catalog_spells WHERE id = ?').get(id) as SpellRow
  return rowToSpell(db, row)
}

export function getSpellByKey(db: Database.Database, key: string): CatalogSpell | undefined {
  const row = db.prepare('SELECT * FROM catalog_spells WHERE key = ?').get(key) as
    | SpellRow
    | undefined
  return row ? rowToSpell(db, row) : undefined
}

export function getSpellById(db: Database.Database, id: string): CatalogSpell | undefined {
  const row = db.prepare('SELECT * FROM catalog_spells WHERE id = ?').get(id) as
    | SpellRow
    | undefined
  return row ? rowToSpell(db, row) : undefined
}

export function listAllSpells(db: Database.Database): CatalogSpell[] {
  const rows = db.prepare('SELECT * FROM catalog_spells ORDER BY key').all() as SpellRow[]
  return rows.map((row) => rowToSpell(db, row))
}

export function listSpellsByBucket(db: Database.Database, bucket: Bucket): CatalogSpell[] {
  const ids = listEntityIdsByBucket(db, 'spell', bucket)
  if (ids.length === 0) return []
  return ids
    .map((id) => getSpellById(db, id))
    .filter((spell): spell is CatalogSpell => spell !== undefined)
    .sort((a, b) => a.key.localeCompare(b.key))
}
