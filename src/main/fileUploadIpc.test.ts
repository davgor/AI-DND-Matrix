import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { copyImageIntoAppData } from './fileUploadIpc'

describe('copyImageIntoAppData', () => {
  let sourceDir: string
  let destDir: string

  afterEach(() => {
    if (sourceDir) rmSync(sourceDir, { recursive: true, force: true })
    if (destDir) rmSync(destDir, { recursive: true, force: true })
  })

  it('copies the source file into the destination directory, preserving its extension', () => {
    sourceDir = mkdtempSync(join(tmpdir(), 'portrait-source-'))
    destDir = join(mkdtempSync(join(tmpdir(), 'portrait-dest-')), 'portraits')
    const sourcePath = join(sourceDir, 'avatar.png')
    writeFileSync(sourcePath, 'fake-png-bytes')

    const destPath = copyImageIntoAppData(sourcePath, destDir)

    expect(destPath.endsWith('.png')).toBe(true)
    expect(existsSync(destPath)).toBe(true)
    expect(readFileSync(destPath, 'utf-8')).toBe('fake-png-bytes')
  })

  it('creates the destination directory if it does not exist yet', () => {
    sourceDir = mkdtempSync(join(tmpdir(), 'bg-source-'))
    destDir = join(mkdtempSync(join(tmpdir(), 'bg-dest-')), 'sheet-backgrounds', 'nested')
    const sourcePath = join(sourceDir, 'bg.jpg')
    writeFileSync(sourcePath, 'fake-jpg-bytes')

    const destPath = copyImageIntoAppData(sourcePath, destDir)

    expect(existsSync(destPath)).toBe(true)
  })
})
