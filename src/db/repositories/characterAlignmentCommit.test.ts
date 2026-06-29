import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  commitAlignmentShift,
  getPendingAlignmentShift,
  setCharacterAlignment,
  setPendingAlignmentShift
} from './characterAlignment'

describe('characterAlignment commit', () => {
  it('commits alignment and clears pending shift', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player'
    })

    setCharacterAlignment(db, character.id, 'lawful_good')
    setPendingAlignmentShift(db, character.id, {
      proposedAlignment: 'neutral_evil',
      warningText: 'Robbing the shrine would break your oath.',
      flaggedAt: '2026-01-01T00:00:00.000Z'
    })

    expect(getPendingAlignmentShift(db, character.id)?.proposedAlignment).toBe('neutral_evil')

    commitAlignmentShift(db, character.id, 'neutral_evil')

    const row = db
      .prepare('SELECT alignment, pending_alignment_shift FROM characters WHERE id = ?')
      .get(character.id) as { alignment: string; pending_alignment_shift: string | null }
    expect(row.alignment).toBe('neutral_evil')
    expect(row.pending_alignment_shift).toBeNull()
    expect(getPendingAlignmentShift(db, character.id)).toBeNull()
  })
})
