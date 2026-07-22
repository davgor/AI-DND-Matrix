import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
import { createNpc, updateNpcOpinionSummary } from '../db/repositories/npcs'
import { upsertNpcOpinion } from '../db/repositories/npcOpinions'
import { createRegion } from '../db/repositories/regions'
import { npcOpinionSubject, playerOpinionSubject } from '../shared/npcRelationships/types'
import { getRelationshipWeb, listOpinionSubjectOptions } from './relationshipWeb'

function seedWebFixture(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Web',
    premisePrompt: 'p',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Town',
    description: 'd'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  const ally = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Ally',
    characterClass: 'cleric',
    kind: 'player'
  })
  const mira = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'warm'
  })
  const captain = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Captain',
    role: 'guard',
    disposition: 'stern'
  })
  const stranger = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Stranger',
    role: 'wanderer',
    disposition: 'neutral'
  })
  return { campaign, hero, ally, mira, captain, stranger }
}

function seedKnownNpcEdges(db: ReturnType<typeof createTestDb>) {
  const seeded = seedWebFixture(db)
  const { campaign, hero, mira, captain, stranger } = seeded
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    category: 'person',
    title: 'Mira',
    content: 'Innkeeper.',
    relatedEntityId: mira.id,
    learnedInGameDate: 1
  })
  updateNpcOpinionSummary(db, captain.id, {
    summary: 'Knows the party.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  })
  upsertNpcOpinion(db, {
    campaignId: campaign.id,
    npcId: mira.id,
    subject: npcOpinionSubject(captain.id),
    summary: 'Resents the captain.',
    generatedAt: '2026-07-20T12:00:00.000Z',
    stance: 'hostile'
  })
  upsertNpcOpinion(db, {
    campaignId: campaign.id,
    npcId: stranger.id,
    subject: playerOpinionSubject(hero.id),
    summary: 'Hidden stranger opinion.',
    generatedAt: '2026-07-20T12:00:00.000Z',
    stance: 'wary'
  })
  return seeded
}

describe('getRelationshipWeb empty', () => {
  it('returns other PCs but no NPC nodes when nothing is known yet', () => {
    const db = createTestDb()
    const { campaign, hero, ally } = seedWebFixture(db)

    const web = getRelationshipWeb(db, { campaignId: campaign.id, characterId: hero.id })
    expect(web.nodes.filter((n) => n.kind === 'npc')).toEqual([])
    expect(web.edges).toEqual([])
    expect(web.nodes).toContainEqual({ id: ally.id, name: 'Ally', kind: 'player_character' })
  })
})

describe('getRelationshipWeb known NPCs', () => {
  it('includes known NPCs and opinion edges only', () => {
    const db = createTestDb()
    const { campaign, hero, ally, mira, captain, stranger } = seedKnownNpcEdges(db)

    const web = getRelationshipWeb(db, { campaignId: campaign.id, characterId: hero.id })
    const npcIds = web.nodes.filter((n) => n.kind === 'npc').map((n) => n.id)
    expect(npcIds).toContain(mira.id)
    expect(npcIds).toContain(captain.id)
    expect(npcIds).not.toContain(stranger.id)
    expect(web.nodes.some((n) => n.id === ally.id && n.kind === 'player_character')).toBe(true)
    expect(web.edges).toEqual([
      {
        fromNpcId: mira.id,
        subjectType: 'npc',
        subjectId: captain.id,
        stance: 'hostile',
        hasSummary: true
      }
    ])
  })
})

describe('listOpinionSubjectOptions', () => {
  it('defaults About you first and only lists known NPC subjects', () => {
    const db = createTestDb()
    const { campaign, hero, ally, mira, captain, stranger } = seedWebFixture(db)
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'person',
      title: 'Captain',
      content: 'Guard captain.',
      relatedEntityId: captain.id,
      learnedInGameDate: 1
    })

    const options = listOpinionSubjectOptions(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: mira.id
    })

    expect(options[0]).toEqual({
      subject: playerOpinionSubject(hero.id),
      label: 'About you'
    })
    expect(options.some((o) => o.subject.subjectId === ally.id)).toBe(true)
    expect(options.some((o) => o.subject.subjectId === captain.id)).toBe(true)
    expect(options.some((o) => o.subject.subjectId === stranger.id)).toBe(false)
    expect(options.some((o) => o.subject.subjectId === mira.id)).toBe(false)
  })
})
