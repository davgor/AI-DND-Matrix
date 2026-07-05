import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import { createSeededRandom } from '../engine/abilities'
import { computeAC } from '../engine/armorClass'
import { hashStringSeed, rollInitialMaxHp, type Archetype } from '../engine/hp'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import {
  createCharacter,
  getCharacterById,
  transferPartyMemberOwnership
} from '../db/repositories/characters'
import { getNpcById, markNpcPromoted } from '../db/repositories/npcs'
import { getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

const STARTING_LEVEL = 1

// Deterministic, engine-owned defaults — never invented by an agent. Every promoted
// NPC starts from the same baseline array; the only persona-derived input is the
// archetype inferred from its role below.
const DEFAULT_PROMOTED_ABILITY_SCORES: AbilityScores = { body: 15, agility: 14, mind: 13, presence: 12 }

export function inferArchetypeFromRole(role: string): Archetype {
  return inferArchetypeFromClassOrRole(role)
}

export interface PromoteNpcInput {
  campaignId: string
  npcId: string
  recruitingPlayerCharacterId?: string
}

export interface RecruitPartyMemberInput {
  partyMemberId: string
  recruitingPlayerCharacterId: string
}

export function recruitPartyMemberFromRoster(
  db: Database.Database,
  input: RecruitPartyMemberInput
): CampaignDetail {
  const member = getCharacterById(db, input.partyMemberId)
  if (!member || member.kind !== 'ai_party_member') {
    throw new Error(`Party member ${input.partyMemberId} not found`)
  }
  transferPartyMemberOwnership(db, input.partyMemberId, input.recruitingPlayerCharacterId)
  return getCampaignDetail(db, member.campaignId)
}

export function confirmNpcPromotion(db: Database.Database, input: PromoteNpcInput): CampaignDetail {
  const npc = getNpcById(db, input.npcId)
  if (!npc) {
    throw new Error(`NPC ${input.npcId} not found`)
  }

  const archetype = inferArchetypeFromRole(npc.role)
  const abilityScores = DEFAULT_PROMOTED_ABILITY_SCORES
  const rng = createSeededRandom(hashStringSeed(`${npc.id}:promotion`))
  const { maxHp, hitDieRolls } = rollInitialMaxHp(archetype, abilityScores.body, rng)
  const ac = computeAC(abilityScores.agility, 'none')

  createCharacter(db, {
    campaignId: input.campaignId,
    name: npc.name,
    characterClass: archetype,
    kind: 'ai_party_member',
    sourceNpcId: npc.id,
    level: STARTING_LEVEL,
    hp: maxHp,
    alignment: npc.alignment,
    ownerPlayerCharacterId: input.recruitingPlayerCharacterId ?? null,
    raceKey: npc.raceKey,
    stats: {
      abilityScores,
      ac,
      maxHp,
      hitDieRolls,
      personality: npc.disposition,
      temperament: npc.temperament
    }
  })

  markNpcPromoted(db, npc.id)

  return getCampaignDetail(db, input.campaignId)
}

export function registerPromotionHandlers(): void {
  ipcMain.handle('campaigns:confirmPromotion', (_event, input: PromoteNpcInput) =>
    confirmNpcPromotion(getDb(), input)
  )
  ipcMain.handle('campaigns:recruitPartyMember', (_event, input: RecruitPartyMemberInput) =>
    recruitPartyMemberFromRoster(getDb(), input)
  )
}
