import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createNpc, getNpcById } from './repositories/npcs'
import { createRegion } from './repositories/regions'

describe('npc speaking style migration v36 columns (092.1) — round-trip', () => {
  it('round-trips speaking style fields on npcs and defaults null for pre-existing rows', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      backgroundKey: 'soldier'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bard',
      role: 'storyteller',
      disposition: 'cheerful',
      speakingStyleSpecimen: 'Short, lyrical sentences with archaic flourishes.',
      speakingStyleExamples: ['"Hark, traveler!"', '"The tale unfolds thusly."']
    })
    expect(getNpcById(db, npc.id)?.speakingStyleSpecimen).toBe(
      'Short, lyrical sentences with archaic flourishes.'
    )
    expect(getNpcById(db, npc.id)?.speakingStyleExamples).toEqual([
      '"Hark, traveler!"',
      '"The tale unfolds thusly."'
    ])

    const legacy = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Old Timer',
      role: 'hermit',
      disposition: 'quiet'
    })
    expect(getNpcById(db, legacy.id)?.speakingStyleSpecimen).toBeNull()
    expect(getNpcById(db, legacy.id)?.speakingStyleExamples).toBeNull()
  })
})

describe('npc speaking style migration v36 columns (092.1) — invalid json', () => {
  it('maps invalid or empty speaking_style_examples_json to null on read', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Corrupt',
      role: 'guard',
      disposition: 'neutral'
    })

    db.prepare('UPDATE npcs SET speaking_style_examples_json = ? WHERE id = ?').run('not-json', npc.id)
    expect(getNpcById(db, npc.id)?.speakingStyleExamples).toBeNull()

    db.prepare('UPDATE npcs SET speaking_style_examples_json = ? WHERE id = ?').run('[]', npc.id)
    expect(getNpcById(db, npc.id)?.speakingStyleExamples).toBeNull()

    db.prepare('UPDATE npcs SET speaking_style_examples_json = ? WHERE id = ?').run(
      JSON.stringify(['']),
      npc.id
    )
    expect(getNpcById(db, npc.id)?.speakingStyleExamples).toBeNull()
  })
})
