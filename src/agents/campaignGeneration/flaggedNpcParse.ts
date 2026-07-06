import { findBackgroundRosterEntry } from '../../engine/characterBackground/roster'
import {
  parseAlignment,
  parseTemperament
} from '../../shared/alignment/types'
import { parseBackgroundKey } from '../../shared/characterBackground/types'
import { GENDER_ROSTER, parseGenderKey } from '../../shared/npcGender/types'
import { NPC_CLASS_ROSTER, parseNpcClassKey } from '../../shared/npcClass/types'
import type { AvailableRaceOption } from '../../shared/raceSelection/types'
import type { NpcCoreBundle } from './types'

function readStringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function readCanSpeakFromRecord(record: Record<string, unknown>): boolean | undefined {
  const raw = record['canSpeak'] ?? record['can_speak']
  if (raw === true || raw === 'true' || raw === 1) {
    return true
  }
  if (raw === false || raw === 'false' || raw === 0) {
    return false
  }
  return undefined
}

function keyInRaceOptions(key: string, options: AvailableRaceOption[]): boolean {
  return options.some((option) => option.key === key)
}

function parseSpeakingBundleFields(
  record: Record<string, unknown>,
  availableRaces: AvailableRaceOption[]
): Omit<NpcCoreBundle, 'canSpeak' | 'temperament'> | undefined {
  const raceRaw = readStringField(record, 'race', 'raceKey', 'race_key')
  const raceKey = raceRaw && keyInRaceOptions(raceRaw, availableRaces) ? raceRaw : undefined
  const genderKey = parseGenderKey(readStringField(record, 'gender', 'genderKey', 'gender_key'))
  const classKey = parseNpcClassKey(readStringField(record, 'class', 'classKey', 'class_key'))
  const alignment = parseAlignment(record['alignment'])
  const backgroundKey = parseBackgroundKey(
    readStringField(record, 'background', 'backgroundKey', 'background_key')
  )
  if (!raceKey || !genderKey || !classKey || !alignment || !backgroundKey) {
    return undefined
  }
  return { raceKey, genderKey, alignment, classKey, backgroundKey }
}

export function parseNpcCoreBundleRecord(
  record: Record<string, unknown>,
  availableRaces: AvailableRaceOption[]
): NpcCoreBundle | undefined {
  const temperament = parseTemperament(record['temperament'])
  const canSpeak = readCanSpeakFromRecord(record)
  if (!temperament || canSpeak === undefined) {
    return undefined
  }
  if (!canSpeak) {
    return { canSpeak: false, temperament }
  }
  const fields = parseSpeakingBundleFields(record, availableRaces)
  return fields ? { canSpeak: true, temperament, ...fields } : undefined
}

export function parseFlaggedNpcDetailsRecord(
  record: Record<string, unknown>,
  bundle: NpcCoreBundle
): { name: string; role: string; disposition: string; backstory?: string } | undefined {
  const name = readStringField(record, 'name')
  const role = readStringField(record, 'role')
  const disposition = readStringField(record, 'disposition')
  const backstory = readStringField(record, 'backstory')
  if (!name || !role || !disposition) {
    return undefined
  }
  if (bundle.canSpeak) {
    return backstory ? { name, role, disposition, backstory } : undefined
  }
  return { name, role, disposition }
}

export function resolveBundleBlurbs(bundle: NpcCoreBundle): {
  genderBlurb?: string
  classBlurb?: string
  backgroundLabel?: string
  backgroundDescription?: string
} {
  if (!bundle.canSpeak) {
    return {}
  }
  const gender = GENDER_ROSTER.find((entry) => entry.key === bundle.genderKey)
  const npcClass = NPC_CLASS_ROSTER.find((entry) => entry.key === bundle.classKey)
  const background = bundle.backgroundKey ? findBackgroundRosterEntry(bundle.backgroundKey) : undefined
  return {
    genderBlurb: gender?.blurb,
    classBlurb: npcClass?.blurb,
    backgroundLabel: background?.label,
    backgroundDescription: background?.description
  }
}
