import type { RegionExtras } from '../../../main/campaignIpc'

export function CampaignReviewRegionExtras(props: { extras: RegionExtras }): JSX.Element {
  const { extras } = props
  return (
    <>
      {extras.backstory ? (
        <div className="campaign-review-readonly">
          <strong>History</strong>
          <p>{extras.backstory}</p>
        </div>
      ) : null}

      {extras.recentHistory ? (
        <div className="campaign-review-readonly">
          <strong>Recent events</strong>
          <p>{extras.recentHistory}</p>
        </div>
      ) : null}

      {extras.questHooks.length > 0 ? (
        <div className="campaign-review-readonly">
          <strong>Potential quests</strong>
          <ul>
            {extras.questHooks.map((hook) => (
              <li key={hook}>{hook}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
