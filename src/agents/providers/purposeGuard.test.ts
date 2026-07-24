import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = join(import.meta.dirname, '../../..')

/** Production paths whose GenerateContext literals must include `purpose`. */
const SCAN_PATHS = [
  join(REPO_ROOT, 'src/agents'),
  join(REPO_ROOT, 'src/main/recapIpc.ts'),
  join(REPO_ROOT, 'src/main/settingsIpc.ts')
]

const EXCLUDED_SUFFIX = '.test.ts'

/** Adapter/wrapper files — no standalone production caps to classify. */
const EXCLUDED_RELATIVE = new Set([
  'src/agents/providers/claude.ts',
  'src/agents/providers/player2.ts',
  'src/agents/providers/tokenEscalation.ts',
  'src/agents/providers/types.ts',
  'src/agents/providers/withRetry.ts',
  'src/agents/providers/withSerialQueue.ts',
  'src/agents/providers/withUsageRecording.ts'
])

const PURPOSE_WINDOW_LINES = 8

function collectTsFiles(rootPath: string): string[] {
  const stat = statSync(rootPath)
  if (stat.isFile()) {
    return rootPath.endsWith(EXCLUDED_SUFFIX) ? [] : [rootPath]
  }
  const files: string[] = []
  for (const entry of readdirSync(rootPath)) {
    files.push(...collectTsFiles(join(rootPath, entry)))
  }
  return files
}

function relativePath(absolutePath: string): string {
  return absolutePath
    .slice(REPO_ROOT.length + 1)
    .replace(/\\/g, '/')
}

function isIgnorableMaxTokensLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.startsWith('*') || trimmed.startsWith('//')) {
    return true
  }
  if (/\bmaxTokens\s*:\s*number\b/.test(line)) {
    return true
  }
  return false
}

function findMaxTokensWithoutPurpose(filePath: string): Array<{ line: number; text: string }> {
  const lines = readFileSync(filePath, 'utf8').split('\n')
  const violations: Array<{ line: number; text: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!/\bmaxTokens\s*:/.test(line) || isIgnorableMaxTokensLine(line)) {
      continue
    }
    const windowStart = Math.max(0, index - PURPOSE_WINDOW_LINES)
    const windowEnd = Math.min(lines.length - 1, index + PURPOSE_WINDOW_LINES)
    let hasPurpose = false
    for (let probe = windowStart; probe <= windowEnd; probe += 1) {
      if (/\bpurpose\s*:/.test(lines[probe])) {
        hasPurpose = true
        break
      }
    }
    if (!hasPurpose) {
      violations.push({ line: index + 1, text: line.trim() })
    }
  }

  return violations
}

describe('purposeGuard: production GenerateContext literals', () => {
  it('every maxTokens cap in agent + recap/settings IPC files has a nearby purpose tag', () => {
    const scannedFiles = SCAN_PATHS.flatMap((path) => collectTsFiles(path))
    const violations: string[] = []

    for (const filePath of scannedFiles) {
      const rel = relativePath(filePath)
      if (EXCLUDED_RELATIVE.has(rel) || rel.endsWith(EXCLUDED_SUFFIX)) {
        continue
      }
      for (const hit of findMaxTokensWithoutPurpose(filePath)) {
        violations.push(`${rel}:${hit.line}  ${hit.text}`)
      }
    }

    expect(violations).toEqual([])
  })
})
