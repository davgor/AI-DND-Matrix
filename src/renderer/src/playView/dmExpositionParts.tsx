import type { PlayLogEntry } from '../../../main/narrationLog'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import type { SceneSummaryInput } from '../../../shared/inCampaignLayout/sceneContext'
import { pickSceneSummary } from '../../../shared/inCampaignLayout/sceneContext'
import { FormattedText } from '../shared/FormattedText'
import {
  incomingHighlightClassName,
  useIncomingHighlight
} from './incomingHighlight'

interface AlignmentShiftWarningBannerProps {
  pending: PendingAlignmentShift
  playerAlignment: string | null
}

export function AlignmentShiftWarningBanner(
  props: AlignmentShiftWarningBannerProps
): JSX.Element {
  const { pending, playerAlignment } = props
  return (
    <div className="dm-alignment-shift-warning" role="alert">
      <p className="dm-alignment-shift-warning-title">Alignment at risk</p>
      <p>{pending.warningText}</p>
      {playerAlignment ? (
        <p className="dm-alignment-shift-warning-detail">
          Current: {ALIGNMENT_LABELS[playerAlignment as Alignment] ?? playerAlignment}
          {' → '}
          Proposed: {ALIGNMENT_LABELS[pending.proposedAlignment]}
        </p>
      ) : null}
    </div>
  )
}

export function DefeatDispositionBanner(props: { narrationText: string }): JSX.Element {
  return (
    <div className="dm-defeat-disposition-banner" role="alert">
      <p className="dm-defeat-disposition-title">Defeated</p>
      <p>{props.narrationText}</p>
    </div>
  )
}

export function XpRewardBanner(props: { narrationText: string }): JSX.Element {
  return (
    <div className="dm-xp-reward-banner" role="status">
      <p className="dm-xp-reward-title">Experience</p>
      <p>{props.narrationText}</p>
    </div>
  )
}

export function LootRewardBanner(props: { narrationText: string }): JSX.Element {
  return (
    <div className="dm-loot-reward-banner" role="status">
      <p className="dm-loot-reward-title">Loot</p>
      <p>{props.narrationText}</p>
    </div>
  )
}

export function ImprisonedStatusBanner(): JSX.Element {
  return (
    <div className="dm-imprisoned-status" role="status">
      <p>You are imprisoned and cannot act freely until you escape.</p>
    </div>
  )
}

interface DmExpositionSceneHeaderProps {
  entries: PlayLogEntry[]
  sceneContext: SceneSummaryInput
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
}

export function DmExpositionSceneHeader(props: DmExpositionSceneHeaderProps): JSX.Element {
  const sceneText = pickSceneSummary(props.entries, props.sceneContext)
  const summaryHighlighted = useIncomingHighlight(sceneText)
  const isLoading = props.expositionStatus.state === 'loading'
  return (
    <header className="dm-exposition-header">
      <h2>Scene</h2>
      {isLoading ? <p className="dm-exposition-status dm-exposition-loading">Updating scene…</p> : null}
      {props.expositionStatus.state === 'error' ? (
        <div className="dm-exposition-status dm-exposition-error" role="alert">
          <p>{props.expositionStatus.errorMessage}</p>
          <button type="button" onClick={props.onRetryExposition}>
            Retry
          </button>
        </div>
      ) : null}
      <div
        className={incomingHighlightClassName(summaryHighlighted, 'dm-exposition-scene')}
        aria-live="polite"
      >
        {FormattedText({ as: 'p', className: 'dm-exposition-scene-text', text: sceneText })}
      </div>
    </header>
  )
}

function speakerLabel(entry: PlayLogEntry): string | null {
  if (entry.speaker === 'dm') {
    return 'DM'
  }
  if (entry.speaker === 'npc') {
    return entry.speakerName ?? 'NPC'
  }
  if (entry.speaker === 'partyMember') {
    return entry.speakerName ?? 'Ally'
  }
  return null
}

function renderNpcLine(entry: { reactionKind?: string; text: string }): JSX.Element {
  if (entry.reactionKind === 'action') {
    return (
      <strong>
        {FormattedText({ text: entry.text })}
      </strong>
    )
  }
  return (
    <em>
      {FormattedText({ text: entry.text })}
    </em>
  )
}

function renderFeedLine(entry: PlayLogEntry): JSX.Element {
  const label = speakerLabel(entry)
  const body =
    entry.speaker === 'player' && entry.playerLineKind === 'actionExpression' ? (
      <strong>{entry.text}</strong>
    ) : entry.speaker === 'npc' || entry.speaker === 'partyMember' ? (
      renderNpcLine(entry)
    ) : (
      <>{entry.text}</>
    )

  if (!label) {
    return body
  }

  return (
    <>
      <span className="dm-feed-speaker">{label}:</span> {body}
    </>
  )
}

export { renderNpcLine, renderFeedLine }
