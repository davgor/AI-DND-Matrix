/** Locked visual fields for enemy creature-token prompts (epic 123.2 / 123.3). */
export interface CreatureAppearanceTraits {
  silhouette: string | null
  sizeClass: string | null
  primaryColors: string[]
  distinguishingMarks: string | null
  textureOrMaterial: string | null
}

function nullableAppearanceField(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePrimaryColors(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const colors: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }
    const trimmed = entry.trim()
    if (trimmed.length > 0) {
      colors.push(trimmed)
    }
  }
  return colors
}

export function normalizeCreatureAppearance(
  appearance: Partial<CreatureAppearanceTraits> | null | undefined
): CreatureAppearanceTraits {
  return {
    silhouette: nullableAppearanceField(appearance?.silhouette),
    sizeClass: nullableAppearanceField(appearance?.sizeClass),
    primaryColors: normalizePrimaryColors(appearance?.primaryColors),
    distinguishingMarks: nullableAppearanceField(appearance?.distinguishingMarks),
    textureOrMaterial: nullableAppearanceField(appearance?.textureOrMaterial)
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

/** True when at least one normalized appearance field carries usable detail. */
export function hasUsableCreatureAppearance(appearance: CreatureAppearanceTraits): boolean {
  return (
    appearance.silhouette !== null ||
    appearance.sizeClass !== null ||
    appearance.primaryColors.length > 0 ||
    appearance.distinguishingMarks !== null ||
    appearance.textureOrMaterial !== null
  )
}

export function isCreatureAppearanceTraits(value: unknown): value is CreatureAppearanceTraits {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    isNullableString(row['silhouette']) &&
    isNullableString(row['sizeClass']) &&
    isStringArray(row['primaryColors']) &&
    isNullableString(row['distinguishingMarks']) &&
    isNullableString(row['textureOrMaterial'])
  )
}
