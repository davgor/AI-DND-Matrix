export {
  backfillCampaignRag,
  ensureCampaignRagBackfill,
  RAG_BACKFILL_BATCH_SIZE,
  type BackfillCampaignRagParams,
  type BackfillCampaignRagResult
} from './backfill'
export {
  clearCampaignRagIndex,
  invalidateCampaignRagBackfill,
  invalidateCampaignRagForEmbedderChange
} from './invalidateRagIndex'
export {
  createLocalNeuralEmbedder,
  LOCAL_NEURAL_FLOAT_TOLERANCE,
  LOCAL_NEURAL_HUB_MODEL_ID,
  LOCAL_NEURAL_MODEL_ID,
  RAG_LOCAL_IDLE_MS,
  type LocalNeuralEmbedderOptions,
  type LocalNeuralEncodeBatch
} from './localNeuralEmbedder'
export {
  resolveProductionEmbedder,
  type ResolveProductionEmbedderParams
} from './resolveProductionEmbedder'
export { contentHash } from './contentHash'
export { cosineSimilarity } from './cosine'
export { packEmbedding, unpackEmbedding } from './embeddingBlob'
export {
  createGeminiEmbedder,
  GEMINI_DEFAULT_MODEL,
  GEMINI_EMBEDDING_DIMENSION,
  GeminiEmbedderConfigError,
  GeminiEmbedderRequestError,
  type GeminiEmbedderOptions
} from './cloud/geminiEmbedder'
export {
  createOpenAIEmbedder,
  OPENAI_DEFAULT_MODEL,
  OPENAI_EMBEDDING_DIMENSION,
  OpenAIEmbedderConfigError,
  OpenAIEmbedderRequestError,
  type OpenAIEmbedderOptions
} from './cloud/openaiEmbedder'
export { createFakeEmbedder, type FakeEmbedder, type FakeEmbedderOptions } from './fakeEmbedder'
export { createLexicalEmbedder, createLocalEmbedder } from './localEmbedder'
export {
  RAG_CHUNK_INJECTION_CAP,
  hybridRankScore,
  selectHybridRankedChunks,
  type HybridRankCandidate
} from './hybridRank'
export {
  retrieveForContext,
  retrieveWithHybridRank,
  type RetrieveForContextParams
} from './retrieveHybrid'
export {
  retrieveRelevantChunks,
  type RetrievedChunk,
  type RetrievalScope,
  type RetrievalScopeIds,
  type RetrieveRelevantChunksParams
} from './retrieve'
export { selectEmbedder } from './selectEmbedder'
export {
  EMBEDDING_DIMENSION,
  LEXICAL_EMBEDDING_DIMENSION,
  LOCAL_NEURAL_EMBEDDING_DIMENSION,
  type Embedder,
  type EmbedderName
} from './types'
export { resolveEmbedder, upsertRagChunk, type UpsertRagChunkInput } from './upsertChunk'
