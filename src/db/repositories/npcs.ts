import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Condition } from '../../engine/conditions'
import {
  getNpcCombatStats,
  getRetiredAdventurerCombatStats,
  parseDamageRoll,
  serializeDamageRoll
} from '../../engine/npcCombatStats'
import { computeRetiredAdventurerHp } from '../../engine/hp'
import type { Alignment, Temperament } from '../../shared/alignment/types'
import type { NpcYieldOutcome } from '../../shared/combat/types'
import type { NpcCombatTier, RetiredAdventurerProfile } from '../../shared/npcCombat/types'
import { isNpcCombatTier } from '../../shared/npcCombat/types'

export interface NpcStatus {
  alive: boolean
  location?: string
}

export interface Npc {
  id: string
  campaignId: string
  regionId: string
  name: string
  role: string
  disposition: string
  alignment: Alignment | null
  temperament: Temperament
  canSpeak: boolean
  status: NpcStatus
  isPartyMember: boolean
  backstory: string
  combatTier: NpcCombatTier
  retiredAdventurerProfile: RetiredAdventurerProfile | null
  hp: number | null
  maxHp: number | null
  ac: number | null
  attackBonus: number | null
  damageRoll: import('../../engine/damage').DamageRoll | null
  conditions: Condition[]
  catalogCreatureKey: string | null
  encounterOutcome: NpcYieldOutcome | null
  raceKey: string | null
  backgroundKey: string | null
  genderKey: string | null
  classKey: string | null
  speakingStyleSpecimen: string | null
  speakingStyleExamples: string[] | null
  bestiarySpeciesId: string | null
  bestiaryVariantKey: string | null
}

export interface CreateNpcInput {
  campaignId: string
  regionId: string
  name: string
  role: string
  disposition: string
  alignment?: Alignment | null
  temperament?: Temperament
  canSpeak?: boolean
  status?: NpcStatus
  backstory?: string
  catalogCreatureKey?: string | null
  skipCombatHydration?: boolean
  raceKey?: string | null
  backgroundKey?: string | null
  genderKey?: string | null
  classKey?: string | null
  speakingStyleSpecimen?: string | null
  speakingStyleExamples?: string[] | null
  bestiarySpeciesId?: string | null
  bestiaryVariantKey?: string | null
}

interface NpcRow {
  id: string
  campaign_id: string
  region_id: string
  name: string
  role: string
  disposition: string
  alignment: string | null
  temperament: string
  can_speak: number
  status: string
  is_party_member: number
  backstory: string | null
  combat_tier: string | null
  retired_adventurer_profile: string | null
  hp: number | null
  max_hp: number | null
  ac: number | null
  attack_bonus: number | null
  damage_roll: string | null
  conditions: string | null
  catalog_creature_key: string | null
  encounter_outcome: string | null
  race_key: string | null
  background_key: string | null
  gender_key: string | null
  class_key: string | null
  speaking_style_specimen: string | null
  speaking_style_examples_json: string | null
  bestiary_species_id: string | null
  bestiary_variant_key: string | null
}

function parseSpeakingStyleExamples(raw: string | null): string[] | null {
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null
    }
    if (!parsed.every((item) => typeof item === 'string' && item.length > 0)) {
      return null
    }
    return parsed as string[]
  } catch {
    return null
  }
}

function serializeSpeakingStyleExamples(examples: string[] | null): string | null {
  if (examples === null) {
    return null
  }
  return JSON.stringify(examples)
}

function parseNpcConditions(raw: string | null): Condition[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Condition[]) : []
  } catch {
    return []
  }
}

function speakingStyleFieldsFromRow(
  row: NpcRow
): Pick<Npc, 'speakingStyleSpecimen' | 'speakingStyleExamples'> {
  return {
    speakingStyleSpecimen: row.speaking_style_specimen ?? null,
    speakingStyleExamples: parseSpeakingStyleExamples(row.speaking_style_examples_json)
  }
}

function identityKeyFieldsFromRow(
  row: NpcRow
): Pick<Npc, 'raceKey' | 'backgroundKey' | 'genderKey' | 'classKey'> {
  return {
    raceKey: row.race_key ?? null,
    backgroundKey: row.background_key ?? null,
    genderKey: row.gender_key ?? null,
    classKey: row.class_key ?? null
  }
}

function bestiaryLinkFieldsFromRow(
  row: NpcRow
): Pick<Npc, 'bestiarySpeciesId' | 'bestiaryVariantKey'> {
  return {
    bestiarySpeciesId: row.bestiary_species_id ?? null,
    bestiaryVariantKey: row.bestiary_variant_key ?? null
  }
}

function rowToNpc(row: NpcRow): Npc {
  const combatTier = isNpcCombatTier(row.combat_tier) ? row.combat_tier : 'villager'
  const profile = row.retired_adventurer_profile as RetiredAdventurerProfile | null
  return {
    id: row.id,
    campaignId: row.campaign_id,
    regionId: row.region_id,
    name: row.name,
    role: row.role,
    disposition: row.disposition,
    alignment: (row.alignment as Alignment | null) ?? null,
    temperament: row.temperament as Temperament,
    canSpeak: row.can_speak === 1,
    status: JSON.parse(row.status) as NpcStatus,
    isPartyMember: row.is_party_member === 1,
    backstory: row.backstory ?? '',
    combatTier,
    retiredAdventurerProfile: profile,
    hp: row.hp,
    maxHp: row.max_hp,
    ac: row.ac,
    attackBonus: row.attack_bonus,
    damageRoll: row.damage_roll ? parseDamageRoll(row.damage_roll) : null,
    conditions: parseNpcConditions(row.conditions),
    catalogCreatureKey: row.catalog_creature_key,
    encounterOutcome: (row.encounter_outcome as NpcYieldOutcome | null) ?? null,
    ...identityKeyFieldsFromRow(row),
    ...speakingStyleFieldsFromRow(row),
    ...bestiaryLinkFieldsFromRow(row)
  }
}

const DEFAULT_STATUS: NpcStatus = { alive: true }

function applyTierStatsToRow(
  db: Database.Database,
  id: string,
  tier: Exclude<NpcCombatTier, 'catalog'>,
  profile?: RetiredAdventurerProfile | null
): void {
  if (tier === 'villager') {
    const stats = getNpcCombatStats('villager')
    db.prepare(
      `UPDATE npcs SET hp = ?, max_hp = ?, ac = ?, attack_bonus = ?, damage_roll = ?,
     combat_tier = ?, retired_adventurer_profile = ? WHERE id = ?`
    ).run(
      stats.hp,
      stats.maxHp,
      stats.ac,
      stats.attackBonus,
      serializeDamageRoll(stats.damageRoll),
      tier,
      profile ?? null,
      id
    )
    return
  }

  const combat = getRetiredAdventurerCombatStats(profile!)
  const hpResult = computeRetiredAdventurerHp(id, profile!)
  db.prepare(
    `UPDATE npcs SET hp = ?, max_hp = ?, ac = ?, attack_bonus = ?, damage_roll = ?,
     combat_tier = ?, retired_adventurer_profile = ? WHERE id = ?`
  ).run(
    hpResult.maxHp,
    hpResult.maxHp,
    combat.ac,
    combat.attackBonus,
    serializeDamageRoll(combat.damageRoll),
    tier,
    profile ?? null,
    id
  )
}

export function hydrateNpcVillagerTier(db: Database.Database, id: string): void {
  const npc = getNpcById(db, id)
  if (!npc || npc.catalogCreatureKey || npcHasCombatStats(npc)) {
    return
  }
  applyTierStatsToRow(db, id, 'villager')
}

export function applyRetiredAdventurerUpgrade(
  db: Database.Database,
  id: string,
  profile: RetiredAdventurerProfile
): void {
  const npc = getNpcById(db, id)
  if (!npc || npc.catalogCreatureKey || npc.combatTier === 'catalog') {
    return
  }
  if (npc.combatTier === 'retired_adventurer' && npc.retiredAdventurerProfile) {
    return
  }
  applyTierStatsToRow(db, id, 'retired_adventurer', profile)
}

function resolveNpcKeyDefaults(input: CreateNpcInput) {
  return {
    raceKey: input.raceKey ?? null,
    backgroundKey: input.backgroundKey ?? null,
    genderKey: input.genderKey ?? null,
    classKey: input.classKey ?? null,
    speakingStyleSpecimen: input.speakingStyleSpecimen ?? null,
    speakingStyleExamples: input.speakingStyleExamples ?? null,
    bestiarySpeciesId: input.bestiarySpeciesId ?? null,
    bestiaryVariantKey: input.bestiaryVariantKey ?? null
  }
}

function resolveCreateNpcDefaults(input: CreateNpcInput) {
  return {
    status: input.status ?? DEFAULT_STATUS,
    temperament: input.temperament ?? 'neutral',
    canSpeak: input.canSpeak ?? true,
    backstory: input.backstory ?? '',
    alignment: input.alignment ?? null,
    catalogCreatureKey: input.catalogCreatureKey ?? null,
    ...resolveNpcKeyDefaults(input)
  }
}

export function createNpc(db: Database.Database, input: CreateNpcInput): Npc {
  const id = randomUUID()
  const defaults = resolveCreateNpcDefaults(input)

  db.prepare(
    `INSERT INTO npcs (
      id, campaign_id, region_id, name, role, disposition, alignment, temperament,
      can_speak, status, is_party_member, backstory, catalog_creature_key, combat_tier,
      race_key, background_key, gender_key, class_key,
      speaking_style_specimen, speaking_style_examples_json,
      bestiary_species_id, bestiary_variant_key
    ) VALUES (
      @id, @campaignId, @regionId, @name, @role, @disposition, @alignment, @temperament,
      @canSpeak, @status, 0, @backstory, @catalogCreatureKey, 'villager',
      @raceKey, @backgroundKey, @genderKey, @classKey,
      @speakingStyleSpecimen, @speakingStyleExamplesJson,
      @bestiarySpeciesId, @bestiaryVariantKey
    )`
  ).run({
    id,
    campaignId: input.campaignId,
    regionId: input.regionId,
    name: input.name,
    role: input.role,
    disposition: input.disposition,
    alignment: defaults.alignment,
    temperament: defaults.temperament,
    canSpeak: defaults.canSpeak ? 1 : 0,
    status: JSON.stringify(defaults.status),
    backstory: defaults.backstory,
    catalogCreatureKey: defaults.catalogCreatureKey,
    raceKey: defaults.raceKey,
    backgroundKey: defaults.backgroundKey,
    genderKey: defaults.genderKey,
    classKey: defaults.classKey,
    speakingStyleSpecimen: defaults.speakingStyleSpecimen,
    speakingStyleExamplesJson: serializeSpeakingStyleExamples(defaults.speakingStyleExamples),
    bestiarySpeciesId: defaults.bestiarySpeciesId,
    bestiaryVariantKey: defaults.bestiaryVariantKey
  })

  if (!input.skipCombatHydration && !input.catalogCreatureKey) {
    hydrateNpcVillagerTier(db, id)
  }

  return getNpcById(db, id) as Npc
}

export function getNpcById(db: Database.Database, id: string): Npc | undefined {
  const row = db.prepare('SELECT * FROM npcs WHERE id = ?').get(id) as NpcRow | undefined
  return row ? rowToNpc(row) : undefined
}

export function listNpcsByRegion(db: Database.Database, regionId: string): Npc[] {
  const rows = db
    .prepare('SELECT * FROM npcs WHERE region_id = ? ORDER BY name')
    .all(regionId) as NpcRow[]
  return rows.map(rowToNpc)
}

export function updateNpcStatus(db: Database.Database, id: string, status: NpcStatus): void {
  db.prepare('UPDATE npcs SET status = ? WHERE id = ?').run(JSON.stringify(status), id)
}

export function markNpcPromoted(db: Database.Database, id: string): void {
  db.prepare('UPDATE npcs SET is_party_member = 1 WHERE id = ?').run(id)
}

export function updateNpcDisposition(db: Database.Database, id: string, disposition: string): void {
  db.prepare('UPDATE npcs SET disposition = ? WHERE id = ?').run(disposition, id)
}

export interface SetNpcBestiaryLinkInput {
  bestiarySpeciesId: string | null
  bestiaryVariantKey: string | null
}

export function setNpcBestiaryLink(
  db: Database.Database,
  id: string,
  input: SetNpcBestiaryLinkInput
): void {
  db.prepare(
    'UPDATE npcs SET bestiary_species_id = ?, bestiary_variant_key = ? WHERE id = ?'
  ).run(input.bestiarySpeciesId, input.bestiaryVariantKey, id)
}

export interface UpdateNpcTraitsInput {
  disposition?: string
  alignment?: Alignment | null
  temperament?: Temperament
  canSpeak?: boolean
}

export function updateNpcTraits(db: Database.Database, id: string, input: UpdateNpcTraitsInput): void {
  const npc = getNpcById(db, id)
  if (!npc) {
    return
  }
  db.prepare(
    `UPDATE npcs SET disposition = ?, alignment = ?, temperament = ?, can_speak = ? WHERE id = ?`
  ).run(
    input.disposition ?? npc.disposition,
    input.alignment !== undefined ? input.alignment : npc.alignment,
    input.temperament ?? npc.temperament,
    (input.canSpeak ?? npc.canSpeak) ? 1 : 0,
    id
  )
}

export interface NpcCombatStatsInput {
  hp: number
  maxHp: number
  ac: number
  attackBonus?: number
  damageRoll?: import('../../engine/damage').DamageRoll
  catalogCreatureKey?: string | null
  temperament?: Temperament
  canSpeak?: boolean
  combatTier?: NpcCombatTier
}

export function setNpcCombatStats(db: Database.Database, id: string, stats: NpcCombatStatsInput): void {
  const npc = getNpcById(db, id)
  if (!npc) {
    return
  }
  db.prepare(
    `UPDATE npcs SET hp = ?, max_hp = ?, ac = ?, attack_bonus = COALESCE(?, attack_bonus),
     damage_roll = COALESCE(?, damage_roll), catalog_creature_key = COALESCE(?, catalog_creature_key),
     combat_tier = COALESCE(?, combat_tier), temperament = COALESCE(?, temperament),
     can_speak = COALESCE(?, can_speak) WHERE id = ?`
  ).run(
    stats.hp,
    stats.maxHp,
    stats.ac,
    stats.attackBonus ?? null,
    stats.damageRoll ? serializeDamageRoll(stats.damageRoll) : null,
    stats.catalogCreatureKey ?? null,
    stats.combatTier ?? null,
    stats.temperament ?? null,
    stats.canSpeak === undefined ? null : stats.canSpeak ? 1 : 0,
    id
  )
}

export function applyNpcDamage(db: Database.Database, id: string, damage: number): number {
  const npc = getNpcById(db, id)
  if (!npc || npc.hp === null) {
    return 0
  }
  const hpAfter = Math.max(0, npc.hp - damage)
  db.prepare('UPDATE npcs SET hp = ? WHERE id = ?').run(hpAfter, id)
  return hpAfter
}

export function setNpcEncounterOutcome(
  db: Database.Database,
  id: string,
  outcome: NpcYieldOutcome
): void {
  const npc = getNpcById(db, id)
  if (!npc) {
    return
  }
  if (outcome === 'slain') {
    updateNpcStatus(db, id, { ...npc.status, alive: false })
  }
  db.prepare('UPDATE npcs SET encounter_outcome = ? WHERE id = ?').run(outcome, id)
}

export function npcHasCombatStats(npc: Npc): boolean {
  return npc.hp !== null && npc.maxHp !== null && npc.ac !== null
}

export function isHostileNpc(npc: Npc): boolean {
  return npc.disposition.toLowerCase().startsWith('hostile') && npc.status.alive
}

export function isNpcOutOfFight(npc: Npc): boolean {
  if (npc.encounterOutcome !== null) {
    return true
  }
  return npc.hp !== null && npc.hp <= 0
}

export function findNpcByNameInRegion(
  db: Database.Database,
  regionId: string,
  nameQuery: string
): Npc | undefined {
  const normalized = nameQuery.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }
  return listNpcsByRegion(db, regionId).find((npc) => npc.name.toLowerCase().includes(normalized))
}

export function isNpcAttackableInRegion(npc: Npc, regionId: string): boolean {
  return npc.regionId === regionId && npc.status.alive && !npc.isPartyMember
}
