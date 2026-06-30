import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { getCharacterById } from '../db/repositories/characters'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import {
  assembleObituaryContext,
  enrichObituaryNpcNames,
  generateObituary,
  persistObituaryOnDeath
} from './obituary'
import { createScriptedProvider } from './providers/mockHarness'
import { seedObituaryFixture } from './obituary.fixtures'

const validObituaryJson = JSON.stringify({
  deathCause: 'legendary_dying',
  narrativeBody: 'Elowen fell defending the bridge, remembered for courage.',
  npcReactions: [
    {
      npcId: 'npc-placeholder',
      tone: 'positive',
      reaction: 'The inn will keep a candle lit for her.'
    }
  ]
})

describe('assembleObituaryContext', () => {
  it('loads identity, journal, people log entries, campaign summary, and npc history', () => {
    const db = createTestDb()
    const { campaign, character, npc } = seedObituaryFixture(db)
    const context = assembleObituaryContext(db, campaign.id, character.id, 'legendary_dying')

    expect(context.characterName).toBe('Elowen')
    expect(context.identity.who).toBe('A ranger of the north')
    expect(context.journalEntries).toHaveLength(1)
    expect(context.peopleLogEntries).toHaveLength(1)
    expect(context.currentStateSummary).toBe('The border war has turned desperate.')
    expect(context.npcHistories).toHaveLength(1)
    expect(context.npcHistories[0]?.npcId).toBe(npc.id)
    expect(context.npcHistories[0]?.memories).toHaveLength(1)
  })
})

describe('generateObituary happy path', () => {
  it('returns a validated obituary on the happy path', async () => {
    const db = createTestDb()
    const { campaign, character, npc } = seedObituaryFixture(db)
    const context = assembleObituaryContext(db, campaign.id, character.id, 'legendary_dying')
    const provider = createScriptedProvider([
      validObituaryJson.replace('npc-placeholder', npc.id)
    ])

    const obituary = enrichObituaryNpcNames(db, await generateObituary(provider, context))

    expect(obituary.narrativeBody).toContain('Elowen')
    expect(obituary.npcReactions).toHaveLength(1)
    expect(obituary.npcReactions[0]?.npcName).toBe('Bram')
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.prompt).toContain('Log-book People entries')
    expect(provider.calls[0]?.prompt).toContain('Bram')
  })

  it('includes npc reactions when log-book People entries exist', async () => {
    const db = createTestDb()
    const { campaign, character, npc } = seedObituaryFixture(db)
    const context = assembleObituaryContext(db, campaign.id, character.id, 'legendary_dying')
    const provider = createScriptedProvider([
      JSON.stringify({
        deathCause: 'legendary_dying',
        narrativeBody: 'A ranger remembered.',
        npcReactions: [{ npcId: npc.id, tone: 'positive', reaction: 'She was family to us.' }]
      })
    ])

    const obituary = enrichObituaryNpcNames(db, await generateObituary(provider, context))

    expect(obituary.npcReactions[0]?.npcId).toBe(npc.id)
    expect(obituary.npcReactions[0]?.reaction).toContain('family')
  })
})

describe('generateObituary schema retries', () => {
  it('retries malformed responses until schema validates', async () => {
    const db = createTestDb()
    const { campaign, character, npc } = seedObituaryFixture(db)
    const context = assembleObituaryContext(db, campaign.id, character.id, 'legendary_dying')
    const provider = createScriptedProvider([
      'not json',
      validObituaryJson.replace('npc-placeholder', npc.id)
    ])

    const obituary = enrichObituaryNpcNames(db, await generateObituary(provider, context))

    expect(obituary.deathCause).toBe('legendary_dying')
    expect(provider.calls).toHaveLength(2)
  })

  it('throws after exhausting schema retries', async () => {
    const db = createTestDb()
    const { campaign, character } = seedObituaryFixture(db)
    const context = assembleObituaryContext(db, campaign.id, character.id, 'legendary_dying')
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])

    await expect(generateObituary(provider, context)).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})

describe('persistObituaryOnDeath', () => {
  it('persists death status and obituary atomically', async () => {
    const db = createTestDb()
    const { campaign, character, npc } = seedObituaryFixture(db)
    const context = assembleObituaryContext(db, campaign.id, character.id, 'legendary_dying')
    const provider = createScriptedProvider([
      validObituaryJson.replace('npc-placeholder', npc.id)
    ])
    const obituary = enrichObituaryNpcNames(db, await generateObituary(provider, context))

    persistObituaryOnDeath(db, {
      characterId: character.id,
      deathCause: 'legendary_dying',
      obituary
    })

    const fetched = getCharacterById(db, character.id)
    expect(fetched?.lifeStatus).toBe('dead')
    expect(fetched?.deathCause).toBe('legendary_dying')
    expect(fetched?.obituary).toEqual(obituary)
  })
})
