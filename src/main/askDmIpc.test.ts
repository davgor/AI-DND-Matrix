import { describe, expect, it, vi } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { listAskDmMessagesByCharacter } from '../db/repositories/askDmMessages'
import { buildNarrationLog } from './narrationLog'
import { filterDmExpositionEntries, filterSocialEntries } from '../shared/inCampaignLayout/sceneContext'
import { listAskDmHistory, sendAskDmMessage } from './askDmIpc'
import * as turnIpc from './turnIpc'

function seedPlayCampaign(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Isolation Test',
    premisePrompt: 'A quiet village.',
    deathMode: 'legendary'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Lyra',
    characterClass: 'cleric',
    kind: 'player'
  })
  return { campaign, character }
}

describe('askDm IPC persistence', () => {
  it('lists and sends OOC messages with a scripted provider round-trip', async () => {
    const db = createTestDb()
    const { campaign, character } = seedPlayCampaign(db)
    const provider = createScriptedProvider(['Your cleric has channel divinity once per short rest.'])

    expect(listAskDmHistory(db, { campaignId: campaign.id, characterId: character.id })).toEqual([])

    const result = await sendAskDmMessage(db, provider, {
      campaignId: campaign.id,
      characterId: character.id,
      message: 'How often can I use channel divinity?'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.playerMessage.role).toBe('player')
    expect(result.dmMessage.role).toBe('dm')
    expect(result.dmMessage.content).toContain('channel divinity')

    const history = listAskDmHistory(db, { campaignId: campaign.id, characterId: character.id })
    expect(history).toHaveLength(2)
    expect(history.map((message) => message.content)).toEqual([
      'How often can I use channel divinity?',
      'Your cleric has channel divinity once per short rest.'
    ])
  })
})

describe('askDm isolation: play log feeds', () => {
  it('does not project OOC messages into Scene or Social feeds', async () => {
    const db = createTestDb()
    const { campaign, character } = seedPlayCampaign(db)
    const provider = createScriptedProvider(['The NPC was named Bram.'])
    const beforeLog = buildNarrationLog(db, campaign.id, character.id)
    const beforeDm = filterDmExpositionEntries(beforeLog)
    const beforeSocial = filterSocialEntries(beforeLog)

    await sendAskDmMessage(db, provider, {
      campaignId: campaign.id,
      characterId: character.id,
      message: 'What was that smith called?'
    })

    const afterLog = buildNarrationLog(db, campaign.id, character.id)
    expect(filterDmExpositionEntries(afterLog)).toEqual(beforeDm)
    expect(filterSocialEntries(afterLog)).toEqual(beforeSocial)
    expect(afterLog.some((entry) => entry.text.includes('Bram'))).toBe(false)
  })
})

describe('askDm isolation: IC events', () => {
  it('does not append player_action or other IC events', async () => {
    const db = createTestDb()
    const { campaign, character } = seedPlayCampaign(db)
    const provider = createScriptedProvider(['Sure — your spell slots refresh on a long rest.'])
    const eventsBefore = listEventsByCampaign(db, campaign.id)

    await sendAskDmMessage(db, provider, {
      campaignId: campaign.id,
      characterId: character.id,
      message: 'Do I get spell slots back?'
    })

    const eventsAfter = listEventsByCampaign(db, campaign.id)
    expect(eventsAfter).toEqual(eventsBefore)
    expect(eventsAfter.some((event) => event.type === 'player_action')).toBe(false)
  })
})

describe('askDm isolation: turn pipeline', () => {
  it('never calls resolvePlayerTurn during OOC send', async () => {
    const db = createTestDb()
    const { campaign, character } = seedPlayCampaign(db)
    const provider = createScriptedProvider(['Attack rolls are d20 + modifier.'])
    const resolveSpy = vi.spyOn(turnIpc, 'resolvePlayerTurn')

    await sendAskDmMessage(db, provider, {
      campaignId: campaign.id,
      characterId: character.id,
      message: 'Remind me how attack rolls work?'
    })

    expect(resolveSpy).not.toHaveBeenCalled()
    resolveSpy.mockRestore()
  })
})

describe('askDm isolation: persistence', () => {
  it('persists OOC separately from events', async () => {
    const db = createTestDb()
    const { campaign, character } = seedPlayCampaign(db)
    const provider = createScriptedProvider(['Legendary death means no respawns.'])

    await sendAskDmMessage(db, provider, {
      campaignId: campaign.id,
      characterId: character.id,
      message: 'What does legendary death mode mean?'
    })

    expect(listAskDmMessagesByCharacter(db, character.id)).toHaveLength(2)
    expect(listEventsByCampaign(db, campaign.id)).toHaveLength(0)
  })
})
