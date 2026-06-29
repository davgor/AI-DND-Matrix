import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'

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

function renderNpcLine(entry: { reactionKind?: string; text: string }): JSX.Element {
  if (entry.reactionKind === 'action') {
    return <strong>{entry.text}</strong>
  }
  return <em>{entry.text}</em>
}

export { renderNpcLine }
