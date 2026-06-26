import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ENGINE_DIR = __dirname

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"]electron['"]/,
  /from\s+['"]better-sqlite3['"]/,
  /from\s+['"][^'"]*\/db\//,
  /from\s+['"][^'"]*\/agents\//
]

function engineSourceFiles(): string[] {
  return readdirSync(ENGINE_DIR)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => join(ENGINE_DIR, name))
}

describe('engine import boundary', () => {
  it('has no imports of electron, better-sqlite3, or db/agents modules', () => {
    for (const file of engineSourceFiles()) {
      const content = readFileSync(file, 'utf-8')
      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        expect(pattern.test(content)).toBe(false)
      }
    }
  })
})
