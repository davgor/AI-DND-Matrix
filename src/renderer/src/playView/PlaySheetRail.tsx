import '../characterSheet/playerSheetRail.css'
import './playSheetRail.css'
import { PlaySheetRailBody } from './PlaySheetRailBody'
import { usePlaySheetRailState } from './usePlaySheetRailState'
import { useState } from 'react'
import { setPlayerSheetCollapsed } from '../characterSheet/playerSheetPreferences'
export type { PlaySheetTab } from './playSheetRailTabs'
export { resolveDefaultPlaySheetTab } from './playSheetRailTabs'

export interface PlaySheetRailProps {
  campaignId: string
  characterId: string
  collapsed: boolean
  onToggleCollapsed: () => void
  refreshToken: number
}

export function PlaySheetRail(props: PlaySheetRailProps): JSX.Element {
  const railState = usePlaySheetRailState({
    campaignId: props.campaignId,
    characterId: props.characterId,
    refreshToken: props.refreshToken
  })
  const railClass = props.collapsed
    ? 'player-sheet-rail play-sheet-rail player-sheet-rail-collapsed'
    : 'player-sheet-rail play-sheet-rail'

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
      {!props.collapsed && railState.character ? (
        <PlaySheetRailBody
          character={railState.character}
          activeTab={railState.activeTab}
          onSelectTab={railState.setActiveTab}
          refreshToken={props.refreshToken}
        />
      ) : null}
      {!props.collapsed && !railState.character ? (
        <p className="character-sheet-empty">No character created yet.</p>
      ) : null}
      {props.collapsed ? (
        <div className="player-sheet-rail-compact" aria-hidden="true">
          {railState.character ? railState.character.name.charAt(0).toUpperCase() : '?'}
        </div>
      ) : null}
    </div>
  )
}

export function usePlayerSheetCollapse(): { collapsed: boolean; toggleCollapsed: () => void } {
  const [collapsed, setCollapsed] = useState(false)

  function toggleCollapsed(): void {
    setCollapsed((current) => {
      const next = !current
      setPlayerSheetCollapsed(window.localStorage, next)
      return next
    })
  }

  return { collapsed, toggleCollapsed }
}
