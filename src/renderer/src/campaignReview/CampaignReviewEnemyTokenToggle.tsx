export function CampaignReviewEnemyTokenToggle(props: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <label className="campaign-review-enemy-token-toggle">
      <input
        type="checkbox"
        checked={props.enabled}
        disabled={props.disabled === true}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>
        Generate enemy tokens
        <span className="campaign-review-enemy-token-hint">
          Off by default and independent of NPC face tokens. When on, combat creatures get async
          creature portraits for Social and dossiers. Generation never blocks play.
        </span>
      </span>
    </label>
  )
}
