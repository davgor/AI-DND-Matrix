import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { assembleNpcOpinionContext } from './npcOpinionContext'
import { buildNpcOpinionPrompt, generateNpcOpinionSummary } from './npcOpinion'
import { createScriptedProvider } from './providers/mockHarness'

function seedSpeaker(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Opinion Agent',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Tavern',
    description: 'Cozy.'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'warm toward the party',
    temperament: 'neutral',
    canSpeak: true
  })
  return { campaign, hero, npc }
}

describe('buildNpcOpinionPrompt: speaking NPCs', () => {
  it('includes subject memories and dialogue for speaking NPCs', () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedSpeaker(db)
    appendNpcMemory(db, { npcId: npc.id, content: 'Hero tipped well last visit.', tags: [] })
    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc
    })
    const prompt = buildNpcOpinionPrompt(context)

    expect(prompt).toContain('Mira')
    expect(prompt).toContain('Hero tipped well last visit.')
    expect(prompt).toContain('how this NPC feels about the player')
  })
})

describe('buildNpcOpinionPrompt: isolation', () => {
  it('never includes another NPC private memory content (isolation)', () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedSpeaker(db)
    const other = createNpc(db, {
      campaignId: campaign.id,
      regionId: npc.regionId,
      name: 'Bram',
      role: 'smith',
      disposition: 'neutral',
      canSpeak: true
    })
    appendNpcMemory(db, { npcId: npc.id, content: 'Mira-only secret.', tags: [] })
    appendNpcMemory(db, { npcId: other.id, content: 'Bram-only secret.', tags: [] })
    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc
    })
    const prompt = buildNpcOpinionPrompt(context)

    expect(prompt).toContain('Mira-only secret')
    expect(prompt).not.toContain('Bram-only secret')
  })
})

describe('buildNpcOpinionPrompt: non-speaking NPCs', () => {
  it('uses action beats only for non-speaking NPCs', () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedSpeaker(db)
    const mute = createNpc(db, {
      campaignId: campaign.id,
      regionId: npc.regionId,
      name: 'Rook',
      role: 'hound',
      disposition: 'wary',
      canSpeak: false
    })
    appendNpcMemory(db, { npcId: mute.id, content: 'Hidden hound memory.', tags: [] })
    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc: mute
    })
    const prompt = buildNpcOpinionPrompt(context)

    expect(prompt).toContain('cannot speak')
    expect(prompt).toContain('Observed actions')
    expect(prompt).not.toContain('Hidden hound memory')
    expect(prompt).not.toContain('private memories')
  })
})

describe('generateNpcOpinionSummary', () => {
  it('returns trimmed provider prose on the happy path', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedSpeaker(db)
    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc
    })
    const provider = createScriptedProvider(['  Mira thinks the hero is trustworthy.  '])

    const summary = await generateNpcOpinionSummary(provider, context)

    expect(summary).toBe('Mira thinks the hero is trustworthy.')
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.context?.maxTokens).toBeGreaterThanOrEqual(192)
    expect(provider.calls[0]?.context?.maxTokens).toBeLessThanOrEqual(256)
  })

  it('returns null when generation fails', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedSpeaker(db)
    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc
    })
    const provider = createScriptedProvider([new Error('provider down')])

    const summary = await generateNpcOpinionSummary(provider, context)

    expect(summary).toBeNull()
  })
})
