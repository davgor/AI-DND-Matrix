import { describe, expect, it } from 'vitest'
import { toJournalKnownDossiers } from './knownDossiers'

describe('toJournalKnownDossiers', () => {
  it('includes only NPCs with a non-null opinionSummary', () => {
    expect(
      toJournalKnownDossiers([
        { id: 'npc-a', name: 'Ada', opinionSummary: 'Friendly.' },
        { id: 'npc-b', name: 'Boris', opinionSummary: null },
        { id: 'npc-c', name: 'Cora', opinionSummary: 'Suspicious.' }
      ])
    ).toEqual([
      { npcId: 'npc-a', name: 'Ada' },
      { npcId: 'npc-c', name: 'Cora' }
    ])
  })

  it('returns empty when none have a generated opinion', () => {
    expect(
      toJournalKnownDossiers([
        { id: 'npc-a', name: 'Ada', opinionSummary: null },
        { id: 'npc-b', name: 'Boris', opinionSummary: null }
      ])
    ).toEqual([])
  })
})
