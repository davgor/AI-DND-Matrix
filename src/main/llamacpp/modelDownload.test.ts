import { describe, expect, it } from 'vitest'
import {
  ModelDownloadError,
  cancelModelDownload,
  downloadCatalogModel,
  getActiveModelDownloadId
} from './modelDownload'

const USER_DATA = 'C:\\Users\\test\\AppData\\Roaming\\AI-TTRPG'

const CATALOG_ID = 'qwen25-7b-instruct-q4-k-m'

describe('downloadCatalogModel success', () => {
  it('writes the model under userData models and reports complete', async () => {
    const writes: Array<{ path: string; bytes: number }> = []
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
        fetchBytes: async () => new Uint8Array([1, 2, 3, 4]),
        writeFile: (path, data) => {
          writes.push({ path, bytes: data.byteLength })
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
    expect(writes[0]?.path.endsWith('.partial')).toBe(true)
    expect(renames[0]?.to.replace(/\\/g, '/')).toContain(
      'llamacpp/models/qwen25-7b-instruct-q4-k-m.gguf'
    )
    expect(progress.some((p) => p.phase === 'complete')).toBe(true)
    expect(getActiveModelDownloadId()).toBeNull()
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
          fetchBytes: async () => new Uint8Array([1, 2, 3, 4]),
          writeFile: () => undefined,
          mkdir: () => undefined as never,
          rename: () => {
            throw new Error('should not rename on checksum failure')
          },
          rm: (path) => {
            removed.push(String(path))
          },
          sha256Of: () => '0000'
        }
      )
    ).rejects.toMatchObject({ category: 'checksum' })
    expect(removed.some((path) => path.endsWith('.partial'))).toBe(true)
  })
})

describe('downloadCatalogModel cancel', () => {
  it('cancel aborts and does not leave a ready path', async () => {
    const deferred: { resolve: (value: Uint8Array) => void } = {
      resolve: () => undefined
    }
    const fetchPromise = new Promise<Uint8Array>((resolve) => {
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
        fetchBytes: async (_url, signal) => {
          await fetchPromise
          if (signal.aborted) {
            throw new Error('aborted')
          }
          return new Uint8Array([9])
        },
        writeFile: () => undefined,
        mkdir: () => undefined as never,
        rename: (_from, to) => {
          renames.push(String(to))
        },
        rm: () => undefined
      }
    )

    expect(getActiveModelDownloadId()).toBe(CATALOG_ID)
    cancelModelDownload()
    deferred.resolve(new Uint8Array([9]))

    await expect(pending).rejects.toBeInstanceOf(ModelDownloadError)
    await expect(pending).rejects.toMatchObject({ category: 'cancelled' })
    expect(renames).toEqual([])
    expect(getActiveModelDownloadId()).toBeNull()
  })
})
