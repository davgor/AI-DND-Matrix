import { PLAYER_CHARACTER_ICON_ENTITY_KIND, type PlayerCharacterIconGenerateRequest } from './types'

function traitLine(label: string, value: string | null): string | null {
  return value ? `${label}: ${value}` : null
}

/**
 * Builds a player-icon prompt: head-and-shoulders portrait from the user's appearance text.
 */
export function buildPlayerCharacterIconPrompt(request: PlayerCharacterIconGenerateRequest): string {
  const { identity, styleContext, appearancePrompt } = request
  const lines = [
    'Generate a face-token portrait for a fantasy TTRPG player character.',
    'Framing: head-and-shoulders close portrait suitable for a circular chrome avatar and character sheet slot.',
    'Do not generate a full-body figure, combat token, or battle-map miniature. Not full-body. Not a scene background.',
    `Entity kind: ${PLAYER_CHARACTER_ICON_ENTITY_KIND}.`,
    `Name: ${identity.name}.`,
    `Role: ${identity.role}.`,
    traitLine('Race', identity.raceKey),
    traitLine('Gender', identity.genderKey),
    traitLine('Age', identity.age),
    traitLine('Hair color', identity.hairColor),
    traitLine('Eye color', identity.eyeColor),
    `Appearance description: ${appearancePrompt.trim()}.`,
    styleContext.presetId ? `Style preset: ${styleContext.presetId}.` : null,
    styleContext.notes ? `Style notes: ${styleContext.notes}.` : null
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}
