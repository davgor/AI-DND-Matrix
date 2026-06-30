import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  campaignReviewContinueMessage,
  canContinueCampaignReview,
  getCampaignReviewContinueBlockers
} from '../../../shared/campaignReview/campaignReviewValidation'

export function CampaignReviewStory(props: {
  storyThreads: CampaignDetail['storyThreads']
  playAware?: boolean
}): JSX.Element {
  return (
    <section className="campaign-review-story">
      <h2>Main Story Thread</h2>
      <ul>
        {props.storyThreads.map((thread) => (
          <li key={thread.id}>
            <strong>{thread.title}</strong>
            {props.playAware ? (
              <>
                {' '}
                <span className="campaign-review-thread-state">({thread.state})</span>
              </>
            ) : null}{' '}
            — {thread.summary}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CampaignReviewFooter(props: {
  detail: Pick<CampaignDetail, 'regions' | 'npcs'>
  onGenerate: () => void
  onContinue: () => void
}): JSX.Element {
  const blockers = getCampaignReviewContinueBlockers(props.detail)
  const canContinue = canContinueCampaignReview(props.detail)
  const message = campaignReviewContinueMessage(blockers)

  return (
    <footer className="campaign-review-actions">
      <button type="button" className="campaign-review-generate-region" onClick={props.onGenerate}>
        Generate another region
      </button>
      <div className="campaign-review-continue-group">
        {message ? <p className="campaign-review-validation">{message}</p> : null}
        <button
          type="button"
          className="campaign-review-continue"
          disabled={!canContinue}
          onClick={props.onContinue}
        >
          Continue to character creation
        </button>
      </div>
    </footer>
  )
}
