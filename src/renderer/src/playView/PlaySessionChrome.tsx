import type { CombatStateSnapshot } from '../../../shared/combat/types'
import { PlaySessionChromeQuestButton } from './PlaySessionChromeQuestButton'
import { combatBadgeSummary, isCombatActive } from './usePlaySessionChromeData'

export interface PlaySessionChromeProps {
  characterName: string
  portraitPath: string | null
  regionName: string | null
  inGameDay: number
  campaignName: string | null
  campaignsCollapsed: boolean
  combatState: CombatStateSnapshot | null
  showRolls: boolean
  mainQuestTitle: string | null
  onOpenQuestLog?: () => void
  onToggleShowRolls: () => void
  onExitToCampaignHub: () => void
}

function portraitSrc(path: string | null): string | undefined {
  return path ? `file://${path}` : undefined
}

export function requestHubExit(
  combatActive: boolean,
  onExit: () => void,
  confirmFn: (message: string) => boolean = window.confirm.bind(window)
): void {
  if (combatActive) {
    const confirmed = confirmFn('Combat is still active. Return to the campaign hub anyway?')
    if (!confirmed) {
      return
    }
  }
  onExit()
}

function handleHubExit(props: PlaySessionChromeProps): void {
  requestHubExit(isCombatActive(props.combatState), props.onExitToCampaignHub)
}

export function PlaySessionChrome(props: PlaySessionChromeProps): JSX.Element {
  const combatActive = isCombatActive(props.combatState)
  const showCampaignName = props.campaignsCollapsed && props.campaignName

  return (
    <header className="play-session-chrome" aria-label="Play session">
      <div className="play-session-chrome-identity">
        {props.portraitPath ? (
          <img
            className="play-session-chrome-portrait"
            src={portraitSrc(props.portraitPath)}
            alt=""
          />
        ) : (
          <span className="play-session-chrome-portrait play-session-chrome-portrait-fallback" aria-hidden="true">
            {props.characterName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="play-session-chrome-character">{props.characterName}</span>
        {showCampaignName ? (
          <span className="play-session-chrome-campaign">{props.campaignName}</span>
        ) : null}
      </div>
      <div className="play-session-chrome-meta">
        {props.regionName ? <span className="play-session-chrome-region">{props.regionName}</span> : null}
        <span className="play-session-chrome-day">Day {props.inGameDay}</span>
        {combatActive && props.combatState ? (
          <span
            className="play-session-chrome-combat-badge"
            title={combatBadgeSummary(props.combatState)}
          >
            Combat · R{props.combatState.round}
          </span>
        ) : null}
      </div>
      <div className="play-session-chrome-actions">
        <PlaySessionChromeQuestButton mainQuestTitle={props.mainQuestTitle} onOpenQuestLog={props.onOpenQuestLog} />
        <label className="play-session-chrome-roll-toggle">
          <input type="checkbox" checked={props.showRolls} onChange={props.onToggleShowRolls} />
          Show rolls
        </label>
        <button type="button" className="play-session-chrome-hub-button" onClick={() => handleHubExit(props)}>
          Return to Hub
        </button>
      </div>
    </header>
  )
}
