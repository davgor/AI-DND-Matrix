/**
 * Embedder contract for campaign RAG — portable (no Electron / userData imports).
 * See docs/research/rag-embedders-2026-07-22.md and epic 154.
 */

/** Legacy hashed bag-of-words dimension (083 default). */
export const LEXICAL_EMBEDDING_DIMENSION = 256

/** all-MiniLM-L6-v2 / local neural. */
export const LOCAL_NEURAL_EMBEDDING_DIMENSION = 384

/** @deprecated Use LEXICAL_EMBEDDING_DIMENSION — kept for existing tests/call sites. */
export const EMBEDDING_DIMENSION = LEXICAL_EMBEDDING_DIMENSION

/**
 * Selectable embedder ids. `local` is a deprecated alias for `lexical`.
 * Cloud vendors need create*Embedder factories (API keys) — not bare selectEmbedder.
 * Grok/Claude have no public embeddings API (see research doc).
 */
export type EmbedderName =
  | 'lexical'
  | 'local'
  | 'fake'
  | 'local_neural'
  | 'openai'
  | 'gemini'

export interface Embedder {
  readonly name: EmbedderName
  readonly dimension: number
  /** Stable model id for re-embed invalidation (e.g. hashed-bow-v1, all-MiniLM-L6-v2). */
  readonly modelId: string
  embed(texts: string[]): Promise<number[][]>
}
