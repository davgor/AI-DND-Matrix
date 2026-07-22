import type { Character } from '../../../db/repositories/characters'

export function playSheetPortraitSrc(path: string | null): string | undefined {
  return path ? `file://${path}` : undefined
}

export async function regeneratePlaySheetPortrait(input: {
  campaignId: string
  character: Character
  prompt: string
}): Promise<{ character: Character | null; error: string | null }> {
  try {
    const result = await window.characters.generatePlayerIcon({
      campaignId: input.campaignId,
      characterId: input.character.id,
      name: input.character.name,
      role: input.character.characterClass,
      appearancePrompt: input.prompt,
      raceKey: input.character.raceKey
    })
    if (!result.ok) {
      return { character: null, error: result.message }
    }
    const refreshed = await window.characters.listByCampaign(input.campaignId)
    return {
      character: refreshed.find((row) => row.id === input.character.id) ?? null,
      error: null
    }
  } catch (err: unknown) {
    return {
      character: null,
      error: err instanceof Error ? err.message : 'Regenerate failed'
    }
  }
}

export async function replacePlaySheetPortrait(
  characterId: string
): Promise<{ character: Character | null; error: string | null; clearedPrompt: boolean }> {
  try {
    const path = await window.files.selectPortrait()
    if (!path) {
      return { character: null, error: null, clearedPrompt: false }
    }
    const updated = await window.characters.replacePlayerPortrait({
      characterId,
      portraitPath: path
    })
    return { character: updated ?? null, error: null, clearedPrompt: true }
  } catch (err: unknown) {
    return {
      character: null,
      error: err instanceof Error ? err.message : 'Replace failed',
      clearedPrompt: false
    }
  }
}
