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

/** NPC eligible for journal person-name matching (see SPEC.md). */
export interface PersonMatchCandidate {
  npcId: string
  name: string
}

/** Non-overlapping span into raw journal text; `end` is exclusive. */
export interface PersonNameMatchSpan {
  start: number
  end: number
  npcId: string
}

/** NPC with a generated dossier, listed on the journal known-dossiers surface. */
export interface JournalKnownDossier {
  npcId: string
  name: string
}
