export function CampaignReviewGenerativeTokensToggle(props: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <label className="campaign-review-generative-tokens-toggle">
      <input
        type="checkbox"
        checked={props.enabled}
        disabled={props.disabled === true}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>
        Use generative tokens?
        <span className="campaign-review-generative-tokens-hint">
          Off by default. When on, speaking NPCs, AI companions, and combat creatures get async
          portraits for Social / dossiers / roster (never blocks play).
        </span>
      </span>
    </label>
  )
}
