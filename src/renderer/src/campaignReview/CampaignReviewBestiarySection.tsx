import type { CampaignBestiaryEntry } from '../../../main/campaignIpc'
import { CampaignReviewPanel } from './CampaignReviewPanel'
import { FormattedText } from '../shared/FormattedText'

export function shouldShowBestiarySection(entries: CampaignBestiaryEntry[]): boolean {
  return entries.length > 0
}

function formatVariantLabel(variantKey: string, flavorBlurb?: string): string {
  const keyLabel = variantKey.replace(/_/g, ' ')
  return flavorBlurb?.trim() ? `${keyLabel} — ${flavorBlurb.trim()}` : keyLabel
}

export function CampaignReviewBestiarySection(props: {
  entries: CampaignBestiaryEntry[]
}): JSX.Element | null {
  if (!shouldShowBestiarySection(props.entries)) {
    return null
  }

  return (
    <section className="campaign-review-bestiary">
      <h2>Bestiary</h2>
      <p className="campaign-review-lead">Prepped species for this campaign (read-only).</p>
      <div className="campaign-review-bestiary-list">
        {props.entries.map((entry) => (
          <CampaignReviewPanel key={entry.species.id} legend={entry.species.name}>
            <div className="campaign-review-readonly">
              <strong>Lore</strong>
              {FormattedText({
                as: 'p',
                className: 'campaign-review-readonly-value',
                text: entry.species.baseLore
              })}
              <strong>Variants</strong>
              {entry.variants.length > 0 ? (
                <ul className="campaign-review-bestiary-variants">
                  {entry.variants.map((variant) => (
                    <li key={variant.variantKey}>
                      {formatVariantLabel(variant.variantKey, variant.flavorBlurb)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="campaign-review-readonly-value">No variants listed.</p>
              )}
            </div>
          </CampaignReviewPanel>
        ))}
      </div>
    </section>
  )
}
