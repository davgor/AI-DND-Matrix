import { createClaudeProvider } from './claude'
import { createPlayer2Provider } from './player2'
import type { Provider } from './types'

export type AgentProviderName = 'player2' | 'claude' | 'llamacpp'

export interface ProviderRegistryConfig {
  claudeApiKey: string | undefined
  claudeModel: string
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
    player2: createPlayer2Provider({ baseUrl: config.player2BaseUrl }),
    llamacpp: createPlayer2Provider({ baseUrl: config.llamaCppBaseUrl })
  }
}
