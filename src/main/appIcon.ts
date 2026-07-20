import { join } from 'node:path'
import { APP_ICON_BUILD_PNG, APP_ICON_RESOURCE_NAME } from '../shared/appIconPaths'

export function resolveBrowserWindowIconPath(options: {
  isPackaged: boolean
  appPath: string
  resourcesPath: string
}): string {
  if (options.isPackaged) {
    return join(options.resourcesPath, APP_ICON_RESOURCE_NAME)
  }
  return join(options.appPath, APP_ICON_BUILD_PNG)
}
