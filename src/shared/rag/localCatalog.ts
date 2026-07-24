/**
 * Curated local RAG embedding models (epic 154.3).
 * Weights download on demand into userData — never shipped in the installer.
 */

export interface RagLocalCatalogEntry {
  id: string
  label: string
  /** Hugging Face hub id for Transformers.js / ONNX. */
  hubModelId: string
  dimension: number
  /** Approximate download size for UI hints. */
  sizeBytes: number
  ramHintMb: number
}

export const RAG_LOCAL_CATALOG: readonly RagLocalCatalogEntry[] = [
  {
    id: 'all-minilm-l6-v2-onnx',
    label: 'all-MiniLM-L6-v2 (ONNX)',
    hubModelId: 'onnx-community/all-MiniLM-L6-v2-ONNX',
    dimension: 384,
    sizeBytes: 90 * 1024 * 1024,
    ramHintMb: 256
  }
]

export const RAG_LOCAL_REFERENCE_MODEL_ID = 'all-minilm-l6-v2-onnx'

export function getRagLocalCatalogEntry(id: string): RagLocalCatalogEntry | undefined {
  return RAG_LOCAL_CATALOG.find((entry) => entry.id === id)
}
