#!/usr/bin/env node
/**
 * Fail when ts-prune reports new unused exports not listed in .tsprune-ignore.
 * Scans tsconfig.node.json (main/preload/db/engine/agents) and tsconfig.web.json (renderer).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IGNORE_PATH = join(ROOT, '.tsprune-ignore')
const TS_PRUNE = join(ROOT, 'node_modules', '.bin', 'ts-prune')
const PROJECTS = ['tsconfig.node.json', 'tsconfig.web.json']

/** @param {string} line */
export function normalizeTsPruneLine(line) {
  if (!line) return ''
  let normalized = line.replace(/^[^\w\\/]+/, '').trim()
  if (!normalized) return ''
  normalized = normalized.replace(/\\+/g, '/')
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '')
  normalized = normalized.replace(/^\//, '')
  return normalized
}

/** @param {string} path */
export function readIgnoreSet(path) {
  if (!existsSync(path)) return new Set()
  return new Set(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith('#')
      })
      .map((line) => normalizeTsPruneLine(line))
      .filter(Boolean)
  )
}

/** @param {string} project */
function runTsPrune(project) {
  const out = execFileSync(TS_PRUNE, ['--project', project], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  return out
    .split(/\r?\n/)
    .map((line) => normalizeTsPruneLine(line))
    .filter(Boolean)
}

function main() {
  const ignore = readIgnoreSet(IGNORE_PATH)
  const findings = []

  for (const project of PROJECTS) {
    for (const line of runTsPrune(project)) {
      if (!ignore.has(line)) {
        findings.push(line)
      }
    }
  }

  if (findings.length > 0) {
    console.error('New dead exports detected:')
    for (const line of findings) {
      console.error(line)
    }
    process.exit(1)
  }

  console.log('No new dead exports found.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
