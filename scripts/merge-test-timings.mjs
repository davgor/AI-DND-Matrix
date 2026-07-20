/**
 * Merge Vitest JSON reporter output into a per-file timings map.
 *
 * CLI: node scripts/merge-test-timings.mjs --previous scripts/test-timings.json \
 *   --out merged-timings.json shard-timings-0.json shard-timings-1.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @param {string} filePath
 * @param {string} root
 */
export function toRepoRelative(filePath, root) {
  const normalized = filePath.replace(/\\/g, '/')
  // Already repo-relative (no drive / absolute POSIX root)
  if (!normalized.startsWith('/') && !/^[A-Za-z]:/.test(normalized)) {
    return normalized.replace(/^\.\//, '')
  }

  // Prefer a stable src/ or scripts/ suffix when present (cross-platform reports)
  for (const marker of ['/src/', '/scripts/']) {
    const idx = normalized.lastIndexOf(marker)
    if (idx >= 0) {
      return normalized.slice(idx + 1)
    }
  }

  const abs = resolve(filePath)
  const rel = relative(resolve(root), abs).replace(/\\/g, '/')
  return rel.replace(/^\.\//, '')
}

/**
 * @param {unknown} report
 * @param {string} root
 * @returns {Record<string, number>}
 */
export function extractFileTimings(report, root) {
  /** @type {Record<string, number>} */
  const out = {}
  if (!report || typeof report !== 'object') return out
  const results = /** @type {{ testResults?: unknown }} */ (report).testResults
  if (!Array.isArray(results)) return out

  for (const entry of results) {
    if (!entry || typeof entry !== 'object') continue
    const row = /** @type {{
      name?: string
      duration?: number
      startTime?: number
      endTime?: number
      assertionResults?: { duration?: number }[]
    }} */ (entry)
    if (typeof row.name !== 'string' || !row.name) continue

    let ms = 0
    if (typeof row.duration === 'number' && Number.isFinite(row.duration)) {
      ms = Math.max(0, Math.round(row.duration))
    } else if (
      typeof row.startTime === 'number' &&
      typeof row.endTime === 'number' &&
      Number.isFinite(row.startTime) &&
      Number.isFinite(row.endTime)
    ) {
      ms = Math.max(0, Math.round(row.endTime - row.startTime))
    } else if (Array.isArray(row.assertionResults)) {
      ms = Math.max(
        0,
        Math.round(
          row.assertionResults.reduce((sum, a) => {
            const d = typeof a?.duration === 'number' ? a.duration : 0
            return sum + d
          }, 0)
        )
      )
    }

    out[toRepoRelative(row.name, root)] = ms
  }
  return out
}

/**
 * @param {Record<string, number>} previous
 * @param {Record<string, number>[]} overlays
 * @returns {Record<string, number>}
 */
export function mergeTestTimings(previous, overlays) {
  /** @type {Record<string, number>} */
  const merged = { ...previous }
  for (const overlay of overlays) {
    for (const [file, ms] of Object.entries(overlay)) {
      if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0) {
        merged[file] = ms
      }
    }
  }
  return merged
}

/**
 * @param {string[]} argv
 */
export function runMergeCli(argv) {
  let previousPath = ''
  let outPath = ''
  /** @type {string[]} */
  const overlayPaths = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--previous' && argv[i + 1]) {
      previousPath = argv[++i]
    } else if (arg === '--out' && argv[i + 1]) {
      outPath = argv[++i]
    } else if (!arg.startsWith('-')) {
      overlayPaths.push(arg)
    }
  }
  if (!outPath) {
    throw new Error('Missing --out path')
  }
  /** @type {Record<string, number>} */
  let previous = {}
  if (previousPath) {
    previous = JSON.parse(readFileSync(previousPath, 'utf8'))
  }
  const overlays = overlayPaths.map((p) => JSON.parse(readFileSync(p, 'utf8')))
  const merged = mergeTestTimings(previous, overlays)
  writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`)
  return merged
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMergeCli(process.argv.slice(2))
}
