import type Database from 'better-sqlite3'

export interface DeleteCampaignHooks {
  beforeCommit?: () => void
}

export function deleteCampaignCascade(
  db: Database.Database,
  campaignId: string,
  hooks?: DeleteCampaignHooks
): void {
  const run = db.transaction(() => {
    db.prepare(
      `DELETE FROM npc_memories WHERE npc_id IN (SELECT id FROM npcs WHERE campaign_id = ?)`
    ).run(campaignId)
    db.prepare(
      `DELETE FROM region_history WHERE region_id IN (SELECT id FROM regions WHERE campaign_id = ?)`
    ).run(campaignId)
    db.prepare(
      `DELETE FROM character_items WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)`
    ).run(campaignId)
    db.prepare(
      `DELETE FROM log_entries WHERE campaign_id = ?`
    ).run(campaignId)
    db.prepare(
      `DELETE FROM character_journal_entries WHERE campaign_id = ?`
    ).run(campaignId)
    db.prepare(
      `DELETE FROM guided_creation_messages WHERE campaign_id = ?`
    ).run(campaignId)
    db.prepare('DELETE FROM characters WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM npcs WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM world_facts WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM regions WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM saves WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM story_threads WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM events WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM sessions WHERE campaign_id = ?').run(campaignId)
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId)
    hooks?.beforeCommit?.()
  })
  run()
}
