export function CampaignReviewFaceTokenToggle(props: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <label className="campaign-review-face-token-toggle">
      <input
        type="checkbox"
        checked={props.enabled}
        disabled={props.disabled === true}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>
        Generate NPC face tokens
        <span className="campaign-review-face-token-hint">
          Off by default. When on, speaking NPCs get head-and-shoulders portraits for Social and
          dossiers. Generation is async and never blocks play.
        </span>
      </span>
    </label>
  )
}
