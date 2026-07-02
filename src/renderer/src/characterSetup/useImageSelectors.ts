import { useState } from 'react'

export interface ImageSelectors {
  portraitPath: string | null
  sheetBackgroundPath: string | null
  setPortraitPath: (path: string | null) => void
  setSheetBackgroundPath: (path: string | null) => void
  selectPortrait: () => Promise<void>
  selectSheetBackground: () => Promise<void>
}

export function useImageSelectors(
  initialPortraitPath: string | null = null,
  initialSheetBackgroundPath: string | null = null
): ImageSelectors {
  const [portraitPath, setPortraitPath] = useState<string | null>(initialPortraitPath)
  const [sheetBackgroundPath, setSheetBackgroundPath] = useState<string | null>(initialSheetBackgroundPath)

  async function selectPortrait(): Promise<void> {
    setPortraitPath(await window.files.selectPortrait())
  }

  async function selectSheetBackground(): Promise<void> {
    setSheetBackgroundPath(await window.files.selectSheetBackground())
  }

  return {
    portraitPath,
    sheetBackgroundPath,
    setPortraitPath,
    setSheetBackgroundPath,
    selectPortrait,
    selectSheetBackground
  }
}
