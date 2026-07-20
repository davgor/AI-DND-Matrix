/**
 * CI helper: plan duration-balanced Vitest shards and emit a GitHub Actions matrix.
 *
 * Usage: node scripts/test-plan-ci.mjs [--target-ms 60000] [--timings scripts/test-timings.json]
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverTestFiles } from './discoverTestFiles.mjs'
import { planTestShards } from './testShardPlan.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_TIMINGS = join(ROOT, 'scripts', 'test-timings.json')
const DEFAULT_TARGET_MS = 60_000

/**
 * @param {string[]} argv
 */
export function parsePlanArgs(argv) {
  let targetMs = DEFAULT_TARGET_MS
  let timingsPath = DEFAULT_TIMINGS
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--target-ms' && argv[i + 1]) {
      targetMs = Number(argv[++i])
    } else if (arg.startsWith('--target-ms=')) {
      targetMs = Number(arg.slice('--target-ms='.length))
    } else if (arg === '--timings' && argv[i + 1]) {
      timingsPath = argv[++i]
    } else if (arg.startsWith('--timings=')) {
      timingsPath = arg.slice('--timings='.length)
    }
  }
  if (!Number.isFinite(targetMs) || targetMs <= 0) {
    throw new Error(`Invalid --target-ms: ${targetMs}`)
  }
  return { targetMs, timingsPath }
}

/**
 * @param {string} timingsPath
 * @returns {Record<string, number>}
 */
export function loadTimings(timingsPath) {
  try {
    const raw = JSON.parse(readFileSync(timingsPath, 'utf8'))
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    /** @type {Record<string, number>} */
    const out = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

/**
 * @param {{
 *   root?: string
 *   targetMs?: number
 *   timingsPath?: string
 *   githubOutput?: string | undefined
 * }} [options]
 */
export function runTestPlanCi(options = {}) {
  const root = options.root ?? ROOT
  const targetMs = options.targetMs ?? DEFAULT_TARGET_MS
  const timingsPath = options.timingsPath ?? DEFAULT_TIMINGS
  const files = discoverTestFiles(root)
  const timings = loadTimings(timingsPath)
  const plan = planTestShards({ files, timings, targetMs })
  const shardIndexes = Array.from({ length: plan.shardCount }, (_, i) => i)
  const summary = {
    shardCount: plan.shardCount,
    fileCount: files.length,
    estimatesMs: plan.estimatesMs,
    shards: shardIndexes
  }

  const githubOutput = options.githubOutput ?? process.env.GITHUB_OUTPUT
  if (githubOutput) {
    appendFileSync(githubOutput, `shards=${JSON.stringify(shardIndexes)}\n`)
  }

  console.log(JSON.stringify(summary, null, 2))
  return summary
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { targetMs, timingsPath } = parsePlanArgs(process.argv.slice(2))
  runTestPlanCi({ targetMs, timingsPath })
}
