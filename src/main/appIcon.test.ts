import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_ICON_BUILD_PNG, APP_ICON_RESOURCE_NAME } from '../shared/appIconPaths'
import { resolveBrowserWindowIconPath } from './appIcon'

describe('resolveBrowserWindowIconPath', () => {
  it('resolves BrowserWindow icon for dev vs packaged', () => {
    expect(
      resolveBrowserWindowIconPath({
        isPackaged: false,
        appPath: 'C:/repo',
        resourcesPath: 'C:/resources'
      })
    ).toBe(join('C:/repo', APP_ICON_BUILD_PNG))

    expect(
      resolveBrowserWindowIconPath({
        isPackaged: true,
        appPath: 'C:/repo/app.asar',
        resourcesPath: 'C:/resources'
      })
    ).toBe(join('C:/resources', APP_ICON_RESOURCE_NAME))
  })
})
