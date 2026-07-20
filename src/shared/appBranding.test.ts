import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_BRAND_MARK_SRC, APP_DISPLAY_NAME, APP_EXE_NAME } from './appBranding'

function readPackageJson(): { build: { productName: string } } {
  const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8')
  return JSON.parse(raw) as { build: { productName: string } }
}

describe('appBranding', () => {
  it('uses AI-TTRPG display name without Matrix', () => {
    expect(APP_DISPLAY_NAME).toBe('AI-TTRPG')
    expect(APP_DISPLAY_NAME).not.toMatch(/Matrix/i)
    const legacyBrand = new RegExp('D' + '&' + 'D')
    expect(APP_DISPLAY_NAME).not.toMatch(legacyBrand)
  })

  it('matches package.json productName', () => {
    expect(APP_DISPLAY_NAME).toBe(readPackageJson().build.productName)
  })

  it('re-exports the in-app brand mark URL', () => {
    expect(APP_BRAND_MARK_SRC).toBe('/app-icon.png')
  })

  it('derives exe name from display name', () => {
    expect(APP_EXE_NAME).toBe('AI-TTRPG.exe')
  })
})
