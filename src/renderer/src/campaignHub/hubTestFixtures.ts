import type { PlayAwareHubSnapshot, HubCastMember } from '../../../shared/campaignHub/types'
import type { Campaign } from '../../../db/repositories/campaigns'
import type { Region } from '../../../db/repositories/regions'
import type { StoryThread } from '../../../db/repositories/storyThreads'

export function makeTestCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    name: 'Shattered Vale',
    premisePrompt: 'A fractured kingdom where old oaths still bind the living and the dead.',
    createdAt: '2026-01-01T00:00:00.000Z',
    currentStateSummary: 'The party secured the mountain pass.',
    worldName: 'The Shattered Vale',
    worldSummary: 'A fractured kingdom of mist and stone.\n\nOld oaths bind the living.\n\nWar stirs again.',
    worldHistory: 'Age one.\n\nAge two.\n\nAge three.\n\nAge four.',
    pantheonSummary: '',
    inGameDate: 12,
    deathMode: 'standard',
    respawnRules: null,
    ...overrides
  }
}

export function makeTestRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: 'reg-1',
    campaignId: 'camp-1',
    name: 'Greywatch',
    description: 'A windswept border keep overlooking the vale.',
    status: { destroyed: false },
    ...overrides
  }
}

export function makeTestStoryThread(overrides: Partial<StoryThread> = {}): StoryThread {
  return {
    id: 'thread-1',
    campaignId: 'camp-1',
    title: 'The Broken Crown',
    state: 'active',
    summary: 'Nobles vie for a throne left empty after the king vanished.',
    ...overrides
  }
}

export function makeTestCastMember(overrides: Partial<HubCastMember> = {}): HubCastMember {
  return {
    id: 'char-alive',
    name: 'Kael',
    characterClass: 'fighter',
    level: 3,
    portraitPath: null,
    lifeStatus: 'alive',
    lastKnownRegionName: 'Greywatch',
    hasObituary: false,
    ...overrides
  }
}

export function makeTestHubSnapshot(overrides: Partial<PlayAwareHubSnapshot> = {}): PlayAwareHubSnapshot {
  const campaign = makeTestCampaign()
  const region = makeTestRegion()
  return {
    campaign,
    regions: [region],
    npcs: [],
    regionExtras: [
      {
        regionId: region.id,
        backstory: 'Built after the first war.',
        recentHistory: 'Refugees arrived last week.',
        questHooks: ['Investigate missing scouts']
      }
    ],
    storyThreads: [makeTestStoryThread()],
    characters: [],
    deities: [],
    currentStateSummary: 'Tension rises along the northern border.',
    recentEvents: [
      {
        id: 'evt-1',
        type: 'travel',
        createdAt: '2026-06-01T12:00:00.000Z',
        summary: 'Kael reached Greywatch at dusk.'
      }
    ],
    cast: [makeTestCastMember()],
    questSummariesByCharacterId: [
      {
        characterId: 'char-alive',
        mainQuestHookLine: campaign.premisePrompt,
        mainQuestTitle: 'The Broken Crown',
        activeSideQuestCount: 0
      }
    ],
    regionQuestAvailability: [{ regionId: region.id, availableQuestCount: 1 }],
    ...overrides
  }
}
