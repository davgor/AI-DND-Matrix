import { useState } from 'react'
import type { BestiaryReviewEntry } from '../../../shared/bestiary/reviewRoster'
import {
  filterBestiaryReviewEntries,
  type BestiaryOriginFilter
} from '../../../shared/bestiary/reviewRoster'
import { FormattedText } from '../shared/FormattedText'

function formatVariantLabel(variantKey: string, flavorBlurb?: string): string {
  const keyLabel = variantKey.replace(/_/g, ' ')
  return flavorBlurb?.trim() ? `${keyLabel} — ${flavorBlurb.trim()}` : keyLabel
}

function originLabel(origin: BestiaryReviewEntry['origin']): string {
  return origin === 'default' ? 'Default enemy' : 'Campaign-specific'
}

function BestiaryEntryCard(props: { entry: BestiaryReviewEntry }): JSX.Element {
  const { entry } = props
  return (
    <article className="campaign-review-bestiary-card">
      <header className="campaign-review-bestiary-card-header">
        <h3>{entry.species.name}</h3>
        <span className="campaign-review-bestiary-origin">{originLabel(entry.origin)}</span>
      </header>
      {entry.species.buckets.length > 0 ? (
        <p className="campaign-review-bestiary-meta">Buckets: {entry.species.buckets.join(' · ')}</p>
      ) : null}
      {entry.species.tags.length > 0 ? (
        <p className="campaign-review-bestiary-meta">Tags: {entry.species.tags.join(' · ')}</p>
      ) : null}
      {FormattedText({
        as: 'p',
        className: 'campaign-review-bestiary-lore',
        text: entry.species.baseLore
      })}
      {entry.variants.length > 0 ? (
        <ul className="campaign-review-bestiary-variants">
          {entry.variants.map((variant) => (
            <li key={variant.variantKey}>
              {formatVariantLabel(variant.variantKey, variant.flavorBlurb)}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function BestiaryFilterBar(props: {
  query: string
  originFilter: BestiaryOriginFilter
  onQueryChange: (query: string) => void
  onOriginChange: (filter: BestiaryOriginFilter) => void
}): JSX.Element {
  return (
    <div className="campaign-review-bestiary-filters">
      <input
        type="search"
        className="campaign-review-bestiary-search"
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
        placeholder="Search name, lore, tags…"
        aria-label="Search bestiary"
      />
      <div className="campaign-review-bestiary-origin-filters" role="group" aria-label="Enemy origin">
        {(
          [
            ['all', 'All'],
            ['default', 'Default enemies'],
            ['campaign', 'Campaign-specific']
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              props.originFilter === value
                ? 'campaign-review-bestiary-filter is-active'
                : 'campaign-review-bestiary-filter'
            }
            onClick={() => props.onOriginChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CampaignReviewBestiaryModal(props: {
  entries: BestiaryReviewEntry[]
  canAdd: boolean
  onAdd: () => void
  onClose: () => void
}): JSX.Element {
  const [query, setQuery] = useState('')
  const [originFilter, setOriginFilter] = useState<BestiaryOriginFilter>('all')
  const visible = filterBestiaryReviewEntries(props.entries, { query, originFilter })

  return (
    <div className="campaign-review-overlay campaign-review-overlay--content-width">
      <div
        className="campaign-review-generate-modal campaign-review-bestiary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-review-bestiary-title"
      >
        <h2 id="campaign-review-bestiary-title">Bestiary</h2>
        <p>Default catalog enemies and creatures unique to this campaign.</p>
        <BestiaryFilterBar
          query={query}
          originFilter={originFilter}
          onQueryChange={setQuery}
          onOriginChange={setOriginFilter}
        />
        <div className="campaign-review-bestiary-body">
          {visible.length > 0 ? (
            visible.map((entry) => <BestiaryEntryCard key={entry.species.id} entry={entry} />)
          ) : (
            <p className="campaign-review-lead">No creatures match this search.</p>
          )}
        </div>
        <div className="campaign-review-modal-actions">
          {props.canAdd ? (
            <button type="button" onClick={props.onAdd}>
              Add
            </button>
          ) : null}
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
