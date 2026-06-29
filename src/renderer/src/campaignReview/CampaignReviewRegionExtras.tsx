import type { RegionExtras } from '../../../main/campaignIpc'
import { FormattedText } from '../shared/FormattedText'

export function CampaignReviewRegionExtras(props: { extras: RegionExtras }): JSX.Element {
  const { extras } = props
  return (
    <>
      {extras.backstory ? (
        <div className="campaign-review-readonly">
          <strong>History</strong>
          {FormattedText({ as: 'p', text: extras.backstory })}
        </div>
      ) : null}

      {extras.recentHistory ? (
        <div className="campaign-review-readonly">
          <strong>Recent events</strong>
          {FormattedText({ as: 'p', text: extras.recentHistory })}
        </div>
      ) : null}

      {extras.questHooks.length > 0 ? (
        <div className="campaign-review-readonly">
          <strong>Potential quests</strong>
          <ul>
            {extras.questHooks.map((hook) => (
              <li key={hook}>
                {FormattedText({ text: hook })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
