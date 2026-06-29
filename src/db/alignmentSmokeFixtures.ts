import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createNpc } from './repositories/npcs'
import { createRegion } from './repositories/regions'
import { createPlayerCharacter } from '../main/characterCreationIpc'

export function seedAlignmentSmokeCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Smoke',
    premisePrompt: 'A test realm',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A village'
  })
  const player = createPlayerCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    archetype: 'fighter',
    abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
    alignment: 'lawful_good'
  })
  const speakingNpc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'guard',
    disposition: 'friendly',
    alignment: 'lawful_neutral',
    temperament: 'cautious',
    canSpeak: true
  })
  const wolfNpc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Dire Wolf',
    role: 'beast',
    disposition: 'hostile',
    temperament: 'territorial',
    canSpeak: false
  })
  return { db, campaign, region, player, speakingNpc, wolfNpc }
}
