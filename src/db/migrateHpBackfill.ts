import type Database from 'better-sqlite3'
import { createSeededRandom, rollForStats } from '../engine/abilities'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import {
  computeCatalogMonsterHp,
  computeRetiredAdventurerHp,
  hashStringSeed,
  rollMaxHpForLevel,
  VILLAGER_MAX_HP
} from '../engine/hp'
import { parseCharacterHpStats } from '../shared/hp/types'
import type { CombatantRef } from '../shared/combat/types'
import { getCreatureByKey } from './catalog/creatures'

function getNpcIdsInActiveCombat(db: Database.Database): Set<string> {
  const rows = db
    .prepare(`SELECT participant_ids FROM combat_encounters WHERE phase = 'active'`)
    .all() as Array<{ participant_ids: string }>
  const ids = new Set<string>()
  for (const row of rows) {
    const participants = JSON.parse(row.participant_ids) as CombatantRef[]
    for (const participant of participants) {
      if (participant.kind === 'npc') {
        ids.add(participant.id)
      }
    }
  }
  return ids
}

function backfillCharacterRow(
  db: Database.Database,
  row: {
    id: string
    class: string
    stats: string
    hp: number
    level: number
  }
): void {
  const stats = JSON.parse(row.stats) as Record<string, unknown>
  const parsed = parseCharacterHpStats(stats)
  if (typeof parsed?.maxHp === 'number' && parsed.maxHp > 0 && row.hp > 0) {
    return
  }

  const abilityScores =
    parsed?.abilityScores ??
    rollForStats(createSeededRandom(hashStringSeed(`${row.id}:abilities-migrate`)))
  const archetype = inferArchetypeFromClassOrRole(row.class)
  const rng = createSeededRandom(hashStringSeed(`${row.id}:hp-migrate`))
  const rolled = rollMaxHpForLevel(archetype, row.level || 1, abilityScores.body, rng)
  const maxHp = rolled.maxHp
  const hp = row.hp === 0 ? maxHp : Math.min(row.hp, maxHp)

  db.prepare(`UPDATE characters SET hp = ?, stats = ? WHERE id = ?`).run(
    hp,
    JSON.stringify({ ...stats, abilityScores, maxHp, hitDieRolls: rolled.hitDieRolls }),
    row.id
  )
}

const LEGACY_RETIRED_MAX_HP = [22, 18, 28] as const

function backfillVillagerNpc(
  db: Database.Database,
  row: { id: string; max_hp: number | null; hp: number | null }
): boolean {
  if (row.max_hp !== 6) {
    return false
  }
  const hp = row.hp === row.max_hp ? VILLAGER_MAX_HP : Math.min((row.hp ?? 0) + 4, VILLAGER_MAX_HP)
  db.prepare(`UPDATE npcs SET hp = ?, max_hp = ? WHERE id = ?`).run(hp, VILLAGER_MAX_HP, row.id)
  return true
}

function backfillCatalogNpc(
  db: Database.Database,
  row: { id: string; max_hp: number | null; catalog_creature_key: string }
): boolean {
  if (row.max_hp !== null && row.max_hp > 1) {
    return false
  }
  const creature = getCreatureByKey(db, row.catalog_creature_key)
  if (!creature) {
    return false
  }
  const computed = computeCatalogMonsterHp({
    npcId: row.id,
    catalogKey: row.catalog_creature_key,
    archetypeHint: creature.archetypeHint,
    levelMin: creature.levelMin,
    levelMax: creature.levelMax,
    bodyScore: creature.abilities.body
  })
  db.prepare(`UPDATE npcs SET hp = ?, max_hp = ? WHERE id = ?`).run(computed.maxHp, computed.maxHp, row.id)
  return true
}

function backfillRetiredNpc(
  db: Database.Database,
  row: {
    id: string
    max_hp: number | null
    hp: number | null
    retired_adventurer_profile: string
  }
): boolean {
  if (
    row.max_hp !== null &&
    row.max_hp > 1 &&
    !LEGACY_RETIRED_MAX_HP.includes(row.max_hp as (typeof LEGACY_RETIRED_MAX_HP)[number])
  ) {
    return false
  }
  const profile = row.retired_adventurer_profile as 'brawler' | 'skirmisher' | 'veteran'
  const computed = computeRetiredAdventurerHp(row.id, profile)
  const hp = row.hp === null || row.hp === 0 ? computed.maxHp : Math.min(row.hp, computed.maxHp)
  db.prepare(`UPDATE npcs SET hp = ?, max_hp = ? WHERE id = ?`).run(hp, computed.maxHp, row.id)
  return true
}

function backfillNpcRow(
  db: Database.Database,
  row: {
    id: string
    max_hp: number | null
    hp: number | null
    combat_tier: string | null
    retired_adventurer_profile: string | null
    catalog_creature_key: string | null
  },
  skipIds: Set<string>
): void {
  if (skipIds.has(row.id)) {
    return
  }
  if (row.combat_tier === 'villager' && backfillVillagerNpc(db, row)) {
    return
  }
  if (row.catalog_creature_key && backfillCatalogNpc(db, { ...row, catalog_creature_key: row.catalog_creature_key })) {
    return
  }
  if (row.combat_tier === 'retired_adventurer' && row.retired_adventurer_profile) {
    backfillRetiredNpc(db, { ...row, retired_adventurer_profile: row.retired_adventurer_profile })
  }
}

export function migrateHpBackfill(db: Database.Database): void {
  const skipNpcIds = getNpcIdsInActiveCombat(db)

  const characters = db.prepare(`SELECT id, class, stats, hp, level FROM characters`).all() as Array<{
    id: string
    class: string
    stats: string
    hp: number
    level: number
  }>
  for (const row of characters) {
    backfillCharacterRow(db, row)
  }

  const npcs = db
    .prepare(
      `SELECT id, max_hp, hp, combat_tier, retired_adventurer_profile, catalog_creature_key FROM npcs`
    )
    .all() as Array<{
    id: string
    max_hp: number | null
    hp: number | null
    combat_tier: string | null
    retired_adventurer_profile: string | null
    catalog_creature_key: string | null
  }>
  for (const row of npcs) {
    backfillNpcRow(db, row, skipNpcIds)
  }
}
