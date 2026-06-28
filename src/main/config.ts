import { config as loadDotenv } from 'dotenv'
import type { AgentProviderName } from '../agents/providers/selectProvider'

export type { AgentProviderName }

export interface AppConfig {
  agentProvider: AgentProviderName
  player2BaseUrl: string
  claudeApiKey: string | undefined
  claudeModel: string
  llamaCppBaseUrl: string
  llamaCppServerPath: string | undefined
  llamaCppModelPath: string | undefined
  llamaCppCtxSize: number
  llamaCppGpuLayers: string
  llamaCppStartMode: 'managed' | 'attach'
}

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'

function resolveAgentProvider(): AgentProviderName {
  const value = process.env['AGENT_PROVIDER']
  if (value === 'claude') {
    return 'claude'
  }
  if (value === 'llamacpp') {
    return 'llamacpp'
  }
  return 'player2'
}

export function loadConfig(): AppConfig {
  loadDotenv()

  return {
    agentProvider: resolveAgentProvider(),
    player2BaseUrl: process.env['PLAYER2_BASE_URL'] ?? 'http://127.0.0.1:4315',
    claudeApiKey: process.env['CLAUDE_API_KEY'],
    claudeModel: process.env['CLAUDE_MODEL'] ?? DEFAULT_CLAUDE_MODEL,
    llamaCppBaseUrl: process.env['LLAMA_CPP_BASE_URL'] ?? 'http://127.0.0.1:8080',
    llamaCppServerPath: process.env['LLAMA_CPP_SERVER_PATH'],
    llamaCppModelPath: process.env['LLAMA_CPP_MODEL_PATH'],
    llamaCppCtxSize: Number(process.env['LLAMA_CPP_CTX_SIZE'] ?? 8192),
    llamaCppGpuLayers: process.env['LLAMA_CPP_GPU_LAYERS'] ?? 'all',
    llamaCppStartMode: process.env['LLAMA_CPP_START_MODE'] === 'managed' ? 'managed' : 'attach'
  }
}
