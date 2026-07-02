import type { KnownSpellView } from '../../../shared/spells/types'

function formatCost(cost: number): string {
  return cost === 1 ? '1 turn' : `${cost} turns`
}

function SpellCard(props: { spell: KnownSpellView }): JSX.Element {
  const { spell } = props
  return (
    <article className="spellbook-card">
      <header className="spellbook-card-header">
        <h3>{spell.name}</h3>
        <span className="spellbook-card-cost">{formatCost(spell.cost)}</span>
      </header>
      <p className="spellbook-card-meta">
        <span className="spellbook-effect">{spell.effectType}</span>
        <span className="spellbook-range">{spell.range}</span>
      </p>
      <p className="spellbook-card-rules">{spell.rulesText}</p>
      {spell.tags.length > 0 ? (
        <p className="spellbook-card-tags">{spell.tags.join(' · ')}</p>
      ) : null}
      {spell.constraintsHint ? (
        <p className="spellbook-card-constraints">{spell.constraintsHint}</p>
      ) : null}
    </article>
  )
}

export function SpellbookModalBody(props: {
  spells: KnownSpellView[]
  loading: boolean
}): JSX.Element {
  if (props.loading) {
    return <p className="spellbook-loading">Loading spellbook…</p>
  }
  if (props.spells.length === 0) {
    return (
      <p className="spellbook-empty">
        You don&apos;t know any yet, you should try to learn some 😉
      </p>
    )
  }
  return (
    <div className="spellbook-list">
      {props.spells.map((spell) => (
        <SpellCard key={spell.catalogKey} spell={spell} />
      ))}
    </div>
  )
}
