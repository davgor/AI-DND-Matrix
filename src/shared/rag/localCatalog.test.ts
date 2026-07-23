import { describe, expect, it } from 'vitest'
import {
  getRagLocalCatalogEntry,
  RAG_LOCAL_CATALOG,
  RAG_LOCAL_REFERENCE_MODEL_ID
} from './localCatalog'

describe('RAG local catalog', () => {
  it('includes the research reference model', () => {
    expect(RAG_LOCAL_CATALOG.some((entry) => entry.id === RAG_LOCAL_REFERENCE_MODEL_ID)).toBe(true)
    const entry = getRagLocalCatalogEntry(RAG_LOCAL_REFERENCE_MODEL_ID)
    expect(entry?.dimension).toBe(384)
    expect(entry?.hubModelId).toContain('MiniLM')
  })
})
