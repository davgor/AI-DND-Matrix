/**
 * Discover Vitest test files using the same globs as vitest.config.ts.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const INCLUDE_ROOTS = [
  { dir: 'src', match: /\.test\.tsx?$/ },
  { dir: 'scripts', match: /\.test\.mjs$/ }
]

/**
 * @param {string} root
 * @returns {string[]}
 */
export function discoverTestFiles(root) {
  /** @type {string[]} */
  const files = []

  /**
   * @param {string} dir
   * @param {RegExp} match
   */
  function walk(dir, match) {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, match)
      } else if (entry.isFile() && match.test(entry.name)) {
        files.push(relative(root, full).replace(/\\/g, '/'))
      }
    }
  }

  for (const { dir, match } of INCLUDE_ROOTS) {
    const abs = join(root, dir)
    try {
      if (statSync(abs).isDirectory()) walk(abs, match)
    } catch {
      // skip missing roots
    }
  }

  return files.sort((a, b) => a.localeCompare(b))
}
