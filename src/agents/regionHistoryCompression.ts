import type Database from 'better-sqlite3'
import {
  listCompressionCandidates,
  replaceRegionHistoryWithCompressedSummary,
  type RegionHistoryEntry
} from '../db/repositories/regionHistory'
import type { GenerateContext, Provider } from './providers/types'

// 040.1: 256 — one concise summary paragraph replacing the old entries.
const COMPRESSION_GENERATE_CONTEXT: GenerateContext = { maxTokens: 256 }

export async function compressRegionHistory(
  db: Database.Database,
  provider: Provider,
  regionId: string,
  inGameDateThreshold: number
): Promise<RegionHistoryEntry | null> {
  const candidates = listCompressionCandidates(db, regionId, inGameDateThreshold)
  if (candidates.length === 0) {
    return null
  }

  const summary = await provider.generate(buildCompressionPrompt(candidates), COMPRESSION_GENERATE_CONTEXT)
  const latestDate = Math.max(...candidates.map((candidate) => candidate.inGameDate))

  return replaceRegionHistoryWithCompressedSummary(db, {
    regionId,
    candidateIds: candidates.map((candidate) => candidate.id),
    summary,
    inGameDate: latestDate
  })
}

function buildCompressionPrompt(candidates: { content: string }[]): string {
  return `Summarize these historical region events into one concise paragraph:\n${candidates
    .map((candidate) => candidate.content)
    .join('\n')}`
}
