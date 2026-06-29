import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'

export function shouldDisableGuidedInput(sending: boolean, phaseComplete: boolean): boolean {
  return sending || phaseComplete
}

export function latestDmReply(messages: GuidedCreationMessage[]): string | null {
  const dmMessages = messages.filter((message) => message.role === 'dm')
  return dmMessages.at(-1)?.content ?? null
}
