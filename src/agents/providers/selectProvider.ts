import { createClaudeProvider } from './claude'
import type { Provider } from './types'

export type AgentProviderName = 'player2' | 'claude'

export interface ProviderRegistryConfig {
  claudeApiKey: string | undefined
  claudeModel: string
}

function createPlayer2Stub(): Provider {
  return {
    async generate(): Promise<string> {
      throw new Error('Player2 provider adapter is not implemented yet (see board epic 014)')
    }
  }
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
    player2: createPlayer2Stub()
  }
}
