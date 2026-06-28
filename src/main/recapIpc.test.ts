import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendEvent } from '../db/repositories/events'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { generateSessionRecap } from './recapIpc'

describe('generateSessionRecap', () => {
  it('returns a starting-story message when there are no recent events', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    const provider = createScriptedProvider([])

    const recap = await generateSessionRecap(db, provider, campaign.id)

    expect(recap).toContain('start')
    expect(provider.calls).toHaveLength(0)
  })

  it('calls the provider with recent events and returns its narrated recap', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, { campaignId: campaign.id, type: 'player_action', payload: { content: 'fought a goblin' } })
    const provider = createScriptedProvider(['Previously, you fought off a goblin ambush.'])

    const recap = await generateSessionRecap(db, provider, campaign.id)

    expect(recap).toBe('Previously, you fought off a goblin ambush.')
    expect(provider.calls[0]?.prompt).toContain('fought a goblin')
  })
})
