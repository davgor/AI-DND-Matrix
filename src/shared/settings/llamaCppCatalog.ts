/**
 * Curated local GGUF catalog for Settings (020.17).
 * Static in-repo manifest for v1 — live remote index is post-v1.
 */

interface LlamaCppCatalogEntry {
  id: string
  label: string
  /** Human-readable download size, e.g. "~4.7 GB". */
  approxDownloadSize: string
  /** VRAM / RAM guidance shown in Settings. */
  vramHint: string
  /** Hugging Face (or mirror) URL used by 020.18 download manager. */
  downloadUrl: string
  /** Optional SHA-256 hex; empty means skip checksum until pinned. */
  sha256: string
}

export const LLAMACPP_MODEL_CATALOG: LlamaCppCatalogEntry[] = [
  {
    id: 'qwen25-7b-instruct-q4-k-m',
    label: 'Qwen2.5 7B Instruct (Q4_K_M)',
    approxDownloadSize: '~4.7 GB',
    vramHint: '8 GB+ VRAM recommended (16 GB+ RAM if CPU-only)',
    // Official Qwen repo split Q4_K_M into multi-part shards; use bartowski's single file.
    downloadUrl:
      'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    sha256: ''
  }
]

export const REFERENCE_LLAMACPP_CATALOG_ID = 'qwen25-7b-instruct-q4-k-m'

export function findLlamaCppCatalogEntry(id: string): LlamaCppCatalogEntry | undefined {
  return LLAMACPP_MODEL_CATALOG.find((entry) => entry.id === id)
}
