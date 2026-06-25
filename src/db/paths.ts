import { app } from 'electron'
import { join } from 'node:path'

const DEV_DATA_DIR = join(process.cwd(), '.data')
const DEV_DATABASE_FILENAME = 'dev.sqlite'
const PACKAGED_DATABASE_FILENAME = 'campaigns.sqlite'

// Dev mode uses a project-local .data/ dir so it never touches a real player's save in userData.
export function getDatabasePath(): string {
  if (app.isPackaged) {
    return join(app.getPath('userData'), PACKAGED_DATABASE_FILENAME)
  }
  return join(DEV_DATA_DIR, DEV_DATABASE_FILENAME)
}
