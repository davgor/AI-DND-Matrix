import type Database from 'better-sqlite3'
import { getCampaignById } from './campaigns'
import { createCharacterJournalEntry } from './characterJournalEntries'

export function persistJournalEntry(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  content: string | undefined
): void {
  const trimmed = content?.trim()
  if (!trimmed) {
    return
  }
  const campaign = getCampaignById(db, campaignId)
  if (!campaign) {
    return
  }
  createCharacterJournalEntry(db, {
    campaignId,
    characterId,
    content: trimmed,
    inGameDate: campaign.inGameDate
  })
}
