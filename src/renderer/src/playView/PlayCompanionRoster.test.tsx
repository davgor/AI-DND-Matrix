/** @vitest-environment happy-dom */
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'
import { mountRoot, unmountRoot } from './incomingHighlight/incomingHighlightTestUtils'
import { PlayCompanionRoster } from './PlayCompanionRoster'

const ENTRY: CompanionRosterEntry = {
  id: 'c1',
  name: 'Bryn',
  characterClass: 'ranger',
  role: 'scout',
  portraitPath: null,
  orderText: 'Hold position'
}

const noopProps = {
  selectedId: ENTRY.id as string | null,
  orderDraft: 'Hold position',
  savingOrder: false,
  onSelect: () => {},
  onOrderDraftChange: () => {},
  onSaveOrder: () => {}
}

function renderRoster(root: Root, entries: readonly CompanionRosterEntry[]): void {
  act(() => {
    root.render(
      createElement(PlayCompanionRoster, {
        entries,
        ...noopProps,
        selectedId: entries.length > 0 ? ENTRY.id : null
      })
    )
  })
}

describe('PlayCompanionRoster empty state', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    ;({ root, container } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('renders empty copy when the roster has no companions', () => {
    renderRoster(root, [])
    expect(container.querySelector('.play-companion-roster-empty')).toBeTruthy()
    expect(container.textContent).toContain('No companions')
  })
})

describe('PlayCompanionRoster populated state', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    ;({ root, container } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('renders letter-initial avatar and order control when no portrait', () => {
    renderRoster(root, [ENTRY])
    const fallback = container.querySelector('.play-companion-roster-avatar-fallback')
    expect(fallback?.textContent).toBe('B')
    expect(container.querySelector('.play-companion-roster-avatar:not(.play-companion-roster-avatar-fallback)')).toBeNull()
    const orderInput = container.querySelector('#companion-order-input') as HTMLInputElement
    expect(orderInput?.value).toBe('Hold position')
  })

  it('renders portrait image when portraitPath is set', () => {
    renderRoster(root, [{ ...ENTRY, portraitPath: '/tmp/bryn.png' }])
    const image = container.querySelector('.play-companion-roster-avatar') as HTMLImageElement
    expect(image?.tagName).toBe('IMG')
    expect(image.src).toContain('bryn.png')
    expect(container.querySelector('.play-companion-roster-avatar-fallback')).toBeNull()
  })

  it('falls back to letter initial when the portrait image fails to load', () => {
    renderRoster(root, [{ ...ENTRY, portraitPath: '/missing/bryn.png' }])
    const image = container.querySelector('.play-companion-roster-avatar') as HTMLImageElement
    expect(image?.tagName).toBe('IMG')
    act(() => {
      image.dispatchEvent(new Event('error'))
    })
    expect(container.querySelector('img.play-companion-roster-avatar')).toBeNull()
    expect(container.querySelector('.play-companion-roster-avatar-fallback')?.textContent).toBe('B')
  })
})
