import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  generateCampaignFromPrompt,
  getCampaignDetail,
  listCampaignsForSidebar,
  selectCampaign
} from './campaignIpc'

const VALID_GENERATION = (regionName: string, npcName: string, threadTitle: string): string => {
  const outskirts = `${regionName} Outskirts`
  const makeRegion = (name: string) => ({
    name,
    description: `Description of ${name}.`,
    historyBackstory: `History of ${name}.`,
    recentHistory: `Recent events in ${name}.`,
    potentialQuests: [`Quest in ${name}`, `Another quest in ${name}`]
  })
  const makeNpcs = (name: string, prefix: string) => [
    {
      name: `${prefix} One`,
      role: 'guide',
      disposition: 'friendly',
      regionName: name,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      disposition: 'curious',
      regionName: name,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: npcName,
      role: 'shopkeeper',
      disposition: 'friendly',
      regionName: name,
      temperament: 'cautious',
      canSpeak: true,
      alignment: 'lawful_good'
    }
  ]
  return JSON.stringify({
    regions: [makeRegion(regionName), makeRegion(outskirts)],
    npcs: [...makeNpcs(regionName, regionName), ...makeNpcs(outskirts, `${regionName} Out`)],
    storyThread: { title: threadTitle, state: 'starting', summary: 'A summary.' }
  })
}

describe('generateCampaignFromPrompt + selectCampaign + listCampaignsForSidebar', () => {
  it('generates, persists, and immediately marks the campaign as last-played', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION('Oakhollow', 'Mira', 'Main Arc')])

    const detail = await generateCampaignFromPrompt(db, provider, 'A flooded kingdom')

    expect(detail.campaign?.name).toBeDefined()
    expect(detail.regions).toHaveLength(2)
    expect(detail.npcs).toHaveLength(6)
    expect(detail.regionExtras).toHaveLength(2)
    expect(detail.storyThreads).toHaveLength(1)

    const sidebarList = listCampaignsForSidebar(db)
    expect(sidebarList).toHaveLength(1)
    expect(sidebarList[0]?.lastPlayedAt).not.toBeNull()
  })

  it('selecting a campaign touches last-played and returns its detail', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION('Oakhollow', 'Mira', 'Main Arc')])
    const generated = await generateCampaignFromPrompt(db, provider, 'A flooded kingdom')

    const detail = selectCampaign(db, generated.campaign!.id)
    expect(detail.campaign?.id).toBe(generated.campaign!.id)
  })
})

describe('multi-campaign isolation (008.5)', () => {
  it('never mixes one campaign\'s regions/NPCs/threads with another\'s', async () => {
    const db = createTestDb()
    const providerA = createScriptedProvider([VALID_GENERATION('Oakhollow', 'Mira', 'The Sunken Crown')])
    const providerB = createScriptedProvider([VALID_GENERATION('Frosthaven', 'Borin', 'The Frozen Pact')])

    const campaignA = await generateCampaignFromPrompt(db, providerA, 'A flooded kingdom')
    const campaignB = await generateCampaignFromPrompt(db, providerB, 'A frozen wasteland')

    const detailA = getCampaignDetail(db, campaignA.campaign!.id)
    const detailB = getCampaignDetail(db, campaignB.campaign!.id)

    expect(detailA.regions.map((r) => r.name)).toEqual(['Oakhollow', 'Oakhollow Outskirts'])
    expect(detailB.regions.map((r) => r.name)).toEqual(['Frosthaven', 'Frosthaven Outskirts'])

    expect(detailA.npcs.map((n) => n.name)).toEqual([
      'Mira',
      'Oakhollow One',
      'Oakhollow Two',
      'Mira',
      'Oakhollow Out One',
      'Oakhollow Out Two'
    ])
    expect(detailB.npcs.map((n) => n.name)).toEqual([
      'Borin',
      'Frosthaven One',
      'Frosthaven Two',
      'Borin',
      'Frosthaven Out One',
      'Frosthaven Out Two'
    ])

    expect(detailA.storyThreads[0]?.title).toBe('The Sunken Crown')
    expect(detailB.storyThreads[0]?.title).toBe('The Frozen Pact')

    const sidebarList = listCampaignsForSidebar(db)
    expect(sidebarList).toHaveLength(2)
  })
})
