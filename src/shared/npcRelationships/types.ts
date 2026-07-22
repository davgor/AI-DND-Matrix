/** Multi-subject NPC opinions + relationship web DTOs (epic 127). */

export const OPINION_SUBJECT_TYPES = ['player_character', 'npc'] as const
export type OpinionSubjectType = (typeof OPINION_SUBJECT_TYPES)[number]

export const OPINION_STANCES = ['warm', 'wary', 'hostile', 'unknown'] as const
export type OpinionStance = (typeof OPINION_STANCES)[number]

export interface OpinionSubject {
  subjectType: OpinionSubjectType
  subjectId: string
}

/** Persisted opinion of holder NPC toward one subject. */
export interface NpcOpinionRow {
  id: string
  campaignId: string
  npcId: string
  subjectType: OpinionSubjectType
  subjectId: string
  summary: string | null
  generatedAt: string | null
  lastRelevantInteractionAt: string | null
  stance: OpinionStance
}

export interface NpcOpinionPersistenceFields {
  opinionSummary: string | null
  opinionSummaryGeneratedAt: string | null
  lastPlayerInteractionAt: string | null
}

export interface RelationshipWebNode {
  id: string
  name: string
  kind: 'npc' | 'player_character'
}

export interface RelationshipWebEdge {
  fromNpcId: string
  subjectType: OpinionSubjectType
  subjectId: string
  stance: OpinionStance
  hasSummary: boolean
}

export interface RelationshipWebDto {
  nodes: RelationshipWebNode[]
  edges: RelationshipWebEdge[]
}

export interface OpinionSubjectOption {
  subject: OpinionSubject
  label: string
}

export function isOpinionSubjectType(value: unknown): value is OpinionSubjectType {
  return typeof value === 'string' && (OPINION_SUBJECT_TYPES as readonly string[]).includes(value)
}

export function isOpinionStance(value: unknown): value is OpinionStance {
  return typeof value === 'string' && (OPINION_STANCES as readonly string[]).includes(value)
}

export function parseOpinionStance(value: unknown): OpinionStance {
  return isOpinionStance(value) ? value : 'unknown'
}

export function isOpinionSubject(value: unknown): value is OpinionSubject {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return isOpinionSubjectType(row['subjectType']) && typeof row['subjectId'] === 'string'
}

export function playerOpinionSubject(characterId: string): OpinionSubject {
  return { subjectType: 'player_character', subjectId: characterId }
}

export function npcOpinionSubject(npcId: string): OpinionSubject {
  return { subjectType: 'npc', subjectId: npcId }
}

/**
 * Same freshness rule as dossier 105, applied per subject row.
 * - null summary → generate once
 * - last interaction after generatedAt → regenerate
 * - otherwise return stored (no LLM)
 */
export function needsSubjectOpinionRegeneration(fields: NpcOpinionPersistenceFields): boolean {
  if (fields.opinionSummary === null) {
    return true
  }
  if (fields.opinionSummaryGeneratedAt === null) {
    return true
  }
  if (fields.lastPlayerInteractionAt === null) {
    return false
  }
  return fields.lastPlayerInteractionAt > fields.opinionSummaryGeneratedAt
}

export function opinionRowToPersistence(row: NpcOpinionRow): NpcOpinionPersistenceFields {
  return {
    opinionSummary: row.summary,
    opinionSummaryGeneratedAt: row.generatedAt,
    lastPlayerInteractionAt: row.lastRelevantInteractionAt
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

export function isNpcOpinionRow(value: unknown): value is NpcOpinionRow {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return hasOpinionRowIdentity(row) && hasOpinionRowPayload(row)
}

function hasOpinionRowIdentity(row: Record<string, unknown>): boolean {
  return (
    typeof row['id'] === 'string' &&
    typeof row['campaignId'] === 'string' &&
    typeof row['npcId'] === 'string' &&
    isOpinionSubjectType(row['subjectType']) &&
    typeof row['subjectId'] === 'string'
  )
}

function hasOpinionRowPayload(row: Record<string, unknown>): boolean {
  return (
    isNullableString(row['summary']) &&
    isNullableString(row['generatedAt']) &&
    isNullableString(row['lastRelevantInteractionAt']) &&
    isOpinionStance(row['stance'])
  )
}

export function isRelationshipWebEdge(value: unknown): value is RelationshipWebEdge {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row['fromNpcId'] === 'string' &&
    isOpinionSubjectType(row['subjectType']) &&
    typeof row['subjectId'] === 'string' &&
    isOpinionStance(row['stance']) &&
    typeof row['hasSummary'] === 'boolean'
  )
}

export function isRelationshipWebDto(value: unknown): value is RelationshipWebDto {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  if (!Array.isArray(row['nodes']) || !Array.isArray(row['edges'])) {
    return false
  }
  const nodesOk = row['nodes'].every((node) => {
    if (node === null || typeof node !== 'object') {
      return false
    }
    const n = node as Record<string, unknown>
    return (
      typeof n['id'] === 'string' &&
      typeof n['name'] === 'string' &&
      (n['kind'] === 'npc' || n['kind'] === 'player_character')
    )
  })
  return nodesOk && row['edges'].every(isRelationshipWebEdge)
}

/** Known-candidate NPC ids only — never the full cast (121). */
export function filterKnownNpcSubjects(
  candidates: { npcId: string; name: string }[],
  holderNpcId: string
): OpinionSubjectOption[] {
  return candidates
    .filter((c) => c.npcId !== holderNpcId)
    .map((c) => ({
      subject: npcOpinionSubject(c.npcId),
      label: c.name
    }))
}

export function otherPlayerSubjectOptions(
  players: { id: string; name: string }[],
  activeCharacterId: string
): OpinionSubjectOption[] {
  return players
    .filter((p) => p.id !== activeCharacterId)
    .map((p) => ({
      subject: playerOpinionSubject(p.id),
      label: p.name
    }))
}

/** Derive web edges from opinion rows; only include rows with a non-null summary. */
export function deriveRelationshipWebEdges(rows: NpcOpinionRow[]): RelationshipWebEdge[] {
  return rows
    .filter((row) => row.summary !== null)
    .map((row) => ({
      fromNpcId: row.npcId,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      stance: row.stance,
      hasSummary: true
    }))
}
