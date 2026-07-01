import type { LogEntry } from '../../../shared/logBook/types'
import { LogBookEntryCard } from './LogBookEntryCard'
import { resolveRelatedEntityLabel } from './useCharacterLogBook'

export function LogBookEntryList(props: {
  characterId: string
  entries: LogEntry[]
  allEntries: LogEntry[]
  loading: boolean
  curateMode: boolean
  editingId: string | null
  editTitle: string
  editContent: string
  onEditTitle: (value: string) => void
  onEditContent: (value: string) => void
  onSetEditingId: (id: string | null) => void
  onRefresh: () => void
}): JSX.Element {
  if (props.loading) {
    return <p className="character-sheet-empty">Loading entries…</p>
  }
  if (props.entries.length === 0) {
    return <p className="character-sheet-empty">Nothing recorded yet for this filter.</p>
  }
  return (
    <ul className="character-log-book-entry-cards">
      {props.entries.map((entry) => (
        <LogBookEntryCard
          key={entry.id}
          entry={entry}
          relatedLabel={resolveRelatedEntityLabel(entry.relatedEntityId, props.allEntries)}
          curateMode={props.curateMode}
          editing={props.editingId === entry.id}
          editTitle={props.editTitle}
          editContent={props.editContent}
          onStartEdit={() => {
            props.onSetEditingId(entry.id)
            props.onEditTitle(entry.title)
            props.onEditContent(entry.content)
          }}
          onSaveEdit={() => void saveEntry(props)}
          onCancelEdit={() => props.onSetEditingId(null)}
          onDelete={() => void deleteEntry(props.characterId, entry.id, props.onRefresh)}
          onEditTitle={props.onEditTitle}
          onEditContent={props.onEditContent}
        />
      ))}
    </ul>
  )
}

async function saveEntry(props: {
  characterId: string
  editingId: string | null
  editTitle: string
  editContent: string
  onSetEditingId: (id: string | null) => void
  onRefresh: () => void
}): Promise<void> {
  if (!props.editingId) {
    return
  }
  await window.logBook.updateEntry({
    characterId: props.characterId,
    entryId: props.editingId,
    updates: { title: props.editTitle, content: props.editContent }
  })
  props.onSetEditingId(null)
  props.onRefresh()
}

async function deleteEntry(characterId: string, entryId: string, onRefresh: () => void): Promise<void> {
  await window.logBook.deleteEntry({ characterId, entryId })
  onRefresh()
}
