import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { buildNarrationLog } from './narrationLog'

describe('per-character narration log (038.12)', () => {
  it('filters log entries by character id', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    const a = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'Fighter',
      kind: 'player'
    })
    const b = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'Mage',
      kind: 'player'
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { narrationText: 'Alpha acts.', characterId: a.id }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { narrationText: 'Beta acts.', characterId: b.id }
    })

    const logA = buildNarrationLog(db, campaign.id, a.id)
    const logB = buildNarrationLog(db, campaign.id, b.id)
    expect(logA.some((entry) => entry.text.includes('Alpha'))).toBe(true)
    expect(logA.some((entry) => entry.text.includes('Beta'))).toBe(false)
    expect(logB.some((entry) => entry.text.includes('Beta'))).toBe(true)
    expect(logB.some((entry) => entry.text.includes('Alpha'))).toBe(false)
  })
})
