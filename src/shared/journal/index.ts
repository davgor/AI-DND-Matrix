export type {
  CharacterJournalEntry,
  CreateCharacterJournalEntryInput,
  JournalKnownDossier,
  PersonMatchCandidate,
  PersonNameMatchSpan
} from './types'
export { matchPersonNames } from './matchPersonNames'
export { toJournalKnownDossiers } from './knownDossiers'
export {
  excludeSpeakerFromPersonCandidates,
  mergePersonMatchCandidates
} from './personCandidates'
