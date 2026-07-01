import type { LogCategory } from '../../../shared/logBook/types'
import { LOG_FILTER_CHIPS } from './useCharacterLogBook'

export function LogBookToolbar(props: {
  query: string
  category: LogCategory | 'all'
  onQueryChange: (value: string) => void
  onCategoryChange: (category: LogCategory | 'all') => void
}): JSX.Element {
  return (
    <div className="character-log-book-toolbar">
      <input
        type="search"
        className="character-log-book-search"
        placeholder="Search entries…"
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
        aria-label="Search log book"
      />
      <div className="character-log-book-filters" role="tablist" aria-label="Log book categories">
        {LOG_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={props.category === chip.id}
            className={props.category === chip.id ? 'log-book-filter-active' : undefined}
            onClick={() => props.onCategoryChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
