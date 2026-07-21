import type { AgentProviderName, ProviderRegistryConfig } from '../agents/providers/selectProvider'
import { DEFAULT_CLOUD_MODELS } from '../shared/settings/modelCatalogs'
import type { ProviderMode, ProviderSettings } from '../shared/settings/types'
import type { AppConfig } from './config'

interface ResolvedProviderConfig extends ProviderRegistryConfig {
  agentProvider: AgentProviderName
}

function toAgentProviderName(mode: ProviderMode): AgentProviderName {
  return mode
}

function fromEnv(envConfig: AppConfig): ResolvedProviderConfig {
  return {
    agentProvider: envConfig.agentProvider,
    claudeApiKey: envConfig.claudeApiKey,
    claudeModel: envConfig.claudeModel,
    openaiApiKey: envConfig.openaiApiKey,
    openaiModel: envConfig.openaiModel,
    geminiApiKey: envConfig.geminiApiKey,
    geminiModel: envConfig.geminiModel,
    grokApiKey: envConfig.grokApiKey,
    grokModel: envConfig.grokModel,
    player2BaseUrl: envConfig.player2BaseUrl,
    llamaCppBaseUrl: envConfig.llamaCppBaseUrl
  }
}

function pickKey(persisted: string, envValue: string | undefined): string | undefined {
  return persisted || envValue
}

function pickModel(persisted: string, envValue: string, fallback: string): string {
  return persisted || envValue || fallback
}

function fromPersisted(envConfig: AppConfig, persisted: ProviderSettings): ResolvedProviderConfig {
  return {
    agentProvider: toAgentProviderName(persisted.mode),
    claudeApiKey: pickKey(persisted.claudeApiKey, envConfig.claudeApiKey),
    claudeModel: pickModel(persisted.claudeModel, envConfig.claudeModel, DEFAULT_CLOUD_MODELS.claude),
    openaiApiKey: pickKey(persisted.openaiApiKey, envConfig.openaiApiKey),
    openaiModel: pickModel(persisted.openaiModel, envConfig.openaiModel, DEFAULT_CLOUD_MODELS.openai),
    geminiApiKey: pickKey(persisted.geminiApiKey, envConfig.geminiApiKey),
    geminiModel: pickModel(persisted.geminiModel, envConfig.geminiModel, DEFAULT_CLOUD_MODELS.gemini),
    grokApiKey: pickKey(persisted.grokApiKey, envConfig.grokApiKey),
    grokModel: pickModel(persisted.grokModel, envConfig.grokModel, DEFAULT_CLOUD_MODELS.grok),
    player2BaseUrl: persisted.player2BaseUrl,
    llamaCppBaseUrl: persisted.llamaCppBaseUrl
  }
}

export function resolveProviderRegistryConfig(
  envConfig: AppConfig,
  persisted: ProviderSettings | null
): ResolvedProviderConfig {
  if (!persisted) {
    return fromEnv(envConfig)
  }
  return fromPersisted(envConfig, persisted)
}
