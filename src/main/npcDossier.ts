import type Database from 'better-sqlite3'
import { getBestiarySpeciesById } from '../db/repositories/bestiary'
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
import { resolveNpcFaceTokenPath } from './npcFaceTokenAsset'
import { resolveCreatureTokenPath } from './creatureTokenAsset'
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

const EMPTY_SPECIES_APPEARANCE = {
  silhouette: null,
  sizeClass: null,
  primaryColors: [] as string[],
  distinguishingMarks: null,
  textureOrMaterial: null
}

function mapTraits(db: Database.Database, npc: Npc): NpcDossierTraits {
  const speciesAppearance =
    npc.bestiarySpeciesId === null
      ? EMPTY_SPECIES_APPEARANCE
      : (getBestiarySpeciesById(db, npc.bestiarySpeciesId)?.visualAppearance ??
        EMPTY_SPECIES_APPEARANCE)

  return {
    temperament: npc.temperament,
    raceKey: npc.raceKey,
    alignment: npc.alignment,
    genderKey: npc.genderKey,
    classKey: npc.classKey,
    backgroundKey: npc.backgroundKey,
    role: npc.role,
    hairColor: npc.hairColor,
    age: npc.age,
    eyeColor: npc.eyeColor,
    silhouette: speciesAppearance.silhouette,
    sizeClass: speciesAppearance.sizeClass,
    primaryColors: [...speciesAppearance.primaryColors],
    distinguishingMarks: speciesAppearance.distinguishingMarks,
    textureOrMaterial: speciesAppearance.textureOrMaterial
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

function resolveDossierFaceTokenPath(db: Database.Database, npc: Npc): string | null {
  const npcFaceToken = resolveNpcFaceTokenPath(npc.faceTokenPath)
  if (npcFaceToken) {
    return npcFaceToken
  }
  if (npc.bestiarySpeciesId && !npc.canSpeak) {
    const species = getBestiarySpeciesById(db, npc.bestiarySpeciesId)
    return resolveCreatureTokenPath(species?.creatureTokenPath ?? null)
  }
  return null
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
    faceTokenPath: resolveDossierFaceTokenPath(db, npc),
    traits: mapTraits(db, npc),
    facts: mapFacts(db, input.characterId, input.npcId),
    opinion,
    disposition: npc.disposition
  }
}
