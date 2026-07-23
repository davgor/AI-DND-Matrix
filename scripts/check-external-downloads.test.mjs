import { describe, expect, it, vi } from 'vitest'
import {
  collectCatalogDownloadTargets,
  collectLlamaCppRuntimeTargets,
  collectExternalDownloadTargets,
  parseContentTotalBytes,
  probeDownload,
  verifyPrefixMagic
} from './check-external-downloads.mjs'

const RUNTIME_SOURCE = `
const LLAMACPP_RUNTIME_RELEASE = 'b10069'

export function resolveWindowsRuntimeZipUrl(backend) {
  const artifact =
    backend === 'cpu'
      ? \`llama-\${LLAMACPP_RUNTIME_RELEASE}-bin-win-cpu-x64.zip\`
      : \`llama-\${LLAMACPP_RUNTIME_RELEASE}-bin-win-vulkan-x64.zip\`
  return \`https://github.com/ggml-org/llama.cpp/releases/download/\${LLAMACPP_RUNTIME_RELEASE}/\${artifact}\`
}
`

const CATALOG_SOURCE = `
export const LLAMACPP_MODEL_CATALOG = [
  {
    id: 'qwen25-7b-instruct-q4-k-m',
    downloadUrl:
      'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    sha256: ''
  }
]
`

describe('collectLlamaCppRuntimeTargets', () => {
  it('builds CPU and Vulkan zip URLs from the pinned release tag', () => {
    expect(collectLlamaCppRuntimeTargets(RUNTIME_SOURCE)).toEqual([
      {
        id: 'llamacpp-win-cpu',
        url: 'https://github.com/ggml-org/llama.cpp/releases/download/b10069/llama-b10069-bin-win-cpu-x64.zip',
        kind: 'zip',
        minBytes: 1_000_000
      },
      {
        id: 'llamacpp-win-vulkan',
        url: 'https://github.com/ggml-org/llama.cpp/releases/download/b10069/llama-b10069-bin-win-vulkan-x64.zip',
        kind: 'zip',
        minBytes: 1_000_000
      }
    ])
  })

  it('throws when the release constant is missing', () => {
    expect(() => collectLlamaCppRuntimeTargets('export const x = 1')).toThrow(
      /LLAMACPP_RUNTIME_RELEASE/
    )
  })
})

describe('collectCatalogDownloadTargets', () => {
  it('collects downloadUrl entries as gguf targets', () => {
    expect(collectCatalogDownloadTargets(CATALOG_SOURCE)).toEqual([
      {
        id: 'catalog:qwen25-7b-instruct-q4-k-m',
        url: 'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
        kind: 'gguf',
        minBytes: 1_000_000_000
      }
    ])
  })

  it('throws when catalog has no downloadUrl', () => {
    expect(() => collectCatalogDownloadTargets('export const LLAMACPP_MODEL_CATALOG = []')).toThrow(
      /downloadUrl/
    )
  })
})

describe('collectExternalDownloadTargets', () => {
  it('merges runtime and catalog targets', () => {
    const targets = collectExternalDownloadTargets({
      runtimeSource: RUNTIME_SOURCE,
      catalogSource: CATALOG_SOURCE
    })
    expect(targets.map((t) => t.id)).toEqual([
      'llamacpp-win-cpu',
      'llamacpp-win-vulkan',
      'catalog:qwen25-7b-instruct-q4-k-m'
    ])
  })
})

describe('parseContentTotalBytes', () => {
  it('prefers Content-Range total when present', () => {
    expect(
      parseContentTotalBytes({
        get: (name) => (name === 'content-range' ? 'bytes 0-65535/4687436160' : null)
      })
    ).toBe(4687436160)
  })

  it('falls back to Content-Length', () => {
    expect(
      parseContentTotalBytes({
        get: (name) => (name === 'content-length' ? '2048' : null)
      })
    ).toBe(2048)
  })

  it('returns null when neither header is usable', () => {
    expect(parseContentTotalBytes({ get: () => null })).toBeNull()
  })
})

describe('verifyPrefixMagic', () => {
  it('accepts ZIP local-file magic', () => {
    expect(verifyPrefixMagic('zip', Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true)
  })

  it('accepts GGUF magic', () => {
    expect(verifyPrefixMagic('gguf', Buffer.from('GGUF'))).toBe(true)
  })

  it('rejects HTML error pages', () => {
    expect(verifyPrefixMagic('zip', Buffer.from('<!DOCTYPE html>'))).toBe(false)
    expect(verifyPrefixMagic('gguf', Buffer.from('<html>'))).toBe(false)
  })
})

function mockResponse({
  status = 206,
  ok = true,
  headers = {},
  bodyBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])
}) {
  const headerMap = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)])
  )
  return {
    ok,
    status,
    headers: {
      get: (name) => headerMap.get(name.toLowerCase()) ?? null
    },
    body: {
      getReader() {
        let sent = false
        return {
          async read() {
            if (sent) {
              return { done: true, value: undefined }
            }
            sent = true
            return { done: false, value: new Uint8Array(bodyBytes) }
          },
          async cancel() {}
        }
      }
    }
  }
}

describe('probeDownload', () => {
  const zipTarget = {
    id: 'llamacpp-win-cpu',
    url: 'https://example.test/runtime.zip',
    kind: 'zip',
    minBytes: 1_000_000
  }

  it('passes when range response has zip magic and large Content-Range', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        headers: {
          'content-range': 'bytes 0-65535/25000000',
          'content-type': 'application/zip'
        }
      })
    )
    const result = await probeDownload(zipTarget, { fetchImpl })
    expect(result.ok).toBe(true)
    expect(result.bytesRead).toBeGreaterThan(0)
    expect(fetchImpl).toHaveBeenCalledWith(
      zipTarget.url,
      expect.objectContaining({
        headers: expect.objectContaining({
          Range: expect.stringMatching(/^bytes=0-\d+$/)
        })
      })
    )
  })

  it('fails on HTTP error status', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({ status: 404, ok: false, bodyBytes: Buffer.from('Not Found') })
    )
    const result = await probeDownload(zipTarget, { fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/HTTP 404/)
  })

  it('fails when magic bytes do not match kind', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        bodyBytes: Buffer.from('not-a-zip-payload!!!!'),
        headers: {
          'content-range': 'bytes 0-20/25000000',
          'content-type': 'application/octet-stream'
        }
      })
    )
    const result = await probeDownload(zipTarget, { fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/magic/i)
  })

  it('fails when declared size is below minimum', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        headers: { 'content-range': 'bytes 0-100/500', 'content-type': 'application/zip' }
      })
    )
    const result = await probeDownload(zipTarget, { fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/minBytes|too small|size/i)
  })

  it('fails when content-type looks like HTML', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        headers: {
          'content-range': 'bytes 0-65535/25000000',
          'content-type': 'text/html; charset=utf-8'
        }
      })
    )
    const result = await probeDownload(zipTarget, { fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/content-type|html/i)
  })
})
