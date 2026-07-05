import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import type { EquipSlot } from '../../../shared/items/types'
import { resolveRaceDisplayLabel } from '../../../shared/raceSelection/resolveLabel'
import { CharacterSheetOverlayBody } from './CharacterSheetOverlayBody'
import { CharacterSheetOverlayHeader } from './CharacterSheetOverlayHeader'
import './characterSheetOverlay.css'

export interface CharacterSheetOverlayProps {
  character: Character
  campaignId: string
  isOpen: boolean
  refreshToken: number
  onClose: () => void
  onOpenInventory: (slot?: EquipSlot) => void
}

export function CharacterSheetOverlay(props: CharacterSheetOverlayProps): JSX.Element | null {
  const [raceLabel, setRaceLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!props.isOpen) {
      return undefined
    }
    let cancelled = false
    void window.race.getCampaignRaces(props.campaignId).then((campaignRaces) => {
      if (cancelled) {
        return
      }
      setRaceLabel(resolveRaceDisplayLabel(props.character.raceKey, campaignRaces))
    })
    return () => {
      cancelled = true
    }
  }, [props.isOpen, props.campaignId, props.character.raceKey, props.refreshToken])

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
        <CharacterSheetOverlayHeader character={props.character} raceLabel={raceLabel} onClose={props.onClose} />
        <CharacterSheetOverlayBody
          character={props.character}
          onOpenInventory={props.onOpenInventory}
        />
      </div>
    </div>
  )
}
