/** Fixed vector size for all embedders in this layer. */
export const EMBEDDING_DIMENSION = 256

/**
 * Select an embedder via config without code changes, e.g.
 * `selectEmbedder(process.env.RAG_EMBEDDER ?? 'local')`.
 *
 * Supported names: `local` (default, offline) and `fake` (deterministic tests).
 */
export type EmbedderName = 'local' | 'fake'

export interface Embedder {
  readonly name: EmbedderName
  readonly dimension: typeof EMBEDDING_DIMENSION
  embed(texts: string[]): Promise<number[][]>
}
