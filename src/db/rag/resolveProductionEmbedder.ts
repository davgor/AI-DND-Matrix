/**
 * Resolve the active production Embedder from Settings (epic 154).
 * Falls back to lexical when the configured mode is not ready.
 */

import {
  isRagEmbedderReady,
  type RagEmbedderKeyFlags,
  type RagEmbedderSettings
} from '../../shared/rag/embedderSettings'
import { createGeminiEmbedder } from './cloud/geminiEmbedder'
import { createOpenAIEmbedder } from './cloud/openaiEmbedder'
import { createLocalNeuralEmbedder } from './localNeuralEmbedder'
import { createLexicalEmbedder } from './localEmbedder'
import type { Embedder } from './types'

export interface ResolveProductionEmbedderParams {
  settings: RagEmbedderSettings
  keys: RagEmbedderKeyFlags
  openaiApiKey?: string
  geminiApiKey?: string
  createLocalNeural?: (modelPath: string) => Promise<Embedder>
  createOpenAI?: (apiKey: string, model: string) => Promise<Embedder>
  createGemini?: (apiKey: string, model: string) => Promise<Embedder>
}

async function defaultLocalNeural(modelPath: string): Promise<Embedder> {
  return createLocalNeuralEmbedder({ modelPath })
}

async function defaultOpenAI(apiKey: string, model: string): Promise<Embedder> {
  return createOpenAIEmbedder({ apiKey, model })
}

async function defaultGemini(apiKey: string, model: string): Promise<Embedder> {
  return createGeminiEmbedder({ apiKey, model })
}

async function resolveReadyMode(params: ResolveProductionEmbedderParams): Promise<Embedder> {
  if (params.settings.mode === 'local_neural') {
    const create = params.createLocalNeural ?? defaultLocalNeural
    return create(params.settings.localModelPath)
  }
  if (params.settings.mode === 'openai') {
    const create = params.createOpenAI ?? defaultOpenAI
    return create(params.openaiApiKey ?? '', params.settings.openaiEmbeddingModel)
  }
  if (params.settings.mode === 'gemini') {
    const create = params.createGemini ?? defaultGemini
    return create(params.geminiApiKey ?? '', params.settings.geminiEmbeddingModel)
  }
  return createLexicalEmbedder()
}

export async function resolveProductionEmbedder(
  params: ResolveProductionEmbedderParams
): Promise<Embedder> {
  const readiness = isRagEmbedderReady(params.settings, params.keys)
  if (!readiness.ready || params.settings.mode === 'lexical') {
    return createLexicalEmbedder()
  }
  return resolveReadyMode(params)
}
