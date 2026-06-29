import { describe, expect, it } from 'vitest'
import { createCampaign } from '../../db/repositories/campaigns'
import { createTestDb } from '../../db/testUtils'
import { decideCreatureSource } from './decisionPolicy'
import { buildCatalogQualityReport } from './qualityReport'

describe('preseed catalog end-to-end smoke validation', () => {
  it('uses a preseeded entry when a suitable match exists', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Smoke Test Campaign',
      premisePrompt: 'A standard test premise.',
      deathMode: 'legendary'
    })

    const decision = decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })
    expect(decision.decision).toBe('retrieve')
  })

  it('falls back to generation when no suitable preseed match exists', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Smoke Test Campaign 2',
      premisePrompt: 'A standard test premise.',
      deathMode: 'legendary'
    })
    db.exec('DELETE FROM catalog_bucket_tags')

    const decision = decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })
    expect(decision.decision).toBe('create')
  })

  it('produces a validation report with bucket coverage, integrity, and retrieve/fallback rates', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Smoke Test Campaign 3',
      premisePrompt: 'A standard test premise.',
      deathMode: 'legendary'
    })

    decideCreatureSource(db, campaign.id, { buckets: ['undead'], level: 2 })
    decideCreatureSource(db, campaign.id, { buckets: ['humanoid'], level: 50 })

    const report = buildCatalogQualityReport(db, campaign.id)

    expect(report.totalCreatures).toBeGreaterThan(0)
    expect(report.totalSpells).toBeGreaterThan(0)
    expect(report.bucketCoverage.undead).toBeGreaterThan(0)
    expect(report.integrity.healthy).toBe(true)
    expect(report.retrieval.retrieveHits + report.retrieval.createFallbacks).toBe(2)
  })
})
