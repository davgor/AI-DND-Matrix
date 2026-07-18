import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  name: string
  build: { appId: string; productName: string }
}

function readPackageJson(): PackageJson {
  const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8')
  return JSON.parse(raw) as PackageJson
}

describe('terminology scrub compatibility identifiers', () => {
  it('keeps stable npm package name for tooling and lockfile', () => {
    expect(readPackageJson().name).toBe('ai-dnd-matrix')
  })

  it('keeps stable Electron appId for existing installs', () => {
    expect(readPackageJson().build.appId).toBe('com.davgor.aidndmatrix')
  })

  it('updates only user-facing productName to AI-TTRPG', () => {
    expect(readPackageJson().build.productName).toBe('AI-TTRPG')
  })
})
