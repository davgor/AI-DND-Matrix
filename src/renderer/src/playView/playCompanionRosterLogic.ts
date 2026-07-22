import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'

export function companionOrderDraftForSelection(
  entries: readonly CompanionRosterEntry[],
  selectedId: string | null
): string {
  const selected = entries.find((entry) => entry.id === selectedId)
  return selected?.orderText ?? ''
}

export function companionAvatarInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function companionPortraitSrc(portraitPath: string | null): string | undefined {
  return portraitPath ? `file://${portraitPath}` : undefined
}

export function companionRoleLabel(entry: CompanionRosterEntry): string {
  return entry.role.trim() || entry.characterClass
}

export type CompanionAvatarContent =
  | { kind: 'initial'; text: string }
  | { kind: 'image'; src: string }

/** Prefer stored face-token portrait; letter-initial fallback when missing or image failed. */
export function buildCompanionAvatarContent(input: {
  name: string
  portraitPath: string | null
  imageFailed?: boolean
}): CompanionAvatarContent {
  const initial = companionAvatarInitial(input.name)
  const src = companionPortraitSrc(input.portraitPath)
  if (src && input.imageFailed !== true) {
    return { kind: 'image', src }
  }
  return { kind: 'initial', text: initial }
}
