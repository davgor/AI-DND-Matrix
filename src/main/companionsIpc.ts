import type Database from 'better-sqlite3'

import { ipcMain } from 'electron'

import { generateCompanionPreview } from '../agents/companionGenerate'

import type { Provider } from '../agents/providers/types'

import {

  getCharacterById,

  listPartyMembersForPlayer,

  updateCharacter

} from '../db/repositories/characters'

import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'

import {

  buildCompanionOrderStance,

  COMPANION_ONBOARDING_MAX,

  companionRosterEntryFromMember,

  isCompanionPreviewDto,

  type CompanionPreviewDto,

  type CompanionRosterEntry

} from '../shared/partyMembers/types'

import { buildAgentProvider } from './campaignIpc'

import { grantCompanionInventoryOnAccept } from './companionStarterGear'

import {

  buildCompanionGeneratePcContext,

  resolveCompanionKnownInventoryItemIds,

  resolveCompanionKnownRaceKeys

} from './companionsContext'

import { createPartyMembers } from './characterCreationIpc'

import { getDb } from './db'



export interface CompanionsSkipInput {

  characterId: string

}



export type CompanionsSkipResult =

  | { ok: true }

  | { ok: false; reason: 'not_found' | 'invalid_phase' }



export interface CompanionsGenerateInput {

  campaignId: string

  characterId: string

  prompt: string

}



export interface CompanionsAcceptInput {

  campaignId: string

  characterId: string

  preview: CompanionPreviewDto

}



export type CompanionsAcceptResult =

  | { ok: true }

  | { ok: false; reason: 'not_found' | 'invalid_phase' | 'roster_full' | 'invalid_preview' }



export interface CompanionsSetOrderInput {

  companionId: string

  text: string

}



export type CompanionsSetOrderResult =

  | { ok: true }

  | { ok: false; reason: 'not_found' | 'not_companion' }



export interface CompanionsListRosterInput {

  playerCharacterId: string

}



function assertCompanionsPlayer(

  db: Database.Database,

  input: { campaignId: string; characterId: string }

) {

  const character = getCharacterById(db, input.characterId)

  if (!character || character.kind !== 'player' || character.campaignId !== input.campaignId) {

    throw new Error('not_found')

  }

  if (character.guidedCreationPhase !== 'companions') {

    throw new Error('invalid_phase')

  }

  return character

}



function isNonEmptyPrompt(prompt: string): boolean {

  return prompt.trim().length > 0

}



export async function generateCompanionPreviewForCharacter(

  db: Database.Database,

  provider: Provider,

  input: CompanionsGenerateInput

): Promise<CompanionPreviewDto> {

  const character = assertCompanionsPlayer(db, input)

  if (!isNonEmptyPrompt(input.prompt)) {

    throw new Error('invalid_prompt')

  }

  return generateCompanionPreview(provider, {

    prompt: input.prompt,

    pc: buildCompanionGeneratePcContext(db, character),

    knownRaceKeys: resolveCompanionKnownRaceKeys(db, input.campaignId),

    knownInventoryItemIds: resolveCompanionKnownInventoryItemIds(db)

  })

}



function persistCompanionExtras(

  db: Database.Database,

  memberId: string,

  preview: CompanionPreviewDto

): void {

  const member = getCharacterById(db, memberId)

  if (!member) {

    return

  }

  const stats = member.stats as Record<string, unknown>

  updateCharacter(db, memberId, {

    stats: {

      ...stats,

      companionRole: preview.role,

      appearance: preview.appearance

    }

  })

}



export async function acceptCompanionPreview(

  db: Database.Database,

  provider: Provider,

  input: CompanionsAcceptInput

): Promise<CompanionsAcceptResult> {

  let character

  try {

    character = assertCompanionsPlayer(db, input)

  } catch (error) {

    const message = error instanceof Error ? error.message : ''

    if (message === 'not_found' || message === 'invalid_phase') {

      return { ok: false, reason: message }

    }

    throw error

  }

  if (!isCompanionPreviewDto(input.preview) || input.preview.ownerPlayerCharacterId !== character.id) {

    return { ok: false, reason: 'invalid_preview' }

  }

  if (listPartyMembersForPlayer(db, character.id).length >= COMPANION_ONBOARDING_MAX) {

    return { ok: false, reason: 'roster_full' }

  }

  const [member] = await createPartyMembers(db, provider, {

    campaignId: input.campaignId,

    ownerPlayerCharacterId: character.id,

    members: [

      {

        name: input.preview.name,

        characterClass: input.preview.characterClass,

        personality: input.preview.personality,

        raceKey: input.preview.raceKey

      }

    ]

  })

  grantCompanionInventoryOnAccept(db, {
    memberId: member.id,
    characterClass: input.preview.characterClass,
    role: input.preview.role,
    previewInventoryIds: input.preview.inventoryItemIds
  })

  persistCompanionExtras(db, member.id, input.preview)

  setGuidedCreationPhase(db, character.id, 'identity')

  return { ok: true }

}



export function skipCompanionsPhase(

  db: Database.Database,

  input: CompanionsSkipInput

): CompanionsSkipResult {

  const character = getCharacterById(db, input.characterId)

  if (!character || character.kind !== 'player') {

    return { ok: false, reason: 'not_found' }

  }

  if (character.guidedCreationPhase !== 'companions') {

    return { ok: false, reason: 'invalid_phase' }

  }

  const members = listPartyMembersForPlayer(db, character.id)

  if (members.length > 0) {

    return { ok: false, reason: 'invalid_phase' }

  }

  setGuidedCreationPhase(db, character.id, 'identity')

  return { ok: true }

}



export function setCompanionOrder(

  db: Database.Database,

  input: CompanionsSetOrderInput

): CompanionsSetOrderResult {

  const member = getCharacterById(db, input.companionId)

  if (!member) {

    return { ok: false, reason: 'not_found' }

  }

  if (member.kind !== 'ai_party_member') {

    return { ok: false, reason: 'not_companion' }

  }

  const stats = { ...(member.stats as Record<string, unknown>) }

  const order = buildCompanionOrderStance(input.text, new Date().toISOString())

  if (order) {

    stats.companionOrder = order

  } else {

    delete stats.companionOrder

  }

  updateCharacter(db, input.companionId, { stats })

  return { ok: true }

}



export function listCompanionRosterForPlayer(

  db: Database.Database,

  input: CompanionsListRosterInput

): CompanionRosterEntry[] {

  return listPartyMembersForPlayer(db, input.playerCharacterId).map((member) =>

    companionRosterEntryFromMember(member)

  )

}



export function registerCompanionsHandlers(): void {

  ipcMain.handle('companions:skip', (_event, input: CompanionsSkipInput) => {

    return skipCompanionsPhase(getDb(), input)

  })

  ipcMain.handle('companions:generate', (_event, input: CompanionsGenerateInput) => {

    return generateCompanionPreviewForCharacter(getDb(), buildAgentProvider(), input)

  })

  ipcMain.handle('companions:accept', (_event, input: CompanionsAcceptInput) => {

    return acceptCompanionPreview(getDb(), buildAgentProvider(), input)

  })

  ipcMain.handle('companions:setOrder', (_event, input: CompanionsSetOrderInput) => {

    return setCompanionOrder(getDb(), input)

  })

  ipcMain.handle('companions:listRoster', (_event, input: CompanionsListRosterInput) => {

    return listCompanionRosterForPlayer(getDb(), input)

  })

}

