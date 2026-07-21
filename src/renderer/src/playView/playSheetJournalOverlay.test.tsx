import { describe, expect, it } from 'vitest'
import type { Character } from '../../../db/repositories/characters'

type JsxNode = { props?: { className?: string; children?: unknown } }

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

describe('PlaySheetJournalTab overlay padding', () => {
  it('renders a padded journal modal panel when open', async () => {
    const { PlaySheetJournalTab } = await import('./playSheetJournalOverlay')
    const character = { id: 'char-1', name: 'Test' } as Character
    const tree = PlaySheetJournalTab({
      character,
      isOpen: true,
      onClose: () => {}
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
      isOpen: false,
      onClose: () => {}
    })
    expect(tree).toBeNull()
  })
})
