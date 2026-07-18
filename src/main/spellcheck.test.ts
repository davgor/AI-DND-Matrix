import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContextMenuParams, Session, WebContents } from 'electron'

const appended: Array<Record<string, unknown>> = []

vi.mock('electron', () => {
  class MenuItem {
    options: Record<string, unknown>
    constructor(options: Record<string, unknown>) {
      this.options = options
    }
  }

  class Menu {
    items: MenuItem[] = []
    append(item: MenuItem): void {
      this.items.push(item)
      appended.push(item.options)
    }
  }

  return {
    app: { getLocale: () => 'en-US' },
    Menu,
    MenuItem
  }
})

import { buildEditableContextMenu, spellCheckerLanguages } from './spellcheck'

function editableParams(overrides: Partial<ContextMenuParams> = {}): ContextMenuParams {
  return {
    isEditable: true,
    misspelledWord: '',
    dictionarySuggestions: [],
    selectionText: '',
    ...overrides
  } as ContextMenuParams
}

function menuDeps(): { webContents: WebContents; session: Session } {
  return {
    webContents: { replaceMisspelling: vi.fn() } as unknown as WebContents,
    session: { addWordToSpellCheckerDictionary: vi.fn() } as unknown as Session
  }
}

function menuLabels(): Array<unknown> {
  return appended.map((item) => item['label'] ?? item['role'] ?? item['type'])
}

describe('spellCheckerLanguages', () => {
  it('prefers the app locale, its language base, and en-US', () => {
    expect(spellCheckerLanguages('en-GB')).toEqual(['en-GB', 'en', 'en-US'])
  })

  it('deduplicates when locale is already en-US', () => {
    expect(spellCheckerLanguages('en-US')).toEqual(['en-US', 'en'])
  })
})

describe('buildEditableContextMenu', () => {
  beforeEach(() => {
    appended.length = 0
  })

  it('adds spelling suggestions and add-to-dictionary for misspelled text', () => {
    const replaceMisspelling = vi.fn()
    const addWordToSpellCheckerDictionary = vi.fn()
    const webContents = { replaceMisspelling } as unknown as WebContents
    const session = { addWordToSpellCheckerDictionary } as unknown as Session

    buildEditableContextMenu(
      webContents,
      session,
      editableParams({ misspelledWord: 'teh', dictionarySuggestions: ['the', 'tea'] })
    )

    expect(menuLabels().slice(0, 5)).toEqual([
      'the',
      'tea',
      'separator',
      'Add to dictionary',
      'separator'
    ])
    ;(appended[0]?.['click'] as (() => void) | undefined)?.()
    expect(replaceMisspelling).toHaveBeenCalledWith('the')
    ;(appended[3]?.['click'] as (() => void) | undefined)?.()
    expect(addWordToSpellCheckerDictionary).toHaveBeenCalledWith('teh')
  })

  it('offers edit roles for editable fields without a misspelling', () => {
    const { webContents, session } = menuDeps()
    const menu = buildEditableContextMenu(webContents, session, editableParams())

    expect(menu.items).toHaveLength(4)
    expect(menuLabels()).toEqual(['cut', 'copy', 'paste', 'selectAll'])
  })

  it('offers copy for non-editable selections', () => {
    const { webContents, session } = menuDeps()
    const menu = buildEditableContextMenu(
      webContents,
      session,
      editableParams({ isEditable: false, selectionText: 'hello' })
    )

    expect(menu.items).toHaveLength(1)
    expect(appended[0]?.['role']).toBe('copy')
  })
})
