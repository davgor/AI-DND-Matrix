import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import {
  parseOpinionStance,
  type NpcOpinionRow,
  type OpinionStance,
  type OpinionSubject,
  type OpinionSubjectType
} from '../../shared/npcRelationships/types'
import { getNpcById } from './npcs'

interface OpinionRow {
  id: string
  campaign_id: string
  npc_id: string
  subject_type: string
  subject_id: string
  summary: string | null
  generated_at: string | null
  last_relevant_interaction_at: string | null
  stance: string
}

function rowToOpinion(row: OpinionRow): NpcOpinionRow {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    npcId: row.npc_id,
    subjectType: row.subject_type as OpinionSubjectType,
    subjectId: row.subject_id,
    summary: row.summary,
    generatedAt: row.generated_at,
    lastRelevantInteractionAt: row.last_relevant_interaction_at,
    stance: parseOpinionStance(row.stance)
  }
}

export interface UpsertNpcOpinionInput {
  campaignId: string
  npcId: string
  subject: OpinionSubject
  summary: string | null
  generatedAt: string | null
  stance?: OpinionStance
  lastRelevantInteractionAt?: string | null
}

export function getNpcOpinion(
  db: Database.Database,
  npcId: string,
  subject: OpinionSubject
): NpcOpinionRow | undefined {
  const row = db
    .prepare(
      `SELECT * FROM npc_opinions
       WHERE npc_id = ? AND subject_type = ? AND subject_id = ?`
    )
    .get(npcId, subject.subjectType, subject.subjectId) as OpinionRow | undefined
  return row ? rowToOpinion(row) : undefined
}

export function listNpcOpinionsByNpc(db: Database.Database, npcId: string): NpcOpinionRow[] {
  const rows = db
    .prepare('SELECT * FROM npc_opinions WHERE npc_id = ? ORDER BY subject_type, subject_id')
    .all(npcId) as OpinionRow[]
  return rows.map(rowToOpinion)
}

export function listNpcOpinionsByCampaign(
  db: Database.Database,
  campaignId: string
): NpcOpinionRow[] {
  const rows = db
    .prepare(
      `SELECT * FROM npc_opinions WHERE campaign_id = ? ORDER BY npc_id, subject_type, subject_id`
    )
    .all(campaignId) as OpinionRow[]
  return rows.map(rowToOpinion)
}

export function upsertNpcOpinion(
  db: Database.Database,
  input: UpsertNpcOpinionInput
): NpcOpinionRow {
  const existing = getNpcOpinion(db, input.npcId, input.subject)
  const stance = input.stance ?? existing?.stance ?? 'unknown'
  const lastRelevant =
    input.lastRelevantInteractionAt !== undefined
      ? input.lastRelevantInteractionAt
      : (existing?.lastRelevantInteractionAt ?? null)

  if (existing) {
    db.prepare(
      `UPDATE npc_opinions
       SET summary = ?, generated_at = ?, stance = ?, last_relevant_interaction_at = ?
       WHERE id = ?`
    ).run(input.summary, input.generatedAt, stance, lastRelevant, existing.id)
    return getNpcOpinion(db, input.npcId, input.subject) as NpcOpinionRow
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO npc_opinions (
       id, campaign_id, npc_id, subject_type, subject_id,
       summary, generated_at, last_relevant_interaction_at, stance
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.campaignId,
    input.npcId,
    input.subject.subjectType,
    input.subject.subjectId,
    input.summary,
    input.generatedAt,
    lastRelevant,
    stance
  )
  return getNpcOpinion(db, input.npcId, input.subject) as NpcOpinionRow
}

export function bumpNpcOpinionSubjectInteraction(
  db: Database.Database,
  npcId: string,
  subject: OpinionSubject,
  at: string
): void {
  const existing = getNpcOpinion(db, npcId, subject)
  if (!existing) {
    const npc = getNpcById(db, npcId)
    if (!npc) {
      return
    }
    upsertNpcOpinion(db, {
      campaignId: npc.campaignId,
      npcId,
      subject,
      summary: null,
      generatedAt: null,
      lastRelevantInteractionAt: at,
      stance: 'unknown'
    })
    return
  }
  db.prepare('UPDATE npc_opinions SET last_relevant_interaction_at = ? WHERE id = ?').run(
    at,
    existing.id
  )
}

/**
 * Copy legacy npcs.opinion_* columns into the player-subject row when missing.
 * Used after migration and when reading dossiers for saves that dual-write.
 */
export function ensurePlayerOpinionFromLegacy(
  db: Database.Database,
  npcId: string,
  characterId: string
): NpcOpinionRow | undefined {
  const subject = { subjectType: 'player_character' as const, subjectId: characterId }
  const existing = getNpcOpinion(db, npcId, subject)
  if (existing?.summary != null) {
    return existing
  }
  const npc = getNpcById(db, npcId)
  if (!npc || npc.opinionSummary == null) {
    return existing
  }
  return upsertNpcOpinion(db, {
    campaignId: npc.campaignId,
    npcId,
    subject,
    summary: npc.opinionSummary,
    generatedAt: npc.opinionSummaryGeneratedAt,
    lastRelevantInteractionAt: npc.lastPlayerInteractionAt,
    stance: existing?.stance ?? 'unknown'
  })
}

/** Delete all opinion rows for a campaign (wire into deleteCampaignCascade). */
export function deleteNpcOpinionsByCampaign(db: Database.Database, campaignId: string): void {
  db.prepare('DELETE FROM npc_opinions WHERE campaign_id = ?').run(campaignId)
}
