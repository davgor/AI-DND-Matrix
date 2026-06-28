import { useState } from 'react'

export interface ImageSelectors {
  portraitPath: string | null
  sheetBackgroundPath: string | null
  setPortraitPath: (path: string | null) => void
  setSheetBackgroundPath: (path: string | null) => void
  selectPortrait: () => Promise<void>
  selectSheetBackground: () => Promise<void>
}

export function useImageSelectors(): ImageSelectors {
  const [portraitPath, setPortraitPath] = useState<string | null>(null)
  const [sheetBackgroundPath, setSheetBackgroundPath] = useState<string | null>(null)

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
