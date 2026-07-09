import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
import { createCharacterJournalEntry } from '../db/repositories/characterJournalEntries'
import { appendEvent } from '../db/repositories/events'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from './providers/mockHarness'
import {
  assembleInactivePlayerContext,
  decideInactivePlayerAction,
  listInactiveLivingPlayersInRegion
} from './inactivePlayer'

function seedTwoPlayersSameRegion() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Shared World',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Crossroads',
    description: 'Where paths meet.'
  })
  const active = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    alignment: 'lawful_good',
    stats: { currentRegionId: region.id, personality: 'bold' }
  })
  const inactive = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Lyra',
    characterClass: 'mage',
    kind: 'player',
    alignment: 'chaotic_neutral',
    stats: { currentRegionId: region.id, personality: 'curious' }
  })
  return { db, campaign, region, active, inactive }
}

describe('listInactiveLivingPlayersInRegion', () => {
  it('returns other living player characters in the same region', () => {
    const { db, campaign, region, active, inactive } = seedTwoPlayersSameRegion()
    const found = listInactiveLivingPlayersInRegion(db, campaign.id, region.id, active.id)
    expect(found.map((c) => c.id)).toEqual([inactive.id])
  })

  it('excludes dead inactive player characters', () => {
    const { db, campaign, region, active, inactive } = seedTwoPlayersSameRegion()
    db.prepare("UPDATE characters SET life_status = 'dead' WHERE id = ?").run(inactive.id)
    expect(listInactiveLivingPlayersInRegion(db, campaign.id, region.id, active.id)).toHaveLength(0)
  })
})

describe('assembleInactivePlayerContext', () => {
  it('grounds on SQLite history for the inactive character only', () => {
    const { db, campaign, region, active, inactive } = seedTwoPlayersSameRegion()
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: {
        characterId: inactive.id,
        playerInput: 'I study the runes.',
        narrationText: 'The glyphs glow faintly.'
      }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: {
        characterId: active.id,
        playerInput: 'Not my log.',
        narrationText: 'Should not appear.'
      }
    })
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: inactive.id,
      content: 'Found strange runes at the crossroads.',
      inGameDate: 1
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: inactive.id,
      category: 'place',
      title: 'Crossroads',
      content: 'A worn stone marker.',
      learnedInGameDate: 1
    })

    const context = assembleInactivePlayerContext(db, inactive.id, campaign.id)

    expect(context.inactiveCharacterId).toBe(inactive.id)
    expect(context.currentRegionId).toBe(region.id)
    expect(context.identitySummary).toContain('Lyra')
    expect(context.narrationLog.some((entry) => entry.narrationText === 'The glyphs glow faintly.')).toBe(
      true
    )
    expect(context.narrationLog.some((entry) => entry.narrationText === 'Should not appear.')).toBe(false)
    expect(context.journalEntries[0]?.content).toContain('runes')
    expect(context.logBookEntries[0]?.title).toBe('Crossroads')
    expect(context.storyThreadState).toBeNull()
  })
})

describe('decideInactivePlayerAction', () => {
  it('returns structured action text from the provider', async () => {
    const { db, campaign, inactive } = seedTwoPlayersSameRegion()
    const provider = createScriptedProvider(['{"actionText":"Lyra looks up from her journal."}'])
    const context = assembleInactivePlayerContext(db, inactive.id, campaign.id)

    const action = await decideInactivePlayerAction(
      provider,
      inactive,
      context,
      'Kael approaches the crossroads.'
    )

    expect(action.actionText).toBe('Lyra looks up from her journal.')
    expect(provider.calls[0]?.prompt).toContain('Lyra')
    expect(provider.calls[0]?.prompt).toContain('crossroads')
  })

  it('moves the action schema and standing rules into systemPrompt (040.9)', async () => {
    const { db, campaign, inactive } = seedTwoPlayersSameRegion()
    const provider = createScriptedProvider(['{"actionText":"Lyra nods."}'])
    const context = assembleInactivePlayerContext(db, inactive.id, campaign.id)

    await decideInactivePlayerAction(provider, inactive, context, 'Kael waves.')

    const call = provider.calls[0]!
    expect(call.prompt).not.toContain('Respond ONLY with JSON')
    expect(call.prompt).not.toContain('do not invent mechanical stat changes')
    const system = call.context?.systemPrompt ?? ''
    expect(system).toContain('Respond ONLY with JSON: {"actionText":string}')
    expect(system).toContain('do not invent mechanical stat changes')
    expect(system).toContain('no markdown fences')
  })
})
