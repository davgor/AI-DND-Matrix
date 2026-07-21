import { useCallback, useEffect, useState } from 'react'
import type { JournalKnownDossier, PersonMatchCandidate } from '../../../shared/journal/types'

export function useJournalPersonLinks(
  campaignId: string,
  characterId: string
): {
  personCandidates: PersonMatchCandidate[]
  knownDossiers: JournalKnownDossier[]
  refresh: () => void
} {
  const [personCandidates, setPersonCandidates] = useState<PersonMatchCandidate[]>([])
  const [knownDossiers, setKnownDossiers] = useState<JournalKnownDossier[]>([])

  const refresh = useCallback(() => {
    void (async () => {
      const [candidates, dossiers] = await Promise.all([
        window.journal.listPersonMatchCandidates({ campaignId, characterId }),
        window.journal.listKnownDossiers(campaignId)
      ])
      setPersonCandidates(candidates)
      setKnownDossiers(dossiers)
    })()
  }, [campaignId, characterId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { personCandidates, knownDossiers, refresh }
}
