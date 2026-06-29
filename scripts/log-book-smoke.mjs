#!/usr/bin/env node
/**
 * Epic 025.6 — character log book end-to-end smoke (DB + DM flows).
 * Run: node scripts/log-book-smoke.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', 'src/db/logBookSmoke.test.ts'],
  { cwd: ROOT, stdio: 'inherit', shell: true }
)

process.exit(result.status === 0 ? 0 : 1)
