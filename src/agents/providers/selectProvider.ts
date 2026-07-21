import { createClaudeProvider } from './claude'
import { createGeminiProvider } from './gemini'
import { createGrokProvider } from './grok'
import { createOpenAiProvider } from './openai'
import { createPlayer2Provider } from './player2'
import type { Provider } from './types'

export type AgentProviderName = 'player2' | 'claude' | 'llamacpp' | 'openai' | 'gemini' | 'grok'

export interface ProviderRegistryConfig {
  claudeApiKey: string | undefined
  claudeModel: string
  openaiApiKey: string | undefined
  openaiModel: string
  geminiApiKey: string | undefined
  geminiModel: string
  grokApiKey: string | undefined
  grokModel: string
  player2BaseUrl: string
  llamaCppBaseUrl: string
}

export function selectProvider(
  agentProvider: AgentProviderName,
  registry: Record<AgentProviderName, Provider>
): Provider {
  return registry[agentProvider]
}

export function createProviderRegistry(config: ProviderRegistryConfig): Record<AgentProviderName, Provider> {
  return {
    claude: createClaudeProvider({ apiKey: config.claudeApiKey, model: config.claudeModel }),
    openai: createOpenAiProvider({ apiKey: config.openaiApiKey, model: config.openaiModel }),
    gemini: createGeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel }),
    grok: createGrokProvider({ apiKey: config.grokApiKey, model: config.grokModel }),
    player2: createPlayer2Provider({ baseUrl: config.player2BaseUrl }),
    llamacpp: createPlayer2Provider({ baseUrl: config.llamaCppBaseUrl })
  }
}
