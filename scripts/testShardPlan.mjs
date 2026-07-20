/**
 * Duration-aware Vitest shard planning for CI.
 * Assigns test files into N shards targeting ~targetMs each.
 */

/**
 * @param {Record<string, number>} timings
 * @param {number} fallbackMs
 */
export function medianTimingMs(timings, fallbackMs) {
  const values = Object.values(timings)
    .filter((ms) => typeof ms === 'number' && Number.isFinite(ms) && ms >= 0)
    .sort((a, b) => a - b)
  if (values.length === 0) return fallbackMs
  const mid = Math.floor(values.length / 2)
  if (values.length % 2 === 0) {
    return Math.round((values[mid - 1] + values[mid]) / 2)
  }
  return values[mid]
}

/**
 * @param {string} file
 * @param {Record<string, number>} timings
 * @param {number} fallbackMs
 */
export function estimateFileMs(file, timings, fallbackMs) {
  const known = timings[file]
  if (typeof known === 'number' && Number.isFinite(known) && known >= 0) {
    return known
  }
  return medianTimingMs(timings, fallbackMs)
}

/**
 * @param {{
 *   files: string[]
 *   timings?: Record<string, number>
 *   targetMs?: number
 *   fallbackMs?: number
 * }} options
 * @returns {{
 *   shardCount: number
 *   shards: string[][]
 *   estimatesMs: number[]
 * }}
 */
export function planTestShards({
  files,
  timings = {},
  targetMs = 60_000,
  fallbackMs = 500
}) {
  if (!Array.isArray(files) || files.length === 0) {
    return { shardCount: 1, shards: [[]], estimatesMs: [0] }
  }

  const estimates = files.map((file) => ({
    file,
    ms: estimateFileMs(file, timings, fallbackMs)
  }))

  const totalMs = estimates.reduce((sum, e) => sum + e.ms, 0)
  const shardCount = Math.max(1, Math.ceil(totalMs / targetMs))

  /** @type {{ files: string[], ms: number }[]} */
  const bins = Array.from({ length: shardCount }, () => ({ files: [], ms: 0 }))

  estimates.sort((a, b) => {
    if (b.ms !== a.ms) return b.ms - a.ms
    return a.file.localeCompare(b.file)
  })

  for (const { file, ms } of estimates) {
    let best = 0
    for (let i = 1; i < bins.length; i++) {
      if (bins[i].ms < bins[best].ms) {
        best = i
      } else if (bins[i].ms === bins[best].ms && i < best) {
        best = i
      }
    }
    bins[best].files.push(file)
    bins[best].ms += ms
  }

  for (const bin of bins) {
    bin.files.sort((a, b) => a.localeCompare(b))
  }

  return {
    shardCount,
    shards: bins.map((b) => b.files),
    estimatesMs: bins.map((b) => b.ms)
  }
}
