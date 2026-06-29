import { LOG_CATEGORIES, type LogEntry } from '../../../shared/logBook/types'
import { LOG_CATEGORY_LABELS, groupLogEntriesByCategory } from './logBookGrouping'

export interface CharacterLogBookSectionsProps {
  entries: LogEntry[]
}

export function CharacterLogBookSections(props: CharacterLogBookSectionsProps): JSX.Element {
  const grouped = groupLogEntriesByCategory(props.entries)

  return (
    <div className="character-log-book-sections">
      {LOG_CATEGORIES.map((category) => (
        <section key={category} className="character-log-book-section">
          <h3>{LOG_CATEGORY_LABELS[category]}</h3>
          {grouped[category].length === 0 ? (
            <p className="character-sheet-empty">Nothing recorded yet.</p>
          ) : (
            <ul className="character-log-book-list">
              {grouped[category].map((entry) => (
                <li key={entry.id}>
                  <div className="character-log-book-entry-header">
                    <strong>{entry.title}</strong>
                    <span className="character-log-book-date">Day {entry.learnedInGameDate}</span>
                  </div>
                  <p>{entry.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
