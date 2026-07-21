import type { AppliedPerk } from '../../../shared/progression/types'
import './characterPerks.css'

export function CharacterPerksSection(props: {
  stats: Record<string, unknown> | null | undefined
}): JSX.Element | null {
  const perks = (props.stats?.perks as AppliedPerk[] | undefined) ?? []
  if (perks.length === 0) {
    return null
  }
  return (
    <section className="character-perks-section">
      <h3>Perks</h3>
      <ul className="character-perks-list">
        {perks.map((perk) => (
          <li key={`${perk.id}-${perk.levelGained}`} className="character-perk-item">
            <strong>{perk.name}</strong>
            <span className="character-perk-level">Level {perk.levelGained}</span>
            <p>{perk.description}</p>
            <p className="character-perk-mechanical" title={perk.mechanicalSummary}>
              {perk.mechanicalSummary}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
