import { generatingStatusLabel } from './guidedConversationState'
import { useEllipsisBusyLabel } from './useEllipsisBusyLabel'

/** Animated “Generating.” / .. / ... / .... while a reply draft is in flight. */
export function useGeneratingStatus(active: boolean): string {
  return useEllipsisBusyLabel(active, generatingStatusLabel) ?? 'Generate'
}
