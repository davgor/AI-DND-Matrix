import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { resolveRaceDisplayLabel } from '../../../shared/raceSelection/resolveLabel'
import { resolveBackgroundDisplayLabel } from '../../../shared/characterBackground/resolveLabel'
import { CharacterSheetBody } from './CharacterSheetBody'
import {
  getPlayerSheetCollapsed,
  setPlayerSheetCollapsed
} from './playerSheetPreferences'
import './playerSheetRail.css'

export interface PlayerSheetRailProps {
  campaignId: string
  characterId: string
  collapsed: boolean
  onToggleCollapsed: () => void
  refreshToken: number
}

export function PlayerSheetRail(props: PlayerSheetRailProps): JSX.Element {
  const [character, setCharacter] = useState<Character | null>(null)
  const [raceLabel, setRaceLabel] = useState<string | null>(null)
  const [backgroundLabel, setBackgroundLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      window.characters.listByCampaign(props.campaignId),
      window.race.getCampaignRaces(props.campaignId)
    ]).then(([characters, campaignRaces]) => {
      if (cancelled) {
        return
      }
      const match = characters.find((entry) => entry.id === props.characterId) ?? null
      setCharacter(match)
      setRaceLabel(resolveRaceDisplayLabel(match?.raceKey, campaignRaces))
      setBackgroundLabel(resolveBackgroundDisplayLabel(match?.backgroundKey))
    })
    return () => {
      cancelled = true
    }
  }, [props.campaignId, props.characterId, props.refreshToken])

  const railClass = props.collapsed
    ? 'player-sheet-rail player-sheet-rail-collapsed'
    : 'player-sheet-rail'

  return (
    <div className={railClass}>
      <button
        type="button"
        className="player-sheet-rail-toggle"
        aria-label={props.collapsed ? 'Expand player sheet' : 'Collapse player sheet'}
        onClick={props.onToggleCollapsed}
      >
        {props.collapsed ? '«' : '»'}
      </button>
      {!props.collapsed ? (
        character ? (
          <CharacterSheetBody character={character} compact={false} raceLabel={raceLabel} backgroundLabel={backgroundLabel} />
        ) : (
          <p className="character-sheet-empty">No character created yet.</p>
        )
      ) : (
        <div className="player-sheet-rail-compact" aria-hidden="true">
          {character ? character.name.charAt(0).toUpperCase() : '?'}
        </div>
      )}
    </div>
  )
}

export function usePlayerSheetCollapse(): { collapsed: boolean; toggleCollapsed: () => void } {
  const [collapsed, setCollapsed] = useState(() => getPlayerSheetCollapsed(window.localStorage))

  function toggleCollapsed(): void {
    setCollapsed((current) => {
      const next = !current
      setPlayerSheetCollapsed(window.localStorage, next)
      return next
    })
  }

  return { collapsed, toggleCollapsed }
}
