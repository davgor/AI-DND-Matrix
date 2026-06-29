import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createNpc } from './repositories/npcs'
import { createRegion } from './repositories/regions'
import { createPlayerCharacter } from '../main/characterCreationIpc'

export function seedGameplayLoopSmokeCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Loop Smoke',
    premisePrompt: 'A riverside market',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Market Square',
    description: 'Stalls and rope merchants'
  })
  const player = createPlayerCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    archetype: 'fighter',
    abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
    alignment: 'neutral_good'
  })
  const shopkeeper = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Tessa',
    role: 'shopkeeper',
    disposition: 'friendly',
    canSpeak: true
  })
  return { db, campaign, region, player, shopkeeper }
}
