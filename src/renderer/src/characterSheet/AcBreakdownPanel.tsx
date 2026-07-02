import type { AcBreakdown } from './acBreakdown'

export function AcBreakdownPanel(props: { breakdown: AcBreakdown }): JSX.Element {
  const { breakdown } = props
  return (
    <dl className="ac-breakdown-panel">
      <div>
        <dt>Base</dt>
        <dd>{breakdown.base}</dd>
      </div>
      <div>
        <dt>Agility</dt>
        <dd>{breakdown.agilityMod >= 0 ? `+${breakdown.agilityMod}` : breakdown.agilityMod}</dd>
      </div>
      <div>
        <dt>Armor ({breakdown.armorTier})</dt>
        <dd>+{breakdown.armorBonus}</dd>
      </div>
      <div>
        <dt>Shield</dt>
        <dd>+{breakdown.shieldBonus}</dd>
      </div>
      <div>
        <dt>Accessories</dt>
        <dd>+{breakdown.accessoryBonus}</dd>
      </div>
      <div className="ac-breakdown-total">
        <dt>Total AC</dt>
        <dd>{breakdown.total}</dd>
      </div>
    </dl>
  )
}
