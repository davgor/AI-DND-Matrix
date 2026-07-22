import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

import type {
  CharacterGuidedCreationFields,
  GuidedCreationPhase
} from '../../shared/guidedCreation/types'
import type { Alignment, PendingAlignmentShift } from '../../shared/alignment/types'
import { parsePendingAlignmentShiftJson } from '../../shared/alignment/types'
import type {
  CharacterLifeStatus,
  CharacterObituary,
  DeathCause
} from '../../shared/campaignHub/types'

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
  lifeStatus: CharacterLifeStatus
  diedAt: string | null
  deathCause: DeathCause | string | null
  obituary: CharacterObituary | null
  ownerPlayerCharacterId: string | null
  raceKey: string | null
  backgroundKey: string | null
  backgroundStory: string | null
  backgroundCustomLabel: string | null
  /** EPIC-133 — last shared world day this PC was active (watermark, not a private clock). */
  lastActiveInGameDate: number
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
  ownerPlayerCharacterId?: string | null
  guidedCreationPhase?: GuidedCreationPhase
  raceKey?: string | null
  backgroundKey?: string | null
  backgroundStory?: string | null
  backgroundCustomLabel?: string | null
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
  life_status?: string
  died_at?: string | null
  death_cause?: string | null
  obituary_json?: string | null
  owner_player_character_id?: string | null
  race_key?: string | null
  background_key?: string | null
  background_story?: string | null
  background_custom_label?: string | null
  /** EPIC-133 */
  last_active_in_game_date?: number | null
}

function parseObituaryJson(raw: string | null | undefined): CharacterObituary | null {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as CharacterObituary
  } catch {
    return null
  }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  return (JSON.parse(raw) as Record<string, unknown> | null) ?? {}
}

function parseJsonArray(raw: string): unknown[] {
  return (JSON.parse(raw) as unknown[] | null) ?? []
}

function rowToCharacterIdentityFields(row: CharacterRow) {
  return {
    identityWho: row.identity_who,
    identityWhy: row.identity_why,
    identityWhere: row.identity_where,
    identityWhat: row.identity_what,
    openingScene: row.opening_scene,
    guidedCreationPhase: row.guided_creation_phase,
    alignment: (row.alignment as Alignment | null) ?? null,
    pendingAlignmentShift: parsePendingAlignmentShiftJson(row.pending_alignment_shift),
    lifeStatus: (row.life_status as CharacterLifeStatus | undefined) ?? 'alive',
    diedAt: row.died_at ?? null,
    deathCause: row.death_cause ?? null,
    obituary: parseObituaryJson(row.obituary_json),
    ownerPlayerCharacterId: row.owner_player_character_id ?? null,
    raceKey: row.race_key ?? null,
    backgroundKey: row.background_key ?? null,
    backgroundStory: row.background_story ?? null,
    backgroundCustomLabel: row.background_custom_label ?? null
  }
}

function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    characterClass: row.class,
    stats: parseJsonObject(row.stats),
    inventory: parseJsonArray(row.inventory),
    hp: row.hp,
    xp: row.xp,
    level: row.level,
    currency: row.currency,
    kind: row.kind,
    sourceNpcId: row.source_npc_id,
    portraitPath: row.portrait_path,
    sheetBackgroundPath: row.sheet_background_path,
    ...rowToCharacterIdentityFields(row),
    // EPIC-133
    lastActiveInGameDate: row.last_active_in_game_date ?? 0
  }
}

function defaultGuidedPhase(kind: CharacterKind): GuidedCreationPhase {
  return kind === 'player' ? 'race' : 'none'
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
    guidedCreationPhase: input.guidedCreationPhase ?? defaultGuidedPhase(input.kind),
    alignment: input.alignment ?? null,
    pendingAlignmentShift: null,
    lifeStatus: 'alive',
    diedAt: null,
    deathCause: null,
    obituary: null,
    ownerPlayerCharacterId: input.ownerPlayerCharacterId ?? null,
    raceKey: input.raceKey ?? null,
    backgroundKey: input.backgroundKey ?? null,
    backgroundStory: input.backgroundStory ?? null,
    backgroundCustomLabel: input.backgroundCustomLabel ?? null,
    // EPIC-133 — new characters start synced at day 0 until first play touch
    lastActiveInGameDate: 0
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
       (id, campaign_id, name, class, stats, inventory, hp, xp, level, currency, kind, source_npc_id, portrait_path, sheet_background_path, guided_creation_phase, alignment, owner_player_character_id, race_key, background_key, background_story, background_custom_label)
     VALUES
       (@id, @campaignId, @name, @characterClass, @stats, @inventory, @hp, @xp, @level, @currency, @kind, @sourceNpcId, @portraitPath, @sheetBackgroundPath, @guidedCreationPhase, @alignment, @ownerPlayerCharacterId, @raceKey, @backgroundKey, @backgroundStory, @backgroundCustomLabel)`
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
    guidedCreationPhase: input.guidedCreationPhase ?? defaultGuidedPhase(input.kind),
    alignment: input.alignment ?? null,
    ownerPlayerCharacterId: input.ownerPlayerCharacterId ?? null,
    raceKey: input.raceKey ?? null,
    backgroundKey: input.backgroundKey ?? null,
    backgroundStory: input.backgroundStory ?? null,
    backgroundCustomLabel: input.backgroundCustomLabel ?? null
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

export interface MarkCharacterDeadInput {
  characterId: string
  deathCause: DeathCause | string
  obituary?: CharacterObituary | null
}

export function markCharacterDead(db: Database.Database, input: MarkCharacterDeadInput): void {
  const diedAt = new Date().toISOString()
  db.prepare(
    `UPDATE characters
     SET life_status = 'dead', died_at = ?, death_cause = ?, obituary_json = ?
     WHERE id = ?`
  ).run(
    diedAt,
    input.deathCause,
    input.obituary ? JSON.stringify(input.obituary) : null,
    input.characterId
  )
}

export function setCharacterObituary(
  db: Database.Database,
  characterId: string,
  obituary: CharacterObituary
): void {
  db.prepare('UPDATE characters SET obituary_json = ? WHERE id = ?').run(
    JSON.stringify(obituary),
    characterId
  )
}

export function listPartyMembersForPlayer(
  db: Database.Database,
  playerCharacterId: string
): Character[] {
  const player = getCharacterById(db, playerCharacterId)
  if (!player) {
    return []
  }
  const rows = db
    .prepare(
      `SELECT * FROM characters
       WHERE campaign_id = ? AND kind = 'ai_party_member'
         AND (owner_player_character_id = ? OR owner_player_character_id IS NULL)
       ORDER BY name`
    )
    .all(player.campaignId, playerCharacterId) as CharacterRow[]
  return rows.map(rowToCharacter)
}

export function transferPartyMemberOwnership(
  db: Database.Database,
  partyMemberId: string,
  newOwnerPlayerCharacterId: string
): void {
  db.prepare('UPDATE characters SET owner_player_character_id = ? WHERE id = ?').run(
    newOwnerPlayerCharacterId,
    partyMemberId
  )
}

export function listPlayerCharacters(db: Database.Database, campaignId: string): Character[] {
  return listCharactersByCampaign(db, campaignId).filter((character) => character.kind === 'player')
}

/** EPIC-133 — set per-PC last-active watermark to world day (monotonic). */
export function touchCharacterLastActiveInGameDate(
  db: Database.Database,
  characterId: string,
  worldDay: number
): void {
  db.prepare(
    `UPDATE characters
     SET last_active_in_game_date = MAX(COALESCE(last_active_in_game_date, 0), ?)
     WHERE id = ?`
  ).run(worldDay, characterId)
}
