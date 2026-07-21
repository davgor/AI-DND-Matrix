import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign, getSessionRecap, upsertSessionRecap } from './campaigns'

describe('getSessionRecap', () => {
  it('reads missing recap as null on a fresh campaign', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Recap A',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    expect(getSessionRecap(db, campaign.id)).toBeNull()
  })

  it('isolates recaps across campaigns', () => {
    const db = createTestDb()
    const a = createCampaign(db, { name: 'A', premisePrompt: '...', deathMode: 'legendary' })
    const b = createCampaign(db, { name: 'B', premisePrompt: '...', deathMode: 'legendary' })
    upsertSessionRecap(db, a.id, {
      text: 'Recap for A.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    expect(getSessionRecap(db, a.id)?.text).toBe('Recap for A.')
    expect(getSessionRecap(db, b.id)).toBeNull()
  })
})

describe('upsertSessionRecap', () => {
  it('upserts and reads back text + generatedAt', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Recap B',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    const generatedAt = '2026-07-20T12:00:00.000Z'
    upsertSessionRecap(db, campaign.id, {
      text: 'Previously, you crossed the bridge.',
      generatedAt
    })
    expect(getSessionRecap(db, campaign.id)).toEqual({
      text: 'Previously, you crossed the bridge.',
      generatedAt
    })
  })

  it('overwrites an existing recap on upsert', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Recap C',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    upsertSessionRecap(db, campaign.id, {
      text: 'Old recap.',
      generatedAt: '2026-07-19T12:00:00.000Z'
    })
    upsertSessionRecap(db, campaign.id, {
      text: 'New recap.',
      generatedAt: '2026-07-21T12:00:00.000Z'
    })
    expect(getSessionRecap(db, campaign.id)).toEqual({
      text: 'New recap.',
      generatedAt: '2026-07-21T12:00:00.000Z'
    })
  })
})
