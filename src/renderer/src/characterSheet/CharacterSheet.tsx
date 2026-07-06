import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { resolveRaceDisplayLabel } from '../../../shared/raceSelection/resolveLabel'
import { resolveBackgroundDisplayLabel } from '../../../shared/characterBackground/resolveLabel'
import { CharacterSheetBody } from './CharacterSheetBody'
import './characterSheet.css'

export interface CharacterSheetProps {
  campaignId: string
  isOpen: boolean
  onClose: () => void
}

export function CharacterSheet(props: CharacterSheetProps): JSX.Element {
  const [character, setCharacter] = useState<Character | null>(null)
  const [raceLabel, setRaceLabel] = useState<string | null>(null)
  const [backgroundLabel, setBackgroundLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!props.isOpen) {
      return undefined
    }
    let cancelled = false
    void Promise.all([
      window.characters.listByCampaign(props.campaignId),
      window.race.getCampaignRaces(props.campaignId)
    ]).then(([characters, campaignRaces]) => {
      if (cancelled) {
        return
      }
      const player = characters.find((entry) => entry.kind === 'player') ?? null
      setCharacter(player)
      setRaceLabel(resolveRaceDisplayLabel(player?.raceKey, campaignRaces))
      setBackgroundLabel(resolveBackgroundDisplayLabel(player?.backgroundKey))
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
        <CharacterSheetBody character={character} compact={false} raceLabel={raceLabel} backgroundLabel={backgroundLabel} />
      ) : (
        <p className="character-sheet-empty">No character created yet.</p>
      )}
    </div>
  )
}
