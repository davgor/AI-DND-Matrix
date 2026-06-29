import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../../engine/abilities'
import type { DamageType, ResistanceProfile } from '../../engine/damage'
import type { Archetype } from '../../engine/hp'
import type { Bucket } from '../../shared/catalogTaxonomy'
import { getBucketTags, listEntityIdsByBucket, replaceBucketTags } from './bucketTags'
import type { CatalogCreature, CatalogProvenance, CreateCatalogCreatureInput } from './types'

interface CreatureRow {
  id: string
  key: string
  name: string
  archetype_hint: string | null
  level_min: number
  level_max: number
  hp: number
  ac: number
  abilities: string
  resistances: string
  damage_types: string
  tags: string
  temperament: string
  can_speak: number
  source: string
  provenance: string | null
  version: number
  created_at: string
}

function rowToCreature(db: Database.Database, row: CreatureRow): CatalogCreature {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    archetypeHint: (row.archetype_hint ?? undefined) as Archetype | undefined,
    levelMin: row.level_min,
    levelMax: row.level_max,
    hp: row.hp,
    ac: row.ac,
    abilities: JSON.parse(row.abilities) as AbilityScores,
    resistances: JSON.parse(row.resistances) as ResistanceProfile,
    damageTypes: JSON.parse(row.damage_types) as DamageType[],
    tags: JSON.parse(row.tags) as string[],
    buckets: getBucketTags(db, 'creature', row.id),
    temperament: row.temperament as CatalogCreature['temperament'],
    canSpeak: row.can_speak === 1,
    source: row.source as CatalogCreature['source'],
    provenance: row.provenance ? (JSON.parse(row.provenance) as CatalogProvenance) : undefined,
    version: row.version,
    createdAt: row.created_at
  }
}

export function upsertCreature(
  db: Database.Database,
  input: CreateCatalogCreatureInput
): CatalogCreature {
  const existing = db.prepare('SELECT id FROM catalog_creatures WHERE key = ?').get(input.key) as
    | { id: string }
    | undefined
  const id = existing?.id ?? randomUUID()
  const createdAt = new Date().toISOString()

  db.prepare(
    `INSERT INTO catalog_creatures
       (id, key, name, archetype_hint, level_min, level_max, hp, ac, abilities, resistances,
        damage_types, tags, temperament, can_speak, source, provenance, version, created_at)
     VALUES (@id, @key, @name, @archetypeHint, @levelMin, @levelMax, @hp, @ac, @abilities,
             @resistances, @damageTypes, @tags, @temperament, @canSpeak, @source, @provenance, @version, @createdAt)
     ON CONFLICT(key) DO UPDATE SET
       name = @name, archetype_hint = @archetypeHint, level_min = @levelMin, level_max = @levelMax,
       hp = @hp, ac = @ac, abilities = @abilities, resistances = @resistances,
       damage_types = @damageTypes, tags = @tags, temperament = @temperament, can_speak = @canSpeak,
       source = @source, provenance = @provenance, version = @version`
  ).run({
    id,
    key: input.key,
    name: input.name,
    archetypeHint: input.archetypeHint ?? null,
    levelMin: input.levelMin,
    levelMax: input.levelMax,
    hp: input.hp,
    ac: input.ac,
    abilities: JSON.stringify(input.abilities),
    resistances: JSON.stringify(input.resistances),
    damageTypes: JSON.stringify(input.damageTypes),
    tags: JSON.stringify(input.tags),
    temperament: input.temperament,
    canSpeak: input.canSpeak ? 1 : 0,
    source: input.source,
    provenance: input.provenance ? JSON.stringify(input.provenance) : null,
    version: input.version,
    createdAt
  })

  replaceBucketTags(db, 'creature', id, input.buckets)

  const row = db.prepare('SELECT * FROM catalog_creatures WHERE id = ?').get(id) as CreatureRow
  return rowToCreature(db, row)
}

export function getCreatureByKey(db: Database.Database, key: string): CatalogCreature | undefined {
  const row = db.prepare('SELECT * FROM catalog_creatures WHERE key = ?').get(key) as
    | CreatureRow
    | undefined
  return row ? rowToCreature(db, row) : undefined
}

export function getCreatureById(db: Database.Database, id: string): CatalogCreature | undefined {
  const row = db.prepare('SELECT * FROM catalog_creatures WHERE id = ?').get(id) as
    | CreatureRow
    | undefined
  return row ? rowToCreature(db, row) : undefined
}

export function listAllCreatures(db: Database.Database): CatalogCreature[] {
  const rows = db.prepare('SELECT * FROM catalog_creatures ORDER BY key').all() as CreatureRow[]
  return rows.map((row) => rowToCreature(db, row))
}

export function listCreaturesByBucket(db: Database.Database, bucket: Bucket): CatalogCreature[] {
  const ids = listEntityIdsByBucket(db, 'creature', bucket)
  if (ids.length === 0) return []
  return ids
    .map((id) => getCreatureById(db, id))
    .filter((creature): creature is CatalogCreature => creature !== undefined)
    .sort((a, b) => a.key.localeCompare(b.key))
}
