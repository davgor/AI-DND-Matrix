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
  bestiary: {
    foes: [
      {
        name: 'Mill Wolf',
        tags: ['wolf'],
        buckets: ['beast'],
        lore: 'Mill wolves circle the grain stores after dark and leave prints in the flour dust.'
      },
      {
        name: 'Old Mill Shade',
        tags: ['undead'],
        buckets: ['undead'],
        lore: 'Shades cling to the millstones and whisper debts owed to the last miller.'
      },
      {
        name: 'Ditch Slime',
        tags: ['slime'],
        buckets: ['elemental'],
        lore: 'Ditch slime pools under the mill race and dissolves careless boots.'
      }
    ]
  },
  storyThread: {
    title: 'The Mill Mystery',
    state: 'active',
    summary: 'Uncover what stirs in Millbrook.'
  }
}
