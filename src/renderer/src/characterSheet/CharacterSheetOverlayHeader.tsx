import type { Character } from '../../../db/repositories/characters'
import { CurrencyChip } from './CurrencyChip'

export function CharacterSheetOverlayHeader(props: {
  character: Character
  raceLabel?: string | null
  onClose: () => void
}): JSX.Element {
  return (
    <header className="character-sheet-overlay-header">
      <div>
        <p className="eyebrow">Character</p>
        <h2 id="character-sheet-overlay-title">{props.character.name}</h2>
        <p className="character-sheet-overlay-subtitle">
          {props.character.characterClass} — Level {props.character.level}
          {props.raceLabel ? ` · ${props.raceLabel}` : ''}
        </p>
      </div>
      <div className="character-sheet-overlay-header-actions">
        <CurrencyChip currency={props.character.currency} />
        <button type="button" className="character-sheet-overlay-close" aria-label="Close" onClick={props.onClose}>
          ×
        </button>
      </div>
    </header>
  )
}
