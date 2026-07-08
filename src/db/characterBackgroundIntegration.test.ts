import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { applyBackgroundSelection } from '../main/backgroundIpc'
import { applyRaceSelection } from '../main/raceIpc'
import { kickoffIdentityInterviewIfNeeded } from '../main/guidedCreationIdentity'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'
import { setGuidedCreationPhase } from './repositories/guidedCreation'

const ELF_LORE = {
  summary: 'Elves guard the mistwood.',
  appearance: 'Pale and tall.',
  culture: 'Reclusive.',
  roleInThisLand: 'Wardens.',
  hooks: ['A grove dies.']
}

describe('character background integration onboarding handoff', () => {
  it('walks race apply to background apply and feeds background into identity kickoff', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'A realm.', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })

    await applyRaceSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      kind: 'preset',
      raceKey: 'human',
      label: 'Human',
      seedPrompt: 'Adaptable.',
      finalLore: ELF_LORE
    })
    expect(getCharacterById(db, player.id)?.guidedCreationPhase).toBe('background')

    const applyResult = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier',
      backgroundStory: 'Years on the northern border.'
    })
    expect(applyResult.ok).toBe(true)
    expect(getCharacterById(db, player.id)?.guidedCreationPhase).toBe('equipment')

    setGuidedCreationPhase(db, player.id, 'identity')
    const provider = createScriptedProvider([
      JSON.stringify({ dmReply: 'Who are you beyond the ranks?' })
    ])
    await kickoffIdentityInterviewIfNeeded(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })
    // Static identity/background context moved to systemPrompt (ticket 040.10)
    expect(provider.calls[0]?.context?.systemPrompt).toContain('Soldier')
    expect(provider.calls[0]?.context?.systemPrompt).toContain('You served in an army')
    expect(provider.calls[0]?.context?.systemPrompt).toContain('Years on the northern border.')
  })
})
