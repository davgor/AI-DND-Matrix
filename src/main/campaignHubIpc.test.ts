import { describe, expect, it } from 'vitest'
import { buildHubSnapshot } from './campaignHubIpc'
import { seedHubSnapshotFixture } from './campaignHubIpc.fixtures'

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
