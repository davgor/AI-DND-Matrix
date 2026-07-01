import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import { FormattedText } from '../shared/FormattedText'

export interface AlignmentShiftWarningBannerProps {
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

export function DmExpositionSceneHeader(props: {
  sceneText: string | null
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
  pendingAlignmentShift: PendingAlignmentShift | null
  playerAlignment: string | null
  defeatDispositionNarration: string | null
  xpNarration: string | null
  lootNarration: string | null
  playerImprisoned: boolean
}): JSX.Element {
  const isLoading = props.expositionStatus.state === 'loading'
  return (
    <header className="dm-exposition-header">
      <h2>Scene</h2>
      {props.pendingAlignmentShift ? (
        <AlignmentShiftWarningBanner
          pending={props.pendingAlignmentShift}
          playerAlignment={props.playerAlignment}
        />
      ) : null}
      {props.playerImprisoned ? <ImprisonedStatusBanner /> : null}
      {props.defeatDispositionNarration ? (
        <DefeatDispositionBanner narrationText={props.defeatDispositionNarration} />
      ) : null}
      {props.xpNarration ? <XpRewardBanner narrationText={props.xpNarration} /> : null}
      {props.lootNarration ? <LootRewardBanner narrationText={props.lootNarration} /> : null}
      {isLoading ? <p className="dm-exposition-status dm-exposition-loading">Updating scene…</p> : null}
      {props.expositionStatus.state === 'error' ? (
        <div className="dm-exposition-status dm-exposition-error" role="alert">
          <p>{props.expositionStatus.errorMessage}</p>
          <button type="button" onClick={props.onRetryExposition}>
            Retry
          </button>
        </div>
      ) : null}
      <div className="dm-exposition-scene" aria-live="polite">
        {props.sceneText ? (
          FormattedText({ as: 'p', className: 'dm-exposition-scene-text', text: props.sceneText })
        ) : (
          <p className="dm-exposition-scene-empty">No scene set yet — act to begin.</p>
        )}
      </div>
    </header>
  )
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

function renderFeedLine(entry: { speaker: string; reactionKind?: string; playerLineKind?: string; text: string }): JSX.Element {
  if (entry.speaker === 'player' && entry.playerLineKind === 'actionExpression') {
    return <strong>{entry.text}</strong>
  }
  if (entry.speaker === 'npc' || entry.speaker === 'partyMember') {
    return renderNpcLine(entry)
  }
  return <>{entry.text}</>
}

export { renderNpcLine, renderFeedLine as renderConversationLine, renderFeedLine }
