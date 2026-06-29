import type { Character } from '../../../db/repositories/characters'
import { FormattedText } from '../shared/FormattedText'
import { useCharacterJournal } from './useCharacterJournal'
import './characterJournal.css'

export interface CharacterJournalSectionProps {
  character: Character
}

export function CharacterJournalSection(props: CharacterJournalSectionProps): JSX.Element {
  const journal = useCharacterJournal(props.character.id)

  return (
    <section className="character-journal">
      <h3>Journal</h3>
      <div className="character-journal-feed">
        {journal.entries.length === 0 ? (
          <p className="character-sheet-empty">No journal entries yet.</p>
        ) : (
          journal.entries.map((entry) => (
            <article key={entry.id} className="character-journal-entry">
              {FormattedText({ as: 'p', text: entry.content })}
              <footer>Day {entry.inGameDate}</footer>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
