import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  ModelDownloadError,
  cancelModelDownload,
  downloadCatalogModel,
  getActiveModelDownloadId,
  type DownloadWriteStream
} from './modelDownload'

const USER_DATA = 'C:\\Users\\test\\AppData\\Roaming\\AI-TTRPG'

const CATALOG_ID = 'qwen25-7b-instruct-q4-k-m'

describe('downloadCatalogModel success', () => {
  it('writes the model under userData models and reports complete', async () => {
    const downloads: string[] = []
    const renames: Array<{ from: string; to: string }> = []
    const progress: Array<{ phase: string; percent: number | null }> = []

    const result = await downloadCatalogModel(
      {
        catalogModelId: CATALOG_ID,
        downloadUrl: 'https://example.test/model.gguf',
        sha256: '',
        userDataRoot: USER_DATA
      },
      (event) => progress.push({ phase: event.phase, percent: event.percent }),
      {
        downloadToFile: async (_url, destPath, _signal, onChunk) => {
          downloads.push(destPath)
          onChunk(4, 4)
          return { bytesReceived: 4, sha256Hex: 'abcd' }
        },
        mkdir: () => undefined as never,
        rename: (from, to) => {
          renames.push({ from: String(from), to: String(to) })
        },
        rm: () => undefined
      }
    )

    expect(result.modelPath.replace(/\\/g, '/')).toContain(
      'llamacpp/models/qwen25-7b-instruct-q4-k-m.gguf'
    )
    expect(downloads[0]?.endsWith('.partial')).toBe(true)
    expect(renames[0]?.to.replace(/\\/g, '/')).toContain(
      'llamacpp/models/qwen25-7b-instruct-q4-k-m.gguf'
    )
    expect(progress.some((p) => p.phase === 'complete')).toBe(true)
    expect(getActiveModelDownloadId()).toBeNull()
  })
})

describe('downloadCatalogModel streaming progress', () => {
  it('emits incremental downloading progress before complete', async () => {
    const progress: Array<{ phase: string; bytesReceived: number; percent: number | null }> = []

    await downloadCatalogModel(
      {
        catalogModelId: CATALOG_ID,
        downloadUrl: 'https://example.test/model.gguf',
        sha256: '',
        userDataRoot: USER_DATA
      },
      (event) =>
        progress.push({
          phase: event.phase,
          bytesReceived: event.bytesReceived,
          percent: event.percent
        }),
      {
        downloadToFile: async (_url, _dest, _signal, onChunk) => {
          onChunk(50, 200)
          onChunk(150, 200)
          onChunk(200, 200)
          return { bytesReceived: 200, sha256Hex: 'ff' }
        },
        mkdir: () => undefined as never,
        rename: () => undefined,
        rm: () => undefined
      }
    )

    const downloading = progress.filter((p) => p.phase === 'downloading')
    expect(downloading.some((p) => p.bytesReceived === 50 && p.percent === 25)).toBe(true)
    expect(downloading.some((p) => p.bytesReceived === 150 && p.percent === 75)).toBe(true)
    expect(progress.at(-1)).toMatchObject({ phase: 'complete', percent: 100 })
  })
})

describe('downloadCatalogModel checksum', () => {
  it('fails checksum without marking ready (partial removed)', async () => {
    const removed: string[] = []
    await expect(
      downloadCatalogModel(
        {
          catalogModelId: CATALOG_ID,
          downloadUrl: 'https://example.test/model.gguf',
          sha256: 'deadbeef',
          userDataRoot: USER_DATA
        },
        undefined,
        {
          downloadToFile: async () => ({ bytesReceived: 4, sha256Hex: '0000' }),
          mkdir: () => undefined as never,
          rename: () => {
            throw new Error('should not rename on checksum failure')
          },
          rm: (path) => {
            removed.push(String(path))
          }
        }
      )
    ).rejects.toMatchObject({ category: 'checksum' })
    expect(removed.some((path) => path.endsWith('.partial'))).toBe(true)
  })

  it('accepts matching streamed sha256 without reading the whole file into memory', async () => {
    const payload = new Uint8Array([1, 2, 3, 4])
    const digest = createHash('sha256').update(payload).digest('hex')
    const renames: string[] = []

    await downloadCatalogModel(
      {
        catalogModelId: CATALOG_ID,
        downloadUrl: 'https://example.test/model.gguf',
        sha256: digest,
        userDataRoot: USER_DATA
      },
      undefined,
      {
        downloadToFile: async () => ({ bytesReceived: 4, sha256Hex: digest }),
        mkdir: () => undefined as never,
        rename: (_from, to) => {
          renames.push(String(to))
        },
        rm: () => undefined
      }
    )

    expect(renames.length).toBe(1)
  })
})

describe('downloadCatalogModel cancel', () => {
  it('cancel aborts and does not leave a ready path', async () => {
    const deferred: { resolve: () => void } = {
      resolve: () => undefined
    }
    const fetchPromise = new Promise<void>((resolve) => {
      deferred.resolve = resolve
    })
    const renames: string[] = []

    const pending = downloadCatalogModel(
      {
        catalogModelId: CATALOG_ID,
        downloadUrl: 'https://example.test/model.gguf',
        sha256: '',
        userDataRoot: USER_DATA
      },
      undefined,
      {
        downloadToFile: async (_url, _dest, signal) => {
          await fetchPromise
          if (signal.aborted) {
            throw new Error('aborted')
          }
          return { bytesReceived: 9, sha256Hex: '09' }
        },
        mkdir: () => undefined as never,
        rename: (_from, to) => {
          renames.push(String(to))
        },
        rm: () => undefined
      }
    )

    expect(getActiveModelDownloadId()).toBe(CATALOG_ID)
    cancelModelDownload()
    deferred.resolve()

    await expect(pending).rejects.toBeInstanceOf(ModelDownloadError)
    await expect(pending).rejects.toMatchObject({ category: 'cancelled' })
    expect(renames).toEqual([])
    expect(getActiveModelDownloadId()).toBeNull()
  })
})

function createChunkedBody(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let chunkIndex = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunkIndex >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(chunks[chunkIndex]!)
      chunkIndex += 1
    }
  })
}

function createTestWriteStream(writes: Uint8Array[]): DownloadWriteStream {
  return {
    write(chunk: Uint8Array): boolean {
      writes.push(Uint8Array.from(chunk))
      return true
    },
    end(cb?: (error?: Error | null) => void): void {
      cb?.(null)
    },
    destroy(): void {
      // no-op for test
    },
    once(): void {
      // no-op for test
    }
  }
}

describe('defaultDownloadToFile streaming', () => {
  it('writes response body chunks to disk and reports progress without arrayBuffer', async () => {
    const { defaultDownloadToFile } = await import('./modelDownload')
    const writes: Uint8Array[] = []
    const progress: Array<{ received: number; total: number | null }> = []
    const fetchMock = vi.fn(
      async () =>
        new Response(createChunkedBody([new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]), {
          status: 200,
          headers: { 'content-length': '5' }
        })
    )

    const result = await defaultDownloadToFile({
      url: 'https://example.test/model.gguf',
      destPath: 'C:\\tmp\\model.gguf.partial',
      signal: new AbortController().signal,
      onChunk: (received, total) => progress.push({ received, total }),
      deps: {
        fetchImpl: fetchMock as unknown as typeof fetch,
        openWriteStream: () => createTestWriteStream(writes)
      }
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(writes.map((c) => Array.from(c))).toEqual([
      [1, 2],
      [3, 4, 5]
    ])
    expect(progress).toEqual([
      { received: 2, total: 5 },
      { received: 5, total: 5 }
    ])
    expect(result.bytesReceived).toBe(5)
    expect(result.sha256Hex).toBe(
      createHash('sha256').update(Buffer.from([1, 2, 3, 4, 5])).digest('hex')
    )
  })
})
