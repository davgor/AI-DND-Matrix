import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME, APP_EXE_NAME } from './appBranding'

function readPackageJson(): { build: { productName: string } } {
  const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8')
  return JSON.parse(raw) as { build: { productName: string } }
}

describe('appBranding', () => {
  it('uses neutral TTRPG display name', () => {
    expect(APP_DISPLAY_NAME).toBe('AI TTRPG Matrix')
    const legacyBrand = new RegExp('D' + '&' + 'D')
    expect(APP_DISPLAY_NAME).not.toMatch(legacyBrand)
  })

  it('matches package.json productName', () => {
    expect(APP_DISPLAY_NAME).toBe(readPackageJson().build.productName)
  })

  it('derives exe name from display name', () => {
    expect(APP_EXE_NAME).toBe('AI TTRPG Matrix.exe')
  })
})
