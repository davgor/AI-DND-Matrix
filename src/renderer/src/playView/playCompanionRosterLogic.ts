import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'

export function companionOrderDraftForSelection(
  entries: readonly CompanionRosterEntry[],
  selectedId: string | null
): string {
  const selected = entries.find((entry) => entry.id === selectedId)
  return selected?.orderText ?? ''
}

export function companionAvatarInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export function companionPortraitSrc(portraitPath: string | null): string | undefined {
  return portraitPath ? `file://${portraitPath}` : undefined
}

export function companionRoleLabel(entry: CompanionRosterEntry): string {
  return entry.role.trim() || entry.characterClass
}
