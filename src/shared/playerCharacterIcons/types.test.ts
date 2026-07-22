import { describe, expect, it } from 'vitest'
import { PLAYER_CHARACTER_ICON_ENTITY_KIND } from './types'

describe('playerCharacterIcons defaults', () => {
  it('uses player_character entity kind for player icons', () => {
    expect(PLAYER_CHARACTER_ICON_ENTITY_KIND).toBe('player_character')
  })
})
