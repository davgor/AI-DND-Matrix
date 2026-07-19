import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { buildCascadingSeedResponses, persistNpcEnrichmentResponses } from '../test/fixtures/campaignGenerationFixtures'
import {
  generateCampaignFromPrompt,
  getCampaignDetail,
  listCampaignsForSidebar,
  selectCampaign
} from './campaignIpc'

function makeGenerationRegion(name: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `History of ${name}.`,
    recentHistory: `Recent events in ${name}.`,
    potentialQuests: [`Quest in ${name}`, `Another quest in ${name}`]
  }
}

function cascadingProviderResponses(input: {
  primaryRegion: string
  secondaryRegion: string
  threadTitle: string
}) {
  return [
    ...buildCascadingSeedResponses({
      regionCount: 2,
      npcsPerRegion: 3,
      regions: [makeGenerationRegion(input.primaryRegion), makeGenerationRegion(input.secondaryRegion)],
      storyThread: { title: input.threadTitle, state: 'starting', summary: 'A summary.' }
    }),
    ...persistNpcEnrichmentResponses(6)
  ]
}

describe('generateCampaignFromPrompt + selectCampaign + listCampaignsForSidebar', () => {
  it('generates, persists, and immediately marks the campaign as last-played', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider(cascadingProviderResponses({
      primaryRegion: 'Oakhollow',
      secondaryRegion: 'The Sunken Crown',
      threadTitle: 'Main Arc'
    }))

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
    const provider = createScriptedProvider(cascadingProviderResponses({
      primaryRegion: 'Oakhollow',
      secondaryRegion: 'The Sunken Crown',
      threadTitle: 'Main Arc'
    }))
    const generated = await generateCampaignFromPrompt(db, provider, 'A flooded kingdom')

    const detail = selectCampaign(db, generated.campaign!.id)
    expect(detail.campaign?.id).toBe(generated.campaign!.id)
  })
})

describe('multi-campaign isolation (008.5)', () => {
  it('never mixes one campaign\'s regions/NPCs/threads with another\'s', async () => {
    const db = createTestDb()
    const providerA = createScriptedProvider(cascadingProviderResponses({
      primaryRegion: 'Oakhollow',
      secondaryRegion: 'The Sunken Crown',
      threadTitle: 'The Sunken Crown'
    }))
    const providerB = createScriptedProvider(cascadingProviderResponses({
      primaryRegion: 'Frosthaven',
      secondaryRegion: 'Iron Marches',
      threadTitle: 'The Frozen Pact'
    }))

    const campaignA = await generateCampaignFromPrompt(db, providerA, 'A flooded kingdom')
    const campaignB = await generateCampaignFromPrompt(db, providerB, 'A frozen wasteland')

    const detailA = getCampaignDetail(db, campaignA.campaign!.id)
    const detailB = getCampaignDetail(db, campaignB.campaign!.id)

    expect(detailA.regions.map((r) => r.name)).toEqual(['Oakhollow', 'The Sunken Crown'])
    expect(detailB.regions.map((r) => r.name)).toEqual(['Frosthaven', 'Iron Marches'])

    expect(detailA.npcs.map((n) => n.name).sort()).toEqual(
      ['Oakh One', 'Oakh Two', 'Oakh Three', 'The  One', 'The  Two', 'The  Three'].sort()
    )
    expect(detailB.npcs.map((n) => n.name).sort()).toEqual(
      ['Fros One', 'Fros Two', 'Fros Three', 'Iron One', 'Iron Two', 'Iron Three'].sort()
    )

    expect(detailA.storyThreads[0]?.title).toBe('The Sunken Crown')
    expect(detailB.storyThreads[0]?.title).toBe('The Frozen Pact')

    const sidebarList = listCampaignsForSidebar(db)
    expect(sidebarList).toHaveLength(2)
  })
})
