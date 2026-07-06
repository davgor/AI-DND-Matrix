import { FormattedText } from '../shared/FormattedText'

export function CampaignReviewWorldContent(props: {
  worldName: string
  worldSummary: string
  onViewHistory?: () => void
  viewHistoryLabel?: string
}): JSX.Element | null {
  if (!props.worldName && !props.worldSummary) {
    return null
  }

  return (
    <section className="campaign-review-world campaign-hub-world-section">
      <h2>{props.worldName || 'World'}</h2>
      {props.worldSummary ? (
        <div className="campaign-review-readonly">
          <strong>Summary</strong>
          {FormattedText({ as: 'p', className: 'campaign-review-readonly-value', text: props.worldSummary })}
        </div>
      ) : null}
      {props.onViewHistory ? (
        <button type="button" className="campaign-review-view-world-history" onClick={props.onViewHistory}>
          {props.viewHistoryLabel ?? 'View full history'}
        </button>
      ) : null}
    </section>
  )
}
