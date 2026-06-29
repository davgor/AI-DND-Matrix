import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendEvent } from '../db/repositories/events'
import { buildNarrationLog } from './narrationLog'

describe('buildNarrationLog', () => {
  it('splits a player_action event into a player entry and a dm entry', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: 'c1', playerInput: 'I sneak past', narrationText: 'You slip by unseen.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([
      expect.objectContaining({ speaker: 'player', text: 'I sneak past' }),
      expect.objectContaining({ speaker: 'dm', text: 'You slip by unseen.' })
    ])
  })

  it('maps npc_reaction and party_member_action events to single entries', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, { campaignId: campaign.id, type: 'npc_reaction', payload: { dialogue: 'Halt!' } })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_action',
      payload: { content: 'Brom scouts ahead.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log.map((entry) => entry.text)).toEqual(['Halt!', 'Brom scouts ahead.'])
    expect(log.map((entry) => entry.speaker)).toEqual(['npc', 'partyMember'])
  })

  it('strips action markers and preserves reactionKind for non-speaking NPC reactions', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        text: '**The wolf lunges at your throat.**',
        reactionKind: 'action'
      }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([
      expect.objectContaining({
        speaker: 'npc',
        text: 'The wolf lunges at your throat.',
        reactionKind: 'action'
      })
    ])
  })
})

describe('buildNarrationLog: rest, travel, and dying_resolution', () => {
  it('splits rest and travel events into a player entry and a dm entry, since both store playerInput', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'rest',
      payload: { playerInput: 'I make camp', narrationText: 'You rest.' }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'travel',
      payload: { playerInput: 'We travel north', narrationText: '2 days pass.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log.map((entry) => ({ speaker: entry.speaker, text: entry.text }))).toEqual([
      { speaker: 'player', text: 'I make camp' },
      { speaker: 'dm', text: 'You rest.' },
      { speaker: 'player', text: 'We travel north' },
      { speaker: 'dm', text: '2 days pass.' }
    ])
  })

  it('maps a dying_resolution event to a single dm entry with no player input', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'dying_resolution',
      payload: { narrationText: 'You stabilize.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([expect.objectContaining({ speaker: 'dm', text: 'You stabilize.' })])
  })

  it('ignores unrelated event types', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, { campaignId: campaign.id, type: 'region_destroyed', payload: {} })

    expect(buildNarrationLog(db, campaign.id)).toEqual([])
  })
})
