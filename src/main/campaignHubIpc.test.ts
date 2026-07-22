import { describe, expect, it } from 'vitest'
import { buildHubSnapshot } from './campaignHubIpc'
import { seedHubSnapshotFixture } from './campaignHubIpc.fixtures'
import { persistWorldMutationSideEffects } from '../agents/worldMutationNarration'
import { listRegionsByCampaign } from '../db/repositories/regions'

describe('campaign hub snapshot assembly (038.7)', () => {
  it('includes play-aware fields and cast with obituary for dead characters', () => {
    const { db, campaign, dead } = seedHubSnapshotFixture()
    const snapshot = buildHubSnapshot(db, campaign.id)
    expect(snapshot.currentStateSummary).toBe('The war rages on.')
    expect(snapshot.cast).toHaveLength(2)
    const deadCast = snapshot.cast.find((member) => member.id === dead.id)
    expect(deadCast?.lifeStatus).toBe('dead')
    expect(deadCast?.hasObituary).toBe(true)
    expect(deadCast?.obituary?.narrativeBody).toBe('Fallen.')
    expect(snapshot.campaign?.worldName).toBe('Test World')
    expect(snapshot.campaign?.worldSummary).toContain('test world')
    expect('recentEvents' in snapshot).toBe(false)
  })
})

describe('hub snapshot after play world mutation (130.5)', () => {
  it('reflects structured destroy from mutation persist (not only manual updates)', () => {
    const { db, campaign } = seedHubSnapshotFixture()
    const region = listRegionsByCampaign(db, campaign.id)[0]!
    expect(region.status.destroyed).toBe(false)

    persistWorldMutationSideEffects(
      db,
      {
        narrationText: 'Fire takes the village.',
        regionStatusUpdates: [{ regionId: region.id, op: 'destroy', cause: 'arson' }]
      },
      { campaignId: campaign.id, regionId: region.id }
    )

    const snapshot = buildHubSnapshot(db, campaign.id)
    const hubRegion = snapshot.regions.find((row) => row.id === region.id)
    expect(hubRegion?.status).toEqual({ destroyed: true, damaged: false, cause: 'arson' })
  })

  it('keeps legacy empty/pristine status fine', () => {
    const { db, campaign } = seedHubSnapshotFixture()
    const snapshot = buildHubSnapshot(db, campaign.id)
    expect(snapshot.regions.every((row) => row.status.destroyed === false)).toBe(true)
  })
})
