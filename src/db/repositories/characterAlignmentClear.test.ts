import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { clearPendingAlignmentShift, setCharacterAlignment, setPendingAlignmentShift } from './characterAlignment'

function seedPlayer() {
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
  return { db, character }
}

describe('characterAlignment clear', () => {
  it('clears pending shift without changing alignment', () => {
    const { db, character } = seedPlayer()
    setCharacterAlignment(db, character.id, 'chaotic_good')
    setPendingAlignmentShift(db, character.id, {
      proposedAlignment: 'chaotic_neutral',
      warningText: 'Walk away.',
      flaggedAt: '2026-01-02T00:00:00.000Z'
    })

    clearPendingAlignmentShift(db, character.id)

    const row = db
      .prepare('SELECT alignment, pending_alignment_shift FROM characters WHERE id = ?')
      .get(character.id) as { alignment: string; pending_alignment_shift: string | null }
    expect(row.pending_alignment_shift).toBeNull()
    expect(row.alignment).toBe('chaotic_good')
  })
})
