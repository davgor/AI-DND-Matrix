import { useState } from 'react'

export interface CharacterSetupPortraitState {
  portraitPath: string | null
  portraitPrompt: string
  generating: boolean
  generateError: string | null
  setPortraitPrompt: (value: string) => void
  generatePortrait: () => Promise<void>
  uploadPortrait: () => Promise<void>
}

async function runGenerate(
  input: { campaignId: string; name: string; role: string },
  appearancePrompt: string
): Promise<{ path: string | null; prompt: string; error: string | null }> {
  try {
    const result = await window.characters.generatePlayerIcon({
      campaignId: input.campaignId,
      name: input.name.trim() || 'Hero',
      role: input.role || 'adventurer',
      appearancePrompt
    })
    if (!result.ok) {
      return { path: null, prompt: appearancePrompt, error: result.message }
    }
    return {
      path: result.portraitPath,
      prompt: result.appearancePrompt,
      error: null
    }
  } catch (error: unknown) {
    return {
      path: null,
      prompt: appearancePrompt,
      error: error instanceof Error ? error.message : 'Generation failed'
    }
  }
}

export function useCharacterSetupPortrait(input: {
  campaignId: string
  name: string
  role: string
  initialPortraitPath: string | null
  initialPortraitPrompt?: string
}): CharacterSetupPortraitState {
  const [portraitPath, setPortraitPath] = useState<string | null>(input.initialPortraitPath)
  const [portraitPrompt, setPortraitPrompt] = useState(input.initialPortraitPrompt ?? '')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function generatePortrait(): Promise<void> {
    setGenerating(true)
    setGenerateError(null)
    const next = await runGenerate(input, portraitPrompt)
    if (next.path) {
      setPortraitPath(next.path)
      setPortraitPrompt(next.prompt)
    }
    setGenerateError(next.error)
    setGenerating(false)
  }

  async function uploadPortrait(): Promise<void> {
    const path = await window.files.selectPortrait()
    if (path) {
      setPortraitPath(path)
      setPortraitPrompt('')
      setGenerateError(null)
    }
  }

  return {
    portraitPath,
    portraitPrompt,
    generating,
    generateError,
    setPortraitPrompt,
    generatePortrait,
    uploadPortrait
  }
}
