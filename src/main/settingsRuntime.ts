import type { AgentProviderName, ProviderRegistryConfig } from '../agents/providers/selectProvider'
import type { ProviderSettings } from '../shared/settings/types'
import type { AppConfig } from './config'

export interface ResolvedProviderConfig extends ProviderRegistryConfig {
  agentProvider: AgentProviderName
}

export function resolveProviderRegistryConfig(
  envConfig: AppConfig,
  persisted: ProviderSettings | null
): ResolvedProviderConfig {
  if (!persisted) {
    return {
      agentProvider: envConfig.agentProvider,
      claudeApiKey: envConfig.claudeApiKey,
      claudeModel: envConfig.claudeModel,
      player2BaseUrl: envConfig.player2BaseUrl,
      llamaCppBaseUrl: envConfig.llamaCppBaseUrl
    }
  }

  return {
    agentProvider: persisted.mode,
    claudeApiKey: persisted.claudeApiKey || envConfig.claudeApiKey,
    claudeModel: persisted.claudeModel || envConfig.claudeModel,
    player2BaseUrl: persisted.player2BaseUrl,
    llamaCppBaseUrl: persisted.llamaCppBaseUrl
  }
}
