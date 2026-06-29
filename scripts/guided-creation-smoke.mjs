#!/usr/bin/env node
/**
 * Epic 026.10 — guided character creation smoke (DB + IPC flows).
 * Run: node scripts/guided-creation-smoke.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', 'src/db/guidedCreationSmoke.test.ts', 'src/shared/guidedCreation/stageRouting.test.ts'],
  { cwd: ROOT, stdio: 'inherit', shell: true }
)

process.exit(result.status === 0 ? 0 : 1)
