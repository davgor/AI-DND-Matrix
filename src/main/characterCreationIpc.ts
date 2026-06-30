import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import type { Alignment } from '../shared/alignment/types'
import { computeAC } from '../engine/armorClass'
import { computeHP, type Archetype } from '../engine/hp'
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
  const hp = computeHP(input.archetype, STARTING_LEVEL, input.abilityScores.body)
  const ac = computeAC(input.abilityScores.agility, 'none')

  return createCharacter(db, {
    campaignId: input.campaignId,
    name: input.name,
    characterClass: input.archetype,
    kind: 'player',
    stats: { abilityScores: input.abilityScores, ac },
    hp,
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
  return input.members.map((member) =>
    createCharacter(db, {
      campaignId: input.campaignId,
      name: member.name,
      characterClass: member.characterClass,
      kind: 'ai_party_member',
      ownerPlayerCharacterId: owner,
      stats: { personality: member.personality }
    })
  )
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
