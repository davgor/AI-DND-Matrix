export interface CharacterJournalEntry {
  id: string
  campaignId: string
  characterId: string
  content: string
  inGameDate: number
  createdAt: string
}

export interface CreateCharacterJournalEntryInput {
  campaignId: string
  characterId: string
  content: string
  inGameDate: number
  createdAt?: string
}
