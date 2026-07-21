import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../../../db/repositories/characters'
import type { CharacterJournalEntry } from '../../../shared/journal/types'
import { buttonEntries } from '../playView/askDmTestUtils'
import { CharacterJournalSection } from './CharacterJournalSection'

const journalState: { entries: CharacterJournalEntry[] } = { entries: [] }

vi.mock('./useCharacterJournal', () => ({
  useCharacterJournal: () => ({
    get entries() {
      return journalState.entries
    },
    refresh: async () => {}
  })
}))

const character = { id: 'char-1', name: 'Hero' } as Character

describe('CharacterJournalSection person matches', () => {
  beforeEach(() => {
    journalState.entries = []
  })

  it('activates a matched person link and opens with npcId', () => {
    journalState.entries = [
      {
        id: 'j1',
        campaignId: 'camp-1',
        characterId: 'char-1',
        content: 'Met Anna at the inn.',
        inGameDate: 2,
        createdAt: '2026-07-20T00:00:00.000Z'
      }
    ]
    const onOpenNpcDossier = vi.fn()
    const tree = CharacterJournalSection({
      character,
      personCandidates: [{ npcId: 'npc-anna', name: 'Anna' }],
      onOpenNpcDossier
    })
    const person = buttonEntries(tree).find((button) => button.label === 'Anna')
    expect(person).toBeDefined()
    person?.onClick?.()
    expect(onOpenNpcDossier).toHaveBeenCalledWith('npc-anna')
  })

  it('does not open dossier for unmatched plain journal text', () => {
    journalState.entries = [
      {
        id: 'j1',
        campaignId: 'camp-1',
        characterId: 'char-1',
        content: 'Rain drums on stone.',
        inGameDate: 1,
        createdAt: '2026-07-20T00:00:00.000Z'
      }
    ]
    const onOpenNpcDossier = vi.fn()
    const tree = CharacterJournalSection({
      character,
      personCandidates: [{ npcId: 'npc-anna', name: 'Anna' }],
      onOpenNpcDossier
    })
    expect(buttonEntries(tree)).toEqual([])
    expect(onOpenNpcDossier).not.toHaveBeenCalled()
  })
})
