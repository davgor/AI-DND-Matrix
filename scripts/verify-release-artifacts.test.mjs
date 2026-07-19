import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  collectUpdaterPaths,
  sanitizeReleaseFilenames,
  verifyUpdaterMetadata
} from './verify-release-artifacts.mjs'

function makeReleaseDir() {
  return mkdtempSync(join(tmpdir(), 'verify-release-'))
}

describe('sanitizeReleaseFilenames', () => {
  it('renames files that contain spaces to hyphenated names', () => {
    const dir = makeReleaseDir()
    writeFileSync(join(dir, 'AI TTRPG Setup.exe'), 'payload')
    const renamed = sanitizeReleaseFilenames(dir)
    expect(renamed).toEqual(['AI TTRPG Setup.exe → AI-TTRPG-Setup.exe'])
    expect(existsSync(join(dir, 'AI-TTRPG-Setup.exe'))).toBe(true)
    expect(existsSync(join(dir, 'AI TTRPG Setup.exe'))).toBe(false)
  })

  it('leaves space-free names alone', () => {
    const dir = makeReleaseDir()
    writeFileSync(join(dir, 'AI-TTRPG-Setup-1.0.0.exe'), 'payload')
    expect(sanitizeReleaseFilenames(dir)).toEqual([])
    expect(existsSync(join(dir, 'AI-TTRPG-Setup-1.0.0.exe'))).toBe(true)
  })
})

describe('collectUpdaterPaths', () => {
  it('collects path and nested url entries from latest.yml', () => {
    const yml = [
      'version: 1.2.0',
      'path: AI-TTRPG-Setup-1.2.0.exe',
      'files:',
      '  - url: AI-TTRPG-Setup-1.2.0.exe',
      '    sha512: abc',
      '  - url: AI-TTRPG-Setup-1.2.0.exe.blockmap',
      '    sha512: def',
      ''
    ].join('\n')
    expect(collectUpdaterPaths(yml)).toEqual([
      'AI-TTRPG-Setup-1.2.0.exe',
      'AI-TTRPG-Setup-1.2.0.exe',
      'AI-TTRPG-Setup-1.2.0.exe.blockmap'
    ])
  })
})

describe('verifyUpdaterMetadata', () => {
  it('passes when required latest.yml paths exist on disk', () => {
    const dir = makeReleaseDir()
    writeFileSync(join(dir, 'AI-TTRPG-Setup-1.2.0.exe'), 'exe')
    writeFileSync(join(dir, 'AI-TTRPG-Setup-1.2.0.exe.blockmap'), 'map')
    writeFileSync(
      join(dir, 'latest.yml'),
      [
        'version: 1.2.0',
        'path: AI-TTRPG-Setup-1.2.0.exe',
        'files:',
        '  - url: AI-TTRPG-Setup-1.2.0.exe',
        '  - url: AI-TTRPG-Setup-1.2.0.exe.blockmap',
        ''
      ].join('\n')
    )

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(true)
    expect(result.checked).toContain('latest.yml')
  })

  it('fails when a referenced installer is missing', () => {
    const dir = makeReleaseDir()
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 1.2.0', 'path: AI-TTRPG-Setup-1.2.0.exe', 'files:', '  - url: AI-TTRPG-Setup-1.2.0.exe', ''].join(
        '\n'
      )
    )

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/missing/i)
  })

  it('does not require latest-mac.yml when absent (mac DMG is manual-only)', () => {
    const dir = makeReleaseDir()
    writeFileSync(join(dir, 'AI-TTRPG-Setup-1.2.0.exe'), 'exe')
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 1.2.0', 'path: AI-TTRPG-Setup-1.2.0.exe', 'files:', '  - url: AI-TTRPG-Setup-1.2.0.exe', ''].join(
        '\n'
      )
    )
    writeFileSync(join(dir, 'AI-TTRPG-1.2.0-x64.dmg'), 'dmg')

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(true)
    expect(result.checked).not.toContain('latest-mac.yml')
  })

  it('verifies latest-mac.yml when present', () => {
    const dir = makeReleaseDir()
    writeFileSync(join(dir, 'AI-TTRPG-Setup-1.2.0.exe'), 'exe')
    writeFileSync(join(dir, 'AI-TTRPG-1.2.0-arm64.zip'), 'zip')
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 1.2.0', 'path: AI-TTRPG-Setup-1.2.0.exe', 'files:', '  - url: AI-TTRPG-Setup-1.2.0.exe', ''].join(
        '\n'
      )
    )
    writeFileSync(
      join(dir, 'latest-mac.yml'),
      ['version: 1.2.0', 'path: AI-TTRPG-1.2.0-arm64.zip', 'files:', '  - url: AI-TTRPG-1.2.0-arm64.zip', ''].join(
        '\n'
      )
    )

    expect(verifyUpdaterMetadata(dir).ok).toBe(true)
    expect(verifyUpdaterMetadata(dir).checked).toContain('latest-mac.yml')
  })

  it('fails when latest.yml is missing', () => {
    const dir = makeReleaseDir()
    mkdirSync(join(dir, 'nested'), { recursive: true })
    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/latest\.yml/)
  })

  it('rejects unsafe path entries with spaces or parent segments', () => {
    const dir = makeReleaseDir()
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 1.0.0', 'path: bad name.exe', ''].join('\n')
    )
    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/unsafe/i)
  })
})
