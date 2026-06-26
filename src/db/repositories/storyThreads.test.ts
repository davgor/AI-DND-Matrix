import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createStoryThread, listStoryThreadsByCampaign, updateStoryThreadStateAndSummary } from './storyThreads'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('storyThreads repository', () => {
  it('round-trips a created thread with its default summary', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const created = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'The Sunken Crown',
      state: 'active'
    })

    expect(listStoryThreadsByCampaign(db, campaign.id)).toEqual([created])
    expect(created.summary).toBe('')
  })

  it('lists only threads belonging to the given campaign', () => {
    const db = createTestDb()
    const campaignA = seedCampaign(db)
    const campaignB = seedCampaign(db)

    const threadA = createStoryThread(db, {
      campaignId: campaignA.id,
      title: 'A',
      state: 'active'
    })
    createStoryThread(db, { campaignId: campaignB.id, title: 'B', state: 'active' })

    expect(listStoryThreadsByCampaign(db, campaignA.id).map((t) => t.id)).toEqual([threadA.id])
  })

  it('updates state and summary, persisting the change', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'The Sunken Crown',
      state: 'active'
    })

    updateStoryThreadStateAndSummary(
      db,
      created.id,
      'resolved',
      'The party recovered the crown.'
    )

    const [fetched] = listStoryThreadsByCampaign(db, campaign.id)
    expect(fetched?.state).toBe('resolved')
    expect(fetched?.summary).toBe('The party recovered the crown.')
  })
})
