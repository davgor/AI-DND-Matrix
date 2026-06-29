import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { CharacterSheetBody } from './CharacterSheetBody'
import './characterSheet.css'

export interface CharacterSheetProps {
  campaignId: string
  isOpen: boolean
  onClose: () => void
}

export function CharacterSheet(props: CharacterSheetProps): JSX.Element {
  const [character, setCharacter] = useState<Character | null>(null)

  useEffect(() => {
    if (!props.isOpen) {
      return undefined
    }
    let cancelled = false
    window.characters.listByCampaign(props.campaignId).then((characters) => {
      if (cancelled) {
        return
      }
      setCharacter(characters.find((entry) => entry.kind === 'player') ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [props.isOpen, props.campaignId])

  const panelClassName = props.isOpen
    ? 'character-sheet character-sheet-open'
    : 'character-sheet'

  return (
    <div className={panelClassName}>
      <button
        type="button"
        className="character-sheet-close"
        aria-label="Close character sheet"
        onClick={props.onClose}
      >
        ×
      </button>
      {character ? (
        <CharacterSheetBody character={character} compact={false} />
      ) : (
        <p className="character-sheet-empty">No character created yet.</p>
      )}
    </div>
  )
}
