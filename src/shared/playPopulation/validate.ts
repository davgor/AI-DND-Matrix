import { parseAlignment, parseTemperament, type Temperament } from '../alignment/types'
import { parseGenderKey } from '../npcGender/types'
import { parseNpcClassKey } from '../npcClass/types'
import type { NpcProposal } from './types'
import { isNpcMintPurpose } from './types'

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return readNonEmptyString(value)
}

function hasSpeakingIdentityBundle(body: Record<string, unknown>): boolean {
  const alignment = parseAlignment(body['alignment'])
  const genderKey = parseGenderKey(body['genderKey'] ?? body['gender_key'])
  const classKey = parseNpcClassKey(body['classKey'] ?? body['class_key'])
  const raceKey = readNonEmptyString(body['raceKey'] ?? body['race_key'])
  return alignment !== undefined && genderKey !== undefined && classKey !== undefined && raceKey !== undefined
}

function readCanSpeak(body: Record<string, unknown>): boolean {
  const raw = body['canSpeak'] ?? body['can_speak']
  return raw === undefined ? true : raw !== false
}

function readRequiredNpcFields(body: Record<string, unknown>):
  | { name: string; role: string; disposition: string; canSpeak: boolean }
  | undefined {
  const name = readNonEmptyString(body['name'])
  const role = readNonEmptyString(body['role'])
  const disposition = readNonEmptyString(body['disposition'])
  if (!name || !role || !disposition) {
    return undefined
  }
  const canSpeak = readCanSpeak(body)
  if (canSpeak && !hasSpeakingIdentityBundle(body)) {
    return undefined
  }
  return { name, role, disposition, canSpeak }
}

function readAlignmentField(body: Record<string, unknown>, canSpeak: boolean) {
  const parsed = parseAlignment(body['alignment'])
  return canSpeak ? parsed : parsed ?? null
}

function readGenderField(body: Record<string, unknown>, canSpeak: boolean) {
  const parsed = parseGenderKey(body['genderKey'] ?? body['gender_key'])
  return canSpeak ? parsed : parsed ?? null
}

function readClassField(body: Record<string, unknown>, canSpeak: boolean) {
  const parsed = parseNpcClassKey(body['classKey'] ?? body['class_key'])
  return canSpeak ? parsed : parsed ?? null
}

function readIdentityFields(body: Record<string, unknown>, canSpeak: boolean) {
  return {
    alignment: readAlignmentField(body, canSpeak),
    genderKey: readGenderField(body, canSpeak),
    classKey: readClassField(body, canSpeak),
    raceKey: readOptionalNullableString(body['raceKey'] ?? body['race_key']),
    backgroundKey: readOptionalNullableString(body['backgroundKey'] ?? body['background_key']),
    temperament: parseTemperament(body['temperament']) as Temperament | undefined
  }
}

function readLocationFields(body: Record<string, unknown>) {
  return {
    regionId: readNonEmptyString(body['regionId'] ?? body['region_id']),
    regionKey: readNonEmptyString(body['regionKey'] ?? body['region_key'])
  }
}

function readFactionFields(body: Record<string, unknown>) {
  const factionMembershipRole =
    body['factionMembershipRole'] === null || body['faction_membership_role'] === null
      ? null
      : readNonEmptyString(body['factionMembershipRole'] ?? body['faction_membership_role'])
  return {
    factionId: readNonEmptyString(body['factionId'] ?? body['faction_id']),
    factionKey: readNonEmptyString(body['factionKey'] ?? body['faction_key']),
    factionMembershipRole
  }
}

function readPurpose(body: Record<string, unknown>) {
  const purposeRaw = body['purpose']
  return isNpcMintPurpose(purposeRaw) ? purposeRaw : undefined
}

function optionalField<T>(value: T | undefined, key: keyof NpcProposal): Partial<NpcProposal> {
  return value !== undefined ? ({ [key]: value } as Partial<NpcProposal>) : {}
}

function assembleNpcProposal(
  body: Record<string, unknown>,
  required: { name: string; role: string; disposition: string; canSpeak: boolean }
): NpcProposal {
  const key = readNonEmptyString(body['key'])
  const backstory = typeof body['backstory'] === 'string' ? body['backstory'] : undefined
  const identity = readIdentityFields(body, required.canSpeak)
  const location = readLocationFields(body)
  const faction = readFactionFields(body)
  const purpose = readPurpose(body)
  const canSpeakExplicit = body['canSpeak'] !== undefined || body['can_speak'] !== undefined

  return {
    ...optionalField(key, 'key'),
    name: required.name,
    role: required.role,
    disposition: required.disposition,
    ...optionalField(backstory, 'backstory'),
    ...optionalField(location.regionId, 'regionId'),
    ...optionalField(location.regionKey, 'regionKey'),
    ...(canSpeakExplicit ? { canSpeak: required.canSpeak } : {}),
    ...optionalField(identity.temperament, 'temperament'),
    ...optionalField(identity.alignment, 'alignment'),
    ...optionalField(identity.raceKey, 'raceKey'),
    ...optionalField(identity.backgroundKey, 'backgroundKey'),
    ...optionalField(identity.genderKey, 'genderKey'),
    ...optionalField(identity.classKey, 'classKey'),
    ...optionalField(faction.factionId, 'factionId'),
    ...optionalField(faction.factionKey, 'factionKey'),
    ...optionalField(faction.factionMembershipRole, 'factionMembershipRole'),
    ...optionalField(purpose, 'purpose')
  }
}

function parseValidatedNpcProposal(body: Record<string, unknown>): NpcProposal | undefined {
  const required = readRequiredNpcFields(body)
  if (!required) {
    return undefined
  }
  return assembleNpcProposal(body, required)
}

export function isValidNpcProposal(value: unknown): value is NpcProposal {
  if (!value || typeof value !== 'object') {
    return false
  }
  return parseValidatedNpcProposal(value as Record<string, unknown>) !== undefined
}

export function parseNpcProposal(value: unknown): NpcProposal | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  return parseValidatedNpcProposal(value as Record<string, unknown>)
}
