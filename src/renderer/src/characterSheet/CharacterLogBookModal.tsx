import type { Character } from '../../../db/repositories/characters'
import { CharacterLogBookSections } from './CharacterLogBookSections'
import { useCharacterLogBook } from './useCharacterLogBook'
import './characterLogBook.css'

export interface CharacterLogBookModalProps {
  character: Character
  isOpen: boolean
  onClose: () => void
}

export function CharacterLogBookModal(props: CharacterLogBookModalProps): JSX.Element | null {
  const logBook = useCharacterLogBook(props.character.id, props.isOpen)

  if (!props.isOpen) {
    return null
  }

  return (
    <div className="character-log-book-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div
        className="character-log-book-modal modal-panel"
        role="dialog"
        aria-labelledby="character-log-book-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="character-log-book-header">
          <div>
            <p className="eyebrow">Knowledge</p>
            <h2 id="character-log-book-title">{props.character.name}&apos;s Log Book</h2>
          </div>
          <button type="button" className="character-log-book-close" aria-label="Close log book" onClick={props.onClose}>
            ×
          </button>
        </header>
        {logBook.loading ? (
          <p className="character-sheet-empty">Loading entries…</p>
        ) : (
          <CharacterLogBookSections entries={logBook.entries} />
        )}
      </div>
    </div>
  )
}
