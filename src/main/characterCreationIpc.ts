import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import { computeAC } from '../engine/armorClass'
import { computeHP, type Archetype } from '../engine/hp'
import { createCharacter, type Character } from '../db/repositories/characters'
import { getDb } from './db'

const STARTING_CURRENCY = 100
const STARTING_LEVEL = 1

export interface CreatePlayerCharacterInput {
  campaignId: string
  name: string
  archetype: Archetype
  abilityScores: AbilityScores
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
    sheetBackgroundPath: input.sheetBackgroundPath ?? null
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
}

export function createPartyMembers(
  db: Database.Database,
  input: CreatePartyMembersInput
): Character[] {
  return input.members.map((member) =>
    createCharacter(db, {
      campaignId: input.campaignId,
      name: member.name,
      characterClass: member.characterClass,
      kind: 'ai_party_member',
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
}
