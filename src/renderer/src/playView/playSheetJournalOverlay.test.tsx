/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import type { Character } from '../../../db/repositories/characters'
import { CharacterJournalSection } from '../characterSheet/CharacterJournalSection'
import { buttonEntries } from './askDmTestUtils'

const linksState = {
  personCandidates: [{ npcId: 'npc-mira', name: 'Mira' }],
  knownDossiers: [{ npcId: 'npc-mira', name: 'Mira' }],
  refresh: (): void => {}
}

vi.mock('../characterSheet/useJournalPersonLinks', () => ({
  useJournalPersonLinks: () => linksState
}))

vi.mock('../characterSheet/useCharacterJournal', () => ({
  useCharacterJournal: () => ({
    entries: [
      {
        id: 'j1',
        campaignId: 'camp-1',
        characterId: 'char-1',
        content: 'Met Mira at dusk.',
        inGameDate: 1,
        createdAt: '2026-07-20T00:00:00.000Z'
      }
    ],
    refresh: async () => {}
  })
}))

type JsxNode = {
  type?: unknown
  props?: { className?: string; children?: unknown; onOpenNpcDossier?: (npcId: string) => void }
}

function childList(children: unknown): unknown[] {
  if (children == null) {
    return []
  }
  return Array.isArray(children) ? children : [children]
}

function collectClassNames(node: unknown): string[] {
  if (node == null || typeof node !== 'object') {
    return []
  }
  const { props } = node as JsxNode
  const own = typeof props?.className === 'string' ? [props.className] : []
  return own.concat(childList(props?.children).flatMap(collectClassNames))
}

function findCharacterJournalSection(node: unknown): JsxNode | null {
  if (node == null || typeof node !== 'object') {
    return null
  }
  const el = node as JsxNode
  if (el.type === CharacterJournalSection) {
    return el
  }
  for (const child of childList(el.props?.children)) {
    const found = findCharacterJournalSection(child)
    if (found !== null) {
      return found
    }
  }
  return null
}

describe('PlaySheetJournalTab overlay padding', () => {
  it('renders a padded journal modal panel when open', async () => {
    const { PlaySheetJournalTab } = await import('./playSheetJournalOverlay')
    const character = { id: 'char-1', name: 'Test' } as Character
    const tree = PlaySheetJournalTab({
      character,
      campaignId: 'camp-1',
      isOpen: true,
      onClose: () => {},
      onOpenNpcDossier: () => {}
    })
    const classNames = collectClassNames(tree)
    expect(classNames.some((name) => name.includes('play-sheet-journal-modal'))).toBe(true)
    expect(classNames.some((name) => name.includes('play-sheet-journal-header'))).toBe(true)
  })

  it('renders nothing when closed', async () => {
    const { PlaySheetJournalTab } = await import('./playSheetJournalOverlay')
    const character = { id: 'char-1', name: 'Test' } as Character
    const tree = PlaySheetJournalTab({
      character,
      campaignId: 'camp-1',
      isOpen: false,
      onClose: () => {},
      onOpenNpcDossier: () => {}
    })
    expect(tree).toBeNull()
  })
})

describe('PlaySheetJournalTab dossier wiring', () => {
  it('forwards person candidates, known dossiers, and onOpenNpcDossier', async () => {
    const { PlaySheetJournalTab } = await import('./playSheetJournalOverlay')
    const character = { id: 'char-1', name: 'Hero' } as Character
    const onOpenNpcDossier = vi.fn()
    const tree = PlaySheetJournalTab({
      character,
      campaignId: 'camp-1',
      isOpen: true,
      onClose: () => {},
      onOpenNpcDossier
    })

    const section = findCharacterJournalSection(tree)
    expect(section?.props).toMatchObject({
      personCandidates: linksState.personCandidates,
      knownDossiers: linksState.knownDossiers,
      onOpenNpcDossier
    })

    const rendered = CharacterJournalSection({
      character,
      personCandidates: linksState.personCandidates,
      knownDossiers: linksState.knownDossiers,
      onOpenNpcDossier
    })
    const mira = buttonEntries(rendered).find((button) => button.label === 'Mira')
    expect(mira).toBeDefined()
    mira?.onClick?.()
    expect(onOpenNpcDossier).toHaveBeenCalledWith('npc-mira')
  })
})
