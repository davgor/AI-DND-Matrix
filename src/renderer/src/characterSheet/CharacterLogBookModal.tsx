import { useMemo, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import type { LogCategory } from '../../../shared/logBook/types'
import { LogBookEntryList } from './LogBookEntryList'
import { LogBookToolbar } from './LogBookToolbar'
import { filterLogEntries, useCharacterLogBook } from './useCharacterLogBook'
import './characterLogBook.css'
import './characterSheetOverlay.css'

export interface CharacterLogBookModalProps {
  character: Character
  isOpen: boolean
  refreshToken?: number
  onClose: () => void
}

function LogBookModalHeader(props: {
  characterName: string
  curateMode: boolean
  onCurateChange: (value: boolean) => void
  onClose: () => void
}): JSX.Element {
  return (
    <header className="character-log-book-header">
      <div>
        <p className="eyebrow">World knowledge</p>
        <h2 id="character-log-book-title">{props.characterName}&apos;s Knowledge Base</h2>
      </div>
      <div className="character-log-book-header-actions">
        <label className="character-log-book-curate-toggle">
          <input type="checkbox" checked={props.curateMode} onChange={(event) => props.onCurateChange(event.target.checked)} />
          Curate
        </label>
        <button type="button" className="character-log-book-close" aria-label="Close knowledge base" onClick={props.onClose}>
          ×
        </button>
      </div>
    </header>
  )
}

export function CharacterLogBookModal(props: CharacterLogBookModalProps): JSX.Element | null {
  const logBook = useCharacterLogBook(props.character.id, props.isOpen, props.refreshToken ?? 0)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<LogCategory | 'all'>('all')
  const [curateMode, setCurateMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const filtered = useMemo(
    () => filterLogEntries(logBook.entries, query, category),
    [logBook.entries, query, category]
  )

  if (!props.isOpen) {
    return null
  }

  return (
    <div className="character-log-book-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div
        className="character-log-book-modal modal-panel character-log-book-modal-v2"
        role="dialog"
        aria-labelledby="character-log-book-title"
        onClick={(event) => event.stopPropagation()}
      >
        <LogBookModalHeader
          characterName={props.character.name}
          curateMode={curateMode}
          onCurateChange={setCurateMode}
          onClose={props.onClose}
        />
        <LogBookToolbar query={query} category={category} onQueryChange={setQuery} onCategoryChange={setCategory} />
        <LogBookEntryList
          characterId={props.character.id}
          entries={filtered}
          allEntries={logBook.entries}
          loading={logBook.loading}
          curateMode={curateMode}
          editingId={editingId}
          editTitle={editTitle}
          editContent={editContent}
          onEditTitle={setEditTitle}
          onEditContent={setEditContent}
          onSetEditingId={setEditingId}
          onRefresh={() => void logBook.refresh()}
        />
      </div>
    </div>
  )
}
