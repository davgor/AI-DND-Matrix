import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import { createSeededRandom, rollForStats } from '../engine/abilities'
import type { Alignment } from '../shared/alignment/types'
import type { AbilityScoreMethod } from '../shared/characterSetup/abilityScoreMethod'
import { computeAC } from '../engine/armorClass'
import { computeMaxHpFromHitDice, hashStringSeed, rollInitialMaxHp, type Archetype } from '../engine/hp'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import {
  createCharacter,
  getCharacterById,
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
  abilityScoreMethod?: AbilityScoreMethod
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
    stats: {
      abilityScores: input.abilityScores,
      abilityScoreMethod: input.abilityScoreMethod ?? 'pointBuy',
      ac,
      maxHp,
      hitDieRolls
    },
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

export interface UpdatePlayerCharacterSetupInput {
  characterId: string
  name: string
  archetype: Archetype
  abilityScores: AbilityScores
  abilityScoreMethod: AbilityScoreMethod
  alignment: Alignment
  portraitPath?: string | null
  sheetBackgroundPath?: string | null
}

export function updatePlayerCharacterSetup(
  db: Database.Database,
  input: UpdatePlayerCharacterSetupInput
): Character {
  const character = getCharacterById(db, input.characterId)
  if (!character || character.kind !== 'player' || character.guidedCreationPhase !== 'equipment') {
    throw new Error('invalid_setup_update')
  }

  const stats = character.stats as {
    hitDieRolls?: number[]
    [key: string]: unknown
  }
  const hitDieRolls = stats.hitDieRolls?.length ? stats.hitDieRolls : [1]
  const maxHp = computeMaxHpFromHitDice(input.abilityScores.body, hitDieRolls)
  const ac = computeAC(input.abilityScores.agility, 'none')
  const nextStats = {
    ...stats,
    abilityScores: input.abilityScores,
    abilityScoreMethod: input.abilityScoreMethod,
    ac,
    maxHp,
    hitDieRolls
  }

  db.prepare(
    `UPDATE characters
     SET name = ?, class = ?, alignment = ?, portrait_path = ?, sheet_background_path = ?, stats = ?, hp = ?
     WHERE id = ?`
  ).run(
    input.name,
    input.archetype,
    input.alignment,
    input.portraitPath ?? null,
    input.sheetBackgroundPath ?? null,
    JSON.stringify(nextStats),
    maxHp,
    input.characterId
  )

  return getCharacterById(db, input.characterId)!
}

export interface ReplaceSetupPartyMembersInput {
  campaignId: string
  playerCharacterId: string
  members: AiPartyMemberInput[]
}

function listSetupPartyMembers(
  db: Database.Database,
  campaignId: string,
  playerCharacterId: string
): Character[] {
  return listCharactersByCampaign(db, campaignId).filter(
    (character) =>
      character.kind === 'ai_party_member' &&
      (character.ownerPlayerCharacterId === null ||
        character.ownerPlayerCharacterId === playerCharacterId)
  )
}

function resolveSetupPartyOwner(existingMembers: Character[], playerCharacterId: string): string | null {
  if (existingMembers.some((member) => member.ownerPlayerCharacterId === playerCharacterId)) {
    return playerCharacterId
  }
  return null
}

export function replaceSetupPartyMembers(
  db: Database.Database,
  input: ReplaceSetupPartyMembersInput
): Character[] {
  const existing = listSetupPartyMembers(db, input.campaignId, input.playerCharacterId)
  const owner = resolveSetupPartyOwner(existing, input.playerCharacterId)

  return db.transaction(() => {
    for (const member of existing) {
      db.prepare('DELETE FROM characters WHERE id = ?').run(member.id)
    }
    return createPartyMembers(db, {
      campaignId: input.campaignId,
      ownerPlayerCharacterId: owner,
      members: input.members
    })
  })()
}

export function registerCharacterCreationHandlers(): void {
  ipcMain.handle('characters:createPlayer', (_event, input: CreatePlayerCharacterInput) =>
    createPlayerCharacter(getDb(), input)
  )
  ipcMain.handle('characters:createPartyMembers', (_event, input: CreatePartyMembersInput) =>
    createPartyMembers(getDb(), input)
  )
  ipcMain.handle('characters:updatePlayerSetup', (_event, input: UpdatePlayerCharacterSetupInput) =>
    updatePlayerCharacterSetup(getDb(), input)
  )
  ipcMain.handle('characters:replaceSetupPartyMembers', (_event, input: ReplaceSetupPartyMembersInput) =>
    replaceSetupPartyMembers(getDb(), input)
  )
  ipcMain.handle('characters:listByCampaign', (_event, campaignId: string) =>
    listCharactersByCampaign(getDb(), campaignId)
  )
}
