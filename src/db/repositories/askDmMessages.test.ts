import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { appendAskDmMessage, listAskDmMessagesByCharacter } from './askDmMessages'

function seedCharacter(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'OOC Test',
    premisePrompt: 'A test campaign.',
    deathMode: 'legendary'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aldric',
    characterClass: 'wizard',
    kind: 'player'
  })
  return { campaign, character }
}

describe('askDmMessages repository', () => {
  it('appends and lists messages in chronological order for a character', () => {
    const db = createTestDb()
    const { campaign, character } = seedCharacter(db)

    const player = appendAskDmMessage(db, {
      campaignId: campaign.id,
      characterId: character.id,
      role: 'player',
      content: 'What is my AC again?',
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    const dm = appendAskDmMessage(db, {
      campaignId: campaign.id,
      characterId: character.id,
      role: 'dm',
      content: 'Your AC is 14 with mage armor.',
      createdAt: '2026-01-01T00:00:01.000Z'
    })

    expect(listAskDmMessagesByCharacter(db, character.id)).toEqual([player, dm])
  })

  it('scopes messages to the requested character', () => {
    const db = createTestDb()
    const { campaign, character } = seedCharacter(db)
    const other = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Bran',
      characterClass: 'fighter',
      kind: 'player'
    })

    appendAskDmMessage(db, {
      campaignId: campaign.id,
      characterId: character.id,
      role: 'player',
      content: 'Rules question'
    })
    appendAskDmMessage(db, {
      campaignId: campaign.id,
      characterId: other.id,
      role: 'player',
      content: 'Other thread'
    })

    expect(listAskDmMessagesByCharacter(db, character.id)).toHaveLength(1)
    expect(listAskDmMessagesByCharacter(db, character.id)[0]?.content).toBe('Rules question')
  })
})
