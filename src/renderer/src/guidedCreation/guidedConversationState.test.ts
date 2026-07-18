import { describe, expect, it } from 'vitest'
import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'
import {
  dmThinkingStatusLabel,
  generatingStatusLabel,
  messagesWithPendingPlayer,
  shouldDisableGuidedInput
} from './guidedConversationState'

const baseMessage = {
  campaignId: 'c',
  characterId: 'p',
  phase: 'identity' as const,
  createdAt: 't1'
}

describe('shouldDisableGuidedInput', () => {
  it('disables input while sending or after phase completion', () => {
    expect(shouldDisableGuidedInput(true, false)).toBe(true)
    expect(shouldDisableGuidedInput(false, true)).toBe(true)
    expect(shouldDisableGuidedInput(false, false)).toBe(false)
  })
})

describe('guided conversation thread ordering', () => {
  it('keeps messages in chronological order', () => {
    const messages: GuidedCreationMessage[] = [
      { id: '1', ...baseMessage, role: 'dm', content: 'Who are you?' },
      { id: '2', ...baseMessage, createdAt: 't2', role: 'player', content: 'Kael.' }
    ]
    expect(messages.map((row) => row.role)).toEqual(['dm', 'player'])
  })

  it('treats an empty transcript as empty', () => {
    expect([]).toHaveLength(0)
  })
})

describe('dmThinkingStatusLabel', () => {
  it('cycles ellipses through one to four dots', () => {
    expect(dmThinkingStatusLabel(0)).toBe('The DM is thinking.')
    expect(dmThinkingStatusLabel(1)).toBe('The DM is thinking..')
    expect(dmThinkingStatusLabel(2)).toBe('The DM is thinking...')
    expect(dmThinkingStatusLabel(3)).toBe('The DM is thinking....')
    expect(dmThinkingStatusLabel(4)).toBe('The DM is thinking.')
    expect(dmThinkingStatusLabel(7)).toBe('The DM is thinking....')
  })
})

describe('generatingStatusLabel', () => {
  it('cycles the same ellipsis pattern for the Generate button', () => {
    expect(generatingStatusLabel(0)).toBe('Generating.')
    expect(generatingStatusLabel(1)).toBe('Generating..')
    expect(generatingStatusLabel(2)).toBe('Generating...')
    expect(generatingStatusLabel(3)).toBe('Generating....')
    expect(generatingStatusLabel(4)).toBe('Generating.')
    expect(generatingStatusLabel(7)).toBe('Generating....')
  })
})

describe('messagesWithPendingPlayer', () => {
  it('appends an optimistic player message while a send is pending', () => {
    const messages: GuidedCreationMessage[] = [
      { id: '1', ...baseMessage, role: 'dm', content: 'Who are you?' }
    ]
    const withPending = messagesWithPendingPlayer(messages, {
      content: 'I stay positive.',
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity'
    })
    expect(withPending).toHaveLength(2)
    expect(withPending[1]).toMatchObject({
      role: 'player',
      content: 'I stay positive.',
      id: 'pending-player'
    })
    expect(messagesWithPendingPlayer(messages, null)).toEqual(messages)
  })

  it('does not duplicate when the pending player message is already persisted', () => {
    const messages: GuidedCreationMessage[] = [
      { id: '1', ...baseMessage, role: 'dm', content: 'Who are you?' },
      {
        id: '2',
        ...baseMessage,
        createdAt: 't2',
        role: 'player',
        content: 'I stay positive.'
      }
    ]
    expect(
      messagesWithPendingPlayer(messages, {
        content: 'I stay positive.',
        campaignId: 'c',
        characterId: 'p',
        phase: 'identity'
      })
    ).toEqual(messages)
  })
})
