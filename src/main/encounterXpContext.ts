import type Database from 'better-sqlite3'
import { getCreatureByKey } from '../db/catalog/creatures'
import { getCharacterById, listPartyMembersForPlayer } from '../db/repositories/characters'
import type { CombatEncounter } from '../shared/combat/types'
import { getNpcById } from '../db/repositories/npcs'
import type { Npc } from '../db/repositories/npcs'
import type { Bucket } from '../shared/catalogTaxonomy'
import type { NpcYieldOutcome } from '../shared/combat/types'
import type { XPContext, XpFoeSummary, XpPartyMemberSummary } from '../shared/progression/types'

export function summarizePartyMembers(
  db: Database.Database,
  playerCharacterId: string
): XpPartyMemberSummary[] {
  return listPartyMembersForPlayer(db, playerCharacterId).map((member) => ({
    archetype: member.characterClass,
    level: member.level
  }))
}

const XP_EARNING_OUTCOMES = new Set<NpcYieldOutcome>(['slain', 'incapacitated', 'surrender'])
const DEFAULT_BUCKET: Bucket[] = ['humanoid']

function getBucketsForNpc(db: Database.Database, npc: Npc): Bucket[] {
  if (!npc.catalogCreatureKey) {
    return DEFAULT_BUCKET
  }
  const creature = getCreatureByKey(db, npc.catalogCreatureKey)
  return creature?.buckets ?? DEFAULT_BUCKET
}

function npcToFoeSummary(db: Database.Database, npc: Npc): XpFoeSummary {
  return {
    npcId: npc.id,
    npcRole: npc.role,
    combatTier: npc.combatTier,
    buckets: getBucketsForNpc(db, npc),
    outcome: npc.encounterOutcome as NpcYieldOutcome
  }
}

function collectXpEarningFoes(db: Database.Database, encounter: CombatEncounter): XpFoeSummary[] {
  const foes: XpFoeSummary[] = []
  for (const ref of encounter.participantIds) {
    if (ref.kind !== 'npc') continue
    const npc = getNpcById(db, ref.id)
    if (!npc?.encounterOutcome) continue
    if (!XP_EARNING_OUTCOMES.has(npc.encounterOutcome)) continue
    foes.push(npcToFoeSummary(db, npc))
  }
  return foes
}

export interface AssembleEncounterXpContextParams {
  encounter: CombatEncounter
  campaignId: string
  playerCharacterId: string
  regionId: string
}

export function assembleEncounterXpContext(
  db: Database.Database,
  params: AssembleEncounterXpContextParams
): XPContext | null {
  const { encounter, campaignId, playerCharacterId, regionId } = params
  const character = getCharacterById(db, playerCharacterId)
  const playerLevel = character?.level ?? 1
  const foes = collectXpEarningFoes(db, encounter)
  if (foes.length === 0) {
    return null
  }
  return {
    source: 'encounter_end',
    foes,
    regionId,
    playerLevel,
    playerCharacterId,
    campaignId,
    partyMembers: summarizePartyMembers(db, playerCharacterId),
    roundCount: encounter.round
  }
}
