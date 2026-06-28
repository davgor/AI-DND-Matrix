export interface GenerateContext {
  systemPrompt?: string
  maxTokens?: number
}

export interface Provider {
  generate(prompt: string, context?: GenerateContext): Promise<string>
}

export interface MockProviderCall {
  prompt: string
  context?: GenerateContext
}

export interface MockProvider extends Provider {
  calls: MockProviderCall[]
}

export function createMockProvider(response: string): MockProvider {
  const calls: MockProviderCall[] = []
  return {
    calls,
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      calls.push({ prompt, context })
      return response
    }
  }
}
