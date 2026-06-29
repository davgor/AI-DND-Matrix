import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

import type {
  CharacterGuidedCreationFields,
  GuidedCreationPhase
} from '../../shared/guidedCreation/types'
import type { Alignment, PendingAlignmentShift } from '../../shared/alignment/types'
import { parsePendingAlignmentShiftJson } from '../../shared/alignment/types'

export type CharacterKind = 'player' | 'ai_party_member'

export interface Character extends CharacterGuidedCreationFields {
  id: string
  campaignId: string
  name: string
  characterClass: string
  stats: Record<string, unknown>
  inventory: unknown[]
  hp: number
  xp: number
  level: number
  currency: number
  kind: CharacterKind
  sourceNpcId: string | null
  portraitPath: string | null
  sheetBackgroundPath: string | null
  alignment: Alignment | null
  pendingAlignmentShift: PendingAlignmentShift | null
}

export interface CreateCharacterInput {
  campaignId: string
  name: string
  characterClass: string
  kind: CharacterKind
  stats?: Record<string, unknown>
  inventory?: unknown[]
  hp?: number
  xp?: number
  level?: number
  currency?: number
  sourceNpcId?: string | null
  portraitPath?: string | null
  sheetBackgroundPath?: string | null
  alignment?: Alignment | null
}

export interface UpdateCharacterInput {
  stats?: Record<string, unknown>
  inventory?: unknown[]
  hp?: number
  xp?: number
  level?: number
}

interface CharacterRow {
  id: string
  campaign_id: string
  name: string
  class: string
  stats: string
  inventory: string
  hp: number
  xp: number
  level: number
  currency: number
  kind: CharacterKind
  source_npc_id: string | null
  portrait_path: string | null
  sheet_background_path: string | null
  identity_who: string | null
  identity_why: string | null
  identity_where: string | null
  identity_what: string | null
  opening_scene: string | null
  guided_creation_phase: GuidedCreationPhase
  alignment: string | null
  pending_alignment_shift: string | null
}

function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    characterClass: row.class,
    stats: JSON.parse(row.stats) as Record<string, unknown>,
    inventory: JSON.parse(row.inventory) as unknown[],
    hp: row.hp,
    xp: row.xp,
    level: row.level,
    currency: row.currency,
    kind: row.kind,
    sourceNpcId: row.source_npc_id,
    portraitPath: row.portrait_path,
    sheetBackgroundPath: row.sheet_background_path,
    identityWho: row.identity_who,
    identityWhy: row.identity_why,
    identityWhere: row.identity_where,
    identityWhat: row.identity_what,
    openingScene: row.opening_scene,
    guidedCreationPhase: row.guided_creation_phase,
    alignment: (row.alignment as Alignment | null) ?? null,
    pendingAlignmentShift: parsePendingAlignmentShiftJson(row.pending_alignment_shift)
  }
}

function defaultGuidedPhase(kind: CharacterKind): GuidedCreationPhase {
  return kind === 'player' ? 'identity' : 'none'
}

function buildCharacterRecord(id: string, input: CreateCharacterInput, values: {
  stats: Record<string, unknown>
  inventory: unknown[]
  hp: number
  xp: number
  level: number
  currency: number
  sourceNpcId: string | null
  portraitPath: string | null
  sheetBackgroundPath: string | null
}): Character {
  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    characterClass: input.characterClass,
    stats: values.stats,
    inventory: values.inventory,
    hp: values.hp,
    xp: values.xp,
    level: values.level,
    currency: values.currency,
    kind: input.kind,
    sourceNpcId: values.sourceNpcId,
    portraitPath: values.portraitPath,
    sheetBackgroundPath: values.sheetBackgroundPath,
    identityWho: null,
    identityWhy: null,
    identityWhere: null,
    identityWhat: null,
    openingScene: null,
    guidedCreationPhase: defaultGuidedPhase(input.kind),
    alignment: input.alignment ?? null,
    pendingAlignmentShift: null
  }
}

function insertCharacterRow(
  db: Database.Database,
  id: string,
  input: CreateCharacterInput,
  values: {
    stats: Record<string, unknown>
    inventory: unknown[]
    hp: number
    xp: number
    level: number
    currency: number
    sourceNpcId: string | null
    portraitPath: string | null
    sheetBackgroundPath: string | null
  }
): void {
  db.prepare(
    `INSERT INTO characters
       (id, campaign_id, name, class, stats, inventory, hp, xp, level, currency, kind, source_npc_id, portrait_path, sheet_background_path, guided_creation_phase, alignment)
     VALUES
       (@id, @campaignId, @name, @characterClass, @stats, @inventory, @hp, @xp, @level, @currency, @kind, @sourceNpcId, @portraitPath, @sheetBackgroundPath, @guidedCreationPhase, @alignment)`
  ).run({
    id,
    campaignId: input.campaignId,
    name: input.name,
    characterClass: input.characterClass,
    stats: JSON.stringify(values.stats),
    inventory: JSON.stringify(values.inventory),
    hp: values.hp,
    xp: values.xp,
    level: values.level,
    currency: values.currency,
    kind: input.kind,
    sourceNpcId: values.sourceNpcId,
    portraitPath: values.portraitPath,
    sheetBackgroundPath: values.sheetBackgroundPath,
    guidedCreationPhase: defaultGuidedPhase(input.kind),
    alignment: input.alignment ?? null
  })
}

export function createCharacter(db: Database.Database, input: CreateCharacterInput): Character {
  const id = randomUUID()
  const values = {
    stats: input.stats ?? {},
    inventory: input.inventory ?? [],
    hp: input.hp ?? 0,
    xp: input.xp ?? 0,
    level: input.level ?? 1,
    currency: input.currency ?? 0,
    sourceNpcId: input.sourceNpcId ?? null,
    portraitPath: input.portraitPath ?? null,
    sheetBackgroundPath: input.sheetBackgroundPath ?? null
  }

  insertCharacterRow(db, id, input, values)

  return buildCharacterRecord(id, input, values)
}

export function getCharacterById(db: Database.Database, id: string): Character | undefined {
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as
    | CharacterRow
    | undefined
  return row ? rowToCharacter(row) : undefined
}

export function listCharactersByCampaign(db: Database.Database, campaignId: string): Character[] {
  const rows = db
    .prepare('SELECT * FROM characters WHERE campaign_id = ? ORDER BY name')
    .all(campaignId) as CharacterRow[]
  return rows.map(rowToCharacter)
}

export type AdjustCurrencyResult =
  | { success: true; newBalance: number }
  | { success: false; reason: 'insufficient_funds' }

export function adjustCharacterCurrency(
  db: Database.Database,
  id: string,
  delta: number
): AdjustCurrencyResult {
  const row = db
    .prepare(
      'UPDATE characters SET currency = currency + ? WHERE id = ? AND currency + ? >= 0 RETURNING currency'
    )
    .get(delta, id, delta) as { currency: number } | undefined

  if (!row) {
    return { success: false, reason: 'insufficient_funds' }
  }

  return { success: true, newBalance: row.currency }
}

export function updateCharacter(
  db: Database.Database,
  id: string,
  updates: UpdateCharacterInput
): void {
  const current = getCharacterById(db, id)
  if (!current) return

  const stats = updates.stats ?? current.stats
  const inventory = updates.inventory ?? current.inventory
  const hp = updates.hp ?? current.hp
  const xp = updates.xp ?? current.xp
  const level = updates.level ?? current.level

  db.prepare(
    'UPDATE characters SET stats = ?, inventory = ?, hp = ?, xp = ?, level = ? WHERE id = ?'
  ).run(JSON.stringify(stats), JSON.stringify(inventory), hp, xp, level, id)
}
