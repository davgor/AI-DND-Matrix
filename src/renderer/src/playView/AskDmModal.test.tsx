import { describe, expect, it, vi } from 'vitest'
import { AskDmModalBody } from './AskDmModalBody'
import { buttonEntries, collectText } from './askDmTestUtils'
import type { AskDmMessage } from '../../../shared/askDm/types'

const sampleMessages: AskDmMessage[] = [
  {
    id: 'm1',
    campaignId: 'camp-1',
    characterId: 'char-1',
    role: 'player',
    content: 'What was that NPC name?',
    createdAt: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'm2',
    campaignId: 'camp-1',
    characterId: 'char-1',
    role: 'dm',
    content: 'The innkeeper is Mira.',
    createdAt: '2026-07-20T12:00:01.000Z'
  }
]

describe('AskDmModalBody: transcript', () => {
  it('shows Out of character labeling and transcript roles', () => {
    const tree = AskDmModalBody({
      messages: sampleMessages,
      loading: false,
      sending: false,
      error: null,
      inputValue: '',
      onInputChange: () => {},
      onSend: () => {}
    })
    const text = collectText(tree)
    expect(text).toContain('Out of character')
    expect(text).toContain('What was that NPC name?')
    expect(text).toContain('The innkeeper is Mira.')
    expect(text).toContain('You')
    expect(text).toContain('DM')
  })
})

describe('AskDmModalBody: loading', () => {
  it('shows loading copy while history loads', () => {
    const tree = AskDmModalBody({
      messages: [],
      loading: true,
      sending: false,
      error: null,
      inputValue: '',
      onInputChange: () => {},
      onSend: () => {}
    })
    expect(collectText(tree)).toContain('Loading')
  })
})

describe('AskDmModalBody: errors and sending', () => {
  it('shows error and disables send while sending', () => {
    const tree = AskDmModalBody({
      messages: sampleMessages,
      loading: false,
      sending: true,
      error: 'Could not reach the DM.',
      inputValue: 'Hello',
      onInputChange: () => {},
      onSend: () => {}
    })
    const text = collectText(tree)
    expect(text).toContain('Could not reach the DM.')
    const sendButton = buttonEntries(tree).find((button) => button.label === 'Sending…')
    expect(sendButton?.disabled).toBe(true)
  })
})

describe('AskDmModalBody: composer', () => {
  it('invokes onSend from the composer', () => {
    const onSend = vi.fn()
    const tree = AskDmModalBody({
      messages: [],
      loading: false,
      sending: false,
      error: null,
      inputValue: 'Rules question',
      onInputChange: () => {},
      onSend
    })
    buttonEntries(tree).find((button) => button.label === 'Send')?.onClick?.()
    expect(onSend).toHaveBeenCalledOnce()
  })
})
