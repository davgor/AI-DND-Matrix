import { describe, expect, it, vi } from 'vitest'
import { LogBookEntryCard } from './LogBookEntryCard'
import { buttonEntries } from '../playView/askDmTestUtils'
import type { LogEntry } from '../../../shared/logBook/types'

function logEntry(partial: Partial<LogEntry> & Pick<LogEntry, 'category' | 'title' | 'content'>): LogEntry {
  return {
    id: partial.id ?? 'entry-1',
    campaignId: partial.campaignId ?? 'camp-1',
    characterId: partial.characterId ?? 'char-1',
    category: partial.category,
    title: partial.title,
    content: partial.content,
    relatedEntityId: partial.relatedEntityId ?? null,
    learnedInGameDate: partial.learnedInGameDate ?? 1,
    createdAt: partial.createdAt ?? '2026-07-20T00:00:00.000Z'
  }
}

const noopCardProps = {
  relatedLabel: null,
  curateMode: false,
  editing: false,
  editTitle: '',
  editContent: '',
  onStartEdit: () => {},
  onSaveEdit: () => {},
  onCancelEdit: () => {},
  onDelete: () => {},
  onEditTitle: () => {},
  onEditContent: () => {}
}

describe('LogBookEntryCard dossier affordance', () => {
  it('shows Open dossier for person entries with relatedEntityId', () => {
    const onOpenNpcDossier = vi.fn()
    const tree = LogBookEntryCard({
      ...noopCardProps,
      entry: logEntry({
        category: 'person',
        title: 'Mira',
        content: 'Runs the inn.',
        relatedEntityId: 'npc-mira'
      }),
      relatedLabel: 'Mira',
      onOpenNpcDossier
    })
    const openButton = buttonEntries(tree).find((button) => button.label === 'Open dossier')
    expect(openButton).toBeDefined()
    openButton?.onClick?.()
    expect(onOpenNpcDossier).toHaveBeenCalledWith('npc-mira')
  })

  it('does not show Open dossier for non-person or unlinked entries', () => {
    const onOpenNpcDossier = vi.fn()
    const cases = [
      logEntry({ category: 'place', title: 'Oak Inn', content: 'A tavern.', relatedEntityId: 'npc-mira' }),
      logEntry({ category: 'person', title: 'Unknown', content: 'No link.' })
    ]
    for (const entry of cases) {
      const tree = LogBookEntryCard({
        ...noopCardProps,
        entry,
        onOpenNpcDossier
      })
      expect(buttonEntries(tree).some((button) => button.label === 'Open dossier')).toBe(false)
    }
    expect(onOpenNpcDossier).not.toHaveBeenCalled()
  })
})
