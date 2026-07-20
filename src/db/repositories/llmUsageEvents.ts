import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import {
  bucketForPurpose,
  type LlmPurposeBucket,
  type LlmPurposeId,
  type LlmUsageAggregationSeed,
  type LlmUsageEvent,
  type LlmUsageOutcome
} from '../../shared/llmUsage'

export interface InsertLlmUsageEventInput {
  id?: string
  providerName: string
  modelId: string
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  purpose: LlmPurposeId
  bucket?: LlmPurposeBucket
  campaignId?: string | null
  characterId?: string | null
  createdAt?: string
  outcome: LlmUsageOutcome
  errorMessage?: string | null
}

export interface LlmUsageEventsFilter {
  from?: string
  to?: string
  campaignId?: string
  purpose?: LlmPurposeId
  bucket?: LlmPurposeBucket
}

export type { LlmUsageAggregationSeed }

interface LlmUsageEventRow {
  id: string
  provider_name: string
  model_id: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  purpose: LlmPurposeId
  bucket: LlmPurposeBucket
  campaign_id: string | null
  character_id: string | null
  created_at: string
  outcome: LlmUsageOutcome
  error_message: string | null
}

function rowToEvent(row: LlmUsageEventRow): LlmUsageEvent {
  return {
    id: row.id,
    providerName: row.provider_name,
    modelId: row.model_id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    purpose: row.purpose,
    bucket: row.bucket,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    createdAt: row.created_at,
    outcome: row.outcome,
    errorMessage: row.error_message
  }
}

function buildFilterClauses(filter: LlmUsageEventsFilter): { where: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filter.from !== undefined) {
    clauses.push('created_at >= ?')
    params.push(filter.from)
  }
  if (filter.to !== undefined) {
    clauses.push('created_at <= ?')
    params.push(filter.to)
  }
  if (filter.campaignId !== undefined) {
    clauses.push('campaign_id = ?')
    params.push(filter.campaignId)
  }
  if (filter.purpose !== undefined) {
    clauses.push('purpose = ?')
    params.push(filter.purpose)
  }
  if (filter.bucket !== undefined) {
    clauses.push('bucket = ?')
    params.push(filter.bucket)
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  }
}

function buildLlmUsageEvent(
  input: InsertLlmUsageEventInput,
  id: string,
  createdAt: string,
  bucket: LlmPurposeBucket
): LlmUsageEvent {
  return {
    id,
    providerName: input.providerName,
    modelId: input.modelId,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    purpose: input.purpose,
    bucket,
    campaignId: input.campaignId ?? null,
    characterId: input.characterId ?? null,
    createdAt,
    outcome: input.outcome,
    errorMessage: input.errorMessage ?? null
  }
}

export function insertLlmUsageEvent(
  db: Database.Database,
  input: InsertLlmUsageEventInput
): LlmUsageEvent {
  const id = input.id ?? randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  const bucket = input.bucket ?? bucketForPurpose(input.purpose)

  db.prepare(
    `INSERT INTO llm_usage_events (
      id, provider_name, model_id, input_tokens, output_tokens, total_tokens,
      purpose, bucket, campaign_id, character_id, created_at, outcome, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.providerName,
    input.modelId,
    input.inputTokens ?? null,
    input.outputTokens ?? null,
    input.totalTokens ?? null,
    input.purpose,
    bucket,
    input.campaignId ?? null,
    input.characterId ?? null,
    createdAt,
    input.outcome,
    input.errorMessage ?? null
  )

  return buildLlmUsageEvent(input, id, createdAt, bucket)
}

export function tryInsertLlmUsageEvent(
  db: Database.Database,
  input: InsertLlmUsageEventInput,
  log: (message: string, error: unknown) => void = console.error
): LlmUsageEvent | null {
  try {
    return insertLlmUsageEvent(db, input)
  } catch (error) {
    log('[llmUsageEvents] failed to persist usage event', error)
    return null
  }
}

export function listLlmUsageEvents(
  db: Database.Database,
  filter: LlmUsageEventsFilter = {}
): LlmUsageEvent[] {
  const { where, params } = buildFilterClauses(filter)
  const rows = db
    .prepare(`SELECT * FROM llm_usage_events ${where} ORDER BY created_at ASC, rowid ASC`)
    .all(...params) as LlmUsageEventRow[]
  return rows.map(rowToEvent)
}

export function aggregateLlmUsageSeeds(
  db: Database.Database,
  filter: LlmUsageEventsFilter = {}
): LlmUsageAggregationSeed[] {
  const { where, params } = buildFilterClauses(filter)
  const rows = db
    .prepare(
      `SELECT purpose, bucket,
        COUNT(*) AS event_count,
        SUM(input_tokens) AS input_tokens,
        SUM(output_tokens) AS output_tokens,
        SUM(total_tokens) AS total_tokens
      FROM llm_usage_events ${where}
      GROUP BY purpose, bucket
      ORDER BY purpose ASC`
    )
    .all(...params) as Array<{
    purpose: LlmPurposeId
    bucket: LlmPurposeBucket
    event_count: number
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
  }>

  return rows.map((row) => ({
    purpose: row.purpose,
    bucket: row.bucket,
    eventCount: row.event_count,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens
  }))
}
