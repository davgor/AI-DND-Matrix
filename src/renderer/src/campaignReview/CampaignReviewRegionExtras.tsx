import type { RegionExtras } from '../../../main/campaignIpc'
import { FormattedText } from '../shared/FormattedText'
import { CampaignReviewPanel } from './CampaignReviewPanel'

export function CampaignReviewRegionExtras(props: { extras: RegionExtras }): JSX.Element {
  const { extras } = props
  return (
    <>
      {extras.backstory ? (
        <CampaignReviewPanel legend="History">
          {FormattedText({ as: 'p', text: extras.backstory })}
        </CampaignReviewPanel>
      ) : null}

      {extras.recentHistory ? (
        <CampaignReviewPanel legend="Recent events">
          {FormattedText({ as: 'p', text: extras.recentHistory })}
        </CampaignReviewPanel>
      ) : null}

      {extras.questHooks.length > 0 ? (
        <CampaignReviewPanel legend="Potential quests">
          <ul>
            {extras.questHooks.map((hook) => (
              <li key={hook}>
                {FormattedText({ text: hook })}
              </li>
            ))}
          </ul>
        </CampaignReviewPanel>
      ) : null}
    </>
  )
}
