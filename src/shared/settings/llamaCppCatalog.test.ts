import { describe, expect, it } from 'vitest'
import {
  LLAMACPP_MODEL_CATALOG,
  REFERENCE_LLAMACPP_CATALOG_ID,
  findLlamaCppCatalogEntry
} from './llamaCppCatalog'

describe('LLAMACPP_MODEL_CATALOG', () => {
  it('includes the pinned Qwen2.5-7B Q4_K_M reference entry', () => {
    expect(LLAMACPP_MODEL_CATALOG.length).toBeGreaterThanOrEqual(1)
    const entry = findLlamaCppCatalogEntry(REFERENCE_LLAMACPP_CATALOG_ID)
    expect(entry).toBeDefined()
    expect(entry?.label).toMatch(/Qwen2\.5/i)
    expect(entry?.approxDownloadSize.length).toBeGreaterThan(0)
    expect(entry?.vramHint.length).toBeGreaterThan(0)
    expect(entry?.downloadUrl).toMatch(/^https:\/\//)
  })

  it('pins a reachable single-file Q4_K_M GGUF (not the removed official shardless path)', () => {
    const entry = findLlamaCppCatalogEntry(REFERENCE_LLAMACPP_CATALOG_ID)
    expect(entry?.downloadUrl).toBe(
      'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf'
    )
    // Official Qwen repo split Q4_K_M into multi-part shards; that old single path 404s.
    expect(entry?.downloadUrl).not.toMatch(
      /Qwen\/Qwen2\.5-7B-Instruct-GGUF\/resolve\/main\/qwen2\.5-7b-instruct-q4_k_m\.gguf$/
    )
  })
})
