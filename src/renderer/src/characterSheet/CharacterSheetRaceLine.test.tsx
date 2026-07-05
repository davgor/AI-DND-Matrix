import { describe, expect, it } from 'vitest'
import { CharacterSheetRaceLine } from './CharacterSheetRaceLine'
import { collectText, findByClassName } from '../raceSelection/raceSelectionTestUtils'

describe('CharacterSheetRaceLine', () => {
  it('shows resolved race label', () => {
    const tree = CharacterSheetRaceLine({ raceLabel: 'Elf' })
    const line = findByClassName(tree, 'character-sheet-race')
    expect(collectText(line)).toBe('Elf')
  })

  it('renders nothing when race is unset', () => {
    expect(CharacterSheetRaceLine({ raceLabel: null })).toBeNull()
  })
})
