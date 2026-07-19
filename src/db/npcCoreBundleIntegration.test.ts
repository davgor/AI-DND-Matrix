import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { listNpcsByRegion } from './repositories/npcs'
import { createRegion } from './repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { NPC_SPEAKING_STYLE_RESPONSE, RACE_LORE_RESPONSE } from '../test/fixtures/campaignGenerationFixtures'
import { getCampaignRaceByKey, listCampaignRaces } from './repositories/campaignRaces'
import { generateNpcForCampaign } from '../main/campaignEditIpc'
import {
  ELF_LOREKEEPER_CORE,
  ELF_LOREKEEPER_FINAL,
  ELF_SCOUT_CORE,
  ELF_SCOUT_FINAL
} from './npcCoreBundleFixtures'

describe('npc core bundle race reuse (052.7)', () => {
  it('realizes race lore once and reuses it for a second flagged NPC', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Reuse Race',
      premisePrompt: 'A frontier town.',
      deathMode: 'legendary'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'A logging village.'
    })
    const provider = createScriptedProvider([
      ELF_SCOUT_CORE,
      RACE_LORE_RESPONSE,
      ELF_SCOUT_FINAL,
      NPC_SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}',
      ELF_LOREKEEPER_CORE,
      ELF_LOREKEEPER_FINAL,
      NPC_SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}'
    ])

    await generateNpcForCampaign(db, provider, {
      campaignId: campaign.id,
      regionId: region.id,
      seedPrompt: 'An elven scout'
    })
    await generateNpcForCampaign(db, provider, {
      campaignId: campaign.id,
      regionId: region.id,
      seedPrompt: 'An elven lorekeeper'
    })

    expect(listCampaignRaces(db, campaign.id).filter((race) => race.raceKey === 'elf')).toHaveLength(1)
    expect(provider.calls.filter((call) => call.prompt.includes('Generate campaign-specific lore'))).toHaveLength(1)
    // Second flagged NPC: core(5) + final(6) — final prompt is grounded in locked race lore.
    expect(provider.calls[6]?.prompt).toContain(getCampaignRaceByKey(db, campaign.id, 'elf')!.lore.roleInThisLand)
  })
})

describe('npc core bundle non-speaking creature (052.7)', () => {
  it('leaves bundle identity fields null for a non-speaking flagged creature', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Beast', premisePrompt: 'Wild frontier.', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Wilds', description: 'Deep forest.' })
    const provider = createScriptedProvider([
      JSON.stringify({ canSpeak: false, temperament: 'aggressive' }),
      JSON.stringify({ name: 'Grayfang', role: 'dire wolf', disposition: 'Snarls at intruders.' }),
      '{"upgrade":false}'
    ])
    await generateNpcForCampaign(db, provider, {
      campaignId: campaign.id,
      regionId: region.id,
      seedPrompt: 'A hostile dire wolf'
    })
    const npc = listNpcsByRegion(db, region.id)[0]
    expect(npc?.canSpeak).toBe(false)
    expect(npc?.raceKey).toBeNull()
    expect(npc?.genderKey).toBeNull()
    expect(npc?.classKey).toBeNull()
    expect(npc?.backgroundKey).toBeNull()
  })
})
