#!/usr/bin/env node
/**
 * Epic 022.10 — fail if banned D&D-specific user-facing terms reappear outside waived paths.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const BANNED = [
  { label: 'D&D brand', pattern: /D&D/ },
  { label: 'dungeon master', pattern: /\bdungeon master\b/i },
  { label: '5E-like ruleset', pattern: /\b5[Ee]-like\b/ }
]

const SCAN_ROOTS = ['src', 'docs', 'scripts', 'README.md', 'package.json', '.env.example']

const WAIVED_SUFFIXES = [
  'docs/terminology/ttrpg-replacement-map.md',
  'board/in-progress/022',
  'board/done/022',
  'board/backlog/022',
  'scripts/terminology-check.mjs'
]

function isWaived(relPath) {
  const normalized = relPath.replaceAll('\\', '/')
  return WAIVED_SUFFIXES.some((suffix) => normalized.includes(suffix))
}

function collectFiles(target) {
  const abs = join(ROOT, target)
  if (!statSync(abs).isDirectory()) {
    return [abs]
  }
  const files = []
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const child = join(abs, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'out' || entry.name === 'release') {
        continue
      }
      files.push(...collectFiles(relative(ROOT, child)))
    } else if (/\.(ts|tsx|mjs|md|html|json|css)$/.test(entry.name)) {
      files.push(child)
    }
  }
  return files
}

const violations = []

for (const root of SCAN_ROOTS) {
  for (const file of collectFiles(root)) {
    const rel = relative(ROOT, file)
    if (isWaived(rel)) {
      continue
    }
    const text = readFileSync(file, 'utf8')
    for (const rule of BANNED) {
      if (rule.pattern.test(text)) {
        if (rel.replaceAll('\\', '/') === 'package.json' && rule.label === 'D&D brand') {
          if (!/"productName":\s*"AI TTRPG Matrix"/.test(text)) {
            violations.push({ file: rel, rule: rule.label })
          }
          if (/"description":[^]*D&D/.test(text)) {
            violations.push({ file: rel, rule: rule.label })
          }
          continue
        }
        violations.push({ file: rel, rule: rule.label })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[terminology-check] Banned terms found:')
  for (const v of violations) {
    console.error(`  - ${v.file}: ${v.rule}`)
  }
  process.exit(1)
}

console.log('[terminology-check] PASS — no banned user-facing terminology outside waived paths.')
