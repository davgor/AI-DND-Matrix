import { describe, expect, it } from 'vitest'
import {
  buildCompanionAvatarContent,
  companionAvatarInitial,
  companionOrderDraftForSelection,
  companionPortraitSrc
} from './playCompanionRosterLogic'
import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'

const ENTRY: CompanionRosterEntry = {
  id: 'c1',
  name: 'Bryn',
  characterClass: 'ranger',
  role: 'scout',
  portraitPath: null,
  orderText: 'Hold position'
}

describe('companionAvatarInitial', () => {
  it('uses the first letter of the companion name', () => {
    expect(companionAvatarInitial('Bryn')).toBe('B')
    expect(companionAvatarInitial('  ash ')).toBe('A')
    expect(companionAvatarInitial('')).toBe('?')
  })
})

describe('buildCompanionAvatarContent', () => {
  it('prefers portrait image when path is present', () => {
    expect(
      buildCompanionAvatarContent({
        name: 'Bryn',
        portraitPath: '/tmp/bryn.png'
      })
    ).toEqual({ kind: 'image', src: 'file:///tmp/bryn.png' })
  })

  it('falls back to letter initial when portrait is missing', () => {
    expect(
      buildCompanionAvatarContent({
        name: 'Bryn',
        portraitPath: null
      })
    ).toEqual({ kind: 'initial', text: 'B' })
  })

  it('falls back to letter initial after image load failure (no broken placeholder)', () => {
    expect(
      buildCompanionAvatarContent({
        name: 'Bryn',
        portraitPath: '/missing/bryn.png',
        imageFailed: true
      })
    ).toEqual({ kind: 'initial', text: 'B' })
  })
})

describe('companionPortraitSrc', () => {
  it('prefixes file:// when a path is present', () => {
    expect(companionPortraitSrc('/tmp/bryn.png')).toBe('file:///tmp/bryn.png')
    expect(companionPortraitSrc(null)).toBeUndefined()
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
