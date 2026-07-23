import { createFakeEmbedder } from './fakeEmbedder'
import { createLexicalEmbedder } from './localEmbedder'
import type { Embedder, EmbedderName } from './types'

const CLOUD_FACTORY_HINT: Record<string, string> = {
  openai: 'createOpenAIEmbedder with an API key (not selectEmbedder).',
  gemini: 'createGeminiEmbedder with an API key (not selectEmbedder).',
  local_neural:
    'createLocalNeuralEmbedder with acquired model assets (not selectEmbedder).'
}

function normalizeEmbedderName(name: string): string {
  return name.trim().toLowerCase()
}

export function selectEmbedder(name: EmbedderName | string = 'lexical'): Embedder {
  const resolved = normalizeEmbedderName(name)

  if (resolved === 'lexical' || resolved === 'local') {
    return createLexicalEmbedder()
  }
  if (resolved === 'fake') {
    return createFakeEmbedder()
  }

  const factoryHint = CLOUD_FACTORY_HINT[resolved]
  if (factoryHint) {
    throw new Error(`Embedder "${resolved}" requires ${factoryHint}`)
  }

  throw new Error(
    `Unknown embedder "${name}". Supported: lexical, local (alias), fake; factories for local_neural, openai, gemini.`
  )
}
