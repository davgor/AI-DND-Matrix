import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runTestShard } from './run-test-shard.mjs'
import { runTestPlanCi } from './test-plan-ci.mjs'

describe('runTestPlanCi', () => {
  it('writes shard index matrix to GITHUB_OUTPUT', () => {
    const root = mkdtempSync(join(tmpdir(), 'test-plan-root-'))
    mkdirSync(join(root, 'src'), { recursive: true })
    mkdirSync(join(root, 'scripts'), { recursive: true })
    writeFileSync(join(root, 'src', 'a.test.ts'), '')
    writeFileSync(join(root, 'src', 'b.test.ts'), '')
    const timingsPath = join(root, 'timings.json')
    writeFileSync(
      timingsPath,
      JSON.stringify({ 'src/a.test.ts': 40_000, 'src/b.test.ts': 40_000 })
    )
    const githubOutput = join(root, 'github-output.txt')
    writeFileSync(githubOutput, '')

    const summary = runTestPlanCi({
      root,
      timingsPath,
      targetMs: 60_000,
      githubOutput
    })

    expect(summary.shardCount).toBe(2)
    expect(summary.shards).toEqual([0, 1])
    expect(readFileSync(githubOutput, 'utf8')).toContain('shards=[0,1]')
  })
})

describe('buildVitestShardArgs', () => {
  it('runs vitest via node entrypoint with workspace JSON report path', async () => {
    const { buildVitestShardArgs } = await import('./run-test-shard.mjs')
    const args = buildVitestShardArgs({
      root: 'D:/a/repo',
      reportOut: 'D:/a/repo/vitest-report-shard-0.json',
      shardFiles: ['src/a.test.ts', 'src/b.test.ts']
    })
    expect(args.command).toBe(process.execPath)
    expect(args.args[0].replace(/\\/g, '/')).toMatch(/node_modules\/vitest\/vitest\.mjs$/)
    expect(args.args).toContain('--reporter=json')
    expect(args.args).toContain('--outputFile.json=D:/a/repo/vitest-report-shard-0.json')
    expect(args.args.at(-2)).toBe('src/a.test.ts')
    expect(args.args.at(-1)).toBe('src/b.test.ts')
  })
})

describe('runTestShard', () => {
  it('invokes vitest with only the planned shard files', () => {
    const root = mkdtempSync(join(tmpdir(), 'run-shard-'))
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src', 'a.test.ts'), '')
    writeFileSync(join(root, 'src', 'b.test.ts'), '')
    const timingsPath = join(root, 'timings.json')
    writeFileSync(
      timingsPath,
      JSON.stringify({ 'src/a.test.ts': 40_000, 'src/b.test.ts': 40_000 })
    )

    /** @type {{ command: string, args: string[] } | null} */
    let captured = null
    const reportOut = join(root, 'report-0.json')
    const result = runTestShard({
      root,
      index: 0,
      targetMs: 60_000,
      timingsPath,
      jsonOut: join(root, 'shard-0.json'),
      reportOut,
      spawnVitest: (command, args) => {
        captured = { command, args }
        writeFileSync(
          reportOut,
          JSON.stringify({
            testResults: [
              {
                name: join(root, 'src', 'a.test.ts'),
                duration: 12,
                assertionResults: []
              }
            ]
          })
        )
        return { status: 0 }
      }
    })

    expect(result.status).toBe(0)
    expect(captured?.command).toBe(process.execPath)
    const fileArgs = captured?.args.filter((a) => a.endsWith('.test.ts')) ?? []
    expect(fileArgs).toHaveLength(1)
    expect(readFileSync(join(root, 'shard-0.json'), 'utf8')).toContain('src/a.test.ts')
  })
})
