/**
 * Curated cloud model catalogs — single source of truth for Settings model pickers.
 * Update entries here when vendors rename or retire models.
 */

export type CloudProviderId = 'claude' | 'openai' | 'gemini' | 'grok'

interface ModelCatalogEntry {
  id: string
  label: string
}

export const CUSTOM_MODEL_OPTION_VALUE = '__custom__'

export const MODEL_CATALOGS: Record<CloudProviderId, ModelCatalogEntry[]> = {
  claude: [
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast)' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (default)' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 (flagship)' }
  ],
  openai: [
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (cheap)' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (default)' },
    { id: 'gpt-4.1', label: 'GPT-4.1 (flagship)' }
  ],
  gemini: [
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (cheap)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (default)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (flagship)' }
  ],
  grok: [
    // Mid-tier default; flagship class ids (grok-4 / grok-4.5) listed for power users.
    { id: 'grok-3-mini', label: 'Grok 3 Mini (cheap)' },
    { id: 'grok-3', label: 'Grok 3 (default)' },
    { id: 'grok-4', label: 'Grok 4 (flagship)' },
    { id: 'grok-4.5', label: 'Grok 4.5 (flagship)' }
  ]
}

export const DEFAULT_CLOUD_MODELS: Record<CloudProviderId, string> = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
  grok: 'grok-3'
}

export function isCatalogModel(provider: CloudProviderId, modelId: string): boolean {
  return MODEL_CATALOGS[provider].some((entry) => entry.id === modelId)
}

export function resolveModelSelection(
  provider: CloudProviderId,
  modelId: string
): { selection: string; customId: string } {
  if (isCatalogModel(provider, modelId)) {
    return { selection: modelId, customId: '' }
  }
  return { selection: CUSTOM_MODEL_OPTION_VALUE, customId: modelId }
}
