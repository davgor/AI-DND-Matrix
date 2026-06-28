import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import { computeAC } from '../engine/armorClass'
import { computeHP, type Archetype } from '../engine/hp'
import { createCharacter } from '../db/repositories/characters'
import { getNpcById, markNpcPromoted } from '../db/repositories/npcs'
import { getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

const STARTING_LEVEL = 1

// Deterministic, engine-owned defaults — never invented by an agent. Every promoted
// NPC starts from the same baseline array; the only persona-derived input is the
// archetype inferred from its role below.
const DEFAULT_PROMOTED_ABILITY_SCORES: AbilityScores = { body: 15, agility: 14, mind: 13, presence: 12 }

const ROLE_ARCHETYPE_KEYWORDS: Array<[string, Archetype]> = [
  ['guard', 'fighter'],
  ['soldier', 'fighter'],
  ['warrior', 'fighter'],
  ['knight', 'fighter'],
  ['thief', 'rogue'],
  ['shopkeeper', 'rogue'],
  ['merchant', 'rogue'],
  ['scout', 'ranger'],
  ['hunter', 'ranger'],
  ['ranger', 'ranger'],
  ['priest', 'cleric'],
  ['healer', 'cleric'],
  ['cleric', 'cleric'],
  ['scholar', 'mage'],
  ['wizard', 'mage'],
  ['sage', 'mage'],
  ['mage', 'mage']
]
const DEFAULT_PROMOTED_ARCHETYPE: Archetype = 'fighter'

export function inferArchetypeFromRole(role: string): Archetype {
  const normalized = role.toLowerCase()
  const match = ROLE_ARCHETYPE_KEYWORDS.find(([keyword]) => normalized.includes(keyword))
  return match ? match[1] : DEFAULT_PROMOTED_ARCHETYPE
}

export interface PromoteNpcInput {
  campaignId: string
  npcId: string
}

export function confirmNpcPromotion(db: Database.Database, input: PromoteNpcInput): CampaignDetail {
  const npc = getNpcById(db, input.npcId)
  if (!npc) {
    throw new Error(`NPC ${input.npcId} not found`)
  }

  const archetype = inferArchetypeFromRole(npc.role)
  const abilityScores = DEFAULT_PROMOTED_ABILITY_SCORES
  const hp = computeHP(archetype, STARTING_LEVEL, abilityScores.body)
  const ac = computeAC(abilityScores.agility, 'none')

  createCharacter(db, {
    campaignId: input.campaignId,
    name: npc.name,
    characterClass: archetype,
    kind: 'ai_party_member',
    sourceNpcId: npc.id,
    level: STARTING_LEVEL,
    hp,
    stats: { abilityScores, ac, personality: npc.disposition }
  })

  markNpcPromoted(db, npc.id)

  return getCampaignDetail(db, input.campaignId)
}

export function registerPromotionHandlers(): void {
  ipcMain.handle('campaigns:confirmPromotion', (_event, input: PromoteNpcInput) =>
    confirmNpcPromotion(getDb(), input)
  )
}
