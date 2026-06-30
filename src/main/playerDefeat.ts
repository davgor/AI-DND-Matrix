import type Database from 'better-sqlite3'
import type { DeathMode } from '../db/repositories/campaigns'
import { getCharacterById, updateCharacter, type Character } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { getNpcById } from '../db/repositories/npcs'
import { restoreLatestSave } from '../db/repositories/saves'
import type { DefeatDisposition, NpcDefeatOutcome } from '../shared/npcCombat/types'
import type { DefeatDispositionProposal } from '../shared/npcCombat/types'

export interface PlayerDefeatState {
  disposition: DefeatDisposition
  victorNpcId: string
  locationTag?: string
  resolvedAt: string
  narrativeSummary: string
  imprisoned?: boolean
  buried?: boolean
  awaitingRansom?: boolean
}

function getStats(character: Character): Record<string, unknown> {
  return character.stats as Record<string, unknown>
}

export function getPlayerDefeatState(character: Character): PlayerDefeatState | null {
  const state = getStats(character).playerDefeatState
  if (!state || typeof state !== 'object') {
    return null
  }
  return state as PlayerDefeatState
}

export function isPlayerImprisoned(character: Character): boolean {
  return getPlayerDefeatState(character)?.imprisoned === true
}

function persistDefeatState(
  db: Database.Database,
  characterId: string,
  state: PlayerDefeatState
): void {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return
  }
  updateCharacter(db, characterId, {
    stats: { ...getStats(character), playerDefeatState: state }
  })
}

function clearDefeatState(db: Database.Database, characterId: string): void {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return
  }
  const { playerDefeatState: _removed, ...rest } = getStats(character)
  updateCharacter(db, characterId, { stats: rest })
}

export interface ApplyDefeatInput {
  db: Database.Database
  campaignId: string
  characterId: string
  victorNpcId: string
  proposal: DefeatDispositionProposal
  deathMode: DeathMode
}

export interface DefeatApplicationResult {
  outcome: NpcDefeatOutcome
  narrationText: string
  dyingResolution?: { status: string; message: string }
}

const REVERT_DEATH_MESSAGE =
  'Reality rewinds before the fatal blow — you wake as if the fight never happened.'

function revertStandardDeath(
  db: Database.Database,
  campaignId: string,
  characterId: string
): DefeatApplicationResult['dyingResolution'] {
  restoreLatestSave(db, campaignId)
  clearDefeatState(db, characterId)
  return { status: 'reverted', message: REVERT_DEATH_MESSAGE }
}

function storeDispositionState(
  db: Database.Database,
  characterId: string,
  base: PlayerDefeatState,
  disposition: DefeatDisposition
): Pick<PlayerDefeatState, 'imprisoned' | 'buried' | 'awaitingRansom'> {
  if (disposition === 'imprison') {
    persistDefeatState(db, characterId, { ...base, imprisoned: true })
    return { imprisoned: true }
  }
  if (disposition === 'ransom') {
    persistDefeatState(db, characterId, { ...base, awaitingRansom: true })
    return { awaitingRansom: true }
  }
  if (disposition === 'bury_out_back') {
    persistDefeatState(db, characterId, { ...base, buried: true })
    return { buried: true }
  }
  clearDefeatState(db, characterId)
  return {}
}

function resolveFatalDeathMode(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  character: Character
  disposition: DefeatDisposition
  deathMode: DeathMode
}): DefeatApplicationResult['dyingResolution'] {
  const { db, campaignId, characterId, character, disposition, deathMode } = input
  if (disposition === 'bury_out_back' && deathMode === 'standard') {
    return revertStandardDeath(db, campaignId, characterId)
  }
  if (disposition !== 'execute') {
    return undefined
  }
  if (deathMode === 'legendary') {
    clearDefeatState(db, characterId)
    return { status: 'permanently_dead', message: `${character.name} does not rise again.` }
  }
  if (deathMode === 'standard') {
    return revertStandardDeath(db, campaignId, characterId)
  }
  return undefined
}

export function applyPlayerDefeatOutcome(input: ApplyDefeatInput): DefeatApplicationResult {
  const { db, campaignId, characterId, victorNpcId, proposal, deathMode } = input
  const character = getCharacterById(db, characterId)
  const victor = getNpcById(db, victorNpcId)
  if (!character || !victor) {
    throw new Error('Missing character or victor for defeat outcome')
  }

  const resolvedAt = new Date().toISOString()
  const base: PlayerDefeatState = {
    disposition: proposal.disposition,
    victorNpcId,
    locationTag: proposal.locationTag,
    resolvedAt,
    narrativeSummary: proposal.narrationText
  }
  const flags = storeDispositionState(db, characterId, base, proposal.disposition)
  const dyingResolution = resolveFatalDeathMode({
    db,
    campaignId,
    characterId,
    character,
    disposition: proposal.disposition,
    deathMode
  })

  appendEvent(db, {
    campaignId,
    type: 'player_defeated',
    payload: {
      characterId,
      victorNpcId,
      disposition: proposal.disposition,
      narrationText: proposal.narrationText,
      locationTag: proposal.locationTag
    }
  })

  return {
    outcome: {
      disposition: proposal.disposition,
      victorNpcId,
      locationTag: proposal.locationTag,
      narrativeSummary: proposal.narrationText,
      resolvedAt,
      ...flags
    },
    narrationText: proposal.narrationText,
    dyingResolution
  }
}
