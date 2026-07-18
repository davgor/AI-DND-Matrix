import type { Deity } from '../../../db/repositories/deities'
import { FormattedText } from '../shared/FormattedText'

function formatDeityHeading(deity: Deity): string {
  return deity.epithet ? `${deity.name}, ${deity.epithet}` : deity.name
}

function DeityCard(props: { deity: Deity }): JSX.Element {
  const { deity } = props
  return (
    <article className="campaign-review-deity-card">
      <header className="campaign-review-deity-header">
        <h3>{formatDeityHeading(deity)}</h3>
        {deity.isForgotten ? <span className="campaign-review-forgotten-tag">Forgotten</span> : null}
      </header>
      <p className="campaign-review-deity-domains">Domains: {deity.domains.join(' · ')}</p>
      <div className="campaign-review-deity-tenets">
        <strong>Tenets</strong>
        <ul>
          {deity.tenets.map((tenet) => (
            <li key={tenet}>{tenet}</li>
          ))}
        </ul>
      </div>
      {FormattedText({ as: 'p', className: 'campaign-review-deity-blurb', text: deity.blurb })}
    </article>
  )
}

export function CampaignReviewPantheonModal(props: {
  deities: Deity[]
  onClose: () => void
}): JSX.Element {
  return (
    <div className="campaign-review-overlay campaign-review-overlay--content-width">
      <div
        className="campaign-review-generate-modal campaign-review-pantheon-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-review-pantheon-title"
      >
        <h2 id="campaign-review-pantheon-title">Pantheon</h2>
        <p>The gods and forgotten powers of this world.</p>
        <div className="campaign-review-pantheon-body">
          {props.deities.map((deity) => (
            <DeityCard key={deity.id} deity={deity} />
          ))}
        </div>
        <div className="campaign-review-modal-actions">
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
