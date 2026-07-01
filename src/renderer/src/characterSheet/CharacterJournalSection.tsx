import { useMemo, useRef } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { FormattedText } from '../shared/FormattedText'
import { STREAM_ITEM_ID_ATTR, useScrollToNewStreamItem } from '../shared/scrollStreamItem'
import { useCharacterJournal } from './useCharacterJournal'
import './characterJournal.css'

export interface CharacterJournalSectionProps {
  character: Character
}

export function CharacterJournalSection(props: CharacterJournalSectionProps): JSX.Element {
  const journal = useCharacterJournal(props.character.id)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const streamItemIds = useMemo(
    () => journal.entries.map((entry) => entry.id),
    [journal.entries]
  )

  useScrollToNewStreamItem(feedRef, streamItemIds)

  return (
    <section className="character-journal">
      <h3>Journal</h3>
      <div className="character-journal-feed" ref={feedRef}>
        {journal.entries.length === 0 ? (
          <p className="character-sheet-empty">No journal entries yet.</p>
        ) : (
          journal.entries.map((entry) => (
            <article
              key={entry.id}
              className="character-journal-entry"
              {...{ [STREAM_ITEM_ID_ATTR]: entry.id }}
            >
              {FormattedText({ as: 'p', text: entry.content })}
              <footer>Day {entry.inGameDate}</footer>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
