import type { CampaignGenerationResult } from '../agents/campaignGeneration/types'

export const QUEST_SMOKE_GENERATION: CampaignGenerationResult = {
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
