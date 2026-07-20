export {
  backfillCampaignRag,
  ensureCampaignRagBackfill,
  RAG_BACKFILL_BATCH_SIZE,
  type BackfillCampaignRagParams,
  type BackfillCampaignRagResult
} from './backfill'
export { contentHash } from './contentHash'
export { cosineSimilarity } from './cosine'
export { packEmbedding, unpackEmbedding } from './embeddingBlob'
export { createFakeEmbedder, type FakeEmbedder, type FakeEmbedderOptions } from './fakeEmbedder'
export { createLocalEmbedder } from './localEmbedder'
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
export { EMBEDDING_DIMENSION, type Embedder, type EmbedderName } from './types'
export { resolveEmbedder, upsertRagChunk, type UpsertRagChunkInput } from './upsertChunk'
