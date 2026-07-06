import type Database from 'better-sqlite3'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, markCharacterDead } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { appendEvent } from '../db/repositories/events'

function seedCampaignWorldFields(db: Database.Database, campaignId: string): void {
  db.prepare(
    `UPDATE campaigns SET world_name = ?, world_summary = ?, world_history = ? WHERE id = ?`
  ).run(
    'Test World',
    'This is the test world.\n\nSecond paragraph.\n\nThird paragraph.',
    'History one.\n\nHistory two.\n\nHistory three.\n\nHistory four.',
    campaignId
  )
}

export function seedHubSnapshotFixture() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Hub Test',
    premisePrompt: 'A test premise',
    deathMode: 'legendary'
  })
  db.prepare('UPDATE campaigns SET current_state_summary = ? WHERE id = ?').run(
    'The war rages on.',
    campaign.id
  )
  seedCampaignWorldFields(db, campaign.id)
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A village'
  })
  const alive = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Alive',
    characterClass: 'Fighter',
    kind: 'player',
    stats: { currentRegionId: region.id }
  })
  db.prepare(`UPDATE characters SET guided_creation_phase = 'complete' WHERE id = ?`).run(alive.id)
  const dead = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Dead',
    characterClass: 'Mage',
    kind: 'player'
  })
  db.prepare(`UPDATE characters SET guided_creation_phase = 'complete' WHERE id = ?`).run(dead.id)
  markCharacterDead(db, {
    characterId: dead.id,
    deathCause: 'legendary_dying',
    obituary: {
      generatedAt: '2026-01-01T00:00:00.000Z',
      deathCause: 'legendary_dying',
      narrativeBody: 'Fallen.',
      npcReactions: []
    }
  })
  appendEvent(db, {
    campaignId: campaign.id,
    type: 'player_action',
    payload: { narrationText: 'A village burns.' }
  })
  return { db, campaign, alive, dead }
}
