import type Database from 'better-sqlite3'
import { LOG_CATEGORIES, type LogCategory, type LogEntryProposal } from '../../shared/logBook/types'
import { getCampaignById } from './campaigns'
import { createLogEntry } from './logEntries'

function isValidLogCategory(value: string): value is LogCategory {
  return (LOG_CATEGORIES as readonly string[]).includes(value)
}

export function persistLogBookEntries(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  proposals: LogEntryProposal[] | undefined
): void {
  if (!proposals?.length) {
    return
  }
  const campaign = getCampaignById(db, campaignId)
  if (!campaign) {
    return
  }
  for (const proposal of proposals) {
    if (!isValidLogCategory(proposal.category)) {
      continue
    }
    createLogEntry(db, {
      campaignId,
      characterId,
      category: proposal.category,
      title: proposal.title,
      content: proposal.content,
      relatedEntityId: proposal.relatedEntityId ?? null,
      learnedInGameDate: campaign.inGameDate
    })
  }
}
