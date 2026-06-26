import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type CharacterKind = 'player' | 'ai_party_member'

export interface Character {
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
    sheetBackgroundPath: row.sheet_background_path
  }
}

export function createCharacter(db: Database.Database, input: CreateCharacterInput): Character {
  const id = randomUUID()
  const stats = input.stats ?? {}
  const inventory = input.inventory ?? []
  const hp = input.hp ?? 0
  const xp = input.xp ?? 0
  const level = input.level ?? 1
  const currency = input.currency ?? 0
  const sourceNpcId = input.sourceNpcId ?? null
  const portraitPath = input.portraitPath ?? null
  const sheetBackgroundPath = input.sheetBackgroundPath ?? null

  db.prepare(
    `INSERT INTO characters
       (id, campaign_id, name, class, stats, inventory, hp, xp, level, currency, kind, source_npc_id, portrait_path, sheet_background_path)
     VALUES
       (@id, @campaignId, @name, @characterClass, @stats, @inventory, @hp, @xp, @level, @currency, @kind, @sourceNpcId, @portraitPath, @sheetBackgroundPath)`
  ).run({
    id,
    campaignId: input.campaignId,
    name: input.name,
    characterClass: input.characterClass,
    stats: JSON.stringify(stats),
    inventory: JSON.stringify(inventory),
    hp,
    xp,
    level,
    currency,
    kind: input.kind,
    sourceNpcId,
    portraitPath,
    sheetBackgroundPath
  })

  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    characterClass: input.characterClass,
    stats,
    inventory,
    hp,
    xp,
    level,
    currency,
    kind: input.kind,
    sourceNpcId,
    portraitPath,
    sheetBackgroundPath
  }
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
