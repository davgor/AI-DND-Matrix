import type { Character } from '../../../db/repositories/characters'
import type { EquipSlot } from '../../../shared/items/types'
import { CharacterSheetOverlayBody } from './CharacterSheetOverlayBody'
import { CharacterSheetOverlayHeader } from './CharacterSheetOverlayHeader'
import './characterSheetOverlay.css'

export interface CharacterSheetOverlayProps {
  character: Character
  isOpen: boolean
  refreshToken: number
  onClose: () => void
  onOpenInventory: (slot?: EquipSlot) => void
}

export function CharacterSheetOverlay(props: CharacterSheetOverlayProps): JSX.Element | null {
  if (!props.isOpen) {
    return null
  }

  return (
    <div className="character-sheet-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div
        className="character-sheet-overlay-panel modal-panel"
        role="dialog"
        aria-labelledby="character-sheet-overlay-title"
        onClick={(event) => event.stopPropagation()}
      >
        <CharacterSheetOverlayHeader character={props.character} onClose={props.onClose} />
        <CharacterSheetOverlayBody
          character={props.character}
          onOpenInventory={props.onOpenInventory}
        />
      </div>
    </div>
  )
}
