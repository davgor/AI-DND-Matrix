import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RAG_LOCAL_REFERENCE_MODEL_ID } from '../../shared/rag/localCatalog'
import {
  downloadRagCatalogModel,
  markRagModelReady,
  readRagDownloadState
} from './modelDownload'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'rag-dl-'))
  dirs.push(dir)
  return dir
}

describe('downloadRagCatalogModel success', () => {
  it('downloads via mocked fetch and marks ready', async () => {
    const root = await tempRoot()
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ model_type: 'bert' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    }) as unknown as typeof fetch

    const phases: string[] = []
    const result = await downloadRagCatalogModel(root, RAG_LOCAL_REFERENCE_MODEL_ID, {
      fetchImpl,
      onProgress: (progress) => {
        phases.push(progress.phase)
      }
    })

    expect(result.state).toBe('ready')
    expect(result.modelPath).toContain(RAG_LOCAL_REFERENCE_MODEL_ID)
    expect(phases).toContain('downloading')
    expect(phases).toContain('ready')

    const state = await readRagDownloadState(root)
    expect(state?.downloadState).toBe('ready')
    const ready = await readFile(path.join(result.modelPath, 'READY'), 'utf8')
    expect(ready).toContain('MiniLM')
  })
})

describe('downloadRagCatalogModel failure', () => {
  it('records failed state when fetch returns non-OK', async () => {
    const root = await tempRoot()
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch

    await expect(
      downloadRagCatalogModel(root, RAG_LOCAL_REFERENCE_MODEL_ID, { fetchImpl })
    ).rejects.toThrow(/404/)

    const state = await readRagDownloadState(root)
    expect(state?.downloadState).toBe('failed')
  })
})

describe('markRagModelReady', () => {
  it('writes READY without network', async () => {
    const root = await tempRoot()
    const result = await markRagModelReady(root)
    expect(result.state).toBe('ready')
    const state = await readRagDownloadState(root)
    expect(state?.modelPath).toBe(result.modelPath)
  })
})
