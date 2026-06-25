import { config as loadDotenv } from 'dotenv'

export interface AppConfig {
  agentProvider: 'player2' | 'claude'
  player2BaseUrl: string
  claudeApiKey: string | undefined
}

export function loadConfig(): AppConfig {
  loadDotenv()

  const agentProvider = process.env['AGENT_PROVIDER'] === 'claude' ? 'claude' : 'player2'

  return {
    agentProvider,
    player2BaseUrl: process.env['PLAYER2_BASE_URL'] ?? 'http://127.0.0.1:4315',
    claudeApiKey: process.env['CLAUDE_API_KEY']
  }
}
