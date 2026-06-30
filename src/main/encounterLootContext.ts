import type Database from 'better-sqlite3'
import { getCreatureByKey } from '../db/catalog/creatures'
import { getCharacterById } from '../db/repositories/characters'
import type { CombatEncounter } from '../shared/combat/types'
import { getNpcById } from '../db/repositories/npcs'
import type { Npc } from '../db/repositories/npcs'
import type { Bucket } from '../shared/catalogTaxonomy'
import type { FoeSummary, LootContext } from '../shared/loot/types'
import type { NpcYieldOutcome } from '../shared/combat/types'

const LOOTABLE_OUTCOMES = new Set<NpcYieldOutcome>(['slain', 'incapacitated', 'surrender'])

const DEFAULT_BUCKET: Bucket[] = ['humanoid']

function getBucketsForNpc(db: Database.Database, npc: Npc): Bucket[] {
  if (!npc.catalogCreatureKey) {
    return DEFAULT_BUCKET
  }
  const creature = getCreatureByKey(db, npc.catalogCreatureKey)
  return creature?.buckets ?? DEFAULT_BUCKET
}

function npcToFoeSummary(db: Database.Database, npc: Npc): FoeSummary {
  return {
    npcId: npc.id,
    npcRole: npc.role,
    combatTier: npc.combatTier,
    buckets: getBucketsForNpc(db, npc),
    outcome: npc.encounterOutcome as NpcYieldOutcome
  }
}

function collectLootableFoes(
  db: Database.Database,
  encounter: CombatEncounter
): FoeSummary[] {
  const foes: FoeSummary[] = []
  for (const ref of encounter.participantIds) {
    if (ref.kind !== 'npc') continue
    const npc = getNpcById(db, ref.id)
    if (!npc?.encounterOutcome) continue
    if (!LOOTABLE_OUTCOMES.has(npc.encounterOutcome)) continue
    foes.push(npcToFoeSummary(db, npc))
  }
  return foes
}

export interface AssembleEncounterLootContextParams {
  encounter: CombatEncounter
  campaignId: string
  playerCharacterId: string
  regionId: string
}

export function assembleEncounterLootContext(
  db: Database.Database,
  params: AssembleEncounterLootContextParams
): LootContext {
  const { encounter, campaignId, playerCharacterId, regionId } = params
  const character = getCharacterById(db, playerCharacterId)
  const playerLevel = character?.level ?? 1
  const foes = collectLootableFoes(db, encounter)
  return {
    source: 'encounter_end',
    foes,
    regionId,
    playerLevel,
    playerCharacterId,
    campaignId
  }
}
