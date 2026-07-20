import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { assembleAskDmContext } from './askDmContext'
import { buildAskDmPrompt, generateAskDmReply } from './askDm'
import { createScriptedProvider } from './providers/mockHarness'

describe('buildAskDmPrompt', () => {
  it('grounds on campaign, character, recent IC lines, and forbids turn advancement', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Marsh Kings',
      premisePrompt: 'Swamps and secrets.',
      deathMode: 'legendary'
    })
    db.prepare('UPDATE campaigns SET current_state_summary = ? WHERE id = ?').run(
      'The party reached the ruined keep.',
      campaign.id
    )
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player',
      level: 3
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { playerInput: 'Who was the innkeeper again?' }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'dm_narration',
      payload: { narrationText: 'Mira wipes down the bar.' }
    })

    const context = assembleAskDmContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      playerQuestion: 'What was that NPC name?',
      oocTranscript: [{ role: 'player', content: 'Quick rules check.' }]
    })
    expect(context).not.toBeNull()
    const prompt = buildAskDmPrompt(context!)

    expect(prompt).toContain('Marsh Kings')
    expect(prompt).toContain('ruined keep')
    expect(prompt).toContain('Kael (fighter, level 3)')
    expect(prompt).toContain('Mira wipes down the bar')
    expect(prompt).toContain('Quick rules check')
    expect(prompt).toContain('Player question (out of character)')
  })
})

describe('generateAskDmReply', () => {
  const baseContext = {
    campaignId: 'camp-test',
    characterId: 'char-test',
    campaignName: 'Test',
    campaignSummary: '',
    characterName: 'Kael',
    characterClass: 'fighter',
    characterLevel: 1,
    recentIcLines: [] as string[],
    oocTranscript: [] as Array<{ role: 'player' | 'dm'; content: string }>,
    playerQuestion: 'Who runs the tavern?'
  }

  it('returns trimmed prose from the provider', async () => {
    const provider = createScriptedProvider(['  The innkeeper is Mira.  '])
    const reply = await generateAskDmReply(provider, {
      ...baseContext,
      playerQuestion: 'Who runs the tavern?'
    })

    expect(reply).toBe('The innkeeper is Mira.')
    expect(provider.calls[0]?.context?.maxTokens).toBe(512)
    expect(provider.calls[0]?.context?.systemPrompt).toContain('out of character')
    expect(provider.calls[0]?.context?.systemPrompt).toContain('Do NOT treat this message as a player turn')
  })

  it('returns null for blank provider output', async () => {
    const provider = createScriptedProvider(['   '])
    const reply = await generateAskDmReply(provider, {
      ...baseContext,
      playerQuestion: 'Rules?'
    })
    expect(reply).toBeNull()
  })

  it('returns null when the provider throws', async () => {
    const provider = createScriptedProvider([new Error('provider down')])
    const reply = await generateAskDmReply(provider, {
      ...baseContext,
      playerQuestion: 'Rules?'
    })
    expect(reply).toBeNull()
  })
})
