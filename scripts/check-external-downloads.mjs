/**
 * Verify pinned external download URLs (llama.cpp CPU/GPU zips + curated GGUFs)
 * are reachable and return real binary payloads — not HTML soft-404s.
 *
 * Uses HTTP Range probes + magic-byte checks so CI does not pull multi-GB files.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RUNTIME_SOURCE_PATH = join(ROOT, 'src/main/llamacpp/runtimeAcquire.ts')
const CATALOG_SOURCE_PATH = join(ROOT, 'src/shared/settings/llamaCppCatalog.ts')

const DEFAULT_RANGE_END = 65_535
const USER_AGENT = 'AI-TTRPG-external-download-check/1.0'

/** @typedef {'zip' | 'gguf'} DownloadKind */

/**
 * @typedef {object} DownloadTarget
 * @property {string} id
 * @property {string} url
 * @property {DownloadKind} kind
 * @property {number} minBytes
 */

/**
 * @param {string} runtimeSource
 * @returns {DownloadTarget[]}
 */
export function collectLlamaCppRuntimeTargets(runtimeSource) {
  const tagMatch = /LLAMACPP_RUNTIME_RELEASE\s*=\s*['"]([^'"]+)['"]/.exec(runtimeSource)
  if (!tagMatch?.[1]) {
    throw new Error('LLAMACPP_RUNTIME_RELEASE not found in runtimeAcquire source')
  }
  const tag = tagMatch[1]
  const base = `https://github.com/ggml-org/llama.cpp/releases/download/${tag}`
  return [
    {
      id: 'llamacpp-win-cpu',
      url: `${base}/llama-${tag}-bin-win-cpu-x64.zip`,
      kind: 'zip',
      minBytes: 1_000_000
    },
    {
      id: 'llamacpp-win-vulkan',
      url: `${base}/llama-${tag}-bin-win-vulkan-x64.zip`,
      kind: 'zip',
      minBytes: 1_000_000
    }
  ]
}

/**
 * @param {string} catalogSource
 * @returns {DownloadTarget[]}
 */
export function collectCatalogDownloadTargets(catalogSource) {
  const targets = []
  const re =
    /id:\s*['"]([^'"]+)['"][\s\S]*?downloadUrl:\s*(?:\r?\n\s*)?['"](https?:\/\/[^'"]+)['"]/g
  let match
  while ((match = re.exec(catalogSource)) !== null) {
    const id = match[1]
    const url = match[2]
    const kind = url.toLowerCase().endsWith('.gguf') ? 'gguf' : 'zip'
    targets.push({
      id: `catalog:${id}`,
      url,
      kind,
      minBytes: kind === 'gguf' ? 1_000_000_000 : 1_000_000
    })
  }
  if (targets.length === 0) {
    throw new Error('No downloadUrl entries found in llamaCppCatalog source')
  }
  return targets
}

/**
 * @param {{ runtimeSource: string, catalogSource: string }} sources
 * @returns {DownloadTarget[]}
 */
export function collectExternalDownloadTargets(sources) {
  return [
    ...collectLlamaCppRuntimeTargets(sources.runtimeSource),
    ...collectCatalogDownloadTargets(sources.catalogSource)
  ]
}

/**
 * @param {{ get: (name: string) => string | null }} headers
 * @returns {number | null}
 */
export function parseContentTotalBytes(headers) {
  const range = headers.get('content-range')
  if (range) {
    const match = /\/(\d+)\s*$/.exec(range)
    if (match) {
      return Number(match[1])
    }
  }
  const length = headers.get('content-length')
  if (length && /^\d+$/.test(length.trim())) {
    return Number(length.trim())
  }
  return null
}

/**
 * @param {DownloadKind} kind
 * @param {Buffer} prefix
 */
export function verifyPrefixMagic(kind, prefix) {
  if (prefix.length < 4) {
    return false
  }
  if (kind === 'zip') {
    return prefix[0] === 0x50 && prefix[1] === 0x4b
  }
  return prefix.subarray(0, 4).toString('ascii') === 'GGUF'
}

/**
 * @param {Response} response
 * @param {number} maxBytes
 */
async function readPrefix(response, maxBytes) {
  if (!response.body) {
    throw new Error('response had no body')
  }
  const reader = response.body.getReader()
  /** @type {Uint8Array[]} */
  const chunks = []
  let total = 0
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value?.length) {
        continue
      }
      chunks.push(value)
      total += value.length
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // ignore cancel errors
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, maxBytes)
}

/**
 * @param {DownloadTarget} target
 * @param {{ fetchImpl?: typeof fetch, rangeEnd?: number }} [opts]
 */
export async function probeDownload(target, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch
  const rangeEnd = opts.rangeEnd ?? DEFAULT_RANGE_END
  /** @type {Response} */
  let response
  try {
    response = await fetchImpl(target.url, {
      headers: {
        Range: `bytes=0-${rangeEnd}`,
        'User-Agent': USER_AGENT,
        Accept: '*/*'
      },
      redirect: 'follow'
    })
  } catch (error) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: `network error: ${(error instanceof Error ? error.message : String(error))}`
    }
  }

  if (!response.ok && response.status !== 206) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: `HTTP ${response.status}`
    }
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  if (contentType.includes('text/html')) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: `unexpected HTML content-type: ${contentType}`
    }
  }

  let prefix
  try {
    prefix = await readPrefix(response, rangeEnd + 1)
  } catch (error) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: `failed reading body: ${(error instanceof Error ? error.message : String(error))}`
    }
  }

  if (!verifyPrefixMagic(target.kind, prefix)) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: `unexpected magic bytes for ${target.kind} (got ${prefix.subarray(0, 16).toString('hex')})`
    }
  }

  const totalBytes = parseContentTotalBytes(response.headers)
  if (totalBytes === null) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: 'missing Content-Range / Content-Length; cannot confirm download size'
    }
  }
  if (totalBytes < target.minBytes) {
    return {
      ok: false,
      id: target.id,
      url: target.url,
      error: `declared size ${totalBytes} is below minBytes ${target.minBytes}`
    }
  }

  return {
    ok: true,
    id: target.id,
    url: target.url,
    bytesRead: prefix.length,
    totalBytes,
    status: response.status
  }
}

/**
 * @param {{
 *   runtimeSource?: string,
 *   catalogSource?: string,
 *   fetchImpl?: typeof fetch,
 *   log?: (line: string) => void
 * }} [opts]
 */
export async function runExternalDownloadCheck(opts = {}) {
  const log = opts.log ?? console.log
  const runtimeSource = opts.runtimeSource ?? readFileSync(RUNTIME_SOURCE_PATH, 'utf8')
  const catalogSource = opts.catalogSource ?? readFileSync(CATALOG_SOURCE_PATH, 'utf8')
  const targets = collectExternalDownloadTargets({ runtimeSource, catalogSource })
  const results = []
  let failed = 0

  for (const target of targets) {
    log(`Checking ${target.id}: ${target.url}`)
    const result = await probeDownload(target, { fetchImpl: opts.fetchImpl })
    results.push(result)
    if (result.ok) {
      log(
        `  OK status=${result.status} bytesRead=${result.bytesRead} totalBytes=${result.totalBytes}`
      )
    } else {
      failed += 1
      log(`  FAIL ${result.error}`)
    }
  }

  return { ok: failed === 0, failed, results }
}

async function main() {
  const { ok, failed, results } = await runExternalDownloadCheck()
  if (!ok) {
    console.error(`External download check failed: ${failed}/${results.length} target(s)`)
    process.exit(1)
  }
  console.log(`External download check passed: ${results.length} target(s)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
