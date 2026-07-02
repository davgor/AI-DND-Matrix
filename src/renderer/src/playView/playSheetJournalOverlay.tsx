import type { Character } from '../../../db/repositories/characters'
import { CharacterJournalSection } from '../characterSheet/CharacterJournalSection'

export function PlaySheetJournalTab(props: {
  character: Character
  isOpen: boolean
  onClose: () => void
}): JSX.Element | null {
  if (!props.isOpen) {
    return null
  }
  return (
    <div className="character-sheet-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div className="character-sheet-overlay-panel modal-panel" role="dialog" onClick={(event) => event.stopPropagation()}>
        <header className="character-sheet-overlay-header">
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
