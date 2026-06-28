import { app, dialog, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { copyFileSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'

export function copyImageIntoAppData(sourcePath: string, destDir: string): string {
  mkdirSync(destDir, { recursive: true })
  const destPath = join(destDir, `${randomUUID()}${extname(sourcePath)}`)
  copyFileSync(sourcePath, destPath)
  return destPath
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

async function selectAndCopyImage(subfolder: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  const destDir = join(app.getPath('userData'), subfolder)
  return copyImageIntoAppData(result.filePaths[0], destDir)
}

export function registerFileUploadHandlers(): void {
  ipcMain.handle('files:selectPortrait', () => selectAndCopyImage('portraits'))
  ipcMain.handle('files:selectSheetBackground', () => selectAndCopyImage('sheet-backgrounds'))
}
