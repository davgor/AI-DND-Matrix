import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RAG_LOCAL_REFERENCE_MODEL_ID } from '../../shared/rag/localCatalog'
import {
  downloadRagCatalogModel,
  getRagModelStatus,
  isRagModelReady,
  markRagModelReady,
  RAG_HUB_REQUIRED_FILES,
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

function mockHubFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('missing-optional')) {
      return new Response('nope', { status: 404 })
    }
    return new Response(`body-for-${url}`, {
      status: 200,
      headers: { 'content-type': 'application/octet-stream', 'content-length': '12' }
    })
  }) as unknown as typeof fetch
}

describe('downloadRagCatalogModel success', () => {
  it('downloads required hub files via mocked fetch and marks ready', async () => {
    const root = await tempRoot()
    const fetchImpl = mockHubFetch()
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
    expect(fetchImpl).toHaveBeenCalled()

    const state = await readRagDownloadState(root)
    expect(state?.downloadState).toBe('ready')
    const ready = await readFile(path.join(result.modelPath, 'READY'), 'utf8')
    expect(ready).toContain('MiniLM')
    for (const relative of RAG_HUB_REQUIRED_FILES) {
      const body = await readFile(path.join(result.modelPath, relative), 'utf8')
      expect(body.length).toBeGreaterThan(0)
    }
    expect(await isRagModelReady(root)).toBe(true)
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
    expect(await isRagModelReady(root)).toBe(false)
  })
})

describe('markRagModelReady', () => {
  it('writes READY and required files without network', async () => {
    const root = await tempRoot()
    const result = await markRagModelReady(root)
    expect(result.state).toBe('ready')
    const state = await readRagDownloadState(root)
    expect(state?.modelPath).toBe(result.modelPath)
    expect(await isRagModelReady(root)).toBe(true)
  })
})

describe('getRagModelStatus boot safety', () => {
  it('returns ready=false without throwing on empty root', async () => {
    const root = await tempRoot()
    const status = await getRagModelStatus(root)
    expect(status.ready).toBe(false)
    expect(status.downloadState).toBe('idle')
    expect(await isRagModelReady(root)).toBe(false)
  })
})
