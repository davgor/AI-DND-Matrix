import { describe, expect, it } from 'vitest'
import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'
import { PlayCompanionRoster } from './PlayCompanionRoster'
import { companionOrderDraftForSelection } from './playCompanionRosterLogic'
import { flattenJsx } from './askDmTestUtils'

const ENTRY: CompanionRosterEntry = {
  id: 'c1',
  name: 'Bryn',
  characterClass: 'ranger',
  role: 'scout',
  portraitPath: null,
  orderText: 'Hold position'
}

function normalizeChildren(children: unknown): JSX.Element[] {
  if (children === undefined || children === null) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => {
      if (child === null || child === undefined || typeof child === 'boolean') {
        return []
      }
      if (typeof child === 'string' || typeof child === 'number') {
        return []
      }
      return [child as JSX.Element]
    })
  }
  return [children as JSX.Element]
}

describe('PlayCompanionRoster empty state', () => {
  it('renders empty copy when the roster has no companions', () => {
    const node = PlayCompanionRoster({
      entries: [],
      selectedId: null,
      orderDraft: '',
      savingOrder: false,
      onSelect: () => {},
      onOrderDraftChange: () => {},
      onSaveOrder: () => {}
    })
    expect(node.props.className).toContain('play-companion-roster-empty')
    const label = normalizeChildren(node.props.children)[0]
    expect(label?.props.children).toBe('No companions')
  })
})

describe('PlayCompanionRoster populated state', () => {
  it('renders populated roster with letter-initial avatar and order control', () => {
    const node = flattenJsx(
      PlayCompanionRoster({
        entries: [ENTRY],
        selectedId: ENTRY.id,
        orderDraft: 'Hold position',
        savingOrder: false,
        onSelect: () => {},
        onOrderDraftChange: () => {},
        onSaveOrder: () => {}
      })
    ) as JSX.Element
    const children = normalizeChildren(node.props.children)
    const list = children[0]
    const listItem = normalizeChildren(list?.props.children)[0]
    const button = normalizeChildren(listItem?.props.children)[0]
    const avatar = normalizeChildren(button?.props.children)[0]
    expect(avatar?.props.className).toContain('play-companion-roster-avatar-fallback')
    expect(avatar?.props.children).toBe('B')
    const orderControl = children[1]
    const orderInput = normalizeChildren(orderControl?.props.children)[1]
    expect(orderInput?.props.value).toBe('Hold position')
  })

  it('uses portraitPath when set instead of letter initial', () => {
    const node = flattenJsx(
      PlayCompanionRoster({
        entries: [{ ...ENTRY, portraitPath: '/tmp/bryn.png' }],
        selectedId: ENTRY.id,
        orderDraft: '',
        savingOrder: false,
        onSelect: () => {},
        onOrderDraftChange: () => {},
        onSaveOrder: () => {}
      })
    ) as JSX.Element
    const list = normalizeChildren(node.props.children)[0]
    const button = normalizeChildren(normalizeChildren(list?.props.children)[0]?.props.children)[0]
    const avatar = normalizeChildren(button?.props.children)[0]
    expect(avatar?.type).toBe('img')
    expect(avatar?.props.src).toBe('file:///tmp/bryn.png')
  })
})

describe('companionOrderDraftForSelection', () => {
  it('returns empty draft when no companion is selected', () => {
    expect(companionOrderDraftForSelection([ENTRY], null)).toBe('')
  })

  it('returns stored order text for the selected companion', () => {
    expect(companionOrderDraftForSelection([ENTRY], ENTRY.id)).toBe('Hold position')
  })
})
