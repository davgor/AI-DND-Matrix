import type { Character } from '../../../db/repositories/characters'
import type { JournalKnownDossier, PersonMatchCandidate } from '../../../shared/journal'
import { FormattedText } from '../shared/FormattedText'
import { JournalKnownDossiersSection } from './JournalKnownDossiersSection'
import { useCharacterJournal } from './useCharacterJournal'
import './characterJournal.css'

export interface CharacterJournalSectionProps {
  character: Character
  personCandidates?: PersonMatchCandidate[]
  knownDossiers?: JournalKnownDossier[]
  onOpenNpcDossier?: (npcId: string) => void
}

export function CharacterJournalSection(props: CharacterJournalSectionProps): JSX.Element {
  const journal = useCharacterJournal(props.character.id)

  return (
    <section className="character-journal">
      <h3>Journal</h3>
      {props.knownDossiers !== undefined ? (
        <JournalKnownDossiersSection
          dossiers={props.knownDossiers}
          onOpenNpcDossier={props.onOpenNpcDossier}
        />
      ) : null}
      <div className="character-journal-feed">
        {journal.entries.length === 0 ? (
          <p className="character-sheet-empty">No journal entries yet.</p>
        ) : (
          journal.entries.map((entry) => (
            <article key={entry.id} className="character-journal-entry">
              {FormattedText({
                as: 'p',
                text: entry.content,
                personCandidates: props.personCandidates,
                onPersonActivate: props.onOpenNpcDossier
              })}
              <footer>Day {entry.inGameDate}</footer>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
