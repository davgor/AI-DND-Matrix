import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign, getCampaignById, updateCampaignStateSummary } from './campaigns'
import { createCharacter, getCharacterById, updateCharacter } from './characters'
import { createSaveSnapshot, restoreLatestSave } from './saves'

function seedCampaignWithCharacter(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'standard'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Elowen',
    characterClass: 'Ranger',
    kind: 'player',
    hp: 20
  })
  return { campaign, character }
}

function insertPersistedRagChunk(db: ReturnType<typeof createTestDb>, campaignId: string): void {
  const embedding = Buffer.alloc(256 * 4)
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at
    ) VALUES (?, ?, 'world_facts', ?, NULL, NULL, NULL, ?, ?, ?, ?)`
  ).run(
    'persist-chunk',
    campaignId,
    'fact-persist',
    'Persistent indexed chunk.',
    'hash-persist',
    embedding,
    '2026-01-01T00:00:00.000Z'
  )
}

function countRagChunksForCampaign(db: ReturnType<typeof createTestDb>, campaignId: string): number {
  return (
    db.prepare('SELECT COUNT(*) as count FROM rag_chunks WHERE campaign_id = ?').get(campaignId) as {
      count: number
    }
  ).count
}

describe('saves repository', () => {
  it('restores a prior snapshot, reverting a later HP mutation', () => {
    const db = createTestDb()
    const { campaign, character } = seedCampaignWithCharacter(db)

    createSaveSnapshot(db, campaign.id)

    updateCharacter(db, character.id, { hp: 1 })
    expect(getCharacterById(db, character.id)?.hp).toBe(1)

    restoreLatestSave(db, campaign.id)

    expect(getCharacterById(db, character.id)?.hp).toBe(20)
  })

  it('restores the most recent snapshot when multiple exist', () => {
    const db = createTestDb()
    const { campaign, character } = seedCampaignWithCharacter(db)

    createSaveSnapshot(db, campaign.id)
    updateCharacter(db, character.id, { hp: 15 })
    createSaveSnapshot(db, campaign.id)
    updateCharacter(db, character.id, { hp: 1 })

    restoreLatestSave(db, campaign.id)

    expect(getCharacterById(db, character.id)?.hp).toBe(15)
  })

  it('does not duplicate or remove rag_chunks when restoring a snapshot', () => {
    const db = createTestDb()
    const { campaign, character } = seedCampaignWithCharacter(db)
    insertPersistedRagChunk(db, campaign.id)

    createSaveSnapshot(db, campaign.id)
    updateCharacter(db, character.id, { hp: 1 })

    restoreLatestSave(db, campaign.id)

    expect(getCharacterById(db, character.id)?.hp).toBe(20)
    expect(countRagChunksForCampaign(db, campaign.id)).toBe(1)
  })

  it('restores campaign-level state alongside character state', () => {
    const db = createTestDb()
    const { campaign } = seedCampaignWithCharacter(db)

    updateCampaignStateSummary(db, campaign.id, 'Snapshot summary')
    createSaveSnapshot(db, campaign.id)

    updateCampaignStateSummary(db, campaign.id, 'Mutated summary')
    restoreLatestSave(db, campaign.id)

    expect(getCampaignById(db, campaign.id)?.currentStateSummary).toBe('Snapshot summary')
  })
})
