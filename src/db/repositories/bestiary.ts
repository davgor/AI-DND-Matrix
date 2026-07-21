import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  BestiarySpecies,
  BestiaryVariant,
  BestiaryVariantKey,
  CompositionPlan
} from '../../shared/bestiary/types'
import { isBestiaryVariantKey, parseCompositionPlan } from '../../shared/bestiary/types'
import type { Bucket } from '../../shared/catalogTaxonomy'
import { isBucket } from '../../shared/catalogTaxonomy'

export interface CreateBestiarySpeciesInput {
  campaignId: string
  key: string
  name: string
  baseLore: string
  buckets: Bucket[]
  tags: string[]
  defaultCatalogKey?: string | null
  variants?: CreateBestiaryVariantInput[]
}

export interface CreateBestiaryVariantInput {
  variantKey: BestiaryVariantKey
  catalogKeyOverride?: string
  modifierProfileId?: string
  flavorBlurb?: string
}

export interface QuestFoeAssignmentInput {
  speciesId: string
  plannedComposition?: CompositionPlan | null
}

export interface QuestFoeAssignment {
  id: string
  questId: string
  speciesId: string
  plannedComposition: CompositionPlan | null
  sortOrder: number
  createdAt: string
}

interface BestiarySpeciesRow {
  id: string
  campaign_id: string
  species_key: string
  name: string
  base_lore: string
  buckets_json: string
  tags_json: string
  default_catalog_key: string | null
  created_at: string
  updated_at: string
}

interface BestiaryVariantRow {
  id: string
  species_id: string
  variant_key: string
  catalog_key_override: string | null
  modifier_profile_id: string | null
  flavor_blurb: string | null
}

interface QuestFoeAssignmentRow {
  id: string
  quest_id: string
  species_id: string
  planned_composition_json: string | null
  sort_order: number
  created_at: string
}

function parseBucketsJson(raw: string): Bucket[] {
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.filter((item): item is Bucket => typeof item === 'string' && isBucket(item))
}

function parseTagsJson(raw: string): string[] {
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.filter((item): item is string => typeof item === 'string')
}

function rowToBestiarySpecies(row: BestiarySpeciesRow): BestiarySpecies {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    key: row.species_key,
    name: row.name,
    baseLore: row.base_lore,
    buckets: parseBucketsJson(row.buckets_json),
    tags: parseTagsJson(row.tags_json),
    defaultCatalogKey: row.default_catalog_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToBestiaryVariant(row: BestiaryVariantRow): BestiaryVariant {
  const variant: BestiaryVariant = {
    variantKey: isBestiaryVariantKey(row.variant_key) ? row.variant_key : 'standard'
  }
  if (row.catalog_key_override) {
    variant.catalogKeyOverride = row.catalog_key_override
  }
  if (row.modifier_profile_id) {
    variant.modifierProfileId = row.modifier_profile_id
  }
  if (row.flavor_blurb) {
    variant.flavorBlurb = row.flavor_blurb
  }
  return variant
}

function parsePlannedComposition(raw: string | null): CompositionPlan | null {
  if (!raw) {
    return null
  }
  try {
    return parseCompositionPlan(JSON.parse(raw) as unknown) ?? null
  } catch {
    return null
  }
}

function rowToQuestFoeAssignment(row: QuestFoeAssignmentRow): QuestFoeAssignment {
  return {
    id: row.id,
    questId: row.quest_id,
    speciesId: row.species_id,
    plannedComposition: parsePlannedComposition(row.planned_composition_json),
    sortOrder: row.sort_order,
    createdAt: row.created_at
  }
}

/**
 * Trim and require non-empty base lore. Used by createBestiarySpecies.
 */
export function assertNonEmptyBaseLore(lore: string): string {
  const trimmed = lore.trim()
  if (trimmed.length === 0) {
    throw new Error('Bestiary species base lore must be non-empty')
  }
  return trimmed
}

function insertVariant(
  db: Database.Database,
  speciesId: string,
  input: CreateBestiaryVariantInput
): void {
  db.prepare(
    `INSERT INTO bestiary_variants
       (id, species_id, variant_key, catalog_key_override, modifier_profile_id, flavor_blurb)
     VALUES
       (@id, @speciesId, @variantKey, @catalogKeyOverride, @modifierProfileId, @flavorBlurb)`
  ).run({
    id: randomUUID(),
    speciesId,
    variantKey: input.variantKey,
    catalogKeyOverride: input.catalogKeyOverride ?? null,
    modifierProfileId: input.modifierProfileId ?? null,
    flavorBlurb: input.flavorBlurb ?? null
  })
}

export function createBestiarySpecies(
  db: Database.Database,
  input: CreateBestiarySpeciesInput
): BestiarySpecies {
  const baseLore = assertNonEmptyBaseLore(input.baseLore)
  const id = randomUUID()
  const now = new Date().toISOString()
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO bestiary_species
         (id, campaign_id, species_key, name, base_lore, buckets_json, tags_json,
          default_catalog_key, created_at, updated_at)
       VALUES
         (@id, @campaignId, @speciesKey, @name, @baseLore, @bucketsJson, @tagsJson,
          @defaultCatalogKey, @createdAt, @updatedAt)`
    ).run({
      id,
      campaignId: input.campaignId,
      speciesKey: input.key,
      name: input.name,
      baseLore,
      bucketsJson: JSON.stringify(input.buckets),
      tagsJson: JSON.stringify(input.tags),
      defaultCatalogKey: input.defaultCatalogKey ?? null,
      createdAt: now,
      updatedAt: now
    })
    for (const variant of input.variants ?? []) {
      insertVariant(db, id, variant)
    }
  })
  run()
  return getBestiarySpeciesById(db, id)!
}

export function getBestiarySpeciesById(
  db: Database.Database,
  id: string
): BestiarySpecies | undefined {
  const row = db.prepare('SELECT * FROM bestiary_species WHERE id = ?').get(id) as
    | BestiarySpeciesRow
    | undefined
  return row ? rowToBestiarySpecies(row) : undefined
}

export function getBestiarySpeciesByKey(
  db: Database.Database,
  campaignId: string,
  speciesKey: string
): BestiarySpecies | undefined {
  const row = db
    .prepare('SELECT * FROM bestiary_species WHERE campaign_id = ? AND species_key = ?')
    .get(campaignId, speciesKey) as BestiarySpeciesRow | undefined
  return row ? rowToBestiarySpecies(row) : undefined
}

export function listBestiarySpecies(db: Database.Database, campaignId: string): BestiarySpecies[] {
  const rows = db
    .prepare('SELECT * FROM bestiary_species WHERE campaign_id = ? ORDER BY name')
    .all(campaignId) as BestiarySpeciesRow[]
  return rows.map(rowToBestiarySpecies)
}

export function listBestiaryVariants(db: Database.Database, speciesId: string): BestiaryVariant[] {
  const rows = db
    .prepare('SELECT * FROM bestiary_variants WHERE species_id = ? ORDER BY variant_key')
    .all(speciesId) as BestiaryVariantRow[]
  return rows.map(rowToBestiaryVariant)
}

/**
 * Insert or replace a variant for a species (keyed by species_id + variant_key).
 */
export function upsertBestiaryVariant(
  db: Database.Database,
  speciesId: string,
  input: CreateBestiaryVariantInput
): BestiaryVariant {
  const existing = db
    .prepare('SELECT id FROM bestiary_variants WHERE species_id = ? AND variant_key = ?')
    .get(speciesId, input.variantKey) as { id: string } | undefined

  if (existing) {
    db.prepare(
      `UPDATE bestiary_variants
       SET catalog_key_override = @catalogKeyOverride,
           modifier_profile_id = @modifierProfileId,
           flavor_blurb = @flavorBlurb
       WHERE id = @id`
    ).run({
      id: existing.id,
      catalogKeyOverride: input.catalogKeyOverride ?? null,
      modifierProfileId: input.modifierProfileId ?? null,
      flavorBlurb: input.flavorBlurb ?? null
    })
  } else {
    insertVariant(db, speciesId, input)
  }

  const row = db
    .prepare('SELECT * FROM bestiary_variants WHERE species_id = ? AND variant_key = ?')
    .get(speciesId, input.variantKey) as BestiaryVariantRow
  return rowToBestiaryVariant(row)
}

/**
 * Replace-all quest foe assignments for a quest.
 * Pass an empty array to clear. Sort order follows input array index.
 */
export function setQuestFoeAssignment(
  db: Database.Database,
  questId: string,
  assignments: QuestFoeAssignmentInput[]
): QuestFoeAssignment[] {
  const createdAt = new Date().toISOString()
  const run = db.transaction(() => {
    db.prepare('DELETE FROM quest_foe_assignments WHERE quest_id = ?').run(questId)
    const insert = db.prepare(
      `INSERT INTO quest_foe_assignments
         (id, quest_id, species_id, planned_composition_json, sort_order, created_at)
       VALUES
         (@id, @questId, @speciesId, @plannedCompositionJson, @sortOrder, @createdAt)`
    )
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]!
      insert.run({
        id: randomUUID(),
        questId,
        speciesId: assignment.speciesId,
        plannedCompositionJson:
          assignment.plannedComposition == null
            ? null
            : JSON.stringify(assignment.plannedComposition),
        sortOrder: i,
        createdAt
      })
    }
  })
  run()
  return listQuestFoeAssignments(db, questId)
}

export function listQuestFoeAssignments(
  db: Database.Database,
  questId: string
): QuestFoeAssignment[] {
  const rows = db
    .prepare(
      'SELECT * FROM quest_foe_assignments WHERE quest_id = ? ORDER BY sort_order ASC, created_at ASC'
    )
    .all(questId) as QuestFoeAssignmentRow[]
  return rows.map(rowToQuestFoeAssignment)
}
