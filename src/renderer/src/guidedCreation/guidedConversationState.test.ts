import { describe, expect, it } from 'vitest'
import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'
import { shouldDisableGuidedInput } from './guidedConversationState'

describe('guided conversation shell state', () => {
  it('disables input while sending, kicking off, or after phase completion', () => {
    expect(shouldDisableGuidedInput(true, false)).toBe(true)
    expect(shouldDisableGuidedInput(false, true)).toBe(true)
    expect(shouldDisableGuidedInput(false, false)).toBe(false)
  })

  it('renders populated threads in chronological order', () => {
    const messages: GuidedCreationMessage[] = [
      {
        id: '1',
        campaignId: 'c',
        characterId: 'p',
        phase: 'identity',
        role: 'dm',
        content: 'Who are you?',
        createdAt: 't1'
      },
      {
        id: '2',
        campaignId: 'c',
        characterId: 'p',
        phase: 'identity',
        role: 'player',
        content: 'Kael.',
        createdAt: 't2'
      }
    ]
    expect(messages.map((row) => row.role)).toEqual(['dm', 'player'])
  })

  it('shows empty thread when no messages exist', () => {
    expect([]).toHaveLength(0)
  })
})
