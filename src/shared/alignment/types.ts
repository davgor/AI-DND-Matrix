/**
 * Alignment is moral/ethical stance (nine-grid). Distinct from NPC disposition
 * (relationship to the player) and party-member personality (companion flavor).
 *
 * Player alignment is set once at character setup and changed only by the DM
 * via alignmentShiftWarning → commitAlignmentShift. Speaking NPCs use dialogue;
 * non-speaking creatures use **wrapped** action descriptions in the exposition feed.
 */

export const ALIGNMENTS = [
  'lawful_good',
  'neutral_good',
  'chaotic_good',
  'lawful_neutral',
  'true_neutral',
  'chaotic_neutral',
  'lawful_evil',
  'neutral_evil',
  'chaotic_evil'
] as const

export type Alignment = (typeof ALIGNMENTS)[number]

export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  lawful_good: 'Lawful Good',
  neutral_good: 'Neutral Good',
  chaotic_good: 'Chaotic Good',
  lawful_neutral: 'Lawful Neutral',
  true_neutral: 'True Neutral',
  chaotic_neutral: 'Chaotic Neutral',
  lawful_evil: 'Lawful Evil',
  neutral_evil: 'Neutral Evil',
  chaotic_evil: 'Chaotic Evil'
}

export const TEMPERAMENTS = [
  'aggressive',
  'cautious',
  'curious',
  'territorial',
  'skittish',
  'disciplined',
  'cunning',
  'mindless',
  'neutral'
] as const

export type Temperament = (typeof TEMPERAMENTS)[number]

export interface PendingAlignmentShift {
  proposedAlignment: Alignment
  warningText: string
  flaggedAt: string
}

export interface AlignmentShiftWarning {
  proposedAlignment: Alignment
  warningText: string
}

export interface CommitAlignmentShift {
  newAlignment: Alignment
}

export type NpcReactionKind = 'dialogue' | 'action'

export function isAlignment(value: unknown): value is Alignment {
  return typeof value === 'string' && (ALIGNMENTS as readonly string[]).includes(value)
}

export function parseAlignment(value: unknown): Alignment | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
  return isAlignment(normalized) ? normalized : undefined
}

export function isTemperament(value: unknown): value is Temperament {
  return typeof value === 'string' && (TEMPERAMENTS as readonly string[]).includes(value)
}

export function isPendingAlignmentShift(value: unknown): value is PendingAlignmentShift {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isAlignment(record['proposedAlignment']) &&
    typeof record['warningText'] === 'string' &&
    record['warningText'].trim().length > 0 &&
    typeof record['flaggedAt'] === 'string'
  )
}

export function isAlignmentShiftWarning(value: unknown): value is AlignmentShiftWarning {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return isAlignment(record['proposedAlignment']) && typeof record['warningText'] === 'string'
}

export function isCommitAlignmentShift(value: unknown): value is CommitAlignmentShift {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return isAlignment((value as Record<string, unknown>)['newAlignment'])
}

export function parsePendingAlignmentShiftJson(raw: string | null): PendingAlignmentShift | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isPendingAlignmentShift(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function wrapActionDescription(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
    return trimmed
  }
  return `**${trimmed}**`
}

export function stripActionMarkers(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
    return trimmed.slice(2, -2).trim()
  }
  return trimmed
}
