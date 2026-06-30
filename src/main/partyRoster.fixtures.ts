import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'

export function seedPartyRosterCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Roster Test',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return { db, campaign }
}
