import { describe, expect, it } from 'vitest'
import { formatChatMessageTokens, tokenizeChatMessage } from './chatTokenize'

describe('tokenizeChatMessage', () => {
  it('italicizes separate action lines without spanning the spoken line between them', () => {
    const input = `*I look over at you*
Wasn't that you I saw at the in last week
*I sit next to you*`

    expect(tokenizeChatMessage(input)).toEqual([
      { type: 'em', content: 'I look over at you' },
      { type: 'text', content: "\nWasn't that you I saw at the in last week\n" },
      { type: 'em', content: 'I sit next to you' }
    ])
  })

  it('breaks an action span at a newline instead of swallowing the next line', () => {
    expect(
      tokenizeChatMessage(`*I look over at you
Wasn't that you I saw at the in last week
*I sit next to you*`)
    ).toEqual([
      { type: 'em', content: 'I look over at you' },
      { type: 'text', content: "\nWasn't that you I saw at the in last week\n" },
      { type: 'em', content: 'I sit next to you' }
    ])
  })

  it('breaks an action span when another delimiter appears inside it', () => {
    expect(tokenizeChatMessage('*I look over at you "hello" there*')).toEqual([
      { type: 'em', content: 'I look over at you ' },
      { type: 'text', content: '"hello" there*' }
    ])
  })

  it('leaves apostrophes in contractions as punctuation between action lines', () => {
    expect(tokenizeChatMessage("*I look over at you*\nWasn't that you\n*I sit next to you*")).toEqual([
      { type: 'em', content: 'I look over at you' },
      { type: 'text', content: "\nWasn't that you\n" },
      { type: 'em', content: 'I sit next to you' }
    ])
  })

  it('keeps standalone quote-wrapped action lines italicized', () => {
    expect(tokenizeChatMessage('"I raise an eyebrow"')).toEqual([{ type: 'em', content: 'I raise an eyebrow' }])
  })
})

describe('formatChatMessageTokens', () => {
  it('collapses stacked newlines around action lines', () => {
    expect(
      formatChatMessageTokens(`*I look over at you*


Wasn't that you


*I sit next to you*`)
    ).toEqual([
      { type: 'em', content: 'I look over at you' },
      { type: 'text', content: "Wasn't that you" },
      { type: 'em', content: 'I sit next to you' }
    ])
  })
})
