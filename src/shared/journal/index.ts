export type {
  CharacterJournalEntry,
  CreateCharacterJournalEntryInput,
  JournalKnownDossier,
  PersonMatchCandidate,
  PersonNameMatchSpan
} from './types'
export { matchPersonNames } from './matchPersonNames'
export { toJournalKnownDossiers } from './knownDossiers'
export { mergePersonMatchCandidates } from './personCandidates'
