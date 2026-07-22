import type Database from 'better-sqlite3'
import { getBestiarySpeciesById } from '../db/repositories/bestiary'
import { listLogEntriesRelatedToEntity } from '../db/repositories/logEntries'
import {
  getNpcById,
  updateNpcOpinionSummary,
  type Npc
} from '../db/repositories/npcs'
import {
  ensurePlayerOpinionFromLegacy,
  getNpcOpinion,
  upsertNpcOpinion
} from '../db/repositories/npcOpinions'
import {
  needsOpinionRegeneration,
  type NpcDossierDto,
  type NpcDossierFact,
  type NpcDossierOpinion,
  type NpcDossierTraits
} from '../shared/npcDossier/types'
import {
  needsSubjectOpinionRegeneration,
  opinionRowToPersistence,
  parseOpinionStance,
  playerOpinionSubject,
  type OpinionStance,
  type OpinionSubject
} from '../shared/npcRelationships/types'
import { resolveNpcFaceTokenPath } from './npcFaceTokenAsset'
import { resolveCreatureTokenPath } from './creatureTokenAsset'

export interface GetNpcDossierInput {
  campaignId: string
  characterId: string
  npcId: string
}

export interface GetNpcSubjectOpinionInput extends GetNpcDossierInput {
  subject: OpinionSubject
}

export interface GenerateOpinionContext {
  npc: Npc
  characterId: string
  subject: OpinionSubject
  subjectLabel: string
}

export type GenerateOpinionResult =
  | string
  | { summary: string; stance?: OpinionStance }
  | null

type GenerateOpinionFn = (context: GenerateOpinionContext) => Promise<GenerateOpinionResult>

interface GetNpcDossierOptions {
  generateOpinion?: GenerateOpinionFn
}

interface ResolveOpinionArgs {
  db: Database.Database
  npc: Npc
  characterId: string
  subject: OpinionSubject
  generateOpinion?: GenerateOpinionFn
}

interface PersistOpinionArgs {
  db: Database.Database
  npc: Npc
  subject: OpinionSubject
  characterId: string
  generated: { summary: string; stance: OpinionStance }
  generatedAt: string
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

function toOpinionDto(
  summary: string | null,
  generatedAt: string | null,
  stale: boolean
): NpcDossierOpinion {
  return { summary, generatedAt, stale }
}

function normalizeGenerateResult(result: GenerateOpinionResult): {
  summary: string
  stance: OpinionStance
} | null {
  if (result === null) {
    return null
  }
  if (typeof result === 'string') {
    const trimmed = result.trim()
    return trimmed.length > 0 ? { summary: trimmed, stance: 'unknown' } : null
  }
  const trimmed = result.summary.trim()
  if (trimmed.length === 0) {
    return null
  }
  return { summary: trimmed, stance: parseOpinionStance(result.stance) }
}

function resolveSubjectLabel(
  db: Database.Database,
  subject: OpinionSubject,
  fallbackCharacterId: string
): string {
  if (subject.subjectType === 'player_character') {
    if (subject.subjectId === fallbackCharacterId) {
      return 'you (the active player)'
    }
    const row = db
      .prepare('SELECT name FROM characters WHERE id = ?')
      .get(subject.subjectId) as { name: string } | undefined
    return row?.name ?? 'another player'
  }
  const npc = getNpcById(db, subject.subjectId)
  return npc?.name ?? 'someone'
}

function isAboutActivePlayer(subject: OpinionSubject, characterId: string): boolean {
  return subject.subjectType === 'player_character' && subject.subjectId === characterId
}

function loadSubjectPersistence(
  db: Database.Database,
  npc: Npc,
  subject: OpinionSubject,
  characterId: string
) {
  if (isAboutActivePlayer(subject, characterId)) {
    ensurePlayerOpinionFromLegacy(db, npc.id, characterId)
  }
  const row = getNpcOpinion(db, npc.id, subject)
  if (row) {
    return opinionRowToPersistence(row)
  }
  if (isAboutActivePlayer(subject, characterId)) {
    return {
      opinionSummary: npc.opinionSummary,
      opinionSummaryGeneratedAt: npc.opinionSummaryGeneratedAt,
      lastPlayerInteractionAt: npc.lastPlayerInteractionAt
    }
  }
  return {
    opinionSummary: null,
    opinionSummaryGeneratedAt: null,
    lastPlayerInteractionAt: null
  }
}

function persistGeneratedOpinion(args: PersistOpinionArgs): void {
  const existing = getNpcOpinion(args.db, args.npc.id, args.subject)
  upsertNpcOpinion(args.db, {
    campaignId: args.npc.campaignId,
    npcId: args.npc.id,
    subject: args.subject,
    summary: args.generated.summary,
    generatedAt: args.generatedAt,
    stance: args.generated.stance,
    lastRelevantInteractionAt: existing?.lastRelevantInteractionAt ?? null
  })
  if (isAboutActivePlayer(args.subject, args.characterId)) {
    updateNpcOpinionSummary(args.db, args.npc.id, {
      summary: args.generated.summary,
      generatedAt: args.generatedAt
    })
  }
}

async function tryGenerateOpinion(
  args: ResolveOpinionArgs,
  persistence: ReturnType<typeof loadSubjectPersistence>
): Promise<NpcDossierOpinion | null> {
  if (!args.generateOpinion) {
    return null
  }
  try {
    const subjectLabel = resolveSubjectLabel(args.db, args.subject, args.characterId)
    const generated = normalizeGenerateResult(
      await args.generateOpinion({
        npc: args.npc,
        characterId: args.characterId,
        subject: args.subject,
        subjectLabel
      })
    )
    if (!generated) {
      return null
    }
    const generatedAt = new Date().toISOString()
    persistGeneratedOpinion({
      db: args.db,
      npc: args.npc,
      subject: args.subject,
      characterId: args.characterId,
      generated,
      generatedAt
    })
    return toOpinionDto(generated.summary, generatedAt, false)
  } catch {
    return toOpinionDto(persistence.opinionSummary, persistence.opinionSummaryGeneratedAt, true)
  }
}

async function resolveSubjectOpinion(args: ResolveOpinionArgs): Promise<NpcDossierOpinion> {
  const persistence = loadSubjectPersistence(
    args.db,
    args.npc,
    args.subject,
    args.characterId
  )
  const needsRegen = isAboutActivePlayer(args.subject, args.characterId)
    ? needsOpinionRegeneration(persistence)
    : needsSubjectOpinionRegeneration(persistence)

  if (!needsRegen) {
    return toOpinionDto(persistence.opinionSummary, persistence.opinionSummaryGeneratedAt, false)
  }

  const generated = await tryGenerateOpinion(args, persistence)
  if (generated) {
    return generated
  }
  return toOpinionDto(persistence.opinionSummary, persistence.opinionSummaryGeneratedAt, true)
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

  const opinion = await resolveSubjectOpinion({
    db,
    npc,
    characterId: input.characterId,
    subject: playerOpinionSubject(input.characterId),
    generateOpinion: options?.generateOpinion
  })

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

export async function getNpcSubjectOpinion(
  db: Database.Database,
  input: GetNpcSubjectOpinionInput,
  options?: GetNpcDossierOptions
): Promise<NpcDossierOpinion | null> {
  const npc = getNpcById(db, input.npcId)
  if (!npc || npc.campaignId !== input.campaignId) {
    return null
  }
  return resolveSubjectOpinion({
    db,
    npc,
    characterId: input.characterId,
    subject: input.subject,
    generateOpinion: options?.generateOpinion
  })
}
