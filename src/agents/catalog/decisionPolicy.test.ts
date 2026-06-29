import { describe, expect, it } from 'vitest'
import { createCampaign } from '../../db/repositories/campaigns'
import { createTestDb } from '../../db/testUtils'
import {
  decideCreatureSource,
  getCatalogRetrievalStats,
  RETRIEVAL_CONFIDENCE_THRESHOLD
} from './decisionPolicy'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: 'A test premise.',
    deathMode: 'legendary'
  })
}

describe('retrieve-first creature decision policy', () => {
  it('retrieves a canonical creature when a confident match exists', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const decision = decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })

    expect(decision.decision).toBe('retrieve')
    if (decision.decision === 'retrieve') {
      expect(decision.creature.buckets).toContain('undead')
      expect(decision.context).toContain(decision.creature.name)
    }
  })

  it('falls back to creation when no bucket has a confident match', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    db.exec('DELETE FROM catalog_bucket_tags')

    const decision = decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })

    expect(decision.decision).toBe('create')
  })

  it('records telemetry distinguishing retrieve-hits from create-fallbacks', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })
    db.exec('DELETE FROM catalog_bucket_tags')
    decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })

    const stats = getCatalogRetrievalStats(db, campaign.id)
    expect(stats.retrieveHits).toBe(1)
    expect(stats.createFallbacks).toBe(1)
    expect(stats.hitRate).toBeCloseTo(0.5)
  })

  it('exposes its confidence threshold so retrieval and policy stay consistent', () => {
    expect(RETRIEVAL_CONFIDENCE_THRESHOLD).toBeGreaterThan(0)
  })
})
