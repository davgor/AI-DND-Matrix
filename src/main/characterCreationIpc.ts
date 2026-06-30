import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import { createSeededRandom, rollForStats } from '../engine/abilities'
import type { Alignment } from '../shared/alignment/types'
import { computeAC } from '../engine/armorClass'
import { hashStringSeed, rollInitialMaxHp, type Archetype } from '../engine/hp'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import {
  createCharacter,
  listCharactersByCampaign,
  type Character
} from '../db/repositories/characters'
import { getDb } from './db'

const STARTING_CURRENCY = 100
const STARTING_LEVEL = 1

export interface CreatePlayerCharacterInput {
  campaignId: string
  name: string
  archetype: Archetype
  abilityScores: AbilityScores
  alignment: Alignment
  portraitPath?: string | null
  sheetBackgroundPath?: string | null
}

export function createPlayerCharacter(
  db: Database.Database,
  input: CreatePlayerCharacterInput
): Character {
  const { maxHp, hitDieRolls } = rollInitialMaxHp(input.archetype, input.abilityScores.body, Math.random)
  const ac = computeAC(input.abilityScores.agility, 'none')

  return createCharacter(db, {
    campaignId: input.campaignId,
    name: input.name,
    characterClass: input.archetype,
    kind: 'player',
    stats: { abilityScores: input.abilityScores, ac, maxHp, hitDieRolls },
    hp: maxHp,
    level: STARTING_LEVEL,
    currency: STARTING_CURRENCY,
    portraitPath: input.portraitPath ?? null,
    sheetBackgroundPath: input.sheetBackgroundPath ?? null,
    alignment: input.alignment
  })
}

export interface AiPartyMemberInput {
  name: string
  characterClass: string
  personality: string
}

export interface CreatePartyMembersInput {
  campaignId: string
  members: AiPartyMemberInput[]
  /**
   * `null` = shared roster member (first character setup).
   * Set to a player character id when creating owned members for that protagonist.
   */
  ownerPlayerCharacterId?: string | null
}

export function createPartyMembers(
  db: Database.Database,
  input: CreatePartyMembersInput
): Character[] {
  const owner =
    input.ownerPlayerCharacterId === undefined ? null : input.ownerPlayerCharacterId
  return input.members.map((member) => {
    const rng = createSeededRandom(hashStringSeed(`${input.campaignId}:${member.name}`))
    const abilityScores = rollForStats(rng)
    const archetype = inferArchetypeFromClassOrRole(member.characterClass)
    const { maxHp, hitDieRolls } = rollInitialMaxHp(archetype, abilityScores.body, rng)
    const ac = computeAC(abilityScores.agility, 'none')

    return createCharacter(db, {
      campaignId: input.campaignId,
      name: member.name,
      characterClass: member.characterClass,
      kind: 'ai_party_member',
      ownerPlayerCharacterId: owner,
      level: STARTING_LEVEL,
      hp: maxHp,
      stats: {
        personality: member.personality,
        abilityScores,
        ac,
        maxHp,
        hitDieRolls
      }
    })
  })
}

export function registerCharacterCreationHandlers(): void {
  ipcMain.handle('characters:createPlayer', (_event, input: CreatePlayerCharacterInput) =>
    createPlayerCharacter(getDb(), input)
  )
  ipcMain.handle('characters:createPartyMembers', (_event, input: CreatePartyMembersInput) =>
    createPartyMembers(getDb(), input)
  )
  ipcMain.handle('characters:listByCampaign', (_event, campaignId: string) =>
    listCharactersByCampaign(getDb(), campaignId)
  )
}
