import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { listGuidedCreationMessagesByCharacter } from '../db/repositories/guidedCreationMessages'
import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'
import { applyStartingLoadout } from '../db/repositories/startingLoadout'
import { sendGuidedCreationMessage, kickoffGuidedCreationIdentity, revertGuidedCreationPhase, generateGuidedCreationReply } from './guidedCreationIpc'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { getSpellByKey } from '../db/catalog/spells'

function seedGuidedCampaign(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Guided',
    premisePrompt: 'A haunted marsh.',
    deathMode: 'legendary'
  })
  createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: 'A village.' })
  createStoryThread(db, {
    campaignId: campaign.id,
    title: 'Main',
    state: 'starting',
    summary: 'Something stirs.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
  })
  setGuidedCreationPhase(db, player.id, 'identity')
  return { campaign, player }
}

describe('kickoffGuidedCreationIdentity', () => {
  it('persists a who-focused DM opener when identity phase has no messages', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Who are you, beyond the name on your sheet?'
      })
    ])

    const result = await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(result).toEqual({ ok: true, kickedOff: true })
    const messages = listGuidedCreationMessagesByCharacter(db, player.id)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.role).toBe('dm')
    expect(messages[0]?.content).toContain('Who')
  })

  it('is idempotent when identity messages already exist', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({ dmReply: 'Who are you?' }),
      JSON.stringify({ dmReply: 'Should not be used.' })
    ])

    await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })
    const second = await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(second).toEqual({ ok: true, kickedOff: false })
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(1)
    expect(provider.calls).toHaveLength(1)
  })
})

describe('kickoffGuidedCreationIdentity prior setup context', () => {
  it('grounds the kickoff prompt in starting gear and known spells from setup', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Guided',
      premisePrompt: 'A haunted marsh.',
      deathMode: 'legendary'
    })
    createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: 'A village.' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'equipment',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 }, ac: 11, maxHp: 12 }
    })
    expect(
      applyStartingLoadout(db, player.id, {
        weaponName: 'Longsword',
        armorName: 'Chain Hauberk',
        offHandChoice: 'Wooden Shield',
        spellKeys: ['rallying-strike']
      })
    ).toEqual({ ok: true })
    const spellName = getSpellByKey(db, 'rallying-strike')?.name
    expect(spellName).toBeTruthy()

    const provider = createScriptedProvider([
      JSON.stringify({ dmReply: 'Who are you beyond the fighter on your sheet?' })
    ])
    await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Longsword')
    expect(systemPrompt).toContain('Chain Hauberk')
    expect(systemPrompt).toContain('Wooden Shield')
    expect(systemPrompt).toContain(spellName!)
    expect(provider.calls[0]?.prompt.toLowerCase()).toMatch(/do not invent an opening scene/)
  })
})

describe('sendGuidedCreationMessage identity phase', () => {
  it('persists identity-phase messages and foundation summaries', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Who are you?',
        foundations: {
          who: { complete: true, summary: 'Kael, a knight.' },
          why: { complete: false },
          where: { complete: false },
          what: { complete: false }
        },
        allFoundationsComplete: false
      })
    ])

    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity',
      message: 'I am Kael.'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.foundations?.who.complete).toBe(true)
    }
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(2)
  })

  it('rejects messages sent in the wrong phase', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([])
    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      message: 'Start in the tavern.'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_phase' })
  })
})

describe('sendGuidedCreationMessage identity phase completion gate', () => {
  it('does not advance the phase when the model claims completion with incomplete foundations', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'We are done!',
        foundations: {
          who: { complete: true, summary: 'Kael, a knight.' },
          why: { complete: false },
          where: { complete: false },
          what: { complete: false }
        },
        allFoundationsComplete: true
      })
    ])

    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity',
      message: 'I am Kael. That is all.'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.allFoundationsComplete).toBe(false)
      expect(result.guidedCreationPhase).toBe('identity')
    }
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('identity')
    expect(readGuidedCreationFields(db, player.id)?.identityWhy).toBeNull()
  })
})

describe('sendGuidedCreationMessage identity summary lock-in', () => {
  it('keeps the first locked summary when a later turn re-emits a different one', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const foundations = (whoSummary: string) => ({
      who: { complete: true, summary: whoSummary },
      why: { complete: false },
      where: { complete: false },
      what: { complete: false }
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Locked in.',
        foundations: foundations('Kael, a knight with a storied past.'),
        allFoundationsComplete: false
      }),
      JSON.stringify({
        dmReply: 'As I said, locked in.',
        foundations: foundations('Kael.'),
        allFoundationsComplete: false
      })
    ])
    const sendInput = {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity' as const
    }

    await sendGuidedCreationMessage(db, provider, { ...sendInput, message: 'I am Kael, a knight.' })
    await sendGuidedCreationMessage(db, provider, { ...sendInput, message: 'Anything else?' })

    expect(readGuidedCreationFields(db, player.id)?.identityWho).toBe('Kael, a knight with a storied past.')
  })
})

describe('sendGuidedCreationMessage Where starting region', () => {
  it('persists currentRegionId when Where locks to a generated region', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Blackmire',
      description: 'A flooded fen.'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Blackmire it is — you begin among the reeds.',
        foundations: {
          who: { complete: true, summary: 'Kael, a knight.' },
          why: { complete: true, summary: 'Justice.' },
          where: { complete: true, summary: 'Starts in Blackmire; grew up nearby.' },
          what: { complete: true, summary: 'A fighter.' }
        },
        allFoundationsComplete: true,
        startingRegionId: region.id
      })
    ])

    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity',
      message: 'I start in Blackmire.'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.allFoundationsComplete).toBe(true)
    }
    const updated = getCharacterById(db, player.id)
    expect(updated).toBeTruthy()
    expect((updated!.stats as { currentRegionId?: string }).currentRegionId).toBe(region.id)
  })
})

describe('revertGuidedCreationPhase', () => {
  it('reverts onboarding phase when navigating back', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Guided',
      premisePrompt: 'A haunted marsh.',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })
    setGuidedCreationPhase(db, player.id, 'equipment')

    expect(revertGuidedCreationPhase(db, { characterId: player.id, targetPhase: 'background' })).toEqual({
      ok: true
    })
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('background')
  })

  it('rejects invalid revert targets', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Guided',
      premisePrompt: 'A haunted marsh.',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })
    setGuidedCreationPhase(db, player.id, 'race')

    expect(revertGuidedCreationPhase(db, { characterId: player.id, targetPhase: 'background' })).toEqual({
      ok: false,
      reason: 'invalid_revert'
    })
  })
})

describe('generateGuidedCreationReply', () => {
  it('returns a player reply draft without appending transcript messages', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    await kickoffGuidedCreationIdentity(db, createScriptedProvider([
      JSON.stringify({ dmReply: 'Who are you, beyond the name on your sheet?' })
    ]), {
      campaignId: campaign.id,
      characterId: player.id
    })
    const provider = createScriptedProvider(['I am Kael, a fighter from the marsh edge.'])

    const result = await generateGuidedCreationReply(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity'
    })

    expect(result).toEqual({
      ok: true,
      reply: 'I am Kael, a fighter from the marsh edge.'
    })
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(1)
    expect(listGuidedCreationMessagesByCharacter(db, player.id)[0]?.role).toBe('dm')
    expect(provider.calls[0]?.prompt).toContain('Who are you, beyond the name on your sheet?')
    expect(provider.calls[0]?.prompt).toContain('Kael')
  })

  it('rejects when phase does not match the character guided-creation phase', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider(['Should not run.'])

    const result = await generateGuidedCreationReply(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene'
    })

    expect(result).toEqual({ ok: false, reason: 'invalid_phase' })
    expect(provider.calls).toHaveLength(0)
  })

  it('passes an existing draft into the generation prompt', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider(['I am Kael of the marsh.'])

    await generateGuidedCreationReply(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity',
      existingDraft: 'quiet knight'
    })

    expect(provider.calls[0]?.prompt).toContain('quiet knight')
  })
})
