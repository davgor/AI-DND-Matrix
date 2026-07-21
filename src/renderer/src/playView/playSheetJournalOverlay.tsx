import type { Character } from '../../../db/repositories/characters'
import { CharacterJournalSection } from '../characterSheet/CharacterJournalSection'
import './playSheetJournalOverlay.css'

export function PlaySheetJournalTab(props: {
  character: Character
  isOpen: boolean
  onClose: () => void
}): JSX.Element | null {
  if (!props.isOpen) {
    return null
  }
  return (
    <div className="play-sheet-journal-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div
        className="play-sheet-journal-modal modal-panel"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="play-sheet-journal-header">
          <h2>Journal</h2>
          <button type="button" aria-label="Close journal" onClick={props.onClose}>
            ×
          </button>
        </header>
        <CharacterJournalSection character={props.character} />
      </div>
    </div>
  )
}
