import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { getCampaignById, updateCampaignStateSummary, type Campaign } from './campaigns'
import { listCharactersByCampaign, updateCharacter, type Character } from './characters'

interface CampaignSnapshot {
  campaign: Campaign
  characters: Character[]
}

interface SaveRow {
  snapshot: string
}

export function createSaveSnapshot(db: Database.Database, campaignId: string): void {
  const campaign = getCampaignById(db, campaignId)
  if (!campaign) return

  const snapshot: CampaignSnapshot = {
    campaign,
    characters: listCharactersByCampaign(db, campaignId)
  }

  db.prepare('INSERT INTO saves (id, campaign_id, created_at, snapshot) VALUES (?, ?, ?, ?)').run(
    randomUUID(),
    campaignId,
    new Date().toISOString(),
    JSON.stringify(snapshot)
  )
}

export function restoreLatestSave(db: Database.Database, campaignId: string): void {
  const row = db
    .prepare(
      'SELECT snapshot FROM saves WHERE campaign_id = ? ORDER BY rowid DESC LIMIT 1'
    )
    .get(campaignId) as SaveRow | undefined
  if (!row) return

  const snapshot = JSON.parse(row.snapshot) as CampaignSnapshot

  updateCampaignStateSummary(db, campaignId, snapshot.campaign.currentStateSummary)
  db.prepare('UPDATE campaigns SET in_game_date = ? WHERE id = ?').run(
    snapshot.campaign.inGameDate,
    campaignId
  )

  for (const character of snapshot.characters) {
    updateCharacter(db, character.id, {
      stats: character.stats,
      inventory: character.inventory,
      hp: character.hp,
      xp: character.xp,
      level: character.level
    })
    db.prepare('UPDATE characters SET currency = ? WHERE id = ?').run(
      character.currency,
      character.id
    )
  }
}
