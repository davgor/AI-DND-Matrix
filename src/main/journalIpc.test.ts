import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
import {
  createNpc,
  markNpcPromoted,
  updateNpcOpinionSummary
} from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { listKnownDossiers, listPersonMatchCandidates } from './journalIpc'

function seedCampaignWithRegion(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: '...'
  })
  return { campaign, region }
}

function seedHero(
  db: ReturnType<typeof createTestDb>,
  campaignId: string
): ReturnType<typeof createCharacter> {
  return createCharacter(db, {
    campaignId,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
}

describe('listKnownDossiers with generated opinions', () => {
  it('returns only campaign NPCs with a generated opinion summary', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaignWithRegion(db)
    const other = createCampaign(db, {
      name: 'Other',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    const otherRegion = createRegion(db, {
      campaignId: other.id,
      name: 'Elsewhere',
      description: '...'
    })

    createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Zed',
      role: 'villager',
      disposition: 'friendly'
    })
    const mira = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })
    const otherNpc = createNpc(db, {
      campaignId: other.id,
      regionId: otherRegion.id,
      name: 'Ada',
      role: 'guard',
      disposition: 'neutral'
    })
    updateNpcOpinionSummary(db, mira.id, {
      summary: 'Wary but polite.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    updateNpcOpinionSummary(db, otherNpc.id, {
      summary: 'Other campaign.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })

    expect(listKnownDossiers(db, campaign.id)).toEqual([{ npcId: mira.id, name: 'Mira' }])
  })
})

describe('listKnownDossiers empty state', () => {
  it('returns empty when no dossiers have been generated', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaignWithRegion(db)
    createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Zed',
      role: 'villager',
      disposition: 'friendly'
    })

    expect(listKnownDossiers(db, campaign.id)).toEqual([])
  })
})

function linkPersonLogEntry(
  db: ReturnType<typeof createTestDb>,
  input: {
    campaignId: string
    characterId: string
    npcId: string
    title: string
    learnedInGameDate: number
  }
): void {
  createLogEntry(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    category: 'person',
    title: input.title,
    content: `${input.title} note.`,
    relatedEntityId: input.npcId,
    learnedInGameDate: input.learnedInGameDate
  })
}

function seedPersonMatchNoiseEntries(
  db: ReturnType<typeof createTestDb>,
  campaignId: string,
  regionId: string,
  characterId: string
): void {
  createNpc(db, {
    campaignId,
    regionId,
    name: 'Zed',
    role: 'villager',
    disposition: 'friendly'
  })
  createLogEntry(db, {
    campaignId,
    characterId,
    category: 'person',
    title: 'Unlinked',
    content: 'Heard a name only.',
    learnedInGameDate: 3
  })
}

function seedPersonMatchInclusionFixtures(db: ReturnType<typeof createTestDb>) {
  const { campaign, region } = seedCampaignWithRegion(db)
  const hero = seedHero(db, campaign.id)

  const opinionOnly = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Ada',
    role: 'sage',
    disposition: 'neutral'
  })
  updateNpcOpinionSummary(db, opinionOnly.id, {
    summary: 'Curious about the party.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  })

  const linkedOnly = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Boris',
    role: 'guard',
    disposition: 'friendly'
  })
  linkPersonLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    npcId: linkedOnly.id,
    title: 'Boris',
    learnedInGameDate: 1
  })

  const both = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'friendly'
  })
  updateNpcOpinionSummary(db, both.id, {
    summary: 'Wary but polite.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  })
  linkPersonLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    npcId: both.id,
    title: 'Mira',
    learnedInGameDate: 2
  })
  seedPersonMatchNoiseEntries(db, campaign.id, region.id, hero.id)

  return { campaign, hero, opinionOnly, linkedOnly, both }
}

describe('listPersonMatchCandidates inclusion', () => {
  it('includes dossier-generated NPCs and log-book-linked People, unique by npcId', () => {
    const db = createTestDb()
    const { campaign, hero, opinionOnly, linkedOnly, both } =
      seedPersonMatchInclusionFixtures(db)

    const listed = listPersonMatchCandidates(db, {
      campaignId: campaign.id,
      characterId: hero.id
    })
    expect(listed).toEqual(
      expect.arrayContaining([
        { npcId: opinionOnly.id, name: 'Ada' },
        { npcId: linkedOnly.id, name: 'Boris' },
        { npcId: both.id, name: 'Mira' }
      ])
    )
    expect(listed).toHaveLength(3)
    expect(listed.filter((c) => c.npcId === both.id)).toHaveLength(1)
  })
})

describe('listPersonMatchCandidates party members', () => {
  it('excludes party-member NPCs even with opinion or log link', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaignWithRegion(db)
    const hero = seedHero(db, campaign.id)

    const companion = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Companion',
      role: 'ally',
      disposition: 'friendly'
    })
    markNpcPromoted(db, companion.id)
    updateNpcOpinionSummary(db, companion.id, {
      summary: 'Loyal.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'person',
      title: 'Companion',
      content: 'Party member.',
      relatedEntityId: companion.id,
      learnedInGameDate: 1
    })

    expect(
      listPersonMatchCandidates(db, {
        campaignId: campaign.id,
        characterId: hero.id
      })
    ).toEqual([])
  })
})

describe('listPersonMatchCandidates character scope', () => {
  it('does not include another character’s linked People', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaignWithRegion(db)
    const hero = seedHero(db, campaign.id)
    const other = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Other',
      characterClass: 'rogue',
      kind: 'player'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Secret',
      role: 'spy',
      disposition: 'hostile'
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: other.id,
      category: 'person',
      title: 'Secret',
      content: 'Other hero’s contact.',
      relatedEntityId: npc.id,
      learnedInGameDate: 1
    })

    expect(
      listPersonMatchCandidates(db, {
        campaignId: campaign.id,
        characterId: hero.id
      })
    ).toEqual([])
  })
})
