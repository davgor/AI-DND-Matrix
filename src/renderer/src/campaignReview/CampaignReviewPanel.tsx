import type { ReactNode } from 'react'

export function CampaignReviewPanel(props: { legend: string; children: ReactNode }): JSX.Element {
  return (
    <fieldset className="campaign-review-panel">
      <legend>{props.legend}</legend>
      <div className="campaign-review-panel-body">{props.children}</div>
    </fieldset>
  )
}
