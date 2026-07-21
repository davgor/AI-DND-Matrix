export interface NpcAppearanceTraits {
  hairColor: string | null
  age: string | null
  eyeColor: string | null
}

function nullableAppearanceField(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeNpcAppearance(
  appearance: Partial<NpcAppearanceTraits> | null | undefined
): NpcAppearanceTraits {
  return {
    hairColor: nullableAppearanceField(appearance?.hairColor),
    age: nullableAppearanceField(appearance?.age),
    eyeColor: nullableAppearanceField(appearance?.eyeColor)
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

export function isNpcAppearanceTraits(value: unknown): value is NpcAppearanceTraits {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    isNullableString(row['hairColor']) &&
    isNullableString(row['age']) &&
    isNullableString(row['eyeColor'])
  )
}
