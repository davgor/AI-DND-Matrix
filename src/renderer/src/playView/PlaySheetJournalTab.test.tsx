import { describe, expect, it, vi } from 'vitest'
import { PlaySheetJournalTab } from './playSheetRailTabs'
import { buttonEntries } from './askDmTestUtils'

describe('PlaySheetJournalTab journal actions', () => {
  it('shows Ask the DM directly after Open spellbook', () => {
    const tree = PlaySheetJournalTab({
      onOpenJournal: () => {},
      onOpenQuestLog: () => {},
      onOpenSpellbook: () => {},
      onOpenLogBook: () => {},
      onOpenAskDm: () => {}
    })
    const labels = buttonEntries(tree).map((button) => button.label)
    expect(labels).toEqual([
      'Open journal',
      'Open knowledge base',
      'Open quest log',
      'Open spellbook',
      'Ask the DM'
    ])
  })

  it('invokes onOpenAskDm when Ask the DM is clicked', () => {
    const onOpenAskDm = vi.fn()
    const tree = PlaySheetJournalTab({
      onOpenJournal: () => {},
      onOpenQuestLog: () => {},
      onOpenSpellbook: () => {},
      onOpenLogBook: () => {},
      onOpenAskDm
    })
    const askButton = buttonEntries(tree).find((button) => button.label === 'Ask the DM')
    askButton?.onClick?.()
    expect(onOpenAskDm).toHaveBeenCalledOnce()
  })
})
