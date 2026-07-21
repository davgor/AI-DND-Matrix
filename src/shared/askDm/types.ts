export type AskDmRole = 'player' | 'dm'

export interface AskDmMessage {
  id: string
  campaignId: string
  characterId: string
  role: AskDmRole
  content: string
  createdAt: string
}

export interface AskDmListHistoryInput {
  campaignId: string
  characterId: string
}

export type AskDmSendFailureReason =
  | 'empty_message'
  | 'campaign_not_found'
  | 'character_not_found'
  | 'agent_failed'

export interface AskDmSendMessageInput {
  campaignId: string
  characterId: string
  message: string
}

export type AskDmSendMessageResult =
  | {
      ok: true
      playerMessage: AskDmMessage
      dmMessage: AskDmMessage
    }
  | {
      ok: false
      reason: AskDmSendFailureReason
      playerMessage?: AskDmMessage
    }
