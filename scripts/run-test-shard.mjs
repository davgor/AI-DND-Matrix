/**
 * Run one duration-balanced Vitest shard (CI).
 *
 * Usage:
 *   node scripts/run-test-shard.mjs --index 0 [--target-ms 60000]
 *     [--timings scripts/test-timings.json] [--json-out shard-timings-0.json]
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverTestFiles } from './discoverTestFiles.mjs'
import { extractFileTimings } from './merge-test-timings.mjs'
import { loadTimings, parsePlanArgs } from './test-plan-ci.mjs'
import { planTestShards } from './testShardPlan.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * @param {string[]} argv
 */
export function parseShardArgs(argv) {
  const base = parsePlanArgs(argv)
  let index = 0
  let jsonOut = ''
  let reportOut = ''
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--index' && argv[i + 1]) {
      index = Number(argv[++i])
    } else if (arg.startsWith('--index=')) {
      index = Number(arg.slice('--index='.length))
    } else if (arg === '--json-out' && argv[i + 1]) {
      jsonOut = argv[++i]
    } else if (arg.startsWith('--json-out=')) {
      jsonOut = arg.slice('--json-out='.length)
    } else if (arg === '--report-out' && argv[i + 1]) {
      reportOut = argv[++i]
    } else if (arg.startsWith('--report-out=')) {
      reportOut = arg.slice('--report-out='.length)
    }
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid --index: ${index}`)
  }
  return { ...base, index, jsonOut, reportOut }
}

/**
 * @param {{
 *   root?: string
 *   index: number
 *   targetMs?: number
 *   timingsPath?: string
 *   jsonOut?: string
 *   reportOut?: string
 *   spawnVitest?: (args: string[]) => { status: number | null }
 * }} options
 */
export function runTestShard(options) {
  const root = options.root ?? ROOT
  const targetMs = options.targetMs ?? 60_000
  const timingsPath = options.timingsPath ?? join(root, 'scripts', 'test-timings.json')
  const files = discoverTestFiles(root)
  const timings = loadTimings(timingsPath)
  const plan = planTestShards({ files, timings, targetMs })

  if (options.index >= plan.shardCount) {
    throw new Error(`Shard index ${options.index} out of range (count=${plan.shardCount})`)
  }

  const shardFiles = plan.shards[options.index]
  const reportOut =
    options.reportOut || join(tmpdir(), `vitest-report-shard-${options.index}.json`)
  const jsonOut =
    options.jsonOut || join(root, `shard-timings-${options.index}.json`)

  console.log(
    JSON.stringify(
      {
        shardIndex: options.index,
        shardCount: plan.shardCount,
        fileCount: shardFiles.length,
        estimateMs: plan.estimatesMs[options.index]
      },
      null,
      2
    )
  )

  if (shardFiles.length === 0) {
    writeFileSync(jsonOut, '{}\n')
    return { status: 0, shardFiles, jsonOut }
  }

  const vitestArgs = [
    'vitest',
    'run',
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${reportOut}`,
    ...shardFiles
  ]

  const spawnVitest =
    options.spawnVitest ??
    ((args) => {
      const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx'
      return spawnSync(npxBin, args, {
        cwd: root,
        stdio: 'inherit',
        shell: false,
        env: process.env
      })
    })

  const result = spawnVitest(vitestArgs)
  const status = result.status ?? 1

  try {
    const report = JSON.parse(readFileSync(reportOut, 'utf8'))
    const extracted = extractFileTimings(report, root)
    mkdirSync(dirname(jsonOut), { recursive: true })
    writeFileSync(jsonOut, `${JSON.stringify(extracted, null, 2)}\n`)
  } catch (err) {
    console.warn('Could not write shard timings:', err)
    writeFileSync(jsonOut, '{}\n')
  }

  return { status, shardFiles, jsonOut }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseShardArgs(process.argv.slice(2))
  const { status } = runTestShard({
    ...args,
    jsonOut: args.jsonOut || undefined,
    reportOut: args.reportOut || undefined
  })
  process.exit(status === null ? 1 : status)
}
