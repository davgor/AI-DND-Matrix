import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  completeIdentityPhase,
  completeOpeningScenePhase,
  readGuidedCreationFields,
  setGuidedCreationPhase,
  updateIdentityFoundationSummary
} from './guidedCreation'
import {
  appendGuidedCreationMessage,
  listGuidedCreationMessagesByCharacter,
  listGuidedCreationMessagesByPhase
} from './guidedCreationMessages'

function seedPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Guided',
    premisePrompt: 'test',
    deathMode: 'legendary'
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
    kind: 'ai_party_member'
  })
  return { campaign, hero, ally }
}

describe('guidedCreationMessages repository', () => {
  it('appends and lists messages chronologically by phase', () => {
    const db = createTestDb()
    const { campaign, hero } = seedPlayer(db)
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      phase: 'identity',
      role: 'dm',
      content: 'Who are you?'
    })
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      phase: 'identity',
      role: 'player',
      content: 'I am Kael.'
    })

    expect(listGuidedCreationMessagesByPhase(db, hero.id, 'identity')).toHaveLength(2)
    expect(listGuidedCreationMessagesByCharacter(db, hero.id)[0]?.role).toBe('dm')
  })

  it('isolates transcripts per character', () => {
    const db = createTestDb()
    const { campaign, hero, ally } = seedPlayer(db)
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      phase: 'identity',
      role: 'player',
      content: 'Hero line'
    })
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: ally.id,
      phase: 'identity',
      role: 'player',
      content: 'Ally line'
    })
    expect(listGuidedCreationMessagesByCharacter(db, hero.id)).toHaveLength(1)
    expect(listGuidedCreationMessagesByCharacter(db, ally.id)).toHaveLength(1)
  })
})

describe('guidedCreation phase transitions', () => {
  it('updates foundation summaries and advances phases', () => {
    const db = createTestDb()
    const { hero } = seedPlayer(db)
    updateIdentityFoundationSummary(db, hero.id, 'who', 'Kael, a wandering knight.')
    completeIdentityPhase(db, hero.id)
    expect(readGuidedCreationFields(db, hero.id)?.guidedCreationPhase).toBe('opening_scene')

    completeOpeningScenePhase(db, hero.id, 'Rain hammers the tavern roof as you arrive.')
    const fields = readGuidedCreationFields(db, hero.id)
    expect(fields?.guidedCreationPhase).toBe('complete')
    expect(fields?.openingScene).toContain('tavern')
  })

  it('starts new player characters in equipment phase', () => {
    const db = createTestDb()
    const { hero } = seedPlayer(db)
    expect(readGuidedCreationFields(db, hero.id)?.guidedCreationPhase).toBe('race')
    setGuidedCreationPhase(db, hero.id, 'complete')
    expect(readGuidedCreationFields(db, hero.id)?.guidedCreationPhase).toBe('complete')
  })
})
