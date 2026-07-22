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
})
