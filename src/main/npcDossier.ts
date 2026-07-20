import type Database from 'better-sqlite3'
import { listLogEntriesRelatedToEntity } from '../db/repositories/logEntries'
import {
  getNpcById,
  updateNpcOpinionSummary,
  type Npc
} from '../db/repositories/npcs'
import {
  needsOpinionRegeneration,
  type NpcDossierDto,
  type NpcDossierFact,
  type NpcDossierOpinion,
  type NpcDossierTraits
} from '../shared/npcDossier/types'

export interface GetNpcDossierInput {
  campaignId: string
  characterId: string
  npcId: string
}

interface GenerateOpinionContext {
  npc: Npc
  characterId: string
}

type GenerateOpinionFn = (context: GenerateOpinionContext) => Promise<string | null>

interface GetNpcDossierOptions {
  generateOpinion?: GenerateOpinionFn
}

function mapTraits(npc: Npc): NpcDossierTraits {
  return {
    temperament: npc.temperament,
    raceKey: npc.raceKey,
    alignment: npc.alignment,
    genderKey: npc.genderKey,
    classKey: npc.classKey,
    backgroundKey: npc.backgroundKey,
    role: npc.role
  }
}

function mapFacts(
  db: Database.Database,
  characterId: string,
  npcId: string
): NpcDossierFact[] {
  return listLogEntriesRelatedToEntity(db, characterId, npcId).map((entry) => ({
    id: entry.id,
    title: entry.title,
    content: entry.content,
    createdAt: entry.createdAt
  }))
}

function storedOpinion(npc: Npc, stale: boolean): NpcDossierOpinion {
  return {
    summary: npc.opinionSummary,
    generatedAt: npc.opinionSummaryGeneratedAt,
    stale
  }
}

async function resolveOpinion(
  db: Database.Database,
  npc: Npc,
  characterId: string,
  generateOpinion?: GenerateOpinionFn
): Promise<NpcDossierOpinion> {
  const persistence = {
    opinionSummary: npc.opinionSummary,
    opinionSummaryGeneratedAt: npc.opinionSummaryGeneratedAt,
    lastPlayerInteractionAt: npc.lastPlayerInteractionAt
  }

  if (!needsOpinionRegeneration(persistence)) {
    return storedOpinion(npc, false)
  }

  if (!generateOpinion) {
    return storedOpinion(npc, true)
  }

  try {
    const generated = await generateOpinion({ npc, characterId })
    if (generated) {
      const generatedAt = new Date().toISOString()
      updateNpcOpinionSummary(db, npc.id, { summary: generated, generatedAt })
      return { summary: generated, generatedAt, stale: false }
    }
  } catch {
    // Safe fallback below when generation fails.
  }

  return storedOpinion(npc, true)
}

export async function getNpcDossier(
  db: Database.Database,
  input: GetNpcDossierInput,
  options?: GetNpcDossierOptions
): Promise<NpcDossierDto | null> {
  const npc = getNpcById(db, input.npcId)
  if (!npc || npc.campaignId !== input.campaignId) {
    return null
  }

  const opinion = await resolveOpinion(db, npc, input.characterId, options?.generateOpinion)

  return {
    npcId: npc.id,
    name: npc.name,
    role: npc.role,
    canSpeak: npc.canSpeak,
    traits: mapTraits(npc),
    facts: mapFacts(db, input.characterId, input.npcId),
    opinion,
    disposition: npc.disposition
  }
}
