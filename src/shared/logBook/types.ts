export const LOG_CATEGORIES = ['event', 'place', 'person', 'beast', 'thing'] as const
export type LogCategory = (typeof LOG_CATEGORIES)[number]

export interface LogEntry {
  id: string
  campaignId: string
  characterId: string
  category: LogCategory
  title: string
  content: string
  relatedEntityId: string | null
  learnedInGameDate: number
  createdAt: string
}

export interface CreateLogEntryInput {
  campaignId: string
  characterId: string
  category: LogCategory
  title: string
  content: string
  relatedEntityId?: string | null
  learnedInGameDate: number
  createdAt?: string
}

export interface LogEntryProposal {
  category: string
  title: string
  content: string
  relatedEntityId?: string
}
