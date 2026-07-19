import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const deployYml = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8')

function releaseJobBody(yml) {
  const start = yml.search(/^ {2}release:\s*$/m)
  if (start < 0) {
    throw new Error('release job not found in deploy.yml')
  }
  const fromRelease = yml.slice(start)
  const rest = fromRelease.slice('  release:\n'.length)
  const nextJobRel = rest.search(/^ {2}\w/m)
  return nextJobRel < 0 ? fromRelease : fromRelease.slice(0, '  release:\n'.length + nextJobRel)
}

describe('deploy.yml release job', () => {
  it('checks out the repo before gh release create (needed for --generate-notes)', () => {
    const body = releaseJobBody(deployYml)
    const checkoutIdx = body.search(/uses:\s*actions\/checkout@/)
    const releaseCreateIdx = body.search(/^\s*gh release create /m)

    expect(checkoutIdx, 'release job must checkout the repository').toBeGreaterThanOrEqual(0)
    expect(releaseCreateIdx, 'release job must run gh release create').toBeGreaterThanOrEqual(0)
    expect(checkoutIdx).toBeLessThan(releaseCreateIdx)

    expect(body).toMatch(/ref:\s*\$\{\{\s*needs\.prepare\.outputs\.sha\s*\}\}/)
    expect(body).toMatch(/fetch-depth:\s*0/)
  })
})
