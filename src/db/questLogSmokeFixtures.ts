import type { CampaignGenerationResult } from '../agents/campaignGeneration/types'

import { VALID_PANTHEON, VALID_WORLD } from '../test/fixtures/campaignGenerationFixtures'

export const QUEST_SMOKE_GENERATION: CampaignGenerationResult = {
  world: VALID_WORLD,
  pantheon: VALID_PANTHEON,
  regions: [
    {
      name: 'Millbrook',
      description: 'A quiet village.',
      historyBackstory: 'Old town.',
      recentHistory: 'Wolves spotted.',
      potentialQuests: ['Strange lights in the old mill.']
    }
  ],
  npcs: [],
  storyThread: {
    title: 'The Mill Mystery',
    state: 'active',
    summary: 'Uncover what stirs in Millbrook.'
  }
}
