import type { ProviderUsageSnapshot } from '../../shared/llmUsage'

interface ClaudeUsagePayload {
  input_tokens?: number
  output_tokens?: number
}

interface OpenAiUsagePayload {
  prompt_tokens?: number
  completion_tokens?: number
}

function totalWhenBothPresent(input: number | null, output: number | null): number | null {
  if (input === null || output === null) {
    return null
  }
  return input + output
}

function nullableCount(value: number | undefined): number | null {
  return value ?? null
}

export function parseClaudeUsage(
  usage: ClaudeUsagePayload | undefined,
  modelId: string
): ProviderUsageSnapshot {
  const inputTokens = nullableCount(usage?.input_tokens)
  const outputTokens = nullableCount(usage?.output_tokens)
  return {
    inputTokens,
    outputTokens,
    totalTokens: totalWhenBothPresent(inputTokens, outputTokens),
    modelId
  }
}

export function parseOpenAiCompatibleUsage(
  usage: OpenAiUsagePayload | undefined,
  modelId: string
): ProviderUsageSnapshot {
  const inputTokens = nullableCount(usage?.prompt_tokens)
  const outputTokens = nullableCount(usage?.completion_tokens)
  return {
    inputTokens,
    outputTokens,
    totalTokens: totalWhenBothPresent(inputTokens, outputTokens),
    modelId
  }
}
