import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { generateNpcOpinionSummary } from '../agents/npcOpinion'
import { assembleNpcOpinionContext } from '../agents/npcOpinionContext'
import type { Npc } from '../db/repositories/npcs'
import {
  buildSubjectOpinionPrompt,
  parseSubjectOpinionResponse
} from '../shared/npcRelationships/subjectOpinionPrompt'
import type { OpinionSubject } from '../shared/npcRelationships/types'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'
import {
  getNpcDossier,
  getNpcSubjectOpinion,
  type GenerateOpinionContext,
  type GenerateOpinionResult,
  type GetNpcDossierInput,
  type GetNpcSubjectOpinionInput
} from './npcDossier'
import {
  getRelationshipWeb,
  listOpinionSubjectOptions,
  type GetRelationshipWebInput,
  type ListOpinionSubjectsInput
} from './relationshipWeb'

function isAboutActivePlayer(subject: OpinionSubject, characterId: string): boolean {
  return subject.subjectType === 'player_character' && subject.subjectId === characterId
}

async function generateForContext(
  db: Database.Database,
  campaignId: string,
  context: GenerateOpinionContext
): Promise<GenerateOpinionResult> {
  const holderContext = assembleNpcOpinionContext(db, {
    campaignId,
    characterId: context.characterId,
    npc: context.npc
  })

  if (isAboutActivePlayer(context.subject, context.characterId)) {
    return generateNpcOpinionSummary(buildAgentProvider(), holderContext)
  }

  return generateOtherSubjectOpinion(context.npc, holderContext, context)
}

async function generateOtherSubjectOpinion(
  npc: Npc,
  holderContext: ReturnType<typeof assembleNpcOpinionContext>,
  context: GenerateOpinionContext
): Promise<GenerateOpinionResult> {
  const prompt = buildSubjectOpinionPrompt({
    holderName: npc.name,
    holderRole: npc.role,
    temperament: npc.temperament,
    alignment: npc.alignment,
    disposition: npc.disposition,
    canSpeak: npc.canSpeak,
    subjectLabel: context.subjectLabel,
    subjectType: context.subject.subjectType,
    memoriesJson: JSON.stringify(holderContext.memories ?? []),
    dialogueJson: JSON.stringify(holderContext.dialogueSnippets ?? []),
    actionBeatsJson: JSON.stringify(holderContext.actionBeats ?? [])
  })

  try {
    const raw = await buildAgentProvider().generate(prompt, {
      systemPrompt: 'You summarize NPC opinions as JSON only.',
      maxTokens: 224,
      purpose: 'play.npc_reaction',
      campaignId: holderContext.campaignId,
      characterId: holderContext.characterId
    })
    return parseSubjectOpinionResponse(raw)
  } catch {
    return null
  }
}

export function registerNpcDossierHandlers(): void {
  ipcMain.handle('npcDossier:get', async (_event, input: GetNpcDossierInput) => {
    const db = getDb()
    return getNpcDossier(db, input, {
      generateOpinion: (context) => generateForContext(db, input.campaignId, context)
    })
  })

  ipcMain.handle(
    'npcDossier:getSubjectOpinion',
    async (_event, input: GetNpcSubjectOpinionInput) => {
      const db = getDb()
      return getNpcSubjectOpinion(db, input, {
        generateOpinion: (context) => generateForContext(db, input.campaignId, context)
      })
    }
  )

  ipcMain.handle(
    'npcDossier:listOpinionSubjects',
    (_event, input: ListOpinionSubjectsInput) => listOpinionSubjectOptions(getDb(), input)
  )

  ipcMain.handle('relationshipWeb:get', (_event, input: GetRelationshipWebInput) =>
    getRelationshipWeb(getDb(), input)
  )
}
