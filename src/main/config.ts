import { config as loadDotenv } from 'dotenv'
import type { AgentProviderName } from '../agents/providers/selectProvider'
import { DEFAULT_CLOUD_MODELS } from '../shared/settings/modelCatalogs'

export interface AppConfig {
  agentProvider: AgentProviderName
  player2BaseUrl: string
  claudeApiKey: string | undefined
  claudeModel: string
  openaiApiKey: string | undefined
  openaiModel: string
  geminiApiKey: string | undefined
  geminiModel: string
  grokApiKey: string | undefined
  grokModel: string
  llamaCppBaseUrl: string
  llamaCppServerPath: string | undefined
  llamaCppModelPath: string | undefined
  llamaCppCtxSize: number
  llamaCppGpuLayers: string
  llamaCppStartMode: 'managed' | 'attach'
}

const DEFAULT_CLAUDE_MODEL = DEFAULT_CLOUD_MODELS.claude

const KNOWN_PROVIDERS: AgentProviderName[] = ['claude', 'openai', 'gemini', 'grok', 'llamacpp', 'player2']

function resolveAgentProvider(): AgentProviderName {
  const value = process.env['AGENT_PROVIDER']
  if (value && (KNOWN_PROVIDERS as string[]).includes(value)) {
    return value as AgentProviderName
  }
  return 'player2'
}

function readCloudKeys(): Pick<
  AppConfig,
  | 'claudeApiKey'
  | 'claudeModel'
  | 'openaiApiKey'
  | 'openaiModel'
  | 'geminiApiKey'
  | 'geminiModel'
  | 'grokApiKey'
  | 'grokModel'
> {
  return {
    claudeApiKey: process.env['CLAUDE_API_KEY'],
    claudeModel: process.env['CLAUDE_MODEL'] ?? DEFAULT_CLAUDE_MODEL,
    openaiApiKey: process.env['OPENAI_API_KEY'],
    openaiModel: process.env['OPENAI_MODEL'] ?? DEFAULT_CLOUD_MODELS.openai,
    geminiApiKey: process.env['GEMINI_API_KEY'],
    geminiModel: process.env['GEMINI_MODEL'] ?? DEFAULT_CLOUD_MODELS.gemini,
    grokApiKey: process.env['GROK_API_KEY'] ?? process.env['XAI_API_KEY'],
    grokModel: process.env['GROK_MODEL'] ?? DEFAULT_CLOUD_MODELS.grok
  }
}

function readLlamaConfig(): Pick<
  AppConfig,
  | 'llamaCppBaseUrl'
  | 'llamaCppServerPath'
  | 'llamaCppModelPath'
  | 'llamaCppCtxSize'
  | 'llamaCppGpuLayers'
  | 'llamaCppStartMode'
> {
  return {
    llamaCppBaseUrl: process.env['LLAMA_CPP_BASE_URL'] ?? 'http://127.0.0.1:8080',
    llamaCppServerPath: process.env['LLAMA_CPP_SERVER_PATH'],
    llamaCppModelPath: process.env['LLAMA_CPP_MODEL_PATH'],
    llamaCppCtxSize: Number(process.env['LLAMA_CPP_CTX_SIZE'] ?? 8192),
    llamaCppGpuLayers: process.env['LLAMA_CPP_GPU_LAYERS'] ?? 'all',
    llamaCppStartMode: process.env['LLAMA_CPP_START_MODE'] === 'managed' ? 'managed' : 'attach'
  }
}

export function loadConfig(): AppConfig {
  loadDotenv()
  return {
    agentProvider: resolveAgentProvider(),
    player2BaseUrl: process.env['PLAYER2_BASE_URL'] ?? 'http://127.0.0.1:4315',
    ...readCloudKeys(),
    ...readLlamaConfig()
  }
}
