import { describe, expect, it } from 'vitest'
import { parseClaudeUsage, parseOpenAiCompatibleUsage } from './usageParse'

describe('parseClaudeUsage', () => {
  it('maps Anthropic usage fields and sums total when both counts are present', () => {
    expect(
      parseClaudeUsage({ input_tokens: 100, output_tokens: 50 }, 'claude-sonnet-4-6')
    ).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      modelId: 'claude-sonnet-4-6'
    })
  })

  it('returns null token fields when usage is absent', () => {
    expect(parseClaudeUsage(undefined, 'claude-sonnet-4-6')).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      modelId: 'claude-sonnet-4-6'
    })
  })

  it('leaves totalTokens null when either count is missing', () => {
    expect(parseClaudeUsage({ input_tokens: 10 }, 'm')).toEqual({
      inputTokens: 10,
      outputTokens: null,
      totalTokens: null,
      modelId: 'm'
    })
  })
})

describe('parseOpenAiCompatibleUsage', () => {
  it('maps prompt/completion tokens and sums total when both are present', () => {
    expect(
      parseOpenAiCompatibleUsage({ prompt_tokens: 80, completion_tokens: 20 }, 'llama-local')
    ).toEqual({
      inputTokens: 80,
      outputTokens: 20,
      totalTokens: 100,
      modelId: 'llama-local'
    })
  })

  it('returns nulls when usage is absent without failing', () => {
    expect(parseOpenAiCompatibleUsage(undefined, 'player2')).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      modelId: 'player2'
    })
  })
})
