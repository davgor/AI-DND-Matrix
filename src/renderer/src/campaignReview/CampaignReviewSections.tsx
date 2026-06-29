import type { CampaignDetail } from '../../../main/campaignIpc'

export function CampaignReviewStory(props: { storyThreads: CampaignDetail['storyThreads'] }): JSX.Element {
  return (
    <section className="campaign-review-story">
      <h2>Main Story Thread</h2>
      <ul>
        {props.storyThreads.map((thread) => (
          <li key={thread.id}>
            <strong>{thread.title}</strong> — {thread.summary}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CampaignReviewFooter(props: {
  onGenerate: () => void
  onContinue: () => void
}): JSX.Element {
  return (
    <footer className="campaign-review-actions">
      <button type="button" className="campaign-review-generate-region" onClick={props.onGenerate}>
        Generate another region
      </button>
      <button type="button" className="campaign-review-continue" onClick={props.onContinue}>
        Continue to character creation
      </button>
    </footer>
  )
}
