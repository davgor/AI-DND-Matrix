export const GENDER_KEYS = ['man', 'woman', 'nonbinary', 'unspecified'] as const

export type GenderKey = (typeof GENDER_KEYS)[number]

export interface GenderRosterEntry {
  key: GenderKey
  label: string
  blurb: string
}

export const GENDER_ROSTER: GenderRosterEntry[] = [
  { key: 'man', label: 'Man', blurb: 'Uses he/him pronouns.' },
  { key: 'woman', label: 'Woman', blurb: 'Uses she/her pronouns.' },
  { key: 'nonbinary', label: 'Nonbinary', blurb: 'Uses they/them pronouns.' },
  {
    key: 'unspecified',
    label: 'Unspecified',
    blurb:
      'No fixed gender or pronoun is established for this character; refer to them by name or "they/them".'
  }
]

export function isGenderKey(value: unknown): value is GenderKey {
  return typeof value === 'string' && (GENDER_KEYS as readonly string[]).includes(normalizeGenderKey(value))
}

const GENDER_ALIASES: Record<string, GenderKey> = {
  male: 'man',
  female: 'woman',
  'he/him': 'man',
  'she/her': 'woman',
  'they/them': 'nonbinary'
}

export function parseGenderKey(value: unknown): GenderKey | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = normalizeGenderKey(value)
  if (isGenderKey(normalized)) {
    return normalized
  }
  return GENDER_ALIASES[normalized]
}

function normalizeGenderKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function findGenderRosterEntry(key: string): GenderRosterEntry | undefined {
  return GENDER_ROSTER.find((entry) => entry.key === key)
}
