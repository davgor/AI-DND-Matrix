import type { Character } from '../db/repositories/characters'

export function collectCharacterUploadPaths(characters: Character[]): string[] {
  const paths: string[] = []
  for (const character of characters) {
    if (character.portraitPath) {
      paths.push(character.portraitPath)
    }
    if (character.sheetBackgroundPath) {
      paths.push(character.sheetBackgroundPath)
    }
  }
  return paths
}

export type UnlinkFile = (path: string) => void

export function deleteUploadFiles(paths: string[], unlinkFile: UnlinkFile): void {
  for (const path of paths) {
    try {
      unlinkFile(path)
    } catch {
      // Missing files must not fail campaign deletion.
    }
  }
}
