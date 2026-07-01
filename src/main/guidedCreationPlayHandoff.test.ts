import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { appendGuidedCreationMessage } from '../db/repositories/guidedCreationMessages'
import { buildNarrationLog } from './narrationLog'
import {
  deriveOpeningSceneText,
  finalizeOpeningSceneForPlay,
  importOpeningSceneTranscriptToNarrationLog
} from './guidedCreationPlayHandoff'

function seedOpeningSceneCharacter(db: ReturnType<typeof createTestDb>) {
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
  db.prepare(`UPDATE characters SET guided_creation_phase = 'opening_scene' WHERE id = ?`).run(player.id)
  return { campaign, player }
}

describe('deriveOpeningSceneText', () => {
  it('prefers persisted opening scene text over transcript', () => {
    expect(
      deriveOpeningSceneText('Rain on the roof.', [
        {
          id: '1',
          campaignId: 'c',
          characterId: 'p',
          phase: 'opening_scene',
          role: 'dm',
          content: 'Start in the tavern?',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ])
    ).toBe('Rain on the roof.')
  })
})

describe('importOpeningSceneTranscriptToNarrationLog', () => {
  it('imports opening-scene messages into the play narration log once', () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCharacter(db)
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      role: 'dm',
      content: 'Where should we begin?',
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      role: 'player',
      content: 'At the tavern.',
      createdAt: '2026-01-01T00:00:01.000Z'
    })

    expect(importOpeningSceneTranscriptToNarrationLog(db, campaign.id, player.id)).toBe(true)
    expect(importOpeningSceneTranscriptToNarrationLog(db, campaign.id, player.id)).toBe(false)

    const log = buildNarrationLog(db, campaign.id, player.id)
    expect(log.map((entry) => entry.text)).toEqual(['Where should we begin?', 'At the tavern.'])
  })
})

describe('finalizeOpeningSceneForPlay', () => {
  it('completes opening scene and imports transcript when the player is ready early', () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCharacter(db)
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      role: 'dm',
      content: 'Describe your opening scene.',
      createdAt: '2026-01-01T00:00:00.000Z'
    })

    const result = finalizeOpeningSceneForPlay(db, campaign.id, player.id)

    expect(result).toEqual({ ok: true })
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('complete')
    expect(readGuidedCreationFields(db, player.id)?.openingScene).toBe('Describe your opening scene.')
    expect(buildNarrationLog(db, campaign.id, player.id).map((entry) => entry.text)).toEqual([
      'Describe your opening scene.'
    ])
  })
})
