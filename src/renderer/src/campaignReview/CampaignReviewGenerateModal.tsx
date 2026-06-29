import type { CampaignDetail } from '../../../main/campaignIpc'
import { useGenerateRegion } from './useGenerateRegion'

function GenerateRegionDialog(props: {
  seedPrompt: string
  generating: boolean
  generateError: string | null
  onSeedChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}): JSX.Element {
  return (
    <div
      className="campaign-review-generate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-region-title"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !props.generating) {
          props.onClose()
        }
      }}
    >
      <h2 id="generate-region-title">Generate another region</h2>
      <p>Seed the next region with a place, mood, conflict, or hook you want in the world.</p>
      <textarea
        className="campaign-review-seed-input"
        value={props.seedPrompt}
        onChange={(event) => props.onSeedChange(event.target.value)}
        placeholder="e.g. A fog-choked fishing village where the tide brings whispered warnings..."
        rows={5}
        disabled={props.generating}
      />
      {props.generateError ? <p className="campaign-review-error">{props.generateError}</p> : null}
      <div className="campaign-review-generate-actions">
        <button type="button" disabled={props.generating} onClick={props.onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="campaign-review-generate-submit"
          disabled={props.generating || !props.seedPrompt.trim()}
          onClick={props.onSubmit}
        >
          {props.generating ? 'Generating...' : 'Generate region'}
        </button>
      </div>
    </div>
  )
}

export function CampaignReviewGenerateModal(props: {
  campaignId: string
  onDetailChange: (detail: CampaignDetail) => void
  onClose: () => void
}): JSX.Element {
  const generate = useGenerateRegion(props)

  return (
    <div
      className="campaign-review-overlay"
      role="presentation"
      onClick={() => {
        if (!generate.generating) {
          props.onClose()
        }
      }}
    >
      <GenerateRegionDialog
        seedPrompt={generate.seedPrompt}
        generating={generate.generating}
        generateError={generate.generateError}
        onSeedChange={generate.setSeedPrompt}
        onClose={props.onClose}
        onSubmit={() => void generate.submit()}
      />
    </div>
  )
}
