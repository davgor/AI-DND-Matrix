import { dmThinkingStatusLabel } from './guidedConversationState'
import { useEllipsisBusyLabel } from './useEllipsisBusyLabel'

/** Animated “The DM is thinking.” / .. / ... / .... while `active`. */
export function useDmThinkingStatus(active: boolean): string | null {
  return useEllipsisBusyLabel(active, dmThinkingStatusLabel)
}
