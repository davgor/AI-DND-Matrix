import type { PlayLogEntry } from '../../../main/narrationLog'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import type { SceneSummaryInput } from '../../../shared/inCampaignLayout/sceneContext'
import { pickSceneSummary } from '../../../shared/inCampaignLayout/sceneContext'
import type { PersonMatchCandidate } from '../../../shared/journal'
import { FormattedText } from '../shared/FormattedText'
import {
  incomingHighlightClassName,
  useIncomingHighlight
} from './incomingHighlight'

export interface ScenePersonLinkProps {
  personCandidates?: PersonMatchCandidate[]
  onPersonActivate?: (npcId: string) => void
}

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

export function LockoutStatusBanner(props: { narrationText: string }): JSX.Element {
  return (
    <div className="dm-lockout-status-banner" role="status">
      <p className="dm-lockout-status-title">Recovering</p>
      <p>{props.narrationText}</p>
    </div>
  )
}

export function SpellGrantBanner(props: { narrationText: string }): JSX.Element {
  return (
    <div className="dm-spell-grant-banner" role="status">
      <p className="dm-spell-grant-title">Spell learned</p>
      <p>{props.narrationText}</p>
    </div>
  )
}

/** EPIC-135 — engine commerce/travel success or fail (not DM-mind dependent). */
export function CommerceTravelBanner(props: { narrationText: string }): JSX.Element {
  const isFail = /cannot afford|No known|do not have|already in/i.test(props.narrationText)
  return (
    <div
      className={isFail ? 'dm-commerce-travel-banner dm-commerce-travel-banner-fail' : 'dm-commerce-travel-banner'}
      role="status"
    >
      <p className="dm-commerce-travel-title">{isFail ? 'Action failed' : 'Action resolved'}</p>
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

interface DmExpositionSceneHeaderProps extends ScenePersonLinkProps {
  entries: PlayLogEntry[]
  sceneContext: SceneSummaryInput
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
  onAbortTurnFailure: () => void
  turnFailureRetryable: boolean
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
          <div className="dm-exposition-error-actions">
            {props.turnFailureRetryable ? (
              <button type="button" onClick={props.onRetryExposition}>
                Retry
              </button>
            ) : null}
            <button type="button" onClick={props.onAbortTurnFailure}>
              Abort
            </button>
          </div>
        </div>
      ) : null}
      <div
        className={incomingHighlightClassName(summaryHighlighted, 'dm-exposition-scene')}
        aria-live="polite"
      >
        {FormattedText({
          as: 'p',
          className: 'dm-exposition-scene-text',
          text: sceneText,
          personCandidates: props.personCandidates,
          onPersonActivate: props.onPersonActivate
        })}
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

function formattedProse(text: string, personLink?: ScenePersonLinkProps): JSX.Element {
  return FormattedText({
    text,
    personCandidates: personLink?.personCandidates,
    onPersonActivate: personLink?.onPersonActivate
  })
}

function renderNpcLine(
  entry: { reactionKind?: string; text: string },
  personLink?: ScenePersonLinkProps
): JSX.Element {
  if (entry.reactionKind === 'action') {
    return <strong>{formattedProse(entry.text, personLink)}</strong>
  }
  return <em>{formattedProse(entry.text, personLink)}</em>
}

function renderDmOrPlayerBody(entry: PlayLogEntry, personLink?: ScenePersonLinkProps): JSX.Element {
  if (entry.speaker === 'player' && entry.playerLineKind === 'actionExpression') {
    return <strong>{entry.text}</strong>
  }
  if (entry.speaker === 'npc' || entry.speaker === 'partyMember') {
    return renderNpcLine(entry, personLink)
  }
  return <>{formattedProse(entry.text, personLink)}</>
}

function renderFeedLine(entry: PlayLogEntry, personLink?: ScenePersonLinkProps): JSX.Element {
  const label = speakerLabel(entry)
  const body = renderDmOrPlayerBody(entry, personLink)
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
