import type { ImageGenerateRequest } from '../imageGeneration'
import { NPC_FACE_TOKEN_ENTITY_KIND } from './types'

function traitLine(label: string, value: string | null): string | null {
  return value ? `${label}: ${value}` : null
}

/**
 * Builds a face-token prompt: head-and-shoulders portrait only (not full-body).
 */
export function buildNpcFaceTokenPrompt(request: ImageGenerateRequest): string {
  const { identity, styleContext } = request
  const lines = [
    'Generate a face-token portrait for a fantasy TTRPG speaking NPC.',
    'Framing: head-and-shoulders close portrait suitable for a circular Social avatar.',
    'Do not generate a full-body figure, combat token, or battle-map miniature. Not full-body.',
    `Entity kind: ${request.entityKind || NPC_FACE_TOKEN_ENTITY_KIND}.`,
    `Name: ${identity.name}.`,
    `Role: ${identity.role}.`,
    traitLine('Race', identity.raceKey),
    traitLine('Gender', identity.genderKey),
    traitLine('Age', identity.age),
    traitLine('Hair color', identity.hairColor),
    traitLine('Eye color', identity.eyeColor),
    styleContext.presetId ? `Style preset: ${styleContext.presetId}.` : null,
    styleContext.notes ? `Style notes: ${styleContext.notes}.` : null
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}
