import type { CreatureAppearanceTraits } from './appearance'
import type { CreatureTokenGenerateRequest } from './request'
import { CREATURE_TOKEN_ENTITY_KIND } from './types'

function traitLine(label: string, value: string | null): string | null {
  return value ? `${label}: ${value}` : null
}

function colorsLine(colors: string[]): string | null {
  return colors.length > 0 ? `Primary colors: ${colors.join(', ')}.` : null
}

function appearanceLines(appearance: CreatureAppearanceTraits): Array<string | null> {
  return [
    traitLine('Silhouette', appearance.silhouette),
    traitLine('Size class', appearance.sizeClass),
    colorsLine(appearance.primaryColors),
    traitLine('Distinguishing marks', appearance.distinguishingMarks),
    traitLine('Texture / material', appearance.textureOrMaterial)
  ]
}

/**
 * Builds a creature-token prompt: token-suitable creature portrait (not a battle-map token).
 */
export function buildCreatureTokenPrompt(request: CreatureTokenGenerateRequest): string {
  const { appearance, styleContext } = request
  const lore = request.loreSlice.trim()
  const lines = [
    'Generate a creature-token portrait for a fantasy TTRPG enemy / combat creature.',
    'Framing: token-suitable creature portrait for a circular Social avatar and dossier slot.',
    'Humanoid foes may be head-and-shoulders; beasts and monsters may show more of the body for recognition.',
    'Do not generate an environment or landscape scene, scenic background, or battle-map / grid combat token.',
    `Entity kind: ${CREATURE_TOKEN_ENTITY_KIND}.`,
    `Species: ${request.speciesName}.`,
    ...appearanceLines(appearance),
    lore ? `Lore: ${lore}` : null,
    styleContext.presetId ? `Style preset: ${styleContext.presetId}.` : null,
    styleContext.notes ? `Style notes: ${styleContext.notes}.` : null
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}
