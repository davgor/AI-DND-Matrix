import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import * as deleteCampaignRepo from '../db/repositories/deleteCampaign'
import { deleteCampaignById } from './campaignDeleteIpc'

describe('deleteCampaignById', () => {
  it('returns not_found when the campaign does not exist', async () => {
    const db = createTestDb()
    const result = await deleteCampaignById(db, 'missing-id')
    expect(result).toEqual({
      ok: false,
      code: 'not_found',
      message: 'Campaign not found.'
    })
  })

  it('deletes the campaign and returns success', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Delete Me',
      premisePrompt: 'Gone soon.',
      deathMode: 'legendary'
    })
    const unlink = vi.fn()
    const result = await deleteCampaignById(db, campaign.id, unlink)
    expect(result).toEqual({ ok: true })
    expect(getCampaignById(db, campaign.id)).toBeUndefined()
  })

  it('returns typed failure when deletion throws', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Broken Delete',
      premisePrompt: 'Fail path.',
      deathMode: 'legendary'
    })
    const spy = vi.spyOn(deleteCampaignRepo, 'deleteCampaignCascade').mockImplementation(() => {
      throw new Error('db fail')
    })
    const result = await deleteCampaignById(db, campaign.id, vi.fn())
    spy.mockRestore()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('delete_failed')
    }
    expect(getCampaignById(db, campaign.id)?.name).toBe('Broken Delete')
  })
})
