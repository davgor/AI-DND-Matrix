import type {
  GuidedCreationMessage,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'

const PENDING_PLAYER_MESSAGE_ID = 'pending-player'
const BUSY_ELLIPSIS_FRAMES = 4

export function shouldDisableGuidedInput(sending: boolean, phaseComplete: boolean): boolean {
  return sending || phaseComplete
}

/** Cycles `.` → `..` → `...` → `....` → repeat after a busy prefix. */
export function ellipsisBusyLabel(prefix: string, frame: number): string {
  const dots = (Math.floor(frame) % BUSY_ELLIPSIS_FRAMES) + 1
  return `${prefix}${'.'.repeat(dots)}`
}

/** Cycles `.` → `..` → `...` → `....` → repeat for the DM thinking status line. */
export function dmThinkingStatusLabel(frame: number): string {
  return ellipsisBusyLabel('The DM is thinking', frame)
}

/** Same ellipsis cycle for the guided Generate button while a draft is in flight. */
export function generatingStatusLabel(frame: number): string {
  return ellipsisBusyLabel('Generating', frame)
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
