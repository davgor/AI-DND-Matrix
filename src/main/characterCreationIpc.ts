import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores } from '../engine/abilities'
import { createSeededRandom, rollForStats } from '../engine/abilities'
import type { Alignment } from '../shared/alignment/types'
import type { AbilityScoreMethod } from '../shared/characterSetup/abilityScoreMethod'
import { computeAC } from '../engine/armorClass'
import { computeMaxHpFromHitDice, hashStringSeed, rollInitialMaxHp, type Archetype } from '../engine/hp'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import { resolveOrRealizeCampaignRace } from '../agents/raceLore'
import type { Provider } from '../agents/providers/types'
import {
  createCharacter,
  getCharacterById,
  listCharactersByCampaign,
  type Character
} from '../db/repositories/characters'
import { buildAgentProvider } from './campaignIpc'
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
  raceKey: string
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

function createOnePartyMember(
  db: Database.Database,
  input: CreatePartyMembersInput,
  member: AiPartyMemberInput,
  owner: string | null
): Character {
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
    raceKey: member.raceKey,
    stats: {
      personality: member.personality,
      abilityScores,
      ac,
      maxHp,
      hitDieRolls
    }
  })
}

async function realizeDistinctRaceKeys(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  raceKeys: string[]
): Promise<void> {
  const seen = new Set<string>()
  for (const raceKey of raceKeys) {
    if (seen.has(raceKey)) {
      continue
    }
    await resolveOrRealizeCampaignRace(db, provider, { campaignId, raceKey })
    seen.add(raceKey)
  }
}

export async function createPartyMembers(
  db: Database.Database,
  provider: Provider,
  input: CreatePartyMembersInput
): Promise<Character[]> {
  const owner =
    input.ownerPlayerCharacterId === undefined ? null : input.ownerPlayerCharacterId
  await realizeDistinctRaceKeys(
    db,
    provider,
    input.campaignId,
    input.members.map((member) => member.raceKey)
  )
  return input.members.map((member) => createOnePartyMember(db, input, member, owner))
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
  if (!character || character.kind !== 'player' || !['race', 'equipment'].includes(character.guidedCreationPhase)) {
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

export async function replaceSetupPartyMembers(
  db: Database.Database,
  provider: Provider,
  input: ReplaceSetupPartyMembersInput
): Promise<Character[]> {
  const existing = listSetupPartyMembers(db, input.campaignId, input.playerCharacterId)
  const owner = resolveSetupPartyOwner(existing, input.playerCharacterId)
  await realizeDistinctRaceKeys(
    db,
    provider,
    input.campaignId,
    input.members.map((member) => member.raceKey)
  )

  return db.transaction(() => {
    for (const member of existing) {
      db.prepare('DELETE FROM characters WHERE id = ?').run(member.id)
    }
    const createInput: CreatePartyMembersInput = {
      campaignId: input.campaignId,
      ownerPlayerCharacterId: owner,
      members: input.members
    }
    return input.members.map((member) => createOnePartyMember(db, createInput, member, owner))
  })()
}

export function registerCharacterCreationHandlers(): void {
  ipcMain.handle('characters:createPlayer', (_event, input: CreatePlayerCharacterInput) =>
    createPlayerCharacter(getDb(), input)
  )
  ipcMain.handle('characters:createPartyMembers', async (_event, input: CreatePartyMembersInput) =>
    createPartyMembers(getDb(), buildAgentProvider(), input)
  )
  ipcMain.handle('characters:updatePlayerSetup', (_event, input: UpdatePlayerCharacterSetupInput) =>
    updatePlayerCharacterSetup(getDb(), input)
  )
  ipcMain.handle('characters:replaceSetupPartyMembers', async (_event, input: ReplaceSetupPartyMembersInput) =>
    replaceSetupPartyMembers(getDb(), buildAgentProvider(), input)
  )
  ipcMain.handle('characters:listByCampaign', (_event, campaignId: string) =>
    listCharactersByCampaign(getDb(), campaignId)
  )
}
