import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import {
  regeneratePlaySheetPortrait,
  replacePlaySheetPortrait
} from './playSheetPortraitActions'

export function usePlaySheetPortraitState(input: {
  character: Character
  campaignId: string
  onCharacterUpdated: (character: Character) => void
}): {
  prompt: string
  setPrompt: (value: string) => void
  loadFailed: boolean
  setLoadFailed: (value: boolean) => void
  busy: boolean
  error: string | null
  regenerate: () => Promise<void>
  replace: () => Promise<void>
} {
  const { character, campaignId, onCharacterUpdated } = input
  const [prompt, setPrompt] = useState(character.portraitPrompt ?? '')
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPrompt(character.portraitPrompt ?? '')
    setLoadFailed(false)
  }, [character.id, character.portraitPath, character.portraitPrompt])

  async function regenerate(): Promise<void> {
    setBusy(true)
    setError(null)
    const next = await regeneratePlaySheetPortrait({ campaignId, character, prompt })
    if (next.character) onCharacterUpdated(next.character)
    setError(next.error)
    setBusy(false)
  }

  async function replace(): Promise<void> {
    setBusy(true)
    setError(null)
    const next = await replacePlaySheetPortrait(character.id)
    if (next.character) onCharacterUpdated(next.character)
    if (next.clearedPrompt) setPrompt('')
    setError(next.error)
    setBusy(false)
  }

  return { prompt, setPrompt, loadFailed, setLoadFailed, busy, error, regenerate, replace }
}
