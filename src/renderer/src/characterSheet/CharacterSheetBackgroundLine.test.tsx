import { describe, expect, it } from 'vitest'
import { CharacterSheetBackgroundLine } from './CharacterSheetBackgroundLine'

describe('CharacterSheetBackgroundLine', () => {
  it('renders background label when present', () => {
    const tree = CharacterSheetBackgroundLine({ backgroundLabel: 'Soldier' })
    expect(tree?.props.className).toBe('character-sheet-background')
    expect(tree?.props.children).toBe('Soldier')
  })

  it('returns null when background is missing', () => {
    expect(CharacterSheetBackgroundLine({ backgroundLabel: null })).toBeNull()
  })
})
