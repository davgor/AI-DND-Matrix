import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  APP_BRAND_MARK_SRC,
  APP_ICON_BUILD_ICO,
  APP_ICON_BUILD_PNG,
  APP_ICON_RESOURCE_NAME
} from './appIconPaths'
import { pngCornersAreTransparent } from './pngCornerAlpha'

function repoRoot(): string {
  return join(__dirname, '../..')
}

function readPackageJson(): {
  build: {
    icon?: string
    extraResources?: Array<{ from: string; to: string }>
    win?: { icon?: string }
    mac?: { icon?: string }
  }
} {
  return JSON.parse(readFileSync(join(repoRoot(), 'package.json'), 'utf8')) as {
    build: {
      icon?: string
      extraResources?: Array<{ from: string; to: string }>
      win?: { icon?: string }
      mac?: { icon?: string }
    }
  }
}

describe('app icon branding assets', () => {
  it('keeps build icon files in the repo', () => {
    expect(existsSync(join(repoRoot(), APP_ICON_BUILD_PNG))).toBe(true)
    expect(existsSync(join(repoRoot(), APP_ICON_BUILD_ICO))).toBe(true)
    expect(existsSync(join(repoRoot(), 'src/renderer/public/app-icon.png'))).toBe(true)
  })

  it('wires package.json build.icon and extraResources to the shield mark', () => {
    const build = readPackageJson().build
    expect(build.win?.icon ?? build.icon).toBe(APP_ICON_BUILD_ICO)
    expect(build.mac?.icon ?? build.icon).toBe(APP_ICON_BUILD_PNG)
    expect(build.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: APP_ICON_BUILD_PNG,
          to: APP_ICON_RESOURCE_NAME
        })
      ])
    )
  })

  it('exposes the in-app brand mark public URL', () => {
    expect(APP_BRAND_MARK_SRC).toBe('/app-icon.png')
  })

  it('uses transparent corners on brand PNGs (no white squares)', () => {
    const buildPng = readFileSync(join(repoRoot(), APP_ICON_BUILD_PNG))
    const appPng = readFileSync(join(repoRoot(), 'src/renderer/public/app-icon.png'))
    expect(pngCornersAreTransparent(buildPng)).toBe(true)
    expect(pngCornersAreTransparent(appPng)).toBe(true)
  })
})
