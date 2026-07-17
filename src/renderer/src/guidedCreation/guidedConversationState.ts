import type {
  GuidedCreationMessage,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'

export const PENDING_PLAYER_MESSAGE_ID = 'pending-player'
export const DM_THINKING_ELLIPSIS_FRAMES = 4

export function shouldDisableGuidedInput(sending: boolean, phaseComplete: boolean): boolean {
  return sending || phaseComplete
}

export function latestDmReply(messages: GuidedCreationMessage[]): string | null {
  const dmMessages = messages.filter((message) => message.role === 'dm')
  return dmMessages.at(-1)?.content ?? null
}

/** Cycles `.` → `..` → `...` → `....` → repeat for the DM thinking status line. */
export function dmThinkingStatusLabel(frame: number): string {
  const dots = (Math.floor(frame) % DM_THINKING_ELLIPSIS_FRAMES) + 1
  return `The DM is thinking${'.'.repeat(dots)}`
}

export function messagesWithPendingPlayer(
  messages: GuidedCreationMessage[],
  pending: {
    content: string
    campaignId: string
    characterId: string
    phase: GuidedMessagePhase
  } | null
): GuidedCreationMessage[] {
  if (!pending) {
    return messages
  }
  const last = messages.at(-1)
  if (last?.role === 'player' && last.content === pending.content) {
    return messages
  }
  return [
    ...messages,
    {
      id: PENDING_PLAYER_MESSAGE_ID,
      campaignId: pending.campaignId,
      characterId: pending.characterId,
      phase: pending.phase,
      role: 'player',
      content: pending.content,
      createdAt: new Date(0).toISOString()
    }
  ]
}
